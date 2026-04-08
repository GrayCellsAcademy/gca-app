import { useState, useEffect, useRef } from "react";
import { setDoc, doc } from "firebase/firestore";
import {
  createSession, joinSession, startQuestion, revealQuestion, endSession,
  addToScore, onSessionChange, onAnswersChange, getTeacherClasses, db,
} from "../core/firebase";
import { gradeAnswer } from "../core/utils/fractionUtils";
import { REVIEW_QUESTIONS, TOTAL_POINTS } from "./sessionQuestions/lesson14";
import ClassworkSession from "../ClassworkSession";
import WorksheetSession, { WorksheetTeacherView, WorksheetStudentView } from "../WorksheetSession";
import RatioSession, { RatioTeacherView, RatioStudentView } from "../RatioSession";

// Wrapper so classwork session gets the same full-screen treatment
function ClassworkSessionWrapper({ user, onHome }) {
  return <ClassworkSession user={user} onHome={onHome} />;
}

//  Helpers 
function medalEmoji(rank) {
  if (rank === 1) return "";
  if (rank === 2) return "";
  if (rank === 3) return "";
  return `#${rank}`;
}

function pct(score) { return Math.round((score / TOTAL_POINTS) * 100); }

//  Math Display 
// Simple fraction renderer without LaTeX dependency
function MathDisplay({ question }) {
  const style = { fontSize: "clamp(18px,3.5vw,28px)", fontWeight: 700, color: "var(--text)", lineHeight: 1.6 };
  return (
    <div style={style}>
      <div style={{ marginBottom: 8, fontSize: "clamp(14px,2.5vw,18px)", color: "var(--text2)", fontWeight: 500 }}>
        [{question.section}] {question.sectionTitle}  {question.points} pts
      </div>
      <div style={{ fontSize: "clamp(20px,4vw,32px)", fontWeight: 800, marginBottom: 8 }}>
        {question.prompt}
      </div>
      {question.hint && (
        <div style={{ fontSize: "clamp(12px,2vw,15px)", color: "var(--text3)", fontStyle: "italic", marginTop: 4 }}>
           {question.hint}
        </div>
      )}
    </div>
  );
}

//  Timer Bar 
function TimerBar({ endsAt, totalSeconds }) {
  const [remaining, setRemaining] = useState(totalSeconds);

  useEffect(() => {
    const tick = () => {
      const left = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setRemaining(left);
    };
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
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 99, transition: "width 0.5s linear, background 0.3s" }} />
      </div>
    </div>
  );
}

