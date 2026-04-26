// Lesson 4 - Properties, Exponents, Roots, Order of Operations, Variables

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function normalizeAnswer(str) {
  return String(str).toLowerCase().replace(/\s+/g, "").trim();
}

// -- Warm-up A: Composite Shape Perimeter + Area --
// L/T/U shape, 2 missing sides, student submits perimeter AND area
// Multiplication constraint: no step involves two numbers both >3

function maxDigit(n) {
  return Math.max(...String(n).split("").map(Number));
}

function mulOk(a, b) {
  return !(maxDigit(a) > 3 && maxDigit(b) > 3);
}

function genLShape4() {
  let W, H, cw, ch;
  let attempts = 0;
  do {
    W = randInt(30, 70); H = randInt(30, 70);
    cw = randInt(10, W - 15); ch = randInt(10, H - 15);
    attempts++;
  } while (attempts < 200 && (!mulOk(W, H - ch) || !mulOk(W - cw, ch)));
  const area = W * (H - ch) + (W - cw) * ch;
  const sides = [
    { length: W,    dir: "h" }, { length: H - ch, dir: "v" },
    { length: cw,   dir: "h" }, { length: ch,      dir: "v" },
    { length: W - cw, dir: "h" }, { length: H,     dir: "v" },
  ];
  const perimeter = sides.reduce((s, x) => s + x.length, 0);
  const scale = 2.5;
  const vertices = [
    { x: 0, y: H * scale }, { x: W * scale, y: H * scale },
    { x: W * scale, y: ch * scale }, { x: (W - cw) * scale, y: ch * scale },
    { x: (W - cw) * scale, y: 0 }, { x: 0, y: 0 },
  ];
  return { shape: "L", W, H, cw, ch, sides, vertices, area, perimeter,
    splitExplanation: W + "x" + (H-ch) + "+" + (W-cw) + "x" + ch + "=" + (W*(H-ch)) + "+" + ((W-cw)*ch) + "=" + area };
}

function genTShape4() {
  let W, bh, sh, tw, stemLeft;
  let attempts = 0;
  do {
    W = randInt(40, 70); bh = randInt(15, 30); sh = randInt(20, 40);
    tw = randInt(15, W - 25); stemLeft = randInt(10, W - tw - 10);
    attempts++;
  } while (attempts < 200 && (!mulOk(W, bh) || !mulOk(tw, sh)));
  const area = W * bh + tw * sh;
  const sides = [
    { length: W, dir: "h" }, { length: bh, dir: "v" },
    { length: W - stemLeft - tw, dir: "h" }, { length: sh, dir: "v" },
    { length: tw, dir: "h" }, { length: sh, dir: "v" },
    { length: stemLeft, dir: "h" }, { length: bh, dir: "v" },
  ];
  const perimeter = sides.reduce((s, x) => s + x.length, 0);
  const H = bh + sh;
  const scale = 2.5;
  const vertices = [
    { x: 0, y: H * scale }, { x: W * scale, y: H * scale },
    { x: W * scale, y: sh * scale }, { x: (stemLeft + tw) * scale, y: sh * scale },
    { x: (stemLeft + tw) * scale, y: 0 }, { x: stemLeft * scale, y: 0 },
    { x: stemLeft * scale, y: sh * scale }, { x: 0, y: sh * scale },
  ];
  return { shape: "T", W, H, bh, sh, tw, stemLeft, sides, vertices, area, perimeter,
    splitExplanation: W + "x" + bh + "+" + tw + "x" + sh + "=" + (W*bh) + "+" + (tw*sh) + "=" + area };
}

