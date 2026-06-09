import { useState, useEffect, useRef } from "react";
import { setDoc, doc, updateDoc } from "firebase/firestore";
import { onSessionChange, onClassworkAnswersChange, getTeacherClasses, addToScore, db } from "./core/firebase";
import {
  LESSON19_TOPICS, generateLesson19Question, gradeLesson19Answer,
  gradeDivDecDirectItem, gradeFracToDecItem, gradeRepeatingItem,
  gradeClassifyItem, gradeDecDivWholeDirectItem, gradeConvDivItem,
  gradeDivDecDirect2Item, gradeClearDecEqItem, gradeSolveDecDirectItem,
} from "./lesson19Questions";

const POINTS = 5;

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
function KaTeX({ expr, block }) {
  const ref = useRef(null); useKaTeX();
  useEffect(() => {
    const go = () => { if (window.katex && ref.current) { try { window.katex.render(expr, ref.current, { throwOnError: false, displayMode: !!block }); } catch {} } else setTimeout(go, 100); };
    go();
  });
  return block ? <div ref={ref} style={{ fontSize: 26, margin: "6px 0", minHeight: 36 }} /> : <span ref={ref} style={{ fontSize: 22 }} />;
}

// -- Timer --
function TimerBar({ endsAt, totalSeconds, onExpired }) {
  const [rem, setRem] = useState(totalSeconds); const ref = useRef(false);
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

// -- Text Input --
function TextInput({ onSubmit, submitted, placeholder, wide }) {
  const [val, setVal] = useState(""); const ref = useRef(null);
  useEffect(() => { setVal(""); setTimeout(() => ref.current?.focus(), 80); }, [submitted]);
  const submit = () => { if (val.trim()) onSubmit(val.trim()); };
  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
      <input ref={ref} value={val} onChange={e => setVal(e.target.value)}
        onKeyDown={e => e.key === "Enter" && submit()} disabled={submitted} placeholder={placeholder || ""}
        style={{ textAlign: "center", fontSize: 22, fontFamily: "var(--mono)", fontWeight: 700, padding: "10px", width: wide ? 260 : 180 }} />
      <button className="btn btn-primary" style={{ fontSize: 20, padding: "10px 20px" }}
        onMouseDown={e => { e.preventDefault(); submit(); }} disabled={submitted || !val.trim()}>OK</button>
    </div>
  );
}

// Convert "[period]" bracket notation to KaTeX overline expression
function bracketToKatex(str) {
  if (!str) return str;
  const bs = "\\";
  const m = String(str).match(/^(.*)\[(.+)\](.*)$/);
  if (!m) return str;
  return `${m[1]}${bs}overline{${m[2]}}${m[3]}`;
}

