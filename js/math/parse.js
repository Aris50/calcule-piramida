// Parses student input in the "rad" notation into an Exact value.
// Accepted forms:
//   "5"          → 5
//   "-5"         → -5
//   "2rad3"      → 2√3
//   "rad3"       → √3
//   "-2rad3"     → -2√3
//   "5+2rad3"    → 5 + 2√3
//   "5 + 2rad3"  → 5 + 2√3 (whitespace ignored)
//   "5-2rad3"    → 5 - 2√3
//   Synonyms accepted: "sqrt(3)" or "√3" or "rad(3)" all mean √3
//   "*", spaces between coef and radical: "2*rad3", "2 rad 3"

import { Exact } from './exact.js';

export class ParseError extends Error {}

export function parseAnswer(input) {
  if (input === null || input === undefined) throw new ParseError('Răspuns gol');
  let s = String(input).trim();
  if (s === '') throw new ParseError('Răspuns gol');

  // Normalize: lowercase, remove all whitespace, replace synonyms with "rad"
  s = s.toLowerCase().replace(/\s+/g, '');
  // √n → radn ; √(n) → rad(n)
  s = s.replace(/√/g, 'rad');
  // sqrt → rad
  s = s.replace(/sqrt/g, 'rad');
  // rad(n) → radn
  s = s.replace(/rad\(([^)]+)\)/g, 'rad$1');
  // remove explicit multiplication between coef and rad: "2*rad3" → "2rad3"
  s = s.replace(/\*/g, '');

  // Split into signed terms. Each term starts with + or -, except possibly the first.
  // We'll rewrite leading "+"/no-sign as "+", then split on positions of + or -.
  if (s[0] !== '+' && s[0] !== '-') s = '+' + s;

  const terms = [];
  let i = 0;
  while (i < s.length) {
    if (s[i] !== '+' && s[i] !== '-') throw new ParseError(`Format invalid: "${input}"`);
    const sign = s[i] === '+' ? 1 : -1;
    i++;
    let j = i;
    while (j < s.length && s[j] !== '+' && s[j] !== '-') j++;
    const term = s.slice(i, j);
    if (term === '') throw new ParseError(`Format invalid: "${input}"`);
    terms.push({ sign, body: term });
    i = j;
  }

  let result = Exact.zero();
  for (const { sign, body } of terms) {
    const idx = body.indexOf('rad');
    let coef, rad;
    if (idx === -1) {
      // pure integer
      if (!/^\d+$/.test(body)) throw new ParseError(`Termen invalid: "${body}"`);
      coef = parseInt(body, 10) * sign;
      rad = 1;
    } else {
      const before = body.slice(0, idx);
      const after = body.slice(idx + 3);
      if (after === '' || !/^\d+$/.test(after)) throw new ParseError(`Radical invalid: "${body}"`);
      const c = before === '' ? 1 : (parseInt(before, 10));
      if (before !== '' && !/^\d+$/.test(before)) throw new ParseError(`Coeficient invalid: "${body}"`);
      coef = c * sign;
      rad = parseInt(after, 10);
      if (rad <= 0) throw new ParseError(`Radicand invalid: "${body}"`);
    }
    result = result.add(Exact.radical(coef, rad === 1 ? 1 : rad));
    // Special-case rad=1: radical(c, 1) returns c·√1 = c, which Exact.radical handles via simplifySqrt.
  }

  return result;
}
