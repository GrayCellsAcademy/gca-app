import { useState, useEffect, useRef } from "react";
import { saveProgress as fbSaveProgress, getProgress } from "./core/firebase";

export const LESSON15_MASTERY_TOPIC_ID = "lesson15-mastery-v1";
export const PERFECT_CUBES_2_TOPIC_ID = "perfect-cubes-2-v1";

const STREAK3 = 3;
const CUBE_TIMER = 5;

// -- Math helpers --
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randChoice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function shuffle(arr) { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); return b === 0 ? a : gcd(b, a % b); }
function lcm(a, b) { return Math.abs(a * b) / gcd(a, b); }
function reduce(n, d) { if (n === 0) return [0, 1]; const g = gcd(Math.abs(n), Math.abs(d)); const sign = d < 0 ? -1 : 1; return [sign * n / g, sign * d / g]; }

function fmtAnswer(num, den) {
  const [rn, rd] = reduce(num, den);
  if (rd === 1) return String(rn);
  if (Math.abs(rn) > rd) {
    const sign = rn < 0 ? "-" : "";
    const whole = Math.floor(Math.abs(rn) / rd);
    const rem = Math.abs(rn) % rd;
    return rem === 0 ? `${sign}${whole}` : `${sign}${whole} ${rem}/${rd}`;
  }
  return `${rn}/${rd}`;
}

function answerMatches(input, correctNum, correctDen) {
  const s = String(input || "").trim();
  if (!s) return false;
  try {
    const neg = s.startsWith("-");
    const abs = neg ? s.slice(1).trim() : s;
    let num, den;
    const mx = abs.replace(/\s*-\s*/g, " ").match(/^(\d+)\s+(\d+)\/(\d+)$/);
    if (mx) { num = parseInt(mx[1]) * parseInt(mx[3]) + parseInt(mx[2]); den = parseInt(mx[3]); }
    else { const fx = abs.match(/^(\d+)\/(\d+)$/); if (fx) { num = parseInt(fx[1]); den = parseInt(fx[2]); } else { const ix = abs.match(/^(\d+)$/); if (ix) { num = parseInt(ix[1]); den = 1; } else return false; } }
    if (neg) num = -num;
    const [rn, rd] = reduce(correctNum, correctDen);
    const [in_, id_] = reduce(num, den);
    // Must match AND be in simplified form (gcd of input = 1)
    if (rn !== in_ || rd !== id_) return false;
    if (den !== 1 && gcd(Math.abs(num), den) !== 1) return false; // not simplified
    return true;
  } catch { return false; }
}

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
    s.async = true; document.head.appendChild(s);
  }, []);
}
function KaTeX({ expr }) {
  const ref = useRef(null); useKaTeX();
  useEffect(() => {
    const go = () => { if (window.katex && ref.current) { try { window.katex.render(expr, ref.current, { throwOnError: false, displayMode: false }); } catch {} } else setTimeout(go, 100); };
    go();
  });
  return <span ref={ref} style={{ fontSize: 22 }} />;
}
function fracToKatex(str) {
  if (!str && str !== 0) return "";
  const bs = "\\";
  let s = String(str);
  s = s.replace(/\(-(\d+)\/(\d+)\)/g, (_, n, d) => `${bs}left(-${bs}dfrac{${n}}{${d}}${bs}right)`);
  s = s.replace(/(\d+) (\d+)\/(\d+)/g, (_, w, n, d) => `${w}${bs}dfrac{${n}}{${d}}`);
  s = s.replace(/-(\d+)\/(\d+)/g, (_, n, d) => `-${bs}dfrac{${n}}{${d}}`);
  s = s.replace(/(\d+)\/(\d+)/g, (_, n, d) => `${bs}dfrac{${n}}{${d}}`);
  return s;
}

// -- Shared UI --
function StreakDots({ current, needed }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
      {Array.from({ length: needed }).map((_, i) => (
        <div key={i} style={{ width: 13, height: 13, borderRadius: "50%", background: i < current ? "var(--green)" : "var(--surface2)", border: "2px solid " + (i < current ? "var(--green)" : "var(--border2)") }} />
      ))}
      <span style={{ fontSize: 20, color: "var(--text3)", marginLeft: 6 }}>{current}/{needed}</span>
    </div>
  );
}

function FeedbackBanner({ correct, message, onNext }) {
  return (
    <div style={{ textAlign: "center", marginTop: 12 }}>
      <div style={{ fontSize: 24, fontWeight: 800, color: correct ? "var(--green)" : "var(--red)", marginBottom: 10 }}>{correct ? "Correct!" : "Incorrect"}</div>
      {message && <div style={{ fontSize: 19, color: "var(--text2)", marginBottom: 14, background: correct ? "rgba(22,163,74,0.06)" : "rgba(239,68,68,0.06)", border: "1px solid " + (correct ? "rgba(22,163,74,0.2)" : "rgba(239,68,68,0.2)"), borderRadius: "var(--radius-sm)", padding: "10px 16px", textAlign: "left", fontFamily: "var(--mono)", whiteSpace: "pre-line" }}>{message}</div>}
      <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }} onClick={onNext}>Next Problem</button>
    </div>
  );
}

