/* Contas na nuvem (Firebase Authentication). Só identifica quem entrou:
   os exames e cadastros continuam salvos neste computador. */
(function (P) {
  var cfg = window.PSILOG_FIREBASE || {};
  var C = { enabled: false, user: null, ready: Promise.resolve(null) };
  P.cloud = C;

  if (typeof firebase === 'undefined' || !cfg.apiKey || cfg.apiKey.indexOf('COLE') === 0) return;
  C.enabled = true;

  var MSG = {
    'auth/invalid-credential': 'E-mail ou senha incorretos.',
    'auth/user-not-found': 'E-mail ou senha incorretos.',
    'auth/wrong-password': 'E-mail ou senha incorretos.',
    'auth/invalid-email': 'Esse e-mail não parece válido.',
    'auth/email-already-in-use': 'Esse e-mail já tem conta. Use "Entrar".',
    'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres.',
    'auth/requires-recent-login': 'Por segurança, saia e entre de novo antes de fazer isso.',
    'auth/operation-not-allowed': 'Esta operação não está liberada no projeto Firebase.',
    'auth/missing-password': 'Digite a sua senha atual para confirmar.',
    'auth/too-many-requests': 'Muitas tentativas. Aguarde um pouco e tente de novo.',
    'auth/network-request-failed': 'Sem conexão com a internet.',
    'auth/popup-closed-by-user': 'A janela do Google foi fechada antes de concluir.',
    'auth/cancelled-popup-request': 'A janela do Google foi fechada antes de concluir.',
    'auth/popup-blocked': 'O navegador bloqueou a janela do Google.',
    'auth/unauthorized-domain': 'Entrar com Google não está liberado neste modo do app. Use e-mail e senha.',
    'auth/operation-not-supported-in-this-environment': 'Entrar com Google não funciona neste modo do app. Use e-mail e senha.'
  };
  function wrap(p) {
    return p.catch(function (e) { throw new Error(MSG[e && e.code] || (e && e.message) || 'Não foi possível concluir.'); });
  }

  firebase.initializeApp(cfg);
  var auth = firebase.auth();
  if (auth.useDeviceLanguage) auth.useDeviceLanguage();

  C.ready = new Promise(function (resolve) {
    var first = true;
    auth.onAuthStateChanged(function (user) {
      C.user = user || null;
      if (first) { first = false; resolve(C.user); }
    });
  });

  C.signIn = function (email, senha) { return wrap(auth.signInWithEmailAndPassword(email, senha)); };
  C.signUp = function (email, senha) {
    return wrap(auth.createUserWithEmailAndPassword(email, senha).then(function (cred) {
      return cred.user.sendEmailVerification().catch(function () {}).then(function () { return cred; });
    }));
  };
  C.google = function () { return wrap(auth.signInWithPopup(new firebase.auth.GoogleAuthProvider())); };
  C.reset = function (email) { return wrap(auth.sendPasswordResetEmail(email)); };
  C.signOut = function () { return auth.signOut().catch(function () {}); };

  /** Quem entrou com senha (e-mail) ou só com Google. */
  C.hasPassword = function () {
    return !!C.user && C.user.providerData.some(function (p) { return p.providerId === 'password'; });
  };
  /** Confirma a identidade antes de operações sensíveis (trocar e-mail, apagar conta). */
  function reauth(senha) {
    var u = auth.currentUser;
    if (!u) return Promise.reject(new Error('Entre na sua conta primeiro.'));
    if (C.hasPassword()) {
      if (!senha) return Promise.reject(new Error('Digite a sua senha atual para confirmar.'));
      return u.reauthenticateWithCredential(firebase.auth.EmailAuthProvider.credential(u.email, senha));
    }
    return u.reauthenticateWithPopup(new firebase.auth.GoogleAuthProvider());
  }
  C.setName = function (nome) {
    var u = auth.currentUser;
    return u ? u.updateProfile({ displayName: nome }).catch(function () {}) : Promise.resolve();
  };
  /** Envia um link de confirmação para o NOVO e-mail; a troca vale depois do clique. */
  C.changeEmail = function (novo, senha) {
    return wrap(reauth(senha).then(function () { return auth.currentUser.verifyBeforeUpdateEmail(novo); }));
  };
  C.deleteAccount = function (senha) {
    return wrap(reauth(senha).then(function () { return auth.currentUser.delete(); }));
  };
})(window.Psilog);
