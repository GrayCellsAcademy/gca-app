import { useState, useEffect, useRef } from "react";
import { setDoc, doc, updateDoc, increment } from "firebase/firestore";
import {
  createClassworkSession, joinSession, pushGeneratedQuestion,
  revealGeneratedQuestion, endSession, onSessionChange,
  onClassworkAnswersChange, getTeacherClasses, db,
} from "./core/firebase";
import { genLevel1Problem, genLevel2Problem, genLevel3Problem, getAnswer } from "./columnAddition";
import { genSubtractionProblem } from "./columnSubtraction";

// ─── Topic Definitions ────────────────────────────────────────────
const TOPICS = [
  {
    id: "add-no-carry",
    label: "Column Addition",
    sublabel: "No Carrying",
    icon: "➕",
    color: "#3b82f6",
    group: "addition",
  },
  {
    id: "add-carry",
    label: "Column Addition",
    sublabel: "With Carrying",
    icon: "➕",
    color: "#6366f1",
    group: "addition",
  },
  {
    id: "add-multi",
    label: "Column Addition",
    sublabel: "Multiple Numbers",
    icon: "➕",
    color: "#8b5cf6",
    group: "addition",
  },
  {
    id: "sub-no-borrow",
    label: "Column Subtraction",
    sublabel: "No Borrowing",
    icon: "➖",
    color: "#10b981",
    group: "subtraction",
  },
  {
    id: "sub-borrow",
    label: "Column Subtraction",
    sublabel: "With Borrowing",
    icon: "➖",
    color: "#f59e0b",
    group: "subtraction",
  },
  {
    id: "sub-borrow-zero",
    label: "Column Subtraction",
    sublabel: "Borrowing from Zero",
    icon: "➖",
    color: "#ef4444",
    group: "subtraction",
  },
];

// ─── Problem Generator ────────────────────────────────────────────
function generateProblem(topicId) {
  switch (topicId) {
    case "add-no-carry": {
      // Mix of 2d+2d and 3d+3d
      const use3 = Math.random() > 0.5;
      const prob = genLevel1Problem(use3 ? 3 : 2);
      return {
        topic: topicId,
        type: "addition",
        numbers: prob.numbers,
        answer: getAnswer(prob.numbers),
      };
    }
    case "add-carry": {
      const use4 = Math.random() > 0.5;
      const prob = genLevel2Problem(use4 ? 4 : 3);
      return {
        topic: topicId,
        type: "addition",
        numbers: prob.numbers,
        answer: getAnswer(prob.numbers),
      };
    }
    case "add-multi": {
      const prob = genLevel3Problem();
      return {
        topic: topicId,
        type: "addition",
        numbers: prob.numbers,
        answer: getAnswer(prob.numbers),
      };
    }
    case "sub-no-borrow": {
      const r = Math.random();
      const variant = r < 0.33 ? "sub-no-borrow-2d" : r < 0.66 ? "sub-no-borrow-3d2" : "sub-no-borrow-3d";
      const prob = genSubtractionProblem(variant);
      return { topic: topicId, type: "subtraction", top: prob.top, bot: prob.bot, answer: prob.answer };
    }
    case "sub-borrow": {
      const r = Math.random();
      const variant = r < 0.33 ? "sub-borrow-3d" : r < 0.66 ? "sub-borrow-4d3" : "sub-borrow-4d";
      const prob = genSubtractionProblem(variant);
      return { topic: topicId, type: "subtraction", top: prob.top, bot: prob.bot, answer: prob.answer };
    }
    case "sub-borrow-zero": {
      const r = Math.random();
      const variant = r < 0.33 ? "sub-borrow-zero-3d" : r < 0.66 ? "sub-borrow-zero-4d" : "sub-borrow-zero-5d";
      const prob = genSubtractionProblem(variant);
      return { topic: topicId, type: "subtraction", top: prob.top, bot: prob.bot, answer: prob.answer };
    }
    default: return null;
  }
}

