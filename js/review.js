// Renders a read-only review of a submission. Dispatches by `module` so
// that piramide rows render the 11-column table while aritmetica rows
// render the simpler exercise/answer two-column table.

import { Exact } from './math/exact.js';
import { VAR_LABEL, VAR_NAME_RO, PYRAMID_LABEL_RO } from './math/pyramids.js';

const COLUMNS = ['l', 'ab', 'R', 'P', 'Ab', 'h', 'ap', 'm', 'Al', 'At', 'V'];

export function renderReview(submission) {
  const module = submission.module || 'piramide';
  if (module === 'aritmetica') {
    return renderArithmeticTable(submission.problem, submission.answers);
  }
  return renderReviewTable(submission.problem, submission.answers);
}

export function renderReviewTable(problem, answers) {
  const wrapper = document.createElement('div');
  wrapper.style.overflowX = 'auto';

  const table = document.createElement('table');
  table.className = 'problem-table';

  // Head
  const thead = document.createElement('thead');
  let headHtml = '<tr><th style="text-align:left">Tip</th>';
  for (const v of COLUMNS) {
    headHtml += `<th><span class="katex-target" data-tex="${VAR_LABEL[v]}"></span><br><span class="muted" style="font-weight:400;font-size:11px">${escapeHtml(VAR_NAME_RO[v])}</span></th>`;
  }
  headHtml += '</tr>';
  thead.innerHTML = headHtml;
  table.appendChild(thead);

  // Body
  const tbody = document.createElement('tbody');
  problem.forEach((row, ri) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td class="row-type">${escapeHtml(PYRAMID_LABEL_RO[row.type] || row.type)}</td>`;
    for (const v of COLUMNS) {
      const td = document.createElement('td');
      const isGiven = row.given.includes(v);
      const expectedExact = Exact.fromJSON(row.values[v]);

      if (isGiven) {
        td.className = 'given';
        td.innerHTML = `<span class="katex-target" data-tex="${escapeAttr(expectedExact.toLatex())}"></span>`;
      } else {
        const ans = answers[ri] && answers[ri][v];
        const studentText = ans ? ans.text : '';
        const studentParsed = ans && ans.parsed ? Exact.fromJSON(ans.parsed) : null;
        const correct = studentParsed && studentParsed.equals(expectedExact);
        td.className = correct ? 'right' : 'wrong';
        const studentTex = studentParsed
          ? studentParsed.toLatex()
          : (studentText ? `\\text{${escapeTex(studentText)}}` : '\\text{—}');
        const expectedTex = expectedExact.toLatex();
        td.innerHTML = `
          <div><span class="katex-target" data-tex="${escapeAttr(studentTex)}"></span></div>
          ${correct ? '' : `<div class="muted" style="font-size:11px;margin-top:2px">corect: <span class="katex-target" data-tex="${escapeAttr(expectedTex)}"></span></div>`}
        `;
      }
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  wrapper.appendChild(table);

  // Render KaTeX in the next microtask (after element is in DOM)
  setTimeout(() => {
    for (const el of wrapper.querySelectorAll('.katex-target')) {
      try {
        window.katex.render(el.dataset.tex, el, { throwOnError: false });
      } catch (_) { el.textContent = el.dataset.tex; }
    }
  }, 0);

  return wrapper;
}

// ---- Arithmetic review (module='aritmetica') -----------------------------
// `problem` looks like { settings, exercises: [{expr, answer}, ...] }
// `answers` looks like [{text, parsed}, ...]
export function renderArithmeticTable(problem, answers) {
  const wrapper = document.createElement('div');
  wrapper.style.overflowX = 'auto';

  const table = document.createElement('table');
  table.className = 'problem-table arith-table';

  const exercises = problem.exercises || [];
  let html = `
    <thead>
      <tr>
        <th class="num-col">#</th>
        <th class="expr-col">Exercițiu</th>
        <th class="answer-col">Răspuns elev</th>
        <th class="answer-col">Corect</th>
      </tr>
    </thead>
    <tbody>`;
  exercises.forEach((ex, i) => {
    const ans = answers[i] || { text: '', parsed: null };
    const correct = ans.parsed !== null && ans.parsed === ex.answer;
    const cls = correct ? 'right' : 'wrong';
    const studentDisplay = ans.text === '' ? '—' : escapeHtml(ans.text);
    html += `
      <tr class="${cls}">
        <td class="num-col">${i + 1}.</td>
        <td class="expr-col">${escapeHtml(ex.expr)} =</td>
        <td class="answer-col">${studentDisplay}</td>
        <td class="answer-col">${ex.answer}</td>
      </tr>`;
  });
  html += '</tbody>';
  table.innerHTML = html;
  wrapper.appendChild(table);

  // Optional: small footer with the settings used
  const s = problem.settings;
  if (s) {
    const opsLabel = (s.ops || []).map((o) => ({ '+': '+', '-': '−', '*': '×', '/': ':' })[o]).join(' ');
    const parenLabel = { none: 'fără paranteze', round: 'cu ( )', mixed: 'cu ( ) și [ ]' }[s.parenStyle] || s.parenStyle;
    const negLabel = s.allowNeg ? 'cu negative' : 'fără negative';
    const footer = document.createElement('div');
    footer.className = 'muted';
    footer.style.cssText = 'margin-top:8px;font-size:12px';
    footer.textContent =
      `Setări: ${opsLabel} · ${s.complexity} operații per exercițiu · numere până la ${s.maxNum} · ${parenLabel} · ${negLabel}`;
    wrapper.appendChild(footer);
  }

  return wrapper;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}
function escapeAttr(s) { return escapeHtml(s); }
function escapeTex(s) {
  return String(s).replace(/[\\{}$&#%_]/g, (c) => '\\' + c);
}