// Mixed number input with visual mode
function MixedInput({ onSubmit, submitted }) {
  const [mode, setMode] = useState("text");
  const [textVal, setTextVal] = useState("");
  const [whole, setWhole] = useState(""); const [num, setNum] = useState(""); const [den, setDen] = useState("");
  const ref = useRef(null);
  useEffect(() => { setTextVal(""); setWhole(""); setNum(""); setDen(""); setTimeout(() => ref.current?.focus(), 80); }, [submitted]);
  const submitText = () => { if (textVal.trim()) onSubmit(textVal.trim()); };
  const submitVisual = () => { if (whole.trim() && num.trim() && den.trim()) onSubmit(`${whole.trim()} ${num.trim()}/${den.trim()}`); };
  if (mode === "visual") return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center", marginBottom: 8 }}>
        <input value={whole} onChange={e => setWhole(e.target.value)} disabled={submitted} placeholder="whole" autoFocus
          style={{ textAlign: "center", fontSize: 24, fontFamily: "var(--mono)", fontWeight: 800, padding: "8px", width: 70, borderRadius: "var(--radius-sm)", border: "2px solid var(--border)", background: "var(--surface)" }} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <input value={num} onChange={e => setNum(e.target.value)} disabled={submitted} placeholder="num"
            style={{ textAlign: "center", fontSize: 22, fontFamily: "var(--mono)", fontWeight: 800, padding: "4px 8px", width: 60, borderRadius: "var(--radius-sm)", border: "2px solid var(--border)", background: "var(--surface)" }} />
          <div style={{ width: 60, height: 2, background: "var(--text)", borderRadius: 99 }} />
          <input value={den} onChange={e => setDen(e.target.value)} disabled={submitted} placeholder="den"
            style={{ textAlign: "center", fontSize: 22, fontFamily: "var(--mono)", fontWeight: 800, padding: "4px 8px", width: 60, borderRadius: "var(--radius-sm)", border: "2px solid var(--border)", background: "var(--surface)" }} />
        </div>
        <button className="btn btn-primary" style={{ fontSize: 20, padding: "10px 20px" }}
          onClick={submitVisual} disabled={submitted || !whole.trim() || !num.trim() || !den.trim()}>OK</button>
      </div>
      <button className="btn btn-ghost btn-sm" style={{ width: "100%", fontSize: 18 }} onClick={() => setMode("text")}>Type instead</button>
    </div>
  );
  return (
    <div>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 8 }}>
        <input ref={ref} value={textVal} onChange={e => setTextVal(e.target.value)}
          onKeyDown={e => e.key === "Enter" && textVal.trim() && submitText()} disabled={submitted} placeholder="e.g. 2 1/3 or -1/2"
          style={{ textAlign: "center", fontSize: 22, fontFamily: "var(--mono)", fontWeight: 700, padding: "10px", width: 180 }} />
        <button className="btn btn-primary" style={{ fontSize: 20, padding: "10px 20px" }}
          onMouseDown={e => { e.preventDefault(); submitText(); }} disabled={submitted || !textVal.trim()}>OK</button>
      </div>
      <button className="btn btn-ghost btn-sm" style={{ width: "100%", fontSize: 18 }} onClick={() => setMode("visual")}>
        Enter as mixed number &nbsp;<span style={{ fontFamily: "var(--mono)", fontWeight: 900 }}>2 -/-</span>
      </button>
    </div>
  );
}

// Simple text input
function TextInput({ onSubmit, submitted, placeholder }) {
  const [val, setVal] = useState("");
  const ref = useRef(null);
  useEffect(() => { setVal(""); setTimeout(() => ref.current?.focus(), 80); }, [submitted]);
  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
      <input ref={ref} value={val} onChange={e => setVal(e.target.value)}
        onKeyDown={e => e.key === "Enter" && val.trim() && onSubmit(val.trim())} disabled={submitted}
        placeholder={placeholder || ""} autoFocus
        style={{ textAlign: "center", fontSize: 22, fontFamily: "var(--mono)", fontWeight: 700, padding: "10px", width: 160 }} />
      <button className="btn btn-primary" style={{ fontSize: 20, padding: "10px 20px" }}
        onMouseDown={e => { e.preventDefault(); if (val.trim()) onSubmit(val.trim()); }} disabled={submitted || !val.trim()}>OK</button>
    </div>
  );
}

// - Activity 1: Perfect Cubes 6-10 -
const CUBES_6_10 = [{ b: 6, c: 216 }, { b: 7, c: 343 }, { b: 8, c: 512 }, { b: 9, c: 729 }, { b: 10, c: 1000 }];
const CUBES_1_5 = [{ b: 1, c: 1 }, { b: 2, c: 8 }, { b: 3, c: 27 }, { b: 4, c: 64 }, { b: 5, c: 125 }];
const ALL_CUBES = [...CUBES_1_5, ...CUBES_6_10];