// -- Repeating Decimal Input --
// Stores answer as "0.3[3]" where [3] means 3 has overline (repeating period)
// Displays with CSS overline on the bracketed portion
function RepeatingDecimalInput({ onSubmit, submitted }) {
  const [text, setText] = useState("");
  const [period, setPeriod] = useState(""); // the repeating part
  const [mode, setMode] = useState("typing"); // "typing" | "selecting"
  const [selStart, setSelStart] = useState(null);
  const [selEnd, setSelEnd] = useState(null);
  const [finalStr, setFinalStr] = useState(""); // formatted for display: "0.1[6]"
  const inputRef = useRef(null);

  useEffect(() => { setText(""); setPeriod(""); setMode("typing"); setFinalStr(""); setTimeout(() => inputRef.current?.focus(), 80); }, [submitted]);

  const handleTextChange = (e) => {
    setText(e.target.value);
    setPeriod(""); setFinalStr("");
  };

  const handleSelect = () => {
    const el = inputRef.current; if (!el) return;
    const s = el.selectionStart, e2 = el.selectionEnd;
    if (s !== null && e2 !== null && s < e2) {
      setSelStart(s); setSelEnd(e2);
      const sel = text.slice(s, e2);
      setPeriod(sel);
      setFinalStr(text.slice(0, s) + "[" + sel + "]" + text.slice(e2));
    }
  };

  const clearPeriod = () => { setPeriod(""); setFinalStr(""); setMode("typing"); };

  const handleSubmit = () => {
    if (!text.trim()) return;
    // Submit as "value[period]" format if period selected, else plain text
    const submitVal = finalStr || text.trim();
    onSubmit(submitVal);
  };

  // Render with KaTeX overline notation
  function renderPreview(str) {
    if (!str) return null;
    const m = str.match(/^(.*)\[(.+)\](.*)$/);
    if (!m) return <span style={{ fontFamily: "var(--mono)", fontSize: 22, fontWeight: 700 }}>{str}</span>;
    const bs = "\\";
    const expr = `${m[1]}${bs}overline{${m[2]}}${m[3]}`;
    return <KaTeX expr={expr} />;
  }

  return (
    <div>
      <div style={{ background: "rgba(27,143,255,0.06)", border: "1px solid rgba(27,143,255,0.2)", borderRadius: "var(--radius-sm)", padding: "10px 14px", marginBottom: 12, fontSize: 18, color: "var(--text2)", lineHeight: 1.6 }}>
        <strong>How to enter a repeating decimal:</strong>
        <ol style={{ margin: "6px 0 0 18px", padding: 0 }}>
          <li>Type the decimal (e.g. <span style={{ fontFamily: "var(--mono)" }}>0.1666</span>)</li>
          <li>Highlight the repeating digits with your mouse or keyboard</li>
          <li>Press the <span style={{ fontFamily: "var(--mono)", fontWeight: 900, background: "var(--surface)", padding: "1px 6px", borderRadius: 4, border: "1px solid var(--border)", borderTop: "3px solid var(--text)" }}>abc</span> button to mark them</li>
          <li>Press OK to submit</li>
        </ol>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
        <input ref={inputRef} value={text} onChange={handleTextChange}
          disabled={submitted} placeholder="e.g. 0.1666"
          style={{ textAlign: "left", fontSize: 22, fontFamily: "var(--mono)", fontWeight: 700, padding: "10px", flex: 1 }} />
        <button title="Mark selected digits as repeating"
          onClick={handleSelect}
          disabled={submitted}
          style={{ padding: "8px 14px", fontSize: 20, fontFamily: "var(--mono)", fontWeight: 900, border: "2px solid var(--border)", borderRadius: "var(--radius-sm)", background: "var(--surface)", cursor: "pointer", minWidth: 52, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontFamily: "var(--mono)", fontWeight: 900, fontSize: 18, display: "inline-block", borderTop: "2px solid currentColor", paddingTop: 1 }}>abc</span>
        </button>
      </div>
      {finalStr ? (
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
          <div style={{ flex: 1, background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "8px 14px" }}>
            Preview: {renderPreview(finalStr)}
          </div>
          <button onClick={clearPeriod} style={{ fontSize: 18, padding: "6px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--surface)", cursor: "pointer", color: "var(--text3)" }}>Clear</button>
        </div>
      ) : text && (
        <div style={{ fontSize: 17, color: "var(--text3)", marginBottom: 8 }}>No repeating period selected - submits as-is, or select digits and press the button to mark them.</div>
      )}
      <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
        <button className="btn btn-primary" style={{ flex: 1, fontSize: 20 }}
          onMouseDown={e => { e.preventDefault(); handleSubmit(); }} disabled={submitted || !text.trim()}>OK</button>
      </div>
    </div>
  );
}

