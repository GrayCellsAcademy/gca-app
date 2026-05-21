import { useState, useEffect, useRef } from "react";
import { saveProgress as fbSaveProgress, getProgress } from "./core/firebase";

export const LESSON12_MASTERY_TOPIC_ID = "lesson12-mastery-v1";
export const PERFECT_SQUARES_12_TOPIC_ID = "perfect-squares-12-v1";

const STREAK2 = 2;
const STREAK3 = 3;

// -- KaTeX --
function useKaTeX() {
  useEffect(() => {
    if (window.katex) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css";
    document.head.appendChild(link);
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js";
    s.async = true;
    document.head.appendChild(s);
  }, []);
}
function KaTeXBlock({ expr }) {
  useKaTeX();
  const ref = useRef(null);
  useEffect(() => {
    const go = () => {
      if (window.katex && ref.current) {
        try { window.katex.render(expr, ref.current, { throwOnError: false, displayMode: true }); } catch {}
      } else setTimeout(go, 100);
    };
    go();
  });
  return <div ref={ref} style={{ fontSize: 26, margin: "6px 0", minHeight: 36, display: "flex", justifyContent: "center" }} />;
}

// - Helpers -
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randChoice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function shuffle(arr) { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

function divBy(n, d) {
  if (d === 2) return n % 2 === 0;
  if (d === 3) return String(n).split("").reduce((s, c) => s + parseInt(c), 0) % 3 === 0;
  if (d === 4) return n % 4 === 0;
  if (d === 5) return n % 5 === 0;
  if (d === 6) return n % 2 === 0 && String(n).split("").reduce((s, c) => s + parseInt(c), 0) % 3 === 0;
  if (d === 9) return String(n).split("").reduce((s, c) => s + parseInt(c), 0) % 9 === 0;
  if (d === 10) return n % 10 === 0;
  return false;
}

function isPrime(n) {
  if (n < 2) return false;
  for (let i = 2; i <= Math.sqrt(n); i++) if (n % i === 0) return false;
  return true;
}

function primeFactors(n) {
  const f = {}; let d = 2;
  while (n > 1) { while (n % d === 0) { f[d] = (f[d] || 0) + 1; n /= d; } d++; }
  return f;
}

function formatPF(n) {
  const f = primeFactors(n);
  return Object.entries(f).sort(([a], [b]) => a - b)
    .map(([p, e]) => e === 1 ? p : `${p}^${e}`).join(" x ");
}

function parsePF(str) {
  const s = String(str).trim().toLowerCase()
    .replace(/\u00d7/g, "x").replace(/\*/g, "x").replace(/\s+/g, "");
  const f = {};
  for (const t of s.split("x")) {
    const m = t.match(/^(\d+)(?:\^(\d+))?$/);
    if (!m) return null;
    const base = parseInt(m[1]), exp = m[2] ? parseInt(m[2]) : 1;
    f[base] = (f[base] || 0) + exp;
  }
  return f;
}

function pfsEqual(a, b) {
  if (!a || !b) return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every(k => a[k] === b[k]);
}

function gen3to4Digit() { return randInt(100, 9999); }

// - Shared UI -
function StreakDots({ current, needed }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
      {Array.from({ length: needed }).map((_, i) => (
        <div key={i} style={{ width: 13, height: 13, borderRadius: "50%", background: i < current ? "var(--green)" : "var(--surface2)", border: "2px solid " + (i < current ? "var(--green)" : "var(--border2)"), transition: "all 0.2s" }} />
      ))}
      <span style={{ fontSize: 20, color: "var(--text3)", marginLeft: 6 }}>{current}/{needed}</span>
    </div>
  );
}

function FeedbackBanner({ correct, message, onNext, nextLabel }) {
  return (
    <div style={{ textAlign: "center", marginTop: 12 }}>
      <div style={{ fontSize: 24, fontWeight: 800, color: correct ? "var(--green)" : "var(--red)", marginBottom: 10 }}>
        {correct ? "Correct!" : "Incorrect"}
      </div>
      {message && (
        <div style={{ fontSize: 20, color: "var(--text2)", marginBottom: 14, background: correct ? "rgba(22,163,74,0.06)" : "rgba(239,68,68,0.06)", border: "1px solid " + (correct ? "rgba(22,163,74,0.2)" : "rgba(239,68,68,0.2)"), borderRadius: "var(--radius-sm)", padding: "10px 16px", textAlign: "left" }}>
          {message}
        </div>
      )}
      <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }} onClick={onNext}>
        {nextLabel || (correct ? "Next" : "Try Again")}
      </button>
    </div>
  );
}

// - Activity 1: Perfect Squares 11-15 -
const SQUARES = [
  { base: 11, sq: 121 }, { base: 12, sq: 144 }, { base: 13, sq: 169 },
  { base: 14, sq: 196 }, { base: 15, sq: 225 },
];
const SQUARE_TIMER = 5;

function PerfectSquaresPlayer({ user, onComplete }) {
  const [phase, setPhase] = useState(1);
  const [masteredMap, setMasteredMap] = useState({});
  const [reviewMode, setReviewMode] = useState(false);

  const allMastered = SQUARES.every(s => (masteredMap[s.base] || 0) >= STREAK2);

  const handlePhase1Done = () => setPhase(2);

  const handleItemMastered = (base) => {
    setMasteredMap(prev => {
      const next = { ...prev, [base]: (prev[base] || 0) + 1 };
      const allDone = SQUARES.every(s => (next[s.base] || 0) >= STREAK2);
      if (allDone && !reviewMode) setTimeout(() => setReviewMode(true), 300);
      return next;
    });
  };

  const handleReviewComplete = () => onComplete();

  if (phase === 1) return <SquaresPhase1 onDone={handlePhase1Done} />;
  if (!reviewMode) return <SquaresPhase2 masteredMap={masteredMap} onItemMastered={handleItemMastered} />;
  return <SquaresReview onComplete={handleReviewComplete} />;
}

