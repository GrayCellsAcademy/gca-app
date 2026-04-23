// Final Exam Review - Question Generators
// 44 question types in exact order

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function gcd(a, b) {
  a = Math.abs(a); b = Math.abs(b);
  while (b) { [a, b] = [b, a % b]; }
  return a;
}
function lcm(a, b) { return Math.abs(a * b) / gcd(a, b); }
function simplifyFrac(n, d) {
  const g = gcd(Math.abs(n), Math.abs(d));
  return [n / g, d / g];
}
function fracStr(n, d) {
  if (d < 0) { n = -n; d = -d; }
  const g = gcd(Math.abs(n), Math.abs(d));
  n = n / g; d = d / g;
  if (d === 1) return String(n);
  return n + "/" + d;
}

//  Q1: Column Subtraction 
export function genQ1() {
  let a, b;
  let attempts = 0;
  do {
    const digits = randInt(3, 4);
    const min = Math.pow(10, digits - 1);
    const max = Math.pow(10, digits) - 1;
    a = randInt(min, max);
    b = randInt(min, max);
    attempts++;
    // Must have borrowing from zero: minuend has interior 0 digit AND
    // subtraction requires borrowing (some digit of b > corresponding digit of a)
    if (a <= b) continue;
    const aStr = String(a);
    const hasInteriorZero = aStr.slice(1, -1).includes("0");
    if (!hasInteriorZero) continue;
    // Check that borrowing is needed (some column of b digit > a digit before borrowing)
    const bStr = String(b).padStart(aStr.length, "0");
    let needsBorrow = false;
    for (let i = aStr.length - 1; i >= 0; i--) {
      if (parseInt(bStr[i]) > parseInt(aStr[i])) { needsBorrow = true; break; }
    }
    if (!needsBorrow) continue;
    break;
  } while (attempts < 2000);
  return {
    type: "q1", topic: 1,
    a, b, answer: String(a - b),
    prompt: "Find the difference.",
    display: { type: "column-subtract", a, b }
  };
}

//  Q2: Column Multiplication 3x2 
export function genQ2() {
  let a, b;
  do {
    a = randInt(100, 999);
    b = randInt(10, 99);
  } while (a % 10 === 0 || b % 10 === 0);
  return {
    type: "q2", topic: 2,
    a, b, answer: String(a * b),
    prompt: "Find the product.",
    display: { type: "column-multiply", a, b }
  };
}

//  Q3: Square Perimeter 
const UNITS = ["cm", "mm", "m", "km", "in", "ft", "yd", "mi"];
export function genQ3() {
  const s = randInt(10, 99);
  const unit = randChoice(UNITS);
  const p = 4 * s;
  return {
    type: "q3", topic: 3,
    s, unit,
    answer: p + unit,
    displayAnswer: p + " " + unit,
    prompt: "Find the perimeter of this square.",
    display: { type: "square", s, unit }
  };
}

//  Q4: Area of Rectangle or Square 
export function genQ4() {
  const unit = randChoice(UNITS);
  const isSquare = Math.random() < 0.5;
  if (isSquare) {
    const s = randInt(5, 20);
    return {
      type: "q4", topic: 4,
      shape: "square", s, unit,
      answerNum: s * s, answerUnit: unit + "^2",
      answer: (s * s) + " " + unit + "^2",
      displayAnswer: (s * s) + " " + unit + "^2",
      prompt: "Find the area of this square.",
      display: { type: "square-area", s, unit },
      unitChoices: [unit, unit + "^2", unit + "^3"]
    };
  } else {
    const w = randInt(5, 20);
    let h;
    do { h = randInt(5, 20); } while (h === w);
    return {
      type: "q4", topic: 4,
      shape: "rect", w, h, unit,
      answerNum: w * h, answerUnit: unit + "^2",
      answer: (w * h) + " " + unit + "^2",
      displayAnswer: (w * h) + " " + unit + "^2",
      prompt: "Find the area of this rectangle.",
      display: { type: "rect-area", w, h, unit },
      unitChoices: [unit, unit + "^2", unit + "^3"]
    };
  }
}

//  Q5: Division with Zero 
export function genQ5() {
  const a = randInt(2, 9);
  let b;
  do { b = randInt(2, 9); } while (b === a);
  const style1 = Math.random() < 0.5 ? "fraction" : "symbol";
  const style2 = style1 === "fraction" ? "symbol" : "fraction";
  // Independently pick type for each: 0/n (answer=0) or n/0 (answer=undefined)
  const types = ["zero-num", "zero-den"];
  const type1 = randChoice(types);
  const type2 = randChoice(types);
  const makeProb = (type, n, style) => type === "zero-num"
    ? { num: 0, den: n, style, answer: "0" }
    : { num: n, den: 0, style, answer: "undefined" };
  const prob1 = makeProb(type1, a, style1);
  const prob2 = makeProb(type2, b, style2);
  return {
    type: "q5", topic: 5,
    prob1, prob2,
    answer: JSON.stringify({ ans1: prob1.answer, ans2: prob2.answer }),
    displayAnswer: "Expr 1: " + prob1.answer + ", Expr 2: " + prob2.answer,
    prompt: "Evaluate each expression. Enter a number or press UNDEFINED."
  };
}

//  Q6: Long Division with Remainder and Intermediate Zero 
export function genQ6() {
  let dividend, divisor, quotient, remainder;
  let attempts = 0;
  do {
    divisor = randInt(6, 9);
    quotient = randInt(1000, 9999);
    // Force at least one 0 in the middle of quotient
    const qStr = String(quotient);
    const hasMiddleZero = qStr.slice(1, -1).includes("0");
    if (!hasMiddleZero) { attempts++; continue; }
    remainder = randInt(1, divisor - 1);
    dividend = quotient * divisor + remainder;
    if (dividend >= 10000 && dividend <= 99999) break;
    attempts++;
  } while (attempts < 1000);
  return {
    type: "q6", topic: 6,
    dividend, divisor, quotient, remainder,
    answer: JSON.stringify({ quotient, remainder }),
    displayAnswer: quotient + " remainder " + remainder,
    prompt: "Find the quotient and remainder.",
    display: { type: "long-division", dividend, divisor }
  };
}

//  Q7: Order of Operations 
export function genQ7() {
  // Generate expressions matching the 4 forms shown
  const forms = ["frac-paren", "inline-sq", "frac-sq", "inline-paren"];
  const form = randChoice(forms);
  let expr, answer, latex;

  if (form === "frac-paren") {
    // a(b - c) + d / (e^2 + f)
    const b = randInt(5, 14), c = randInt(2, b - 1), a = randInt(2, 5), d = randInt(2, 9);
    const e = randInt(2, 4), f = randInt(2, 9);
    const num = a * (b - c) + d;
    const den = e * e + f;
    if (den <= 0 || num % den !== 0) return genQ7();
    answer = num / den;
    if (answer <= 0 || Math.abs(answer) > 20) return genQ7();
    latex = "\\frac{" + a + "(" + b + "-" + c + ")+" + d + "}{" + e + "^2+" + f + "}";
    expr = a + "*(" + b + "-" + c + ")+" + d + "/" + "(" + e + "**2+" + f + ")";
  } else if (form === "inline-sq") {
    // a - b(c - d)^2 + 2^n
    const a = randInt(50, 99), b = randInt(2, 4), c = randInt(4, 9), d = randInt(2, c - 1);
    const n = randInt(2, 3);
    answer = a - b * Math.pow(c - d, 2) + Math.pow(2, n);
    if (answer <= 0 || Math.abs(answer) > 100 || !Number.isInteger(answer)) return genQ7();
    latex = a + "-" + b + "(" + c + "-" + d + ")^2+" + "2^" + n;
    expr = a + "-" + b + "*Math.pow(" + (c - d) + ",2)+Math.pow(2," + n + ")";
  } else if (form === "frac-sq") {
    // (a + b)^2 / (c*d - e)
    const a = randInt(2, 6), b = randInt(2, 6), c = randInt(3, 9), d = randInt(3, 9), e = randInt(2, 9);
    const num = Math.pow(a + b, 2);
    const den = c * d - e;
    if (den <= 0 || num % den !== 0) return genQ7();
    answer = num / den;
    if (answer <= 0 || Math.abs(answer) > 20) return genQ7();
    latex = "\\frac{(" + a + "+" + b + ")^2}{" + c + "\\cdot" + d + "-" + e + "}";
    expr = "Math.pow(" + (a + b) + ",2)/(" + c + "*" + d + "-" + e + ")";
  } else {
    // a^2 - (b + c * d^2)
    const a = randInt(5, 9), b = randInt(2, 9), c = randInt(2, 5), d = randInt(2, 4);
    answer = a * a - (b + c * d * d);
    if (answer <= 0 || !Number.isInteger(answer)) return genQ7();
    latex = a + "^2-(" + b + "+" + c + "\\cdot" + d + "^2)";
    expr = a + "**2-(" + b + "+" + c + "*" + d + "**2)";
  }

  return {
    type: "q7", topic: 7,
    form, latex, answer: String(answer),
    prompt: "Evaluate."
  };
}