function genUShape4() {
  let W, H, lw, rw, ch;
  let attempts = 0;
  do {
    W = randInt(40, 70); H = randInt(40, 70);
    lw = randInt(10, 20); rw = randInt(10, 20); ch = randInt(15, H - 15);
    attempts++;
  } while (attempts < 200 && (!mulOk(lw, H) || !mulOk(rw, H) || !mulOk(W - lw - rw, H - ch)));
  const stripH = H - ch;
  const area = lw * H + rw * H + (W - lw - rw) * stripH;
  const sides = [
    { length: W,          dir: "h" }, { length: H,    dir: "v" },
    { length: rw,         dir: "h" }, { length: ch,   dir: "v" },
    { length: W - lw - rw, dir: "h" }, { length: ch, dir: "v" },
    { length: lw,         dir: "h" }, { length: H,    dir: "v" },
  ];
  const perimeter = sides.reduce((s, x) => s + x.length, 0);
  const scale = 2;
  const vertices = [
    { x: 0, y: H * scale }, { x: W * scale, y: H * scale },
    { x: W * scale, y: 0 }, { x: (W - rw) * scale, y: 0 },
    { x: (W - rw) * scale, y: ch * scale }, { x: lw * scale, y: ch * scale },
    { x: lw * scale, y: 0 }, { x: 0, y: 0 },
  ];
  return { shape: "U", W, H, lw, rw, ch, stripH, sides, vertices, area, perimeter,
    splitExplanation: lw+"x"+H+"="+lw*H+", "+rw+"x"+H+"="+rw*H+", "+(W-lw-rw)+"x"+stripH+"="+(W-lw-rw)*stripH+" => "+area };
}

export function genWarmupA() {
  const shape = randChoice(["L", "T", "U"]);
  const unit = randChoice(["ft", "yd", "cm", "m"]);
  const shapeData = shape === "L" ? genLShape4() : shape === "T" ? genTShape4() : genUShape4();
  const { sides, perimeter, area, vertices } = shapeData;
  // Hide 2 derivable sides
  let hideIndices = shape === "L" ? [2, 3] : shape === "T" ? [2, 3] : [3, 4];
  const missingAnswers = hideIndices.map(i => ({ idx: i, length: sides[i].length, dir: sides[i].dir }));
  return {
    type: "warmup-a", ...shapeData, unit, hideIndices, missingAnswers,
    answer: JSON.stringify({ m1: missingAnswers[0].length, m2: missingAnswers[1].length, perimeter, area }),
    displayAnswer: "Perimeter: " + perimeter + unit + ", Area: " + area + " sq " + unit,
    prompt: "Find the two missing sides, the perimeter, and the area. Enter all four values.",
  };
}

export function gradeWarmupA(input, question) {
  try {
    const ans = JSON.parse(input);
    return (
      parseInt(ans.m1) === question.missingAnswers[0].length &&
      parseInt(ans.m2) === question.missingAnswers[1].length &&
      parseInt(ans.perimeter) === question.perimeter &&
      parseInt(ans.area) === question.area
    );
  } catch { return false; }
}

// -- Warm-up B: Long Division Zero in Middle --
export function genWarmupB() {
  const divisor = Math.random() < 0.5 ? 2 : 3;
  let dividend, quotient;
  let attempts = 0;
  do {
    dividend = randInt(1000, 9999);
    quotient = Math.floor(dividend / divisor);
    const qStr = String(quotient);
    const hasMiddleZero = qStr.length >= 3 && qStr.slice(1, -1).includes("0");
    if (hasMiddleZero) break;
    attempts++;
  } while (attempts < 500);
  const remainder = dividend % divisor;
  const answer = remainder > 0 ? quotient + "r" + remainder : String(quotient);
  return {
    type: "warmup-b", dividend, divisor, quotient, remainder,
    answer, displayAnswer: answer,
    prompt: "Find the quotient. Use r for remainder (e.g. 1024r1).",
    display: dividend + " / " + divisor,
  };
}

export function gradeWarmupB(input, question) {
  const n = normalizeAnswer(input).replace(/\s/g, "");
  const correct = normalizeAnswer(question.answer).replace(/\s/g, "");
  return n === correct;
}

// -- Topic 1: Division with Zero (Q5 style - 2 problems at once) --
export function genDivZero() {
  const a = randInt(2, 9);
  let b;
  do { b = randInt(2, 9); } while (b === a);
  // One fraction, one standard; independently pick 0/n or n/0
  const types = ["zero-num", "zero-den"];
  const type1 = randChoice(types);
  const type2 = randChoice(types);
  const style1 = Math.random() < 0.5 ? "fraction" : "standard";
  const style2 = style1 === "fraction" ? "standard" : "fraction";
  const makeProb = (type, n, style) => {
    const num = type === "zero-num" ? 0 : n;
    const den = type === "zero-num" ? n : 0;
    const isUndef = type === "zero-den";
    const latex = style === "fraction"
      ? "\\dfrac{" + num + "}{" + den + "}"
      : num + " \\div " + den;
    return { num, den, style, latex, answer: isUndef ? "undefined" : "0", isUndefined: isUndef };
  };
  const prob1 = makeProb(type1, a, style1);
  const prob2 = makeProb(type2, b, style2);
  return {
    type: "div-zero", prob1, prob2,
    answer: JSON.stringify({ ans1: prob1.answer, ans2: prob2.answer }),
    displayAnswer: "Expr 1: " + prob1.answer + ", Expr 2: " + prob2.answer,
    prompt: "Evaluate each expression. Enter a number or press UNDEFINED.",
  };
}