function SquaresPhase1({ onDone }) {
  const [idx, setIdx] = useState(0);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);

  const square = SQUARES[idx];

  if (!started) return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 20, color: "var(--text2)", marginBottom: 16 }}>Memorize the perfect squares 11-15 in order.</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
        {SQUARES.map(s => (
          <div key={s.base} style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "10px 16px", fontSize: 24, fontWeight: 800, fontFamily: "var(--mono)", textAlign: "center" }}>
            {s.base}- = {s.sq}
          </div>
        ))}
      </div>
      <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }} onClick={() => setStarted(true)}>
        Start Reciting
      </button>
    </div>
  );

  if (done) return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: "var(--green)", marginBottom: 16 }}>Phase 1 Complete!</div>
      <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }} onClick={onDone}>Start Timed Drill</button>
    </div>
  );

  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 20, color: "var(--text2)", marginBottom: 8 }}>Square {idx + 1} of {SQUARES.length}</div>
      <KaTeXBlock expr={`${square.base}^2 = ${square.sq}`} />
      <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }}
        onClick={() => { if (idx + 1 < SQUARES.length) setIdx(i => i + 1); else setDone(true); }}>
        {idx + 1 < SQUARES.length ? "Next" : "Done"}
      </button>
    </div>
  );
}

function SquaresPhase2({ masteredMap, onItemMastered }) {
  const remaining = SQUARES.filter(s => (masteredMap[s.base] || 0) < STREAK2);
  const [current, setCurrent] = useState(() => randChoice(remaining));
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [timeLeft, setTimeLeft] = useState(SQUARE_TIMER);
  const [correct, setCorrect] = useState({});
  const [wrong, setWrong] = useState({});
  const timerRef = useRef(null);
  const inputRef = useRef(null);

  const nextQuestion = () => {
    if (feedback?.mastered) onItemMastered(feedback.base);
    const rem = SQUARES.filter(s => (masteredMap[s.base] || 0) < STREAK2);
    if (rem.length > 0) {
      setCurrent(randChoice(rem));
      setInput(""); setFeedback(null); setTimeLeft(SQUARE_TIMER);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  };

  useEffect(() => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); handleTimeout(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [current]);

  const handleTimeout = () => {
    clearInterval(timerRef.current);
    setFeedback({ correct: false, timeout: true });
    setWrong(prev => ({ ...prev, [current.base]: (prev[current.base] || 0) + 1 }));
  };

  const handleSubmit = () => {
    clearInterval(timerRef.current);
    const isCorrect = parseInt(input) === current.sq;
    let mastered = false;
    if (isCorrect) {
      const newCorrect = (correct[current.base] || 0) + 1;
      const needed = STREAK2 + (wrong[current.base] || 0);
      setCorrect(prev => ({ ...prev, [current.base]: newCorrect }));
      if (newCorrect >= needed) mastered = true;
    } else {
      setWrong(prev => ({ ...prev, [current.base]: (prev[current.base] || 0) + 1 }));
    }
    setFeedback({ correct: isCorrect, mastered, base: current.base });
  };

  const pct = (timeLeft / SQUARE_TIMER) * 100;
  const color = timeLeft <= 2 ? "var(--red)" : timeLeft <= 3 ? "var(--amber)" : "var(--green)";

  return (
    <div>
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 20, color: "var(--text3)", marginBottom: 4 }}>
          <span>Time</span><span style={{ fontWeight: 700, color }}>{timeLeft}s</span>
        </div>
        <div style={{ height: 6, background: "var(--surface2)", borderRadius: 99, overflow: "hidden" }}>
          <div style={{ height: "100%", width: pct + "%", background: color, borderRadius: 99, transition: "width 0.9s linear" }} />
        </div>
      </div>
      <div style={{ fontSize: 20, color: "var(--text3)", marginBottom: 6, textAlign: "center" }}>
        Mastered: {SQUARES.filter(s => (masteredMap[s.base] || 0) >= STREAK2).length}/{SQUARES.length}
      </div>
      <KaTeXBlock expr={`${current.base}^2 = \;?`} />
      {feedback ? (
        <FeedbackBanner correct={feedback.correct}
          message={`${current.base}\u00b2 = ${current.sq}`}
          onNext={nextQuestion} nextLabel="Next Problem" />
      ) : (
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && input.trim() && handleSubmit()}
            placeholder="Enter answer" autoFocus
            style={{ textAlign: "center", fontSize: 24, fontFamily: "var(--mono)", fontWeight: 800, padding: "10px", width: 180 }} />
          <button className="btn btn-primary" style={{ fontSize: 20, padding: "10px 20px" }}
            onClick={handleSubmit} disabled={!input.trim()}>OK</button>
        </div>
      )}
    </div>
  );
}