//  Q8: Integer Comparison 
export function genQ8() {
  const pairs = [];
  const ops = ["<", "=", ">"];
  for (let i = 0; i < 3; i++) {
    let a, b;
    do {
      a = randInt(-20, 20);
      b = randInt(-20, 20);
    } while (a >= 0 && b >= 0);
    const op = a < b ? "<" : a > b ? ">" : "=";
    pairs.push({ a, b, answer: op });
  }
  return { type: "q8", topic: 8, pairs, prompt: "Compare each pair using <, =, or >." };
}

//  Q9: Integer Addition 
export function genQ9() {
  const a1 = -randInt(20, 60), b1 = -randInt(20, 60);
  const sign = Math.random() < 0.5 ? 1 : -1;
  const a2 = sign * randInt(20, 60), b2 = -randInt(20, 60);
  return {
    type: "q9", topic: 9,
    prob1: { a: a1, b: b1, answer: String(a1 + b1) },
    prob2: { a: a2, b: b2, answer: String(a2 + b2) },
    answer: JSON.stringify({ ans1: String(a1+b1), ans2: String(a2+b2) }),
    displayAnswer: "Expr 1: " + (a1+b1) + ",  Expr 2: " + (a2+b2),
    prompt: "Find each sum."
  };
}

//  Q10: Integer Subtraction 
export function genQ10() {
  const forms = [
    () => { const a = -randInt(20, 60), b = randInt(20, 60); return { a, b, answer: String(a - b) }; },
    () => { const a = randInt(20, 60), b = -randInt(20, 60); return { a, b, answer: String(a - b) }; },
    () => { const a = -randInt(20, 60), b = -randInt(20, 60); return { a, b, answer: String(a - b) }; },
  ];
  const f1 = randChoice(forms);
  let f2;
  do { f2 = randChoice(forms); } while (f2 === f1);
  const p1 = f1(), p2 = f2();
  return {
    type: "q10", topic: 10,
    prob1: p1, prob2: p2,
    answer: JSON.stringify({ ans1: p1.answer, ans2: p2.answer }),
    displayAnswer: "Expr 1: " + p1.answer + ",  Expr 2: " + p2.answer,
    prompt: "Find each difference."
  };
}

//  Q11: Combining Like Terms 
export function genQ11() {
  const vars = ["x", "y", "n", "a", "b"];
  const v1 = randChoice(vars);
  let v2;
  do { v2 = randChoice(vars); } while (v2 === v1);
  const has3 = Math.random() < 0.5;
  const c1 = randInt(-9, 9) || 1, c2 = randInt(-9, 9) || 1;
  const combined = c1 + c2;
  let expr, answer;
  if (has3) {
    const c3 = randInt(-9, 9) || 1;
    const order = Math.random() < 0.5;
    if (order) {
      expr = joinTerms([termStr(c1, v1), termStr(c3, v2), termStr(c2, v1)]);
    } else {
      expr = joinTerms([termStr(c1, v1), termStr(c2, v1), termStr(c3, v2)]);
    }
    const t1 = termStr(combined, v1), t2 = termStr(c3, v2);
    answer = joinTerms([t1, t2]);
    return { type: "q11", topic: 11, expr, answer, answerTerms: [t1, t2], prompt: "Combine like terms." };
  } else {
    expr = joinTerms([termStr(c1, v1), termStr(c2, v1)]);
    answer = termStr(combined, v1);
    return { type: "q11", topic: 11, expr, answer, answerTerms: [answer], prompt: "Combine like terms." };
  }
}
function joinTerms(terms) {
  return terms.reduce((acc, t) => {
    if (acc === "") return t;
    if (t.startsWith("-")) return acc + " - " + t.slice(1);
    return acc + " + " + t;
  }, "");
}
function termStr(c, v) {
  if (c === 1) return v;
  if (c === -1) return "-" + v;
  return c + v;
}

//  Q12: Negative/Power Expressions 
export function genQ12() {
  const forms = ["neg-base", "neg-neg-base", "neg-pos-base"];
  const f1 = randChoice(forms);
  let f2;
  do { f2 = randChoice(forms); } while (f2 === f1);
  const p1 = makeNegPow(f1), p2 = makeNegPow(f2);
  return {
    type: "q12", topic: 12,
    prob1: p1, prob2: p2,
    answer: JSON.stringify({ ans1: p1.answer, ans2: p2.answer }),
    displayAnswer: "Expr 1: " + p1.answer + ",  Expr 2: " + p2.answer,
    prompt: "Evaluate each expression."
  };
}
function makeNegPow(form) {
  const a = randInt(2, 9), n = randInt(2, 3);
  let expr, answer;
  if (form === "neg-base") {
    answer = Math.pow(-a, n);
    expr = "(-" + a + ")^" + n;
  } else if (form === "neg-neg-base") {
    answer = -Math.pow(-a, n);
    expr = "-(-" + a + ")^" + n;
  } else {
    answer = -Math.pow(a, n);
    expr = "-(" + a + "^" + n + ")";
  }
  return { form, a, n, expr, answer: String(answer) };
}

//  Q13: Product of Exponential Expressions 
export function genQ13() {
  const v = randChoice(["x", "y", "n", "a"]);
  const count = randInt(3, 4);
  const exponents = [1];
  for (let i = 1; i < count; i++) exponents.push(randInt(2, 5));
  const shuffled = exponents.sort(() => Math.random() - 0.5);
  const total = shuffled.reduce((s, e) => s + e, 0);
  const factors = shuffled.map(e => e === 1 ? v : v + "^" + e);
  return {
    type: "q13", topic: 13,
    variable: v, exponents: shuffled, total,
    expr: factors.join(" * "),
    answer: v + "^" + total,
    displayAnswer: v + "^" + total,
    prompt: "Simplify the expression."
  };
}

//  Q14: Evaluate Variable Expression (Addition) 
export function genQ14() {
  const vars = ["x", "y", "n", "a", "b"];
  const v1 = randChoice(vars), v2 = randChoice(vars.filter(v => v !== v1));
  const c = randInt(2, 9);
  const val1 = randInt(1, 10), val2 = randInt(1, 10);
  const useProduct = Math.random() < 0.5;
  let expr, answer;
  if (useProduct) {
    expr = v1 + " + " + c + v2;
    answer = val1 + c * val2;
  } else {
    expr = v1 + " + " + v2 + "/" + c;
    if (val2 % c !== 0) return genQ14();
    answer = val1 + val2 / c;
  }
  return {
    type: "q14", topic: 14,
    expr, v1, v2, val1, val2, c, answer: String(answer),
    given: v1 + " = " + val1 + ", " + v2 + " = " + val2,
    prompt: "Evaluate the expression."
  };
}

