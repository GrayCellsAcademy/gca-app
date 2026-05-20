import { useState, useEffect, useRef } from "react";
import { setDoc, doc, updateDoc } from "firebase/firestore";
import { onSessionChange, onClassworkAnswersChange, getTeacherClasses, addToScore, db } from "./core/firebase";
import {
  LESSON12_TOPICS, generateLesson12Question,
  gradeWarmupA, gradeWarmupB, gradeWarmupC,
  gradeDivisibility2510Item, gradeDivisibility39Item,
  gradeMissingDigit, gradeDivisibility46Item, gradeMixedRulesItem,
  gradePrimeCompositeItem, gradeFactorTree, gradePFMultipleChoice, gradePFFreeResponse,
} from "./lesson12Questions";

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
function KaTeXSpan({ expr }) {
  const ref = useRef(null);
  useEffect(() => {
    const go = () => {
      if (window.katex && ref.current) {
        try { window.katex.render(expr, ref.current, { throwOnError: false }); } catch {}
      } else setTimeout(go, 100);
    };
    go();
  });
  return <span ref={ref} style={{ fontSize: 22 }} />;
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

// -- Multi-select button group (for divisibility rules) --
function MultiSelectGroup({ options, selected, onToggle, disabled }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
      {options.map(opt => {
        const isSelected = selected.includes(opt);
        return (
          <button key={opt} onClick={() => !disabled && onToggle(opt)}
            style={{ padding: "6px 14px", borderRadius: "var(--radius-sm)", border: "2px solid " + (isSelected ? "var(--blue)" : "var(--border)"), background: isSelected ? "rgba(27,143,255,0.15)" : "var(--surface)", fontFamily: "var(--font)", fontSize: 20, fontWeight: 700, cursor: disabled ? "default" : "pointer", color: isSelected ? "var(--blue)" : "var(--text)" }}>
            {opt}
          </button>
        );
      })}
    </div>
  );
}

// -- Single-select button group --
function SingleSelect({ options, selected, onSelect, disabled }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
      {options.map(opt => {
        const isSelected = selected === opt;
        return (
          <button key={opt} onClick={() => !disabled && onSelect(opt)}
            style={{ padding: "8px 18px", borderRadius: "var(--radius-sm)", border: "2px solid " + (isSelected ? "var(--blue)" : "var(--border)"), background: isSelected ? "rgba(27,143,255,0.15)" : "var(--surface)", fontFamily: "var(--font)", fontSize: 20, fontWeight: 700, cursor: disabled ? "default" : "pointer", color: isSelected ? "var(--blue)" : "var(--text)" }}>
            {opt}
          </button>
        );
      })}
    </div>
  );
}

// -- Text input with submit --
function TextInput({ onSubmit, submitted, placeholder }) {
  const [val, setVal] = useState("");
  const ref = useRef(null);
  useEffect(() => { setVal(""); setTimeout(() => ref.current?.focus(), 80); }, [submitted]);
  const submit = () => { if (val.trim()) onSubmit(val.trim()); };
  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
      <input ref={ref} value={val} onChange={e => setVal(e.target.value)}
        onKeyDown={e => e.key === "Enter" && submit()} disabled={submitted}
        placeholder={placeholder || ""}
        style={{ textAlign: "center", fontSize: 22, fontFamily: "var(--mono)", fontWeight: 700, padding: "10px", width: 240 }} />
      <button className="btn btn-primary" style={{ fontSize: 20, padding: "10px 20px" }}
        onMouseDown={e => { e.preventDefault(); submit(); }} disabled={submitted || !val.trim()}>OK</button>
    </div>
  );
}


