// ─── Worksheet Questions — Decimals Session ───────────────────────
// Exact questions from the worksheet, pre-computed answers

export const WORKSHEET_QUESTIONS = [
  // ── Section 1: Decimal Multiplication ────────────────────────────
  {
    id: "w1",
    section: "Section 1",
    sectionTitle: "Decimal Multiplication",
    prompt: "6.38 × 2",
    hint: "Multiply as whole numbers (638 × 2), then place the decimal",
    answer: "12.76",
    altAnswers: ["12.76"],
    mode: "decimal",
    points: 5,
  },
  {
    id: "w2",
    section: "Section 1",
    sectionTitle: "Decimal Multiplication",
    prompt: "10.1 × 0.53",
    hint: "Count total decimal places: 1 + 2 = 3",
    answer: "5.353",
    altAnswers: ["5.353"],
    mode: "decimal",
    points: 5,
  },
  {
    id: "w3",
    section: "Section 1",
    sectionTitle: "Decimal Multiplication",
    prompt: "5.8 × 0.62",
    hint: "Count total decimal places: 1 + 2 = 3",
    answer: "3.596",
    altAnswers: ["3.596"],
    mode: "decimal",
    points: 5,
  },

  // ── Section 2: Fraction to Decimal ───────────────────────────────
  {
    id: "w4",
    section: "Section 2",
    sectionTitle: "Fraction to Decimal",
    prompt: "Convert 7/2 to a decimal",
    hint: "Divide 7 ÷ 2",
    answer: "3.5",
    altAnswers: ["3.5", "3.50"],
    mode: "decimal",
    points: 5,
  },
  {
    id: "w5",
    section: "Section 2",
    sectionTitle: "Fraction to Decimal",
    prompt: "Convert 15/4 to a decimal",
    hint: "Divide 15 ÷ 4",
    answer: "3.75",
    altAnswers: ["3.75"],
    mode: "decimal",
    points: 5,
  },
  {
    id: "w6",
    section: "Section 2",
    sectionTitle: "Fraction to Decimal",
    prompt: "Convert 13/5 to a decimal",
    hint: "Divide 13 ÷ 5",
    answer: "2.6",
    altAnswers: ["2.6", "2.60"],
    mode: "decimal",
    points: 5,
  },
  {
    id: "w7",
    section: "Section 2",
    sectionTitle: "Fraction to Decimal",
    prompt: "Convert 25/3 to a decimal",
    hint: "Divide 25 ÷ 3 — this is a repeating decimal",
    answer: "8.333",
    altAnswers: ["8.333", "8.3333", "8.33", "8.333...", "8.3...", "8.3̄"],
    mode: "decimal-repeating",
    points: 5,
  },
  {
    id: "w8",
    section: "Section 2",
    sectionTitle: "Fraction to Decimal",
    prompt: "Convert 761/6 to a decimal",
    hint: "Divide 761 ÷ 6 — this is a repeating decimal",
    answer: "126.833",
    altAnswers: ["126.833", "126.8333", "126.83", "126.833...", "126.8̄3̄"],
    mode: "decimal-repeating",
    points: 5,
  },
  {
    id: "w9",
    section: "Section 2",
    sectionTitle: "Fraction to Decimal",
    prompt: "Convert 35/11 to a decimal",
    hint: "Divide 35 ÷ 11 — this is a repeating decimal",
    answer: "3.1818",
    altAnswers: ["3.1818", "3.18", "3.181818", "3.18...", "3.18̄"],
    mode: "decimal-repeating",
    points: 5,
  },

  // ── Section 3: Decimal Division ───────────────────────────────────
  {
    id: "w10",
    section: "Section 3",
    sectionTitle: "Decimal Division",
    prompt: "36 ÷ 0.09",
    hint: "Multiply both by 100: 3600 ÷ 9",
    answer: "400",
    altAnswers: ["400", "400.0"],
    mode: "decimal",
    points: 5,
  },
  {
    id: "w11",
    section: "Section 3",
    sectionTitle: "Decimal Division",
    prompt: "0.01 ÷ 0.1",
    hint: "Multiply both by 10: 0.1 ÷ 1",
    answer: "0.1",
    altAnswers: ["0.1", ".1", "0.10"],
    mode: "decimal",
    points: 5,
  },
  {
    id: "w12",
    section: "Section 3",
    sectionTitle: "Decimal Division",
    prompt: "0.048 ÷ 0.6",
    hint: "Multiply both by 10: 0.48 ÷ 6",
    answer: "0.08",
    altAnswers: ["0.08", ".08", "0.080"],
    mode: "decimal",
    points: 5,
  },
  {
    id: "w13",
    section: "Section 3",
    sectionTitle: "Decimal Division",
    prompt: "0.7 ÷ 5",
    hint: "Place decimal point in quotient above dividend's decimal",
    answer: "0.14",
    altAnswers: ["0.14", ".14"],
    mode: "decimal",
    points: 5,
  },
  {
    id: "w14",
    section: "Section 3",
    sectionTitle: "Decimal Division",
    prompt: "0.85 ÷ 0.003",
    hint: "Multiply both by 1000: 850 ÷ 3",
    answer: "283.333",
    altAnswers: ["283.333", "283.3333", "283.33", "283.333...", "283.3̄"],
    mode: "decimal-repeating",
    points: 5,
  },
  {
    id: "w15",
    section: "Section 3",
    sectionTitle: "Decimal Division",
    prompt: "25.2 ÷ 0.6",
    hint: "Multiply both by 10: 252 ÷ 6",
    answer: "42",
    altAnswers: ["42", "42.0"],
    mode: "decimal",
    points: 5,
  },

  // ── Section 4: Order of Operations with Decimals ──────────────────
  {
    id: "w16",
    section: "Section 4",
    sectionTitle: "Order of Operations",
    prompt: "0.31 + 0.4 · 0.7",
    hint: "Multiply first: 0.4 × 0.7 = 0.28, then add 0.31",
    answer: "0.59",
    altAnswers: ["0.59", ".59"],
    mode: "decimal",
    points: 5,
  },
  {
    id: "w17",
    section: "Section 4",
    sectionTitle: "Order of Operations",
    prompt: "0.15 + 0.2²",
    hint: "Power first: 0.2² = 0.04, then add 0.15",
    answer: "0.19",
    altAnswers: ["0.19", ".19"],
    mode: "decimal",
    points: 5,
  },
  {
    id: "w18",
    section: "Section 4",
    sectionTitle: "Order of Operations",
    prompt: "(10 ÷ 2.5)³",
    hint: "Parentheses first: 10 ÷ 2.5 = 4, then 4³",
    answer: "64",
    altAnswers: ["64", "64.0"],
    mode: "decimal",
    points: 5,
  },
  {
    id: "w19",
    section: "Section 4",
    sectionTitle: "Order of Operations",
    prompt: "43.14 ÷ (2 − 1.4)",
    hint: "Parentheses first: 2 − 1.4 = 0.6, then 43.14 ÷ 0.6",
    answer: "71.9",
    altAnswers: ["71.9", "71.90"],
    mode: "decimal",
    points: 5,
  },
  {
    id: "w20",
    section: "Section 4",
    sectionTitle: "Order of Operations",
    prompt: "0.5² ÷ 4",
    hint: "Power first: 0.5² = 0.25, then 0.25 ÷ 4",
    answer: "0.0625",
    altAnswers: ["0.0625", ".0625"],
    mode: "decimal",
    points: 5,
  },
];

