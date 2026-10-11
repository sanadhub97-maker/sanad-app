// Vercel function: the whole API (Express), built into server/dist.
// ES-only packages (WhatsApp, file-type, Chromium) load at run time through import(); naming them here lets Vercel pack them.
if (process.env.SANAD_NEVER_SET) { require("@whiskeysockets/baileys"); require("file-type"); require("@sparticuz/chromium"); require("archiver"); require("puppeteer"); }
module.exports = require("../server/dist/vercel.js").app;