export function gradeDivZero(input, question) {
  try {
    const ans = JSON.parse(input);
    return normalizeAnswer(ans.ans1) === normalizeAnswer(question.prob1.answer) &&
           normalizeAnswer(ans.ans2) === normalizeAnswer(question.prob2.answer);
  } catch { return false; }
}

// -- Topic 2: Computing Powers --
export function genPower() {
  const useRound = Math.random() < 0.4;
  let base, exp, result;
  if (useRound) {
    base = randChoice([10, 20, 30, 40, 50]);
    exp = randInt(1, 3);
    result = Math.pow(base, exp);
  } else {
    base = randInt(0, 5);
    exp = randInt(1, 5);
    result = Math.pow(base, exp);
  }
  const latex = base + "^{" + exp + "}";
  return {
    type: "power", base, exp, result,
    latex, answer: String(result), displayAnswer: String(result),
    prompt: "Find the value.",
  };
}

export function gradePower(input, question) {
  return parseInt(input.replace(/,/g, ""), 10) === question.result;
}

// -- Topic 3: Square Roots --
const SQRT_POOL = [
  { radicand: 0, answer: 0 }, { radicand: 1, answer: 1 },
  { radicand: 4, answer: 2 }, { radicand: 9, answer: 3 },
  { radicand: 16, answer: 4 }, { radicand: 25, answer: 5 },
];

export function makeSqrtPool() { return [...SQRT_POOL].sort(() => Math.random() - 0.5); }

export function genSqrt(pool, idx) {
  const q = pool[idx % pool.length];
  return {
    type: "sqrt", radicand: q.radicand, answer: String(q.answer),
    displayAnswer: String(q.answer),
    latex: "\\sqrt{" + q.radicand + "}",
    prompt: "Find the square root.",
  };
}

// -- Topic 3: Cube Roots --
const CBRT_POOL = [
  { radicand: 0, answer: 0 }, { radicand: 1, answer: 1 },
  { radicand: 8, answer: 2 }, { radicand: 27, answer: 3 },
  { radicand: 64, answer: 4 }, { radicand: 125, answer: 5 },
];

export function makeCbrtPool() { return [...CBRT_POOL].sort(() => Math.random() - 0.5); }

export function genCbrt(pool, idx) {
  const q = pool[idx % pool.length];
  return {
    type: "cbrt", radicand: q.radicand, answer: String(q.answer),
    displayAnswer: String(q.answer),
    latex: "\\sqrt[3]{" + q.radicand + "}",
    prompt: "Find the cube root.",
  };
}

export function gradeRoot(input, question) {
  return parseInt(input, 10) === parseInt(question.answer, 10);
}

// -- Topic 4 & 5: Order of Operations and Variable Expressions --

function evalOp(op, a, b) {
  switch (op) {
    case "+": return a + b;
    case "-": return a - b;
    case "*": return a * b;
    case "/": return b === 0 ? null : Number.isInteger(a / b) ? a / b : null;
    case "^": return Math.pow(a, b);
    default: return null;
  }
}

// -- Shared constraints checker --
// Returns false if operand/op combo violates rules
function isValidOp(op, a, b) {
  if (op === "*" && (a === 0 || b === 0 || a === 1 || b === 1)) return false;
  if (op === "/" && (b === 0 || b === 1)) return false; // div by 0 only in div-zero topic
  if (op === "^" && b === 1) return false;
  if (op === "^" && a === 0 && b === 0) return false;
  return true;
}

// Pick random value for left operand of op, never 0 or 1 for mul
function pickA(op) {
  if (op === "*") return randInt(2, 5);
  if (op === "/") return randInt(4, 20);
  if (op === "^") return randInt(2, 5);
  if (op === "sqrt") return randChoice([4, 9, 16, 25]);
  if (op === "cbrt") return randChoice([8, 27, 64, 125]);
  return randInt(2, 9);
}

