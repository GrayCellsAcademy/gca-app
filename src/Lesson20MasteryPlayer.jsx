import { useState, useEffect, useRef } from "react";
import { saveProgress as fbSaveProgress, getProgress } from "./core/firebase";

export const LESSON20_MASTERY_TOPIC_ID = "lesson20-mastery-v1";
export const DEC_CONV_DRILL_TOPIC_ID = "dec-conv-drill-v1";

const TIMER = 5;

// -- Math helpers --
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randChoice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function shuffle(arr) { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); return b === 0 ? a : gcd(b, a % b); }
function reduce(n, d) { const g = gcd(Math.abs(n), Math.abs(d)); return [n / g, d / g]; }

function decOk(input, correct) {
  const v = parseFloat(String(input || "").trim());
  return !isNaN(v) && Math.abs(v - correct) < 1e-9;
}

function parseRatio(str) {
  const s = String(str || "").trim().replace(/\s+/g, " ");
  const m1 = s.match(/^(\d+):(\d+)$/); if (m1) return [parseInt(m1[1]), parseInt(m1[2])];
  const m2 = s.match(/^(\d+)\/(\d+)$/); if (m2) return [parseInt(m2[1]), parseInt(m2[2])];
  const m3 = s.match(/^(\d+)\s+to\s+(\d+)$/i); if (m3) return [parseInt(m3[1]), parseInt(m3[2])];
  return null;
}

function ratioOk(input, a, b) {
  const r = parseRatio(input); if (!r) return false;
  const [ra, rb] = reduce(a, b); const [ria, rib] = reduce(r[0], r[1]);
  return ria === ra && rib === rb;
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

// - Activity 1: Fraction-Decimal Memorization Drill -
const CONVERSIONS = [
  { latex: frac(1, 20), dec: 0.05, display: "0.05", label: "1/20" },
  { latex: frac(1, 25), dec: 0.04, display: "0.04", label: "1/25" },
  { latex: frac(1, 50), dec: 0.02, display: "0.02", label: "1/50" },
  { latex: frac(1, 100), dec: 0.01, display: "0.01", label: "1/100" },
];

function DecConvMemorize({ onDone }) {
  const [idx, setIdx] = useState(0);
  const done = idx >= CONVERSIONS.length;
  if (done) return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: "var(--green)", marginBottom: 16 }}>All conversions reviewed!</div>
      <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }} onClick={onDone}>Start Drill</button>
    </div>
  );
  const cv = CONVERSIONS[idx];
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 20, color: "var(--text3)", marginBottom: 8 }}>Memorize this conversion ({idx + 1}/{CONVERSIONS.length})</div>
      <div style={{ background: "var(--bg2)", borderRadius: "var(--radius)", padding: "24px", marginBottom: 20 }}>
        <KaTeXBlock expr={`${cv.latex} = ${cv.display}`} />
        <div style={{ fontSize: 20, color: "var(--text2)", marginTop: 8 }}>{cv.label} = {cv.display}</div>
      </div>
      <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }} onClick={() => setIdx(i => i + 1)}>
        {idx < CONVERSIONS.length - 1 ? "Next" : "Start Drill"}
      </button>
    </div>
  );
}

