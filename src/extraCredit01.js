// ─── Lesson 1 Extra Credit — Missing Digit Problems ───────────────
import {
  genAddNoCarry, genAddCarry, genAddMulti,
  genSubNoBorow, genSubBorrow, genSubBorrowZero,
} from "./lesson01Mastery";

// ─── Core equation checker ────────────────────────────────────────
function checkAdd(numbers, answer) {
  return numbers.reduce((s, n) => s + n, 0) === answer;
}
function checkSub(top, bot, answer) {
  return top - bot === answer;
}

// ─── Represent a problem as arrays of digit slots ─────────────────
// slot: { value: digit, missing: bool, target: 'num'|'ans'|'top'|'bot', numIdx, posFromRight }
function problemToSlots(problem) {
  const isAdd = problem.type.startsWith("add");
  const numbers = isAdd ? problem.numbers : [problem.top, problem.bot];
  const answer = problem.answer;
  const maxLen = Math.max(...numbers.map(n => String(n).length), String(answer).length);
  const slots = [];

  numbers.forEach((num, ni) => {
    const str = String(num).padStart(maxLen, " ");
    str.split("").forEach((ch, ci) => {
      if (ch === " ") return;
      const posFromRight = maxLen - 1 - ci;
      slots.push({
        value: parseInt(ch),
        missing: false,
        target: isAdd ? "num" : (ni === 0 ? "top" : "bot"),
        numIdx: ni,
        posFromRight,
      });
    });
  });

  const ansStr = String(answer).padStart(maxLen, " ");
  ansStr.split("").forEach((ch, ci) => {
    if (ch === " ") return;
    const posFromRight = maxLen - 1 - ci;
    slots.push({
      value: parseInt(ch),
      missing: false,
      target: "ans",
      posFromRight,
    });
  });

  return { slots, isAdd, numbers: [...numbers], answer, maxLen };
}

// ─── Reconstruct numbers from slots ──────────────────────────────
function slotsToValues(slots, isAdd, origNumbers, origAnswer) {
  const numbers = origNumbers.map((num, ni) => {
    const numStr = String(num);
    let arr = numStr.split("");
    slots.filter(s => (isAdd ? s.target === "num" : (ni === 0 ? s.target === "top" : s.target === "bot")) && s.numIdx === ni)
      .forEach(s => {
        const pos = arr.length - 1 - s.posFromRight;
        if (pos >= 0) arr[pos] = String(s.value);
      });
    return parseInt(arr.join(""));
  });

  const ansStr = String(origAnswer);
  let ansArr = ansStr.split("");
  slots.filter(s => s.target === "ans")
    .forEach(s => {
      const pos = ansArr.length - 1 - s.posFromRight;
      if (pos >= 0) ansArr[pos] = String(s.value);
    });
  const answer = parseInt(ansArr.join(""));

  return { numbers, answer };
}

// ─── Check if a set of missing slots has unique solutions ─────────
function hasUniqueSolution(problem, missingSlotIndices, slots) {
  const { isAdd, numbers: origNums, answer: origAns } = problem;
  const missingSlots = missingSlotIndices.map(i => slots[i]);

  // Try all combinations of digits for the missing slots
  const digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  let validCombos = 0;
  let validCombo = null;

  function tryCombo(slotIdx, current) {
    if (validCombos > 1) return; // Early exit
    if (slotIdx === missingSlots.length) {
      // Check equation
      const testSlots = slots.map((s, i) => {
        const missingIdx = missingSlotIndices.indexOf(i);
        return missingIdx >= 0 ? { ...s, value: current[missingIdx] } : s;
      });
      const { numbers, answer } = slotsToValues(testSlots, isAdd, origNums, origAns);
      const valid = isAdd ? checkAdd(numbers, answer) : checkSub(numbers[0], numbers[1], answer);
      if (valid) {
        validCombos++;
        if (validCombos === 1) validCombo = [...current];
      }
      return;
    }

    const slot = missingSlots[slotIdx];
    for (const d of digits) {
      // No leading zeros
      const strLen = String(isAdd ? origNums[slot.numIdx] : (slot.target === "top" ? origNums[0] : slot.target === "bot" ? origNums[1] : origAns)).length;
      if (strLen > 1 && slot.posFromRight === strLen - 1 && d === 0) continue;
      tryCombo(slotIdx + 1, [...current, d]);
      if (validCombos > 1) return;
    }
  }

  tryCombo(0, []);
  return { unique: validCombos === 1, solution: validCombo };
}

