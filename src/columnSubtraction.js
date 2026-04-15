//  Column Subtraction  Problem Generation 

function randInt(digits) {
  const min = Math.pow(10, digits - 1);
  const max = Math.pow(10, digits) - 1;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Ensure no borrowing needed in any column
export function genNoBorrowProblem(topDigits, botDigits) {
  while (true) {
    const top = randInt(topDigits);
    const bot = randInt(botDigits);
    if (bot > top) continue;
    const topStr = String(top).padStart(topDigits, "0");
    const botStr = String(bot).padStart(topDigits, "0");
    let needsBorrow = false;
    for (let i = topDigits - 1; i >= 0; i--) {
      if (parseInt(botStr[i]) > parseInt(topStr[i])) { needsBorrow = true; break; }
    }
    if (!needsBorrow) return { top, bot, answer: top - bot };
  }
}

// Borrowing required but NOT from zero
export function genBorrowProblem(topDigits, botDigits) {
  while (true) {
    const top = randInt(topDigits);
    const bot = randInt(Math.min(botDigits, topDigits));
    if (bot >= top) continue;
    const topStr = String(top).padStart(topDigits, "0");
    const botStr = String(bot).padStart(topDigits, "0");
    let hasBorrow = false;
    let borrowFromZero = false;
    let carry = 0;
    for (let i = topDigits - 1; i >= 0; i--) {
      const t = parseInt(topStr[i]) - carry;
      const b = parseInt(botStr[i] || "0");
      if (b > t) {
        hasBorrow = true;
        carry = 1;
        // Check if we'd be borrowing from a zero
        if (i > 0 && parseInt(topStr[i - 1]) === 0) { borrowFromZero = true; break; }
      } else {
        carry = 0;
      }
    }
    if (hasBorrow && !borrowFromZero) return { top, bot, answer: top - bot };
  }
}

// Borrowing FROM zero required
export function genBorrowFromZeroProblem(topDigits, botDigits) {
  while (true) {
    const top = randInt(topDigits);
    const bot = randInt(botDigits);
    if (bot >= top) continue;
    const topStr = String(top).padStart(topDigits, "0");
    const botStr = String(bot).padStart(topDigits, "0");
    let hasBorrowFromZero = false;
    let carry = 0;
    for (let i = topDigits - 1; i >= 0; i--) {
      const t = parseInt(topStr[i]) - carry;
      const b = parseInt(botStr[i] || "0");
      if (b > t) {
        carry = 1;
        if (i > 0 && parseInt(topStr[i - 1]) === 0) {
          hasBorrowFromZero = true;
          break;
        }
      } else {
        carry = 0;
      }
    }
    if (hasBorrowFromZero) return { top, bot, answer: top - bot };
  }
}

// Generate problem by topic
export function genSubtractionProblem(topic) {
  switch (topic) {
    case "sub-no-borrow-2d":  return genNoBorrowProblem(2, 2);
    case "sub-no-borrow-3d2": return genNoBorrowProblem(3, 2);
    case "sub-no-borrow-3d":  return genNoBorrowProblem(3, 3);
    case "sub-borrow-3d":     return genBorrowProblem(3, 3);
    case "sub-borrow-4d3":    return genBorrowProblem(4, 3);
    case "sub-borrow-4d":     return genBorrowProblem(4, 4);
    case "sub-borrow-zero-3d": return genBorrowFromZeroProblem(3, 3);
    case "sub-borrow-zero-4d": return genBorrowFromZeroProblem(4, 4);
    case "sub-borrow-zero-5d": return genBorrowFromZeroProblem(5, 5);
    default: return genNoBorrowProblem(2, 2);
  }
}
