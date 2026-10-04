/* SaveBite: shared UI (theme, routing, toasts, dialogs) */
SB.ui = (function () {
  const { $, $$, esc } = SB.utils;
  const VIEWS = ['home', 'dashboard', 'meals', 'recipes', 'scan', 'stats'];
  const TITLES = {
    home: 'SaveBite: use your food before it expires', dashboard: 'Dashboard | SaveBite',
    meals: 'Meal ideas | SaveBite', recipes: 'Recipes | SaveBite', scan: 'Scan food | SaveBite', stats: 'Your savings | SaveBite'
  };
  let current = 'home';

  /* ---------- Theme ---------- */
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0e1814' : '#eef3ea');
    const btn = $('#btn-theme');
    if (btn) btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  }
  function toggleTheme() {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    SB.store.saveSettings({ theme: next });
  }

  /* ---------- Toasts ---------- */
  function toast(message, { action, duration = 5000, type = 'info' } = {}) {
    const wrap = $('#toasts');
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.setAttribute('role', 'status');
    el.innerHTML = `<span>${esc(message)}</span>`;
    const remove = () => {
      el.classList.remove('in');
      setTimeout(() => el.remove(), 250);
    };
    if (action) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'toast-action';
      b.textContent = action.label;
      b.addEventListener('click', () => { action.onClick(); remove(); });
      el.append(b);
    }
    wrap.append(el);
    requestAnimationFrame(() => el.classList.add('in'));
    setTimeout(remove, duration);
  }

  /* ---------- Dialogs ---------- */
  function openDialog(dlg) {
    if (!dlg.open) dlg.showModal();
    document.body.classList.add('modal-open');
  }
  function closeDialog(dlg) {
    if (dlg.open) dlg.close();
  }

  /* ---------- Routing (hash based: #/dashboard) ---------- */
  function routeName() {
    const v = (location.hash.replace(/^#\/?/, '') || 'home').split('?')[0];
    return VIEWS.includes(v) ? v : 'home';
  }
  function modules() {
    return { home: SB.home, dashboard: SB.dashboard, meals: SB.meals, recipes: SB.recipes, scan: SB.scan, stats: SB.stats };
  }
  function show(name) {
    const changed = name !== current;
    current = name;
    $$('.view').forEach((s) => {
      const on = s.dataset.view === name;
      s.hidden = !on;
      if (on && changed) {
        s.classList.remove('enter');
        void s.offsetWidth; // restart the animation
        s.classList.add('enter');
      }
    });
    $$('[data-nav]').forEach((a) => {
      const on = a.dataset.nav === name;
      a.classList.toggle('active', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    document.title = TITLES[name];
    if (changed) window.scrollTo({ top: 0 });
    const m = modules()[name];
    if (m && m.render) m.render();
  }
  const go = (name) => { location.hash = '#/' + name; };
  const renderCurrent = () => { const m = modules()[current]; if (m && m.render) m.render(); };
  const currentView = () => current;

  function init() {
    applyTheme(document.documentElement.getAttribute('data-theme') || 'light');
    $('#btn-theme').addEventListener('click', toggleTheme);

    // Close buttons and click-on-backdrop for every dialog
    $$('dialog').forEach((d) => {
      d.addEventListener('click', (e) => { if (e.target === d) d.close(); });
      d.addEventListener('close', () => {
        if (!$$('dialog').some((x) => x.open)) document.body.classList.remove('modal-open');
      });
    });
    document.addEventListener('click', (e) => {
      const c = e.target.closest('[data-close]');
      if (c) closeDialog(c.closest('dialog'));
    });

    window.addEventListener('hashchange', () => show(routeName()));
    SB.store.on(renderCurrent);
  }
  const start = () => show(routeName());

  return { init, start, show, go, toast, openDialog, closeDialog, renderCurrent, currentView, applyTheme };
})();
