import { useState, useEffect, useRef } from "react";
import { saveProgress as fbSaveProgress, getProgress } from "./core/firebase";

export const LESSON13_MASTERY_TOPIC_ID = "lesson13-mastery-v1";
export const PERFECT_SQUARES_13_TOPIC_ID = "perfect-squares-13-v1";

const STREAK2 = 2;
const STREAK3 = 3;
const SQUARE_TIMER = 15;

// -- Math helpers --
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randChoice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function shuffle(arr) { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

function getFactors(n) { const f = []; for (let i = 1; i <= n; i++) if (n % i === 0) f.push(i); return f; }
function gcf(a, b) { return b === 0 ? a : gcf(b, a % b); }
function lcm(a, b) { return (a * b) / gcf(a, b); }
function primeFactors(n) { const f = {}; let d = 2; while (n > 1) { while (n % d === 0) { f[d] = (f[d] || 0) + 1; n /= d; } d++; } return f; }
function formatPF(n) {
  const f = primeFactors(n);
  return Object.entries(f).sort(([a], [b]) => a - b).map(([p, e]) => e === 1 ? p : `${p}^${e}`).join(" x ");
}

// -- Shared UI --
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

function FeedbackBanner({ correct, message, onNext }) {
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
      <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }} onClick={onNext}>Next Problem</button>
    </div>
  );
}

// - Perfect Squares 16-20 -
const SQUARES_16_20 = [
  { base: 16, sq: 256 }, { base: 17, sq: 289 }, { base: 18, sq: 324 },
  { base: 19, sq: 361 }, { base: 20, sq: 400 },
];
// Review includes 11-15 as well
const SQUARES_11_15 = [
  { base: 11, sq: 121 }, { base: 12, sq: 144 }, { base: 13, sq: 169 },
  { base: 14, sq: 196 }, { base: 15, sq: 225 },
];
const ALL_SQUARES_11_20 = [...SQUARES_11_15, ...SQUARES_16_20];

function PerfectSquaresPlayer16to20({ onComplete }) {
  const [phase, setPhase] = useState(1); // 1=memorize, 2=drill, 3=review
  if (phase === 1) return <SquaresPhase1 squares={SQUARES_16_20} onDone={() => setPhase(2)} />;
  if (phase === 2) return <SquaresPhase2 squares={SQUARES_16_20} onAllMastered={() => setPhase(3)} />;
  return <SquaresReview squares={ALL_SQUARES_11_20} onComplete={onComplete} />;
}

function SquaresPhase1({ squares, onDone }) {
  const [idx, setIdx] = useState(0);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const square = squares[idx];

  if (!started) return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 20, color: "var(--text2)", marginBottom: 16 }}>Memorize the perfect squares 16-20 in order.</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
        {squares.map(s => (
          <div key={s.base} style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "10px 16px", fontSize: 24, fontWeight: 800, fontFamily: "var(--mono)", textAlign: "center" }}>
            {s.base}- = {s.sq}
          </div>
        ))}
      </div>
      <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }} onClick={() => setStarted(true)}>Start Reciting</button>
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
      <div style={{ fontSize: 20, color: "var(--text2)", marginBottom: 8 }}>Square {idx + 1} of {squares.length}</div>
      <div style={{ fontSize: 36, fontWeight: 900, fontFamily: "var(--mono)", marginBottom: 20 }}>{square.base}- = {square.sq}</div>
      <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }}
        onClick={() => { if (idx + 1 < squares.length) setIdx(i => i + 1); else setDone(true); }}>
        {idx + 1 < squares.length ? "Next" : "Done"}
      </button>
    </div>
  );
}

