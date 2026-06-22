import { useState, useEffect, useRef } from "react";
import { saveProgress as fbSaveProgress, getProgress } from "./core/firebase";

export const LESSON18_MASTERY_TOPIC_ID = "lesson18-mastery-v1";
export const DEC_MENTAL_TOPIC_ID = "dec-mental-v1";

const TIMER = 15;

// -- Math helpers --
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randChoice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function shuffle(arr) { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); return b === 0 ? a : gcd(b, a % b); }
function reduce(n, d) { if (n === 0) return [0, 1]; const g = gcd(Math.abs(n), Math.abs(d)); return [n / g, d / g]; }

function fmtDec(n) {
  // Format decimal without unnecessary trailing zeros, but keep precision
  return String(parseFloat(n.toPrecision(10)));
}

function decOk(input, correct) {
  const v = parseFloat(String(input).trim().replace(/,/g, ""));
  return !isNaN(v) && Math.abs(v - correct) < 1e-9;
}

function fracOk(input, rn, rd) {
  const s = String(input || "").trim();
  if (!s) return false;
  const neg = s.startsWith("-"); const abs = neg ? s.slice(1).trim() : s;
  const mx = abs.replace(/\s*-\s*/g, " ").match(/^(\d+)\s+(\d+)\/(\d+)$/);
  let num, den;
  if (mx) { num = parseInt(mx[1]) * parseInt(mx[3]) + parseInt(mx[2]); den = parseInt(mx[3]); }
  else { const fx = abs.match(/^(\d+)\/(\d+)$/); if (fx) { num = parseInt(fx[1]); den = parseInt(fx[2]); } else { const ix = abs.match(/^(\d+)$/); if (ix) { num = parseInt(ix[1]); den = 1; } else return false; } }
  if (neg) num = -num;
  const [in_, id_] = reduce(num, den); const [cn, cd] = reduce(rn, rd);
  return in_ === cn && id_ === cd;
}

function fmtFrac(n, d) {
  const [rn, rd] = reduce(n, d);
  if (rd === 1) return String(rn);
  if (Math.abs(rn) > rd) { const w = Math.floor(Math.abs(rn) / rd); const r = Math.abs(rn) % rd; return `${rn < 0 ? "-" : ""}${w} ${r}/${rd}`; }
  return `${rn}/${rd}`;
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

// -- Six-problem mastery (all-correct-to-pass) --
function SixMastery({ problems, renderProblem, gradeProblem, workedSolution, answerLabel, onCorrect, onWrong, renderInput }) {
  const [answers, setAnswers] = useState(Array(problems.length).fill(""));
  const [feedback, setFeedback] = useState(null);

  const handleSubmit = () => {
    const results = problems.map((p, i) => { try { return gradeProblem(answers[i], p); } catch { return false; } });
    const allOk = results.every(Boolean);
    setFeedback({ results, allOk, answers: [...answers] });
  };

  const handleNext = () => {
    const wasOk = feedback?.allOk;
    setAnswers(Array(problems.length).fill("")); setFeedback(null);
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
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--green)" }}>
                {answerLabel || "Answer:"} <span style={{ fontFamily: "var(--mono)" }}>{typeof p.answer === "number" ? fmtDec(p.answer) : p.answer}</span>
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

  const allFilled = answers.every(a => a.trim() !== "");
  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
        {problems.map((p, i) => (
          <div key={i} style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "10px 14px" }}>
            <div style={{ marginBottom: 8 }}>{renderProblem(p)}</div>
            {renderInput ? renderInput(i, answers[i], v => setAnswers(prev => prev.map((x, j) => j === i ? v : x))) : (
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

// -- Activity 1: Multiply/Divide Decimal by 10, 100, 1000 --
function genDecMental() {
  const op = randChoice(["*", "/"]);
  const power = randChoice([10, 100, 1000]);
  // Generate a decimal with 1-3 decimal places
  const places = randInt(1, 3);
  const intPart = randInt(0, 9);
  let decPart = "";
  for (let i = 0; i < places; i++) decPart += randInt(i === 0 ? 1 : 0, 9);
  const value = parseFloat(`${intPart}.${decPart}`);
  const answer = op === "*" ? value * power : value / power;
  return { value, power, op, answer: parseFloat(answer.toPrecision(10)), display: `${value} ${op === "*" ? "\\times" : "\\div"} ${power}` };
}

function DecMentalTutorial({ onStart }) {
  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 16 }}>Multiplying and Dividing Decimals by 10, 100, or 1000</div>
      <div style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "16px", marginBottom: 16, fontSize: 20, lineHeight: 1.7 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Rule: Move the decimal point.</div>
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontWeight: 600 }}>Multiply by 10, 100, 1000 - move decimal RIGHT</div>
          <div style={{ color: "var(--green)" }}>3.45 x 10 = 34.5 &nbsp; (1 place right)</div>
          <div style={{ color: "var(--green)" }}>3.45 x 100 = 345 &nbsp; (2 places right)</div>
          <div style={{ color: "var(--green)" }}>3.45 x 1000 = 3450 &nbsp; (3 places right)</div>
        </div>
        <div>
          <div style={{ fontWeight: 600 }}>Divide by 10, 100, 1000 - move decimal LEFT</div>
          <div style={{ color: "var(--blue)" }}>3.45 / 10 = 0.345 &nbsp; (1 place left)</div>
          <div style={{ color: "var(--blue)" }}>3.45 / 100 = 0.0345 &nbsp; (2 places left)</div>
          <div style={{ color: "var(--blue)" }}>3.45 / 1000 = 0.00345 &nbsp; (3 places left)</div>
        </div>
      </div>
      <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }} onClick={onStart}>Start Drill</button>
    </div>
  );
}