//  Q15: Evaluate Variable Expression (Subtraction) 
export function genQ15() {
  const vars = ["x", "y", "n", "a", "b"];
  const v1 = randChoice(vars), v2 = randChoice(vars.filter(v => v !== v1));
  const c = randInt(2, 9);
  const firstNeg = Math.random() < 0.5;
  const val1 = firstNeg ? -randInt(1, 10) : randInt(1, 10);
  const val2 = !firstNeg ? -randInt(1, 10) : randInt(1, 10);
  const coeffFirst = Math.random() < 0.5;
  let expr, answer;
  if (coeffFirst) {
    expr = c + v1 + " - " + v2;
    answer = c * val1 - val2;
  } else {
    expr = v1 + " - " + c + v2;
    answer = val1 - c * val2;
  }
  return {
    type: "q15", topic: 15,
    expr, v1, v2, val1, val2, c, answer: String(answer),
    given: v1 + " = " + val1 + ", " + v2 + " = " + val2,
    prompt: "Evaluate the expression."
  };
}

//  Q16: Distributive Property 
export function genQ16() {
  let a;
  do { a = randInt(-9, 9); } while (a === 0 || a === 1);
  const b = randInt(2, 9);
  const v = randChoice(["x", "y", "n"]);
  const op = Math.random() < 0.5 ? "+" : "-";
  const leftSide = (a === -1) ? true : Math.random() < 0.5;
  const aStr = a === -1 ? "-" : String(a);
  const inner = v + (op === "+" ? " + " : " - ") + b;
  let expr, latex;
  if (leftSide) {
    expr = aStr + "(" + inner + ")";
    latex = aStr + "(" + inner + ")";
  } else {
    const aRight = (a < -1) ? "(" + a + ")" : aStr;
    expr = "(" + inner + ")" + aRight;
    latex = "(" + inner + ")" + aRight;
  }
  const ab = op === "+" ? a * b : -a * b;
  const avStr = a === -1 ? "-" + v : a + v;
  const answerStr = avStr + (ab >= 0 ? " + " : " - ") + Math.abs(ab);
  const answerLatex = avStr + (ab >= 0 ? " + " : " - ") + Math.abs(ab);
  return {
    type: "q16", topic: 16,
    a, b, op, v, expr, latex,
    answer: avStr + (ab >= 0 ? "+" : "-") + Math.abs(ab),
    displayAnswer: answerStr,
    answerLatex,
    prompt: "Use the distributive property to simplify."
  };
}

//  Q17: Factor GCF 
export function genQ17() {
  const g = randInt(2, 9);
  const v = randChoice(["x", "y", "n", "a"]);
  let c1, c2;
  do {
    c1 = randInt(2, 9); c2 = randInt(1, 9);
  } while (gcd(c1, c2) !== 1 || c1 === c2);
  const a = g * c1, b = g * c2;
  const op = Math.random() < 0.5 ? "+" : "-";
  const expr = a + v + (op === "+" ? " + " : " - ") + b;
  const inner = c1 + v + (op === "+" ? " + " : " - ") + c2;
  return {
    type: "q17", topic: 17,
    g, c1, c2, a, b, op, v, expr,
    answer: g + "(" + c1 + v + (op === "+" ? "+" : "-") + c2 + ")",
    displayAnswer: g + "(" + inner + ")",
    prompt: "Factor out the GCF."
  };
}

//  Q18: One-Step Equation (Add/Sub) 
export function genQ18() {
  const v = "x";
  const forms = ["x+a=b", "a+x=b", "x-a=b", "b=x+a", "b=x-a"];
  const form = randChoice(forms);
  const x = randInt(-15, 15) || 1;
  const a = randInt(-15, 15) || 1;
  let b, expr;
  if (form === "x+a=b" || form === "a+x=b") {
    b = x + a;
    expr = form === "x+a=b"
      ? v + (a >= 0 ? " + " + a : " - " + Math.abs(a)) + " = " + b
      : a + " + " + v + " = " + b;
  } else if (form === "x-a=b") {
    b = x - a;
    expr = v + (a >= 0 ? " - " + a : " + " + Math.abs(a)) + " = " + b;
  } else if (form === "b=x+a") {
    b = x + a;
    expr = b + " = " + v + (a >= 0 ? " + " + a : " - " + Math.abs(a));
  } else {
    b = x - a;
    expr = b + " = " + v + (a >= 0 ? " - " + a : " + " + Math.abs(a));
  }
  return { type: "q18", topic: 18, form, expr, answer: String(x), prompt: "Solve for x." };
}

//  Q19: One-Step Equation (Mul/Div) 
export function genQ19() {
  const isMul = Math.random() < 0.5;
  const a = randInt(-9, 9) || 2;
  let expr, latex, x;
  if (isMul) {
    // ax = b  =>  x = b/a, pick x as integer
    x = randInt(-15, 15) || 1;
    const b = a * x;
    expr = a + "x = " + b;
    latex = a + "x = " + b;
  } else {
    // x/a = b  =>  x = a*b, pick b as integer so x = a*b is always exact
    const b = randInt(-15, 15) || 1;
    x = a * b;
    expr = "x/" + a + " = " + b;
    latex = "\\dfrac{x}{" + a + "} = " + b;
  }
  return { type: "q19", topic: 19, isMul, a, expr, latex, answer: String(x), prompt: "Solve for x." };
}

//  Q20: Two-Step Equation 
export function genQ20() {
  const isFrac = Math.random() < 0.5;
  const a = randInt(2, 9);
  const b = randInt(-15, 15) || 1;
  const c = randInt(-20, 20) || 1;
  const bPart = b >= 0 ? " + " + b : " - " + Math.abs(b);
  let x, expr, latex;
  if (isFrac) {
    // x/a + b = c  =>  x = (c - b) * a
    x = (c - b) * a;
    expr = "x/" + a + bPart + " = " + c;
    latex = "\\dfrac{x}{" + a + "}" + bPart + " = " + c;
  } else {
    // ax + b = c  =>  x = (c - b) / a
    const [n, d] = simplifyFrac(c - b, a);
    x = fracStr(n, d);
    expr = a + "x" + bPart + " = " + c;
    latex = a + "x" + bPart + " = " + c;
  }
  return {
    type: "q20", topic: 20, isFrac, a, b, c, expr, latex,
    answer: String(x),
    prompt: "Solve for x. Give answer as fraction if needed.",
  };
}

//  Q21: Two-Step with Like Terms 
export function genQ21() {
  const a = randInt(2, 9), c2 = randInt(2, 9);
  const b = randInt(-15, 15) || 1, rhs = randInt(-20, 20) || 1;
  const sub2 = Math.random() < 0.5;
  const combined = sub2 ? a - c2 : a + c2;
  if (combined === 0) return genQ21();
  const numX = rhs - b;
  const [n, d] = simplifyFrac(numX, combined);
  const bPart = b >= 0 ? " + " + b : " - " + Math.abs(b);
  const c2Part = sub2 ? " - " : " + ";
  const expr = a + "x" + bPart + c2Part + c2 + "x = " + rhs;
  const latex = a + "x" + bPart + c2Part + c2 + "x = " + rhs;
  return {
    type: "q21", topic: 21, expr, latex,
    answer: fracStr(n, d),
    prompt: "Combine like terms and solve for x. Give answer as fraction if needed."
  };
}

