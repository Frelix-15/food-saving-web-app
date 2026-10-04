/* SaveBite: homepage (live preview of your soonest-expiring foods + quick numbers) */
SB.home = (function () {
  const U = SB.utils;
  const { $, esc } = U;
  let played = false; // the drop-in animation only plays once per page load

  function render() {
    const items = SB.store.state.items.slice().sort((a, b) => a.expiry.localeCompare(b.expiry));
    const upcoming = items.filter((i) => U.daysUntil(i.expiry) >= 0);
    let show = (upcoming.length ? upcoming : items).slice(0, 3);
    if (!show.length) show = SB.data.sampleItems().slice(0, 3); // empty kitchen: show a preview

    const wrap = $('#hero-tags');
    wrap.classList.toggle('play', !played);
    wrap.innerHTML = show.map((i) => SB.dashboard.tagHTML(i, { actions: false })).join('');
    played = true;

    const total = items.length;
    const urgent = items.filter((i) => ['today', 'soon', 'expired'].includes(U.status(i.expiry).key)).length;
    const saved = SB.store.state.history.filter((h) => h.action === 'used').length;
    $('#home-pulse').innerHTML = `
      <div class="pulse-item"><span class="pulse-num" data-n="${total}">0</span><span>foods in your kitchen</span></div>
      <div class="pulse-item"><span class="pulse-num ${urgent ? 'is-warn' : ''}" data-n="${urgent}">0</span><span>need using up soon</span></div>
      <div class="pulse-item"><span class="pulse-num is-good" data-n="${saved}">0</span><span>foods saved so far</span></div>`;
    document.querySelectorAll('#home-pulse .pulse-num').forEach((el) => U.countUp(el, Number(el.dataset.n)));
  }

  return { render };
})();
