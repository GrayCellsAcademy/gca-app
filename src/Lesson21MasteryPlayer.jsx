import { useState, useEffect, useRef } from "react";
import { saveProgress as fbSaveProgress, getProgress } from "./core/firebase";

export const LESSON21_MASTERY_TOPIC_ID = "lesson21-mastery-v1";
export const REP_DEC_DRILL_TOPIC_ID = "rep-dec-drill-v1";

const TIMER = 5;

// -- Math helpers --
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randChoice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function shuffle(arr) { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); return b === 0 ? a : gcd(b, a % b); }
function reduce(n, d) { const g = gcd(Math.abs(n), Math.abs(d)); return [n / g, d / g]; }
function fmtFrac(n, d) {
  const [rn, rd] = reduce(n, d);
  if (rd === 1) return String(rn);
  if (Math.abs(rn) > rd) { const w = Math.floor(Math.abs(rn) / rd); const r = Math.abs(rn) % rd; return `${w} ${r}/${rd}`; }
  return `${rn}/${rd}`;
}
// Answers must be in simplest form: 27/99 is not accepted for 3/11
function fracOk(input, rn, rd) {
  const s = String(input || "").trim().replace(/\s*\/\s*/g, "/").replace(/\s+/g, " ");
  if (!s) return false;
  let num, den;
  const mx = s.match(/^(\d+) (\d+)\/(\d+)$/);
  const fx = s.match(/^(\d+)\/(\d+)$/);
  const ix = s.match(/^(\d+)$/);
  if (mx) {
    const w = +mx[1], n = +mx[2], d = +mx[3];
    if (w === 0 || n === 0 || d < 2 || n >= d || gcd(n, d) !== 1) return false;
    num = w * d + n; den = d;
  } else if (fx) {
    num = +fx[1]; den = +fx[2];
    if (num === 0 || den < 2 || gcd(num, den) !== 1) return false;
  } else if (ix) { num = +ix[1]; den = 1; }
  else return false;
  const [cn, cd] = reduce(rn, rd);
  return num === cn && den === cd;
}

// Repeating decimal typed with a bar: "0.1[6]" (brackets mark the barred digits) -> [num, den]
function parseRep(str) {
  const m = String(str || "").trim().match(/^(\d*)(?:\.(\d*))?(?:\[(\d+)\])?$/);
  if (!m) return null;
  const ip = m[1] || "", np = m[2] || "", rp = m[3] || "";
  if (ip === "" && np === "" && rp === "") return null;
  if (rp && m[2] === undefined) return null;
  if ((ip + np + rp).length > 10) return null;
  if (!rp) return [Number((ip + np) || "0"), Math.pow(10, np.length)];
  return [Number(ip + np + rp) - Number((ip + np) || "0"), Math.pow(10, np.length) * (Math.pow(10, rp.length) - 1)];
}

const barStyle = { borderTop: "2px solid currentColor", paddingTop: 1 };
function TypedNum({ text, rep }) {
  if (!rep) return <span style={{ fontFamily: "var(--mono)" }}>{text}</span>;
  return (
    <span style={{ fontFamily: "var(--mono)" }}>
      {text.slice(0, rep.s)}<span style={barStyle}>{text.slice(rep.s, rep.e)}</span>{text.slice(rep.e)}
    </span>
  );
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

// - Activity 1: Repeating Decimal Memorization Drill -
const DRILL_CONVS = [
  { latex: frac(1, 3), rn: 1, rd: 3, display: "0.\\overline{3}", label: "1/3" },
  { latex: frac(1, 6), rn: 1, rd: 6, display: "0.1\\overline{6}", label: "1/6" },
  { latex: frac(1, 9), rn: 1, rd: 9, display: "0.\\overline{1}", label: "1/9" },
];

// Exact value only: the repeating digit must be marked with the bar (0.333 is not 1/3)
function gradeRepDrillInput(barred, conv) {
  const v = parseRep(barred);
  return !!v && v[0] * conv.rd === conv.rn * v[1];
}

function RepDecMemorize({ onDone }) {
  const [idx, setIdx] = useState(0);
  if (idx >= DRILL_CONVS.length) return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: "var(--green)", marginBottom: 16 }}>All conversions reviewed!</div>
      <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }} onClick={onDone}>Start Drill</button>
    </div>
  );
  const cv = DRILL_CONVS[idx];
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 20, color: "var(--text3)", marginBottom: 8 }}>Memorize ({idx + 1}/{DRILL_CONVS.length})</div>
      <div style={{ background: "var(--bg2)", borderRadius: "var(--radius)", padding: "24px", marginBottom: 20 }}>
        <KaTeXBlock expr={`${cv.latex} = ${cv.display}`} />
        <div style={{ fontSize: 19, color: "var(--text2)", marginTop: 6 }}>{cv.label} = <KaTeX expr={cv.display} /></div>
      </div>
      <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }} onClick={() => setIdx(i => i + 1)}>
        {idx < DRILL_CONVS.length - 1 ? "Next" : "Start Drill"}
      </button>
    </div>
  );
}

