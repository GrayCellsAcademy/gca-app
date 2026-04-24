// Lesson 3 - Multiplication, Division, and Area  Question Generators

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function normalizeAnswer(str) {
  return String(str).toLowerCase().replace(/\s+/g, "").trim();
}

// - Warm-up: Composite Shape Missing Sides + Perimeter -
// L or U shape, two missing sides, student enters both + perimeter
// L: one short vertical missing, one long horizontal missing
// U: one long vertical missing, one short horizontal missing

function genLShapeWarmup() {
  const unit = "ft";
  // L shape dimensions, all 2-digit
  const W = randInt(40, 80);  // total width (long horizontal - will be missing)
  const H = randInt(40, 80);  // total height (left vertical - given)
  const cw = randInt(15, W - 20); // cutout width
  const ch = randInt(15, H - 20); // cutout height (short vertical - will be missing)

  // sides[0]=bottom(W,h), sides[1]=right-lower(H-ch,v), sides[2]=top-right(cw,h),
  // sides[3]=inner-vert(ch,v), sides[4]=top-left(W-cw,h), sides[5]=left(H,v)
  const sides = [
    { length: W,    dir: "h", label: "bottom" },
    { length: H-ch, dir: "v", label: "right" },
    { length: cw,   dir: "h", label: "top-right" },
    { length: ch,   dir: "v", label: "inner-vert" },  // MISSING (short vertical)
    { length: W-cw, dir: "h", label: "top-left" },
    { length: H,    dir: "v", label: "left" },
  ];
  const perimeter = sides.reduce((s, x) => s + x.length, 0);
  const scale = 2;
  const vertices = [
    { x: 0,            y: H*scale },
    { x: W*scale,      y: H*scale },
    { x: W*scale,      y: ch*scale },
    { x: (W-cw)*scale, y: ch*scale },
    { x: (W-cw)*scale, y: 0 },
    { x: 0,            y: 0 },
  ];
  // hide: sides[0] (long horizontal W) and sides[3] (short vertical ch)
  return { shape: "L", sides, perimeter, vertices, unit,
    hideIndices: [0, 3],
    missing1: { idx: 3, length: ch, label: "short vertical", dir: "v" },
    missing2: { idx: 0, length: W,  label: "long horizontal", dir: "h" },
  };
}

function genUShapeWarmup() {
  const unit = "yd";
  const W = randInt(40, 80);
  const H = randInt(40, 80);
  const lw = randInt(12, 22);
  const rw = randInt(12, 22);
  const ch = randInt(20, H - 20);
  const sides = [
    { length: W,       dir: "h", label: "bottom" },
    { length: H,       dir: "v", label: "right" },       // MISSING (long vertical)
    { length: rw,      dir: "h", label: "top-right" },
    { length: ch,      dir: "v", label: "inner-right" },
    { length: W-lw-rw, dir: "h", label: "inner-top" },   // MISSING (short horizontal)
    { length: ch,      dir: "v", label: "inner-left" },
    { length: lw,      dir: "h", label: "top-left" },
    { length: H,       dir: "v", label: "left" },
  ];
  const perimeter = sides.reduce((s, x) => s + x.length, 0);
  const scale = 2;
  const vertices = [
    { x: 0,           y: H*scale },
    { x: W*scale,     y: H*scale },
    { x: W*scale,     y: 0 },
    { x: (W-rw)*scale, y: 0 },
    { x: (W-rw)*scale, y: ch*scale },
    { x: lw*scale,    y: ch*scale },
    { x: lw*scale,    y: 0 },
    { x: 0,           y: 0 },
  ];
  return { shape: "U", sides, perimeter, vertices, unit,
    hideIndices: [1, 4],
    missing1: { idx: 1, length: H,       label: "long vertical",   dir: "v" },
    missing2: { idx: 4, length: W-lw-rw, label: "short horizontal", dir: "h" },
  };
}

export function genWarmup(forceShape) {
  const useL = forceShape === "U" ? false : forceShape === "L" ? true : Math.random() < 0.5;
  const shapeData = useL ? genLShapeWarmup() : genUShapeWarmup();
  const { sides, perimeter, unit, hideIndices, missing1, missing2 } = shapeData;
  return {
    type: "warmup",
    ...shapeData,
    activityType: "warmup",
    answer: JSON.stringify({
      m1: missing1.length,
      m2: missing2.length,
      perimeter,
    }),
    displayAnswer: missing1.length + unit + ", " + missing2.length + unit + ", perimeter=" + perimeter + unit,
    prompt: "Find the two missing sides and the perimeter. Enter all three values with units.",
  };
}

