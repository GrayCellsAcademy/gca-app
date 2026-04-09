// ─── Lesson 1 Extra Credit — Missing Digit Problems ───────────────
import {
  genAddNoCarry, genAddCarry, genAddMulti,
  genSubNoBorow, genSubBorrow, genSubBorrowZero,
} from "./lesson01Mastery";

// ── Check if an equation is valid ────────────────────────────────
// Given numbers array and answer, check if addition holds
function checkAddition(numbers, answer) {
  return numbers.reduce((s, n) => s + n, 0) === answer;
}
function checkSubtraction(top, bot, answer) {
  return top - bot === answer;
}

// ── Try to substitute a digit into a position and check validity ──
function substituteDigit(str, posFromRight, digit) {
  const arr = str.split("");
  const pos = arr.length - 1 - posFromRight;
  if (pos < 0 || pos >= arr.length) return null;
  arr[pos] = String(digit);
  return parseInt(arr.join(""));
}

// ── Find positions where removing a digit gives unique solution ───
function findRemovableDigits(problem) {
  const { type } = problem;
  const removable = []; // { target: 'number'|'answer'|'top'|'bot', numberIdx, posFromRight, correctDigit }

  if (type === "add-no-carry" || type === "add-carry" || type === "add-multi") {
    const numbers = problem.numbers;
    const answer = problem.answer;

    // Try removing a digit from each number
    numbers.forEach((num, ni) => {
      const numStr = String(num);
      for (let pos = 0; pos < numStr.length; pos++) {
        const posFromRight = numStr.length - 1 - pos;
        const correctDigit = parseInt(numStr[pos]);
        // Count how many digits 0-9 work
        let validDigits = [];
        for (let d = 0; d <= 9; d++) {
          const newNum = substituteDigit(numStr, posFromRight, d);
          if (newNum === null) continue;
          // Leading zero check
          if (numStr.length > 1 && d === 0 && pos === 0) continue;
          const newNumbers = [...numbers];
          newNumbers[ni] = newNum;
          if (checkAddition(newNumbers, answer)) validDigits.push(d);
        }
        if (validDigits.length === 1) {
          removable.push({ target: "number", numberIdx: ni, posFromRight, correctDigit });
        }
      }
    });

    // Try removing a digit from the answer
    const ansStr = String(answer);
    for (let pos = 0; pos < ansStr.length; pos++) {
      const posFromRight = ansStr.length - 1 - pos;
      const correctDigit = parseInt(ansStr[pos]);
      let validDigits = [];
      for (let d = 0; d <= 9; d++) {
        const newAns = substituteDigit(ansStr, posFromRight, d);
        if (newAns === null) continue;
        if (ansStr.length > 1 && d === 0 && pos === 0) continue;
        if (checkAddition(numbers, newAns)) validDigits.push(d);
      }
      if (validDigits.length === 1) {
        removable.push({ target: "answer", posFromRight, correctDigit });
      }
    }

  } else {
    // Subtraction
    const { top, bot, answer } = problem;

    // Try removing from top
    const topStr = String(top);
    for (let pos = 0; pos < topStr.length; pos++) {
      const posFromRight = topStr.length - 1 - pos;
      const correctDigit = parseInt(topStr[pos]);
      let validDigits = [];
      for (let d = 0; d <= 9; d++) {
        const newTop = substituteDigit(topStr, posFromRight, d);
        if (newTop === null) continue;
        if (topStr.length > 1 && d === 0 && pos === 0) continue;
        if (newTop >= bot && checkSubtraction(newTop, bot, answer)) validDigits.push(d);
      }
      if (validDigits.length === 1) {
        removable.push({ target: "top", posFromRight, correctDigit });
      }
    }

    // Try removing from bot
    const botStr = String(bot);
    for (let pos = 0; pos < botStr.length; pos++) {
      const posFromRight = botStr.length - 1 - pos;
      const correctDigit = parseInt(botStr[pos]);
      let validDigits = [];
      for (let d = 0; d <= 9; d++) {
        const newBot = substituteDigit(botStr, posFromRight, d);
        if (newBot === null) continue;
        if (botStr.length > 1 && d === 0 && pos === 0) continue;
        if (top >= newBot && checkSubtraction(top, newBot, answer)) validDigits.push(d);
      }
      if (validDigits.length === 1) {
        removable.push({ target: "bot", posFromRight, correctDigit });
      }
    }

    // Try removing from answer
    const ansStr = String(answer);
    for (let pos = 0; pos < ansStr.length; pos++) {
      const posFromRight = ansStr.length - 1 - pos;
      const correctDigit = parseInt(ansStr[pos]);
      let validDigits = [];
      for (let d = 0; d <= 9; d++) {
        const newAns = substituteDigit(ansStr, posFromRight, d);
        if (newAns === null) continue;
        if (ansStr.length > 1 && d === 0 && pos === 0) continue;
        if (checkSubtraction(top, bot, newAns)) validDigits.push(d);
      }
      if (validDigits.length === 1) {
        removable.push({ target: "answer", posFromRight, correctDigit });
      }
    }
  }

  return removable;
}

