import { useState, useEffect, useRef } from "react";
import { saveProgress as fbSaveProgress, getProgress } from "./core/firebase";

export const LESSON19_MASTERY_TOPIC_ID = "lesson19-mastery-v1";
export const FRAC_DEC_DRILL_TOPIC_ID = "frac-dec-drill-v1";

// -- Math helpers --
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randChoice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function shuffle(arr) { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); return b === 0 ? a : gcd(b, a % b); }
function reduce(n, d) { if (n === 0) return [0, 1]; const g = gcd(Math.abs(n), Math.abs(d)); return [n / g, d / g]; }

function fmtDec(n) { return String(parseFloat(n.toPrecision(10))); }
function decOk(input, correct) {
  const v = parseFloat(String(input || "").trim().replace(/,/g, ""));
  return !isNaN(v) && Math.abs(v - correct) < 1e-9;
}
function fracOk(input, rn, rd) {
  const s = String(input || "").trim();
  const neg = s.startsWith("-"); const abs = neg ? s.slice(1).trim() : s;
  const mx = abs.replace(/\s*-\s*/g, " ").match(/^(\d+)\s+(\d+)\/(\d+)$/);
  let num, den;
  if (mx) { num = parseInt(mx[1]) * parseInt(mx[3]) + parseInt(mx[2]); den = parseInt(mx[3]); }
  else { const fx = abs.match(/^(\d+)\/(\d+)$/); if (fx) { num = parseInt(fx[1]); den = parseInt(fx[2]); } else { const ix = abs.match(/^(\d+)$/); if (ix) { num = parseInt(ix[1]); den = 1; } else return false; } }
  if (neg) num = -num;
  const [in_, id_] = reduce(num, den); const [cn, cd] = reduce(rn, rd);
  return in_ === cn && id_ === cd;
}

function gradeRepeatingLike(input, displayAnswer) {
  const s = String(input || "").trim().replace(/\s+/g, "");
  if (!s) return false;
  const dm = displayAnswer.match(/^(.*)\[(.+)\](.*)$/);
  if (!dm) return decOk(input, parseFloat(displayAnswer));
  const base = dm[1], period = dm[2];
  if (s === displayAnswer) return true;
  const bm = s.match(/^(.*)\[(.+)\](.*)$/);
  if (bm && bm[1] === base && bm[2] === period) return true;
  if (s.startsWith(base + period)) return true;
  const alts = [base + period + "...", base + period.repeat(2) + "...", base + period.repeat(3) + "..."];
  if (alts.some(a => s === a)) return true;
  return false;
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
  return <div ref={ref} style={{ fontSize: 26, margin: "8px 0", minHeight: 36 }} />;
}
function frac(n, d) { return `\\dfrac{${n}}{${d}}`; }
function bracketToKatex(str) {
  const bs = "\\";
  const m = String(str || "").match(/^(.*)\[(.+)\](.*)$/);
  if (!m) return str;
  return `${m[1]}${bs}overline{${m[2]}}${m[3]}`;
}

