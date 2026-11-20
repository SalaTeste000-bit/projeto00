/* Perfis (profissional / paciente) e sessão. Sem Firebase configurado: a pessoa só escolhe o perfil (local).
   Com Firebase (js/core/firebase-config.js): conta por e-mail/senha ou Google. */
(function (P) {
  var KEY = 'psilog.session';
  var PATIENT_ROUTES = ['inicio', 'tarefas', 'teste', 'resultados', 'conta', 'aparencia', 'tour'];
  var mem = null, memAdmin = null;
  var AKEY = 'psilog.admin';

  function store(v) {
    try { if (v == null) localStorage.removeItem(KEY); else localStorage.setItem(KEY, v); } catch (e) { mem = v; }
  }
  function saved() { try { return localStorage.getItem(KEY); } catch (e) { return mem; } }

  var A = {
    user: null,
    isPro: function () { return !!A.user && A.user.role === 'profissional'; },
    isPatient: function () { return !!A.user && A.user.role === 'paciente'; },

    /** Administrador: entrou por "Administrador" (sem senha) e pode trocar de perfil neste navegador. */
    isAdmin: function () {
      try { return localStorage.getItem(AKEY) === '1'; } catch (e) { return memAdmin === '1'; }
    },
    setAdmin: function (on) {
      try { if (on) localStorage.setItem(AKEY, '1'); else localStorage.removeItem(AKEY); } catch (e) { memAdmin = on ? '1' : null; }
    },

    /** Paciente enxerga só o próprio cadastro. */
    scope: function (patients) {
      return A.isPatient() ? patients.filter(function (p) { return p.id === A.user.patientId; }) : patients;
    },

    guard: function (name) {
      if (name === 'admin') return !A.user || A.isAdmin() ? 'admin' : 'inicio';
      if (!A.user) return 'login';
      if (name === 'login') return A.isAdmin() ? 'login' : 'inicio';
      if (A.user.role === 'paciente' && PATIENT_ROUTES.indexOf(name) < 0) return 'inicio';
      return name;
    },

    paint: function () {
      document.body.dataset.role = A.user ? (A.isPro() ? 'pro' : 'paciente') : 'anon';
      document.body.dataset.admin = A.user && A.isAdmin() ? '1' : '0';
      var w = document.getElementById('who');
      if (!w) return;
      w.textContent = '';
      if (!A.user) return;
      // Mostra o nome COMPLETO (antes só aparecia a primeira palavra: "DR diego" virava "DR").
      var av = document.createElement('span');
      av.className = 'avatar avatar-sm';
      A.fillAvatar(av, A.user);
      var nm = document.createElement('span');
      nm.className = 'who-name';
      nm.textContent = A.user.nome;
      nm.title = A.user.nome;
      w.appendChild(av); w.appendChild(nm);
    },

    /** Iniciais do nome (até 2 letras), usadas quando não há foto. */
    initials: function (nome) {
      var parts = String(nome || '').trim().split(/\s+/).filter(Boolean);
      return ((parts[0] || '?').charAt(0) + (parts.length > 1 ? parts[parts.length - 1].charAt(0) : '')).toUpperCase();
    },

    /** Põe a foto (ou as iniciais) dentro de um elemento redondo. */
    fillAvatar: function (el, user) {
      el.textContent = '';
      if (user && user.foto) {
        var img = document.createElement('img');
        img.src = user.foto; img.alt = '';
        el.appendChild(img);
      } else {
        el.textContent = A.initials(user && user.nome);
      }
    },

    /** Salva nome e/ou foto do perfil (foto = data URL, ou '' para remover). */
    updateProfile: async function (changes) {
      var u = A.user;
      if (!u) throw new Error('Entre na sua conta primeiro.');
      var rec = Object.assign({}, u);
      if (changes.nome != null) {
        var nome = String(changes.nome).trim();
        if (!nome) throw new Error('Informe o nome.');
        rec.nome = nome;
      }
      if (changes.foto != null) rec.foto = changes.foto;
      if (changes.email != null) rec.email = changes.email;
      A.user = await P.DB.put('users', rec);
      // Paciente: o nome também vale no cadastro clínico.
      if (A.user.role === 'paciente' && A.user.patientId && changes.nome != null) {
        var pt = await P.DB.get('patients', A.user.patientId);
        if (pt) { pt.nome = A.user.nome; await P.DB.put('patients', pt); }
      }
      if (P.cloud.enabled && P.cloud.user && changes.nome != null && P.cloud.setName) await P.cloud.setName(A.user.nome);
      A.paint();
      return A.user;
    },

    /** Troca o e-mail. Na nuvem exige a senha atual e a confirmação pelo novo e-mail. */
    changeEmail: async function (email, senha) {
      email = String(email || '').trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Esse e-mail não parece válido.');
      if (P.cloud.enabled && P.cloud.user) {
        await P.cloud.changeEmail(email, senha);
        return 'pending';
      }
      await A.updateProfile({ email: email });
      return 'done';
    },

    /** Apaga a conta. Paciente: leva junto o cadastro e os exames. Profissional: os pacientes continuam. */
    deleteAccount: async function (senha) {
      var u = A.user;
      if (!u) throw new Error('Entre na sua conta primeiro.');
      if (P.cloud.enabled && P.cloud.user) await P.cloud.deleteAccount(senha);   // falha aqui = nada é apagado
      if (u.role === 'paciente' && u.patientId) {
        for (var ex of await P.DB.all('exams')) if (ex.patientId === u.patientId) await P.DB.del('exams', ex.id);
        await P.DB.del('patients', u.patientId);
      }
      await P.DB.del('users', u.id);
      A.user = null; store(null); A.paint();
    },

    init: async function () {
      // Administrador com perfil já escolhido: usa a sessão local, sem passar pela conta na nuvem.
      if (P.cloud.enabled && !(A.isAdmin() && saved())) { await P.cloud.ready; await A.syncCloud(); return; }
      var id = saved();
      A.user = id ? (await P.DB.get('users', id)) || null : null;
      A.paint();
    },

    /** Com conta na nuvem: acha o perfil ligado a quem entrou (se ainda não existe, o login pede o cadastro). */
    syncCloud: async function () {
      var fb = P.cloud.user;
      A.user = fb ? (await P.DB.all('users')).find(function (x) { return x.uid === fb.uid; }) || null : null;
      A.paint();
    },

    /** Cria o perfil (profissional ou paciente) da conta que acabou de entrar. */
    completeProfile: async function (role, data) {
      var fb = P.cloud.user;
      if (!fb) throw new Error('Entre na sua conta primeiro.');
      var nome = String(data.nome || '').trim();
      if (!nome) throw new Error('Informe o nome.');
      var rec = { nome: nome, role: role, uid: fb.uid, email: fb.email || '' };
      if (role === 'paciente') {
        var p = await P.DB.put('patients', {
          nome: nome, dataExame: new Date().toISOString().slice(0, 10), sexo: data.sexo,
          nascimento: data.nascimento, idade: P.utils.age(data.nascimento),
          escolaridade: '—', lateralidade: '—', anosEstudo: 0, obs: '',
          consentimento: true, consentimentoEm: new Date().toISOString()
        });
        rec.patientId = p.id;
      }
      A.user = await P.DB.put('users', rec);
      A.paint();
    },

    professionals: async function () {
      return (await P.DB.all('users')).filter(function (x) { return x.role === 'profissional'; });
    },

    enterPro: async function (userId) {
      var u = await P.DB.get('users', userId || '');
      if (!u || u.role !== 'profissional') throw new Error('Profissional não encontrado.');
      A.user = u; store(u.id); A.paint();
    },

    registerPro: async function (nome) {
      nome = String(nome || '').trim();
      if (!nome) throw new Error('Informe o nome.');
      var u = await P.DB.put('users', { nome: nome, role: 'profissional' });
      return A.enterPro(u.id);
    },

    enterPatient: async function (patientId) {
      var patient = await P.DB.get('patients', patientId || '');
      if (!patient) throw new Error('Paciente não encontrado.');
      var u = (await P.DB.all('users')).find(function (x) { return x.patientId === patient.id; });
      A.user = u || await P.DB.put('users', { nome: patient.nome, role: 'paciente', patientId: patient.id });
      store(A.user.id); A.paint();
    },

    logout: function () {
      A.user = null; store(null); A.setAdmin(false); A.paint();
      if (P.cloud.enabled) P.cloud.signOut();
    }
  };

  P.auth = A;
})(window.Psilog);
