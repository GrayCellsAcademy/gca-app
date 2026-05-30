import { useState, useEffect, useRef } from "react";
import { setDoc, doc, updateDoc } from "firebase/firestore";
import { onSessionChange, onClassworkAnswersChange, getTeacherClasses, addToScore, db } from "./core/firebase";
import {
  LESSON15_TOPICS, generateLesson15Question, gradeLesson15Answer,
  gradeCommonSimpleItem, gradeCommonSimplifyItem, gradeCommonNegItem,
  gradeFindCDItem,
  gradeDiffDirectItem, gradeDiffNegItem,
  gradeAddMixedSimpleItem, gradeSubMixedSimpleItem,
  gradeAddMixedCarryItem, gradeSubMixedBorrowItem,
  gradeWholeFracItem, gradeMixedReviewItem,
} from "./lesson15Questions";

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
  useEffect(() => { const go = () => { if (window.katex && ref.current) { try { window.katex.render(expr, ref.current, { throwOnError: false, displayMode: !!block }); } catch {} } else setTimeout(go, 100); }; go(); });
  return block ? <div ref={ref} style={{ fontSize: 26, margin: "4px 0", minHeight: 36 }} /> : <span ref={ref} style={{ fontSize: 22 }} />;
}

// Convert "2/3 + 1/4" style strings to KaTeX
function fracToKatex(str) {
  if (!str) return str;
  const bs = "\\";
  let s = String(str);
  // Mixed: "-1 2/3" or "1 2/3"
  s = s.replace(/(-?)(\d+)\s+(\d+)\/(\d+)/g, (_, neg, w, n, d) => `${neg}${w}${bs}dfrac{${n}}{${d}}`);
  // Simple fraction: "-3/4" or "3/4"
  s = s.replace(/(-?)(\d+)\/(\d+)/g, (_, neg, n, d) => `${neg}${bs}dfrac{${n}}{${d}}`);
  // operators
  s = s.replace(/\s\+\s\(-/g, ` + ${bs}left(-`).replace(/\)\s/g, `${bs}right) `);
  return s;
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

// -- Text input --
function TextInput({ onSubmit, submitted, placeholder, wide }) {
  const [val, setVal] = useState(""); const ref = useRef(null);
  useEffect(() => { setVal(""); setTimeout(() => ref.current?.focus(), 80); }, [submitted]);
  const submit = () => { if (val.trim()) onSubmit(val.trim()); };
  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
      <input ref={ref} value={val} onChange={e => setVal(e.target.value)}
        onKeyDown={e => e.key === "Enter" && submit()} disabled={submitted} placeholder={placeholder || ""}
        style={{ textAlign: "center", fontSize: 22, fontFamily: "var(--mono)", fontWeight: 700, padding: "10px", width: wide ? 220 : 160 }} />
      <button className="btn btn-primary" style={{ fontSize: 20, padding: "10px 20px" }}
        onMouseDown={e => { e.preventDefault(); submit(); }} disabled={submitted || !val.trim()}>OK</button>
    </div>
  );
}