function SquaresPhase2({ squares, onAllMastered }) {
  const [masteredMap, setMasteredMap] = useState({});
  const [correct, setCorrect] = useState({});
  const [wrong, setWrong] = useState({});
  const [current, setCurrent] = useState(() => randChoice(squares));
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [timeLeft, setTimeLeft] = useState(SQUARE_TIMER);
  const timerRef = useRef(null);
  const inputRef = useRef(null);

  const startTimer = () => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); handleTimeout(); return 0; }
        return t - 1;
      });
    }, 1000);
  };

  useEffect(() => { startTimer(); return () => clearInterval(timerRef.current); }, [current]);

  const handleTimeout = () => {
    clearInterval(timerRef.current);
    setWrong(prev => ({ ...prev, [current.base]: (prev[current.base] || 0) + 1 }));
    setFeedback({ correct: false, mastered: false, base: current.base, timeout: true });
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

  const nextQuestion = () => {
    let newMastered = masteredMap;
    if (feedback?.mastered) {
      newMastered = { ...masteredMap, [feedback.base]: true };
      setMasteredMap(newMastered);
    }
    const rem = squares.filter(s => !newMastered[s.base]);
    if (rem.length === 0) { onAllMastered(); return; }
    setCurrent(randChoice(rem));
    setInput(""); setFeedback(null); setTimeLeft(SQUARE_TIMER);
    setTimeout(() => inputRef.current?.focus(), 80);
  };

  const pct = (timeLeft / SQUARE_TIMER) * 100;
  const color = timeLeft <= 4 ? "var(--red)" : timeLeft <= 7 ? "var(--amber)" : "var(--green)";

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
      <div style={{ fontSize: 19, color: "var(--text3)", marginBottom: 6, textAlign: "center" }}>
        Mastered: {Object.keys(masteredMap).length}/{squares.length}
      </div>
      <div style={{ textAlign: "center", fontSize: 36, fontWeight: 900, fontFamily: "var(--mono)", marginBottom: 16 }}>{current.base}- = ?</div>
      {feedback ? (
        <FeedbackBanner correct={feedback.correct}
          message={`${current.base}- = ${current.sq}`}
          onNext={nextQuestion} />
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

function SquaresReview({ squares, onComplete }) {
  const [queue, setQueue] = useState(() => shuffle([...squares]));
  const [current, setCurrent] = useState(() => shuffle([...squares])[0]);
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [wrong, setWrong] = useState({});
  const inputRef = useRef(null);

  useEffect(() => {
    const q = shuffle([...squares]);
    setQueue(q); setCurrent(q[0]);
  }, []);

  const handleSubmit = () => {
    const isCorrect = parseInt(input) === current.sq;
    if (!isCorrect) setWrong(prev => ({ ...prev, [current.base]: (prev[current.base] || 0) + 1 }));
    setFeedback({ correct: isCorrect });
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
      <div style={{ fontSize: 20, color: "var(--text2)", marginBottom: 8, textAlign: "center" }}>
        Cumulative Review (11--20-) - {queue.length} remaining
      </div>
      <div style={{ textAlign: "center", fontSize: 36, fontWeight: 900, fontFamily: "var(--mono)", marginBottom: 16 }}>{current.base}- = ?</div>
      {feedback ? (
        <FeedbackBanner correct={feedback.correct}
          message={`${current.base}- = ${current.sq}`}
          onNext={handleNext} />
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

// - Activity 2: Factors Mastery -
function genFactorsQuestion() {
  const n = randInt(12, 60);
  const correct = getFactors(n);
  const toLabel = arr => "{" + arr.join(", ") + "}";
  const wrongs = [];
  let attempts = 0;
  while (wrongs.length < 3 && attempts < 200) {
    attempts++;
    let wrong = [...correct];
    const op = randChoice(["remove", "add", "swap"]);
    if (op === "remove" && wrong.length > 2) wrong.splice(randInt(1, wrong.length - 2), 1);
    else if (op === "add") { let e; do { e = randInt(2, n - 1); } while (wrong.includes(e)); wrong = [...wrong, e].sort((a, b) => a - b); }
    else { const idx = randInt(1, wrong.length - 2); let r; do { r = randInt(2, n - 1); } while (wrong.includes(r)); wrong[idx] = r; wrong.sort((a, b) => a - b); }
    const ws = JSON.stringify(wrong);
    if (ws !== JSON.stringify(correct) && !wrongs.find(w => JSON.stringify(w) === ws)) wrongs.push(wrong);
  }
  const options = shuffle([correct, ...wrongs.slice(0, 3)]);
  const correctIdx = options.findIndex(o => JSON.stringify(o) === JSON.stringify(correct));
  return { n, options, optionLabels: options.map(toLabel), correctIdx, correctLabel: toLabel(correct) };
}

function FactorsMastery({ onCorrect, onWrong }) {
  const [q, setQ] = useState(() => genFactorsQuestion());
  const [sel, setSel] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const handleSelect = (i) => {
    if (feedback) return;
    setSel(i);
    const isCorrect = i === q.correctIdx;
    setFeedback({ correct: isCorrect });
    if (isCorrect) onCorrect(); else onWrong();
  };

  const handleNext = () => { setSel(null); setFeedback(null); setQ(genFactorsQuestion()); };

  return (
    <div>
      <div style={{ textAlign: "center", fontSize: 32, fontWeight: 900, fontFamily: "var(--mono)", marginBottom: 14 }}>{q.n}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: feedback ? 12 : 0 }}>
        {q.optionLabels.map((label, i) => (
          <button key={i} onClick={() => handleSelect(i)} disabled={!!feedback}
            style={{ padding: "10px 14px", borderRadius: "var(--radius-sm)", border: "2px solid " + (feedback && i === q.correctIdx ? "var(--green)" : sel === i ? "var(--blue)" : "var(--border)"), background: feedback && i === q.correctIdx ? "rgba(22,163,74,0.1)" : sel === i ? "rgba(27,143,255,0.12)" : "var(--surface)", fontSize: 20, fontFamily: "var(--mono)", fontWeight: 700, cursor: feedback ? "default" : "pointer", textAlign: "left" }}>
            {String.fromCharCode(65 + i)}) {label}
          </button>
        ))}
      </div>
      {feedback && (
        <div style={{ textAlign: "center", marginTop: 12 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: feedback.correct ? "var(--green)" : "var(--red)", marginBottom: 10 }}>{feedback.correct ? "Correct!" : "Incorrect"}</div>
          {!feedback.correct && <div style={{ fontSize: 20, color: "var(--text2)", marginBottom: 12 }}>Correct answer: <strong style={{ fontFamily: "var(--mono)" }}>{q.correctLabel}</strong></div>}
          <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }} onClick={handleNext}>Next Problem</button>
        </div>
      )}
    </div>
  );
}

// - Activity 3: Multiples Mastery -
function genMultiplesQuestion() {
  const n = randInt(2, 12);
  const multiples = [n, n*2, n*3, n*4, n*5];
  return { n, multiples, answer: multiples.join(", ") };
}

function MultiplesMastery({ onCorrect, onWrong }) {
  const [q, setQ] = useState(() => genMultiplesQuestion());
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState(null);
  const ref = useRef(null);

  const handleSubmit = () => {
    const given = input.replace(/\s/g, "").split(",").map(Number);
    const isCorrect = given.length === 5 && given.every((v, i) => v === q.multiples[i]);
    setFeedback({ correct: isCorrect });
    if (isCorrect) onCorrect(); else onWrong();
  };

  const handleNext = () => {
    setFeedback(null); setInput(""); setQ(genMultiplesQuestion());
    setTimeout(() => ref.current?.focus(), 80);
  };

  return (
    <div>
      <div style={{ textAlign: "center", fontSize: 28, fontWeight: 900, fontFamily: "var(--mono)", marginBottom: 8 }}>First 5 multiples of {q.n}</div>
      {feedback ? (
        <FeedbackBanner correct={feedback.correct}
          message={feedback.correct ? `Answer: ${q.answer}` : `Correct: ${q.answer}`}
          onNext={handleNext} />
      ) : (
        <div>
          <div style={{ fontSize: 19, color: "var(--text3)", marginBottom: 8, textAlign: "center" }}>Separate by commas (e.g. 7, 14, 21, 28, 35)</div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <input ref={ref} value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && input.trim() && handleSubmit()}
              placeholder={`e.g. ${q.n}, ${q.n*2}, ${q.n*3}...`} autoFocus
              style={{ textAlign: "center", fontSize: 22, fontFamily: "var(--mono)", fontWeight: 700, padding: "10px", width: 260 }} />
            <button className="btn btn-primary" style={{ fontSize: 20, padding: "10px 20px" }}
              onClick={handleSubmit} disabled={!input.trim()}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
}

// - Activity 4: GCF Mastery -
function genGCFQuestion() {
  for (let i = 0; i < 200; i++) {
    const a = randInt(12, 99), b = randInt(12, 99);
    if (a === b) continue;
    const g = gcf(a, b);
    if (g < 2) continue;
    const pf_a = formatPF(a), pf_b = formatPF(b);
    const fa = primeFactors(a), fb = primeFactors(b);
    const common = [...new Set([...Object.keys(fa), ...Object.keys(fb)].map(Number))]
      .filter(p => fa[p] && fb[p])
      .sort((x, y) => x - y)
      .map(p => `${p}^${Math.min(fa[p], fb[p])}`);
    return { a, b, g, pf_a, pf_b, common };
  }
  return { a: 18, b: 24, g: 6, pf_a: "2 x 3^2", pf_b: "2^3 x 3", common: ["2^1", "3^1"] };
}

function GCFMastery({ onCorrect, onWrong }) {
  const [q, setQ] = useState(() => genGCFQuestion());
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState(null);
  const ref = useRef(null);

  const handleSubmit = () => {
    const isCorrect = parseInt(input.trim()) === q.g;
    setFeedback({ correct: isCorrect, input: input.trim() });
    if (isCorrect) onCorrect(); else onWrong();
  };

  const handleNext = () => {
    setFeedback(null); setInput(""); setQ(genGCFQuestion());
    setTimeout(() => ref.current?.focus(), 80);
  };

  return (
    <div>
      <div style={{ textAlign: "center", fontSize: 28, fontWeight: 900, fontFamily: "var(--mono)", marginBottom: 14 }}>GCF of {q.a} and {q.b}</div>
      {feedback ? (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: feedback.correct ? "var(--green)" : "var(--red)", marginBottom: 10 }}>{feedback.correct ? "Correct!" : "Incorrect"}</div>
          {!feedback.correct && (
            <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "var(--radius-sm)", padding: "12px 16px", marginBottom: 12, textAlign: "left", fontSize: 19 }}>
              <div style={{ marginBottom: 4 }}>Your answer: <strong style={{ fontFamily: "var(--mono)", color: "var(--red)" }}>{feedback.input}</strong></div>
              <div style={{ marginBottom: 4 }}>{q.a} = <strong style={{ fontFamily: "var(--mono)" }}>{q.pf_a}</strong></div>
              <div style={{ marginBottom: 4 }}>{q.b} = <strong style={{ fontFamily: "var(--mono)" }}>{q.pf_b}</strong></div>
              <div style={{ marginBottom: 4 }}>Common prime factors: <strong style={{ fontFamily: "var(--mono)" }}>{q.common.join(", ")}</strong></div>
              <div style={{ color: "var(--green)", fontWeight: 700 }}>GCF = {q.g}</div>
            </div>
          )}
          {feedback.correct && <div style={{ fontSize: 20, color: "var(--green)", fontWeight: 700, marginBottom: 12 }}>GCF = {q.g}</div>}
          <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }} onClick={handleNext}>Next Problem</button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <input ref={ref} value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && input.trim() && handleSubmit()}
            placeholder="Enter GCF" autoFocus
            style={{ textAlign: "center", fontSize: 24, fontFamily: "var(--mono)", fontWeight: 800, padding: "10px", width: 160 }} />
          <button className="btn btn-primary" style={{ fontSize: 20, padding: "10px 20px" }}
            onClick={handleSubmit} disabled={!input.trim()}>OK</button>
        </div>
      )}
    </div>
  );
}

