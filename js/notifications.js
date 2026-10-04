/* SaveBite: reminders (in-app list + optional desktop notifications)
 * Desktop notifications only fire while SaveBite is open in a browser tab.
 */
SB.notify = (function () {
  const U = SB.utils;
  const { $, esc } = U;
  const supported = 'Notification' in window;
  let toastedThisSession = false;

  const settings = () => SB.store.state.settings;

  function alerts() {
    const limit = settings().remindDays;
    return SB.store.state.items
      .filter((i) => U.daysUntil(i.expiry) <= limit)
      .sort((a, b) => a.expiry.localeCompare(b.expiry));
  }

  function updateBadge(list) {
    const b = $('#notif-badge');
    if (!b) return;
    b.hidden = list.length === 0;
    b.textContent = list.length > 9 ? '9+' : String(list.length);
  }

  /* ----- Panel ----- */
  function permBlock() {
    const el = $('#notif-perm');
    if (!supported) {
      el.innerHTML = '<p class="muted small">This browser does not support desktop notifications. You will still see reminders here.</p>';
      return;
    }
    const perm = Notification.permission;
    if (perm === 'denied') {
      el.innerHTML = '<p class="muted small">Desktop notifications are blocked for this site. Allow them in your browser\'s site settings, or keep using this list.</p>';
    } else if (perm === 'granted' && settings().notify) {
      el.innerHTML = `<p class="small"><strong>Desktop reminders are on.</strong> They appear while SaveBite is open.</p>
        <div class="row-gap"><button class="btn btn-ghost btn-sm" type="button" data-np="test">Send a test</button>
        <button class="btn btn-quiet btn-sm" type="button" data-np="off">Turn off</button></div>`;
    } else {
      el.innerHTML = `<p class="small muted">Get a desktop notification when food is close to its date.</p>
        <button class="btn btn-primary btn-sm" type="button" data-np="on">Turn on desktop reminders</button>`;
    }
  }

  function renderList(list) {
    const ul = $('#notif-list');
    if (!list.length) {
      ul.innerHTML = '<li class="notif-empty muted">Nothing is close to its date. Nice work.</li>';
      return;
    }
    ul.innerHTML = list.map((i) => {
      const cat = SB.data.categories[i.category] || SB.data.categories.other;
      const key = U.status(i.expiry).key;
      return `<li class="notif-item s-${key}"><span class="notif-emoji" aria-hidden="true">${cat.emoji}</span>
        <span class="notif-text"><strong>${esc(i.name)}</strong><span>${U.whenText(i.expiry)}</span></span></li>`;
    }).join('') +
      '<li class="notif-foot"><a class="btn btn-ghost btn-sm" href="#/meals" data-close-panel>Plan meals with these</a></li>';
  }

  function renderPanel() {
    const list = alerts();
    permBlock();
    $('#notif-days').value = String(settings().remindDays);
    renderList(list);
  }

  function openPanel() {
    renderPanel();
    $('#notif-panel').hidden = false;
    $('#btn-notif').setAttribute('aria-expanded', 'true');
  }
  function closePanel() {
    $('#notif-panel').hidden = true;
    $('#btn-notif').setAttribute('aria-expanded', 'false');
  }
  const isOpen = () => !$('#notif-panel').hidden;

  /* ----- Desktop notifications ----- */
  function show(title, body) {
    if (!supported || Notification.permission !== 'granted') return;
    try {
      const n = new Notification(title, { body, tag: 'savebite-' + title });
      n.onclick = () => { window.focus(); location.hash = '#/dashboard'; n.close(); };
    } catch (e) { /* some browsers block constructors on mobile */ }
  }

  async function enable() {
    if (!supported) return;
    let perm = Notification.permission;
    if (perm === 'default') perm = await Notification.requestPermission();
    if (perm === 'granted') {
      SB.store.saveSettings({ notify: true });
      SB.ui.toast('Desktop reminders are on.');
      show('SaveBite reminders are on', 'We will let you know when food is close to its date.');
    } else {
      SB.ui.toast('Notifications were not allowed. You can still see reminders in the bell menu.', { type: 'warn' });
    }
    renderPanel();
  }

  /** Look for foods near their date; update the badge, and notify (once per food per day). */
  function check({ silent = false } = {}) {
    const list = alerts();
    updateBadge(list);
    if (isOpen()) renderPanel();
    if (!list.length) return;

    if (!silent && !toastedThisSession) {
      toastedThisSession = true;
      SB.ui.toast(`${U.plural(list.length, 'food needs', 'foods need')} using up soon.`, {
        type: 'warn', duration: 7000, action: { label: 'See list', onClick: openPanel }
      });
    }

    const s = settings();
    if (!(supported && Notification.permission === 'granted' && s.notify)) return;
    const today = U.todayISO();
    const fresh = list.filter((i) => s.lastNotified[i.id] !== today);
    if (!fresh.length) return;

    if (fresh.length <= 3) {
      fresh.forEach((i) => show(`${i.name}: ${U.whenText(i.expiry).toLowerCase()}`, 'Use it up today with SaveBite meal ideas.'));
    } else {
      show(`${fresh.length} foods need using up`, fresh.slice(0, 4).map((i) => i.name).join(', ') + ' and more.');
    }
    const ids = new Set(SB.store.state.items.map((i) => i.id));
    const next = {};
    Object.keys(s.lastNotified).forEach((id) => { if (ids.has(id)) next[id] = s.lastNotified[id]; });
    fresh.forEach((i) => { next[i.id] = today; });
    SB.store.saveSettings({ lastNotified: next });
  }

  function init() {
    $('#btn-notif').addEventListener('click', () => (isOpen() ? closePanel() : openPanel()));
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-close-panel]')) { closePanel(); return; }
      if (isOpen() && !e.target.closest('#notif-panel') && !e.target.closest('#btn-notif')) closePanel();
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen()) { closePanel(); $('#btn-notif').focus(); } });

    $('#notif-days').addEventListener('change', (e) => {
      SB.store.saveSettings({ remindDays: Number(e.target.value), lastNotified: {} });
      check({ silent: true });
    });
    $('#notif-perm').addEventListener('click', (e) => {
      const b = e.target.closest('[data-np]');
      if (!b) return;
      if (b.dataset.np === 'on') enable();
      if (b.dataset.np === 'off') { SB.store.saveSettings({ notify: false }); renderPanel(); }
      if (b.dataset.np === 'test') show('SaveBite test', 'Desktop reminders are working.');
    });

    SB.store.on(() => check({ silent: true }));
    document.addEventListener('visibilitychange', () => { if (!document.hidden) check({ silent: true }); });
    setInterval(() => check({ silent: true }), SB.config.REMINDER_CHECK_MINUTES * 60 * 1000);
    check();
  }

  return { init, check, openPanel, closePanel, alerts };
})();