function RepDecDrill({ onComplete }) {
  const [phase, setPhase] = useState("memorize");
  const [needed, setNeeded] = useState({ 0: 2, 1: 2, 2: 2 });
  const [correct, setCorrect] = useState({ 0: 0, 1: 0, 2: 0 });
  const [reviewNeeded, setReviewNeeded] = useState({ 0: 1, 1: 1, 2: 1 });
  const [reviewCorrect, setReviewCorrect] = useState({ 0: 0, 1: 0, 2: 0 });
  const [currentIdx, setCurrentIdx] = useState(0);
  const [input, setInput] = useState("");
  const [rep, setRep] = useState(null);           // {s,e}: digits under the bar
  const [feedback, setFeedback] = useState(null);
  const [timeLeft, setTimeLeft] = useState(TIMER);
  const timerRef = useRef(null);
  const inputRef = useRef(null);

  const getRemaining = (cor, nee) => Object.keys(nee).filter(k => (cor[k] || 0) < (nee[k] || 0)).map(Number);

  useEffect(() => {
    if (phase === "memorize") return;
    const cor = phase === "drill" ? correct : reviewCorrect;
    const nee = phase === "drill" ? needed : reviewNeeded;
    const rem = getRemaining(cor, nee);
    if (rem.length === 0) {
      if (phase === "drill") { setPhase("review"); setCurrentIdx(randInt(0, 2)); return; }
      setTimeout(onComplete, 300); return;
    }
    clearInterval(timerRef.current); setTimeLeft(TIMER);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => { if (t <= 1) { clearInterval(timerRef.current); handleTimeout(); return 0; } return t - 1; });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [currentIdx, phase, JSON.stringify(correct), JSON.stringify(reviewCorrect)]);

  const handleTimeout = () => {
    clearInterval(timerRef.current);
    setFeedback({ correct: false, display: DRILL_CONVS[currentIdx].display });
    if (phase === "drill") setNeeded(prev => ({ ...prev, [currentIdx]: (prev[currentIdx] || 2) + 1 }));
    else setReviewNeeded(prev => ({ ...prev, [currentIdx]: (prev[currentIdx] || 1) + 1 }));
  };

  // Bar button: bar the highlighted digits; with nothing highlighted, bar the last digit.
  // Pressing it again with nothing highlighted removes the bar.
  const applyBar = () => {
    const el = inputRef.current; if (!el) return;
    const s = el.selectionStart, e = el.selectionEnd;
    if (s != null && e != null && s < e) {
      if (/^\d+$/.test(input.slice(s, e))) setRep({ s, e });
      return;
    }
    if (rep) { setRep(null); return; }
    if (/\d$/.test(input)) setRep({ s: input.length - 1, e: input.length });
  };

  const handleSubmit = () => {
    if (feedback) return;
    clearInterval(timerRef.current);
    const cv = DRILL_CONVS[currentIdx];
    const barred = rep ? input.slice(0, rep.s) + "[" + input.slice(rep.s, rep.e) + "]" + input.slice(rep.e) : input;
    const ok = gradeRepDrillInput(barred, cv);
    setFeedback({ correct: ok, display: cv.display });
    if (ok) {
      if (phase === "drill") setCorrect(prev => ({ ...prev, [currentIdx]: (prev[currentIdx] || 0) + 1 }));
      else setReviewCorrect(prev => ({ ...prev, [currentIdx]: (prev[currentIdx] || 0) + 1 }));
    } else {
      if (phase === "drill") setNeeded(prev => ({ ...prev, [currentIdx]: (prev[currentIdx] || 2) + 1 }));
      else setReviewNeeded(prev => ({ ...prev, [currentIdx]: (prev[currentIdx] || 1) + 1 }));
    }
  };

  const handleNext = () => {
    setFeedback(null); setInput(""); setRep(null);
    const cor = phase === "drill" ? correct : reviewCorrect;
    const nee = phase === "drill" ? needed : reviewNeeded;
    const rem = getRemaining(cor, nee);
    if (rem.length === 0) return;
    setCurrentIdx(randChoice(rem));
    setTimeout(() => inputRef.current?.focus(), 80);
  };

  if (phase === "memorize") return <RepDecMemorize onDone={() => { setPhase("drill"); setCurrentIdx(randInt(0, 2)); }} />;

  const pct = (timeLeft / TIMER) * 100;
  const col = timeLeft <= 2 ? "var(--red)" : timeLeft <= 3 ? "var(--amber)" : "var(--green)";
  const cv = DRILL_CONVS[currentIdx];
  const cor = phase === "drill" ? correct : reviewCorrect;
  const nee = phase === "drill" ? needed : reviewNeeded;
  const doneCount = Object.keys(nee).filter(k => (cor[k] || 0) >= (nee[k] || 0)).length;

  return (
    <div>
      <div style={{ fontSize: 19, color: "var(--text3)", marginBottom: 10, fontWeight: 700 }}>
        {phase === "review" ? "Review: 1 correct each" : "Drill: 2 correct each"} -- {doneCount}/{DRILL_CONVS.length} mastered
      </div>
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 20, color: "var(--text3)", marginBottom: 4 }}>
          <span>Time</span><span style={{ fontWeight: 700, color: col }}>{timeLeft}s</span>
        </div>
        <div style={{ height: 6, background: "var(--surface2)", borderRadius: 99, overflow: "hidden" }}>
          <div style={{ height: "100%", width: pct + "%", background: col, borderRadius: 99, transition: "width 0.9s linear" }} />
        </div>
      </div>
      <KaTeXBlock expr={`${cv.latex} = ?`} />
      <div style={{ fontSize: 17, color: "var(--text3)", marginBottom: 10, textAlign: "center" }}>
        Type the digits once, then press the{" "}
        <span style={{ fontFamily: "var(--mono)", fontWeight: 900, display: "inline-block", lineHeight: 1.1, ...barStyle }}>abc</span>{" "}
        button to put the bar over the last digit (or highlight the digits to bar first).
      </div>
      {feedback ? (
        <div style={{ textAlign: "center", marginTop: 10 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: feedback.correct ? "var(--green)" : "var(--red)", marginBottom: 10 }}>{feedback.correct ? "Correct!" : "Incorrect"}</div>
          {!feedback.correct && <div style={{ fontSize: 20, color: "var(--text2)", marginBottom: 14 }}>Answer: <KaTeX expr={feedback.display} /></div>}
          <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }} onClick={handleNext}>Next</button>
        </div>
      ) : (
        <div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", alignItems: "center" }}>
            <input ref={inputRef} value={input} maxLength={10}
              onChange={e => { setInput(e.target.value.replace(/[^0-9.]/g, "")); setRep(null); }}
              onKeyDown={e => e.key === "Enter" && input.trim() && handleSubmit()}
              inputMode="decimal" autoFocus
              style={{ textAlign: "center", fontSize: 22, fontFamily: "var(--mono)", fontWeight: 700, padding: "10px", width: 160, minWidth: 0 }} />
            <button type="button" title="Mark repeating digits"
              onMouseDown={e => e.preventDefault()} onClick={applyBar}
              style={{ padding: "10px 14px", fontSize: 20, fontFamily: "var(--mono)", fontWeight: 900,
                border: "2px solid " + (rep ? "var(--blue)" : "var(--border2)"), borderRadius: "var(--radius-sm)",
                background: rep ? "rgba(59,130,246,0.15)" : "var(--surface)", color: "var(--text)", cursor: "pointer" }}>
              <span style={barStyle}>abc</span>
            </button>
            <button className="btn btn-primary" style={{ fontSize: 20, padding: "10px 20px" }}
              onMouseDown={e => { e.preventDefault(); if (input.trim()) handleSubmit(); }} disabled={!input.trim()}>OK</button>
          </div>
          {rep && (
            <div style={{ textAlign: "center", marginTop: 8, fontSize: 24, fontWeight: 800, color: "var(--blue)" }}>
              Your answer: <TypedNum text={input} rep={rep} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// - Pools -
const SINGLE_POOL = [
  { overline: "0.\\overline{3}", rn: 1, rd: 3, work: "Let x = 0.333...\n10x = 3.333...\n10x - x = 3  =>  9x = 3  =>  x = 3/9 = 1/3" },
  { overline: "0.\\overline{6}", rn: 2, rd: 3, work: "Let x = 0.666...\n10x = 6.666...\n9x = 6  =>  x = 6/9 = 2/3" },
  { overline: "0.\\overline{7}", rn: 7, rd: 9, work: "Let x = 0.777...\n10x = 7.777...\n9x = 7  =>  x = 7/9" },
  { overline: "0.\\overline{4}", rn: 4, rd: 9, work: "Let x = 0.444...\n10x = 4.444...\n9x = 4  =>  x = 4/9" },
  { overline: "0.\\overline{2}", rn: 2, rd: 9, work: "Let x = 0.222...\n10x = 2.222...\n9x = 2  =>  x = 2/9" },
  { overline: "0.\\overline{5}", rn: 5, rd: 9, work: "Let x = 0.555...\n10x = 5.555...\n9x = 5  =>  x = 5/9" },
  { overline: "0.\\overline{8}", rn: 8, rd: 9, work: "Let x = 0.888...\n10x = 8.888...\n9x = 8  =>  x = 8/9" },
  { overline: "0.\\overline{1}", rn: 1, rd: 9, work: "Let x = 0.111...\n10x = 1.111...\n9x = 1  =>  x = 1/9" },
];

const TWO_POOL = [
  { overline: "0.\\overline{27}", rn: 3, rd: 11, work: "Let x = 0.272727...\n100x = 27.272727...\n99x = 27  =>  x = 27/99 = 3/11" },
  { overline: "0.\\overline{45}", rn: 5, rd: 11, work: "Let x = 0.454545...\n100x = 45.454545...\n99x = 45  =>  x = 45/99 = 5/11" },
  { overline: "0.\\overline{18}", rn: 2, rd: 11, work: "Let x = 0.181818...\n100x = 18.181818...\n99x = 18  =>  x = 18/99 = 2/11" },
  { overline: "0.\\overline{36}", rn: 4, rd: 11, work: "Let x = 0.363636...\n100x = 36.363636...\n99x = 36  =>  x = 36/99 = 4/11" },
  { overline: "0.\\overline{12}", rn: 4, rd: 33, work: "Let x = 0.121212...\n100x = 12.121212...\n99x = 12  =>  x = 12/99 = 4/33" },
  { overline: "0.\\overline{09}", rn: 1, rd: 11, work: "Let x = 0.090909...\n100x = 9.090909...\n99x = 9  =>  x = 9/99 = 1/11" },
  { overline: "0.\\overline{54}", rn: 6, rd: 11, work: "Let x = 0.545454...\n100x = 54.545454...\n99x = 54  =>  x = 54/99 = 6/11" },
  { overline: "0.\\overline{63}", rn: 7, rd: 11, work: "Let x = 0.636363...\n100x = 63.636363...\n99x = 63  =>  x = 63/99 = 7/11" },
];

const MIXED_POOL = [
  { overline: "0.8\\overline{3}", rn: 5, rd: 6, work: "Let x = 0.8333...\n10x = 8.333...\n9x = 7.5  =>  x = 7.5/9 = 75/90 = 5/6" },
  { overline: "0.1\\overline{6}", rn: 1, rd: 6, work: "Let x = 0.1666...\n10x = 1.666...\n9x = 1.5  =>  x = 1.5/9 = 15/90 = 1/6" },
  { overline: "0.41\\overline{6}", rn: 5, rd: 12, work: "Let x = 0.4166...\n100x = 41.666...\n99x = 41.25  =>  x = 41.25/99 = 4125/9900 = 5/12" },
  { overline: "0.08\\overline{3}", rn: 1, rd: 12, work: "Let x = 0.0833...\n100x = 8.333...\n99x = 8.25  =>  x = 8.25/99 = 825/9900 = 1/12" },
  { overline: "0.58\\overline{3}", rn: 7, rd: 12, work: "Let x = 0.5833...\n100x = 58.333...\n99x = 57.75  =>  x = 57.75/99 = 5775/9900 = 7/12" },
  { overline: "0.2\\overline{3}", rn: 7, rd: 30, work: "Let x = 0.2333...\n10x = 2.333...\n9x = 2.1  =>  x = 2.1/9 = 21/90 = 7/30" },
  { overline: "0.5\\overline{3}", rn: 8, rd: 15, work: "Let x = 0.5333...\n10x = 5.333...\n9x = 4.8  =>  x = 4.8/9 = 48/90 = 8/15" },
  { overline: "0.3\\overline{6}", rn: 11, rd: 30, work: "Let x = 0.3666...\n10x = 3.666...\n9x = 3.3  =>  x = 3.3/9 = 33/90 = 11/30" },
];

// - SixMastery component -
function SixMastery({ problems, onCorrect, onWrong, count }) {
  const n = count || 6;
  const [answers, setAnswers] = useState(Array(n).fill(""));
  const [feedback, setFeedback] = useState(null);

  const handleSubmit = () => {
    const results = problems.map((p, i) => fracOk(answers[i], p.rn, p.rd));
    setFeedback({ results, allOk: results.every(Boolean), answers: [...answers] });
  };

  const handleNext = () => {
    const wasOk = feedback?.allOk;
    setAnswers(Array(n).fill("")); setFeedback(null);
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
          return (
            <div key={i} style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "10px 14px", border: "1px solid " + (ok ? "rgba(22,163,74,0.2)" : "rgba(239,68,68,0.2)") }}>
              <div style={{ marginBottom: 4 }}><KaTeX expr={p.overline} /></div>
              {!ok && <div style={{ fontSize: 17, color: "var(--red)", marginBottom: 4 }}>You: <span style={{ fontFamily: "var(--mono)" }}>{feedback.answers[i] || "-"}</span></div>}
              {!ok && p.work && <div style={{ fontSize: 16, color: "var(--text2)", fontFamily: "var(--mono)", whiteSpace: "pre-line", marginBottom: 4 }}>{p.work}</div>}
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--green)" }}>
                Answer: <KaTeX expr={frac(p.rn, p.rd)} />
              </div>
            </div>
          );
        })}
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
            <div style={{ marginBottom: 8 }}><KaTeX expr={p.overline} /></div>
            <input value={answers[i]} onChange={e => setAnswers(prev => prev.map((x, j) => j === i ? e.target.value : x))}
              placeholder="e.g. 1/3"
              style={{ textAlign: "center", fontSize: 20, fontFamily: "var(--mono)", fontWeight: 700, padding: "6px 10px", width: "100%", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--surface)" }} />
          </div>
        ))}
      </div>
      <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }} onClick={handleSubmit}
        disabled={answers.some(a => a.trim() === "")}>Submit All</button>
    </div>
  );
}