function DecMentalMastery({ onComplete }) {
  const [showTutorial, setShowTutorial] = useState(true);
  const [q, setQ] = useState(() => genDecMental());
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
    setFeedback({ correct: false, msg: fmtDec(q.answer) });
    setStreak(0);
  };

  const handleSubmit = () => {
    clearInterval(timerRef.current);
    const ok = decOk(input, q.answer);
    setFeedback({ correct: ok, msg: fmtDec(q.answer) });
    if (ok) { if (streak + 1 >= 3) { setTimeout(onComplete, 300); } else setStreak(s => s + 1); }
    else setStreak(0);
  };

  const handleNext = () => {
    setFeedback(null); setInput(""); setQ(genDecMental()); setTimeLeft(TIMER);
    setTimeout(() => inputRef.current?.focus(), 80);
  };

  if (showTutorial) return <DecMentalTutorial onStart={() => setShowTutorial(false)} />;

  const pct = (timeLeft / TIMER) * 100;
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
      <div style={{ display: "flex", gap: 5, marginBottom: 14 }}>
        {[0, 1, 2].map(i => <div key={i} style={{ width: 13, height: 13, borderRadius: "50%", background: i < streak ? "var(--green)" : "var(--surface2)", border: "2px solid " + (i < streak ? "var(--green)" : "var(--border2)") }} />)}
        <span style={{ fontSize: 19, color: "var(--text3)", marginLeft: 6 }}>{streak}/3</span>
      </div>
      <KaTeXBlock expr={q.display} />
      {feedback ? (
        <div style={{ textAlign: "center", marginTop: 10 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: feedback.correct ? "var(--green)" : "var(--red)", marginBottom: 10 }}>{feedback.correct ? "Correct!" : "Incorrect"}</div>
          {!feedback.correct && <div style={{ fontSize: 20, color: "var(--text2)", marginBottom: 14, fontFamily: "var(--mono)", fontWeight: 700 }}>Answer: {feedback.msg}</div>}
          <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }} onClick={handleNext}>Next Problem</button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && input.trim() && handleSubmit()} placeholder="Enter answer" autoFocus
            style={{ textAlign: "center", fontSize: 22, fontFamily: "var(--mono)", fontWeight: 700, padding: "10px", width: 200 }} />
          <button className="btn btn-primary" style={{ fontSize: 20, padding: "10px 20px" }} onClick={handleSubmit} disabled={!input.trim()}>OK</button>
        </div>
      )}
    </div>
  );
}

