import { useState, useEffect, useRef } from "react";
import { setDoc, doc, updateDoc, increment } from "firebase/firestore";
import {
  createSession, joinSession, startQuestion, revealQuestion, endSession,
  addToScore, onSessionChange, onAnswersChange, getTeacherClasses, db,
} from "./core/firebase";
import { WORKSHEET_QUESTIONS, TOTAL_POINTS, gradeDecimalAnswer } from "./worksheetQuestions";

// ─── Helpers ──────────────────────────────────────────────────────
function medalEmoji(rank) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
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

// ─── Leaderboard ──────────────────────────────────────────────────
function Leaderboard({ participants, currentUid, isEnded }) {
  const sorted = Object.entries(participants)
    .map(([uid, p]) => ({ uid, ...p }))
    .sort((a, b) => b.totalScore - a.totalScore);
  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12, textAlign: "center" }}>
        {isEnded ? "🏆 Final Scores" : "📊 Leaderboard"}
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {sorted.map((p, i) => {
          const isMe = p.uid === currentUid;
          const pct = Math.round((p.totalScore / TOTAL_POINTS) * 100);
          return (
            <div key={p.uid} style={{
              display: "flex", alignItems: "center", gap: 14,
              background: isMe ? "rgba(59,130,246,0.15)" : "var(--surface)",
              border: `1px solid ${isMe ? "var(--blue)" : "var(--border)"}`,
              borderRadius: "var(--radius)", padding: "12px 16px",
            }}>
              <div style={{ width: 36, textAlign: "center", fontSize: i < 3 ? 22 : 15, fontWeight: 800 }}>
                {medalEmoji(i + 1)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>{p.name}{isMe ? " (you)" : ""}</div>
                <div style={{ fontSize: 12, color: "var(--text3)" }}>{pct}%</div>
              </div>
              <div style={{ fontWeight: 800, fontSize: 20 }}>{p.totalScore}<span style={{ fontSize: 12, color: "var(--text3)", fontWeight: 400 }}> pts</span></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Teacher View ─────────────────────────────────────────────────
function TeacherWorksheet({ session, sessionId, uid }) {
  const [answers, setAnswers] = useState([]);
  const [timerInput, setTimerInput] = useState(90);

  const qIdx = session.currentQuestion >= 0 ? session.currentQuestion : null;
  const question = qIdx !== null ? WORKSHEET_QUESTIONS[qIdx] : null;
  const participants = session.participants || {};
  const totalStudents = Object.keys(participants).length;

  useEffect(() => {
    if (qIdx === null) return;
    setAnswers([]);
    const unsub = onAnswersChange(sessionId, qIdx, setAnswers);
    return () => unsub();
  }, [qIdx]);

  const handleStart = async () => {
    await startQuestion(sessionId, 0, timerInput);
  };
  const handleNext = async () => {
    const next = (qIdx ?? -1) + 1;
    if (next >= WORKSHEET_QUESTIONS.length) await endSession(sessionId);
    else await startQuestion(sessionId, next, timerInput);
  };
  const handleReveal = async () => {
    // Award points for correct answers
    for (const ans of answers) {
      const correct = gradeDecimalAnswer(ans.answer, question);
      if (correct && ans.answer !== undefined) {
        await addToScore(sessionId, ans.uid, question.points);
      }
    }
    await revealQuestion(sessionId);
  };
  const handleEnd = async () => {
    if (confirm("End the session?")) await endSession(sessionId);
  };

  const submittedCount = answers.length;
  const correctCount = answers.filter(a => gradeDecimalAnswer(a.answer, question)).length;

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      {/* Header */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 2 }}>Join Code</div>
            <div style={{ fontSize: 36, fontWeight: 900, fontFamily: "var(--mono)", color: "var(--blue)", letterSpacing: "0.15em" }}>{session.joinCode}</div>
            <div style={{ fontSize: 13, color: "var(--text3)", marginTop: 2 }}>{totalStudents} student{totalStudents !== 1 ? "s" : ""} joined</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <label style={{ fontSize: 13, color: "var(--text2)" }}>Seconds:</label>
              <input type="number" min={10} max={300} value={timerInput}
                onChange={e => setTimerInput(Number(e.target.value))}
                style={{ width: 70, padding: "6px 10px", fontSize: 14, textAlign: "center" }} />
            </div>
            {session.status === "waiting" && (
              <button className="btn btn-primary" onClick={handleStart} disabled={totalStudents === 0}>▶ Start</button>
            )}
            {session.status === "question" && (
              <button className="btn btn-ghost" onClick={handleReveal}>📊 Reveal</button>
            )}
            {session.status === "revealing" && (
              <button className="btn btn-primary" onClick={handleNext}>
                {(qIdx ?? -1) + 1 >= WORKSHEET_QUESTIONS.length ? "End Session" : "Next Question →"}
              </button>
            )}
            <button className="btn btn-ghost" style={{ color: "var(--red)" }} onClick={handleEnd}>End</button>
          </div>
        </div>
      </div>

      {/* Waiting */}
      {session.status === "waiting" && (
        <div className="card" style={{ textAlign: "center", padding: "48px 20px" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>⏳</div>
          <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Waiting for students</h3>
          <p style={{ color: "var(--text2)", fontSize: 15 }}>
            Join code: <strong style={{ color: "var(--blue)", fontFamily: "var(--mono)", fontSize: 20 }}>{session.joinCode}</strong>
          </p>
          <p style={{ color: "var(--text3)", fontSize: 13, marginTop: 8 }}>
            {WORKSHEET_QUESTIONS.length} questions · {TOTAL_POINTS} points total
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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div className="card">
            <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 4 }}>
              Question {(qIdx ?? 0) + 1} of {WORKSHEET_QUESTIONS.length} · {question.section} — {question.sectionTitle}
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 8, color: "var(--text)" }}>
              {question.prompt}
            </div>
            <div style={{ fontSize: 13, color: "var(--text3)", fontStyle: "italic", marginBottom: 16 }}>
              💡 {question.hint}
            </div>
            {session.status === "question" && session.timerEndsAt && (
              <TimerBar endsAt={session.timerEndsAt} totalSeconds={session.timerSeconds} />
            )}
            {session.status === "revealing" && (
              <div style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "var(--radius-sm)", padding: "10px 14px" }}>
                <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 4 }}>Correct answer</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: "var(--green)", fontFamily: "var(--mono)" }}>{question.answer}</div>
              </div>
            )}
            <div style={{ height: 6, background: "var(--surface2)", borderRadius: 99, overflow: "hidden", marginTop: 12 }}>
              <div style={{ height: "100%", width: `${totalStudents > 0 ? (submittedCount / totalStudents) * 100 : 0}%`, background: "var(--blue)", borderRadius: 99, transition: "width 0.3s" }} />
            </div>
            <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 4 }}>{submittedCount}/{totalStudents} submitted · {correctCount} correct</div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Student Answers</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 320, overflowY: "auto" }}>
              {Object.entries(participants).map(([pUid, p]) => {
                const ans = answers.find(a => a.uid === pUid);
                const isCorrect = ans && gradeDecimalAnswer(ans.answer, question);
                return (
                  <div key={pUid} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "8px 12px",
                    border: `1px solid ${ans ? (isCorrect ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)") : "var(--border)"}`,
                  }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</span>
                    {ans ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {session.status === "revealing" && (
                          <span style={{ fontFamily: "var(--mono)", fontSize: 14, color: "var(--text2)" }}>{ans.answer}</span>
                        )}
                        <span style={{ fontWeight: 700, color: isCorrect ? "var(--green)" : "var(--red)" }}>
                          {isCorrect ? `+${question.points}` : "✗"}
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
        </div>
      )}

      {/* Leaderboard during reveal */}
      {session.status === "revealing" && (
        <div className="card" style={{ marginTop: 16 }}>
          <Leaderboard participants={participants} currentUid={uid} isEnded={false} />
        </div>
      )}

      {/* Ended */}
      {session.status === "ended" && (
        <div className="card">
          <Leaderboard participants={participants} currentUid={uid} isEnded={true} />
        </div>
      )}
    </div>
  );
}

