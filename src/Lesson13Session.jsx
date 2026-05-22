import { useState, useEffect, useRef } from "react";
import { setDoc, doc, updateDoc } from "firebase/firestore";
import { onSessionChange, onClassworkAnswersChange, getTeacherClasses, addToScore, db } from "./core/firebase";
import {
  LESSON13_TOPICS, generateLesson13Question, gradeLesson13Answer,
  gradeWarmupA, gradeIsMultipleItem,
  gradeGCFByPFStage1a, gradeGCFByPFStage1b, gradeGCFByPFStage2, gradeGCFByPFStage3,
  gradeLCMByPFStage1a, gradeLCMByPFStage1b, gradeLCMByPFStage2, gradeLCMByPFStage3,
  genGCFDirect, genLCMDirect,
} from "./lesson13Questions";

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
    s.async = true;
    document.head.appendChild(s);
  }, []);
}
function KaTeX({ expr, block }) {
  const ref = useRef(null);
  useKaTeX();
  useEffect(() => {
    const go = () => {
      if (window.katex && ref.current) {
        try { window.katex.render(expr, ref.current, { throwOnError: false, displayMode: !!block }); } catch {}
      } else setTimeout(go, 100);
    };
    go();
  });
  return block
    ? <div ref={ref} style={{ fontSize: 26, margin: "6px 0", minHeight: 36 }} />
    : <span ref={ref} style={{ fontSize: 22 }} />;
}

