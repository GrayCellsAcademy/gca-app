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
function LessonScreen({ level, onComplete, isReview }) {
  const content = {
    1: {
      title: "Column Addition — No Carrying",
      icon: "📐",
      voiceText: "Welcome to column addition! When we add large numbers, we line them up so that digits with the same place value are in the same column. Ones line up with ones, tens line up with tens, hundreds line up with hundreds. Then we add each column separately, starting from the rightmost column and moving left. Let's practice!",
      sections: [
        {
          heading: "Step 1 — Line up the digits",
          color: "var(--blue)",
          text: "Write numbers so that place values match up vertically. Ones under ones, tens under tens, hundreds under hundreds.",
          example: [
            { prefix: "",  value: "47" },
            { prefix: "+", value: "31" },
            { prefix: "",  value: "——" },
          ],
        },
        {
          heading: "Step 2 — Add right to left",
          color: "var(--cyan)",
          text: "Start from the rightmost column (ones) and work your way left. Write the sum of each column below the line.",
          example: [
            { prefix: "",  value: "47" },
            { prefix: "+", value: "31" },
            { prefix: "",  value: "——" },
            { prefix: "",  value: "78" },
          ],
        },
        {
          heading: "Why right to left?",
          color: "var(--amber)",
          text: "We add right to left because sometimes a column sum is 10 or more, and we need to carry a digit to the next column on the left. Starting from the right makes sure we handle carries in the right order.",
        },
      ],
    },
    2: {
      title: "Column Addition — With Carrying",
      icon: "🔢",
      voiceText: "Great work on Level 1! Now we tackle carrying. When a column's digits add up to 10 or more, we write down the ones digit of the sum, and carry the tens digit to the next column on the left. For example, 7 plus 5 equals 12. We write 2 in the answer and carry 1 to the tens column. You will practice each step separately — first the full column sum, then what to write, then what to carry.",
      sections: [
        {
          heading: "When do we carry?",
          color: "var(--blue)",
          text: "When a column's digits add up to 10 or more, the sum has two digits. We can only write one digit per column in the answer.",
        },
        {
          heading: "What to write and what to carry",
          color: "var(--cyan)",
          text: "Write the ONES digit of the column sum in the answer row. Carry the TENS digit to the top of the next column to the left.",
          example: [
            { prefix: "",  value: "¹  " },
            { prefix: "",  value: "47" },
            { prefix: "+", value: "35" },
            { prefix: "",  value: "——" },
            { prefix: "",  value: "82" },
          ],
        },
        {
          heading: "3 steps per column",
          color: "var(--amber)",
          text: "For each column you will: (1) give the sum of the digits including any carry, (2) say what digit to write in the answer, and (3) say what digit to carry — but only if the sum is 10 or more.",
        },
      ],
    },
    3: {
      title: "Column Addition — Multiple Numbers",
      icon: "➕",
      voiceText: "Excellent! Now we apply column addition to three or more numbers at once. The process is exactly the same — line up place values, add each column right to left, carrying when needed. The only difference is that you are adding more digits per column. When you carry, the carry digit gets added along with all the others in the next column.",
      sections: [
        {
          heading: "Same process, more numbers",
          color: "var(--blue)",
          text: "Add all digits in each column together, including any carry from the previous column. The sum might be larger — for example, 9 + 8 + 7 = 24, so you write 4 and carry 2.",
          example: [
            { prefix: "",  value: "129" },
            { prefix: "",  value: " 84" },
            { prefix: "+", value: " 37" },
            { prefix: "",  value: "———" },
            { prefix: "",  value: "250" },
          ],
        },
        {
          heading: "Keep track of carries",
          color: "var(--amber)",
          text: "With more numbers, carries can be larger than 1. Always add the carry digit along with all the column digits before deciding what to write and what to carry.",
        },
      ],
    },
  };

  const c = content[level];

  useEffect(() => {
    // Voice is optional - no auto-speak on lesson screen
    return () => { window.speechSynthesis?.cancel(); };
  }, []);

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", animation: "fadeUp 0.4s ease" }}>
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
          <div style={{ fontSize: 40 }}>{c.icon}</div>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>{c.title}</h2>
            <p style={{ color: "var(--text2)", fontSize: 14 }}>Level {level} of {TOTAL_LEVELS}</p>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
          {c.sections.map((s, i) => (
            <div key={i} style={{ background: "var(--bg2)", borderRadius: "var(--radius)", padding: "16px 18px", borderLeft: `3px solid ${s.color}` }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: s.color, marginBottom: 6 }}>{s.heading}</div>
              <p style={{ fontSize: 15, lineHeight: 1.75, color: "var(--text2)", marginBottom: s.example ? 10 : 0 }}>{s.text}</p>
              {s.example && (
                <div style={{ fontFamily: "var(--mono)", fontSize: 20, color: "var(--text)", background: "var(--bg)", padding: "14px 20px", borderRadius: "var(--radius-sm)", display: "inline-block", minWidth: 120 }}>
                  {s.example.map((line, li) => (
                    <div key={li} style={{ display: "flex", alignItems: "center", gap: 0, lineHeight: "1.8" }}>
                      <span style={{ width: 28, color: "var(--text3)", textAlign: "right", marginRight: 8, flexShrink: 0 }}>{line.prefix || ""}</span>
                      <span style={{ textAlign: "right", minWidth: 60, display: "inline-block" }}>{line.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <button onClick={() => speak(c.voiceText)}
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
  // Phase: which size we're practicing
  // Level 1: phases = [{digits:2, target:2}, {digits:3, target:2}]
  // Level 2: phases = [{digits:3, target:2}, {digits:4, target:2}]
  // Level 3: phases = [{multi:true, target:2}]
  const phases = level === 1
    ? [{ digits: 2, target: 2 }, { digits: 3, target: 2 }]
    : level === 2
    ? [{ digits: 3, target: 2 }, { digits: 4, target: 2 }]
    : [{ multi: true, target: 2 }];

  const [phaseIdx, setPhaseIdx] = useState(0);
  const [streak, setStreak] = useState(0);
  const [problem, setProblem] = useState(null);
  const [columns, setColumns] = useState([]);
  const [colIdx, setColIdx] = useState(0);       // index into columns array (right to left)
  const [step, setStep] = useState("sum");        // "sum" | "write" | "carry"
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
    setTimeout(() => inputRef.current?.focus(), 80);
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
    const newStreak = streak + 1;
    setStreak(newStreak);
    if (newStreak >= phase.target) {
      // Phase complete
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
    ? `${problem.numbers.length} numbers, ${problem.numbers[0].toString().length} digits each`
    : `${phase.digits}-digit numbers`;

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
