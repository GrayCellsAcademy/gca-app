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

// -- Topic 1: Division with Zero --
// 4 problem types in random order
const DIV_ZERO_POOL = [
  { format: "standard", numeratorIsZero: false, desc: "a / 0" },
  { format: "standard", numeratorIsZero: true,  desc: "0 / a" },
  { format: "fraction",  numeratorIsZero: false, desc: "a/0 fraction" },
  { format: "fraction",  numeratorIsZero: true,  desc: "0/a fraction" },
];

export function genDivZero(typeIdx) {
  const a = randInt(2, 9);
  const t = DIV_ZERO_POOL[typeIdx];
  const isUndefined = !t.numeratorIsZero;
  const numerator = t.numeratorIsZero ? 0 : a;
  const denominator = t.numeratorIsZero ? a : 0;
  let display, latex;
  if (t.format === "fraction") {
    latex = "\\dfrac{" + numerator + "}{" + denominator + "}";
    display = numerator + "/" + denominator;
  } else {
    display = numerator + " / " + denominator;
    latex = numerator + " \\div " + denominator;
  }
  return {
    type: "div-zero", typeIdx, a, numeratorIsZero: t.numeratorIsZero,
    format: t.format, display, latex,
    answer: isUndefined ? "undefined" : "0",
    displayAnswer: isUndefined ? "Undefined" : "0",
    isUndefined,
    prompt: "Evaluate. Choose: 0 or Undefined.",
  };
}

