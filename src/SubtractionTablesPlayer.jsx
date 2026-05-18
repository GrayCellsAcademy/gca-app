import { useState, useEffect, useRef } from "react";
import useActivityTracking from "./core/useActivityTracking";
import { saveProgress as fbSaveProgress, getProgress } from "./core/firebase";

export const SUBTRACTION_TOPIC_ID = "subtraction-tables-v1";

const SUB_TIMER = 10;
const SUB_CORRECT_NEEDED = 2;
const SUB_REVIEW_NEEDED = 1;
const TOTAL_TIERS = 9;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildTierQuestions(tierNum, masteredTiers) {
  // Current tier: (tierNum+1)-tierNum through (tierNum+9)-tierNum (9 questions, 2 correct each)
  const current = Array.from({ length: 9 }, (_, i) => ({
    a: tierNum + 1 + i, b: tierNum,
    answer: i + 1,
    streakNeeded: SUB_CORRECT_NEEDED, streak: 0, isCurrent: true,
  }));
  // Review: all previously mastered tiers, 1 correct each
  const review = masteredTiers.flatMap(t =>
    Array.from({ length: 9 }, (_, i) => ({
      a: t + 1 + i, b: t,
      answer: i + 1,
      streakNeeded: SUB_REVIEW_NEEDED, streak: 0, isCurrent: false,
    }))
  );
  return shuffle([...current, ...review]);
}