// -- Activity 2: Place Value --
const PLACE_NAMES = ["tenths", "hundredths", "thousandths", "ten-thousandths"];
const PLACE_VALUE_POOL = [
  { number: "12.309", underlineIdx: 3, digit: 3, answer: "tenths" },
  { number: "12.309", underlineIdx: 4, digit: 0, answer: "hundredths" },
  { number: "0.0084", underlineIdx: 3, digit: 0, answer: "tenths" },
  { number: "0.0084", underlineIdx: 4, digit: 8, answer: "thousandths" },
  { number: "7.4251", underlineIdx: 2, digit: 4, answer: "tenths" },
  { number: "7.4251", underlineIdx: 3, digit: 2, answer: "hundredths" },
  { number: "7.4251", underlineIdx: 4, digit: 5, answer: "thousandths" },
  { number: "100.37", underlineIdx: 4, digit: 3, answer: "tenths" },
  { number: "100.37", underlineIdx: 5, digit: 7, answer: "hundredths" },
  { number: "0.1234", underlineIdx: 2, digit: 1, answer: "tenths" },
  { number: "0.1234", underlineIdx: 3, digit: 2, answer: "hundredths" },
  { number: "0.1234", underlineIdx: 4, digit: 3, answer: "thousandths" },
  { number: "23.4",   underlineIdx: 3, digit: 4, answer: "tenths" },
  { number: "9.0003", underlineIdx: 2, digit: 0, answer: "tenths" },
  { number: "9.0003", underlineIdx: 5, digit: 3, answer: "ten-thousandths" },
  { number: "0.7891", underlineIdx: 2, digit: 7, answer: "tenths" },
  { number: "0.7891", underlineIdx: 3, digit: 8, answer: "hundredths" },
  { number: "4.5",    underlineIdx: 2, digit: 5, answer: "tenths" },
  { number: "0.0405", underlineIdx: 3, digit: 4, answer: "hundredths" },
  { number: "0.0405", underlineIdx: 5, digit: 5, answer: "ten-thousandths" },
  { number: "15.678", underlineIdx: 3, digit: 6, answer: "tenths" },
  { number: "15.678", underlineIdx: 4, digit: 7, answer: "hundredths" },
  { number: "15.678", underlineIdx: 5, digit: 8, answer: "thousandths" },
];
function PlaceValueDisplay({ item }) {
  const s = item.number;
  const idx = item.underlineIdx;
  return (
    <span style={{ fontFamily: "var(--mono)", fontSize: 22, fontWeight: 700 }}>
      {s.slice(0, idx)}
      <span style={{ textDecoration: "underline", textDecorationThickness: 2 }}>{s[idx]}</span>
      {s.slice(idx + 1)}
    </span>
  );
}

