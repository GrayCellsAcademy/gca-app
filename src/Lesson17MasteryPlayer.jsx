import { useState, useEffect, useRef } from "react";
import { saveProgress as fbSaveProgress, getProgress } from "./core/firebase";

export const LESSON17_MASTERY_TOPIC_ID = "lesson17-mastery-v1";
export const DIV_ZEROS_TOPIC_ID = "div-zeros-v1";

const TIMER = 8;

// -- Math helpers --
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randChoice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function shuffle(arr) { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); return b === 0 ? a : gcd(b, a % b); }
function reduce(n, d) { if (n === 0) return [0, 1]; const g = gcd(Math.abs(n), Math.abs(d)); return [n / g, d / g]; }

function fmtFrac(n, d) {
  const [rn, rd] = reduce(n, d);
  if (rd === 1) return String(rn);
  if (Math.abs(rn) > rd) {
    const sign = rn < 0 ? "-" : "";
    const w = Math.floor(Math.abs(rn) / rd);
    const r = Math.abs(rn) % rd;
    return r === 0 ? `${sign}${w}` : `${sign}${w} ${r}/${rd}`;
  }
  return `${rn}/${rd}`;
}

function parseFrac(str) {
  const s = String(str || "").trim();
  if (!s) return null;
  const neg = s.startsWith("-"); const abs = neg ? s.slice(1).trim() : s;
  const mx = abs.replace(/\s*-\s*/g, " ").match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mx) { const num = parseInt(mx[1]) * parseInt(mx[3]) + parseInt(mx[2]); return { num: neg ? -num : num, den: parseInt(mx[3]) }; }
  const fx = abs.match(/^(\d+)\/(\d+)$/);
  if (fx) return { num: neg ? -parseInt(fx[1]) : parseInt(fx[1]), den: parseInt(fx[2]) };
  const ix = abs.match(/^(\d+)$/);
  if (ix) return { num: neg ? -parseInt(ix[1]) : parseInt(ix[1]), den: 1 };
  return null;
}

function fracOk(input, rn, rd) {
  const p = parseFrac(input); if (!p) return false;
  const [in_, id_] = reduce(p.num, p.den); const [cn, cd] = reduce(rn, rd);
  return in_ === cn && id_ === cd;
}

function fmtAlg(coeff, exp) {
  if (exp === 0) return String(coeff);
  const x = exp === 1 ? "x" : `x^${exp}`;
  const c = coeff === 1 ? "" : String(coeff);
  return `${c}${x}`;
}

function parseAlg(str) {
  const s = String(str || "").trim().replace(/\s+/g, "").replace(/\*/g, "");
  if (/^-?\d+$/.test(s)) return { coeff: parseInt(s), exp: 0 };
  if (/^x$/.test(s)) return { coeff: 1, exp: 1 };
  const cxm = s.match(/^(\d+)x$/); if (cxm) return { coeff: parseInt(cxm[1]), exp: 1 };
  const xpm = s.match(/^x\^(\d+)$/); if (xpm) return { coeff: 1, exp: parseInt(xpm[1]) };
  const cxpm = s.match(/^(\d+)x\^(\d+)$/); if (cxpm) return { coeff: parseInt(cxpm[1]), exp: parseInt(cxpm[2]) };
  return null;
}

