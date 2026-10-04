/* SaveBite: start-up */
document.addEventListener('DOMContentLoaded', () => {
  SB.store.load();       // reads localStorage (loads sample foods on the very first visit)
  SB.ui.init();          // theme, dialogs, routing
  SB.dashboard.init();
  SB.recipes.init();
  SB.meals.init();
  SB.scan.init();
  SB.stats.init();
  SB.notify.init();
  SB.ai.checkStatus();   // asks the local server whether an API key is configured
  SB.ui.start();         // shows the page for the current #/route

  // Live countdowns tick every second; re-render when the date changes at midnight.
  let day = SB.utils.todayISO();
  setInterval(() => {
    document.querySelectorAll('.cd-live').forEach((el) => { el.textContent = SB.utils.liveText(el.dataset.expiry); });
    const now = SB.utils.todayISO();
    if (now !== day) { day = now; SB.ui.renderCurrent(); SB.notify.check({ silent: true }); }
  }, 1000);
});