// -- Inequality input with symbol buttons --
function IneqInput({ onSubmit, submitted, placeholder }) {
  const [val, setVal] = useState("");
  const ref = useRef(null);
  useEffect(() => { setVal(""); setTimeout(() => ref.current?.focus(), 80); }, [submitted]);
  const addSym = (sym) => {
    if (submitted) return;
    setVal(v => v.includes("x") ? v.trimEnd() + " " + sym + " " : "x " + sym + " ");
    setTimeout(() => ref.current?.focus(), 0);
  };
  const submit = () => { if (val.trim()) onSubmit(val.trim()); };
  return (
    <div>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 8 }}>
        {[">","<",">=","<="].map(sym => (
          <button key={sym} onClick={() => addSym(sym)}
            style={{ padding: "8px 16px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border2)", background: "var(--surface)", fontSize: 22, fontWeight: 800, fontFamily: "var(--mono)", cursor: "pointer", color: "var(--blue)" }}>
            {sym}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
        <input ref={ref} value={val} onChange={e => setVal(e.target.value)}
          onKeyDown={e => e.key === "Enter" && submit()} disabled={submitted}
          placeholder={placeholder || "e.g. x > 3"}
          style={{ textAlign: "center", fontSize: 22, fontFamily: "var(--mono)", fontWeight: 700, padding: "10px", width: 220 }} />
        <button className="btn btn-primary" style={{ fontSize: 20, padding: "10px 20px" }}
          onMouseDown={e => { e.preventDefault(); submit(); }} disabled={submitted || !val.trim()}>OK</button>
      </div>
    </div>
  );
}

// -- Question Display --
function QuestionDisplay({ question: q, revealCorrect }) {
  if (!q) return null;

  if (q.type === "warmup-a") return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "var(--mono)", marginBottom: 8 }}>{q.display}</div>
      {revealCorrect && <div style={{ fontSize: 22, color: "var(--green)", fontWeight: 700 }}>{q.displayAnswer}</div>}
    </div>
  );

  if (q.type === "warmup-b") return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "var(--mono)", marginBottom: 8 }}>{q.display}</div>
      {revealCorrect && <div style={{ fontSize: 22, color: "var(--green)", fontWeight: 700 }}>{q.displayAnswer}</div>}
    </div>
  );

  if (q.type === "warmup-c") return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 32, fontWeight: 900, fontFamily: "var(--mono)", marginBottom: 8 }}>{q.display}</div>
      {revealCorrect && <div style={{ fontSize: 22, color: "var(--green)", fontWeight: 700, marginBottom: 4 }}>{q.displayAnswer}</div>}
      {revealCorrect && q.hint && <div style={{ fontSize: 19, color: "var(--text2)" }}>{q.hint}</div>}
    </div>
  );

  // Multi-item types: only show on reveal
  const MULTI = ["div-2510","div-39","div-46","mixed-rules","prime-composite"];
  if (MULTI.includes(q.type) && revealCorrect) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {q.nums.map((n, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "8px 14px" }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: 22, fontWeight: 800 }}>{n}</span>
            <span style={{ fontSize: 20, color: "var(--green)", fontWeight: 700 }}>{q.answers[i].displayAnswer}</span>
          </div>
        ))}
      </div>
    );
  }
  if (MULTI.includes(q.type) && !revealCorrect) return null;

  if (q.type === "prime-composite" && revealCorrect) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {q.nums.map((n, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "8px 14px" }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: 22, fontWeight: 800 }}>{n}</span>
          <span style={{ fontSize: 20, color: "var(--green)", fontWeight: 700 }}>{q.answers[i].displayAnswer}</span>
        </div>
      ))}
    </div>
  );
  if (q.type === "prime-composite" && !revealCorrect) return null;

  if (q.type === "missing-digit") return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 32, fontWeight: 900, fontFamily: "var(--mono)", letterSpacing: "0.15em", marginBottom: 8 }}>{q.numStr}</div>
      <div style={{ fontSize: 20, color: "var(--text2)", marginBottom: 8 }}>{q.rule}</div>
      {revealCorrect && <div style={{ fontSize: 22, color: "var(--green)", fontWeight: 700 }}>{q.displayAnswer}</div>}
    </div>
  );

  if (q.type === "factor-tree") return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 36, fontWeight: 900, fontFamily: "var(--mono)", marginBottom: 12 }}>{q.n}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12, textAlign: "left" }}>
        {q.pairs.map((p, i) => (
          <div key={i} style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "8px 14px", fontSize: 20, fontFamily: "var(--mono)", fontWeight: 700 }}>
            {String.fromCharCode(65 + i)}) {p[0]} - {p[1]}
          </div>
        ))}
        <div style={{ background: revealCorrect ? "rgba(22,163,74,0.1)" : "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "8px 14px", fontSize: 20, fontFamily: "var(--mono)", fontWeight: 700, color: revealCorrect ? "var(--green)" : "var(--text)" }}>
          D) All of the above
        </div>
      </div>
    </div>
  );

  if (q.type === "pf-mc") return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 36, fontWeight: 900, fontFamily: "var(--mono)", marginBottom: 12 }}>{q.n}</div>
      {revealCorrect && <div style={{ fontSize: 22, color: "var(--green)", fontWeight: 700, marginBottom: 8 }}>
        <KaTeXSpan expr={q.displayAnswer.replace(/\^(\d+)/g,"^{$1}").replace(/ x /g," \\times ")} />
      </div>}
    </div>
  );

  if (q.type === "pf-free") return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 36, fontWeight: 900, fontFamily: "var(--mono)", marginBottom: 8 }}>{q.n}</div>
      <div style={{ fontSize: 20, color: "var(--text3)", marginBottom: 8 }}>Use ^ for exponents and - or * for multiplication</div>
      {revealCorrect && <div style={{ fontSize: 22, color: "var(--green)", fontWeight: 700 }}>
        <KaTeXSpan expr={q.displayAnswer.replace(/\^(\d+)/g,"^{$1}").replace(/ x /g," \\times ")} />
      </div>}
    </div>
  );

  return null;
}

