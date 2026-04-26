import { useState, useEffect, useRef } from "react";
import { setDoc, doc } from "firebase/firestore";
import {
  createSession, joinSession, startQuestion, revealQuestion, endSession,
  addToScore, onSessionChange, onAnswersChange, getTeacherClasses, db,
} from "../core/firebase";
import { gradeAnswer } from "../core/utils/fractionUtils";
import { REVIEW_QUESTIONS, TOTAL_POINTS } from "./sessionQuestions/lesson14";
import ClassworkSession, { ClassworkTeacherView, ClassworkStudentView } from "../ClassworkSession";
import WorksheetSession, { WorksheetTeacherView, WorksheetStudentView } from "../WorksheetSession";
import RatioSession, { RatioTeacherView, RatioStudentView } from "../RatioSession";
import Lesson02Session, { Lesson02TeacherView, Lesson02StudentView } from "../Lesson02Session";
import Lesson03Session, { Lesson03TeacherView, Lesson03StudentView } from "../Lesson03Session";
import Lesson04Session, { Lesson04TeacherView, Lesson04StudentView } from "../Lesson04Session";
import ReviewSession, { ReviewTeacherView, ReviewStudentView } from "../ReviewSession";

function ClassworkSessionWrapper({ user, onHome }) {
  return <ClassworkSession user={user} onHome={onHome} />;
}

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
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Join a Live Session</h2>
        <p style={{ color: "var(--text2)", fontSize: 14, marginBottom: 20 }}>
          Enter the join code your teacher gives you.
        </p>
        {err && <div style={{ color: "#fca5a5", fontSize: 13, marginBottom: 10 }}>{err}</div>}
        <input
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === "Enter" && handleJoin()}
          placeholder="Enter code (e.g. AB12C)"
          style={{ fontSize: 28, fontFamily: "var(--mono)", textAlign: "center", letterSpacing: "0.2em", marginBottom: 14, width: "100%", padding: "12px" }}
          maxLength={6}
        />
        <button className="btn btn-primary btn-lg" style={{ width: "100%" }}
          onClick={handleJoin} disabled={loading}>
          {loading ? "Joining..." : "Join Session"}
        </button>
      </div>
    </div>
  );
}

// Review session teacher/student views kept for backward compat with old sessions
function TeacherSession({ session, sessionId, uid }) {
  const [answers, setAnswers] = useState([]);
  const [timerInput, setTimerInput] = useState(60);
  const qIdx = session.currentQuestion;
  const question = qIdx >= 0 ? REVIEW_QUESTIONS[qIdx] : null;
  const participants = session.participants || {};
  const totalStudents = Object.keys(participants).length;

  useEffect(() => {
    if (qIdx < 0) return;
    setAnswers([]);
    const unsub = onAnswersChange(sessionId, qIdx, setAnswers);
    return () => unsub();
  }, [qIdx]);

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 13, color: "var(--text3)" }}>Join Code</div>
            <div style={{ fontSize: 32, fontWeight: 900, fontFamily: "var(--mono)", color: "var(--blue)" }}>{session.joinCode}</div>
            <div style={{ fontSize: 13, color: "var(--text3)" }}>{totalStudents} students joined</div>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {session.status === "waiting" && (
              <button className="btn btn-primary" onClick={() => startQuestion(sessionId, 0, timerInput)} disabled={totalStudents === 0}>Start</button>
            )}
            {session.status === "question" && (
              <button className="btn btn-ghost" onClick={() => revealQuestion(sessionId)}>Reveal</button>
            )}
            {session.status === "revealing" && (
              <button className="btn btn-primary" onClick={() => {
                const next = qIdx + 1;
                if (next >= REVIEW_QUESTIONS.length) endSession(sessionId);
                else startQuestion(sessionId, next, timerInput);
              }}>Next Question</button>
            )}
            <button className="btn btn-ghost" style={{ color: "var(--red)" }}
              onClick={() => confirm("End session?") && endSession(sessionId)}>End</button>
          </div>
        </div>
      </div>
      {question && (
        <div className="card">
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>{question.prompt}</div>
          <div style={{ fontSize: 13, color: "var(--text3)" }}>{answers.length}/{totalStudents} submitted</div>
        </div>
      )}
    </div>
  );
}

