/* Tela: Resultados de um teste.
   Profissional: painel técnico (medidas, gráficos e tabelas) calculado só com os dados gravados no exame.
   Paciente: versão simples, sem jargão. */
(function (P) {
  var esc = P.utils.esc, M = P.metrics;
  var COLORS = { ok: 'var(--ok)', acao: 'var(--da)', omissao: 'var(--wa)' };
  var exams = [];

  /* ---------- formatação ---------- */
  function fmt(v, d) {
    if (v == null || isNaN(v)) return '—';
    return Number(v).toLocaleString('pt-BR', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });
  }
  function pc(v) { return v == null ? '—' : fmt(v, 0) + '%'; }
  function ms(v) { return v == null ? '—' : fmt(v, 0) + ' ms'; }
  function dt(iso) { return iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—'; }

  /* Escala com marcas "redondas" (no máximo ~6). */
  function niceTicks(max) {
    var steps = [5, 10, 20, 25, 50, 100, 200, 250, 500, 1000], s = 1000, i;
    for (i = 0; i < steps.length; i++) if (max / steps[i] <= 6) { s = steps[i]; break; }
    var out = [], top = Math.max(s, Math.ceil(max / s) * s);
    for (var v = 0; v <= top + 1e-9; v += s) out.push(v);
    return out;
  }

  /* ---------- peças de SVG ---------- */
  function svgOpen(W, H, label) {
    return '<svg class="rx" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(label) + '" preserveAspectRatio="xMidYMid meet">';
  }
  function glyph(kind, x, y, r) {
    r = r || 5;
    if (kind === 'hit') return '<circle class="rx-hit" cx="' + x + '" cy="' + y + '" r="' + r + '"/>';
    if (kind === 'cr') return '<circle class="rx-cr" cx="' + x + '" cy="' + y + '" r="' + (r - 1) + '"/>';
    if (kind === 'om') return '<rect class="rx-om" x="' + (x - r + 1) + '" y="' + (y - r + 1) + '" width="' + (2 * r - 2) + '" height="' + (2 * r - 2) + '" transform="rotate(45 ' + x + ' ' + y + ')"/>';
    var k = r - 1;
    return '<path class="rx-fa" d="M' + (x - k) + ' ' + (y - k) + 'L' + (x + k) + ' ' + (y + k) + 'M' + (x + k) + ' ' + (y - k) + 'L' + (x - k) + ' ' + (y + k) + '"/>';
  }
  function key(kind, text) { return '<span class="rx-key"><svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true">' + glyph(kind, 7, 7, 5) + '</svg>' + text + '</span>'; }
  function lineKey(cls, text) { return '<span class="rx-key"><svg viewBox="0 0 18 14" width="18" height="14" aria-hidden="true"><line class="rx-ln ' + cls + '" x1="1" x2="17" y1="7" y2="7"/></svg>' + text + '</span>'; }
  function barPath(x, y, w, h, r) {
    r = Math.min(r, h / 2, w / 2);
    return 'M' + x + ' ' + (y + h) + 'L' + x + ' ' + (y + r) + 'Q' + x + ' ' + y + ' ' + (x + r) + ' ' + y +
      'L' + (x + w - r) + ' ' + y + 'Q' + (x + w) + ' ' + y + ' ' + (x + w) + ' ' + (y + r) + 'L' + (x + w) + ' ' + (y + h) + 'Z';
  }

  var KIND_TXT = {
    hit: function (m) { return m.isDir ? 'Acerto (lado certo)' : 'Acerto (go): respondeu'; },
    cr: function () { return 'Acerto (no-go): segurou a resposta'; },
    om: function () { return 'Omissão: não respondeu'; },
    fa: function (m) { return m.isDir ? 'Erro por ação: lado errado' : 'Erro por ação: respondeu ao no-go'; }
  };
  function blockOf(m, i) {
    for (var k = 0; k < m.blocks.length; k++) if (i >= m.blocks[k].from && i <= m.blocks[k].to) return m.blocks[k];
    return null;
  }

  /* ---------- gráfico 1: série por estímulo (TR) + faixa de eventos ---------- */
  function seriesChart(m) {
    var W = 720, H = 318, L = 54, R = 16, T = 14, ph = 186, pw = W - L - R, n = m.n, bw = pw / n;
    var hasRt = m.rt.n > 0;
    var top = niceTicks(m.isi ? Math.max(m.isi, m.rt.max || 0) : (m.rt.max || 100) * 1.1);
    var yMax = top[top.length - 1];
    var X = function (i) { return L + (i - .5) * bw; };
    var Y = function (v) { return T + ph - v / yMax * ph; };
    var rasterY = T + ph + 26, axisY = rasterY + 30, blockY = axisY + 20;
    var s = svgOpen(W, H, 'Tempo de reação por estímulo e tipo de resposta em cada um dos ' + n + ' estímulos');

    top.forEach(function (t) {
      s += '<line class="rx-gl" x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(t) + '" y2="' + Y(t) + '"/>' +
        '<text class="rx-yl" x="' + (L - 8) + '" y="' + (Y(t) + 3.5) + '" text-anchor="end">' + t + '</text>';
    });
    s += '<text class="rx-at" transform="translate(12 ' + (T + ph / 2) + ') rotate(-90)" text-anchor="middle">Tempo de reação (ms)</text>';

    // separadores de blocos
    m.blocks.forEach(function (b, k) {
      if (k) s += '<line class="rx-bl" x1="' + (L + (b.from - 1) * bw) + '" x2="' + (L + (b.from - 1) * bw) + '" y1="' + T + '" y2="' + (rasterY + 14) + '"/>';
    });

    if (m.isi) {
      s += '<line class="rx-win" x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(m.isi) + '" y2="' + Y(m.isi) + '"/>' +
        '<text class="rx-yl" x="' + (W - R) + '" y="' + (Y(m.isi) - 5) + '" text-anchor="end">fim da janela de resposta · ' + m.isi + ' ms</text>';
    }
    if (hasRt && m.rt.sd != null) {
      var y1 = Y(Math.min(m.rt.mean + m.rt.sd, yMax)), y2 = Y(Math.max(m.rt.mean - m.rt.sd, 0));
      s += '<rect class="rx-band" x="' + L + '" y="' + y1 + '" width="' + pw + '" height="' + (y2 - y1) + '"/>';
    }
    if (hasRt) s += '<line class="rx-ln rx-ac" x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(m.rt.mean) + '" y2="' + Y(m.rt.mean) + '"/>';
    if (!hasRt) s += '<text class="rx-yl" x="' + (L + pw / 2) + '" y="' + (T + ph / 2) + '" text-anchor="middle">Nenhuma resposta válida: não há tempo de reação para plotar.</text>';

    m.trials.forEach(function (t) {
      if (t.kind === 'hit') s += '<circle class="rx-pt rx-hit" cx="' + X(t.i) + '" cy="' + Y(t.rt) + '" r="4.5"/>';
      s += glyph(t.kind, X(t.i), rasterY, 5);
    });
    s += '<text class="rx-yl" x="' + (L - 8) + '" y="' + (rasterY + 3.5) + '" text-anchor="end">Evento</text>';

    // eixo x
    var step = Math.ceil(n / Math.floor(pw / 28));
    m.trials.forEach(function (t) {
      if ((t.i - 1) % step === 0 || t.i === n) s += '<text class="rx-yl" x="' + X(t.i) + '" y="' + axisY + '" text-anchor="middle">' + t.i + '</text>';
    });
    s += '<text class="rx-at" x="' + (L + pw / 2) + '" y="' + (blockY + 14) + '" text-anchor="middle">Nº do estímulo' + (m.blocks.length > 1 ? ' · blocos B1–B' + m.blocks.length : '') + '</text>';
    if (m.blocks.length > 1) m.blocks.forEach(function (b) {
      s += '<text class="rx-bt" x="' + (L + ((b.from - 1) + b.n / 2) * bw) + '" y="' + (axisY + 15) + '" text-anchor="middle">B' + b.b + '</text>';
    });

    // áreas de passagem do mouse (uma coluna por estímulo)
    m.trials.forEach(function (t) {
      var b = blockOf(m, t.i);
      var tip = 'Estímulo ' + t.i + (b ? ' · bloco ' + b.b : '') + '|' + KIND_TXT[t.kind](m) + (t.kind === 'hit' ? ' · TR ' + t.rt + ' ms' : '');
      s += '<rect class="rx-col" data-tt="' + esc(tip) + '" x="' + (L + (t.i - 1) * bw) + '" y="' + T + '" width="' + bw + '" height="' + (rasterY + 14 - T) + '"/>';
    });
    return s + '</svg>';
  }

  function seriesLegend(m) {
    return '<div class="rx-legend">' + key('hit', m.isDir ? 'acerto (TR)' : 'acerto go (TR)') + (m.isDir ? '' : key('cr', 'acerto no-go (segurou)')) +
      key('om', 'omissão') + key('fa', 'erro por ação') +
      (m.rt.n ? lineKey('rx-ac', 'média' + (m.rt.sd != null ? ' ± 1 DP (faixa)' : '')) : '') + '</div>';
  }

  /* ---------- gráfico 2: precisão por bloco (colunas) ---------- */
  function blockAcc(m) {
    var W = 340, H = 214, L = 40, R = 12, T = 18, B = 46, ph = H - T - B, pw = W - L - R, nb = m.blocks.length;
    var slot = pw / nb, th = Math.min(24, slot * .5);
    var Y = function (v) { return T + ph - v / 100 * ph; };
    var s = svgOpen(W, H, 'Precisão (%) em cada bloco de estímulos consecutivos');
    [0, 25, 50, 75, 100].forEach(function (t) {
      s += '<line class="rx-gl" x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(t) + '" y2="' + Y(t) + '"/><text class="rx-yl" x="' + (L - 6) + '" y="' + (Y(t) + 3.5) + '" text-anchor="end">' + t + '</text>';
    });
    m.blocks.forEach(function (b, k) {
      var cx = L + slot * (k + .5), h = b.acc / 100 * ph;
      if (h > 0) s += '<path class="rx-bar" d="' + barPath(cx - th / 2, T + ph - h, th, h, 4) + '"/>';
      s += '<text class="rx-val" x="' + cx + '" y="' + (T + ph - h - 6) + '" text-anchor="middle">' + fmt(b.acc, 0) + '%</text>' +
        '<text class="rx-yl" x="' + cx + '" y="' + (H - B + 16) + '" text-anchor="middle">B' + b.b + '</text>' +
        '<text class="rx-bt" x="' + cx + '" y="' + (H - B + 30) + '" text-anchor="middle">' + (b.from === b.to ? b.from : b.from + '–' + b.to) + '</text>';
      var tip = 'Bloco ' + b.b + ' · estímulos ' + b.from + '–' + b.to + '|Precisão ' + fmt(b.acc, 0) + '% (' + (b.hit + b.cr) + ' de ' + b.n + ')|Omissões ' + b.om + ' · Erros por ação ' + b.fa;
      s += '<rect class="rx-col" data-tt="' + esc(tip) + '" x="' + (cx - slot / 2) + '" y="' + T + '" width="' + slot + '" height="' + (ph + 36) + '"/>';
    });
    return s + '</svg>';
  }

  /* ---------- gráfico de linhas genérico (blocos e evolução entre aplicações) ---------- */
  function lineChart(o) {
    var W = 340, H = 214, L = o.L || 44, R = 12, T = 18, B = 46, ph = H - T - B, pw = W - L - R, n = o.xl.length;
    var tk = niceTicks(o.max), yMax = tk[tk.length - 1];
    var X = function (i) { return n === 1 ? L + pw / 2 : L + pw * (i + .5) / n; };
    var Y = function (v) { return T + ph - v / yMax * ph; };
    var s = svgOpen(W, H, o.label);
    tk.forEach(function (t) {
      s += '<line class="rx-gl" x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(t) + '" y2="' + Y(t) + '"/><text class="rx-yl" x="' + (L - 6) + '" y="' + (Y(t) + 3.5) + '" text-anchor="end">' + t + '</text>';
    });
    var step = Math.ceil(n / 6);
    o.xl.forEach(function (lb, i) {
      if (i % step === 0 || i === n - 1) {
        s += '<text class="rx-yl" x="' + X(i) + '" y="' + (H - B + 16) + '" text-anchor="middle">' + esc(lb[0]) + '</text>';
        if (lb[1]) s += '<text class="rx-bt" x="' + X(i) + '" y="' + (H - B + 30) + '" text-anchor="middle">' + esc(lb[1]) + '</text>';
      }
    });
    o.series.forEach(function (se) {
      se.pts.forEach(function (v, i) {                                // barras de DP
        var e = se.err && se.err[i];
        if (v != null && e != null && e > 0) {
          var a = Y(Math.min(v + e, yMax)), b = Y(Math.max(v - e, 0));
          s += '<path class="rx-err" d="M' + X(i) + ' ' + a + 'L' + X(i) + ' ' + b + 'M' + (X(i) - 4) + ' ' + a + 'L' + (X(i) + 4) + ' ' + a + 'M' + (X(i) - 4) + ' ' + b + 'L' + (X(i) + 4) + ' ' + b + '"/>';
        }
      });
      var d = '', pen = false;
      se.pts.forEach(function (v, i) { if (v == null) { pen = false; return; } d += (pen ? 'L' : 'M') + X(i) + ' ' + Y(v); pen = true; });
      s += '<path class="rx-ln ' + se.cls + '" d="' + d + '" fill="none"/>';
      se.pts.forEach(function (v, i) {
        if (v == null) return;
        if (o.sel === i && se.main) s += '<circle class="rx-sel" cx="' + X(i) + '" cy="' + Y(v) + '" r="8"/>';
        s += '<circle class="rx-pt ' + se.cls + '" cx="' + X(i) + '" cy="' + Y(v) + '" r="4.5"/>';
        if (o.labels && se.main) s += '<text class="rx-val" x="' + X(i) + '" y="' + (Y(v) - 10) + '" text-anchor="middle">' + fmt(v, 0) + '</text>';
      });
    });
    o.xl.forEach(function (lb, i) {
      s += '<rect class="rx-col" data-tt="' + esc(o.tt[i]) + '" x="' + (n === 1 ? L : X(i) - pw / n / 2) + '" y="' + T + '" width="' + (n === 1 ? pw : pw / n) + '" height="' + (ph + 36) + '"/>';
    });
    return s + '</svg>';
  }

  function blockRt(m) {
    var top = m.isi ? Math.max(m.isi, m.rt.max || 0) : (m.rt.max || 100) * 1.1;
    return lineChart({
      label: 'Tempo médio de reação (ms) por bloco', max: top, labels: true,
      xl: m.blocks.map(function (b) { return ['B' + b.b, b.from === b.to ? String(b.from) : b.from + '–' + b.to]; }),
      series: [{ cls: 'rx-ac', main: true, pts: m.blocks.map(function (b) { return b.rtMean; }) }],
      tt: m.blocks.map(function (b) { return 'Bloco ' + b.b + ' · estímulos ' + b.from + '–' + b.to + '|' + (b.rtMean != null ? 'TR médio ' + ms(b.rtMean) + ' (' + b.rtN + (b.rtN === 1 ? ' resposta)' : ' respostas)') : 'Sem resposta válida neste bloco'); })
    });
  }

  /* ---------- evolução entre aplicações da mesma tarefa ---------- */
  function history(x, task) {
    var list = exams.filter(function (e) { return e.patientId === x.patientId && e.taskId === x.taskId; })
      .sort(function (a, b) { return a.dateISO > b.dateISO ? 1 : -1; });
    var all = list.length;
    if (all > 12) list = list.slice(-12);
    return { all: all, rows: list.map(function (e, i) { return { e: e, m: M.compute(e, task), k: all - list.length + i + 1 }; }) };
  }
  function histLabels(h) {
    return h.rows.map(function (r) { return [new Date(r.e.dateISO).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), '#' + r.k]; });
  }
  function histTip(r, extra) { return 'Aplicação #' + r.k + ' · ' + dt(r.e.dateISO) + '|' + extra; }

  function trendCharts(h, x, simple) {
    var sel = h.rows.findIndex(function (r) { return r.e.id === x.id; });
    var xl = histLabels(h);
    var acc = lineChart({
      label: 'Precisão (%) em cada aplicação', max: 100, sel: sel, xl: xl,
      series: [{ cls: 'rx-ac', main: true, pts: h.rows.map(function (r) { return r.m.acc; }) }],
      tt: h.rows.map(function (r) { return histTip(r, 'Precisão ' + pc(r.m.acc) + ' (' + r.e.acertos + ' de ' + r.e.totalTrials + ')'); })
    });
    if (simple) return '<div class="rx-fig sm"><h4>Acertos a cada vez que você fez</h4>' + acc + '</div>';
    var rtMax = Math.max.apply(null, h.rows.map(function (r) { return r.m.rt.mean != null ? r.m.rt.mean + (r.m.rt.sd || 0) : 0; }).concat([100]));
    var rt = lineChart({
      label: 'Tempo médio de reação (ms) com desvio-padrão em cada aplicação', max: rtMax, sel: sel, xl: xl, L: 48,
      series: [{ cls: 'rx-ac', main: true, pts: h.rows.map(function (r) { return r.m.rt.mean; }), err: h.rows.map(function (r) { return r.m.rt.sd; }) }],
      tt: h.rows.map(function (r) { return histTip(r, 'TR médio ' + ms(r.m.rt.mean) + (r.m.rt.sd != null ? ' · DP ' + ms(r.m.rt.sd) : '') + ' · ' + r.m.rt.n + ' respostas'); })
    });
    var errMax = Math.max.apply(null, h.rows.map(function (r) { return Math.max(r.m.counts.om, r.m.counts.fa); }).concat([4]));
    var er = lineChart({
      label: 'Erros por omissão e por ação em cada aplicação', max: errMax, sel: sel, xl: xl,
      series: [
        { cls: 'rx-wa', main: true, pts: h.rows.map(function (r) { return r.m.counts.om; }) },
        { cls: 'rx-da', pts: h.rows.map(function (r) { return r.m.counts.fa; }) }
      ],
      tt: h.rows.map(function (r) { return histTip(r, 'Omissões ' + r.m.counts.om + ' · Erros por ação ' + r.m.counts.fa); })
    });
    return '<div class="rx-three">' +
      '<div class="rx-fig"><h4>Precisão (%)</h4>' + acc + '</div>' +
      '<div class="rx-fig"><h4>TR médio ± 1 DP (ms)</h4>' + rt + '</div>' +
      '<div class="rx-fig"><h4>Erros (nº de estímulos)</h4>' + er + '<div class="rx-legend">' + key('om', 'omissão') + key('fa', 'ação') + '</div></div>' +
      '</div>';
  }

  function historyTable(h, x) {
    return '<div class="rx-scroll"><table class="rx-table"><thead><tr><th>#</th><th>Data</th><th>Precisão</th><th>Omissões</th><th>Ações</th><th>TR médio</th><th>DP</th><th>d′</th></tr></thead><tbody>' +
      h.rows.map(function (r) {
        return '<tr' + (r.e.id === x.id ? ' class="cur"' : '') + '><td>' + r.k + '</td><td>' + dt(r.e.dateISO) + '</td><td>' + pc(r.m.acc) + '</td><td>' + r.m.counts.om + '</td><td>' + r.m.counts.fa +
          '</td><td>' + ms(r.m.rt.mean) + '</td><td>' + ms(r.m.rt.sd) + '</td><td>' + (r.m.sdt ? fmt(r.m.sdt.dprime, 2) : '—') + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  /* ---------- tabelas ---------- */
  function contingency(m) {
    var c = m.counts;
    if (m.isDir) {
      return '<div class="rx-scroll"><table class="rx-table"><thead><tr><th>Todos os estímulos exigem resposta</th><th>Lado certo</th><th>Lado errado</th><th>Sem resposta</th><th>Total</th></tr></thead><tbody>' +
        '<tr><th>Estímulos</th><td>' + c.hit + '</td><td>' + c.fa + '</td><td>' + c.om + '</td><td>' + m.n + '</td></tr></tbody></table></div>';
    }
    return '<div class="rx-scroll"><table class="rx-table"><thead><tr><th></th><th>Respondeu</th><th>Não respondeu</th><th>Total</th></tr></thead><tbody>' +
      '<tr><th>Estímulo go (exigia resposta)</th><td><b class="t-ok">' + c.hit + '</b> acertos</td><td><b class="t-wa">' + c.om + '</b> omissões</td><td>' + m.go + '</td></tr>' +
      '<tr><th>Estímulo no-go (exigia segurar)</th><td><b class="t-da">' + c.fa + '</b> erros por ação</td><td><b class="t-ok">' + c.cr + '</b> inibições corretas</td><td>' + m.nogo + '</td></tr>' +
      '<tr class="tot"><th>Total</th><td>' + (c.hit + c.fa) + '</td><td>' + (c.om + c.cr) + '</td><td>' + m.n + '</td></tr></tbody></table></div>';
  }

  function measureTable(m) {
    var r = m.rt, s = m.sdt, rows = [
      ['Precisão global', pc(m.acc), '(acertos go + inibições corretas) ÷ total de estímulos'],
      [m.isDir ? 'Acertos (lado certo)' : 'Taxa de acertos nos go (hit rate)', pc(m.hitRate), 'respostas corretas ÷ estímulos que exigiam resposta (' + m.go + ')'],
      ['Taxa de omissão', pc(m.omRate), 'omissões ÷ estímulos que exigiam resposta (' + m.go + ')'],
      [m.isDir ? 'Taxa de erro de direção' : 'Taxa de ação indevida (false alarm)', pc(m.faRate), m.isDir ? 'respostas no lado errado ÷ total de estímulos' : 'respostas a no-go ÷ estímulos que exigiam segurar (' + m.nogo + ')'],
      ['d′ (sensibilidade)', s ? fmt(s.dprime, 2) : '—', s ? 'z(hit rate) − z(false alarm), com correção log-linear' : (m.isDir ? 'não se aplica a tarefas de direção' : 'requer estímulos go e no-go')],
      ['Critério c (viés de resposta)', s ? fmt(s.c, 2) : '—', s ? '−[z(hit rate) + z(false alarm)] ÷ 2 · negativo = tendência a responder; positivo = tendência a conter' : '—'],
      ['TR médio', ms(r.mean), 'média dos TRs dos acertos com resposta (n = ' + r.n + ')'],
      ['TR mediana (Q1 – Q3)', r.median != null ? ms(r.median) + ' (' + fmt(r.q1, 0) + ' – ' + fmt(r.q3, 0) + ')' : '—', 'percentis 50, 25 e 75 (interpolação linear)'],
      ['Desvio-padrão do TR', ms(r.sd), 'desvio-padrão amostral (n − 1) — variabilidade intraindividual'],
      ['Coeficiente de variação do TR', r.cv != null ? fmt(r.cv, 1) + '%' : '—', 'DP ÷ média × 100'],
      ['TR mínimo – máximo', r.min != null ? fmt(r.min, 0) + ' – ' + fmt(r.max, 0) + ' ms' : '—', 'menor e maior TR entre os acertos com resposta']
    ];
    return '<div class="rx-scroll"><table class="rx-table rx-measures"><thead><tr><th>Medida</th><th>Valor</th><th>Como é calculada</th></tr></thead><tbody>' +
      rows.map(function (q) { return '<tr><th>' + q[0] + '</th><td>' + q[1] + '</td><td class="def">' + q[2] + '</td></tr>'; }).join('') + '</tbody></table></div>';
  }

  function trialTable(m) {
    return '<div class="rx-scroll rx-tall"><table class="rx-table"><thead><tr><th>Estímulo</th><th>Bloco</th><th>Classificação</th><th>TR (ms)</th></tr></thead><tbody>' +
      m.trials.map(function (t) {
        var b = blockOf(m, t.i);
        return '<tr><td>' + t.i + '</td><td>' + (b ? 'B' + b.b : '—') + '</td><td>' + KIND_TXT[t.kind](m) + '</td><td>' + (t.rt != null ? t.rt : '—') + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  /* ---------- tooltip único por tela ---------- */
  function bindTips(host) {
    var tip = host.querySelector('.rx-tip');
    function hide() { tip.hidden = true; }
    host.addEventListener('pointermove', function (e) {
      var t = e.target.closest ? e.target.closest('[data-tt]') : null;
      if (!t) { hide(); return; }
      var lines = t.getAttribute('data-tt').split('|');
      tip.textContent = '';
      lines.forEach(function (l, i) {
        var d = document.createElement('div');
        d.textContent = l; d.className = i ? 'tt-b' : 'tt-h';
        tip.appendChild(d);
      });
      tip.hidden = false;
      var w = tip.offsetWidth, h = tip.offsetHeight;
      var x = e.clientX + 14, y = e.clientY + 16;
      if (x + w > window.innerWidth - 8) x = e.clientX - w - 14;
      if (y + h > window.innerHeight - 8) y = e.clientY - h - 14;
      tip.style.left = Math.max(8, x) + 'px'; tip.style.top = Math.max(8, y) + 'px';
    });
    host.addEventListener('pointerleave', hide);
    window.addEventListener('scroll', hide, { passive: true });
    return function () { window.removeEventListener('scroll', hide); };
  }

  /* ---------- blocos de tela ---------- */
  function kpis(m, x) {
    var c = m.counts, r = m.rt, s = m.sdt;
    function k(cls, label, value, sub) { return '<div class="metric ' + cls + '"><i>' + label + '</i><b>' + value + '</b><small>' + sub + '</small></div>'; }
    return '<div class="rx-kpis">' +
      k('ok', 'Precisão global', pc(m.acc), (c.hit + c.cr) + ' de ' + m.n + ' estímulos') +
      k('wa', 'Omissões', String(c.om), pc(m.omRate) + ' de ' + m.go + (m.go === 1 ? ' estímulo que exigia resposta' : ' estímulos que exigiam resposta')) +
      k('da', m.isDir ? 'Erros de direção' : 'Erros por ação', String(c.fa), m.isDir ? pc(m.faRate) + ' dos ' + m.n + ' estímulos' : (m.nogo ? pc(m.faRate) + ' de ' + m.nogo + (m.nogo === 1 ? ' estímulo no-go' : ' estímulos no-go') : 'nenhum estímulo no-go')) +
      k('', 'TR médio', ms(r.mean), r.n ? 'mediana ' + ms(r.median) + ' · n = ' + r.n : 'sem respostas válidas') +
      k('', 'Variabilidade do TR', r.sd != null ? 'DP ' + fmt(r.sd, 0) + ' ms' : '—', r.cv != null ? 'CV ' + fmt(r.cv, 1) + '%' : 'requer 2 ou mais respostas') +
      (m.isDir ? '' : k('', 'd′ (sensibilidade)', s ? fmt(s.dprime, 2) : '—', s ? 'critério c = ' + fmt(s.c, 2) : 'requer estímulos go e no-go')) +
      '</div>';
  }

  function header(x, task, m) {
    function cell(a, b) { return '<div><i>' + a + '</i><b>' + b + '</b></div>'; }
    return '<div class="rx-head">' +
      cell('Paciente', esc(x.patientName || '—')) +
      cell('Tarefa', esc(x.taskName || '—')) +
      cell('Aplicação', dt(x.dateISO)) +
      cell('Estímulos', String(m.n) + (m.ok && !m.isDir ? ' (' + m.go + ' go · ' + m.nogo + ' no-go)' : '')) +
      cell('Intervalo entre estímulos', m.isi ? m.isi + ' ms' : '—') +
      cell('Aparelho', esc(x.dispositivo || '—')) +
      '</div>';
  }

  function notes(m) {
    return '<div class="rx-notes">' +
      '<p><b>Leitura dos dados.</b> Omissões (não responder a um estímulo go) costumam ser interpretadas como lapsos de atenção; erros por ação (responder a um no-go) como falha de inibição de resposta; a variabilidade do TR (DP, CV) como oscilação da atenção ao longo da tarefa. ' +
      (m.isDir ? 'Nas tarefas de direção, o erro por ação é o lado errado, não uma resposta a um no-go. ' : '') +
      'São indicadores descritivos desta aplicação, não diagnóstico.</p>' +
      '<p><b>Limites.</b> Não há valores de referência normativos: nenhuma medida é classificada como normal ou alterada. Com ' + m.n + ' estímulos, cada estímulo vale ' + fmt(100 / m.n, 1) + ' pontos percentuais de precisão, e d′, DP e CV têm pouca precisão com poucas respostas. ' +
      'O TR é medido no navegador e inclui a latência do aparelho (teclado, tela ou toque), que não é descontada.</p>' +
      '</div>' +
      '<details class="rx-method"><summary>Como as medidas são calculadas</summary>' +
      '<p>Cada estímulo é classificado a partir do que o teste gravou: <b>acerto go</b> (acertou e tem TR), <b>inibição correta</b> (acertou sem responder a um no-go), <b>omissão</b> e <b>erro por ação</b>. ' +
      'Os blocos dividem a tarefa em partes consecutivas de tamanho igual (ou quase) para mostrar a evolução ao longo do tempo.</p>' +
      '<p>d′ e critério c seguem a teoria de detecção de sinais (Green &amp; Swets, 1966), com a correção log-linear de Hautus (1995), (x + 0,5) ÷ (N + 1), para evitar taxas de 0% ou 100%; ver também Stanislaw &amp; Todorov (1999). ' +
      'O desvio-padrão é amostral (n − 1); mediana e quartis usam interpolação linear.</p></details>';
  }

  /* Quais painéis aparecem (escolha do profissional, lembrada neste navegador). */
  var KEY = 'psilog.resultados.painéis';
  function loadHidden() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function saveHidden(h) { try { localStorage.setItem(KEY, JSON.stringify(h)); } catch (e) { /* armazenamento indisponível */ } }

  var DKEY = 'psilog.resultados.detalhe';
  function loadDetail() { try { return localStorage.getItem(DKEY) !== '0'; } catch (e) { return true; } }
  function saveDetail(on) { try { localStorage.setItem(DKEY, on ? '1' : '0'); } catch (e) { /* armazenamento indisponível */ } }

  function panel(id, title, sub, body) {
    return '<section class="rx-panel" data-pn="' + id + '"><div class="rx-ph"><h3>' + title + '</h3>' + (sub ? '<p>' + sub + '</p>' : '') + '</div>' + body + '</section>';
  }

  /* ---------- telas ---------- */
  function proView(x, task, m) {
    var h = history(x, task), out = '';
    out += header(x, task, m) + kpis(m, x);
    if (!m.ok) {
      return out + '<p class="note">Este exame foi gravado sem a série por estímulo (tempo e tipo de cada resposta); só os totais estão disponíveis.</p>';
    }
    if (!m.consistent) out += '<p class="note">Atenção: a contagem recalculada a partir da série por estímulo difere dos totais gravados no exame.</p>';
    var pn = [];
    pn.push(['serie', 'Resposta a cada estímulo', panel('serie', 'Resposta a cada estímulo', 'Tempo de reação dos acertos com resposta e tipo de evento em cada estímulo. Faixa: média ± 1 DP.', '<div class="rx-fig">' + seriesChart(m) + '</div>' + seriesLegend(m))]);
    pn.push(['blocos', 'Desempenho por blocos', panel('blocos', 'Desempenho ao longo da tarefa', 'Blocos de estímulos consecutivos' + (m.blocks.length ? ' (' + m.blocks.map(function (b) { return 'B' + b.b + ': ' + b.n; }).join(' · ') + ' estímulos).' : '.'),
      '<div class="rx-two"><div class="rx-fig"><h4>Precisão por bloco (%)</h4>' + blockAcc(m) + '</div><div class="rx-fig"><h4>TR médio por bloco (ms)</h4>' + blockRt(m) + '</div></div>')]);
    pn.push(['matriz', 'Matriz de respostas', panel('matriz', 'Matriz de respostas', m.isDir ? '' : 'Estímulo exigido × resposta dada.', contingency(m))]);
    pn.push(['medidas', 'Medidas e definições', panel('medidas', 'Medidas e definições', '', measureTable(m))]);
    if (h.all >= 2) {
      pn.push(['evolucao', 'Evolução entre aplicações', panel('evolucao', 'Evolução entre aplicações desta tarefa', h.all > 12 ? 'Últimas 12 de ' + h.all + ' aplicações. O círculo destaca a aplicação aberta.' : h.all + ' aplicações. O círculo destaca a aplicação aberta.', trendCharts(h, x, false) + historyTable(h, x))]);
    }
    var hid = loadHidden();
    out += '<div class="rx-pick noprint" role="group" aria-label="Escolher o que mostrar"><span>Mostrar:</span>' +
      pn.map(function (q) { return '<button type="button" class="rx-chip" data-pick="' + q[0] + '" aria-pressed="' + (!hid[q[0]]) + '">' + q[1] + '</button>'; }).join('') +
      '<button type="button" class="rx-chip all" data-pick="*">Todos</button></div>';
    out += pn.map(function (q) { return hid[q[0]] ? q[2].replace('<section class="rx-panel"', '<section class="rx-panel" hidden') : q[2]; }).join('');
    if (h.all < 2) out += '<p class="note">Faça esta tarefa mais de uma vez para ver a evolução entre aplicações.</p>';
    out += '<details class="rx-method"><summary>Tabela de estímulos (' + m.n + ')</summary>' + trialTable(m) + '</details>';
    return out + notes(m);
  }

  function patientView(x, task, m, detail) {
    var h = history(x, task), c = m.counts;
    var out = '<div class="grid"><div class="metric ok"><i>Você acertou</i><b>' + x.acertos + ' de ' + x.totalTrials + '</b></div></div>' +
      '<p class="legend"><span><b style="background:var(--ok)"></b>acerto</span><span><b style="background:var(--wa)"></b>omissão</span><span><b style="background:var(--da)"></b>ação</span></p>' +
      '<div class="timeline">' + (x.timeline || []).map(function (t, i) {
        return '<span style="background:' + COLORS[t] + '" title="Estímulo ' + (i + 1) + '"></span>';
      }).join('') + '</div>' +
      '<p class="note">Não respondeu quando devia: ' + x.errosOmissao + ' · Respondeu quando não devia (ou no lado errado): ' + x.errosAcao + '.</p>';
    if (!detail && m.ok && m.blocks.length > 1) out += '<div class="rx-fig sm"><h4>Acertos em cada parte do teste (%)</h4>' + blockAcc(m) + '</div>';
    if (!detail) out += h.all >= 2 ? trendCharts(h, x, true) : '<p class="note">Faça esta atividade mais de uma vez para ver a evolução.</p>';
    return out;
  }

  P.views.resultados = {
    title: 'Resultados',
    mount: async function (root, params) {
      root.innerHTML =
        '<div class="card"><h2>Resultados dos testes</h2>' +
          '<div class="row"><label>Paciente<select id="sp"></select></label><label>Teste aplicado<select id="se"></select></label></div>' +
          '<div id="body"></div><div class="rx-tip" hidden></div>' +
        '</div>';

      var patients = P.auth.scope(await P.DB.all('patients'));
      exams = await P.DB.all('exams');
      var sp = root.querySelector('#sp'), se = root.querySelector('#se'), body = root.querySelector('#body');
      var unbind = bindTips(root);

      P.utils.fillPatientSelect(sp, patients, params.get('p'));
      if (P.auth.isPatient()) sp.parentNode.style.display = 'none';

      function listExams() {
        var list = exams
          .filter(function (e) { return e.patientId === sp.value; })
          .sort(function (a, b) { return a.taskId > b.taskId ? 1 : -1; });
        se.innerHTML = list.length
          ? list.map(function (e) { return '<option value="' + esc(e.id) + '">' + esc(e.taskName) + ' · ' + P.utils.date(e.dateISO) + '</option>'; }).join('')
          : '<option value="">— nenhum teste —</option>';
        var wanted = params.get('e');
        if (wanted && list.some(function (e) { return e.id === wanted; })) se.value = wanted;
        draw();
      }

      function draw() {
        var x = exams.find(function (e) { return e.id === se.value; });
        if (!x) { body.innerHTML = '<div class="empty">Selecione um paciente com teste aplicado.</div>'; return; }
        var task = P.TASKS.find(function (t) { return t.id === x.taskId; });
        var m = M.compute(x, task);
        var simple = P.auth.isPatient();

        var detail = simple && loadDetail();
        body.innerHTML = (simple
          ? patientView(x, task, m, detail) +
            '<div class="rx-pick noprint"><button type="button" class="rx-chip" id="detail" aria-pressed="' + detail + '">Análise detalhada</button></div>' +
            (detail ? proView(x, task, m) : '')
          : proView(x, task, m)) +
          '<div class="acts"><button class="btn g" id="print" type="button">Imprimir / salvar PDF</button>' +
          (simple ? '' : '<button class="btn d" id="del" type="button">Excluir teste</button>') + '</div>';

        if (body.querySelector('#detail')) body.querySelector('#detail').onclick = function () { saveDetail(!detail); draw(); };
        body.querySelectorAll('[data-pick]').forEach(function (b) {
          b.onclick = function () {
            var hid = loadHidden(), id = b.dataset.pick;
            if (id === '*') hid = {}; else hid[id] = !hid[id];
            saveHidden(hid);
            body.querySelectorAll('.rx-panel').forEach(function (el) { el.hidden = !!hid[el.dataset.pn]; });
            body.querySelectorAll('.rx-chip[data-pick]:not(.all)').forEach(function (c) { c.setAttribute('aria-pressed', String(!hid[c.dataset.pick])); });
          };
        });
        body.querySelector('#print').onclick = function () { window.print(); };
        if (body.querySelector('#del')) body.querySelector('#del').onclick = async function () {
          if (!confirm('Excluir este teste?')) return;
          await P.DB.del('exams', x.id);
          exams = exams.filter(function (e) { return e.id !== x.id; });
          listExams();
        };
      }

      sp.onchange = listExams;
      se.onchange = draw;
      listExams();
      return unbind;
    }
  };
})(window.Psilog);