// -- Timer --
function TimerBar({ endsAt, totalSeconds, onExpired }) {
  const [rem, setRem] = useState(totalSeconds);
  const ref = useRef(false);
  useEffect(() => {
    ref.current = false;
    const tick = () => {
      const l = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setRem(l);
      if (l === 0 && !ref.current) { ref.current = true; onExpired?.(); }
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
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
        style={{ textAlign: "center", fontSize: 22, fontFamily: "var(--mono)", fontWeight: 700, padding: "10px", width: wide ? 300 : 180 }} />
      <button className="btn btn-primary" style={{ fontSize: 20, padding: "10px 20px" }}
        onMouseDown={e => { e.preventDefault(); submit(); }} disabled={submitted || !val.trim()}>OK</button>
    </div>
  );
}

// -- QuestionDisplay (teacher + reveal) --
function QuestionDisplay({ question: q, revealCorrect }) {
  useKaTeX();
  if (!q) return null;

  if (q.type === "warmup-a") return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 32, fontWeight: 900, fontFamily: "var(--mono)", marginBottom: 10 }}>{q.n}</div>
      {revealCorrect && <div style={{ fontSize: 20, color: "var(--green)", fontWeight: 700 }}>Divisible by: {q.displayAnswer}</div>}
    </div>
  );

  if (q.type === "warmup-b") return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 36, fontWeight: 900, fontFamily: "var(--mono)", marginBottom: 10 }}>1</div>
      {revealCorrect && <div style={{ fontSize: 20, color: "var(--green)", fontWeight: 700 }}>{q.displayAnswer}</div>}
    </div>
  );

  if (q.type === "warmup-c") return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 36, fontWeight: 900, fontFamily: "var(--mono)", marginBottom: 10 }}>{q.n}</div>
      {revealCorrect && <div style={{ fontSize: 20, color: "var(--green)", fontWeight: 700, fontFamily: "var(--mono)" }}>{q.displayAnswer}</div>}
    </div>
  );

  if (q.type === "list-factors") return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 36, fontWeight: 900, fontFamily: "var(--mono)", marginBottom: 12 }}>{q.n}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {q.options.map((opt, i) => (
          <div key={i} style={{ background: revealCorrect && i === q.correctIdx ? "rgba(22,163,74,0.1)" : "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "8px 14px", fontSize: 20, fontFamily: "var(--mono)", fontWeight: 700, border: revealCorrect && i === q.correctIdx ? "2px solid var(--green)" : "1px solid var(--border)" }}>
            {String.fromCharCode(65 + i)}) {"{" + opt.join(", ") + "}"}
          </div>
        ))}
      </div>
    </div>
  );

  if (q.type === "missing-factor") return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 28, fontWeight: 900, fontFamily: "var(--mono)", marginBottom: 8 }}>{q.a} - ___ = {q.n}</div>
      {revealCorrect && <div style={{ fontSize: 22, color: "var(--green)", fontWeight: 700 }}>___ = {q.b}</div>}
    </div>
  );

  if (q.type === "first-five-multiples") return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 28, fontWeight: 900, fontFamily: "var(--mono)", marginBottom: 8 }}>First 5 multiples of {q.n}</div>
      {revealCorrect && <div style={{ fontSize: 22, color: "var(--green)", fontWeight: 700, fontFamily: "var(--mono)" }}>{q.displayAnswer}</div>}
    </div>
  );

  if (q.type === "is-multiple") {
    if (!revealCorrect) return null; // shown via AnswerInput
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {q.statements.map((s, i) => (
          <div key={i} style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "8px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 20, fontFamily: "var(--mono)" }}>{s.display}</span>
            <span style={{ fontWeight: 800, fontSize: 20, color: s.isMultiple ? "var(--green)" : "var(--red)" }}>{s.isMultiple ? "Yes" : "No"}</span>
          </div>
        ))}
      </div>
    );
  }

  if (q.type === "gcf-factors") return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 28, fontWeight: 900, fontFamily: "var(--mono)", marginBottom: 12 }}>GCF of {q.a} and {q.b}</div>
      <div style={{ fontSize: 20, color: "var(--text2)", marginBottom: 10 }}>Factors of {q.a}: {"{" + q.factors_a.join(", ") + "}"}</div>
      <div style={{ fontSize: 20, color: "var(--text2)", marginBottom: 12 }}>Factors of {q.b}: {"{" + q.factors_b.join(", ") + "}"}</div>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
        {q.options.map((opt, i) => (
          <div key={i} style={{ padding: "10px 20px", borderRadius: "var(--radius-sm)", border: revealCorrect && i === q.correctIdx ? "2px solid var(--green)" : "1px solid var(--border)", background: revealCorrect && i === q.correctIdx ? "rgba(22,163,74,0.1)" : "var(--bg2)", fontSize: 22, fontWeight: 800, fontFamily: "var(--mono)" }}>{opt}</div>
        ))}
      </div>
    </div>
  );

  if (q.type === "gcf-pf" || q.type === "lcm-pf") {
    const isGCF = q.type === "gcf-pf";
    return (
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 26, fontWeight: 900, fontFamily: "var(--mono)", marginBottom: 8 }}>
          {isGCF ? "GCF" : "LCM"} of {q.a} and {q.b}
        </div>
        <div style={{ fontSize: 20, color: "var(--text2)", marginBottom: 4 }}>
          {q.a} = <span style={{ fontFamily: "var(--mono)", fontWeight: 700 }}>{q.pf_a}</span>
        </div>
        <div style={{ fontSize: 20, color: "var(--text2)", marginBottom: 8 }}>
          {q.b} = <span style={{ fontFamily: "var(--mono)", fontWeight: 700 }}>{q.pf_b}</span>
        </div>
        {revealCorrect && <div style={{ fontSize: 22, color: "var(--green)", fontWeight: 700 }}>{isGCF ? "GCF" : "LCM"} = {isGCF ? q.g : q.l}</div>}
      </div>
    );
  }

  if (q.type === "gcf-direct" || q.type === "lcm-direct") return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 28, fontWeight: 900, fontFamily: "var(--mono)", marginBottom: 8 }}>
        {q.type === "gcf-direct" ? "GCF" : "LCM"} of {q.a} and {q.b}
      </div>
      {revealCorrect && <div style={{ fontSize: 22, color: "var(--green)", fontWeight: 700 }}>{q.displayAnswer}</div>}
    </div>
  );

  if (q.type === "lcm-multiples") return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 28, fontWeight: 900, fontFamily: "var(--mono)", marginBottom: 12 }}>LCM of {q.a} and {q.b}</div>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
        {q.options.map((opt, i) => (
          <div key={i} style={{ padding: "10px 20px", borderRadius: "var(--radius-sm)", border: revealCorrect && i === q.correctIdx ? "2px solid var(--green)" : "1px solid var(--border)", background: revealCorrect && i === q.correctIdx ? "rgba(22,163,74,0.1)" : "var(--bg2)", fontSize: 22, fontWeight: 800, fontFamily: "var(--mono)" }}>{opt}</div>
        ))}
      </div>
    </div>
  );

  if (q.type === "word-problem") return (
    <div>
      <div style={{ fontSize: 20, lineHeight: 1.6, marginBottom: 12 }}>{q.text}</div>
      {revealCorrect && (
        <div style={{ background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.2)", borderRadius: "var(--radius-sm)", padding: "10px 14px" }}>
          <div style={{ fontSize: 20, color: "var(--green)", fontWeight: 700 }}>{q.displayAnswer} ({q.hint})</div>
        </div>
      )}
    </div>
  );

  return null;
}

