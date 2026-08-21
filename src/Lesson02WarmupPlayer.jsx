import { useState, useEffect, useRef } from "react";
import useActivityTracking from "./core/useActivityTracking";
import { saveProgress, getProgress } from "./core/firebase";
import {
  computeCarries, computeBorrows,
  genSubBorrowZero,
} from "./lesson01Mastery";

export const TOPIC_ID = "lesson02-warmup-v1";
const STREAK_NEEDED = 2;

//  New generator: multi-number addition with varied digit counts (2-5 digits, 3-4 addends)
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function genAddMultiWarmup() {
  let attempts = 0;
  while (attempts < 1000) {
    attempts++;
    const count = Math.random() < 0.5 ? 3 : 4;
    const digitCounts = Array.from({ length: count }, () => randInt(2, 5));
    if (!digitCounts.some(d => d >= 4)) continue;
    if (digitCounts.every(d => d === digitCounts[0])) continue;
    const numbers = digitCounts.map(d => randInt(Math.pow(10, d - 1), Math.pow(10, d) - 1));
    const answer = numbers.reduce((s, n) => s + n, 0);
    return { numbers, answer, type: "add-multi-warmup" };
  }
  throw new Error("genAddMultiWarmup: failed after 1000 attempts");
}

const TOPICS = [
  {
    id: "add-multi-warmup",
    label: "Adding Multiple Numbers",
    subtypes: [
      { label: "3-4 numbers, 2-5 digits each", gen: () => genAddMultiWarmup() },
    ],
  },
  {
    id: "sub-borrow-zero",
    label: "Subtraction - Borrowing Through Zero",
    subtypes: [
      { label: "4-digit - 4-digit", gen: () => genSubBorrowZero(4, 4) },
    ],
  },
];

//  Column Problem Display
function ColumnProblem({ problem, showAnswer = false, showWorking = false }) {
  const isAddition = problem.type.startsWith("add");
  const numbers = isAddition ? problem.numbers : [problem.top, problem.bot];
  const maxLen = Math.max(...numbers.map(n => String(n).length));
  const padded = numbers.map(n => String(n).padStart(maxLen, " "));
  const answer = problem.answer;

  const carries = (showWorking && isAddition)
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
          {Array.from({ length: maxLen }, (_, ci) => (
            <div key={ci} style={{ width: cellW, height: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "var(--amber)" }}>
              {carries[ci] || ""}
            </div>
          ))}
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
export default function Lesson02WarmupPlayer({ user, topic, onHome }) {
  useActivityTracking(user, TOPIC_ID, "Warmup 2 (019)");
  const topicId = topic?.id || TOPIC_ID;

  const [topicIdx, setTopicIdx] = useState(0);
  const [streak, setStreak] = useState(0);
  const [problem, setProblem] = useState(null);
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState("question"); // question | correct | wrong | celebration
  const [loading, setLoading] = useState(true);
  const inputRef = useRef(null);
  const pendingProgress = useRef(null);

  const currentTopic = TOPICS[topicIdx];
  const currentSubtype = currentTopic?.subtypes[0];

  useEffect(() => {
    const load = async () => {
      const prog = await getProgress(user.id, topicId);
      if (prog?.data) {
        const { topicIdx: ti, streak: st } = prog.data;
        setTopicIdx(Math.min(ti || 0, TOPICS.length - 1));
        setStreak(st || 0);
      }
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    if (!loading && TOPICS[topicIdx]) {
      newProblem(topicIdx);
    }
  }, [topicIdx, loading]);

  const newProblem = (ti) => {
    const gen = TOPICS[ti]?.subtypes[0]?.gen;
    if (gen) {
      setProblem(gen());
      setInput("");
      setPhase("question");
      pendingProgress.current = null;
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  };

  const saveCurrentProgress = async (ti, st, done) => {
    await saveProgress(user.id, topicId, {
      started: true,
      completed: done,
      percentComplete: done ? 100 : Math.round((ti / TOPICS.length) * 100),
      data: { topicIdx: ti, streak: st },
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
        const nextTi = topicIdx + 1;
        if (nextTi >= TOPICS.length) {
          pendingProgress.current = { action: "done" };
          await saveCurrentProgress(nextTi, 0, true);
        } else {
          pendingProgress.current = { action: "nextTopic", ti: nextTi };
          await saveCurrentProgress(nextTi, 0, false);
        }
      } else {
        pendingProgress.current = { action: "stay" };
        await saveCurrentProgress(topicIdx, newStreak, false);
      }
    } else {
      setStreak(0);
      setPhase("wrong");
      await saveCurrentProgress(topicIdx, 0, false);
    }
  };

  const handleCorrectNext = () => {
    const p = pendingProgress.current;
    if (!p) return;
    if (p.action === "done") {
      setPhase("celebration");
    } else if (p.action === "nextTopic") {
      setTopicIdx(p.ti);
      setStreak(0);
    } else {
      newProblem(topicIdx);
    }
  };

  const handleWrongContinue = () => {
    setStreak(0);
    newProblem(topicIdx);
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
        <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Warmup Complete!</h2>
        <p style={{ color: "var(--text2)", fontSize: 19, marginBottom: 24 }}>
          You've completed both warmup activities - ready for HW 2!
        </p>
        <button className="btn btn-primary btn-lg" style={{ width: "100%" }} onClick={onHome}>
           Back to Home
        </button>
      </div>
    </div>
  );

  const completedTopics = topicIdx;

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", animation: "fadeUp 0.3s ease" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ fontSize: 19, color: "var(--text3)", marginBottom: 2 }}>
            Activity {topicIdx + 1} of {TOPICS.length}  {currentTopic.label}
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
          <span>{completedTopics}/{TOPICS.length} activities</span>
        </div>
        <div style={{ height: 5, background: "var(--surface2)", borderRadius: 99, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${(completedTopics / TOPICS.length) * 100}%`, background: "linear-gradient(90deg,var(--blue),var(--cyan))", borderRadius: 99 }} />
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
              Streak reset - try another problem
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

      {/* Activity roadmap */}
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
              {done ? " " : active ? " " : ""}{i === 0 ? "Addition" : "Subtraction"}
            </div>
          );
        })}
      </div>
    </div>
  );
}
