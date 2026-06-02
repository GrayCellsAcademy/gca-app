import { useState, useEffect, useRef } from "react";
import { saveProgress as fbSaveProgress, getProgress } from "./core/firebase";

export const LESSON16_MASTERY_TOPIC_ID = "lesson16-mastery-v1";
export const MULT_ZEROS_TOPIC_ID = "mult-zeros-v1";

const TIMER = 8;

// -- Math helpers --
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randChoice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function shuffle(arr) { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); return b === 0 ? a : gcd(b, a % b); }
function reduce(n, d) { if (n === 0) return [0, 1]; const g = gcd(Math.abs(n), Math.abs(d)); const sign = d < 0 ? -1 : 1; return [sign * n / g, sign * d / g]; }

function fmtAnswer(n, d) {
  const [rn, rd] = reduce(n, d);
  if (rd === 1) return String(rn);
  if (Math.abs(rn) > rd) {
    const sign = rn < 0 ? "-" : "";
    const whole = Math.floor(Math.abs(rn) / rd);
    const rem = Math.abs(rn) % rd;
    return rem === 0 ? `${sign}${whole}` : `${sign}${whole} ${rem}/${rd}`;
  }
  return `${rn}/${rd}`;
}

function parseFrac(str) {
  const s = String(str || "").trim();
  if (!s) return null;
  const neg = s.startsWith("-");
  const abs = neg ? s.slice(1).trim() : s;
  const mx = abs.replace(/\s*-\s*/g, " ").match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mx) { const num = parseInt(mx[1]) * parseInt(mx[3]) + parseInt(mx[2]); return { num: neg ? -num : num, den: parseInt(mx[3]) }; }
  const fx = abs.match(/^(\d+)\/(\d+)$/);
  if (fx) return { num: neg ? -parseInt(fx[1]) : parseInt(fx[1]), den: parseInt(fx[2]) };
  const ix = abs.match(/^(\d+)$/);
  if (ix) return { num: neg ? -parseInt(ix[1]) : parseInt(ix[1]), den: 1 };
  return null;
}

function answerOk(input, rn, rd) {
  const p = parseFrac(input);
  if (!p) return false;
  const [in_, id_] = reduce(p.num, p.den);
  const [cn, cd] = reduce(rn, rd);
  if (in_ !== cn || id_ !== cd) return false;
  if (p.den !== 1 && gcd(Math.abs(p.num), p.den) !== 1) return false;
  return true;
}

// -- KaTeX --
function useKaTeX() {
  useEffect(() => {
    if (window.katex) return;
    const link = document.createElement("link"); link.rel = "stylesheet";
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
function KaTeXBlock({ expr }) {
  const ref = useRef(null); useKaTeX();
  useEffect(() => {
    const go = () => { if (window.katex && ref.current) { try { window.katex.render(expr, ref.current, { throwOnError: false, displayMode: true }); } catch {} } else setTimeout(go, 100); };
    go();
  });
  return <div ref={ref} style={{ fontSize: 24, margin: "8px 0", minHeight: 36 }} />;
}
function frac(n, d) { return `\\dfrac{${n}}{${d}}`; }
function mixed(w, n, d) { return `${w}\\dfrac{${n}}{${d}}`; }

// -- Shared UI --
function FeedbackBanner({ correct, message, onNext }) {
  return (
    <div style={{ textAlign: "center", marginTop: 12 }}>
      <div style={{ fontSize: 24, fontWeight: 800, color: correct ? "var(--green)" : "var(--red)", marginBottom: 10 }}>{correct ? "Correct!" : "Incorrect"}</div>
      {message && <div style={{ fontSize: 19, color: "var(--text2)", marginBottom: 14, background: correct ? "rgba(22,163,74,0.06)" : "rgba(239,68,68,0.06)", border: "1px solid " + (correct ? "rgba(22,163,74,0.2)" : "rgba(239,68,68,0.2)"), borderRadius: "var(--radius-sm)", padding: "10px 16px", textAlign: "left", whiteSpace: "pre-line" }}>{message}</div>}
      <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }} onClick={onNext}>Next Problem</button>
    </div>
  );
}

function TextInput({ onSubmit, submitted, placeholder }) {
  const [val, setVal] = useState(""); const ref = useRef(null);
  useEffect(() => { setVal(""); setTimeout(() => ref.current?.focus(), 80); }, [submitted]);
  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
      <input ref={ref} value={val} onChange={e => setVal(e.target.value)}
        onKeyDown={e => e.key === "Enter" && val.trim() && onSubmit(val.trim())} disabled={submitted}
        placeholder={placeholder || ""} autoFocus
        style={{ textAlign: "center", fontSize: 22, fontFamily: "var(--mono)", fontWeight: 700, padding: "10px", width: 180 }} />
      <button className="btn btn-primary" style={{ fontSize: 20, padding: "10px 20px" }}
        onMouseDown={e => { e.preventDefault(); if (val.trim()) onSubmit(val.trim()); }} disabled={submitted || !val.trim()}>OK</button>
    </div>
  );
}

