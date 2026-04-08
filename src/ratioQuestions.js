// ─── Ratio & Proportion Question Generators ───────────────────────

function gcd(a, b) {
  a = Math.abs(a); b = Math.abs(b);
  while (b) { [a, b] = [b, a % b]; }
  return a;
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ── Type 1: Simplify Ratio ────────────────────────────────────────
export function genSimplifyRatio() {
  while (true) {
    const p = randInt(2, 20);
    const q = randInt(2, 20);
    if (p === q) continue;
    const factor = randInt(2, Math.min(5, Math.floor(99 / Math.max(p, q))));
    const a = p * factor;
    const b = q * factor;
    if (a >= 100 || b >= 100) continue;
    const g = gcd(a, b);
    if (g <= 1) continue;
    const ansP = a / g;
    const ansQ = b / g;
    return {
      type: "simplify",
      prompt: `Simplify the ratio ${a}:${b}`,
      a, b,
      answer: `${ansP}:${ansQ}`,
      gcf: g,
      work: `${a}:${b} ÷ ${g} = ${ansP}:${ansQ}`,
    };
  }
}

// ── Type 2: Solve Proportion ──────────────────────────────────────
export function genSolveProportion() {
  while (true) {
    // a:b = c:d, one is unknown x
    const a = randInt(2, 15);
    const b = randInt(2, 15);
    const mult = randInt(2, 6);
    const c = a * mult;
    const d = b * mult;
    if (c >= 100 || d >= 100) continue;
    if (a === c) continue;

    // Pick which position is unknown
    const pos = randInt(0, 3); // 0=a, 1=b, 2=c, 3=d
    let prompt, answer, work;

    if (pos === 0) {
      // x:b = c:d → xd = bc → x = bc/d
      const ans = (b * c) / d;
      if (!Number.isInteger(ans) || ans < 2 || ans >= 100) continue;
      prompt = `x:${b} = ${c}:${d}`;
      answer = String(ans);
      work = `${d}x = ${b}×${c}\n${d}x = ${b * c}\nx = ${ans}`;
    } else if (pos === 1) {
      // a:x = c:d → ad = xc → x = ad/c
      const ans = (a * d) / c;
      if (!Number.isInteger(ans) || ans < 2 || ans >= 100) continue;
      prompt = `${a}:x = ${c}:${d}`;
      answer = String(ans);
      work = `${a}×${d} = ${c}x\n${a * d} = ${c}x\nx = ${ans}`;
    } else if (pos === 2) {
      // a:b = x:d → ad = bx → x = ad/b
      const ans = (a * d) / b;
      if (!Number.isInteger(ans) || ans < 2 || ans >= 100) continue;
      prompt = `${a}:${b} = x:${d}`;
      answer = String(ans);
      work = `${a}×${d} = ${b}x\n${a * d} = ${b}x\nx = ${ans}`;
    } else {
      // a:b = c:x → ax = bc → x = bc/a
      const ans = (b * c) / a;
      if (!Number.isInteger(ans) || ans < 2 || ans >= 100) continue;
      prompt = `${a}:${b} = ${c}:x`;
      answer = String(ans);
      work = `${a}x = ${b}×${c}\n${a}x = ${b * c}\nx = ${ans}`;
    }

    return { type: "proportion", prompt, answer, work };
  }
}

// ── Type 3: Algebraic Proportion ─────────────────────────────────
// Form: a/(bx+c) = d/(ex+f)
// Cross multiply: a(ex+f) = d(bx+c)
// aex + af = dbx + dc
// (ae-db)x = dc - af
// x = (dc-af)/(ae-db)
export function genAlgebraicProportion() {
  let attempts = 0;
  while (attempts < 200) {
    attempts++;
    const a = randInt(2, 9);
    const d = randInt(2, 9);
    if (a === d) continue;

    // bx+c and ex+f — keep coefficients small
    const b = randInt(1, 4);
    const c = randInt(1, 9);
    const e = randInt(1, 4);
    const f = randInt(1, 9);

    const denom = a * e - d * b;
    if (denom === 0) continue;

    const num = d * c - a * f;
    const xNum = num;
    const xDen = denom;
    const g = gcd(Math.abs(xNum), Math.abs(xDen));
    const xSimNum = xNum / g;
    const xSimDen = xDen / g;

    // Check x makes denominators non-zero
    const xVal = xNum / xDen;
    if ((b * xVal + c) === 0 || (e * xVal + f) === 0) continue;
    if (Math.abs(xVal) > 50) continue;

    // Format answer
    let answer;
    if (xSimDen === 1) {
      answer = String(xSimNum);
    } else if (xSimDen === -1) {
      answer = String(-xSimNum);
    } else {
      // Normalize sign
      if (xSimDen < 0) {
        answer = `${-xSimNum}/${-xSimDen}`;
      } else {
        answer = `${xSimNum}/${xSimDen}`;
      }
    }

    // Format problem
    const lhsDen = b === 1 ? `x+${c}` : `${b}x+${c}`;
    const rhsDen = e === 1 ? `x+${f}` : `${e}x+${f}`;
    const prompt = `${a}/(${lhsDen}) = ${d}/(${rhsDen})`;

    // Work
    const ae = a * e, dc2 = d * c, db = d * b, af = a * f;
    const lhsCoef = ae - db;
    const rhs = dc2 - af;
    // Build expanded terms carefully
    const lhsExpanded = af >= 0 ? `${ae}x + ${af}` : `${ae}x - ${Math.abs(af)}`;
    const rhsExpanded = dc2 >= 0 ? `${db}x + ${dc2}` : `${db}x - ${Math.abs(dc2)}`;
    const rhsVal = rhs >= 0 ? `${rhs}` : `${rhs}`;
    const work = [
      `Cross multiply:`,
      `${a}(${rhsDen}) = ${d}(${lhsDen})`,
      `${lhsExpanded} = ${rhsExpanded}`,
      `${lhsCoef}x = ${rhsVal}`,
      `x = ${answer}`,
    ].join('\n');

    return { type: "algebraic", prompt, answer, work, altAnswers: [answer] };
  }
  return genAlgebraicProportion(); // retry
}

// ── Type 4: Write the Proportion (word problems) ─────────────────
const WRITE_PROPORTION_TEMPLATES = [
  {
    context: "A recipe uses {a} cups of sugar for every {b} cups of flour. If Mia wants to use {c} cups of flour, how many cups of sugar should she use? Write the proportion.",
    unit1: "sugar", unit2: "flour",
  },
  {
    context: "A car travels {a} miles on {b} gallons of gas. How many miles can it travel on {c} gallons? Write the proportion.",
    unit1: "miles", unit2: "gallons",
  },
  {
    context: "A map uses a scale where {a} cm represents {b} km. If two cities are {c} cm apart on the map, how far apart are they in real life? Write the proportion.",
    unit1: "cm", unit2: "km",
  },
  {
    context: "A factory produces {a} items every {b} hours. How many items does it produce in {c} hours? Write the proportion.",
    unit1: "items", unit2: "hours",
  },
  {
    context: "A cyclist rides {a} km in {b} minutes. At the same speed, how far will they ride in {c} minutes? Write the proportion.",
    unit1: "km", unit2: "minutes",
  },
  {
    context: "A store sells {a} apples for {b} dollars. How many apples can you buy for {c} dollars? Write the proportion.",
    unit1: "apples", unit2: "dollars",
  },
  {
    context: "A printer prints {a} pages every {b} seconds. How many pages will it print in {c} seconds? Write the proportion.",
    unit1: "pages", unit2: "seconds",
  },
  {
    context: "A garden uses {a} liters of water for every {b} square meters. How many liters are needed for {c} square meters? Write the proportion.",
    unit1: "liters", unit2: "square meters",
  },
];

function getAllEquivalentProportions(a, b, c, d) {
  // a:b = c:d and all rearrangements
  // a/b = c/d means a:b = c:d
  const forms = [
    `${a}:${b}=${c}:${d}`, `${c}:${d}=${a}:${b}`,
    `${b}:${a}=${d}:${c}`, `${d}:${c}=${b}:${a}`,
    `${a}:${c}=${b}:${d}`, `${b}:${d}=${a}:${c}`,
    `${c}:${a}=${d}:${b}`, `${d}:${b}=${c}:${a}`,
  ];
  // Also with x
  return forms;
}

function normalizeProportionInput(str) {
  return str.toLowerCase()
    .replace(/\s/g, '')
    .replace(/÷/g, '/')
    .replace(/×/g, '*');
}

export function genWriteProportion() {
  const tmpl = WRITE_PROPORTION_TEMPLATES[randInt(0, WRITE_PROPORTION_TEMPLATES.length - 1)];
  while (true) {
    const ratio = randInt(2, 10);
    const b = randInt(2, 10);
    const a = randInt(2, 10);
    if (a === b) continue;
    const mult = randInt(2, 8);
    const c = b * mult;
    const d = a * mult;
    if (c >= 100 || d >= 100) continue;

    const prompt = tmpl.context
      .replace('{a}', a)
      .replace('{b}', b)
      .replace('{c}', c);

    // The unknown is d (answer)
    // Correct proportions: a:b = d:c or equivalents, but one term is x
    // Student writes e.g. "a:b = x:c" or "b:a = c:x" etc
    const correctProportions = [
      `${a}:${b}=x:${c}`, `x:${c}=${a}:${b}`,
      `${b}:${a}=${c}:x`, `${c}:x=${b}:${a}`,
      `${a}:x=${b}:${c}`, `${b}:${c}=${a}:x`,
      `x:${a}=${c}:${b}`, `${c}:${b}=x:${a}`,
    ];

    return {
      type: "write-proportion",
      prompt,
      answer: `${a}:${b}=x:${c}`,
      displayAnswer: `${a}:${b} = x:${c}`,
      correctProportions,
      numericalAnswer: d,
      context: tmpl.context,
      a, b, c, d,
    };
  }
}

export function gradeWriteProportion(studentInput, question) {
  if (!studentInput) return false;
  const normalized = normalizeProportionInput(studentInput);
  for (const correct of question.correctProportions) {
    if (normalized === normalizeProportionInput(correct)) return true;
  }
  return false;
}

// ── Type 5: Solve Word Problem ────────────────────────────────────
const SOLVE_TEMPLATES = [
  {
    context: "A train travels {a} km in {b} hours. At the same speed, how many hours will it take to travel {c} km?",
    unit: "hours",
  },
  {
    context: "A pump fills {a} liters of water in {b} minutes. How many minutes will it take to fill {c} liters?",
    unit: "minutes",
  },
  {
    context: "If {a} workers can build a wall in {b} days, how many days will it take {c} workers at the same rate?",
    unit: "days",
  },
  {
    context: "A shadow {a} meters long is cast by a pole {b} meters tall. How tall is a tree that casts a shadow {c} meters long?",
    unit: "meters",
  },
  {
    context: "A painter paints {a} square meters in {b} hours. How many square meters can they paint in {c} hours?",
    unit: "square meters",
  },
  {
    context: "A faucet drips {a} mL of water every {b} seconds. How many mL will drip in {c} seconds?",
    unit: "mL",
  },
  {
    context: "If {a} kg of fertilizer covers {b} square meters of lawn, how many kg are needed for {c} square meters?",
    unit: "kg",
  },
  {
    context: "A snail moves {a} cm in {b} minutes. How many cm will it move in {c} minutes?",
    unit: "cm",
  },
];

export function genSolveWordProblem() {
  const tmpl = SOLVE_TEMPLATES[randInt(0, SOLVE_TEMPLATES.length - 1)];
  while (true) {
    const a = randInt(2, 15);
    const b = randInt(2, 15);
    const mult = randInt(2, 6);
    const c = a * mult;
    const d = b * mult;
    if (c >= 100 || d >= 100) continue;

    const prompt = tmpl.context
      .replace('{a}', a)
      .replace('{b}', b)
      .replace('{c}', c);

    const proportion = `${a}:${b} = ${c}:x`;
    const work = `${a}:${b} = ${c}:x\n${a}x = ${b}×${c}\n${a}x = ${b * c}\nx = ${d}`;

    return {
      type: "solve-word",
      prompt,
      answer: String(d),
      unit: tmpl.unit,
      proportion,
      work,
    };
  }
}

// ── Grade helpers ─────────────────────────────────────────────────
export function gradeRatioAnswer(studentInput, question) {
  if (!studentInput) return false;
  const s = studentInput.trim().replace(/\s/g, '');
  if (question.type === "simplify") {
    return s === question.answer.replace(/\s/g, '');
  }
  if (question.type === "proportion" || question.type === "solve-word") {
    const num = parseFloat(s);
    const correct = parseFloat(question.answer);
    return !isNaN(num) && Math.abs(num - correct) < 0.001;
  }
  if (question.type === "algebraic") {
    // Accept integer or fraction
    if (s === question.answer.replace(/\s/g, '')) return true;
    // Also try numeric comparison
    const correctVal = eval(question.answer.replace(/\//,'/'));
    const studentVal = s.includes('/') ? eval(s) : parseFloat(s);
    return !isNaN(studentVal) && Math.abs(studentVal - correctVal) < 0.001;
  }
  if (question.type === "write-proportion") {
    return gradeWriteProportion(s, question);
  }
  return false;
}

export const TOPIC_LABELS = [
  { id: "simplify", label: "Simplify Ratios", description: "Reduce a:b to lowest terms" },
  { id: "proportion", label: "Solve Proportions", description: "Find the missing value in a:b = c:d" },
  { id: "algebraic", label: "Algebraic Proportions", description: "Solve a/(bx+c) = d/(ex+f)" },
  { id: "write-proportion", label: "Write the Proportion", description: "Set up a proportion from a word problem" },
  { id: "solve-word", label: "Solve Word Problems", description: "Find the answer to a proportion word problem" },
];

export function generateQuestion(type) {
  switch (type) {
    case "simplify": return genSimplifyRatio();
    case "proportion": return genSolveProportion();
    case "algebraic": return genAlgebraicProportion();
    case "write-proportion": return genWriteProportion();
    case "solve-word": return genSolveWordProblem();
    default: return genSimplifyRatio();
  }
}