//  Q22: Equation with Distributive Property 
export function genQ22() {
  const a = randInt(2, 9) * randChoice([-1, 1]);
  const b = randInt(1, 9);
  const c = randInt(2, 9) * randChoice([-1, 1]);
  const d = randInt(1, 20) * randChoice([-1, 1]);
  // a(x + b) = cx + d => ax + ab = cx + d => (a-c)x = d - ab
  const coeff = a - c;
  if (coeff === 0) return genQ22();
  const rhs = d - a * b;
  const [n, den] = simplifyFrac(rhs, coeff);
  const op = b >= 0 ? "+" : "-";
  const dPart = d >= 0 ? " + " + d : " - " + Math.abs(d);
  const expr = a + "(x " + op + " " + Math.abs(b) + ") = " + c + "x" + dPart;
  const latex = a + "(x " + op + " " + Math.abs(b) + ") = " + c + "x" + dPart;
  return {
    type: "q22", topic: 22, a, b, c, d, expr, latex,
    answer: fracStr(n, den),
    prompt: "Solve for x. Give answer as fraction if needed."
  };
}

//  Q23: Graph Inequality on Number Line 
export function genQ23() {
  const ops = ["<", ">", "<=", ">="];
  const op = randChoice(ops);
  const val = randInt(-10, 10);
  const filled = op === "<=" || op === ">=";
  const shadeRight = op === ">" || op === ">=";
  const opDisplay = op === "<=" ? "<=" : op === ">=" ? ">=" : op;
  return {
    type: "q23", topic: 23,
    op, val, filled, shadeRight,
    expr: "x " + opDisplay + " " + val,
    prompt: "Graph the inequality on the number line.",
    answer: { val, filled, shadeRight }
  };
}

//  Q24: Solve Inequality (Negative Coefficient) 
export function genQ24() {
  const ops = ["<", ">", "<=", ">="];
  const op = randChoice(ops);
  const flipMap = { "<": ">", ">": "<", "<=": ">=", ">=": "<=" };
  const a = -randInt(2, 9);
  const b = randInt(-15, 15);
  const c = randInt(-20, 20);
  const flipped = flipMap[op];
  const bOp = b >= 0 ? " + " + b : " - " + Math.abs(b);
  const expr = a + "x" + bOp + " " + op + " " + c;
  const [n, d] = simplifyFrac(c - b, a);
  const opLatex = { "<": "<", ">": ">", "<=": "\\leq", ">=": "\\geq" };
  const latex = a + "x" + bOp + " " + opLatex[op] + " " + c;
  const opSymbol = { "<": "<", ">": ">", "<=": "\u2264", ">=": "\u2265" };
  const ansVal = fracStr(n, d);
  return {
    type: "q24", topic: 24,
    a, b, c, op, expr, latex,
    answerOp: flipped,
    answerVal: ansVal,
    answer: flipped + " " + ansVal,
    displayAnswer: "x " + opSymbol[flipped] + " " + ansVal,
    prompt: "Solve the inequality."
  };
}

//  Q25: Simplify Fraction 
export function genQ25() {
  const g = randInt(2, 9);
  let n, d;
  do {
    n = randInt(2, 12); d = randInt(2, 12);
  } while (gcd(n, d) !== 1 || n === d || (n < 10 && d < 10));
  const bigN = n * g, bigD = d * g;
  return {
    type: "q25", topic: 25,
    n: bigN, d: bigD,
    answer: fracStr(n, d),
    prompt: "Simplify the fraction."
  };
}

//  Q26: Simplify Exponential Expression (Variable) 
export function genQ26() {
  const v = randChoice(["x", "y", "n", "a"]);
  let n, m;
  do { n = randInt(1, 8); m = randInt(1, 8); } while (n === m);
  let answer;
  if (n > m) {
    answer = v + "^" + (n - m);
  } else {
    answer = "1/" + v + "^" + (m - n);
  }
  return {
    type: "q26", topic: 26,
    v, n, m,
    expr: v + "^" + n + "/" + v + "^" + m,
    answer,
    prompt: "Simplify the expression."
  };
}

//  Q27: Multiply Two Fractions 
export function genQ27() {
  let n1, d1, n2, d2, rn, rd;
  let attempts = 0;
  do {
    n1 = randInt(2, 15); d1 = randInt(2, 15);
    n2 = randInt(2, 15); d2 = randInt(2, 15);
    if (n1 > 9 && n2 > 9) { attempts++; continue; }
    if (d1 > 9 && d2 > 9) { attempts++; continue; }
    const g1 = gcd(n1, d2), g2 = gcd(n2, d1);
    if (g1 === 1 && g2 === 1) { attempts++; continue; }
    [rn, rd] = simplifyFrac(n1 * n2, d1 * d2);
    if (rn > 50 || rd > 50) { attempts++; continue; }
    break;
  } while (attempts < 500);
  return {
    type: "q27", topic: 27,
    n1, d1, n2, d2,
    answer: fracStr(rn, rd),
    prompt: "Multiply and simplify."
  };
}

//  Q28: Divide Two Fractions 
export function genQ28() {
  let n1, d1, n2, d2, rn, rd;
  let attempts = 0;
  do {
    n1 = randInt(2, 15); d1 = randInt(2, 15);
    n2 = randInt(2, 15); d2 = randInt(2, 15);
    if (n1 > 9 && n2 > 9) { attempts++; continue; }
    if (d1 > 9 && d2 > 9) { attempts++; continue; }
    [rn, rd] = simplifyFrac(n1 * d2, d1 * n2);
    if (rn > 50 || rd > 50) { attempts++; continue; }
    if (gcd(n1 * d2, d1 * n2) === 1) { attempts++; continue; }
    break;
  } while (attempts < 500);
  return {
    type: "q28", topic: 28,
    n1, d1, n2, d2,
    answer: fracStr(rn, rd),
    prompt: "Divide and simplify."
  };
}

//  Q29: Equivalent Fractions 
export function genQ29() {
  let n, d;
  do { n = randInt(1, 9); d = randInt(2, 9); } while (n === d || gcd(n, d) !== 1);
  const k = randInt(2, 9);
  const bigN = n * k, bigD = d * k;
  const missingPos = randInt(0, 3);
  const nums = [n, d, bigN, bigD];
  const missing = nums[missingPos];
  nums[missingPos] = null;
  return {
    type: "q29", topic: 29,
    small: [n, d], big: [bigN, bigD], k, missingPos,
    nums, answer: String(missing),
    prompt: "Find the missing number."
  };
}

//  Q30: Add/Subtract Fractions (Different Denominators) 
export function genQ30() {
  let n1, d1, n2, d2;
  do {
    d1 = randInt(2, 10); d2 = randInt(2, 10);
    n1 = randInt(1, d1 - 1); n2 = randInt(1, d2 - 1);
  } while (d1 === d2 || d1 > 10 || d2 > 10 || n1 > 10 || n2 > 10);
  const op = Math.random() < 0.5 ? "+" : "-";
  const L = lcm(d1, d2);
  const rn = op === "+" ? n1 * (L / d1) + n2 * (L / d2) : n1 * (L / d1) - n2 * (L / d2);
  const [an, ad] = simplifyFrac(Math.abs(rn), L);
  const sign = rn < 0 ? "-" : "";
  let answerStr;
  if (ad === 1) {
    answerStr = sign + an;
  } else if (an > ad) {
    const whole = Math.floor(an / ad);
    const rem = an % ad;
    answerStr = sign + (rem === 0 ? String(whole) : whole + " " + rem + "/" + ad);
  } else {
    // proper fraction - retry so answer is always a mixed number with whole > 0
    return genQ30();
  }
  return {
    type: "q30", topic: 30,
    n1, d1, n2, d2, op,
    answer: answerStr,
    prompt: op === "+" ? "Add the fractions and simplify." : "Subtract the fractions and simplify."
  };
}