// -- Answer Inputs --

// Divisibility 2/5/10 - multi-select checkboxes per number
function Div2510Input({ question, onSubmit, submitted }) {
  const [answers, setAnswers] = useState(question.nums.map(() => []));
  const toggle = (i, d) => {
    setAnswers(prev => prev.map((a, j) => j !== i ? a : a.includes(d) ? a.filter(x => x !== d) : [...a, d]));
  };
  const allDone = answers.every(a => a.length > 0);
  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
        {question.nums.map((n, i) => (
          <div key={i} style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "10px 14px" }}>
            <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "var(--mono)", marginBottom: 8 }}>{n}</div>
            <MultiSelectGroup options={[2, 5, 10]} selected={answers[i]} onToggle={d => !submitted && toggle(i, d)} disabled={submitted} />
          </div>
        ))}
      </div>
      <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }}
        onClick={() => onSubmit(JSON.stringify(answers))} disabled={submitted || !allDone}>Submit All</button>
    </div>
  );
}

// Divisibility 3/9 - single select per number
function Div39Input({ question, onSubmit, submitted }) {
  const opts = ["Divisible by 3","Divisible by 9","Both","Neither"];
  const valMap = {"Divisible by 3":"3only","Divisible by 9":"9only","Both":"both","Neither":"neither"};
  const [answers, setAnswers] = useState(question.nums.map(() => ""));
  const allDone = answers.every(a => a !== "");
  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
        {question.nums.map((n, i) => (
          <div key={i} style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "10px 14px" }}>
            <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "var(--mono)", marginBottom: 8 }}>{n}</div>
            <SingleSelect options={opts} selected={answers[i]}
              onSelect={v => !submitted && setAnswers(prev => prev.map((a, j) => j === i ? v : a))} disabled={submitted} />
          </div>
        ))}
      </div>
      <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }}
        onClick={() => onSubmit(JSON.stringify(answers.map(a => valMap[a] || "")))} disabled={submitted || !allDone}>Submit All</button>
    </div>
  );
}

