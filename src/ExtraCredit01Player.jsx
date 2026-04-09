import { useState, useEffect, useRef } from "react";
import { saveProgress, getProgress } from "./core/firebase";
import {
  EC_TOPICS, generateExtraCreditProblem, buildProblemDisplay,
} from "./extraCredit01";

export const EC_TOPIC_ID = "lesson01-extra-credit-v1";
const STREAK_NEEDED = 6; // 6 consecutive correct across all 6 types

// ─── Column Problem with Missing Digit ───────────────────────────
function MissingDigitProblem({ display, selectedCell, onCellClick, enteredDigit, phase }) {
  if (!display) return null;
  const { rows, ansRow, isAddition, maxLen } = display;
  const cellW = 44;
  const cellH = 52;

  const renderCell = (cell, key) => {
    const isSelected = cell.isMissing && selectedCell &&
      selectedCell.posFromRight === cell.posFromRight &&
      selectedCell.rowIndex === cell.rowIndex;
    const showEntered = cell.isMissing && enteredDigit !== null && phase === "answering";
    const showCorrect = cell.isMissing && phase === "wrong";

    return (
      <div key={key}
        onClick={() => cell.isMissing && onCellClick(cell)}
        style={{
          width: cellW, height: cellH,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 28, fontWeight: 800,
          color: cell.isMissing ? (phase === "wrong" ? "var(--green)" : "var(--blue)") : "var(--text)",
          background: cell.isMissing
            ? isSelected ? "rgba(59,130,246,0.2)" : "rgba(59,130,246,0.08)"
            : "transparent",
          border: cell.isMissing
            ? `2px solid ${isSelected ? "var(--blue)" : "rgba(59,130,246,0.4)"}`
            : "2px solid transparent",
          borderRadius: 8,
          cursor: cell.isMissing ? "pointer" : "default",
          fontFamily: "var(--mono)",
          transition: "all 0.15s",
        }}>
        {cell.isMissing
          ? showCorrect
            ? cell.correctDigit ?? enteredDigit ?? "_"
            : showEntered
              ? enteredDigit
              : "_"
          : cell.digit || ""}
      </div>
    );
  };

  return (
    <div style={{ display: "inline-block", background: "var(--bg2)", borderRadius: "var(--radius)", padding: "20px 28px", fontFamily: "var(--mono)" }}>
      {rows.map((row, ri) => (
        <div key={ri} style={{ display: "flex", alignItems: "center", gap: 2, marginBottom: 4 }}>
          <div style={{ width: 32, textAlign: "right", fontSize: 24, color: "var(--text3)", paddingRight: 6 }}>
            {ri === rows.length - 1 ? (isAddition ? "+" : "−") : ""}
          </div>
          {row.map((cell, ci) => renderCell({ ...cell, correctDigit: null }, `r${ri}c${ci}`))}
        </div>
      ))}
      <div style={{ borderTop: "2.5px solid var(--text2)", margin: "6px 0 6px 34px" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
        <div style={{ width: 32 }} />
        {ansRow.map((cell, ci) => renderCell({ ...cell, correctDigit: null }, `ans${ci}`))}
      </div>
    </div>
  );
}

// ─── Digit Keypad ────────────────────────────────────────────────
function Keypad({ onDigit, onClear, onSubmit, disabled, enteredDigit }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
        {[1,2,3,4,5,6,7,8,9,0].map(d => (
          <button key={d} disabled={disabled}
            onClick={() => onDigit(d)}
            style={{
              width: 52, height: 52, fontSize: 22, fontWeight: 800,
              fontFamily: "var(--mono)", background: "var(--surface)",
              border: `2px solid ${enteredDigit === d ? "var(--blue)" : "var(--border)"}`,
              borderRadius: "var(--radius-sm)", cursor: "pointer",
              color: enteredDigit === d ? "var(--blue)" : "var(--text)",
              transition: "all 0.1s",
            }}>
            {d}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, width: "100%" }}>
        <button onClick={onClear} disabled={disabled}
          style={{ flex: 1, padding: "10px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "var(--radius-sm)", cursor: "pointer", fontFamily: "var(--font)", fontWeight: 700, fontSize: 14, color: "var(--red)" }}>
          Clear
        </button>
        <button onClick={onSubmit} disabled={disabled || enteredDigit === null}
          style={{ flex: 2, padding: "10px", background: enteredDigit !== null ? "var(--blue)" : "rgba(59,130,246,0.3)", border: "none", borderRadius: "var(--radius-sm)", cursor: enteredDigit !== null ? "pointer" : "not-allowed", fontFamily: "var(--font)", fontWeight: 700, fontSize: 16, color: "#fff" }}>
          Submit
        </button>
      </div>
    </div>
  );
}

// ─── Streak Display ───────────────────────────────────────────────
function StreakDisplay({ streak, needed, topicIdx }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text3)", marginBottom: 6 }}>
        <span>Streak: {streak}/{needed} consecutive correct</span>
        <span>Topic {topicIdx + 1}/6</span>
      </div>
      <div style={{ display: "flex", gap: 4 }}>
        {Array.from({ length: needed }).map((_, i) => (
          <div key={i} style={{
            flex: 1, height: 8, borderRadius: 99,
            background: i < streak ? "var(--green)" : "var(--surface2)",
            transition: "background 0.2s",
          }} />
        ))}
      </div>
    </div>
  );
}

// ─── Main Player ──────────────────────────────────────────────────
export default function ExtraCredit01Player({ user, topic, onHome }) {
  const topicId = topic?.id || EC_TOPIC_ID;

  const [streak, setStreak] = useState(0);
  const [topicIdx, setTopicIdx] = useState(0);
  const [problem, setProblem] = useState(null);
  const [display, setDisplay] = useState(null);
  const [selectedCell, setSelectedCell] = useState(null);
  const [enteredDigit, setEnteredDigit] = useState(null);
  const [phase, setPhase] = useState("answering"); // answering | wrong | complete
  const [loading, setLoading] = useState(true);

  // Load progress
  useEffect(() => {
    const load = async () => {
      const prog = await getProgress(user.id, topicId);
      if (prog?.data) {
        setStreak(prog.data.streak || 0);
        setTopicIdx(prog.data.topicIdx || 0);
      }
      setLoading(false);
    };
    load();
  }, []);

  // Generate new problem when topicIdx changes or on mount
  useEffect(() => {
    if (!loading) newProblem(topicIdx);
  }, [topicIdx, loading]);

  const newProblem = (tIdx) => {
    const topic = EC_TOPICS[Math.min(tIdx, EC_TOPICS.length - 1)];
    const prob = generateExtraCreditProblem(topic.id);
    if (!prob) return;
    const disp = buildProblemDisplay(prob);
    setProblem(prob);
    setDisplay(disp);
    setSelectedCell(null);
    setEnteredDigit(null);
    setPhase("answering");
    // Auto-select the missing cell
    if (disp) {
      const missingInRows = disp.rows.flat().find(c => c.isMissing);
      const missingInAns = disp.ansRow.find(c => c.isMissing);
      setSelectedCell(missingInRows || missingInAns || null);
    }
  };

  const saveCurrentProgress = async (newStreak, newTopicIdx, completed) => {
    await saveProgress(user.id, topicId, {
      started: true,
      completed: completed || false,
      percentComplete: completed ? 100 : Math.round((newStreak / STREAK_NEEDED) * 100),
      data: { streak: newStreak, topicIdx: newTopicIdx },
    });
  };

  const handleSubmit = async () => {
    if (enteredDigit === null || !problem) return;
    const correctDigit = problem.removal.correctDigit;
    if (enteredDigit === correctDigit) {
      // Correct!
      const newStreak = streak + 1;
      // Advance topic after every correct answer
      const nextTopicIdx = newStreak % EC_TOPICS.length === 0
        ? Math.min(Math.floor(newStreak / 1), EC_TOPICS.length - 1)
        : newStreak % EC_TOPICS.length;
      // Actually: cycle through topics in order based on streak
      const currentTopicForStreak = newStreak % EC_TOPICS.length;

      if (newStreak >= STREAK_NEEDED) {
        setStreak(STREAK_NEEDED);
        setPhase("complete");
        await saveCurrentProgress(STREAK_NEEDED, EC_TOPICS.length - 1, true);
      } else {
        setStreak(newStreak);
        const nextTopic = newStreak % EC_TOPICS.length;
        setTopicIdx(nextTopic);
        await saveCurrentProgress(newStreak, nextTopic, false);
        newProblem(nextTopic);
      }
    } else {
      // Wrong — show correct answer, reset streak
      setPhase("wrong");
      setStreak(0);
      setTopicIdx(0);
      await saveCurrentProgress(0, 0, false);
    }
  };

  const handleWrongContinue = () => {
    newProblem(0);
  };

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
      <div className="spinner" />
    </div>
  );

  if (phase === "complete" || streak >= STREAK_NEEDED) return (
    <div style={{ maxWidth: 520, margin: "0 auto", textAlign: "center" }}>
      <div className="card">
        <div style={{ fontSize: 64, marginBottom: 16 }}>🌟</div>
        <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>Extra Credit Complete!</h2>
        <p style={{ color: "var(--text2)", fontSize: 15, marginBottom: 24 }}>
          You got 6 consecutive missing digit problems correct — one of each type. Outstanding work!
        </p>
        <button className="btn btn-primary btn-lg" style={{ width: "100%" }} onClick={onHome}>
          Back to Home
        </button>
      </div>
    </div>
  );

  const currentTopicLabel = EC_TOPICS[topicIdx]?.label || "";

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 13, color: "var(--amber)", fontWeight: 700, marginBottom: 2 }}>
            Extra Credit
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text2)" }}>
            {currentTopicLabel}
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onHome}>Back to Home</button>
      </div>

      <StreakDisplay streak={streak} needed={STREAK_NEEDED} topicIdx={topicIdx} />

      <div className="card">
        {/* Topic progress */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
          {EC_TOPICS.map((t, i) => {
            const done = i < topicIdx || (i === topicIdx && streak > i);
            const active = i === topicIdx;
            return (
              <div key={t.id} style={{
                fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 99,
                background: done ? "rgba(16,185,129,0.15)" : active ? "rgba(251,191,36,0.15)" : "var(--surface)",
                color: done ? "var(--green)" : active ? "var(--amber)" : "var(--text3)",
                border: `1px solid ${done ? "rgba(16,185,129,0.3)" : active ? "rgba(251,191,36,0.3)" : "var(--border)"}`,
              }}>
                {i + 1}
              </div>
            );
          })}
        </div>

        <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text2)", marginBottom: 16, textAlign: "center" }}>
          Find the missing digit.
        </p>

        {/* Problem display */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          {display && (
            <MissingDigitProblem
              display={display}
              selectedCell={selectedCell}
              onCellClick={setSelectedCell}
              enteredDigit={enteredDigit}
              phase={phase}
            />
          )}
        </div>

        {/* Wrong answer state */}
        {phase === "wrong" ? (
          <div style={{ textAlign: "center", animation: "popIn 0.25s ease" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--red)", marginBottom: 4 }}>
              Not quite! The correct digit is{" "}
              <span style={{ color: "var(--green)", fontSize: 22, fontFamily: "var(--mono)" }}>
                {problem?.removal.correctDigit}
              </span>
            </div>
            <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 16 }}>
              Streak reset — back to topic 1
            </div>
            <button className="btn btn-primary" onClick={handleWrongContinue}>
              Try again from the start
            </button>
          </div>
        ) : (
          <Keypad
            onDigit={(d) => setEnteredDigit(d)}
            onClear={() => setEnteredDigit(null)}
            onSubmit={handleSubmit}
            disabled={!selectedCell}
            enteredDigit={enteredDigit}
          />
        )}
      </div>

      {/* Instructions */}
      <div style={{ marginTop: 12, fontSize: 12, color: "var(--text3)", textAlign: "center" }}>
        Click a blank cell, then tap a digit to fill it in. Get all 6 types correct in a row to earn extra credit.
      </div>
    </div>
  );
}