export function gradeDivZero(input, question) {
  const n = normalizeAnswer(input);
  if (question.isUndefined) return n === "undefined";
  return n === "0";
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
// We generate these as structured expression trees

function safeDiv(a, b) { return b === 0 ? null : a / b; }
function safePow(base, exp) { return Math.pow(base, exp); }
function safeSqrt(x) { return Math.sqrt(x); }
function safeCbrt(x) { return Math.cbrt(x); }

// Evaluate a single operation
function evalOp(op, a, b) {
  switch (op) {
    case "+": return a + b;
    case "-": return a - b;
    case "*": return a * b;
    case "/": return b === 0 ? null : a / b;
    case "^": return Math.pow(a, b);
    case "sqrt": return Math.sqrt(a);
    case "cbrt": return Math.cbrt(a);
    default: return null;
  }
}

// Pick a valid operand for an operation
function pickOperand(op, position) {
  if (op === "sqrt") return randChoice([0, 1, 4, 9, 16, 25]);
  if (op === "cbrt") return randChoice([0, 1, 8, 27, 64, 125]);
  if (op === "^") {
    const useRound = Math.random() < 0.3;
    if (useRound) return { base: randChoice([10, 20, 30, 40, 50]), exp: randInt(1, 3) };
    return { base: randInt(0, 5), exp: randInt(1, 5) };
  }
  if (op === "/") {
    if (position === "divisor") return randInt(1, 3); // no zero divisor unless intentional
    return randInt(1, 9);
  }
  if (op === "*") return randInt(1, 3); // max factor 3 so product <= 3*10=30
  return randInt(0, 9);
}

// Generate a 2-operation expression
export function genOrderOfOps2() {
  const OPS = ["+", "-", "*", "/", "^", "sqrt"];
  const op1 = randChoice(OPS);
  let op2 = randChoice(OPS);
  // Avoid same op twice for variety
  let attempts = 0;
  while (op2 === op1 && attempts < 10) { op2 = randChoice(OPS); attempts++; }

  // Build a simple 2-op expression: (a op1 b) op2 c or a op1 (b op2 c)
  // with parentheses sometimes
  const useParens = Math.random() < 0.4;

  // Generate values based on ops
  const a = randInt(1, 9);
  const b = op1 === "/" ? randInt(1, 3) : op1 === "*" ? randInt(1, 3) : op1 === "^" ? randInt(0, 5) : randInt(0, 9);
  const c = op2 === "/" ? randInt(1, 3) : op2 === "*" ? randInt(1, 3) : op2 === "^" ? randInt(0, 5) : randInt(0, 9);

  // Compute result based on standard order of ops (no parens) or with parens
  let expr, result, latex;

  if (!useParens) {
    // Standard order: * / ^ before + -
    // Simplified: just show left-to-right with natural precedence
    const r1 = evalOp(op1, a, b);
    if (r1 === null || !Number.isInteger(r1)) return genOrderOfOps2();
    result = evalOp(op2, r1, c);
    if (result === null || !Number.isInteger(result) || Math.abs(result) > 10000) return genOrderOfOps2();
    expr = formatExpr(a, op1, b, null, op2, c, false);
    latex = formatLatex(a, op1, b, null, op2, c, false);
  } else {
    // Parens around first pair
    const r1 = evalOp(op1, a, b);
    if (r1 === null || !Number.isInteger(r1)) return genOrderOfOps2();
    result = evalOp(op2, r1, c);
    if (result === null || !Number.isInteger(result) || Math.abs(result) > 10000) return genOrderOfOps2();
    expr = "(" + formatPair(a, op1, b) + ") " + opSym(op2) + " " + c;
    latex = "(" + latexPair(a, op1, b) + ") " + latexOp(op2) + " " + c;
  }

  const isUndefined = result === null;
  return {
    type: "order-ops-2", expr, latex, result,
    answer: isUndefined ? "undefined" : String(result),
    displayAnswer: isUndefined ? "Undefined" : String(result),
    isUndefined, prompt: "Evaluate using the correct order of operations.",
  };
}

export function genOrderOfOps3() {
  // Try a few times to get a clean result
  for (let i = 0; i < 50; i++) {
    const OPS = ["+", "-", "*", "/", "^"];
    const op1 = randChoice(OPS), op2 = randChoice(OPS), op3 = randChoice(OPS);
    const a = randInt(1, 5), b = randInt(1, 3), c = randInt(1, 3), d = randInt(1, 5);
    const useParens = Math.random() < 0.4;
    let result, latex;
    if (!useParens) {
      // Left to right respecting precedence: ^ then * / then + -
      // Simplified: compute step by step
      const r1 = evalOp(op1, a, b);
      if (r1 === null || !Number.isInteger(r1)) continue;
      const r2 = evalOp(op2, r1, c);
      if (r2 === null || !Number.isInteger(r2)) continue;
      result = evalOp(op3, r2, d);
      if (result === null || !Number.isInteger(result) || Math.abs(result) > 10000) continue;
      latex = latexPair(a, op1, b) + " " + latexOp(op2) + " " + c + " " + latexOp(op3) + " " + d;
    } else {
      const r1 = evalOp(op1, a, b);
      if (r1 === null || !Number.isInteger(r1)) continue;
      const r2 = evalOp(op2, r1, c);
      if (r2 === null || !Number.isInteger(r2)) continue;
      result = evalOp(op3, r2, d);
      if (result === null || !Number.isInteger(result) || Math.abs(result) > 10000) continue;
      latex = "(" + latexPair(a, op1, b) + ") " + latexOp(op2) + " " + c + " " + latexOp(op3) + " " + d;
    }
    return {
      type: "order-ops-3", latex, result,
      answer: String(result), displayAnswer: String(result),
      isUndefined: false, prompt: "Evaluate using the correct order of operations.",
    };
  }
  return genOrderOfOps2(); // fallback
}

// -- Topic 5: Variable Expressions --
export function genVarExpression() {
  const vars = ["x", "y"];
  const useTwo = Math.random() < 0.4;
  const xVal = randInt(1, 5);
  const yVal = useTwo ? randInt(1, 5) : null;
  const OPS = ["+", "-", "*", "/", "^"];
  const op1 = randChoice(OPS);
  const op2 = randChoice(OPS);
  const a = randInt(1, 5), b = randInt(1, 3);

  // Simple 2-op expression with one variable
  // e.g. 3x + 2, x^2 - 1, 2x/3 + 1
  let latex, result;

  const c = randInt(1, 9);
  // Build: a * x (op1) c, then (op2) b if 3-ops
  const xTerm = evalOp("*", a, xVal);
  const mid = evalOp(op1, xTerm, c);
  if (mid === null || !Number.isInteger(mid)) return genVarExpression();
  result = mid;

  // Format: use ax notation (no multiplication sign)
  const axLatex = a === 1 ? "x" : a + "x";
  if (op1 === "+") latex = axLatex + " + " + c;
  else if (op1 === "-") latex = axLatex + " - " + c;
  else if (op1 === "/") latex = "\\dfrac{" + axLatex + "}{" + c + "}";
  else latex = axLatex + " " + latexOp(op1) + " " + c;

  if (result === null || !Number.isInteger(result) || Math.abs(result) > 1000) return genVarExpression();

  const given = "x = " + xVal;
  return {
    type: "var-expr", latex, result,
    answer: String(result), displayAnswer: String(result),
    given, xVal,
    isUndefined: false,
    prompt: "Evaluate the expression. Given: " + given,
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
  { id: "div-zero-0",   label: "Division with Zero",              description: "a / 0 (standard)" },
  { id: "div-zero-1",   label: "Division with Zero",              description: "0 / a (standard)" },
  { id: "div-zero-2",   label: "Division with Zero",              description: "a/0 (fraction)" },
  { id: "div-zero-3",   label: "Division with Zero",              description: "0/a (fraction)" },
  { id: "power",        label: "Computing Powers",                 description: "Bases 0-5 or round, exp 1-5" },
  { id: "sqrt",         label: "Square Roots",                     description: "Pool of 6, resets after all 6" },
  { id: "cbrt",         label: "Cube Roots",                       description: "Pool of 6, resets after all 6" },
  { id: "order-ops-2",  label: "Order of Operations (2 ops)",     description: "Any 2 ops with/without parens" },
  { id: "order-ops-3",  label: "Order of Operations (3 ops)",     description: "Any 3 ops with/without parens" },
  { id: "var-expr",     label: "Variable Expressions",            description: "2-3 ops, 1-2 variables" },
];

export function generateLesson04Question(topicId, state) {
  switch (topicId) {
    case "warmup-a":   return genWarmupA();
    case "warmup-b":   return genWarmupB();
    case "div-zero-0": return genDivZero(0);
    case "div-zero-1": return genDivZero(1);
    case "div-zero-2": return genDivZero(2);
    case "div-zero-3": return genDivZero(3);
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
    case "order-ops-3": return question.isUndefined
        ? normalizeAnswer(input) === "undefined"
        : parseInt(input.replace(/,/g, ""), 10) === question.result;
    case "var-expr":    return gradeVarExpr(input, question);
    default: return false;
  }
}
