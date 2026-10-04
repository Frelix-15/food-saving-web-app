/* SaveBite: savings statistics */
SB.stats = (function () {
  const U = SB.utils;
  const { $, esc, icon } = U;
  const C = SB.data.categories;
  const WEEKS = 6;

  function compute() {
    const hist = SB.store.state.history;
    const used = hist.filter((h) => h.action === 'used');
    const wasted = hist.filter((h) => h.action === 'wasted');
    const total = used.length + wasted.length;
    const rate = total ? Math.round((used.length / total) * 100) : 0;
    const money = used.reduce((s, h) => s + (Number(h.value) || 0), 0);
    const co2 = used.length * SB.config.CO2_PER_ITEM_KG;

    // Days since the most recent wasted item (or since tracking began)
    const today = U.todayISO();
    let streak = 0;
    if (hist.length) {
      const lastWaste = wasted.map((h) => h.date).sort().pop();
      const first = hist.map((h) => h.date).sort()[0];
      streak = U.daysBetween(lastWaste || first, today);
    }

    const weeks = Array.from({ length: WEEKS }, () => ({ used: 0, wasted: 0 }));
    hist.forEach((h) => {
      const w = Math.floor(U.daysBetween(h.date, today) / 7);
      if (w >= 0 && w < WEEKS) weeks[w][h.action === 'used' ? 'used' : 'wasted']++;
    });

    const byCat = {};
    used.forEach((h) => { byCat[h.category] = (byCat[h.category] || 0) + 1; });

    const lastWeekWaste = weeks[0].wasted;
    const badges = [
      { id: 'first', name: 'First save', hint: 'Mark one food as used', done: used.length >= 1 },
      { id: 'ten', name: 'Ten saved', hint: 'Save 10 foods', done: used.length >= 10 },
      { id: 'fifty', name: 'Kitchen hero', hint: 'Save 50 foods', done: used.length >= 50 },
      { id: 'week', name: 'Waste-free week', hint: 'Save 3+ foods in a week with none wasted', done: weeks[0].used >= 3 && lastWeekWaste === 0 },
      { id: 'rate', name: '80% club', hint: 'Keep a save rate of 80% or more', done: total >= 10 && rate >= 80 }
    ];
    return { used, wasted, total, rate, money, co2, streak, weeks, byCat, badges };
  }

  const ago = (iso) => {
    const d = U.daysBetween(iso, U.todayISO());
    return d <= 0 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`;
  };

  function render() {
    const s = compute();
    const cur = SB.config.CURRENCY;
    const root = $('#stats-root');

    if (!s.total) {
      root.innerHTML = `<div class="empty">${icon('chart', 'icon-xl')}<h3>No savings yet</h3>
        <p class="muted">When you mark a food as Used on the dashboard, it shows up here.</p>
        <a class="btn btn-primary" href="#/dashboard">Go to dashboard</a></div>` + dataBlock();
      return;
    }

    const maxWeek = Math.max(1, ...s.weeks.map((w) => w.used + w.wasted));
    const cols = s.weeks.map((w, i) => ({ w, i })).reverse().map(({ w, i }) => `
      <div class="col" role="listitem" aria-label="${i === 0 ? 'This week' : i + ' weeks ago'}: ${w.used} saved, ${w.wasted} wasted">
        <div class="col-bars">
          <div class="bar bar-used" style="height:${(w.used / maxWeek) * 100}%"><span>${w.used || ''}</span></div>
          <div class="bar bar-wasted" style="height:${(w.wasted / maxWeek) * 100}%"><span>${w.wasted || ''}</span></div>
        </div>
        <span class="col-label">${i === 0 ? 'This week' : i + 'w ago'}</span>
      </div>`).join('');

    const catEntries = Object.entries(s.byCat).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const catMax = catEntries.length ? catEntries[0][1] : 1;
    const cats = catEntries.map(([k, n]) => {
      const c = C[k] || C.other;
      return `<li><span class="cat-name"><span aria-hidden="true">${c.emoji}</span> ${esc(c.label)}</span>
        <span class="cat-bar"><span style="width:${(n / catMax) * 100}%"></span></span><span class="cat-n">${n}</span></li>`;
    }).join('');

    const recent = SB.store.state.history.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8).map((h) => `
      <li class="act ${h.action}"><span class="act-dot" aria-hidden="true"></span>
        <span><strong>${esc(h.name)}</strong> ${h.action === 'used' ? 'used' : 'wasted'}</span><span class="muted small">${ago(h.date)}</span></li>`).join('');

    root.innerHTML = `
      <div class="stat-hero">
        <p class="stat-big"><span data-count="${s.used.length}">0</span></p>
        <p class="stat-big-label">foods kept out of the bin. That is a ${s.rate}% save rate across ${U.plural(s.total, 'food')} tracked.</p>
      </div>

      <div class="stat-row">
        <div class="stat"><span class="stat-num" data-count="${s.money}" data-prefix="${esc(cur)}">0</span><span>estimated grocery value saved</span></div>
        <div class="stat"><span class="stat-num" data-count="${s.co2}" data-decimals="0" data-suffix=" kg">0</span><span>rough CO₂ avoided</span></div>
        <div class="stat"><span class="stat-num" data-count="${s.streak}" data-suffix="${s.streak === 1 ? ' day' : ' days'}">0</span><span>since the last wasted food</span></div>
        <div class="stat"><span class="stat-num is-bad" data-count="${s.wasted.length}">0</span><span>foods wasted</span></div>
      </div>

      <div class="stats-grid">
        <section class="panel">
          <div class="panel-head"><h3>Last ${WEEKS} weeks</h3>
            <p class="legend"><span class="key key-used"></span>Saved <span class="key key-wasted"></span>Wasted</p></div>
          <div class="chart" role="list" aria-label="Foods saved and wasted per week">${cols}</div>
        </section>

        <section class="panel">
          <div class="panel-head"><h3>What you save most</h3></div>
          ${cats ? `<ul class="cat-list">${cats}</ul>` : '<p class="muted">Save a few foods and this fills in.</p>'}
        </section>

        <section class="panel">
          <div class="panel-head"><h3>Milestones</h3></div>
          <ul class="badges">${s.badges.map((b) => `
            <li class="badge-item ${b.done ? 'done' : ''}">
              <span class="badge-icon" aria-hidden="true">${icon(b.done ? 'star' : 'lock')}</span>
              <span><strong>${b.name}</strong><span class="muted small">${b.done ? 'Earned' : b.hint}</span></span>
            </li>`).join('')}</ul>
        </section>

        <section class="panel">
          <div class="panel-head"><h3>Recent activity</h3></div>
          <ul class="act-list">${recent}</ul>
        </section>
      </div>` + dataBlock();

    root.querySelectorAll('[data-count]').forEach((el) => {
      U.countUp(el, Number(el.dataset.count), {
        decimals: Number(el.dataset.decimals || 0), prefix: el.dataset.prefix || '', suffix: el.dataset.suffix || ''
      });
    });
  }

  function dataBlock() {
    return `<div class="data-block">
      <div><h3>Your data</h3><p class="muted small">Everything is stored in this browser. Clearing your browser data removes it.</p></div>
      <div class="row-gap">
        <button class="btn btn-ghost btn-sm" type="button" data-data="sample">Reload sample data</button>
        <button class="btn btn-quiet btn-danger btn-sm" type="button" data-data="clear">Clear everything</button>
      </div></div>`;
  }

  function init() {
    $('#stats-root').addEventListener('click', (e) => {
      const b = e.target.closest('[data-data]');
      if (!b) return;
      if (b.dataset.data === 'sample' && confirm('Replace your foods and history with the sample data?')) {
        SB.store.resetSample();
        SB.ui.toast('Sample data loaded.');
      }
      if (b.dataset.data === 'clear' && confirm('Delete all your foods, history and saved recipes? This cannot be undone.')) {
        SB.store.clearAll();
        SB.ui.toast('All data cleared.');
      }
    });
  }

  return { init, render };
})();
