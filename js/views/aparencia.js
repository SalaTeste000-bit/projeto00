/* Tela: Aparência. Modo (claro/noturno) e cor do aplicativo são escolhas separadas e se combinam. */
(function (P) {
  var MODES = [
    { id: 'light', n: 'Claro', d: 'Fundo claro, bom para ambientes iluminados.' },
    { id: 'dark', n: 'Noturno', d: 'Fundo escuro, descansa a vista com pouca luz.' }
  ];
  /* Cores de pré-visualização: [fundo, painel, destaque, texto] no modo claro e no noturno. */
  var COLORS = [
    { id: 'light', n: 'Verde-água', d: 'A cor padrão do Psilog.', l: ['#f3f4f1', '#fbfbf9', '#0d8077', '#2b3438'], k: ['#080b0d', '#111619', '#43d7c2', '#edf3f1'] },
    { id: 'green', n: 'Verde', d: 'Tons de folhagem, calmo para leituras longas.', l: ['#e3f1e4', '#f1faf1', '#1f9d55', '#1d3324'], k: ['#0a120c', '#111b13', '#4ade80', '#e8f4ea'] },
    { id: 'purple', n: 'Roxo', d: 'Roxo profundo, elegante e marcante.', l: ['#efe7f5', '#f8f2fc', '#7a2fc0', '#2c1d3a'], k: ['#0e0a14', '#161020', '#b98cf5', '#f0e9f7'] },
    { id: 'red', n: 'Vermelho', d: 'Vermelho intenso com fundo rosado suave.', l: ['#fbe9e9', '#fff4f4', '#b3202f', '#3a1a1c'], k: ['#140a0b', '#1d1112', '#f0707e', '#f7eaea'] },
    { id: 'orange', n: 'Laranja', d: 'Visual quente e acolhedor.', l: ['#fbe7d4', '#fff3e6', '#e0622b', '#3d2a1c'], k: ['#130e09', '#1c140d', '#f59a55', '#f7eee5'] }
  ];

  P.views.aparencia = {
    title: 'Aparência',
    mount: function (root) {
      root.innerHTML =
        '<div class="card appearance-card"><h2>Modo de exibição</h2>' +
          '<p class="note">Vale para qualquer cor. O botão no topo também alterna entre claro e noturno.</p>' +
          '<div class="grid" id="modes"></div></div>' +
        '<div class="card appearance-card" style="margin-top:18px"><h2>Cor do aplicativo</h2>' +
          '<p class="note">Cada cor tem versão clara e noturna. A prévia mostra o modo que está ativo.</p>' +
          '<div class="grid" id="colors"></div>' +
          '<div class="acts"><a class="btn g" href="' + P.router.href('inicio') + '">Voltar ao início</a></div></div>';

      function pv(c, dark) {
        var p = dark ? c.k : c.l;
        return '<div class="pv" style="background:' + p[0] + '"><i class="h" style="background:' + p[2] + '"></i>' +
          '<div class="r"><i style="background:' + p[1] + '"></i><i style="background:' + p[1] + '"></i></div>' +
          '<i style="background:' + p[3] + ';opacity:.25;width:70%"></i><i style="background:' + p[3] + ';opacity:.15;width:45%"></i></div>';
      }
      function card(kind, x, on, preview) {
        return '<button type="button" class="opt' + (on ? ' on' : '') + '" data-kind="' + kind + '" data-id="' + x.id + '" aria-pressed="' + on + '">' +
          preview + '<b>' + x.n + (on ? ' ✓' : '') + '</b><span>' + x.d + '</span></button>';
      }
      function draw() {
        var mode = PsilogTheme.mode(), color = PsilogTheme.color(), cur = COLORS.filter(function (c) { return c.id === color; })[0];
        root.querySelector('#modes').innerHTML = MODES.map(function (m) {
          return card('mode', m, m.id === mode, pv(cur, m.id === 'dark'));
        }).join('');
        root.querySelector('#colors').innerHTML = COLORS.map(function (c) {
          return card('color', c, c.id === color, pv(c, mode === 'dark'));
        }).join('');
      }
      function onClick(e) {
        var b = e.target.closest('.opt'); if (!b) return;
        if (b.dataset.kind === 'mode') { PsilogTheme.setMode(b.dataset.id); P.toast(b.dataset.id === 'dark' ? 'Modo noturno ligado.' : 'Modo claro ligado.'); }
        else { PsilogTheme.setColor(b.dataset.id); P.toast('Cor aplicada.'); }
      }
      root.addEventListener('click', onClick);
      window.addEventListener('themechange', draw);
      draw();
      return function () { window.removeEventListener('themechange', draw); root.removeEventListener('click', onClick); };
    }
  };
})(window.Psilog);
