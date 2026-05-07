// Arithmetic exercise generator.
// Builds expression trees with the chosen operators and parenthesisation
// style, evaluates each tree to guarantee a clean integer answer in a
// reasonable range, and renders to a Romanian-conventional string
// (× for multiplication, : for division, − for subtraction).
//
// Ported from the standalone HTML/Python tool in ~/Desktop/ExerciseGenerator.

export const OPS_ALL = ['+', '-', '*', '/'];

const SYMBOL = {
  '+': '+',
  '-': '−',  // − (minus sign, not hyphen)
  '*': '×',  // × (multiplication sign)
  '/': ':',       // : (Romanian division convention)
};

function randInt(lo, hi) {
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

function randomNumber(maxNum, allowNeg) {
  let n = randInt(1, maxNum);
  if (allowNeg && Math.random() < 0.25) n = -n;
  return n;
}

class NumNode {
  constructor(v) { this.value = v; }
  eval() { return this.value; }
  toExprString(_parenStyle, _depth) { return String(this.value); }
}

class OpNode {
  constructor(op, left, right) { this.op = op; this.left = left; this.right = right; }
  eval() {
    const l = this.left.eval();
    const r = this.right.eval();
    if (this.op === '+') return l + r;
    if (this.op === '-') return l - r;
    if (this.op === '*') return l * r;
    if (this.op === '/') return Math.trunc(l / r);
    throw new Error('unknown op ' + this.op);
  }
  toExprString(parenStyle, depth) {
    let ls = this.left.toExprString(parenStyle, depth + 1);
    let rs = this.right.toExprString(parenStyle, depth + 1);
    // Wrap raw negative numbers so we never produce "− −16"
    if (/^-\d/.test(ls)) ls = '(' + ls + ')';
    if (/^-\d/.test(rs)) rs = '(' + rs + ')';
    let expr = `${ls} ${SYMBOL[this.op]} ${rs}`;
    if (depth > 0) {
      if (parenStyle === 'round') {
        expr = '(' + expr + ')';
      } else if (parenStyle === 'mixed') {
        // Use [] only when the inner expression already has ()
        expr = expr.includes('(') ? '[' + expr + ']' : '(' + expr + ')';
      }
    }
    return expr;
  }
}

function buildTree(ops, numOps, maxNum, allowNeg) {
  if (numOps === 0) return new NumNode(randomNumber(maxNum, allowNeg));

  const op = ops[randInt(0, ops.length - 1)];

  if (op === '/') {
    // Division uses two plain numbers chosen so that the result is a
    // clean integer within range. We don't recurse into the divisor.
    let divisor = randInt(2, Math.min(maxNum, 12));
    if (allowNeg && Math.random() < 0.25) divisor = -divisor;
    const maxQ = Math.max(1, Math.floor(maxNum / Math.abs(divisor)));
    let quotient = randInt(1, maxQ);
    if (allowNeg && Math.random() < 0.25) quotient = -quotient;
    const dividend = quotient * divisor;
    const divNode = new OpNode('/', new NumNode(dividend), new NumNode(divisor));

    if (numOps <= 1) return divNode;

    // Wrap the division node with one more op (avoiding nested division).
    const remaining = numOps - 1;
    const otherSide = buildTree(ops, remaining - 1, maxNum, allowNeg);
    const safe = ops.filter((o) => o !== '/');
    const wrapOp = safe.length ? safe[randInt(0, safe.length - 1)] : '+';
    return Math.random() < 0.5
      ? new OpNode(wrapOp, divNode, otherSide)
      : new OpNode(wrapOp, otherSide, divNode);
  }

  // For +, -, *: split the remaining ops between left and right subtrees.
  let leftOps, rightOps;
  if (numOps <= 1) {
    leftOps = 0;
    rightOps = 0;
  } else {
    const half = Math.floor((numOps - 1) / 2);
    leftOps = half;
    rightOps = numOps - 1 - half;
    if (Math.random() < 0.5) [leftOps, rightOps] = [rightOps, leftOps];
  }

  return new OpNode(
    op,
    buildTree(ops, leftOps, maxNum, allowNeg),
    buildTree(ops, rightOps, maxNum, allowNeg)
  );
}

export function generateOne({ ops, complexity, parenStyle, maxNum, allowNeg }) {
  for (let i = 0; i < 100; i++) {
    const tree = buildTree(ops, complexity, maxNum, allowNeg);
    const answer = tree.eval();
    const expr = tree.toExprString(parenStyle, 0);
    if (
      expr &&
      Number.isFinite(answer) &&
      Number.isInteger(answer) &&
      answer >= -3000 &&
      answer <= 3000
    ) {
      return { expr, answer };
    }
  }
  // Fallback — extremely unlikely with sane settings.
  return { expr: '1 + 1', answer: 2 };
}

export function generateProblem({
  ops = ['+', '-', '*', '/'],
  complexity = 3,
  parenStyle = 'round',
  maxNum = 20,
  allowNeg = true,
  count = 25,
} = {}) {
  if (!Array.isArray(ops) || ops.length === 0) {
    throw new Error('Cel puțin o operație trebuie selectată');
  }
  for (const o of ops) {
    if (!OPS_ALL.includes(o)) throw new Error('Operație necunoscută: ' + o);
  }
  if (!['none', 'round', 'mixed'].includes(parenStyle)) {
    throw new Error('Stil paranteze necunoscut: ' + parenStyle);
  }
  if (complexity < 1 || complexity > 6) {
    throw new Error('Complexitate în afara intervalului 1–6');
  }
  if (maxNum < 2) throw new Error('maxNum trebuie să fie ≥ 2');
  if (count < 1) throw new Error('count trebuie să fie ≥ 1');

  const out = [];
  for (let i = 0; i < count; i++) {
    out.push(generateOne({ ops, complexity, parenStyle, maxNum, allowNeg }));
  }
  return out;
}

// Parse a student's typed answer into an integer or null on failure.
export function parseIntegerAnswer(text) {
  if (text === null || text === undefined) return null;
  const t = String(text).trim().replace(/\s+/g, '');
  if (t === '') return null;
  // Accept −/− as the minus sign too
  const normalized = t.replace(/−/g, '-');
  if (!/^-?\d+$/.test(normalized)) return null;
  const n = parseInt(normalized, 10);
  return Number.isFinite(n) ? n : null;
}
