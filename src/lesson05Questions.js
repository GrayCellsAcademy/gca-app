// Lesson 5 - Signed Numbers

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// -- Warm-up A: Missing Side of Scalene Triangle --
// All sides 3-digit. Adding 2 known sides: involves carrying.
// Subtracting sum from perimeter: involves borrowing from zero.
function hasBorrowFromZero(top, bot) {
  const maxLen = Math.max(String(top).length, String(bot).length);
  const topStr = String(top).padStart(maxLen, "0");
  const botStr = String(bot).padStart(maxLen, "0");
  let carry = 0;
  for (let i = maxLen - 1; i >= 0; i--) {
    const t = parseInt(topStr[i]) - carry;
    const bt = parseInt(botStr[i]);
    if (bt > t) {
      carry = 1;
      if (i > 0 && parseInt(topStr[i - 1]) === 0) return true;
    } else { carry = 0; }
  }
  return false;
}

function hasCarrying(a, b) {
  const maxLen = Math.max(String(a).length, String(b).length);
  const aStr = String(a).padStart(maxLen, "0");
  const bStr = String(b).padStart(maxLen, "0");
  for (let i = 0; i < maxLen; i++) {
    if (parseInt(aStr[i]) + parseInt(bStr[i]) >= 10) return true;
  }
  return false;
}

export function genWarmupA() {
  const unit = randChoice(["ft", "m", "cm", "yd"]);
  let a, b, c, perimeter;
  let attempts = 0;
  do {
    a = randInt(100, 399);
    b = randInt(100, 399);
    c = randInt(100, 399);
    // All sides different (scalene)
    if (a === b || b === c || a === c) { attempts++; continue; }
    perimeter = a + b + c;
    // Carrying when adding the two known sides
    if (!hasCarrying(a, b)) { attempts++; continue; }
    // Borrowing from zero when subtracting a+b from perimeter
    if (!hasBorrowFromZero(perimeter, a + b)) { attempts++; continue; }
    break;
  } while (attempts < 500);

  // Randomly hide one side
  const hideIdx = randInt(0, 2);
  const sides = [a, b, c];
  const missing = sides[hideIdx];
  const known = sides.filter((_, i) => i !== hideIdx);

  return {
    type: "warmup-a",
    sides, perimeter, unit, hideIdx, missing, known,
    answer: missing + unit,
    displayAnswer: missing + unit,
    prompt: "Find the missing side. Enter your answer with units.",
  };
}

export function gradeWarmupA(input, question) {
  const val = parseInt(String(input).replace(/[^0-9]/g, ""), 10);
  return val === question.missing;
}

// -- Warm-up B: Missing Side of Rectangle Given Area --
export function genWarmupB() {
  const unit = randChoice(["ft", "m", "cm", "yd"]);
  // Pick divisor (known side) and quotient (missing side) so area is clean
  const knownSide = randInt(2, 12);
  const missingSide = randInt(2, 15);
  const area = knownSide * missingSide;
  return {
    type: "warmup-b",
    knownSide, missingSide, area, unit,
    answer: missingSide + unit,
    displayAnswer: missingSide + unit,
    prompt: "Find the missing side using the area. Enter your answer with units.",
  };
}

export function gradeWarmupB(input, question) {
  const val = parseInt(String(input).replace(/[^0-9]/g, ""), 10);
  return val === question.missingSide;
}

// -- Warm-up C: Division by Zero Review (same as Lesson 4) --
export function genWarmupC() {
  const a = randInt(2, 9);
  let b;
  do { b = randInt(2, 9); } while (b === a);
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
    type: "warmup-c", prob1, prob2,
    answer: JSON.stringify({ ans1: prob1.answer, ans2: prob2.answer }),
    displayAnswer: "Expr 1: " + prob1.answer + ", Expr 2: " + prob2.answer,
    prompt: "Evaluate each expression.",
  };
}

export function gradeWarmupC(input, question) {
  try {
    const ans = JSON.parse(input);
    return String(ans.ans1).toLowerCase() === question.prob1.answer &&
           String(ans.ans2).toLowerCase() === question.prob2.answer;
  } catch { return false; }
}