function MixedInput({ onSubmit, submitted }) {
  const [mode, setMode] = useState("text");
  const [textVal, setTextVal] = useState("");
  const [whole, setWhole] = useState(""); const [num, setNum] = useState(""); const [den, setDen] = useState("");
  const ref = useRef(null);
  useEffect(() => { setTextVal(""); setWhole(""); setNum(""); setDen(""); setTimeout(() => ref.current?.focus(), 80); }, [submitted]);
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
          onClick={() => { if (whole.trim() && num.trim() && den.trim()) onSubmit(`${whole.trim()} ${num.trim()}/${den.trim()}`); }}
          disabled={submitted || !whole.trim() || !num.trim() || !den.trim()}>OK</button>
      </div>
      <button className="btn btn-ghost btn-sm" style={{ width: "100%", fontSize: 18 }} onClick={() => setMode("text")}>Type instead</button>
    </div>
  );
  return (
    <div>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 8 }}>
        <input ref={ref} value={textVal} onChange={e => setTextVal(e.target.value)}
          onKeyDown={e => e.key === "Enter" && textVal.trim() && onSubmit(textVal.trim())} disabled={submitted} placeholder=""
          style={{ textAlign: "center", fontSize: 22, fontFamily: "var(--mono)", fontWeight: 700, padding: "10px", width: 180 }} />
        <button className="btn btn-primary" style={{ fontSize: 20, padding: "10px 20px" }}
          onMouseDown={e => { e.preventDefault(); if (textVal.trim()) onSubmit(textVal.trim()); }} disabled={submitted || !textVal.trim()}>OK</button>
      </div>
      <button className="btn btn-ghost btn-sm" style={{ width: "100%", fontSize: 18 }} onClick={() => setMode("visual")}>
        Enter as mixed number &nbsp;<span style={{ fontFamily: "var(--mono)", fontWeight: 900 }}>2 -/-</span>
      </button>
    </div>
  );
}

// - Activity 1: Multiplying with Zeros -
function genMultZeros() {
  const a = randInt(1, 5), k = randInt(1, 3);
  const b = randInt(1, 3), m = randInt(0, 3);
  if (k === 0 && m === 0) return genMultZeros();
  const val1 = a * Math.pow(10, k);
  const val2 = b * Math.pow(10, m);
  const product = val1 * val2;
  const explanation = `${a} x ${b} = ${a * b}, then add ${k + m} zero${k + m !== 1 ? "s" : ""}: ${a * b} + ${k + m} zeros = ${product}`;
  return { val1, val2, product, a, k, b, m, explanation };
}

function MultZerosTutorial({ onStart }) {
  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 16 }}>How to Multiply Numbers with Zeros</div>
      <div style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "16px", marginBottom: 16, fontSize: 20, lineHeight: 1.7 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Rule: Multiply the non-zero parts, then count total zeros.</div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Example 1: 20 x 300</div>
          <div>Step 1: Multiply 2 x 3 = 6</div>
          <div>Step 2: Count zeros: 20 has 1 zero, 300 has 2 zeros - 3 zeros total</div>
          <div style={{ color: "var(--green)", fontWeight: 700 }}>Answer: 6 followed by 3 zeros = 6,000</div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Example 2: 4 x 500</div>
          <div>Step 1: Multiply 4 x 5 = 20</div>
          <div>Step 2: 500 has 2 zeros - add 2 zeros to 20</div>
          <div style={{ color: "var(--green)", fontWeight: 700 }}>Answer: 20 followed by 2 zeros = 2,000</div>
        </div>
        <div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Example 3: 30 x 40</div>
          <div>Step 1: Multiply 3 x 4 = 12</div>
          <div>Step 2: 30 has 1 zero, 40 has 1 zero - 2 zeros total</div>
          <div style={{ color: "var(--green)", fontWeight: 700 }}>Answer: 12 followed by 2 zeros = 1,200</div>
        </div>
      </div>
      <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }} onClick={onStart}>Start Drill</button>
    </div>
  );
}

