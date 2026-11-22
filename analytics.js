// Google Analytics 4, anonymous only: consent stays "denied", so no cookies are stored and Google gets
// cookieless pings (rough counts, no returning-visitor data). Only runs on the live site.
(function () {
  const GA_ID = 'G-5WBF3XZCB1';
  window.track = function () {}; // no-op until GA is on
  if (location.hostname !== 'rooms.rr2.dev') return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  gtag('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
  gtag('js', new Date());
  gtag('config', GA_ID, { allow_google_signals: false, allow_ad_personalization_signals: false });
  const s = document.createElement('script'); s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
  document.head.appendChild(s);
  // A few key actions: track('choose_view', { view: 'walk' }) and the like
  window.track = function (name, params) { gtag('event', name, params || {}); };
})();