// Multi-row repeating decimal input
function MultiRepeatingInput({ items, labelFn, onSubmit, submitted }) {
  const [answers, setAnswers] = useState((items || []).map(() => ""));
  const [texts, setTexts] = useState((items || []).map(() => ""));
  const allDone = answers.every(a => a.trim() !== "");

  const handleSelect = (i) => {
    const el = document.getElementById(`rep-input-${i}`);
    if (!el) return;
    const s = el.selectionStart, e2 = el.selectionEnd;
    if (s !== null && e2 !== null && s < e2) {
      const t = texts[i];
      const formatted = t.slice(0, s) + "[" + t.slice(s, e2) + "]" + t.slice(e2);
      setAnswers(prev => prev.map((x, j) => j === i ? formatted : x));
    }
  };

  const clearRow = (i) => { setAnswers(prev => prev.map((x, j) => j === i ? "" : x)); };

  function renderPreview(str) {
    if (!str) return null;
    const m = str.match(/^(.*)\[(.+)\](.*)$/);
    if (!m) return <span style={{ fontFamily: "var(--mono)", fontSize: 19 }}>{str}</span>;
    const bs = "\\";
    const expr = `${m[1]}${bs}overline{${m[2]}}${m[3]}`;
    return <KaTeX expr={expr} />;
  }

  if (!items?.length) return null;
  return (
    <div>
      <div style={{ background: "rgba(27,143,255,0.06)", border: "1px solid rgba(27,143,255,0.2)", borderRadius: "var(--radius-sm)", padding: "8px 12px", marginBottom: 10, fontSize: 17, color: "var(--text2)" }}>
        Type the decimal, highlight repeating digits, press <span style={{ fontFamily: "var(--mono)", fontWeight: 900, borderTop: "2px solid currentColor", paddingTop: 1 }}>abc</span> to mark them.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
        {items.map((item, i) => (
          <div key={i} style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "10px 14px" }}>
            <div style={{ marginBottom: 6 }}>{labelFn(item)}</div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input id={`rep-input-${i}`} value={texts[i]}
                onChange={e => { setTexts(prev => prev.map((x, j) => j === i ? e.target.value : x)); setAnswers(prev => prev.map((x, j) => j === i ? e.target.value : x)); }}
                disabled={submitted} placeholder="e.g. 0.333"
                style={{ fontSize: 19, fontFamily: "var(--mono)", fontWeight: 700, padding: "6px 8px", flex: 1, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--surface)" }} />
              <button title="Mark selection as repeating" onClick={() => handleSelect(i)} disabled={submitted}
                style={{ padding: "5px 10px", fontSize: 18, fontFamily: "var(--mono)", fontWeight: 900, border: "2px solid var(--border)", borderRadius: "var(--radius-sm)", background: "var(--surface)", cursor: "pointer" }}>
                <span style={{ fontFamily: "var(--mono)", fontWeight: 900, fontSize: 16, display: "inline-block", borderTop: "2px solid currentColor", paddingTop: 1 }}>abc</span>
              </button>
            </div>
            {answers[i] && answers[i] !== texts[i] && (
              <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 4 }}>
                <span style={{ fontSize: 17, color: "var(--text3)" }}>Preview: {renderPreview(answers[i])}</span>
                <button onClick={() => clearRow(i)} style={{ fontSize: 15, padding: "2px 8px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "var(--surface)", cursor: "pointer", color: "var(--text3)" }}>Clear</button>
              </div>
            )}
          </div>
        ))}
      </div>
      <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }}
        onClick={() => onSubmit(JSON.stringify(answers))} disabled={submitted || !allDone}>Submit All</button>
    </div>
  );
}

// -- Multi-row text input --
function MultiRowInput({ items, labelFn, onSubmit, submitted, placeholder }) {
  const [answers, setAnswers] = useState((items || []).map(() => ""));
  const allDone = answers.every(a => a.trim() !== "");
  if (!items?.length) return null;
  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "10px 14px", flexWrap: "wrap" }}>
            <span style={{ flex: 1 }}>{labelFn(item)}</span>
            <input value={answers[i]} onChange={e => setAnswers(prev => prev.map((x, j) => j === i ? e.target.value : x))}
              disabled={submitted} placeholder={placeholder || ""}
              style={{ textAlign: "center", fontSize: 20, fontFamily: "var(--mono)", fontWeight: 700, padding: "6px 10px", width: 150, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--surface)" }} />
          </div>
        ))}
      </div>
      <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }}
        onClick={() => onSubmit(JSON.stringify(answers))} disabled={submitted || !allDone}>Submit All</button>
    </div>
  );
}

