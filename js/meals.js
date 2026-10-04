/* SaveBite: meal suggestions (AI when connected, built-in recipe matching otherwise) */
SB.meals = (function () {
  const U = SB.utils;
  const { $, $$, esc, icon } = U;
  const C = SB.data.categories;
  const selected = new Set();
  let primed = false;
  let busy = false;
  let lastMeals = [];

  const sortedItems = () => SB.store.state.items.slice().sort((a, b) => a.expiry.localeCompare(b.expiry));

  function prime() {
    if (primed) return;
    primed = true;
    const items = sortedItems();
    items.filter((i) => U.isUrgent(i.expiry)).forEach((i) => selected.add(i.id));
    if (!selected.size) items.filter((i) => U.daysUntil(i.expiry) >= 0).slice(0, 4).forEach((i) => selected.add(i.id));
  }
  function preselect(ids) {
    selected.clear();
    ids.forEach((id) => selected.add(id));
    primed = true;
  }
  const chosen = () => sortedItems().filter((i) => selected.has(i.id));

  /* ---------- Picker ---------- */
  function renderPicker() {
    const ids = new Set(SB.store.state.items.map((i) => i.id));
    [...selected].forEach((id) => { if (!ids.has(id)) selected.delete(id); });
    const items = sortedItems();
    $('#meal-foods').innerHTML = items.length
      ? items.map((i) => {
        const k = U.status(i.expiry);
        const when = k.key === 'expired' ? 'past date' : k.key === 'today' ? 'today' : k.d === 1 ? '1 day' : k.d + ' days';
        return `<label class="pick s-${k.key}">
          <input type="checkbox" value="${i.id}" ${selected.has(i.id) ? 'checked' : ''}>
          <span class="pick-box" aria-hidden="true">${icon('check')}</span>
          <span class="pick-emoji" aria-hidden="true">${(C[i.category] || C.other).emoji}</span>
          <span class="pick-name">${esc(i.name)}</span>
          <span class="pick-when">${when}</span>
        </label>`;
      }).join('')
      : '<p class="muted pad">Your kitchen is empty. <a href="#/dashboard">Add some food</a> first.</p>';
    updateButton();
  }
  function updateButton() {
    const n = selected.size;
    $('#btn-suggest-label').textContent = n ? `Suggest meals with ${n} ${n === 1 ? 'food' : 'foods'}` : 'Suggest meals';
    $('#btn-suggest').disabled = busy;
  }
  function renderPill() {
    const el = $('#ai-pill-meals');
    el.className = 'ai-pill ' + (SB.ai.info.enabled ? 'on' : 'off');
    el.innerHTML = SB.ai.info.enabled
      ? `${icon('sparkle')} AI connected`
      : `${icon('alert')} AI not connected: using built-in recipes`;
  }

  /* ---------- Local fallback: rank built-in recipes against the chosen foods ---------- */
  function localSuggest(foods, o) {
    const dietOk = (r) => o.diet === 'any' || r.tags.includes(o.diet) || (o.diet === 'vegetarian' && r.tags.includes('vegan'));
    const timeOk = (r) => !o.time || r.time <= o.time;
    return SB.recipes.builtin.map((r) => {
      const needed = r.ingredients.filter((i) => !i.staple);
      const matchedFoods = new Set();
      let hits = 0;
      needed.forEach((ing) => {
        const f = foods.find((fd) => U.keyMatch(fd.name, ing.key));
        if (f) { hits++; matchedFoods.add(f); }
      });
      const urgent = [...matchedFoods].filter((f) => U.status(f.expiry).key !== 'ok').length;
      return { r, hits, matchedFoods, needed, score: hits * 3 + urgent * 2 - (needed.length - hits) * 0.7 };
    })
      .filter((x) => x.hits > 0 && dietOk(x.r) && timeOk(x.r))
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map(({ r, matchedFoods, needed }) => ({
        title: r.title, description: r.description, time: r.time, servings: r.servings, emoji: r.emoji,
        uses: [...matchedFoods].map((f) => f.name),
        extra: needed.filter((ing) => ![...matchedFoods].some((f) => U.keyMatch(f.name, ing.key))).map((i) => i.name),
        steps: r.steps, source: 'local'
      }));
  }

  /* ---------- Results ---------- */
  function showSkeleton() {
    $('#meal-results').innerHTML = [1, 2, 3].map(() =>
      '<div class="meal skeleton-card" aria-hidden="true"><div class="sk sk-title"></div><div class="sk sk-line"></div><div class="sk sk-line short"></div><div class="sk sk-pills"></div></div>'
    ).join('') + '<p class="sr-only">Finding meal ideas</p>';
  }

  function mealHTML(m, i) {
    const urgentNames = new Set(chosen().filter((f) => U.isUrgent(f.expiry)).map((f) => f.name));
    const uses = m.uses.map((n) => {
      const hot = [...urgentNames].some((u) => U.looseMatch(u, n));
      return `<li class="pill ${hot ? 'pill-hot' : ''}">${esc(n)}</li>`;
    }).join('');
    const extra = m.extra.map((n) => `<li class="pill pill-dashed">${esc(n)}</li>`).join('');
    return `
    <article class="meal" data-i="${i}">
      <header class="meal-head">
        <h3>${esc(m.title)}</h3>
        <p class="meal-meta">${m.time ? `${icon('clock')} ${m.time} min` : ''} <span class="sep" aria-hidden="true"></span> ${U.plural(m.servings, 'serving')}</p>
      </header>
      ${m.description ? `<p class="meal-desc">${esc(m.description)}</p>` : ''}
      ${uses ? `<div class="meal-row"><span class="meal-label">Uses up</span><ul class="pills">${uses}</ul></div>` : ''}
      ${extra ? `<div class="meal-row"><span class="meal-label">Also needed</span><ul class="pills">${extra}</ul></div>` : ''}
      <details ${i === 0 ? 'open' : ''}>
        <summary>Method</summary>
        <ol class="method">${m.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
      </details>
      <div class="meal-actions">
        <button class="btn btn-primary btn-sm" type="button" data-act="cooked">${icon('check')}I cooked this</button>
        <button class="btn btn-ghost btn-sm" type="button" data-act="save">Save recipe</button>
      </div>
    </article>`;
  }

  function renderResults(foods, meals, source, note) {
    const names = foods.slice(0, 3).map((f) => f.name).join(', ') + (foods.length > 3 ? ` and ${foods.length - 3} more` : '');
    let banner = '';
    if (source === 'ai') banner = `<p class="banner ok">${icon('sparkle')} Ideas from AI, built around ${esc(names)}.</p>`;
    if (source === 'local') banner = `<p class="banner">${icon('alert')} AI is not connected, so these are the best matches from the built-in recipes. <a href="#/recipes">Browse all recipes</a></p>`;
    if (source === 'local-fallback') banner = `<p class="banner warn">${icon('alert')} ${esc(note)} Showing built-in recipe matches instead.</p>`;

    if (!meals.length) {
      $('#meal-results').innerHTML = banner + `<div class="results-empty">${icon('search', 'icon-xl')}<h3>No matching recipes</h3>
        <p class="muted">None of the built-in recipes fit those foods and filters. Try selecting more foods, relaxing the diet or time filter, or connect AI for creative ideas.</p></div>`;
      return;
    }
    $('#meal-results').innerHTML = banner + meals.map(mealHTML).join('');
  }

  async function suggest() {
    if (busy) return;
    const foods = chosen();
    if (!foods.length) { SB.ui.toast('Pick at least one food first.', { type: 'warn' }); return; }
    const opts = {
      servings: Math.max(1, Math.min(12, Number($('#opt-servings').value) || 2)),
      diet: $('#opt-diet').value,
      time: Number($('#opt-time').value) || 0,
      staples: $('#opt-staples').checked
    };
    busy = true;
    updateButton();
    showSkeleton();
    let meals = [];
    let source = 'local';
    let note = '';
    try {
      if (SB.ai.info.enabled) { meals = await SB.ai.suggestMeals(foods, opts); source = 'ai'; }
      else { meals = localSuggest(foods, opts); }
    } catch (err) {
      note = err.message;
      meals = localSuggest(foods, opts);
      source = 'local-fallback';
    }
    lastMeals = meals;
    busy = false;
    updateButton();
    renderResults(foods, meals, source, note);
  }

  function cooked(i) {
    const m = lastMeals[i];
    if (!m) return;
    const items = SB.store.state.items.filter((it) => m.uses.some((u) => U.looseMatch(it.name, u)));
    if (!items.length) { SB.ui.toast('None of those ingredients are in your kitchen list.', { type: 'warn' }); return; }
    const entries = items.map((it) => SB.store.complete(it.id, 'used')).filter(Boolean);
    SB.ui.toast(`${U.plural(entries.length, 'food')} marked as used. Nice save.`, {
      action: { label: 'Undo', onClick: () => entries.forEach((e) => SB.store.undoComplete(e)) }
    });
  }

  function init() {
    $('#meal-foods').addEventListener('change', (e) => {
      if (e.target.type !== 'checkbox') return;
      if (e.target.checked) selected.add(e.target.value); else selected.delete(e.target.value);
      updateButton();
    });
    $('.mini-actions').addEventListener('click', (e) => {
      const b = e.target.closest('[data-sel]');
      if (!b) return;
      const items = sortedItems();
      selected.clear();
      if (b.dataset.sel === 'all') items.forEach((i) => selected.add(i.id));
      if (b.dataset.sel === 'soon') items.filter((i) => U.isUrgent(i.expiry)).forEach((i) => selected.add(i.id));
      renderPicker();
    });
    $('#btn-suggest').addEventListener('click', suggest);
    $('#meal-results').addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      const card = e.target.closest('.meal');
      if (!b || !card) return;
      const i = Number(card.dataset.i);
      if (b.dataset.act === 'cooked') cooked(i);
      if (b.dataset.act === 'save') {
        const ok = SB.recipes.saveFromMeal(lastMeals[i]);
        SB.ui.toast(ok ? 'Saved to your recipes.' : 'That recipe is already saved.');
        if (ok) { b.textContent = 'Saved'; b.disabled = true; }
      }
    });
    SB.ai.onChange(renderPill);
  }

  function render() {
    prime();
    renderPicker();
    renderPill();
  }

  return { init, render, preselect };
})();