// Missing digit - multi-select from 3 options
function MissingDigitInput({ question, onSubmit, submitted }) {
  const [selected, setSelected] = useState([]);
  const toggle = d => setSelected(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  return (
    <div>
      <div style={{ fontSize: 20, color: "var(--text2)", marginBottom: 10, textAlign: "center" }}>Select all digits that work:</div>
      <MultiSelectGroup options={question.options} selected={selected} onToggle={toggle} disabled={submitted} />
      <button className="btn btn-primary" style={{ width: "100%", fontSize: 20, marginTop: 12 }}
        onClick={() => onSubmit(JSON.stringify(selected))} disabled={submitted || selected.length === 0}>Submit</button>
    </div>
  );
}

// Divisibility 4/6
function Div46Input({ question, onSubmit, submitted }) {
  const opts = ["Divisible by 4","Divisible by 6","Both","Neither"];
  const valMap = {"Divisible by 4":"4only","Divisible by 6":"6only","Both":"both","Neither":"neither"};
  const [answers, setAnswers] = useState(question.nums.map(() => ""));
  const allDone = answers.every(a => a !== "");
  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
        {question.nums.map((n, i) => (
          <div key={i} style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "10px 14px" }}>
            <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "var(--mono)", marginBottom: 8 }}>{n}</div>
            <SingleSelect options={opts} selected={answers[i]}
              onSelect={v => !submitted && setAnswers(prev => prev.map((a, j) => j === i ? v : a))} disabled={submitted} />
          </div>
        ))}
      </div>
      <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }}
        onClick={() => onSubmit(JSON.stringify(answers.map(a => valMap[a] || "")))} disabled={submitted || !allDone}>Submit All</button>
    </div>
  );
}

// Mixed rules - multi-select all applicable rules per number
function MixedRulesInput({ question, onSubmit, submitted }) {
  const [answers, setAnswers] = useState(question.nums.map(() => []));
  const toggle = (i, d) => {
    setAnswers(prev => prev.map((a, j) => j !== i ? a : a.includes(d) ? a.filter(x => x !== d) : [...a, d]));
  };
  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
        {question.nums.map((n, i) => (
          <div key={i} style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "10px 14px" }}>
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "var(--mono)", marginBottom: 8 }}>{n}</div>
            <MultiSelectGroup options={[2, 3, 4, 5, 6, 9, 10]} selected={answers[i]} onToggle={d => !submitted && toggle(i, d)} disabled={submitted} />
          </div>
        ))}
      </div>
      <div style={{ fontSize: 20, color: "var(--text3)", marginBottom: 10, textAlign: "center" }}>Select all that apply. Leave blank if none apply.</div>
      <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }}
        onClick={() => onSubmit(JSON.stringify(answers))} disabled={submitted}>Submit All</button>
    </div>
  );
}

// Prime/Composite
function PrimeCompositeInput({ question, onSubmit, submitted }) {
  const [answers, setAnswers] = useState(question.nums.map(() => ""));
  const opts = ["Prime", "Composite", "Neither"];
  const valMap = {"Prime":"prime","Composite":"composite","Neither":"neither"};
  const allDone = answers.every(a => a !== "");
  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
        {question.nums.map((n, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "8px 14px", flexWrap: "wrap" }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: 26, fontWeight: 900, minWidth: 30 }}>{n}</span>
            <div style={{ display: "flex", gap: 6 }}>
              {opts.map(opt => (
                <button key={opt} onClick={() => !submitted && setAnswers(prev => prev.map((a, j) => j === i ? opt : a))}
                  style={{ padding: "5px 12px", borderRadius: "var(--radius-sm)", border: "2px solid " + (answers[i] === opt ? "var(--blue)" : "var(--border)"), background: answers[i] === opt ? "rgba(27,143,255,0.15)" : "var(--surface)", fontSize: 19, fontWeight: 700, cursor: "pointer", color: answers[i] === opt ? "var(--blue)" : "var(--text)" }}>
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }}
        onClick={() => onSubmit(JSON.stringify(answers.map(a => valMap[a] || "")))} disabled={submitted || !allDone}>Submit All</button>
    </div>
  );
}