function SquaresReview({ onComplete }) {
  const shuffled = shuffle([...SQUARES]);
  const [queue, setQueue] = useState(shuffled);
  const [current, setCurrent] = useState(shuffled[0]);
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [extraNeeded, setExtraNeeded] = useState({});
  const inputRef = useRef(null);

  const handleSubmit = () => {
    const isCorrect = parseInt(input) === current.sq;
    setFeedback({ correct: isCorrect });
    if (!isCorrect) setExtraNeeded(prev => ({ ...prev, [current.base]: (prev[current.base] || 0) + 1 }));
  };

  const handleNext = () => {
    const newQueue = feedback.correct ? queue.slice(1) : [...queue.slice(1), current];
    if (newQueue.length === 0) { onComplete(); return; }
    setCurrent(newQueue[0]);
    setQueue(newQueue);
    setInput(""); setFeedback(null);
    setTimeout(() => inputRef.current?.focus(), 80);
  };

  return (
    <div>
      <div style={{ fontSize: 20, color: "var(--text2)", marginBottom: 8, textAlign: "center" }}>Cumulative Review - {queue.length} remaining</div>
      <KaTeXBlock expr={`${current.base}^2 = \;?`} />
      {feedback ? (
        <FeedbackBanner correct={feedback.correct}
          message={feedback.correct ? null : `${current.base}\u00b2 = ${current.sq}`}
          onNext={handleNext} nextLabel="Next Problem" />
      ) : (
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && input.trim() && handleSubmit()}
            placeholder="Enter answer" autoFocus
            style={{ textAlign: "center", fontSize: 24, fontFamily: "var(--mono)", fontWeight: 800, padding: "10px", width: 180 }} />
          <button className="btn btn-primary" style={{ fontSize: 20, padding: "10px 20px" }}
            onClick={handleSubmit} disabled={!input.trim()}>OK</button>
        </div>
      )}
    </div>
  );
}

// - Activity 2: Divisibility 2, 5, 10 -
function gen5Numbers(filter) {
  const nums = [];
  let attempts = 0;
  while (nums.length < 5 && attempts < 1000) {
    attempts++;
    const n = randInt(100, 9999);
    if (!filter || filter(n)) nums.push(n);
  }
  return nums;
}

function genDiv2510Set() {
  // Ensure variety
  const nums = [];
  const gen = [
    () => { let n; do { n = randInt(10, 999) * 10; } while (n < 100 || n > 9999); return n; },
    () => { let n; do { n = randInt(20, 199) * 5; } while (n % 10 === 0 || n < 100 || n > 9999); return n; },
    () => { let n; do { n = randInt(50, 4999) * 2; } while (n % 5 === 0 || n < 100 || n > 9999); return n; },
    () => { let n; do { n = randInt(100, 9999); } while (n % 2 === 0 || n % 5 === 0 || n > 9999); return n; },
    () => { let n; do { n = randInt(10, 999) * 10; } while (n < 100 || n > 9999); return n; },
  ];
  for (const g of shuffle(gen)) nums.push(g());
  return nums;
}

function Div2510Mastery({ onCorrect, onWrong }) {
  const [nums, setNums] = useState(() => genDiv2510Set());
  const [answers, setAnswers] = useState(() => Array(5).fill([]));
  const [feedback, setFeedback] = useState(null);

  const toggle = (i, d) => {
    setAnswers(prev => prev.map((a, j) => j !== i ? a : a.includes(d) ? a.filter(x => x !== d) : [...a, d]));
  };

  const handleSubmit = () => {
    const results = nums.map((n, i) => {
      const correct = [2, 5, 10].filter(d => divBy(n, d));
      const given = answers[i];
      return correct.length === given.length && correct.every(v => given.includes(v));
    });
    const allCorrect = results.every(Boolean);
    setFeedback({ correct: allCorrect, results, nums: [...nums], answers: [...answers] });
    if (allCorrect) onCorrect(); else onWrong();
  };

  return (
    <div>
      {feedback ? (
        <div>
          <div style={{ textAlign: "center", fontSize: 22, fontWeight: 800, color: feedback.correct ? "var(--green)" : "var(--red)", marginBottom: 10 }}>
            {feedback.correct ? "Correct!" : "Incorrect"}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
            {feedback.nums.map((n, i) => {
              const correct = [2, 5, 10].filter(d => divBy(n, d));
              const item_ok = feedback.results[i];
              return (
                <div key={i} style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "8px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", border: "1px solid " + (item_ok ? "rgba(22,163,74,0.2)" : "rgba(239,68,68,0.2)") }}>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 22, fontWeight: 800 }}>{n}</span>
                  <span style={{ fontSize: 19, color: item_ok ? "var(--green)" : "var(--red)", fontWeight: 700 }}>
                    {correct.length > 0 ? correct.join(", ") : "None"}
                  </span>
                </div>
              );
            })}
          </div>
          <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }}
            onClick={() => { setFeedback(null); setNums(genDiv2510Set()); setAnswers(Array(5).fill([])); }}>
            Next Problem
          </button>
        </div>
      ) : (
        <div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
            {nums.map((n, i) => (
              <div key={i} style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "10px 14px" }}>
                <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "var(--mono)", marginBottom: 8 }}>{n}</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {[2, 5, 10].map(d => {
                    const sel = answers[i].includes(d);
                    return (
                      <button key={d} onClick={() => toggle(i, d)}
                        style={{ padding: "5px 14px", borderRadius: "var(--radius-sm)", border: "2px solid " + (sel ? "var(--blue)" : "var(--border)"), background: sel ? "rgba(27,143,255,0.15)" : "var(--surface)", fontSize: 20, fontWeight: 700, cursor: "pointer", color: sel ? "var(--blue)" : "var(--text)" }}>
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }} onClick={handleSubmit}>Submit All</button>
        </div>
      )}
    </div>
  );
}

