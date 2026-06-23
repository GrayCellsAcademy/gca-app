import { useState, useEffect, useRef } from "react";
import { setDoc, doc, updateDoc } from "firebase/firestore";
import {
  createClassworkSession, joinSession, pushGeneratedQuestion,
  revealGeneratedQuestion, endSession, onSessionChange,
  onClassworkAnswersChange, getTeacherClasses, addToScore, db,
} from "./core/firebase";
import {
  TOPIC_LABELS, generateQuestion, gradeRatioAnswer,
  gradeWriteProportion,
} from "./ratioQuestions";

const POINTS_PER_QUESTION = 5;

//  Work Display 
function WorkDisplay({ question }) {
  if (!question) return null;
  const lines = (question.work || "").split('\n');

  if (question.type === "simplify") {
    return (
      <div style={{ marginTop: 12, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "var(--radius-sm)", padding: "12px 16px" }}>
        <div style={{ fontSize: 20, color: "var(--text3)", marginBottom: 6 }}>How to simplify:</div>
        <div style={{ fontFamily: "var(--mono)", fontSize: 20, fontWeight: 700 }}>
          {question.a}:{question.b} <span style={{ color: "var(--red)" }}> {question.gcf}</span> = <span style={{ color: "var(--green)" }}>{question.answer}</span>
        </div>
        <div style={{ fontSize: 20, color: "var(--text3)", marginTop: 6 }}>GCF of {question.a} and {question.b} = {question.gcf}</div>
      </div>
    );
  }

  if (question.type === "proportion" || question.type === "solve-word") {
    return (
      <div style={{ marginTop: 12, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "var(--radius-sm)", padding: "12px 16px" }}>
        <div style={{ fontSize: 20, color: "var(--text3)", marginBottom: 6 }}>Solution:</div>
        {question.type === "solve-word" && (
          <div style={{ fontSize: 20, color: "var(--blue)", marginBottom: 8, fontWeight: 600 }}>Proportion: {question.proportion}</div>
        )}
        {lines.map((line, i) => (
          <div key={i} style={{ fontFamily: "var(--mono)", fontSize: 20, fontWeight: i === lines.length - 1 ? 800 : 400, color: i === lines.length - 1 ? "var(--green)" : "var(--text)", marginBottom: 2 }}>
            {line}
          </div>
        ))}
      </div>
    );
  }

  if (question.type === "algebraic") {
    return (
      <div style={{ marginTop: 12, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "var(--radius-sm)", padding: "12px 16px" }}>
        <div style={{ fontSize: 20, color: "var(--text3)", marginBottom: 6 }}>Solution:</div>
        {lines.map((line, i) => (
          <div key={i} style={{ fontFamily: "var(--mono)", fontSize: 19, fontWeight: i === lines.length - 1 ? 800 : 400, color: i === lines.length - 1 ? "var(--green)" : "var(--text)", marginBottom: 3 }}>
            {line}
          </div>
        ))}
      </div>
    );
  }

  if (question.type === "write-proportion") {
    return (
      <div style={{ marginTop: 12, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "var(--radius-sm)", padding: "12px 16px" }}>
        <div style={{ fontSize: 20, color: "var(--text3)", marginBottom: 6 }}>Accepted proportions (examples):</div>
        <div style={{ fontFamily: "var(--mono)", fontSize: 19, color: "var(--green)", fontWeight: 700 }}>
          {question.correctProportions.slice(0, 4).join("  or  ")}
        </div>
      </div>
    );
  }

  return null;
}