function MultZerosMastery({ onComplete }) {
  const [showTutorial, setShowTutorial] = useState(true);
  const [q, setQ] = useState(() => genMultZeros());
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIMER);
  const timerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (showTutorial) return;
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); handleTimeout(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [q, showTutorial]);

  const handleTimeout = () => {
    clearInterval(timerRef.current);
    setFeedback({ correct: false, msg: `${q.val1} x ${q.val2} = ${q.product}\n${q.explanation}` });
    setStreak(0);
  };

  const handleSubmit = () => {
    clearInterval(timerRef.current);
    const val = parseInt(input.replace(/,/g, "").trim());
    const ok = val === q.product;
    setFeedback({ correct: ok, msg: ok ? `${q.val1} x ${q.val2} = ${q.product}` : `${q.val1} x ${q.val2} = ${q.product}\n${q.explanation}` });
    if (ok) { if (streak + 1 >= 3) { setTimeout(onComplete, 300); } else setStreak(s => s + 1); }
    else setStreak(0);
  };

  const handleNext = () => {
    setFeedback(null); setInput(""); setQ(genMultZeros()); setTimeLeft(TIMER);
    setTimeout(() => inputRef.current?.focus(), 80);
  };

  if (showTutorial) return <MultZerosTutorial onStart={() => setShowTutorial(false)} />;

  const pct = (timeLeft / TIMER) * 100;
  const color = timeLeft <= 2 ? "var(--red)" : timeLeft <= 4 ? "var(--amber)" : "var(--green)";

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 20, color: "var(--text3)", marginBottom: 4 }}>
          <span>Time</span><span style={{ fontWeight: 700, color }}>{timeLeft}s</span>
        </div>
        <div style={{ height: 6, background: "var(--surface2)", borderRadius: 99, overflow: "hidden" }}>
          <div style={{ height: "100%", width: pct + "%", background: color, borderRadius: 99, transition: "width 0.9s linear" }} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 5, marginBottom: 14 }}>
        {[0, 1, 2].map(i => <div key={i} style={{ width: 13, height: 13, borderRadius: "50%", background: i < streak ? "var(--green)" : "var(--surface2)", border: "2px solid " + (i < streak ? "var(--green)" : "var(--border2)") }} />)}
        <span style={{ fontSize: 19, color: "var(--text3)", marginLeft: 6 }}>{streak}/3</span>
      </div>
      <KaTeXBlock expr={`${q.val1} \\times ${q.val2}`} />
      {feedback ? (
        <FeedbackBanner correct={feedback.correct} message={feedback.msg} onNext={handleNext} />
      ) : (
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && input.trim() && handleSubmit()} placeholder="Enter product" autoFocus
            style={{ textAlign: "center", fontSize: 22, fontFamily: "var(--mono)", fontWeight: 700, padding: "10px", width: 180 }} />
          <button className="btn btn-primary" style={{ fontSize: 20, padding: "10px 20px" }} onClick={handleSubmit} disabled={!input.trim()}>OK</button>
        </div>
      )}
    </div>
  );
}