// - Activity 3: Divisibility 3 and 9 -
function genDiv39Set() {
  const pool = [
    () => { let n; do { n = randInt(100, 999); } while (!divBy(n, 9)); return n; },
    () => { let n; do { n = randInt(100, 999); } while (!divBy(n, 3) || divBy(n, 9)); return n; },
    () => { let n; do { n = randInt(100, 999); } while (divBy(n, 3)); return n; },
    () => { let n; do { n = randInt(100, 999); } while (divBy(n, 3)); return n; },
    () => { let n; do { n = randInt(100, 999); } while (!divBy(n, 9)); return n; },
  ];
  return shuffle(pool).map(g => g());
}

const DIV39_OPTS = ["Div by 3", "Div by 9", "Both", "Neither"];
const DIV39_VALS = { "Div by 3": "3only", "Div by 9": "9only", "Both": "both", "Neither": "neither" };

function getDiv39Correct(n) {
  if (divBy(n, 9)) return "both";
  if (divBy(n, 3)) return "3only";
  return "neither";
}

function Div39Mastery({ onCorrect, onWrong }) {
  const [nums, setNums] = useState(() => genDiv39Set());
  const [answers, setAnswers] = useState(() => Array(5).fill(""));
  const [feedback, setFeedback] = useState(null);
  const allDone = answers.every(a => a !== "");

  const handleSubmit = () => {
    const results = nums.map((n, i) => DIV39_VALS[answers[i]] === getDiv39Correct(n));
    const allCorrect = results.every(Boolean);
    setFeedback({ correct: allCorrect, results, nums: [...nums] });
    if (allCorrect) onCorrect(); else onWrong();
  };

  const correctLabel = (n) => {
    const v = getDiv39Correct(n);
    return v === "both" ? "Both" : v === "3only" ? "Div by 3 only" : v === "9only" ? "Div by 9 only" : "Neither";
  };

  return (
    <div>
      {feedback ? (
        <div>
          <div style={{ textAlign: "center", fontSize: 22, fontWeight: 800, color: feedback.correct ? "var(--green)" : "var(--red)", marginBottom: 10 }}>
            {feedback.correct ? "Correct!" : "Incorrect"}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
            {feedback.nums.map((n, i) => (
              <div key={i} style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "8px 12px", display: "flex", justifyContent: "space-between", border: "1px solid " + (feedback.results[i] ? "rgba(22,163,74,0.2)" : "rgba(239,68,68,0.2)") }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: 22, fontWeight: 800 }}>{n}</span>
                <span style={{ fontSize: 19, color: feedback.results[i] ? "var(--green)" : "var(--red)", fontWeight: 700 }}>{correctLabel(n)}</span>
              </div>
            ))}
          </div>
          <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }}
            onClick={() => { setFeedback(null); setNums(genDiv39Set()); setAnswers(Array(5).fill("")); }}>Next Problem</button>
        </div>
      ) : (
        <div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
            {nums.map((n, i) => (
              <div key={i} style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "10px 14px" }}>
                <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "var(--mono)", marginBottom: 8 }}>{n}</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {DIV39_OPTS.map(opt => (
                    <button key={opt} onClick={() => setAnswers(prev => prev.map((a, j) => j === i ? opt : a))}
                      style={{ padding: "5px 12px", borderRadius: "var(--radius-sm)", border: "2px solid " + (answers[i] === opt ? "var(--blue)" : "var(--border)"), background: answers[i] === opt ? "rgba(27,143,255,0.15)" : "var(--surface)", fontSize: 18, fontWeight: 700, cursor: "pointer", color: answers[i] === opt ? "var(--blue)" : "var(--text)" }}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }} onClick={handleSubmit} disabled={!allDone}>Submit All</button>
        </div>
      )}
    </div>
  );
}

// - Activity 4: Divisibility 4 and 6 -
function genDiv46Set() {
  const pool = [
    () => { let n; do { n = randInt(100, 9999); } while (!divBy(n, 4) || !divBy(n, 6)); return n; },
    () => { let n; do { n = randInt(100, 9999); } while (!divBy(n, 4) || divBy(n, 6)); return n; },
    () => { let n; do { n = randInt(100, 9999); } while (divBy(n, 4) || !divBy(n, 6)); return n; },
    () => { let n; do { n = randInt(100, 9999); } while (divBy(n, 4) || divBy(n, 6)); return n; },
    () => { let n; do { n = randInt(100, 9999); } while (!divBy(n, 4) || !divBy(n, 6)); return n; },
  ];
  return shuffle(pool).map(g => g());
}

const DIV46_OPTS = ["Div by 4", "Div by 6", "Both", "Neither"];
const DIV46_VALS = { "Div by 4": "4only", "Div by 6": "6only", "Both": "both", "Neither": "neither" };

function getDiv46Correct(n) {
  if (divBy(n, 4) && divBy(n, 6)) return "both";
  if (divBy(n, 4)) return "4only";
  if (divBy(n, 6)) return "6only";
  return "neither";
}