function PlaceValueMastery({ onCorrect, onWrong }) {
  const [problems, setProblems] = useState(() => shuffle([...PLACE_VALUE_POOL]).slice(0, 6).map(p => ({
    ...p, options: shuffle([...PLACE_NAMES].slice(0, 4))
  })));
  const [answers, setAnswers] = useState(Array(6).fill(""));
  const [feedback, setFeedback] = useState(null);

  const handleSubmit = () => {
    const results = problems.map((p, i) => answers[i] === p.answer);
    setFeedback({ results, allOk: results.every(Boolean), answers: [...answers] });
  };

  const handleNext = () => {
    const wasOk = feedback?.allOk;
    setProblems(shuffle([...PLACE_VALUE_POOL]).slice(0, 6).map(p => ({ ...p, options: shuffle([...PLACE_NAMES].slice(0, 4)) })));
    setAnswers(Array(6).fill("")); setFeedback(null);
    if (wasOk) onCorrect(); else onWrong();
  };

  if (feedback) return (
    <div>
      <div style={{ textAlign: "center", fontSize: 22, fontWeight: 800, color: feedback.allOk ? "var(--green)" : "var(--red)", marginBottom: 12 }}>
        {feedback.allOk ? "All Correct!" : "Incorrect"}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
        {problems.map((p, i) => (
          <div key={i} style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "10px 14px", border: "1px solid " + (feedback.results[i] ? "rgba(22,163,74,0.2)" : "rgba(239,68,68,0.2)") }}>
            <PlaceValueDisplay item={p} />
            {!feedback.results[i] && <div style={{ fontSize: 17, color: "var(--red)", marginTop: 4 }}>You: {feedback.answers[i] || "-"}</div>}
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--green)", marginTop: 2 }}>Answer: {p.answer}</div>
          </div>
        ))}
      </div>
      <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }} onClick={handleNext}>{feedback.allOk ? "Next Set" : "Try New Set"}</button>
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
        {problems.map((p, i) => (
          <div key={i} style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "10px 14px" }}>
            <div style={{ marginBottom: 8 }}><PlaceValueDisplay item={p} /></div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {p.options.map((opt, j) => (
                <button key={j} onClick={() => setAnswers(prev => prev.map((x, k) => k === i ? opt : x))}
                  style={{ padding: "5px 14px", borderRadius: "var(--radius-sm)", fontSize: 17, fontWeight: 700, cursor: "pointer", border: "2px solid " + (answers[i] === opt ? "var(--blue)" : "var(--border)"), background: answers[i] === opt ? "rgba(27,143,255,0.15)" : "var(--surface)", color: answers[i] === opt ? "var(--blue)" : "var(--text)" }}>
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }} onClick={handleSubmit} disabled={answers.some(a => a === "")}>Submit All</button>
    </div>
  );
}

// -- Activity 3: Decimal to Fraction --
// Use only non-reducible decimals (numerator coprime with power of 10)
const DEC_FRAC_POOL = [
  { dec: 0.7, rn: 7, rd: 10 }, { dec: 0.3, rn: 3, rd: 10 }, { dec: 0.9, rn: 9, rd: 10 },
  { dec: 0.11, rn: 11, rd: 100 }, { dec: 0.13, rn: 13, rd: 100 }, { dec: 0.17, rn: 17, rd: 100 },
  { dec: 0.21, rn: 21, rd: 100 }, { dec: 0.37, rn: 37, rd: 100 }, { dec: 0.43, rn: 43, rd: 100 },
  { dec: 0.09, rn: 9, rd: 100 }, { dec: 0.007, rn: 7, rd: 1000 }, { dec: 0.023, rn: 23, rd: 1000 },
  { dec: 0.47, rn: 47, rd: 100 }, { dec: 1.3, rn: 13, rd: 10 }, { dec: 2.7, rn: 27, rd: 10 },
];

function DecFracMastery({ onCorrect, onWrong }) {
  const gen = () => shuffle([...DEC_FRAC_POOL]).slice(0, 6).map(p => ({ ...p, answer: fmtFrac(p.rn, p.rd) }));
  const [problems, setProblems] = useState(() => gen());
  return (
    <SixMastery
      problems={problems}
      renderProblem={p => <KaTeX expr={String(p.dec)} />}
      gradeProblem={(input, p) => fracOk(input, p.rn, p.rd)}
      workedSolution={p => {
        const places = String(p.dec).split(".")[1]?.length || 0;
        const denom = Math.pow(10, places);
        const num = Math.round(p.dec * denom);
        return `${p.dec} = ${num}/${denom} = ${p.answer}`;
      }}
      onCorrect={() => { setProblems(gen()); onCorrect(); }}
      onWrong={() => { setProblems(gen()); onWrong(); }}
    />
  );
}