function DecConvDrill({ onComplete }) {
  const [phase, setPhase] = useState("memorize");
  const [needed, setNeeded] = useState({ 0: 2, 1: 2, 2: 2, 3: 2 });
  const [correct, setCorrect] = useState({ 0: 0, 1: 0, 2: 0, 3: 0 });
  const [reviewNeeded, setReviewNeeded] = useState({ 0: 1, 1: 1, 2: 1, 3: 1 });
  const [reviewCorrect, setReviewCorrect] = useState({ 0: 0, 1: 0, 2: 0, 3: 0 });
  const [currentIdx, setCurrentIdx] = useState(0);
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [timeLeft, setTimeLeft] = useState(TIMER);
  const timerRef = useRef(null);
  const inputRef = useRef(null);

  const getRemaining = (ph, cor, nee) =>
    Object.keys(nee).filter(k => (cor[k] || 0) < (nee[k] || 0)).map(Number);

  useEffect(() => {
    if (phase === "memorize") return;
    const cor = phase === "drill" ? correct : reviewCorrect;
    const nee = phase === "drill" ? needed : reviewNeeded;
    const rem = getRemaining(phase, cor, nee);
    if (rem.length === 0) {
      if (phase === "drill") { setPhase("review"); setCurrentIdx(randInt(0, 3)); return; }
      setTimeout(onComplete, 300); return;
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
    clearInterval(timerRef.current);
    const cv = CONVERSIONS[currentIdx];
    setFeedback({ correct: false, correctAns: cv.display });
    if (phase === "drill") setNeeded(prev => ({ ...prev, [currentIdx]: (prev[currentIdx] || 2) + 1 }));
    else setReviewNeeded(prev => ({ ...prev, [currentIdx]: (prev[currentIdx] || 1) + 1 }));
  };

  const handleSubmit = () => {
    clearInterval(timerRef.current);
    const cv = CONVERSIONS[currentIdx];
    const ok = decOk(input, cv.dec);
    setFeedback({ correct: ok, correctAns: cv.display });
    if (ok) {
      if (phase === "drill") setCorrect(prev => ({ ...prev, [currentIdx]: (prev[currentIdx] || 0) + 1 }));
      else setReviewCorrect(prev => ({ ...prev, [currentIdx]: (prev[currentIdx] || 0) + 1 }));
    } else {
      if (phase === "drill") setNeeded(prev => ({ ...prev, [currentIdx]: (prev[currentIdx] || 2) + 1 }));
      else setReviewNeeded(prev => ({ ...prev, [currentIdx]: (prev[currentIdx] || 1) + 1 }));
    }
  };

  const handleNext = () => {
    setFeedback(null); setInput("");
    const cor = phase === "drill" ? correct : reviewCorrect;
    const nee = phase === "drill" ? needed : reviewNeeded;
    const rem = getRemaining(phase, cor, nee).filter(k => k !== currentIdx || (cor[currentIdx] || 0) + (feedback?.correct ? 1 : 0) < (nee[currentIdx] || 0));
    if (rem.length === 0) return;
    setCurrentIdx(randChoice(rem));
    setTimeout(() => inputRef.current?.focus(), 80);
  };

  if (phase === "memorize") return <DecConvMemorize onDone={() => { setPhase("drill"); setCurrentIdx(randInt(0, 3)); }} />;

  const pct = (timeLeft / TIMER) * 100;
  const color = timeLeft <= 2 ? "var(--red)" : timeLeft <= 3 ? "var(--amber)" : "var(--green)";
  const cv = CONVERSIONS[currentIdx];
  const cor = phase === "drill" ? correct : reviewCorrect;
  const nee = phase === "drill" ? needed : reviewNeeded;
  const doneCount = Object.keys(nee).filter(k => (cor[k] || 0) >= (nee[k] || 0)).length;

  return (
    <div>
      <div style={{ fontSize: 19, color: "var(--text3)", marginBottom: 10, fontWeight: 700 }}>
        {phase === "review" ? "Review: 1 correct each" : "Drill: 2 correct each"} -- {doneCount}/4 mastered
      </div>
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 20, color: "var(--text3)", marginBottom: 4 }}>
          <span>Time</span><span style={{ fontWeight: 700, color }}>{timeLeft}s</span>
        </div>
        <div style={{ height: 6, background: "var(--surface2)", borderRadius: 99, overflow: "hidden" }}>
          <div style={{ height: "100%", width: pct + "%", background: color, borderRadius: 99, transition: "width 0.9s linear" }} />
        </div>
      </div>
      <KaTeXBlock expr={`${cv.latex} = ?`} />
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

// - Activity 2: Writing Ratios (streak 3, 2 problems per set) -
const RATIO_STMT_PP = [
  { stmt: "There are 3 red marbles and 5 blue marbles. Ratio of red to blue?", a: 3, b: 5 },
  { stmt: "A class has 12 boys and 16 girls. Ratio of boys to girls?", a: 3, b: 4 },
  { stmt: "A bag has 8 apples and 6 oranges. Ratio of apples to oranges?", a: 4, b: 3 },
  { stmt: "A team won 9 games and lost 3. Ratio of wins to losses?", a: 3, b: 1 },
  { stmt: "A parking lot has 15 cars and 5 trucks. Ratio of cars to trucks?", a: 3, b: 1 },
  { stmt: "A bouquet has 6 roses and 9 tulips. Ratio of roses to tulips?", a: 2, b: 3 },
];
const RATIO_STMT_PW = [
  { stmt: "There are 5 red marbles and 3 green marbles. Ratio of green to total?", a: 3, b: 8 },
  { stmt: "A class has 20 students and 8 wear glasses. Ratio of glasses-wearers to total?", a: 2, b: 5 },
  { stmt: "A bag has 4 apples and 6 oranges. Ratio of apples to total fruits?", a: 2, b: 5 },
  { stmt: "A team has 7 wins and 3 losses. Ratio of losses to total games?", a: 3, b: 10 },
  { stmt: "There are 9 girls and 6 boys. Ratio of girls to total members?", a: 3, b: 5 },
];

function genRatioSet() {
  const pw = randChoice(RATIO_STMT_PW);
  const pp = randChoice(RATIO_STMT_PP.filter(p => p.a !== pw.a || p.b !== pw.b));
  return shuffle([pp, pw]);
}

function RatioWritingMastery({ onCorrect, onWrong }) {
  const [problems, setProblems] = useState(() => genRatioSet());
  const [answers, setAnswers] = useState(["", ""]);
  const [feedback, setFeedback] = useState(null);
  const [streak, setStreak] = useState(0);

  const handleSubmit = () => {
    const results = problems.map((p, i) => ratioOk(answers[i], p.a, p.b));
    const allOk = results.every(Boolean);
    setFeedback({ results, allOk, answers: [...answers] });
    if (allOk) { if (streak + 1 >= 3) { onCorrect(); } else setStreak(s => s + 1); }
    else setStreak(0);
  };

  const handleNext = () => {
    setProblems(genRatioSet()); setAnswers(["", ""]); setFeedback(null);
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 5, marginBottom: 14 }}>
        {[0, 1, 2].map(i => <div key={i} style={{ width: 13, height: 13, borderRadius: "50%", background: i < streak ? "var(--green)" : "var(--surface2)", border: "2px solid " + (i < streak ? "var(--green)" : "var(--border2)") }} />)}
        <span style={{ fontSize: 19, color: "var(--text3)", marginLeft: 6 }}>{streak}/3</span>
      </div>
      {feedback ? (
        <div>
          <div style={{ textAlign: "center", fontSize: 22, fontWeight: 800, color: feedback.allOk ? "var(--green)" : "var(--red)", marginBottom: 12 }}>
            {feedback.allOk ? "Correct!" : "Incorrect"}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
            {problems.map((p, i) => (
              <div key={i} style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "10px 14px", border: "1px solid " + (feedback.results[i] ? "rgba(22,163,74,0.2)" : "rgba(239,68,68,0.2)") }}>
                <div style={{ fontSize: 18, marginBottom: 4 }}>{p.stmt}</div>
                {!feedback.results[i] && <div style={{ fontSize: 17, color: "var(--red)" }}>You: {feedback.answers[i] || "-"}</div>}
                <div style={{ fontSize: 18, fontWeight: 700, color: "var(--green)" }}>Answer: {p.a}:{p.b}</div>
              </div>
            ))}
          </div>
          <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }} onClick={handleNext}>
            {feedback.allOk && streak + 1 >= 3 ? "Complete!" : "Next Set"}
          </button>
        </div>
      ) : (
        <div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
            {problems.map((p, i) => (
              <div key={i} style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "10px 14px" }}>
                <div style={{ fontSize: 18, marginBottom: 8 }}>{p.stmt}</div>
                <input value={answers[i]} onChange={e => setAnswers(prev => prev.map((x, j) => j === i ? e.target.value : x))}
                  placeholder="e.g. 3:5"
                  style={{ textAlign: "center", fontSize: 20, fontFamily: "var(--mono)", fontWeight: 700, padding: "6px 10px", width: "100%", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--surface)" }} />
              </div>
            ))}
          </div>
          <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }} onClick={handleSubmit}
            disabled={answers.some(a => a.trim() === "")}>Submit</button>
        </div>
      )}
    </div>
  );
}

