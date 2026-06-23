import { useState, useEffect, useRef } from "react";
import { saveProgress as fbSaveProgress, getProgress } from "./core/firebase";

export const LESSON23_MASTERY_TOPIC_ID = "lesson23-mastery-v1";

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randChoice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function shuffle(arr) { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); return b === 0 ? a : gcd(b, a % b); }
function reduce(n, d) { const g = gcd(Math.abs(n), Math.abs(d)); return [n / g, d / g]; }

function decOk(input, correct) {
  const v = parseFloat(String(input || "").trim().replace(/[$,]/g, ""));
  return !isNaN(v) && Math.abs(v - correct) < 1e-6;
}
function fracOk(input, rn, rd) {
  const s = String(input || "").trim();
  const fx = s.match(/^(\d+)\/(\d+)$/); if (!fx) return false;
  const n = parseInt(fx[1]), d = parseInt(fx[2]);
  const [in_, id_] = reduce(n, d); const [cn, cd] = reduce(rn, rd);
  return in_ === cn && id_ === cd;
}
function pctOk(input, correct) {
  const s = String(input || "").trim().toLowerCase().replace(/percent/, "").replace(/%/, "").trim();
  const v = parseFloat(s);
  return !isNaN(v) && Math.abs(v - correct) < 1e-6;
}

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
function frac(n, d) { return `\\dfrac{${n}}{${d}}`; }

function StreakDots({ current, needed }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
      {Array.from({ length: needed }).map((_, i) => (
        <div key={i} style={{ width: 13, height: 13, borderRadius: "50%", background: i < current ? "var(--green)" : "var(--surface2)", border: "2px solid " + (i < current ? "var(--green)" : "var(--border2)") }} />
      ))}
      <span style={{ fontSize: 19, color: "var(--text3)", marginLeft: 6 }}>{current}/{needed}</span>
    </div>
  );
}

function StreakMastery({ genProblems, renderProblem, gradeProblem, workedSolution, placeholder, onCorrect, onWrong }) {
  const [problems, setProblems] = useState(() => genProblems());
  const [answers, setAnswers] = useState(() => Array(problems.length).fill(""));
  const [feedback, setFeedback] = useState(null);
  const [streak, setStreak] = useState(0);

  const handleSubmit = () => {
    const results = problems.map((p, i) => { try { return gradeProblem(answers[i], p); } catch { return false; } });
    const allOk = results.every(Boolean);
    setFeedback({ results, allOk, answers: [...answers] });
    if (allOk) { if (streak + 1 >= 3) { onCorrect(); } else setStreak(s => s + 1); }
    else setStreak(0);
  };

  const handleNext = () => {
    const fresh = genProblems();
    setProblems(fresh); setAnswers(Array(fresh.length).fill("")); setFeedback(null);
  };

  if (feedback) return (
    <div>
      <div style={{ textAlign: "center", fontSize: 22, fontWeight: 800, color: feedback.allOk ? "var(--green)" : "var(--red)", marginBottom: 12 }}>
        {feedback.allOk ? "Correct!" : "Incorrect"}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
        {problems.map((p, i) => {
          const ok = feedback.results[i];
          const ws = workedSolution ? workedSolution(p) : null;
          return (
            <div key={i} style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "10px 14px", border: "1px solid " + (ok ? "rgba(22,163,74,0.2)" : "rgba(239,68,68,0.2)") }}>
              <div style={{ marginBottom: 4 }}>{renderProblem(p)}</div>
              {!ok && <div style={{ fontSize: 17, color: "var(--red)", marginBottom: 2 }}>You: <span style={{ fontFamily: "var(--mono)" }}>{feedback.answers[i] || "-"}</span></div>}
              {!ok && ws && <div style={{ fontSize: 16, color: "var(--text2)", fontFamily: "var(--mono)", whiteSpace: "pre-line", marginBottom: 4 }}>{ws}</div>}
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--green)" }}>Answer: <span style={{ fontFamily: "var(--mono)" }}>{p.displayAnswer}</span></div>
            </div>
          );
        })}
      </div>
      <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }} onClick={handleNext}>
        {feedback.allOk && streak + 1 >= 3 ? "Complete!" : "Next Set"}
      </button>
    </div>
  );

  return (
    <div>
      <StreakDots current={streak} needed={3} />
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
        {problems.map((p, i) => (
          <div key={i} style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "10px 14px" }}>
            <div style={{ marginBottom: 8 }}>{renderProblem(p)}</div>
            <input value={answers[i]} onChange={e => setAnswers(prev => prev.map((x, j) => j === i ? e.target.value : x))}
              placeholder={placeholder || "answer"}
              style={{ textAlign: "center", fontSize: 20, fontFamily: "var(--mono)", fontWeight: 700, padding: "6px 10px", width: "100%", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--surface)" }} />
          </div>
        ))}
      </div>
      <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }} onClick={handleSubmit}
        disabled={answers.some(a => a.trim() === "")}>Submit</button>
    </div>
  );
}