//  Timer Bar 
function TimerBar({ endsAt, totalSeconds, onExpired }) {
  const [remaining, setRemaining] = useState(totalSeconds);
  const expiredRef = useRef(false);
  useEffect(() => {
    expiredRef.current = false;
    const tick = () => {
      const left = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0 && !expiredRef.current) {
        expiredRef.current = true;
        if (onExpired) onExpired();
      }
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [endsAt]);
  const pct = endsAt ? Math.max(0, (remaining / totalSeconds) * 100) : 100;
  const color = remaining <= 5 ? "var(--red)" : remaining <= 10 ? "var(--amber)" : "var(--green)";
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 20, color: "var(--text3)", marginBottom: 6 }}>
        <span>Time remaining</span>
        <span style={{ fontWeight: 700, color, fontSize: 20 }}>{remaining}s</span>
      </div>
      <div style={{ height: 8, background: "var(--surface2)", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 99, transition: "width 0.5s linear" }} />
      </div>
    </div>
  );
}


//  Fraction Display 
function AlgebraicDisplay({ prompt }) {
  // Parse "a/(bx+c) = d/(ex+f)" into fraction display
  const match = prompt.match(/^(.+)\/\((.+)\)\s*=\s*(.+)\/\((.+)\)$/);
  if (!match) return <div style={{ fontSize: 22, fontWeight: 800 }}>{prompt}</div>;
  const [, num1, den1, num2, den2] = match;
  const fracStyle = { display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 0, verticalAlign: "middle", margin: "0 8px" };
  const numStyle = { fontSize: 22, fontWeight: 800, padding: "2px 8px", borderBottom: "2.5px solid var(--text)", textAlign: "center", minWidth: 40 };
  const denStyle = { fontSize: 22, fontWeight: 800, padding: "2px 8px", textAlign: "center", minWidth: 40 };
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, flexWrap: "wrap", fontSize: 22, fontWeight: 800 }}>
      <div style={fracStyle}>
        <div style={numStyle}>{num1}</div>
        <div style={denStyle}>{den1}</div>
      </div>
      <span style={{ fontSize: 28 }}>=</span>
      <div style={fracStyle}>
        <div style={numStyle}>{num2}</div>
        <div style={denStyle}>{den2}</div>
      </div>
    </div>
  );
}

