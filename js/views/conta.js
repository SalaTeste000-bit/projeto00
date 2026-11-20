/* Tela: Minha conta. Alterar nome, foto de perfil e e-mail, ou apagar a conta. */
(function (P) {
  var esc = P.utils.esc;

  /** Recorta a foto no centro, reduz para 256×256 e devolve um data URL (cabe no banco local). */
  function photoToDataUrl(file) {
    return new Promise(function (resolve, reject) {
      if (!file || !/^image\//.test(file.type)) return reject(new Error('Escolha um arquivo de imagem.'));
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var size = 256, c = document.createElement('canvas');
        c.width = c.height = size;
        var side = Math.min(img.width, img.height);
        c.getContext('2d').drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('Não foi possível ler essa imagem.')); };
      img.src = url;
    });
  }

  P.views.conta = {
    title: 'Minha conta',
    mount: function (root) {
      var cloud = P.cloud.enabled && !!P.cloud.user;
      var needsPass = cloud && P.cloud.hasPassword();
      var googleOnly = cloud && !needsPass;
      var u = P.auth.user;
      var email = cloud ? (P.cloud.user.email || '') : (u.email || '');
      var role = u.role === 'profissional' ? 'Profissional' : 'Paciente';

      root.innerHTML =
        '<section class="dashboard-heading"><div><div class="eyebrow">SISTEMA</div><h1>Minha conta</h1>' +
        '<p>Atualize seus dados de perfil, troque o e-mail ou apague a conta.</p></div></section>' +

        '<div class="card conta-card">' +
          '<h2>Perfil</h2>' +
          '<div class="conta-foto">' +
            '<span class="avatar avatar-lg" id="av"></span>' +
            '<div><b id="avnome"></b><small>' + role + '</small>' +
            '<div class="acts"><label class="btn g" for="file" tabindex="0">Trocar foto</label>' +
            '<input id="file" type="file" accept="image/*" hidden>' +
            '<button class="btn g" id="rmfoto" type="button">Remover foto</button></div></div>' +
          '</div>' +
          '<form id="fnome"><label>Nome<input id="nome" required autocomplete="name" maxlength="80" value="' + esc(u.nome) + '"></label>' +
          '<p class="note" id="enome" role="alert"></p>' +
          '<div class="acts"><button class="btn" type="submit">Salvar nome</button></div></form>' +
        '</div>' +

        '<div class="card conta-card">' +
          '<h2>E-mail</h2>' +
          (googleOnly
            ? '<p class="note">Esta conta entra com o Google, então o e-mail <b>' + esc(email) + '</b> é gerenciado pelo Google.</p>'
            : '<form id="femail"><label>E-mail<input id="email" type="email" required autocomplete="email" placeholder="voce@exemplo.com" value="' + esc(email) + '"></label>' +
              (needsPass ? '<label>Senha atual (para confirmar)<input id="senhae" type="password" autocomplete="current-password"></label>' : '') +
              '<p class="note" id="eemail" role="alert"></p>' +
              '<div class="acts"><button class="btn" type="submit">Salvar e-mail</button></div></form>') +
        '</div>' +

        '<div class="card conta-card conta-perigo">' +
          '<h2>Apagar conta</h2>' +
          '<p class="note">' + (u.role === 'paciente'
            ? 'Isso apaga o seu perfil, o seu cadastro e <b>todos os seus exames</b>. Não dá para desfazer.'
            : 'Isso apaga o seu perfil de profissional. Os pacientes e exames cadastrados neste dispositivo continuam salvos. Não dá para desfazer.') + '</p>' +
          '<div class="acts"><button class="btn d" id="abrir" type="button">Apagar minha conta…</button></div>' +
          '<form id="fapagar" hidden>' +
            '<label>Digite <b>APAGAR</b> para confirmar<input id="conf" autocomplete="off"></label>' +
            (needsPass ? '<label>Senha atual<input id="senhad" type="password" autocomplete="current-password"></label>' : '') +
            '<p class="note" id="eapagar" role="alert"></p>' +
            '<div class="acts"><button class="btn d" id="ok" type="submit" disabled>Apagar definitivamente</button>' +
            '<button class="btn g" id="cancel" type="button">Cancelar</button></div>' +
          '</form>' +
        '</div>';

      var $ = function (id) { return root.querySelector('#' + id); };
      var say = function (id, t, ok) { var el = $(id); if (el) { el.textContent = t; el.classList.toggle('ok-msg', !!ok); } };

      function paintAvatar() {
        P.auth.fillAvatar($('av'), P.auth.user);
        $('avnome').textContent = P.auth.user.nome;
        $('rmfoto').hidden = !P.auth.user.foto;
      }
      paintAvatar();

      $('file').onchange = async function () {
        var f = this.files && this.files[0];
        this.value = '';
        if (!f) return;
        try { await P.auth.updateProfile({ foto: await photoToDataUrl(f) }); paintAvatar(); P.toast('Foto atualizada.'); }
        catch (err) { P.toast(err.message); }
      };
      root.querySelector('label[for=file]').onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('file').click(); } };
      $('rmfoto').onclick = async function () { await P.auth.updateProfile({ foto: '' }); paintAvatar(); P.toast('Foto removida.'); };

      $('fnome').onsubmit = async function (e) {
        e.preventDefault(); say('enome', '');
        try { await P.auth.updateProfile({ nome: $('nome').value }); paintAvatar(); P.toast('Nome atualizado.'); }
        catch (err) { say('enome', err.message); }
      };

      if ($('femail')) $('femail').onsubmit = async function (e) {
        e.preventDefault(); say('eemail', '');
        var btn = e.target.querySelector('button[type=submit]'); btn.disabled = true;
        try {
          var r = await P.auth.changeEmail($('email').value, $('senhae') && $('senhae').value);
          if (r === 'pending') say('eemail', 'Enviamos um link de confirmação para ' + $('email').value.trim() + '. O e-mail muda depois que você clicar nele.', true);
          else P.toast('E-mail atualizado.');
        } catch (err) { say('eemail', err.message); }
        btn.disabled = false;
      };

      $('abrir').onclick = function () { $('fapagar').hidden = false; $('abrir').hidden = true; $('conf').focus(); };
      $('cancel').onclick = function () { $('fapagar').hidden = true; $('abrir').hidden = false; $('conf').value = ''; say('eapagar', ''); };
      $('conf').oninput = function () { $('ok').disabled = $('conf').value.trim().toUpperCase() !== 'APAGAR'; };
      $('fapagar').onsubmit = async function (e) {
        e.preventDefault(); say('eapagar', ''); $('ok').disabled = true;
        try {
          await P.auth.deleteAccount($('senhad') && $('senhad').value);
          P.router.go('login'); P.toast('Conta apagada.');
        } catch (err) { say('eapagar', err.message); $('ok').disabled = false; }
      };
    }
  };
})(window.Psilog);