function Div46Mastery({ onCorrect, onWrong }) {
  const [nums, setNums] = useState(() => genDiv46Set());
  const [answers, setAnswers] = useState(() => Array(5).fill(""));
  const [feedback, setFeedback] = useState(null);
  const allDone = answers.every(a => a !== "");

  const handleSubmit = () => {
    const results = nums.map((n, i) => DIV46_VALS[answers[i]] === getDiv46Correct(n));
    const allCorrect = results.every(Boolean);
    setFeedback({ correct: allCorrect, results, nums: [...nums] });
    if (allCorrect) onCorrect(); else onWrong();
  };

  const correctLabel = n => {
    const v = getDiv46Correct(n);
    return v === "both" ? "Both" : v === "4only" ? "Div by 4" : v === "6only" ? "Div by 6" : "Neither";
  };

  return (
    <div>
      {feedback ? (
        <div>
          <div style={{ textAlign: "center", fontSize: 22, fontWeight: 800, color: feedback.correct ? "var(--green)" : "var(--red)", marginBottom: 10 }}>
            {feedback.correct ? "Correct!" : "Incorrect"}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
            {feedback.nums.map((n, i) => (
              <div key={i} style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "8px 12px", display: "flex", justifyContent: "space-between", border: "1px solid " + (feedback.results[i] ? "rgba(22,163,74,0.2)" : "rgba(239,68,68,0.2)") }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: 22, fontWeight: 800 }}>{n}</span>
                <span style={{ fontSize: 19, color: feedback.results[i] ? "var(--green)" : "var(--red)", fontWeight: 700 }}>{correctLabel(n)}</span>
              </div>
            ))}
          </div>
          <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }}
            onClick={() => { setFeedback(null); setNums(genDiv46Set()); setAnswers(Array(5).fill("")); }}>Next Problem</button>
        </div>
      ) : (
        <div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
            {nums.map((n, i) => (
              <div key={i} style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "10px 14px" }}>
                <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "var(--mono)", marginBottom: 8 }}>{n}</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {DIV46_OPTS.map(opt => (
                    <button key={opt} onClick={() => setAnswers(prev => prev.map((a, j) => j === i ? opt : a))}
                      style={{ padding: "5px 12px", borderRadius: "var(--radius-sm)", border: "2px solid " + (answers[i] === opt ? "var(--blue)" : "var(--border)"), background: answers[i] === opt ? "rgba(27,143,255,0.15)" : "var(--surface)", fontSize: 18, fontWeight: 700, cursor: "pointer", color: answers[i] === opt ? "var(--blue)" : "var(--text)" }}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }} onClick={handleSubmit} disabled={!allDone}>Submit All</button>
        </div>
      )}
    </div>
  );
}

// - Activity 5: Mixed Divisibility -
function genMixedSet() {
  const nums = [];
  while (nums.length < 6) { const n = randInt(100, 9999); if (!nums.includes(n)) nums.push(n); }
  return nums;
}

function MixedDivMastery({ onCorrect, onWrong }) {
  const [nums, setNums] = useState(() => genMixedSet());
  const [answers, setAnswers] = useState(() => Array(6).fill([]));
  const [feedback, setFeedback] = useState(null);
  const ALL_RULES = [2, 3, 4, 5, 6, 9, 10];

  const toggle = (i, d) => {
    setAnswers(prev => prev.map((a, j) => j !== i ? a : a.includes(d) ? a.filter(x => x !== d) : [...a, d]));
  };

  const handleSubmit = () => {
    const results = nums.map((n, i) => {
      const correct = ALL_RULES.filter(d => divBy(n, d));
      const given = answers[i];
      return correct.length === given.length && correct.every(v => given.includes(v));
    });
    const allCorrect = results.every(Boolean);
    setFeedback({ correct: allCorrect, results, nums: [...nums] });
    if (allCorrect) onCorrect(); else onWrong();
  };

  return (
    <div>
      {feedback ? (
        <div>
          <div style={{ textAlign: "center", fontSize: 22, fontWeight: 800, color: feedback.correct ? "var(--green)" : "var(--red)", marginBottom: 10 }}>
            {feedback.correct ? "Correct!" : "Incorrect"}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
            {feedback.nums.map((n, i) => {
              const correct = ALL_RULES.filter(d => divBy(n, d));
              return (
                <div key={i} style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "8px 12px", display: "flex", justifyContent: "space-between", border: "1px solid " + (feedback.results[i] ? "rgba(22,163,74,0.2)" : "rgba(239,68,68,0.2)") }}>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 20, fontWeight: 800 }}>{n}</span>
                  <span style={{ fontSize: 18, color: feedback.results[i] ? "var(--green)" : "var(--red)", fontWeight: 700 }}>
                    {correct.length > 0 ? correct.join(", ") : "None"}
                  </span>
                </div>
              );
            })}
          </div>
          <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }}
            onClick={() => { setFeedback(null); setNums(genMixedSet()); setAnswers(Array(6).fill([])); }}>Next Problem</button>
        </div>
      ) : (
        <div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
            {nums.map((n, i) => (
              <div key={i} style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "8px 12px" }}>
                <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "var(--mono)", marginBottom: 6 }}>{n}</div>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {ALL_RULES.map(d => {
                    const sel = answers[i].includes(d);
                    return (
                      <button key={d} onClick={() => toggle(i, d)}
                        style={{ padding: "4px 10px", borderRadius: "var(--radius-sm)", border: "2px solid " + (sel ? "var(--blue)" : "var(--border)"), background: sel ? "rgba(27,143,255,0.15)" : "var(--surface)", fontSize: 18, fontWeight: 700, cursor: "pointer", color: sel ? "var(--blue)" : "var(--text)" }}>
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 19, color: "var(--text3)", marginBottom: 8, textAlign: "center" }}>Select all that apply. Leave blank if none.</div>
          <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }} onClick={handleSubmit}>Submit All</button>
        </div>
      )}
    </div>
  );
}

