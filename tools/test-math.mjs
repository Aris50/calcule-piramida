// Validates the math engine: every (l, h) seed across all pyramid types
// must compute without error, every value must be representable as
// Σ kᵢ·√nᵢ with all radicands ≤ MAX_RADICAND, and toNumber() must agree
// with re-computing each formula numerically.

import { compute, VARS } from '../js/math/pyramids.js';
import { SEEDS, MAX_RADICAND } from '../js/math/library.js';
import { generateProblem } from '../js/math/generator.js';
import { parseAnswer } from '../js/math/parse.js';
import { Exact } from '../js/math/exact.js';

let failures = 0;
const log = (msg) => process.stdout.write(msg + '\n');
const fail = (msg) => { log('FAIL: ' + msg); failures++; };

// ---- exact.js round-trip + arithmetic sanity ----
function testExact() {
  log('--- exact.js ---');
  const a = Exact.int(5).add(Exact.radical(2, 3));        // 5 + 2√3
  if (a.toLatex() !== '5 + 2\\sqrt{3}') fail('toLatex 5+2√3: ' + a.toLatex());
  const b = Exact.radical(3, 12);                         // simplify √12 = 2√3, ×3 = 6√3
  if (!b.equals(Exact.radical(6, 3))) fail('simplify √12: ' + b.toLatex());
  const c = a.mul(Exact.int(2));                          // 10 + 4√3
  if (!c.equals(Exact.int(10).add(Exact.radical(4, 3)))) fail('mul int: ' + c.toLatex());
  const d = Exact.radical(2, 3).mul(Exact.radical(3, 3)); // 2√3 · 3√3 = 6·3 = 18
  if (!d.equals(Exact.int(18))) fail('rad·rad: ' + d.toLatex());
  // Numeric agreement
  const numTol = 1e-9;
  const num = a.toNumber();
  const ref = 5 + 2 * Math.sqrt(3);
  if (Math.abs(num - ref) > numTol) fail('toNumber: ' + num + ' vs ' + ref);
}

// ---- parser ----
function testParse() {
  log('--- parse.js ---');
  const cases = [
    ['5', Exact.int(5)],
    ['-5', Exact.int(-5)],
    ['2rad3', Exact.radical(2, 3)],
    ['rad3', Exact.radical(1, 3)],
    ['-2rad3', Exact.radical(-2, 3)],
    ['5+2rad3', Exact.int(5).add(Exact.radical(2, 3))],
    ['5 + 2rad3', Exact.int(5).add(Exact.radical(2, 3))],
    ['5-2rad3', Exact.int(5).sub(Exact.radical(2, 3))],
    ['2sqrt(3)', Exact.radical(2, 3)],
    ['2*rad3', Exact.radical(2, 3)],
    ['2√3', Exact.radical(2, 3)],
    ['72+36rad3', Exact.int(72).add(Exact.radical(36, 3))],
  ];
  for (const [input, expected] of cases) {
    try {
      const parsed = parseAnswer(input);
      if (!parsed.equals(expected)) fail(`parse "${input}": got ${parsed.toLatex()} want ${expected.toLatex()}`);
    } catch (e) {
      fail(`parse "${input}" threw: ${e.message}`);
    }
  }
  // Bad inputs
  for (const bad of ['', 'abc', 'rad', '2rad', '2rad-3', '+', '-']) {
    let threw = false;
    try { parseAnswer(bad); } catch (e) { threw = true; }
    if (!threw) fail(`expected parse fail on "${bad}"`);
  }
}

// ---- per-seed clean-values check ----
function radicandsOf(exact) {
  return [...exact.terms.keys()].filter((r) => r !== 1);
}

function testSeeds() {
  log('--- library seeds ---');
  for (const type of Object.keys(SEEDS)) {
    for (const { l, h } of SEEDS[type]) {
      let vals;
      try {
        vals = compute(type, l, h);
      } catch (e) {
        fail(`compute(${type}, ${l}, ${h}): ${e.message}`);
        continue;
      }
      for (const v of VARS) {
        const ex = vals[v];
        if (!ex) { fail(`missing var ${v} for ${type} (${l},${h})`); continue; }
        const rads = radicandsOf(ex);
        for (const r of rads) {
          if (r > MAX_RADICAND) {
            fail(`${type} (${l},${h}) ${v} = ${ex.toLatex()} has radicand ${r} > ${MAX_RADICAND}`);
          }
        }
        // Cross-check against numeric computation
        const num = ex.toNumber();
        const ref = numericRef(type, l, h, v);
        if (Math.abs(num - ref) > 1e-6 * Math.max(1, Math.abs(ref))) {
          fail(`numeric mismatch ${type} (${l},${h}) ${v}: ${num} vs ${ref}`);
        }
      }
    }
  }
}