// - Problem generators -
const CROSS_PAIRS = [
  { n1: 2, d1: 3, n2: 3, d2: 4, rn: 1, rd: 2 }, { n1: 2, d1: 5, n2: 5, d2: 6, rn: 1, rd: 3 },
  { n1: 3, d1: 4, n2: 4, d2: 9, rn: 1, rd: 3 }, { n1: 4, d1: 5, n2: 5, d2: 8, rn: 1, rd: 2 },
  { n1: 3, d1: 7, n2: 7, d2: 9, rn: 1, rd: 3 }, { n1: 6, d1: 7, n2: 7, d2: 8, rn: 3, rd: 4 },
  { n1: 5, d1: 6, n2: 3, d2: 10, rn: 1, rd: 4 }, { n1: 4, d1: 9, n2: 3, d2: 8, rn: 1, rd: 6 },
  { n1: 9, d1: 10, n2: 5, d2: 18, rn: 1, rd: 4 }, { n1: 7, d1: 8, n2: 4, d2: 21, rn: 1, rd: 6 },
];
const FRAC_WHOLE_POOL = [
  { n: 3, d: 4, w: 2, rn: 3, rd: 2 }, { n: 2, d: 3, w: 6, rn: 4, rd: 1 }, { n: 5, d: 8, w: 4, rn: 5, rd: 2 },
  { n: 7, d: 10, w: 5, rn: 7, rd: 2 }, { n: 3, d: 5, w: 5, rn: 3, rd: 1 }, { n: 4, d: 7, w: 7, rn: 4, rd: 1 },
  { n: 3, d: 8, w: 4, rn: 3, rd: 2 }, { n: 5, d: 12, w: 4, rn: 5, rd: 3 }, { n: 7, d: 8, w: 8, rn: 7, rd: 1 },
];
const DIV_POOL = [
  { type: "f/f", n1: 1, d1: 2, n2: 3, d2: 4, rn: 2, rd: 3 }, { type: "f/f", n1: 3, d1: 5, n2: 2, d2: 7, rn: 21, rd: 10 },
  { type: "f/f", n1: 5, d1: 6, n2: 1, d2: 3, rn: 5, rd: 2 }, { type: "f/f", n1: 4, d1: 9, n2: 2, d2: 3, rn: 2, rd: 3 },
  { type: "f/w", n: 1, d: 2, w: 3, rn: 1, rd: 6 }, { type: "f/w", n: 3, d: 4, w: 2, rn: 3, rd: 8 },
  { type: "w/f", w: 3, n: 1, d: 2, rn: 6, rd: 1 }, { type: "w/f", w: 2, n: 3, d: 4, rn: 8, rd: 3 },
  { type: "f/f", n1: 5, d1: 8, n2: 5, d2: 6, rn: 3, rd: 4 }, { type: "f/w", n: 2, d: 5, w: 4, rn: 1, rd: 10 },
];
const MIX_MULT_POOL = [
  { type: "m*m", w1: 1, n1: 1, d1: 2, w2: 2, n2: 1, d2: 3, rn: 7, rd: 2 },
  { type: "m*m", w1: 2, n1: 1, d1: 4, w2: 1, n2: 2, d2: 3, rn: 15, rd: 4 },
  { type: "m*m", w1: 1, n1: 3, d1: 5, w2: 2, n2: 1, d2: 2, rn: 4, rd: 1 },
  { type: "m*w", w1: 2, n1: 1, d1: 3, w2: 3, rn: 7, rd: 1 },
  { type: "m*w", w1: 1, n1: 1, d1: 2, w2: 4, rn: 6, rd: 1 },
  { type: "m*f", w1: 1, n1: 1, d1: 2, n2: 2, d2: 3, rn: 1, rd: 1 },
  { type: "m*m", w1: 2, n1: 2, d1: 3, w2: 1, n2: 1, d2: 2, rn: 4, rd: 1 },
  { type: "m*w", w1: 3, n1: 1, d1: 4, w2: 2, rn: 13, rd: 2 },
];
const MIX_DIV_POOL = [
  { type: "m/m", w1: 2, n1: 1, d1: 2, w2: 1, n2: 1, d2: 4, rn: 2, rd: 1 },
  { type: "m/m", w1: 3, n1: 1, d1: 3, w2: 1, n2: 2, d2: 3, rn: 2, rd: 1 },
  { type: "m/m", w1: 1, n1: 3, d1: 4, w2: 2, n2: 1, d2: 2, rn: 7, rd: 10 },
  { type: "m/w", w1: 3, n1: 1, d1: 2, w2: 2, rn: 7, rd: 4 },
  { type: "w/m", w: 4, w2: 1, n2: 1, d2: 3, rn: 3, rd: 1 },
  { type: "f/m", n: 3, d: 4, w2: 1, n2: 1, d2: 2, rn: 3, rd: 2 },
  { type: "m/f", w1: 2, n1: 1, d1: 3, n: 2, d: 3, rn: 7, rd: 2 },
  { type: "m/m", w1: 2, n1: 2, d1: 3, w2: 1, n2: 1, d2: 3, rn: 2, rd: 1 },
];

function getDisplay(p) {
  if (p.type === "m*m") return { latex: `${mixed(p.w1, p.n1, p.d1)} \\times ${mixed(p.w2, p.n2, p.d2)}`, worked: `Convert: ${frac(p.w1 * p.d1 + p.n1, p.d1)} \\times ${frac(p.w2 * p.d2 + p.n2, p.d2)} = ${frac(p.rn, p.rd)}` };
  if (p.type === "m*w") return { latex: `${mixed(p.w1, p.n1, p.d1)} \\times ${p.w2}`, worked: `Convert: ${frac(p.w1 * p.d1 + p.n1, p.d1)} \\times ${p.w2} = ${frac(p.rn, p.rd)}` };
  if (p.type === "m*f") return { latex: `${mixed(p.w1, p.n1, p.d1)} \\times ${frac(p.n2, p.d2)}`, worked: `Convert: ${frac(p.w1 * p.d1 + p.n1, p.d1)} \\times ${frac(p.n2, p.d2)} = ${frac(p.rn, p.rd)}` };
  if (p.type === "m/m") return { latex: `${mixed(p.w1, p.n1, p.d1)} \\div ${mixed(p.w2, p.n2, p.d2)}`, worked: `Convert: ${frac(p.w1 * p.d1 + p.n1, p.d1)} \\div ${frac(p.w2 * p.d2 + p.n2, p.d2)} = ${frac(p.w1 * p.d1 + p.n1, p.d1)} \\times ${frac(p.d2 * p.w2 + p.n2, p.n2 * p.w2 + (p.n2 === 0 ? 1 : 0))}` };
  if (p.type === "m/w") return { latex: `${mixed(p.w1, p.n1, p.d1)} \\div ${p.w2}`, worked: `Convert: ${frac(p.w1 * p.d1 + p.n1, p.d1)} \\div ${p.w2} = ${frac(p.rn, p.rd)}` };
  if (p.type === "w/m") return { latex: `${p.w} \\div ${mixed(p.w2, p.n2, p.d2)}`, worked: `Convert: ${p.w} \\div ${frac(p.w2 * p.d2 + p.n2, p.d2)} = ${p.w} \\times ${frac(p.d2, p.w2 * p.d2 + p.n2)} = ${frac(p.rn, p.rd)}` };
  if (p.type === "f/m") return { latex: `${frac(p.n, p.d)} \\div ${mixed(p.w2, p.n2, p.d2)}`, worked: `Convert: ${frac(p.n, p.d)} \\div ${frac(p.w2 * p.d2 + p.n2, p.d2)} = ${frac(p.n, p.d)} \\times ${frac(p.d2, p.w2 * p.d2 + p.n2)} = ${frac(p.rn, p.rd)}` };
  if (p.type === "m/f") return { latex: `${mixed(p.w1, p.n1, p.d1)} \\div ${frac(p.n, p.d)}`, worked: `Convert: ${frac(p.w1 * p.d1 + p.n1, p.d1)} \\div ${frac(p.n, p.d)} = ${frac(p.w1 * p.d1 + p.n1, p.d1)} \\times ${frac(p.d, p.n)} = ${frac(p.rn, p.rd)}` };
  return { latex: "", worked: "" };
}