function StudentSession({ session, sessionId, uid }) {
  const [input, setInput] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const qIdx = session.currentQuestion;
  const question = qIdx >= 0 ? REVIEW_QUESTIONS[qIdx] : null;
  const participants = session.participants || {};
  const myScore = participants[uid]?.totalScore || 0;

  useEffect(() => {
    setInput(""); setSubmitted(false);
  }, [qIdx]);

  const handleSubmit = async () => {
    if (!question || submitted || !input.trim()) return;
    const correct = gradeAnswer(input.trim(), question.answer, question.mode);
    const points = correct ? question.points : 0;
    await setDoc(doc(db, "sessions", sessionId, "answers", uid + "_" + qIdx), {
      uid, questionIndex: qIdx, answer: input.trim(), correct, points, submittedAt: Date.now(),
    });
    if (correct) await addToScore(sessionId, uid, points);
    setSubmitted(true);
  };

  if (session.status === "waiting") return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <h2 style={{ fontSize: 22, fontWeight: 800 }}>Waiting for the teacher to start...</h2>
    </div>
  );

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <div style={{ textAlign: "right", marginBottom: 12, fontSize: 13, color: "var(--text3)" }}>Score: {myScore} pts</div>
      <div className="card">
        {question && <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>{question.prompt}</div>}
        {session.status === "revealing" ? (
          <div style={{ textAlign: "center", color: "var(--green)", fontWeight: 700 }}>
            Correct answer: {question?.answer}
          </div>
        ) : submitted ? (
          <div style={{ textAlign: "center", color: "var(--green)" }}>Submitted! Waiting for reveal...</div>
        ) : (
          <>
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              style={{ width: "100%", fontSize: 20, padding: "12px", marginBottom: 10 }} />
            <button className="btn btn-primary" style={{ width: "100%" }}
              onClick={handleSubmit} disabled={!input.trim()}>Submit</button>
          </>
        )}
      </div>
    </div>
  );
}