// - Activity 3: Simplifying Ratios (streak 3, 2 problems per set) -
const SIMPLIFY_POOL = [
  { display: "6:9", a: 6, b: 9, ra: 2, rb: 3 },
  { display: "15:20", a: 15, b: 20, ra: 3, rb: 4 },
  { display: "24:30", a: 24, b: 30, ra: 4, rb: 5 },
  { display: "14:21", a: 14, b: 21, ra: 2, rb: 3 },
  { display: "12:16", a: 12, b: 16, ra: 3, rb: 4 },
  { display: "10:25", a: 10, b: 25, ra: 2, rb: 5 },
  { display: "8:12", a: 8, b: 12, ra: 2, rb: 3 },
  { display: "18:24", a: 18, b: 24, ra: 3, rb: 4 },
  { display: "20:28", a: 20, b: 28, ra: 5, rb: 7 },
  { display: "9:15", a: 9, b: 15, ra: 3, rb: 5 },
  { display: "16:20", a: 16, b: 20, ra: 4, rb: 5 },
  { display: "30:45", a: 30, b: 45, ra: 2, rb: 3 },
];

function SimplifyMastery({ onCorrect, onWrong }) {
  const [problems, setProblems] = useState(() => shuffle([...SIMPLIFY_POOL]).slice(0, 2));
  const [answers, setAnswers] = useState(["", ""]);
  const [feedback, setFeedback] = useState(null);
  const [streak, setStreak] = useState(0);

  const handleSubmit = () => {
    const results = problems.map((p, i) => ratioOk(answers[i], p.ra, p.rb));
    const allOk = results.every(Boolean);
    setFeedback({ results, allOk, answers: [...answers] });
    if (allOk) { if (streak + 1 >= 3) { onCorrect(); } else setStreak(s => s + 1); }
    else setStreak(0);
  };

  const handleNext = () => {
    setProblems(shuffle([...SIMPLIFY_POOL]).slice(0, 2)); setAnswers(["", ""]); setFeedback(null);
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 5, marginBottom: 14 }}>
        {[0, 1, 2].map(i => <div key={i} style={{ width: 13, height: 13, borderRadius: "50%", background: i < streak ? "var(--green)" : "var(--surface2)", border: "2px solid " + (i < streak ? "var(--green)" : "var(--border2)") }} />)}
        <span style={{ fontSize: 19, color: "var(--text3)", marginLeft: 6 }}>{streak}/3</span>
      </div>
      {feedback ? (
        <div>
          <div style={{ textAlign: "center", fontSize: 22, fontWeight: 800, color: feedback.allOk ? "var(--green)" : "var(--red)", marginBottom: 12 }}>
            {feedback.allOk ? "Correct!" : "Incorrect"}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
            {problems.map((p, i) => (
              <div key={i} style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "10px 14px", border: "1px solid " + (feedback.results[i] ? "rgba(22,163,74,0.2)" : "rgba(239,68,68,0.2)") }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{p.display}</div>
                {!feedback.results[i] && <div style={{ fontSize: 17, color: "var(--red)" }}>You: {feedback.answers[i] || "-"}</div>}
                <div style={{ fontSize: 18, fontWeight: 700, color: "var(--green)" }}>Answer: {p.ra}:{p.rb}</div>
              </div>
            ))}
          </div>
          <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }} onClick={handleNext}>
            {feedback.allOk && streak + 1 >= 3 ? "Complete!" : "Next Set"}
          </button>
        </div>
      ) : (
        <div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
            {problems.map((p, i) => (
              <div key={i} style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "10px 14px" }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: 22, fontWeight: 700, marginBottom: 8 }}>{p.display}</div>
                <input value={answers[i]} onChange={e => setAnswers(prev => prev.map((x, j) => j === i ? e.target.value : x))}
                  placeholder="e.g. 2:3"
                  style={{ textAlign: "center", fontSize: 20, fontFamily: "var(--mono)", fontWeight: 700, padding: "6px 10px", width: "100%", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--surface)" }} />
              </div>
            ))}
          </div>
          <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }} onClick={handleSubmit}
            disabled={answers.some(a => a.trim() === "")}>Submit</button>
        </div>
      )}
    </div>
  );
}

