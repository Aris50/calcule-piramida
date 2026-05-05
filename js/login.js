// Login page: signs the user in, then redirects to the appropriate dashboard
// based on their `profiles.role`.

import { isConfigured, getClient } from './supabase.js';
import { signIn, getSession, getProfile } from './auth.js';

document.addEventListener('DOMContentLoaded', async () => {
  if (!isConfigured()) {
    showMsg(
      'Aplicația nu este încă configurată. Editează <code>js/config.js</code> ' +
      'cu URL-ul Supabase și cheia anonimă, apoi reîncarcă pagina.',
      'error'
    );
    document.getElementById('submit-btn').disabled = true;
    return;
  }

  // If already logged in, skip the form.
  try {
    const session = await getSession();
    if (session) {
      const profile = await getProfile();
      if (profile) {
        location.replace(profile.role === 'teacher' ? 'teacher.html' : 'dashboard.html');
        return;
      }
    }
  } catch (_) { /* fall through to login form */ }

  document.getElementById('login-form').addEventListener('submit', onSubmit);
});

async function onSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const btn = document.getElementById('submit-btn');
  btn.disabled = true;
  btn.textContent = 'Se autentifică...';
  showMsg('', '');
  try {
    await signIn(email, password);
    const profile = await getProfile();
    if (!profile) throw new Error('Profilul nu a fost găsit. Contactează profesorul.');
    location.replace(profile.role === 'teacher' ? 'teacher.html' : 'dashboard.html');
  } catch (err) {
    btn.disabled = false;
    btn.textContent = 'Intră în cont';
    const msg = err.message?.includes('Invalid login credentials')
      ? 'Email sau parolă greșite.'
      : err.message || String(err);
    showMsg(msg, 'error');
  }
}

function showMsg(html, kind) {
  const el = document.getElementById('msg');
  if (!html) { el.innerHTML = ''; return; }
  el.innerHTML = `<div class="${kind}">${html}</div>`;
}