function PFMCInput({ question, onSubmit, submitted }) {
  useKaTeX();
  const [selected, setSelected] = useState("");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {question.options.map((opt, i) => {
        const katexExpr = opt.replace(/\^(\d+)/g,"^{$1}").replace(/ x /g," \\times ");
        const isSelected = selected === opt;
        return (
          <button key={i} onClick={() => { if (!submitted) { setSelected(opt); onSubmit(opt); } }}
            style={{ padding: "10px 16px", borderRadius: "var(--radius-sm)", border: "2px solid " + (isSelected ? "var(--blue)" : "var(--border)"), background: isSelected ? "rgba(27,143,255,0.12)" : "var(--surface)", fontSize: 20, fontWeight: 700, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontFamily: "var(--mono)", color: "var(--text3)" }}>{String.fromCharCode(65 + i)})</span>
            <KaTeXSpan expr={katexExpr} />
          </button>
        );
      })}
    </div>
  );
}

function AnswerInput({ question, onSubmit, submitted }) {
  if (!question) return null;
  const t = question.type;
  if (t === "warmup-a") return <IneqInput onSubmit={onSubmit} submitted={submitted} placeholder="e.g. x >= -3" />;
  if (t === "warmup-b") return (
    <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
      {["All Real Numbers", "No Solution"].map(opt => (
        <button key={opt} onClick={() => !submitted && onSubmit(opt.toLowerCase().replace(/\s/g, ""))}
          style={{ padding: "12px 22px", borderRadius: "var(--radius-sm)", border: "2px solid var(--border)", background: "var(--surface)", fontSize: 20, fontWeight: 700, cursor: "pointer" }}>
          {opt}
        </button>
      ))}
    </div>
  );
  if (t === "warmup-c") return (
    <div>
      <div style={{ fontSize: 20, color: "var(--text3)", marginBottom: 8, textAlign: "center" }}>Enter 0, or type "undefined" if undefined</div>
      <TextInput onSubmit={onSubmit} submitted={submitted} placeholder="0 or undefined" />
    </div>
  );
  if (t === "div-2510") return <Div2510Input question={question} onSubmit={onSubmit} submitted={submitted} />;
  if (t === "div-39") return <Div39Input question={question} onSubmit={onSubmit} submitted={submitted} />;
  if (t === "missing-digit") return <MissingDigitInput question={question} onSubmit={onSubmit} submitted={submitted} />;
  if (t === "div-46") return <Div46Input question={question} onSubmit={onSubmit} submitted={submitted} />;
  if (t === "mixed-rules") return <MixedRulesInput question={question} onSubmit={onSubmit} submitted={submitted} />;
  if (t === "prime-composite") return <PrimeCompositeInput question={question} onSubmit={onSubmit} submitted={submitted} />;

  if (t === "pf-mc") return (
    <PFMCInput question={question} onSubmit={onSubmit} submitted={submitted} />
  );
  if (t === "pf-free") return (
    <div>
      <div style={{ fontSize: 20, color: "var(--text3)", marginBottom: 6, textAlign: "center" }}>e.g. 2^2 * 3^2 or 2^2 x 3</div>
      <TextInput onSubmit={onSubmit} submitted={submitted} placeholder="e.g. 2^2 * 3" />
    </div>
  );
  return null;
}

