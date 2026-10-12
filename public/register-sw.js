// Registers the TRICCI service worker so the site can be installed as an app.
// Failure is harmless: the site works normally without it.
(function () {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(function () {});
  });
})();