// - Six-problem mastery component -
function SixMastery({ genProblems, renderProblem, gradeProblem, workedSolution, onCorrect, onWrong, useMixed }) {
  const [problems, setProblems] = useState(() => genProblems());
  const [answers, setAnswers] = useState(Array(6).fill(""));
  const [feedback, setFeedback] = useState(null);

  const handleSubmit = () => {
    const results = problems.map((p, i) => gradeProblem(answers[i], p));
    const allOk = results.every(Boolean);
    setFeedback({ results, allOk, answers: [...answers] });
    if (allOk) onCorrect(); else onWrong();
  };

  const handleNext = () => {
    setProblems(genProblems()); setAnswers(Array(6).fill("")); setFeedback(null);
  };

  if (feedback) return (
    <div>
      <div style={{ textAlign: "center", fontSize: 22, fontWeight: 800, color: feedback.allOk ? "var(--green)" : "var(--red)", marginBottom: 12 }}>
        {feedback.allOk ? "All Correct!" : "Incorrect"}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
        {problems.map((p, i) => {
          const ok = feedback.results[i];
          const ws = workedSolution ? workedSolution(p) : null;
          return (
            <div key={i} style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "10px 14px", border: "1px solid " + (ok ? "rgba(22,163,74,0.2)" : "rgba(239,68,68,0.2)") }}>
              <div style={{ marginBottom: 4 }}>{renderProblem(p)}</div>
              {!ok && <div style={{ fontSize: 18, color: "var(--red)", marginBottom: 2 }}>You: <span style={{ fontFamily: "var(--mono)" }}>{feedback.answers[i] || "-"}</span></div>}
              {!ok && ws && <div style={{ fontSize: 17, color: "var(--text2)", fontFamily: "var(--mono)", whiteSpace: "pre-line", marginBottom: 4 }}>{ws}</div>}
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--green)" }}>Answer: <KaTeX expr={fmtAnswer(p.rn, p.rd)} /></div>
            </div>
          );
        })}
      </div>
      <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }} onClick={handleNext}>
        {feedback.allOk ? "Next Set" : "Try New Set"}
      </button>
    </div>
  );

  const allFilled = answers.every(a => a.trim() !== "");
  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
        {problems.map((p, i) => (
          <div key={i} style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "10px 14px" }}>
            <div style={{ marginBottom: 8 }}>{renderProblem(p)}</div>
            {useMixed ? (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input value={answers[i]} onChange={e => setAnswers(prev => prev.map((x, j) => j === i ? e.target.value : x))} placeholder=""
                  style={{ textAlign: "center", fontSize: 20, fontFamily: "var(--mono)", fontWeight: 700, padding: "6px 10px", flex: 1, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--surface)" }} />
              </div>
            ) : (
              <input value={answers[i]} onChange={e => setAnswers(prev => prev.map((x, j) => j === i ? e.target.value : x))} placeholder=""
                style={{ textAlign: "center", fontSize: 20, fontFamily: "var(--mono)", fontWeight: 700, padding: "6px 10px", width: "100%", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--surface)" }} />
            )}
          </div>
        ))}
      </div>
      <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }} onClick={handleSubmit} disabled={!allFilled}>Submit All</button>
    </div>
  );
}

