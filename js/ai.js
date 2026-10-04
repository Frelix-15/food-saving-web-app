/* SaveBite: AI client.
 *
 * The browser never sees your API key. It sends requests to /api/ai on the local
 * server (server.js), which adds the key from your .env file and calls the AI.
 * If the server has no key, `SB.ai.info.enabled` is false and the app falls back
 * to built-in recipe matching.
 */
SB.ai = (function () {
  const U = SB.utils;
  const cfg = SB.config;
  const info = { enabled: false, model: '', checked: false };
  const listeners = [];
  const onChange = (fn) => listeners.push(fn);

  async function checkStatus() {
    try {
      const res = await fetch(cfg.STATUS_ENDPOINT, { cache: 'no-store' });
      const data = await res.json();
      info.enabled = !!data.aiEnabled;
      info.model = data.model || '';
    } catch (e) {
      // Opened as a plain file, or served by a static server with no /api routes.
      info.enabled = false;
    }
    info.checked = true;
    listeners.forEach((fn) => fn(info));
  }

  /** Send one request through the local server and return the AI's text reply. */
  async function ask({ system, prompt, image, maxTokens = 1400 }) {
    let res;
    try {
      res = await fetch(cfg.AI_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system, prompt, image, maxTokens })
      });
    } catch (e) {
      throw new Error('Could not reach the SaveBite server. Start it with "node server.js" (see the README).');
    }
    let data = null;
    try { data = await res.json(); } catch (e) { /* not JSON */ }
    if (!res.ok) throw new Error((data && data.error) || `The AI request failed (error ${res.status}).`);
    return data.text || '';
  }

  function parseJSON(text) {
    const clean = String(text).replace(/```json|```/gi, '').trim();
    const start = clean.indexOf('{');
    const end = clean.lastIndexOf('}');
    if (start < 0 || end <= start) throw new Error('The AI reply was not in the expected format. Please try again.');
    try {
      return JSON.parse(clean.slice(start, end + 1));
    } catch (e) {
      throw new Error('The AI reply could not be read. Please try again.');
    }
  }
  const strList = (v) => (Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean) : []);

  /* ---------- Meal suggestions ---------- */
  async function suggestMeals(foods, opts) {
    const list = foods.map((f) => {
      const d = U.daysUntil(f.expiry);
      const when = d < 0 ? `past its date by ${U.plural(-d, 'day')}` : d === 0 ? 'expires today' : `expires in ${U.plural(d, 'day')}`;
      return `- ${f.name} (${U.fmtQty(f)}): ${when}`;
    }).join('\n');

    const prompt =
`Foods the user wants to use up:
${list}

Servings needed: ${opts.servings}
Dietary preference: ${opts.diet}
Maximum cooking time: ${opts.time ? opts.time + ' minutes' : 'no limit'}
${opts.staples ? 'Assume the user also has basic staples (oil, salt, pepper, common spices, water).' : 'Do not assume any ingredients beyond the foods listed.'}

Suggest 3 different meals. Build each one around the foods that expire soonest and keep extra ingredients to a minimum. If a food is past its date, either avoid it or add a short reminder in the steps to check it is still safe first.

Reply with JSON only, in exactly this shape:
{"meals":[{"title":"","description":"one sentence","time_minutes":0,"servings":0,"uses":["names copied from the list above"],"extra_ingredients":["anything else needed"],"steps":["short imperative steps"]}]}`;

    const text = await ask({
      system: 'You are SaveBite, a practical home-cooking assistant that helps people reduce food waste. Give safe, realistic recipes. Reply with a single JSON object and nothing else: no markdown, no code fences, no commentary.',
      prompt,
      maxTokens: 1800
    });
    const data = parseJSON(text);
    const meals = (Array.isArray(data.meals) ? data.meals : []).slice(0, 4).map((m) => ({
      title: String(m.title || 'Untitled meal'),
      description: String(m.description || ''),
      time: Number(m.time_minutes) || null,
      servings: Number(m.servings) || opts.servings,
      uses: strList(m.uses),
      extra: strList(m.extra_ingredients),
      steps: strList(m.steps),
      emoji: '✨',
      source: 'ai'
    }));
    if (!meals.length) throw new Error('The AI did not return any meals. Please try again.');
    return meals;
  }

  /* ---------- Photo recognition ---------- */
  function resizeImage(file, maxDim = 1024, quality = 0.85) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.width * scale));
        c.height = Math.max(1, Math.round(img.height * scale));
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('That file could not be opened as an image. Try a JPG or PNG.'));
      };
      img.src = url;
    });
  }

  async function identifyFood(dataUrl) {
    const keys = Object.keys(SB.data.categories).join(', ');
    const text = await ask({
      system: 'You identify food in photos for a food-waste app. Reply with a single JSON object and nothing else: no markdown, no code fences, no commentary.',
      prompt:
`Identify the distinct food items visible in this photo (at most 8). Reply with JSON only, in exactly this shape:
{"items":[{"name":"","category":"one of: ${keys}","confidence":"high | medium | low","shelf_life_days":0,"storage_tip":"one short sentence"}]}
shelf_life_days is the typical number of days the item stays good from today if stored properly. If there is no food in the photo, reply {"items":[]}.`,
      image: { media_type: 'image/jpeg', data: dataUrl.split(',')[1] },
      maxTokens: 900
    });
    const data = parseJSON(text);
    const valid = SB.data.categories;
    return (Array.isArray(data.items) ? data.items : []).slice(0, 8).map((i) => ({
      name: String(i.name || 'Unknown food'),
      category: valid[i.category] ? i.category : 'other',
      confidence: ['high', 'medium', 'low'].includes(String(i.confidence).toLowerCase()) ? String(i.confidence).toLowerCase() : 'medium',
      shelfLife: Math.max(1, Math.min(365, Number(i.shelf_life_days) || valid[i.category]?.shelf || 7)),
      tip: String(i.storage_tip || '')
    }));
  }

  return { info, onChange, checkStatus, ask, suggestMeals, identifyFood, resizeImage };
})();