// - Activity 6: Prime or Composite -
function genPrimeSet() {
  const candidates = Array.from({ length: 29 }, (_, i) => i + 2); // 2-30
  return shuffle(candidates).slice(0, 10);
}

function PrimeMastery({ onCorrect, onWrong }) {
  const [nums, setNums] = useState(() => genPrimeSet());
  const [answers, setAnswers] = useState(() => Array(10).fill(""));
  const [feedback, setFeedback] = useState(null);
  const allDone = answers.every(a => a !== "");

  const getCorrect = n => isPrime(n) ? "Prime" : "Composite";

  const handleSubmit = () => {
    const results = nums.map((n, i) => answers[i] === getCorrect(n));
    const allCorrect = results.every(Boolean);
    setFeedback({ correct: allCorrect, results, nums: [...nums], answers: [...answers] });
    if (allCorrect) onCorrect(); else onWrong();
  };

  return (
    <div>
      {feedback ? (
        <div>
          <div style={{ textAlign: "center", fontSize: 22, fontWeight: 800, color: feedback.correct ? "var(--green)" : "var(--red)", marginBottom: 10 }}>
            {feedback.correct ? "Correct!" : "Incorrect"}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
            {feedback.nums.map((n, i) => {
              const ok = feedback.results[i];
              const studentAns = feedback.answers ? feedback.answers[i] : "";
              return (
                <div key={i} style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "6px 12px", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", border: "1px solid " + (ok ? "rgba(22,163,74,0.2)" : "rgba(239,68,68,0.2)") }}>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 20, fontWeight: 800, minWidth: 32 }}>{n}</span>
                  {!ok && <span style={{ fontSize: 18, color: "var(--red)", fontWeight: 700 }}>You: {studentAns}</span>}
                  <span style={{ fontSize: 18, color: "var(--green)", fontWeight: 700 }}>Correct: {getCorrect(n)}</span>
                </div>
              );
            })}
          </div>
          <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }}
            onClick={() => { setFeedback(null); setNums(genPrimeSet()); setAnswers(Array(10).fill("")); }}>Next Problem</button>
        </div>
      ) : (
        <div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
            {nums.map((n, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "7px 12px", flexWrap: "wrap" }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: 24, fontWeight: 900, minWidth: 32 }}>{n}</span>
                {["Prime", "Composite"].map(opt => (
                  <button key={opt} onClick={() => setAnswers(prev => prev.map((a, j) => j === i ? opt : a))}
                    style={{ padding: "5px 14px", borderRadius: "var(--radius-sm)", border: "2px solid " + (answers[i] === opt ? "var(--blue)" : "var(--border)"), background: answers[i] === opt ? "rgba(27,143,255,0.15)" : "var(--surface)", fontSize: 19, fontWeight: 700, cursor: "pointer", color: answers[i] === opt ? "var(--blue)" : "var(--text)" }}>
                    {opt}
                  </button>
                ))}
              </div>
            ))}
          </div>
          <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }} onClick={handleSubmit} disabled={!allDone}>Submit All</button>
        </div>
      )}
    </div>
  );
}

// - Activity 7: Prime Factorization -
const PF_NUMS = [12, 15, 18, 20, 24, 28, 30, 36, 40, 42, 45, 48, 50, 54, 60, 63, 72, 75, 84, 90, 96, 100];

function PFMastery({ onCorrect, onWrong }) {
  const [n, setN] = useState(() => randChoice(PF_NUMS));
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState(null);
  const ref = useRef(null);

  const correct = formatPF(n);
  const factors = primeFactors(n);

  // Build factor tree hint
  const buildTreeHint = (n) => {
    const steps = [];
    let cur = n;
    let d = 2;
    while (cur > 1) {
      while (cur % d === 0) { steps.push(`${cur} = ${d} x ${cur / d}`); cur /= d; }
      d++;
    }
    return steps.join(" -> ");
  };

  const handleSubmit = () => {
    const parsed = parsePF(input);
    const isCorrect = pfsEqual(parsed, factors);
    setFeedback({ correct: isCorrect, input: input.trim() });
    if (isCorrect) onCorrect(); else onWrong();
  };

  const handleNext = () => {
    setFeedback(null); setInput(""); setN(randChoice(PF_NUMS));
    setTimeout(() => ref.current?.focus(), 80);
  };

  return (
    <div>
      <KaTeX expr={String(n)} />
      <div style={{ fontSize: 20, color: "var(--text3)", marginBottom: 14, textAlign: "center" }}>
        Enter prime factorization. Use ^ for exponents, x or * for multiplication.
      </div>
      {feedback ? (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: feedback.correct ? "var(--green)" : "var(--red)", marginBottom: 8 }}>{feedback.correct ? "Correct!" : "Incorrect"}</div>
          {!feedback.correct && (
            <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "var(--radius-sm)", padding: "10px 14px", marginBottom: 10, textAlign: "left", fontSize: 19 }}>
              <div style={{ color: "var(--red)", fontWeight: 700, marginBottom: 4 }}>Your answer: <span style={{ fontFamily: "var(--mono)" }}>{feedback.input}</span></div>
              <div style={{ color: "var(--green)", fontWeight: 700 }}>Correct: <span style={{ fontFamily: "var(--mono)" }}>{correct}</span></div>
              <div style={{ color: "var(--text3)", marginTop: 4 }}>Factor tree: {buildTreeHint(n)}</div>
            </div>
          )}
          {feedback.correct && <div style={{ fontSize: 19, color: "var(--green)", fontWeight: 700, marginBottom: 8 }}>Answer: {correct}</div>}
          <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }} onClick={handleNext}>Next Problem</button>
        </div>
      ) : (
        <div>
          <div style={{ fontSize: 19, color: "var(--text3)", marginBottom: 6, textAlign: "center" }}>e.g. 2^2 * 3 or 2^2 x 3</div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <input ref={ref} value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && input.trim() && handleSubmit()}
              placeholder="e.g. 2^2 * 3" autoFocus
              style={{ textAlign: "center", fontSize: 22, fontFamily: "var(--mono)", fontWeight: 700, padding: "10px", width: 220 }} />
            <button className="btn btn-primary" style={{ fontSize: 20, padding: "10px 20px" }}
              onClick={handleSubmit} disabled={!input.trim()}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
}