// ─── Column Problem Display ───────────────────────────────────────
function ProblemDisplay({ question, showAnswer = false }) {
  if (!question) return null;
  const isAddition = question.type === "addition";
  const numbers = isAddition ? question.numbers : [question.top, question.bot];
  const maxLen = Math.max(...numbers.map(n => String(n).length));
  const padded = numbers.map(n => String(n).padStart(maxLen, " "));

  return (
    <div style={{ display: "inline-block", background: "var(--bg2)", borderRadius: "var(--radius)", padding: "20px 32px", fontFamily: "var(--mono)" }}>
      {padded.map((row, ri) => (
        <div key={ri} style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
          <div style={{ width: 28, textAlign: "right", fontSize: 26, color: "var(--text3)", paddingRight: 4 }}>
            {ri === padded.length - 1 ? (isAddition ? "+" : "−") : ""}
          </div>
          {row.split("").map((ch, ci) => (
            <div key={ci} style={{ width: 38, height: 46, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 700, color: "var(--text)" }}>
              {ch === " " ? "" : ch}
            </div>
          ))}
        </div>
      ))}
      <div style={{ borderTop: "2.5px solid var(--text2)", margin: "6px 0 6px 32px" }} />
      {showAnswer && (
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <div style={{ width: 28 }} />
          {String(question.answer).padStart(maxLen, " ").split("").map((ch, ci) => (
            <div key={ci} style={{ width: 38, height: 46, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 800, color: "var(--green)" }}>
              {ch === " " ? "" : ch}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Bar Chart of Answers ─────────────────────────────────────────
function AnswerBarChart({ answers, correctAnswer, participants }) {
  const totalStudents = Object.keys(participants).length;
  if (!answers.length) return (
    <div style={{ textAlign: "center", color: "var(--text3)", padding: "20px 0" }}>No answers yet</div>
  );

  // Group by answer value
  const counts = {};
  answers.forEach(a => {
    counts[a.answer] = (counts[a.answer] || 0) + 1;
  });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...sorted.map(([, c]) => c));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 4 }}>
        {answers.length} of {totalStudents} submitted
      </div>
      {sorted.map(([ans, count]) => {
        const isCorrect = String(ans) === String(correctAnswer);
        const pct = Math.round((count / Math.max(totalStudents, 1)) * 100);
        return (
          <div key={ans} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 70, textAlign: "right", fontFamily: "var(--mono)", fontWeight: 700, fontSize: 18, color: isCorrect ? "var(--green)" : "var(--text)" }}>
              {ans}
            </div>
            <div style={{ flex: 1, height: 36, background: "var(--surface2)", borderRadius: "var(--radius-sm)", overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${(count / max) * 100}%`,
                background: isCorrect ? "var(--green)" : "rgba(239,68,68,0.6)",
                borderRadius: "var(--radius-sm)",
                transition: "width 0.4s ease",
                display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 10,
              }}>
                <span style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>{count}</span>
              </div>
            </div>
            <div style={{ width: 40, textAlign: "right", fontSize: 13, color: "var(--text3)" }}>{pct}%</div>
            {isCorrect && <span style={{ color: "var(--green)", fontSize: 16 }}>✓</span>}
          </div>
        );
      })}
    </div>
  );
}

// ─── Timer Bar ────────────────────────────────────────────────────
function TimerBar({ endsAt, totalSeconds }) {
  const [remaining, setRemaining] = useState(totalSeconds);
  useEffect(() => {
    const tick = () => setRemaining(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [endsAt]);
  const pct = endsAt ? Math.max(0, (remaining / totalSeconds) * 100) : 100;
  const color = remaining <= 5 ? "var(--red)" : remaining <= 10 ? "var(--amber)" : "var(--green)";
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text3)", marginBottom: 6 }}>
        <span>Time remaining</span>
        <span style={{ fontWeight: 700, color, fontSize: 18 }}>{remaining}s</span>
      </div>
      <div style={{ height: 8, background: "var(--surface2)", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 99, transition: "width 0.5s linear" }} />
      </div>
    </div>
  );
}

// ─── Teacher View ─────────────────────────────────────────────────
function TeacherClasswork({ session, sessionId, uid }) {
  const [answers, setAnswers] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [timerInput, setTimerInput] = useState(60);
  const [generating, setGenerating] = useState(false);

  const question = session.currentQuestion;
  const participants = session.participants || {};
  const totalStudents = Object.keys(participants).length;
  const topic = TOPICS.find(t => t.id === session.currentTopic);

  // Listen to answers for current question
  useEffect(() => {
    if (!question?.id) return;
    setAnswers([]);
    const unsub = onClassworkAnswersChange(sessionId, question.id, setAnswers);
    return () => unsub();
  }, [question?.id]);

  const handleGenerate = async () => {
    if (!selectedTopic) return;
    setGenerating(true);
    const prob = generateProblem(selectedTopic);
    await pushGeneratedQuestion(sessionId, prob, timerInput);
    setGenerating(false);
  };

  const handleReveal = async () => {
    await revealGeneratedQuestion(sessionId);
  };

  const handleEnd = async () => {
    if (confirm("End the session for all students?")) await endSession(sessionId);
  };

  const correctCount = answers.filter(a => String(a.answer) === String(question?.answer)).length;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      {/* Session header */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 2 }}>Join Code</div>
            <div style={{ fontSize: 36, fontWeight: 900, fontFamily: "var(--mono)", color: "var(--blue)", letterSpacing: "0.15em" }}>
              {session.joinCode}
            </div>
            <div style={{ fontSize: 13, color: "var(--text3)", marginTop: 2 }}>
              {totalStudents} student{totalStudents !== 1 ? "s" : ""} joined
              {session.questionCount > 0 && ` · ${session.questionCount} question${session.questionCount !== 1 ? "s" : ""} pushed`}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <label style={{ fontSize: 13, color: "var(--text2)" }}>Timer (seconds):</label>
              <input type="number" min={10} max={300} value={timerInput}
                onChange={e => setTimerInput(Number(e.target.value))}
                style={{ width: 70, padding: "6px 10px", fontSize: 14, textAlign: "center" }} />
            </div>
            {session.status === "question" && (
              <button className="btn btn-ghost" onClick={handleReveal}>📊 Reveal Answers</button>
            )}
            <button className="btn btn-ghost" style={{ color: "var(--red)" }} onClick={handleEnd}>End Session</button>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 16, alignItems: "start" }}>

        {/* Left: Topic selector + generate button */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text2)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Select Topic
          </div>
          {TOPICS.map(t => (
            <button key={t.id} onClick={() => setSelectedTopic(t.id)}
              style={{
                background: selectedTopic === t.id ? `${t.color}22` : "var(--surface)",
                border: `2px solid ${selectedTopic === t.id ? t.color : "var(--border)"}`,
                borderRadius: "var(--radius)", padding: "12px 16px", cursor: "pointer",
                textAlign: "left", transition: "all 0.15s", fontFamily: "var(--font)",
              }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20 }}>{t.icon}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: selectedTopic === t.id ? t.color : "var(--text)" }}>
                    {t.label}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text3)" }}>{t.sublabel}</div>
                </div>
              </div>
            </button>
          ))}

          <button className="btn btn-primary btn-lg"
            onClick={handleGenerate}
            disabled={!selectedTopic || generating}
            style={{ marginTop: 8, opacity: !selectedTopic ? 0.5 : 1 }}>
            {generating ? "Generating…" : "⚡ Generate Question"}
          </button>

          {/* Waiting state */}
          {session.status === "waiting" && (
            <div style={{ textAlign: "center", padding: "16px 0", color: "var(--text3)", fontSize: 13 }}>
              Select a topic and generate your first question to begin.
            </div>
          )}
        </div>

        {/* Right: Current question + answers */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Waiting */}
          {session.status === "waiting" && (
            <div className="card" style={{ textAlign: "center", padding: "48px 20px" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>⏳</div>
              <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Waiting for students</h3>
              <p style={{ color: "var(--text2)", fontSize: 15 }}>
                Tell students to join with code <strong style={{ color: "var(--blue)", fontFamily: "var(--mono)", fontSize: 20 }}>{session.joinCode}</strong>
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 16 }}>
                {Object.values(participants).map(p => (
                  <div key={p.name} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "6px 14px", fontSize: 14, fontWeight: 600 }}>
                    {p.name}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active question */}
          {question && (session.status === "question" || session.status === "revealing") && (
            <>
              <div className="card">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 4 }}>
                      Question #{session.questionCount} · {topic?.label} — {topic?.sublabel}
                    </div>
                    <div style={{ fontSize: 14, color: "var(--text2)" }}>
                      {answers.length}/{totalStudents} submitted · {correctCount} correct
                    </div>
                  </div>
                  {session.status === "question" && session.timerEndsAt && (
                    <div style={{ minWidth: 200 }}>
                      <TimerBar endsAt={session.timerEndsAt} totalSeconds={session.timerSeconds} />
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
                  <ProblemDisplay question={question} showAnswer={session.status === "revealing"} />
                </div>

                {/* Submission progress */}
                <div style={{ height: 6, background: "var(--surface2)", borderRadius: 99, overflow: "hidden", marginBottom: 8 }}>
                  <div style={{ height: "100%", width: `${totalStudents > 0 ? (answers.length / totalStudents) * 100 : 0}%`, background: "var(--blue)", borderRadius: 99, transition: "width 0.3s" }} />
                </div>
              </div>

              {/* Teacher breakdown — each student's answer */}
              <div className="card">
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Student Answers</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 260, overflowY: "auto" }}>
                  {Object.entries(participants).map(([pUid, p]) => {
                    const ans = answers.find(a => a.uid === pUid);
                    const isCorrect = ans && String(ans.answer) === String(question.answer);
                    return (
                      <div key={pUid} style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "8px 12px",
                        border: `1px solid ${ans ? (isCorrect ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)") : "var(--border)"}`,
                      }}>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</span>
                        {ans ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ fontFamily: "var(--mono)", fontSize: 15, color: "var(--text2)" }}>{ans.answer}</span>
                            <span style={{ fontWeight: 700, color: isCorrect ? "var(--green)" : "var(--red)" }}>
                              {isCorrect ? "✓" : "✗"}
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, color: "var(--text3)" }}>thinking…</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Bar chart — shown after reveal */}
          {session.status === "revealing" && question && (
            <div className="card">
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Answer Distribution</h3>
              <AnswerBarChart answers={answers} correctAnswer={question.answer} participants={participants} />
            </div>
          )}
        </div>
      </div>

      {/* Session ended */}
      {session.status === "ended" && (
        <div className="card" style={{ textAlign: "center", padding: "40px 20px", marginTop: 16 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
          <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Session Complete</h3>
          <p style={{ color: "var(--text2)" }}>{session.questionCount} questions pushed · {totalStudents} students participated</p>
        </div>
      )}
    </div>
  );
}

// ─── Student View ─────────────────────────────────────────────────
function StudentClasswork({ session, sessionId, uid }) {
  const [input, setInput] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [lastQuestionId, setLastQuestionId] = useState(null);
  const inputRef = useRef(null);

  const question = session.currentQuestion;
  const participants = session.participants || {};
  const myCorrect = participants[uid]?.totalScore || 0;

  // Reset when new question arrives
  useEffect(() => {
    if (question?.id && question.id !== lastQuestionId) {
      setInput("");
      setSubmitted(false);
      setResult(null);
      setLastQuestionId(question.id);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [question?.id]);

  const handleSubmit = async () => {
    if (!question || submitted || !input.trim()) return;
    const ans = parseInt(input.trim(), 10);
    if (isNaN(ans)) return;
    const correct = ans === question.answer;
    await setDoc(doc(db, "sessions", sessionId, "answers", `${uid}_${question.id}`), {
      uid, questionId: question.id, answer: ans, correct, submittedAt: Date.now(),
    });
    if (correct) {
      await updateDoc(doc(db, "sessions", sessionId), {
        [`participants.${uid}.totalScore`]: increment(1),
      });
    }
    setResult({ correct, answer: ans });
    setSubmitted(true);
  };

  // Waiting
  if (session.status === "waiting") return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
      <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Waiting for teacher…</h2>
      <p style={{ color: "var(--text2)", fontSize: 15 }}>Get ready — your teacher will push the first question soon.</p>
    </div>
  );

  // Ended
  if (session.status === "ended") return (
    <div className="card" style={{ maxWidth: 500, margin: "0 auto", textAlign: "center", padding: "40px 20px" }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
      <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Session Complete!</h2>
      <div style={{ fontSize: 28, fontWeight: 900, color: "var(--blue)", marginBottom: 4 }}>
        {myCorrect} / {session.questionCount} correct
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 560, margin: "0 auto" }}>
      {/* Score */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: "var(--text3)" }}>Question #{session.questionCount}</div>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "6px 14px", fontSize: 14, fontWeight: 700 }}>
          ✓ {myCorrect} correct
        </div>
      </div>

      <div className="card">
        {/* Timer */}
        {session.status === "question" && session.timerEndsAt && !submitted && (
          <TimerBar endsAt={session.timerEndsAt} totalSeconds={session.timerSeconds} />
        )}

        {/* Problem */}
        {question && (
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
            <ProblemDisplay question={question} showAnswer={false} />
          </div>
        )}

        {/* After reveal */}
        {session.status === "revealing" ? (
          <div style={{ animation: "fadeUp 0.3s ease" }}>
            {result ? (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 48, marginBottom: 8 }}>{result.correct ? "🎉" : "😔"}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: result.correct ? "var(--green)" : "var(--red)", marginBottom: 8 }}>
                  {result.correct ? "Correct!" : "Not quite"}
                </div>
                {!result.correct && (
                  <div style={{ fontSize: 15, color: "var(--text2)" }}>
                    Answer: <strong style={{ color: "var(--green)", fontFamily: "var(--mono)", fontSize: 20 }}>{question?.answer}</strong>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>⏰</div>
                <div style={{ color: "var(--text3)" }}>You didn't submit.</div>
                <div style={{ marginTop: 8, color: "var(--green)", fontSize: 15 }}>
                  Answer: <strong style={{ fontFamily: "var(--mono)" }}>{question?.answer}</strong>
                </div>
              </div>
            )}
          </div>
        ) : submitted ? (
          <div style={{ textAlign: "center", animation: "popIn 0.3s ease" }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--green)" }}>Answer submitted!</div>
            <div style={{ fontSize: 13, color: "var(--text3)", marginTop: 4 }}>Waiting for others…</div>
          </div>
        ) : (
          <>
            <p style={{ textAlign: "center", fontSize: 16, fontWeight: 600, color: "var(--text2)", marginBottom: 14 }}>
              What is the answer?
            </p>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value.replace(/\D/g, ""))}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              inputMode="numeric"
              placeholder="?"
              style={{ textAlign: "center", fontSize: 32, fontFamily: "var(--mono)", fontWeight: 700, padding: "12px", marginBottom: 12 }}
            />
            <button className="btn btn-primary" style={{ width: "100%", fontSize: 18, padding: "14px" }}
              onMouseDown={e => { e.preventDefault(); handleSubmit(); }}
              onTouchEnd={e => { e.preventDefault(); handleSubmit(); }}>
              Submit ✓
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Create Classwork Session Screen ──────────────────────────────
function CreateClassworkSession({ user, onCreated }) {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [timer, setTimer] = useState(60);
  const [loading, setLoading] = useState(false);

  useEffect(() => { getTeacherClasses(user.id).then(setClasses); }, []);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const { sessionId, joinCode } = await createClassworkSession(user.id, selectedClass, timer);
      onCreated(sessionId, joinCode);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 480, margin: "0 auto" }}>
      <div className="card">
        <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Start a Classwork Session</h2>
        <p style={{ color: "var(--text2)", fontSize: 14, marginBottom: 20 }}>
          Push column addition and subtraction problems to your students in real time.
        </p>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text2)", display: "block", marginBottom: 6 }}>Class</label>
          <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} style={{ width: "100%", padding: "10px 12px", fontSize: 14 }}>
            <option value="">Select a class…</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text2)", display: "block", marginBottom: 6 }}>Default timer per question (seconds)</label>
          <input type="number" min={10} max={300} value={timer}
            onChange={e => setTimer(Number(e.target.value))}
            style={{ width: "100%", padding: "10px 12px", fontSize: 14 }} />
        </div>
        <div style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "12px 14px", marginBottom: 20, fontSize: 13, color: "var(--text2)" }}>
          <strong>6 topics available:</strong> Column Addition (no carry, carry, multiple numbers) · Column Subtraction (no borrow, borrow, borrow from zero)
        </div>
        <button className="btn btn-primary btn-lg" style={{ width: "100%" }}
          onClick={handleCreate} disabled={loading || !selectedClass}>
          {loading ? "Creating…" : "Start Session 🚀"}
        </button>
      </div>
    </div>
  );
}