// -- Activity 4: Adding Decimals --
function genAddDec() {
  const pool = [
    { nums: [1.2, 3.45], answer: 4.65 }, { nums: [0.7, 2.35], answer: 3.05 },
    { nums: [5.1, 0.98], answer: 6.08 }, { nums: [3.4, 1.67], answer: 5.07 },
    { nums: [0.05, 1.3], answer: 1.35 }, { nums: [12.3, 0.75], answer: 13.05 },
    { nums: [4.25, 3.8], answer: 8.05 }, { nums: [0.125, 1.5], answer: 1.625 },
    { nums: [2.3, 1.25, 0.5], answer: 4.05 }, { nums: [1.1, 2.05, 0.9], answer: 4.05 },
    { nums: [0.4, 0.35, 1.2], answer: 1.95 }, { nums: [5.0, 0.375, 1.1], answer: 6.475 },
    { nums: [7.3, 2.15], answer: 9.45 }, { nums: [0.08, 3.4], answer: 3.48 },
    { nums: [6.25, 0.375], answer: 6.625 }, { nums: [1.9, 0.135], answer: 2.035 },
  ];
  return shuffle(pool).slice(0, 6).map(p => ({
    ...p, expr: p.nums.join(" + "),
    answer: parseFloat(p.answer.toPrecision(10)),
    worked: `Align decimals:\n${p.nums.map(n => String(n).padStart(8)).join("\n")}\n= ${p.answer}`,
  }));
}

function AddDecMastery({ onCorrect, onWrong }) {
  const [problems, setProblems] = useState(() => genAddDec());
  return (
    <SixMastery
      problems={problems}
      renderProblem={p => <KaTeX expr={p.nums.join(" + ")} />}
      gradeProblem={(input, p) => decOk(input, p.answer)}
      workedSolution={p => p.worked}
      onCorrect={() => { setProblems(genAddDec()); onCorrect(); }}
      onWrong={() => { setProblems(genAddDec()); onWrong(); }}
    />
  );
}

// -- Activity 5: Subtracting Decimals --
function genSubDec() {
  const pool = [
    { a: 5.3, b: 2.15, answer: 3.15 }, { a: 10.0, b: 3.45, answer: 6.55 },
    { a: 8.4, b: 1.75, answer: 6.65 }, { a: 3.2, b: 0.85, answer: 2.35 },
    { a: 15.0, b: 4.375, answer: 10.625 }, { a: 7.1, b: 2.35, answer: 4.75 },
    { a: 9.05, b: 3.4, answer: 5.65 }, { a: 4.0, b: 1.125, answer: 2.875 },
    { a: 12.5, b: 3.75, answer: 8.75 }, { a: 6.3, b: 2.05, answer: 4.25 },
    { a: 20.0, b: 7.625, answer: 12.375 }, { a: 1.5, b: 0.375, answer: 1.125 },
  ];
  return shuffle(pool).slice(0, 6).map(p => ({
    ...p, answer: parseFloat(p.answer.toPrecision(10)),
    worked: `Align then subtract:\n  ${p.a}\n- ${p.b}\n= ${p.answer}`,
  }));
}

function SubDecMastery({ onCorrect, onWrong }) {
  const [problems, setProblems] = useState(() => genSubDec());
  return (
    <SixMastery
      problems={problems}
      renderProblem={p => <KaTeX expr={`${p.a} - ${p.b}`} />}
      gradeProblem={(input, p) => decOk(input, p.answer)}
      workedSolution={p => p.worked}
      onCorrect={() => { setProblems(genSubDec()); onCorrect(); }}
      onWrong={() => { setProblems(genSubDec()); onWrong(); }}
    />
  );
}

// -- Activity 6: Multiplying Decimals --
function genMulDec() {
  const pool = [
    { a: 1.2, b: 3.4, answer: 4.08, wa: 12, wb: 34, wp: 408, places: 2 },
    { a: 0.5, b: 0.2, answer: 0.10, wa: 5, wb: 2, wp: 10, places: 2 },
    { a: 2.5, b: 0.03, answer: 0.075, wa: 25, wb: 3, wp: 75, places: 3 },
    { a: 3.75, b: 2.0, answer: 7.5, wa: 375, wb: 2, wp: 750, places: 2 },
    { a: 0.4, b: 0.6, answer: 0.24, wa: 4, wb: 6, wp: 24, places: 2 },
    { a: 1.5, b: 1.2, answer: 1.80, wa: 15, wb: 12, wp: 180, places: 2 },
    { a: 2.3, b: 0.4, answer: 0.92, wa: 23, wb: 4, wp: 92, places: 2 },
    { a: 0.25, b: 0.8, answer: 0.2, wa: 25, wb: 8, wp: 200, places: 3 },
    { a: 1.4, b: 0.5, answer: 0.70, wa: 14, wb: 5, wp: 70, places: 2 },
    { a: 3.6, b: 0.25, answer: 0.9, wa: 36, wb: 25, wp: 900, places: 3 },
  ];
  return shuffle(pool).slice(0, 6).map(p => ({
    ...p, answer: parseFloat(p.answer.toPrecision(10)),
    worked: `${p.wa} x ${p.wb} = ${p.wp}, then ${p.places} decimal places => ${fmtDec(p.answer)}`,
  }));
}