function PerfectCubesPlayer2({ onComplete }) {
  const [phase, setPhase] = useState(1);
  if (phase === 1) return <CubesPhase1 cubes={CUBES_6_10} onDone={() => setPhase(2)} />;
  if (phase === 2) return <CubesPhase2 cubes={CUBES_6_10} onAllMastered={() => setPhase(3)} />;
  return <CubesReview cubes={ALL_CUBES} onComplete={onComplete} />;
}

function CubesPhase1({ cubes, onDone }) {
  const [idx, setIdx] = useState(0);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const cube = cubes[idx];
  if (!started) return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 20, color: "var(--text2)", marginBottom: 16 }}>Memorize the perfect cubes 6-10 in order.</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
        {cubes.map(c => <div key={c.b} style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "10px 16px", fontSize: 24, fontWeight: 800, fontFamily: "var(--mono)", textAlign: "center" }}>{c.b}- = {c.c}</div>)}
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
      <div style={{ fontSize: 20, color: "var(--text2)", marginBottom: 8 }}>Cube {idx + 1} of {cubes.length}</div>
      <div style={{ fontSize: 36, fontWeight: 900, fontFamily: "var(--mono)", marginBottom: 20 }}>{cube.b}- = {cube.c}</div>
      <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }}
        onClick={() => { if (idx + 1 < cubes.length) setIdx(i => i + 1); else setDone(true); }}>
        {idx + 1 < cubes.length ? "Next" : "Done"}
      </button>
    </div>
  );
}

function CubesPhase2({ cubes, onAllMastered }) {
  const [masteredMap, setMasteredMap] = useState({});
  const [correct, setCorrect] = useState({});
  const [wrong, setWrong] = useState({});
  const [current, setCurrent] = useState(() => randChoice(cubes));
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [timeLeft, setTimeLeft] = useState(CUBE_TIMER);
  const timerRef = useRef(null);
  const inputRef = useRef(null);

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
    setWrong(prev => ({ ...prev, [current.b]: (prev[current.b] || 0) + 1 }));
    setFeedback({ correct: false, mastered: false, base: current.b });
  };

  const handleSubmit = () => {
    clearInterval(timerRef.current);
    const isCorrect = parseInt(input) === current.c;
    let mastered = false;
    if (isCorrect) {
      const nc = (correct[current.b] || 0) + 1;
      const needed = 2 + (wrong[current.b] || 0);
      setCorrect(prev => ({ ...prev, [current.b]: nc }));
      if (nc >= needed) mastered = true;
    } else {
      setWrong(prev => ({ ...prev, [current.b]: (prev[current.b] || 0) + 1 }));
    }
    setFeedback({ correct: isCorrect, mastered, base: current.b });
  };

  const nextQuestion = () => {
    let nm = masteredMap;
    if (feedback?.mastered) { nm = { ...masteredMap, [feedback.base]: true }; setMasteredMap(nm); }
    const rem = cubes.filter(c => !nm[c.b]);
    if (rem.length === 0) { onAllMastered(); return; }
    setCurrent(randChoice(rem));
    setInput(""); setFeedback(null); setTimeLeft(CUBE_TIMER);
    setTimeout(() => inputRef.current?.focus(), 80);
  };

  const pct = (timeLeft / CUBE_TIMER) * 100;
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
      <div style={{ fontSize: 19, color: "var(--text3)", marginBottom: 6, textAlign: "center" }}>Mastered: {Object.keys(masteredMap).length}/{cubes.length}</div>
      <div style={{ textAlign: "center", fontSize: 36, fontWeight: 900, fontFamily: "var(--mono)", marginBottom: 16 }}>{current.b}- = ?</div>
      {feedback ? (
        <FeedbackBanner correct={feedback.correct} message={`${current.b}- = ${current.c}`} onNext={nextQuestion} />
      ) : (
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && input.trim() && handleSubmit()} placeholder="Enter answer" autoFocus
            style={{ textAlign: "center", fontSize: 24, fontFamily: "var(--mono)", fontWeight: 800, padding: "10px", width: 180 }} />
          <button className="btn btn-primary" style={{ fontSize: 20, padding: "10px 20px" }} onClick={handleSubmit} disabled={!input.trim()}>OK</button>
        </div>
      )}
    </div>
  );
}

