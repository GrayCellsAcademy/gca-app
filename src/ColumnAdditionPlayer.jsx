import { useState, useEffect, useRef } from "react";
import { saveProgress, getProgress } from "./firebase";
import {
  genLevel1Problem, genLevel2Problem, genLevel3Problem,
  buildColumns, getAnswer,
} from "./columnAddition";

export const COLUMN_ADDITION_TOPIC_ID = "column-addition-v1";
const TOTAL_LEVELS = 3;

// ─── Speak helper ─────────────────────────────────────────────────
function speak(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 1.0; utter.pitch = 1.2; utter.volume = 1.0;
  const voices = window.speechSynthesis.getVoices();
  const pick = voices.find(v => v.name.includes("Google US English Female"))
    || voices.find(v => v.lang === "en-US") || voices[0];
  if (pick) utter.voice = pick;
  window.speechSynthesis.speak(utter);
}

// ─── Column Problem Display ────────────────────────────────────────
function ColumnDisplay({ numbers, activeColIndex, answeredDigits, carries }) {
  const maxLen = Math.max(...numbers.map(n => String(n).length));
  const padded = numbers.map(n => String(n).padStart(maxLen, " "));
  // Build answer row from answeredDigits (rightmost first → reverse for display)
  const answerRow = Array(maxLen).fill(null);
  answeredDigits.forEach((d, i) => {
    // i=0 is rightmost col (maxLen-1), i=1 is next, etc.
    answerRow[maxLen - 1 - i] = d;
  });

  const cellStyle = (colIdx, isActive) => ({
    width: 36, height: 44,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 26, fontWeight: 700, fontFamily: "var(--mono)",
    background: isActive ? "rgba(59,130,246,0.25)" : "transparent",
    border: isActive ? "2px solid var(--blue)" : "2px solid transparent",
    borderRadius: 6,
    transition: "all 0.2s",
    color: "var(--text)",
    minWidth: 36,
  });

  return (
    <div style={{ display: "inline-block", background: "var(--bg2)", borderRadius: "var(--radius)", padding: "20px 28px" }}>
      {/* Carry row */}
      <div style={{ display: "flex", gap: 4, marginBottom: 2, paddingLeft: 4 }}>
        <div style={{ width: 28 }} />{/* plus sign space */}
        {Array.from({ length: maxLen }, (_, ci) => {
          const carryHere = carries[maxLen - 1 - ci]; // carries indexed rightmost first
          return (
            <div key={ci} style={{ width: 36, height: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "var(--amber)", fontWeight: 700, fontFamily: "var(--mono)" }}>
              {carryHere || ""}
            </div>
          );
        })}
      </div>

      {/* Number rows */}
      {padded.map((row, ri) => (
        <div key={ri} style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
          <div style={{ width: 28, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: "var(--text3)" }}>
            {ri === padded.length - 1 ? "+" : ""}
          </div>
          {row.split("").map((ch, ci) => {
            const isActive = ci === activeColIndex;
            return (
              <div key={ci} style={cellStyle(ci, isActive)}>
                {ch === " " ? "" : ch}
              </div>
            );
          })}
        </div>
      ))}

      {/* Divider */}
      <div style={{ borderTop: "2.5px solid var(--text2)", margin: "6px 0 6px 32px" }} />

      {/* Answer row */}
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <div style={{ width: 28 }} />
        {answerRow.map((d, ci) => (
          <div key={ci} style={{ ...cellStyle(ci, false), color: d !== null ? "var(--green)" : "transparent", background: "transparent", border: "2px solid transparent" }}>
            {d !== null ? d : "·"}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Lesson Screen ────────────────────────────────────────────────
// ─── Visual Column Panel ──────────────────────────────────────────
function VisualColumnProblem({ numbers, highlightCol, showAnswer, label, labelColor }) {
  const maxLen = Math.max(...numbers.map(n => String(n).length));
  const padded = numbers.map(n => String(n).padStart(maxLen, " "));
  const answer = numbers.reduce((s, n) => s + n, 0);
  const answerStr = String(answer).padStart(maxLen, " ");
  const colNames = ["ones", "tens", "hundreds", "thousands"];

  const cellBg = (colIdx) => {
    if (highlightCol === null || highlightCol === undefined) return "transparent";
    const colFromRight = maxLen - 1 - colIdx;
    return colFromRight === highlightCol ? "rgba(59,130,246,0.3)" : "transparent";
  };
  const cellBorder = (colIdx) => {
    if (highlightCol === null || highlightCol === undefined) return "2px solid transparent";
    const colFromRight = maxLen - 1 - colIdx;
    return colFromRight === highlightCol ? "2px solid var(--blue)" : "2px solid transparent";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      {label && (
        <div style={{ fontSize: 11, fontWeight: 700, color: labelColor || "var(--text3)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4, textAlign: "center" }}>
          {label}
        </div>
      )}
      <div style={{ display: "flex", gap: 2, paddingLeft: 30 }}>
        {Array.from({ length: maxLen }, (_, ci) => {
          const colFromRight = maxLen - 1 - ci;
          const isHighlighted = highlightCol === colFromRight;
          return (
            <div key={ci} style={{ width: 36, textAlign: "center", fontSize: 9, fontWeight: 700, color: isHighlighted ? "var(--blue)" : "var(--text3)", textTransform: "uppercase" }}>
              {colNames[colFromRight] || ""}
            </div>
          );
        })}
      </div>
      <div style={{ background: "var(--bg)", borderRadius: "var(--radius)", padding: "12px 16px", display: "inline-block" }}>
        {padded.map((row, ri) => (
          <div key={ri} style={{ display: "flex", alignItems: "center", gap: 2, marginBottom: 2 }}>
            <div style={{ width: 24, textAlign: "right", fontSize: 20, color: "var(--text)", fontWeight: 700, fontFamily: "var(--mono)", paddingRight: 4 }}>
              {ri === padded.length - 1 ? "+" : ""}
            </div>
            {row.split("").map((ch, ci) => (
              <div key={ci} style={{ width: 34, height: 38, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700, fontFamily: "var(--mono)", color: "var(--text)", background: cellBg(ci), border: cellBorder(ci), borderRadius: 6, transition: "all 0.3s" }}>
                {ch === " " ? "" : ch}
              </div>
            ))}
          </div>
        ))}
        <div style={{ borderTop: "2.5px solid var(--text2)", margin: "4px 0 4px 28px" }} />
        {showAnswer && (
          <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
            <div style={{ width: 24 }} />
            {answerStr.split("").map((ch, ci) => (
              <div key={ci} style={{ width: 34, height: 38, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700, fontFamily: "var(--mono)", color: "var(--green)" }}>
                {ch === " " ? "" : ch}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Lesson Screen ────────────────────────────────────────────────
function LessonScreen({ level, onComplete, isReview }) {
  const examples = {
    1: [47, 31],
    2: [47, 35],
    3: [129, 84, 37],
  };
  const nums = examples[level];

  const panels = {
    1: [
      { label: "The numbers to add", labelColor: "var(--text2)", highlightCol: null, showAnswer: false, caption: "We need to add these two numbers. First, line them up correctly." },
      { label: "Ones column aligned", labelColor: "var(--blue)", highlightCol: 0, showAnswer: false, caption: "The ones digits line up in the same column. 7 is above 1." },
      { label: "Tens column — then add!", labelColor: "var(--cyan)", highlightCol: 1, showAnswer: true, caption: "Tens line up too. Now add each column right to left. Answer: 78." },
    ],
    2: [
      { label: "Set up the problem", labelColor: "var(--text2)", highlightCol: null, showAnswer: false, caption: "Line up the digits by place value as before." },
      { label: "Ones: 7+5=12 → write 2, carry 1", labelColor: "var(--blue)", highlightCol: 0, showAnswer: false, caption: "7+5=12. Write the 2 below. Carry the 1 to the tens column." },
      { label: "Tens: 1+4+3=8 → write 8", labelColor: "var(--cyan)", highlightCol: 1, showAnswer: true, caption: "Include the carry! 1+4+3=8. Write 8. Final answer: 82." },
    ],
    3: [
      { label: "Three numbers lined up", labelColor: "var(--text2)", highlightCol: null, showAnswer: false, caption: "Same idea — line up all three numbers by place value." },
      { label: "Ones: 9+4+7=20 → write 0, carry 2", labelColor: "var(--blue)", highlightCol: 0, showAnswer: false, caption: "9+4+7=20. Write 0. Carry 2 to the tens column." },
      { label: "Continue left — final answer", labelColor: "var(--cyan)", highlightCol: 1, showAnswer: true, caption: "Tens: 2+2+8+3=15 → write 5, carry 1. Hundreds: 1+1=2. Answer: 250." },
    ],
  };

  const voiceTexts = {
    1: "Welcome to column addition! We line up numbers so that digits with the same place value are in the same column — ones under ones, tens under tens. Then we add each column right to left.",
    2: "Now we tackle carrying. When a column adds up to 10 or more, write the ones digit and carry the tens digit to the next column. You will practice the sum, what to write, and what to carry.",
    3: "Now we add three or more numbers at once. Same process — line up place values, add right to left. Column sums can be larger, so carries might be bigger than 1.",
  };

  const titles = {
    1: "Column Addition — No Carrying",
    2: "Column Addition — With Carrying",
    3: "Column Addition — Multiple Numbers",
  };

  useEffect(() => { return () => { window.speechSynthesis?.cancel(); }; }, []);

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", animation: "fadeUp 0.4s ease" }}>
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
          <div style={{ fontSize: 34 }}>📐</div>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>{titles[level]}</h2>
            <p style={{ color: "var(--text2)", fontSize: 14 }}>Level {level} of {TOTAL_LEVELS} — study the three steps below</p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 24 }}>
          {panels[level].map((panel, i) => (
            <div key={i} style={{
              background: "var(--bg2)", borderRadius: "var(--radius)", padding: "16px 12px",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
              border: `1px solid ${i === 0 ? "var(--border)" : i === 1 ? "rgba(59,130,246,0.3)" : "rgba(6,182,212,0.3)"}`,
            }}>
              <VisualColumnProblem numbers={nums} highlightCol={panel.highlightCol} showAnswer={panel.showAnswer} label={panel.label} labelColor={panel.labelColor} />
              <p style={{ fontSize: 12, color: panel.labelColor === "var(--text2)" ? "var(--text3)" : panel.labelColor, textAlign: "center", lineHeight: 1.6, margin: 0 }}>
                {panel.caption}
              </p>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <button onClick={() => speak(voiceTexts[level])}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 99, border: "1.5px solid var(--blue)", background: "transparent", color: "var(--blue)", fontFamily: "var(--font)", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
            🔊 Hear explanation
          </button>
          <button className="btn btn-primary btn-lg" onClick={onComplete}>
            {isReview ? "← Back to Practice" : `Start Level ${level} Practice →`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Practice Screen ──────────────────────────────────────────────
function PracticeScreen({ level, onComplete, onReviewLesson, onHome }) {
  const phases = level === 1
    ? [{ digits: 2, target: 2 }, { digits: 3, target: 2 }]
    : level === 2
    ? [{ digits: 3, target: 2 }, { digits: 4, target: 2 }]
    : [{ multi: true, target: 2 }];

  const [phaseIdx, setPhaseIdx] = useState(0);
  const [streak, setStreak] = useState(0);
  const [problem, setProblem] = useState(null);
  const [columns, setColumns] = useState([]);
  const [colIdx, setColIdx] = useState(0);
  const phase = phases[phaseIdx];
  const [alignPhase, setAlignPhase] = useState(true);  // true = drag step, false = answering step
  const [slots, setSlots] = useState([]);               // slots in the drop zone (one per number)
  const [draggedIdx, setDraggedIdx] = useState(null);   // which number block is being dragged
  const [alignedWrong, setAlignedWrong] = useState(false); // did they misplace at least one?
  const [dragOver, setDragOver] = useState(null);
  const inputRef = useRef(null); = useState("sum");        // "sum" | "write" | "carry"
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState(null); // null | "correct" | "wrong"
  const [wrongAnswer, setWrongAnswer] = useState(null);
  const [answeredDigits, setAnsweredDigits] = useState([]); // digits written so far
  const [carries, setCarries] = useState({});     // colIndex → carry value shown
  const [problemComplete, setProblemComplete] = useState(false);
  const inputRef = useRef(null);

  const phase = phases[phaseIdx];

  const genProblem = () => {
    const prob = phase.multi
      ? genLevel3Problem()
      : level === 1
      ? genLevel1Problem(phase.digits)
      : genLevel2Problem(phase.digits);
    const cols = buildColumns(prob.numbers);
    setProblem(prob);
    setColumns(cols);
    setColIdx(0);
    setStep("sum");
    setInput("");
    setFeedback(null);
    setWrongAnswer(null);
    setAnsweredDigits([]);
    setCarries({});
    setProblemComplete(false);
    // Reset drag-to-align: shuffle the numbers so they're not already in order
    const shuffled = [...prob.numbers].sort(() => Math.random() - 0.5);
    setSlots(shuffled);
    setDraggedIdx(null);
    setAlignedWrong(false);
    setAlignPhase(true);
  };

  useEffect(() => { genProblem(); }, [phaseIdx]);

  useEffect(() => {
    if (!problemComplete) setTimeout(() => inputRef.current?.focus(), 80);
  }, [step, colIdx, problemComplete]);

  const currentCol = columns[colIdx];
  if (!problem || !currentCol) return <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><div className="spinner" /></div>;

  // Active column index in the padded display (left-indexed)
  const maxLen = Math.max(...problem.numbers.map(n => String(n).length));
  const activeColIndex = currentCol.isFinalCarry ? -1 : currentCol.colIndex;

  const getPrompt = () => {
    const col = currentCol;
    if (step === "sum") {
      const parts = col.digits.filter((d, i) => {
        const padded = String(problem.numbers[i]).padStart(maxLen, " ");
        return padded[col.colIndex] !== " ";
      });
      const carryPart = col.carryIn > 0 ? ` + ${col.carryIn} (carry)` : "";
      return `What is ${parts.join(" + ")}${carryPart}?`;
    }
    if (step === "write") return `What digit do we write in the answer? (ones digit of ${col.sum})`;
    if (step === "carry") return `What digit do we carry to the next column? (tens digit of ${col.sum})`;
    return "";
  };

  const getCorrectAnswer = () => {
    if (step === "sum") return currentCol.sum;
    if (step === "write") return currentCol.writeDown;
    if (step === "carry") return currentCol.carryOut;
    return 0;
  };

  const handleSubmit = () => {
    const val = parseInt(input.trim(), 10);
    const correct = getCorrectAnswer();

    if (isNaN(val) || val !== correct) {
      setFeedback("wrong");
      setWrongAnswer(correct);
      speak(`Not quite! The answer is ${correct}.`);
      return;
    }

    setFeedback("correct");
    setInput("");

    // Advance through steps
    const col = currentCol;
    const needsCarry = step === "write" && col.sum >= 10;

    if (step === "sum") {
      // Level 1 goes straight to next column (no write/carry steps shown explicitly)
      if (level === 1) {
        setAnsweredDigits(prev => [...prev, col.writeDown]);
        advanceColumn();
      } else {
        setStep("write");
      }
    } else if (step === "write") {
      setAnsweredDigits(prev => [...prev, val]);
      if (needsCarry) {
        setStep("carry");
      } else {
        advanceColumn();
      }
    } else if (step === "carry") {
      // Show carry in display
      setCarries(prev => ({ ...prev, [maxLen - 1 - colIdx - 1]: val }));
      advanceColumn();
    }
  };

  const advanceColumn = () => {
    const nextColIdx = colIdx + 1;
    if (nextColIdx >= columns.length) {
      // Problem complete!
      setProblemComplete(true);
      speak("Excellent! Problem complete!");
    } else {
      setColIdx(nextColIdx);
      setStep("sum");
      setFeedback(null);
      setWrongAnswer(null);
    }
  };

  const handleProblemNext = () => {
    // If they misaligned the numbers, it counts as incorrect — break streak
    const newStreak = alignedWrong ? 0 : streak + 1;
    setStreak(newStreak);
    if (newStreak >= phase.target) {
      const nextPhaseIdx = phaseIdx + 1;
      if (nextPhaseIdx >= phases.length) {
        onComplete();
      } else {
        setPhaseIdx(nextPhaseIdx);
        setStreak(0);
      }
    } else {
      genProblem();
    }
  };

  const handleWrongNext = () => {
    setStreak(0);
    setFeedback(null);
    setWrongAnswer(null);
    setInput("");
    setTimeout(() => inputRef.current?.focus(), 80);
  };

  const phaseLabel = phase.multi
    ? `${problem?.numbers.length} numbers, ${problem?.numbers[0]?.toString().length} digits each`
    : `${phase.digits}-digit numbers`;

  // ── Drag-to-align handlers ─────────────────────────────────────
  const handleDragStart = (idx) => setDraggedIdx(idx);
  const handleDragOver = (e, idx) => { e.preventDefault(); setDragOver(idx); };
  const handleDrop = (e, dropIdx) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === dropIdx) { setDragOver(null); return; }
    const newSlots = [...slots];
    [newSlots[draggedIdx], newSlots[dropIdx]] = [newSlots[dropIdx], newSlots[draggedIdx]];
    setSlots(newSlots);
    setDraggedIdx(null);
    setDragOver(null);
  };
  const handleDragEnd = () => { setDraggedIdx(null); setDragOver(null); };

  const checkAlignment = () => {
    // Correct order: numbers sorted descending by value (largest on top)
    // Actually correct order is just the original problem order
    const correct = problem.numbers;
    const isCorrect = slots.every((n, i) => n === correct[i]);
    if (!isCorrect) {
      setAlignedWrong(true);
      // Show correct alignment then continue
      setSlots([...correct]);
      setTimeout(() => {
        setAlignPhase(false);
        setTimeout(() => inputRef.current?.focus(), 100);
      }, 1200);
    } else {
      setAlignPhase(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  // Render drag-to-align screen
  if (alignPhase && problem) {
    const maxLen = Math.max(...problem.numbers.map(n => String(n).length));
    return (
      <div style={{ maxWidth: 640, margin: "0 auto", animation: "fadeUp 0.3s ease" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, gap: 8, flexWrap: "wrap" }}>
          <div style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)", borderRadius: 99, padding: "5px 14px", fontSize: 14, fontWeight: 700, color: "var(--blue)" }}>
            Level {level} — {phaseLabel}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-ghost btn-sm" style={{ fontSize: 13 }} onClick={() => { window.speechSynthesis?.cancel(); onReviewLesson(); }}>📖 Review Lesson</button>
            <button className="btn btn-ghost btn-sm" style={{ fontSize: 13 }} onClick={onHome}>← Home</button>
          </div>
        </div>

        <div className="card" style={{ textAlign: "center" }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>Line up the numbers!</h3>
          <p style={{ color: "var(--text2)", fontSize: 14, marginBottom: 24 }}>
            Drag the numbers into the correct order so that place values line up. Then click <strong>Check Alignment</strong>.
          </p>

          {/* Drop zone */}
          <div style={{ display: "inline-flex", flexDirection: "column", gap: 4, background: "var(--bg2)", borderRadius: "var(--radius)", padding: "20px 28px", marginBottom: 24, minWidth: 160 }}>
            {slots.map((num, i) => (
              <div
                key={i}
                draggable
                onDragStart={() => handleDragStart(i)}
                onDragOver={e => handleDragOver(e, i)}
                onDrop={e => handleDrop(e, i)}
                onDragEnd={handleDragEnd}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "8px 14px",
                  background: dragOver === i ? "rgba(59,130,246,0.2)" : draggedIdx === i ? "rgba(255,255,255,0.05)" : "var(--surface)",
                  border: `2px solid ${dragOver === i ? "var(--blue)" : "var(--border2)"}`,
                  borderRadius: "var(--radius-sm)",
                  cursor: "grab",
                  opacity: draggedIdx === i ? 0.4 : 1,
                  transition: "all 0.15s",
                  userSelect: "none",
                  justifyContent: "flex-end",
                }}>
                <span style={{ color: "var(--text3)", fontSize: 13 }}>⠿</span>
                <span style={{ fontFamily: "var(--mono)", fontSize: 28, fontWeight: 700, color: "var(--text)", minWidth: maxLen * 20, textAlign: "right" }}>
                  {num}
                </span>
              </div>
            ))}
            {/* Divider line */}
            <div style={{ borderTop: "2.5px solid var(--text2)", margin: "4px 0" }} />
            {/* Answer placeholder */}
            <div style={{ height: 44, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 14 }}>
              <span style={{ color: "var(--text3)", fontFamily: "var(--mono)", fontSize: 22 }}>?</span>
            </div>
          </div>

          <button className="btn btn-primary btn-lg" style={{ width: "100%" }} onClick={checkAlignment}>
            Check Alignment →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", animation: "fadeUp 0.3s ease" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, gap: 8, flexWrap: "wrap" }}>
        <div style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)", borderRadius: 99, padding: "5px 14px", fontSize: 14, fontWeight: 700, color: "var(--blue)" }}>
          Level {level} — {phaseLabel}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-ghost btn-sm" style={{ fontSize: 13 }} onClick={() => { window.speechSynthesis?.cancel(); onReviewLesson(); }}>📖 Review Lesson</button>
          <button className="btn btn-ghost btn-sm" style={{ fontSize: 13 }} onClick={onHome}>← Home</button>
        </div>
      </div>

      {/* Streak */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: "var(--text3)" }}>Streak:</span>
        {Array.from({ length: phase.target }).map((_, i) => (
          <div key={i} style={{ width: 12, height: 12, borderRadius: "50%", background: i < streak ? "var(--green)" : "var(--surface2)", border: `2px solid ${i < streak ? "var(--green)" : "var(--border2)"}`, transition: "all 0.2s" }} />
        ))}
        <span style={{ fontSize: 13, color: "var(--text3)", marginLeft: 4 }}>{streak}/{phase.target} correct in a row</span>
      </div>

      {/* Problem display */}
      <div className="card" style={{ textAlign: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <ColumnDisplay
            numbers={problem.numbers}
            activeColIndex={activeColIndex}
            answeredDigits={answeredDigits}
            carries={carries}
          />
        </div>

        {problemComplete ? (
          <div style={{ animation: "popIn 0.3s ease" }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🎉</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "var(--green)", marginBottom: 6 }}>
              Correct! Answer: {getAnswer(problem.numbers)}
            </div>
            <p style={{ color: "var(--text2)", fontSize: 14, marginBottom: 20 }}>
              {streak + 1 >= phase.target ? "Phase complete! Moving on…" : `${streak + 1}/${phase.target} — keep going!`}
            </p>
            <button className="btn btn-success" style={{ width: "100%", fontSize: 17, padding: "14px" }} onClick={handleProblemNext}>
              {streak + 1 >= phase.target && phaseIdx + 1 >= phases.length ? "Complete Level →" : "Next Problem →"}
            </button>
          </div>
        ) : feedback === "wrong" ? (
          <div style={{ animation: "popIn 0.25s ease" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#fca5a5", marginBottom: 10 }}>Not quite!</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>
              {step === "sum" ? `${currentCol.digits.join(" + ")}${currentCol.carryIn ? ` + ${currentCol.carryIn}` : ""} = ` : step === "write" ? "Write: " : "Carry: "}
              <span style={{ color: "var(--green)" }}>{wrongAnswer}</span>
            </div>
            <button className="btn btn-success" style={{ width: "100%", fontSize: 16, padding: "13px" }}
              onMouseDown={e => { e.preventDefault(); handleWrongNext(); }}
              onTouchEnd={e => { e.preventDefault(); handleWrongNext(); }}>
              Got it — continue →
            </button>
          </div>
        ) : (
          <>
            <p style={{ color: "var(--text2)", fontSize: 16, marginBottom: 14, fontWeight: 600 }}>
              {getPrompt()}
            </p>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value.replace(/\D/g, ""))}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              inputMode="numeric"
              placeholder="?"
              style={{ textAlign: "center", fontSize: 32, fontFamily: "var(--mono)", fontWeight: 700, padding: "12px", marginBottom: 12 }}
            />
            <button className="btn btn-primary" style={{ width: "100%", fontSize: 18, padding: "14px" }}
              onMouseDown={e => { e.preventDefault(); handleSubmit(); }}
              onTouchEnd={e => { e.preventDefault(); handleSubmit(); }}>
              Submit ✓
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Celebration ──────────────────────────────────────────────────
function CelebrationScreen({ level, isLast, onContinue }) {
  const msg = isLast
    ? "Outstanding! You have mastered all three levels of column addition!"
    : `Level ${level} complete! Great work — on to level ${level + 1}!`;
  useEffect(() => { const t = setTimeout(() => speak(msg), 400); return () => { clearTimeout(t); window.speechSynthesis?.cancel(); }; }, []);
  return (
    <div style={{ maxWidth: 520, margin: "0 auto", textAlign: "center", animation: "fadeUp 0.4s ease" }}>
      <div className="card">
        <div style={{ fontSize: 64, marginBottom: 16 }}>{isLast ? "🏆" : "⭐"}</div>
        <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>
          {isLast ? "Column Addition Mastered!" : `Level ${level} Complete!`}
        </h2>
        <p style={{ color: "var(--text2)", fontSize: 15, marginBottom: 24 }}>
          {isLast ? "You can now add any multi-digit numbers using column addition." : `Ready for Level ${level + 1}?`}
        </p>
        <button className="btn btn-primary btn-lg" style={{ width: "100%" }} onClick={onContinue}>
          {isLast ? "🏆 View My Progress" : `Start Level ${level + 1} →`}
        </button>
      </div>
    </div>
  );
}

// ─── Main Player ──────────────────────────────────────────────────
export default function ColumnAdditionPlayer({ user, topic, onHome }) {
  const [screen, setScreen] = useState("loading");
  const [currentLevel, setCurrentLevel] = useState(1);
  const [masteredLevels, setMasteredLevels] = useState([]);

  const topicId = topic?.id || COLUMN_ADDITION_TOPIC_ID;

  useEffect(() => {
    const load = async () => {
      const prog = await getProgress(user.id, topicId);
      if (prog?.data) {
        const mastered = prog.data.masteredLevels || [];
        const level = prog.data.currentLevel || 1;
        setMasteredLevels(mastered);
        setCurrentLevel(level);
        setScreen(mastered.length === 0 ? "lesson" : "practice");
      } else {
        setScreen("lesson");
      }
    };
    load();
  }, []);

  const saveCurrentProgress = async (level, mastered) => {
    const completed = mastered.length === TOTAL_LEVELS;
    await saveProgress(user.id, topicId, {
      started: true,
      completed,
      percentComplete: Math.round((mastered.length / TOTAL_LEVELS) * 100),
      data: { currentLevel: level, masteredLevels: mastered },
      updatedAt: Date.now(),
    });
  };

  const handleLevelComplete = async () => {
    const newMastered = [...masteredLevels, currentLevel];
    setMasteredLevels(newMastered);
    const isLast = currentLevel === TOTAL_LEVELS;
    await saveCurrentProgress(isLast ? currentLevel : currentLevel + 1, newMastered);
    setScreen("celebration");
  };

  const handleCelebrationContinue = () => {
    if (currentLevel === TOTAL_LEVELS) { onHome(); return; }
    const next = currentLevel + 1;
    setCurrentLevel(next);
    setScreen("lesson");
  };

  if (screen === "loading") return <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><div className="spinner" /></div>;

  if (screen === "lesson" || screen === "lesson-review") return (
    <LessonScreen
      level={currentLevel}
      isReview={screen === "lesson-review"}
      onComplete={() => setScreen("practice")}
    />
  );

  if (screen === "practice") return (
    <PracticeScreen
      level={currentLevel}
      onComplete={handleLevelComplete}
      onReviewLesson={() => setScreen("lesson-review")}
      onHome={onHome}
    />
  );

  if (screen === "celebration") return (
    <CelebrationScreen
      level={currentLevel}
      isLast={currentLevel === TOTAL_LEVELS}
      onContinue={handleCelebrationContinue}
    />
  );

  return null;
}
