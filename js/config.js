/* SaveBite: configuration
 *
 * There is NO API key in this file, on purpose. Anything in front-end code can be read
 * by anyone who opens the page, so the key lives on the small local server instead.
 *
 *   >>> Put your API key in the ".env" file (see README.md, step "Connect AI"). <<<
 */
window.SB = window.SB || {};

SB.config = {
  // Endpoints provided by server.js. The server holds the key and calls the AI for you.
  AI_ENDPOINT: '/api/ai',
  STATUS_ENDPOINT: '/api/status',

  // A food counts as "use soon" when it has this many days or fewer left.
  SOON_DAYS: 3,

  // Default for "remind me when food is within N days of its date".
  DEFAULT_REMIND_DAYS: 2,

  // How often (minutes) to check for reminders while the app is open.
  REMINDER_CHECK_MINUTES: 15,

  // Used for the rough savings estimate. Change it to your own currency symbol.
  CURRENCY: '$',

  // Rough estimate of CO2e avoided per food entry saved (kg). A guide, not a measurement.
  CO2_PER_ITEM_KG: 1.0
};