// -- Shared --
function SixMastery({ problems, renderProblem, gradeProblem, workedSolution, onCorrect, onWrong, useRepInput }) {
  const [answers, setAnswers] = useState(Array(6).fill(""));
  const [texts, setTexts] = useState(Array(6).fill(""));
  const [feedback, setFeedback] = useState(null);

  const handleSelect = (i) => {
    const el = document.getElementById(`sm-input-${i}`);
    if (!el) return;
    const s = el.selectionStart, e2 = el.selectionEnd;
    if (s !== null && e2 !== null && s < e2) {
      const t = texts[i];
      const fmt = t.slice(0, s) + "[" + t.slice(s, e2) + "]" + t.slice(e2);
      setAnswers(prev => prev.map((x, j) => j === i ? fmt : x));
    }
  };

  const handleSubmit = () => {
    const results = problems.map((p, i) => { try { return gradeProblem(answers[i], p); } catch { return false; } });
    const allOk = results.every(Boolean);
    setFeedback({ results, allOk, answers: [...answers] });
  };

  const handleNext = () => {
    const wasOk = feedback?.allOk;
    setAnswers(Array(6).fill("")); setTexts(Array(6).fill("")); setFeedback(null);
    if (wasOk) onCorrect(); else onWrong();
  };

  function renderAnswer(ans, da) {
    if (!ans || !da) return <span style={{ fontFamily: "var(--mono)", fontWeight: 700 }}>{da || ans}</span>;
    if (da.includes("[")) return <KaTeX expr={bracketToKatex(da)} />;
    return <span style={{ fontFamily: "var(--mono)", fontWeight: 700 }}>{da}</span>;
  }

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
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--green)" }}>Answer: {renderAnswer(feedback.answers[i], p.displayAnswer || fmtDec(p.answer || 0))}</div>
            </div>
          );
        })}
      </div>
      <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }} onClick={handleNext}>{feedback.allOk ? "Next Set" : "Try New Set"}</button>
    </div>
  );

  const allFilled = answers.every(a => a.trim() !== "");
  return (
    <div>
      {useRepInput && (
        <div style={{ background: "rgba(27,143,255,0.06)", border: "1px solid rgba(27,143,255,0.2)", borderRadius: "var(--radius-sm)", padding: "8px 12px", marginBottom: 10, fontSize: 17, color: "var(--text2)" }}>
          For repeating decimals: type the number, highlight the repeating digits, then press the <span style={{ fontFamily: "var(--mono)", fontWeight: 900, borderTop: "2px solid currentColor", paddingTop: 1 }}>abc</span> button.
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
        {problems.map((p, i) => (
          <div key={i} style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "10px 14px" }}>
            <div style={{ marginBottom: 8 }}>{renderProblem(p)}</div>
            {useRepInput ? (
              <div>
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
                  <input id={`sm-input-${i}`} value={texts[i]}
                    onChange={e => { setTexts(prev => prev.map((x, j) => j === i ? e.target.value : x)); setAnswers(prev => prev.map((x, j) => j === i ? e.target.value : x)); }}
                    placeholder=""
                    style={{ textAlign: "center", fontSize: 19, fontFamily: "var(--mono)", fontWeight: 700, padding: "6px 8px", flex: 1, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--surface)" }} />
                  <button title="Mark selection as repeating" onClick={() => handleSelect(i)}
                    style={{ padding: "5px 10px", fontSize: 17, fontFamily: "var(--mono)", fontWeight: 900, border: "2px solid var(--border)", borderRadius: "var(--radius-sm)", background: "var(--surface)", cursor: "pointer" }}>
                    <span style={{ borderTop: "2px solid currentColor", paddingTop: 1 }}>abc</span>
                  </button>
                </div>
                {answers[i] !== texts[i] && answers[i] && (
                  <div style={{ fontSize: 16, color: "var(--text3)" }}>Preview: <KaTeX expr={bracketToKatex(answers[i])} /></div>
                )}
              </div>
            ) : (
              <input value={answers[i]} onChange={e => setAnswers(prev => prev.map((x, j) => j === i ? e.target.value : x))}
                placeholder=""
                style={{ textAlign: "center", fontSize: 20, fontFamily: "var(--mono)", fontWeight: 700, padding: "6px 10px", width: "100%", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--surface)" }} />
            )}
          </div>
        ))}
      </div>
      <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }} onClick={handleSubmit} disabled={!allFilled}>Submit All</button>
    </div>
  );
}

// -- Activity 1: Fraction-Decimal Memorization Drill --
const CONVERSIONS = [
  { frac: frac(1, 2), latex: frac(1, 2), dec: 0.5, display: "0.5", label: "1/2" },
  { frac: frac(1, 4), latex: frac(1, 4), dec: 0.25, display: "0.25", label: "1/4" },
  { frac: frac(1, 5), latex: frac(1, 5), dec: 0.2, display: "0.2", label: "1/5" },
  { frac: frac(1, 10), latex: frac(1, 10), dec: 0.1, display: "0.1", label: "1/10" },
];
const TIMER = 5;

function FracDecMemorize({ onDone }) {
  const [idx, setIdx] = useState(0);
  const done = idx >= CONVERSIONS.length;
  if (done) return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: "var(--green)", marginBottom: 16 }}>All conversions reviewed!</div>
      <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }} onClick={onDone}>Start Drill</button>
    </div>
  );
  const c = CONVERSIONS[idx];
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 20, color: "var(--text3)", marginBottom: 8 }}>Memorize this conversion ({idx + 1}/{CONVERSIONS.length})</div>
      <div style={{ background: "var(--bg2)", borderRadius: "var(--radius)", padding: "24px", marginBottom: 20 }}>
        <KaTeXBlock expr={`${c.latex} = ${c.display}`} />
        <div style={{ fontSize: 20, color: "var(--text2)", marginTop: 8 }}>{c.label} = {c.display}</div>
      </div>
      <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }} onClick={() => setIdx(i => i + 1)}>
        {idx < CONVERSIONS.length - 1 ? "Next" : "Start Drill"}
      </button>
    </div>
  );
}

