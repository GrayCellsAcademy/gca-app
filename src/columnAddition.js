// ─── Column Addition — Problem Generation ─────────────────────────

// Generate a random integer with exactly `digits` digits
function randInt(digits) {
  const min = Math.pow(10, digits - 1);
  const max = Math.pow(10, digits) - 1;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Generate a Level 1 problem (no carrying guaranteed)
// digits: 2 or 3
export function genLevel1Problem(digits) {
  // Keep generating until no carry occurs in any column
  while (true) {
    const a = randInt(digits);
    const b = randInt(digits);
    const aStr = String(a).padStart(digits, "0");
    const bStr = String(b).padStart(digits, "0");
    let hasCarry = false;
    for (let i = 0; i < digits; i++) {
      if (parseInt(aStr[i]) + parseInt(bStr[i]) >= 10) { hasCarry = true; break; }
    }
    if (!hasCarry) return { numbers: [a, b], digits };
  }
}

// Generate a Level 2 problem (2 numbers, 3-4 digits, carrying expected)
export function genLevel2Problem(digits) {
  // Ensure at least one column has a carry
  while (true) {
    const a = randInt(digits);
    const b = randInt(digits);
    const aStr = String(a).padStart(digits, "0");
    const bStr = String(b).padStart(digits, "0");
    let hasCarry = false;
    for (let i = 0; i < digits; i++) {
      if (parseInt(aStr[i]) + parseInt(bStr[i]) >= 10) { hasCarry = true; break; }
    }
    if (hasCarry) return { numbers: [a, b], digits };
  }
}

// Generate a Level 3 problem (3-4 numbers, 2-4 digits each)
export function genLevel3Problem() {
  const numCount = Math.floor(Math.random() * 2) + 3; // 3 or 4 numbers
  const digits = Math.floor(Math.random() * 3) + 2;   // 2, 3, or 4 digits
  const numbers = Array.from({ length: numCount }, () => randInt(digits));
  return { numbers, digits };
}

// Build column steps for a problem (right to left)
// Returns array of column objects, rightmost first
export function buildColumns(numbers) {
  const maxLen = Math.max(...numbers.map(n => String(n).length));
  const padded = numbers.map(n => String(n).padStart(maxLen, " "));
  const columns = [];
  let carry = 0;

  for (let col = maxLen - 1; col >= 0; col--) {
    const digits = padded.map(n => {
      const ch = n[col];
      return ch === " " ? 0 : parseInt(ch);
    });
    const colSum = digits.reduce((s, d) => s + d, 0) + carry;
    const writeDown = colSum % 10;
    const newCarry = Math.floor(colSum / 10);
    columns.push({
      colIndex: col,       // index from left in the padded string
      digits,              // digits in this column for each number
      carryIn: carry,
      sum: colSum,
      writeDown,
      carryOut: newCarry,
      isLeftmost: col === 0,
    });
    carry = newCarry;
  }

  // If there's a final carry, add a virtual column
  if (carry > 0) {
    columns.push({
      colIndex: -1,
      digits: numbers.map(() => 0),
      carryIn: carry,
      sum: carry,
      writeDown: carry,
      carryOut: 0,
      isLeftmost: true,
      isFinalCarry: true,
    });
  }

  return columns;
}

// Get the correct full answer
export function getAnswer(numbers) {
  return numbers.reduce((s, n) => s + n, 0);
}