// - Activity 5: LCM Mastery -
function genLCMQuestion() {
  for (let i = 0; i < 200; i++) {
    const a = randInt(6, 50), b = randInt(6, 50);
    if (a === b) continue;
    const l = lcm(a, b);
    if (l > 200 || l < 10) continue;
    if (l === a || l === b) continue;
    const pf_a = formatPF(a), pf_b = formatPF(b);
    const fa = primeFactors(a), fb = primeFactors(b);
    const allPrimes = [...new Set([...Object.keys(fa), ...Object.keys(fb)].map(Number))].sort((x, y) => x - y);
    const highest = allPrimes.map(p => `${p}^${Math.max(fa[p] || 0, fb[p] || 0)}`);
    return { a, b, l, pf_a, pf_b, highest };
  }
  return { a: 6, b: 8, l: 24, pf_a: "2 x 3", pf_b: "2^3", highest: ["2^3", "3^1"] };
}

function LCMMastery({ onCorrect, onWrong }) {
  const [q, setQ] = useState(() => genLCMQuestion());
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState(null);
  const ref = useRef(null);

  const handleSubmit = () => {
    const isCorrect = parseInt(input.trim()) === q.l;
    setFeedback({ correct: isCorrect, input: input.trim() });
    if (isCorrect) onCorrect(); else onWrong();
  };

  const handleNext = () => {
    setFeedback(null); setInput(""); setQ(genLCMQuestion());
    setTimeout(() => ref.current?.focus(), 80);
  };

  return (
    <div>
      <div style={{ textAlign: "center", fontSize: 28, fontWeight: 900, fontFamily: "var(--mono)", marginBottom: 14 }}>LCM of {q.a} and {q.b}</div>
      {feedback ? (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: feedback.correct ? "var(--green)" : "var(--red)", marginBottom: 10 }}>{feedback.correct ? "Correct!" : "Incorrect"}</div>
          {!feedback.correct && (
            <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "var(--radius-sm)", padding: "12px 16px", marginBottom: 12, textAlign: "left", fontSize: 19 }}>
              <div style={{ marginBottom: 4 }}>Your answer: <strong style={{ fontFamily: "var(--mono)", color: "var(--red)" }}>{feedback.input}</strong></div>
              <div style={{ marginBottom: 4 }}>{q.a} = <strong style={{ fontFamily: "var(--mono)" }}>{q.pf_a}</strong></div>
              <div style={{ marginBottom: 4 }}>{q.b} = <strong style={{ fontFamily: "var(--mono)" }}>{q.pf_b}</strong></div>
              <div style={{ marginBottom: 4 }}>Highest exponents: <strong style={{ fontFamily: "var(--mono)" }}>{q.highest.join(", ")}</strong></div>
              <div style={{ color: "var(--green)", fontWeight: 700 }}>LCM = {q.l}</div>
            </div>
          )}
          {feedback.correct && <div style={{ fontSize: 20, color: "var(--green)", fontWeight: 700, marginBottom: 12 }}>LCM = {q.l}</div>}
          <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }} onClick={handleNext}>Next Problem</button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <input ref={ref} value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && input.trim() && handleSubmit()}
            placeholder="Enter LCM" autoFocus
            style={{ textAlign: "center", fontSize: 24, fontFamily: "var(--mono)", fontWeight: 800, padding: "10px", width: 160 }} />
          <button className="btn btn-primary" style={{ fontSize: 20, padding: "10px 20px" }}
            onClick={handleSubmit} disabled={!input.trim()}>OK</button>
        </div>
      )}
    </div>
  );
}