//  Q31: Multiply Mixed Numbers 
export function genQ31() {
  let w1, f1n, f1d, w2, f2n, f2d, rn, rd, rw;
  let attempts = 0;
  do {
    f1d = randInt(2, 9); f2d = randInt(2, 9);
    if (f1d === f2d) { attempts++; continue; }
    w1 = randInt(1, 5); f1n = randInt(1, f1d - 1);
    const useMixed2 = Math.random() < 0.5;
    if (useMixed2) {
      w2 = randInt(1, 5); f2n = randInt(1, f2d - 1);
    } else {
      w2 = 0; f2n = randInt(1, f2d - 1);
    }
    if (w1 + f1n / f1d >= 6 || (w2 + f2n / f2d) >= 6) { attempts++; continue; }
    const imp1 = w1 * f1d + f1n, imp2 = w2 * f2d + f2n;
    const prodN = imp1 * imp2, prodD = f1d * f2d;
    const g = gcd(prodN, prodD);
    rn = prodN / g; rd = prodD / g;
    rw = Math.floor(rn / rd);
    if (rw < 1) { attempts++; continue; }
    const rem = rn % rd;
    if (rem === 0) { attempts++; continue; }
    if (gcd(imp1, f2d) === 1 && gcd(imp2, f1d) === 1) { attempts++; continue; }
    break;
  } while (attempts < 500);
  const rFracN = rn % rd;
  const answer = rw + " " + rFracN + "/" + rd;
  return {
    type: "q31", topic: 31,
    w1, f1n, f1d, w2, f2n, f2d,
    mixed1: w1 + " " + f1n + "/" + f1d,
    mixed2: w2 > 0 ? w2 + " " + f2n + "/" + f2d : f2n + "/" + f2d,
    answer, prompt: "Multiply. Give answer as a mixed number."
  };
}

//  Q32: Add/Subtract Mixed Numbers (Same Denominator) 
export function genQ32() {
  const d = randInt(2, 9);
  const op = Math.random() < 0.5 ? "+" : "-";
  let w1, f1n, w2, f2n, rw, rfn;
  do {
    w1 = randInt(1, 10); f1n = randInt(1, d - 1);
    w2 = randInt(1, 10); f2n = randInt(1, d - 1);
    rw = op === "+" ? w1 + w2 : w1 - w2;
    rfn = op === "+" ? f1n + f2n : f1n - f2n;
  } while (
    (w1 === w2 && f1n === f2n) ||
    (op === "+" && f1n + f2n >= d) ||
    (op === "-" && (w1 <= w2 || f1n < f2n)) ||
    rw < 2
  );
  const answer = rw + " " + rfn + "/" + d;
  return {
    type: "q32", topic: 32,
    w1, f1n, w2, f2n, d, op,
    mixed1: w1 + " " + f1n + "/" + d,
    mixed2: w2 + " " + f2n + "/" + d,
    answer, prompt: op === "+" ? "Add the mixed numbers." : "Subtract the mixed numbers."
  };
}

//  Q33: Mixed Number Subtraction with Borrowing 
export function genQ33() {
  const d = randInt(2, 9);
  let w1, f1n, w2, f2n;
  do {
    w1 = randInt(2, 10); f1n = randInt(0, d - 1);
    w2 = randInt(1, w1);  f2n = randInt(1, d - 1);
  } while (f1n >= f2n || w1 - w2 < 0);
  const borrowedF = f1n + d - f2n;
  const rw = w1 - 1 - w2;
  const answer = rw + " " + borrowedF + "/" + d;
  return {
    type: "q33", topic: 33,
    w1, f1n, w2, f2n, d,
    mixed1: w1 + (f1n > 0 ? " " + f1n + "/" + d : ""),
    mixed2: w2 + " " + f2n + "/" + d,
    answer, prompt: "Subtract. Give answer as a mixed number."
  };
}

//  Q34: Equation with Fractions 
export function genQ34() {
  const forms = ["var-both", "var-const", "frac-const"];
  const form = randChoice(forms);
  let expr, latex, answer;
  if (form === "var-both") {
    const a = randInt(2, 9), b = randInt(2, 9), c = randInt(2, 9);
    if (a === b || b === c || a === c) return genQ34();
    expr = "x/" + a + " + x/" + b + " = x/" + c;
    latex = "\\dfrac{x}{" + a + "} + \\dfrac{x}{" + b + "} = \\dfrac{x}{" + c + "}";
    answer = "0";
  } else if (form === "var-const") {
    const a = randInt(2, 9), b = randInt(2, 9), c = randInt(1, 20);
    const op = Math.random() < 0.5 ? "+" : "-";
    const L = lcm(a, b);
    const coeffN = op === "+" ? L / a - L / b : -(L / a) + L / b;
    if (coeffN === 0) return genQ34();
    const [n, d] = simplifyFrac(op === "+" ? c * L : -c * L, coeffN);
    answer = fracStr(n, d);
    expr = "x/" + a + (op === "+" ? " + " : " - ") + c + " = x/" + b;
    latex = "\\dfrac{x}{" + a + "}" + (op === "+" ? " + " : " - ") + c + " = \\dfrac{x}{" + b + "}";
  } else {
    const a = randInt(2, 9), b = randInt(2, 9), c = randInt(2, 9), d = randInt(1, 9);
    if (a === c) return genQ34();
    const L = lcm(a, c);
    const coeffN = L / a - L / c;
    if (coeffN === 0) return genQ34();
    const rhs = (b * d) % c === 0 ? b * d / c : b / c;
    const [n, den] = simplifyFrac(Math.round(rhs * L), coeffN);
    answer = fracStr(n, den);
    expr = "x/" + a + " + " + b + "/" + c + " = x/" + d;
    latex = "\\dfrac{x}{" + a + "} + \\dfrac{" + b + "}{" + c + "} = \\dfrac{x}{" + d + "}";
  }
  const ansNum = parseFloat(answer);
  if (!isNaN(ansNum) && ansNum <= 1) return genQ34();
  return { type: "q34", topic: 34, form, expr, latex, answer, prompt: "Solve for x. Give answer as fraction if needed." };
}

//  Q35: Decimal Subtraction 
export function genQ35() {
  let a, b, aStr, bStr;
  do {
    const aDecimals = randInt(0, 1);
    const bDecimals = aDecimals + randInt(1, 2 - aDecimals);
    const aWhole = randInt(1, 9);
    const bWhole = randInt(0, 9);
    const aFrac = aDecimals > 0 ? randInt(1, 9) : 0;
    const bFrac = randInt(10, 99);
    a = aWhole + aFrac / Math.pow(10, aDecimals);
    b = bWhole + bFrac / Math.pow(10, bDecimals);
    if (a <= b) continue;
    aStr = aDecimals === 0 ? String(aWhole) : aWhole + "." + aFrac;
    bStr = bWhole + "." + String(bFrac).padStart(bDecimals, "0");
    const result = Math.round((a - b) * 1000) / 1000;
    if (result <= 0) continue;
    return {
      type: "q35", topic: 35,
      a: aStr, b: bStr,
      answer: String(result),
      prompt: "Find the difference.",
      display: { type: "decimal-subtract", a: aStr, b: bStr }
    };
  } while (true);
}

//  Q36: Decimal Multiplication 
export function genQ36() {
  const places1 = randInt(1, 2), places2 = randInt(1, 2);
  const scale1 = Math.pow(10, places1), scale2 = Math.pow(10, places2);
  const n1 = randInt(Math.ceil(scale1 * 1.0), Math.floor(scale1 * 9.9));
  const n2 = randInt(Math.ceil(scale2 * 1.0), Math.floor(scale2 * 9.9));
  const a = n1 / scale1, b = n2 / scale2;
  const result = Math.round(a * b * 10000) / 10000;
  return {
    type: "q36", topic: 36,
    a: String(a), b: String(b),
    answer: String(result),
    prompt: "Find the product.",
    display: { type: "decimal-multiply", a: String(a), b: String(b) }
  };
}

