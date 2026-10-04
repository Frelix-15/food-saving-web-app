/* SaveBite: photo upload + AI food recognition */
SB.scan = (function () {
  const U = SB.utils;
  const { $, esc, icon } = U;
  const C = SB.data.categories;
  let dataUrl = null;
  let results = [];
  let busy = false;

  function renderPill() {
    const el = $('#ai-pill-scan');
    el.className = 'ai-pill ' + (SB.ai.info.enabled ? 'on' : 'off');
    el.innerHTML = SB.ai.info.enabled ? `${icon('sparkle')} AI connected` : `${icon('alert')} AI not connected`;
  }

  function renderSide(state) {
    const side = $('#scan-side');
    if (!SB.ai.info.enabled) {
      side.innerHTML = `
        <div class="panel info-panel">
          <h3>Photo recognition needs AI</h3>
          <p>Identifying food from a picture uses an AI vision model, so it is switched off until you add an API key. Everything else in SaveBite works without it.</p>
          <p class="muted">To turn it on, add your key to the <code>.env</code> file and restart the server. The README has the exact steps.</p>
          <p>Until then you can still add the food yourself:</p>
          <button class="btn btn-primary" type="button" data-open-add>${icon('plus')}Add this food manually</button>
        </div>`;
      return;
    }
    if (state === 'loading') {
      side.innerHTML = '<div class="panel"><h3>Looking at your photo</h3><div class="sk sk-line"></div><div class="sk sk-line short"></div><div class="sk sk-line"></div></div>';
      return;
    }
    if (state === 'error') return; // error panel already set by identify()
    if (!dataUrl) {
      side.innerHTML = `<div class="panel info-panel"><h3>How it works</h3>
        <p>Choose a photo of your groceries, fridge shelf or a single item. The AI names what it sees and suggests how long it should last. You decide what to add.</p>
        <p class="muted">Your photo is sent to the AI only when you press Identify food. It is not stored by SaveBite.</p></div>`;
      return;
    }
    if (state === 'done') {
      if (!results.length) {
        side.innerHTML = `<div class="panel info-panel"><h3>No food found</h3><p class="muted">The AI could not see any food in that photo. Try a closer, brighter picture, or add it by hand.</p>
          <button class="btn btn-ghost" type="button" data-open-add>Add manually</button></div>`;
        return;
      }
      side.innerHTML = `<div class="panel"><h3>${U.plural(results.length, 'item')} found</h3>
        <ul class="found-list">${results.map((r, i) => `
          <li class="found">
            <span class="found-emoji" aria-hidden="true">${(C[r.category] || C.other).emoji}</span>
            <div class="found-info">
              <strong>${esc(r.name)}</strong>
              <span class="muted small">${esc((C[r.category] || C.other).label)}, ${r.confidence} confidence, lasts about ${U.plural(r.shelfLife, 'day')}</span>
              ${r.tip ? `<span class="small">${esc(r.tip)}</span>` : ''}
            </div>
            <button class="btn btn-primary btn-sm" type="button" data-add="${i}">${icon('plus')}Add</button>
          </li>`).join('')}</ul></div>`;
      return;
    }
    side.innerHTML = `<div class="panel info-panel"><h3>Ready</h3><p>Press Identify food to see what the AI finds in your photo.</p></div>`;
  }

  async function handleFile(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) { SB.ui.toast('Please choose an image file.', { type: 'warn' }); return; }
    if (file.size > 20 * 1024 * 1024) { SB.ui.toast('That photo is too large. Choose one under 20 MB.', { type: 'warn' }); return; }
    try {
      dataUrl = await SB.ai.resizeImage(file);
    } catch (err) {
      SB.ui.toast(err.message, { type: 'warn' });
      return;
    }
    results = [];
    $('#preview-img').src = dataUrl;
    $('#scan-preview').hidden = false;
    $('#dropzone').hidden = true;
    $('#btn-identify').disabled = !SB.ai.info.enabled;
    renderSide('ready');
  }

  async function identify() {
    if (busy || !dataUrl || !SB.ai.info.enabled) return;
    busy = true;
    $('#btn-identify').disabled = true;
    renderSide('loading');
    try {
      results = await SB.ai.identifyFood(dataUrl);
      renderSide('done');
    } catch (err) {
      $('#scan-side').innerHTML = `<div class="panel info-panel"><h3>That did not work</h3><p>${esc(err.message)}</p>
        <button class="btn btn-ghost" type="button" data-retry>Try again</button></div>`;
    }
    busy = false;
    $('#btn-identify').disabled = false;
  }

  function init() {
    const input = $('#photo-input');
    input.addEventListener('change', () => { handleFile(input.files[0]); input.value = ''; });

    const dz = $('#dropzone');
    ['dragenter', 'dragover'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add('drag'); }));
    ['dragleave', 'drop'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove('drag'); }));
    dz.addEventListener('drop', (e) => handleFile(e.dataTransfer.files[0]));

    $('#btn-identify').addEventListener('click', identify);
    $('#scan-side').addEventListener('click', (e) => {
      if (e.target.closest('[data-retry]')) identify();
      const add = e.target.closest('[data-add]');
      if (add) {
        const r = results[Number(add.dataset.add)];
        SB.dashboard.openAdd({
          name: r.name, category: r.category,
          expiry: U.addDays(U.todayISO(), r.shelfLife),
          hint: `The AI estimated about ${U.plural(r.shelfLife, 'day')}. Check the packaging and adjust.`
        });
      }
    });
    SB.ai.onChange(() => { renderPill(); renderSide(results.length ? 'done' : 'ready'); if (dataUrl) $('#btn-identify').disabled = !SB.ai.info.enabled; });
  }

  function render() {
    renderPill();
    if (!busy) renderSide(results.length ? 'done' : 'ready');
  }

  return { init, render };
})();
