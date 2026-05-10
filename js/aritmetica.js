// Aritmetică page: 25 exercises, 2-column layout (expression | answer).

import { requireRole, renderTopbar } from './auth.js';
import { getClient } from './supabase.js';
import { generateProblem, parseIntegerAnswer, OPS_ALL } from './math/arithmetic.js';

const STORAGE_KEY = 'calcule-aritm-settings';
const COUNT = 25;

let profile = null;
let problem = [];        // [{expr, answer}, ...]
let inputs = [];         // [{text, parsed: int|null}, ...]
let scored = false;
let submittedId = null;

document.addEventListener('DOMContentLoaded', async () => {
  try { profile = await requireRole(null); } catch (_) { return; }
  renderTopbar(profile, 'aritmetica');

  if (profile.role === 'teacher') {
    document.getElementById('submit-btn').style.display = 'none';
  }

  applySettings(loadSettings());

  document.getElementById('generate-btn').addEventListener('click', regen);
  document.getElementById('check-btn').addEventListener('click', check);
  document.getElementById('submit-btn').addEventListener('click', submit);
  for (const id of ['op-add', 'op-sub', 'op-mul', 'op-div', 'allow-neg']) {
    document.getElementById(id).addEventListener('change', () => saveSettings());
  }
  for (const id of ['complexity', 'max-num']) {
    document.getElementById(id).addEventListener('input', () => saveSettings());
  }
  for (const r of document.querySelectorAll('input[name=paren]')) {
    r.addEventListener('change', () => saveSettings());
  }

  regen();
});

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaults(), ...JSON.parse(raw) };
  } catch (_) {}
  return defaults();
}
function defaults() {
  return {
    ops: ['+', '-', '*', '/'],
    parenStyle: 'round',
    complexity: 3,
    maxNum: 20,
    allowNeg: true,
  };
}
function applySettings(s) {
  document.getElementById('op-add').checked = s.ops.includes('+');
  document.getElementById('op-sub').checked = s.ops.includes('-');
  document.getElementById('op-mul').checked = s.ops.includes('*');
  document.getElementById('op-div').checked = s.ops.includes('/');
  for (const r of document.querySelectorAll('input[name=paren]')) {
    r.checked = (r.value === s.parenStyle);
  }
  document.getElementById('complexity').value = s.complexity;
  document.getElementById('max-num').value = s.maxNum;
  document.getElementById('allow-neg').checked = s.allowNeg;
}
function readSettings() {
  const ops = [];
  if (document.getElementById('op-add').checked) ops.push('+');
  if (document.getElementById('op-sub').checked) ops.push('-');
  if (document.getElementById('op-mul').checked) ops.push('*');
  if (document.getElementById('op-div').checked) ops.push('/');
  const parenStyle = document.querySelector('input[name=paren]:checked')?.value || 'round';
  const complexity = clamp(parseInt(document.getElementById('complexity').value, 10) || 3, 1, 6);
  const maxNum = clamp(parseInt(document.getElementById('max-num').value, 10) || 20, 2, 100);
  const allowNeg = document.getElementById('allow-neg').checked;
  return { ops, parenStyle, complexity, maxNum, allowNeg };
}
function saveSettings() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(readSettings())); } catch (_) {}
}
function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

function regen() {
  const s = readSettings();
  if (s.ops.length === 0) {
    document.getElementById('status').innerHTML =
      '<div class="error">Selectează cel puțin o operație.</div>';
    return;
  }
  try {
    problem = generateProblem({ ...s, count: COUNT });
  } catch (e) {
    document.getElementById('status').innerHTML =
      `<div class="error">${escapeHtml(e.message)}</div>`;
    return;
  }
  inputs = problem.map(() => ({ text: '', parsed: null }));
  scored = false;
  submittedId = null;
  document.getElementById('submit-btn').disabled = true;
  document.getElementById('submit-btn').textContent = 'Trimite';
  document.getElementById('status').textContent = '';
  render();
}

function render() {
  const table = document.getElementById('exercises-table');
  let html = `
    <thead>
      <tr>
        <th class="num-col">#</th>
        <th class="expr-col">Exercițiu</th>
        <th class="answer-col">Răspuns</th>
      </tr>
    </thead>
    <tbody>`;
  problem.forEach((ex, i) => {
    const st = inputs[i] || { text: '' };
    let cls = '';
    if (scored) {
      cls = (st.parsed !== null && st.parsed === ex.answer) ? 'right' : 'wrong';
    }
    html += `
      <tr class="${cls}">
        <td class="num-col">${i + 1}.</td>
        <td class="expr-col">${escapeHtml(ex.expr)} =</td>
        <td class="answer-col">
          <input type="text" inputmode="text" pattern="-?\d+" data-row="${i}"
                 value="${escapeAttr(st.text)}" autocomplete="off" spellcheck="false" />
        </td>
      </tr>`;
  });
  html += '</tbody>';
  table.innerHTML = html;

  for (const inp of table.querySelectorAll('input')) {
    inp.addEventListener('input', onInput);
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const next = table.querySelectorAll('input')[parseInt(inp.dataset.row, 10) + 1];
        if (next) next.focus();
      }
    });
  }
}

function onInput() {
  const i = parseInt(this.dataset.row, 10);
  const text = this.value;
  const parsed = parseIntegerAnswer(text);
  inputs[i] = { text, parsed };
  if (scored) {
    this.parentElement.parentElement.classList.remove('right', 'wrong');
  }
}

function check() {
  scored = true;
  const { correct, total } = scoreCurrent();
  document.getElementById('status').innerHTML =
    `<span class="score-badge">Scor: ${correct} / ${total}</span> ` +
    `<span class="muted" style="margin-left:8px">Casetele verzi sunt corecte, cele roșii sunt greșite.</span>`;
  render();
  if (profile.role === 'student' && !submittedId) {
    document.getElementById('submit-btn').disabled = false;
  }
}

function scoreCurrent() {
  let correct = 0;
  for (let i = 0; i < problem.length; i++) {
    const st = inputs[i];
    if (st && st.parsed !== null && st.parsed === problem[i].answer) correct++;
  }
  return { correct, total: problem.length };
}

async function submit() {
  if (!problem.length || profile.role !== 'student') return;
  if (!scored) check();
  const { correct, total } = scoreCurrent();
  const btn = document.getElementById('submit-btn');
  btn.disabled = true;
  btn.textContent = 'Se trimite...';
  try {
    const sb = getClient();
    const settings = readSettings();
    const { data, error } = await sb
      .from('submissions')
      .insert({
        student_id: profile.id,
        module: 'aritmetica',
        pyramid_type: null,
        problem: { settings, exercises: problem },
        answers: inputs,
        score_correct: correct,
        score_total: total,
      })
      .select('id')
      .single();
    if (error) throw error;
    submittedId = data.id;
    btn.textContent = 'Trimis ✓';
    document.getElementById('status').innerHTML =
      `<span class="score-badge">Scor: ${correct} / ${total}</span> ` +
      `<span class="success" style="display:inline-block;margin-left:8px;padding:2px 10px">Răspunsurile au fost trimise.</span>`;
  } catch (err) {
    console.error(err);
    btn.disabled = false;
    btn.textContent = 'Trimite';
    document.getElementById('status').innerHTML =
      `<div class="error">Eroare la trimitere: ${escapeHtml(err.message || String(err))}</div>`;
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}
function escapeAttr(s) { return escapeHtml(s); }