const PCT_TO_FRAC_POOL = [
  { pct: 25, rn: 1, rd: 4 }, { pct: 50, rn: 1, rd: 2 }, { pct: 75, rn: 3, rd: 4 },
  { pct: 20, rn: 1, rd: 5 }, { pct: 40, rn: 2, rd: 5 }, { pct: 60, rn: 3, rd: 5 },
  { pct: 80, rn: 4, rd: 5 }, { pct: 10, rn: 1, rd: 10 }, { pct: 30, rn: 3, rd: 10 },
  { pct: 70, rn: 7, rd: 10 },
];
function genPctToFracSet() {
  return shuffle([...PCT_TO_FRAC_POOL]).slice(0, 3).map(p => ({ ...p, displayAnswer: `${p.rn}/${p.rd}` }));
}
function PctToFracMastery({ onCorrect, onWrong }) {
  return <StreakMastery
    genProblems={genPctToFracSet}
    renderProblem={p => <span style={{ fontFamily: "var(--mono)", fontSize: 22, fontWeight: 700 }}>{p.pct}%</span>}
    gradeProblem={(input, p) => fracOk(input, p.rn, p.rd)}
    placeholder="e.g. 3/4"
    onCorrect={onCorrect} onWrong={onWrong}
  />;
}

const FRAC_TO_PCT_POOL = [
  { rn: 1, rd: 2, pct: 50 }, { rn: 1, rd: 4, pct: 25 }, { rn: 3, rd: 4, pct: 75 },
  { rn: 1, rd: 5, pct: 20 }, { rn: 2, rd: 5, pct: 40 }, { rn: 3, rd: 5, pct: 60 },
  { rn: 4, rd: 5, pct: 80 }, { rn: 1, rd: 10, pct: 10 }, { rn: 7, rd: 10, pct: 70 },
  { rn: 1, rd: 20, pct: 5 }, { rn: 3, rd: 20, pct: 15 }, { rn: 1, rd: 25, pct: 4 },
  { rn: 1, rd: 50, pct: 2 },
];
function genFracToPctSet() {
  return shuffle([...FRAC_TO_PCT_POOL]).slice(0, 3).map(p => ({ ...p, displayAnswer: `${p.pct}%` }));
}
function FracToPctMastery({ onCorrect, onWrong }) {
  return <StreakMastery
    genProblems={genFracToPctSet}
    renderProblem={p => <KaTeX expr={frac(p.rn, p.rd)} />}
    gradeProblem={(input, p) => pctOk(input, p.pct)}
    placeholder="e.g. 75%"
    onCorrect={onCorrect} onWrong={onWrong}
  />;
}