//  Leaderboard 
function Leaderboard({ participants, currentUid, isEnded }) {
  const sorted = Object.entries(participants)
    .map(([uid, p]) => ({ uid, ...p }))
    .sort((a, b) => b.totalScore - a.totalScore);

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4, textAlign: "center" }}>
        {isEnded ? " Final Scores" : " Leaderboard"}
      </h2>
      <p style={{ color: "var(--text3)", fontSize: 13, textAlign: "center", marginBottom: 20 }}>
        Out of {TOTAL_POINTS} points total
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {sorted.map((p, i) => {
          const isMe = p.uid === currentUid;
          const rank = i + 1;
          return (
            <div key={p.uid} style={{
              display: "flex", alignItems: "center", gap: 14,
              background: isMe ? "rgba(59,130,246,0.15)" : "var(--surface)",
              border: `1px solid ${isMe ? "var(--blue)" : "var(--border)"}`,
              borderRadius: "var(--radius)", padding: "14px 18px",
              animation: "fadeUp 0.3s ease",
            }}>
              <div style={{ width: 36, textAlign: "center", fontSize: rank <= 3 ? 24 : 16, fontWeight: 800, color: rank <= 3 ? "var(--amber)" : "var(--text3)" }}>
                {medalEmoji(rank)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{p.name}{isMe ? " (you)" : ""}</div>
                <div style={{ fontSize: 12, color: "var(--text3)" }}>{pct(p.totalScore)}% correct</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: rank === 1 ? "var(--amber)" : "var(--text)" }}>{p.totalScore}</div>
                <div style={{ fontSize: 11, color: "var(--text3)" }}>pts</div>
              </div>
              {/* Score bar */}
              <div style={{ width: 80, height: 6, background: "var(--surface2)", borderRadius: 99, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct(p.totalScore)}%`, background: rank === 1 ? "var(--amber)" : "var(--blue)", borderRadius: 99 }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

//  Teacher View 
function TeacherSession({ session, sessionId, uid }) {
  const [answers, setAnswers] = useState([]);
  const [timerInput, setTimerInput] = useState(60);
  const [scored, setScored] = useState({}); // uid -> already scored this question

  const qIdx = session.currentQuestion;
  const question = qIdx >= 0 ? REVIEW_QUESTIONS[qIdx] : null;
  const participants = session.participants || {};
  const totalStudents = Object.keys(participants).length;

  // Listen to answers for current question
  useEffect(() => {
    if (qIdx < 0) return;
    setAnswers([]);
    setScored({});
    const unsub = onAnswersChange(sessionId, qIdx, (ans) => {
      setAnswers(ans);
      // Auto-add scores for correct answers
      ans.forEach(async (a) => {
        if (a.correct && !scored[a.uid]) {
          setScored(prev => ({ ...prev, [a.uid]: true }));
          await addToScore(sessionId, a.uid, a.points);
        }
      });
    });
    return () => unsub();
  }, [qIdx]);

  const handleStart = async () => {
    await startQuestion(sessionId, 0, timerInput);
  };

  const handleNext = async () => {
    const nextIdx = qIdx + 1;
    if (nextIdx >= REVIEW_QUESTIONS.length) {
      await endSession(sessionId);
    } else {
      await startQuestion(sessionId, nextIdx, timerInput);
    }
  };

  const handleReveal = async () => {
    await revealQuestion(sessionId);
  };

  const handleEnd = async () => {
    if (confirm("End the session for all students?")) await endSession(sessionId);
  };

  const submittedCount = answers.length;
  const correctCount = answers.filter(a => a.correct).length;

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      {/* Session header */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 2 }}>Join Code</div>
            <div style={{ fontSize: 36, fontWeight: 900, fontFamily: "var(--mono)", color: "var(--blue)", letterSpacing: "0.15em" }}>
              {session.joinCode}
            </div>
            <div style={{ fontSize: 13, color: "var(--text3)", marginTop: 2 }}>{totalStudents} student{totalStudents !== 1 ? "s" : ""} joined</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {/* Timer setter */}
            {session.status === "waiting" && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <label style={{ fontSize: 13, color: "var(--text2)" }}>Seconds per question:</label>
                <input type="number" min={10} max={300} value={timerInput}
                  onChange={e => setTimerInput(Number(e.target.value))}
                  style={{ width: 70, padding: "6px 10px", fontSize: 14, textAlign: "center" }}
                />
              </div>
            )}
            {session.status === "waiting" && (
              <button className="btn btn-primary" onClick={handleStart} disabled={totalStudents === 0}>
                 Start Session
              </button>
            )}
            {session.status === "question" && (
              <button className="btn btn-ghost" onClick={handleReveal}> Reveal Answers</button>
            )}
            {session.status === "revealing" && (
              <button className="btn btn-primary" onClick={handleNext}>
                {qIdx + 1 >= REVIEW_QUESTIONS.length ? "End Session" : `Next Question `}
              </button>
            )}
            {(session.status === "question" || session.status === "revealing") && (
              <button className="btn btn-ghost" style={{ color: "var(--red)" }} onClick={handleEnd}>End</button>
            )}
          </div>
        </div>
      </div>

      {/* Waiting state */}
      {session.status === "waiting" && (
        <div className="card" style={{ textAlign: "center", padding: "48px 20px" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}></div>
          <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Waiting for students to join</h3>
          <p style={{ color: "var(--text2)", fontSize: 15, marginBottom: 20 }}>
            Tell your students to go to the GCA website and enter join code <strong style={{ color: "var(--blue)", fontFamily: "var(--mono)", fontSize: 20 }}>{session.joinCode}</strong>
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
            {Object.values(participants).map(p => (
              <div key={p.name} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "6px 14px", fontSize: 14, fontWeight: 600 }}>
                {p.name}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active question */}
      {(session.status === "question" || session.status === "revealing") && question && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* Left: question + timer */}
          <div className="card">
            <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 8 }}>
              Question {qIdx + 1} of {REVIEW_QUESTIONS.length}
            </div>
            <MathDisplay question={question} />
            {session.status === "question" && session.timerEndsAt && (
              <div style={{ marginTop: 16 }}>
                <TimerBar endsAt={session.timerEndsAt} totalSeconds={session.timerSeconds} />
              </div>
            )}
            {session.status === "revealing" && (
              <div style={{ marginTop: 16, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "var(--radius-sm)", padding: "10px 14px" }}>
                <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 4 }}>Correct answer</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "var(--green)", fontFamily: "var(--mono)" }}>
                  {question.answer}
                </div>
              </div>
            )}
          </div>

          {/* Right: live submissions */}
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>Submissions</h3>
              <div style={{ fontSize: 13, color: "var(--text3)" }}>
                {submittedCount}/{totalStudents}  {correctCount} correct
              </div>
            </div>
            {/* Submission progress bar */}
            <div style={{ height: 6, background: "var(--surface2)", borderRadius: 99, overflow: "hidden", marginBottom: 14 }}>
              <div style={{ height: "100%", width: `${totalStudents > 0 ? (submittedCount / totalStudents) * 100 : 0}%`, background: "var(--blue)", borderRadius: 99, transition: "width 0.3s" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 320, overflowY: "auto" }}>
              {Object.entries(participants).map(([pUid, p]) => {
                const ans = answers.find(a => a.uid === pUid);
                return (
                  <div key={pUid} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "8px 12px",
                    border: `1px solid ${ans ? (ans.correct ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)") : "var(--border)"}`,
                  }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {ans ? (
                        <>
                          {session.status === "revealing" && (
                            <span style={{ fontFamily: "var(--mono)", fontSize: 14, color: "var(--text2)" }}>{ans.answer}</span>
                          )}
                          <span style={{ fontSize: 14, fontWeight: 700, color: ans.correct ? "var(--green)" : "var(--red)" }}>
                            {ans.correct ? `+${ans.points}` : ""}
                          </span>
                        </>
                      ) : (
                        <span style={{ fontSize: 12, color: "var(--text3)" }}>waiting</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard visible during reveal */}
      {session.status === "revealing" && (
        <div className="card" style={{ marginTop: 16 }}>
          <Leaderboard participants={participants} currentUid={uid} isEnded={false} />
        </div>
      )}

      {/* Session ended */}
      {session.status === "ended" && (
        <div className="card">
          <Leaderboard participants={participants} currentUid={uid} isEnded={true} />
        </div>
      )}
    </div>
  );
}

//  Student View 
function StudentSession({ session, sessionId, uid }) {
  const [input, setInput] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null); // { correct, points, answer }
  const [submittedForQuestion, setSubmittedForQuestion] = useState(-1);
  const inputRef = useRef(null);

  const qIdx = session.currentQuestion;
  const question = qIdx >= 0 ? REVIEW_QUESTIONS[qIdx] : null;
  const participants = session.participants || {};
  const myScore = participants[uid]?.totalScore || 0;

  // Reset when question changes
  useEffect(() => {
    if (qIdx !== submittedForQuestion) {
      setInput("");
      setSubmitted(false);
      setResult(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [qIdx]);

  const handleSubmit = async () => {
    if (!question || submitted) return;
    const ans = input.trim();
    if (!ans) return;

    let correct = false;
    if (question.mode === "text") {
      correct = ans.toLowerCase().includes("undefined");
    } else {
      correct = gradeAnswer(ans, question.answer, question.mode);
    }

    const points = correct ? question.points : 0;

    // Save answer to Firestore
    const answerId = `${uid}_${qIdx}`;
    await setDoc(doc(db, "sessions", sessionId, "answers", answerId), {
      uid, questionIndex: qIdx, answer: ans, correct, points, submittedAt: Date.now(),
    });

    if (correct) {
      await addToScore(sessionId, uid, points);
    }

    setResult({ correct, points, answer: ans });
    setSubmitted(true);
    setSubmittedForQuestion(qIdx);
  };

  // Waiting screen
  if (session.status === "waiting") {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}></div>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Waiting for the teacher to start</h2>
        <p style={{ color: "var(--text2)", fontSize: 15 }}>
          You're in! Get ready  the review is about to begin.
        </p>
        <div style={{ marginTop: 16, fontSize: 14, color: "var(--text3)" }}>
          {Object.keys(participants).length} student{Object.keys(participants).length !== 1 ? "s" : ""} joined
        </div>
      </div>
    );
  }

  // Ended screen
  if (session.status === "ended") {
    return (
      <div className="card" style={{ maxWidth: 700, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}></div>
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Session Complete!</h2>
          <div style={{ fontSize: 28, fontWeight: 900, color: "var(--blue)", marginBottom: 4 }}>
            Your score: {myScore} / {TOTAL_POINTS}
          </div>
          <div style={{ fontSize: 15, color: "var(--text2)" }}>{pct(myScore)}%</div>
        </div>
        <Leaderboard participants={participants} currentUid={uid} isEnded={true} />
      </div>
    );
  }

  // Active question
  return (
    <div style={{ maxWidth: 680, margin: "0 auto" }}>
      {/* Score badge */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: "var(--text3)" }}>
          Question {qIdx + 1} of {REVIEW_QUESTIONS.length}
        </div>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "6px 14px", fontSize: 14, fontWeight: 700 }}>
          Score: {myScore} pts
        </div>
      </div>

      <div className="card">
        {/* Timer */}
        {session.status === "question" && session.timerEndsAt && !submitted && (
          <TimerBar endsAt={session.timerEndsAt} totalSeconds={session.timerSeconds} />
        )}

        {/* Question */}
        {question && <MathDisplay question={question} />}

        <div style={{ marginTop: 20 }}>
          {/* After teacher reveals */}
          {session.status === "revealing" ? (
            <div style={{ animation: "fadeUp 0.3s ease" }}>
              {result ? (
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 48, marginBottom: 8 }}>{result.correct ? "" : ""}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: result.correct ? "var(--green)" : "var(--red)", marginBottom: 8 }}>
                    {result.correct ? `+${result.points} points!` : "Incorrect"}
                  </div>
                  <div style={{ fontSize: 15, color: "var(--text2)", marginBottom: 4 }}>
                    Your answer: <strong style={{ fontFamily: "var(--mono)" }}>{result.answer}</strong>
                  </div>
                  {!result.correct && (
                    <div style={{ fontSize: 15, color: "var(--green)" }}>
                      Correct answer: <strong style={{ fontFamily: "var(--mono)" }}>{question?.answer}</strong>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: "center", color: "var(--text3)" }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}></div>
                  <div>You didn't submit an answer.</div>
                  <div style={{ marginTop: 8, color: "var(--green)", fontSize: 15 }}>
                    Correct answer: <strong style={{ fontFamily: "var(--mono)" }}>{question?.answer}</strong>
                  </div>
                </div>
              )}
              {/* Mini leaderboard */}
              <div style={{ marginTop: 24, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
                <Leaderboard participants={participants} currentUid={uid} isEnded={false} />
              </div>
            </div>
          ) : submitted ? (
            <div style={{ textAlign: "center", animation: "popIn 0.3s ease" }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}></div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--green)", marginBottom: 4 }}>Answer submitted!</div>
              <div style={{ fontSize: 14, color: "var(--text2)" }}>
                Waiting for other students and the teacher to reveal
              </div>
            </div>
          ) : (
            <>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                placeholder={
                  question?.mode === "integer" ? "Type a number (e.g. 36)"
                  : question?.mode === "mixed" ? "e.g. 2 3/4"
                  : question?.mode === "text" ? "Type your answer"
                  : "e.g. 3/4"
                }
                style={{ fontSize: 22, fontFamily: "var(--mono)", textAlign: "center", padding: "14px", marginBottom: 12 }}
                disabled={submitted}
              />
              <button className="btn btn-primary" style={{ width: "100%", fontSize: 18, padding: "14px" }}
                onClick={handleSubmit} disabled={submitted || !input.trim()}>
                Submit Answer 
              </button>
              <div style={{ fontSize: 12, color: "var(--text3)", textAlign: "center", marginTop: 8 }}>
                {question?.mode === "mixed" && "Write mixed numbers like: 2 3/4 (whole number, space, fraction)"}
                {question?.mode === "simplified" && "Write fractions like: 3/4"}
                {question?.mode === "integer" && "Write just the number"}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

//  Join Screen 
function JoinScreen({ user, onJoined }) {
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    if (!code.trim()) { setErr("Please enter a join code."); return; }
    setLoading(true); setErr("");
    try {
      const sessionId = await joinSession(code.trim().toUpperCase(), user.id, user.name);
      onJoined(sessionId);
    } catch (e) { setErr(e.message); }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 420, margin: "0 auto", textAlign: "center" }}>
      <div className="card">
        <div style={{ fontSize: 48, marginBottom: 12 }}></div>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Join a Live Session</h2>
        <p style={{ color: "var(--text2)", fontSize: 14, marginBottom: 20 }}>
          Enter the join code your teacher gives you.
        </p>
        {err && <div style={{ color: "#fca5a5", fontSize: 13, marginBottom: 10, background: "rgba(239,68,68,0.1)", padding: "8px 12px", borderRadius: "var(--radius-sm)" }}>{err}</div>}
        <input
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === "Enter" && handleJoin()}
          placeholder="Enter code (e.g. AB12C)"
          style={{ fontSize: 28, fontFamily: "var(--mono)", textAlign: "center", letterSpacing: "0.2em", padding: "14px", marginBottom: 14 }}
          maxLength={6}
        />
        <button className="btn btn-primary btn-lg" style={{ width: "100%" }}
          onClick={handleJoin} disabled={loading}>
          {loading ? "Joining" : "Join Session "}
        </button>
      </div>
    </div>
  );
}

