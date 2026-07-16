import { useState, useEffect, useRef } from "react";
import useActivityTracking from "./core/useActivityTracking";
import { saveProgress, getProgress } from "./core/firebase";
import {
  genMissingDigitAdd, genMissingDigitAdd3, genMissingDigitSub5,
} from "./lesson01Mastery";

export const TOPIC_ID = "lesson01-ec-v1";
const STREAK_NEEDED = 3;

const EC_TOPICS = [
  {
    id: "missing-digit-add",
    label: "Missing Digit Addition (2 numbers)",
    description: "4-digit + 4-digit with carrying",
    gen: genMissingDigitAdd,
  },
  {
    id: "missing-digit-add3",
    label: "Missing Digit Addition (3 numbers)",
    description: "4+4+4 digit with carrying",
    gen: genMissingDigitAdd3,
  },
  {
    id: "missing-digit-sub5",
    label: "Missing Digit Subtraction",
    description: "5-digit minus 4-digit",
    gen: genMissingDigitSub5,
  },
];

//  Missing Digit Problem Display
function MissingDigitProblem({ problem, inputs, onFocus, focusedCell, submitted, correct }) {
  const isEC3 = problem.type === "missing-digit-sub5";
  const isEC2 = problem.type === "missing-digit-add3";

  const cellW = 44;
  const cellH = 52;
  const fontSize = 28;

  const getHiddenSet = () => {
    const s = new Set();
    if (isEC3) {
      problem.hiddenNums.forEach(h => s.add(`${h.row}-${h.col}`));
    } else {
      problem.hiddenAddends.forEach(h => s.add(`${h.row}-${h.col}`));
    }
    return s;
  };

  const hiddenSet = getHiddenSet();

  const isResultHidden = (ci) => {
    if (isEC3) return ci === problem.hiddenResultCol;
    return ci === (4 - problem.hiddenSumCol);
  };

  const getResultKey = (ci) => `result-${ci}`;

  const cellStyle = (isHidden, key) => {
    const isFocused = focusedCell === key;
    let bg = "transparent", border = "2px solid transparent", color = "var(--text)";
    if (isHidden) {
      bg = submitted
        ? (correct?.[key] ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)")
        : isFocused ? "rgba(59,130,246,0.2)" : "rgba(59,130,246,0.08)";
      border = submitted
        ? (correct?.[key] ? "2px solid var(--green)" : "2px solid var(--red)")
        : isFocused ? "2px solid var(--blue)" : "2px solid rgba(59,130,246,0.3)";
      color = submitted ? (correct?.[key] ? "var(--green)" : "var(--red)") : "var(--blue)";
    }
    return { width: cellW, height: cellH, display: "flex", alignItems: "center", justifyContent: "center", fontSize, fontWeight: 700, fontFamily: "var(--mono)", background: bg, border, borderRadius: 6, color, cursor: isHidden ? "pointer" : "default", transition: "all 0.2s" };
  };

  const renderCell = (ch, key, isHidden, isLeadingZero) => (
    <div key={key} style={cellStyle(isHidden, key)} onClick={() => isHidden && onFocus(key)}>
      {isHidden ? (
        inputs[key] !== undefined ? inputs[key] : (
          <div style={{ width: 20, height: 3, background: "var(--blue)", borderRadius: 2, opacity: 0.6 }} />
        )
      ) : (isLeadingZero ? "" : ch)}
    </div>
  );

  const addendStrs = isEC3
    ? [problem.topStr, problem.botStr.padStart(5, " ")]
    : isEC2
    ? [problem.aStr, problem.bStr, problem.cStr]
    : [problem.aStr, problem.bStr];

  const resultStr = isEC3
    ? " " + problem.resultStr
    : problem.sumStr;

  const totalRows = addendStrs.length;

  return (
    <div style={{ display: "inline-block", background: "var(--bg2)", borderRadius: "var(--radius)", padding: "16px 20px", fontFamily: "var(--mono)" }}>
      {addendStrs.map((rowStr, ri) => (
        <div key={ri} style={{ display: "flex", alignItems: "center", gap: 2, marginBottom: 2 }}>
          <div style={{ width: 32, textAlign: "right", fontSize: 28, color: "var(--text3)", paddingRight: 4 }}>
            {ri === totalRows - 1 ? (isEC3 ? "-" : "+") : ""}
          </div>
          {rowStr.split("").map((ch, ci) => {
            const key = `${ri}-${ci}`;
            const isHidden = hiddenSet.has(key);
            const isLeadingZero = ch === " " || (ch === "0" && ci === 0 && isEC3 && ri === 1);
            return renderCell(ch, key, isHidden, isLeadingZero);
          })}
        </div>
      ))}
      <div style={{ borderTop: "2.5px solid var(--text2)", margin: "4px 0 4px 36px" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
        <div style={{ width: 32 }} />
        {resultStr.split("").map((ch, ci) => {
          const key = getResultKey(ci);
          const isHidden = isResultHidden(ci);
          const isLeadingZero = ch === " " || (ch === "0" && ci === 0 && !problem.sumIs5 && !isEC3);
          return renderCell(ch, key, isHidden, isLeadingZero);
        })}
      </div>
    </div>
  );
}

//  Streak Dots
function StreakDots({ current, needed }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
      <span style={{ fontSize: 20, color: "var(--text3)" }}>Streak:</span>
      {Array.from({ length: needed }).map((_, i) => (
        <div key={i} style={{
          width: 13, height: 13, borderRadius: "50%",
          background: i < current ? "var(--green)" : "var(--surface2)",
          border: `2px solid ${i < current ? "var(--green)" : "var(--border2)"}`,
          transition: "all 0.2s",
        }} />
      ))}
      <span style={{ fontSize: 20, color: "var(--text3)" }}>{current}/{needed}</span>
    </div>
  );
}

//  Main Player
export default function MissingDigitPlayer({ user, topic, onHome }) {
  useActivityTracking(user, TOPIC_ID, "HW 1 EC (019)");
  const topicId = topic?.id || TOPIC_ID;

  const [topicIdx, setTopicIdx] = useState(0);
  const [streak, setStreak] = useState(0);
  const [problem, setProblem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState("question"); // question | correct | wrong | done

  const [mdInputs, setMdInputs] = useState({});
  const [mdFocused, setMdFocused] = useState(null);
  const [mdSubmitted, setMdSubmitted] = useState(false);
  const [mdCorrect, setMdCorrect] = useState({});

  const currentTopic = EC_TOPICS[topicIdx];

  // Load progress
  useEffect(() => {
    const load = async () => {
      const prog = await getProgress(user.id, topicId);
      if (prog?.data) {
        const { topicIdx: ti, streak: st, completed } = prog.data;
        if (completed) { setPhase("done"); setLoading(false); return; }
        setTopicIdx(Math.min(ti || 0, EC_TOPICS.length - 1));
        setStreak(st || 0);
      }
      setLoading(false);
    };
    load();
  }, []);

  // Generate problem when topicIdx changes
  useEffect(() => {
    if (!loading && topicIdx < EC_TOPICS.length) {
      newProblem(topicIdx);
    }
  }, [topicIdx, loading]);

  const newProblem = (ti) => {
    if (ti >= EC_TOPICS.length) return;
    const gen = EC_TOPICS[ti].gen;
    setProblem(gen());
    setMdInputs({});
    setMdFocused(null);
    setMdSubmitted(false);
    setMdCorrect({});
  };

  const getMdCells = (prob) => {
    if (!prob) return [];
    if (prob.type === "missing-digit-sub5") {
      return [
        ...prob.hiddenNums.map(h => `${h.row}-${h.col}`),
        `result-${prob.hiddenResultCol}`,
      ];
    }
    return [
      ...prob.hiddenAddends.map(h => `${h.row}-${h.col}`),
      `result-${4 - prob.hiddenSumCol}`,
    ];
  };

  const gradeMd = (prob, inputs) => {
    const correct = {};
    let allCorrect = true;
    if (prob.type === "missing-digit-sub5") {
      prob.hiddenNums.forEach(h => {
        const key = `${h.row}-${h.col}`;
        const ok = String(inputs[key]) === String(h.value);
        correct[key] = ok;
        if (!ok) allCorrect = false;
      });
      const rKey = `result-${prob.hiddenResultCol}`;
      const rOk = String(inputs[rKey]) === String(prob.hiddenResultValue);
      correct[rKey] = rOk;
      if (!rOk) allCorrect = false;
    } else {
      prob.hiddenAddends.forEach(h => {
        const key = `${h.row}-${h.col}`;
        const ok = String(inputs[key]) === String(h.value);
        correct[key] = ok;
        if (!ok) allCorrect = false;
      });
      const sKey = `result-${4 - prob.hiddenSumCol}`;
      const sOk = String(inputs[sKey]) === String(prob.hiddenSumValue);
      correct[sKey] = sOk;
      if (!sOk) allCorrect = false;
    }
    return { correct, allCorrect };
  };

  const handleMdKeyDown = (e) => {
    if (!mdFocused) return;
    if (/^[0-9]$/.test(e.key)) {
      setMdInputs(prev => ({ ...prev, [mdFocused]: e.key }));
    } else if (e.key === "Backspace") {
      setMdInputs(prev => ({ ...prev, [mdFocused]: undefined }));
    }
  };

  useEffect(() => {
    window.addEventListener("keydown", handleMdKeyDown);
    return () => window.removeEventListener("keydown", handleMdKeyDown);
  }, [mdFocused]);

  const handleMdSubmit = async () => {
    if (!problem || mdSubmitted) return;
    const allCells = getMdCells(problem);
    if (allCells.some(k => mdInputs[k] === undefined)) return;

    const { correct, allCorrect } = gradeMd(problem, mdInputs);
    setMdCorrect(correct);
    setMdSubmitted(true);

    if (allCorrect) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak >= STREAK_NEEDED) {
        const nextTi = topicIdx + 1;
        if (nextTi >= EC_TOPICS.length) {
          await saveProgress(user.id, topicId, {
            started: true, completed: true, percentComplete: 100,
            data: { topicIdx: nextTi, streak: 0, completed: true },
          });
        } else {
          await saveProgress(user.id, topicId, {
            started: true, completed: false,
            percentComplete: Math.round((nextTi / EC_TOPICS.length) * 100),
            data: { topicIdx: nextTi, streak: 0, completed: false },
          });
        }
      } else {
        await saveProgress(user.id, topicId, {
          started: true, completed: false,
          percentComplete: Math.round((topicIdx / EC_TOPICS.length) * 100),
          data: { topicIdx, streak: newStreak, completed: false },
        });
      }
    } else {
      setStreak(0);
      await saveProgress(user.id, topicId, {
        started: true, completed: false,
        percentComplete: Math.round((topicIdx / EC_TOPICS.length) * 100),
        data: { topicIdx, streak: 0, completed: false },
      });
    }
  };

  const handleNext = () => {
    const allCorrect = Object.values(mdCorrect).every(Boolean);
    if (allCorrect && streak >= STREAK_NEEDED) {
      const nextTi = topicIdx + 1;
      if (nextTi >= EC_TOPICS.length) {
        setPhase("done");
      } else {
        setTopicIdx(nextTi);
        setStreak(0);
      }
    } else {
      newProblem(topicIdx);
    }
  };

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
      <div className="spinner" />
    </div>
  );

  if (phase === "done") return (
    <div style={{ maxWidth: 520, margin: "0 auto", textAlign: "center", animation: "fadeUp 0.4s ease" }}>
      <div className="card">
        <div style={{ fontSize: 64, marginBottom: 16 }}></div>
        <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Extra Credit Complete!</h2>
        <p style={{ color: "var(--text2)", fontSize: 19, marginBottom: 24 }}>
          You've mastered all 3 missing digit activities!
        </p>
        <button className="btn btn-primary btn-lg" style={{ width: "100%" }} onClick={onHome}>
           Back to Home
        </button>
      </div>
    </div>
  );

  const allMdCells = problem ? getMdCells(problem) : [];
  const mdAllFilled = allMdCells.length > 0 && allMdCells.every(k => mdInputs[k] !== undefined);
  const allCorrect = Object.values(mdCorrect).length > 0 && Object.values(mdCorrect).every(Boolean);

  return (
    <div style={{ maxWidth: 620, margin: "0 auto", animation: "fadeUp 0.3s ease" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ fontSize: 19, color: "var(--amber)", marginBottom: 2, fontWeight: 700 }}>
            Extra Credit  {topicIdx + 1} of {EC_TOPICS.length}
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text)" }}>
            {currentTopic?.label}
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onHome}> Home</button>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 20, color: "var(--text3)", marginBottom: 4 }}>
          <span>Progress</span>
          <span>{topicIdx}/{EC_TOPICS.length} activities</span>
        </div>
        <div style={{ height: 5, background: "var(--surface2)", borderRadius: 99, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${(topicIdx / EC_TOPICS.length) * 100}%`, background: "linear-gradient(90deg,var(--amber),var(--orange))", borderRadius: 99 }} />
        </div>
      </div>

      <div className="card">
        <StreakDots current={streak} needed={STREAK_NEEDED} />

        <p style={{ textAlign: "center", fontSize: 19, fontWeight: 600, color: "var(--text2)", marginBottom: 14 }}>
          Click each blank and type the missing digit.
        </p>

        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          {problem && (
            <MissingDigitProblem
              problem={problem}
              inputs={mdInputs}
              onFocus={setMdFocused}
              focusedCell={mdFocused}
              submitted={mdSubmitted}
              correct={mdCorrect}
            />
          )}
        </div>

        {/* Digit pad - show when a cell is focused and not yet submitted */}
        {mdFocused && !mdSubmitted && (
          <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
            {[1,2,3,4,5,6,7,8,9,0].map(d => (
              <button key={d}
                style={{ width: 46, height: 46, borderRadius: 8, border: "1px solid var(--border2)", background: "var(--bg2)", fontSize: 22, fontWeight: 700, fontFamily: "var(--mono)", cursor: "pointer", color: "var(--text)" }}
                onMouseDown={e => { e.preventDefault(); setMdInputs(prev => ({ ...prev, [mdFocused]: String(d) })); }}>
                {d}
              </button>
            ))}
          </div>
        )}

        {mdSubmitted ? (
          <div style={{ animation: "popIn 0.25s ease" }}>
            <div style={{ fontSize: 20, fontWeight: 700, textAlign: "center", marginBottom: 12,
              color: allCorrect ? "var(--green)" : "var(--red)" }}>
              {allCorrect ? "Correct!" : "Not quite - check the highlighted digits"}
            </div>
            {allCorrect && (
              <div style={{ fontSize: 19, color: "var(--text3)", textAlign: "center", marginBottom: 16 }}>
                Streak: {streak}/{STREAK_NEEDED}
              </div>
            )}
            <button className="btn btn-success" style={{ width: "100%", fontSize: 20, padding: "13px" }}
              onClick={handleNext}>
              {allCorrect && streak >= STREAK_NEEDED
                ? (topicIdx + 1 >= EC_TOPICS.length ? " Finish" : " Next Activity")
                : " Try another"}
            </button>
          </div>
        ) : (
          <button className="btn btn-primary" style={{ width: "100%", fontSize: 20, padding: "14px" }}
            onClick={handleMdSubmit} disabled={!mdAllFilled}>
            Submit
          </button>
        )}
      </div>

      {/* Activity roadmap */}
      <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
        {EC_TOPICS.map((t, i) => {
          const done = i < topicIdx;
          const active = i === topicIdx;
          return (
            <div key={t.id} style={{
              fontSize: 19, fontWeight: 700, padding: "4px 14px", borderRadius: 99,
              background: done ? "rgba(16,185,129,0.15)" : active ? "rgba(245,158,11,0.15)" : "var(--surface)",
              color: done ? "var(--green)" : active ? "var(--amber)" : "var(--text3)",
              border: `1px solid ${done ? "rgba(16,185,129,0.3)" : active ? "rgba(245,158,11,0.3)" : "var(--border)"}`,
            }}>
              {done ? " " : active ? " " : ""}EC {i + 1}
            </div>
          );
        })}
      </div>
    </div>
  );
}
