/* SaveBite: state + persistence in the browser's localStorage */
SB.store = (function () {
  const U = SB.utils;
  const K = {
    items: 'savebite.items',
    history: 'savebite.history',
    recipes: 'savebite.recipes',
    settings: 'savebite.settings',
    seeded: 'savebite.seeded'
  };
  const defaults = {
    theme: null,            // null = follow the system
    notify: false,         // desktop notifications on/off
    remindDays: SB.config.DEFAULT_REMIND_DAYS,
    lastNotified: {}       // itemId -> date we last notified about it
  };

  const state = { items: [], history: [], recipes: [], settings: Object.assign({}, defaults) };
  const subs = [];

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }
  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('SaveBite: could not save to this browser.', e);
    }
  }
  function persist() {
    write(K.items, state.items);
    write(K.history, state.history);
    write(K.recipes, state.recipes);
    write(K.settings, state.settings);
  }
  function emit() {
    subs.forEach((fn) => {
      try { fn(); } catch (e) { console.error(e); }
    });
  }
  const arr = (v) => (Array.isArray(v) ? v : []);

  function load() {
    state.settings = Object.assign({}, defaults, read(K.settings, {}));
    if (read(K.seeded, false)) {
      state.items = arr(read(K.items, []));
      state.history = arr(read(K.history, []));
      state.recipes = arr(read(K.recipes, []));
    } else {
      // First visit: start with sample foods so the app is useful straight away.
      state.items = SB.data.sampleItems();
      state.history = SB.data.sampleHistory();
      state.recipes = [];
      write(K.seeded, true);
      persist();
    }
  }

  const on = (fn) => subs.push(fn);

  function saveSettings(patch) {
    Object.assign(state.settings, patch);
    write(K.settings, state.settings);
  }

  /* ----- Foods ----- */
  function addItem(data) {
    const item = {
      id: U.uid(),
      name: data.name.trim(),
      quantity: Number(data.quantity) || 1,
      unit: data.unit || 'pcs',
      category: data.category || 'other',
      expiry: data.expiry,
      added: U.todayISO()
    };
    state.items.push(item);
    persist();
    emit();
    return item;
  }
  function updateItem(id, patch) {
    const item = state.items.find((i) => i.id === id);
    if (!item) return null;
    Object.assign(item, patch);
    persist();
    emit();
    return item;
  }
  function removeItem(id) {
    const idx = state.items.findIndex((i) => i.id === id);
    if (idx < 0) return null;
    const [item] = state.items.splice(idx, 1);
    persist();
    emit();
    return item;
  }
  function restoreItem(item) {
    state.items.push(item);
    persist();
    emit();
  }

  /** Mark a food as used (saved) or wasted. Returns the history entry so it can be undone. */
  function complete(id, action) {
    const idx = state.items.findIndex((i) => i.id === id);
    if (idx < 0) return null;
    const [item] = state.items.splice(idx, 1);
    const cat = SB.data.categories[item.category] || SB.data.categories.other;
    const entry = {
      id: U.uid(), name: item.name, category: item.category, quantity: item.quantity,
      unit: item.unit, action, date: U.todayISO(), value: cat.value, item
    };
    state.history.push(entry);
    persist();
    emit();
    return entry;
  }
  function undoComplete(entry) {
    state.history = state.history.filter((h) => h.id !== entry.id);
    if (entry.item) state.items.push(entry.item);
    persist();
    emit();
  }

  /* ----- Saved recipes (from AI) ----- */
  function saveRecipe(recipe) {
    if (state.recipes.some((r) => r.title.toLowerCase() === recipe.title.toLowerCase())) return false;
    state.recipes.push(recipe);
    persist();
    emit();
    return true;
  }
  function deleteRecipe(id) {
    state.recipes = state.recipes.filter((r) => r.id !== id);
    persist();
    emit();
  }

  /* ----- Data management ----- */
  function resetSample() {
    state.items = SB.data.sampleItems();
    state.history = SB.data.sampleHistory();
    state.settings.lastNotified = {};
    persist();
    emit();
  }
  function clearAll() {
    state.items = [];
    state.history = [];
    state.recipes = [];
    state.settings.lastNotified = {};
    persist();
    emit();
  }

  return {
    state, load, on, saveSettings, addItem, updateItem, removeItem, restoreItem,
    complete, undoComplete, saveRecipe, deleteRecipe, resetSample, clearAll
  };
})();
