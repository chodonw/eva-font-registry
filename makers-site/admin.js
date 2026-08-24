async function boot() {
  const response = await fetch('/api/auth/me', { cache: 'no-store' });
  if (!response.ok) {
    location.replace('/login?returnTo=/admin');
    return;
  }
  const payload = await response.json();
  document.querySelector('#user-id').textContent = payload.user.id;
  document.querySelector('#user-role').textContent = payload.user.role;
  document.querySelector('#avatar').textContent = payload.user.id.slice(0, 1).toUpperCase();
  document.body.hidden = false;
  fetch('/font-manifest.json', { cache: 'no-store' }).then((item) => item.json()).then((manifest) => {
    const count = Array.isArray(manifest?.fonts) ? manifest.fonts.length : Number(manifest?.fontCount || 0);
    document.querySelector('#admin-public-count').textContent = String(Number.isFinite(count) ? count : 0);
  }).catch(() => {});
}

document.querySelector('#logout').addEventListener('click', async () => {
  await fetch('/api/auth/logout', { method: 'POST' });
  location.replace('/login');
});

boot();