function algOk(input, coeff, exp) {
  const p = parseAlg(input); if (!p) return false;
  return p.coeff === coeff && p.exp === exp;
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
  return <div ref={ref} style={{ fontSize: 24, margin: "6px 0", minHeight: 36 }} />;
}
function frac(n, d) { return `\\dfrac{${n}}{${d}}`; }
function algKatex(coeff, exp) {
  if (exp === 0) return String(coeff);
  const x = exp === 1 ? "x" : `x^{${exp}}`;
  const c = coeff === 1 ? "" : String(coeff);
  return `${c}${x}`;
}
function quotKatex(c1, e1, c2, e2) {
  const n = c1 === 1 ? (e1 === 1 ? "x" : `x^{${e1}}`) : `${c1}${e1 === 1 ? "x" : `x^{${e1}}`}`;
  const d = c2 === 1 ? (e2 === 1 ? "x" : `x^{${e2}}`) : `${c2}${e2 === 1 ? "x" : `x^{${e2}}`}`;
  return `\\dfrac{${n}}{${d}}`;
}
function exprKatex(s) {
  // Convert "12x^2 - 18x" style to katex
  return s.replace(/x\^(\d+)/g, (_, e) => `x^{${e}}`);
}
function eqKatex(s) {
  // Convert "(a/b)x" -> "\left(\dfrac{a}{b}\right)x" for proper sized parens
  const bs = "\\";
  let r = String(s);
  r = r.replace(/x\^(\d+)/g, (_, e) => `x^{${e}}`);
  // Replace "(n/d)" with \left(\dfrac{n}{d}\right)
  r = r.replace(/\((\d+)\/(\d+)\)/g, (_, n, d) => `${bs}left(${bs}dfrac{${n}}{${d}}${bs}right)`);
  // Replace remaining n/d not in parens
  r = r.replace(/(\d+)\/(\d+)/g, (_, n, d) => `${bs}dfrac{${n}}{${d}}`);
  return r;
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

// -- Six-problem mastery component --
function SixMastery({ problems, renderProblem, gradeProblem, workedSolution, onCorrect, onWrong }) {
  const [answers, setAnswers] = useState(Array(6).fill(""));
  const [feedback, setFeedback] = useState(null);

  const handleSubmit = () => {
    const results = problems.map((p, i) => { try { return gradeProblem(answers[i], p); } catch { return false; } });
    const allOk = results.every(Boolean);
    setFeedback({ results, allOk, answers: [...answers] });
  };

  const handleNext = () => {
    const wasOk = feedback?.allOk;
    setAnswers(Array(6).fill("")); setFeedback(null);
    if (wasOk) onCorrect(); else onWrong();
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
              {!ok && ws && <div style={{ fontSize: 17, color: "var(--text2)", marginBottom: 4, fontFamily: "var(--mono)", whiteSpace: "pre-line" }}>{ws}</div>}
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--green)" }}>Answer: <span style={{ fontFamily: "var(--mono)" }}>{p.answer}</span></div>
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
            <input value={answers[i]} onChange={e => setAnswers(prev => prev.map((x, j) => j === i ? e.target.value : x))}
              placeholder=""
              style={{ textAlign: "center", fontSize: 20, fontFamily: "var(--mono)", fontWeight: 700, padding: "6px 10px", width: "100%", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--surface)" }} />
          </div>
        ))}
      </div>
      <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }} onClick={handleSubmit} disabled={!allFilled}>Submit All</button>
    </div>
  );
}

// -- Activity 1: Division with Zeros --
function genDivZeros() {
  const a = randInt(1, 9), b = randInt(1, 9);
  const k = randChoice([2, 3, 4]);
  const m = randChoice([0, 1, 2].filter(v => v <= k));
  const dividend = a * b * Math.pow(10, k);
  const divisor = b * Math.pow(10, m);
  const quotient = a * Math.pow(10, k - m);
  const explanation = `${a} x ${b} = ${a * b}, and ${k} - ${m} = ${k - m} zeros\n${a * b} x 10^${k} / (${b} x 10^${m}) = ${a} x 10^${k - m} = ${quotient}`;
  return { dividend, divisor, quotient, a, b, k, m, explanation };
}

function DivZerosTutorial({ onStart }) {
  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 16 }}>How to Divide Numbers with Zeros</div>
      <div style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "16px", marginBottom: 16, fontSize: 20, lineHeight: 1.7 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Rule: Divide the non-zero parts, then subtract the zeros (exponents).</div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Example 1: 600 - 30</div>
          <div>Step 1: 6 - 3 = 2</div>
          <div>Step 2: 600 = 6 x 10-, 30 = 3 x 10-, subtract: 10- - 10- = 10-</div>
          <div style={{ color: "var(--green)", fontWeight: 700 }}>Answer: 2 x 10 = 20</div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Example 2: 4,000 - 200</div>
          <div>Step 1: 4 - 2 = 2</div>
          <div>Step 2: 4,000 = 4 x 10-, 200 = 2 x 10-, subtract: 10- - 10- = 10-</div>
          <div style={{ color: "var(--green)", fontWeight: 700 }}>Answer: 2 x 10 = 20</div>
        </div>
        <div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Example 3: 56,000 - 700</div>
          <div>Step 1: 56 - 7 = 8</div>
          <div>Step 2: 10- - 10- = 10-</div>
          <div style={{ color: "var(--green)", fontWeight: 700 }}>Answer: 8 x 100 = 800</div>
        </div>
      </div>
      <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }} onClick={onStart}>Start Drill</button>
    </div>
  );
}