export function gradeWarmup(input, question) {
  try {
    const ans = JSON.parse(input);
    return (
      parseInt(ans.m1) === question.missing1.length &&
      parseInt(ans.m2) === question.missing2.length &&
      parseInt(ans.perimeter) === question.perimeter
    );
  } catch { return false; }
}

// - Topic 1: Round Number Multiplication -
// first: 1-digit (1-5) followed by 1-3 zeroes: e.g. 20, 300, 4000
// second: 1-digit (1-3) followed by 0-2 zeroes: e.g. 2, 30, 300
export function genRoundMultiply() {
  const base1 = randInt(1, 5);
  const zeros1 = randInt(1, 3);
  const base2 = randInt(1, 3);
  const zeros2 = randInt(0, 2);
  const a = base1 * Math.pow(10, zeros1);
  const b = base2 * Math.pow(10, zeros2);
  const answer = a * b;
  return {
    type: "round-multiply",
    a, b, answer,
    prompt: "Find the product.",
    display: a + " x " + b,
    displayAnswer: String(answer),
  };
}

export function gradeRoundMultiply(input, question) {
  return parseInt(input.replace(/,/g, "")) === question.answer;
}

// - Topic 2-4: Column Multiplication -
// Constraint: no trailing zeroes on either factor
// Only one factor may have any digit larger than 3
// Stage 1: 2-3 digit x 1 digit
// Stage 2: 2-3 digit x 2 digit
// Stage 3: 3-4 digit x 3 digit

function hasTrailingZero(n) {
  return n % 10 === 0;
}

function maxDigit(n) {
  return Math.max(...String(n).split("").map(Number));
}

function genColMulPair(aRange, bRange) {
  let a, b;
  let attempts = 0;
  do {
    a = randInt(aRange[0], aRange[1]);
    b = randInt(bRange[0], bRange[1]);
    attempts++;
    if (attempts > 500) break;
  } while (
    hasTrailingZero(a) || hasTrailingZero(b) ||
    (maxDigit(a) > 3 && maxDigit(b) > 3) // only one may have digit > 3
  );
  return { a, b, answer: a * b };
}

export function genColMultiplyStage1() {
  // 2-3 digit x 1 digit
  const aDigits = Math.random() < 0.5 ? 2 : 3;
  const aRange = aDigits === 2 ? [11, 99] : [101, 999];
  const { a, b, answer } = genColMulPair(aRange, [2, 9]);
  return {
    type: "col-multiply-1", a, b, answer,
    prompt: "Find the product.",
    display: a + " x " + b,
    displayAnswer: String(answer),
  };
}

export function genColMultiplyStage2() {
  // 2-3 digit x 2 digit
  const aDigits = Math.random() < 0.5 ? 2 : 3;
  const aRange = aDigits === 2 ? [11, 99] : [101, 999];
  const { a, b, answer } = genColMulPair(aRange, [11, 99]);
  return {
    type: "col-multiply-2", a, b, answer,
    prompt: "Find the product.",
    display: a + " x " + b,
    displayAnswer: String(answer),
  };
}

export function genColMultiplyStage3() {
  // 3-4 digit x 3 digit
  const aDigits = Math.random() < 0.5 ? 3 : 4;
  const aRange = aDigits === 3 ? [101, 999] : [1001, 9999];
  const { a, b, answer } = genColMulPair(aRange, [101, 999]);
  return {
    type: "col-multiply-3", a, b, answer,
    prompt: "Find the product.",
    display: a + " x " + b,
    displayAnswer: String(answer),
  };
}

export function gradeColMultiply(input, question) {
  const val = parseInt(String(input).replace(/,/g, ""), 10);
  return val === question.answer;
}

// - Topic 5-6: Long Division -
// Dividend: 3-4 digits; divisor: 2 or 3
// Answer format: e.g. 86r1 (spaces optional, r case-insensitive)

function formatDivAnswer(quotient, remainder) {
  return remainder > 0 ? quotient + "r" + remainder : String(quotient);
}

function normalizeDivAnswer(str) {
  return String(str).toLowerCase().replace(/\s+/g, "").replace(/r0$/, "").trim();
}

