// Teacher dashboard: list of students with score summaries; click a student
// to see their submissions; click a submission to review the table.

import { requireRole, renderTopbar } from './auth.js';
import { getClient } from './supabase.js';
import { renderReviewTable } from './review.js';

let profile = null;
let allStudents = [];
let allSubmissions = [];
let selectedStudentId = null;

document.addEventListener('DOMContentLoaded', async () => {
  try {
    profile = await requireRole('teacher');
  } catch (_) { return; }
  renderTopbar(profile, 'teacher');
  await waitForKatex();

  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal').addEventListener('click', (e) => {
    if (e.target.id === 'modal') closeModal();
  });
  document.getElementById('class-filter').addEventListener('change', renderStudents);
  document.getElementById('export-btn').addEventListener('click', exportCsv);

  await loadAll();
});

function waitForKatex() {
  return new Promise((resolve) => {
    const check = () => (window.katex ? resolve() : setTimeout(check, 30));
    check();
  });
}

async function loadAll() {
  const sb = getClient();
  // Fetch students (RLS allows teacher to read all profiles)
  const { data: students, error: e1 } = await sb
    .from('profiles')
    .select('id, full_name, class_group')
    .eq('role', 'student')
    .order('full_name');
  if (e1) {
    document.getElementById('status').innerHTML = `<div class="error">${escapeHtml(e1.message)}</div>`;
    return;
  }
  allStudents = students;

  const { data: subs, error: e2 } = await sb
    .from('submissions')
    .select('id, student_id, created_at, pyramid_type, score_correct, score_total')
    .order('created_at', { ascending: false });
  if (e2) {
    document.getElementById('status').innerHTML = `<div class="error">${escapeHtml(e2.message)}</div>`;
    return;
  }
  allSubmissions = subs;

  // Populate class filter
  const classes = [...new Set(students.map((s) => s.class_group).filter(Boolean))].sort();
  const sel = document.getElementById('class-filter');
  for (const c of classes) {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    sel.appendChild(opt);
  }

  renderStudents();
}

function renderStudents() {
  const filter = document.getElementById('class-filter').value;
  const students = filter ? allStudents.filter((s) => s.class_group === filter) : allStudents;
  const status = document.getElementById('status');

  if (!students.length) {
    status.textContent = filter
      ? 'Nu există elevi în clasa selectată.'
      : 'Nu ai încă elevi. Adaugă conturi din panoul Supabase sau prin scriptul tools/add-student.mjs.';
    document.getElementById('students-table').innerHTML = '';
    return;
  }
  status.textContent = `${students.length} elev${students.length === 1 ? '' : 'i'}.`;

  // Aggregate stats per student
  const stats = new Map();
  for (const s of students) stats.set(s.id, { count: 0, correct: 0, total: 0, lastDate: null });
  for (const sub of allSubmissions) {
    const st = stats.get(sub.student_id);
    if (!st) continue;
    st.count++;
    st.correct += sub.score_correct;
    st.total += sub.score_total;
    if (!st.lastDate || sub.created_at > st.lastDate) st.lastDate = sub.created_at;
  }

  const table = document.getElementById('students-table');
  let html = `
    <thead>
      <tr>
        <th>Nume</th>
        <th>Clasa</th>
        <th class="num">Exerciții</th>
        <th class="num">Medie</th>
        <th>Ultimul exercițiu</th>
        <th></th>
      </tr>
    </thead>
    <tbody>`;
  for (const s of students) {
    const st = stats.get(s.id);
    const avg = st.total > 0 ? Math.round((st.correct / st.total) * 100) : null;
    const last = st.lastDate
      ? new Date(st.lastDate).toLocaleDateString('ro-RO')
      : '—';
    html += `
      <tr>
        <td><strong>${escapeHtml(s.full_name || '(fără nume)')}</strong></td>
        <td>${escapeHtml(s.class_group || '—')}</td>
        <td class="num">${st.count}</td>
        <td class="num">${avg === null ? '—' : avg + '%'}</td>
        <td>${last}</td>
        <td><button class="secondary" data-student-id="${s.id}">Vezi trimiterile</button></td>
      </tr>`;
  }
  html += '</tbody>';
  table.innerHTML = html;

  for (const btn of table.querySelectorAll('button[data-student-id]')) {
    btn.addEventListener('click', () => showStudentSubmissions(btn.dataset.studentId));
  }
}