// -- Mixed number input with visual mode --
function MixedInput({ onSubmit, submitted, placeholder }) {
  const [mode, setMode] = useState("text");
  const [textVal, setTextVal] = useState("");
  const [whole, setWhole] = useState(""); const [num, setNum] = useState(""); const [den, setDen] = useState("");
  const ref = useRef(null);
  useEffect(() => { setTextVal(""); setWhole(""); setNum(""); setDen(""); setTimeout(() => ref.current?.focus(), 80); }, [submitted]);
  const submitText = () => { if (textVal.trim()) onSubmit(textVal.trim()); };
  const submitVisual = () => { if (whole.trim() && num.trim() && den.trim()) onSubmit(`${whole.trim()} ${num.trim()}/${den.trim()}`); };
  if (mode === "visual") return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center", marginBottom: 8 }}>
        <input value={whole} onChange={e => setWhole(e.target.value)} disabled={submitted} placeholder="whole" autoFocus
          style={{ textAlign: "center", fontSize: 24, fontFamily: "var(--mono)", fontWeight: 800, padding: "8px", width: 70, borderRadius: "var(--radius-sm)", border: "2px solid var(--border)", background: "var(--surface)" }} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <input value={num} onChange={e => setNum(e.target.value)} disabled={submitted} placeholder="num"
            style={{ textAlign: "center", fontSize: 22, fontFamily: "var(--mono)", fontWeight: 800, padding: "4px 8px", width: 60, borderRadius: "var(--radius-sm)", border: "2px solid var(--border)", background: "var(--surface)" }} />
          <div style={{ width: 60, height: 2, background: "var(--text)", borderRadius: 99 }} />
          <input value={den} onChange={e => setDen(e.target.value)} disabled={submitted} placeholder="den"
            style={{ textAlign: "center", fontSize: 22, fontFamily: "var(--mono)", fontWeight: 800, padding: "4px 8px", width: 60, borderRadius: "var(--radius-sm)", border: "2px solid var(--border)", background: "var(--surface)" }} />
        </div>
        <button className="btn btn-primary" style={{ fontSize: 20, padding: "10px 20px" }}
          onClick={submitVisual} disabled={submitted || !whole.trim() || !num.trim() || !den.trim()}>OK</button>
      </div>
      <button className="btn btn-ghost btn-sm" style={{ width: "100%", fontSize: 18 }} onClick={() => setMode("text")}>Type instead (e.g. 2 1/3)</button>
    </div>
  );
  return (
    <div>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 8 }}>
        <input ref={ref} value={textVal} onChange={e => setTextVal(e.target.value)}
          onKeyDown={e => e.key === "Enter" && textVal.trim() && submitText()} disabled={submitted} placeholder={placeholder || "e.g. 2 1/3"}
          style={{ textAlign: "center", fontSize: 22, fontFamily: "var(--mono)", fontWeight: 700, padding: "10px", width: 180 }} />
        <button className="btn btn-primary" style={{ fontSize: 20, padding: "10px 20px" }}
          onMouseDown={e => { e.preventDefault(); submitText(); }} disabled={submitted || !textVal.trim()}>OK</button>
      </div>
      <button className="btn btn-ghost btn-sm" style={{ width: "100%", fontSize: 18 }} onClick={() => setMode("visual")}>
        Enter as mixed number &nbsp;<span style={{ fontFamily: "var(--mono)", fontWeight: 900 }}>2 -/-</span>
      </button>
    </div>
  );
}

// -- Multi-row text input (for simultaneous problems) --
function MultiTextInput({ items, labelFn, onSubmit, submitted, placeholder, wide }) {
  const [answers, setAnswers] = useState(items.map(() => ""));
  const allDone = answers.every(a => a.trim() !== "");
  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "10px 14px", flexWrap: "wrap" }}>
            <span style={{ flex: 1 }}><KaTeX expr={fracToKatex(labelFn(item))} /></span>
            <input value={answers[i]} onChange={e => setAnswers(prev => prev.map((x, j) => j === i ? e.target.value : x))}
              disabled={submitted} placeholder={placeholder || "e.g. 3/4"}
              style={{ textAlign: "center", fontSize: 20, fontFamily: "var(--mono)", fontWeight: 700, padding: "6px 10px", width: wide ? 160 : 120, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--surface)" }} />
          </div>
        ))}
      </div>
      <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }}
        onClick={() => onSubmit(JSON.stringify(answers))} disabled={submitted || !allDone}>Submit All</button>
    </div>
  );
}

// -- Staged CD input --