function FracDecDrill({ onComplete }) {
  const [phase, setPhase] = useState("memorize"); // memorize | drill | review
  const [needed, setNeeded] = useState({ 0: 2, 1: 2, 2: 2, 3: 2 });
  const [correct, setCorrect] = useState({ 0: 0, 1: 0, 2: 0, 3: 0 });
  const [reviewNeeded, setReviewNeeded] = useState({ 0: 1, 1: 1, 2: 1, 3: 1 });
  const [reviewCorrect, setReviewCorrect] = useState({ 0: 0, 1: 0, 2: 0, 3: 0 });
  const [currentIdx, setCurrentIdx] = useState(() => randInt(0, 3));
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [timeLeft, setTimeLeft] = useState(TIMER);
  const timerRef = useRef(null);
  const inputRef = useRef(null);

  const remaining = phase === "drill"
    ? Object.keys(needed).filter(k => correct[k] < needed[k]).map(Number)
    : Object.keys(reviewNeeded).filter(k => reviewCorrect[k] < reviewNeeded[k]).map(Number);

  useEffect(() => {
    if (phase === "memorize") return;
    if (remaining.length === 0) {
      if (phase === "drill") { setPhase("review"); setCurrentIdx(randInt(0, 3)); return; }
      if (phase === "review") { setTimeout(onComplete, 300); return; }
    }
    clearInterval(timerRef.current);
    setTimeLeft(TIMER);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); handleTimeout(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [currentIdx, phase, JSON.stringify(correct), JSON.stringify(reviewCorrect)]);

  const handleTimeout = () => {
    const c = CONVERSIONS[currentIdx];
    setFeedback({ correct: false, correctAns: c.display });
    if (phase === "drill") setNeeded(prev => ({ ...prev, [currentIdx]: prev[currentIdx] + 1 }));
    else setReviewNeeded(prev => ({ ...prev, [currentIdx]: prev[currentIdx] + 1 }));
  };

  const handleSubmit = () => {
    clearInterval(timerRef.current);
    const c = CONVERSIONS[currentIdx];
    const ok = decOk(input, c.dec);
    setFeedback({ correct: ok, correctAns: c.display });
    if (ok) {
      if (phase === "drill") setCorrect(prev => ({ ...prev, [currentIdx]: prev[currentIdx] + 1 }));
      else setReviewCorrect(prev => ({ ...prev, [currentIdx]: prev[currentIdx] + 1 }));
    } else {
      if (phase === "drill") setNeeded(prev => ({ ...prev, [currentIdx]: prev[currentIdx] + 1 }));
      else setReviewNeeded(prev => ({ ...prev, [currentIdx]: prev[currentIdx] + 1 }));
    }
  };

  const handleNext = () => {
    setFeedback(null); setInput("");
    const rem = phase === "drill"
      ? Object.keys(needed).filter(k => (k == currentIdx ? correct[currentIdx] + (feedback?.correct ? 1 : 0) : correct[k]) < needed[k]).map(Number)
      : Object.keys(reviewNeeded).filter(k => (k == currentIdx ? reviewCorrect[currentIdx] + (feedback?.correct ? 1 : 0) : reviewCorrect[k]) < reviewNeeded[k]).map(Number);
    if (rem.length === 0) return;
    setCurrentIdx(randChoice(rem));
    setTimeout(() => inputRef.current?.focus(), 80);
  };

  if (phase === "memorize") return <FracDecMemorize onDone={() => { setPhase("drill"); setCurrentIdx(randInt(0, 3)); }} />;

  const pct = (timeLeft / TIMER) * 100;
  const color = timeLeft <= 2 ? "var(--red)" : timeLeft <= 3 ? "var(--amber)" : "var(--green)";
  const conv = CONVERSIONS[currentIdx];
  const doneCount = phase === "drill"
    ? Object.keys(correct).filter(k => correct[k] >= needed[k]).length
    : Object.keys(reviewCorrect).filter(k => reviewCorrect[k] >= reviewNeeded[k]).length;

  return (
    <div>
      <div style={{ fontSize: 19, color: "var(--text3)", marginBottom: 10, fontWeight: 700 }}>
        {phase === "review" ? "Review: 1 correct each" : "Drill: 2 correct each"} - {doneCount}/4 mastered
      </div>
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 20, color: "var(--text3)", marginBottom: 4 }}>
          <span>Time</span><span style={{ fontWeight: 700, color }}>{timeLeft}s</span>
        </div>
        <div style={{ height: 6, background: "var(--surface2)", borderRadius: 99, overflow: "hidden" }}>
          <div style={{ height: "100%", width: pct + "%", background: color, borderRadius: 99, transition: "width 0.9s linear" }} />
        </div>
      </div>
      <KaTeXBlock expr={`${conv.latex} = ?`} />
      {feedback ? (
        <div style={{ textAlign: "center", marginTop: 10 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: feedback.correct ? "var(--green)" : "var(--red)", marginBottom: 10 }}>{feedback.correct ? "Correct!" : "Incorrect"}</div>
          {!feedback.correct && <div style={{ fontSize: 20, color: "var(--text2)", marginBottom: 14, fontFamily: "var(--mono)", fontWeight: 700 }}>Answer: {feedback.correctAns}</div>}
          <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }} onClick={handleNext}>Next</button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && input.trim() && handleSubmit()} placeholder="decimal" autoFocus
            style={{ textAlign: "center", fontSize: 22, fontFamily: "var(--mono)", fontWeight: 700, padding: "10px", width: 180 }} />
          <button className="btn btn-primary" style={{ fontSize: 20, padding: "10px 20px" }} onClick={handleSubmit} disabled={!input.trim()}>OK</button>
        </div>
      )}
    </div>
  );
}

