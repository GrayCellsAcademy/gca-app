import { useState, useEffect, useRef } from "react";
import { setDoc, doc, updateDoc } from "firebase/firestore";
import { onSessionChange, onClassworkAnswersChange, getTeacherClasses, addToScore, db } from "./core/firebase";
import {
  LESSON23_TOPICS, generateLesson23Question, gradeLesson23Answer,
  gradePctDescItem, gradePctToFracItem, gradeFracToPctItem,
  gradePctToDecItem, gradeDecToPctItem, gradePctOfItem,
  gradeFindWholeDirectItem, gradeMixedReviewItem,
  gradeGivenPctS1, gradeGivenPctS2,
  gradeGivenFracS1, gradeGivenFracS2,
  gradeGivenDecS1, gradeGivenDecS2,
  gradeFindWholeS1, gradeFindWholeS2,
} from "./lesson23Questions";

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
function KaTeX({ expr }) {
  const ref = useRef(null); useKaTeX();
  useEffect(() => {
    const go = () => { if (window.katex && ref.current) { try { window.katex.render(expr, ref.current, { throwOnError: false, displayMode: false }); } catch {} } else setTimeout(go, 100); };
    go();
  });
  return <span ref={ref} style={{ fontSize: 22 }} />;
}

// -- Timer --
function TimerBar({ endsAt, totalSeconds, onExpired }) {
  const [rem, setRem] = useState(totalSeconds); const fired = useRef(false);
  useEffect(() => {
    fired.current = false;
    const tick = () => { const l = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)); setRem(l); if (l === 0 && !fired.current) { fired.current = true; onExpired?.(); } };
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
        style={{ textAlign: "center", fontSize: 22, fontFamily: "var(--mono)", fontWeight: 700, padding: "10px", width: wide ? 320 : 180 }} />
      <button className="btn btn-primary" style={{ fontSize: 20, padding: "10px 20px" }}
        onMouseDown={e => { e.preventDefault(); submit(); }} disabled={submitted || !val.trim()}>OK</button>
    </div>
  );
}

// -- Multi-row input --
function MultiRowInput({ items, labelFn, onSubmit, submitted, placeholder }) {
  const [answers, setAnswers] = useState((items || []).map(() => ""));
  const allDone = answers.every(a => a.trim() !== "");
  if (!items?.length) return null;
  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
        {items.map((item, i) => (
          <div key={i} style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "10px 14px" }}>
            <div style={{ marginBottom: 8 }}>{labelFn(item)}</div>
            <input value={answers[i]} onChange={e => setAnswers(prev => prev.map((x, j) => j === i ? e.target.value : x))}
              disabled={submitted} placeholder={placeholder || ""}
              style={{ textAlign: "center", fontSize: 20, fontFamily: "var(--mono)", fontWeight: 700, padding: "6px 10px", width: "100%", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--surface)" }} />
          </div>
        ))}
      </div>
      <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }}
        onClick={() => onSubmit(JSON.stringify(answers))} disabled={submitted || !allDone}>Submit All</button>
    </div>
  );
}

// -- Two-field input (for two-stage activities shown simultaneously) --
function TwoFieldInput({ onSubmit, submitted, ph1, ph2 }) {
  const [v1, setV1] = useState(""); const [v2, setV2] = useState("");
  useEffect(() => { setV1(""); setV2(""); }, [submitted]);
  const submit = () => { if (v1.trim() && v2.trim()) onSubmit(JSON.stringify([v1.trim(), v2.trim()])); };
  return (
    <div>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 10 }}>
        <input value={v1} onChange={e => setV1(e.target.value)} disabled={submitted} placeholder={ph1}
          style={{ textAlign: "center", fontSize: 20, fontFamily: "var(--mono)", fontWeight: 700, padding: "8px", width: 160 }} />
        <input value={v2} onChange={e => setV2(e.target.value)} disabled={submitted} placeholder={ph2}
          style={{ textAlign: "center", fontSize: 20, fontFamily: "var(--mono)", fontWeight: 700, padding: "8px", width: 160 }} />
      </div>
      <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }} onClick={submit}
        disabled={submitted || !v1.trim() || !v2.trim()}>Submit</button>
    </div>
  );
}