// - Activity 6: Mixed GCF/LCM Word Problems -
const WORD_PROBLEMS = [
  { text: "You have 24 red balloons and 36 blue balloons. You want to make identical bouquets with no leftovers. What is the greatest number of bouquets?", useGCF: true, a: 24, b: 36, answer: 6, hint: "GCF(24, 36) = 6" },
  { text: "Buses leave every 8 minutes and trains every 12 minutes. They just left together. In how many minutes will they next leave at the same time?", useGCF: false, a: 8, b: 12, answer: 24, hint: "LCM(8, 12) = 24" },
  { text: "You have 18 apples and 24 oranges. You want identical fruit baskets using all the fruit. What is the greatest number of baskets?", useGCF: true, a: 18, b: 24, answer: 6, hint: "GCF(18, 24) = 6" },
  { text: "A flute plays every 6 beats and a drum every 9 beats. They play together on beat 1. What is the next beat they play together?", useGCF: false, a: 6, b: 9, answer: 18, hint: "LCM(6, 9) = 18" },
  { text: "Tiles are 15 cm and 20 cm wide. What is the shortest wall length that can be tiled exactly with either size?", useGCF: false, a: 15, b: 20, answer: 60, hint: "LCM(15, 20) = 60" },
  { text: "Two classes of 30 and 42 students will be split into equal groups with no students left over. What is the largest possible group size?", useGCF: true, a: 30, b: 42, answer: 6, hint: "GCF(30, 42) = 6" },
  { text: "You bake cookies every 4 days and muffins every 6 days. You baked both today. In how many days will you bake both again?", useGCF: false, a: 4, b: 6, answer: 12, hint: "LCM(4, 6) = 12" },
  { text: "You have 16 pencils and 20 markers. You want to make identical supply kits using all items. What is the greatest number of kits?", useGCF: true, a: 16, b: 20, answer: 4, hint: "GCF(16, 20) = 4" },
];