//  Teacher Create Screen 
function CreateSession({ user, onCreated }) {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [timer, setTimer] = useState(60);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getTeacherClasses(user.id).then(setClasses);
  }, []);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const { sessionId, joinCode } = await createSession(user.id, selectedClass, REVIEW_QUESTIONS, timer);
      onCreated(sessionId, joinCode);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 480, margin: "0 auto" }}>
      <div className="card">
        <div style={{ fontSize: 40, marginBottom: 12 }}></div>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Start a Live Review Session</h2>
        <p style={{ color: "var(--text2)", fontSize: 14, marginBottom: 20 }}>
          This review covers fractions, fraction operations, and equations  mirroring Test 2.
        </p>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text2)", display: "block", marginBottom: 6 }}>Class</label>
          <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} style={{ width: "100%", padding: "10px 12px", fontSize: 14 }}>
            <option value="">Select a class</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text2)", display: "block", marginBottom: 6 }}>
            Default time per question (seconds)
          </label>
          <input type="number" min={10} max={300} value={timer}
            onChange={e => setTimer(Number(e.target.value))}
            style={{ width: "100%", padding: "10px 12px", fontSize: 14 }} />
          <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>You can adjust this for each question during the session.</div>
        </div>
        <div style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "12px 14px", marginBottom: 20, fontSize: 13, color: "var(--text2)" }}>
          <strong>{REVIEW_QUESTIONS.length} questions</strong>  {TOTAL_POINTS} points total<br />
          Sections: Equivalent Fractions  Simplify  Operations  Equations
        </div>
        <button className="btn btn-primary btn-lg" style={{ width: "100%" }}
          onClick={handleCreate} disabled={loading || !selectedClass}>
          {loading ? "Creating" : "Create Session "}
        </button>
      </div>
    </div>
  );
}