const PCT_TO_DEC_POOL = [
  { dir: "p2d", pct: 45, dec: 0.45 }, { dir: "p2d", pct: 8, dec: 0.08 },
  { dir: "p2d", pct: 150, dec: 1.5 }, { dir: "p2d", pct: 60, dec: 0.6 },
  { dir: "p2d", pct: 25, dec: 0.25 }, { dir: "p2d", pct: 120, dec: 1.2 },
];
const DEC_TO_PCT_POOL = [
  { dir: "d2p", dec: 0.75, pct: 75 }, { dir: "d2p", dec: 0.03, pct: 3 },
  { dir: "d2p", dec: 1.2, pct: 120 }, { dir: "d2p", dec: 0.6, pct: 60 },
  { dir: "d2p", dec: 0.45, pct: 45 }, { dir: "d2p", dec: 1.5, pct: 150 },
];
function genPctDecSet() {
  const p2d = shuffle([...PCT_TO_DEC_POOL]).slice(0, 2);
  const d2p = shuffle([...DEC_TO_PCT_POOL]).slice(0, 2);
  return shuffle([...p2d, ...d2p]).map(p => ({
    ...p, displayAnswer: p.dir === "p2d" ? String(p.dec) : `${p.pct}%`,
  }));
}
function PctDecMastery({ onCorrect, onWrong }) {
  return <StreakMastery
    genProblems={genPctDecSet}
    renderProblem={p => <span style={{ fontFamily: "var(--mono)", fontSize: 22, fontWeight: 700 }}>{p.dir === "p2d" ? `${p.pct}%` : `${p.dec}`}</span>}
    gradeProblem={(input, p) => p.dir === "p2d" ? decOk(input, p.dec) : pctOk(input, p.pct)}
    placeholder="decimal or %"
    onCorrect={onCorrect} onWrong={onWrong}
  />;
}

function genPctOfPool() {
  const pool = [];
  const pcts = [5, 8, 10, 12, 15, 20, 25, 30, 40, 45, 50, 60, 65, 70, 75, 80, 90, 110, 125, 150];
  const nums = [40, 50, 60, 75, 80, 90, 100, 120, 150, 160, 180, 200, 220, 250, 300, 400, 500];
  for (const pct of pcts) {
    for (const num of nums) {
      const raw = (pct / 100) * num;
      const rounded = Math.round(raw * 10) / 10;
      if (Math.abs(raw - rounded) < 1e-9) pool.push({ pct, num, answer: rounded });
    }
  }
  return pool;
}
const PCT_OF_POOL = genPctOfPool();
function genPctOfSet() {
  return shuffle([...PCT_OF_POOL]).slice(0, 2).map(p => ({
    ...p, displayAnswer: String(p.answer),
    work: `${p.pct}% = ${p.pct / 100}\n${p.num} x ${p.pct / 100} = ${p.answer}`,
  }));
}
function PctOfMastery({ onCorrect, onWrong }) {
  return <StreakMastery
    genProblems={genPctOfSet}
    renderProblem={p => <span style={{ fontFamily: "var(--mono)", fontSize: 22, fontWeight: 700 }}>{p.pct}% of {p.num}</span>}
    gradeProblem={(input, p) => decOk(input, p.answer)}
    workedSolution={p => p.work}
    placeholder="number"
    onCorrect={onCorrect} onWrong={onWrong}
  />;
}