const MULTI_TYPES = ["pct-desc", "pct-to-frac", "frac-to-pct", "pct-to-dec", "dec-to-pct", "pct-of", "find-whole-direct"];
const TWO_FIELD_TYPES = ["given-pct", "given-frac", "given-dec"];
const MC_TYPES = [];

function gradeAnswer(input, question) {
  if (!input || !question) return false;
  try { return gradeLesson23Answer(input, question); } catch { return false; }
}

// -- Question Display --
function QuestionDisplay({ question: q, revealCorrect }) {
  useKaTeX();
  if (!q) return null;

  const simple = (text, answer) => (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontFamily: "var(--mono)", fontSize: 24, fontWeight: 700, marginBottom: 6 }}>{text}</div>
      {revealCorrect && <div style={{ color: "var(--green)", fontWeight: 800, fontSize: 22, fontFamily: "var(--mono)" }}>{answer}</div>}
    </div>
  );

  if (q.type === "warmup-a") return simple("2.5 L = ? mL", "2500");
  if (q.type === "warmup-b") return simple("2 miles = ? ft", "10560");
  if (q.type === "warmup-c") return simple("20 m/s = ? km/h", "72");
  if (q.type === "warmup-d") return simple("150 cm\u00b3 water = ? g", "150");

  if (q.type === "given-pct") return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>{q.pct}% = fraction and decimal?</div>
      {revealCorrect && <div style={{ color: "var(--green)", fontWeight: 800, fontSize: 22, fontFamily: "var(--mono)" }}>{q.rn}/{q.rd} and {q.dec}</div>}
    </div>
  );
  if (q.type === "given-frac") return (
    <div style={{ textAlign: "center" }}>
      <div style={{ marginBottom: 6 }}><KaTeX expr={`\\dfrac{${q.rn}}{${q.rd}} = ?`} /></div>
      {revealCorrect && <div style={{ color: "var(--green)", fontWeight: 800, fontSize: 22, fontFamily: "var(--mono)" }}>{q.pct}% and {q.dec}</div>}
    </div>
  );
  if (q.type === "given-dec") return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontFamily: "var(--mono)", fontSize: 24, fontWeight: 700, marginBottom: 6 }}>{q.dec} = percent and fraction?</div>
      {revealCorrect && <div style={{ color: "var(--green)", fontWeight: 800, fontSize: 22, fontFamily: "var(--mono)" }}>{q.pct}% and {q.rn}/{q.rd}</div>}
    </div>
  );

  if (q.type === "find-whole-sbs") return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 20, color: "var(--text2)", marginBottom: 6 }}>{q.prompt}</div>
      {revealCorrect && <div style={{ color: "var(--green)", fontWeight: 800, fontSize: 22, fontFamily: "var(--mono)" }}>{q.displayAnswer}</div>}
    </div>
  );
  if (q.type === "word-prob") return (
    <div>
      <div style={{ fontSize: 20, color: "var(--text2)", lineHeight: 1.6 }}>{q.problem}</div>
      {revealCorrect && <div style={{ marginTop: 8, color: "var(--green)", fontWeight: 800, fontSize: 22, fontFamily: "var(--mono)" }}>${q.answer}</div>}
    </div>
  );

  if (!revealCorrect) return null;
  const items = q.problems || q.items || [];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      {items.map((item, i) => (
        <div key={i} style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "8px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <span style={{ flex: 1 }}>
            {item.expr ? <KaTeX expr={item.expr} /> : <span style={{ fontSize: 18 }}>{item.desc || (item.pct !== undefined && item.num !== undefined ? `${item.pct}% of ${item.num}` : "") || (item.part !== undefined ? `${item.part} is ${item.pct}% of what?` : "") || String(i + 1)}</span>}
          </span>
          <span style={{ fontFamily: "var(--mono)", fontSize: 19, color: "var(--green)", fontWeight: 700 }}>{item.displayAnswer || item.answer}</span>
        </div>
      ))}
    </div>
  );
}

