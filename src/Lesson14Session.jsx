import { useState, useEffect, useRef } from "react";
import { setDoc, doc, updateDoc } from "firebase/firestore";
import { onSessionChange, onClassworkAnswersChange, getTeacherClasses, addToScore, db } from "./core/firebase";
import {
  LESSON14_TOPICS, generateLesson14Question, gradeLesson14Answer,
  gradeClassifyItem, gradeCompareItem, gradeImproperToMixedItem, gradeMixedToImproperItem,
  gradeMixedReviewItem,
} from "./lesson14Questions";

const POINTS = 5;

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
function KaTeX({ expr, block }) {
  const ref = useRef(null);
  useKaTeX();
  useEffect(() => {
    const go = () => { if (window.katex && ref.current) { try { window.katex.render(expr, ref.current, { throwOnError: false, displayMode: !!block }); } catch {} } else setTimeout(go, 100); };
    go();
  });
  return block ? <div ref={ref} style={{ fontSize: 26, margin: "6px 0", minHeight: 36 }} /> : <span ref={ref} style={{ fontSize: 22 }} />;
}

// -- Timer --
function TimerBar({ endsAt, totalSeconds, onExpired }) {
  const [rem, setRem] = useState(totalSeconds);
  const ref = useRef(false);
  useEffect(() => {
    ref.current = false;
    const tick = () => { const l = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)); setRem(l); if (l === 0 && !ref.current) { ref.current = true; onExpired?.(); } };
    tick(); const id = setInterval(tick, 500); return () => clearInterval(id);
  }, [endsAt]);
  const pct = Math.max(0, (rem / totalSeconds) * 100);
  const color = rem <= 5 ? "var(--red)" : rem <= 10 ? "var(--amber)" : "var(--green)";
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 20, color: "var(--text3)", marginBottom: 4 }}>
        <span>Time remaining</span><span style={{ fontWeight: 700, color, fontSize: 22 }}>{rem}s</span>
      </div>
      <div style={{ height: 7, background: "var(--surface2)", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ height: "100%", width: pct + "%", background: color, borderRadius: 99, transition: "width 0.5s linear" }} />
      </div>
    </div>
  );
}

// -- TextInput --
function TextInput({ onSubmit, submitted, placeholder, wide }) {
  const [val, setVal] = useState("");
  const ref = useRef(null);
  useEffect(() => { setVal(""); setTimeout(() => ref.current?.focus(), 80); }, [submitted]);
  const submit = () => { if (val.trim()) onSubmit(val.trim()); };
  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
      <input ref={ref} value={val} onChange={e => setVal(e.target.value)}
        onKeyDown={e => e.key === "Enter" && submit()} disabled={submitted}
        placeholder={placeholder || ""}
        style={{ textAlign: "center", fontSize: 22, fontFamily: "var(--mono)", fontWeight: 700, padding: "10px", width: wide ? 260 : 160 }} />
      <button className="btn btn-primary" style={{ fontSize: 20, padding: "10px 20px" }}
        onMouseDown={e => { e.preventDefault(); submit(); }} disabled={submitted || !val.trim()}>OK</button>
    </div>
  );
}