export function genLongDivision() {
  const divisor = Math.random() < 0.5 ? 2 : 3;
  const useLowFirstDigit = Math.random() < 0.33;
  let dividend;
  if (useLowFirstDigit) {
    // first digit is 1
    const digits = Math.random() < 0.5 ? 3 : 4;
    const rest = randInt(0, Math.pow(10, digits - 1) - 1);
    dividend = Math.pow(10, digits - 1) + rest;
  } else {
    const digits = Math.random() < 0.5 ? 3 : 4;
    dividend = randInt(Math.pow(10, digits - 1), Math.pow(10, digits) - 1);
  }
  const quotient = Math.floor(dividend / divisor);
  const remainder = dividend % divisor;
  return {
    type: "long-division",
    dividend, divisor, quotient, remainder,
    answer: formatDivAnswer(quotient, remainder),
    displayAnswer: formatDivAnswer(quotient, remainder),
    prompt: "Find the quotient. Use r for remainder (e.g. 86r1).",
    display: dividend + " / " + divisor,
  };
}

export function gradeLongDivision(input, question) {
  const n = normalizeDivAnswer(input);
  const correct = normalizeDivAnswer(question.answer);
  return n === correct;
}

export function genLongDivisionZeroMiddle() {
  // Quotient must have a zero in at least one middle digit
  let q;
  const divisor = Math.random() < 0.5 ? 2 : 3;
  let attempts = 0;
  let dividend;
  do {
    const digits = Math.random() < 0.5 ? 3 : 4;
    dividend = randInt(Math.pow(10, digits - 1), Math.pow(10, digits) - 1);
    q = Math.floor(dividend / divisor);
    const qStr = String(q);
    // Check for zero in a middle digit (not first, not last)
    const hasMiddleZero = qStr.length >= 3 && qStr.slice(1, -1).includes("0");
    if (hasMiddleZero) break;
    attempts++;
  } while (attempts < 500);
  const quotient = q;
  const remainder = dividend % divisor;
  return {
    type: "long-division-zero",
    dividend, divisor, quotient, remainder,
    answer: formatDivAnswer(quotient, remainder),
    displayAnswer: formatDivAnswer(quotient, remainder),
    prompt: "Find the quotient. Use r for remainder (e.g. 302r1).",
    display: dividend + " / " + divisor,
  };
}

// - Topic 7: Area of Rectangle with unit conversion -
// ft / yd mixed - student must convert then calculate
// 1 yd = 3 ft
const FT_PER_YD = 3;

export function genRectangleArea() {
  // Pick two 2-digit dimensions, one in ft and one in yd (or both same)
  const mixUnits = Math.random() < 0.7; // 70% chance of mixed units
  let lengthVal, widthVal, lengthUnit, widthUnit;

  if (mixUnits) {
    // one in ft, one in yd
    const ftFirst = Math.random() < 0.5;
    const ftVal = randInt(10, 30); // feet value, 2-digit
    const ydVal = randInt(10, 30); // yards value, 2-digit
    if (ftFirst) {
      lengthVal = ftVal; lengthUnit = "ft";
      widthVal = ydVal;  widthUnit = "yd";
    } else {
      lengthVal = ydVal; lengthUnit = "yd";
      widthVal = ftVal;  widthUnit = "ft";
    }
  } else {
    const unit = Math.random() < 0.5 ? "ft" : "yd";
    lengthVal = randInt(10, 99);
    widthVal = randInt(10, 99);
    lengthUnit = widthUnit = unit;
  }

  // Compute both possible answers (convert length to match width, or vice versa)
  let areaFt, areaYd;
  const lenInFt = lengthUnit === "ft" ? lengthVal : lengthVal * FT_PER_YD;
  const widInFt = widthUnit === "ft" ? widthVal : widthVal * FT_PER_YD;
  areaFt = lenInFt * widInFt;
  areaYd = areaFt / (FT_PER_YD * FT_PER_YD);

  // areaYd is only a clean integer if area in ft is divisible by 9
  const ydIsClean = areaYd === Math.floor(areaYd);

  return {
    type: "rectangle-area",
    lengthVal, lengthUnit, widthVal, widthUnit,
    areaFt, areaYd: ydIsClean ? areaYd : null,
    answer: JSON.stringify({ ft: areaFt, yd: ydIsClean ? areaYd : null }),
    displayAnswer: areaFt + " sq ft" + (ydIsClean ? " or " + areaYd + " sq yd" : ""),
    prompt: "Find the area. Convert units if needed. Enter the number and choose units.",
  };
}

export function gradeRectangleArea(input, question) {
  try {
    const ans = JSON.parse(input);
    const val = parseInt(ans.value);
    const unit = String(ans.unit).toLowerCase().replace(/\s+/g, "");
    if (unit === "sqft" || unit === "ft2" || unit === "ft^2" || unit === "squarefeet") {
      return val === question.areaFt;
    }
    if ((unit === "sqyd" || unit === "yd2" || unit === "yd^2" || unit === "squareyards") && question.areaYd !== null) {
      return val === question.areaYd;
    }
    return false;
  } catch { return false; }
}

