// Auth helpers + role-aware page guards.
// Roles are stored in `profiles.role` ('student' | 'teacher').

import { getClient, isConfigured } from './supabase.js';

let cachedProfile = null;

export async function getSession() {
  const sb = getClient();
  const { data, error } = await sb.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function signIn(email, password) {
  const sb = getClient();
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  cachedProfile = null;
  return data;
}

export async function signOut() {
  const sb = getClient();
  await sb.auth.signOut();
  cachedProfile = null;
}

export async function getProfile() {
  if (cachedProfile) return cachedProfile;
  const sb = getClient();
  const session = await getSession();
  if (!session) return null;
  const { data, error } = await sb
    .from('profiles')
    .select('id, full_name, role, class_group')
    .eq('id', session.user.id)
    .single();
  if (error) throw error;
  cachedProfile = data;
  return data;
}

// Page guard: redirect to login if no session, or to teacher/student dashboard
// if role doesn't match `requiredRole`. Returns the profile when allowed.
export async function requireRole(requiredRole) {
  if (!isConfigured()) {
    document.body.innerHTML = `
      <main><div class="card"><h2>Configurare necesară</h2>
      <p class="muted">Editează <code>js/config.js</code> cu URL-ul Supabase și cheia anonimă.</p>
      <p class="muted">Vezi <code>README.md</code> pentru pașii compleți de instalare.</p>
      </div></main>`;
    throw new Error('Not configured');
  }
  const session = await getSession();
  if (!session) {
    location.replace('index.html');
    throw new Error('Not authenticated');
  }
  const profile = await getProfile();
  if (!profile) {
    await signOut();
    location.replace('index.html');
    throw new Error('No profile');
  }
  if (requiredRole && profile.role !== requiredRole) {
    location.replace(profile.role === 'teacher' ? 'teacher.html' : 'dashboard.html');
    throw new Error('Wrong role');
  }
  return profile;
}

// Render the topbar (user info + logout). Pages call this after requireRole.
export function renderTopbar(profile, activePage) {
  const topbar = document.querySelector('header.topbar');
  if (!topbar) return;
  const isTeacher = profile.role === 'teacher';
  const homeHref = isTeacher ? 'teacher.html' : 'dashboard.html';
  const navItems = isTeacher
    ? [
        { href: 'teacher.html', label: 'Elevii mei', key: 'teacher' },
        { href: 'practice.html', label: 'Piramide', key: 'practice' },
        { href: 'aritmetica.html', label: 'Aritmetică', key: 'aritmetica' },
      ]
    : [
        { href: 'dashboard.html', label: 'Acasă', key: 'dashboard' },
        { href: 'practice.html', label: 'Piramide', key: 'practice' },
        { href: 'aritmetica.html', label: 'Aritmetică', key: 'aritmetica' },
        { href: 'history.html', label: 'Istoric', key: 'history' },
      ];
  topbar.innerHTML = `
    <h1><a href="${homeHref}" style="color:inherit;text-decoration:none">Calcule · Piramide</a></h1>
    <nav>
      ${navItems.map((it) => `<a href="${it.href}" class="${it.key === activePage ? 'active' : ''}">${it.label}</a>`).join('')}
    </nav>
    <span class="spacer"></span>
    <span class="user">${escapeHtml(profile.full_name || '')}${isTeacher ? ' (profesor)' : ''}</span>
    <button class="secondary" id="logout-btn">Ieșire</button>
  `;
  document.getElementById('logout-btn').addEventListener('click', async () => {
    await signOut();
    location.replace('index.html');
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}
