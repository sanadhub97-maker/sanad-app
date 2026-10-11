// Runs before the app: the page's direction and language from the saved
// choice, so an English user never sees a right-to-left flash. It is a file
// (not inline) so the server's Content-Security-Policy lets it run.
(function () {
  try {
    var savedLang = localStorage.getItem("i18nextLng") || navigator.language || "ar";
    var isRtl = !savedLang || savedLang.indexOf("en") !== 0;
    document.documentElement.dir = isRtl ? "rtl" : "ltr";
    document.documentElement.lang = isRtl ? "ar" : "en";
    // The Royale design is dark by design, from the first frame.
    document.documentElement.classList.add("dark");
  } catch (e) {}
})();