// - Activity components -
function SingleDigitMastery({ onCorrect, onWrong }) {
  const gen = () => shuffle([...SINGLE_POOL]).slice(0, 6);
  const [probs, setProbs] = useState(() => gen());
  return <SixMastery problems={probs}
    onCorrect={() => { setProbs(gen()); onCorrect(); }}
    onWrong={() => { setProbs(gen()); onWrong(); }} />;
}

function TwoDigitMastery({ onCorrect, onWrong }) {
  const gen = () => shuffle([...TWO_POOL]).slice(0, 6);
  const [probs, setProbs] = useState(() => gen());
  return <SixMastery problems={probs}
    onCorrect={() => { setProbs(gen()); onCorrect(); }}
    onWrong={() => { setProbs(gen()); onWrong(); }} />;
}

function MixedPartMastery({ onCorrect, onWrong }) {
  const gen = () => shuffle([...MIXED_POOL]).slice(0, 6);
  const [probs, setProbs] = useState(() => gen());
  return <SixMastery problems={probs}
    onCorrect={() => { setProbs(gen()); onCorrect(); }}
    onWrong={() => { setProbs(gen()); onWrong(); }} />;
}

function AllMixedMastery({ onCorrect, onWrong }) {
  const gen = () => {
    const s = shuffle([...SINGLE_POOL]).slice(0, 3);
    const t = shuffle([...TWO_POOL]).slice(0, 3);
    const m = shuffle([...MIXED_POOL]).slice(0, 4);
    return shuffle([...s, ...t, ...m]);
  };
  const [probs, setProbs] = useState(() => gen());
  return <SixMastery problems={probs} count={10}
    onCorrect={() => { setProbs(gen()); onCorrect(); }}
    onWrong={() => { setProbs(gen()); onWrong(); }} />;
}