// -- Answer Input --
function AnswerInput({ question, onSubmit, submitted }) {
  if (!question) return null;
  const t = question.type;

  if (t === "warmup-a" || t === "warmup-b" || t === "warmup-c" || t === "warmup-d") return <TextInput onSubmit={onSubmit} submitted={submitted} placeholder="number" />;

  if (t === "pct-desc") return <MultiRowInput items={question.problems} labelFn={p => <span style={{ fontSize: 19 }}>{p.desc}</span>} onSubmit={onSubmit} submitted={submitted} placeholder="e.g. 45%" />;
  if (t === "pct-to-frac") return <MultiRowInput items={question.problems} labelFn={p => <span style={{ fontFamily: "var(--mono)", fontSize: 20, fontWeight: 700 }}>{p.pct}%</span>} onSubmit={onSubmit} submitted={submitted} placeholder="e.g. 1/2" />;
  if (t === "frac-to-pct") return <MultiRowInput items={question.problems} labelFn={p => <KaTeX expr={`\\dfrac{${p.rn}}{${p.rd}}`} />} onSubmit={onSubmit} submitted={submitted} placeholder="e.g. 50%" />;
  if (t === "pct-to-dec") return <MultiRowInput items={question.problems} labelFn={p => <span style={{ fontFamily: "var(--mono)", fontSize: 20, fontWeight: 700 }}>{p.pct}%</span>} onSubmit={onSubmit} submitted={submitted} placeholder="decimal" />;
  if (t === "dec-to-pct") return <MultiRowInput items={question.problems} labelFn={p => <span style={{ fontFamily: "var(--mono)", fontSize: 20, fontWeight: 700 }}>{p.dec}</span>} onSubmit={onSubmit} submitted={submitted} placeholder="e.g. 75%" />;
  if (t === "pct-of") return <MultiRowInput items={question.problems} labelFn={p => <span style={{ fontFamily: "var(--mono)", fontSize: 20, fontWeight: 700 }}>{p.pct}% of {p.num}</span>} onSubmit={onSubmit} submitted={submitted} placeholder="number" />;
  if (t === "find-whole-direct") return <MultiRowInput items={question.problems} labelFn={p => <span style={{ fontSize: 19 }}>{p.part} is {p.pct}% of what?</span>} onSubmit={onSubmit} submitted={submitted} placeholder="number" />;

  if (TWO_FIELD_TYPES.includes(t)) {
    if (t === "given-pct") return <TwoFieldInput onSubmit={onSubmit} submitted={submitted} ph1="fraction" ph2="decimal" />;
    if (t === "given-frac") return <TwoFieldInput onSubmit={onSubmit} submitted={submitted} ph1="percent" ph2="decimal" />;
    if (t === "given-dec") return <TwoFieldInput onSubmit={onSubmit} submitted={submitted} ph1="percent" ph2="fraction" />;
  }

  if (t === "find-whole-sbs") return <TextInput onSubmit={onSubmit} submitted={submitted} placeholder="number" />;
  if (t === "word-prob") return <TextInput onSubmit={onSubmit} submitted={submitted} placeholder="$ amount" />;
  if (t === "mixed-review") return <MultiRowInput items={question.items} labelFn={p => <KaTeX expr={p.expr} />} onSubmit={onSubmit} submitted={submitted} placeholder="answer" />;

  return null;
}