// ── Generate a missing digit problem ─────────────────────────────
function genMissingDigitProblem(topicId) {
  let attempts = 0;
  while (attempts < 100) {
    attempts++;
    let problem;
    switch (topicId) {
      case "add-no-carry":  problem = genAddNoCarry(3, 3); break;
      case "add-carry":     problem = genAddCarry(4, 4); break;
      case "add-multi":     problem = genAddMulti(); break;
      case "sub-no-borrow": problem = genSubNoBorow(3, 3); break;
      case "sub-borrow":    problem = genSubBorrow(4, 4); break;
      case "sub-borrow-zero": problem = genSubBorrowZero(4, 4); break;
      default: problem = genAddNoCarry(3, 3);
    }

    const removable = findRemovableDigits(problem);
    if (removable.length === 0) continue;

    // Pick one removal at random
    const removal = removable[Math.floor(Math.random() * removable.length)];
    return { ...problem, removal, topicId };
  }
  return null;
}

// ── The 6 extra credit topic types ───────────────────────────────
export const EC_TOPICS = [
  { id: "add-no-carry",    label: "Addition — No Carrying" },
  { id: "add-carry",       label: "Addition — With Carrying" },
  { id: "add-multi",       label: "Addition — Multiple Numbers" },
  { id: "sub-no-borrow",   label: "Subtraction — No Borrowing" },
  { id: "sub-borrow",      label: "Subtraction — With Borrowing" },
  { id: "sub-borrow-zero", label: "Subtraction — Borrowing from Zero" },
];

export function generateExtraCreditProblem(topicId) {
  return genMissingDigitProblem(topicId);
}

// ── Build display representation ──────────────────────────────────
// Returns rows of cells: each cell is { digit, isMissing, target, posFromRight, numberIdx? }
export function buildProblemDisplay(problem) {
  if (!problem) return null;
  const { removal } = problem;
  const isAddition = problem.type.startsWith("add");
  const numbers = isAddition ? problem.numbers : [problem.top, problem.bot];
  const answer = problem.answer;
  const maxLen = Math.max(...numbers.map(n => String(n).length), String(answer).length);

  const rows = numbers.map((num, ni) => {
    const str = String(num).padStart(maxLen, " ");
    return str.split("").map((ch, ci) => {
      const posFromRight = maxLen - 1 - ci;
      const isMissing = (
        (isAddition && removal.target === "number" && removal.numberIdx === ni && removal.posFromRight === posFromRight) ||
        (!isAddition && removal.target === (ni === 0 ? "top" : "bot") && removal.posFromRight === posFromRight)
      );
      return { digit: ch === " " ? "" : ch, isMissing, posFromRight, rowIndex: ni };
    });
  });

  const ansStr = String(answer).padStart(maxLen, " ");
  const ansRow = ansStr.split("").map((ch, ci) => {
    const posFromRight = maxLen - 1 - ci;
    const isMissing = removal.target === "answer" && removal.posFromRight === posFromRight;
    return { digit: ch === " " ? "" : ch, isMissing, posFromRight, rowIndex: -1 };
  });

  return { rows, ansRow, isAddition, maxLen };
}