// - Steps -
const STEPS = [
  { id: "single", label: "Single-Digit Repeating", ex: "0.\\overline{3} = \\dfrac{1}{3}", description: "All correct to pass. Answer in simplest form." },
  { id: "two", label: "Two-Digit Repeating", ex: "0.\\overline{27} = \\dfrac{3}{11}", description: "All correct to pass. Answer in simplest form." },
  { id: "mixed-part", label: "Non-Repeating Part", ex: "0.8\\overline{3} = \\dfrac{5}{6}", description: "All correct to pass. Answer in simplest form." },
  { id: "all-mixed", label: "Mixed Review (10 problems)", ex: null, description: "All types. All correct to pass. Answer in simplest form." },
];

export default function Lesson21MasteryPlayer({ user, topic, onHome }) {
  const topicId = topic?.id || LESSON21_MASTERY_TOPIC_ID;
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
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>HW 21 (019) Complete!</h2>
        <p style={{ fontSize: 20, color: "var(--text2)", marginBottom: 24 }}>Repeating decimals mastered!</p>
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
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,var(--blue),var(--orange))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "#fff" }}>L21</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 22 }}>HW 21 (019): Mastery Activities</div>
              <div style={{ fontSize: 20, color: "var(--text3)" }}>All correct to advance each activity</div>
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
            <div style={{ fontSize: 20, color: "var(--text2)" }}>{step.ex && <>e.g. <KaTeX expr={step.ex} />. </>}{step.description}</div>
          </div>
          {step.id === "single"     && <SingleDigitMastery key={stepIdx} onCorrect={handleCorrect} onWrong={handleWrong} />}
          {step.id === "two"        && <TwoDigitMastery    key={stepIdx} onCorrect={handleCorrect} onWrong={handleWrong} />}
          {step.id === "mixed-part" && <MixedPartMastery   key={stepIdx} onCorrect={handleCorrect} onWrong={handleWrong} />}
          {step.id === "all-mixed"  && <AllMixedMastery    key={stepIdx} onCorrect={handleCorrect} onWrong={handleWrong} />}
        </div>
      </div>
    </div>
  );
}