// - Activity 2: All Divisibility Rules (2,3,4,5,6,9,10) -
const ALL_RULES_7 = [2, 3, 4, 5, 6, 9, 10];

function genAllRulesSet() {
  const nums = [];
  while (nums.length < 5) {
    const n = randInt(100, 9999);
    if (!nums.includes(n)) nums.push(n);
  }
  return nums;
}

function AllRulesMastery({ onCorrect, onWrong }) {
  const [nums, setNums] = useState(() => genAllRulesSet());
  const [answers, setAnswers] = useState(() => Array(5).fill([]));
  const [feedback, setFeedback] = useState(null);

  const toggle = (i, d) => {
    setAnswers(prev => prev.map((a, j) => j !== i ? a : a.includes(d) ? a.filter(x => x !== d) : [...a, d]));
  };

  const handleSubmit = () => {
    const results = nums.map((n, i) => {
      const correct = ALL_RULES_7.filter(d => divBy(n, d));
      const given = answers[i];
      return correct.length === given.length && correct.every(v => given.includes(v));
    });
    const allCorrect = results.every(Boolean);
    setFeedback({ correct: allCorrect, results, nums: [...nums], answers: answers.map(a => [...a]) });
    if (allCorrect) onCorrect(); else onWrong();
  };

  const handleNext = () => {
    setFeedback(null);
    setNums(genAllRulesSet());
    setAnswers(Array(5).fill([]));
  };

  if (feedback) return (
    <div>
      <div style={{ textAlign: "center", fontSize: 22, fontWeight: 800, color: feedback.correct ? "var(--green)" : "var(--red)", marginBottom: 10 }}>
        {feedback.correct ? "Correct!" : "Incorrect"}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
        {feedback.nums.map((n, i) => {
          const correct = ALL_RULES_7.filter(d => divBy(n, d));
          const given = feedback.answers[i];
          const ok = feedback.results[i];
          return (
            <div key={i} style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "8px 12px", border: "1px solid " + (ok ? "rgba(22,163,74,0.2)" : "rgba(239,68,68,0.2)") }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: 22, fontWeight: 800 }}>{n}</span>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {!ok && <span style={{ fontSize: 18, color: "var(--red)", fontWeight: 700 }}>You: {given.length > 0 ? given.join(", ") : "none"}</span>}
                  <span style={{ fontSize: 18, color: "var(--green)", fontWeight: 700 }}>Correct: {correct.length > 0 ? correct.join(", ") : "none"}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }} onClick={handleNext}>Next Problem</button>
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
        {nums.map((n, i) => (
          <div key={i} style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "8px 12px" }}>
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "var(--mono)", marginBottom: 6 }}>{n}</div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {ALL_RULES_7.map(d => {
                const sel = answers[i].includes(d);
                return (
                  <button key={d} onClick={() => toggle(i, d)}
                    style={{ padding: "4px 12px", borderRadius: "var(--radius-sm)", border: "2px solid " + (sel ? "var(--blue)" : "var(--border)"), background: sel ? "rgba(27,143,255,0.15)" : "var(--surface)", fontSize: 20, fontWeight: 700, cursor: "pointer", color: sel ? "var(--blue)" : "var(--text)" }}>
                    {d}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 19, color: "var(--text3)", marginBottom: 8, textAlign: "center" }}>Select all that apply. Leave blank if none.</div>
      <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }} onClick={handleSubmit}>Submit All</button>
    </div>
  );
}

// - Steps -
const STEPS = [
  { id: "all-rules",      label: "Divisibility Rules (2-10)",  description: "5 numbers, select all rules that apply, 3 in a row", streak: STREAK3 },
  { id: "mixed-div",      label: "Mixed Divisibility Review",  description: "6 numbers, all 7 rules, 3 in a row",                  streak: STREAK3 },
  { id: "prime-composite",label: "Prime or Composite?",        description: "10 numbers 2-30, 3 in a row",                         streak: STREAK3 },
  { id: "prime-factor",   label: "Prime Factorization",        description: "Enter factorization, 3 in a row",                     streak: STREAK3 },
];

