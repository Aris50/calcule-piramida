// Practice page: generate an 8-row table, accept student answers, score,
// optionally submit to Supabase.

import { requireRole, renderTopbar } from './auth.js';
import { getClient, isConfigured } from './supabase.js';
import {
  VARS,
  VAR_LABEL,
  VAR_NAME_RO,
  PYRAMID_LABEL_RO,
  compute,
} from './math/pyramids.js';
import { generateProblem, serializeProblem } from './math/generator.js';
import { Exact } from './math/exact.js';
import { parseAnswer, ParseError } from './math/parse.js';

const COLUMNS = ['l', 'ab', 'R', 'P', 'Ab', 'h', 'ap', 'm', 'Al', 'At', 'V'];

// State
let profile = null;
let currentProblem = null;          // array of rows
let inputState = [];                // [rowIdx][col] = { text, parsed, error }
let scored = false;
let submittedId = null;             // id of inserted submission row, if any

document.addEventListener('DOMContentLoaded', async () => {
  try {
    profile = await requireRole(null);  // any logged-in user
  } catch (_) { return; }
  renderTopbar(profile, 'practice');

  const isTeacher = profile.role === 'teacher';
  if (isTeacher) {
    document.getElementById('submit-btn').style.display = 'none';
  }

  document.getElementById('generate-btn').addEventListener('click', regen);
  document.getElementById('check-btn').addEventListener('click', check);
  document.getElementById('submit-btn').addEventListener('click', submit);
  document.getElementById('type-select').addEventListener('change', regen);

  // Wait for KaTeX to load
  await waitForKatex();
  regen();
});

function waitForKatex() {
  return new Promise((resolve) => {
    const check = () => (window.katex ? resolve() : setTimeout(check, 30));
    check();
  });
}

function regen() {
  const type = document.getElementById('type-select').value;
  currentProblem = generateProblem({ type, rows: 8 });
  inputState = currentProblem.map((row) =>
    Object.fromEntries(
      COLUMNS.filter((c) => !row.given.includes(c)).map((c) => [
        c,
        { text: '', parsed: null, error: null },
      ])
    )
  );
  scored = false;
  submittedId = null;
  document.getElementById('submit-btn').disabled = true;
  document.getElementById('submit-btn').textContent = 'Trimite';
  document.getElementById('status').textContent = '';
  render();
}

function render() {
  const table = document.getElementById('problem-table');
  // Header
  let html = '<thead><tr><th style="text-align:left">Tip piramidă</th>';
  for (const v of COLUMNS) {
    html += `<th><span class="katex-target" data-tex="${VAR_LABEL[v]}"></span><br><span class="muted" style="font-weight:400;font-size:11px">${escapeHtml(VAR_NAME_RO[v])}</span></th>`;
  }
  html += '</tr></thead><tbody>';
  // Rows
  currentProblem.forEach((row, ri) => {
    html += '<tr>';
    html += `<td class="row-type">${escapeHtml(PYRAMID_LABEL_RO[row.type])}</td>`;
    for (const v of COLUMNS) {
      const isGiven = row.given.includes(v);
      const cellId = `cell-${ri}-${v}`;
      const previewId = `prev-${ri}-${v}`;
      if (isGiven) {
        const tex = row.values[v].toLatex();
        html += `<td class="given"><span class="katex-target" data-tex="${escapeAttr(tex)}"></span></td>`;
      } else {
        const st = inputState[ri][v] || { text: '' };
        let cls = 'input-cell';
        if (scored) {
          if (st.parsed && st.parsed.equals(row.values[v])) cls += ' right';
          else cls += ' wrong';
        }
        html += `<td class="${cls}">
          <input type="text" id="${cellId}" data-row="${ri}" data-var="${v}" value="${escapeAttr(st.text)}" autocomplete="off" spellcheck="false" />
          <div id="${previewId}" class="preview"></div>
        </td>`;
      }
    }
    html += '</tr>';
  });
  html += '</tbody>';
  table.innerHTML = html;

  // Render KaTeX targets
  for (const el of document.querySelectorAll('.katex-target')) {
    const tex = el.dataset.tex;
    try {
      window.katex.render(tex, el, { throwOnError: false, displayMode: false });
    } catch (_) { el.textContent = tex; }
  }

  // Hook up input handlers + render any existing previews
  for (const inp of document.querySelectorAll('.problem-table input')) {
    inp.addEventListener('input', onInput);
    onInput.call(inp); // initial preview render
  }
}

function onInput() {
  const ri = parseInt(this.dataset.row, 10);
  const v = this.dataset.var;
  const text = this.value;
  const previewEl = document.getElementById(`prev-${ri}-${v}`);
  let parsed = null, error = null;
  if (text.trim() === '') {
    previewEl.textContent = '';
  } else {
    try {
      parsed = parseAnswer(text);
      previewEl.innerHTML = '';
      const span = document.createElement('span');
      window.katex.render(parsed.toLatex(), span, { throwOnError: false });
      previewEl.appendChild(span);
    } catch (e) {
      error = e.message;
      previewEl.textContent = '—';
    }
  }
  inputState[ri][v] = { text, parsed, error };
  // If previously scored, clear the highlight while editing
  if (scored) {
    this.parentElement.classList.remove('right', 'wrong');
  }
}

function check() {
  if (!currentProblem) return;
  scored = true;
  const { correct, total } = scoreCurrent();
  document.getElementById('status').innerHTML =
    `<span class="score-badge">Scor: ${correct} / ${total}</span> ` +
    `<span class="muted" style="margin-left:8px">Casetele verzi sunt corecte, cele roșii sunt greșite. Poți edita și verifica din nou.</span>`;
  render();
  if (profile.role === 'student' && !submittedId) {
    document.getElementById('submit-btn').disabled = false;
  }
}

function scoreCurrent() {
  let correct = 0, total = 0;
  for (let ri = 0; ri < currentProblem.length; ri++) {
    const row = currentProblem[ri];
    for (const v of COLUMNS) {
      if (row.given.includes(v)) continue;
      total++;
      const st = inputState[ri][v];
      if (st && st.parsed && st.parsed.equals(row.values[v])) correct++;
    }
  }
  return { correct, total };
}

async function submit() {
  if (!currentProblem || profile.role !== 'student') return;
  if (!scored) check();
  const { correct, total } = scoreCurrent();
  const submitBtn = document.getElementById('submit-btn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Se trimite...';

  const problem = serializeProblem(currentProblem);
  const answers = inputState.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([v, st]) => [
        v,
        { text: st.text, parsed: st.parsed ? st.parsed.toJSON() : null },
      ])
    )
  );

  // pyramid_type is 'mixt' if rows are mixed, otherwise the single type
  const types = new Set(currentProblem.map((r) => r.type));
  const pyramid_type = types.size === 1 ? [...types][0] : 'mixt';

  try {
    const sb = getClient();
    const { data, error } = await sb
      .from('submissions')
      .insert({
        student_id: profile.id,
        pyramid_type,
        problem,
        answers,
        score_correct: correct,
        score_total: total,
      })
      .select('id')
      .single();
    if (error) throw error;
    submittedId = data.id;
    submitBtn.textContent = 'Trimis ✓';
    document.getElementById('status').innerHTML =
      `<span class="score-badge">Scor: ${correct} / ${total}</span> ` +
      `<span class="success" style="display:inline-block;margin-left:8px;padding:2px 10px">Răspunsurile au fost trimise.</span>`;
  } catch (err) {
    console.error(err);
    submitBtn.disabled = false;
    submitBtn.textContent = 'Trimite';
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
