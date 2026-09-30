// Runs before the app: the page's direction and language from the saved
// choice, so an English user never sees a right-to-left flash. It is a file
// (not inline) so the server's Content-Security-Policy lets it run.
(function () {
  try {
    var savedLang = localStorage.getItem("i18nextLng") || navigator.language || "ar";
    var isRtl = !savedLang || savedLang.indexOf("en") !== 0;
    document.documentElement.dir = isRtl ? "rtl" : "ltr";
    document.documentElement.lang = isRtl ? "ar" : "en";
    // The design opens light; the app then applies Settings → Appearance once it loads.
    document.documentElement.classList.remove("dark");
  } catch (e) {}
})();