// -- Grade wrapper --
function gradeAnswer(input, question) {
  if (!input || !question) return false;
  const t = question.type;
  if (t === "warmup-a") return gradeWarmupA(input, question);
  if (t === "warmup-b") return gradeWarmupB(input, question);
  if (t === "warmup-c") return gradeWarmupC(input, question);
  if (t === "missing-digit") return gradeMissingDigit(input, question);
  if (t === "pf-mc") return gradePFMultipleChoice(input, question);
  if (t === "pf-free") return gradePFFreeResponse(input, question);
  // Multi-item: all items must be correct
  if (t === "div-2510") {
    try { const a = JSON.parse(input); return a.every((sel, i) => gradeDivisibility2510Item(JSON.stringify(sel), question.answers[i])); } catch { return false; }
  }
  if (t === "div-39") {
    try { const a = JSON.parse(input); return a.every((sel, i) => gradeDivisibility39Item(sel, question.answers[i])); } catch { return false; }
  }
  if (t === "div-46") {
    try { const a = JSON.parse(input); return a.every((sel, i) => gradeDivisibility46Item(sel, question.answers[i])); } catch { return false; }
  }
  if (t === "mixed-rules") {
    try { const a = JSON.parse(input); return a.every((sel, i) => gradeMixedRulesItem(JSON.stringify(sel), question.answers[i])); } catch { return false; }
  }
  if (t === "prime-composite") {
    try { const a = JSON.parse(input); return a.every((sel, i) => gradePrimeCompositeItem(sel, question.answers[i])); } catch { return false; }
  }
  return false;
}

