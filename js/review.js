// Renders a read-only review table from a stored (problem, answers) pair.
// Used by both the student history modal and the teacher dashboard.

import { Exact } from './math/exact.js';
import { VAR_LABEL, VAR_NAME_RO, PYRAMID_LABEL_RO } from './math/pyramids.js';

const COLUMNS = ['l', 'ab', 'R', 'P', 'Ab', 'h', 'ap', 'm', 'Al', 'At', 'V'];

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

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}
function escapeAttr(s) { return escapeHtml(s); }
function escapeTex(s) {
  return String(s).replace(/[\\{}$&#%_]/g, (c) => '\\' + c);
}
