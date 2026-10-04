/* SaveBite: recipe book (built-in recipes + recipes you saved from AI suggestions) */
SB.recipes = (function () {
  const U = SB.utils;
  const { $, $$, esc, icon } = U;
  const state = { q: '', filter: 'all' };

  const builtin = SB.data.recipes;
  const all = () => builtin.concat(SB.store.state.recipes);
  const find = (id) => all().find((r) => r.id === id);

  /** The food in your kitchen that matches an ingredient (or undefined). */
  function pantryMatch(ing) {
    if (ing.staple) return null;
    return SB.store.state.items.find((i) => (ing.key ? U.keyMatch(i.name, ing.key) : U.looseMatch(i.name, ing.name)));
  }
  function coverage(recipe) {
    const needed = recipe.ingredients.filter((i) => !i.staple && !i.extra);
    const have = needed.filter((i) => pantryMatch(i)).length;
    return { have, total: needed.length, ratio: needed.length ? have / needed.length : 0 };
  }

  /** Turn an AI meal suggestion into a saved recipe. */
  function saveFromMeal(meal) {
    const recipe = {
      id: 'saved-' + U.uid(),
      title: meal.title,
      emoji: meal.emoji || '✨',
      time: meal.time || 20,
      servings: meal.servings || 2,
      difficulty: 'Easy',
      tags: [],
      description: meal.description || '',
      ingredients: meal.uses.map((n) => ({ name: n, key: n }))
        .concat(meal.extra.map((n) => ({ name: n, key: n, extra: true }))),
      steps: meal.steps,
      custom: true
    };
    return SB.store.saveRecipe(recipe);
  }

  /* ---------- List ---------- */
  function filtered() {
    const q = state.q.trim().toLowerCase();
    let list = all().filter((r) => {
      if (state.filter === 'saved' && !r.custom) return false;
      if (!q) return true;
      return r.title.toLowerCase().includes(q) || r.ingredients.some((i) => i.name.toLowerCase().includes(q));
    });
    if (state.filter === 'have') {
      list = list.filter((r) => coverage(r).ratio >= 0.6).sort((a, b) => coverage(b).ratio - coverage(a).ratio);
    }
    return list;
  }

  function cardHTML(r) {
    const cov = coverage(r);
    const covText = cov.total ? `You have ${cov.have} of ${cov.total} ingredients` : 'Uses what you have';
    return `
    <button class="recipe-card" type="button" data-rid="${esc(r.id)}">
      <span class="recipe-emoji" aria-hidden="true">${r.emoji}</span>
      <span class="recipe-info">
        <span class="recipe-title">${esc(r.title)}</span>
        <span class="recipe-meta">${icon('clock')} ${r.time} min <span class="sep" aria-hidden="true"></span> ${U.plural(r.servings, 'serving')} <span class="sep" aria-hidden="true"></span> ${esc(r.difficulty)}</span>
        <span class="recipe-cover"><span class="meter"><span style="width:${Math.round(cov.ratio * 100)}%"></span></span>${covText}</span>
      </span>
    </button>`;
  }

  function render() {
    const list = filtered();
    $('#recipe-grid').innerHTML = list.map(cardHTML).join('');
    const empty = $('#recipe-empty');
    if (list.length) { empty.hidden = true; return; }
    empty.hidden = false;
    empty.innerHTML = state.filter === 'saved'
      ? `${icon('book', 'icon-xl')}<h3>No saved recipes yet</h3><p class="muted">Get meal ideas, then choose Save recipe on the ones you like.</p><a class="btn btn-primary" href="#/meals">Get meal ideas</a>`
      : state.filter === 'have'
        ? `${icon('book', 'icon-xl')}<h3>Nothing matches your kitchen yet</h3><p class="muted">Add more foods and recipes you can cook will show up here.</p><button class="btn btn-primary" type="button" data-open-add>Add food</button>`
        : `${icon('search', 'icon-xl')}<h3>No recipes found</h3><p class="muted">Try a different word, like an ingredient.</p>`;
  }

  /* ---------- Detail dialog ---------- */
  function open(id) {
    const r = find(id);
    if (!r) return;
    const ing = r.ingredients.map((i) => {
      if (i.staple) return `<li class="ing ing-staple"><span class="ing-mark">${icon('lock')}</span><span class="ing-name">${esc(i.name)}</span><span class="ing-note">${esc(i.amount || '')} pantry basic</span></li>`;
      const have = pantryMatch(i);
      if (have) {
        return `<li class="ing ing-have"><span class="ing-mark">${icon('check')}</span><span class="ing-name">${esc(i.name)}${i.amount ? ', ' + esc(i.amount) : ''}</span><span class="ing-note">${esc(have.name)}: ${U.whenText(have.expiry).toLowerCase()}</span></li>`;
      }
      return `<li class="ing ing-need"><span class="ing-mark">${icon('plus')}</span><span class="ing-name">${esc(i.name)}${i.amount ? ', ' + esc(i.amount) : ''}</span><span class="ing-note">to buy</span></li>`;
    }).join('');

    $('#recipe-dialog-body').innerHTML = `
      <div class="dialog-head">
        <div class="recipe-head"><span class="recipe-emoji lg" aria-hidden="true">${r.emoji}</span>
          <div><h3>${esc(r.title)}</h3>
          <p class="recipe-meta">${icon('clock')} ${r.time} min <span class="sep" aria-hidden="true"></span> ${U.plural(r.servings, 'serving')} <span class="sep" aria-hidden="true"></span> ${esc(r.difficulty)}</p></div>
        </div>
        <button class="icon-btn icon-btn-sm" type="button" data-close aria-label="Close">${icon('x')}</button>
      </div>
      ${r.description ? `<p class="recipe-desc">${esc(r.description)}</p>` : ''}
      <h4 class="sub-h">Ingredients</h4>
      <ul class="ing-list">${ing}</ul>
      <h4 class="sub-h">Method</h4>
      <ol class="method">${r.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
      <div class="dialog-actions">
        ${r.custom ? `<button class="btn btn-quiet btn-danger" type="button" data-del-recipe="${esc(r.id)}">Delete recipe</button>` : ''}
        <span class="spacer"></span>
        <button class="btn btn-primary" type="button" data-close>Done</button>
      </div>`;
    SB.ui.openDialog($('#recipe-dialog'));
  }

  function init() {
    $('#r-search').addEventListener('input', (e) => { state.q = e.target.value; render(); });
    $('#r-filter').addEventListener('click', (e) => {
      const c = e.target.closest('.chip');
      if (!c) return;
      state.filter = c.dataset.rf;
      $$('#r-filter .chip').forEach((x) => x.setAttribute('aria-pressed', String(x === c)));
      render();
    });
    $('#recipe-grid').addEventListener('click', (e) => {
      const card = e.target.closest('[data-rid]');
      if (card) open(card.dataset.rid);
    });
    $('#recipe-dialog').addEventListener('click', (e) => {
      const del = e.target.closest('[data-del-recipe]');
      if (!del) return;
      SB.store.deleteRecipe(del.dataset.delRecipe);
      SB.ui.closeDialog($('#recipe-dialog'));
      SB.ui.toast('Recipe deleted.');
    });
  }

  return { init, render, builtin, saveFromMeal, open };
})();