//  Teacher View 
function TeacherRatio({ session, sessionId, uid }) {
  const [answers, setAnswers] = useState([]);
  const [timerInput, setTimerInput] = useState(90);
  const [currentTopicIdx, setCurrentTopicIdx] = useState(0);
  const revealedRef = useRef(false);

  const question = session.currentQuestion;
  const participants = session.participants || {};
  const totalStudents = Object.keys(participants).length;
  const currentTopic = TOPIC_LABELS[currentTopicIdx];

  useEffect(() => {
    if (!question?.id) return;
    setAnswers([]);
    revealedRef.current = false;
    const unsub = onClassworkAnswersChange(sessionId, question.id, setAnswers);
    return () => unsub();
  }, [question?.id]);

  const handleGenerate = async () => {
    const q = generateQuestion(currentTopic.id);
    const qId = "q_" + Date.now().toString(36);
    q.id = qId;
    q.points = POINTS_PER_QUESTION;
    revealedRef.current = false;
    setAnswers([]);
    await updateDoc(doc(db, "sessions", sessionId), {
      status: "question",
      currentQuestion: q,
      currentTopic: currentTopic.id,
      timerSeconds: timerInput,
      timerEndsAt: Date.now() + timerInput * 1000,
      questionCount: session.questionCount ? session.questionCount + 1 : 1,
    });
  };

  const handleReveal = async () => {
    if (revealedRef.current) return;
    revealedRef.current = true;
    for (const ans of answers) {
      if (ans.answer !== undefined && gradeRatioAnswer(ans.answer, question)) {
        await addToScore(sessionId, ans.uid, POINTS_PER_QUESTION);
      }
    }
    await revealGeneratedQuestion(sessionId);
  };

  const handleNextTopic = async () => {
    const nextIdx = Math.min(currentTopicIdx + 1, TOPIC_LABELS.length - 1);
    setCurrentTopicIdx(nextIdx);
    const nextTopic = TOPIC_LABELS[nextIdx];
    const q = generateQuestion(nextTopic.id);
    const qId = "q_" + Date.now().toString(36);
    q.id = qId;
    q.points = POINTS_PER_QUESTION;
    revealedRef.current = false;
    setAnswers([]);
    await updateDoc(doc(db, "sessions", sessionId), {
      status: "question",
      currentQuestion: q,
      currentTopic: nextTopic.id,
      timerSeconds: timerInput,
      timerEndsAt: Date.now() + timerInput * 1000,
      questionCount: session.questionCount ? session.questionCount + 1 : 1,
    });
  };

  const handleTimerExpired = async () => {
    if (session.status === "question" && !revealedRef.current) {
      await handleReveal();
    }
  };

  const handleEnd = async () => {
    if (confirm("End the session?")) await endSession(sessionId);
  };

  const submittedCount = answers.length;
  const correctCount = answers.filter(a => a.answer !== undefined && gradeRatioAnswer(a.answer, question)).length;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 20, color: "var(--text3)", marginBottom: 2 }}>Join Code</div>
            <div style={{ fontSize: 36, fontWeight: 900, fontFamily: "var(--mono)", color: "var(--blue)", letterSpacing: "0.15em" }}>{session.joinCode}</div>
            <div style={{ fontSize: 20, color: "var(--text3)", marginTop: 2 }}>{totalStudents} student{totalStudents !== 1 ? "s" : ""} joined</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <label style={{ fontSize: 20, color: "var(--text2)" }}>Seconds:</label>
              <input type="number" min={10} max={300} value={timerInput}
                onChange={e => setTimerInput(Number(e.target.value))}
                style={{ width: 70, padding: "6px 10px", fontSize: 20, textAlign: "center" }} />
            </div>
            {session.status === "question" && (
              <button className="btn btn-ghost" onClick={handleReveal}>Reveal Answers</button>
            )}
            {session.status === "revealing" && (
              <>
                <button className="btn btn-ghost" onClick={handleGenerate}>Repeat Topic</button>
                {currentTopicIdx < TOPIC_LABELS.length - 1 && (
                  <button className="btn btn-primary" onClick={handleNextTopic}>
                    Next Topic: {TOPIC_LABELS[Math.min(currentTopicIdx + 1, TOPIC_LABELS.length - 1)].label}
                  </button>
                )}
              </>
            )}
            <button className="btn btn-ghost" style={{ color: "var(--red)" }} onClick={handleEnd}>End</button>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16, alignItems: "start" }}>
        {/* Left: Topic selector */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 19, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
            Topic
          </div>
          {TOPIC_LABELS.map((t, i) => {
            const isActive = i === currentTopicIdx;
            const isDone = i < currentTopicIdx;
            return (
              <button key={t.id}
                onClick={() => setCurrentTopicIdx(i)}
                style={{
                  background: isActive ? "rgba(59,130,246,0.15)" : "var(--surface)",
                  border: `2px solid ${isActive ? "var(--blue)" : isDone ? "rgba(16,185,129,0.3)" : "var(--border)"}`,
                  borderRadius: "var(--radius)", padding: "10px 14px",
                  cursor: "pointer", textAlign: "left", fontFamily: "var(--font)",
                }}>
                <div style={{ fontWeight: 700, fontSize: 20, color: isActive ? "var(--blue)" : isDone ? "var(--green)" : "var(--text)" }}>
                  {isDone ? " " : isActive ? " " : `${i+1}. `}{t.label}
                </div>
                <div style={{ fontSize: 20, color: "var(--text3)", marginTop: 2 }}>{t.description}</div>
              </button>
            );
          })}

          <button className="btn btn-primary" style={{ marginTop: 8 }}
            onClick={handleGenerate}
            disabled={session.status === "question"}>
            Generate Question
          </button>

          {session.status === "waiting" && (
            <div style={{ fontSize: 19, color: "var(--text3)", textAlign: "center", marginTop: 8 }}>
              Select a topic and generate the first question.
            </div>
          )}
        </div>

        {/* Right: Question + answers */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {session.status === "waiting" && (
            <div className="card" style={{ textAlign: "center", padding: "48px 20px" }}>
              <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Waiting for students</h3>
              <p style={{ color: "var(--text2)", fontSize: 19 }}>
                Code: <strong style={{ color: "var(--blue)", fontFamily: "var(--mono)", fontSize: 20 }}>{session.joinCode}</strong>
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 16 }}>
                {Object.values(participants).map(p => (
                  <div key={p.name} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "6px 14px", fontSize: 20, fontWeight: 600 }}>
                    {p.name}
                  </div>
                ))}
              </div>
            </div>
          )}

          {question && (session.status === "question" || session.status === "revealing") && (
            <>
              <div className="card">
                <div style={{ fontSize: 19, color: "var(--text3)", marginBottom: 8 }}>
                  {TOPIC_LABELS.find(t => t.id === question.type)?.label} - {submittedCount}/{totalStudents} submitted - {correctCount} correct
                </div>
                <div style={{ marginBottom: 12 }}>
                  {question.type === "algebraic"
                    ? <AlgebraicDisplay prompt={question.prompt} />
                    : <div style={{ fontSize: question.prompt.length > 80 ? 16 : 22, fontWeight: 800, color: "var(--text)", lineHeight: 1.5 }}>{question.prompt}</div>
                  }
                </div>
                {session.status === "question" && session.timerEndsAt && (
                  <TimerBar endsAt={session.timerEndsAt} totalSeconds={session.timerSeconds} onExpired={handleTimerExpired} />
                )}
                {session.status === "revealing" && (
                  <>
                    <div style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "var(--radius-sm)", padding: "10px 14px", marginBottom: 8 }}>
                      <div style={{ fontSize: 20, color: "var(--text3)", marginBottom: 4 }}>Correct answer</div>
                      <div style={{ fontSize: 28, fontWeight: 800, color: "var(--green)", fontFamily: "var(--mono)" }}>{question.answer}</div>
                    </div>
                    <WorkDisplay question={question} />
                  </>
                )}
                <div style={{ height: 6, background: "var(--surface2)", borderRadius: 99, overflow: "hidden", marginTop: 12 }}>
                  <div style={{ height: "100%", width: `${totalStudents > 0 ? (submittedCount / totalStudents) * 100 : 0}%`, background: "var(--blue)", borderRadius: 99, transition: "width 0.3s" }} />
                </div>
              </div>

              <div className="card">
                <h3 style={{ fontSize: 19, fontWeight: 700, marginBottom: 12 }}>Student Answers</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 300, overflowY: "auto" }}>
                  {Object.entries(participants).map(([pUid, p]) => {
                    const ans = answers.find(a => a.uid === pUid);
                    const hasSubmitted = ans !== undefined && ans.answer !== undefined && ans.answer !== null && ans.answer !== "";
                    const isCorrect = hasSubmitted && gradeRatioAnswer(ans.answer, question);
                    return (
                      <div key={pUid} style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "8px 12px",
                        border: `1px solid ${hasSubmitted ? (isCorrect ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)") : "var(--border)"}`,
                      }}>
                        <span style={{ fontWeight: 600, fontSize: 20 }}>{p.name}</span>
                        {hasSubmitted ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            {session.status === "revealing" && (
                              <span style={{ fontFamily: "var(--mono)", fontSize: 20, color: "var(--text2)" }}>{ans.answer}</span>
                            )}
                            <span style={{ fontWeight: 700, color: isCorrect ? "var(--green)" : "var(--red)" }}>
                              {isCorrect ? `+${POINTS_PER_QUESTION}` : "X"}
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontSize: 19, color: "var(--text3)" }}>thinking...</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {session.status === "ended" && (
            <div className="card" style={{ textAlign: "center", padding: 32 }}>
              <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Session Complete</h3>
              <p style={{ color: "var(--text2)" }}>{session.questionCount || 0} questions - {totalStudents} students</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

//  Student View 
function StudentRatio({ session, sessionId, uid }) {
  const [input, setInput] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [lastQId, setLastQId] = useState(null);
  const inputRef = useRef(null);

  const question = session.currentQuestion;
  const participants = session.participants || {};
  const myScore = participants[uid]?.totalScore || 0;

  useEffect(() => {
    if (question?.id && question.id !== lastQId) {
      setInput(""); setSubmitted(false); setResult(null);
      setLastQId(question.id);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [question?.id]);

  const handleSubmit = async () => {
    if (!question || submitted || !input.trim()) return;
    const ans = input.trim();
    const correct = gradeRatioAnswer(ans, question);
    await setDoc(doc(db, "sessions", sessionId, "answers", `${uid}_${question.id}`), {
      uid, questionId: question.id, answer: ans, correct, submittedAt: Date.now(),
    });
    if (correct) await addToScore(sessionId, uid, POINTS_PER_QUESTION);
    setResult({ correct, answer: ans });
    setSubmitted(true);
  };

  const getPlaceholder = () => {
    if (!question) return "Type your answer";
    switch (question.type) {
      case "simplify": return "e.g. 3:4";
      case "proportion": return "e.g. 12";
      case "algebraic": return "e.g. 5 or 3/2";
      case "write-proportion": return "e.g. 2:5 = x:15";
      case "solve-word": return "e.g. 6";
      default: return "Type your answer";
    }
  };

  const getFormatHint = () => {
    if (!question) return "";
    switch (question.type) {
      case "simplify": return "Write as a:b in lowest terms";
      case "proportion": return "Write just the number";
      case "algebraic": return "Write x = number or fraction (e.g. 3/2)";
      case "write-proportion": return "Write as a:b = c:d using x for the unknown";
      case "solve-word": return "Write just the number";
      default: return "";
    }
  };

  if (session.status === "waiting") return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Waiting for the teacher...</h2>
      <p style={{ color: "var(--text2)" }}>Ratios and Proportions session is about to begin!</p>
    </div>
  );

  if (session.status === "ended") return (
    <div className="card" style={{ maxWidth: 500, margin: "0 auto", textAlign: "center", padding: "40px 20px" }}>
      <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Session Complete!</h2>
      <div style={{ fontSize: 28, fontWeight: 900, color: "var(--blue)" }}>{myScore} pts</div>
    </div>
  );

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 20, color: "var(--text3)" }}>
          {question ? (TOPIC_LABELS.find(t => t.id === question.type)?.label || "") : ""}
        </div>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "6px 14px", fontSize: 20, fontWeight: 700 }}>
          Score: {myScore} pts
        </div>
      </div>

      <div className="card" key={question?.id}>
        {session.status === "question" && session.timerEndsAt && !submitted && (
          <TimerBar endsAt={session.timerEndsAt} totalSeconds={session.timerSeconds} />
        )}

        {question && (
          <div style={{ marginBottom: 20 }}>
            {question.type === "algebraic"
              ? <AlgebraicDisplay prompt={question.prompt} />
              : <div style={{ fontSize: question.prompt.length > 100 ? 15 : 20, fontWeight: 700, color: "var(--text)", lineHeight: 1.6 }}>{question.prompt}</div>
            }
          </div>
        )}

        {session.status === "revealing" ? (
          <div style={{ textAlign: "center", animation: "fadeUp 0.3s ease" }}>
            {result ? (
              <>
                <div style={{ fontSize: 22, fontWeight: 800, color: result.correct ? "var(--green)" : "var(--red)", marginBottom: 8 }}>
                  {result.correct ? `Correct! +${POINTS_PER_QUESTION} pts` : "Incorrect"}
                </div>
                <div style={{ fontSize: 20, color: "var(--text2)", marginBottom: 4 }}>
                  Your answer: <strong style={{ fontFamily: "var(--mono)" }}>{result.answer}</strong>
                </div>
                {!result.correct && (
                  <div style={{ fontSize: 19, color: "var(--green)", marginBottom: 8 }}>
                    Correct: <strong style={{ fontFamily: "var(--mono)" }}>{question?.answer}</strong>
                  </div>
                )}
              </>
            ) : (
              <div style={{ marginBottom: 12 }}>
                <div style={{ color: "var(--text3)", marginBottom: 4 }}>No answer submitted.</div>
                <div style={{ color: "var(--green)" }}>Correct: <strong>{question?.answer}</strong></div>
              </div>
            )}
            {question && <WorkDisplay question={question} />}
          </div>
        ) : submitted ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--green)", marginBottom: 4 }}>Submitted!</div>
            <div style={{ fontSize: 20, color: "var(--text3)" }}>Waiting for teacher to reveal...</div>
          </div>
        ) : (
          <>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              placeholder={getPlaceholder()}
              style={{ fontSize: 22, fontFamily: "var(--mono)", textAlign: "center", padding: "14px", marginBottom: 8 }}
            />
            <div style={{ fontSize: 19, color: "var(--text3)", textAlign: "center", marginBottom: 12 }}>
              {getFormatHint()}
            </div>
            <button className="btn btn-primary" style={{ width: "100%", fontSize: 20, padding: "14px" }}
              onMouseDown={e => e.preventDefault()}
              onClick={handleSubmit}
              disabled={!input.trim()}>
              Submit
            </button>
          </>
        )}
      </div>
    </div>
  );
}

