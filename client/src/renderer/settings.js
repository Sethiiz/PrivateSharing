window.TDG = window.TDG || {};

TDG.settings = (() => {
  const DEFAULT_SIGNAL_URL = 'wss://privatesharing.onrender.com';

  function get(key, fallback) {
    const v = localStorage.getItem(key);
    return v === null ? fallback : v;
  }

  return {
    DEFAULT_SIGNAL_URL,

    getSignalUrl: () => get('signalUrl', DEFAULT_SIGNAL_URL),
    setSignalUrl: (url) => localStorage.setItem('signalUrl', url),

    getTurn() {
      return {
        enabled: get('turnEnabled', 'false') === 'true',
        host: get('turnHost', ''),
        user: get('turnUser', ''),
        pass: get('turnPass', ''),
      };
    },
    setTurn({ enabled, host, user, pass }) {
      localStorage.setItem('turnEnabled', String(!!enabled));
      localStorage.setItem('turnHost', host || '');
      localStorage.setItem('turnUser', user || '');
      localStorage.setItem('turnPass', pass || '');
    },

    getShareQuality: () => get('shareQuality', 'standard'),
    setShareQuality: (quality) => localStorage.setItem('shareQuality', quality),

    getSidebarCollapsed: () => get('sidebarCollapsed', 'false') === 'true',
    setSidebarCollapsed: (collapsed) => localStorage.setItem('sidebarCollapsed', String(!!collapsed)),

    getTheme: () => get('theme', 'purple'),
    setTheme: (themeId) => localStorage.setItem('theme', themeId),
  };
})();