// -- Answer Inputs --
function WarmupAInput({ question, onSubmit, submitted }) {
  const ALL = [2, 3, 4, 5, 6, 9, 10];
  const [selected, setSelected] = useState([]);
  const toggle = d => !submitted && setSelected(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  return (
    <div>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 12 }}>
        {ALL.map(d => {
          const sel = selected.includes(d);
          return (
            <button key={d} onClick={() => toggle(d)}
              style={{ padding: "8px 16px", borderRadius: "var(--radius-sm)", border: "2px solid " + (sel ? "var(--blue)" : "var(--border)"), background: sel ? "rgba(27,143,255,0.15)" : "var(--surface)", fontSize: 22, fontWeight: 700, cursor: "pointer", color: sel ? "var(--blue)" : "var(--text)" }}>
              {d}
            </button>
          );
        })}
      </div>
      <div style={{ fontSize: 19, color: "var(--text3)", marginBottom: 8, textAlign: "center" }}>Select all that apply. Leave blank if none.</div>
      <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }}
        onClick={() => onSubmit(JSON.stringify(selected))} disabled={submitted}>Submit</button>
    </div>
  );
}

function IsMultipleInput({ question, onSubmit, submitted }) {
  const [answers, setAnswers] = useState(question.statements.map(() => null));
  const allDone = answers.every(a => a !== null);
  const set = (i, v) => setAnswers(prev => prev.map((x, j) => j === i ? v : x));
  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
        {question.statements.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "10px 14px", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 20, fontFamily: "var(--mono)", fontWeight: 700 }}>{s.display}</span>
            <div style={{ display: "flex", gap: 8 }}>
              {["Yes", "No"].map(opt => {
                const val = opt === "Yes";
                const active = answers[i] === val;
                return (
                  <button key={opt} onClick={() => !submitted && set(i, val)}
                    style={{ padding: "6px 16px", borderRadius: "var(--radius-sm)", border: "2px solid " + (active ? (val ? "var(--green)" : "var(--red)") : "var(--border)"), background: active ? (val ? "rgba(22,163,74,0.15)" : "rgba(239,68,68,0.15)") : "var(--surface)", fontSize: 20, fontWeight: 700, cursor: "pointer", color: active ? (val ? "var(--green)" : "var(--red)") : "var(--text)" }}>
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }}
        onClick={() => onSubmit(JSON.stringify(answers))} disabled={submitted || !allDone}>Submit All</button>
    </div>
  );
}

function MCInput({ options, onSubmit, submitted, labelFn }) {
  const [sel, setSel] = useState(null);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {options.map((opt, i) => (
        <button key={i} onClick={() => { if (!submitted) { setSel(i); onSubmit(String(i)); } }}
          style={{ padding: "10px 16px", borderRadius: "var(--radius-sm)", border: "2px solid " + (sel === i ? "var(--blue)" : "var(--border)"), background: sel === i ? "rgba(27,143,255,0.12)" : "var(--surface)", fontSize: 20, fontWeight: 700, cursor: "pointer", textAlign: "left" }}>
          {String.fromCharCode(65 + i)}) {labelFn ? labelFn(opt) : opt}
        </button>
      ))}
    </div>
  );
}