// -- Activity 2: Whole number division with decimal remainder --
function genWholeDiv() {
  const pool = [
    { n: 13, d: 4, ans: 3.25, work: "13.00 / 4 = 3.25" },
    { n: 7, d: 2, ans: 3.5, work: "7.0 / 2 = 3.5" },
    { n: 22, d: 5, ans: 4.4, work: "22.0 / 5 = 4.4" },
    { n: 15, d: 6, ans: 2.5, work: "15.0 / 6 = 2.5" },
    { n: 37, d: 8, ans: 4.625, work: "37.000 / 8 = 4.625" },
    { n: 11, d: 4, ans: 2.75, work: "11.00 / 4 = 2.75" },
    { n: 9, d: 4, ans: 2.25, work: "9.00 / 4 = 2.25" },
    { n: 17, d: 4, ans: 4.25, work: "17.00 / 4 = 4.25" },
    { n: 19, d: 5, ans: 3.8, work: "19.0 / 5 = 3.8" },
    { n: 23, d: 4, ans: 5.75, work: "23.00 / 4 = 5.75" },
    { n: 41, d: 8, ans: 5.125, work: "41.000 / 8 = 5.125" },
    { n: 33, d: 8, ans: 4.125, work: "33.000 / 8 = 4.125" },
  ];
  return shuffle(pool).slice(0, 6).map(p => ({ ...p, displayAnswer: fmtDec(p.ans) }));
}

function WholeDiv({ onCorrect, onWrong }) {
  const [problems, setProblems] = useState(() => genWholeDiv());
  return <SixMastery
    problems={problems}
    renderProblem={p => <KaTeX expr={`${p.n} \\div ${p.d}`} />}
    gradeProblem={(input, p) => decOk(input, p.ans)}
    workedSolution={p => `Add decimal point and zeros:\n${p.work}`}
    onCorrect={() => { setProblems(genWholeDiv()); onCorrect(); }}
    onWrong={() => { setProblems(genWholeDiv()); onWrong(); }}
  />;
}

// -- Activity 3: Fraction to terminating decimal --
function genTermDec() {
  const pool = [
    { latex: frac(1, 2), ans: 0.5 }, { latex: frac(3, 4), ans: 0.75 },
    { latex: frac(2, 5), ans: 0.4 }, { latex: frac(7, 8), ans: 0.875 },
    { latex: frac(1, 4), ans: 0.25 }, { latex: frac(3, 5), ans: 0.6 },
    { latex: frac(1, 8), ans: 0.125 }, { latex: frac(4, 5), ans: 0.8 },
    { latex: frac(3, 8), ans: 0.375 }, { latex: frac(9, 10), ans: 0.9 },
    { latex: frac(1, 20), ans: 0.05 }, { latex: frac(3, 20), ans: 0.15 },
  ];
  return shuffle(pool).slice(0, 6).map(p => ({ ...p, displayAnswer: fmtDec(p.ans) }));
}

