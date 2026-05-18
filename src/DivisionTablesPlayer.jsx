import { useState, useEffect, useRef } from "react";
import { saveProgress, getProgress, getUser } from "./core/firebase";
import useActivityTracking from "./core/useActivityTracking";

export const DIVISION_TABLES_TOPIC_ID = "division-tables-v1";

// Divisors 2-5, dividends up to divisor*9
function buildQuestions(divisor) {
  return shuffle(Array.from({ length: 9 }, (_, i) => ({
    dividend: divisor * (i + 1),
    divisor,
    answer: i + 1,
  })));
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function TimerBar({ duration, onExpire, key: _key }) {
  const [left, setLeft] = useState(duration);
  const expiredRef = useRef(false);
  useEffect(() => {
    expiredRef.current = false;
    setLeft(duration);
    const start = Date.now();
    const id = setInterval(() => {
      const remaining = Math.max(0, duration - Math.floor((Date.now() - start) / 1000));
      setLeft(remaining);
      if (remaining === 0 && !expiredRef.current) {
        expiredRef.current = true;
        onExpire();
      }
    }, 200);
    return () => clearInterval(id);
  }, [_key]);
  const pct = (left / duration) * 100;
  const color = left <= 3 ? "var(--red)" : left <= 6 ? "var(--amber)" : "var(--green)";
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 20, color: "var(--text3)", marginBottom: 4 }}>
        <span>Time</span><span style={{ fontWeight: 700, color, fontSize: 22 }}>{left}s</span>
      </div>
      <div style={{ height: 7, background: "var(--surface2)", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ height: "100%", width: pct + "%", background: color, borderRadius: 99, transition: "width 0.2s linear" }} />
      </div>
    </div>
  );
}

const DIVISORS = [2, 3, 4, 5];

