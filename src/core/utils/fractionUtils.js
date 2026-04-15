//  Fraction Utilities 

function gcd(a, b) {
  a = Math.abs(a); b = Math.abs(b);
  while (b) { [a, b] = [b, a % b]; }
  return a;
}

// Parse a fraction/mixed number/integer string into { num, den }
// Accepts: "3/4", "1 1/2", "5", "-3/4", "0"
export function parseFraction(str) {
  if (!str || typeof str !== "string") return null;
  str = str.trim();

  // Mixed number: "1 1/2" or "1 -1/2"
  const mixedMatch = str.match(/^(-?\d+)\s+(\d+)\/(\d+)$/);
  if (mixedMatch) {
    const whole = parseInt(mixedMatch[1]);
    const num = parseInt(mixedMatch[2]);
    const den = parseInt(mixedMatch[3]);
    if (den === 0) return null;
    const sign = whole < 0 ? -1 : 1;
    return { num: whole * den + sign * num, den };
  }

  // Fraction: "3/4"
  const fracMatch = str.match(/^(-?\d+)\/(-?\d+)$/);
  if (fracMatch) {
    const num = parseInt(fracMatch[1]);
    const den = parseInt(fracMatch[2]);
    if (den === 0) return null;
    return { num, den };
  }

  // Integer: "5"
  const intMatch = str.match(/^(-?\d+)$/);
  if (intMatch) {
    return { num: parseInt(intMatch[1]), den: 1 };
  }

  return null;
}

// Simplify a fraction
export function simplify({ num, den }) {
  if (den === 0) return null;
  const g = gcd(Math.abs(num), Math.abs(den));
  const sign = den < 0 ? -1 : 1;
  return { num: sign * num / g, den: sign * den / g };
}

// Check if two fraction strings are equivalent (any form)
export function fractionsEqual(a, b) {
  const fa = parseFraction(a);
  const fb = parseFraction(b);
  if (!fa || !fb) return false;
  // Cross multiply to avoid float issues
  return fa.num * fb.den === fb.num * fa.den;
}

// Check if a fraction string is in simplified form
export function isSimplified(str) {
  const f = parseFraction(str);
  if (!f) return false;
  const s = simplify(f);
  return Math.abs(f.num) === Math.abs(s.num) && Math.abs(f.den) === Math.abs(s.den);
}

// Check if a fraction string is in simplified mixed number form
export function isSimplifiedMixed(str) {
  if (!str) return false;
  str = str.trim();
  // Must be a mixed number "W N/D" where N/D is proper and simplified
  const mixedMatch = str.match(/^(-?\d+)\s+(\d+)\/(\d+)$/);
  if (mixedMatch) {
    const num = parseInt(mixedMatch[2]);
    const den = parseInt(mixedMatch[3]);
    if (den === 0) return false;
    if (num >= den) return false; // not proper
    return gcd(num, den) === 1;  // simplified
  }
  return false;
}

// Grade an answer against a correct answer with optional strictness
// mode: "equivalent" | "simplified" | "mixed"
export function gradeAnswer(studentAnswer, correctAnswer, mode = "equivalent") {
  if (!studentAnswer || !studentAnswer.trim()) return false;

  if (mode === "equivalent") {
    return fractionsEqual(studentAnswer, correctAnswer);
  }

  if (mode === "simplified") {
    // Must be equivalent AND simplified
    return fractionsEqual(studentAnswer, correctAnswer) && isSimplified(studentAnswer);
  }

  if (mode === "mixed") {
    // Must be equivalent AND in simplified mixed number form
    return fractionsEqual(studentAnswer, correctAnswer) && isSimplifiedMixed(studentAnswer);
  }

  if (mode === "integer") {
    const a = parseInt(studentAnswer.trim());
    const b = parseInt(String(correctAnswer).trim());
    return !isNaN(a) && !isNaN(b) && a === b;
  }

  return false;
}
