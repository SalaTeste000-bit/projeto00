/* Ponto de entrada: liga o botão de tema, o menu e inicia o roteador. */
(function (P) {
  document.getElementById('theme-toggle').addEventListener('click', function () {
    PsilogTheme.toggleMode();
  });

  // "Ir para o conteúdo": não pode mudar o hash, porque o roteador usa o hash para escolher a tela.
  var skip = document.querySelector('.skip-link');
  if (skip) skip.addEventListener('click', function (e) {
    e.preventDefault();
    document.getElementById('app').focus();
  });

  // Menu hambúrguer: fecha ao navegar, ao clicar fora ou com Esc.
  var btn = document.getElementById('menu-toggle');
  var nav = document.getElementById('site-nav');
  function setMenu(open) {
    nav.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    var more = document.getElementById('tab-more');
    if (more) more.setAttribute('aria-expanded', String(open));
    var bd = document.getElementById('sheet-backdrop');
    if (bd) bd.hidden = !open;
    document.body.classList.toggle('menu-open', open);
  }
  var moreBtn = document.getElementById('tab-more');
  if (moreBtn) moreBtn.addEventListener('click', function () { setMenu(nav.hidden); });
  btn.addEventListener('click', function () { setMenu(nav.hidden); });
  nav.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('click', function (e) {
    if (!nav.hidden && !e.target.closest('#site-nav') && !e.target.closest('#menu-toggle') && !e.target.closest('#tab-more')) setMenu(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !nav.hidden) { setMenu(false); btn.focus(); }
  });
  window.addEventListener('hashchange', function () { setMenu(false); });

  var sectionNames = {
    login: 'Entrar', admin: 'Administrador', pacientes: 'Pacientes', atividades: 'Atividades', inicio: 'Visão geral', cadastro: 'Novo exame', tarefas: 'Tarefas cognitivas',
    teste: 'Aplicação do teste', resultados: 'Resultados', resumo: 'Resumo clínico',
    dados: 'Dados e backups', conta: 'Minha conta', aparencia: 'Preferências', tour: 'Ajuda e tour'
  };
  function updateSection() {
    var route = (location.hash.replace(/^#\/?/, '').split('?')[0] || 'inicio');
    var target = document.getElementById('current-section');
    if (target) target.textContent = sectionNames[route] || 'Psilog';
  }
  window.addEventListener('hashchange', updateSection);
  updateSection();

  // "Sair" existe no menu lateral (computador) e no menu ☰ (celular).
  document.querySelectorAll('[data-logout]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault(); setMenu(false); P.auth.logout(); P.router.go('login');
    });
  });

  P.auth.init().then(P.refreshTasks).catch(console.error).then(P.router.start);
})(window.Psilog);