function DivZerosMastery({ onComplete }) {
  const [showTutorial, setShowTutorial] = useState(true);
  const [q, setQ] = useState(() => genDivZeros());
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
    setFeedback({ correct: false, msg: `Answer: ${q.quotient}\n${q.explanation}` });
    setStreak(0);
  };

  const handleSubmit = () => {
    clearInterval(timerRef.current);
    const val = parseInt(String(input).replace(/,/g, "").trim());
    const ok = val === q.quotient;
    setFeedback({ correct: ok, msg: ok ? `${q.dividend} / ${q.divisor} = ${q.quotient}` : `Answer: ${q.quotient}\n${q.explanation}` });
    if (ok) { if (streak + 1 >= 3) { setTimeout(onComplete, 300); } else setStreak(s => s + 1); }
    else setStreak(0);
  };

  const handleNext = () => {
    setFeedback(null); setInput(""); setQ(genDivZeros()); setTimeLeft(TIMER);
    setTimeout(() => inputRef.current?.focus(), 80);
  };

  if (showTutorial) return <DivZerosTutorial onStart={() => setShowTutorial(false)} />;

  const pct = (timeLeft / TIMER) * 100;
  const color = timeLeft <= 2 ? "var(--red)" : timeLeft <= 4 ? "var(--amber)" : "var(--green)";
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
      <div style={{ display: "flex", gap: 5, marginBottom: 14 }}>
        {[0, 1, 2].map(i => <div key={i} style={{ width: 13, height: 13, borderRadius: "50%", background: i < streak ? "var(--green)" : "var(--surface2)", border: "2px solid " + (i < streak ? "var(--green)" : "var(--border2)") }} />)}
        <span style={{ fontSize: 19, color: "var(--text3)", marginLeft: 6 }}>{streak}/3</span>
      </div>
      <KaTeXBlock expr={`${q.dividend.toLocaleString()} \\div ${q.divisor.toLocaleString()}`} />
      {feedback ? (
        <div style={{ textAlign: "center", marginTop: 10 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: feedback.correct ? "var(--green)" : "var(--red)", marginBottom: 10 }}>{feedback.correct ? "Correct!" : "Incorrect"}</div>
          <div style={{ fontSize: 19, color: "var(--text2)", marginBottom: 14, background: feedback.correct ? "rgba(22,163,74,0.06)" : "rgba(239,68,68,0.06)", border: "1px solid " + (feedback.correct ? "rgba(22,163,74,0.2)" : "rgba(239,68,68,0.2)"), borderRadius: "var(--radius-sm)", padding: "10px 16px", textAlign: "left", fontFamily: "var(--mono)", whiteSpace: "pre-line" }}>{feedback.msg}</div>
          <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }} onClick={handleNext}>Next Problem</button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && input.trim() && handleSubmit()} placeholder="Enter answer" autoFocus
            style={{ textAlign: "center", fontSize: 22, fontFamily: "var(--mono)", fontWeight: 700, padding: "10px", width: 180 }} />
          <button className="btn btn-primary" style={{ fontSize: 20, padding: "10px 20px" }} onClick={handleSubmit} disabled={!input.trim()}>OK</button>
        </div>
      )}
    </div>
  );
}