// Multi-stage GCF/LCM by PF input
function GCFPFInput({ question, onSubmit, submitted }) {
  const [stage, setStage] = useState(0);
  const [input1a, setInput1a] = useState("");
  const [input1b, setInput1b] = useState("");
  const [stage2Answers, setStage2Answers] = useState(question.primeOptions.map(() => ""));
  const [input3, setInput3] = useState("");
  const [feedback, setFeedback] = useState(null);
  const isGCF = question.type === "gcf-pf";
  const primeOptions = question.primeOptions;

  const labels = [
    `Stage 1: Enter prime factorization of ${question.a}`,
    `Stage 1b: Enter prime factorization of ${question.b}`,
    `Stage 2: For each prime, select the ${isGCF ? "smallest" : "largest"} exponent`,
    `Stage 3: Enter the ${isGCF ? "GCF" : "LCM"}`,
  ];

  const handleStage1a = () => {
    const ok = isGCF ? gradeGCFByPFStage1a(input1a, question) : gradeLCMByPFStage1a(input1a, question);
    setFeedback({ correct: ok, wrong: ok ? null : `${question.a} = ${question.pf_a}` });
    if (ok) setTimeout(() => { setStage(1); setFeedback(null); }, 0);
  };
  const handleStage1b = () => {
    const ok = isGCF ? gradeGCFByPFStage1b(input1b, question) : gradeLCMByPFStage1b(input1b, question);
    setFeedback({ correct: ok, wrong: ok ? null : `${question.b} = ${question.pf_b}` });
    if (ok) setTimeout(() => { setStage(2); setFeedback(null); }, 0);
  };
  const handleStage2 = () => {
    const ok = isGCF ? gradeGCFByPFStage2(JSON.stringify(stage2Answers), question) : gradeLCMByPFStage2(JSON.stringify(stage2Answers), question);
    const correctAnswers = primeOptions.map(po => String(po.correct));
    setFeedback({ correct: ok, wrong: ok ? null : "Correct: " + primeOptions.map(po => `${po.prime}: exp=${po.correct}`).join(", ") });
    if (ok) setTimeout(() => { setStage(3); setFeedback(null); }, 0);
  };
  const handleStage3 = () => {
    const ok = isGCF ? gradeGCFByPFStage3(input3, question) : gradeLCMByPFStage3(input3, question);
    const ans = isGCF ? question.g : question.l;
    setFeedback({ correct: ok, wrong: ok ? null : `Answer: ${ans}` });
    if (ok) onSubmit(String(ans));
  };

  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 700, color: "var(--blue)", marginBottom: 12 }}>{labels[stage]}</div>
      {stage === 0 && (
        <div>
          {feedback && <div style={{ fontSize: 19, color: feedback.correct ? "var(--green)" : "var(--red)", fontWeight: 700, marginBottom: 8 }}>{feedback.correct ? "Correct! Move to next stage." : feedback.wrong}</div>}
          {!feedback?.correct && <TextInput onSubmit={handleStage1a} submitted={false} placeholder={`e.g. ${question.pf_a}`} wide />}
        </div>
      )}
      {stage === 1 && (
        <div>
          <div style={{ fontSize: 20, color: "var(--text2)", marginBottom: 6 }}>{question.a} = <strong style={{ fontFamily: "var(--mono)" }}>{question.pf_a}</strong></div>
          {feedback && <div style={{ fontSize: 19, color: feedback.correct ? "var(--green)" : "var(--red)", fontWeight: 700, marginBottom: 8 }}>{feedback.correct ? "Correct!" : feedback.wrong}</div>}
          {!feedback?.correct && <TextInput onSubmit={handleStage1b} submitted={false} placeholder={`e.g. ${question.pf_b}`} wide />}
        </div>
      )}
      {stage === 2 && (
        <div>
          <div style={{ fontSize: 20, color: "var(--text2)", marginBottom: 4 }}>{question.a} = <strong style={{ fontFamily: "var(--mono)" }}>{question.pf_a}</strong></div>
          <div style={{ fontSize: 20, color: "var(--text2)", marginBottom: 10 }}>{question.b} = <strong style={{ fontFamily: "var(--mono)" }}>{question.pf_b}</strong></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
            {primeOptions.map((po, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "8px 12px" }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: 20, fontWeight: 800, minWidth: 24 }}>{po.prime}:</span>
                <span style={{ fontSize: 19, color: "var(--text3)" }}>exp {po.expA} vs exp {po.expB} -</span>
                <div style={{ display: "flex", gap: 6 }}>
                  {[...new Set([po.expA, po.expB])].sort().map(exp => (
                    <button key={exp} onClick={() => setStage2Answers(prev => prev.map((x, j) => j === i ? String(exp) : x))}
                      style={{ padding: "4px 12px", borderRadius: "var(--radius-sm)", border: "2px solid " + (stage2Answers[i] === String(exp) ? "var(--blue)" : "var(--border)"), background: stage2Answers[i] === String(exp) ? "rgba(27,143,255,0.15)" : "var(--surface)", fontSize: 20, fontWeight: 700, cursor: "pointer", fontFamily: "var(--mono)" }}>
                      {exp}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {feedback && <div style={{ fontSize: 19, color: feedback.correct ? "var(--green)" : "var(--red)", fontWeight: 700, marginBottom: 8 }}>{feedback.correct ? "Correct!" : feedback.wrong}</div>}
          <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }} onClick={handleStage2}
            disabled={stage2Answers.some(a => a === "")}>Submit</button>
        </div>
      )}
      {stage === 3 && (
        <div>
          {feedback && <div style={{ fontSize: 19, color: feedback.correct ? "var(--green)" : "var(--red)", fontWeight: 700, marginBottom: 8 }}>{feedback.correct ? "Correct!" : feedback.wrong}</div>}
          {!feedback?.correct && <TextInput onSubmit={handleStage3} submitted={false} placeholder={`Enter ${isGCF ? "GCF" : "LCM"}`} />}
        </div>
      )}
    </div>
  );
}