// -- Teacher View --
function TeacherLesson12({ session, sessionId, uid }) {
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

  const handleGenerate = async (idx) => {
    const tIdx = idx !== undefined ? idx : topicIdx;
    const q = generateLesson12Question(LESSON12_TOPICS[tIdx].id);
    const qId = "q_" + Date.now().toString(36);
    q.id = qId; q.points = POINTS; q._topicId = LESSON12_TOPICS[tIdx].id;
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

  const submittedCount = answers.length;
  const correctCount = answers.filter(a => gradeAnswer(a.answer, question)).length;
  const isMultiItem = ["div-2510","div-39","div-46","mixed-rules","prime-composite"].includes(question?.type);

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
                {topicIdx < LESSON12_TOPICS.length - 1 && (
                  <button className="btn btn-primary" onClick={() => { const n = topicIdx + 1; setTopicIdx(n); handleGenerate(n); }}>
                    Next: {LESSON12_TOPICS[topicIdx + 1]?.label}
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
          {LESSON12_TOPICS.map((t, i) => {
            const isActive = i === topicIdx, isDone = i < topicIdx;
            return (
              <button key={t.id} onClick={() => setTopicIdx(i)}
                style={{ background: isActive ? "rgba(27,143,255,0.15)" : "var(--surface)", border: "2px solid " + (isActive ? "var(--blue)" : isDone ? "rgba(22,163,74,0.3)" : "var(--border)"), borderRadius: "var(--radius)", padding: "5px 8px", cursor: "pointer", textAlign: "left", fontFamily: "var(--font)" }}>
                <div style={{ fontWeight: 700, fontSize: 17, color: isActive ? "var(--blue)" : isDone ? "var(--green)" : "var(--text)" }}>{t.label}</div>
                <div style={{ fontSize: 15, color: "var(--text3)" }}>{t.description}</div>
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
                  {LESSON12_TOPICS[topicIdx]?.label} - {submittedCount}/{totalStudents} submitted{!isMultiItem && ` - ${correctCount} correct`}
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
                        {has ? (
                          <span style={{ fontWeight: 700, color: correct ? "var(--green)" : "var(--red)", fontSize: 20 }}>{correct ? "+" + POINTS : "X"}</span>
                        ) : <span style={{ fontSize: 20, color: "var(--text3)" }}>thinking...</span>}
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

// -- Student View --
function StudentLesson12({ session, sessionId, uid }) {
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
      <p style={{ color: "var(--text2)", fontSize: 20 }}>Lesson 12 - Divisibility and Prime Factorization</p>
    </div>
  );
  if (session.status === "ended") return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Session ended</h2>
      <p style={{ color: "var(--text2)", fontSize: 20 }}>Final score: <strong>{myScore} pts</strong></p>
    </div>
  );

  const isMultiItem = ["div-2510","div-39","div-46","mixed-rules","prime-composite"].includes(question?.type);

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
            {question.prompt && <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>{question.prompt}</div>}
            {!(session.status === "revealing" && isMultiItem) && (
              <QuestionDisplay question={question} revealCorrect={session.status === "revealing"} />
            )}
          </>
        )}
        {session.status === "revealing" ? (
          <div style={{ marginTop: 12 }}>
            {result ? (
              <div>
                <div style={{ textAlign: "center", fontSize: 22, fontWeight: 800, color: result.correct ? "var(--green)" : "var(--red)", marginBottom: 10 }}>
                  {result.correct ? "Correct! +" + POINTS + " pts" : "Incorrect"}
                </div>
                {isMultiItem ? (
                  // Show per-item comparison for multi-item questions
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {question.nums.map((n, i) => {
                      let studentVal = "";
                      let correctVal = question.answers[i].displayAnswer;
                      let itemCorrect = false;
                      try {
                        const parsed = JSON.parse(result.answer);
                        const item = parsed[i];
                        if (question.type === "div-2510" || question.type === "mixed-rules") {
                          itemCorrect = question.type === "div-2510"
                            ? gradeDivisibility2510Item(JSON.stringify(item), question.answers[i])
                            : gradeMixedRulesItem(JSON.stringify(item), question.answers[i]);
                          studentVal = Array.isArray(item) ? item.join(", ") : String(item);
                        } else {
                          const graders = {"div-39":gradeDivisibility39Item,"div-46":gradeDivisibility46Item,"prime-composite":gradePrimeCompositeItem};
                          itemCorrect = graders[question.type]?.(item, question.answers[i]) || false;
                          studentVal = String(item);
                        }
                      } catch {}
                      return (
                        <div key={i} style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "6px 12px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", border: "1px solid " + (itemCorrect ? "rgba(22,163,74,0.2)" : "rgba(239,68,68,0.2)") }}>
                          <span style={{ fontFamily: "var(--mono)", fontSize: 20, fontWeight: 800, minWidth: 60 }}>{n}</span>
                          <span style={{ fontSize: 18, color: "var(--text3)" }}>You:</span>
                          <span style={{ fontSize: 18, fontWeight: 700, color: itemCorrect ? "var(--green)" : "var(--red)" }}>{studentVal || "-"}</span>
                          {!itemCorrect && <><span style={{ fontSize: 18, color: "var(--text3)" }}>Correct:</span><span style={{ fontSize: 18, fontWeight: 700, color: "var(--green)" }}>{correctVal}</span></>}
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
                      <div style={{ marginTop: 8, fontSize: 20, color: "var(--green)", fontWeight: 700 }}>Correct: {["pf-mc","pf-free"].includes(question?.type) ? <KaTeXSpan expr={question.displayAnswer.replace(/\^(\d+)/g,"^{$1}").replace(/ x /g," \\times ")} /> : question.displayAnswer}</div>
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
function CreateLesson12Session({ user, onCreated }) {
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
        joinCode, type: "lesson12", status: "waiting",
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
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Lesson 12 - Divisibility & Prime Factorization</h2>
        <p style={{ color: "var(--text2)", fontSize: 20, marginBottom: 16 }}>Divisibility rules for 2-10, prime/composite numbers, and prime factorization.</p>
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

export default function Lesson12Session({ user, onHome }) {
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
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,var(--blue),var(--orange))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, color: "#fff" }}>L12</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 22 }}>GCA - Lesson 12</div>
              <div style={{ color: "var(--text3)", fontSize: 20 }}>Divisibility Rules & Prime Factorization</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onHome}>Back to Home</button>
        </div>
        {view === "create" && <CreateLesson12Session user={user} onCreated={(sid) => { setSessionId(sid); setView("session"); }} />}
        {view === "session" && session && (
          user.role === "teacher"
            ? <TeacherLesson12 session={session} sessionId={sessionId} uid={user.id} />
            : <StudentLesson12 session={session} sessionId={sessionId} uid={user.id} />
        )}
        {view === "session" && !session && <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><div className="spinner" /></div>}
      </div>
    </div>
  );
}

export { TeacherLesson12 as Lesson12TeacherView, StudentLesson12 as Lesson12StudentView };