function genWordProblemSet() {
  const gcfProbs = shuffle(WORD_PROBLEMS.filter(p => p.useGCF));
  const lcmProbs = shuffle(WORD_PROBLEMS.filter(p => !p.useGCF));
  return shuffle([gcfProbs[0], gcfProbs[1], lcmProbs[0], lcmProbs[1]]);
}

function WordProblemsMastery({ onCorrect, onWrong }) {
  const [problems, setProblems] = useState(() => genWordProblemSet());
  const [idx, setIdx] = useState(0);
  const [method, setMethod] = useState("");
  const [value, setValue] = useState("");
  const [feedback, setFeedback] = useState(null);

  const q = problems[idx];
  const canSubmit = method !== "" && value.trim() !== "";

  const handleSubmit = () => {
    const methodOk = (method === "gcf") === q.useGCF;
    const valueOk = parseInt(value.trim()) === q.answer;
    const isCorrect = methodOk && valueOk;
    setFeedback({ correct: isCorrect, method, value: value.trim(), methodOk, valueOk });
    if (isCorrect) onCorrect(); else onWrong();
  };

  const handleNext = () => {
    setFeedback(null); setMethod(""); setValue("");
    if (idx + 1 < problems.length) { setIdx(i => i + 1); }
    else { setProblems(genWordProblemSet()); setIdx(0); }
  };

  return (
    <div>
      <div style={{ fontSize: 19, color: "var(--text3)", marginBottom: 8 }}>Problem {idx + 1} of {problems.length}</div>
      <div style={{ fontSize: 20, lineHeight: 1.6, marginBottom: 16, background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "12px 16px" }}>{q.text}</div>
      {feedback ? (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: feedback.correct ? "var(--green)" : "var(--red)", marginBottom: 10 }}>{feedback.correct ? "Correct!" : "Incorrect"}</div>
          {!feedback.correct && (
            <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "var(--radius-sm)", padding: "12px 16px", marginBottom: 12, textAlign: "left", fontSize: 19 }}>
              {!feedback.methodOk && <div style={{ marginBottom: 4 }}>Method: should be <strong>{q.useGCF ? "GCF" : "LCM"}</strong>, you chose <strong style={{ color: "var(--red)" }}>{feedback.method.toUpperCase()}</strong></div>}
              {!feedback.valueOk && <div style={{ marginBottom: 4 }}>Answer: you entered <strong style={{ color: "var(--red)" }}>{feedback.value}</strong></div>}
              <div style={{ color: "var(--green)", fontWeight: 700 }}>Correct: {q.useGCF ? "GCF" : "LCM"} = {q.answer} ({q.hint})</div>
            </div>
          )}
          {feedback.correct && <div style={{ fontSize: 20, color: "var(--green)", fontWeight: 700, marginBottom: 12 }}>{q.useGCF ? "GCF" : "LCM"} = {q.answer} ({q.hint})</div>}
          <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }} onClick={handleNext}>
            {idx + 1 < problems.length ? "Next Problem" : "New Set"}
          </button>
        </div>
      ) : (
        <div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 12 }}>
            {["GCF", "LCM"].map(m => (
              <button key={m} onClick={() => setMethod(m.toLowerCase())}
                style={{ padding: "10px 28px", borderRadius: "var(--radius-sm)", border: "2px solid " + (method === m.toLowerCase() ? "var(--blue)" : "var(--border)"), background: method === m.toLowerCase() ? "rgba(27,143,255,0.15)" : "var(--surface)", fontSize: 22, fontWeight: 800, cursor: "pointer", color: method === m.toLowerCase() ? "var(--blue)" : "var(--text)" }}>
                {m}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <input value={value} onChange={e => setValue(e.target.value)}
              onKeyDown={e => e.key === "Enter" && canSubmit && handleSubmit()}
              placeholder="Enter answer"
              style={{ textAlign: "center", fontSize: 22, fontFamily: "var(--mono)", fontWeight: 700, padding: "10px", width: 160 }} />
            <button className="btn btn-primary" style={{ fontSize: 20, padding: "10px 20px" }}
              onClick={handleSubmit} disabled={!canSubmit}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
}

// - Steps -
const STEPS = [
  { id: "factors",      label: "Factors Mastery",           description: "Select complete factor set, 3 in a row",      streak: STREAK3 },
  { id: "multiples",    label: "Multiples Mastery",          description: "Enter first 5 multiples, 3 in a row",         streak: STREAK3 },
  { id: "gcf",          label: "GCF Mastery",               description: "Find GCF of two numbers, 3 in a row",         streak: STREAK3 },
  { id: "lcm",          label: "LCM Mastery",               description: "Find LCM of two numbers, 3 in a row",         streak: STREAK3 },
  { id: "word-problems",label: "GCF/LCM Word Problems",     description: "Select method + answer, 3 in a row",          streak: STREAK3 },
];

export default function Lesson13MasteryPlayer({ user, topic, onHome }) {
  const topicId = topic?.id || LESSON13_MASTERY_TOPIC_ID;
  const [loading, setLoading] = useState(true);
  const [stepIdx, setStepIdx] = useState(0);
  const [streak, setStreak] = useState(0);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    getProgress(user.id, topicId).then(prog => {
      if (prog?.data?.completed) { setCompleted(true); setLoading(false); return; }
      if (prog?.data?.stepIdx !== undefined) setStepIdx(prog.data.stepIdx);
      if (prog?.data?.streak !== undefined) setStreak(prog.data.streak);
      setLoading(false);
    });
  }, []);

  const save = async (si, st, done) => {
    const pct = done ? 100 : Math.min(100, Math.round((si / STEPS.length) * 100));
    await fbSaveProgress(user.id, topicId, { started: true, completed: done, percentComplete: pct, data: { stepIdx: si, streak: st, completed: done } });
    setStepIdx(si); setStreak(st);
    if (done) setCompleted(true);
  };

  const handleCorrect = async () => {
    const needed = STEPS[stepIdx]?.streak || STREAK3;
    const newStreak = streak + 1;
    if (newStreak >= needed) { const next = stepIdx + 1; await save(next, 0, next >= STEPS.length); }
    else await save(stepIdx, newStreak, false);
  };

  const handleWrong = async () => { await save(stepIdx, 0, false); };

  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><div className="spinner" /></div>;

  if (completed) return (
    <div style={{ maxWidth: 520, margin: "0 auto", textAlign: "center" }}>
      <div className="card">
        <div style={{ fontSize: 48, fontWeight: 900, color: "var(--amber)", marginBottom: 16 }}>100%</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>HW 13 (019) Complete!</h2>
        <p style={{ fontSize: 20, color: "var(--text2)", marginBottom: 24 }}>Factors, multiples, GCF and LCM mastered!</p>
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
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,var(--blue),var(--orange))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "#fff" }}>L13</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 22 }}>HW 13 (019): Mastery Activities</div>
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
          <StreakDots current={streak} needed={step.streak} />
          {step.id === "factors"       && <FactorsMastery key={stepIdx + "-" + streak} onCorrect={handleCorrect} onWrong={handleWrong} />}
          {step.id === "multiples"     && <MultiplesMastery key={stepIdx + "-" + streak} onCorrect={handleCorrect} onWrong={handleWrong} />}
          {step.id === "gcf"           && <GCFMastery key={stepIdx + "-" + streak} onCorrect={handleCorrect} onWrong={handleWrong} />}
          {step.id === "lcm"           && <LCMMastery key={stepIdx + "-" + streak} onCorrect={handleCorrect} onWrong={handleWrong} />}
          {step.id === "word-problems" && <WordProblemsMastery key={stepIdx + "-" + streak} onCorrect={handleCorrect} onWrong={handleWrong} />}
        </div>
      </div>
    </div>
  );
}

