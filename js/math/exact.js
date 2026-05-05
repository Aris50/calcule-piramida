// Exact arithmetic for values of the form: integer + Σ kᵢ·√nᵢ
// where each nᵢ is square-free. No floating point, no fractions.
// Internal representation: Map<radicand, coefficient> with radicand=1 meaning
// the rational/integer part. e.g. 5 + 2√3  →  {1: 5, 3: 2}.

export function simplifySqrt(n) {
  // returns { coef, rad } such that √n = coef·√rad with rad square-free
  if (n < 0) throw new Error('Negative under sqrt: ' + n);
  if (n === 0) return { coef: 0, rad: 1 };
  let coef = 1;
  let rad = n;
  for (let i = 2; i * i <= rad; i++) {
    while (rad % (i * i) === 0) {
      coef *= i;
      rad = rad / (i * i);
    }
  }
  return { coef, rad };
}

export class Exact {
  constructor(terms) {
    this.terms = new Map();
    if (terms) {
      for (const [rad, coef] of terms) {
        if (coef !== 0) this.terms.set(rad, coef);
      }
    }
  }

  static int(n) {
    const m = new Map();
    if (n !== 0) m.set(1, n);
    return new Exact(m);
  }

  // Returns simplified k·√n
  static radical(coef, rad) {
    if (coef === 0 || rad === 0) return Exact.zero();
    const s = simplifySqrt(rad);
    const m = new Map();
    m.set(s.rad, coef * s.coef);
    return new Exact(m);
  }

  static zero() {
    return new Exact();
  }

  static fromObject(obj) {
    // obj like { rational: 5, radicals: [[2, 3]] } meaning 5 + 2√3
    const m = new Map();
    if (obj.rational) m.set(1, obj.rational);
    if (obj.radicals) {
      for (const [coef, rad] of obj.radicals) {
        const s = simplifySqrt(rad);
        m.set(s.rad, (m.get(s.rad) || 0) + coef * s.coef);
      }
    }
    return new Exact(m);
  }

  add(other) {
    const m = new Map(this.terms);
    for (const [rad, coef] of other.terms) {
      m.set(rad, (m.get(rad) || 0) + coef);
    }
    return new Exact(m);
  }

  sub(other) {
    const m = new Map(this.terms);
    for (const [rad, coef] of other.terms) {
      m.set(rad, (m.get(rad) || 0) - coef);
    }
    return new Exact(m);
  }

  scaleInt(k) {
    if (k === 0) return Exact.zero();
    const m = new Map();
    for (const [rad, coef] of this.terms) m.set(rad, coef * k);
    return new Exact(m);
  }

  // Multiply two single-term values: (a√p)·(b√q) = ab·√(pq) → simplify
  // Or multi-term × multi-term — distributes.
  mul(other) {
    let result = Exact.zero();
    for (const [rad1, coef1] of this.terms) {
      for (const [rad2, coef2] of other.terms) {
        const product = rad1 * rad2;
        const s = simplifySqrt(product);
        const piece = new Map();
        piece.set(s.rad, coef1 * coef2 * s.coef);
        result = result.add(new Exact(piece));
      }
    }
    return result;
  }

  // Divide by a non-zero integer; throws if any coefficient would be fractional.
  divInt(k) {
    if (k === 0) throw new Error('Division by zero');
    const m = new Map();
    for (const [rad, coef] of this.terms) {
      if (coef % k !== 0) {
        throw new Error(`Division by ${k} produces non-integer coef: ${coef}/${k} (rad ${rad})`);
      }
      m.set(rad, coef / k);
    }
    return new Exact(m);
  }

  // For values guaranteed to be a single integer (rad=1) only.
  // Throws otherwise — guards the math layer.
  toInt() {
    if (this.isZero()) return 0;
    if (this.terms.size === 1 && this.terms.has(1)) return this.terms.get(1);
    throw new Error('toInt called on non-integer Exact: ' + this.toLatex());
  }

  // √(integer n) — returns a single-term Exact, integer if n is a perfect square.
  static sqrtOfInt(n) {
    if (n < 0) throw new Error('Negative under sqrt: ' + n);
    if (n === 0) return Exact.zero();
    const s = simplifySqrt(n);
    const m = new Map();
    if (s.rad === 1) m.set(1, s.coef);
    else m.set(s.rad, s.coef);
    return new Exact(m);
  }

  toNumber() {
    let s = 0;
    for (const [rad, coef] of this.terms) s += coef * Math.sqrt(rad);
    return s;
  }

  equals(other) {
    if (this.terms.size !== other.terms.size) return false;
    for (const [rad, coef] of this.terms) {
      if (other.terms.get(rad) !== coef) return false;
    }
    return true;
  }

  isZero() {
    return this.terms.size === 0;
  }

  isInteger() {
    if (this.terms.size === 0) return true;
    return this.terms.size === 1 && this.terms.has(1);
  }

  // Render to LaTeX (without the surrounding $ delimiters).
  toLatex() {
    if (this.terms.size === 0) return '0';
    const sorted = [...this.terms.entries()].sort((a, b) => a[0] - b[0]);
    let out = '';
    for (let i = 0; i < sorted.length; i++) {
      const [rad, coef] = sorted[i];
      const isFirst = i === 0;
      const absCoef = Math.abs(coef);
      let token;
      if (rad === 1) {
        token = absCoef.toString();
      } else {
        const c = absCoef === 1 ? '' : absCoef.toString();
        token = `${c}\\sqrt{${rad}}`;
      }
      if (isFirst) out += (coef < 0 ? '-' : '') + token;
      else out += (coef < 0 ? ' - ' : ' + ') + token;
    }
    return out;
  }

  // Plain-text rendering using "rad" notation (matches student input).
  // 5  → "5"
  // 2√3 → "2rad3"
  // 5 + 2√3 → "5+2rad3"
  toRadString() {
    if (this.terms.size === 0) return '0';
    const sorted = [...this.terms.entries()].sort((a, b) => a[0] - b[0]);
    let out = '';
    for (let i = 0; i < sorted.length; i++) {
      const [rad, coef] = sorted[i];
      const isFirst = i === 0;
      const absCoef = Math.abs(coef);
      let token;
      if (rad === 1) {
        token = absCoef.toString();
      } else {
        const c = absCoef === 1 ? '' : absCoef.toString();
        token = `${c}rad${rad}`;
      }
      if (isFirst) out += (coef < 0 ? '-' : '') + token;
      else out += (coef < 0 ? '-' : '+') + token;
    }
    return out;
  }

  // For serialization to JSON (Maps don't survive JSON.stringify).
  toJSON() {
    return Object.fromEntries(this.terms);
  }

  static fromJSON(obj) {
    const m = new Map();
    for (const [k, v] of Object.entries(obj)) m.set(Number(k), v);
    return new Exact(m);
  }
}
