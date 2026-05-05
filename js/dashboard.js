import { requireRole, renderTopbar } from './auth.js';

document.addEventListener('DOMContentLoaded', async () => {
  let profile;
  try {
    profile = await requireRole('student');
  } catch (_) { return; }
  renderTopbar(profile, 'dashboard');
  const firstName = (profile.full_name || '').split(' ')[0] || '';
  document.getElementById('hello').textContent = firstName ? `Bună, ${firstName}!` : 'Bună!';
});
