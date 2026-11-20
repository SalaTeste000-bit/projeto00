/* Métricas de desempenho de um exame (go/no-go e variações).
   Tudo é calculado SÓ a partir do que o teste já grava: timeline, rts, contagens e a definição da tarefa.
   Nada é estimado nem comparado com valores de referência. */
(function (P) {
  /* ---------- estatística básica ---------- */
  function mean(a) { return a.length ? a.reduce(function (s, x) { return s + x; }, 0) / a.length : null; }
  function sd(a) {                                  // desvio-padrão amostral (n − 1)
    if (a.length < 2) return null;
    var m = mean(a);
    return Math.sqrt(a.reduce(function (s, x) { return s + (x - m) * (x - m); }, 0) / (a.length - 1));
  }
  function quantile(sorted, q) {                    // interpolação linear (tipo 7, o padrão do R e do Excel)
    if (!sorted.length) return null;
    var pos = (sorted.length - 1) * q, lo = Math.floor(pos), hi = Math.ceil(pos);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
  }

  /* Inversa da distribuição normal padrão (algoritmo de P. J. Acklam; erro relativo < 1,2e-9). */
  function zinv(p) {
    var a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
    var b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
    var c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
    var d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
    var pl = 0.02425, q, r;
    if (p <= 0 || p >= 1) return NaN;
    if (p < pl) {
      q = Math.sqrt(-2 * Math.log(p));
      return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    }
    if (p > 1 - pl) {
      q = Math.sqrt(-2 * Math.log(1 - p));
      return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    }
    q = p - 0.5; r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }

  function pct(x, n) { return n ? x / n * 100 : null; }

  /**
   * Classifica cada estímulo e calcula as medidas do exame.
   * kind: 'hit' (respondeu certo ao go) · 'cr' (inibiu certo no no-go) · 'om' (omissão) · 'fa' (erro por ação)
   * @param {Object} x     exame gravado
   * @param {Object} task  definição da tarefa (pode faltar)
   */
  function compute(x, task) {
    var n = x.totalTrials || 0, tl = x.timeline || [], rts = x.rts || [];
    var isDir = !!(task && task.tipo === 'dir');
    var ok = n > 0 && tl.length === n && rts.length === n;     // sem a série por estímulo só dá para mostrar totais
    var trials = [];
    if (ok) tl.forEach(function (c, i) {
      var rt = rts[i] || 0, kind = c === 'ok' ? (rt > 0 ? 'hit' : 'cr') : c === 'omissao' ? 'om' : 'fa';
      trials.push({ i: i + 1, cat: c, kind: kind, rt: kind === 'hit' ? rt : null });
    });

    var cnt = { hit: 0, cr: 0, om: 0, fa: 0 };
    trials.forEach(function (t) { cnt[t.kind]++; });
    if (!ok) { cnt.hit = x.acertos || 0; cnt.om = x.errosOmissao || 0; cnt.fa = x.errosAcao || 0; }

    // Estímulos que exigem resposta (go) e que exigem segurar (no-go).
    // Em tarefas de direção todo estímulo exige resposta; o erro por ação é "lado errado", não resposta ao no-go.
    var go = isDir ? n : cnt.hit + cnt.om;
    var nogo = isDir ? 0 : cnt.cr + cnt.fa;

    var rtList = trials.filter(function (t) { return t.kind === 'hit'; }).map(function (t) { return t.rt; });
    var sorted = rtList.slice().sort(function (a, b) { return a - b; });
    var m = mean(rtList), s = sd(rtList);
    var rt = {
      n: rtList.length, mean: m, sd: s, cv: m && s != null ? s / m * 100 : null,
      median: quantile(sorted, .5), q1: quantile(sorted, .25), q3: quantile(sorted, .75),
      min: sorted.length ? sorted[0] : null, max: sorted.length ? sorted[sorted.length - 1] : null
    };

    // Teoria de detecção de sinais, com correção log-linear (Hautus, 1995): (x + 0,5) / (N + 1).
    var sdt = null;
    if (!isDir && go > 0 && nogo > 0) {
      var H = (cnt.hit + .5) / (go + 1), F = (cnt.fa + .5) / (nogo + 1);
      sdt = { H: H, F: F, dprime: zinv(H) - zinv(F), c: -(zinv(H) + zinv(F)) / 2 };
    }

    // Blocos consecutivos de estímulos (4 blocos; 2 se a tarefa for curta).
    var nb = n >= 20 ? 4 : n >= 6 ? 2 : 1, blocks = [];
    if (ok) for (var b = 0; b < nb; b++) {
      var lo = Math.floor(b * n / nb), hi = Math.floor((b + 1) * n / nb);
      var part = trials.slice(lo, hi), c = { hit: 0, cr: 0, om: 0, fa: 0 };
      part.forEach(function (t) { c[t.kind]++; });
      var r = part.filter(function (t) { return t.kind === 'hit'; }).map(function (t) { return t.rt; });
      blocks.push({ b: b + 1, from: lo + 1, to: hi, n: part.length, hit: c.hit, cr: c.cr, om: c.om, fa: c.fa,
        acc: pct(c.hit + c.cr, part.length), rtMean: mean(r), rtN: r.length });
    }

    var acertos = cnt.hit + cnt.cr;
    return {
      ok: ok, isDir: isDir, n: n, trials: trials, counts: cnt, go: go, nogo: nogo,
      acc: pct(acertos, n),
      hitRate: pct(cnt.hit, go),                       // acertos entre os estímulos "go"
      omRate: pct(cnt.om, go),                         // omissões entre os estímulos "go"
      faRate: isDir ? pct(cnt.fa, n) : pct(cnt.fa, nogo),   // ações indevidas entre os "no-go" (direção: entre todos)
      rt: rt, sdt: sdt, blocks: blocks,
      isi: task && task.isi ? task.isi : null,
      consistent: !ok || (acertos === x.acertos && cnt.om === x.errosOmissao && cnt.fa === x.errosAcao)
    };
  }

  P.metrics = { compute: compute, mean: mean, sd: sd, quantile: quantile, zinv: zinv };
  if (typeof module !== 'undefined') module.exports = P.metrics;
})(typeof window !== 'undefined' ? window.Psilog : {});