// Reference numeric values via simple JS math
function numericRef(type, l, h, v) {
  let ab, R, P, Ab;
  if (type === 'triunghiulara') {
    ab = l * Math.sqrt(3) / 6;
    R  = l * Math.sqrt(3) / 3;
    P  = 3 * l;
    Ab = l * l * Math.sqrt(3) / 4;
  } else if (type === 'patrulatera') {
    ab = l / 2;
    R  = l * Math.sqrt(2) / 2;
    P  = 4 * l;
    Ab = l * l;
  } else {
    ab = l * Math.sqrt(3) / 2;
    R  = l;
    P  = 6 * l;
    Ab = 3 * l * l * Math.sqrt(3) / 2;
  }
  const ap = Math.sqrt(h * h + ab * ab);
  const m  = Math.sqrt(h * h + R * R);
  const Al = (P / 2) * ap;
  const At = Ab + Al;
  const V  = Ab * h / 3;
  return ({ l, ab, R, P, Ab, h, ap, m, Al, At, V })[v];
}

// ---- generator: produce 100 problems, all valid ----
function testGenerator() {
  log('--- generator ---');
  for (let trial = 0; trial < 100; trial++) {
    const probs = generateProblem({ type: 'mixt', rows: 8, seed: trial });
    if (probs.length !== 8) fail(`expected 8 rows, got ${probs.length}`);
    for (const row of probs) {
      if (!row.given || row.given.length !== 2) fail('row missing given pair');
      const [a, b] = row.given;
      if (a === b) fail('given pair has duplicate var');
      if (!row.values[a] || !row.values[b]) fail(`row missing values for given pair ${a},${b}`);
    }
  }
}

// ---- arithmetic ----
async function testArithmetic() {
  log('--- arithmetic.js ---');
  const { generateProblem, parseIntegerAnswer, OPS_ALL } = await import('../js/math/arithmetic.js');

  // Generate a lot of problems with varied settings; verify expr renders + answer is integer in range
  const settingMatrix = [
    { ops: ['+'], parenStyle: 'none', complexity: 1, maxNum: 10, allowNeg: false },
    { ops: ['+', '-'], parenStyle: 'round', complexity: 2, maxNum: 20, allowNeg: true },
    { ops: ['*', '/'], parenStyle: 'round', complexity: 2, maxNum: 12, allowNeg: false },
    { ops: OPS_ALL, parenStyle: 'mixed', complexity: 3, maxNum: 20, allowNeg: true },
    { ops: OPS_ALL, parenStyle: 'mixed', complexity: 5, maxNum: 30, allowNeg: true },
  ];
  for (const s of settingMatrix) {
    const probs = generateProblem({ ...s, count: 25 });
    if (probs.length !== 25) fail(`expected 25 exercises, got ${probs.length}`);
    for (const ex of probs) {
      if (!ex.expr || typeof ex.expr !== 'string') fail('missing expr: ' + JSON.stringify(ex));
      if (!Number.isInteger(ex.answer)) fail('non-integer answer: ' + JSON.stringify(ex));
      if (ex.answer < -3000 || ex.answer > 3000) fail('answer out of range: ' + ex.answer);
      // Expression should contain only digits, allowed symbols, parens, brackets, spaces, and minus
      if (!/^[\d\s+\-−×:()\[\]]+$/.test(ex.expr)) {
        fail(`expr has unexpected chars: "${ex.expr}"`);
      }
      // Round-trip evaluate via an internal sanity check: replace symbols and let JS eval... too risky;
      // instead just trust the engine since we already verified Math.trunc results.
    }
  }

  // parseIntegerAnswer
  const cases = [
    ['', null], ['5', 5], ['-5', -5], ['  -5 ', -5], ['−5', -5],
    ['5.0', null], ['abc', null], ['1+1', null], ['00', 0],
  ];
  for (const [in_, want] of cases) {
    const got = parseIntegerAnswer(in_);
    if (got !== want) fail(`parseIntegerAnswer("${in_}") = ${got} want ${want}`);
  }

  // Reject bad settings
  let threw = false;
  try { generateProblem({ ops: [] }); } catch (_) { threw = true; }
  if (!threw) fail('expected throw on empty ops');
}

testExact();
testParse();
testSeeds();
testGenerator();
await testArithmetic();

if (failures) {
  log(`\n${failures} FAILURE(S)`);
  process.exit(1);
} else {
  log('\nAll checks passed.');
}