const WORD_PROB_POOL = [
  { problem: "A $40 shirt is 25% off. What is the sale price?", answer: 30,
    work: "Discount: 40 x 0.25 = 10\nSale price: 40 - 10 = 30" },
  { problem: "A $50 meal has a 20% tip. What is the tip amount?", answer: 10,
    work: "Tip: 50 x 0.20 = 10" },
  { problem: "A $300 TV is discounted 15%. What is the new price?", answer: 255,
    work: "Discount: 300 x 0.15 = 45\nNew price: 300 - 45 = 255" },
  { problem: "Sales tax is 8%. What is the total cost of a $25 purchase (including tax)?", answer: 27,
    work: "Tax: 25 x 0.08 = 2\nTotal: 25 + 2 = 27" },
  { problem: "A population of 200 increases by 10%. What is the new population?", answer: 220,
    work: "Increase: 200 x 0.10 = 20\nNew total: 200 + 20 = 220" },
  { problem: "A $60 jacket is marked down 30%. What is the sale price?", answer: 42,
    work: "Discount: 60 x 0.30 = 18\nSale price: 60 - 18 = 42" },
  { problem: "A $80 item has 5% sales tax added. What is the total cost?", answer: 84,
    work: "Tax: 80 x 0.05 = 4\nTotal: 80 + 4 = 84" },
  { problem: "A $90 restaurant bill gets an 18% tip. What is the tip amount?", answer: 16.2,
    work: "Tip: 90 x 0.18 = 16.2" },
  { problem: "A $120 bicycle is on sale for 20% off. What is the sale price?", answer: 96,
    work: "Discount: 120 x 0.20 = 24\nSale price: 120 - 24 = 96" },
  { problem: "A class of 150 students grows by 6%. How many students are there now?", answer: 159,
    work: "Increase: 150 x 0.06 = 9\nNew total: 150 + 9 = 159" },
  { problem: "A $70 video game has a 7% sales tax added. What is the total cost?", answer: 74.9,
    work: "Tax: 70 x 0.07 = 4.9\nTotal: 70 + 4.9 = 74.9" },
  { problem: "A $200 phone is discounted 35%. What is the sale price?", answer: 130,
    work: "Discount: 200 x 0.35 = 70\nSale price: 200 - 70 = 130" },
];
function genWordProbSet() {
  return shuffle([...WORD_PROB_POOL]).slice(0, 2).map(p => ({ ...p, displayAnswer: "$" + p.answer }));
}
function WordProbMastery({ onCorrect, onWrong }) {
  return <StreakMastery
    genProblems={genWordProbSet}
    renderProblem={p => <span style={{ fontSize: 18 }}>{p.problem}</span>}
    gradeProblem={(input, p) => decOk(input, p.answer)}
    workedSolution={p => p.work}
    placeholder="$ amount"
    onCorrect={onCorrect} onWrong={onWrong}
  />;
}

const STEPS = [
  { id: "pct-to-frac", label: "Percent to Fraction",     description: "3 problems, 3 correct sets to pass." },
  { id: "frac-to-pct", label: "Fraction to Percent",     description: "3 problems, 3 correct sets to pass." },
  { id: "pct-dec",     label: "Percent / Decimal (Both Ways)", description: "4 problems, 3 correct sets to pass." },
  { id: "pct-of",      label: "Percent of a Number",     description: "2 problems, 3 correct sets to pass." },
  { id: "word-prob",   label: "Percent Word Problems",   description: "2 problems, 3 correct sets to pass." },
];

export default function Lesson23MasteryPlayer({ user, topic, onHome }) {
  const topicId = topic?.id || LESSON23_MASTERY_TOPIC_ID;
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
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>HW 23 (019) Complete!</h2>
        <p style={{ fontSize: 20, color: "var(--text2)", marginBottom: 24 }}>Percent mastered!</p>
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
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,var(--blue),var(--orange))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "#fff" }}>L23</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 22 }}>HW 23 (019): Mastery Activities</div>
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
          {step.id === "pct-to-frac" && <PctToFracMastery key={stepIdx} onCorrect={handleCorrect} onWrong={handleWrong} />}
          {step.id === "frac-to-pct" && <FracToPctMastery key={stepIdx} onCorrect={handleCorrect} onWrong={handleWrong} />}
          {step.id === "pct-dec"     && <PctDecMastery    key={stepIdx} onCorrect={handleCorrect} onWrong={handleWrong} />}
          {step.id === "pct-of"      && <PctOfMastery     key={stepIdx} onCorrect={handleCorrect} onWrong={handleWrong} />}
          {step.id === "word-prob"   && <WordProbMastery  key={stepIdx} onCorrect={handleCorrect} onWrong={handleWrong} />}
        </div>
      </div>
    </div>
  );
}