export default function DivisionTablesPlayer({ user, topic, onHome }) {
  useActivityTracking(user, DIVISION_TABLES_TOPIC_ID, "Division Tables (2-5)");
  const topicId = topic?.id || DIVISION_TABLES_TOPIC_ID;

  // Progress: unlockedDivisorIdx, divisorProgress[2..5] = {needed, correct, done}
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [unlockedIdx, setUnlockedIdx] = useState(0); // index into DIVISORS
  const [divisorIdx, setDivisorIdx] = useState(0); // which divisor we're on
  const [questions, setQuestions] = useState([]);
  const [qIdx, setQIdx] = useState(0);
  const [needed, setNeeded] = useState(2); // correct needed for this question
  const [correct, setCorrect] = useState(0); // correct so far for this question
  const [reviewNeeded, setReviewNeeded] = useState({}); // {divisor: needed}
  const [val, setVal] = useState("");
  const [feedback, setFeedback] = useState(null); // {correct, answer}
  const [timerKey, setTimerKey] = useState(0);
  const [phase, setPhase] = useState("question"); // question | feedback
  const inputRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      const prog = await getProgress(user.id, topicId);
      if (prog?.data?.completed) { setCompleted(true); setLoading(false); return; }
      if (prog?.data) {
        const d = prog.data;
        if (d.unlockedIdx !== undefined) setUnlockedIdx(d.unlockedIdx);
        if (d.divisorIdx !== undefined) setDivisorIdx(d.divisorIdx);
        if (d.reviewNeeded) setReviewNeeded(d.reviewNeeded);
      }
      setLoading(false);
    };
    load();
  }, []);

  // Build question set when divisorIdx changes
  useEffect(() => {
    if (loading) return;
    buildQuestionSet(divisorIdx);
  }, [divisorIdx, loading]);

  const buildQuestionSet = (dIdx) => {
    const currentDivisor = DIVISORS[dIdx];
    const reviewDivisors = DIVISORS.slice(0, dIdx);
    const main = buildQuestions(currentDivisor);
    const review = reviewDivisors.flatMap(d => buildQuestions(d));
    const all = shuffle([...main, ...review]);
    setQuestions(all);
    setQIdx(0);
    setNeeded(2);
    setCorrect(0);
    setVal("");
    setFeedback(null);
    setPhase("question");
    setTimerKey(k => k + 1);
  };

  const save = async (uIdx, dIdx, rNeeded, done) => {
    const pct = done ? 100 : Math.round((dIdx / DIVISORS.length) * 100);
    await saveProgress(user.id, topicId, {
      started: true, completed: done, percentComplete: pct,
      data: { unlockedIdx: uIdx, divisorIdx: dIdx, reviewNeeded: rNeeded, completed: done },
    });
  };

  const handleTimeout = () => {
    if (phase !== "question") return;
    const q = questions[qIdx];
    showFeedback(false, q.answer);
  };

  const submit = () => {
    if (phase !== "question") return;
    const q = questions[qIdx];
    const ans = parseInt(val.trim(), 10);
    const isCorrect = ans === q.answer;
    showFeedback(isCorrect, q.answer);
  };

  const showFeedback = (isCorrect, correctAnswer) => {
    setPhase("feedback");
    setFeedback({ correct: isCorrect, answer: correctAnswer });
  };

  const nextQuestion = () => {
    const q = questions[qIdx];
    const isReview = q.divisor !== DIVISORS[divisorIdx];
    let newNeeded = needed;
    let newCorrect = correct;
    let newReviewNeeded = { ...reviewNeeded };

    if (feedback.correct) {
      newCorrect = correct + 1;
      if (newCorrect >= newNeeded) {
        // Question passed - move to next
        const nextQIdx = qIdx + 1;
        if (nextQIdx >= questions.length) {
          // All questions done - divisor complete
          const nextDIdx = divisorIdx + 1;
          const newUnlockedIdx = Math.max(unlockedIdx, nextDIdx);
          const done = nextDIdx >= DIVISORS.length;
          save(newUnlockedIdx, done ? divisorIdx : nextDIdx, newReviewNeeded, done);
          if (done) { setCompleted(true); return; }
          setUnlockedIdx(newUnlockedIdx);
          setDivisorIdx(nextDIdx);
        } else {
          setQIdx(nextQIdx);
          setNeeded(isReview ? (newReviewNeeded[q.divisor] || 1) : 2);
          setCorrect(0);
          setVal("");
          setFeedback(null);
          setPhase("question");
          setTimerKey(k => k + 1);
        }
        return;
      }
    } else {
      // Wrong answer
      if (isReview) {
        newReviewNeeded[q.divisor] = (newReviewNeeded[q.divisor] || 1) + 1;
        setReviewNeeded(newReviewNeeded);
      } else {
        newNeeded = needed + 1;
      }
      newCorrect = 0;
    }

    setNeeded(newNeeded);
    setCorrect(newCorrect);
    setVal("");
    setFeedback(null);
    setPhase("question");
    setTimerKey(k => k + 1);
    setTimeout(() => inputRef.current?.focus(), 80);
  };

  useEffect(() => {
    if (phase === "question") setTimeout(() => inputRef.current?.focus(), 80);
  }, [phase, qIdx]);

  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><div className="spinner" /></div>;

  if (completed) return (
    <div style={{ maxWidth: 520, margin: "0 auto", textAlign: "center" }}>
      <div className="card">
        <div style={{ fontSize: 48, fontWeight: 900, color: "var(--green)", marginBottom: 12 }}>100%</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Division Tables Complete!</h2>
        <p style={{ fontSize: 20, color: "var(--text2)", marginBottom: 24 }}>You've mastered dividing by 2, 3, 4, and 5!</p>
        <button className="btn btn-primary btn-lg" style={{ width: "100%" }} onClick={onHome}>Back to Home</button>
      </div>
    </div>
  );

  // Divisor select screen
  if (questions.length === 0) return <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><div className="spinner" /></div>;

  const q = questions[qIdx];
  const isReview = q.divisor !== DIVISORS[divisorIdx];
  const currentNeeded = isReview ? (reviewNeeded[q.divisor] || 1) : needed;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "clamp(16px,3vw,32px)" }} className="dot-bg">
      <div style={{ maxWidth: 520, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,var(--blue),var(--orange))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "#fff" }}>/</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 22 }}>Division Tables</div>
              <div style={{ fontSize: 20, color: "var(--text3)" }}>Dividing by {DIVISORS[divisorIdx]}{isReview ? ` + review` : ""}</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onHome}>Home</button>
        </div>

        {/* Divisor progress pills */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {DIVISORS.map((d, i) => (
            <div key={d} style={{ flex: 1, textAlign: "center", padding: "6px 0", borderRadius: "var(--radius-sm)", fontWeight: 700, fontSize: 20, background: i < unlockedIdx ? "rgba(22,163,74,0.15)" : i === divisorIdx ? "rgba(27,143,255,0.15)" : "var(--surface2)", color: i < unlockedIdx ? "var(--green)" : i === divisorIdx ? "var(--blue)" : "var(--text3)", border: "1px solid " + (i < unlockedIdx ? "rgba(22,163,74,0.3)" : i === divisorIdx ? "rgba(27,143,255,0.3)" : "var(--border)") }}>
              -{d}{i < unlockedIdx ? " -" : ""}
            </div>
          ))}
        </div>

        <div className="card">
          {phase === "question" && (
            <TimerBar key={timerKey} duration={10} onExpire={handleTimeout} />
          )}

          {/* Question */}
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            {isReview && <div style={{ fontSize: 19, color: "var(--orange)", fontWeight: 700, marginBottom: 8 }}>Review: -{q.divisor}</div>}
            <div style={{ fontSize: 48, fontWeight: 900, fontFamily: "var(--mono)", color: "var(--text)" }}>
              {q.dividend} - {q.divisor} = ?
            </div>
          </div>

          {/* Streak dots */}
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 16 }}>
            {Array.from({ length: currentNeeded }).map((_, i) => (
              <div key={i} style={{ width: 14, height: 14, borderRadius: "50%", background: i < correct ? "var(--green)" : "var(--surface2)", border: "2px solid " + (i < correct ? "var(--green)" : "var(--border2)"), transition: "all 0.2s" }} />
            ))}
          </div>

          {phase === "feedback" ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: feedback.correct ? "var(--green)" : "var(--red)", marginBottom: feedback.correct ? 8 : 16 }}>
                {feedback.correct ? "Correct!" : "Incorrect"}
              </div>
              {!feedback.correct && (
                <div style={{ fontSize: 22, color: "var(--text2)", marginBottom: 16 }}>
                  {q.dividend} - {q.divisor} = <strong style={{ color: "var(--green)", fontFamily: "var(--mono)", fontSize: 26 }}>{feedback.answer}</strong>
                </div>
              )}
              <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }} onClick={nextQuestion}>
                {feedback.correct ? "Next" : "Try Again"}
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <input ref={inputRef} value={val}
                onChange={e => setVal(e.target.value.replace(/[^0-9]/g, ""))}
                onKeyDown={e => e.key === "Enter" && val.trim() && submit()}
                inputMode="numeric"
                style={{ textAlign: "center", fontSize: 32, fontFamily: "var(--mono)", fontWeight: 700, padding: "10px", width: 140 }} />
              <button className="btn btn-primary" style={{ fontSize: 20, padding: "10px 24px" }}
                onMouseDown={e => { e.preventDefault(); if (val.trim()) submit(); }}
                disabled={!val.trim()}>OK</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

