import { useState, useEffect } from "react";
import { saveProgress, getProgress } from "./core/firebase";
import { EC_TOPICS, generateExtraCreditProblem, buildProblemDisplay, gradeAllMissing } from "./extraCredit01";

export const EC_TOPIC_ID = "lesson01-extra-credit-v1";
const STREAK_NEEDED = 6;

// ─── Column Problem Display ───────────────────────────────────────
function MissingDigitProblem({ display, activeCellKey, enteredDigits, phase }) {
  if (!display) return null;
  const { rows, ansRow, isAdd } = display;
  const cellW = 44, cellH = 52;

  const renderCell = (cell) => {
    const key = `${cell.target}_${cell.numIdx}_${cell.posFromRight}`;
    const isActive = cell.isMissing && key === activeCellKey;
    const entered = enteredDigits[key];
    const showCorrect = phase === "wrong" && cell.isMissing;
    const showEntered = cell.isMissing && entered !== undefined;

    return (
      <div key={key}
        style={{
          width: cellW, height: cellH,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 28, fontWeight: 800, fontFamily: "var(--mono)",
          color: showCorrect ? "var(--green)" : cell.isMissing ? "var(--blue)" : "var(--text)",
          background: cell.isMissing
            ? isActive ? "rgba(59,130,246,0.25)" : entered !== undefined ? "rgba(16,185,129,0.1)" : "rgba(59,130,246,0.06)"
            : "transparent",
          border: cell.isMissing
            ? `2px solid ${isActive ? "var(--blue)" : entered !== undefined ? "rgba(16,185,129,0.5)" : "rgba(59,130,246,0.3)"}`
            : "2px solid transparent",
          borderRadius: 8,
          transition: "all 0.15s",
        }}>
        {cell.isMissing
          ? showCorrect ? cell.correctDigit
          : entered !== undefined ? entered
          : "_"
          : cell.digit || ""}
      </div>
    );
  };

  return (
    <div style={{ display: "inline-block", background: "var(--bg2)", borderRadius: "var(--radius)", padding: "20px 28px" }}>
      {rows.map((row, ri) => (
        <div key={ri} style={{ display: "flex", alignItems: "center", gap: 2, marginBottom: 4 }}>
          <div style={{ width: 32, textAlign: "right", fontSize: 24, color: "var(--text3)", paddingRight: 6 }}>
            {ri === rows.length - 1 ? (isAdd ? "+" : "-") : ""}
          </div>
          {row.map(cell => renderCell(cell))}
        </div>
      ))}
      <div style={{ borderTop: "2.5px solid var(--text2)", margin: "6px 0 6px 34px" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
        <div style={{ width: 32 }} />
        {ansRow.map(cell => renderCell(cell))}
      </div>
    </div>
  );
}

// ─── Digit Keypad ─────────────────────────────────────────────────
function Keypad({ onDigit, onBack, disabled }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
        {[1,2,3,4,5,6,7,8,9,0].map(d => (
          <button key={d} disabled={disabled}
            onClick={() => onDigit(d)}
            style={{
              width: 52, height: 52, fontSize: 22, fontWeight: 800,
              fontFamily: "var(--mono)", background: "var(--surface)",
              border: "2px solid var(--border)", borderRadius: "var(--radius-sm)",
              cursor: "pointer", color: "var(--text)",
            }}>
            {d}
          </button>
        ))}
      </div>
      <button onClick={onBack} disabled={disabled}
        style={{ width: "100%", padding: "10px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "var(--radius-sm)", cursor: "pointer", fontFamily: "var(--font)", fontWeight: 700, fontSize: 14, color: "var(--red)" }}>
        Back
      </button>
    </div>
  );
}

// ─── Streak Bar ───────────────────────────────────────────────────
function StreakBar({ streak, needed }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text3)", marginBottom: 6 }}>
        <span>Streak: {streak}/{needed}</span>
        <span>Type {(streak % EC_TOPICS.length) + 1} of 6</span>
      </div>
      <div style={{ display: "flex", gap: 3 }}>
        {Array.from({ length: needed }).map((_, i) => (
          <div key={i} style={{ flex: 1, height: 8, borderRadius: 99, background: i < streak ? "var(--green)" : "var(--surface2)", transition: "background 0.2s" }} />
        ))}
      </div>
    </div>
  );
}

// ─── Main Player ──────────────────────────────────────────────────
export default function ExtraCredit01Player({ user, topic, onHome }) {
  const topicId = topic?.id || EC_TOPIC_ID;

  const [streak, setStreak] = useState(0);
  const [problem, setProblem] = useState(null);
  const [display, setDisplay] = useState(null);
  const [activeCellIdx, setActiveCellIdx] = useState(0);
  const [enteredDigits, setEnteredDigits] = useState({});
  const [phase, setPhase] = useState("answering"); // answering | wrong | complete
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const prog = await getProgress(user.id, topicId);
      if (prog?.data) setStreak(prog.data.streak || 0);
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    if (!loading) newProblem(streak % EC_TOPICS.length);
  }, [loading]);

  const newProblem = (tIdx) => {
    const t = EC_TOPICS[tIdx];
    // Try up to 5 times, then try adjacent topics as fallback
    let prob = null;
    for (let attempt = 0; attempt < 5 && !prob; attempt++) {
      prob = generateExtraCreditProblem(t.id);
    }
    // Fallback: try other topics
    if (!prob) {
      for (let fallback = 0; fallback < EC_TOPICS.length && !prob; fallback++) {
        if (fallback !== tIdx) prob = generateExtraCreditProblem(EC_TOPICS[fallback].id);
      }
    }
    if (!prob) return;
    const disp = buildProblemDisplay(prob);
    setProblem(prob);
    setDisplay(disp);
    setActiveCellIdx(0);
    setEnteredDigits({});
    setPhase("answering");
  };

  const saveProgressData = async (newStreak, completed) => {
    await saveProgress(user.id, topicId, {
      started: true,
      completed: completed || false,
      percentComplete: completed ? 100 : Math.round((newStreak / STREAK_NEEDED) * 100),
      data: { streak: newStreak },
    });
  };

  const handleDigit = async (digit) => {
    if (!display || phase !== "answering") return;
    const allMissing = display?.allMissing || [];
    const activeCell = allMissing[activeCellIdx];
    if (!activeCell) return;

    const key = `${activeCell.target}_${activeCell.numIdx}_${activeCell.posFromRight}`;
    const newEntered = { ...enteredDigits, [key]: digit };
    setEnteredDigits(newEntered);

    // Move to next missing cell
    if (activeCellIdx + 1 < allMissing.length) {
      setActiveCellIdx(activeCellIdx + 1);
    } else {
      // All cells filled — check answer
      const correct = gradeAllMissing(newEntered, problem);
      if (correct) {
        const newStreak = streak + 1;
        if (newStreak >= STREAK_NEEDED) {
          setStreak(STREAK_NEEDED);
          setPhase("complete");
          await saveProgressData(STREAK_NEEDED, true);
        } else {
          setStreak(newStreak);
          await saveProgressData(newStreak, false);
          newProblem(newStreak % EC_TOPICS.length);
        }
      } else {
        setPhase("wrong");
        setStreak(0);
        await saveProgressData(0, false);
      }
    }
  };

  const handleBack = () => {
    if (activeCellIdx === 0) return;
    const allMissing = display?.allMissing || [];
    const prevIdx = activeCellIdx - 1;
    const prevCell = allMissing[prevIdx];
    const key = `${prevCell.target}_${prevCell.numIdx}_${prevCell.posFromRight}`;
    const newEntered = { ...enteredDigits };
    delete newEntered[key];
    setEnteredDigits(newEntered);
    setActiveCellIdx(prevIdx);
  };

  const handleWrongContinue = () => {
    newProblem(0);
  };

  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><div className="spinner" /></div>;

  if (phase === "complete" || streak >= STREAK_NEEDED) return (
    <div style={{ maxWidth: 520, margin: "0 auto", textAlign: "center" }}>
      <div className="card">
        <div style={{ fontSize: 64, marginBottom: 16 }}>*</div>
        <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>Extra Credit Complete!</h2>
        <p style={{ color: "var(--text2)", fontSize: 15, marginBottom: 24 }}>
          You got 6 consecutive missing digit problems correct - one of each type!
        </p>
        <button className="btn btn-primary btn-lg" style={{ width: "100%" }} onClick={onHome}>Back to Home</button>
      </div>
    </div>
  );

  const currentTopicLabel = EC_TOPICS[streak % EC_TOPICS.length]?.label || "";
  const allMissing = display?.allMissing || [];
  const filledCount = Object.keys(enteredDigits).length;
  const totalMissing = allMissing.length;

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 13, color: "var(--amber)", fontWeight: 700, marginBottom: 2 }}>Extra Credit</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text2)" }}>{currentTopicLabel}</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onHome}>Back to Home</button>
      </div>

      <StreakBar streak={streak} needed={STREAK_NEEDED} />

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text3)", marginBottom: 16 }}>
          <span>Fill in all missing digits ({filledCount}/{totalMissing} filled)</span>
          <span>{totalMissing} blank{totalMissing !== 1 ? "s" : ""} in this problem</span>
        </div>

        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          {display && (
            <MissingDigitProblem
              display={display}
              activeCellKey={allMissing[activeCellIdx] ? `${allMissing[activeCellIdx].target}_${allMissing[activeCellIdx].numIdx}_${allMissing[activeCellIdx].posFromRight}` : null}
              enteredDigits={enteredDigits}
              phase={phase}
            />
          )}
        </div>

        {phase === "wrong" ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--red)", marginBottom: 4 }}>
              Not quite! The correct digits are shown in green above.
            </div>
            <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 16 }}>
              Streak reset - back to type 1
            </div>
            <button className="btn btn-primary" onClick={handleWrongContinue}>Try again from the start</button>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 14, color: "var(--text2)", textAlign: "center", marginBottom: 12 }}>
              Enter digit {activeCellIdx + 1} of {totalMissing}
            </div>
            <Keypad onDigit={handleDigit} onBack={handleBack} disabled={false} />
          </>
        )}
      </div>

      <div style={{ marginTop: 12, fontSize: 12, color: "var(--text3)", textAlign: "center" }}>
        Digits are entered left to right. Get all 6 types correct in a row to earn extra credit.
      </div>
    </div>
  );
}