function showStudentSubmissions(studentId) {
  selectedStudentId = studentId;
  const student = allStudents.find((s) => s.id === studentId);
  const subs = allSubmissions.filter((s) => s.student_id === studentId);
  const card = document.getElementById('submissions-card');
  card.style.display = 'block';
  document.getElementById('submissions-title').textContent =
    `Trimiteri · ${student.full_name}`;
  const status = document.getElementById('submissions-status');
  if (!subs.length) {
    status.textContent = 'Acest elev nu a trimis încă nici un exercițiu.';
    document.getElementById('submissions-list').innerHTML = '';
  } else {
    status.textContent = `${subs.length} trimiter${subs.length === 1 ? 'e' : 'i'}.`;
    document.getElementById('submissions-list').innerHTML = subs
      .map((row) => {
        const date = new Date(row.created_at).toLocaleString('ro-RO', {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        });
        const pct = row.score_total ? Math.round((row.score_correct / row.score_total) * 100) : 0;
        const typeLabel = {
          triunghiulara: 'Triunghiulară',
          patrulatera: 'Patrulateră',
          hexagonala: 'Hexagonală',
          mixt: 'Mixt',
        }[row.pyramid_type] || row.pyramid_type;
        return `
          <div class="history-row">
            <div>
              <strong>${escapeHtml(typeLabel)}</strong>
              <span class="when"> · ${date}</span>
            </div>
            <span class="score-badge">${row.score_correct} / ${row.score_total}</span>
            <span class="muted">${pct}%</span>
            <button class="secondary" data-id="${row.id}">Detalii</button>
          </div>
        `;
      })
      .join('');
    for (const btn of document.querySelectorAll('#submissions-list button[data-id]')) {
      btn.addEventListener('click', () => openDetails(btn.dataset.id));
    }
  }
  card.scrollIntoView({ behavior: 'smooth' });
}

async function openDetails(id) {
  const sb = getClient();
  const { data, error } = await sb
    .from('submissions')
    .select('id, created_at, pyramid_type, problem, answers, score_correct, score_total')
    .eq('id', id)
    .single();
  const body = document.getElementById('modal-body');
  const title = document.getElementById('modal-title');
  if (error) {
    body.innerHTML = `<div class="error">${escapeHtml(error.message)}</div>`;
  } else {
    const date = new Date(data.created_at).toLocaleString('ro-RO');
    title.textContent = `${date} · ${data.score_correct}/${data.score_total}`;
    body.innerHTML = '';
    body.appendChild(renderReviewTable(data.problem, data.answers));
  }
  document.getElementById('modal').classList.add('open');
}

function closeModal() {
  document.getElementById('modal').classList.remove('open');
}

function exportCsv() {
  const filter = document.getElementById('class-filter').value;
  const students = filter ? allStudents.filter((s) => s.class_group === filter) : allStudents;
  const studentMap = new Map(students.map((s) => [s.id, s]));
  const rows = allSubmissions.filter((s) => studentMap.has(s.student_id));
  const lines = ['nume,clasa,data,tip,corecte,total,procent'];
  for (const r of rows) {
    const s = studentMap.get(r.student_id);
    const date = new Date(r.created_at).toISOString();
    const pct = r.score_total ? Math.round((r.score_correct / r.score_total) * 100) : 0;
    const cells = [
      s.full_name || '',
      s.class_group || '',
      date,
      r.pyramid_type,
      r.score_correct,
      r.score_total,
      pct,
    ].map(csvEscape);
    lines.push(cells.join(','));
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `trimiteri-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 0);
}

function csvEscape(s) {
  s = String(s);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}