// - Activity 4: Missing Term in Proportion (streak 3, 2 per set) -
const MISSING_POOL = [
  { ratio: "3:4 = x:12", x: 9, a: 3, b: 4, d: 12, work: "Cross multiply: 3 x 12 = 4 x X => 36 = 4X => X = 9" },
  { ratio: "5:6 = 10:x", x: 12, a: 5, b: 6, c: 10, work: "Cross multiply: 5 x X = 6 x 10 => 5X = 60 => X = 12" },
  { ratio: "x:7 = 4:14", x: 2, b: 7, c: 4, d: 14, work: "Cross multiply: X x 14 = 7 x 4 => 14X = 28 => X = 2" },
  { ratio: "2:3 = x:9", x: 6, a: 2, b: 3, d: 9, work: "Cross multiply: 2 x 9 = 3 x X => 18 = 3X => X = 6" },
  { ratio: "3:5 = x:15", x: 9, a: 3, b: 5, d: 15, work: "Cross multiply: 3 x 15 = 5 x X => 45 = 5X => X = 9" },
  { ratio: "x:4 = 6:8", x: 3, b: 4, c: 6, d: 8, work: "Cross multiply: X x 8 = 4 x 6 => 8X = 24 => X = 3" },
  { ratio: "1:3 = x:12", x: 4, a: 1, b: 3, d: 12, work: "Cross multiply: 1 x 12 = 3 x X => 12 = 3X => X = 4" },
  { ratio: "4:5 = x:20", x: 16, a: 4, b: 5, d: 20, work: "Cross multiply: 4 x 20 = 5 x X => 80 = 5X => X = 16" },
  { ratio: "2:7 = x:21", x: 6, a: 2, b: 7, d: 21, work: "Cross multiply: 2 x 21 = 7 x X => 42 = 7X => X = 6" },
  { ratio: "5:8 = 15:x", x: 24, a: 5, b: 8, c: 15, work: "Cross multiply: 5 x X = 8 x 15 => 5X = 120 => X = 24" },
];

