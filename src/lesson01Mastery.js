//  Lesson 1 Mastery  Problem Generation 

function randInt(digits) {
  const min = Math.pow(10, digits - 1);
  const max = Math.pow(10, digits) - 1;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

//  Addition: No Carrying 
export function genAddNoCarry(aDigits, bDigits) {
  while (true) {
    const a = randInt(aDigits);
    const b = randInt(bDigits);
    const aStr = String(a).padStart(aDigits, "0");
    const bStr = String(b).padStart(aDigits, "0");
    let hasCarry = false;
    for (let i = 0; i < aDigits; i++) {
      if (parseInt(aStr[i]) + parseInt(bStr[i]) >= 10) { hasCarry = true; break; }
    }
    if (!hasCarry && b <= a) return { numbers: [a, b], answer: a + b, type: "add-no-carry" };
  }
}

//  Addition: With Carrying 
export function genAddCarry(aDigits, bDigits) {
  while (true) {
    const a = randInt(aDigits);
    const b = randInt(bDigits);
    if (b > a) continue;
    const aStr = String(a).padStart(aDigits, "0");
    const bStr = String(b).padStart(aDigits, "0");
    let hasCarry = false;
    for (let i = 0; i < aDigits; i++) {
      if (parseInt(aStr[i]) + parseInt(bStr[i]) >= 10) { hasCarry = true; break; }
    }
    if (hasCarry) return { numbers: [a, b], answer: a + b, type: "add-carry" };
  }
}

//  Addition: Multiple Numbers (2d+4d+3d+3d) 
export function genAddMulti() {
  const a = randInt(2);
  const b = randInt(4);
  const c = randInt(3);
  const d = randInt(3);
  return { numbers: [a, b, c, d], answer: a + b + c + d, type: "add-multi" };
}

//  Subtraction: No Borrowing 
export function genSubNoBorow(aDigits, bDigits) {
  while (true) {
    const a = randInt(aDigits);
    const b = randInt(bDigits);
    if (b > a) continue;
    const aStr = String(a).padStart(aDigits, "0");
    const bStr = String(b).padStart(aDigits, "0");
    let needsBorrow = false;
    for (let i = aDigits - 1; i >= 0; i--) {
      if (parseInt(bStr[i] || "0") > parseInt(aStr[i])) { needsBorrow = true; break; }
    }
    if (!needsBorrow) return { top: a, bot: b, answer: a - b, type: "sub-no-borrow" };
  }
}

//  Subtraction: With Borrowing (not from zero) 
export function genSubBorrow(aDigits, bDigits) {
  while (true) {
    const a = randInt(aDigits);
    const b = randInt(bDigits);
    if (b >= a) continue;
    const aStr = String(a).padStart(aDigits, "0");
    const bStr = String(b).padStart(aDigits, "0");
    let hasBorrow = false;
    let borrowFromZero = false;
    let carry = 0;
    for (let i = aDigits - 1; i >= 0; i--) {
      const t = parseInt(aStr[i]) - carry;
      const bt = parseInt(bStr[i] || "0");
      if (bt > t) {
        hasBorrow = true;
        carry = 1;
        if (i > 0 && parseInt(aStr[i - 1]) === 0) { borrowFromZero = true; break; }
      } else { carry = 0; }
    }
    if (hasBorrow && !borrowFromZero) return { top: a, bot: b, answer: a - b, type: "sub-borrow" };
  }
}

//  Subtraction: Borrowing From Zero 
export function genSubBorrowZero(aDigits, bDigits) {
  while (true) {
    const a = randInt(aDigits);
    const b = randInt(bDigits);
    if (b >= a) continue;
    const aStr = String(a).padStart(aDigits, "0");
    const bStr = String(b).padStart(aDigits, "0");
    let hasBorrowFromZero = false;
    let carry = 0;
    for (let i = aDigits - 1; i >= 0; i--) {
      const t = parseInt(aStr[i]) - carry;
      const bt = parseInt(bStr[i] || "0");
      if (bt > t) {
        carry = 1;
        if (i > 0 && parseInt(aStr[i - 1]) === 0) { hasBorrowFromZero = true; break; }
      } else { carry = 0; }
    }
    if (hasBorrowFromZero) return { top: a, bot: b, answer: a - b, type: "sub-borrow-zero" };
  }
}

//  Compute carry digits for addition 
export function computeCarries(numbers) {
  const maxLen = Math.max(...numbers.map(n => String(n).length));
  const padded = numbers.map(n => String(n).padStart(maxLen, "0"));
  const carries = {}; // colIndex (from right, 0=ones) -> carry digit
  let carry = 0;
  for (let col = maxLen - 1; col >= 0; col--) {
    const colSum = padded.reduce((s, row) => s + parseInt(row[col]), 0) + carry;
    carry = Math.floor(colSum / 10);
    if (carry > 0 && col > 0) carries[col - 1] = carry; // carry goes to next column left
  }
  return carries; // key = colIndex from LEFT in padded string
}

//  Compute borrow marks for subtraction 
// Returns array of { colIndex, originalDigit, newDigit, borrowedFrom } per borrow
export function computeBorrows(top, bot) {
  const maxLen = Math.max(String(top).length, String(bot).length);
  const topStr = String(top).padStart(maxLen, "0").split("").map(Number);
  const botStr = String(bot).padStart(maxLen, "0").split("").map(Number);
  const borrows = []; // { col (from right), topOriginal, topNew }
  const workTop = [...topStr];
  
  for (let i = maxLen - 1; i >= 0; i--) {
    if (botStr[i] > workTop[i]) {
      // Need to borrow from left
      let borrowFrom = i - 1;
      while (borrowFrom >= 0 && workTop[borrowFrom] === 0) borrowFrom--;
      if (borrowFrom >= 0) {
        const original = workTop[borrowFrom];
        workTop[borrowFrom] -= 1;
        borrows.push({ col: borrowFrom, original, newVal: workTop[borrowFrom] });
        // Fill zeros in between
        for (let k = borrowFrom + 1; k < i; k++) {
          const orig = workTop[k];
          workTop[k] = 9;
          borrows.push({ col: k, original: orig, newVal: 9 });
        }
        workTop[i] += 10;
        borrows.push({ col: i, original: workTop[i] - 10, newVal: workTop[i] });
      }
    }
  }
  return { borrows, workTop };
}

//  Topic definitions 
export const TOPICS = [
  {
    id: "add-no-carry",
    label: "Column Addition  No Carrying",
    icon: "",
    subtypes: [
      { label: "2-digit + 2-digit", gen: () => genAddNoCarry(2, 2) },
      { label: "3-digit + 2-digit", gen: () => genAddNoCarry(3, 2) },
      { label: "3-digit + 3-digit", gen: () => genAddNoCarry(3, 3) },
    ],
  },
  {
    id: "add-carry",
    label: "Column Addition  With Carrying",
    icon: "",
    subtypes: [
      { label: "3-digit + 3-digit", gen: () => genAddCarry(3, 3) },
      { label: "4-digit + 3-digit", gen: () => genAddCarry(4, 3) },
      { label: "4-digit + 4-digit", gen: () => genAddCarry(4, 4) },
    ],
  },
  {
    id: "add-multi",
    label: "Column Addition  Multiple Numbers",
    icon: "",
    subtypes: [
      { label: "4 numbers mixed digits", gen: () => genAddMulti() },
    ],
  },
  {
    id: "sub-no-borrow",
    label: "Column Subtraction  No Borrowing",
    icon: "",
    subtypes: [
      { label: "2-digit  2-digit", gen: () => genSubNoBorow(2, 2) },
      { label: "3-digit  2-digit", gen: () => genSubNoBorow(3, 2) },
      { label: "3-digit  3-digit", gen: () => genSubNoBorow(3, 3) },
    ],
  },
  {
    id: "sub-borrow",
    label: "Column Subtraction  With Borrowing",
    icon: "",
    subtypes: [
      { label: "3-digit  3-digit", gen: () => genSubBorrow(3, 3) },
      { label: "4-digit  3-digit", gen: () => genSubBorrow(4, 3) },
      { label: "4-digit  4-digit", gen: () => genSubBorrow(4, 4) },
    ],
  },
  {
    id: "sub-borrow-zero",
    label: "Column Subtraction  Borrowing from Zero",
    icon: "",
    subtypes: [
      { label: "3-digit  3-digit", gen: () => genSubBorrowZero(3, 3) },
      { label: "4-digit  4-digit", gen: () => genSubBorrowZero(4, 4) },
      { label: "5-digit  5-digit", gen: () => genSubBorrowZero(5, 5) },
    ],
  },
];