// -- MC Row Input (Terminating/Repeating and Classify) --
function MCRowInput({ items, labelFn, onSubmit, submitted }) {
  const [answers, setAnswers] = useState((items || []).map(() => ""));
  const allDone = answers.every(a => a !== "");
  if (!items?.length) return null;
  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
        {items.map((item, i) => (
          <div key={i} style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "10px 14px" }}>
            <div style={{ marginBottom: 8 }}>{labelFn(item)}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(item.options || []).map((opt, j) => (
                <button key={j} onClick={() => setAnswers(prev => prev.map((x, k) => k === i ? opt : x))}
                  style={{ padding: "6px 18px", borderRadius: "var(--radius-sm)", fontSize: 19, fontWeight: 700, cursor: "pointer", border: "2px solid " + (answers[i] === opt ? "var(--blue)" : "var(--border)"), background: answers[i] === opt ? "rgba(27,143,255,0.15)" : "var(--surface)", color: answers[i] === opt ? "var(--blue)" : "var(--text)" }}>
                  {opt}
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

// -- Step Input --
function StepInput({ question, onSubmit, submitted, stages }) {
  const [stage, setStage] = useState(0);
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [stageAnswers, setStageAnswers] = useState({});
  const ref = useRef(null);

  const handleStageSubmit = () => {
    if (!input.trim()) return;
    const ok = stages[stage].grader(input.trim(), question);
    setFeedback({ correct: ok, input: input.trim(), correctAnswer: stages[stage].correctAnswer(question) });
    if (ok) setStageAnswers(prev => ({ ...prev, [stage]: input.trim() }));
  };

  const handleNext = () => {
    if (feedback?.correct && stage < stages.length - 1) { setStage(s => s + 1); setFeedback(null); setInput(""); setTimeout(() => ref.current?.focus(), 80); }
    else if (feedback?.correct && stage === stages.length - 1) { onSubmit(input.trim()); }
    else { setFeedback(null); setInput(""); setTimeout(() => ref.current?.focus(), 80); }
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
        {stages.map((s, i) => (
          <div key={i} style={{ fontSize: 16, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
            background: i < stage ? "rgba(22,163,74,0.12)" : i === stage ? "rgba(27,143,255,0.12)" : "var(--surface)",
            color: i < stage ? "var(--green)" : i === stage ? "var(--blue)" : "var(--text3)",
            border: "1px solid " + (i < stage ? "rgba(22,163,74,0.3)" : i === stage ? "rgba(27,143,255,0.3)" : "var(--border)") }}>
            {i < stage ? "\u2713" : `Step ${i + 1}`}
          </div>
        ))}
      </div>
      {Object.entries(stageAnswers).map(([s, v]) => (
        <div key={s} style={{ fontSize: 18, color: "var(--text3)", marginBottom: 2 }}>
          Step {parseInt(s) + 1}: <span style={{ fontFamily: "var(--mono)", fontWeight: 700, color: "var(--green)" }}>{v}</span>
        </div>
      ))}
      <div style={{ fontSize: 20, fontWeight: 700, color: "var(--blue)", marginBottom: 10 }}>{stages[stage]?.label}</div>
      {feedback ? (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: feedback.correct ? "var(--green)" : "var(--red)", marginBottom: 8 }}>{feedback.correct ? "Correct!" : "Incorrect"}</div>
          {!feedback.correct && <div style={{ fontSize: 19, color: "var(--text2)", marginBottom: 10 }}>Correct: <span style={{ fontFamily: "var(--mono)" }}>{feedback.correctAnswer}</span></div>}
          <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }} onClick={handleNext}>
            {feedback.correct && stage < stages.length - 1 ? `Next: Step ${stage + 2}` : feedback.correct ? "Submit" : "Try Again"}
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <input ref={ref} value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && input.trim() && handleStageSubmit()}
            placeholder={stages[stage]?.placeholder || ""} autoFocus
            style={{ textAlign: "center", fontSize: 22, fontFamily: "var(--mono)", fontWeight: 700, padding: "10px", width: 240 }} />
          <button className="btn btn-primary" style={{ fontSize: 20, padding: "10px 20px" }}
            onClick={handleStageSubmit} disabled={!input.trim()}>OK</button>
        </div>
      )}
    </div>
  );
}

