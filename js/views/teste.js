/* Tela: Aplicação do teste go/no-go (letras; não responder à letra K). */
(function (P) {
  P.views.teste = {
    title: 'Teste',
    mount: async function (root, params) {
      var pid = P.auth.isPatient() ? P.auth.user.patientId : params.get('p');
      var patient = await P.DB.get('patients', pid || '');
      var task = P.TASKS.find(function (t) { return t.id === params.get('t'); });
      if (!patient || !task || !P.taskVisible(task, patient.id)) { P.router.go('tarefas'); return; }

      var back = P.router.href('tarefas', { p: patient.id });
      root.innerHTML =
        '<div class="card" id="intro">' +
          '<h2>' + task.nome + ' — ' + P.utils.esc(patient.nome) + '</h2>' +
          '<p>' + (task.regra || 'Aperte <b>ESPAÇO</b> (ou o botão) para toda letra, <b>exceto a letra K</b>.') + ' Seja rápido e preciso.</p>' +
          '<div class="acts"><button class="btn g" id="tr" type="button">Treinar (não conta)</button><button class="btn" id="go" type="button">Começar</button><a class="btn g" href="' + back + '">Voltar</a></div>' +
        '</div>' +
        '<div class="test-stage" id="stage">' +
          '<div class="test-top"><a class="test-exit" href="' + back + '">✕ Sair <small>(Esc)</small></a><span class="test-name"><span id="label"></span><span class="test-tag" id="treino"></span></span><span id="progress"></span></div>' +
          '<div class="test-progress" aria-hidden="true"><i id="bar"></i></div>' +
          '<div class="test-rule" id="rule" role="status" aria-live="polite"></div>' +
          '<div class="test-center">' +
            '<div class="stimulus" id="stim"></div>' +
            (task.tipo === 'dir'
              ? '<div class="acts"><button class="btn" id="bl" type="button">← Esquerda</button><button class="btn" id="br" type="button">Direita →</button></div><p class="test-hint">ou use as setas ← → do teclado</p>'
              : '<button class="btn" id="resp" type="button">RESPONDER</button><p class="test-hint">ou aperte a barra de <b>espaço</b></p>') +
          '</div>' +
        '</div>';

      var $ = function (id) { return root.querySelector('#' + id); };
      var stim = $('stim');

      /* Regra curta, sempre visível no topo e no centro da tela. */
      var SHAPE_COLOR = { '▲': '#38b8ac', '●': '#e8a24a' };
      function shortRule(t) {
        if (t.tipo === 'sel') return 'Aperte só quando aparecer o <b style="color:#38b8ac">▲ verde</b>';
        if (t.tipo === 'rep') return t.volta === 2 ? 'Aperte se o número for <b>igual ao de 2 antes</b>' : 'Aperte se o número for <b>igual ao anterior</b>';
        if (t.tipo === 'dir') return t.inv ? '<b style="color:#38b8ac">Verde</b>: mesmo lado · <b style="color:#ec8279">Vermelha</b>: lado oposto' : 'Aperte para o <b>mesmo lado</b> da seta';
        return 'Aperte em toda letra, <b>menos o K</b>';
      }
      var ruleEl = $('rule'), curRule = null, ruleTimer;
      function setRule(shape, changed) {
        if (shape === curRule) return;
        curRule = shape;
        ruleEl.innerHTML = '<span class="rule-badge">↻ A regra mudou!</span><span class="rule-lbl">REGRA</span>' +
          '<span class="rule-line"><span class="rule-txt">Aperte só quando aparecer</span>' +
          '<span class="rule-shape" style="color:' + SHAPE_COLOR[shape] + '">' + shape + '</span></span>';
        clearTimeout(ruleTimer);
        ruleEl.classList.remove('changed');
        if (changed) {
          void ruleEl.offsetWidth;                       // reinicia a animação
          ruleEl.classList.add('changed');
          ruleTimer = setTimeout(function () { ruleEl.classList.remove('changed'); }, 1800);
        }
      }

      var cur = task, practice = false, seq = [];

      var idx = -1, results = [], t0 = 0, answered = false, live = false, dead = false;
      var trialTimer, countdown, pressTimer;

      function respond(side) {
        if (!live || answered || idx < 0) return;
        answered = true;
        var it = seq[idx];
        results.push({ l: it.txt, nogo: it.nogo, r: 1, rt: performance.now() - t0, wrong: !!it.ans && side !== it.ans });
        stim.classList.add('pressed');
        clearTimeout(trialTimer);
        pressTimer = setTimeout(function () { stim.classList.remove('pressed'); next(); }, 90);
      }

      function next() {
        if (dead) return;
        idx++;
        if (idx >= seq.length) return finish();
        answered = false;
        var it = seq[idx], letter = it.txt;
        $('progress').textContent = (idx + 1) + ' de ' + cur.n;
        $('bar').style.width = ((idx + 1) / cur.n * 100) + '%';
        if (it.rule) setRule(it.rule, it.changed);
        stim.className = 'stimulus ' + (it.color ? 'tint' : 'neutral');   // a cor não pode entregar a resposta
        stim.style.color = stim.style.borderColor = it.color || '';
        stim.textContent = letter;
        t0 = performance.now();
        trialTimer = setTimeout(function () {
          if (!answered) results.push({ l: letter, nogo: it.nogo, r: 0, wrong: false });
          next();
        }, cur.isi);
      }

      async function finish() {
        live = false;
        if (practice) {
          practice = false; results = [];
          $('stage').classList.remove('on');
          P.toast('Treino concluído. Quando estiver pronto, clique em Começar.');
          return;
        }
        var hits = 0, omissions = 0, commissions = 0, sum = 0, n = 0, timeline = [], rts = [];
        results.forEach(function (x) {
          if (x.wrong) { rts.push(0); commissions++; timeline.push('acao'); }   // lado errado
          else if (!x.nogo && x.r) {                  // acertou o "go"
            hits++; sum += x.rt; n++; timeline.push('ok'); rts.push(Math.round(x.rt));
          } else {
            rts.push(0);
            if (!x.nogo) { omissions++; timeline.push('omissao'); }          // não respondeu ao "go"
            else if (x.r) { commissions++; timeline.push('acao'); }          // respondeu ao "no-go"
            else { hits++; timeline.push('ok'); }                            // segurou no "no-go"
          }
        });
        var exam = await P.DB.put('exams', {
          patientId: patient.id, patientName: patient.nome,
          taskId: task.id, taskName: task.nome,
          dateISO: new Date().toISOString(),
          totalTrials: results.length,
          acertos: hits, errosOmissao: omissions, errosAcao: commissions,
          tempoMedioReacaoMs: n ? sum / n : null,
          timeline: timeline, rts: rts, dispositivo: P.utils.device()
        });
        if (!dead) P.router.go('resultados', { p: patient.id, e: exam.id });
      }

      function start(isPractice) {
        if (live || $('stage').classList.contains('on')) return;   // evita iniciar duas vezes
        if (document.activeElement && document.activeElement.blur) document.activeElement.blur();   // ESPAÇO não reaciona o botão
        practice = isPractice;
        cur = isPractice ? Object.assign({}, task, { n: 6, isi: Math.round(task.isi * 1.5) }) : task;
        seq = P.gen(cur); idx = -1; results = []; answered = false;
        $('stage').classList.add('on');
        $('label').textContent = task.nome;                                  // nome da tarefa sempre visível
        $('treino').textContent = isPractice ? 'Treino · não conta' : '';
        $('progress').textContent = '0 de ' + cur.n; $('bar').style.width = '0';
        curRule = null; ruleEl.classList.remove('changed');
        if (seq[0] && seq[0].rule) setRule(seq[0].rule, false); else ruleEl.innerHTML = '<span class="rule-lbl">REGRA</span><span class="rule-txt">' + shortRule(task) + '</span>';
        stim.className = 'stimulus'; stim.style.color = stim.style.borderColor = '';
        var n = 3;
        stim.textContent = n;
        countdown = setInterval(function () {
          n--;
          if (n <= 0) { clearInterval(countdown); live = true; next(); }
          else stim.textContent = n;
        }, 700);
      }
      /* Toque: responde no instante em que o dedo encosta. O clique do teclado (detail 0) continua valendo. */
      function tap(el, fn) {
        el.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse' || e.button === 0) { e.preventDefault(); fn(); } });
        el.addEventListener('click', function (e) { if (e.detail === 0) fn(); });
      }
      $('go').onclick = function () { start(false); };
      $('tr').onclick = function () { start(true); };
      if (task.tipo === 'dir') {
        tap($('bl'), function () { respond('E'); });
        tap($('br'), function () { respond('D'); });
      } else tap($('resp'), function () { respond(); });

      function onKey(e) {
        if (task.tipo === 'dir') {
          if (e.code === 'ArrowLeft') { e.preventDefault(); respond('E'); }
          if (e.code === 'ArrowRight') { e.preventDefault(); respond('D'); }
        } else if (e.code === 'Space') { e.preventDefault(); respond(); }
        if (e.code === 'Escape') P.router.go('tarefas', { p: patient.id });
      }
      document.addEventListener('keydown', onKey);

      // Limpeza ao sair da tela (evita timers e atalhos "vazando").
      return function () {
        dead = true;
        clearTimeout(trialTimer); clearTimeout(pressTimer); clearTimeout(ruleTimer); clearInterval(countdown);
        document.removeEventListener('keydown', onKey);
      };
    }
  };
})(window.Psilog);