// Pick random value for right operand (b), respecting constraints
function pickB(op) {
  if (op === "*") return randInt(2, 4);  // 2-4 so max product 20
  if (op === "/") return randInt(2, 4);  // clean divisor 2-4, no 1
  if (op === "^") return randInt(2, 4);  // exponent 2-4, no 1
  if (op === "+") return randInt(2, 9);
  if (op === "-") return randInt(2, 9);
  return randInt(2, 9);
}

// Check if parentheses actually change the result vs no parentheses
function parensChangeResult(a, op1, b, op2, c) {
  // Without parens: evaluate op2 first if higher precedence, then op1
  // With parens: evaluate op1 first always
  const precedence = { "+": 1, "-": 1, "*": 2, "/": 2, "^": 3 };
  const p1 = precedence[op1] || 0;
  const p2 = precedence[op2] || 0;
  if (p1 >= p2) return false; // parens don't change anything if op1 already has >= precedence
  // e.g. (2 + 3) * 4 vs 2 + 3 * 4 -- parens DO matter
  return true;
}

// Generate a 2-operation expression: a op1 b op2 c
// Ops must include at least one +/- and one */
export function genOrderOfOps2() {
  for (let attempt = 0; attempt < 100; attempt++) {
    // Pick two different ops, at least one +/- and one */^
    const addSub = randChoice(["+", "-"]);
    const mulDiv = randChoice(["*", "/"]);
    const ops = [addSub, mulDiv].sort(() => Math.random() - 0.5);
    const [op1, op2] = ops;

    // Optionally use parens around first pair - only if it changes result
    const tryParens = Math.random() < 0.5 && parensChangeResult(2, op1, 2, op2, 2);

    const a = pickA(op1);
    const b = op1 === "sqrt" || op1 === "cbrt" ? null : pickB(op1);
    const c = pickB(op2);

    if (!isValidOp(op1, a, b)) continue;
    if (!isValidOp(op2, 0, c)) continue; // 0 is placeholder for left side

    const inner = b !== null ? evalOp(op1, a, b) : (op1 === "sqrt" ? Math.sqrt(a) : Math.cbrt(a));
    if (inner === null || !Number.isInteger(inner) || inner < 0) continue;

    const result = evalOp(op2, inner, c);
    if (result === null || !Number.isInteger(result) || result < 0 || result > 1000) continue;

    // Check no negative intermediate
    if (inner < 0 || result < 0) continue;

    let latex;
    if (tryParens && b !== null) {
      latex = "(" + latexPair(a, op1, b) + ") " + latexOp(op2) + " " + c;
    } else {
      latex = b !== null
        ? latexPair(a, op1, b) + " " + latexOp(op2) + " " + c
        : latexOp(op1) + "{" + a + "} " + latexOp(op2) + " " + c;
    }

    return {
      type: "order-ops-2", latex, result,
      answer: String(result), displayAnswer: String(result),
      isUndefined: false, prompt: "Evaluate using the correct order of operations.",
    };
  }
  return genOrderOfOps2();
}