// -- Place Value Warmup display --
function PlaceValueDisplay({ item }) {
  const s = item.number; const idx = item.underlineIdx;
  return (
    <span style={{ fontFamily: "var(--mono)", fontSize: 24, fontWeight: 700 }}>
      {s.slice(0, idx)}<span style={{ textDecoration: "underline", textDecorationThickness: 2 }}>{s[idx]}</span>{s.slice(idx + 1)}
    </span>
  );
}

const STEP_TYPES = [];
const MULTI_TYPES = ["div-dec-direct", "frac-to-dec", "repeating-dec", "dec-div-whole-direct", "div-dec-direct2", "solve-dec-direct"];
const MC_TYPES = ["conv-div", "clear-dec-eq"];

function gradeAnswer(input, question) {
  if (!input || !question) return false;
  try { return gradeLesson19Answer(input, question); } catch { return false; }
}

// -- Question display --
function QuestionDisplay({ question: q, revealCorrect }) {
  useKaTeX();
  if (!q) return null;

  const simple = (expr, answer) => (
    <div style={{ textAlign: "center" }}>
      <KaTeX expr={expr} block />
      {revealCorrect && <div style={{ color: "var(--green)", fontWeight: 800, fontSize: 22, marginTop: 6, fontFamily: "var(--mono)" }}>{answer}</div>}
    </div>
  );

  if (q.type === "warmup-a") return simple(`2.5 \\times 0.4`, q.displayAnswer);
  if (q.type === "warmup-b") return simple(`0.125`, q.displayAnswer);
  if (q.type === "warmup-c") return simple(`12.35 + 6.7`, q.displayAnswer);
  if (q.type === "warmup-d") return (
    <div style={{ textAlign: "center" }}>
      <div style={{ marginBottom: 8 }}><PlaceValueDisplay item={q} /></div>
      {revealCorrect && <div style={{ color: "var(--green)", fontWeight: 800, fontSize: 22 }}>{q.answer}</div>}
    </div>
  );

  if (STEP_TYPES.includes(q.type)) return (
    <div style={{ textAlign: "center" }}>
      <KaTeX expr={q.prompt.replace("Divide: ", "").replace("Solve: ", "")} block />
      {revealCorrect && <div style={{ color: "var(--green)", fontWeight: 800, fontSize: 22, marginTop: 6, fontFamily: "var(--mono)" }}>{q.displayAnswer}</div>}
    </div>
  );

  if (!revealCorrect) return null;

  // Reveal view for multi/MC types
  const items = q.problems || q.items || [];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      {items.map((item, i) => (
        <div key={i} style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "8px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <span><KaTeX expr={item.latex || item.expr || item.eq || item.display || String(i + 1)} /></span>
          {(item.displayAnswer || item.answer || "").includes("[") ? (
            <span style={{ color: "var(--green)", fontWeight: 700, fontSize: 19 }}><KaTeX expr={bracketToKatex(item.displayAnswer || item.answer)} /></span>
          ) : (
            <span style={{ fontFamily: "var(--mono)", color: "var(--green)", fontWeight: 700, fontSize: 19 }}>{item.displayAnswer || item.answer}</span>
          )}
        </div>
      ))}
    </div>
  );
}