//  Q37: Decimal Division 
function decimalDivision(dividendInt, divisorInt) {
  // Long division to find exact decimal representation
  // Returns { whole, nonRep, rep } where answer = whole.nonRepreprepre...
  // e.g. 1/3 => { whole:0, nonRep:"", rep:"3" }
  // e.g. 1/6 => { whole:0, nonRep:"1", rep:"6" }
  // e.g. 1/4 => { whole:0, nonRep:"25", rep:"" }
  let quotient = Math.floor(dividendInt / divisorInt);
  let remainder = dividendInt % divisorInt;
  if (remainder === 0) return { whole: quotient, nonRep: "", rep: "" };
  const digits = [];
  const remainderMap = {};
  let repStart = -1;
  while (remainder !== 0) {
    if (remainderMap[remainder] !== undefined) { repStart = remainderMap[remainder]; break; }
    remainderMap[remainder] = digits.length;
    remainder *= 10;
    digits.push(Math.floor(remainder / divisorInt));
    remainder = remainder % divisorInt;
  }
  if (repStart === -1) {
    return { whole: quotient, nonRep: digits.join(""), rep: "" };
  } else {
    return { whole: quotient, nonRep: digits.slice(0, repStart).join(""), rep: digits.slice(repStart).join("") };
  }
}

export function genQ37() {
  // Pick a simple division that produces an interesting result
  // dividendInt / divisorInt where result is between 0.1 and 99
  let dividendInt, divisorInt, result;
  let attempts = 0;
  do {
    // Mix terminating and repeating: use divisors that sometimes repeat
    const divisors = [2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 15];
    divisorInt = divisors[Math.floor(Math.random() * divisors.length)];
    dividendInt = randInt(1, divisorInt * 20);
    // Avoid trivial cases
    if (dividendInt % divisorInt === 0) { attempts++; continue; }
    result = decimalDivision(dividendInt, divisorInt);
    // Keep non-repeating part short
    if (result.nonRep.length > 3 || result.rep.length > 3) { attempts++; continue; }
    break;
  } while (attempts < 200);

  const wholeStr = result.whole > 0 ? String(result.whole) + "." : "0.";
  const displayAnswer = wholeStr + result.nonRep + (result.rep ? result.rep + "..." : "");
  // Store answer as "whole.nonRep|rep" or "whole.nonRep" if terminating
  const answerCode = (result.whole + "." + result.nonRep + (result.rep ? "|" + result.rep : ""))
    .replace(/^(\d+)\.$/, "$1"); // clean up "3." -> "3" for whole numbers

  return {
    type: "q37", topic: 37,
    dividendInt, divisorInt,
    dividend: String(dividendInt), divisor: String(divisorInt),
    latex: dividendInt + " \\div " + divisorInt,
    answer: answerCode,
    displayAnswer,
    repeating: result.rep || null,
    prompt: "Find the quotient. Use the repeating bar button if needed."
  };
}

//  Q38: Ratio Word Problems 
const RATIO_CONTEXTS = [
  { story: (a, b) => "There are " + (a+b) + " students in a class. " + a + " are girls and the rest are boys.",
    qa: "What is the ratio of all students to boys?", qb: "What is the ratio of boys to girls?",
    ansa: (a, b) => ratio(a+b, b), ansb: (a, b) => ratio(b, a) },
  { story: (a, b) => "A bag has " + a + " red marbles and " + b + " blue marbles.",
    qa: "What is the ratio of red to total marbles?", qb: "What is the ratio of blue to red marbles?",
    ansa: (a, b) => ratio(a, a+b), ansb: (a, b) => ratio(b, a) },
  { story: (a, b) => "A farm has " + a + " cows and " + b + " chickens.",
    qa: "What is the ratio of cows to total animals?", qb: "What is the ratio of chickens to cows?",
    ansa: (a, b) => ratio(a, a+b), ansb: (a, b) => ratio(b, a) },
  { story: (a, b) => "A box has " + a + " apples and " + b + " oranges.",
    qa: "What is the ratio of all fruit to apples?", qb: "What is the ratio of oranges to apples?",
    ansa: (a, b) => ratio(a+b, a), ansb: (a, b) => ratio(b, a) },
  { story: (a, b) => "A team scored " + a + " goals and conceded " + b + " goals.",
    qa: "What is the ratio of goals scored to total goals?", qb: "What is the ratio of goals conceded to scored?",
    ansa: (a, b) => ratio(a, a+b), ansb: (a, b) => ratio(b, a) },
  { story: (a, b) => "A bookshelf has " + a + " fiction and " + b + " non-fiction books.",
    qa: "What is the ratio of total books to fiction?", qb: "What is the ratio of non-fiction to fiction?",
    ansa: (a, b) => ratio(a+b, a), ansb: (a, b) => ratio(b, a) },
  { story: (a, b) => "A parking lot has " + a + " cars and " + b + " trucks.",
    qa: "What is the ratio of cars to total vehicles?", qb: "What is the ratio of trucks to cars?",
    ansa: (a, b) => ratio(a, a+b), ansb: (a, b) => ratio(b, a) },
  { story: (a, b) => "A garden has " + a + " roses and " + b + " tulips.",
    qa: "What is the ratio of all flowers to roses?", qb: "What is the ratio of tulips to roses?",
    ansa: (a, b) => ratio(a+b, a), ansb: (a, b) => ratio(b, a) },
  { story: (a, b) => "A class has " + a + " passing and " + b + " failing students.",
    qa: "What is the ratio of passing to total students?", qb: "What is the ratio of failing to passing?",
    ansa: (a, b) => ratio(a, a+b), ansb: (a, b) => ratio(b, a) },
  { story: (a, b) => "A store sold " + a + " shirts and " + b + " pants.",
    qa: "What is the ratio of total items to shirts?", qb: "What is the ratio of pants to shirts?",
    ansa: (a, b) => ratio(a+b, a), ansb: (a, b) => ratio(b, a) },
];
function ratio(a, b) { const g = gcd(a, b); return (a/g) + ":" + (b/g); }
export function genQ38() {
  const ctx = randChoice(RATIO_CONTEXTS);
  const a = randInt(3, 12), b = randInt(3, 12);
  const ansa = ctx.ansa(a, b), ansb = ctx.ansb(a, b);
  return {
    type: "q38", topic: 38,
    story: ctx.story(a, b), qa: ctx.qa, qb: ctx.qb,
    ansa, ansb,
    answer: JSON.stringify({ ansa, ansb }),
    displayAnswer: "(a) " + ansa + "   (b) " + ansb,
    prompt: ctx.story(a, b)
  };
}

//  Q39: Proportion Word Problems 
const PROPORTION_CONTEXTS = [
  { template: (a, b, c) => "Karen earns $" + b + " in " + a + " hours. How much will she earn in " + c + " hours?", unit: "dollars" },
  { template: (a, b, c) => "A car travels " + a + " miles in " + b + " hours. How many miles in " + c + " hours?", unit: "miles" },
  { template: (a, b, c) => a + " kg of apples cost $" + b + ". How much do " + c + " kg cost?", unit: "dollars" },
  { template: (a, b, c) => "A machine makes " + a + " parts in " + b + " minutes. How many parts in " + c + " minutes?", unit: "parts" },
  { template: (a, b, c) => "A recipe uses " + b + "g of flour for " + a + " cookies. How much flour for " + c + " cookies?", unit: "grams" },
  { template: (a, b, c) => a + " workers build " + b + " houses in a week. How many houses can " + c + " workers build?", unit: "houses" },
  { template: (a, b, c) => "A printer prints " + a + " pages in " + b + " minutes. How many pages in " + c + " minutes?", unit: "pages" },
  { template: (a, b, c) => a + " liters of gas cost $" + b + ". How much do " + c + " liters cost?", unit: "dollars" },
  { template: (a, b, c) => "A train travels " + a + " km in " + b + " hours. How many km in " + c + " hours?", unit: "km" },
  { template: (a, b, c) => a + " books cost $" + b + ". How much do " + c + " books cost?", unit: "dollars" },
];
export function genQ39() {
  const ctx = randChoice(PROPORTION_CONTEXTS);
  let a, b, c, answer;
  do {
    a = randInt(3, 9);
    const unitRate = randInt(11, 19);
    b = unitRate * a;
    // c is a larger quantity of same type as a, answer = c * unitRate
    c = randInt(a + 1, 2 * a - 1);
    answer = c * unitRate;
  } while (answer % 10 === 0);
  return {
    type: "q39", topic: 39,
    story: ctx.template(a, b, c), unit: ctx.unit,
    a, b, c, answer: String(answer),
    prompt: ctx.template(a, b, c)
  };
}

