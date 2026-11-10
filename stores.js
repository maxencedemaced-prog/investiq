// stores.js — Liens vers les applis Kapitaro dans les magasins d'applications.
// Le jour où Apple ou Google publie l'appli, passer « live » à true ici : la page /applis,
// la zone « Installe l'app » de la connexion et la ligne des Paramètres proposent alors le magasin.
(function (root) {
  var KP_STORES = {
    ios: { live: false, name: "l'App Store", device: 'iPhone et iPad', url: 'https://apps.apple.com/fr/app/kapitaro/id6831945393' },
    android: { live: false, name: 'Google Play', device: 'Android', url: 'https://play.google.com/store/apps/details?id=fr.kapitaro.app' },
  };
  // Magasin à proposer sur cet appareil (null si l'appli n'y est pas encore, ou sur ordinateur)
  function kpStoreLink() {
    try {
      var ua = navigator.userAgent || '';
      var ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      var android = /Android/i.test(ua);
      var s = ios ? KP_STORES.ios : android ? KP_STORES.android : null;
      return s && s.live ? s : null;
    } catch (e) { return null; }
  }
  root.KP_STORES = KP_STORES;
  root.kpStoreLink = kpStoreLink;
})(typeof window !== 'undefined' ? window : globalThis);