function CubesReview({ cubes, onComplete }) {
  const [queue, setQueue] = useState(() => shuffle([...cubes]));
  const [current, setCurrent] = useState(() => shuffle([...cubes])[0]);
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState(null);
  const ref = useRef(null);
  useEffect(() => { const q = shuffle([...cubes]); setQueue(q); setCurrent(q[0]); }, []);
  const handleSubmit = () => { setFeedback({ correct: parseInt(input) === current.c }); };
  const handleNext = () => {
    const nq = feedback.correct ? queue.slice(1) : [...queue.slice(1), current];
    if (nq.length === 0) { onComplete(); return; }
    setCurrent(nq[0]); setQueue(nq); setInput(""); setFeedback(null);
    setTimeout(() => ref.current?.focus(), 80);
  };
  return (
    <div>
      <div style={{ fontSize: 20, color: "var(--text2)", marginBottom: 8, textAlign: "center" }}>Cumulative Review (1--10-) - {queue.length} remaining</div>
      <div style={{ textAlign: "center", fontSize: 36, fontWeight: 900, fontFamily: "var(--mono)", marginBottom: 16 }}>{current.b}- = ?</div>
      {feedback ? (
        <FeedbackBanner correct={feedback.correct} message={`${current.b}- = ${current.c}`} onNext={handleNext} />
      ) : (
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <input ref={ref} value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && input.trim() && handleSubmit()} placeholder="Enter answer" autoFocus
            style={{ textAlign: "center", fontSize: 24, fontFamily: "var(--mono)", fontWeight: 800, padding: "10px", width: 180 }} />
          <button className="btn btn-primary" style={{ fontSize: 20, padding: "10px 20px" }} onClick={handleSubmit} disabled={!input.trim()}>OK</button>
        </div>
      )}
    </div>
  );
}

// - Problem generators -

// Verified pools from lesson (no loops)
const _SIMPLE_POOL = [
  { n1: 8, n2: 6, den: 9, op: "-" }, { n1: 1, n2: 8, den: 11, op: "+" }, { n1: 2, n2: 6, den: 7, op: "-" },
  { n1: 10, n2: 2, den: 11, op: "-" }, { n1: 6, n2: 5, den: 8, op: "+" }, { n1: 6, n2: 4, den: 7, op: "+" },
  { n1: 10, n2: 5, den: 13, op: "-" }, { n1: 3, n2: 1, den: 13, op: "+" }, { n1: 5, n2: 9, den: 11, op: "+" },
  { n1: 6, n2: 9, den: 11, op: "+" }, { n1: 10, n2: 1, den: 13, op: "+" }, { n1: 7, n2: 10, den: 13, op: "+" },
];
const _SIMPLIFY_POOL = [
  { n1: 6, n2: 9, den: 12, op: "+" }, { n1: 7, n2: 3, den: 12, op: "+" }, { n1: 3, n2: 3, den: 9, op: "+" },
  { n1: 4, n2: 10, den: 12, op: "+" }, { n1: 10, n2: 1, den: 12, op: "-" }, { n1: 4, n2: 4, den: 10, op: "+" },
  { n1: 9, n2: 6, den: 12, op: "-" }, { n1: 7, n2: 4, den: 9, op: "-" }, { n1: 4, n2: 2, den: 9, op: "+" },
  { n1: 6, n2: 1, den: 10, op: "-" }, { n1: 6, n2: 4, den: 12, op: "-" }, { n1: 11, n2: 5, den: 12, op: "+" },
];

function genCommonDenomProblems() {
  // 6 problems: mix of simple (3), simplifiable (2), negative result (1)
  const probs = [];
  const simples = shuffle([..._SIMPLE_POOL]).slice(0, 3);
  const simplifys = shuffle([..._SIMPLIFY_POOL]).slice(0, 2);
  // one negative result problem
  const negPool = [
    { n1: 3, n2: -4, den: 5, op: "+" }, { n1: -2, n2: -3, den: 7, op: "+" },
    { n1: 2, n2: 5, den: 9, op: "-" }, { n1: -1, n2: 2, den: 3, op: "-" },
  ];
  const neg = randChoice(negPool);

  for (const p of [...simples, ...simplifys]) {
    const res = p.op === "+" ? p.n1 + p.n2 : p.n1 - p.n2;
    const display = `${p.n1}/${p.den} ${p.op} ${p.n2}/${p.den}`;
    probs.push({ display, resNum: res, resDen: p.den, answer: fmtAnswer(res, p.den) });
  }
  const negRes = neg.op === "+" ? neg.n1 + neg.n2 : neg.n1 - neg.n2;
  const n1s = neg.n1 < 0 ? `(-${Math.abs(neg.n1)}/${neg.den})` : `${neg.n1}/${neg.den}`;
  const n2s = neg.n2 < 0 ? `(-${Math.abs(neg.n2)}/${neg.den})` : `${neg.n2}/${neg.den}`;
  probs.push({ display: `${n1s} ${neg.op} ${n2s}`, resNum: negRes, resDen: neg.den, answer: fmtAnswer(negRes, neg.den) });

  return shuffle(probs);
}

