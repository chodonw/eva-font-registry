fetch('/font-manifest.json', { cache: 'no-store' })
  .then((response) => response.ok ? response.json() : null)
  .then((manifest) => {
    const count = Array.isArray(manifest?.fonts) ? manifest.fonts.length : Number(manifest?.fontCount || 0);
    document.querySelector('#public-count').textContent = String(Number.isFinite(count) ? count : 0);
  })
  .catch(() => {});