//  Q40: Decimal to Fraction 
export function genQ40() {
  const useQuarter = Math.random() < 0.4;
  let dec, answer;
  if (useQuarter) {
    const quarters = randInt(1, 3);
    dec = (quarters * 0.25).toFixed(2);
    const [n, d] = simplifyFrac(quarters, 4);
    answer = fracStr(n, d);
  } else {
    const digit = randInt(1, 9);
    dec = "0." + digit;
    const [n, d] = simplifyFrac(digit, 10);
    answer = fracStr(n, d);
  }
  return { type: "q40", topic: 40, dec, answer, prompt: "Convert to a simplified fraction." };
}

//  Q41: Decimal to Percent 
export function genQ41() {
  const n = randInt(1, 99);
  const dec = n < 10 ? "0.0" + n : "0." + n;
  const answer = n + "%";
  return { type: "q41", topic: 41, dec, answer, prompt: "Convert to percent notation." };
}

//  Q42: Find Percent of a Number 
export function genQ42() {
  const a = randInt(1, 9) * 10;
  let b;
  do { b = randInt(11, 99); } while (b % 10 === 0);
  const result = Math.round(a * b) / 100;
  return {
    type: "q42", topic: 42,
    a, b, answer: String(result),
    prompt: "Find " + a + "% of " + b + "."
  };
}

//  Q43: Metric Distance Conversion 
const METRIC_CONTEXTS = [
  (v, from, to) => "A cable is " + v + " " + from + " long. How long is it in " + to + "?",
  (v, from, to) => "A road is " + v + " " + from + " long. Convert this to " + to + ".",
  (v, from, to) => "A river is " + v + " " + from + " long. What is this in " + to + "?",
  (v, from, to) => "A building is " + v + " " + from + " tall. Express this in " + to + ".",
  (v, from, to) => "A shelf is " + v + " " + from + " wide. How wide is it in " + to + "?",
  (v, from, to) => "A swimming pool is " + v + " " + from + " long. Convert to " + to + ".",
  (v, from, to) => "A hallway is " + v + " " + from + " long. What is this in " + to + "?",
  (v, from, to) => "A field is " + v + " " + from + " wide. Express in " + to + ".",
  (v, from, to) => "A tunnel is " + v + " " + from + " long. How long in " + to + "?",
  (v, from, to) => "A bridge is " + v + " " + from + " long. Convert to " + to + ".",
];
const METRIC_FACTORS = { km: 1000, m: 1, dm: 0.1, cm: 0.01, mm: 0.001 };
export function genQ43() {
  const fromUnit = Math.random() < 0.5 ? "km" : "m";
  const toUnits = Object.keys(METRIC_FACTORS).filter(u => u !== fromUnit);
  const toUnit = randChoice(toUnits);
  const val = fromUnit === "km" ? randInt(1, 10) : randInt(1, 100);
  const inMeters = val * METRIC_FACTORS[fromUnit];
  const result = inMeters / METRIC_FACTORS[toUnit];
  const ctx = randChoice(METRIC_CONTEXTS);
  return {
    type: "q43", topic: 43,
    story: ctx(val, fromUnit, toUnit),
    fromUnit, toUnit, val,
    answerNum: String(result), answerUnit: toUnit,
    answer: String(result) + " " + toUnit,
    units: ["mm", "cm", "dm", "m", "km"],
    prompt: ctx(val, fromUnit, toUnit)
  };
}

//  Q44: US Customary Conversion 
const VOLUME_CONTEXTS = [
  (v, f, t) => "A container holds " + v + " " + f + " of juice. How much is this in " + t + "?",
  (v, f, t) => "A pitcher has " + v + " " + f + " of water. Convert to " + t + ".",
  (v, f, t) => "A tank holds " + v + " " + f + " of oil. What is this in " + t + "?",
  (v, f, t) => "A bottle contains " + v + " " + f + " of milk. Express in " + t + ".",
  (v, f, t) => "A jug holds " + v + " " + f + " of lemonade. How many " + t + " is this?",
];
const LENGTH_CONTEXTS = [
  (v, f, t) => "Yoko cut " + v + " " + f + " of tape. How much is this in " + t + "?",
  (v, f, t) => "A rope is " + v + " " + f + " long. Convert to " + t + ".",
  (v, f, t) => "A board is " + v + " " + f + " long. What is this in " + t + "?",
  (v, f, t) => "A path is " + v + " " + f + " long. Express in " + t + ".",
  (v, f, t) => "A ribbon is " + v + " " + f + " long. How many " + t + " is this?",
];
const MASS_CONTEXTS = [
  (v, f, t) => "Leila caught a " + v + " " + f + " fish. How much did it weigh in " + t + "?",
  (v, f, t) => "A package weighs " + v + " " + f + ". Convert to " + t + ".",
  (v, f, t) => "A bag of flour weighs " + v + " " + f + ". What is this in " + t + "?",
  (v, f, t) => "A baby weighs " + v + " " + f + ". Express in " + t + ".",
  (v, f, t) => "A stone weighs " + v + " " + f + ". How many " + t + " is this?",
];
const VOLUME_CONV = { "fl oz": 1, "c": 8, "pt": 16, "qt": 32, "gal": 128 };
const LENGTH_CONV = { "in": 1, "ft": 12, "yd": 36 };
const MASS_CONV = { "oz": 1, "lb": 16 };
export function genQ44() {
  const category = randChoice(["volume", "length", "mass"]);
  let conv, contexts, units, fromUnit, toUnit, val;
  if (category === "volume") {
    conv = VOLUME_CONV; contexts = VOLUME_CONTEXTS;
    units = ["fl oz", "c", "pt", "qt", "gal"];
    fromUnit = randChoice(["qt", "gal", "pt"]);
    toUnit = randChoice(units.filter(u => u !== fromUnit));
    val = randInt(2, 10);
  } else if (category === "length") {
    conv = LENGTH_CONV; contexts = LENGTH_CONTEXTS;
    units = ["in", "ft", "yd"];
    fromUnit = randChoice(["ft", "yd"]);
    toUnit = randChoice(units.filter(u => u !== fromUnit));
    val = randInt(2, 10);
  } else {
    conv = MASS_CONV; contexts = MASS_CONTEXTS;
    units = ["oz", "lb"];
    fromUnit = "lb"; toUnit = "oz";
    val = randInt(2, 10);
  }
  const inBase = val * conv[fromUnit];
  const result = inBase / conv[toUnit];
  const ctx = randChoice(contexts);
  const table = category === "volume"
    ? ["1 c = 8 fl oz", "1 pt = 2 c", "1 qt = 2 pt", "1 gal = 4 qt"]
    : category === "length"
    ? ["1 ft = 12 in", "1 yd = 3 ft"]
    : ["1 lb = 16 oz"];
  return {
    type: "q44", topic: 44,
    category, story: ctx(val, fromUnit, toUnit),
    fromUnit, toUnit, val, table,
    answerNum: String(result), answerUnit: toUnit,
    answer: String(result) + " " + toUnit,
    units, prompt: ctx(val, fromUnit, toUnit)
  };
}

