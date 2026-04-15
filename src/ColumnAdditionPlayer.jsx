import { useState, useEffect, useRef } from "react";
import { saveProgress, getProgress } from "./core/firebase";
import { genLevel1Problem, genLevel2Problem, genLevel3Problem, getAnswer } from "./columnAddition";

export const COLUMN_ADDITION_TOPIC_ID = "column-addition-v1";
const TOTAL_LEVELS = 3;

// â”€â”€â”€ Speak â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ Visual Column Panel (used in lesson) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// partialAnswer: digits filled in from the right, e.g. [2] means ones=2, tens=blank
// carryAbove: { colFromRight: digit } â€” carry digits shown above that column
function VisualColumnProblem({ numbers, highlightCol, showAnswer, partialAnswer, carryAbove, label, labelColor }) {
  const maxLen = Math.max(...numbers.map(n => String(n).length));
  const padded = numbers.map(n => String(n).padStart(maxLen, " "));
  const answer = numbers.reduce((s, n) => s + n, 0);
  const answerStr = String(answer).padStart(maxLen, " ");
  const colNames = ["ones", "tens", "hundreds", "thousands"];

  const answerRow = Array(maxLen).fill(null);
  if (partialAnswer) {
    partialAnswer.forEach((d, i) => { answerRow[maxLen - 1 - i] = d; });
  }

  const cellBg = (ci) => {
    if (highlightCol === null || highlightCol === undefined) return "transparent";
    return (maxLen - 1 - ci) === highlightCol ? "rgba(59,130,246,0.3)" : "transparent";
  };
  const cellBorder = (ci) => {
    if (highlightCol === null || highlightCol === undefined) return "2px solid transparent";
    return (maxLen - 1 - ci) === highlightCol ? "2px solid var(--blue)" : "2px solid transparent";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      {label && (
        <div style={{ fontSize: 20, fontWeight: 700, color: labelColor || "var(--text3)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4, textAlign: "center" }}>
          {label}
        </div>
      )}
      {/* Column name headers */}
      <div style={{ display: "flex", gap: 2, paddingLeft: 30 }}>
        {Array.from({ length: maxLen }, (_, ci) => {
          const colFromRight = maxLen - 1 - ci;
          const isHighlighted = highlightCol === colFromRight;
          return (
            <div key={ci} style={{ width: 34, textAlign: "center", fontSize: 9, fontWeight: 700, color: isHighlighted ? "var(--blue)" : "var(--text3)", textTransform: "uppercase" }}>
              {colNames[colFromRight] || ""}
            </div>
          );
        })}
      </div>
      <div style={{ background: "var(--bg)", borderRadius: "var(--radius)", padding: "12px 16px", display: "inline-block" }}>
        {/* Carry row */}
        <div style={{ display: "flex", alignItems: "center", gap: 2, marginBottom: 2 }}>
          <div style={{ width: 24 }} />
          {Array.from({ length: maxLen }, (_, ci) => {
            const colFromRight = maxLen - 1 - ci;
            const carryDigit = carryAbove?.[colFromRight];
            return (
              <div key={ci} style={{ width: 34, height: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, fontFamily: "var(--mono)", color: "var(--amber)" }}>
                {carryDigit !== undefined ? carryDigit : ""}
              </div>
            );
          })}
        </div>
        {/* Number rows */}
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
        {/* Answer row */}
        {(showAnswer || partialAnswer) && (
          <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
            <div style={{ width: 24 }} />
            {Array.from({ length: maxLen }, (_, ci) => {
              let display = "";
              let color = "var(--green)";
              if (showAnswer) {
                const ch = answerStr[ci];
                display = ch === " " ? "" : ch;
              } else if (answerRow[ci] !== null) {
                display = String(answerRow[ci]);
                color = "var(--cyan)";
              }
              return (
                <div key={ci} style={{ width: 34, height: 38, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700, fontFamily: "var(--mono)", color: display !== "" ? color : "transparent" }}>
                  {display !== "" ? display : "Â·"}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// â”€â”€â”€ Lesson Screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function LessonScreen({ level, onComplete, isReview }) {
  const examples = { 1: [47, 31], 2: [47, 35], 3: [129, 84, 37] };
  const nums = examples[level];

  const titles = {
    1: "Column Addition â€” No Carrying",
    2: "Column Addition â€” With Carrying",
    3: "Column Addition â€” Multiple Numbers",
  };

  const voiceTexts = {
    1: "Welcome to column addition! We line up numbers so that digits with the same place value are in the same column â€” ones under ones, tens under tens. Then we add each column right to left.",
    2: "Now we tackle carrying. When a column adds up to 10 or more, write the ones digit in the answer and carry the tens digit to the top of the next column on the left.",
    3: "Now we add three or more numbers at once. Same process â€” line up place values, add right to left. Column sums can be larger, so carries might be bigger than 1.",
  };

  const panels = {
    1: [
      { label: "The numbers to add", labelColor: "var(--text2)", highlightCol: null, showAnswer: false, partialAnswer: null, carryAbove: null, caption: "We need to add 47 and 31. Line them up so place values match." },
      { label: "Step 1 â€” Add the ones", labelColor: "var(--blue)", highlightCol: 0, showAnswer: false, partialAnswer: [8], carryAbove: null, caption: "Ones: 7 + 1 = 8. Write 8 in the answer." },
      { label: "Step 2 â€” Add the tens", labelColor: "var(--cyan)", highlightCol: 1, showAnswer: true, partialAnswer: null, carryAbove: null, caption: "Tens: 4 + 3 = 7. Write 7. Final answer: 78." },
    ],
    2: [
      { label: "Set up the problem", labelColor: "var(--text2)", highlightCol: null, showAnswer: false, partialAnswer: null, carryAbove: null, caption: "Line up 47 and 35 by place value." },
      { label: "Step 1 â€” Ones: 7+5=12", labelColor: "var(--blue)", highlightCol: 0, showAnswer: false, partialAnswer: [2], carryAbove: { 1: 1 }, caption: "7 + 5 = 12. Write 2. Carry the 1 above the tens column." },
      { label: "Step 2 â€” Tens: 1+4+3=8", labelColor: "var(--cyan)", highlightCol: 1, showAnswer: true, partialAnswer: null, carryAbove: { 1: 1 }, caption: "Add the carry! 1 + 4 + 3 = 8. Write 8. Answer: 82." },
    ],
    3: [
      { label: "Three numbers lined up", labelColor: "var(--text2)", highlightCol: null, showAnswer: false, partialAnswer: null, carryAbove: null, caption: "Line up 129, 84, and 37. Shorter numbers get spaces to fill their place." },
      { label: "Step 1 â€” Ones: 9+4+7=20", labelColor: "var(--blue)", highlightCol: 0, showAnswer: false, partialAnswer: [0], carryAbove: { 1: 2 }, caption: "9+4+7=20. Write 0 in ones. Carry 2 to tens." },
      { label: "Step 2 â€” Tens: 2+2+8+3=15", labelColor: "var(--cyan)", highlightCol: 1, showAnswer: false, partialAnswer: [5, 0], carryAbove: { 1: 2, 2: 1 }, caption: "Add carry! 2+2+8+3=15. Write 5 in tens. Carry 1 to hundreds." },
      { label: "Step 3 â€” Hundreds: 1+1=2", labelColor: "var(--green)", highlightCol: 2, showAnswer: true, partialAnswer: null, carryAbove: { 2: 1 }, caption: "Add carry! 1+1=2. Write 2 in hundreds. Final answer: 250." },
    ],
  };

  const panelCount = panels[level].length;
  const gridCols = panelCount === 4 ? "repeat(4, 1fr)" : "repeat(3, 1fr)";
  const borderColors = ["var(--border)", "rgba(59,130,246,0.3)", "rgba(6,182,212,0.3)", "rgba(16,185,129,0.3)"];

  useEffect(() => { return () => { window.speechSynthesis?.cancel(); }; }, []);

  return (
    <div style={{ maxWidth: panelCount === 4 ? 1200 : 960, margin: "0 auto", animation: "fadeUp 0.4s ease" }}>
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
          <div style={{ fontSize: 34 }}>ðŸ“</div>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>{titles[level]}</h2>
            <p style={{ color: "var(--text2)", fontSize: 20 }}>Level {level} of {TOTAL_LEVELS} â€” study the steps below</p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: gridCols, gap: 14, marginBottom: 24 }}>
          {panels[level].map((panel, i) => (
            <div key={i} style={{
              background: "var(--bg2)", borderRadius: "var(--radius)", padding: "16px 12px",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
              border: `1px solid ${borderColors[i] || "var(--border)"}`,
            }}>
              <VisualColumnProblem
                numbers={nums}
                highlightCol={panel.highlightCol}
                showAnswer={panel.showAnswer}
                partialAnswer={panel.partialAnswer}
                carryAbove={panel.carryAbove}
                label={panel.label}
                labelColor={panel.labelColor}
              />
              <p style={{ fontSize: 19, color: panel.labelColor === "var(--text2)" ? "var(--text3)" : panel.labelColor, textAlign: "center", lineHeight: 1.6, margin: 0 }}>
                {panel.caption}
              </p>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <button onClick={() => speak(voiceTexts[level])}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 99, border: "1.5px solid var(--blue)", background: "transparent", color: "var(--blue)", fontFamily: "var(--font)", fontWeight: 600, fontSize: 20, cursor: "pointer" }}>
            ðŸ”Š Hear explanation
          </button>
          <button className="btn btn-primary btn-lg" onClick={onComplete}>
            {isReview ? "â† Back to Practice" : `Start Level ${level} Practice â†’`}
          </button>
        </div>
      </div>
    </div>
  );
}

// â”€â”€â”€ Practice Screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function PracticeScreen({ level, onComplete, onReviewLesson, onHome }) {
  const phases = level === 1
    ? [{ digits: 2, target: 2 }, { digits: 3, target: 2 }]
    : level === 2
    ? [{ digits: 3, target: 2 }, { digits: 4, target: 2 }]
    : [{ multi: true, target: 2 }];

  const [phaseIdx, setPhaseIdx] = useState(0);
  const [streak, setStreak] = useState(0);
  const [problem, setProblem] = useState(null);
  const [input, setInput] = useState("");
  const [wrong, setWrong] = useState(null);
  const inputRef = useRef(null);

  const phase = phases[phaseIdx];

  const genProblem = () => {
    const prob = phase.multi
      ? genLevel3Problem()
      : level === 1 ? genLevel1Problem(phase.digits) : genLevel2Problem(phase.digits);
    setProblem(prob);
    setInput("");
    setWrong(null);
    setTimeout(() => inputRef.current?.focus(), 80);
  };

  useEffect(() => { genProblem(); }, [phaseIdx]);
  useEffect(() => { if (!wrong) setTimeout(() => inputRef.current?.focus(), 80); }, [wrong]);

  if (!problem) return <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><div className="spinner" /></div>;

  const maxLen = Math.max(...problem.numbers.map(n => String(n).length));
  const padded = problem.numbers.map(n => String(n).padStart(maxLen, " "));
  const correctAnswer = getAnswer(problem.numbers);
  const phaseLabel = phase.multi
    ? `${problem.numbers.length} numbers, ${problem.numbers[0].toString().length} digits each`
    : `${phase.digits}-digit numbers`;

  const handleSubmit = () => {
    const val = parseInt(input.trim(), 10);
    if (isNaN(val) || val !== correctAnswer) {
      speak(`Not quite! The answer is ${correctAnswer}.`);
      setWrong(correctAnswer);
      return;
    }
    speak("Correct!");
    const newStreak = streak + 1;
    setStreak(newStreak);
    if (newStreak >= phase.target) {
      const nextPhaseIdx = phaseIdx + 1;
      if (nextPhaseIdx >= phases.length) { onComplete(); }
      else { setPhaseIdx(nextPhaseIdx); setStreak(0); }
    } else { genProblem(); }
  };

  const handleWrongNext = () => {
    setStreak(0);
    setWrong(null);
    genProblem();
  };

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", animation: "fadeUp 0.3s ease" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, gap: 8, flexWrap: "wrap" }}>
        <div style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)", borderRadius: 99, padding: "5px 14px", fontSize: 20, fontWeight: 700, color: "var(--blue)" }}>
          Level {level} â€” {phaseLabel}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-ghost btn-sm" style={{ fontSize: 20 }} onClick={() => { window.speechSynthesis?.cancel(); onReviewLesson(); }}>ðŸ“– Review Lesson</button>
          <button className="btn btn-ghost btn-sm" style={{ fontSize: 20 }} onClick={onHome}>â† Home</button>
        </div>
      </div>

      {/* Streak */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <span style={{ fontSize: 20, color: "var(--text3)" }}>Streak:</span>
        {Array.from({ length: phase.target }).map((_, i) => (
          <div key={i} style={{ width: 12, height: 12, borderRadius: "50%", background: i < streak ? "var(--green)" : "var(--surface2)", border: `2px solid ${i < streak ? "var(--green)" : "var(--border2)"}`, transition: "all 0.2s" }} />
        ))}
        <span style={{ fontSize: 20, color: "var(--text3)", marginLeft: 4 }}>{streak}/{phase.target} correct in a row</span>
      </div>

      <div className="card" style={{ textAlign: "center" }}>
        {/* Problem display */}
        <div style={{ display: "inline-block", background: "var(--bg2)", borderRadius: "var(--radius)", padding: "18px 24px", marginBottom: 24 }}>
          {padded.map((row, ri) => (
            <div key={ri} style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
              <div style={{ width: 28, textAlign: "right", fontSize: 28, color: "var(--text3)", fontFamily: "var(--mono)", paddingRight: 4 }}>
                {ri === padded.length - 1 ? "+" : ""}
              </div>
              {row.split("").map((ch, ci) => (
                <div key={ci} style={{ width: 38, height: 46, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 700, fontFamily: "var(--mono)", color: "var(--text)" }}>
                  {ch === " " ? "" : ch}
                </div>
              ))}
            </div>
          ))}
          <div style={{ borderTop: "2.5px solid var(--text2)", margin: "6px 0 6px 32px" }} />
        </div>

        {wrong !== null ? (
          <div style={{ animation: "popIn 0.25s ease" }}>
            <div style={{ fontSize: 19, fontWeight: 700, color: "#fca5a5", marginBottom: 8 }}>Not quite!</div>
            <div style={{ fontSize: 20, color: "var(--text2)", marginBottom: 4 }}>The correct answer is</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 48, fontWeight: 800, color: "var(--green)", marginBottom: 20 }}>
              {wrong}
            </div>
            <button className="btn btn-success" style={{ width: "100%", fontSize: 20, padding: "13px" }}
              onMouseDown={e => { e.preventDefault(); handleWrongNext(); }}
              onTouchEnd={e => { e.preventDefault(); handleWrongNext(); }}>
              Got it â€” next problem â†’
            </button>
          </div>
        ) : (
          <>
            <p style={{ color: "var(--text2)", fontSize: 20, marginBottom: 14, fontWeight: 600 }}>
              What is the sum?
            </p>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value.replace(/\D/g, ""))}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              inputMode="numeric"
              placeholder="?"
              style={{ textAlign: "center", fontSize: 34, fontFamily: "var(--mono)", fontWeight: 700, padding: "12px", marginBottom: 12 }}
            />
            <button className="btn btn-primary" style={{ width: "100%", fontSize: 20, padding: "14px" }}
              onMouseDown={e => { e.preventDefault(); handleSubmit(); }}
              onTouchEnd={e => { e.preventDefault(); handleSubmit(); }}>
              Submit âœ“
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// â”€â”€â”€ Celebration â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function CelebrationScreen({ level, isLast, onContinue }) {
  const msg = isLast
    ? "Outstanding! You have mastered all three levels of column addition!"
    : `Level ${level} complete! Great work â€” on to level ${level + 1}!`;
  useEffect(() => {
    const t = setTimeout(() => speak(msg), 400);
    return () => { clearTimeout(t); window.speechSynthesis?.cancel(); };
  }, []);
  return (
    <div style={{ maxWidth: 520, margin: "0 auto", textAlign: "center", animation: "fadeUp 0.4s ease" }}>
      <div className="card">
        <div style={{ fontSize: 64, marginBottom: 16 }}>{isLast ? "ðŸ†" : "â­"}</div>
        <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
          {isLast ? "Column Addition Mastered!" : `Level ${level} Complete!`}
        </h2>
        <p style={{ color: "var(--text2)", fontSize: 19, marginBottom: 24 }}>
          {isLast ? "You can now add any multi-digit numbers using column addition." : `Ready for Level ${level + 1}?`}
        </p>
        <button className="btn btn-primary btn-lg" style={{ width: "100%" }} onClick={onContinue}>
          {isLast ? "ðŸ† View My Progress" : `Start Level ${level + 1} â†’`}
        </button>
      </div>
    </div>
  );
}

// â”€â”€â”€ Main Player â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
      started: true, completed,
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
    <LessonScreen level={currentLevel} isReview={screen === "lesson-review"} onComplete={() => setScreen("practice")} />
  );
  if (screen === "practice") return (
    <PracticeScreen level={currentLevel} onComplete={handleLevelComplete} onReviewLesson={() => setScreen("lesson-review")} onHome={onHome} />
  );
  if (screen === "celebration") return (
    <CelebrationScreen level={currentLevel} isLast={currentLevel === TOTAL_LEVELS} onContinue={handleCelebrationContinue} />
  );
  return null;
}