// -- Topic 1: Comparing Signed Numbers --
// 3 pairs shown simultaneously, each graded separately
export function genCompareSignedNumbers() {
  const makeInRange = (min, max) => { let v; do { v = randInt(min, max); } while (v === 0); return v; };
  // Pair 1: negative vs zero
  const p1a = -makeInRange(1, 20), p1b = 0;
  // Pair 2: negative vs positive with smaller absolute value
  const negVal = makeInRange(5, 20);
  const posVal = randInt(1, negVal - 1);
  const p2a = -negVal, p2b = posVal;
  // Pair 3: two negatives
  let p3a, p3b;
  do { p3a = -makeInRange(1, 20); p3b = -makeInRange(1, 20); } while (p3a === p3b);
  const pairs = shuffle([
    { a: p1a, b: p1b, answer: "<" },
    { a: p2a, b: p2b, answer: "<" },
    { a: p3a, b: p3b, answer: p3a < p3b ? "<" : p3a > p3b ? ">" : "=" },
  ]);
  return {
    type: "compare-signed", pairs,
    answer: JSON.stringify(pairs.map(p => p.answer)),
    displayAnswer: pairs.map(p => p.a + " " + p.answer + " " + p.b).join(", "),
    prompt: "Compare each pair. Select <, >, or = for each.",
  };
}

export function gradeCompareSignedNumbers(input, question) {
  try {
    const ans = JSON.parse(input);
    const correct = JSON.parse(question.answer);
    return ans.every((a, i) => a === correct[i]);
  } catch { return false; }
}

// -- Topic 2: Absolute Value --
// 3 questions simultaneously
export function genAbsoluteValue() {
  const posVal = randInt(1, 20);
  const negVal = randInt(1, 20);
  const questions = shuffle([
    { expr: "|" + posVal + "|", latex: "|" + posVal + "|", answer: posVal },
    { expr: "|0|", latex: "|0|", answer: 0 },
    { expr: "|-" + negVal + "|", latex: "|-" + negVal + "|", answer: negVal },
  ]);
  return {
    type: "absolute-value", questions,
    answer: JSON.stringify(questions.map(q => q.answer)),
    displayAnswer: questions.map(q => q.expr + " = " + q.answer).join(", "),
    prompt: "Find the absolute value of each expression.",
  };
}

export function gradeAbsoluteValue(input, question) {
  try {
    const ans = JSON.parse(input);
    const correct = JSON.parse(question.answer);
    return ans.every((a, i) => parseInt(a) === correct[i]);
  } catch { return false; }
}

// -- Topic 3: Multiple Minus Signs --
export function genMultipleMinus() {
  const minusSigns = randInt(2, 4); // at least 2
  const base = randInt(2, 20);
  const value = minusSigns % 2 === 0 ? base : -base;
  // Build nested parentheses: -(-(-5)) for 3 signs
  let latex = String(base);
  for (let i = 0; i < minusSigns; i++) {
    latex = "-(" + latex + ")";
  }
  return {
    type: "multiple-minus", minusSigns, base, value,
    latex, answer: String(value), displayAnswer: String(value),
    prompt: "Simplify the expression.",
  };
}

export function gradeMultipleMinus(input, question) {
  return parseInt(input, 10) === question.value;
}