// ─── Find maximum set of removable digits ─────────────────────────
function maximizeRemovals(problem) {
  const { slots, isAdd } = problemToSlots(problem);
  const n = slots.length;

  // Start with no removals, greedily add more
  let currentMissing = [];
  let shuffledIndices = [...Array(n).keys()].sort(() => Math.random() - 0.5);

  for (const idx of shuffledIndices) {
    const candidate = [...currentMissing, idx];
    const { unique } = hasUniqueSolution(problem, candidate, slots);
    if (unique) {
      currentMissing = candidate;
    }
  }

  // Ensure at least one missing slot is in a number (not just answer)
  const hasNumberMissing = currentMissing.some(i => slots[i].target !== "ans");
  if (!hasNumberMissing) {
    // Force include a number slot
    const numSlotIndices = shuffledIndices.filter(i => slots[i].target !== "ans");
    for (const idx of numSlotIndices) {
      const candidate = [...currentMissing, idx];
      const { unique } = hasUniqueSolution(problem, candidate, slots);
      if (unique) {
        currentMissing = candidate;
        break;
      } else {
        // Try replacing answer slot with this number slot
        for (let ai = 0; ai < currentMissing.length; ai++) {
          if (slots[currentMissing[ai]].target === "ans") {
            const swapped = [...currentMissing];
            swapped[ai] = idx;
            const { unique: u2 } = hasUniqueSolution(problem, swapped, slots);
            if (u2) {
              currentMissing = swapped;
              break;
            }
          }
        }
        const hasNum = currentMissing.some(i => slots[i].target !== "ans");
        if (hasNum) break;
      }
    }
  }

  // Get the correct values for missing slots
  const removals = currentMissing.map(i => ({
    slotIndex: i,
    target: slots[i].target,
    numIdx: slots[i].numIdx,
    posFromRight: slots[i].posFromRight,
    correctDigit: slots[i].value,
  }));

  return { removals, slots };
}

// ─── Generate a missing digit problem ─────────────────────────────
export function generateExtraCreditProblem(topicId) {
  let attempts = 0;
  while (attempts < 200) {
    attempts++;
    let problem;
    switch (topicId) {
      case "add-no-carry":    problem = genAddNoCarry(3, 3); break;
      case "add-carry":       problem = genAddCarry(4, 4); break;
      case "add-multi":       problem = genAddMulti(); break;
      case "sub-no-borrow":   problem = genSubNoBorow(3, 3); break;
      case "sub-borrow":      problem = genSubBorrow(4, 4); break;
      case "sub-borrow-zero": problem = genSubBorrowZero(4, 4); break;
      default: problem = genAddNoCarry(3, 3);
    }

    const { removals, slots } = maximizeRemovals(problem);
    if (removals.length === 0) continue;

    // Require at least one missing in a number
    const hasNumberMissing = removals.some(r => r.target !== "ans");
    if (!hasNumberMissing) continue;

    return { ...problem, removals, slots };
  }
  return null;
}

// ─── The 6 extra credit topic types ──────────────────────────────
export const EC_TOPICS = [
  { id: "add-no-carry",    label: "Addition - No Carrying" },
  { id: "add-carry",       label: "Addition - With Carrying" },
  { id: "add-multi",       label: "Addition - Multiple Numbers" },
  { id: "sub-no-borrow",   label: "Subtraction - No Borrowing" },
  { id: "sub-borrow",      label: "Subtraction - With Borrowing" },
  { id: "sub-borrow-zero", label: "Subtraction - Borrowing from Zero" },
];

// ─── Build display rows for rendering ────────────────────────────
export function buildProblemDisplay(problem) {
  if (!problem) return null;
  const { removals } = problem;
  const isAdd = problem.type.startsWith("add");
  const numbers = isAdd ? problem.numbers : [problem.top, problem.bot];
  const answer = problem.answer;
  const maxLen = Math.max(...numbers.map(n => String(n).length), String(answer).length);

  function isMissing(target, numIdx, posFromRight) {
    return removals.some(r =>
      r.target === target &&
      (target === "ans" || r.numIdx === numIdx) &&
      r.posFromRight === posFromRight
    );
  }

  function getCorrectDigit(target, numIdx, posFromRight) {
    const r = removals.find(r =>
      r.target === target &&
      (target === "ans" || r.numIdx === numIdx) &&
      r.posFromRight === posFromRight
    );
    return r ? r.correctDigit : null;
  }

  const rows = numbers.map((num, ni) => {
    const str = String(num).padStart(maxLen, " ");
    const target = isAdd ? "num" : (ni === 0 ? "top" : "bot");
    return str.split("").map((ch, ci) => {
      const posFromRight = maxLen - 1 - ci;
      const missing = ch !== " " && isMissing(target, ni, posFromRight);
      return {
        digit: ch === " " ? "" : ch,
        isMissing: missing,
        correctDigit: missing ? getCorrectDigit(target, ni, posFromRight) : null,
        posFromRight,
        rowIndex: ni,
        target,
        numIdx: ni,
      };
    });
  });

  const ansStr = String(answer).padStart(maxLen, " ");
  const ansRow = ansStr.split("").map((ch, ci) => {
    const posFromRight = maxLen - 1 - ci;
    const missing = ch !== " " && isMissing("ans", null, posFromRight);
    return {
      digit: ch === " " ? "" : ch,
      isMissing: missing,
      correctDigit: missing ? getCorrectDigit("ans", null, posFromRight) : null,
      posFromRight,
      rowIndex: -1,
      target: "ans",
    };
  });

  // All missing cells in order for sequential answering
  const allMissing = [
    ...rows.flatMap(row => row.filter(c => c.isMissing)),
    ...ansRow.filter(c => c.isMissing),
  ];

  return { rows, ansRow, isAdd, maxLen, allMissing };
}

// ─── Grade answer for all missing digits ─────────────────────────
export function gradeAllMissing(enteredDigits, problem) {
  // enteredDigits: { posFromRight, target, numIdx } -> digit
  return problem.removals.every(r => {
    const key = `${r.target}_${r.numIdx}_${r.posFromRight}`;
    return enteredDigits[key] === r.correctDigit;
  });
}
