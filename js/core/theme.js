/* Tema: cor (data-color) e modo claro/noturno (data-mode) valem juntos.
   Carregado no <head> para aplicar antes da primeira pintura (evita "flash"). */
(function () {
  var KC = 'psilog-cor', KM = 'psilog-modo', OLD = 'psilog-tema';
  var COLORS = ['light', 'green', 'purple', 'red', 'orange'];   // 'light' = verde-água, a cor padrão
  var root = document.documentElement;

  function read(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function write(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* armazenamento indisponível */ } }

  var color = read(KC), mode = read(KM);
  if (!color || !mode) {                       // migra a escolha da versão anterior (um tema só)
    var old = read(OLD);
    if (old === 'warm') old = 'green';
    if (old === 'royal') old = 'purple';
    if (old === 'dark') { color = color || 'light'; mode = mode || 'dark'; }
    else if (COLORS.indexOf(old) !== -1) { color = color || old; mode = mode || 'light'; }
  }
  if (COLORS.indexOf(color) === -1) color = 'light';
  if (mode !== 'dark' && mode !== 'light') {
    var sys = false;
    try { sys = window.matchMedia('(prefers-color-scheme: dark)').matches; } catch (e) { /* sem matchMedia */ }
    mode = sys ? 'dark' : 'light';
  }

  function apply(save) {
    root.dataset.color = color;
    root.dataset.mode = mode;
    if (save) { write(KC, color); write(KM, mode); }
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) { var sb = getComputedStyle(root).getPropertyValue('--sidebar').trim(); if (sb) meta.setAttribute('content', sb); }
    window.dispatchEvent(new Event('themechange'));
  }
  root.dataset.color = color;
  root.dataset.mode = mode;
  document.addEventListener('DOMContentLoaded', function () { apply(false); });

  window.PsilogTheme = {
    colors: COLORS,
    color: function () { return color; },
    mode: function () { return mode; },
    setColor: function (c) { if (COLORS.indexOf(c) !== -1) { color = c; apply(true); } },
    setMode: function (m) { if (m === 'dark' || m === 'light') { mode = m; apply(true); } },
    toggleMode: function () { this.setMode(mode === 'dark' ? 'light' : 'dark'); }
  };
})();
