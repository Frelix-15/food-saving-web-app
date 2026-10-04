/* SaveBite: small helpers shared by every module */
(function () {
  const U = (SB.utils = {});

  U.$ = (sel, root = document) => root.querySelector(sel);
  U.$$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  U.esc = (s) =>
    String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );

  U.uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  U.pad = (n) => String(n).padStart(2, '0');
  U.reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Dates (all stored as local "YYYY-MM-DD" strings) ---------- */
  U.toISO = (d) => `${d.getFullYear()}-${U.pad(d.getMonth() + 1)}-${U.pad(d.getDate())}`;
  U.todayISO = () => U.toISO(new Date());
  U.parseISO = (iso) => {
    const [y, m, d] = String(iso).split('-').map(Number);
    return new Date(y, m - 1, d);
  };
  U.addDays = (iso, n) => {
    const d = U.parseISO(iso);
    d.setDate(d.getDate() + n);
    return U.toISO(d);
  };
  U.daysBetween = (aIso, bIso) => Math.round((U.parseISO(bIso) - U.parseISO(aIso)) / 86400000);
  U.daysUntil = (iso) => U.daysBetween(U.todayISO(), iso);
  U.endOfDay = (iso) => {
    const d = U.parseISO(iso);
    d.setHours(23, 59, 59, 999);
    return d;
  };
  U.formatDate = (iso) =>
    U.parseISO(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  U.plural = (n, word, pl) => `${n} ${n === 1 ? word : pl || word + 's'}`;

  /** Live countdown to the end of the expiry day, e.g. "2d 05:12:09 left". */
  U.liveText = (iso) => {
    const ms = U.endOfDay(iso) - Date.now();
    if (ms <= 0) return '';
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return (d > 0 ? `${d}d ` : '') + `${U.pad(h)}:${U.pad(m)}:${U.pad(sec)} left`;
  };

  /** Plain-English version: "Expires tomorrow", "Expired 2 days ago". */
  U.whenText = (iso) => {
    const d = U.daysUntil(iso);
    if (d < 0) return `Expired ${U.plural(-d, 'day')} ago`;
    if (d === 0) return 'Expires today';
    if (d === 1) return 'Expires tomorrow';
    return `Expires in ${d} days`;
  };

  /** Freshness status: expired | today | soon | ok */
  U.status = (iso) => {
    const d = U.daysUntil(iso);
    const soon = SB.config.SOON_DAYS;
    let key = 'ok';
    if (d < 0) key = 'expired';
    else if (d === 0) key = 'today';
    else if (d <= soon) key = 'soon';
    return { key, d };
  };
  U.isUrgent = (iso) => ['today', 'soon'].includes(U.status(iso).key);

  /* ---------- Fuzzy matching of food names ("Tomatoes" matches "tomato") ---------- */
  const singular = (w) =>
    w.length < 4 ? w : w.replace(/ies$/, 'y').replace(/(ch|sh|ss|x|o)es$/, '$1').replace(/([^s])s$/, '$1');
  U.words = (s) =>
    String(s || '').toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean).map(singular);
  U.phrase = (s) => ' ' + U.words(s).join(' ') + ' ';

  /** True if either name contains the other as whole words. */
  U.looseMatch = (a, b) => {
    const pa = U.phrase(a);
    const pb = U.phrase(b);
    if (!pa.trim() || !pb.trim()) return false;
    return pa.includes(pb) || pb.includes(pa);
  };
  /** True if the food name contains any of the keys in "a|b|c". */
  U.keyMatch = (foodName, keys) => {
    const pf = U.phrase(foodName);
    return String(keys).split('|').some((k) => {
      const pk = U.phrase(k);
      return pk.trim() && pf.includes(pk);
    });
  };

  U.icon = (name, cls = '') => `<svg class="icon ${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;

  U.fmtQty = (item) => `${+Number(item.quantity).toFixed(2)} ${item.unit}`;

  /** Animate a number from its previous value. Skips animation if unchanged or motion is reduced. */
  U.countUp = (el, to, { decimals = 0, prefix = '', suffix = '', duration = 650 } = {}) => {
    const fmt = (v) => prefix + v.toFixed(decimals) + suffix;
    const prev = el.dataset.val === undefined ? null : Number(el.dataset.val);
    el.dataset.val = String(to);
    if (prev === to || U.reducedMotion()) {
      el.textContent = fmt(to);
      return;
    }
    const from = prev === null ? 0 : prev;
    const t0 = performance.now();
    const step = (t) => {
      const p = Math.min(1, (t - t0) / duration);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(from + (to - from) * e);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
})();
