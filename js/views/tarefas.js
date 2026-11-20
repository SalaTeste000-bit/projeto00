/* Tela: Seleção de tarefa. */
(function (P) {
  var GLYPHS = { sel: '◎', alt: '⇄', rep: '↻', dir: '↔', custom: '✦' };
  var esc = P.utils.esc;

  P.views.tarefas = {
    title: 'Tarefas',
    mount: async function (root, params) {
      root.innerHTML =
        '<div class="card"><h2>Seleção de tarefa</h2>' +
          '<label>Paciente<select id="sel"></select></label>' +
          '<div class="grid" id="info" style="margin:16px 0"></div>' +
          '<div class="lvl-head">' +
          '<button type="button" class="lvl-logo" id="lvlLogo" aria-expanded="true" aria-controls="lvlBody">' +
            '<img src="assets/img/logo.png" alt="" width="30" height="30"><b>psilog</b><span class="chev" aria-hidden="true">▾</span>' +
          '</button>' +
          '<span class="note" id="lvlCrumb"></span>' +
        '</div>' +
        '<div id="lvlBody">' +
          '<div class="lvl-tabs" id="lvlTabs" role="tablist" aria-label="Dificuldade"></div>' +
          '<div class="grid lvl-panel" id="tasks" role="tabpanel" aria-live="polite"></div>' +
        '</div>' +
          '<div class="acts"><button class="btn d" id="del" type="button">Excluir paciente</button></div>' +
        '</div>';

      var patients = P.auth.scope(await P.DB.all('patients'));
      var exams = await P.DB.all('exams');
      var sel = root.querySelector('#sel');
      var info = root.querySelector('#info');
      var tasks = root.querySelector('#tasks');

      patients.sort(function (a, b) { return b.createdAt > a.createdAt ? 1 : -1; });
      P.utils.fillPatientSelect(sel, patients, params.get('p'));
      if (P.auth.isPatient()) {
        sel.parentNode.style.display = 'none';
        root.querySelector('#del').style.display = 'none';
      }
      var logo = root.querySelector('#lvlLogo');
      var body = root.querySelector('#lvlBody');
      var tabs = root.querySelector('#lvlTabs');
      var crumb = root.querySelector('#lvlCrumb');
      var LEVELS = [['Fácil', 'f'], ['Médio', 'm'], ['Difícil', 'd']];
      var levelOf = function (t) { return LEVELS.some(function (l) { return l[0] === t.nivel; }) ? t.nivel : 'Médio'; };
      if (P.tarefasAberto === undefined) P.tarefasAberto = true;
      var vis = function (p) { return P.TASKS.filter(function (t) { return P.taskVisible(t, p.id); }); };

      function draw() {
        var p = patients.find(function (x) { return x.id === sel.value; });
        if (!p) {
          info.innerHTML = '<div class="empty">Cadastre um paciente primeiro.</div>';
          tasks.innerHTML = '';
          return;
        }
        var done = exams.filter(function (e) { return e.patientId === p.id; }).map(function (e) { return e.taskId; });
        info.innerHTML = [
          ['Idade', p.idade || '—'],
          ['Escolaridade', p.escolaridade],
          ['Lateralidade', p.lateralidade],
          ['Tarefas aplicadas', new Set(done).size + ' / ' + vis(p).length]
        ].map(function (x) { return '<div class="metric sm"><i>' + x[0] + '</i><b>' + esc(x[1]) + '</b></div>'; }).join('');

        var all = vis(p);
        var cur = P.tarefasNivel || null;

        tabs.innerHTML = LEVELS.map(function (l) {
          var list = all.filter(function (t) { return levelOf(t) === l[0]; });
          var feitas = list.filter(function (t) { return done.includes(t.id); }).length;
          return '<button type="button" role="tab" class="lvl-tab lvl-' + l[1] + (cur === l[0] ? ' on' : '') +
            '" data-n="' + l[0] + '" aria-selected="' + (cur === l[0]) + '">' +
            '<span class="lvl-dot"></span><span class="lvl-txt"><b>' + l[0] + '</b><small>' +
            list.length + ' atividade' + (list.length === 1 ? '' : 's') + ' · ' + feitas + ' feita' + (feitas === 1 ? '' : 's') +
            '</small></span></button>';
        }).join('');

        crumb.textContent = cur ? 'Dificuldade ' + cur.toLowerCase() : 'Escolha uma dificuldade';

        if (!cur) {
          tasks.innerHTML = '<div class="empty lvl-hint">Abra uma aba (Fácil, Médio ou Difícil) para ver as atividades.</div>';
          return;
        }
        tasks.innerHTML = all.filter(function (t) { return levelOf(t) === cur; }).map(function (t) {
          return '<a class="tile" href="' + P.router.href('teste', { p: p.id, t: t.id }) + '">' +
            '<div class="ic">' + (GLYPHS[t.ic] || t.id) + '</div>' +
            '<b>' + t.nome + (t.ativa === false ? ' <small>(inativa)</small>' : '') + (done.includes(t.id) ? ' · refazer' : '') + '</b><span>' + t.desc + '</span></a>';
        }).join('') || '<div class="empty lvl-hint">Nenhuma atividade nesta dificuldade.</div>';
      }

      function setOpen(open) {
        P.tarefasAberto = open;
        body.hidden = !open;
        logo.setAttribute('aria-expanded', String(open));
        logo.classList.toggle('closed', !open);
      }
      setOpen(P.tarefasAberto);
      logo.onclick = function () { setOpen(!P.tarefasAberto); };

      tabs.onclick = function (e) {
        var b = e.target.closest('.lvl-tab');
        if (!b) return;
        P.tarefasNivel = (P.tarefasNivel === b.dataset.n) ? null : b.dataset.n;
        draw();
      };
      sel.onchange = draw;
      draw();

      root.querySelector('#del').onclick = async function () {
        var id = sel.value;
        if (!id || !confirm('Excluir este paciente e seus exames?')) return;
        for (var e of exams) if (e.patientId === id) await P.DB.del('exams', e.id);
        for (var u of await P.DB.all('users')) if (u.patientId === id) await P.DB.del('users', u.id);
        await P.DB.del('patients', id);
        P.router.go('tarefas');
      };
    }
  };
})(window.Psilog);