function MulDecMastery({ onCorrect, onWrong }) {
  const [problems, setProblems] = useState(() => genMulDec());
  const bs = "\\";
  return (
    <SixMastery
      problems={problems}
      renderProblem={p => <KaTeX expr={`${p.a} ${bs}times ${p.b}`} />}
      gradeProblem={(input, p) => decOk(input, p.answer)}
      workedSolution={p => p.worked}
      onCorrect={() => { setProblems(genMulDec()); onCorrect(); }}
      onWrong={() => { setProblems(genMulDec()); onWrong(); }}
    />
  );
}

// -- Activity 7: Metric Length Conversions (10 problems) --
const METRIC_POOL = [
  { expr: "3.5 cm = ? mm", answer: 35 }, { expr: "120 mm = ? cm", answer: 12 },
  { expr: "4 dm = ? cm", answer: 40 }, { expr: "250 cm = ? dm", answer: 25 },
  { expr: "2.3 m = ? dm", answer: 23 }, { expr: "450 cm = ? m", answer: 4.5 },
  { expr: "2.5 m = ? mm", answer: 2500 }, { expr: "300 cm = ? m", answer: 3 },
  { expr: "1.2 km = ? m", answer: 1200 }, { expr: "4500 m = ? km", answer: 4.5 },
  { expr: "1250 mm = ? m", answer: 1.25 }, { expr: "8 m = ? mm", answer: 8000 },
  { expr: "0.4 km = ? m", answer: 400 }, { expr: "35 mm = ? cm", answer: 3.5 },
  { expr: "5 m = ? dm", answer: 50 }, { expr: "300 dm = ? m", answer: 30 },
  { expr: "7 cm = ? mm", answer: 70 }, { expr: "0.75 km = ? cm", answer: 75000 },
];

function MetricMastery({ onCorrect, onWrong }) {
  const gen = () => shuffle([...METRIC_POOL]).slice(0, 10);
  const [problems, setProblems] = useState(() => gen());
  const [answers, setAnswers] = useState(Array(10).fill(""));
  const [feedback, setFeedback] = useState(null);

  const handleSubmit = () => {
    const results = problems.map((p, i) => decOk(answers[i], p.answer));
    setFeedback({ results, allOk: results.every(Boolean), answers: [...answers] });
  };

  const handleNext = () => {
    const wasOk = feedback?.allOk;
    setProblems(gen()); setAnswers(Array(10).fill("")); setFeedback(null);
    if (wasOk) onCorrect(); else onWrong();
  };

  if (feedback) return (
    <div>
      <div style={{ textAlign: "center", fontSize: 22, fontWeight: 800, color: feedback.allOk ? "var(--green)" : "var(--red)", marginBottom: 12 }}>
        {feedback.allOk ? "All Correct!" : "Incorrect"}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
        {problems.map((p, i) => (
          <div key={i} style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "8px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid " + (feedback.results[i] ? "rgba(22,163,74,0.2)" : "rgba(239,68,68,0.2)") }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: 18 }}>{p.expr}</span>
            <div style={{ display: "flex", gap: 10 }}>
              {!feedback.results[i] && <span style={{ color: "var(--red)", fontFamily: "var(--mono)", fontSize: 17 }}>You: {feedback.answers[i] || "-"}</span>}
              <span style={{ color: "var(--green)", fontFamily: "var(--mono)", fontWeight: 700, fontSize: 18 }}>{fmtDec(p.answer)}</span>
            </div>
          </div>
        ))}
      </div>
      <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }} onClick={handleNext}>{feedback.allOk ? "Next Set" : "Try New Set"}</button>
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
        {problems.map((p, i) => (
          <div key={i} style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "8px 14px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: 19, fontWeight: 700, flex: 1 }}>{p.expr}</span>
            <input value={answers[i]} onChange={e => setAnswers(prev => prev.map((x, j) => j === i ? e.target.value : x))}
              placeholder="" style={{ textAlign: "center", fontSize: 19, fontFamily: "var(--mono)", fontWeight: 700, padding: "5px 8px", width: 110, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--surface)" }} />
          </div>
        ))}
      </div>
      <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }} onClick={handleSubmit} disabled={answers.some(a => a.trim() === "")}>Submit All</button>
    </div>
  );
}