// -- Student Reveal --
function StudentReveal({ result, question }) {
  if (!result) return <div style={{ textAlign: "center", color: "var(--text3)", fontSize: 20 }}>No answer submitted.</div>;
  const isMulti = [...MULTI_TYPES, "mixed-review"].includes(question?.type);
  const graderMap = {
    "pct-desc": gradePctDescItem, "pct-to-frac": gradePctToFracItem,
    "frac-to-pct": gradeFracToPctItem, "pct-to-dec": gradePctToDecItem,
    "dec-to-pct": gradeDecToPctItem, "pct-of": gradePctOfItem,
    "find-whole-direct": gradeFindWholeDirectItem, "mixed-review": gradeMixedReviewItem,
  };
  const isTwoField = TWO_FIELD_TYPES.includes(question?.type);

  return (
    <div>
      <div style={{ textAlign: "center", fontSize: 22, fontWeight: 800, color: result.correct ? "var(--green)" : "var(--red)", marginBottom: 8 }}>
        {result.correct ? "Correct! +" + POINTS + " pts" : "Incorrect"}
      </div>
      {isMulti ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {(question.problems || question.items || []).map((item, i) => {
            let studentAns = "", correctAns = item.displayAnswer || String(item.answer || ""), itemOk = false;
            try {
              const parsed = JSON.parse(result.answer);
              studentAns = String(parsed[i] || "");
              const grader = graderMap[question.type];
              if (grader) itemOk = grader(studentAns, item);
            } catch {}
            return (
              <div key={i} style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "6px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6, border: "1px solid " + (itemOk ? "rgba(22,163,74,0.2)" : "rgba(239,68,68,0.2)") }}>
                <span style={{ flex: 1, fontSize: 17 }}>
                  {item.expr ? <KaTeX expr={item.expr} /> : item.desc || (item.pct !== undefined && item.num !== undefined ? `${item.pct}% of ${item.num}` : item.part !== undefined ? `${item.part} is ${item.pct}% of what?` : String(i + 1))}
                </span>
                <div style={{ display: "flex", gap: 8 }}>
                  {!itemOk && <span style={{ fontSize: 17, color: "var(--red)", fontWeight: 700, fontFamily: "var(--mono)" }}>You: {studentAns || "-"}</span>}
                  <span style={{ fontSize: 17, color: "var(--green)", fontWeight: 700, fontFamily: "var(--mono)" }}>{correctAns}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : isTwoField ? (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 19, color: "var(--text2)", marginBottom: 4 }}>
            Your answer: <strong style={{ fontFamily: "var(--mono)" }}>{(() => { try { return JSON.parse(result.answer).join(", "); } catch { return result.answer; } })()}</strong>
          </div>
          {!result.correct && <div style={{ fontSize: 20, color: "var(--green)", fontWeight: 700, marginTop: 4 }}>Correct: {question.displayAnswer}</div>}
        </div>
      ) : (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 19, color: "var(--text2)", marginBottom: 4 }}>
            Your answer: <strong style={{ fontFamily: "var(--mono)", color: result.correct ? "var(--green)" : "var(--red)" }}>{result.answer}</strong>
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
function TeacherLesson23({ session, sessionId }) {
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
      const q = generateLesson23Question(LESSON23_TOPICS[idx].id);
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
                {topicIdx < LESSON23_TOPICS.length - 1 && (
                  <button className="btn btn-primary" disabled={session.status === "question"}
                    onClick={() => { const n = topicIdx + 1; setTopicIdx(n); handleGenerate(n); }}>
                    Next: {LESSON23_TOPICS[topicIdx + 1]?.label}
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
          {LESSON23_TOPICS.map((t, i) => {
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
                  {LESSON23_TOPICS[topicIdx]?.label} -- {submittedCount}/{totalStudents} submitted -- {correctCount} correct
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
function StudentLesson23({ session, sessionId, uid }) {
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
      <p style={{ color: "var(--text2)", fontSize: 20 }}>Lesson 23 - Percent</p>
    </div>
  );
  if (session.status === "ended") return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Session ended</h2>
      <p style={{ color: "var(--text2)", fontSize: 20 }}>Final score: <strong>{myScore} pts</strong></p>
    </div>
  );

  const isMulti = [...MULTI_TYPES, "mixed-review"].includes(question?.type);
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
function CreateLesson23Session({ user, onCreated }) {
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
        joinCode, type: "lesson23", status: "waiting",
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
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Lesson 23 - Percent</h2>
        <p style={{ color: "var(--text2)", fontSize: 20, marginBottom: 16 }}>Percent notation, conversions, percent of a number, and word problems.</p>
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

export default function Lesson23Session({ user, onHome }) {
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
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,var(--blue),var(--orange))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, color: "#fff" }}>L23</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 22 }}>GCA - Lesson 23</div>
              <div style={{ color: "var(--text3)", fontSize: 20 }}>Percent</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onHome}>Back to Home</button>
        </div>
        {view === "create" && <CreateLesson23Session user={user} onCreated={(sid) => { setSessionId(sid); setView("session"); }} />}
        {view === "session" && session && (
          user.role === "teacher"
            ? <TeacherLesson23 session={session} sessionId={sessionId} uid={user.id} />
            : <StudentLesson23 session={session} sessionId={sessionId} uid={user.id} />
        )}
        {view === "session" && !session && <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><div className="spinner" /></div>}
      </div>
    </div>
  );
}

export { TeacherLesson23 as Lesson23TeacherView, StudentLesson23 as Lesson23StudentView };

