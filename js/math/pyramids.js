// Computes all 11 values for a regular pyramid given integer (l, h).
// Returns Exact values throughout — no floating-point anywhere.
//
// Variables:
//   l   — latura bazei
//   ab  — apotema bazei (inradius of base polygon)
//   R   — raza cercului circumscris bazei (circumradius)
//   P   — perimetrul bazei
//   Ab  — aria bazei
//   h   — înălțimea piramidei
//   ap  — apotema piramidei (slant height to midpoint of base edge)
//   m   — muchia laterală
//   Al  — aria laterală
//   At  — aria totală
//   V   — volumul

import { Exact } from './exact.js';

export const VARS = ['l', 'ab', 'R', 'P', 'Ab', 'h', 'ap', 'm', 'Al', 'At', 'V'];

export const VAR_LABEL = {
  l:  'l',
  ab: 'a_b',
  R:  'R',
  P:  'P',
  Ab: 'A_b',
  h:  'h',
  ap: 'a_p',
  m:  'm',
  Al: 'A_l',
  At: 'A_t',
  V:  'V',
};

export const VAR_NAME_RO = {
  l:  'latura bazei',
  ab: 'apotema bazei',
  R:  'raza cercului circumscris bazei',
  P:  'perimetrul bazei',
  Ab: 'aria bazei',
  h:  'înălțimea piramidei',
  ap: 'apotema piramidei',
  m:  'muchia piramidei',
  Al: 'aria laterală',
  At: 'aria totală',
  V:  'volumul',
};

export const PYRAMID_TYPES = ['triunghiulara', 'patrulatera', 'hexagonala'];

export const PYRAMID_LABEL_RO = {
  triunghiulara: 'Piramidă triunghiulară regulată',
  patrulatera:   'Piramidă patrulateră regulată',
  hexagonala:    'Piramidă hexagonală regulată',
};

// === Per-type computation =================================================

function triangular(l, h) {
  if (l % 6 !== 0) throw new Error(`Triunghiulară: l=${l} trebuie divizibil cu 6`);
  if ((l * l * h) % 12 !== 0) throw new Error(`Triunghiulară: l²h=${l*l*h} nu se împarte la 12`);

  const lE = Exact.int(l);
  const hE = Exact.int(h);
  const ab = Exact.radical(l / 6, 3);             // (l/6)√3
  const R  = Exact.radical(l / 3, 3);             // (l/3)√3
  const P  = Exact.int(3 * l);
  const Ab = Exact.radical((l * l) / 4, 3);       // (l²/4)√3

  // ap² = h² + ab²  with ab² = l²/12 (integer if l²÷12 integer)
  if ((l * l) % 12 !== 0) throw new Error(`l²=${l*l} not div 12`);
  const ap = Exact.sqrtOfInt(h * h + (l * l) / 12);

  // m² = h² + R²  with R² = l²/3
  if ((l * l) % 3 !== 0) throw new Error(`l²=${l*l} not div 3`);
  const m  = Exact.sqrtOfInt(h * h + (l * l) / 3);

  // Al = (P/2)·ap = (3l/2)·ap
  if ((3 * l) % 2 !== 0) throw new Error(`3l/2 not integer`);
  const Al = ap.scaleInt((3 * l) / 2);

  const At = Ab.add(Al);

  // V = Ab·h/3 = (l²h/12)·√3
  const V = Exact.radical((l * l * h) / 12, 3);

  return { l: lE, h: hE, ab, R, P, Ab, ap, m, Al, At, V };
}

function square(l, h) {
  if (l % 2 !== 0) throw new Error(`Patrulateră: l=${l} trebuie par`);
  if ((l * l * h) % 3 !== 0) throw new Error(`Patrulateră: l²h=${l*l*h} nu se împarte la 3`);

  const lE = Exact.int(l);
  const hE = Exact.int(h);
  const ab = Exact.int(l / 2);
  const R  = Exact.radical(l / 2, 2);             // (l/2)√2
  const P  = Exact.int(4 * l);
  const Ab = Exact.int(l * l);

  if ((l * l) % 4 !== 0) throw new Error();
  const ap = Exact.sqrtOfInt(h * h + (l * l) / 4);

  if ((l * l) % 2 !== 0) throw new Error();
  const m  = Exact.sqrtOfInt(h * h + (l * l) / 2);

  const Al = ap.scaleInt(2 * l);                  // (P/2)·ap = 2l·ap
  const At = Ab.add(Al);
  const V  = Exact.int((l * l * h) / 3);

  return { l: lE, h: hE, ab, R, P, Ab, ap, m, Al, At, V };
}

function hexagonal(l, h) {
  if (l % 2 !== 0) throw new Error(`Hexagonală: l=${l} trebuie par`);
  // V = (l²h/2)√3 — always integer since l even

  const lE = Exact.int(l);
  const hE = Exact.int(h);
  const ab = Exact.radical(l / 2, 3);             // (l/2)√3
  const R  = Exact.int(l);
  const P  = Exact.int(6 * l);

  if ((3 * l * l) % 2 !== 0) throw new Error();
  const Ab = Exact.radical((3 * l * l) / 2, 3);   // (3l²/2)√3

  // ap² = h² + 3l²/4
  if ((3 * l * l) % 4 !== 0) throw new Error(`3l² not div 4 — l must be even`);
  const ap = Exact.sqrtOfInt(h * h + (3 * l * l) / 4);

  // m² = h² + l²
  const m  = Exact.sqrtOfInt(h * h + l * l);

  const Al = ap.scaleInt(3 * l);                  // (P/2)·ap = 3l·ap
  const At = Ab.add(Al);

  // V = Ab·h/3 = (l²h/2)·√3
  const V = Exact.radical((l * l * h) / 2, 3);

  return { l: lE, h: hE, ab, R, P, Ab, ap, m, Al, At, V };
}

export function compute(type, l, h) {
  if (type === 'triunghiulara') return triangular(l, h);
  if (type === 'patrulatera')   return square(l, h);
  if (type === 'hexagonala')    return hexagonal(l, h);
  throw new Error('Tip necunoscut: ' + type);
}
