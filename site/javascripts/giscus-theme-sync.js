// Keep giscus theme in sync with Material palette
(function () {
  const THEMES = {
    light: 'light',
    dark: 'dark',
  };

  function currentTheme() {
    const scheme = document.documentElement.getAttribute('data-md-color-scheme');
    return scheme === 'slate' || scheme === 'dark' ? THEMES.dark : THEMES.light;
  }

  function postTheme(theme) {
    const frame = document.querySelector('iframe.giscus-frame');
    if (!frame) return;
    frame.contentWindow.postMessage({ giscus: { setConfig: { theme } } }, 'https://giscus.app');
  }

  // Initial
  document.addEventListener('DOMContentLoaded', () => postTheme(currentTheme()));

  // React to palette toggles
  const obs = new MutationObserver(() => postTheme(currentTheme()));
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-md-color-scheme'] });

  // SPA navigations in Material
  if (window.document$ && typeof document$.subscribe === 'function') {
    document$.subscribe(() => setTimeout(() => postTheme(currentTheme()), 0));
  }
})();