// -- Fraction Picture SVG --
function FractionPicture({ num, den, shape }) {
  if (shape === "circle") {
    const r = 50, cx = 60, cy = 60, size = 120;
    const slices = [];
    for (let i = 0; i < den; i++) {
      const startAngle = (i / den) * 2 * Math.PI - Math.PI / 2;
      const endAngle = ((i + 1) / den) * 2 * Math.PI - Math.PI / 2;
      const x1 = cx + r * Math.cos(startAngle), y1 = cy + r * Math.sin(startAngle);
      const x2 = cx + r * Math.cos(endAngle), y2 = cy + r * Math.sin(endAngle);
      const large = (1 / den) > 0.5 ? 1 : 0;
      slices.push(
        <path key={i}
          d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`}
          fill={i < num ? "var(--blue)" : "var(--surface2)"}
          stroke="var(--bg)" strokeWidth="2" />
      );
    }
    return <svg viewBox={`0 0 ${size} ${size}`} style={{ width: 120, height: 120 }}>{slices}</svg>;
  }
  // Rectangle
  const W = 200, H = 60;
  const boxes = [];
  for (let i = 0; i < den; i++) {
    const x = (i / den) * W;
    boxes.push(<rect key={i} x={x + 1} y={1} width={W / den - 2} height={H - 2}
      fill={i < num ? "var(--blue)" : "var(--surface2)"} rx={2} />);
  }
  return <svg viewBox={`0 0 ${W} ${H}`} style={{ width: 200, height: 60 }}>{boxes}</svg>;
}

// -- Number Line SVG --
function NumberLineSVG({ value, den }) {
  const W = 320, H = 70, margin = 30;
  const lineW = W - 2 * margin;
  // Show 0 to 2, with marks at every 1/den
  const totalParts = 2 * den;
  const markX = (i) => margin + (i / totalParts) * lineW;
  const pointX = margin + (value / 2) * lineW;

  const ticks = [];
  for (let i = 0; i <= totalParts; i++) {
    const x = markX(i);
    const isWhole = i % den === 0;
    ticks.push(
      <g key={i}>
        <line x1={x} y1={35} x2={x} y2={isWhole ? 25 : 30} stroke="var(--text3)" strokeWidth={isWhole ? 2 : 1} />
        {isWhole && <text x={x} y={55} textAnchor="middle" fontSize="13" fill="var(--text3)" fontWeight="600">{i / den}</text>}
      </g>
    );
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: 320, display: "block", margin: "0 auto" }}>
      <line x1={margin} y1={35} x2={W - margin} y2={35} stroke="var(--text2)" strokeWidth="2" />
      <polygon points={`${W - margin},35 ${W - margin - 8},30 ${W - margin - 8},40`} fill="var(--text2)" />
      {ticks}
      <circle cx={pointX} cy={35} r={6} fill="var(--blue)" />
      <line x1={pointX} y1={15} x2={pointX} y2={29} stroke="var(--blue)" strokeWidth="2" strokeDasharray="3,2" />
    </svg>
  );
}

// -- QuestionDisplay --
function QuestionDisplay({ question: q, revealCorrect }) {
  useKaTeX();
  if (!q) return null;

  if (q.type === "warmup-a") return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 32, fontWeight: 900, fontFamily: "var(--mono)", marginBottom: 8 }}>{q.n}</div>
      {revealCorrect && <div style={{ color: "var(--green)", fontWeight: 700, fontSize: 20, fontFamily: "var(--mono)" }}>{q.displayAnswer}</div>}
    </div>
  );
  if (q.type === "warmup-b") return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 26, fontWeight: 900, fontFamily: "var(--mono)", marginBottom: 8 }}>GCF of {q.a} and {q.b}</div>
      {revealCorrect && <div style={{ color: "var(--green)", fontWeight: 700, fontSize: 24 }}>GCF = {q.g}</div>}
    </div>
  );
  if (q.type === "warmup-c") return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 26, fontWeight: 900, fontFamily: "var(--mono)", marginBottom: 8 }}>LCM of {q.a} and {q.b}</div>
      {revealCorrect && <div style={{ color: "var(--green)", fontWeight: 700, fontSize: 24 }}>LCM = {q.l}</div>}
    </div>
  );

  if (q.type === "identify-fraction") return (
    <div style={{ textAlign: "center" }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
        <FractionPicture num={q.num} den={q.den} shape={q.shape} />
      </div>
      {revealCorrect && <div style={{ color: "var(--green)", fontWeight: 700, fontSize: 24, fontFamily: "var(--mono)" }}>{q.displayAnswer}</div>}
    </div>
  );

  if (q.type === "classify-fractions") {
    if (!revealCorrect) return null;
    const labels = { zero: "Zero (= 0)", proper: "Proper (< 1)", one: "Equal to 1", improper: "Improper (> 1)" };
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {q.fractions.map((f, i) => (
          <div key={i} style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "8px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: 22, fontWeight: 800 }}>{f.display}</span>
            <span style={{ fontSize: 19, color: "var(--green)", fontWeight: 700 }}>{labels[f.correct] || f.correct}</span>
          </div>
        ))}
      </div>
    );
  }

  if (q.type === "compare-to-one") {
    if (!revealCorrect) return null;
    const labels = { less: "< 1", equal: "= 1", greater: "> 1" };
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {q.fractions.map((f, i) => (
          <div key={i} style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "8px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: 22, fontWeight: 800 }}>{f.display}</span>
            <span style={{ fontSize: 19, color: "var(--green)", fontWeight: 700 }}>{labels[f.correct]}</span>
          </div>
        ))}
      </div>
    );
  }

  if (q.type === "number-line") return (
    <div>
      <NumberLineSVG value={q.value} den={q.den} />
      {revealCorrect && <div style={{ textAlign: "center", color: "var(--green)", fontWeight: 700, fontSize: 24, marginTop: 8, fontFamily: "var(--mono)" }}>{q.displayAnswer}</div>}
    </div>
  );

  if (q.type === "improper-to-mixed") {
    if (!revealCorrect) return null;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {q.fractions.map((f, i) => (
          <div key={i} style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "8px 14px", display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: 22, fontWeight: 800 }}>{f.num}/{f.den}</span>
            <span style={{ fontFamily: "var(--mono)", fontSize: 20, color: "var(--green)", fontWeight: 700 }}>{f.displayAnswer}</span>
          </div>
        ))}
      </div>
    );
  }

  if (q.type === "mixed-to-improper") {
    if (!revealCorrect) return null;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {q.fractions.map((f, i) => (
          <div key={i} style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "8px 14px", display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: 22, fontWeight: 800 }}>{f.whole} {f.num}/{f.den}</span>
            <span style={{ fontFamily: "var(--mono)", fontSize: 20, color: "var(--green)", fontWeight: 700 }}>{f.displayAnswer}</span>
          </div>
        ))}
      </div>
    );
  }

  if (q.type === "missing-equiv") return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 28, fontWeight: 900, fontFamily: "var(--mono)", marginBottom: 8 }}>{q.display}</div>
      {revealCorrect && <div style={{ color: "var(--green)", fontWeight: 700, fontSize: 24 }}>Missing {q.missing}: {q.displayAnswer}</div>}
    </div>
  );

  if (q.type === "equiv-fraction") return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 32, fontWeight: 900, fontFamily: "var(--mono)", marginBottom: 8 }}>{q.n}/{q.d}</div>
      {revealCorrect && <div style={{ color: "var(--green)", fontWeight: 700, fontSize: 22 }}>{q.displayAnswer} (any equivalent fraction)</div>}
    </div>
  );

  if (q.type === "reduce-mc") return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 32, fontWeight: 900, fontFamily: "var(--mono)", marginBottom: 14 }}>{q.n}/{q.d}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {q.options.map((opt, i) => (
          <div key={i} style={{ background: revealCorrect && i === q.correctIdx ? "rgba(22,163,74,0.1)" : "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "8px 14px", fontSize: 22, fontFamily: "var(--mono)", fontWeight: 700, border: revealCorrect && i === q.correctIdx ? "2px solid var(--green)" : "1px solid var(--border)" }}>
            {String.fromCharCode(65 + i)}) {opt}
          </div>
        ))}
      </div>
    </div>
  );

  if (q.type === "reduce-free") return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 32, fontWeight: 900, fontFamily: "var(--mono)", marginBottom: 8 }}>{q.n}/{q.d}</div>
      {revealCorrect && <div style={{ color: "var(--green)", fontWeight: 700, fontSize: 24, fontFamily: "var(--mono)" }}>{q.displayAnswer}</div>}
    </div>
  );

  if (q.type === "mixed-review") {
    if (!revealCorrect) return null;
    const labels = { "identify": "Fraction", "classify": "Classify", "imp-to-mix": "Improper to Mixed", "mix-to-imp": "Mixed to Improper", "missing-equiv": "Equivalent Fraction", "reduce": "Reduce" };
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {q.questions.map((item, i) => (
          <div key={i} style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "8px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span style={{ fontSize: 18, color: "var(--text3)", marginRight: 8 }}>{labels[item.subtype]}:</span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 20, fontWeight: 800 }}>{item.display}</span>
            </div>
            <span style={{ fontFamily: "var(--mono)", fontSize: 20, color: "var(--green)", fontWeight: 700 }}>{item.displayAnswer}</span>
          </div>
        ))}
      </div>
    );
  }

  return null;
}

// -- Answer Inputs --

function ClassifyInput({ question, onSubmit, submitted }) {
  const opts = [
    { label: "Zero (= 0)", val: "zero" },
    { label: "Proper (< 1)", val: "proper" },
    { label: "Equal to 1", val: "one" },
    { label: "Improper (> 1)", val: "improper" },
  ];
  const [answers, setAnswers] = useState(question.fractions.map(() => ""));
  const allDone = answers.every(a => a !== "");
  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
        {question.fractions.map((f, i) => (
          <div key={i} style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "10px 14px" }}>
            <div style={{ fontSize: 24, fontWeight: 900, fontFamily: "var(--mono)", marginBottom: 8 }}>{f.display}</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {opts.map(opt => (
                <button key={opt.val} onClick={() => !submitted && setAnswers(prev => prev.map((x, j) => j === i ? opt.val : x))}
                  style={{ padding: "5px 12px", borderRadius: "var(--radius-sm)", border: "2px solid " + (answers[i] === opt.val ? "var(--blue)" : "var(--border)"), background: answers[i] === opt.val ? "rgba(27,143,255,0.15)" : "var(--surface)", fontSize: 18, fontWeight: 700, cursor: "pointer", color: answers[i] === opt.val ? "var(--blue)" : "var(--text)" }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }}
        onClick={() => onSubmit(JSON.stringify(answers))} disabled={submitted || !allDone}>Submit All</button>
    </div>
  );
}

function CompareToOneInput({ question, onSubmit, submitted }) {
  const opts = [{ label: "< 1", val: "less" }, { label: "= 1", val: "equal" }, { label: "> 1", val: "greater" }];
  const [answers, setAnswers] = useState(question.fractions.map(() => ""));
  const allDone = answers.every(a => a !== "");
  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
        {question.fractions.map((f, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "10px 14px", flexWrap: "wrap", gap: 8 }}>
            <span style={{ fontSize: 24, fontWeight: 900, fontFamily: "var(--mono)" }}>{f.display}</span>
            <div style={{ display: "flex", gap: 8 }}>
              {opts.map(opt => (
                <button key={opt.val} onClick={() => !submitted && setAnswers(prev => prev.map((x, j) => j === i ? opt.val : x))}
                  style={{ padding: "6px 16px", borderRadius: "var(--radius-sm)", border: "2px solid " + (answers[i] === opt.val ? "var(--blue)" : "var(--border)"), background: answers[i] === opt.val ? "rgba(27,143,255,0.15)" : "var(--surface)", fontSize: 20, fontWeight: 700, cursor: "pointer", color: answers[i] === opt.val ? "var(--blue)" : "var(--text)" }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }}
        onClick={() => onSubmit(JSON.stringify(answers))} disabled={submitted || !allDone}>Submit All</button>
    </div>
  );
}

function MultiTextInput({ items, labelFn, onSubmit, submitted, placeholder }) {
  const [answers, setAnswers] = useState(items.map(() => ""));
  const allDone = answers.every(a => a.trim() !== "");
  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "10px 14px", flexWrap: "wrap" }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: 22, fontWeight: 800, minWidth: 80 }}>{labelFn(item)}</span>
            <input value={answers[i]} onChange={e => setAnswers(prev => prev.map((x, j) => j === i ? e.target.value : x))}
              disabled={submitted} placeholder={placeholder || ""}
              style={{ textAlign: "center", fontSize: 20, fontFamily: "var(--mono)", fontWeight: 700, padding: "6px 10px", width: 140, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--surface)" }} />
          </div>
        ))}
      </div>
      <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }}
        onClick={() => onSubmit(JSON.stringify(answers))} disabled={submitted || !allDone}>Submit All</button>
    </div>
  );
}

function MixedReviewInput({ question, onSubmit, submitted }) {
  const [answers, setAnswers] = useState(question.questions.map(() => ""));
  const allDone = answers.every(a => a.trim() !== "");
  const labels = { "identify": "Fraction shown", "classify": "Classify", "imp-to-mix": "Mixed number", "mix-to-imp": "Improper fraction", "missing-equiv": "Missing number", "reduce": "Reduced fraction" };
  const placeholders = { "identify": "e.g. 3/4", "classify": "zero/proper/one/improper", "imp-to-mix": "e.g. 2 1/3", "mix-to-imp": "e.g. 7/3", "missing-equiv": "Enter number", "reduce": "e.g. 2/3" };
  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
        {question.questions.map((item, i) => (
          <div key={i} style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "10px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
              <span style={{ fontSize: 18, color: "var(--text3)", fontWeight: 600 }}>{labels[item.subtype]}:</span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 20, fontWeight: 800 }}>{item.display}</span>
            </div>
            <input value={answers[i]} onChange={e => setAnswers(prev => prev.map((x, j) => j === i ? e.target.value : x))}
              disabled={submitted} placeholder={placeholders[item.subtype] || ""}
              style={{ textAlign: "center", fontSize: 20, fontFamily: "var(--mono)", fontWeight: 700, padding: "6px 10px", width: "100%", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--surface)" }} />
          </div>
        ))}
      </div>
      <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }}
        onClick={() => onSubmit(JSON.stringify(answers))} disabled={submitted || !allDone}>Submit All</button>
    </div>
  );
}

function AnswerInput({ question, onSubmit, submitted }) {
  if (!question) return null;
  const t = question.type;
  if (t === "warmup-a") return (
    <div>
      <div style={{ fontSize: 19, color: "var(--text3)", marginBottom: 6, textAlign: "center" }}>Use ^ for exponents, x or * for multiplication</div>
      <TextInput onSubmit={onSubmit} submitted={submitted} placeholder="e.g. 2^2 x 3 x 7" wide />
    </div>
  );
  if (t === "warmup-b" || t === "warmup-c") return <TextInput onSubmit={onSubmit} submitted={submitted} placeholder="Enter answer" />;
  if (t === "identify-fraction") return (
    <div>
      <div style={{ fontSize: 19, color: "var(--text3)", marginBottom: 6, textAlign: "center" }}>Enter fraction as a/b (e.g. 3/4)</div>
      <TextInput onSubmit={onSubmit} submitted={submitted} placeholder="e.g. 3/4" />
    </div>
  );
  if (t === "classify-fractions") return <ClassifyInput question={question} onSubmit={onSubmit} submitted={submitted} />;
  if (t === "compare-to-one") return <CompareToOneInput question={question} onSubmit={onSubmit} submitted={submitted} />;
  if (t === "number-line") return (
    <div>
      <div style={{ fontSize: 19, color: "var(--text3)", marginBottom: 6, textAlign: "center" }}>Enter fraction or mixed number (e.g. 3/4 or 1 1/2)</div>
      <TextInput onSubmit={onSubmit} submitted={submitted} placeholder="e.g. 3/4 or 1 1/2" wide />
    </div>
  );
  if (t === "improper-to-mixed") return (
    <div>
      <div style={{ fontSize: 19, color: "var(--text3)", marginBottom: 6, textAlign: "center" }}>Enter mixed number (e.g. 2 1/3)</div>
      <MultiTextInput items={question.fractions} labelFn={f => `${f.num}/${f.den}`} onSubmit={onSubmit} submitted={submitted} placeholder="e.g. 2 1/3" />
    </div>
  );
  if (t === "mixed-to-improper") return (
    <div>
      <div style={{ fontSize: 19, color: "var(--text3)", marginBottom: 6, textAlign: "center" }}>Enter improper fraction (e.g. 7/3)</div>
      <MultiTextInput items={question.fractions} labelFn={f => `${f.whole} ${f.num}/${f.den}`} onSubmit={onSubmit} submitted={submitted} placeholder="e.g. 7/3" />
    </div>
  );
  if (t === "missing-equiv") return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "var(--mono)", marginBottom: 10, textAlign: "center" }}>{question.display}</div>
      <TextInput onSubmit={onSubmit} submitted={submitted} placeholder="Enter missing number" />
    </div>
  );
  if (t === "equiv-fraction") return (
    <div>
      <div style={{ fontSize: 19, color: "var(--text3)", marginBottom: 6, textAlign: "center" }}>Enter any equivalent fraction (not {question.n}/{question.d})</div>
      <TextInput onSubmit={onSubmit} submitted={submitted} placeholder="e.g. 6/8" />
    </div>
  );
  if (t === "reduce-mc") return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {question.options.map((opt, i) => (
        <button key={i} onClick={() => !submitted && onSubmit(String(i))}
          style={{ padding: "10px 16px", borderRadius: "var(--radius-sm)", border: "2px solid var(--border)", background: "var(--surface)", fontFamily: "var(--mono)", fontSize: 22, fontWeight: 700, cursor: "pointer", textAlign: "left" }}>
          {String.fromCharCode(65 + i)}) {opt}
        </button>
      ))}
    </div>
  );
  if (t === "reduce-free") return (
    <div>
      <div style={{ fontSize: 19, color: "var(--text3)", marginBottom: 6, textAlign: "center" }}>Enter fraction in lowest terms</div>
      <TextInput onSubmit={onSubmit} submitted={submitted} placeholder="e.g. 3/4" />
    </div>
  );
  if (t === "mixed-review") return <MixedReviewInput question={question} onSubmit={onSubmit} submitted={submitted} />;
  return null;
}

// -- Grade wrapper --
function gradeAnswer(input, question) {
  if (!input || !question) return false;
  return gradeLesson14Answer(input, question);
}

const MULTI_ITEM_TYPES = ["classify-fractions", "compare-to-one", "improper-to-mixed", "mixed-to-improper", "mixed-review"];

// -- Teacher --
function TeacherLesson14({ session, sessionId, uid }) {
  const [answers, setAnswers] = useState([]);
  const [timerInput, setTimerInput] = useState(90);
  const [topicIdx, setTopicIdx] = useState(0);
  const revealedRef = useRef(false);
  const question = session.currentQuestion;
  const participants = session.participants || {};
  const totalStudents = Object.keys(participants).length;

  useEffect(() => {
    if (!question?.id) return;
    setAnswers([]); revealedRef.current = false;
    const unsub = onClassworkAnswersChange(sessionId, question.id, setAnswers);
    return () => unsub();
  }, [question?.id]);

  const handleGenerate = async (tIdx) => {
    const idx = tIdx !== undefined ? tIdx : topicIdx;
    const q = generateLesson14Question(LESSON14_TOPICS[idx].id);
    const qId = "q_" + Date.now().toString(36);
    q.id = qId; q.points = POINTS;
    revealedRef.current = false; setAnswers([]);
    await updateDoc(doc(db, "sessions", sessionId), {
      status: "question", currentQuestion: q,
      timerSeconds: timerInput, timerEndsAt: Date.now() + timerInput * 1000,
      questionCount: (session.questionCount || 0) + 1,
    });
  };

  const handleReveal = async () => {
    if (revealedRef.current) return;
    revealedRef.current = true;
    for (const ans of answers) {
      if (gradeAnswer(ans.answer, question)) await addToScore(sessionId, ans.uid, POINTS);
    }
    await updateDoc(doc(db, "sessions", sessionId), { status: "revealing" });
  };

  const handleEnd = async () => {
    if (confirm("End the session?")) await updateDoc(doc(db, "sessions", sessionId), { status: "ended" });
  };

  const isMulti = MULTI_ITEM_TYPES.includes(question?.type);
  const submittedCount = answers.length;
  const correctCount = answers.filter(a => gradeAnswer(a.answer, question)).length;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 20, color: "var(--text3)" }}>Join Code</div>
            <div style={{ fontSize: 36, fontWeight: 900, fontFamily: "var(--mono)", color: "var(--blue)", letterSpacing: "0.15em" }}>{session.joinCode}</div>
            <div style={{ fontSize: 20, color: "var(--text3)" }}>{totalStudents} student{totalStudents !== 1 ? "s" : ""} joined</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <label style={{ fontSize: 20 }}>Seconds:</label>
              <input type="number" min={15} max={300} value={timerInput} onChange={e => setTimerInput(Number(e.target.value))}
                style={{ width: 70, padding: "6px 10px", fontSize: 20, textAlign: "center" }} />
            </div>
            {session.status === "question" && <button className="btn btn-ghost" onClick={handleReveal}>Reveal</button>}
            {session.status === "revealing" && (
              <>
                <button className="btn btn-ghost" onClick={() => handleGenerate()}>Repeat</button>
                {topicIdx < LESSON14_TOPICS.length - 1 && (
                  <button className="btn btn-primary" onClick={() => { const n = topicIdx + 1; setTopicIdx(n); handleGenerate(n); }}>
                    Next: {LESSON14_TOPICS[topicIdx + 1]?.label}
                  </button>
                )}
              </>
            )}
            <button className="btn btn-ghost" style={{ color: "var(--red)" }} onClick={handleEnd}>End</button>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 16, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ fontSize: 19, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Topic</div>
          {LESSON14_TOPICS.map((t, i) => {
            const isActive = i === topicIdx, isDone = i < topicIdx;
            return (
              <button key={t.id} onClick={() => setTopicIdx(i)}
                style={{ background: isActive ? "rgba(27,143,255,0.15)" : "var(--surface)", border: "2px solid " + (isActive ? "var(--blue)" : isDone ? "rgba(22,163,74,0.3)" : "var(--border)"), borderRadius: "var(--radius)", padding: "4px 8px", cursor: "pointer", textAlign: "left", fontFamily: "var(--font)" }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: isActive ? "var(--blue)" : isDone ? "var(--green)" : "var(--text)" }}>{t.label}</div>
                <div style={{ fontSize: 13, color: "var(--text3)" }}>{t.description}</div>
              </button>
            );
          })}
          <button className="btn btn-primary" style={{ marginTop: 8, fontSize: 20 }}
            onClick={() => handleGenerate()} disabled={session.status === "question"}>Generate</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {session.status === "waiting" && (
            <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
              <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Waiting for students</h3>
              <p style={{ color: "var(--blue)", fontFamily: "var(--mono)", fontSize: 28, fontWeight: 900 }}>{session.joinCode}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 12 }}>
                {Object.values(participants).map(p => (
                  <div key={p.name} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "5px 12px", fontSize: 20, fontWeight: 600 }}>{p.name}</div>
                ))}
              </div>
            </div>
          )}
          {question && (session.status === "question" || session.status === "revealing") && (
            <>
              <div className="card">
                <div style={{ fontSize: 20, color: "var(--text3)", marginBottom: 8 }}>
                  {LESSON14_TOPICS[topicIdx]?.label} - {submittedCount}/{totalStudents} submitted{!isMulti && ` - ${correctCount} correct`}
                </div>
                <QuestionDisplay question={question} revealCorrect={session.status === "revealing"} />
                {session.status === "question" && session.timerEndsAt && (
                  <div style={{ marginTop: 12 }}>
                    <TimerBar endsAt={session.timerEndsAt} totalSeconds={session.timerSeconds}
                      onExpired={async () => { if (!revealedRef.current) await handleReveal(); }} />
                  </div>
                )}
                {session.status === "revealing" && !isMulti && (
                  <div style={{ marginTop: 12, background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.2)", borderRadius: "var(--radius-sm)", padding: "12px 16px" }}>
                    <div style={{ fontSize: 20, color: "var(--text3)", marginBottom: 4 }}>Correct answer</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "var(--green)", fontFamily: "var(--mono)" }}>{question.displayAnswer}</div>
                  </div>
                )}
                <div style={{ height: 6, background: "var(--surface2)", borderRadius: 99, overflow: "hidden", marginTop: 12 }}>
                  <div style={{ height: "100%", width: (totalStudents > 0 ? (submittedCount / totalStudents) * 100 : 0) + "%", background: "var(--blue)", borderRadius: 99, transition: "width 0.3s" }} />
                </div>
              </div>
              <div className="card">
                <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }}>Student Answers</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 300, overflowY: "auto" }}>
                  {Object.entries(participants).map(([pUid, p]) => {
                    const ans = answers.find(a => a.uid === pUid);
                    const has = ans?.answer !== undefined && ans?.answer !== "";
                    const correct = has && gradeAnswer(ans.answer, question);
                    return (
                      <div key={pUid} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "7px 12px", border: "1px solid " + (has ? (correct ? "rgba(22,163,74,0.3)" : "rgba(239,68,68,0.3)") : "var(--border)") }}>
                        <span style={{ fontWeight: 600, fontSize: 20 }}>{p.name}</span>
                        {has ? <span style={{ fontWeight: 700, color: correct ? "var(--green)" : "var(--red)", fontSize: 20 }}>{correct ? "+" + POINTS : "X"}</span>
                          : <span style={{ fontSize: 20, color: "var(--text3)" }}>thinking...</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// -- Student --
function StudentLesson14({ session, sessionId, uid }) {
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [lastQId, setLastQId] = useState(null);
  const question = session.currentQuestion;
  const myScore = (session.participants || {})[uid]?.totalScore || 0;

  useEffect(() => {
    if (question?.id && question.id !== lastQId) { setSubmitted(false); setResult(null); setLastQId(question.id); }
  }, [question?.id]);

  const handleSubmit = async (inputVal) => {
    if (!question || submitted) return;
    const ans = String(inputVal).trim(); if (!ans) return;
    const correct = gradeAnswer(ans, question);
    await setDoc(doc(db, "sessions", sessionId, "answers", uid + "_" + question.id), {
      uid, questionId: question.id, answer: ans, correct, submittedAt: Date.now(),
    });
    if (correct) await addToScore(sessionId, uid, POINTS);
    setResult({ correct, answer: ans });
    setSubmitted(true);
  };

  if (session.status === "waiting") return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Waiting for teacher...</h2>
      <p style={{ color: "var(--text2)", fontSize: 20 }}>Lesson 14 - Introduction to Fractions</p>
    </div>
  );
  if (session.status === "ended") return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Session ended</h2>
      <p style={{ color: "var(--text2)", fontSize: 20 }}>Final score: <strong>{myScore} pts</strong></p>
    </div>
  );

  const isMulti = MULTI_ITEM_TYPES.includes(question?.type);

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "5px 12px", fontSize: 20, fontWeight: 700 }}>Score: {myScore} pts</div>
      </div>
      <div className="card" key={question?.id || "waiting"}>
        {session.status === "question" && session.timerEndsAt && !submitted && (
          <TimerBar endsAt={session.timerEndsAt} totalSeconds={session.timerSeconds} />
        )}
        {question && (
          <>
            {question.prompt && <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }}>{question.prompt}</div>}
            {!(session.status === "revealing" && isMulti) && (
              <QuestionDisplay question={question} revealCorrect={session.status === "revealing"} />
            )}
          </>
        )}

        {session.status === "revealing" ? (
          <div style={{ marginTop: 12 }}>
            {result ? (
              <div>
                <div style={{ textAlign: "center", fontSize: 22, fontWeight: 800, color: result.correct ? "var(--green)" : "var(--red)", marginBottom: 8 }}>
                  {result.correct ? "Correct! +" + POINTS + " pts" : "Incorrect"}
                </div>
                {isMulti ? (
                  // Per-item reveal
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {(question.fractions || question.questions || []).map((item, i) => {
                      let studentAns = "", correctAns = "", itemOk = false;
                      try {
                        const parsed = JSON.parse(result.answer);
                        studentAns = String(parsed[i] || "");
                        if (question.type === "classify-fractions") { itemOk = gradeClassifyItem(studentAns, item); correctAns = item.correct; }
                        else if (question.type === "compare-to-one") { itemOk = gradeCompareItem(studentAns, item); correctAns = { less: "< 1", equal: "= 1", greater: "> 1" }[item.correct]; }
                        else if (question.type === "improper-to-mixed") { itemOk = gradeImproperToMixedItem(studentAns, item); correctAns = item.displayAnswer; }
                        else if (question.type === "mixed-to-improper") { itemOk = gradeMixedToImproperItem(studentAns, item); correctAns = item.displayAnswer; }
                        else if (question.type === "mixed-review") { itemOk = gradeMixedReviewItem(studentAns, item); correctAns = item.displayAnswer; }
                      } catch {}
                      const displayLabel = item.display || (item.num !== undefined ? `${item.num}/${item.den}` : `${item.whole} ${item.num}/${item.den}`);
                      return (
                        <div key={i} style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "6px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, border: "1px solid " + (itemOk ? "rgba(22,163,74,0.2)" : "rgba(239,68,68,0.2)") }}>
                          <span style={{ fontFamily: "var(--mono)", fontSize: 18, fontWeight: 800 }}>{displayLabel}</span>
                          <div style={{ display: "flex", gap: 8 }}>
                            {!itemOk && <span style={{ fontSize: 17, color: "var(--red)", fontWeight: 700 }}>You: {studentAns||"-"}</span>}
                            <span style={{ fontSize: 17, color: "var(--green)", fontWeight: 700 }}>{correctAns}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 19, color: "var(--text2)", marginBottom: 4 }}>
                      Your answer: <strong style={{ fontFamily: "var(--mono)", color: result.correct ? "var(--green)" : "var(--red)" }}>{String(result.answer).slice(0, 30)}</strong>
                    </div>
                    {!result.correct && question?.displayAnswer && (
                      <div style={{ fontSize: 20, color: "var(--green)", fontWeight: 700, marginTop: 4 }}>Correct: <span style={{ fontFamily: "var(--mono)" }}>{question.displayAnswer}</span></div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: "center", color: "var(--text3)", fontSize: 20 }}>No answer submitted.</div>
            )}
          </div>
        ) : submitted ? (
          <div style={{ textAlign: "center", marginTop: 12 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--green)" }}>Submitted! Waiting for reveal...</div>
          </div>
        ) : question ? (
          <div style={{ marginTop: 14 }}>
            <AnswerInput question={question} onSubmit={handleSubmit} submitted={submitted} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

// -- Session Creator --
function CreateLesson14Session({ user, onCreated }) {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [timer, setTimer] = useState(90);
  const [loading, setLoading] = useState(false);
  useEffect(() => { getTeacherClasses(user.id).then(setClasses); }, []);
  const handleCreate = async () => {
    setLoading(true);
    try {
      const joinCode = Math.random().toString(36).slice(2, 7).toUpperCase();
      const sessionId = "sess_" + Date.now().toString(36);
      await setDoc(doc(db, "sessions", sessionId), {
        id: sessionId, teacherId: user.id, classId: selectedClass,
        joinCode, type: "lesson14", status: "waiting",
        currentQuestion: null, questionCount: 0,
        timerSeconds: timer, timerEndsAt: null,
        participants: {}, createdAt: Date.now(),
      });
      onCreated(sessionId);
    } catch (e) { alert("Error: " + e.message); setLoading(false); }
  };
  return (
    <div style={{ maxWidth: 480, margin: "0 auto" }}>
      <div className="card">
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Lesson 14 - Introduction to Fractions</h2>
        <p style={{ color: "var(--text2)", fontSize: 20, marginBottom: 16 }}>Fraction pictures, classification, number lines, conversions, equivalent fractions, and simplification.</p>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 20, fontWeight: 600, display: "block", marginBottom: 5 }}>Class</label>
          <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} style={{ width: "100%", padding: "10px 12px", fontSize: 20 }}>
            <option value="">Select a class...</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 20, fontWeight: 600, display: "block", marginBottom: 5 }}>Default seconds per question</label>
          <input type="number" min={30} max={300} value={timer} onChange={e => setTimer(Number(e.target.value))} style={{ width: "100%", padding: "10px 12px", fontSize: 20 }} />
        </div>
        <button className="btn btn-primary btn-lg" style={{ width: "100%", fontSize: 20 }} onClick={handleCreate} disabled={loading || !selectedClass}>
          {loading ? "Creating..." : "Start Session"}
        </button>
      </div>
    </div>
  );
}

export default function Lesson14Session({ user, onHome }) {
  const [view, setView] = useState("create");
  const [sessionId, setSessionId] = useState(null);
  const [session, setSession] = useState(null);
  useEffect(() => {
    if (!sessionId) return;
    const unsub = onSessionChange(sessionId, setSession);
    return () => unsub();
  }, [sessionId]);
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "clamp(16px,3vw,32px)" }} className="dot-bg">
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,var(--blue),var(--orange))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, color: "#fff" }}>L14</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 22 }}>GCA - Lesson 14</div>
              <div style={{ color: "var(--text3)", fontSize: 20 }}>Introduction to Fractions</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onHome}>Back to Home</button>
        </div>
        {view === "create" && <CreateLesson14Session user={user} onCreated={(sid) => { setSessionId(sid); setView("session"); }} />}
        {view === "session" && session && (
          user.role === "teacher"
            ? <TeacherLesson14 session={session} sessionId={sessionId} uid={user.id} />
            : <StudentLesson14 session={session} sessionId={sessionId} uid={user.id} />
        )}
        {view === "session" && !session && <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><div className="spinner" /></div>}
      </div>
    </div>
  );
}

export { TeacherLesson14 as Lesson14TeacherView, StudentLesson14 as Lesson14StudentView };