// -- Steps --
const STEPS = [
  { id: "place-value", label: "Place Value", description: "All correct to pass." },
  { id: "dec-frac", label: "Decimal to Fraction", description: "All correct to pass." },
  { id: "add-dec", label: "Adding Decimals", description: "All correct to pass." },
  { id: "sub-dec", label: "Subtracting Decimals", description: "All correct to pass." },
  { id: "mul-dec", label: "Multiplying Decimals", description: "All correct to pass." },
  { id: "metric", label: "Metric Length Conversions", description: "All 10 correct to pass." },
];

export default function Lesson18MasteryPlayer({ user, topic, onHome }) {
  const topicId = topic?.id || LESSON18_MASTERY_TOPIC_ID;
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
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>HW 18 (019) Complete!</h2>
        <p style={{ fontSize: 20, color: "var(--text2)", marginBottom: 24 }}>Decimals mastered!</p>
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
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,var(--blue),var(--orange))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "#fff" }}>L18</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 22 }}>HW 18 (019): Mastery Activities</div>
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
          {step.id === "place-value" && <PlaceValueMastery key={stepIdx} onCorrect={handleCorrect} onWrong={handleWrong} />}
          {step.id === "dec-frac"    && <DecFracMastery    key={stepIdx} onCorrect={handleCorrect} onWrong={handleWrong} />}
          {step.id === "add-dec"     && <AddDecMastery     key={stepIdx} onCorrect={handleCorrect} onWrong={handleWrong} />}
          {step.id === "sub-dec"     && <SubDecMastery     key={stepIdx} onCorrect={handleCorrect} onWrong={handleWrong} />}
          {step.id === "mul-dec"     && <MulDecMastery     key={stepIdx} onCorrect={handleCorrect} onWrong={handleWrong} />}
          {step.id === "metric"      && <MetricMastery     key={stepIdx} onCorrect={handleCorrect} onWrong={handleWrong} />}
        </div>
      </div>
    </div>
  );
}

// -- Standalone Mental Math Player --
export function DecMentalPlayer({ user, topic, onHome }) {
  const topicId = topic?.id || DEC_MENTAL_TOPIC_ID;
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  useEffect(() => { getProgress(user.id, topicId).then(prog => { if (prog?.data?.completed) setCompleted(true); setLoading(false); }); }, []);
  const handleComplete = async () => { await fbSaveProgress(user.id, topicId, { started: true, completed: true, percentComplete: 100, data: { completed: true } }); setCompleted(true); };
  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><div className="spinner" /></div>;
  if (completed) return (
    <div style={{ maxWidth: 520, margin: "0 auto", textAlign: "center" }}>
      <div className="card">
        <div style={{ fontSize: 48, fontWeight: 900, color: "var(--amber)", marginBottom: 16 }}>100%</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Decimal Mental Math Complete!</h2>
        <button className="btn btn-primary btn-lg" style={{ width: "100%" }} onClick={onHome}>Back to Home</button>
      </div>
    </div>
  );
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "clamp(16px,3vw,32px)" }} className="dot-bg">
      <div style={{ maxWidth: 580, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,var(--blue),var(--orange))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "#fff" }}>18</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 22 }}>Decimal x 10 / 100 / 1000</div>
              <div style={{ fontSize: 20, color: "var(--text3)" }}>6-second timed drill, 3 in a row</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onHome}>Back</button>
        </div>
        <div className="card"><DecMentalMastery onComplete={handleComplete} /></div>
      </div>
    </div>
  );
}