// Countdown ring
function CountdownRing({ seconds, total }) {
  const r = 24, circ = 2 * Math.PI * r;
  const pct = seconds / total;
  const danger = seconds <= 3, warn = seconds <= 6;
  const color = danger ? "var(--red)" : warn ? "var(--amber)" : "var(--green)";
  return (
    <div style={{ position: "relative", width: 60, height: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width={60} height={60} style={{ position: "absolute", top: 0, left: 0, transform: "rotate(-90deg)" }}>
        <circle cx={30} cy={30} r={r} fill="none" stroke="var(--surface2)" strokeWidth={4} />
        <circle cx={30} cy={30} r={r} fill="none" stroke={color} strokeWidth={4}
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.9s linear, stroke 0.3s" }} />
      </svg>
      <span style={{ fontFamily: "var(--mono)", fontSize: 16, fontWeight: 700, color }}>{seconds}</span>
    </div>
  );
}

// Answer input
function AnswerInput({ onSubmit }) {
  const [val, setVal] = useState("");
  const ref = useRef(null);
  useEffect(() => { setVal(""); setTimeout(() => ref.current?.focus(), 80); }, []);
  const submit = () => {
    const n = parseInt(val, 10);
    if (!isNaN(n)) { onSubmit(n); setVal(""); }
  };
  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
      <input ref={ref} value={val}
        onChange={e => setVal(e.target.value.replace(/\D/g, ""))}
        onKeyDown={e => e.key === "Enter" && submit()}
        inputMode="numeric" placeholder="?"
        style={{ textAlign: "center", fontSize: 34, fontFamily: "var(--mono)", fontWeight: 700, padding: "12px", width: 120 }} />
      <button className="btn btn-primary" style={{ fontSize: 20, padding: "12px 24px" }}
        onMouseDown={e => { e.preventDefault(); submit(); }}
        onTouchEnd={e => { e.preventDefault(); submit(); }}
        disabled={!val.trim()}>
        OK
      </button>
    </div>
  );
}

// Main player
export default function SubtractionTablesPlayer({ user, topic, onHome }) {
  const timerDisabled = user?.timerDisabled || false; {
  useActivityTracking(user, "subtraction-tables-v1", "Subtraction Table");
  const topicId = topic?.id || SUBTRACTION_TOPIC_ID;
  const [loading, setLoading] = useState(true);
  const [tierNum, setTierNum] = useState(1);
  const [masteredTiers, setMasteredTiers] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [qIdx, setQIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(SUB_TIMER);
  const [showCorrect, setShowCorrect] = useState(null);
  const [completed, setCompleted] = useState(false);
  const timerRef = useRef(null);

  // Load progress
  useEffect(() => {
    const load = async () => {
      const prog = await getProgress(user.id, topicId);
      if (prog?.data) {
        const { tierNum: t, masteredTiers: mt, completed: done } = prog.data;
        if (done) { setCompleted(true); setLoading(false); return; }
        const tn = t || 1;
        const mts = mt || [];
        setTierNum(tn);
        setMasteredTiers(mts);
        setQuestions(buildTierQuestions(tn, mts));
      } else {
        setQuestions(buildTierQuestions(1, []));
      }
      setLoading(false);
    };
    load();
  }, []);

  // Timer
  useEffect(() => {
    if (loading || completed || questions.length === 0) return;
    startTimer();
    return () => clearInterval(timerRef.current);
  }, [qIdx, questions.length, loading, completed]);

  const currentQ = questions[qIdx % questions.length] || questions[0];

  const startTimer = () => {
    clearInterval(timerRef.current);
    setTimeLeft(SUB_TIMER);
    if (timerDisabled) return;
      timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); handleWrong(); return 0; }
        return t - 1;
      });
    }, 1000);
  };

  const allDone = (qs) => qs.every(q => q.streak >= q.streakNeeded);

  const save = async (tn, mts, done) => {
    const pct = Math.round(((mts.length + (done ? 1 : 0)) / TOTAL_TIERS) * 100);
    await fbSaveProgress(user.id, topicId, {
      started: true,
      completed: done,
      percentComplete: Math.min(100, pct),
      data: { tierNum: tn, masteredTiers: mts, completed: done },
    });
  };

  const handleAnswer = (val) => {
    clearInterval(timerRef.current);
    if (val === currentQ.answer) {
      const updated = questions.map((q, i) =>
        i === (qIdx % questions.length) ? { ...q, streak: q.streak + 1 } : q
      );
      setQuestions(updated);
      setShowCorrect(null);
      if (allDone(updated)) {
        advanceTier(updated);
      } else {
        setQIdx(i => i + 1);
      }
    } else {
      handleWrong();
    }
  };

  const handleWrong = () => {
    clearInterval(timerRef.current);
    const updated = questions.map((q, i) =>
      i === (qIdx % questions.length)
        ? { ...q, streak: 0, streakNeeded: q.streakNeeded + 1 }
        : q
    );
    setQuestions(updated);
    setShowCorrect(currentQ?.answer ?? 0);
  };

  const handleWrongContinue = () => {
    setShowCorrect(null);
    setQIdx(i => i + 1);
    startTimer();
  };

  const advanceTier = async () => {
    const newMastered = [...masteredTiers, tierNum];
    const nextTier = tierNum + 1;
    if (nextTier > TOTAL_TIERS) {
      await save(nextTier, newMastered, true);
      setCompleted(true);
    } else {
      await save(nextTier, newMastered, false);
      setTierNum(nextTier);
      setMasteredTiers(newMastered);
      setQuestions(buildTierQuestions(nextTier, newMastered));
      setQIdx(0);
      setShowCorrect(null);
    }
  };

  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><div className="spinner" /></div>;

  if (completed) return (
    <div style={{ maxWidth: 520, margin: "0 auto", textAlign: "center", animation: "fadeUp 0.4s ease" }}>
      <div className="card">
        <div style={{ fontSize: 48, fontWeight: 900, color: "var(--amber)", marginBottom: 16 }}>100%</div>
        <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>Subtraction Tables Complete!</h2>
        <p style={{ color: "var(--text2)", fontSize: 16, marginBottom: 24 }}>
          You have mastered all 9 subtraction tiers!
        </p>
        <button className="btn btn-primary btn-lg" style={{ width: "100%" }} onClick={onHome}>
          Back to Home
        </button>
      </div>
    </div>
  );

  if (!currentQ) return <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><div className="spinner" /></div>;

  const totalQ = questions.length;
  const doneQ = questions.filter(q => q.streak >= q.streakNeeded).length;

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", animation: "fadeUp 0.3s ease" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800 }}>Subtracting {tierNum}s</div>
          <div style={{ fontSize: 13, color: "var(--text3)" }}>
            {masteredTiers.length > 0 ? "Review included: -" + masteredTiers.join(", -") : ""}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <CountdownRing seconds={timeLeft} total={SUB_TIMER} />
          <button className="btn btn-ghost btn-sm" onClick={onHome}>Home</button>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text3)", marginBottom: 4 }}>
          <span>Questions cleared</span><span>{doneQ}/{totalQ}</span>
        </div>
        <div style={{ height: 6, background: "var(--surface2)", borderRadius: 99, overflow: "hidden" }}>
          <div style={{ height: "100%", width: (totalQ > 0 ? doneQ / totalQ * 100 : 0) + "%", background: "var(--green)", borderRadius: 99, transition: "width 0.3s" }} />
        </div>
      </div>

      {/* Question card */}
      <div className="card" style={{ textAlign: "center" }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 52, fontWeight: 900, color: "var(--text)", marginBottom: 20, letterSpacing: "-1px" }}>
          {currentQ.a} - {currentQ.b} = ?
        </div>

        {!currentQ.isCurrent && (
          <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>Review</div>
        )}

        {/* Per-question streak dots */}
        <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 16 }}>
          {Array.from({ length: currentQ.streakNeeded }).map((_, i) => (
            <div key={i} style={{ width: 12, height: 12, borderRadius: "50%", background: i < currentQ.streak ? "var(--green)" : "var(--surface2)", border: "2px solid " + (i < currentQ.streak ? "var(--green)" : "var(--border2)"), transition: "all 0.2s" }} />
          ))}
        </div>

        {showCorrect !== null ? (
          <div style={{ animation: "popIn 0.25s ease" }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: "var(--red)", marginBottom: 8 }}>Not quite!</div>
            <div style={{ fontSize: 15, color: "var(--text2)", marginBottom: 6 }}>The answer is</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 48, fontWeight: 900, color: "var(--green)", marginBottom: 20 }}>
              {showCorrect}
            </div>
            <button className="btn btn-success" style={{ width: "100%", fontSize: 18 }}
              onMouseDown={e => { e.preventDefault(); handleWrongContinue(); }}
              onTouchEnd={e => { e.preventDefault(); handleWrongContinue(); }}>
              Got it - next
            </button>
          </div>
        ) : (
          <AnswerInput onSubmit={handleAnswer} />
        )}
      </div>

      {/* Tier roadmap */}
      <div style={{ marginTop: 14, display: "flex", gap: 5, flexWrap: "wrap" }}>
        {Array.from({ length: TOTAL_TIERS }, (_, i) => {
          const n = i + 1;
          const done = masteredTiers.includes(n);
          const active = n === tierNum;
          return (
            <div key={n} style={{ fontSize: 13, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: done ? "rgba(16,185,129,0.15)" : active ? "rgba(232,99,10,0.15)" : "var(--surface)", color: done ? "var(--green)" : active ? "var(--blue)" : "var(--text3)", border: "1px solid " + (done ? "rgba(16,185,129,0.3)" : active ? "rgba(232,99,10,0.3)" : "var(--border)") }}>
              -{n}
            </div>
          );
        })}
      </div>
    </div>
  );
}




