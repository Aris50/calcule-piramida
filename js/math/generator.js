// Generates a problem set: an array of rows, each describing a pyramid
// scenario with two "given" values and the rest to be filled in by the student.

import { compute, VARS, PYRAMID_TYPES } from './pyramids.js';
import { SEEDS } from './library.js';

const BASE_VARS    = ['l', 'ab', 'R', 'P', 'Ab'];
const PYRAMID_VARS = ['h', 'ap', 'm', 'Al', 'At', 'V'];

// Whitelist of given-pair shapes.
// Tier A: one base var + one pyramid var (always cleanly solvable).
// Tier B: two pyramid vars that lead to clean derivations.
const TIER_A = [];
for (const b of BASE_VARS) for (const p of PYRAMID_VARS) TIER_A.push([b, p]);
const TIER_B = [
  ['h', 'ap'],
  ['h', 'm'],
  ['h', 'V'],
  ['ap', 'm'],
];
export const PAIR_WHITELIST = [...TIER_A, ...TIER_B];

function pickRandom(arr, rng) {
  return arr[Math.floor(rng() * arr.length)];
}

function makeRng(seed) {
  // mulberry32: deterministic when seeded; otherwise Math.random.
  if (seed === undefined || seed === null) return Math.random;
  let t = seed >>> 0;
  return function () {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// Generate one row. `typeFilter` is a pyramid type or 'mixt'.
// Avoids re-using the same (type, l, h, given-pair) combination across rows
// by tracking `used` (mutated).
function generateRow(typeFilter, used, rng) {
  for (let attempt = 0; attempt < 100; attempt++) {
    const type =
      typeFilter === 'mixt' ? pickRandom(PYRAMID_TYPES, rng) : typeFilter;
    const seed = pickRandom(SEEDS[type], rng);
    const pair = pickRandom(PAIR_WHITELIST, rng);
    const key = `${type}|${seed.l}|${seed.h}|${pair[0]}|${pair[1]}`;
    if (used.has(key)) continue;
    used.add(key);
    const values = compute(type, seed.l, seed.h);
    return {
      type,
      l: seed.l,
      h: seed.h,
      given: pair, // [varA, varB]
      values,      // { l, ab, R, P, Ab, h, ap, m, Al, At, V } as Exact
    };
  }
  throw new Error('Generator: nu pot crea suficiente probleme distincte');
}

export function generateProblem({ type = 'mixt', rows = 8, seed } = {}) {
  const rng = makeRng(seed);
  const used = new Set();
  const out = [];
  for (let i = 0; i < rows; i++) out.push(generateRow(type, used, rng));
  return out;
}

// Serialize a problem to JSON (Exact values become plain objects).
export function serializeProblem(problem) {
  return problem.map((row) => ({
    type: row.type,
    l: row.l,
    h: row.h,
    given: row.given,
    values: Object.fromEntries(
      Object.entries(row.values).map(([k, v]) => [k, v.toJSON()])
    ),
  }));
}