// -- Activity 2: Quotient Rule --
const QUOT_POOL = [
  { c1: 12, e1: 7, c2: 4, e2: 3, rc: 3, re: 4 }, { c1: 15, e1: 8, c2: 5, e2: 3, rc: 3, re: 5 },
  { c1: 18, e1: 9, c2: 6, e2: 4, rc: 3, re: 5 }, { c1: 20, e1: 8, c2: 4, e2: 2, rc: 5, re: 6 },
  { c1: 24, e1: 7, c2: 8, e2: 3, rc: 3, re: 4 }, { c1: 10, e1: 6, c2: 2, e2: 2, rc: 5, re: 4 },
  { c1: 9, e1: 8, c2: 3, e2: 5, rc: 3, re: 3 }, { c1: 16, e1: 7, c2: 4, e2: 3, rc: 4, re: 4 },
  { c1: 21, e1: 9, c2: 7, e2: 4, rc: 3, re: 5 }, { c1: 8, e1: 5, c2: 4, e2: 1, rc: 2, re: 4 },
  { c1: 30, e1: 8, c2: 6, e2: 3, rc: 5, re: 5 }, { c1: 6, e1: 6, c2: 2, e2: 2, rc: 3, re: 4 },
];

function genQuotProblems() {
  return shuffle([...QUOT_POOL]).slice(0, 6);
}

function QuotMastery({ onCorrect, onWrong }) {
  const [problems, setProblems] = useState(() => genQuotProblems());
  return (
    <SixMastery
      problems={problems}
      renderProblem={p => <KaTeX expr={quotKatex(p.c1, p.e1, p.c2, p.e2)} />}
      gradeProblem={(input, p) => algOk(input, p.rc, p.re)}
      workedSolution={p => `Coefficients: ${p.c1} / ${p.c2} = ${p.rc}\nExponents: ${p.e1} - ${p.e2} = ${p.re}\nAnswer: ${fmtAlg(p.rc, p.re)}`}
      onCorrect={() => { setProblems(genQuotProblems()); onCorrect(); }}
      onWrong={() => { setProblems(genQuotProblems()); onWrong(); }}
    />
  );
}

// -- Activity 3: Factoring GCF --
const FACTOR_POOL = [
  { expr: "12x + 18", gcfC: 6, gcfE: 0, aA: 2, aB: 3, answer: "6(2x+3)" },
  { expr: "8x - 20", gcfC: 4, gcfE: 0, aA: 2, aB: -5, answer: "4(2x-5)" },
  { expr: "15x + 25", gcfC: 5, gcfE: 0, aA: 3, aB: 5, answer: "5(3x+5)" },
  { expr: "9x^2 - 6x", gcfC: 3, gcfE: 1, aA: 3, aB: -2, answer: "3x(3x-2)" },
  { expr: "24x^2 + 16x", gcfC: 8, gcfE: 1, aA: 3, aB: 2, answer: "8x(3x+2)" },
  { expr: "14x - 21", gcfC: 7, gcfE: 0, aA: 2, aB: -3, answer: "7(2x-3)" },
  { expr: "10x^2 - 15x", gcfC: 5, gcfE: 1, aA: 2, aB: -3, answer: "5x(2x-3)" },
  { expr: "21x^2 - 14x", gcfC: 7, gcfE: 1, aA: 3, aB: -2, answer: "7x(3x-2)" },
  { expr: "16x + 20", gcfC: 4, gcfE: 0, aA: 4, aB: 5, answer: "4(4x+5)" },
  { expr: "12x^2 + 8x", gcfC: 4, gcfE: 1, aA: 3, aB: 2, answer: "4x(3x+2)" },
  { expr: "18x - 12", gcfC: 6, gcfE: 0, aA: 3, aB: -2, answer: "6(3x-2)" },
  { expr: "25x + 15", gcfC: 5, gcfE: 0, aA: 5, aB: 3, answer: "5(5x+3)" },
  { expr: "14x^2 - 28x", gcfC: 14, gcfE: 1, aA: 1, aB: -2, answer: "14x(x-2)" },
  { expr: "30x - 18", gcfC: 6, gcfE: 0, aA: 5, aB: -3, answer: "6(5x-3)" },
  { expr: "20x^2 + 12x", gcfC: 4, gcfE: 1, aA: 5, aB: 3, answer: "4x(5x+3)" },
  { expr: "9x - 15", gcfC: 3, gcfE: 0, aA: 3, aB: -5, answer: "3(3x-5)" },
];

