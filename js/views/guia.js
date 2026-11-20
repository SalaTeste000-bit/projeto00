/* Tela: Guia do teste. Passo a passo de aplicação e instruções padronizadas de cada tarefa (serve de tutorial/anexo). */
(function (P) {
  P.VERSION = '1.1.0';
  var esc = P.utils.esc;
  P.views.guia = {
    title: 'Guia do teste',
    mount: function (root) {
      var groups = {}, order = [];
      (P.TASKS || []).forEach(function (t) {
        if (!groups[t.grupo]) { groups[t.grupo] = []; order.push(t.grupo); }
        groups[t.grupo].push(t);
      });
      var list = order.map(function (g) {
        return '<h3>' + esc(g) + '</h3><ul>' + groups[g].map(function (t) {
          return '<li><b>' + esc(t.nome) + '</b> · ' + esc(t.desc || '') + '<br><small>' +
            (t.regra || 'Aperte <b>ESPAÇO</b> quando aparecer a letra alvo e não aperte nos demais estímulos.') + '</small></li>';
        }).join('') + '</ul>';
      }).join('');
      root.innerHTML =
        '<div class="card"><h2>Guia do teste</h2>' +
        '<p class="note">Versão do software: <b>' + P.VERSION + '</b>. Ferramenta de apoio: não classifica resultados como normais ou alterados.</p>' +
        '<h3>Como aplicar</h3><ol>' +
        '<li>Cadastre o paciente e confirme o consentimento (responsável legal, se menor).</li>' +
        '<li>Escolha a tarefa em <b>Tarefas cognitivas</b> e deixe o paciente em local calmo, com a tela inteira.</li>' +
        '<li>Leia a instrução da tarefa em voz alta, sempre igual, e faça a aplicação.</li>' +
        '<li>Veja os resultados e use <b>Imprimir / salvar PDF</b> para gerar o relatório.</li>' +
        '<li>Em <b>Dados e backups</b>, exporte o CSV com todos os estímulos e tempos.</li></ol>' +
        '<h3 style="margin-top:1.2rem">Instruções por tarefa</h3>' + list +
        '<div class="acts noprint"><button class="btn g" id="print" type="button">Imprimir / salvar PDF</button></div></div>';
      root.querySelector('#print').onclick = function () { window.print(); };
    }
  };
})(window.Psilog);