// - Activity implementations -
function MultFracMastery({ onCorrect, onWrong }) {
  return <SixMastery
    genProblems={() => shuffle([...CROSS_PAIRS]).slice(0, 6)}
    renderProblem={p => <KaTeX expr={`${frac(p.n1, p.d1)} \\times ${frac(p.n2, p.d2)}`} />}
    gradeProblem={(input, p) => answerOk(input, p.rn, p.rd)}
    workedSolution={p => {
      const g1 = gcd(p.n1, p.d2), g2 = gcd(p.n2, p.d1);
      return `Cancel: ${p.n1}/${p.d1} x ${p.n2}/${p.d2} - divide ${p.n1} and ${p.d2} by ${g1}, divide ${p.n2} and ${p.d1} by ${g2}\nResult: ${p.rn}/${p.rd}`;
    }}
    onCorrect={onCorrect} onWrong={onWrong} useMixed />
}

function FracWholeMastery({ onCorrect, onWrong }) {
  return <SixMastery
    genProblems={() => shuffle([...FRAC_WHOLE_POOL]).slice(0, 6)}
    renderProblem={p => <KaTeX expr={`${frac(p.n, p.d)} \\times ${p.w}`} />}
    gradeProblem={(input, p) => answerOk(input, p.rn, p.rd)}
    workedSolution={p => `${p.n} x ${p.w} = ${p.n * p.w}, then simplify ${p.n * p.w}/${p.d} = ${fmtAnswer(p.rn, p.rd)}`}
    onCorrect={onCorrect} onWrong={onWrong} useMixed />
}

function ReciprocalMastery({ onCorrect, onWrong }) {
  const POOL = [
    { display: "2/3", latex: frac(2, 3), rn: 3, rd: 2 }, { display: "5", latex: "5", rn: 1, rd: 5 },
    { display: "1/4", latex: frac(1, 4), rn: 4, rd: 1 }, { display: "7", latex: "7", rn: 1, rd: 7 },
    { display: "3/2", latex: frac(3, 2), rn: 2, rd: 3 }, { display: "1/8", latex: frac(1, 8), rn: 8, rd: 1 },
    { display: "4/5", latex: frac(4, 5), rn: 5, rd: 4 }, { display: "3/7", latex: frac(3, 7), rn: 7, rd: 3 },
    { display: "9", latex: "9", rn: 1, rd: 9 }, { display: "5/3", latex: frac(5, 3), rn: 3, rd: 5 },
  ];
  return <SixMastery
    genProblems={() => shuffle([...POOL]).slice(0, 6)}
    renderProblem={p => <KaTeX expr={p.latex} />}
    gradeProblem={(input, p) => { const q = parseFrac(input); if (!q) return false; const [a, b] = reduce(q.num, q.den); const [c, d] = reduce(p.rn, p.rd); return a === c && b === d; }}
    workedSolution={p => `Reciprocal: flip the fraction - ${p.rn}/${p.rd}`}
    onCorrect={onCorrect} onWrong={onWrong} useMixed={false} />
}

function DivFracMastery({ onCorrect, onWrong }) {
  function renderDiv(p) {
    if (p.type === "f/f") return <KaTeX expr={`${frac(p.n1, p.d1)} \\div ${frac(p.n2, p.d2)}`} />;
    if (p.type === "f/w") return <KaTeX expr={`${frac(p.n, p.d)} \\div ${p.w}`} />;
    if (p.type === "w/f") return <KaTeX expr={`${p.w} \\div ${frac(p.n, p.d)}`} />;
    return null;
  }
  function workedDiv(p) {
    if (p.type === "f/f") return `Multiply by reciprocal: ${p.n1}/${p.d1} x ${p.d2}/${p.n2} = ${p.rn}/${p.rd}`;
    if (p.type === "f/w") return `Multiply by reciprocal: ${p.n}/${p.d} x 1/${p.w} = ${p.rn}/${p.rd}`;
    if (p.type === "w/f") return `Multiply by reciprocal: ${p.w} x ${p.d}/${p.n} = ${p.rn}/${p.rd}`;
    return "";
  }
  return <SixMastery
    genProblems={() => shuffle([...DIV_POOL]).slice(0, 6)}
    renderProblem={renderDiv}
    gradeProblem={(input, p) => answerOk(input, p.rn, p.rd)}
    workedSolution={workedDiv}
    onCorrect={onCorrect} onWrong={onWrong} useMixed />
}

function MultMixedMastery({ onCorrect, onWrong }) {
  return <SixMastery
    genProblems={() => shuffle([...MIX_MULT_POOL]).slice(0, 6)}
    renderProblem={p => { const { latex } = getDisplay(p); return <KaTeX expr={latex} />; }}
    gradeProblem={(input, p) => answerOk(input, p.rn, p.rd)}
    workedSolution={p => { const { worked } = getDisplay(p); return worked; }}
    onCorrect={onCorrect} onWrong={onWrong} useMixed />
}