function genDiffDenomProblems() {
  const pairs = [[2, 3], [3, 4], [2, 5], [3, 5], [4, 5], [5, 6], [3, 8], [2, 7], [4, 6], [6, 9], [3, 9], [4, 8]];
  const probs = [];
  const used = new Set();
  while (probs.length < 6) {
    const [d1, d2] = randChoice(pairs);
    const op = randChoice(["+", "-"]);
    const neg1 = Math.random() < 0.25;
    const neg2 = !neg1 && Math.random() < 0.25;
    const n1v = randInt(1, d1 - 1) * (neg1 ? -1 : 1);
    const n2v = randInt(1, d2 - 1) * (neg2 ? -1 : 1);
    const cd = lcm(d1, d2);
    const resNum = op === "+" ? n1v * (cd / d1) + n2v * (cd / d2) : n1v * (cd / d1) - n2v * (cd / d2);
    if (resNum === 0) continue;
    const [rn, rd] = reduce(resNum, cd);
    const key = `${d1},${d2},${op},${neg1},${neg2}`;
    if (used.has(key)) continue;
    used.add(key);
    const fmt = (n, d) => n < 0 ? `(-${Math.abs(n)}/${d})` : `${n}/${d}`;
    probs.push({ display: `${fmt(n1v, d1)} ${op} ${fmt(n2v, d2)}`, rn, rd, answer: fmtAnswer(rn * rd < 0 ? rn : rn, rd) });
  }
  return probs;
}

function genMixedSimpleProblems() {
  const pool = [
    { w1: 1, n1: 1, d: 3, w2: 2, n2: 1, op: "+" }, { w1: 2, n1: 1, d: 4, w2: 1, n2: 2, op: "+" },
    { w1: 3, n1: 1, d: 5, w2: 1, n2: 2, op: "+" }, { w1: 4, n1: 3, d: 5, w2: 1, n2: 1, op: "-" },
    { w1: 5, n1: 7, d: 8, w2: 2, n2: 3, op: "-" }, { w1: 6, n1: 2, d: 3, w2: 4, n2: 1, op: "-" },
    { w1: 7, n1: 5, d: 6, w2: 3, n2: 1, op: "-" }, { w1: 5, n1: 3, d: 4, w2: 2, n2: 1, op: "-" },
    { w1: 1, n1: 2, d: 7, w2: 3, n2: 3, op: "+" }, { w1: 2, n1: 1, d: 8, w2: 1, n2: 3, op: "+" },
  ];
  return shuffle(pool).slice(0, 6).map(p => {
    const rn = p.op === "+" ? (p.w1 + p.w2) * p.d + (p.n1 + p.n2) : (p.w1 - p.w2) * p.d + (p.n1 - p.n2);
    const ans = fmtAnswer(rn, p.d);
    const display = `${p.w1} ${p.n1}/${p.d} ${p.op} ${p.w2} ${p.n2}/${p.d}`;
    const worked = p.op === "+"
      ? `Whole: ${p.w1} + ${p.w2} = ${p.w1 + p.w2}\nFraction: ${p.n1}/${p.d} + ${p.n2}/${p.d} = ${p.n1 + p.n2}/${p.d}\nResult: ${ans}`
      : `Whole: ${p.w1} - ${p.w2} = ${p.w1 - p.w2}\nFraction: ${p.n1}/${p.d} - ${p.n2}/${p.d} = ${p.n1 - p.n2}/${p.d}\nResult: ${ans}`;
    return { display, resNum: rn, resDen: p.d, answer: ans, worked };
  });
}

function genMixedCarryProblems() {
  const pool = [
    { w1: 2, n1: 3, d: 4, w2: 1, n2: 3 }, { w1: 3, n1: 5, d: 6, w2: 2, n2: 5 },
    { w1: 1, n1: 2, d: 3, w2: 2, n2: 2 }, { w1: 2, n1: 3, d: 5, w2: 1, n2: 4 },
    { w1: 3, n1: 5, d: 8, w2: 2, n2: 7 }, { w1: 4, n1: 4, d: 7, w2: 1, n2: 5 },
    { w1: 2, n1: 5, d: 9, w2: 1, n2: 7 }, { w1: 3, n1: 3, d: 4, w2: 2, n2: 3 },
  ];
  return shuffle(pool).slice(0, 6).map(p => {
    const fracSum = p.n1 + p.n2;
    const carry = Math.floor(fracSum / p.d);
    const rem = fracSum % p.d;
    const wholeRes = p.w1 + p.w2 + carry;
    const [rn, rd] = rem === 0 ? [wholeRes, 1] : reduce(wholeRes * p.d + rem, p.d);
    const ans = fmtAnswer(rn, rd);
    const display = `${p.w1} ${p.n1}/${p.d} + ${p.w2} ${p.n2}/${p.d}`;
    const worked = `Fraction sum: ${p.n1}/${p.d} + ${p.n2}/${p.d} = ${fracSum}/${p.d} = ${carry} ${rem}/${p.d}\nCarry ${carry}: whole = ${p.w1} + ${p.w2} + ${carry} = ${wholeRes}\nResult: ${ans}`;
    return { display, resNum: wholeRes * p.d + (rem === 0 ? 0 : rem), resDen: p.d, answer: ans, worked };
  });
}