export default function LiveSession({ user, onHome }) {
  const [view, setView] = useState("menu");
  const [sessionId, setSessionId] = useState(null);
  const [session, setSession] = useState(null);

  useEffect(() => {
    if (!sessionId) return;
    const unsub = onSessionChange(sessionId, setSession);
    return () => unsub();
  }, [sessionId]);

  const handleCreated = (sid) => { setSessionId(sid); setView("session"); };
  const handleJoined = (sid) => { setSessionId(sid); setView("session"); };

  if (view === "worksheet") {
    return <WorksheetSession user={user} onHome={() => setView("menu")} />;
  }
  if (view === "ratio") {
    return <RatioSession user={user} onHome={() => setView("menu")} />;
  }
  if (view === "review") {
    return <ReviewSession user={user} onHome={() => setView("menu")} />;
  }

  if (view === "lesson02") {
    return <Lesson02Session user={user} onHome={() => setView("menu")} />;
  }
  if (view === "lesson03") {
    return <Lesson03Session user={user} onHome={() => setView("menu")} />;
  }
  if (view === "lesson04") {
    return <Lesson04Session user={user} onHome={() => setView("menu")} />;
  }
  if (view === "classwork") {
    return <ClassworkSessionWrapper user={user} onHome={() => setView("menu")} />;
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "clamp(16px,3vw,32px)" }} className="dot-bg">
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,var(--blue),var(--cyan))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#fff" }}>GCA</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 20 }}>GCA</div>
              <div style={{ color: "var(--text3)", fontSize: 12 }}>Live Session</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onHome}>Home</button>
        </div>

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
                    style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "var(--blue)", minWidth: 36 }}>C+S</div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 4 }}>(1) Column Addition and Subtraction</div>
                      <div style={{ color: "var(--text2)", fontSize: 13 }}>Push column addition and subtraction problems one at a time. You control the pace.</div>
                    </div>
                  </div>
                  <div className="card" onClick={() => setView("lesson02")}
                    style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "var(--blue)", minWidth: 36 }}>L2</div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 4 }}>(2) Geometry</div>
                      <div style={{ color: "var(--text2)", fontSize: 13 }}>Line segments, polygons, rectangles, squares, composite shapes.</div>
                    </div>
                  </div>
                  <div className="card" onClick={() => setView("lesson03")}
                    style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "var(--blue)", minWidth: 36 }}>L3</div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 4 }}>(3) Multiplication, Division and Area</div>
                      <div style={{ color: "var(--text2)", fontSize: 13 }}>Round numbers, column multiplication, long division, rectangle and composite area.</div>
                    </div>
                  </div>
                  <div className="card" onClick={() => setView("lesson04")}
                    style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "var(--blue)", minWidth: 36 }}>L4</div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 4 }}>(4) Properties, Exponents, Roots and Order of Operations</div>
                      <div style={{ color: "var(--text2)", fontSize: 13 }}>Division with zero, powers, square and cube roots, order of operations, variable expressions.</div>
                    </div>
                  </div>
                </>
              )}
              <div className="card" onClick={() => setView("review")}
                    style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "var(--blue)", minWidth: 36 }}>REV</div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 4 }}>Final Exam Review</div>
                      <div style={{ color: "var(--text2)", fontSize: 13 }}>44 question types covering all course topics.</div>
                    </div>
                  </div>
                  <div className="card" onClick={() => setView("join")}
                style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: "var(--blue)", minWidth: 36 }}>JOIN</div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 4 }}>Join a Session</div>
                  <div style={{ color: "var(--text2)", fontSize: 13 }}>Enter a join code to participate in a live session.</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {view === "join" && <JoinScreen user={user} onJoined={handleJoined} />}

        {view === "session" && session && (() => {
          if (session.type === "review") {
            return user.role === "teacher"
              ? <ReviewTeacherView session={session} sessionId={sessionId} uid={user.id} />
              : <ReviewStudentView session={session} sessionId={sessionId} uid={user.id} />;
          }
          if (session.type === "lesson02") {
            return user.role === "teacher"
              ? <Lesson02TeacherView session={session} sessionId={sessionId} uid={user.id} />
              : <Lesson02StudentView session={session} sessionId={sessionId} uid={user.id} />;
          }
          if (session.type === "lesson03") {
            return user.role === "teacher"
              ? <Lesson03TeacherView session={session} sessionId={sessionId} uid={user.id} />
              : <Lesson03StudentView session={session} sessionId={sessionId} uid={user.id} />;
          }
          if (session.type === "lesson04") {
            return user.role === "teacher"
              ? <Lesson04TeacherView session={session} sessionId={sessionId} uid={user.id} />
              : <Lesson04StudentView session={session} sessionId={sessionId} uid={user.id} />;
          }
          if (session.type === "worksheet") {
            return user.role === "teacher"
              ? <WorksheetTeacherView session={session} sessionId={sessionId} uid={user.id} />
              : <WorksheetStudentView session={session} sessionId={sessionId} uid={user.id} />;
          }
          if (session.type === "ratio") {
            return user.role === "teacher"
              ? <RatioTeacherView session={session} sessionId={sessionId} uid={user.id} />
              : <RatioStudentView session={session} sessionId={sessionId} uid={user.id} />;
          }
          if (session.type === "classwork") {
            return user.role === "teacher"
              ? <ClassworkTeacherView session={session} sessionId={sessionId} uid={user.id} />
              : <ClassworkStudentView session={session} sessionId={sessionId} uid={user.id} />;
          }
          return user.role === "teacher"
            ? <TeacherSession session={session} sessionId={sessionId} uid={user.id} />
            : <StudentSession session={session} sessionId={sessionId} uid={user.id} />;
        })()}

        {view === "session" && !session && (
          <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><div className="spinner" /></div>
        )}
      </div>
    </div>
  );
}
