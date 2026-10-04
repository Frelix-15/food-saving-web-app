/* SaveBite: dashboard (add / edit foods, countdown tags, filters) */
SB.dashboard = (function () {
  const U = SB.utils;
  const { $, $$, esc, icon } = U;
  const C = SB.data.categories;
  const filters = { q: '', category: 'all', sort: 'expiry', status: 'all' };
  let editingId = null;
  let expiryTouched = false;

  /* ---------- The countdown tag ---------- */
  function tagHTML(item, { actions = true } = {}) {
    const st = U.status(item.expiry);
    const cat = C[item.category] || C.other;
    const d = st.d;
    const num = d < 0 ? '\u2212' + Math.abs(d) : String(d);
    let cap;
    if (st.key === 'today') cap = 'eat today';
    else if (st.key === 'expired') cap = Math.abs(d) === 1 ? 'day past' : 'days past';
    else cap = d === 1 ? 'day left' : 'days left';

    const span = Math.max(1, U.daysBetween(item.added || U.todayISO(), item.expiry));
    const pct = st.key === 'expired' ? 0 : st.key === 'today' ? 4 : Math.max(6, Math.min(100, Math.round((d / span) * 100)));
    const badge = { ok: 'Fresh', soon: 'Use soon', today: 'Use today', expired: 'Past its date' }[st.key];

    return `
    <article class="tag s-${st.key}" data-id="${item.id}">
      <div class="tag-stub"><span class="tag-num">${num}</span><span class="tag-cap">${cap}</span></div>
      <div class="tag-body">
        <header class="tag-head">
          <div class="tag-title">
            <h3>${esc(item.name)}</h3>
            <p class="tag-qty">${esc(U.fmtQty(item))}</p>
          </div>
          ${actions ? `<button class="icon-btn icon-btn-sm" type="button" data-act="edit" aria-label="Edit ${esc(item.name)}">${icon('edit')}</button>` : ''}
        </header>
        <p class="tag-cat"><span aria-hidden="true">${cat.emoji}</span> ${esc(cat.label)}</p>
        <div class="meter" role="img" aria-label="${badge}"><span style="width:${pct}%"></span></div>
        <p class="tag-time"><span class="tag-badge">${badge}</span> <time class="cd-live" data-expiry="${item.expiry}">${U.liveText(item.expiry)}</time></p>
        <p class="tag-date">Best before ${U.formatDate(item.expiry)}</p>
        ${actions ? `<div class="tag-actions">
          <button class="btn btn-primary btn-sm" type="button" data-act="used">${icon('check')}Used it</button>
          <button class="btn btn-quiet btn-sm" type="button" data-act="wasted">${icon('trash')}Wasted</button>
        </div>` : ''}
      </div>
    </article>`;
  }

  /* ---------- Summary + priority ---------- */
  function renderSummary(items) {
    const keyOf = (i) => U.status(i.expiry).key;
    const soon = items.filter((i) => ['today', 'soon'].includes(keyOf(i))).length;
    const expired = items.filter((i) => keyOf(i) === 'expired').length;
    const saved = SB.store.state.history.filter((h) => h.action === 'used').length;
    $('#dash-summary').innerHTML = `
      <div class="sum"><span class="sum-num" data-n="${items.length}">0</span><span>in your kitchen</span></div>
      <div class="sum"><span class="sum-num ${soon ? 'is-soon' : ''}" data-n="${soon}">0</span><span>to use soon</span></div>
      <div class="sum"><span class="sum-num ${expired ? 'is-expired' : ''}" data-n="${expired}">0</span><span>past their date</span></div>
      <div class="sum"><span class="sum-num is-good" data-n="${saved}">0</span><span>saved from the bin</span></div>`;
    $$('#dash-summary .sum-num').forEach((el) => { el.textContent = el.dataset.n; });
  }

  function renderPriority(items) {
    const box = $('#dash-priority');
    const urgent = items
      .filter((i) => ['today', 'soon', 'expired'].includes(U.status(i.expiry).key))
      .sort((a, b) => a.expiry.localeCompare(b.expiry));
    if (!urgent.length) { box.hidden = true; return; }
    const chips = urgent.slice(0, 8).map((i) => {
      const cat = C[i.category] || C.other;
      return `<span class="mini-chip s-${U.status(i.expiry).key}"><span aria-hidden="true">${cat.emoji}</span>${esc(i.name)}</span>`;
    }).join('');
    box.hidden = false;
    box.innerHTML = `
      <div class="priority-text">
        <h3>Use these first</h3>
        <p>${U.plural(urgent.length, 'food is', 'foods are')} close to or past its date.</p>
        <div class="mini-chips">${chips}</div>
      </div>
      <button class="btn btn-primary" type="button" data-act="plan">${icon('sparkle')}Plan meals with these</button>`;
  }

  /* ---------- Filtering ---------- */
  function filtered(items) {
    const q = filters.q.trim().toLowerCase();
    let list = items.filter((i) => {
      if (q && !i.name.toLowerCase().includes(q)) return false;
      if (filters.category !== 'all' && i.category !== filters.category) return false;
      const k = U.status(i.expiry).key;
      if (filters.status === 'soon' && !['today', 'soon'].includes(k)) return false;
      if (filters.status === 'ok' && k !== 'ok') return false;
      if (filters.status === 'expired' && k !== 'expired') return false;
      return true;
    });
    const by = {
      expiry: (a, b) => a.expiry.localeCompare(b.expiry) || a.name.localeCompare(b.name),
      name: (a, b) => a.name.localeCompare(b.name),
      category: (a, b) => a.category.localeCompare(b.category) || a.expiry.localeCompare(b.expiry),
      added: (a, b) => (b.added || '').localeCompare(a.added || '')
    };
    return list.sort(by[filters.sort] || by.expiry);
  }

  function render() {
    const items = SB.store.state.items;
    renderSummary(items);
    renderPriority(items);
    const list = filtered(items);
    $('#food-grid').innerHTML = list.map((i) => tagHTML(i)).join('');
    $('#dash-sub').textContent = items.length
      ? 'Everything you have, soonest expiry first.'
      : 'Add what you have and SaveBite will count down for you.';

    const empty = $('#food-empty');
    if (!items.length) {
      empty.hidden = false;
      empty.innerHTML = `${icon('grid', 'icon-xl')}<h3>Your kitchen is empty</h3>
        <p class="muted">Add the first thing you bought, or load a few sample foods to see how it works.</p>
        <div class="row-gap center"><button class="btn btn-primary" type="button" data-open-add>${icon('plus')}Add food</button>
        <button class="btn btn-ghost" type="button" data-load-sample>Load sample foods</button></div>`;
    } else if (!list.length) {
      empty.hidden = false;
      empty.innerHTML = `${icon('search', 'icon-xl')}<h3>Nothing matches those filters</h3>
        <p class="muted">Try a different search or clear the filters.</p>
        <button class="btn btn-ghost" type="button" data-reset-filters>Clear filters</button>`;
    } else {
      empty.hidden = true;
    }
  }

  /* ---------- Add / edit dialog ---------- */
  function fillCategories() {
    const opts = Object.entries(C).map(([k, c]) => `<option value="${k}">${c.emoji} ${c.label}</option>`).join('');
    $('#food-category').innerHTML = opts;
    $('#f-category').innerHTML = '<option value="all">All categories</option>' + opts;
  }

  function suggestExpiry() {
    const form = $('#food-form');
    if (expiryTouched) return;
    const cat = C[form.category.value] || C.other;
    form.expiry.value = U.addDays(U.todayISO(), cat.shelf);
    $('#expiry-hint').textContent = `Suggested from a typical shelf life of about ${U.plural(cat.shelf, 'day')}. Check the packaging and adjust.`;
  }

  function openAdd(prefill = {}) {
    editingId = null;
    const form = $('#food-form');
    form.reset();
    $('#food-dialog-title').textContent = 'Add food';
    $('#btn-save-food').textContent = 'Add to kitchen';
    $('#btn-delete-food').hidden = true;
    form.name.value = prefill.name || '';
    form.quantity.value = prefill.quantity || 1;
    form.unit.value = prefill.unit || 'pcs';
    form.category.value = prefill.category || 'vegetables';
    expiryTouched = !!prefill.expiry;
    $('#expiry-hint').textContent = '';
    if (prefill.expiry) {
      form.expiry.value = prefill.expiry;
      if (prefill.hint) $('#expiry-hint').textContent = prefill.hint;
    } else {
      suggestExpiry();
    }
    SB.ui.openDialog($('#food-dialog'));
    setTimeout(() => form.name.focus(), 30);
  }

  function openEdit(id) {
    const item = SB.store.state.items.find((i) => i.id === id);
    if (!item) return;
    editingId = id;
    const form = $('#food-form');
    $('#food-dialog-title').textContent = 'Edit food';
    $('#btn-save-food').textContent = 'Save changes';
    $('#btn-delete-food').hidden = false;
    form.name.value = item.name;
    form.quantity.value = item.quantity;
    form.unit.value = item.unit;
    form.category.value = item.category;
    form.expiry.value = item.expiry;
    expiryTouched = true;
    $('#expiry-hint').textContent = '';
    SB.ui.openDialog($('#food-dialog'));
  }

  function submitForm(e) {
    e.preventDefault();
    const form = $('#food-form');
    form.name.value = form.name.value.trim();
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const data = {
      name: form.name.value, quantity: form.quantity.value, unit: form.unit.value,
      category: form.category.value, expiry: form.expiry.value
    };
    SB.ui.closeDialog($('#food-dialog'));
    if (editingId) {
      SB.store.updateItem(editingId, {
        name: data.name, quantity: Number(data.quantity), unit: data.unit, category: data.category, expiry: data.expiry
      });
      SB.ui.toast(`${data.name} updated.`);
    } else {
      const item = SB.store.addItem(data);
      const d = U.daysUntil(item.expiry);
      SB.ui.toast(`${item.name} added. ${d < 0 ? 'It is already past its date.' : d === 0 ? 'Use it today.' : U.plural(d, 'day') + ' left.'}`);
      if (!['dashboard', 'meals'].includes(SB.ui.currentView())) SB.ui.go('dashboard');
    }
    editingId = null;
  }

  /* ---------- Actions ---------- */
  function complete(id, action) {
    const card = $(`#food-grid [data-id="${id}"]`);
    const run = () => {
      const entry = SB.store.complete(id, action);
      if (!entry) return;
      SB.ui.toast(action === 'used' ? `${entry.name}: saved from the bin.` : `${entry.name}: logged as wasted.`, {
        action: { label: 'Undo', onClick: () => SB.store.undoComplete(entry) }
      });
    };
    if (card && !U.reducedMotion()) {
      card.classList.add('leaving');
      setTimeout(run, 220);
    } else {
      run();
    }
  }

  function deleteCurrent() {
    if (!editingId) return;
    const removed = SB.store.removeItem(editingId);
    SB.ui.closeDialog($('#food-dialog'));
    editingId = null;
    if (removed) SB.ui.toast(`${removed.name} deleted.`, { action: { label: 'Undo', onClick: () => SB.store.restoreItem(removed) } });
  }

  function planMeals() {
    const ids = SB.store.state.items.filter((i) => ['today', 'soon'].includes(U.status(i.expiry).key)).map((i) => i.id);
    SB.meals.preselect(ids);
    SB.ui.go('meals');
  }

  function resetFilters() {
    Object.assign(filters, { q: '', category: 'all', sort: 'expiry', status: 'all' });
    $('#f-search').value = '';
    $('#f-category').value = 'all';
    $('#f-sort').value = 'expiry';
    syncChips();
    render();
  }
  function syncChips() {
    $$('#f-status .chip').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.status === filters.status)));
  }

  function init() {
    fillCategories();

    $('#f-search').addEventListener('input', (e) => { filters.q = e.target.value; render(); });
    $('#f-category').addEventListener('change', (e) => { filters.category = e.target.value; render(); });
    $('#f-sort').addEventListener('change', (e) => { filters.sort = e.target.value; render(); });
    $('#f-status').addEventListener('click', (e) => {
      const c = e.target.closest('.chip');
      if (!c) return;
      filters.status = c.dataset.status;
      syncChips();
      render();
    });

    // Card buttons (event delegation, so it keeps working after every re-render)
    $('#food-grid').addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      const card = e.target.closest('.tag');
      if (!b || !card) return;
      const id = card.dataset.id;
      if (b.dataset.act === 'used') complete(id, 'used');
      if (b.dataset.act === 'wasted') complete(id, 'wasted');
      if (b.dataset.act === 'edit') openEdit(id);
    });
    $('#dash-priority').addEventListener('click', (e) => { if (e.target.closest('[data-act="plan"]')) planMeals(); });

    // Global buttons
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-open-add]')) openAdd();
      if (e.target.closest('[data-load-sample]')) { SB.store.resetSample(); SB.ui.toast('Sample foods loaded.'); }
      if (e.target.closest('[data-reset-filters]')) resetFilters();
    });

    // Form
    $('#food-form').addEventListener('submit', submitForm);
    $('#food-category').addEventListener('change', suggestExpiry);
    $('#food-expiry').addEventListener('input', () => { expiryTouched = true; $('#expiry-hint').textContent = ''; });
    $('#btn-delete-food').addEventListener('click', deleteCurrent);
    $('.quick-dates').addEventListener('click', (e) => {
      const b = e.target.closest('[data-days]');
      if (!b) return;
      $('#food-expiry').value = U.addDays(U.todayISO(), Number(b.dataset.days));
      expiryTouched = true;
      $('#expiry-hint').textContent = '';
    });
  }

  return { init, render, tagHTML, openAdd, openEdit };
})();