function genMixedBorrowProblems() {
  const pool = [
    { w1: 4, n1: 1, d: 4, w2: 2, n2: 3 }, { w1: 5, n1: 1, d: 3, w2: 2, n2: 2 },
    { w1: 6, n1: 1, d: 5, w2: 3, n2: 4 }, { w1: 7, n1: 2, d: 7, w2: 4, n2: 5 },
    { w1: 5, n1: 1, d: 6, w2: 2, n2: 5 }, { w1: 8, n1: 1, d: 8, w2: 3, n2: 5 },
    { w1: 6, n1: 2, d: 9, w2: 3, n2: 7 }, { w1: 4, n1: 1, d: 5, w2: 1, n2: 4 },
  ];
  return shuffle(pool).slice(0, 6).map(p => {
    const totalNum = (p.w1 * p.d + p.n1) - (p.w2 * p.d + p.n2);
    const [rn, rd] = reduce(totalNum, p.d);
    const ans = fmtAnswer(rn, rd);
    const borrowedNum = p.d + p.n1;
    const display = `${p.w1} ${p.n1}/${p.d} - ${p.w2} ${p.n2}/${p.d}`;
    const worked = `Borrow 1 from ${p.w1}: ${p.w1 - 1} ${borrowedNum}/${p.d}\nFraction: ${borrowedNum}/${p.d} - ${p.n2}/${p.d} = ${borrowedNum - p.n2}/${p.d}\nWhole: ${p.w1 - 1} - ${p.w2} = ${p.w1 - 1 - p.w2}\nResult: ${ans}`;
    return { display, resNum: totalNum, resDen: p.d, answer: ans, worked };
  });
}

function genWholeFracProblems() {
  const pool = [
    { w: 3, n: 1, d: 4, op: "+", negW: false, negF: false },
    { w: 5, n: 2, d: 3, op: "-", negW: false, negF: false },
    { w: 2, n: 3, d: 5, op: "+", negW: true, negF: false },
    { w: 4, n: 1, d: 2, op: "-", negW: false, negF: true },
    { w: 3, n: 2, d: 7, op: "+", negW: false, negF: false },
    { w: 6, n: 1, d: 3, op: "-", negW: false, negF: false },
    { w: 2, n: 1, d: 4, op: "+", negW: false, negF: false },
    { w: 5, n: 3, d: 8, op: "-", negW: false, negF: false },
  ];
  return shuffle(pool).slice(0, 6).map(p => {
    const wv = p.negW ? -p.w : p.w;
    const fv = p.negF ? -p.n : p.n;
    const resNum = p.op === "+" ? wv * p.d + fv : wv * p.d - fv;
    const ans = fmtAnswer(resNum, p.d);
    const ws = p.negW ? `-${p.w}` : String(p.w);
    const fs = p.negF ? `(-${p.n}/${p.d})` : `${p.n}/${p.d}`;
    const display = `${ws} ${p.op} ${fs}`;
    const worked = `Convert: ${ws} = ${wv * p.d}/${p.d}\n${wv * p.d}/${p.d} ${p.op} ${fv < 0 ? `(-${Math.abs(fv)}/${p.d})` : `${fv}/${p.d}`} = ${resNum}/${p.d}\nResult: ${ans}`;
    return { display, resNum, resDen: p.d, answer: ans, worked };
  });
}