function TermDec({ onCorrect, onWrong }) {
  const [problems, setProblems] = useState(() => genTermDec());
  return <SixMastery
    problems={problems}
    renderProblem={p => <KaTeX expr={p.latex} />}
    gradeProblem={(input, p) => decOk(input, p.ans)}
    workedSolution={null}
    onCorrect={() => { setProblems(genTermDec()); onCorrect(); }}
    onWrong={() => { setProblems(genTermDec()); onWrong(); }}
  />;
}

// -- Activity 4: Fraction to repeating decimal --
function genRepDec() {
  const pool = [
    { latex: frac(1, 3), displayAnswer: "0.[3]", alts: ["0.3...", "0.33..."] },
    { latex: frac(2, 3), displayAnswer: "0.[6]", alts: ["0.6...", "0.66..."] },
    { latex: frac(5, 6), displayAnswer: "0.8[3]", alts: ["0.83...", "0.8333..."] },
    { latex: frac(2, 9), displayAnswer: "0.[2]", alts: ["0.2...", "0.22..."] },
    { latex: frac(5, 12), displayAnswer: "0.41[6]", alts: ["0.416...", "0.4166..."] },
    { latex: frac(1, 6), displayAnswer: "0.1[6]", alts: ["0.16...", "0.1666..."] },
    { latex: frac(4, 9), displayAnswer: "0.[4]", alts: ["0.4...", "0.44..."] },
    { latex: frac(1, 9), displayAnswer: "0.[1]", alts: ["0.1...", "0.11..."] },
    { latex: frac(7, 9), displayAnswer: "0.[7]", alts: ["0.7...", "0.77..."] },
    { latex: frac(1, 11), displayAnswer: "0.[09]", alts: ["0.09...", "0.0909..."] },
  ];
  return shuffle(pool).slice(0, 6);
}

function RepDec({ onCorrect, onWrong }) {
  const [problems, setProblems] = useState(() => genRepDec());
  return <SixMastery
    problems={problems}
    renderProblem={p => <KaTeX expr={p.latex} />}
    gradeProblem={(input, p) => {
      const s = String(input || "").trim().replace(/\s+/g, "");
      if (gradeRepeatingLike(s, p.displayAnswer)) return true;
      return p.alts?.some(a => s === a);
    }}
    workedSolution={p => { const da = p.displayAnswer; return `Answer: ${da.replace(/\[(.+)\]/g, (_, r) => r + r + r + "...")}`; }}
    onCorrect={() => { setProblems(genRepDec()); onCorrect(); }}
    onWrong={() => { setProblems(genRepDec()); onWrong(); }}
    useRepInput
  />;
}

// -- Activity 5: Decimal / whole number --
function genDecWholeDiv() {
  const pool = [
    { latex: `8.4 \\div 4`, ans: 2.1, work: "Align decimal: 8.4/4 = 2.1" },
    { latex: `15.75 \\div 3`, ans: 5.25, work: "15.75/3 = 5.25" },
    { latex: `6.25 \\div 5`, ans: 1.25, work: "6.25/5 = 1.25" },
    { latex: `9.6 \\div 4`, ans: 2.4, work: "9.6/4 = 2.4" },
    { latex: `7.2 \\div 6`, ans: 1.2, work: "7.2/6 = 1.2" },
    { latex: `18.9 \\div 9`, ans: 2.1, work: "18.9/9 = 2.1" },
    { latex: `4.5 \\div 3`, ans: 1.5, work: "4.5/3 = 1.5" },
    { latex: `14.4 \\div 6`, ans: 2.4, work: "14.4/6 = 2.4" },
    { latex: `0.84 \\div 4`, ans: 0.21, work: "0.84/4 = 0.21" },
    { latex: `3.75 \\div 5`, ans: 0.75, work: "3.75/5 = 0.75" },
  ];
  return shuffle(pool).slice(0, 6).map(p => ({ ...p, displayAnswer: fmtDec(p.ans) }));
}

function DecWholeDiv({ onCorrect, onWrong }) {
  const [problems, setProblems] = useState(() => genDecWholeDiv());
  return <SixMastery
    problems={problems}
    renderProblem={p => <KaTeX expr={p.latex} />}
    gradeProblem={(input, p) => decOk(input, p.ans)}
    workedSolution={p => `Align decimal point in quotient:\n${p.work}`}
    onCorrect={() => { setProblems(genDecWholeDiv()); onCorrect(); }}
    onWrong={() => { setProblems(genDecWholeDiv()); onWrong(); }}
  />;
}