// 3-operation expression: must have at least one +/- and one *//
export function genOrderOfOps3() {
  for (let attempt = 0; attempt < 200; attempt++) {
    // Ensure ops include at least one +/- and one *//^
    const addSubOps = ["+", "-"];
    const mulDivOps = ["*", "/"];
    // Pick one of each category, then a third freely
    const op1 = randChoice([...addSubOps, ...mulDivOps]);
    const op2 = randChoice([...addSubOps, ...mulDivOps]);
    const op3 = randChoice([...addSubOps, ...mulDivOps]);
    const allOps = [op1, op2, op3];
    const hasAddSub = allOps.some(o => o === "+" || o === "-");
    const hasMulDiv = allOps.some(o => o === "*" || o === "/");
    if (!hasAddSub || !hasMulDiv) continue;

    const a = randInt(2, 9);
    const b = pickB(op1);
    const c = pickB(op2);
    const d = pickB(op3);

    if (!isValidOp(op1, a, b)) continue;

    // Optionally wrap first two ops in parens
    const useParens = Math.random() < 0.4 && parensChangeResult(a, op1, b, op2, c);

    let r1, r2, result, latex;
    if (useParens) {
      r1 = evalOp(op1, a, b);
      if (r1 === null || !Number.isInteger(r1) || r1 < 0) continue;
      r2 = evalOp(op2, r1, c);
      if (r2 === null || !Number.isInteger(r2) || r2 < 0) continue;
      result = evalOp(op3, r2, d);
      if (result === null || !Number.isInteger(result) || result < 0 || result > 1000) continue;
      latex = "(" + latexPair(a, op1, b) + ") " + latexOp(op2) + " " + c + " " + latexOp(op3) + " " + d;
    } else {
      // No parens: left to right (simplified - all same precedence level for clean results)
      r1 = evalOp(op1, a, b);
      if (r1 === null || !Number.isInteger(r1) || r1 < 0) continue;
      r2 = evalOp(op2, r1, c);
      if (r2 === null || !Number.isInteger(r2) || r2 < 0) continue;
      result = evalOp(op3, r2, d);
      if (result === null || !Number.isInteger(result) || result < 0 || result > 1000) continue;
      latex = latexPair(a, op1, b) + " " + latexOp(op2) + " " + c + " " + latexOp(op3) + " " + d;
    }

    return {
      type: "order-ops-3", latex, result,
      answer: String(result), displayAnswer: String(result),
      isUndefined: false, prompt: "Evaluate using the correct order of operations.",
    };
  }
  // Fallback: simple safe expression
  const a = randInt(2, 6), b = randInt(2, 4), c = randInt(2, 6), d = randInt(2, 4);
  const r1 = a + b, r2 = r1 * c, result = r2 + d;
  return {
    type: "order-ops-3",
    latex: a + " + " + b + " \\times " + c + " + " + d,
    result, answer: String(result), displayAnswer: String(result),
    isUndefined: false, prompt: "Evaluate using the correct order of operations.",
  };
}

// -- Topic 5: Variable Expressions --
// 3 operations, at least one +/- and one *//
export function genVarExpression() {
  for (let attempt = 0; attempt < 200; attempt++) {
    const xVal = randInt(2, 5);
    // Structure: coeff*x op1 b op2 c  (3 operations: *, op1, op2)
    // Must include +/- for op1 or op2
    const addSubOps = ["+", "-"];
    const mulDivOps = ["*", "/"];
    // All 3 ops: always * (for ax), then pick op1 and op2 with at least one +/-
    const op1 = randChoice([...addSubOps, ...mulDivOps]);
    const op2 = randChoice([...addSubOps, ...mulDivOps]);
    const hasAddSub = [op1, op2].some(o => o === "+" || o === "-");
    const hasMulDiv = [op1, op2].some(o => o === "*" || o === "/");
    // * is always present (ax), so hasMulDiv is already satisfied, but need +/- in remaining
    if (!hasAddSub) continue;

    const coeff = randInt(2, 5);
    const b = op1 === "/" ? randInt(2, 4) : randInt(2, 9);
    const c = op2 === "/" ? randInt(2, 4) : randInt(2, 9);

    if (!isValidOp(op1, 0, b)) continue; // b as right operand
    if (!isValidOp(op2, 0, c)) continue;

    // Evaluate: coeff * xVal first (the ax term), then op1 b, then op2 c
    const axVal = coeff * xVal;
    const r1 = evalOp(op1, axVal, b);
    if (r1 === null || !Number.isInteger(r1) || r1 < 0) continue;
    const result = evalOp(op2, r1, c);
    if (result === null || !Number.isInteger(result) || result < 0 || result > 1000) continue;

    // Format: ax op1 b op2 c  (coeff*x written as "3x")
    const axLatex = coeff === 1 ? "x" : coeff + "x";
    let latex;
    if (op1 === "/") {
      latex = "\\dfrac{" + axLatex + "}{" + b + "} " + latexOp(op2) + " " + c;
    } else {
      latex = axLatex + " " + latexOp(op1) + " " + b + " " + latexOp(op2) + " " + c;
    }

    const given = "x = " + xVal;
    return {
      type: "var-expr", latex, result, xVal, coeff, given,
      answer: String(result), displayAnswer: String(result),
      isUndefined: false,
      prompt: "Evaluate the expression. Given: " + given,
    };
  }
  // Safe fallback
  const xVal = 3, coeff = 2, b = 4, c = 5;
  return {
    type: "var-expr", latex: "2x + 4 - 5", result: 3, xVal, coeff,
    given: "x = 3", answer: "3", displayAnswer: "3",
    isUndefined: false, prompt: "Evaluate the expression. Given: x = 3",
  };
}

