// Vercel function: the whole API (Express), built into server/dist.
// WhatsApp's library is loaded at run time through import(); naming it here lets Vercel pack it.
if (process.env.SANAD_NEVER_SET) require("@whiskeysockets/baileys");
module.exports = require("../server/dist/vercel.js").app;