function genFactorSet() {
  // Ensure no two problems have the same inner expression (aA,aB pair)
  const shuffled = shuffle([...FACTOR_POOL]);
  const seen = new Set(); const result = [];
  for (const p of shuffled) {
    const key = `${p.aA},${p.aB}`;
    if (!seen.has(key)) { seen.add(key); result.push(p); }
    if (result.length === 6) break;
  }
  return result;
}

function parseFactored(str) {
  const s = String(str || "").trim().replace(/\s+/g, "").replace(/\u2013/g, "-").replace(/\u2212/g, "-");
  const mx2 = s.match(/^(\d+)x\((-?\d+)x([+-]\d+)\)$/);
  if (mx2) return { gcfC: parseInt(mx2[1]), gcfE: 1, aA: parseInt(mx2[2]), aB: parseInt(mx2[3]) };
  const mx1 = s.match(/^(\d+)\((-?\d+)x([+-]\d+)\)$/);
  if (mx1) return { gcfC: parseInt(mx1[1]), gcfE: 0, aA: parseInt(mx1[2]), aB: parseInt(mx1[3]) };
  const mx0 = s.match(/^(\d+)\(x([+-]\d+)\)$/);
  if (mx0) return { gcfC: parseInt(mx0[1]), gcfE: 0, aA: 1, aB: parseInt(mx0[2]) };
  const mx3 = s.match(/^(\d+)x\(x([+-]\d+)\)$/);
  if (mx3) return { gcfC: parseInt(mx3[1]), gcfE: 1, aA: 1, aB: parseInt(mx3[2]) };
  return null;
}

function factoredOk(input, p) {
  const f = parseFactored(input); if (!f) return false;
  return f.gcfC === p.gcfC && f.gcfE === p.gcfE && f.aA === p.aA && f.aB === p.aB;
}

function FactorMastery({ onCorrect, onWrong }) {
  const [problems, setProblems] = useState(() => genFactorSet());
  return (
    <SixMastery
      problems={problems}
      renderProblem={p => <KaTeX expr={exprKatex(p.expr)} />}
      gradeProblem={(input, p) => factoredOk(input, p)}
      workedSolution={p => {
        const gcf = p.gcfE === 0 ? String(p.gcfC) : `${p.gcfC}x`;
        return `GCF = ${gcf}\nFactor out: ${p.answer}`;
      }}
      onCorrect={() => { setProblems(genFactorSet()); onCorrect(); }}
      onWrong={() => { setProblems(genFactorSet()); onWrong(); }}
    />
  );
}

// -- Activities 4 & 5: Clearing Denominators --
const CLEAR_INT_POOL = [
  { eq: "(1/2)x + (1/4) = (3/4)", lcd: 4, cleared: "2x + 1 = 3", xNum: 1, xDen: 1, answer: "1" },
  { eq: "(2/3)x - (1/6) = (1/2)", lcd: 6, cleared: "4x - 1 = 3", xNum: 1, xDen: 1, answer: "1" },
  { eq: "(3/4)x + (1/4) = 1", lcd: 4, cleared: "3x + 1 = 4", xNum: 1, xDen: 1, answer: "1" },
  { eq: "(1/5)x - (1/10) = (1/10)", lcd: 10, cleared: "2x - 1 = 1", xNum: 1, xDen: 1, answer: "1" },
  { eq: "(1/3)x + (1/6) = (1/2)", lcd: 6, cleared: "2x + 1 = 3", xNum: 1, xDen: 1, answer: "1" },
  { eq: "(3/4)x - (1/2) = (1/4)", lcd: 4, cleared: "3x - 2 = 1", xNum: 1, xDen: 1, answer: "1" },
  { eq: "(2/5)x + (1/5) = 1", lcd: 5, cleared: "2x + 1 = 5", xNum: 2, xDen: 1, answer: "2" },
  { eq: "(1/2)x - (1/3) = (1/6)", lcd: 6, cleared: "3x - 2 = 1", xNum: 1, xDen: 1, answer: "1" },
  { eq: "(2/3)x + (1/3) = (5/3)", lcd: 3, cleared: "2x + 1 = 5", xNum: 2, xDen: 1, answer: "2" },
  { eq: "(3/5)x - (1/5) = 1", lcd: 5, cleared: "3x - 1 = 5", xNum: 2, xDen: 1, answer: "2" },
];