function DivMixedMastery({ onCorrect, onWrong }) {
  return <SixMastery
    genProblems={() => shuffle([...MIX_DIV_POOL]).slice(0, 6)}
    renderProblem={p => { const { latex } = getDisplay(p); return <KaTeX expr={latex} />; }}
    gradeProblem={(input, p) => answerOk(input, p.rn, p.rd)}
    workedSolution={p => { const { worked } = getDisplay(p); return worked; }}
    onCorrect={onCorrect} onWrong={onWrong} useMixed />
}

// - Activity 8: Mixed Operations -
function genMixedOps() {
  const fracs = [
    { latex: frac(1, 2), n: 1, d: 1, isNeg: false },
    { latex: frac(2, 3), n: 2, d: 3, isNeg: false },
    { latex: frac(3, 4), n: 3, d: 4, isNeg: false },
    { latex: mixed(1, 1, 2), n: 3, d: 2, isNeg: false },
    { latex: mixed(2, 1, 3), n: 7, d: 3, isNeg: false },
    { latex: mixed(1, 3, 4), n: 7, d: 4, isNeg: false },
  ];
  const probs = [];
  for (let i = 0; i < 4; i++) {
    const [f1, f2, f3] = shuffle([...fracs]).slice(0, 3).map(f => {
      const neg = Math.random() < 0.5;
      return { ...f, neg, n: neg ? -f.n : f.n, latex: neg ? `-${f.latex}` : f.latex };
    });
    const addSub = randChoice(["+", "-"]);
    const multDiv = randChoice(["\\times", "\\div"]);
    const useParens = Math.random() < 0.5;
    // (f1 addSub f2) multDiv f3
    let as_cd = f1.d * f2.d / gcd(Math.abs(f1.d), Math.abs(f2.d));
    const as_n = addSub === "+" ? f1.n * (as_cd / f1.d) + f2.n * (as_cd / f2.d) : f1.n * (as_cd / f1.d) - f2.n * (as_cd / f2.d);
    let rn, rd;
    if (multDiv === "\\times") { rn = as_n * f3.n; rd = as_cd * f3.d; }
    else { rn = as_n * f3.d; rd = as_cd * f3.n; }
    const [fn, fd] = reduce(rn, rd);
    const latex = useParens
      ? `\\left(${f1.latex} ${addSub} ${f2.latex}\\right) ${multDiv} ${f3.latex}`
      : `${f1.latex} ${addSub} ${f2.latex} ${multDiv} ${f3.latex}`;
    probs.push({ latex, rn: fn, rd: fd, answer: fmtAnswer(fn, fd) });
  }
  return probs;
}

function MixedOpsMastery({ onCorrect, onWrong }) {
  const [problems, setProblems] = useState(() => genMixedOps());
  const [answers, setAnswers] = useState(Array(4).fill(""));
  const [feedback, setFeedback] = useState(null);

  const handleSubmit = () => {
    const results = problems.map((p, i) => answerOk(answers[i], p.rn, p.rd));
    const allOk = results.every(Boolean);
    setFeedback({ results, allOk, answers: [...answers] });
    if (allOk) onCorrect(); else onWrong();
  };
  const handleNext = () => { setProblems(genMixedOps()); setAnswers(Array(4).fill("")); setFeedback(null); };
  const allFilled = answers.every(a => a.trim() !== "");

  if (feedback) return (
    <div>
      <div style={{ textAlign: "center", fontSize: 22, fontWeight: 800, color: feedback.allOk ? "var(--green)" : "var(--red)", marginBottom: 12 }}>
        {feedback.allOk ? "All Correct!" : "Incorrect"}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
        {problems.map((p, i) => (
          <div key={i} style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "10px 14px", border: "1px solid " + (feedback.results[i] ? "rgba(22,163,74,0.2)" : "rgba(239,68,68,0.2)") }}>
            <KaTeXBlock expr={p.latex} />
            {!feedback.results[i] && <div style={{ fontSize: 18, color: "var(--red)", marginBottom: 4 }}>You: {feedback.answers[i] || "-"}</div>}
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--green)" }}>Answer: {p.answer}</div>
          </div>
        ))}
      </div>
      <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }} onClick={handleNext}>
        {feedback.allOk ? "Next Set" : "Try New Set"}
      </button>
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
        {problems.map((p, i) => (
          <div key={i} style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "10px 14px" }}>
            <KaTeXBlock expr={p.latex} />
            <input value={answers[i]} onChange={e => setAnswers(prev => prev.map((x, j) => j === i ? e.target.value : x))} placeholder=""
              style={{ textAlign: "center", fontSize: 20, fontFamily: "var(--mono)", fontWeight: 700, padding: "6px 10px", width: "100%", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--surface)" }} />
          </div>
        ))}
      </div>
      <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }} onClick={handleSubmit} disabled={!allFilled}>Submit All</button>
    </div>
  );
}