//  Main LiveSession Component 
export default function LiveSession({ user, onHome }) {
  const [view, setView] = useState("menu"); // menu | create | join | session | classwork
  const [sessionId, setSessionId] = useState(null);
  const [session, setSession] = useState(null);

  useEffect(() => {
    if (!sessionId) return;
    const unsub = onSessionChange(sessionId, setSession);
    return () => unsub();
  }, [sessionId]);

  const handleCreated = (sid) => { setSessionId(sid); setView("session"); };
  const handleJoined = (sid) => { setSessionId(sid); setView("session"); };

  // Classwork session is handled by its own component
  if (view === "worksheet") {
    return <WorksheetSession user={user} onHome={() => setView("menu")} />;
  }

  if (view === "ratio") {
    return <RatioSession user={user} onHome={() => setView("menu")} />;
  }

  if (view === "classwork") {
    return <ClassworkSessionWrapper user={user} onHome={() => setView("menu")} />;
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "clamp(16px,3vw,32px)" }} className="dot-bg">
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,var(--blue),var(--cyan))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}></div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 20 }}>GCA</div>
              <div style={{ color: "var(--text3)", fontSize: 12 }}>Live Session</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {view !== "menu" && !sessionId && (
              <button className="btn btn-ghost btn-sm" onClick={() => setView("menu")}> Back</button>
            )}
            <button className="btn btn-ghost btn-sm" onClick={onHome}> Home</button>
          </div>
        </div>

        {/* Menu */}
        {view === "menu" && (
          <div style={{ maxWidth: 600, margin: "0 auto" }}>
            <h1 style={{ fontSize: "clamp(22px,4vw,32px)", fontWeight: 900, marginBottom: 8 }}>Live Sessions</h1>
            <p style={{ color: "var(--text2)", fontSize: 15, marginBottom: 28 }}>
              {user.role === "teacher" ? "Choose a session type or join a session." : "Join a session your teacher has started."}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {user.role === "teacher" && (
                <>
                  <div className="card" onClick={() => setView("classwork")}
                    style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 16 }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = "var(--blue)"}
                    onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}>
                    <div style={{ fontSize: 36 }}></div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 4 }}>Classwork Session</div>
                      <div style={{ color: "var(--text2)", fontSize: 13 }}>Push column addition and subtraction problems one at a time. You control the pace.</div>
                    </div>
                  </div>
                                    <div className="card" onClick={() => setView("ratio")} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "var(--blue)", minWidth: 36 }}>R:P</div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 4 }}>Ratios and Proportions</div>
                      <div style={{ color: "var(--text2)", fontSize: 13 }}>5 types: simplify, solve, algebraic, write and solve word problems.</div>
                    </div>
                  </div>
                  <div className="card" onClick={() => setView("worksheet")} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "var(--blue)", minWidth: 36 }}>WS</div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 4 }}>Decimal Operations Worksheet</div>
                      <div style={{ color: "var(--text2)", fontSize: 13 }}>20 questions - decimal multiplication, division, fractions, order of operations.</div>
                    </div>
                  </div>
                  <div className="card" onClick={() => setView("create")}
                    style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 16 }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = "var(--blue)"}
                    onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}>
                    <div style={{ fontSize: 36 }}></div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 4 }}>Review Session</div>
                      <div style={{ color: "var(--text2)", fontSize: 13 }}>Pre-loaded fraction and algebra questions mirroring Test 2.</div>
                    </div>
                  </div>
                </>
              )}
              <div className="card" onClick={() => setView("join")}
                style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 16 }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "var(--blue)"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}>
                <div style={{ fontSize: 36 }}></div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 4 }}>Join a Session</div>
                  <div style={{ color: "var(--text2)", fontSize: 13 }}>Enter a join code to participate in a live session.</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {view === "create" && <CreateSession user={user} onCreated={handleCreated} />}
        {view === "join" && <JoinScreen user={user} onJoined={handleJoined} />}
        {view === "session" && session && (
            session.type === "ratio"
            ? (user.role === "teacher" ? <RatioTeacherView session={session} sessionId={sessionId} uid={user.id} /> : <RatioStudentView session={session} sessionId={sessionId} uid={user.id} />)
            : session.type === "worksheet"
            ? (user.role === "teacher" ? <WorksheetTeacherView session={session} sessionId={sessionId} uid={user.id} /> : <WorksheetStudentView session={session} sessionId={sessionId} uid={user.id} />)
            : session.type === "classwork"
            ? (user.role === "teacher" ? <ClassworkTeacherView session={session} sessionId={sessionId} uid={user.id} /> : <ClassworkStudentView session={session} sessionId={sessionId} uid={user.id} />)
            : (user.role === "teacher" ? <TeacherSession session={session} sessionId={sessionId} uid={user.id} /> : <StudentSession session={session} sessionId={sessionId} uid={user.id} />)
        )}
        {view === "session" && !session && (
          <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><div className="spinner" /></div>
        )}
      </div>
    </div>
  );
}