const CLEAR_FRAC_POOL = [
  // All equations have NO two fractions sharing the same denominator
  // Fractional x solutions
  { eq: "(1/2)x + (1/3) = (3/4)", lcd: 12, cleared: "6x + 4 = 9", xNum: 5, xDen: 6, answer: "5/6" },
  { eq: "(2/3)x - (1/4) = (5/6)", lcd: 12, cleared: "8x - 3 = 10", xNum: 13, xDen: 8, answer: "1 5/8" },
  { eq: "(3/4)x - (1/3) = (5/6)", lcd: 12, cleared: "9x - 4 = 10", xNum: 14, xDen: 9, answer: "1 5/9" },
  { eq: "(2/5)x - (1/2) = (1/3)", lcd: 30, cleared: "12x - 15 = 10", xNum: 25, xDen: 12, answer: "2 1/12" },
  { eq: "(1/4)x + (1/3) = (5/6)", lcd: 12, cleared: "3x + 4 = 10", xNum: 2, xDen: 1, answer: "2" },
  { eq: "(3/5)x - (1/4) = (1/2)", lcd: 20, cleared: "12x - 5 = 10", xNum: 5, xDen: 4, answer: "1 1/4" },
  { eq: "(1/6)x + (1/4) = (5/12)", lcd: 12, cleared: "2x + 3 = 5", xNum: 1, xDen: 1, answer: "1" },
  { eq: "(5/6)x - (1/4) = (1/3)", lcd: 12, cleared: "10x - 3 = 4", xNum: 7, xDen: 10, answer: "7/10" },
  { eq: "(1/3)x + (1/2) = (5/4)", lcd: 12, cleared: "4x + 6 = 15", xNum: 9, xDen: 4, answer: "2 1/4" },
  { eq: "(3/4)x - (1/6) = (1/3)", lcd: 12, cleared: "9x - 2 = 4", xNum: 2, xDen: 3, answer: "2/3" },
  { eq: "(2/3)x + (1/4) = (5/6)", lcd: 12, cleared: "8x + 3 = 10", xNum: 7, xDen: 8, answer: "7/8" },
  { eq: "(1/2)x - (1/5) = (3/10)", lcd: 10, cleared: "5x - 2 = 3", xNum: 1, xDen: 1, answer: "1" },
  { eq: "(4/5)x + (1/3) = (17/15)", lcd: 15, cleared: "12x + 5 = 17", xNum: 1, xDen: 1, answer: "1" },
  { eq: "(1/4)x - (1/6) = (1/3)", lcd: 12, cleared: "3x - 2 = 4", xNum: 2, xDen: 1, answer: "2" },
];

function genClearFracSet() {
  // Pick 6: ~60% fraction solutions, ~40% integer
  const fracSols = CLEAR_FRAC_POOL.filter(p => p.xDen !== 1);
  const intSols = CLEAR_FRAC_POOL.filter(p => p.xDen === 1);
  const picked = [...shuffle([...fracSols]).slice(0, 4), ...shuffle([...intSols]).slice(0, 2)];
  return shuffle(picked);
}

function ClearDenomMastery({ pool, genFn, onCorrect, onWrong }) {
  const gen = genFn || (() => shuffle([...pool]).slice(0, 6));
  const [problems, setProblems] = useState(() => gen());
  return (
    <SixMastery
      problems={problems}
      renderProblem={p => <KaTeX expr={eqKatex(p.eq)} />}
      gradeProblem={(input, p) => fracOk(input, p.xNum, p.xDen)}
      workedSolution={p => `LCD = ${p.lcd}\nMultiply through: ${p.cleared}\nSolve: x = ${p.answer}`}
      onCorrect={() => { setProblems(gen()); onCorrect(); }}
      onWrong={() => { setProblems(gen()); onWrong(); }}
    />
  );
}