// - Steps -
const STEPS = [
  { id: "mult-frac",   label: "Multiply Fractions",        description: "All correct to pass. Answer must be in simplest form.", streak: 1 },
  { id: "frac-whole",  label: "Fraction x Whole",          description: "All correct to pass. Answer must be in simplest form.", streak: 1 },
  { id: "reciprocals", label: "Reciprocals",               description: "All correct to pass. Answer must be in simplest form.", streak: 1 },
  { id: "div-frac",    label: "Divide Fractions",          description: "All correct to pass. Answer must be in simplest form.", streak: 1 },
  { id: "mult-mixed",  label: "Multiply Mixed Numbers",    description: "All correct to pass. Answer must be in simplest form.", streak: 1 },
  { id: "div-mixed",   label: "Divide Mixed Numbers",      description: "All correct to pass. Answer must be in simplest form.", streak: 1 },
  { id: "mixed-ops",   label: "Mixed Operations",          description: "All correct to pass. Answer must be in simplest form.", streak: 1 },
];

export default function Lesson16MasteryPlayer({ user, topic, onHome }) {
  const topicId = topic?.id || LESSON16_MASTERY_TOPIC_ID;
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

  const handleCorrect = async () => { const nx = stepIdx + 1; await save(nx, 0, nx >= STEPS.length); };
  const handleWrong = async () => { await save(stepIdx, 0, false); };

  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><div className="spinner" /></div>;
  if (completed) return (
    <div style={{ maxWidth: 520, margin: "0 auto", textAlign: "center" }}>
      <div className="card">
        <div style={{ fontSize: 48, fontWeight: 900, color: "var(--amber)", marginBottom: 16 }}>100%</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>HW 16 (019) Complete!</h2>
        <p style={{ fontSize: 20, color: "var(--text2)", marginBottom: 24 }}>Multiplying and dividing fractions mastered!</p>
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
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,var(--blue),var(--orange))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "#fff" }}>L16</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 22 }}>HW 16 (019): Mastery Activities</div>
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
          {step.id === "mult-frac"   && <MultFracMastery   key={stepIdx} onCorrect={handleCorrect} onWrong={handleWrong} />}
          {step.id === "frac-whole"  && <FracWholeMastery  key={stepIdx} onCorrect={handleCorrect} onWrong={handleWrong} />}
          {step.id === "reciprocals" && <ReciprocalMastery key={stepIdx} onCorrect={handleCorrect} onWrong={handleWrong} />}
          {step.id === "div-frac"    && <DivFracMastery    key={stepIdx} onCorrect={handleCorrect} onWrong={handleWrong} />}
          {step.id === "mult-mixed"  && <MultMixedMastery  key={stepIdx} onCorrect={handleCorrect} onWrong={handleWrong} />}
          {step.id === "div-mixed"   && <DivMixedMastery   key={stepIdx} onCorrect={handleCorrect} onWrong={handleWrong} />}
          {step.id === "mixed-ops"   && <MixedOpsMastery   key={stepIdx} onCorrect={handleCorrect} onWrong={handleWrong} />}
        </div>
      </div>
    </div>
  );
}

// - Standalone Multiplying with Zeros Player -
export function MultZerosPlayer({ user, topic, onHome }) {
  const topicId = topic?.id || MULT_ZEROS_TOPIC_ID;
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  useEffect(() => { getProgress(user.id, topicId).then(prog => { if (prog?.data?.completed) setCompleted(true); setLoading(false); }); }, []);
  const handleComplete = async () => { await fbSaveProgress(user.id, topicId, { started: true, completed: true, percentComplete: 100, data: { completed: true } }); setCompleted(true); };
  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><div className="spinner" /></div>;
  if (completed) return (
    <div style={{ maxWidth: 520, margin: "0 auto", textAlign: "center" }}>
      <div className="card">
        <div style={{ fontSize: 48, fontWeight: 900, color: "var(--amber)", marginBottom: 16 }}>100%</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Multiplying with Zeros Complete!</h2>
        <button className="btn btn-primary btn-lg" style={{ width: "100%" }} onClick={onHome}>Back to Home</button>
      </div>
    </div>
  );
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "clamp(16px,3vw,32px)" }} className="dot-bg">
      <div style={{ maxWidth: 580, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,var(--blue),var(--orange))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "#fff" }}>16</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 22 }}>Multiplying with Zeros</div>
              <div style={{ fontSize: 20, color: "var(--text3)" }}>8-second timed drill, 3 in a row</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onHome}>Back</button>
        </div>
        <div className="card"><MultZerosMastery onComplete={handleComplete} /></div>
      </div>
    </div>
  );
}