function MissingTermMastery({ onCorrect, onWrong }) {
  const [problems, setProblems] = useState(() => shuffle([...MISSING_POOL]).slice(0, 2));
  const [answers, setAnswers] = useState(["", ""]);
  const [feedback, setFeedback] = useState(null);
  const [streak, setStreak] = useState(0);

  const handleSubmit = () => {
    const results = problems.map((p, i) => {
      const v = parseFloat(String(answers[i] || "").trim());
      return !isNaN(v) && Math.abs(v - p.x) < 1e-9;
    });
    const allOk = results.every(Boolean);
    setFeedback({ results, allOk, answers: [...answers] });
    if (allOk) { if (streak + 1 >= 3) { onCorrect(); } else setStreak(s => s + 1); }
    else setStreak(0);
  };

  const handleNext = () => {
    setProblems(shuffle([...MISSING_POOL]).slice(0, 2)); setAnswers(["", ""]); setFeedback(null);
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 5, marginBottom: 14 }}>
        {[0, 1, 2].map(i => <div key={i} style={{ width: 13, height: 13, borderRadius: "50%", background: i < streak ? "var(--green)" : "var(--surface2)", border: "2px solid " + (i < streak ? "var(--green)" : "var(--border2)") }} />)}
        <span style={{ fontSize: 19, color: "var(--text3)", marginLeft: 6 }}>{streak}/3</span>
      </div>
      {feedback ? (
        <div>
          <div style={{ textAlign: "center", fontSize: 22, fontWeight: 800, color: feedback.allOk ? "var(--green)" : "var(--red)", marginBottom: 12 }}>
            {feedback.allOk ? "Correct!" : "Incorrect"}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
            {problems.map((p, i) => (
              <div key={i} style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "10px 14px", border: "1px solid " + (feedback.results[i] ? "rgba(22,163,74,0.2)" : "rgba(239,68,68,0.2)") }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{p.ratio}</div>
                {!feedback.results[i] && (
                  <>
                    <div style={{ fontSize: 17, color: "var(--red)", marginBottom: 4 }}>You: {feedback.answers[i] || "-"}</div>
                    <div style={{ fontSize: 16, color: "var(--text2)", fontFamily: "var(--mono)", whiteSpace: "pre-line", marginBottom: 4 }}>{p.work}</div>
                  </>
                )}
                <div style={{ fontSize: 18, fontWeight: 700, color: "var(--green)" }}>x = {p.x}</div>
              </div>
            ))}
          </div>
          <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }} onClick={handleNext}>
            {feedback.allOk && streak + 1 >= 3 ? "Complete!" : "Next Set"}
          </button>
        </div>
      ) : (
        <div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
            {problems.map((p, i) => (
              <div key={i} style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "10px 14px" }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: 22, fontWeight: 700, marginBottom: 8 }}>{p.ratio}</div>
                <input value={answers[i]} onChange={e => setAnswers(prev => prev.map((x, j) => j === i ? e.target.value : x))}
                  placeholder="x = ?"
                  style={{ textAlign: "center", fontSize: 20, fontFamily: "var(--mono)", fontWeight: 700, padding: "6px 10px", width: "100%", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--surface)" }} />
              </div>
            ))}
          </div>
          <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }} onClick={handleSubmit}
            disabled={answers.some(a => a.trim() === "")}>Submit</button>
        </div>
      )}
    </div>
  );
}