// -- Steps --
const STEPS = [
  { id: "quotient", label: "Quotient Rule", description: "All correct to pass. Enter simplified expression." },
  { id: "factor", label: "Factoring GCF", description: "All correct to pass. Enter factored form e.g. 3x(2x+5)." },
  { id: "clear-frac", label: "Clear Denominators", description: "All correct to pass. Enter value of x. No two fractions in an equation share the same denominator." },
];

export default function Lesson17MasteryPlayer({ user, topic, onHome }) {
  const topicId = topic?.id || LESSON17_MASTERY_TOPIC_ID;
  const [loading, setLoading] = useState(true);
  const [stepIdx, setStepIdx] = useState(0);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    getProgress(user.id, topicId).then(prog => {
      if (prog?.data?.completed) { setCompleted(true); setLoading(false); return; }
      if (prog?.data?.stepIdx !== undefined) setStepIdx(prog.data.stepIdx);
      setLoading(false);
    });
  }, []);

  const save = async (si, done) => {
    const pct = done ? 100 : Math.min(100, Math.round((si / STEPS.length) * 100));
    await fbSaveProgress(user.id, topicId, { started: true, completed: done, percentComplete: pct, data: { stepIdx: si, completed: done } });
    setStepIdx(si); if (done) setCompleted(true);
  };

  const handleCorrect = async () => { const nx = stepIdx + 1; await save(nx, nx >= STEPS.length); };
  const handleWrong = async () => { await save(stepIdx, false); };

  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><div className="spinner" /></div>;
  if (completed) return (
    <div style={{ maxWidth: 520, margin: "0 auto", textAlign: "center" }}>
      <div className="card">
        <div style={{ fontSize: 48, fontWeight: 900, color: "var(--amber)", marginBottom: 16 }}>100%</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>HW 17 (019) Complete!</h2>
        <p style={{ fontSize: 20, color: "var(--text2)", marginBottom: 24 }}>Quotient rule, factoring GCF, and solving equations mastered!</p>
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
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,var(--blue),var(--orange))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "#fff" }}>L17</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 22 }}>HW 17 (019): Mastery Activities</div>
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
          {step.id === "quotient"   && <QuotMastery     key={stepIdx} onCorrect={handleCorrect} onWrong={handleWrong} />}
          {step.id === "factor"     && <FactorMastery   key={stepIdx} onCorrect={handleCorrect} onWrong={handleWrong} />}
          {step.id === "clear-frac" && <ClearDenomMastery key={stepIdx} genFn={genClearFracSet} onCorrect={handleCorrect} onWrong={handleWrong} />}
        </div>
      </div>
    </div>
  );
}

// -- Standalone Division with Zeros Player --
export function DivZerosPlayer({ user, topic, onHome }) {
  const topicId = topic?.id || DIV_ZEROS_TOPIC_ID;
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  useEffect(() => { getProgress(user.id, topicId).then(prog => { if (prog?.data?.completed) setCompleted(true); setLoading(false); }); }, []);
  const handleComplete = async () => { await fbSaveProgress(user.id, topicId, { started: true, completed: true, percentComplete: 100, data: { completed: true } }); setCompleted(true); };
  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><div className="spinner" /></div>;
  if (completed) return (
    <div style={{ maxWidth: 520, margin: "0 auto", textAlign: "center" }}>
      <div className="card">
        <div style={{ fontSize: 48, fontWeight: 900, color: "var(--amber)", marginBottom: 16 }}>100%</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Division with Zeros Complete!</h2>
        <button className="btn btn-primary btn-lg" style={{ width: "100%" }} onClick={onHome}>Back to Home</button>
      </div>
    </div>
  );
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "clamp(16px,3vw,32px)" }} className="dot-bg">
      <div style={{ maxWidth: 580, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,var(--blue),var(--orange))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "#fff" }}>17</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 22 }}>Division with Zeros</div>
              <div style={{ fontSize: 20, color: "var(--text3)" }}>8-second timed drill, 3 in a row</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onHome}>Back</button>
        </div>
        <div className="card"><DivZerosMastery onComplete={handleComplete} /></div>
      </div>
    </div>
  );
}