// - 6-problem set mastery component -
function SixProblemMastery({ genProblems, onCorrect, onWrong, needMixed }) {
  const [problems, setProblems] = useState(() => genProblems());
  const [answers, setAnswers] = useState(Array(6).fill(""));
  const [feedback, setFeedback] = useState(null);

  const handleSubmit = () => {
    const results = problems.map((q, i) => {
      const rn = q.rn !== undefined ? q.rn : q.resNum;
      const rd = q.rd !== undefined ? q.rd : q.resDen;
      return answerMatches(answers[i], rn, rd);
    });
    const allCorrect = results.every(Boolean);
    setFeedback({ results, allCorrect, answers: [...answers] });
  };

  const handleNext = () => {
    if (feedback?.allCorrect) onCorrect(); else onWrong();
    setProblems(genProblems());
    setAnswers(Array(6).fill(""));
    setFeedback(null);
  };

  const allFilled = answers.every(a => a.trim() !== "");

  if (feedback) return (
    <div>
      <div style={{ textAlign: "center", fontSize: 22, fontWeight: 800, color: feedback.allCorrect ? "var(--green)" : "var(--red)", marginBottom: 12 }}>
        {feedback.allCorrect ? "All Correct!" : "Incorrect"}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
        {problems.map((q, i) => {
          const ok = feedback.results[i];
          return (
            <div key={i} style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "10px 14px", border: "1px solid " + (ok ? "rgba(22,163,74,0.2)" : "rgba(239,68,68,0.2)") }}>
              <div style={{ marginBottom: 4 }}><KaTeX expr={fracToKatex(q.display)} /></div>
              {!ok && (
                <div style={{ fontSize: 18, fontFamily: "var(--mono)", whiteSpace: "pre-line", color: "var(--text2)", marginBottom: 4 }}>
                  <span style={{ color: "var(--red)" }}>You: {feedback.answers[i] || "-"}</span>
                  {q.worked ? "\n" + q.worked : ""}
                </div>
              )}
              <div style={{ fontSize: 18, fontWeight: 700, color: ok ? "var(--green)" : "var(--green)" }}>
                {ok ? "Correct: " : "Answer: "}{q.answer}
              </div>
            </div>
          );
        })}
      </div>
      <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }} onClick={handleNext}>
        {feedback.allCorrect ? "Next Set" : "Try New Set"}
      </button>
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
        {problems.map((q, i) => (
          <div key={i} style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "10px 14px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span style={{ flex: 1 }}><KaTeX expr={fracToKatex(q.display)} /></span>
            <input value={answers[i]} onChange={e => setAnswers(prev => prev.map((x, j) => j === i ? e.target.value : x))}
              placeholder="answer"
              style={{ textAlign: "center", fontSize: 20, fontFamily: "var(--mono)", fontWeight: 700, padding: "6px 10px", width: 120, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--surface)" }} />
          </div>
        ))}
      </div>
      <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }} onClick={handleSubmit} disabled={!allFilled}>Submit All</button>
    </div>
  );
}

// - Common denom mastery (streak 3 per problem) -
function CommonDenomMastery({ onCorrect, onWrong }) {
  const [q, setQ] = useState(() => randChoice(genCommonDenomProblems()));
  const [feedback, setFeedback] = useState(null);

  const handleSubmit = (input) => {
    const ok = answerMatches(input, q.resNum, q.resDen);
    setFeedback({ correct: ok, input });
  };

  const handleNext = () => {
    if (feedback?.correct) onCorrect(); else onWrong();
    setFeedback(null);
    setQ(randChoice(genCommonDenomProblems()));
  };

  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: 14 }}><KaTeX expr={fracToKatex(q.display)} /></div>
      {feedback ? (
        <FeedbackBanner correct={feedback.correct}
          message={feedback.correct ? `Answer: ${q.answer}` : `Your answer: ${feedback.input}\nCorrect: ${q.answer}`}
          onNext={handleNext} />
      ) : (
        <TextInput onSubmit={handleSubmit} submitted={false} placeholder="" />
      )}
    </div>
  );
}

// - Different denom mastery (streak 3 per problem) -
function DiffDenomMastery({ onCorrect, onWrong }) {
  const [problems] = useState(() => genDiffDenomProblems());
  const [q, setQ] = useState(() => randChoice(genDiffDenomProblems()));
  const [feedback, setFeedback] = useState(null);

  const handleSubmit = (input) => {
    const ok = answerMatches(input, q.rn, q.rd);
    setFeedback({ correct: ok, input });
  };

  const handleNext = () => {
    if (feedback?.correct) onCorrect(); else onWrong();
    setFeedback(null);
    setQ(randChoice(genDiffDenomProblems()));
  };

  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: 14 }}><KaTeX expr={fracToKatex(q.display)} /></div>
      {feedback ? (
        <FeedbackBanner correct={feedback.correct}
          message={feedback.correct ? `Answer: ${q.answer}` : `Your answer: ${feedback.input}\nCorrect: ${q.answer}`}
          onNext={handleNext} />
      ) : (
        <TextInput onSubmit={handleSubmit} submitted={false} placeholder="" />
      )}
    </div>
  );
}

// - Steps -
const STEPS = [
  { id: "common-denom", label: "Common Denominator", description: "Streak of 3 in a row", streak: STREAK3 },
  { id: "diff-denom", label: "Different Denominators", description: "Streak of 3 in a row", streak: STREAK3 },
  { id: "mixed-simple", label: "Mixed Numbers (Simple)", description: "All correct to pass", streak: 1 },
  { id: "mixed-carry", label: "Mixed Numbers (Carrying)", description: "All correct to pass", streak: 1 },
  { id: "mixed-borrow", label: "Mixed Numbers (Borrowing)", description: "All correct to pass", streak: 1 },
  { id: "whole-frac", label: "Whole Number +/- Fraction", description: "All correct to pass", streak: 1 },
];