function WordProblemInput({ question, onSubmit, submitted }) {
  const [method, setMethod] = useState("");
  const [value, setValue] = useState("");
  const canSubmit = method !== "" && value.trim() !== "";
  return (
    <div>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 12 }}>
        {["GCF", "LCM"].map(m => (
          <button key={m} onClick={() => !submitted && setMethod(m.toLowerCase())}
            style={{ padding: "10px 24px", borderRadius: "var(--radius-sm)", border: "2px solid " + (method === m.toLowerCase() ? "var(--blue)" : "var(--border)"), background: method === m.toLowerCase() ? "rgba(27,143,255,0.15)" : "var(--surface)", fontSize: 22, fontWeight: 800, cursor: "pointer", color: method === m.toLowerCase() ? "var(--blue)" : "var(--text)" }}>
            {m}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
        <input value={value} onChange={e => setValue(e.target.value)}
          onKeyDown={e => e.key === "Enter" && canSubmit && onSubmit(JSON.stringify({ method, value: value.trim() }))}
          disabled={submitted} placeholder="Enter answer"
          style={{ textAlign: "center", fontSize: 22, fontFamily: "var(--mono)", fontWeight: 700, padding: "10px", width: 160 }} />
        <button className="btn btn-primary" style={{ fontSize: 20, padding: "10px 20px" }}
          onClick={() => onSubmit(JSON.stringify({ method, value: value.trim() }))}
          disabled={submitted || !canSubmit}>OK</button>
      </div>
    </div>
  );
}

function AnswerInput({ question, onSubmit, submitted }) {
  if (!question) return null;
  const t = question.type;
  if (t === "warmup-a") return <WarmupAInput question={question} onSubmit={onSubmit} submitted={submitted} />;
  if (t === "warmup-b") return (
    <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
      {["Prime", "Composite", "Neither"].map(opt => (
        <button key={opt} onClick={() => !submitted && onSubmit(opt.toLowerCase())}
          style={{ padding: "10px 18px", borderRadius: "var(--radius-sm)", border: "2px solid var(--border)", background: "var(--surface)", fontSize: 20, fontWeight: 700, cursor: "pointer" }}>
          {opt}
        </button>
      ))}
    </div>
  );
  if (t === "warmup-c") return (
    <div>
      <div style={{ fontSize: 19, color: "var(--text3)", marginBottom: 6, textAlign: "center" }}>Use ^ for exponents, x or * for multiplication</div>
      <TextInput onSubmit={onSubmit} submitted={submitted} placeholder="e.g. 2^3 * 3^2" wide />
    </div>
  );
  if (t === "list-factors") return <MCInput options={question.options} onSubmit={onSubmit} submitted={submitted} labelFn={o => "{" + o.join(", ") + "}"} />;
  if (t === "missing-factor") return <TextInput onSubmit={onSubmit} submitted={submitted} placeholder="Enter missing factor" />;
  if (t === "first-five-multiples") return (
    <div>
      <div style={{ fontSize: 19, color: "var(--text3)", marginBottom: 6, textAlign: "center" }}>Separate by commas (e.g. 7, 14, 21, 28, 35)</div>
      <TextInput onSubmit={onSubmit} submitted={submitted} placeholder="e.g. 7, 14, 21, 28, 35" wide />
    </div>
  );
  if (t === "is-multiple") return <IsMultipleInput question={question} onSubmit={onSubmit} submitted={submitted} />;
  if (t === "gcf-factors") return <MCInput options={question.options} onSubmit={onSubmit} submitted={submitted} labelFn={o => String(o)} />;
  if (t === "gcf-pf" || t === "lcm-pf") return <GCFPFInput question={question} onSubmit={onSubmit} submitted={submitted} />;
  if (t === "gcf-direct" || t === "lcm-direct") return <TextInput onSubmit={onSubmit} submitted={submitted} placeholder="Enter answer" />;
  if (t === "lcm-multiples") return <MCInput options={question.options} onSubmit={onSubmit} submitted={submitted} labelFn={o => String(o)} />;
  if (t === "word-problem") return <WordProblemInput question={question} onSubmit={onSubmit} submitted={submitted} />;
  return null;
}

// -- Grade wrapper --
function gradeAnswer(input, question) {
  if (!input || !question) return false;
  // Multi-stage: graded at submit time by the stage component
  if (question.type === "gcf-pf" || question.type === "lcm-pf") {
    return parseInt(String(input).trim()) === (question.g || question.l);
  }
  return gradeLesson13Answer(input, question);
}

// -- Teacher --
function TeacherLesson13({ session, sessionId, uid }) {
  const [answers, setAnswers] = useState([]);
  const [timerInput, setTimerInput] = useState(90);
  const [topicIdx, setTopicIdx] = useState(0);
  const [problemIdx, setProblemIdx] = useState(0);
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

  const handleGenerate = async (tIdx, pIdx) => {
    const topicId = LESSON13_TOPICS[tIdx ?? topicIdx].id;
    const extra = (topicId === "gcf-direct" || topicId === "lcm-direct") ? { idx: pIdx ?? problemIdx } : undefined;
    const q = generateLesson13Question(topicId, extra);
    const qId = "q_" + Date.now().toString(36);
    q.id = qId; q.points = POINTS; q._topicId = topicId;
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

  const isMultiItem = question?.type === "is-multiple";
  const isSerial = ["gcf-direct", "lcm-direct"].includes(question?._topicId);
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
                {isSerial && problemIdx < 2 && (
                  <button className="btn btn-primary" onClick={() => { const n = problemIdx + 1; setProblemIdx(n); handleGenerate(topicIdx, n); }}>
                    Problem {problemIdx + 2}/3
                  </button>
                )}
                {(!isSerial || problemIdx >= 2) && topicIdx < LESSON13_TOPICS.length - 1 && (
                  <button className="btn btn-primary" onClick={() => { const n = topicIdx + 1; setTopicIdx(n); setProblemIdx(0); handleGenerate(n, 0); }}>
                    Next: {LESSON13_TOPICS[topicIdx + 1]?.label}
                  </button>
                )}
              </>
            )}
            <button className="btn btn-ghost" style={{ color: "var(--red)" }} onClick={handleEnd}>End</button>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 16, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Topic</div>
          {LESSON13_TOPICS.map((t, i) => {
            const isActive = i === topicIdx, isDone = i < topicIdx;
            return (
              <button key={t.id} onClick={() => { setTopicIdx(i); setProblemIdx(0); }}
                style={{ background: isActive ? "rgba(27,143,255,0.15)" : "var(--surface)", border: "2px solid " + (isActive ? "var(--blue)" : isDone ? "rgba(22,163,74,0.3)" : "var(--border)"), borderRadius: "var(--radius)", padding: "5px 8px", cursor: "pointer", textAlign: "left", fontFamily: "var(--font)" }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: isActive ? "var(--blue)" : isDone ? "var(--green)" : "var(--text)" }}>{t.label}</div>
                <div style={{ fontSize: 14, color: "var(--text3)" }}>{t.description}</div>
              </button>
            );
          })}
          <button className="btn btn-primary" style={{ marginTop: 8, fontSize: 20 }}
            onClick={() => handleGenerate()} disabled={session.status === "question"}>
            Generate Question
          </button>
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
                  {LESSON13_TOPICS[topicIdx]?.label} - {submittedCount}/{totalStudents} submitted{!isMultiItem && ` - ${correctCount} correct`}
                  {isSerial && ` - Problem ${problemIdx + 1}/3`}
                </div>
                <QuestionDisplay question={question} revealCorrect={session.status === "revealing"} />
                {session.status === "question" && session.timerEndsAt && (
                  <div style={{ marginTop: 12 }}>
                    <TimerBar endsAt={session.timerEndsAt} totalSeconds={session.timerSeconds}
                      onExpired={async () => { if (!revealedRef.current) await handleReveal(); }} />
                  </div>
                )}
                {session.status === "revealing" && !isMultiItem && (
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
function StudentLesson13({ session, sessionId, uid }) {
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
      <p style={{ color: "var(--text2)", fontSize: 20 }}>Lesson 13 - Factors, Multiples, GCF & LCM</p>
    </div>
  );
  if (session.status === "ended") return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Session ended</h2>
      <p style={{ color: "var(--text2)", fontSize: 20 }}>Final score: <strong>{myScore} pts</strong></p>
    </div>
  );

  const isMultiItem = question?.type === "is-multiple";
  const isMultiStage = ["gcf-pf", "lcm-pf"].includes(question?.type);

  return (
    <div style={{ maxWidth: 620, margin: "0 auto" }}>
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
            {!(session.status === "revealing" && (isMultiItem || isMultiStage)) && (
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
                {isMultiItem ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {question.statements.map((s, i) => {
                      let studentAns = null;
                      try { studentAns = JSON.parse(result.answer)[i]; } catch {}
                      const itemOk = gradeIsMultipleItem(studentAns, s);
                      return (
                        <div key={i} style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "6px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid " + (itemOk ? "rgba(22,163,74,0.2)" : "rgba(239,68,68,0.2)") }}>
                          <span style={{ fontSize: 18, fontFamily: "var(--mono)" }}>{s.display}</span>
                          <div style={{ display: "flex", gap: 8 }}>
                            {!itemOk && <span style={{ fontSize: 18, color: "var(--red)", fontWeight: 700 }}>You: {studentAns ? "Yes" : "No"}</span>}
                            <span style={{ fontSize: 18, color: "var(--green)", fontWeight: 700 }}>{s.isMultiple ? "Yes" : "No"}</span>
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
                      <div style={{ fontSize: 20, color: "var(--green)", fontWeight: 700, marginTop: 4 }}>Correct: {question.displayAnswer}</div>
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
function CreateLesson13Session({ user, onCreated }) {
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
        joinCode, type: "lesson13", status: "waiting",
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
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Lesson 13 - Factors, Multiples, GCF & LCM</h2>
        <p style={{ color: "var(--text2)", fontSize: 20, marginBottom: 16 }}>Factors, multiples, GCF and LCM by listing and prime factorization.</p>
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

export default function Lesson13Session({ user, onHome }) {
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
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,var(--blue),var(--orange))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, color: "#fff" }}>L13</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 22 }}>GCA - Lesson 13</div>
              <div style={{ color: "var(--text3)", fontSize: 20 }}>Factors, Multiples, GCF & LCM</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onHome}>Back to Home</button>
        </div>
        {view === "create" && <CreateLesson13Session user={user} onCreated={(sid) => { setSessionId(sid); setView("session"); }} />}
        {view === "session" && session && (
          user.role === "teacher"
            ? <TeacherLesson13 session={session} sessionId={sessionId} uid={user.id} />
            : <StudentLesson13 session={session} sessionId={sessionId} uid={user.id} />
        )}
        {view === "session" && !session && <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><div className="spinner" /></div>}
      </div>
    </div>
  );
}

export { TeacherLesson13 as Lesson13TeacherView, StudentLesson13 as Lesson13StudentView };