// -- QuestionDisplay --
function QuestionDisplay({ question: q, revealCorrect }) {
  useKaTeX();
  if (!q) return null;

  if (q.type === "warmup-a") return (
    <div style={{ textAlign: "center" }}>
      <KaTeX expr={fracToKatex(q.n + "/" + q.d)} block />
      {revealCorrect && <div style={{ color: "var(--green)", fontWeight: 800 }}><KaTeX expr={fracToKatex(q.displayAnswer)} block /></div>}
    </div>
  );
  if (q.type === "warmup-b") return (
    <div style={{ textAlign: "center" }}>
      <KaTeX expr={fracToKatex(q.whole + " " + q.num + "/" + q.den)} block />
      {revealCorrect && <div style={{ color: "var(--green)", fontWeight: 800 }}><KaTeX expr={fracToKatex(q.displayAnswer)} block /></div>}
    </div>
  );
  if (q.type === "warmup-c") return (
    <div style={{ textAlign: "center" }}>
      <KaTeX expr={fracToKatex(q.num + "/" + q.den)} block />
      {revealCorrect && <div style={{ color: "var(--green)", fontWeight: 800 }}><KaTeX expr={fracToKatex(q.displayAnswer)} block /></div>}
    </div>
  );
  if (q.type === "warmup-d") return (
    <div style={{ textAlign: "center" }}>
      <KaTeX expr={fracToKatex(q.n1 + "/" + q.d1) + " = " + fracToKatex("?" + "/" + q.d2)} block />
      {revealCorrect && <div style={{ color: "var(--green)", fontWeight: 800, fontSize: 22 }}>? = {q.displayAnswer}</div>}
    </div>
  );

  // Multi-item simultaneous types: show problems on reveal
  const MULTI = ["common-simple","common-simplify","common-neg","diff-direct","diff-neg","add-mixed-simple","sub-mixed-simple","add-mixed-carry","sub-mixed-borrow","whole-frac"];
  if (MULTI.includes(q.type)) {
    const items = q.problems || q.questions || [];
    if (!revealCorrect) return null; // AnswerInput handles display during answering
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {items.map((item, i) => (
          <div key={i} style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "8px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <KaTeX expr={fracToKatex(item.display)} />
            <span style={{ color: "var(--green)", fontWeight: 700 }}><KaTeX expr={fracToKatex(item.displayAnswer || item.answer)} /></span>
          </div>
        ))}
      </div>
    );
  }

  if (q.type === "find-cd") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {q.problems.map((p, i) => (
          <div key={i} style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "8px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <KaTeX expr={fracToKatex("1/" + p.d1) + " \\text{ and } " + fracToKatex("1/" + p.d2)} />
            {revealCorrect && <span style={{ fontFamily: "var(--mono)", fontSize: 20, color: "var(--green)", fontWeight: 700 }}>{p.displayAnswer}</span>}
          </div>
        ))}
      </div>
    );
  }

  if (q.type === "staged-cd") return (
    <div style={{ textAlign: "center" }}>
      <KaTeX expr={fracToKatex(q.display)} block />
      {revealCorrect && <div style={{ color: "var(--green)", fontWeight: 800 }}><KaTeX expr={fracToKatex(q.displayAnswer)} block /></div>}
    </div>
  );

  if (q.type === "mixed-review") {
    if (!revealCorrect) return null; // AnswerInput handles display
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {q.questions.map((item, i) => (
          <div key={i} style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "8px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <KaTeX expr={fracToKatex(item.display)} />
            <span style={{ color: "var(--green)", fontWeight: 700 }}><KaTeX expr={fracToKatex(item.answer)} /></span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

// -- Answer Inputs --
function AnswerInput({ question, onSubmit, submitted }) {
  if (!question) return null;
  const t = question.type;

  if (t === "warmup-a") return <TextInput onSubmit={onSubmit} submitted={submitted} placeholder="" />;
  if (t === "warmup-b") return <TextInput onSubmit={onSubmit} submitted={submitted} placeholder="" />;
  if (t === "warmup-c") return <MixedInput onSubmit={onSubmit} submitted={submitted} placeholder="" />;
  if (t === "warmup-d") return <TextInput onSubmit={onSubmit} submitted={submitted} placeholder="" />;

  const SIMUL_FRAC = ["common-simple","common-simplify","common-neg","diff-direct","diff-neg"];
  if (SIMUL_FRAC.includes(t)) {
    const items = question.problems;
    return (
      <div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
          {items.map((item, i) => (
            <div key={i} style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "10px 14px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <span style={{ flex: 1 }}><KaTeX expr={fracToKatex(item.display)} /></span>
              <SimulFracEntry i={i} question={question} onSubmit={onSubmit} submitted={submitted} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const SIMUL_MIXED = ["add-mixed-simple","sub-mixed-simple","add-mixed-carry","sub-mixed-borrow","whole-frac"];
  if (SIMUL_MIXED.includes(t)) {
    return <MultiTextInput items={question.problems} labelFn={p => p.display} onSubmit={onSubmit} submitted={submitted} placeholder="e.g. 3 2/3" wide />;
  }

  if (t === "find-cd") {
    return <MultiTextInput items={question.problems} labelFn={p => `${p.d1} and ${p.d2}`} onSubmit={onSubmit} submitted={submitted} placeholder="Enter CD" />;
  }
  if (t === "staged-cd") return <MixedInput onSubmit={onSubmit} submitted={submitted} placeholder="e.g. 5/6 or 1 1/2" />;

  if (t === "mixed-review") {
    const [answers, setAnswers] = useState(question.questions.map(() => ""));
    const allDone = answers.every(a => a.trim() !== "");
    return (
      <div>
        <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 12 }}>
          {question.questions.map((item, i) => (
            <div key={i} style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "10px 14px" }}>
              <div style={{ marginBottom: 6 }}><KaTeX expr={fracToKatex(item.display)} /></div>
              <input value={answers[i]} onChange={e => setAnswers(prev => prev.map((x, j) => j === i ? e.target.value : x))}
                disabled={submitted} placeholder="Enter answer"
                style={{ textAlign: "center", fontSize: 20, fontFamily: "var(--mono)", fontWeight: 700, padding: "6px 10px", width: "100%", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--surface)" }} />
            </div>
          ))}
        </div>
        <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }}
          onClick={() => onSubmit(JSON.stringify(answers))} disabled={submitted || !allDone}>Submit All</button>
      </div>
    );
  }
  return null;
}

// Simultaneous fraction entries sharing state via parent - use a wrapper
function SimulFracEntryGroup({ question, onSubmit, submitted }) {
  const items = question.problems;
  const [answers, setAnswers] = useState(items.map(() => ""));
  const allDone = answers.every(a => a.trim() !== "");
  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
        {items.map((item, i) => (
          <div key={i} style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "10px 14px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span style={{ flex: 1 }}><KaTeX expr={fracToKatex(item.display)} /></span>
            <input value={answers[i]} onChange={e => setAnswers(prev => prev.map((x, j) => j === i ? e.target.value : x))}
              disabled={submitted} placeholder="e.g. 3/4"
              style={{ textAlign: "center", fontSize: 20, fontFamily: "var(--mono)", fontWeight: 700, padding: "6px 10px", width: 110, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--surface)" }} />
          </div>
        ))}
      </div>
      <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }}
        onClick={() => onSubmit(JSON.stringify(answers))} disabled={submitted || !allDone}>Submit All</button>
    </div>
  );
}
function SimulFracEntry() { return null; } // placeholder, replaced by group

// Override AnswerInput for fraction types
function AnswerInputFull({ question, onSubmit, submitted }) {
  if (!question) return null;
  const t = question.type;
  const SIMUL_FRAC = ["common-simple","common-simplify","common-neg","diff-direct","diff-neg"];
  if (SIMUL_FRAC.includes(t)) return <SimulFracEntryGroup question={question} onSubmit={onSubmit} submitted={submitted} />;
  return <AnswerInput question={question} onSubmit={onSubmit} submitted={submitted} />;
}

// -- Per-item reveal for student --
function StudentReveal({ result, question }) {
  if (!result) return <div style={{ textAlign: "center", color: "var(--text3)", fontSize: 20 }}>No answer submitted.</div>;
  const MULTI = ["common-simple","common-simplify","common-neg","diff-direct","diff-neg","add-mixed-simple","sub-mixed-simple","add-mixed-carry","sub-mixed-borrow","whole-frac","find-cd","mixed-review"];
  const isMulti = MULTI.includes(question?.type);

  const itemGraders = {
    "common-simple": gradeCommonSimpleItem, "common-simplify": gradeCommonSimplifyItem, "common-neg": gradeCommonNegItem,
    "diff-direct": gradeDiffDirectItem, "diff-neg": gradeDiffNegItem,
    "add-mixed-simple": gradeAddMixedSimpleItem, "sub-mixed-simple": gradeSubMixedSimpleItem,
    "add-mixed-carry": gradeAddMixedCarryItem, "sub-mixed-borrow": gradeSubMixedBorrowItem,
    "whole-frac": gradeWholeFracItem,
  };

  return (
    <div>
      <div style={{ textAlign: "center", fontSize: 22, fontWeight: 800, color: result.correct ? "var(--green)" : "var(--red)", marginBottom: 8 }}>
        {result.correct ? "Correct! +" + POINTS + " pts" : "Incorrect"}
      </div>
      {isMulti ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {(question.problems || question.questions || []).map((item, i) => {
            let studentAns = "", correctAns = item.displayAnswer || item.answer, itemOk = false;
            try {
              const parsed = JSON.parse(result.answer);
              studentAns = String(parsed[i] || "");
              if (question.type === "find-cd") { const n = parseInt(studentAns); itemOk = Number.isInteger(n) && n > 0 && n % item.d1 === 0 && n % item.d2 === 0; correctAns = item.displayAnswer; }
              else if (question.type === "mixed-review") { itemOk = gradeMixedReviewItem(studentAns, item); correctAns = item.answer; }
              else { const grader = itemGraders[question.type]; itemOk = grader ? grader(studentAns, item) : false; }
            } catch {}
            return (
              <div key={i} style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "6px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6, border: "1px solid " + (itemOk ? "rgba(22,163,74,0.2)" : "rgba(239,68,68,0.2)") }}>
                <span><KaTeX expr={fracToKatex(item.display || "")} /></span>
                <div style={{ display: "flex", gap: 8 }}>
                  {!itemOk && <span style={{ fontSize: 17, color: "var(--red)", fontWeight: 700 }}>You: {studentAns || "-"}</span>}
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
            <div style={{ fontSize: 20, color: "var(--green)", fontWeight: 700 }}>Correct: <span style={{ fontFamily: "var(--mono)" }}>{question.displayAnswer}</span></div>
          )}
        </div>
      )}
    </div>
  );
}

function gradeAnswer(input, question) {
  if (!input || !question) return false;
  return gradeLesson15Answer(input, question);
}

const MULTI_ITEM_TYPES = ["common-simple","common-simplify","common-neg","diff-direct","diff-neg","add-mixed-simple","sub-mixed-simple","add-mixed-carry","sub-mixed-borrow","whole-frac","find-cd","mixed-review"];

// -- Teacher --
function TeacherLesson15({ session, sessionId, uid }) {
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
    const q = generateLesson15Question(LESSON15_TOPICS[idx].id);
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
              <input type="number" min={15} max={600} value={timerInput} onChange={e => setTimerInput(Number(e.target.value))}
                style={{ width: 70, padding: "6px 10px", fontSize: 20, textAlign: "center" }} />
            </div>
            {session.status === "question" && <button className="btn btn-ghost" onClick={handleReveal}>Reveal</button>}
            {session.status === "revealing" && (
              <>
                <button className="btn btn-ghost" onClick={() => handleGenerate()}>Repeat</button>
                {topicIdx < LESSON15_TOPICS.length - 1 && (
                  <button className="btn btn-primary" onClick={() => { const n = topicIdx + 1; setTopicIdx(n); handleGenerate(n); }}>
                    Next: {LESSON15_TOPICS[topicIdx + 1]?.label}
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
          {LESSON15_TOPICS.map((t, i) => {
            const isActive = i === topicIdx, isDone = i < topicIdx;
            return (
              <button key={t.id} onClick={() => setTopicIdx(i)}
                style={{ background: isActive ? "rgba(27,143,255,0.15)" : "var(--surface)", border: "2px solid " + (isActive ? "var(--blue)" : isDone ? "rgba(22,163,74,0.3)" : "var(--border)"), borderRadius: "var(--radius)", padding: "4px 8px", cursor: "pointer", textAlign: "left", fontFamily: "var(--font)" }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: isActive ? "var(--blue)" : isDone ? "var(--green)" : "var(--text)" }}>{t.label}</div>
                <div style={{ fontSize: 12, color: "var(--text3)" }}>{t.description}</div>
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
                  {LESSON15_TOPICS[topicIdx]?.label} - {submittedCount}/{totalStudents} submitted{!isMulti && ` - ${correctCount} correct`}
                </div>
                {question.prompt && <div style={{ fontSize: 20, color: "var(--text2)", marginBottom: 8 }}>{question.prompt}</div>}
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
                    <div style={{ fontWeight: 800, color: "var(--green)" }}><KaTeX expr={fracToKatex(question.displayAnswer || "")} /></div>
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
function StudentLesson15({ session, sessionId, uid }) {
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
      <p style={{ color: "var(--text2)", fontSize: 20 }}>Lesson 15 - Adding and Subtracting Fractions</p>
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
            <StudentReveal result={result} question={question} />
          </div>
        ) : submitted ? (
          <div style={{ textAlign: "center", marginTop: 12 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--green)" }}>Submitted! Waiting for reveal...</div>
          </div>
        ) : question ? (
          <div style={{ marginTop: 14 }}>
            <AnswerInputFull question={question} onSubmit={handleSubmit} submitted={submitted} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

// -- Session Creator --
function CreateLesson15Session({ user, onCreated }) {
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
        joinCode, type: "lesson15", status: "waiting",
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
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Lesson 15 - Adding and Subtracting Fractions</h2>
        <p style={{ color: "var(--text2)", fontSize: 20, marginBottom: 16 }}>Common denominators, different denominators, mixed numbers, carrying, borrowing, and negatives.</p>
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

export default function Lesson15Session({ user, onHome }) {
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
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,var(--blue),var(--orange))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, color: "#fff" }}>L15</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 22 }}>GCA - Lesson 15</div>
              <div style={{ color: "var(--text3)", fontSize: 20 }}>Adding and Subtracting Fractions</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onHome}>Back to Home</button>
        </div>
        {view === "create" && <CreateLesson15Session user={user} onCreated={(sid) => { setSessionId(sid); setView("session"); }} />}
        {view === "session" && session && (
          user.role === "teacher"
            ? <TeacherLesson15 session={session} sessionId={sessionId} uid={user.id} />
            : <StudentLesson15 session={session} sessionId={sessionId} uid={user.id} />
        )}
        {view === "session" && !session && <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><div className="spinner" /></div>}
      </div>
    </div>
  );
}

export { TeacherLesson15 as Lesson15TeacherView, StudentLesson15 as Lesson15StudentView };