// - Steps -
const STEPS = [
  { id: "ratio-writing", label: "Writing Ratios", description: "3 correct sets to pass. Enter ratios in simplest form (e.g. 3:5)." },
  { id: "simplify", label: "Simplifying Ratios", description: "3 correct sets to pass. Enter simplified ratio (e.g. 2:3)." },
  { id: "missing", label: "Missing Term in Proportion", description: "3 correct sets to pass. Find the value of x." },
];

export default function Lesson20MasteryPlayer({ user, topic, onHome }) {
  const topicId = topic?.id || LESSON20_MASTERY_TOPIC_ID;
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
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>HW 20 (019) Complete!</h2>
        <p style={{ fontSize: 20, color: "var(--text2)", marginBottom: 24 }}>Ratios and proportions mastered!</p>
        <button className="btn btn-primary btn-lg" style={{ width: "100%" }} onClick={onHome}>Back to Home</button>
      </div>
    </div>
  );

  const step = STEPS[stepIdx]; if (!step) return null;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "clamp(16px,3vw,32px)" }} className="dot-bg">
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,var(--blue),var(--orange))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "#fff" }}>L20</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 22 }}>HW 20 (019): Mastery Activities</div>
              <div style={{ fontSize: 20, color: "var(--text3)" }}>3 correct sets to advance each activity</div>
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
          {step.id === "ratio-writing" && <RatioWritingMastery key={stepIdx} onCorrect={handleCorrect} onWrong={handleWrong} />}
          {step.id === "simplify"      && <SimplifyMastery     key={stepIdx} onCorrect={handleCorrect} onWrong={handleWrong} />}
          {step.id === "missing"       && <MissingTermMastery  key={stepIdx} onCorrect={handleCorrect} onWrong={handleWrong} />}
        </div>
      </div>
    </div>
  );
}

// - Standalone Decimal Conversion Drill -
export function DecConvDrillPlayer({ user, topic, onHome }) {
  const topicId = topic?.id || DEC_CONV_DRILL_TOPIC_ID;
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  useEffect(() => { getProgress(user.id, topicId).then(prog => { if (prog?.data?.completed) setCompleted(true); setLoading(false); }); }, []);
  const handleComplete = async () => { await fbSaveProgress(user.id, topicId, { started: true, completed: true, percentComplete: 100, data: { completed: true } }); setCompleted(true); };
  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><div className="spinner" /></div>;
  if (completed) return (
    <div style={{ maxWidth: 520, margin: "0 auto", textAlign: "center" }}>
      <div className="card">
        <div style={{ fontSize: 48, fontWeight: 900, color: "var(--amber)", marginBottom: 16 }}>100%</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Decimal Conversions Drill Complete!</h2>
        <button className="btn btn-primary btn-lg" style={{ width: "100%" }} onClick={onHome}>Back to Home</button>
      </div>
    </div>
  );
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "clamp(16px,3vw,32px)" }} className="dot-bg">
      <div style={{ maxWidth: 580, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,var(--blue),var(--orange))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "#fff" }}>20</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 22 }}>Decimal Conversions: 1/20, 1/25, 1/50, 1/100</div>
              <div style={{ fontSize: 20, color: "var(--text3)" }}>Memorize then drill: 5s timer, 2 correct each</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onHome}>Back</button>
        </div>
        <div className="card"><DecConvDrill onComplete={handleComplete} /></div>
      </div>
    </div>
  );
}

