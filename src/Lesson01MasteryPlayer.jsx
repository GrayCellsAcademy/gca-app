import { useState, useEffect, useRef } from "react";
import useActivityTracking from "./core/useActivityTracking";
import { saveProgress, getProgress } from "./core/firebase";
import {
  TOPICS, computeCarries, computeBorrows,
  genAddNoCarry, genAddCarry, genAddMulti,
  genSubNoBorow, genSubBorrow, genSubBorrowZero,
} from "./lesson01Mastery";

export const TOPIC_ID = "lesson01-mastery-v1";
const STREAK_NEEDED = 2;

//  Column Problem Display
function ColumnProblem({ problem, showAnswer = false, showWorking = false }) {
  const isAddition = problem.type.startsWith("add");
  const numbers = isAddition ? problem.numbers : [problem.top, problem.bot];
  const maxLen = Math.max(...numbers.map(n => String(n).length));
  const padded = numbers.map(n => String(n).padStart(maxLen, " "));
  const answer = problem.answer;

  const carries = (showWorking && isAddition && problem.type !== "add-no-carry")
    ? computeCarries(problem.numbers) : {};
  const { borrows } = (showWorking && !isAddition && problem.type !== "sub-no-borrow")
    ? computeBorrows(problem.top, problem.bot) : { borrows: [] };

  const borrowMap = {};
  borrows.forEach(b => { borrowMap[b.col] = b; });

  const cellW = 38;
  const cellH = 44;

  return (
    <div style={{ display: "inline-block", background: "var(--bg2)", borderRadius: "var(--radius)", padding: "16px 24px", fontFamily: "var(--mono)" }}>
      {isAddition && Object.keys(carries).length > 0 && (
        <div style={{ display: "flex", gap: 2, paddingLeft: 32, marginBottom: 2 }}>
          {Array.from({ length: maxLen }, (_, ci) => {
            const carryVal = carries[ci];
            return (
              <div key={ci} style={{ width: cellW, height: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "var(--amber)" }}>
                {carryVal || ""}
              </div>
            );
          })}
        </div>
      )}
      {padded.map((row, ri) => (
        <div key={ri} style={{ display: "flex", alignItems: "center", gap: 2, marginBottom: 2 }}>
          <div style={{ width: 28, textAlign: "right", fontSize: 28, color: "var(--text3)", paddingRight: 4 }}>
            {ri === padded.length - 1 ? (isAddition ? "+" : "-") : ""}
          </div>
          {row.split("").map((ch, ci) => {
            const borrow = borrowMap[ci];
            return (
              <div key={ci} style={{ width: cellW, height: cellH, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative" }}>
                {showWorking && !isAddition && ri === 0 && borrow && (
                  <div style={{ position: "absolute", top: -30, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", minWidth: 28 }}>
                    <div style={{ fontSize: borrow.newVal >= 10 ? 14 : 20, color: "var(--amber)", fontWeight: 800, lineHeight: 1 }}>{borrow.newVal}</div>
                  </div>
                )}
                <div style={{ fontSize: 28, fontWeight: 700, color: ch === " " ? "transparent" : "var(--text)", textDecoration: (showWorking && !isAddition && ri === 0 && borrow) ? "line-through" : "none", textDecorationColor: "var(--red)" }}>
                  {ch === " " ? "0" : ch}
                </div>
              </div>
            );
          })}
        </div>
      ))}
      <div style={{ borderTop: "2.5px solid var(--text2)", margin: "4px 0 4px 30px" }} />
      {showAnswer && (
        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
          <div style={{ width: 28 }} />
          {String(answer).padStart(maxLen, " ").split("").map((ch, ci) => (
            <div key={ci} style={{ width: cellW, height: cellH, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 800, color: ch === " " ? "transparent" : "var(--green)" }}>
              {ch === " " ? "0" : ch}
            </div>
          ))}
        </div>
      )}
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
export default function Lesson01MasteryPlayer({ user, topic, onHome }) {
  useActivityTracking(user, "lesson01-mastery-v1", "Classwork 1 (019)");
  const topicId = topic?.id || TOPIC_ID;

  const [topicIdx, setTopicIdx] = useState(0);
  const [subtypeIdx, setSubtypeIdx] = useState(0);
  const [streak, setStreak] = useState(0);
  const [problem, setProblem] = useState(null);
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState("question"); // question | correct | wrong | celebration
  const [loading, setLoading] = useState(true);
  const inputRef = useRef(null);
  const pendingProgress = useRef(null);

  const currentTopic = TOPICS[topicIdx];
  const currentSubtype = currentTopic?.subtypes[subtypeIdx];

  // Load progress
  useEffect(() => {
    const load = async () => {
      const prog = await getProgress(user.id, topicId);
      if (prog?.data) {
        const { topicIdx: ti, subtypeIdx: si, streak: st } = prog.data;
        setTopicIdx(ti || 0);
        setSubtypeIdx(si || 0);
        setStreak(st || 0);
      }
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    if (!loading && TOPICS[topicIdx]) {
      newProblem(topicIdx, subtypeIdx);
    }
  }, [topicIdx, subtypeIdx, loading]);

  const newProblem = (ti, si) => {
    const gen = TOPICS[ti]?.subtypes[si]?.gen;
    if (gen) {
      setProblem(gen());
      setInput("");
      setPhase("question");
      pendingProgress.current = null;
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  };

  const saveCurrentProgress = async (ti, si, st) => {
    const allDone = ti >= TOPICS.length;
    await saveProgress(user.id, topicId, {
      started: true,
      completed: allDone,
      percentComplete: Math.round((ti / TOPICS.length) * 100),
      data: { topicIdx: ti, subtypeIdx: si, streak: st },
    });
  };

  const handleSubmit = async () => {
    if (!problem || phase !== "question") return;
    const val = parseInt(input.trim(), 10);
    if (isNaN(val)) return;

    if (val === problem.answer) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      setPhase("correct");
      if (newStreak >= STREAK_NEEDED) {
        const nextSi = subtypeIdx + 1;
        const subtypes = currentTopic.subtypes;
        if (nextSi < subtypes.length) {
          pendingProgress.current = { action: "nextSubtype", ti: topicIdx, si: nextSi };
        } else {
          const nextTi = topicIdx + 1;
          pendingProgress.current = nextTi >= TOPICS.length
            ? { action: "done", ti: nextTi }
            : { action: "nextTopic", ti: nextTi };
        }
      } else {
        pendingProgress.current = { action: "stay", ti: topicIdx, si: subtypeIdx, st: newStreak };
      }
      await saveCurrentProgress(
        pendingProgress.current.ti ?? topicIdx,
        pendingProgress.current.si ?? subtypeIdx,
        pendingProgress.current.st ?? newStreak
      );
    } else {
      setStreak(0);
      setPhase("wrong");
      await saveCurrentProgress(topicIdx, subtypeIdx, 0);
    }
  };

  const handleCorrectNext = () => {
    const p = pendingProgress.current;
    if (!p) return;
    if (p.action === "done") { setPhase("celebration"); }
    else if (p.action === "nextTopic") { setTopicIdx(p.ti); setSubtypeIdx(0); setStreak(0); }
    else if (p.action === "nextSubtype") { setSubtypeIdx(p.si); setStreak(0); }
    else { newProblem(topicIdx, subtypeIdx); }
  };

  const handleWrongContinue = () => {
    setStreak(0);
    newProblem(topicIdx, subtypeIdx);
  };

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
      <div className="spinner" />
    </div>
  );

  if (phase === "celebration" || topicIdx >= TOPICS.length) return (
    <div style={{ maxWidth: 520, margin: "0 auto", textAlign: "center", animation: "fadeUp 0.4s ease" }}>
      <div className="card">
        <div style={{ fontSize: 64, marginBottom: 16 }}></div>
        <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Mastery Complete!</h2>
        <p style={{ color: "var(--text2)", fontSize: 19, marginBottom: 24 }}>
          You've mastered all 6 topics - column addition and subtraction with all difficulty levels!
        </p>
        <button className="btn btn-primary btn-lg" style={{ width: "100%" }} onClick={onHome}>
           Back to Home
        </button>
      </div>
    </div>
  );

  const totalSubtypes = TOPICS.reduce((s, t) => s + t.subtypes.length, 0);
  const completedSubtypes = TOPICS.slice(0, topicIdx).reduce((s, t) => s + t.subtypes.length, 0) + subtypeIdx;

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", animation: "fadeUp 0.3s ease" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ fontSize: 19, color: "var(--text3)", marginBottom: 2 }}>
            Topic {topicIdx + 1} of {TOPICS.length}  {currentTopic.label}
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--blue)" }}>
            {currentSubtype?.label}
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onHome}> Home</button>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 20, color: "var(--text3)", marginBottom: 4 }}>
          <span>Overall progress</span>
          <span>{completedSubtypes}/{totalSubtypes} subtypes</span>
        </div>
        <div style={{ height: 5, background: "var(--surface2)", borderRadius: 99, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${(completedSubtypes / totalSubtypes) * 100}%`, background: "linear-gradient(90deg,var(--blue),var(--cyan))", borderRadius: 99 }} />
        </div>
      </div>

      <div className="card">
        <StreakDots current={streak} needed={STREAK_NEEDED} />

        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          {problem && (
            <ColumnProblem
              problem={problem}
              showAnswer={phase === "wrong"}
              showWorking={phase === "wrong"}
            />
          )}
        </div>

        {phase === "correct" ? (
          <div style={{ animation: "popIn 0.25s ease", textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}></div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--green)", marginBottom: 6 }}>Correct!</div>
            <div style={{ fontSize: 19, color: "var(--text3)", marginBottom: 20 }}>
              Streak: {streak}/{STREAK_NEEDED}
            </div>
            <button className="btn btn-success" style={{ width: "100%", fontSize: 20, padding: "13px" }}
              onClick={handleCorrectNext}>
               Next problem
            </button>
          </div>
        ) : phase === "wrong" ? (
          <div style={{ animation: "popIn 0.25s ease" }}>
            <div style={{ fontSize: 19, fontWeight: 700, color: "#fca5a5", marginBottom: 8, textAlign: "center" }}>
              Not quite! Here's the worked solution:
            </div>
            <div style={{ fontSize: 20, color: "var(--text3)", textAlign: "center", marginBottom: 16 }}>
              Streak reset - try another {currentSubtype?.label} problem
            </div>
            <button className="btn btn-success" style={{ width: "100%", fontSize: 20, padding: "13px" }}
              onClick={handleWrongContinue}>
              Got it - try again
            </button>
          </div>
        ) : (
          <>
            <p style={{ textAlign: "center", fontSize: 19, fontWeight: 600, color: "var(--text2)", marginBottom: 14 }}>
              What is the answer?
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
              Submit
            </button>
          </>
        )}
      </div>

      {/* Topic roadmap */}
      <div style={{ marginTop: 16, display: "flex", gap: 6, flexWrap: "wrap" }}>
        {TOPICS.map((t, i) => {
          const done = i < topicIdx;
          const active = i === topicIdx;
          return (
            <div key={t.id} style={{
              fontSize: 20, fontWeight: 700, padding: "4px 10px", borderRadius: 99,
              background: done ? "rgba(16,185,129,0.15)" : active ? "rgba(59,130,246,0.15)" : "var(--surface)",
              color: done ? "var(--green)" : active ? "var(--blue)" : "var(--text3)",
              border: `1px solid ${done ? "rgba(16,185,129,0.3)" : active ? "rgba(59,130,246,0.3)" : "var(--border)"}`,
            }}>
              {done ? " " : active ? " " : ""}{t.icon} {t.id.includes("add") ? "Add" : "Sub"} {i + 1}
            </div>
          );
        })}
      </div>
    </div>
  );
}