// ─── Student View ─────────────────────────────────────────────────
function StudentWorksheet({ session, sessionId, uid }) {
  const [input, setInput] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [lastQIdx, setLastQIdx] = useState(-1);
  const inputRef = useRef(null);

  const qIdx = session.currentQuestion >= 0 ? session.currentQuestion : null;
  const question = qIdx !== null ? WORKSHEET_QUESTIONS[qIdx] : null;
  const participants = session.participants || {};
  const myScore = participants[uid]?.totalScore || 0;

  useEffect(() => {
    if (qIdx !== null && qIdx !== lastQIdx) {
      setInput(""); setSubmitted(false); setResult(null);
      setLastQIdx(qIdx);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [qIdx]);

  const handleSubmit = async () => {
    if (!question || submitted || !input.trim()) return;
    const ans = input.trim();
    const correct = gradeDecimalAnswer(ans, question);
    await setDoc(doc(db, "sessions", sessionId, "answers", `${uid}_${qIdx}`), {
      uid, questionIndex: qIdx, answer: ans, correct, submittedAt: Date.now(),
    });
    setResult({ correct, answer: ans });
    setSubmitted(true);
  };

  if (session.status === "waiting") return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
      <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Waiting for the teacher…</h2>
      <p style={{ color: "var(--text2)" }}>Get ready — the session is about to begin!</p>
    </div>
  );

  if (session.status === "ended") return (
    <div className="card" style={{ maxWidth: 500, margin: "0 auto", textAlign: "center", padding: "40px 20px" }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
      <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Session Complete!</h2>
      <div style={{ fontSize: 28, fontWeight: 900, color: "var(--blue)", marginBottom: 4 }}>
        {myScore} / {TOTAL_POINTS} pts
      </div>
      <div style={{ fontSize: 15, color: "var(--text2)" }}>{Math.round((myScore / TOTAL_POINTS) * 100)}%</div>
      <Leaderboard participants={participants} currentUid={uid} isEnded={true} />
    </div>
  );

  return (
    <div style={{ maxWidth: 560, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: "var(--text3)" }}>
          Question {(qIdx ?? 0) + 1} of {WORKSHEET_QUESTIONS.length}
        </div>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "6px 14px", fontSize: 14, fontWeight: 700 }}>
          Score: {myScore} pts
        </div>
      </div>

      <div className="card">
        {session.status === "question" && session.timerEndsAt && !submitted && (
          <TimerBar endsAt={session.timerEndsAt} totalSeconds={session.timerSeconds} />
        )}

        {question && (
          <>
            <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 8 }}>
              {question.section} — {question.sectionTitle}
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 6, color: "var(--text)" }}>
              {question.prompt}
            </div>
            <div style={{ fontSize: 13, color: "var(--text3)", fontStyle: "italic", marginBottom: 20 }}>
              💡 {question.hint}
            </div>
          </>
        )}

        {session.status === "revealing" ? (
          <div style={{ animation: "fadeUp 0.3s ease", textAlign: "center" }}>
            {result ? (
              <>
                <div style={{ fontSize: 48, marginBottom: 8 }}>{result.correct ? "🎉" : "😔"}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: result.correct ? "var(--green)" : "var(--red)", marginBottom: 8 }}>
                  {result.correct ? `+${question?.points} points!` : "Incorrect"}
                </div>
                <div style={{ fontSize: 15, color: "var(--text2)", marginBottom: 4 }}>
                  Your answer: <strong style={{ fontFamily: "var(--mono)" }}>{result.answer}</strong>
                </div>
                {!result.correct && (
                  <div style={{ fontSize: 15, color: "var(--green)" }}>
                    Correct: <strong style={{ fontFamily: "var(--mono)" }}>{question?.answer}</strong>
                  </div>
                )}
              </>
            ) : (
              <div>
                <div style={{ fontSize: 32, marginBottom: 8 }}>⏰</div>
                <div style={{ color: "var(--text3)" }}>No answer submitted.</div>
                <div style={{ marginTop: 8, color: "var(--green)", fontSize: 15 }}>
                  Correct: <strong style={{ fontFamily: "var(--mono)" }}>{question?.answer}</strong>
                </div>
              </div>
            )}
            <div style={{ marginTop: 20, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
              <Leaderboard participants={participants} currentUid={uid} isEnded={false} />
            </div>
          </div>
        ) : submitted ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--green)" }}>Submitted!</div>
            <div style={{ fontSize: 13, color: "var(--text3)", marginTop: 4 }}>Waiting for others…</div>
          </div>
        ) : (
          <>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              placeholder="Type your answer (e.g. 3.5)"
              inputMode="decimal"
              style={{ fontSize: 24, fontFamily: "var(--mono)", textAlign: "center", padding: "14px", marginBottom: 12 }}
            />
            <div style={{ fontSize: 12, color: "var(--text3)", textAlign: "center", marginBottom: 12 }}>
              {question?.mode === "decimal-repeating"
                ? "For repeating decimals, write at least 2 decimal places (e.g. 8.33)"
                : "Write your decimal answer (e.g. 3.5 or 0.75)"}
            </div>
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

// ─── Create Worksheet Session ─────────────────────────────────────
function CreateWorksheetSession({ user, onCreated }) {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [timer, setTimer] = useState(90);
  const [loading, setLoading] = useState(false);

  useEffect(() => { getTeacherClasses(user.id).then(setClasses); }, []);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const { sessionId } = await createSession(user.id, selectedClass, WORKSHEET_QUESTIONS, timer, "worksheet");
      onCreated(sessionId);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 480, margin: "0 auto" }}>
      <div className="card">
        <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Decimal Operations Worksheet</h2>
        <p style={{ color: "var(--text2)", fontSize: 14, marginBottom: 20 }}>
          20 questions covering decimal multiplication, fraction-to-decimal conversion, decimal division, and order of operations.
        </p>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text2)", display: "block", marginBottom: 6 }}>Class</label>
          <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} style={{ width: "100%", padding: "10px 12px", fontSize: 14 }}>
            <option value="">Select a class…</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text2)", display: "block", marginBottom: 6 }}>
            Default time per question (seconds)
          </label>
          <input type="number" min={30} max={300} value={timer}
            onChange={e => setTimer(Number(e.target.value))}
            style={{ width: "100%", padding: "10px 12px", fontSize: 14 }} />
        </div>
        <div style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "12px 14px", marginBottom: 20, fontSize: 13, color: "var(--text2)" }}>
          <strong>20 questions · {TOTAL_POINTS} points total</strong><br />
          Decimal multiplication · Fraction→decimal · Decimal division · Order of operations
        </div>
        <button className="btn btn-primary btn-lg" style={{ width: "100%" }}
          onClick={handleCreate} disabled={loading || !selectedClass}>
          {loading ? "Creating…" : "Start Session 🚀"}
        </button>
      </div>
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────
export default function WorksheetSession({ user, onHome }) {
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
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,var(--blue),var(--cyan))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>📋</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 20 }}>GCA</div>
              <div style={{ color: "var(--text3)", fontSize: 12 }}>Decimal Operations Session</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onHome}>← Home</button>
        </div>

        {view === "create" && <CreateWorksheetSession user={user} onCreated={(sid) => { setSessionId(sid); setView("session"); }} />}
        {view === "session" && session && (
          user.role === "teacher"
            ? <TeacherWorksheet session={session} sessionId={sessionId} uid={user.id} />
            : <StudentWorksheet session={session} sessionId={sessionId} uid={user.id} />
        )}
        {view === "session" && !session && (
          <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><div className="spinner" /></div>
        )}
      </div>
    </div>
  );
}

export { TeacherWorksheet as WorksheetTeacherView, StudentWorksheet as WorksheetStudentView };