// - Standalone Perfect Squares 16-20 Player -
export function PerfectSquares13Player({ user, topic, onHome }) {
  const topicId = topic?.id || PERFECT_SQUARES_13_TOPIC_ID;
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    getProgress(user.id, topicId).then(prog => {
      if (prog?.data?.completed) setCompleted(true);
      setLoading(false);
    });
  }, []);

  const handleComplete = async () => {
    await fbSaveProgress(user.id, topicId, { started: true, completed: true, percentComplete: 100, data: { completed: true } });
    setCompleted(true);
  };

  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><div className="spinner" /></div>;

  if (completed) return (
    <div style={{ maxWidth: 520, margin: "0 auto", textAlign: "center" }}>
      <div className="card">
        <div style={{ fontSize: 48, fontWeight: 900, color: "var(--amber)", marginBottom: 16 }}>100%</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Perfect Squares 16-20 Complete!</h2>
        <button className="btn btn-primary btn-lg" style={{ width: "100%" }} onClick={onHome}>Back to Home</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "clamp(16px,3vw,32px)" }} className="dot-bg">
      <div style={{ maxWidth: 580, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,var(--blue),var(--orange))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "#fff" }}>13</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 22 }}>Perfect Squares 16-20</div>
              <div style={{ fontSize: 20, color: "var(--text3)" }}>Memorize then drill, review 11-20</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onHome}>Back</button>
        </div>
        <div className="card">
          <PerfectSquaresPlayer16to20 onComplete={handleComplete} />
        </div>
      </div>
    </div>
  );
}