// -- Topic 4: Signed Number Operations --
// The 8 expression types using a and b where a < b
export function genSignedExpressions() {
  let a, b;
  do {
    a = randInt(1, 8);
    b = randInt(1, 9);
  } while (a >= b);

  // Build all 8 expressions
  // Format: { display, num1Sign, num2Sign, op, addOrSub, answerSign, value }
  // num1Sign: sign of first number (+ or -)
  // num2Sign: sign of second number (+ or -)  
  // addOrSub: "add" if same direction (same effective sign after resolving), "sub" if opposite
  // answerSign: sign of result

  const buildExpr = (n1Neg, n2Neg, subtract) => {
    // The actual value of num1 and num2 on number line
    const v1 = n1Neg ? -a : a;
    const v2 = n2Neg ? -b : b;
    const result = subtract ? v1 - v2 : v1 + v2;
    // Effective direction: positive = right, negative = left
    const dir1 = v1 >= 0 ? "+" : "-";
    const dir2Effective = subtract ? (v2 >= 0 ? "-" : "+") : (v2 >= 0 ? "+" : "-");
    const sameDir = dir1 === dir2Effective;
    const addSub = sameDir ? "add" : "sub";
    const ansSign = result > 0 ? "+" : result < 0 ? "-" : "+";
    return {
      v1, v2, result,
      num1Sign: n1Neg ? "-" : "+",
      num2Sign: n2Neg ? "-" : "+",
      addOrSub: addSub,
      answerSign: ansSign,
    };
  };

  const makeLatex = (n1Neg, n2Neg, subtract, a, b) => {
    const n1 = n1Neg ? "-" + a : String(a);
    const n2 = n2Neg ? "-" + b : String(b);
    if (subtract) return n1 + " - " + (n2Neg ? "(-" + b + ")" : n2);
    return n1 + " + " + (n2Neg ? "(-" + b + ")" : n2);
  };

  const exprs = shuffle([
    { label:"a+b",     display:a+" + "+b,          latex:makeLatex(false,false,false,a,b), ...buildExpr(false,false,false) },
    { label:"a+(-b)",  display:a+" + (-"+b+")",     latex:makeLatex(false,true,false,a,b),  ...buildExpr(false,true,false) },
    { label:"-a+b",    display:"-"+a+" + "+b,       latex:makeLatex(true,false,false,a,b),  ...buildExpr(true,false,false) },
    { label:"-a+(-b)", display:"-"+a+" + (-"+b+")", latex:makeLatex(true,true,false,a,b),   ...buildExpr(true,true,false) },
    { label:"a-b",     display:a+" - "+b,           latex:makeLatex(false,false,true,a,b),  ...buildExpr(false,false,true) },
    { label:"a-(-b)",  display:a+" - (-"+b+")",     latex:makeLatex(false,true,true,a,b),   ...buildExpr(false,true,true) },
    { label:"-a-b",    display:"-"+a+" - "+b,       latex:makeLatex(true,false,true,a,b),   ...buildExpr(true,false,true) },
    { label:"-a-(-b)", display:"-"+a+" - (-"+b+")", latex:makeLatex(true,true,true,a,b),    ...buildExpr(true,true,true) },
  ]);

  return { a, b, exprs };
}

// Activity 1: sign of each number (2 grades per expr = 16 total, but graded as "all 8 correct pairs")
export function genSignedAct1() {
  const data = genSignedExpressions();
  return {
    type: "signed-act1", ...data,
    answer: JSON.stringify(data.exprs.map(e => ({ num1: e.num1Sign, num2: e.num2Sign }))),
    displayAnswer: data.exprs.map(e => e.display + ": " + e.num1Sign + "," + e.num2Sign).join(" | "),
    prompt: "For each expression, identify the sign of each number.",
  };
}

export function gradeSignedAct1(input, question) {
  try {
    const ans = JSON.parse(input);
    const correct = JSON.parse(question.answer);
    return ans.every((a, i) => a.num1 === correct[i].num1 && a.num2 === correct[i].num2);
  } catch { return false; }
}

// Activity 2: sign of each number AND add/subtract (3 grades per expr)
export function genSignedAct2() {
  const data = genSignedExpressions();
  return {
    type: "signed-act2", ...data,
    answer: JSON.stringify(data.exprs.map(e => ({ num1: e.num1Sign, num2: e.num2Sign, addOrSub: e.addOrSub }))),
    displayAnswer: data.exprs.map(e => e.display + ": " + e.num1Sign + "," + e.num2Sign + "," + e.addOrSub).join(" | "),
    prompt: "For each expression, identify the sign of each number and whether to add or subtract.",
  };
}

export function gradeSignedAct2(input, question) {
  try {
    const ans = JSON.parse(input);
    const correct = JSON.parse(question.answer);
    return ans.every((a, i) =>
      a.num1 === correct[i].num1 &&
      a.num2 === correct[i].num2 &&
      a.addOrSub === correct[i].addOrSub
    );
  } catch { return false; }
}