export function gradeVarExpr(input, question) {
  if (question.isUndefined) return normalizeAnswer(input) === "undefined";
  return parseInt(input.replace(/,/g, ""), 10) === question.result;
}

// -- Helpers for expression formatting --
function opSym(op) {
  if (op === "*") return "x";
  if (op === "/") return "/";
  if (op === "^") return "^";
  if (op === "sqrt") return "sqrt";
  if (op === "cbrt") return "cbrt";
  return op;
}

function latexOp(op) {
  if (op === "*") return "\\times";
  if (op === "/") return "\\div";
  if (op === "^") return "^";
  if (op === "sqrt") return "\\sqrt{}";
  if (op === "cbrt") return "\\sqrt[3]{}";
  return op;
}

function latexPair(a, op, b) {
  if (op === "^") return a + "^{" + b + "}";
  if (op === "sqrt") return "\\sqrt{" + a + "}";
  if (op === "cbrt") return "\\sqrt[3]{" + a + "}";
  if (op === "/") return "\\dfrac{" + a + "}{" + b + "}";
  if (op === "*") return a + " \\times " + b;
  return a + " " + op + " " + b;
}

function formatPair(a, op, b) {
  if (op === "^") return a + "^" + b;
  if (op === "sqrt") return "sqrt(" + a + ")";
  if (op === "/") return a + "/" + b;
  if (op === "*") return a + "x" + b;
  return a + " " + op + " " + b;
}

function formatExpr(a, op1, b, _r1, op2, c, _parens) {
  return formatPair(a, op1, b) + " " + opSym(op2) + " " + c;
}

function formatLatex(a, op1, b, _r1, op2, c, _parens) {
  if (op2 === "/") return "\\dfrac{" + latexPair(a, op1, b) + "}{" + c + "}";
  return latexPair(a, op1, b) + " " + latexOp(op2) + " " + c;
}

// -- Topic registry --
export const LESSON04_TOPICS = [
  { id: "warmup-a",     label: "Warm-up: Composite Shape",        description: "Perimeter + area, 2 missing sides" },
  { id: "warmup-b",     label: "Warm-up: Long Division (Zero)",   description: "4-digit / 2-3, zero in middle" },
  { id: "div-zero",     label: "Division with Zero",              description: "2 problems: 0/a and a/0 in mixed formats" },
  { id: "power",        label: "Computing Powers",                 description: "Bases 0-5 or round, exp 2-5" },
  { id: "sqrt",         label: "Square Roots",                     description: "Pool of 6, resets after all 6" },
  { id: "cbrt",         label: "Cube Roots",                       description: "Pool of 6, resets after all 6" },
  { id: "order-ops-2",  label: "Order of Operations (2 ops)",     description: "Mix of +/- and x/div" },
  { id: "order-ops-3",  label: "Order of Operations (3 ops)",     description: "Mix of +/- and x/div" },
  { id: "var-expr",     label: "Variable Expressions",            description: "3 ops: ax +/- b +/- c with given x" },
];

export function generateLesson04Question(topicId, state) {
  switch (topicId) {
    case "warmup-a":   return genWarmupA();
    case "warmup-b":   return genWarmupB();
    case "div-zero":   return genDivZero();
    case "power":      return genPower();
    case "sqrt":       return genSqrt(state?.sqrtPool || makeSqrtPool(), state?.sqrtIdx || 0);
    case "cbrt":       return genCbrt(state?.cbrtPool || makeCbrtPool(), state?.cbrtIdx || 0);
    case "order-ops-2": return genOrderOfOps2();
    case "order-ops-3": return genOrderOfOps3();
    case "var-expr":   return genVarExpression();
    default:           return genPower();
  }
}

export function gradeLesson04Answer(input, question) {
  if (!input || !question) return false;
  switch (question.type) {
    case "warmup-a":    return gradeWarmupA(input, question);
    case "warmup-b":    return gradeWarmupB(input, question);
    case "div-zero":    return gradeDivZero(input, question);
    case "power":       return gradePower(input, question);
    case "sqrt":
    case "cbrt":        return gradeRoot(input, question);
    case "order-ops-2":
    case "order-ops-3": return parseInt(input.replace(/,/g, ""), 10) === question.result;
    case "var-expr":    return parseInt(input.replace(/,/g, ""), 10) === question.result;
    default: return false;
  }
}