// -- Activity 6: Divide by decimal (1 int, 1 one-dec, 1 two-dec, 1 repeating) --
const A6_INT = [
  { latex: `7.2 \\div 0.8`, dividend: 7.2, divisor: 0.8, factor: 10, ans: 9, displayAnswer: "9" },
  { latex: `4.8 \\div 0.6`, dividend: 4.8, divisor: 0.6, factor: 10, ans: 8, displayAnswer: "8" },
  { latex: `6.3 \\div 0.7`, dividend: 6.3, divisor: 0.7, factor: 10, ans: 9, displayAnswer: "9" },
];
const A6_1DEC = [
  { latex: `2.5 \\div 0.2`, dividend: 2.5, divisor: 0.2, factor: 10, ans: 12.5, displayAnswer: "12.5" },
  { latex: `1.5 \\div 0.4`, dividend: 1.5, divisor: 0.4, factor: 10, ans: 3.75, displayAnswer: "3.75" },
  { latex: `0.7 \\div 0.4`, dividend: 0.7, divisor: 0.4, factor: 10, ans: 1.75, displayAnswer: "1.75" },
];
const A6_2DEC = [
  { latex: `1.4 \\div 0.08`, dividend: 1.4, divisor: 0.08, factor: 100, ans: 17.5, displayAnswer: "17.5" },
  { latex: `2.7 \\div 0.12`, dividend: 2.7, divisor: 0.12, factor: 100, ans: 22.5, displayAnswer: "22.5" },
];
const A6_REP = [
  { latex: `0.3 \\div 0.9`, dividend: 0.3, divisor: 0.9, factor: 10, ans: 0.333, displayAnswer: "0.[3]", repeating: true },
];

function genDivByDec() {
  return shuffle([randChoice(A6_INT), randChoice(A6_1DEC), randChoice(A6_2DEC), A6_REP[0]]);
}

function DivByDec({ onCorrect, onWrong }) {
  const gen6 = () => {
    const int1 = randChoice(A6_INT);
    const int2 = randChoice(A6_INT.filter(x => x.latex !== int1.latex));
    const d1 = randChoice(A6_1DEC);
    const d2a = randChoice(A6_2DEC);
    const d1b = randChoice(A6_1DEC.filter(x => x.latex !== d1.latex));
    return shuffle([int1, int2, d1, d2a, d1b, A6_REP[0]]);
  };
  const [probs, setProbs] = useState(() => gen6());
  return <SixMastery
    problems={probs}
    renderProblem={p => <KaTeX expr={p.latex} />}
    gradeProblem={(input, p) => p.repeating ? gradeRepeatingLike(input, p.displayAnswer) : decOk(input, p.ans)}
    workedSolution={p => `Multiply both by ${p.factor}: ${Math.round(p.dividend * p.factor)} - ${Math.round(p.divisor * p.factor)} = ${p.displayAnswer}`}
    onCorrect={() => { setProbs(gen6()); onCorrect(); }}
    onWrong={() => { setProbs(gen6()); onWrong(); }}
    useRepInput
  />;
}

// -- Activity 7: Solve decimal equations --
function genDecEqns() {
  const pool = [
    { latex: "0.3x - 0.2 = 0.4", mult: 10, cleared: "3x - 2 = 4", ans: 2, displayAnswer: "2" },
    { latex: "0.25x + 0.5 = 1", mult: 100, cleared: "25x + 50 = 100", ans: 2, displayAnswer: "2" },
    { latex: "1.2x = 3.6", mult: 10, cleared: "12x = 36", ans: 3, displayAnswer: "3" },
    { latex: "0.05x + 0.1 = 0.3", mult: 100, cleared: "5x + 10 = 30", ans: 4, displayAnswer: "4" },
    { latex: "0.4x - 0.8 = 1.2", mult: 10, cleared: "4x - 8 = 12", ans: 5, displayAnswer: "5" },
    { latex: "0.6x - 0.3 = 0.9", mult: 10, cleared: "6x - 3 = 9", ans: 2, displayAnswer: "2" },
    { latex: "0.5x + 1 = 2.5", mult: 10, cleared: "5x + 10 = 25", ans: 3, displayAnswer: "3" },
    { latex: "0.2x + 0.4 = 1", mult: 10, cleared: "2x + 4 = 10", ans: 3, displayAnswer: "3" },
  ];
  return shuffle(pool).slice(0, 6);
}

