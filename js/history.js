// Student history: list of past submissions + detail modal showing the
// table with red/green coloring.

import { requireRole, renderTopbar } from './auth.js';
import { getClient } from './supabase.js';
import { renderReview } from './review.js';

function moduleLabel(row) {
  if (row.module === 'aritmetica') return 'Aritmetică';
  // module='piramide' (default)
  return ({
    triunghiulara: 'Piramidă triunghiulară',
    patrulatera:   'Piramidă patrulateră',
    hexagonala:    'Piramidă hexagonală',
    mixt:          'Piramide (mixt)',
  })[row.pyramid_type] || 'Piramide';
}

let profile = null;

document.addEventListener('DOMContentLoaded', async () => {
  try {
    profile = await requireRole('student');
  } catch (_) { return; }
  renderTopbar(profile, 'history');
  await waitForKatex();

  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal').addEventListener('click', (e) => {
    if (e.target.id === 'modal') closeModal();
  });

  await loadHistory();
});

function waitForKatex() {
  return new Promise((resolve) => {
    const check = () => (window.katex ? resolve() : setTimeout(check, 30));
    check();
  });
}

async function loadHistory() {
  const sb = getClient();
  const { data, error } = await sb
    .from('submissions')
    .select('id, created_at, module, pyramid_type, score_correct, score_total')
    .eq('student_id', profile.id)
    .order('created_at', { ascending: false });

  const status = document.getElementById('status');
  const list = document.getElementById('history-list');
  if (error) {
    status.innerHTML = `<div class="error">Eroare: ${escapeHtml(error.message)}</div>`;
    return;
  }
  if (!data.length) {
    status.textContent = 'Încă nu ai trimis nici un exercițiu. Începe de pe pagina Exercițiu!';
    return;
  }
  status.textContent = `Ai ${data.length} exerci${data.length === 1 ? 'țiu' : 'ții'} trimi${data.length === 1 ? 's' : 'se'}.`;
  list.innerHTML = data
    .map((row) => {
      const date = new Date(row.created_at).toLocaleString('ro-RO', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
      const pct = row.score_total ? Math.round((row.score_correct / row.score_total) * 100) : 0;
      return `
        <div class="history-row">
          <div>
            <strong>${escapeHtml(moduleLabel(row))}</strong>
            <span class="when"> · ${date}</span>
          </div>
          <span class="score-badge">${row.score_correct} / ${row.score_total}</span>
          <span class="muted">${pct}%</span>
          <button class="secondary" data-id="${row.id}">Detalii</button>
        </div>
      `;
    })
    .join('');
  for (const btn of list.querySelectorAll('button[data-id]')) {
    btn.addEventListener('click', () => openDetails(btn.dataset.id));
  }
}

async function openDetails(id) {
  const sb = getClient();
  const { data, error } = await sb
    .from('submissions')
    .select('id, created_at, module, pyramid_type, problem, answers, score_correct, score_total')
    .eq('id', id)
    .single();

  const body = document.getElementById('modal-body');
  const title = document.getElementById('modal-title');
  if (error) {
    body.innerHTML = `<div class="error">${escapeHtml(error.message)}</div>`;
  } else {
    const date = new Date(data.created_at).toLocaleString('ro-RO');
    title.textContent = `${moduleLabel(data)} · ${date} · ${data.score_correct}/${data.score_total}`;
    body.innerHTML = '';
    body.appendChild(renderReview(data));
  }
  document.getElementById('modal').classList.add('open');
}

function closeModal() {
  document.getElementById('modal').classList.remove('open');
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}