// Activity 3: sign of each number, add/subtract, AND sign of answer (4 grades per expr)
export function genSignedAct3() {
  const data = genSignedExpressions();
  return {
    type: "signed-act3", ...data,
    answer: JSON.stringify(data.exprs.map(e => ({ num1: e.num1Sign, num2: e.num2Sign, addOrSub: e.addOrSub, ansSign: e.answerSign }))),
    displayAnswer: data.exprs.map(e => e.display + " = " + e.result).join(", "),
    prompt: "For each expression, identify all signs and whether to add or subtract.",
  };
}

export function gradeSignedAct3(input, question) {
  try {
    const ans = JSON.parse(input);
    const correct = JSON.parse(question.answer);
    return ans.every((a, i) =>
      a.num1 === correct[i].num1 &&
      a.num2 === correct[i].num2 &&
      a.addOrSub === correct[i].addOrSub &&
      a.ansSign === correct[i].ansSign
    );
  } catch { return false; }
}

// Activity 4: numerical answers for all 8
export function genSignedAct4() {
  const data = genSignedExpressions();
  return {
    type: "signed-act4", ...data,
    answer: JSON.stringify(data.exprs.map(e => e.result)),
    displayAnswer: data.exprs.map(e => e.display + " = " + e.result).join(", "),
    prompt: "Calculate the value of each expression.",
  };
}

export function gradeSignedAct4(input, question) {
  try {
    const ans = JSON.parse(input);
    const correct = JSON.parse(question.answer);
    return ans.every((a, i) => parseInt(a) === correct[i]);
  } catch { return false; }
}

// -- Topic registry --
export const LESSON05_TOPICS = [
  { id: "warmup-a",      label: "Warm-up: Triangle Missing Side",   description: "3-digit sides, perimeter given" },
  { id: "warmup-b",      label: "Warm-up: Rectangle Missing Side",  description: "Area and one side given, find other" },
  { id: "warmup-c",      label: "Warm-up: Division by Zero Review", description: "2 problems, 0 or undefined" },
  { id: "compare-signed", label: "Comparing Signed Numbers",        description: "3 pairs simultaneously" },
  { id: "absolute-value", label: "Absolute Value",                  description: "3 questions simultaneously" },
  { id: "multiple-minus", label: "Multiple Minus Signs",            description: "1-4 minus signs, simplify" },
  { id: "signed-act1",   label: "Signed Operations: Sign of Numbers", description: "8 expressions, sign of each number" },
  { id: "signed-act2",   label: "Signed Operations: Add or Subtract", description: "8 expressions, sign + add/sub" },
  { id: "signed-act3",   label: "Signed Operations: Sign of Answer",  description: "8 expressions, all 4 elements" },
  { id: "signed-act4",   label: "Signed Operations: Numerical Answer", description: "8 expressions, calculate result" },
];

export function generateLesson05Question(topicId) {
  switch (topicId) {
    case "warmup-a":      return genWarmupA();
    case "warmup-b":      return genWarmupB();
    case "warmup-c":      return genWarmupC();
    case "compare-signed": return genCompareSignedNumbers();
    case "absolute-value": return genAbsoluteValue();
    case "multiple-minus": return genMultipleMinus();
    case "signed-act1":   return genSignedAct1();
    case "signed-act2":   return genSignedAct2();
    case "signed-act3":   return genSignedAct3();
    case "signed-act4":   return genSignedAct4();
    default:              return genMultipleMinus();
  }
}

export function gradeLesson05Answer(input, question) {
  if (!input || !question) return false;
  switch (question.type) {
    case "warmup-a":       return gradeWarmupA(input, question);
    case "warmup-b":       return gradeWarmupB(input, question);
    case "warmup-c":       return gradeWarmupC(input, question);
    case "compare-signed": return gradeCompareSignedNumbers(input, question);
    case "absolute-value": return gradeAbsoluteValue(input, question);
    case "multiple-minus": return gradeMultipleMinus(input, question);
    case "signed-act1":    return gradeSignedAct1(input, question);
    case "signed-act2":    return gradeSignedAct2(input, question);
    case "signed-act3":    return gradeSignedAct3(input, question);
    case "signed-act4":    return gradeSignedAct4(input, question);
    default: return false;
  }
}
