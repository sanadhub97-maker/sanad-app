const { join } = require("path");

// Keep Puppeteer's Chrome inside the project. By default it goes to
// ~/.cache/puppeteer, which Render's build has but its runtime doesn't, so
// every PDF failed with "Could not find Chrome".
module.exports = {
  cacheDirectory: join(__dirname, ".cache", "puppeteer"),
};
