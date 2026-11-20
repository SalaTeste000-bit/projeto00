/* Tela: Dados e backup (JSON, CSV, importação, dados de exemplo). */
(function (P) {
  function rand(a, b) { return a + Math.random() * (b - a); }

  async function loadSamples() {
    var today = new Date().toISOString().slice(0, 10);
    for (var name of ['Ana Souza', 'Bruno Lima', 'Carla Dias', 'Davi Rocha']) {
      var patient = await P.DB.put('patients', {
        nome: name, dataExame: today, idade: String(rand(8, 60) | 0),
        escolaridade: 'Médio', lateralidade: 'Destro', anosEstudo: 11, obs: 'Exemplo'
      });
      for (var t of P.TASKS) {
        var omissions = rand(0, 4) | 0, commissions = rand(0, 4) | 0, timeline = [];
        for (var i = 0; i < t.n; i++) {
          timeline.push(i < omissions ? 'omissao' : i < omissions + commissions ? 'acao' : 'ok');
        }
        await P.DB.put('exams', {
          patientId: patient.id, patientName: name, taskId: t.id, taskName: t.nome,
          dateISO: new Date().toISOString(), totalTrials: t.n,
          acertos: t.n - omissions - commissions, errosOmissao: omissions, errosAcao: commissions,
          tempoMedioReacaoMs: rand(380, 640), timeline: timeline,
          rts: timeline.map(function (x) { return x === 'ok' ? Math.round(rand(350, 650)) : 0; })
        });
      }
    }
  }

  P.views.dados = {
    title: 'Dados',
    mount: function (root) {
      root.innerHTML =
        '<div class="card"><h2>Dados e backup</h2>' +
          '<p class="note">Tudo fica salvo neste navegador (IndexedDB). Faça backup regularmente — dados de pacientes são sensíveis, guarde os arquivos com cuidado.</p>' +
          '<div class="grid">' +
            '<button class="tile" id="ej" type="button"><div class="ic">💾</div><b>Exportar backup (JSON)</b><span>Pacientes e exames.</span></button>' +
            '<button class="tile" id="ec" type="button"><div class="ic">📄</div><b>Exportar exames (CSV)</b><span>Abre no Excel.</span></button>' +
            '<label class="tile"><div class="ic">📥</div><b>Importar backup</b><span>Arquivo JSON do Psilog.</span><input type="file" id="im" accept=".json" hidden></label>' +
            '<button class="tile" id="dm" type="button"><div class="ic">✨</div><b>Carregar dados de exemplo</b><span>4 pacientes fictícios.</span></button>' +
            '<button class="tile" id="cl" type="button"><div class="ic">🗑️</div><b>Apagar tudo</b><span>Não pode ser desfeito.</span></button>' +
          '</div>' +
          '<form id="clbox" class="clear-box" hidden>' +
            '<label>Isto apaga pacientes, exames e acessos de pacientes e não pode ser desfeito. Digite <b>APAGAR</b> para confirmar:' +
            '<input id="clin" autocomplete="off" spellcheck="false"></label>' +
            '<div class="acts"><button class="btn d" type="submit">Apagar definitivamente</button>' +
            '<button class="btn g" id="clno" type="button">Cancelar</button></div>' +
          '</form>' +
        '</div>';

      var $ = function (id) { return root.querySelector('#' + id); };

      $('ej').onclick = async function () {
        P.utils.download('psilog-backup.json', JSON.stringify(await P.DB.dump(), null, 1), 'application/json');
      };

      $('ec').onclick = async function () {
        var exams = await P.DB.all('exams');
        var header = ['paciente', 'tarefa', 'data', 'acertos', 'omissao', 'acao', 'tempo_medio_ms'];
        var rows = exams.map(function (e) {
          return [e.patientName, e.taskName, (e.dateISO || '').slice(0, 10), e.acertos, e.errosOmissao, e.errosAcao, Math.round(e.tempoMedioReacaoMs || 0)];
        });
        var text = [header].concat(rows).map(function (r) { return r.map(P.utils.csv).join(';'); }).join('\r\n');
        // ";" é o separador do Excel em português; \uFEFF (BOM) faz o Excel reconhecer UTF-8.
        P.utils.download('psilog-exames.csv', '\uFEFF' + text, 'text/csv;charset=utf-8');
      };

      $('im').onchange = async function () {
        var input = this;
        try {
          var json = JSON.parse(await input.files[0].text());
          var ok = json && typeof json === 'object' && ['patients', 'exams', 'customTasks'].some(function (k) { return Array.isArray(json[k]); });
          if (!ok) throw new Error('formato');
          await P.DB.load(json);
          await P.refreshTasks();   // atividades importadas aparecem sem recarregar
          P.toast('Backup importado.');
        } catch (e) { P.toast('Arquivo inválido.'); }
        input.value = '';
      };

      $('dm').onclick = async function () { if (!confirm('Isto cria 4 pacientes FICTÍCIOS com exames inventados. Use só para testar. Continuar?')) return; await loadSamples(); P.toast('Dados de exemplo carregados.'); };

      $('cl').onclick = function () { $('clbox').hidden = false; $('clin').value = ''; $('clin').focus(); };
      $('clno').onclick = function () { $('clbox').hidden = true; };
      $('clbox').onsubmit = async function (e) {
        e.preventDefault();
        if ($('clin').value.trim() !== 'APAGAR') { P.toast('Digite APAGAR para confirmar.'); return; }
        await P.DB.clear();
        $('clbox').hidden = true;
        P.toast('Dados apagados.');
      };
    }
  };
})(window.Psilog);