//  Create Session 
function CreateRatioSession({ user, onCreated }) {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [timer, setTimer] = useState(90);
  const [loading, setLoading] = useState(false);

  useEffect(() => { getTeacherClasses(user.id).then(setClasses); }, []);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const { sessionId, joinCode } = await createClassworkSession(user.id, selectedClass, timer);
      // Update type to ratio
      await updateDoc(doc(db, "sessions", sessionId), { type: "ratio" });
      onCreated(sessionId);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 480, margin: "0 auto" }}>
      <div className="card">
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Ratios and Proportions Session</h2>
        <p style={{ color: "var(--text2)", fontSize: 20, marginBottom: 20 }}>
          5 topic types: simplify ratios, solve proportions, algebraic proportions, write proportions from word problems, and solve proportion word problems.
        </p>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 20, fontWeight: 600, color: "var(--text2)", display: "block", marginBottom: 6 }}>Class</label>
          <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} style={{ width: "100%", padding: "10px 12px", fontSize: 20 }}>
            <option value="">Select a class...</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 20, fontWeight: 600, color: "var(--text2)", display: "block", marginBottom: 6 }}>Default time per question (seconds)</label>
          <input type="number" min={30} max={300} value={timer}
            onChange={e => setTimer(Number(e.target.value))}
            style={{ width: "100%", padding: "10px 12px", fontSize: 20 }} />
        </div>
        <button className="btn btn-primary btn-lg" style={{ width: "100%" }}
          onClick={handleCreate} disabled={loading || !selectedClass}>
          {loading ? "Creating..." : "Start Session"}
        </button>
      </div>
    </div>
  );
}

//  Main Export 
export default function RatioSession({ user, onHome }) {
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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,var(--blue),var(--cyan))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "#fff" }}>R:P</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 20 }}>GCA</div>
              <div style={{ color: "var(--text3)", fontSize: 19 }}>Ratios and Proportions</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onHome}>Back to Home</button>
        </div>

        {view === "create" && <CreateRatioSession user={user} onCreated={(sid) => { setSessionId(sid); setView("session"); }} />}
        {view === "session" && session && (
          user.role === "teacher"
            ? <TeacherRatio session={session} sessionId={sessionId} uid={user.id} />
            : <StudentRatio session={session} sessionId={sessionId} uid={user.id} />
        )}
        {view === "session" && !session && (
          <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><div className="spinner" /></div>
        )}
      </div>
    </div>
  );
}

export { TeacherRatio as RatioTeacherView, StudentRatio as RatioStudentView };