// - Topic 8: Area of Square -
const AREA_UNITS = ["cm", "m", "in", "ft", "yd"];

export function genSquareArea() {
  const unit = AREA_UNITS[randInt(0, AREA_UNITS.length - 1)];
  const s = randInt(10, 99);
  const area = s * s;
  return {
    type: "square-area",
    s, unit,
    area,
    answer: JSON.stringify({ value: area, unit: "sq" + unit }),
    displayAnswer: area + " sq " + unit,
    prompt: "Find the area of this square. Enter the number and choose units.",
  };
}

export function gradeSquareArea(input, question) {
  try {
    const ans = JSON.parse(input);
    const val = parseInt(ans.value);
    const unitIn = String(ans.unit).toLowerCase().replace(/\s+/g, "");
    const correctUnit = ("sq" + question.unit).toLowerCase();
    const altUnit = ("square" + question.unit).toLowerCase();
    return val === question.area && (unitIn === correctUnit || unitIn === altUnit || unitIn === question.unit + "2");
  } catch { return false; }
}

// - Topic 9: Area of Composite Shapes -
// L, T, U shapes - all sides labeled, student finds area
// Method: split into 2 rectangles

function genCompositeArea() {
  const unit = AREA_UNITS[randInt(0, AREA_UNITS.length - 1)];
  const shapeType = ["L", "T", "U"][randInt(0, 2)];

  if (shapeType === "L") {
    const W = randInt(30, 70);
    const H = randInt(30, 70);
    const cw = randInt(10, W - 15);
    const ch = randInt(10, H - 15);
    // Area = big rectangle minus cutout = W*H - cw*ch
    // Or split: rect1 = W*(H-ch), rect2 = (W-cw)*ch
    const area = W * H - cw * ch;
    const sides = [
      { length: W,    dir: "h" }, { length: H-ch, dir: "v" },
      { length: cw,   dir: "h" }, { length: ch,   dir: "v" },
      { length: W-cw, dir: "h" }, { length: H,    dir: "v" },
    ];
    const perimeter = sides.reduce((s, x) => s + x.length, 0);
    const scale = 2.5;
    const vertices = [
      { x: 0, y: H*scale }, { x: W*scale, y: H*scale },
      { x: W*scale, y: ch*scale }, { x: (W-cw)*scale, y: ch*scale },
      { x: (W-cw)*scale, y: 0 }, { x: 0, y: 0 },
    ];
    return { shape: "L", W, H, cw, ch, sides, vertices, unit, area,
      splitExplanation: W + "x" + (H-ch) + " + " + (W-cw) + "x" + ch + " = " + (W*(H-ch)) + " + " + ((W-cw)*ch) + " = " + area };
  }

  if (shapeType === "T") {
    const W = randInt(40, 70);
    const bh = randInt(15, 30);
    const sh = randInt(20, 40);
    const tw = randInt(15, W - 25);
    const stemLeft = randInt(10, W - tw - 10);
    const area = W * bh + tw * sh;
    const sides = [
      { length: W, dir: "h" }, { length: bh, dir: "v" },
      { length: W-stemLeft-tw, dir: "h" }, { length: sh, dir: "v" },
      { length: tw, dir: "h" }, { length: sh, dir: "v" },
      { length: stemLeft, dir: "h" }, { length: bh, dir: "v" },
    ];
    const scale = 2.5;
    const H = bh + sh;
    const vertices = [
      { x: 0, y: H*scale }, { x: W*scale, y: H*scale },
      { x: W*scale, y: sh*scale }, { x: (stemLeft+tw)*scale, y: sh*scale },
      { x: (stemLeft+tw)*scale, y: 0 }, { x: stemLeft*scale, y: 0 },
      { x: stemLeft*scale, y: sh*scale }, { x: 0, y: sh*scale },
    ];
    return { shape: "T", sides, vertices, unit, area,
      splitExplanation: W + "x" + bh + " + " + tw + "x" + sh + " = " + (W*bh) + " + " + (tw*sh) + " = " + area };
  }

  // U shape
  const W = randInt(40, 70);
  const H = randInt(40, 70);
  const lw = randInt(10, 20);
  const rw = randInt(10, 20);
  const ch = randInt(15, H - 15);
  const area = W * H - (W - lw - rw) * ch;
  const sides = [
    { length: W, dir: "h" }, { length: H, dir: "v" },
    { length: rw, dir: "h" }, { length: ch, dir: "v" },
    { length: W-lw-rw, dir: "h" }, { length: ch, dir: "v" },
    { length: lw, dir: "h" }, { length: H, dir: "v" },
  ];
  const scale = 2;
  const vertices = [
    { x: 0, y: H*scale }, { x: W*scale, y: H*scale },
    { x: W*scale, y: 0 }, { x: (W-rw)*scale, y: 0 },
    { x: (W-rw)*scale, y: ch*scale }, { x: lw*scale, y: ch*scale },
    { x: lw*scale, y: 0 }, { x: 0, y: 0 },
  ];
  return { shape: "U", sides, vertices, unit, area,
    splitExplanation: W + "x" + H + " - " + (W-lw-rw) + "x" + ch + " = " + (W*H) + " - " + ((W-lw-rw)*ch) + " = " + area };
}

