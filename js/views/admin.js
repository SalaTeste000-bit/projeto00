/* Tela: Administrador. Entra em qualquer perfil (profissional ou paciente) deste navegador, sem senha nem e-mail.
   Os dados já ficam só neste navegador (IndexedDB); esta tela não cria nenhuma conta na nuvem. */
(function (P) {
  var esc = P.utils.esc;
  var byName = function (a, b) { return String(a.nome).localeCompare(String(b.nome)); };

  P.views.admin = {
    title: 'Administrador',
    mount: async function (root) {
      async function enter(kind, id) {
        try {
          P.auth.setAdmin(true);
          if (kind === 'pro') await P.auth.enterPro(id); else await P.auth.enterPatient(id);
          P.router.go('inicio');
        } catch (err) { P.toast(err.message); }
      }

      async function draw(open) {
        var pros = (await P.auth.professionals()).sort(byName);
        var pats = (await P.DB.all('patients')).sort(byName);
        var cur = P.auth.user ? P.auth.user.id : '';

        function rows(list, kind) {
          if (!list.length) return '<p class="note">Nenhum cadastro ainda.</p>';
          return '<ul class="adm-list">' + list.map(function (p) {
            var uid = kind === 'pro' ? p.id : '';
            var sub = kind === 'pat' && p.idade ? '<small>' + esc(p.idade) + ' anos</small>' : '';
            return '<li><span class="adm-name">' + esc(p.nome) + sub + '</span>' +
              '<button class="btn g" type="button" data-' + kind + '="' + esc(p.id) + '"' + (uid && uid === cur ? ' disabled' : '') + '>' + (uid && uid === cur ? 'Em uso' : 'Entrar') + '</button></li>';
          }).join('') + '</ul>';
        }

        root.innerHTML =
          '<div class="card adm">' +
            '<h2>Acesso de administrador</h2>' +
            '<p class="note">Entre com qualquer perfil, sem senha nem e-mail. Os dados ficam neste navegador.</p>' +
            '<h3>Profissionais</h3>' + rows(pros, 'pro') +
            '<details class="adm-new"' + (open === 'pro' ? ' open' : '') + '><summary>Cadastrar profissional</summary>' +
              '<form id="fpro" class="adm-form"><label>Nome completo<input id="npro" required autocomplete="off"></label>' +
              '<button class="btn" type="submit">Cadastrar e entrar</button></form></details>' +
            '<h3>Pacientes</h3>' + rows(pats, 'pat') +
            '<details class="adm-new"' + (open === 'pat' ? ' open' : '') + '><summary>Cadastrar paciente</summary>' +
              '<form id="fpat" class="adm-form"><label>Nome completo<input id="npat" required autocomplete="off"></label>' +
              '<div class="row"><label>Nascimento<input type="date" id="bpat" required></label>' +
              '<label>Sexo<select id="xpat"><option>Feminino</option><option>Masculino</option><option>Outro / prefere não informar</option></select></label></div>' +
              '<label class="check"><input type="checkbox" id="cpat" required> Paciente concorda em fazer os testes e que os dados sejam registrados (se menor de idade, com autorização do responsável).</label>' +
              '<button class="btn" type="submit">Cadastrar e entrar</button></form></details>' +
            '<div class="acts"><a class="btn g" href="#/login">Voltar ao login</a></div>' +
          '</div>';

        root.querySelectorAll('[data-pro]').forEach(function (b) { b.onclick = function () { enter('pro', b.dataset.pro); }; });
        root.querySelectorAll('[data-pat]').forEach(function (b) { b.onclick = function () { enter('pat', b.dataset.pat); }; });

        root.querySelector('#fpro').onsubmit = async function (e) {
          e.preventDefault();
          try {
            P.auth.setAdmin(true);
            await P.auth.registerPro(root.querySelector('#npro').value);
            P.router.go('inicio');
          } catch (err) { P.toast(err.message); }
        };
        root.querySelector('#fpat').onsubmit = async function (e) {
          e.preventDefault();
          try {
            var nasc = root.querySelector('#bpat').value;
            var p = await P.DB.put('patients', {
              nome: root.querySelector('#npat').value.trim(), dataExame: new Date().toISOString().slice(0, 10),
              sexo: root.querySelector('#xpat').value, nascimento: nasc, idade: P.utils.age(nasc),
              escolaridade: '—', lateralidade: '—', anosEstudo: 0, obs: '',
              consentimento: true, consentimentoEm: new Date().toISOString()
            });
            await enter('pat', p.id);
          } catch (err) { P.toast(err.message); }
        };
      }
      await draw();
    }
  };
})(window.Psilog);