export default function Lesson12MasteryPlayer({ user, topic, onHome }) {
  const topicId = topic?.id || LESSON12_MASTERY_TOPIC_ID;
  const [loading, setLoading] = useState(true);
  const [stepIdx, setStepIdx] = useState(0);
  const [streak, setStreak] = useState(0);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const load = async () => {
      const prog = await getProgress(user.id, topicId);
      if (prog?.data?.completed) { setCompleted(true); setLoading(false); return; }
      if (prog?.data?.stepIdx !== undefined) setStepIdx(prog.data.stepIdx);
      if (prog?.data?.streak !== undefined) setStreak(prog.data.streak);
      setLoading(false);
    };
    load();
  }, []);

  const save = async (si, st, done) => {
    const pct = done ? 100 : Math.min(100, Math.round((si / STEPS.length) * 100));
    await fbSaveProgress(user.id, topicId, {
      started: true, completed: done, percentComplete: pct,
      data: { stepIdx: si, streak: st, completed: done },
    });
    setStepIdx(si); setStreak(st);
    if (done) setCompleted(true);
  };

  const handleCorrect = async () => {
    const step = STEPS[stepIdx];
    if (!step.streak) return; // perfect squares handled separately
    const newStreak = streak + 1;
    if (newStreak >= step.streak) {
      const next = stepIdx + 1;
      await save(next, 0, next >= STEPS.length);
    } else {
      await save(stepIdx, newStreak, false);
    }
  };

  const handleWrong = async () => { await save(stepIdx, 0, false); };


  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><div className="spinner" /></div>;

  if (completed) return (
    <div style={{ maxWidth: 520, margin: "0 auto", textAlign: "center" }}>
      <div className="card">
        <div style={{ fontSize: 48, fontWeight: 900, color: "var(--amber)", marginBottom: 16 }}>100%</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>HW 12 (019) Complete!</h2>
        <p style={{ fontSize: 20, color: "var(--text2)", marginBottom: 24 }}>Divisibility and prime factorization mastered!</p>
        <button className="btn btn-primary btn-lg" style={{ width: "100%" }} onClick={onHome}>Back to Home</button>
      </div>
    </div>
  );

  const step = STEPS[stepIdx];
  if (!step) return null;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "clamp(16px,3vw,32px)" }} className="dot-bg">
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,var(--blue),var(--orange))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "#fff" }}>L12</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 22 }}>HW 12 (019): Mastery Activities</div>
              <div style={{ fontSize: 20, color: "var(--text3)" }}>Complete each activity to advance</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onHome}>Back to Home</button>
        </div>

        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 16 }}>
          {STEPS.map((s, i) => {
            const done = i < stepIdx, active = i === stepIdx;
            return (
              <div key={s.id} style={{ fontSize: 18, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: done ? "rgba(22,163,74,0.12)" : active ? "rgba(27,143,255,0.12)" : "var(--surface)", color: done ? "var(--green)" : active ? "var(--blue)" : "var(--text3)", border: "1px solid " + (done ? "rgba(22,163,74,0.3)" : active ? "rgba(27,143,255,0.3)" : "var(--border)") }}>
                {done ? "done" : s.label}
              </div>
            );
          })}
        </div>

        <div className="card">
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{step.label}</div>
            <div style={{ fontSize: 20, color: "var(--text2)" }}>{step.description}</div>
          </div>
          {step.streak && <StreakDots current={streak} needed={step.streak} />}

          {step.id === "all-rules" && <AllRulesMastery key={stepIdx + "-" + streak} onCorrect={handleCorrect} onWrong={handleWrong} />}
          {step.id === "mixed-div" && <MixedDivMastery key={stepIdx + "-" + streak} onCorrect={handleCorrect} onWrong={handleWrong} />}
          {step.id === "prime-composite" && <PrimeMastery key={stepIdx + "-" + streak} onCorrect={handleCorrect} onWrong={handleWrong} />}
          {step.id === "prime-factor" && <PFMastery key={stepIdx + "-" + streak} onCorrect={handleCorrect} onWrong={handleWrong} />}
        </div>
      </div>
    </div>
  );
}

// -- Standalone Perfect Squares Player (separate registry entry) --
export function PerfectSquares12Player({ user, topic, onHome }) {
  const topicId = topic?.id || PERFECT_SQUARES_12_TOPIC_ID;
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    getProgress(user.id, topicId).then(prog => {
      if (prog?.data?.completed) setCompleted(true);
      setLoading(false);
    });
  }, []);

  const handleComplete = async () => {
    await fbSaveProgress(user.id, topicId, {
      started: true, completed: true, percentComplete: 100,
      data: { completed: true },
    });
    setCompleted(true);
  };

  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><div className="spinner" /></div>;

  if (completed) return (
    <div style={{ maxWidth: 520, margin: "0 auto", textAlign: "center" }}>
      <div className="card">
        <div style={{ fontSize: 48, fontWeight: 900, color: "var(--amber)", marginBottom: 16 }}>100%</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Perfect Squares 11-15 Complete!</h2>
        <button className="btn btn-primary btn-lg" style={{ width: "100%" }} onClick={onHome}>Back to Home</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "clamp(16px,3vw,32px)" }} className="dot-bg">
      <div style={{ maxWidth: 580, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,var(--blue),var(--orange))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "#fff" }}>12</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 22 }}>Perfect Squares 11-15</div>
              <div style={{ fontSize: 20, color: "var(--text3)" }}>Memorize then drill with 5-second timer</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onHome}>Back</button>
        </div>
        <div className="card">
          <PerfectSquaresPlayer user={user} onComplete={handleComplete} />
        </div>
      </div>
    </div>
  );
}


