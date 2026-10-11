// Vercel Cron: the daily jobs (backup, morning brief, expiry scan and its WhatsApp alerts).
if (process.env.SANAD_NEVER_SET) require("@whiskeysockets/baileys");
const { cron } = require("../server/dist/vercel.js");
module.exports = (req, res) => cron(req, res);