//  Topic Labels 
export const REVIEW_TOPICS = [
  { id: 1,  label: "Column Subtraction",           gen: genQ1  },
  { id: 2,  label: "Column Multiplication",        gen: genQ2  },
  { id: 3,  label: "Square Perimeter",             gen: genQ3  },
  { id: 4,  label: "Area",                         gen: genQ4  },
  { id: 5,  label: "Division with Zero",           gen: genQ5  },
  { id: 6,  label: "Long Division",                gen: genQ6  },
  { id: 7,  label: "Order of Operations",          gen: genQ7  },
  { id: 8,  label: "Integer Comparison",           gen: genQ8  },
  { id: 9,  label: "Integer Addition",             gen: genQ9  },
  { id: 10, label: "Integer Subtraction",          gen: genQ10 },
  { id: 11, label: "Combining Like Terms",         gen: genQ11 },
  { id: 12, label: "Negative Exponents",           gen: genQ12 },
  { id: 13, label: "Product of Powers",            gen: genQ13 },
  { id: 14, label: "Evaluate Expression (+)",      gen: genQ14 },
  { id: 15, label: "Evaluate Expression (-)",      gen: genQ15 },
  { id: 16, label: "Distributive Property",        gen: genQ16 },
  { id: 17, label: "Factor GCF",                   gen: genQ17 },
  { id: 18, label: "One-Step Equation (+/-)",      gen: genQ18 },
  { id: 19, label: "One-Step Equation (*//)",      gen: genQ19 },
  { id: 20, label: "Two-Step Equation",            gen: genQ20 },
  { id: 21, label: "Equation: Like Terms",         gen: genQ21 },
  { id: 22, label: "Equation: Distributive",       gen: genQ22 },
  { id: 23, label: "Graph Inequality",             gen: genQ23 },
  { id: 24, label: "Solve Inequality",             gen: genQ24 },
  { id: 25, label: "Simplify Fraction",            gen: genQ25 },
  { id: 26, label: "Simplify Powers",              gen: genQ26 },
  { id: 27, label: "Multiply Fractions",           gen: genQ27 },
  { id: 28, label: "Divide Fractions",             gen: genQ28 },
  { id: 29, label: "Equivalent Fractions",         gen: genQ29 },
  { id: 30, label: "Add/Subtract Fractions",       gen: genQ30 },
  { id: 31, label: "Multiply Mixed Numbers",       gen: genQ31 },
  { id: 32, label: "Add/Subtract Mixed Numbers",   gen: genQ32 },
  { id: 33, label: "Subtract Mixed (Borrow)",      gen: genQ33 },
  { id: 34, label: "Equations with Fractions",     gen: genQ34 },
  { id: 35, label: "Decimal Subtraction",          gen: genQ35 },
  { id: 36, label: "Decimal Multiplication",       gen: genQ36 },
  { id: 37, label: "Decimal Division",             gen: genQ37 },
  { id: 38, label: "Ratio Word Problems",          gen: genQ38 },
  { id: 39, label: "Proportion Word Problems",     gen: genQ39 },
  { id: 40, label: "Decimal to Fraction",          gen: genQ40 },
  { id: 41, label: "Decimal to Percent",           gen: genQ41 },
  { id: 42, label: "Find Percent of Number",       gen: genQ42 },
  { id: 43, label: "Metric Conversion",            gen: genQ43 },
  { id: 44, label: "US Customary Conversion",      gen: genQ44 },
];

export function generateReviewQuestion(topicId) {
  const topic = REVIEW_TOPICS.find(t => t.id === topicId);
  if (!topic) return null;
  const q = topic.gen();
  q.topicId = topicId;
  q.topicLabel = topic.label;
  return q;
}

export function gradeReviewAnswer(input, question) {
  if (!input || !question) return false;
  const norm = s => String(s).trim().toLowerCase().replace(/\s+/g, "");

  switch (question.type) {
    case "q1": case "q2": case "q3":
    case "q7": case "q13": case "q16":
    case "q17": case "q18": case "q19": case "q20":
    case "q21": case "q22": case "q24": case "q25":
    case "q26": case "q27": case "q28": case "q29":
    case "q30": case "q31": case "q32": case "q33":
    case "q34": case "q35": case "q36":
    case "q39": case "q40": case "q41": case "q42":
      return norm(input) === norm(question.answer);

    case "q37": {
      // Answer stored as "whole.nonRep|rep" or "whole.nonRep" for terminating
      // Student input submitted as same format from RepeatingDecimalInput
      const normInput = norm(input).replace(/\s/g, "");
      const normAnswer = norm(question.answer).replace(/\s/g, "");
      return normInput === normAnswer;
    }

    case "q11": {
      const splitTerms = s => {
        const raw = String(s).trim().replace(/\s*-\s*/g, " -").replace(/\s*\+\s*/g, " +").trim();
        return raw.split(/\s+/).filter(Boolean).map(t => norm(t)).sort();
      };
      const correctTerms = question.answerTerms
        ? question.answerTerms.map(t => norm(t)).sort()
        : splitTerms(question.answer);
      return JSON.stringify(splitTerms(input)) === JSON.stringify(correctTerms);
    }

    case "q6": {
      try {
        const parsed = JSON.parse(input);
        return norm(String(parsed.quotient)) === norm(String(question.quotient)) &&
               norm(String(parsed.remainder)) === norm(String(question.remainder));
      } catch { return false; }
    }

    case "q4": {
      try {
        const parsed = JSON.parse(input);
        return norm(String(parsed.num)) === norm(String(question.answerNum)) &&
               norm(parsed.unit) === norm(question.answerUnit);
      } catch { return false; }
    }
    case "q5": {
      try {
        const parsed = JSON.parse(input);
        return norm(parsed.ans1) === norm(question.prob1.answer) &&
               norm(parsed.ans2) === norm(question.prob2.answer);
      } catch {
        // fallback: try parsing answer field directly
        try {
          const ans = JSON.parse(question.answer);
          const inp = JSON.parse(input);
          return norm(inp.ans1) === norm(ans.ans1) && norm(inp.ans2) === norm(ans.ans2);
        } catch { return false; }
      }
    }
    case "q8": {
      try {
        const parsed = JSON.parse(input);
        return question.pairs.every((p, i) => parsed[i] === p.answer);
      } catch { return false; }
    }
    case "q9": {
      try {
        const parsed = JSON.parse(input);
        return norm(parsed.ans1) === norm(question.prob1.answer) &&
               norm(parsed.ans2) === norm(question.prob2.answer);
      } catch { return false; }
    }
    case "q10": {
      try {
        const parsed = JSON.parse(input);
        return norm(parsed.ans1) === norm(question.prob1.answer) &&
               norm(parsed.ans2) === norm(question.prob2.answer);
      } catch { return false; }
    }
    case "q12": {
      try {
        const parsed = JSON.parse(input);
        return norm(parsed.ans1) === norm(question.prob1.answer) &&
               norm(parsed.ans2) === norm(question.prob2.answer);
      } catch { return false; }
    }
    case "q14": case "q15":
      return norm(input) === norm(question.answer);
    case "q23": {
      try {
        const parsed = JSON.parse(input);
        return parsed.val === question.answer.val &&
               parsed.filled === question.answer.filled &&
               parsed.shadeRight === question.answer.shadeRight;
      } catch { return false; }
    }
    case "q38": {
      try {
        const parsed = JSON.parse(input);
        return norm(parsed.ansa) === norm(question.ansa) &&
               norm(parsed.ansb) === norm(question.ansb);
      } catch { return false; }
    }
    case "q43": case "q44": {
      try {
        const parsed = JSON.parse(input);
        return norm(parsed.num) === norm(question.answerNum) &&
               norm(parsed.unit) === norm(question.answerUnit);
      } catch { return false; }
    }
    default: return norm(input) === norm(question.answer);
  }
}