// -- Answer Input --
function AnswerInput({ question, onSubmit, submitted }) {
  if (!question) return null;
  const t = question.type;

  if (t === "warmup-a" || t === "warmup-c") return <TextInput onSubmit={onSubmit} submitted={submitted} placeholder="" />;
  if (t === "warmup-b") return <TextInput onSubmit={onSubmit} submitted={submitted} placeholder="e.g. 1/8" />;
  if (t === "warmup-d") return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
      {question.options.map((opt, j) => {
        const [sel, setSel] = useState(false);
        return <button key={j} onClick={() => { setSel(true); onSubmit(opt); }} disabled={submitted}
          style={{ padding: "8px 18px", borderRadius: "var(--radius-sm)", fontSize: 19, fontWeight: 700, border: "2px solid var(--border)", background: "var(--surface)", cursor: "pointer" }}>{opt}</button>;
      })}
    </div>
  );

  if (t === "div-dec-direct") return <MultiRowInput items={question.problems} labelFn={p => <KaTeX expr={p.display} />} onSubmit={onSubmit} submitted={submitted} placeholder="decimal" />;
  if (t === "frac-to-dec") return <MultiRowInput items={question.problems} labelFn={p => <KaTeX expr={p.latex} />} onSubmit={onSubmit} submitted={submitted} placeholder="decimal" />;
  if (t === "repeating-dec") return <MultiRepeatingInput items={question.problems} labelFn={p => <KaTeX expr={p.latex} />} onSubmit={onSubmit} submitted={submitted} />;
  if (t === "dec-div-whole-direct") return <MultiRepeatingInput items={question.problems} labelFn={p => <KaTeX expr={p.display} />} onSubmit={onSubmit} submitted={submitted} />;
  if (t === "div-dec-direct2") return <MultiRowInput items={question.problems} labelFn={p => <KaTeX expr={p.expr} />} onSubmit={onSubmit} submitted={submitted} placeholder="answer" />;
  if (t === "solve-dec-direct") return <MultiRowInput items={question.problems} labelFn={p => <span style={{ fontFamily: "var(--mono)", fontSize: 19 }}>{p.eq}</span>} onSubmit={onSubmit} submitted={submitted} placeholder="x = ?" />;
  if (t === "conv-div") return <MultiRowInput items={question.problems} labelFn={p => <KaTeX expr={p.expr} />} onSubmit={onSubmit} submitted={submitted} placeholder="e.g. 63/3" />;
  if (t === "clear-dec-eq") return <MultiRowInput items={question.problems} labelFn={p => <span style={{ fontFamily: "var(--mono)", fontSize: 19 }}>{p.eq}</span>} onSubmit={onSubmit} submitted={submitted} placeholder="10, 100..." />;
  return null;
}