function DecEqns({ onCorrect, onWrong }) {
  const [problems, setProblems] = useState(() => genDecEqns());
  return <SixMastery
    problems={problems}
    renderProblem={p => <KaTeX expr={p.latex} />}
    gradeProblem={(input, p) => decOk(input, p.ans)}
    workedSolution={p => `Multiply both sides by ${p.mult}:\n${p.cleared}\nx = ${p.ans}`}
    onCorrect={() => { setProblems(genDecEqns()); onCorrect(); }}
    onWrong={() => { setProblems(genDecEqns()); onWrong(); }}
  />;
}

// -- Steps --
const STEPS = [
  { id: "whole-div", label: "Whole Number Division", description: "All correct to pass." },
  { id: "term-dec", label: "Fraction to Terminating Decimal", description: "All correct to pass." },
  { id: "rep-dec", label: "Fraction to Repeating Decimal", description: "All correct to pass." },
  { id: "dec-whole-div", label: "Decimal / Whole Number", description: "All correct to pass." },
  { id: "div-by-dec", label: "Divide by Decimal", description: "All correct to pass." },
  { id: "dec-eqns", label: "Solve Decimal Equations", description: "All correct to pass." },
];

export default function Lesson19MasteryPlayer({ user, topic, onHome }) {
  const topicId = topic?.id || LESSON19_MASTERY_TOPIC_ID;
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
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>HW 19 (019) Complete!</h2>
        <p style={{ fontSize: 20, color: "var(--text2)", marginBottom: 24 }}>Decimal division mastered!</p>
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
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,var(--blue),var(--orange))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "#fff" }}>L19</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 22 }}>HW 19 (019): Mastery Activities</div>
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
          {step.id === "whole-div"     && <WholeDiv      key={stepIdx} onCorrect={handleCorrect} onWrong={handleWrong} />}
          {step.id === "term-dec"      && <TermDec       key={stepIdx} onCorrect={handleCorrect} onWrong={handleWrong} />}
          {step.id === "rep-dec"       && <RepDec        key={stepIdx} onCorrect={handleCorrect} onWrong={handleWrong} />}
          {step.id === "dec-whole-div" && <DecWholeDiv   key={stepIdx} onCorrect={handleCorrect} onWrong={handleWrong} />}
          {step.id === "div-by-dec"    && <DivByDec      key={stepIdx} onCorrect={handleCorrect} onWrong={handleWrong} />}
          {step.id === "dec-eqns"      && <DecEqns       key={stepIdx} onCorrect={handleCorrect} onWrong={handleWrong} />}
        </div>
      </div>
    </div>
  );
}

// -- Standalone Mental Math Drill --
export function FracDecDrillPlayer({ user, topic, onHome }) {
  const topicId = topic?.id || FRAC_DEC_DRILL_TOPIC_ID;
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  useEffect(() => { getProgress(user.id, topicId).then(prog => { if (prog?.data?.completed) setCompleted(true); setLoading(false); }); }, []);
  const handleComplete = async () => { await fbSaveProgress(user.id, topicId, { started: true, completed: true, percentComplete: 100, data: { completed: true } }); setCompleted(true); };
  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><div className="spinner" /></div>;
  if (completed) return (
    <div style={{ maxWidth: 520, margin: "0 auto", textAlign: "center" }}>
      <div className="card">
        <div style={{ fontSize: 48, fontWeight: 900, color: "var(--amber)", marginBottom: 16 }}>100%</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Fraction-Decimal Drill Complete!</h2>
        <button className="btn btn-primary btn-lg" style={{ width: "100%" }} onClick={onHome}>Back to Home</button>
      </div>
    </div>
  );
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "clamp(16px,3vw,32px)" }} className="dot-bg">
      <div style={{ maxWidth: 580, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,var(--blue),var(--orange))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "#fff" }}>19</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 22 }}>Fraction-Decimal Conversions</div>
              <div style={{ fontSize: 20, color: "var(--text3)" }}>Memorize then drill: 5s timer, 2 correct each</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onHome}>Back</button>
        </div>
        <div className="card"><FracDecDrill onComplete={handleComplete} /></div>
      </div>
    </div>
  );
}