export function genCompositeShapeArea() {
  const shapeData = genCompositeArea();
  return {
    type: "composite-area",
    ...shapeData,
    hideIndices: [],
    answer: JSON.stringify({ value: shapeData.area, unit: "sq" + shapeData.unit }),
    displayAnswer: shapeData.area + " sq " + shapeData.unit,
    prompt: "Find the area of this shape. Enter the number and choose units.",
    activityType: "composite-area",
  };
}

export function gradeCompositeArea(input, question) {
  try {
    const ans = JSON.parse(input);
    const val = parseInt(ans.value);
    const unitIn = String(ans.unit).toLowerCase().replace(/\s+/g, "");
    const correctUnit = ("sq" + question.unit).toLowerCase();
    const altUnit = ("square" + question.unit).toLowerCase();
    return val === question.area && (unitIn === correctUnit || unitIn === altUnit || unitIn === question.unit + "2");
  } catch { return false; }
}

// - Master generator and grader -

export const LESSON03_TOPICS = [
  { id: "warmup-L",   label: "Warm-up: L-Shape",           description: "Missing sides + perimeter of L-shape" },
  { id: "warmup-U",   label: "Warm-up: U-Shape",           description: "Missing sides + perimeter of U-shape" },
  { id: "round-mul",  label: "Round Number Multiplication", description: "e.g. 300 x 40" },
  { id: "col-mul-1",  label: "Column Multiplication (Stage 1)", description: "2-3 digit x 1 digit" },
  { id: "col-mul-2",  label: "Column Multiplication (Stage 2)", description: "2-3 digit x 2 digit" },
  { id: "col-mul-3",  label: "Column Multiplication (Stage 3)", description: "3-4 digit x 3 digit" },
  { id: "long-div",   label: "Long Division",               description: "3-4 digit / 2-3, remainders possible" },
  { id: "long-div-0", label: "Long Division - Zero in Middle", description: "Quotient has 0 in middle digit" },
  { id: "rect-area",  label: "Rectangle Area (ft/yd)",     description: "Convert units then find area" },
  { id: "sq-area",    label: "Square Area",                 description: "Area of square with one side labeled" },
  { id: "comp-area",  label: "Composite Shape Area",        description: "Area of L/T/U shape" },
];

export function generateLesson03Question(topicId) {
  switch (topicId) {
    case "warmup-L":   return genWarmup("L");
    case "warmup-U":   return genWarmup("U");
    case "round-mul":  return genRoundMultiply();
    case "col-mul-1":  return genColMultiplyStage1();
    case "col-mul-2":  return genColMultiplyStage2();
    case "col-mul-3":  return genColMultiplyStage3();
    case "long-div":   return genLongDivision();
    case "long-div-0": return genLongDivisionZeroMiddle();
    case "rect-area":  return genRectangleArea();
    case "sq-area":    return genSquareArea();
    case "comp-area":  return genCompositeShapeArea();
    default:           return genRoundMultiply();
  }
}

export function gradeLesson03Answer(input, question) {
  if (!input || !question) return false;
  switch (question.type) {
    case "warmup":          return gradeWarmup(input, question);
    case "round-multiply":  return gradeRoundMultiply(input, question);
    case "col-multiply-1":
    case "col-multiply-2":
    case "col-multiply-3":  return gradeColMultiply(input, question);
    case "long-division":
    case "long-division-zero": return gradeLongDivision(input, question);
    case "rectangle-area":  return gradeRectangleArea(input, question);
    case "square-area":     return gradeSquareArea(input, question);
    case "composite-area":  return gradeCompositeArea(input, question);
    default: return false;
  }
}