// -- Student Reveal --
function StudentReveal({ result, question }) {
  if (!result) return <div style={{ textAlign: "center", color: "var(--text3)", fontSize: 20 }}>No answer submitted.</div>;
  const isMulti = [...MULTI_TYPES, ...MC_TYPES].includes(question?.type);
  const graderMap = {
    "div-dec-direct": gradeDivDecDirectItem, "frac-to-dec": gradeFracToDecItem,
    "repeating-dec": gradeRepeatingItem, "dec-div-whole-direct": gradeDecDivWholeDirectItem, "div-dec-direct2": gradeDivDecDirect2Item,
    "solve-dec-direct": gradeSolveDecDirectItem, "conv-div": gradeConvDivItem,
    "clear-dec-eq": gradeClearDecEqItem,
  };
  return (
    <div>
      <div style={{ textAlign: "center", fontSize: 22, fontWeight: 800, color: result.correct ? "var(--green)" : "var(--red)", marginBottom: 8 }}>
        {result.correct ? "Correct! +" + POINTS + " pts" : "Incorrect"}
      </div>
      {isMulti ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {(question.problems || question.items || []).map((item, i) => {
            let studentAns = "", correctAns = item.displayAnswer || item.answer, itemOk = false;
            try {
              const parsed = JSON.parse(result.answer);
              studentAns = String(parsed[i] || "");
              const grader = graderMap[question.type];
              if (grader) itemOk = grader(studentAns, item);
            } catch {}
            return (
              <div key={i} style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "6px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6, border: "1px solid " + (itemOk ? "rgba(22,163,74,0.2)" : "rgba(239,68,68,0.2)") }}>
                <span><KaTeX expr={item.latex || item.expr || item.eq || item.display || String(i + 1)} /></span>
                <div style={{ display: "flex", gap: 8 }}>
                  {!itemOk && <span style={{ fontSize: 17, color: "var(--red)", fontWeight: 700, fontFamily: "var(--mono)" }}>You: {studentAns || "-"}</span>}
                  {correctAns && correctAns.includes("[") ? (
                    <span style={{ fontSize: 17, color: "var(--green)", fontWeight: 700 }}><KaTeX expr={bracketToKatex(correctAns)} /></span>
                  ) : (
                    <span style={{ fontSize: 17, color: "var(--green)", fontWeight: 700, fontFamily: "var(--mono)" }}>{correctAns}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 19, color: "var(--text2)", marginBottom: 4 }}>
            Your answer: <strong style={{ fontFamily: "var(--mono)", color: result.correct ? "var(--green)" : "var(--red)" }}>{String(result.answer).slice(0, 40)}</strong>
          </div>
          {!result.correct && question?.displayAnswer && (
            <div style={{ fontSize: 20, color: "var(--green)", fontWeight: 700, marginTop: 4 }}>Correct: {question.displayAnswer}</div>
          )}
        </div>
      )}
    </div>
  );
}

// -- Teacher --
function TeacherLesson19({ session, sessionId }) {
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
    let active = true;
    const unsub = onClassworkAnswersChange(sessionId, question.id, data => { if (active) setAnswers(data); });
    return () => { active = false; unsub(); };
  }, [question?.id]);

  const handleGenerate = async (tIdx) => {
    const idx = tIdx !== undefined ? tIdx : topicIdx;
    try {
      const q = generateLesson19Question(LESSON19_TOPICS[idx].id);
      q.id = "q_" + Date.now().toString(36); q.points = POINTS;
      const safeQ = JSON.parse(JSON.stringify(q));
      setAnswers([]); revealedRef.current = false;
      await updateDoc(doc(db, "sessions", sessionId), {
        status: "question", currentQuestion: safeQ,
        timerSeconds: timerInput, timerEndsAt: Date.now() + timerInput * 1000,
        questionCount: (session.questionCount || 0) + 1,
      });
    } catch(e) { console.error(e); alert("Error: " + e.message); }
  };

  const handleReveal = async () => {
    if (revealedRef.current) return;
    revealedRef.current = true;
    for (const ans of answers) { if (gradeAnswer(ans.answer, question)) await addToScore(sessionId, ans.uid, POINTS); }
    await updateDoc(doc(db, "sessions", sessionId), { status: "revealing" });
  };

  const handleEnd = async () => { if (confirm("End the session?")) await updateDoc(doc(db, "sessions", sessionId), { status: "ended" }); };

  const submittedCount = answers.length;
  const correctCount = question ? answers.filter(a => { try { return gradeAnswer(a.answer, question); } catch { return false; } }).length : 0;

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
              <input type="number" min={15} max={600} value={timerInput} onChange={e => setTimerInput(Number(e.target.value))}
                style={{ width: 70, padding: "6px 10px", fontSize: 20, textAlign: "center" }} />
            </div>
            <button className="btn btn-ghost" onClick={handleReveal}>Reveal</button>
            {session.status === "revealing" && (
              <>
                <button className="btn btn-ghost" onClick={() => handleGenerate()}>Repeat</button>
                {topicIdx < LESSON19_TOPICS.length - 1 && (
                  <button className="btn btn-primary" disabled={session.status === "question"}
                    onClick={() => { const n = topicIdx + 1; setTopicIdx(n); handleGenerate(n); }}>
                    Next: {LESSON19_TOPICS[topicIdx + 1]?.label}
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
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Topic</div>
          {LESSON19_TOPICS.map((t, i) => {
            const isActive = i === topicIdx, isDone = i < topicIdx;
            return (
              <button key={t.id} onClick={() => setTopicIdx(i)}
                style={{ background: isActive ? "rgba(27,143,255,0.15)" : "var(--surface)", border: "2px solid " + (isActive ? "var(--blue)" : isDone ? "rgba(22,163,74,0.3)" : "var(--border)"), borderRadius: "var(--radius)", padding: "4px 8px", cursor: "pointer", textAlign: "left", fontFamily: "var(--font)" }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: isActive ? "var(--blue)" : isDone ? "var(--green)" : "var(--text)" }}>{t.label}</div>
                <div style={{ fontSize: 11, color: "var(--text3)" }}>{t.description}</div>
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
                  {LESSON19_TOPICS[topicIdx]?.label} - {submittedCount}/{totalStudents} submitted - {correctCount} correct
                </div>
                {question.prompt && <div style={{ fontSize: 20, color: "var(--text2)", marginBottom: 8 }}>{question.prompt}</div>}
                <QuestionDisplay question={question} revealCorrect={session.status === "revealing"} />
                {session.status === "question" && session.timerEndsAt && (
                  <div style={{ marginTop: 12 }}>
                    <TimerBar key={question?.id} endsAt={session.timerEndsAt} totalSeconds={session.timerSeconds}
                      onExpired={async () => { if (!revealedRef.current) await handleReveal(); }} />
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
                    const correct = has && (() => { try { return gradeAnswer(ans.answer, question); } catch { return false; } })();
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
function StudentLesson19({ session, sessionId, uid }) {
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
    setResult({ correct, answer: ans }); setSubmitted(true);
  };

  if (session.status === "waiting") return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Waiting for teacher...</h2>
      <p style={{ color: "var(--text2)", fontSize: 20 }}>Lesson 19 - Decimal Division and Equations</p>
    </div>
  );
  if (session.status === "ended") return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Session ended</h2>
      <p style={{ color: "var(--text2)", fontSize: 20 }}>Final score: <strong>{myScore} pts</strong></p>
    </div>
  );

  const isMulti = [...MULTI_TYPES, ...MC_TYPES].includes(question?.type);

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "5px 12px", fontSize: 20, fontWeight: 700 }}>Score: {myScore} pts</div>
      </div>
      <div className="card" key={question?.id || "waiting"}>
        {session.status === "question" && session.timerEndsAt && !submitted && !STEP_TYPES.includes(question?.type) && (
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
          <div style={{ marginTop: 12 }}><StudentReveal result={result} question={question} /></div>
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
function CreateLesson19Session({ user, onCreated }) {
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
        joinCode, type: "lesson19", status: "waiting",
        currentQuestion: null, questionCount: 0,
        timerSeconds: timer, timerEndsAt: null,
        participants: {}, createdAt: Date.now(),
      });
      onCreated(sessionId);
    } catch(e) { alert("Error: " + e.message); setLoading(false); }
  };
  return (
    <div style={{ maxWidth: 480, margin: "0 auto" }}>
      <div className="card">
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Lesson 19 - Decimal Division and Equations</h2>
        <p style={{ color: "var(--text2)", fontSize: 20, marginBottom: 16 }}>Dividing decimals, fraction-to-decimal, dividing by decimals, and solving decimal equations.</p>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 20, fontWeight: 600, display: "block", marginBottom: 5 }}>Class</label>
          <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} style={{ width: "100%", padding: "10px 12px", fontSize: 20 }}>
            <option value="">Select a class...</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 20, fontWeight: 600, display: "block", marginBottom: 5 }}>Default seconds per question</label>
          <input type="number" min={30} max={600} value={timer} onChange={e => setTimer(Number(e.target.value))} style={{ width: "100%", padding: "10px 12px", fontSize: 20 }} />
        </div>
        <button className="btn btn-primary btn-lg" style={{ width: "100%", fontSize: 20 }} onClick={handleCreate} disabled={loading || !selectedClass}>
          {loading ? "Creating..." : "Start Session"}
        </button>
      </div>
    </div>
  );
}

export default function Lesson19Session({ user, onHome }) {
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
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,var(--blue),var(--orange))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, color: "#fff" }}>L19</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 22 }}>GCA - Lesson 19</div>
              <div style={{ color: "var(--text3)", fontSize: 20 }}>Decimal Division and Equations</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onHome}>Back to Home</button>
        </div>
        {view === "create" && <CreateLesson19Session user={user} onCreated={(sid) => { setSessionId(sid); setView("session"); }} />}
        {view === "session" && session && (
          user.role === "teacher"
            ? <TeacherLesson19 session={session} sessionId={sessionId} uid={user.id} />
            : <StudentLesson19 session={session} sessionId={sessionId} uid={user.id} />
        )}
        {view === "session" && !session && <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><div className="spinner" /></div>}
      </div>
    </div>
  );
}

export { TeacherLesson19 as Lesson19TeacherView, StudentLesson19 as Lesson19StudentView };