export const TOTAL_POINTS = WORKSHEET_QUESTIONS.reduce((s, q) => s + q.points, 0);

// Grade answer for decimal questions
export function gradeDecimalAnswer(studentAnswer, question) {
  if (!studentAnswer) return false;
  const cleaned = studentAnswer.trim().toLowerCase()
    .replace(/\s/g, '')
    .replace(/…/g, '...');

  // Check all accepted answers
  for (const accepted of question.altAnswers) {
    const acceptedCleaned = accepted.trim().toLowerCase().replace(/\s/g, '');
    if (cleaned === acceptedCleaned) return true;
  }

  // For decimal mode, also compare numerically with tolerance
  if (question.mode === "decimal") {
    const studentNum = parseFloat(cleaned);
    const correctNum = parseFloat(question.answer);
    if (!isNaN(studentNum) && !isNaN(correctNum)) {
      return Math.abs(studentNum - correctNum) < 0.0001;
    }
  }

  // For repeating decimals, check if student's number matches to 2+ decimal places
  if (question.mode === "decimal-repeating") {
    const studentNum = parseFloat(cleaned);
    const correctNum = parseFloat(question.answer);
    if (!isNaN(studentNum) && !isNaN(correctNum)) {
      // Allow if matches to 2 decimal places
      return Math.abs(studentNum - correctNum) < 0.01;
    }
  }

  return false;
}