// - Standalone Repeating Decimal Drill -
export function RepDecDrillPlayer({ user, topic, onHome }) {
  const topicId = topic?.id || REP_DEC_DRILL_TOPIC_ID;
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  useEffect(() => { getProgress(user.id, topicId).then(prog => { if (prog?.data?.completed) setCompleted(true); setLoading(false); }); }, []);
  const handleComplete = async () => { await fbSaveProgress(user.id, topicId, { started: true, completed: true, percentComplete: 100, data: { completed: true } }); setCompleted(true); };
  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><div className="spinner" /></div>;
  if (completed) return (
    <div style={{ maxWidth: 520, margin: "0 auto", textAlign: "center" }}>
      <div className="card">
        <div style={{ fontSize: 48, fontWeight: 900, color: "var(--amber)", marginBottom: 16 }}>100%</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Repeating Decimal Drill Complete!</h2>
        <button className="btn btn-primary btn-lg" style={{ width: "100%" }} onClick={onHome}>Back to Home</button>
      </div>
    </div>
  );
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "clamp(16px,3vw,32px)" }} className="dot-bg">
      <div style={{ maxWidth: 580, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,var(--blue),var(--orange))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "#fff" }}>21</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 22 }}>Repeating Decimals: 1/3, 1/6, 1/9</div>
              <div style={{ fontSize: 20, color: "var(--text3)" }}>Memorize then drill: 5s timer, 2 correct each</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onHome}>Back</button>
        </div>
        <div className="card"><RepDecDrill onComplete={handleComplete} /></div>
      </div>
    </div>
  );
}