// ─── Main ClassworkSession Export ─────────────────────────────────
export default function ClassworkSession({ user, onHome }) {
  const [view, setView] = useState("create");
  const [sessionId, setSessionId] = useState(null);
  const [session, setSession] = useState(null);

  useEffect(() => {
    if (!sessionId) return;
    const unsub = onSessionChange(sessionId, setSession);
    return () => unsub();
  }, [sessionId]);

  const handleCreated = (sid) => { setSessionId(sid); setView("session"); };
  const handleJoined = (sid) => { setSessionId(sid); setView("session"); };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "clamp(16px,3vw,32px)" }} className="dot-bg">
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,var(--blue),var(--cyan))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>📋</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 20 }}>GCA</div>
              <div style={{ color: "var(--text3)", fontSize: 12 }}>Classwork Session</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onHome}>← Home</button>
        </div>

        {view === "create" && user.role === "teacher" && (
          <CreateClassworkSession user={user} onCreated={handleCreated} />
        )}
        {view === "session" && session && (
          user.role === "teacher"
            ? <TeacherClasswork session={session} sessionId={sessionId} uid={user.id} />
            : <StudentClasswork session={session} sessionId={sessionId} uid={user.id} />
        )}
        {view === "session" && !session && (
          <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><div className="spinner" /></div>
        )}
      </div>
    </div>
  );
}