export default function Lesson15MasteryPlayer({ user, topic, onHome }) {
  const topicId = topic?.id || LESSON15_MASTERY_TOPIC_ID;
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
    setStepIdx(si); setStreak(st); if (done) setCompleted(true);
  };

  const handleCorrect = async () => {
    const needed = STEPS[stepIdx]?.streak || 1;
    const ns = streak + 1;
    if (ns >= needed) { const nx = stepIdx + 1; await save(nx, 0, nx >= STEPS.length); }
    else await save(stepIdx, ns, false);
  };
  const handleWrong = async () => { await save(stepIdx, 0, false); };

  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><div className="spinner" /></div>;
  if (completed) return (
    <div style={{ maxWidth: 520, margin: "0 auto", textAlign: "center" }}>
      <div className="card">
        <div style={{ fontSize: 48, fontWeight: 900, color: "var(--amber)", marginBottom: 16 }}>100%</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>HW 15 (019) Complete!</h2>
        <p style={{ fontSize: 20, color: "var(--text2)", marginBottom: 24 }}>Adding and subtracting fractions mastered!</p>
        <button className="btn btn-primary btn-lg" style={{ width: "100%" }} onClick={onHome}>Back to Home</button>
      </div>
    </div>
  );

  const step = STEPS[stepIdx]; if (!step) return null;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "clamp(16px,3vw,32px)" }} className="dot-bg">
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,var(--blue),var(--orange))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "#fff" }}>L15</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 22 }}>HW 15 (019): Mastery Activities</div>
              <div style={{ fontSize: 20, color: "var(--text3)" }}>Complete each activity to advance</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onHome}>Back to Home</button>
        </div>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 16 }}>
          {STEPS.map((s, i) => {
            const done = i < stepIdx, active = i === stepIdx;
            return (
              <div key={s.id} style={{ fontSize: 17, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: done ? "rgba(22,163,74,0.12)" : active ? "rgba(27,143,255,0.12)" : "var(--surface)", color: done ? "var(--green)" : active ? "var(--blue)" : "var(--text3)", border: "1px solid " + (done ? "rgba(22,163,74,0.3)" : active ? "rgba(27,143,255,0.3)" : "var(--border)") }}>
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
          {step.streak > 1 && <StreakDots current={streak} needed={step.streak} />}
          {step.id === "common-denom" && <CommonDenomMastery key={stepIdx + "-" + streak} onCorrect={handleCorrect} onWrong={handleWrong} />}
          {step.id === "diff-denom" && <DiffDenomMastery key={stepIdx + "-" + streak} onCorrect={handleCorrect} onWrong={handleWrong} />}
          {step.id === "mixed-simple" && <SixProblemMastery key={stepIdx + "-" + streak} genProblems={genMixedSimpleProblems} prompt="Add or subtract the mixed numbers." onCorrect={handleCorrect} onWrong={handleWrong} needMixed />}
          {step.id === "mixed-carry" && <SixProblemMastery key={stepIdx + "-" + streak} genProblems={genMixedCarryProblems} prompt="Add. Simplify your answer." onCorrect={handleCorrect} onWrong={handleWrong} needMixed />}
          {step.id === "mixed-borrow" && <SixProblemMastery key={stepIdx + "-" + streak} genProblems={genMixedBorrowProblems} prompt="Subtract. Simplify your answer." onCorrect={handleCorrect} onWrong={handleWrong} needMixed />}
          {step.id === "whole-frac" && <SixProblemMastery key={stepIdx + "-" + streak} genProblems={genWholeFracProblems} prompt="Add or subtract. Simplify your answer." onCorrect={handleCorrect} onWrong={handleWrong} needMixed />}
        </div>
      </div>
    </div>
  );
}

// - Standalone Perfect Cubes 6-10 Player -
export function PerfectCubes2Player({ user, topic, onHome }) {
  const topicId = topic?.id || PERFECT_CUBES_2_TOPIC_ID;
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  useEffect(() => { getProgress(user.id, topicId).then(prog => { if (prog?.data?.completed) setCompleted(true); setLoading(false); }); }, []);
  const handleComplete = async () => { await fbSaveProgress(user.id, topicId, { started: true, completed: true, percentComplete: 100, data: { completed: true } }); setCompleted(true); };
  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><div className="spinner" /></div>;
  if (completed) return (
    <div style={{ maxWidth: 520, margin: "0 auto", textAlign: "center" }}>
      <div className="card">
        <div style={{ fontSize: 48, fontWeight: 900, color: "var(--amber)", marginBottom: 16 }}>100%</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Perfect Cubes 6-10 Complete!</h2>
        <button className="btn btn-primary btn-lg" style={{ width: "100%" }} onClick={onHome}>Back to Home</button>
      </div>
    </div>
  );
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "clamp(16px,3vw,32px)" }} className="dot-bg">
      <div style={{ maxWidth: 580, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,var(--blue),var(--orange))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "#fff" }}>15</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 22 }}>Perfect Cubes 6-10</div>
              <div style={{ fontSize: 20, color: "var(--text3)" }}>Memorize then drill, review 1-10</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onHome}>Back</button>
        </div>
        <div className="card"><PerfectCubesPlayer2 onComplete={handleComplete} /></div>
      </div>
    </div>
  );
}

