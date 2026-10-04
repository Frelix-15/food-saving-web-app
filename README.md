# SaveBite

Track the food in your kitchen, see a live countdown to expiry, 
## Start it on Windows

1. **Install Node.js** (one time). Download the **LTS** version from https://nodejs.org and run the installer with the default options. To check it worked, open Command Prompt and type `node -v`. You should see a version number such as `v22.x`.
2. **Unzip SaveBite.** Right-click `savebite.zip`, choose **Extract All**, and pick a folder such as `Documents`.
3. **Start it.** Open the `savebite` folder and double-click **`start.bat`**. A black window opens, and your browser opens SaveBite at http://localhost:3000.
   - Prefer the terminal? Click the folder's address bar in File Explorer, type `cmd`, press Enter, then run `node server.js` and open http://localhost:3000.
4. **Stop it** by pressing `Ctrl + C` in the black window, or just closing it.

The app works straight away with sample foods, countdowns, recipes, reminders, statistics and dark mode. AI meal ideas and photo recognition need the key in the next section. Without a key, meal ideas fall back to matching your foods against the built-in recipes.

### No Node.js? A quick alternative
If you have Python installed, open Command Prompt in the folder and run `py -m http.server 8000`, then open http://localhost:8000. Everything works except the AI features.
Your saved foods are stored per address, so `localhost:3000` and `localhost:8000` do not share data.

## Connect AI (meal ideas and photo recognition)

**Where the key goes: a file named `.env` in the `savebite` folder.** It is never put in the website code, so it cannot be read by visitors to the page.

1. Get an API key at https://console.anthropic.com (Settings, then API keys). Usage is billed by the provider.
2. In Command Prompt inside the `savebite` folder, run:
   ```
   copy .env.example .env
   notepad .env
   ```
3. In Notepad, paste your key right after `ANTHROPIC_API_KEY=` with no quotes or spaces, then save and close.
4. Restart SaveBite (close the black window, double-click `start.bat` again).
5. The Meal ideas and Scan food pages now show **AI connected**.

Keep `.env` private. Do not email it or upload it. If a key leaks, delete it in the console and make a new one.

### How the connection works
`js/ai.js` (in the browser) calls `/api/ai` on your own computer. `server.js` adds the key from `.env` and calls the AI provider. To change provider or request format, edit `callAI()` in `server.js`. The model name is `ANTHROPIC_MODEL` in `.env`.

## Files

| File | What it does |
|---|---|
| `index.html` | All pages, dialogs and icons |
| `css/styles.css` | Design, dark mode, responsive layout, animations |
| `js/config.js` | Settings (soon-to-expire days, currency, endpoints). **No key here** |
| `js/utils.js` | Date helpers, countdown text, food-name matching |
| `js/data.js` | Categories, sample foods, built-in recipes |
| `js/storage.js` | Saves everything to the browser (localStorage) |
| `js/ai.js` | Meal suggestion and photo recognition requests |
| `js/ui.js` | Theme, page routing, toasts, dialogs |
| `js/notifications.js` | Reminder list and desktop notifications |
| `js/home.js`, `dashboard.js`, `meals.js`, `recipes.js`, `scan.js`, `stats.js` | One file per page |
| `js/app.js` | Start-up and the live countdown timer |


## Things worth knowing

- **Reminders** always show in the bell menu. Desktop notifications need your permission and only fire **while SaveBite is open in a browser tab**, because there is no background service. Use the localhost address (not a double-clicked `index.html`) so the browser allows them.
- **Your data** lives in this browser only. Clearing site data erases it. The Savings page has buttons to reload the samples or clear everything.
- **Photo recognition** sends a resized copy of your photo to the AI only when you press Identify food. Results are suggestions, so check dates against the packaging.
- **Money and CO2 figures** are rough estimates. Change the currency in `js/config.js` and per-category values in `js/data.js`.
- **Port in use?** Run `set PORT=3001 && node server.js` in Command Prompt.
- **"node is not recognized"**: reinstall Node.js, then open a new Command Prompt window.
