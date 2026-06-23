import { useState, useEffect, useRef, useCallback } from "react";
import { setDoc, doc, updateDoc, increment } from "firebase/firestore";
import {
  createSession, joinSession, startQuestion, revealQuestion, endSession,
  addToScore, onSessionChange, onAnswersChange, getTeacherClasses, db,
} from "./core/firebase";
import { WORKSHEET_QUESTIONS, TOTAL_POINTS, gradeDecimalAnswer, generateSimilarQuestion } from "./worksheetQuestions";

//  Repeating Decimal Input 
// Internal format: "1.[27]" means 1.272727...
// Display: 1.27
// Parse: splits on [ to find repeating part

function parseRepeatingInput(val) {
  // Format: "1.[27]" or "0.[3]" or "1.5" (no repeat)
  if (!val) return { display: "", value: "" };
  const match = val.match(/^([^[]*)\[([^\]]*)\]?$/);
  if (match) {
    const nonRepeat = match[1];
    const repeat = match[2];
    // Display with combining overline on each digit
    const overline = repeat.split("").map(c => c + "\u0305").join("");
    return {
      display: nonRepeat + overline,
      value: val,
      nonRepeat,
      repeat,
    };
  }
  return { display: val, value: val, nonRepeat: val, repeat: "" };
}

function RepeatingInput({ value, onChange, onSubmit, disabled }) {
  const [raw, setRaw] = useState(value || "");
  const [inBar, setInBar] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { setRaw(""); setInBar(false); }, [value === ""]);

  const parsed = parseRepeatingInput(raw);

  const handleKey = (e) => {
    if (e.key === "Enter") { onSubmit(); return; }
  };

  const handleType = (e) => {
    const char = e.target.value.slice(-1);
    if (!char) return;
    if (inBar) {
      // Add to repeating part
      const newRaw = raw.endsWith("]")
        ? raw.slice(0, -1) + char + "]"
        : raw + char;
      setRaw(newRaw);
      onChange(newRaw);
    } else {
      const newRaw = raw + char;
      setRaw(newRaw);
      onChange(newRaw);
    }
    // Keep input cleared for next character
    e.target.value = "";
  };

  const handleBackspace = () => {
    if (raw.length === 0) return;
    let newRaw = raw;
    if (raw.endsWith("]")) {
      // Remove last char from repeating part
      const inner = raw.slice(raw.indexOf("[") + 1, -1);
      if (inner.length <= 1) {
        // Remove the whole bar
        newRaw = raw.slice(0, raw.indexOf("["));
        setInBar(false);
      } else {
        newRaw = raw.slice(0, raw.indexOf("[") + 1) + inner.slice(0, -1) + "]";
      }
    } else {
      newRaw = raw.slice(0, -1);
    }
    setRaw(newRaw);
    onChange(newRaw);
  };

  const handleBar = () => {
    if (inBar) return; // Already in bar mode
    const newRaw = raw + "[";
    setRaw(newRaw);
    onChange(newRaw);
    setInBar(true);
    inputRef.current?.focus();
  };

  const handleClear = () => {
    setRaw(""); setInBar(false); onChange("");
  };

  return (
    <div>
      {/* Display area */}
      <div style={{
        minHeight: 56, background: "var(--bg2)", border: "2px solid var(--border)",
        borderRadius: "var(--radius)", padding: "12px 16px", fontSize: 28,
        fontFamily: "var(--mono)", fontWeight: 700, textAlign: "center",
        color: "var(--text)", marginBottom: 10, letterSpacing: "0.05em",
        display: "flex", alignItems: "center", justifyContent: "center",
        minWidth: 200,
      }}>
        {parsed.display || <span style={{ color: "var(--text3)", fontSize: 20 }}>type your answer</span>}
        {inBar && <span style={{ color: "var(--blue)", fontSize: 20, marginLeft: 4 }}>|bar|</span>}
      </div>

      {/* Hidden input to capture typing */}
      <input
        ref={inputRef}
        onInput={handleType}
        onKeyDown={e => {
          if (e.key === "Backspace") { e.preventDefault(); handleBackspace(); }
          if (e.key === "Enter") { e.preventDefault(); onSubmit(); }
        }}
        disabled={disabled}
        style={{ position: "absolute", opacity: 0, width: 1, height: 1 }}
        autoComplete="off"
      />

      {/* Button row */}
      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 10 }}>
        {["1","2","3","4","5","6","7","8","9","0","."].map(d => (
          <button key={d} disabled={disabled}
            onMouseDown={e => { e.preventDefault(); }}
            onClick={() => {
              const char = d;
              let newRaw;
              if (inBar) {
                newRaw = raw.endsWith("]") ? raw.slice(0,-1) + char + "]" : raw + char;
              } else {
                newRaw = raw + char;
              }
              setRaw(newRaw); onChange(newRaw);
            }}
            style={{ width: 44, height: 44, fontSize: 20, fontWeight: 700, fontFamily: "var(--mono)",
              background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
              cursor: "pointer", color: "var(--text)" }}>
            {d}
          </button>
        ))}
        <button disabled={disabled || inBar}
          onMouseDown={e => e.preventDefault()}
          onClick={handleBar}
          style={{ padding: "0 14px", height: 44, fontSize: 20, fontWeight: 800,
            background: inBar ? "var(--blue)" : "rgba(59,130,246,0.15)",
            border: `2px solid ${inBar ? "var(--blue)" : "rgba(59,130,246,0.4)"}`,
            borderRadius: "var(--radius-sm)", cursor: inBar ? "not-allowed" : "pointer",
            color: inBar ? "#fff" : "var(--blue)" }}>
          x BAR
        </button>
        <button disabled={disabled}
          onMouseDown={e => e.preventDefault()}
          onClick={handleBackspace}
          style={{ padding: "0 14px", height: 44, fontSize: 20, fontWeight: 700,
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)", cursor: "pointer", color: "var(--text)" }}>
          
        </button>
        <button disabled={disabled}
          onMouseDown={e => e.preventDefault()}
          onClick={handleClear}
          style={{ padding: "0 14px", height: 44, fontSize: 20, fontWeight: 700,
            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: "var(--radius-sm)", cursor: "pointer", color: "var(--red)" }}>
          CLR
        </button>
      </div>

      <button className="btn btn-primary" style={{ width: "100%", fontSize: 20, padding: "14px" }}
        disabled={disabled || !raw}
        onMouseDown={e => e.preventDefault()}
        onClick={onSubmit}>
        Submit
      </button>
    </div>
  );
}

//  Grade repeating decimal answer 
function gradeAnswer(studentRaw, question) {
  if (!studentRaw) return false;

  const parsed = parseRepeatingInput(studentRaw);
  const { nonRepeat, repeat } = parsed;

  // Convert student answer to a number for comparison
  let studentNum;
  if (repeat) {
    // e.g. nonRepeat = "1.", repeat = "27"
    // Value = nonRepeat + repeat repeating
    const base = parseFloat(nonRepeat || "0");
    const repNum = parseInt(repeat);
    const repLen = repeat.length;
    const repFrac = repNum / (Math.pow(10, repLen) - 1);
    // Account for decimal places before repeat
    const decPlaces = (nonRepeat.split(".")[1] || "").length;
    studentNum = base + repFrac / Math.pow(10, decPlaces);
  } else {
    studentNum = parseFloat(nonRepeat);
  }

  if (isNaN(studentNum)) return false;

  // Get correct value
  const correctNum = parseFloat(question.answer);
  if (isNaN(correctNum)) return false;

  // For repeating decimals, allow small tolerance
  if (question.mode === "decimal-repeating") {
    return Math.abs(studentNum - correctNum) < 0.001;
  }

  // For exact decimals, compare numerically with tiny tolerance
  return Math.abs(studentNum - correctNum) < 0.0001;
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

//  Leaderboard 
function Leaderboard({ participants, currentUid, isEnded }) {
  const sorted = Object.entries(participants)
    .map(([uid, p]) => ({ uid, ...p }))
    .sort((a, b) => b.totalScore - a.totalScore);
  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12, textAlign: "center" }}>
        {isEnded ? "Final Scores" : "Leaderboard"}
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {sorted.map((p, i) => {
          const isMe = p.uid === currentUid;
          const pct = Math.round((p.totalScore / TOTAL_POINTS) * 100);
          const medals = ["1st","2nd","3rd"];
          return (
            <div key={p.uid} style={{
              display: "flex", alignItems: "center", gap: 14,
              background: isMe ? "rgba(59,130,246,0.15)" : "var(--surface)",
              border: `1px solid ${isMe ? "var(--blue)" : "var(--border)"}`,
              borderRadius: "var(--radius)", padding: "12px 16px",
            }}>
              <div style={{ width: 36, textAlign: "center", fontWeight: 800, color: i < 3 ? "var(--amber)" : "var(--text3)" }}>
                {medals[i] || `#${i+1}`}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>{p.name}{isMe ? " (you)" : ""}</div>
                <div style={{ fontSize: 19, color: "var(--text3)" }}>{pct}%</div>
              </div>
              <div style={{ fontWeight: 800, fontSize: 20 }}>{p.totalScore}<span style={{ fontSize: 19, color: "var(--text3)", fontWeight: 400 }}> pts</span></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

//  Teacher View 
function TeacherWorksheet({ session, sessionId, uid }) {
  const [answers, setAnswers] = useState([]);
  const [timerInput, setTimerInput] = useState(90);
  const [overrideQuestion, setOverrideQuestion] = useState(null);
  const revealedRef = useRef(false);

  const qIdx = session.currentQuestion >= 0 ? session.currentQuestion : null;
  const baseQuestion = qIdx !== null ? WORKSHEET_QUESTIONS[qIdx] : null;
  const question = overrideQuestion || (session.currentQuestionOverride) || baseQuestion;

  // Reset override when question index changes
  useEffect(() => {
    setOverrideQuestion(null);
    revealedRef.current = false;
    setAnswers([]);
  }, [qIdx]);

  // Listen to answers
  useEffect(() => {
    if (qIdx === null) return;
    const unsub = onAnswersChange(sessionId, qIdx, setAnswers);
    return () => unsub();
  }, [qIdx]);

  // Auto-reveal when timer expires
  const handleTimerExpired = useCallback(async () => {
    if (session.status === "question" && !revealedRef.current) {
      revealedRef.current = true;
      // Award points for correct answers
      for (const ans of answers) {
        if (ans.answer !== undefined && ans.answer !== null && gradeAnswer(ans.answer, question)) {
          await addToScore(sessionId, ans.uid, question.points);
        }
      }
      await revealQuestion(sessionId);
    }
  }, [session.status, answers, question]);

  const handleStart = async () => {
    await startQuestion(sessionId, 0, timerInput);
  };

  const handleNext = async () => {
    const next = (qIdx ?? -1) + 1;
    setOverrideQuestion(null);
    await updateDoc(doc(db, "sessions", sessionId), { currentQuestionOverride: null });
    if (next >= WORKSHEET_QUESTIONS.length) await endSession(sessionId);
    else await startQuestion(sessionId, next, timerInput);
  };

  const handleReveal = async () => {
    if (revealedRef.current) return;
    revealedRef.current = true;
    for (const ans of answers) {
      if (ans.answer !== undefined && ans.answer !== null && gradeAnswer(ans.answer, question)) {
        await addToScore(sessionId, ans.uid, question.points);
      }
    }
    await revealQuestion(sessionId);
  };

  const handleRepeat = async () => {
    if (!baseQuestion) return;
    const similar = generateSimilarQuestion(baseQuestion);
    setOverrideQuestion(similar);
    revealedRef.current = false;
    setAnswers([]);
    await updateDoc(doc(db, "sessions", sessionId), {
      currentQuestionOverride: similar,
      status: "question",
      timerEndsAt: Date.now() + timerInput * 1000,
      timerSeconds: timerInput,
    });
  };

  const handleEnd = async () => {
    if (confirm("End the session?")) await endSession(sessionId);
  };

  const participants = session.participants || {};
  const totalStudents = Object.keys(participants).length;
  const submittedCount = answers.length;
  const correctCount = answers.filter(a => a.answer !== undefined && a.answer !== null && gradeAnswer(a.answer, question)).length;

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
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
            {session.status === "waiting" && (
              <button className="btn btn-primary" onClick={handleStart} disabled={totalStudents === 0}>Start</button>
            )}
            {session.status === "question" && (
              <button className="btn btn-ghost" onClick={handleReveal}>Reveal Answers</button>
            )}
            {session.status === "revealing" && (
              <>
                <button className="btn btn-ghost" onClick={handleRepeat}>Repeat Question</button>
                <button className="btn btn-primary" onClick={handleNext}>
                  {(qIdx ?? -1) + 1 >= WORKSHEET_QUESTIONS.length ? "End Session" : "Next Question"}
                </button>
              </>
            )}
            <button className="btn btn-ghost" style={{ color: "var(--red)" }} onClick={handleEnd}>End</button>
          </div>
        </div>
      </div>

      {/* Waiting */}
      {session.status === "waiting" && (
        <div className="card" style={{ textAlign: "center", padding: "48px 20px" }}>
          <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Waiting for students</h3>
          <p style={{ color: "var(--text2)", fontSize: 19 }}>
            Join code: <strong style={{ color: "var(--blue)", fontFamily: "var(--mono)", fontSize: 20 }}>{session.joinCode}</strong>
          </p>
          <p style={{ color: "var(--text3)", fontSize: 20, marginTop: 8 }}>
            {WORKSHEET_QUESTIONS.length} questions - {TOTAL_POINTS} points total
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

      {/* Active question */}
      {question && (session.status === "question" || session.status === "revealing") && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div className="card">
            <div style={{ fontSize: 19, color: "var(--text3)", marginBottom: 4 }}>
              Question {(qIdx ?? 0) + 1} of {WORKSHEET_QUESTIONS.length} - {question.section} - {question.sectionTitle}
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 16, color: "var(--text)" }}>
              {question.prompt}
            </div>
            {session.status === "question" && session.timerEndsAt && (
              <TimerBar
                endsAt={session.timerEndsAt}
                totalSeconds={session.timerSeconds}
                onExpired={handleTimerExpired}
              />
            )}
            {session.status === "revealing" && (
              <div style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "var(--radius-sm)", padding: "10px 14px" }}>
                <div style={{ fontSize: 20, color: "var(--text3)", marginBottom: 4 }}>Correct answer</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: "var(--green)", fontFamily: "var(--mono)" }}>{question.answer}</div>
              </div>
            )}
            <div style={{ height: 6, background: "var(--surface2)", borderRadius: 99, overflow: "hidden", marginTop: 12 }}>
              <div style={{ height: "100%", width: `${totalStudents > 0 ? (submittedCount / totalStudents) * 100 : 0}%`, background: "var(--blue)", borderRadius: 99, transition: "width 0.3s" }} />
            </div>
            <div style={{ fontSize: 19, color: "var(--text3)", marginTop: 4 }}>{submittedCount}/{totalStudents} submitted - {correctCount} correct</div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: 19, fontWeight: 700, marginBottom: 12 }}>Student Answers</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 320, overflowY: "auto" }}>
              {Object.entries(participants).map(([pUid, p]) => {
                const ans = answers.find(a => a.uid === pUid);
                const hasSubmitted = ans !== undefined && ans.answer !== undefined && ans.answer !== null;
                const isCorrect = hasSubmitted && gradeAnswer(ans.answer, question);
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
                          <span style={{ fontFamily: "var(--mono)", fontSize: 20, color: "var(--text2)" }}>
                            {parseRepeatingInput(ans.answer).display}
                          </span>
                        )}
                        <span style={{ fontWeight: 700, color: isCorrect ? "var(--green)" : "var(--red)" }}>
                          {isCorrect ? `+${question.points}` : "X"}
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
        </div>
      )}

      {session.status === "revealing" && (
        <div className="card" style={{ marginTop: 16 }}>
          <Leaderboard participants={participants} currentUid={uid} isEnded={false} />
        </div>
      )}

      {session.status === "ended" && (
        <div className="card">
          <Leaderboard participants={participants} currentUid={uid} isEnded={true} />
        </div>
      )}
    </div>
  );
}

//  Student View 
function StudentWorksheet({ session, sessionId, uid }) {
  const [inputRaw, setInputRaw] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [lastQIdx, setLastQIdx] = useState(-1);
  const [lastOverrideKey, setLastOverrideKey] = useState(null);

  const qIdx = session.currentQuestion >= 0 ? session.currentQuestion : null;
  const question = session.currentQuestionOverride || (qIdx !== null ? WORKSHEET_QUESTIONS[qIdx] : null);
  const overrideKey = session.currentQuestionOverride?.prompt || null;
  const participants = session.participants || {};
  const myScore = participants[uid]?.totalScore || 0;

  // Reset on new question index
  useEffect(() => {
    if (qIdx !== null && qIdx !== lastQIdx) {
      setInputRaw(""); setSubmitted(false); setResult(null);
      setLastQIdx(qIdx); setLastOverrideKey(null);
    }
  }, [qIdx]);

  // Reset on repeat question
  useEffect(() => {
    if (overrideKey && overrideKey !== lastOverrideKey) {
      setInputRaw(""); setSubmitted(false); setResult(null);
      setLastOverrideKey(overrideKey);
    }
  }, [overrideKey]);

  const handleSubmit = async () => {
    if (!question || submitted || !inputRaw) return;
    const correct = gradeAnswer(inputRaw, question);
    const displayAnswer = parseRepeatingInput(inputRaw).display;
    await setDoc(doc(db, "sessions", sessionId, "answers", `${uid}_${qIdx}`), {
      uid, questionIndex: qIdx, answer: inputRaw, displayAnswer, correct, submittedAt: Date.now(),
    });
    setResult({ correct, answer: displayAnswer });
    setSubmitted(true);
  };

  if (session.status === "waiting") return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Waiting for the teacher...</h2>
      <p style={{ color: "var(--text2)" }}>Get ready - the session is about to begin!</p>
    </div>
  );

  if (session.status === "ended") return (
    <div className="card" style={{ maxWidth: 500, margin: "0 auto", textAlign: "center", padding: "40px 20px" }}>
      <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Session Complete!</h2>
      <div style={{ fontSize: 28, fontWeight: 900, color: "var(--blue)", marginBottom: 4 }}>
        {myScore} / {TOTAL_POINTS} pts
      </div>
      <Leaderboard participants={participants} currentUid={uid} isEnded={true} />
    </div>
  );

  return (
    <div style={{ maxWidth: 560, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 20, color: "var(--text3)" }}>
          Question {(qIdx ?? 0) + 1} of {WORKSHEET_QUESTIONS.length}
        </div>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "6px 14px", fontSize: 20, fontWeight: 700 }}>
          Score: {myScore} pts
        </div>
      </div>

      <div className="card" key={`${qIdx}-${overrideKey}`}>
        {session.status === "question" && session.timerEndsAt && !submitted && (
          <TimerBar endsAt={session.timerEndsAt} totalSeconds={session.timerSeconds} />
        )}

        {question && (
          <>
            <div style={{ fontSize: 19, color: "var(--text3)", marginBottom: 8 }}>
              {question.section} - {question.sectionTitle}
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 20, color: "var(--text)" }}>
              {question.prompt}
            </div>
          </>
        )}

        {session.status === "revealing" ? (
          <div style={{ animation: "fadeUp 0.3s ease", textAlign: "center" }}>
            {result ? (
              <>
                <div style={{ fontSize: 22, fontWeight: 800, color: result.correct ? "var(--green)" : "var(--red)", marginBottom: 8 }}>
                  {result.correct ? `Correct! +${question?.points} pts` : "Incorrect"}
                </div>
                <div style={{ fontSize: 19, color: "var(--text2)", marginBottom: 4 }}>
                  Your answer: <strong style={{ fontFamily: "var(--mono)" }}>{result.answer}</strong>
                </div>
                {!result.correct && (
                  <div style={{ fontSize: 19, color: "var(--green)" }}>
                    Correct: <strong style={{ fontFamily: "var(--mono)" }}>{question?.answer}</strong>
                  </div>
                )}
              </>
            ) : (
              <div>
                <div style={{ color: "var(--text3)", marginBottom: 8 }}>No answer submitted.</div>
                <div style={{ color: "var(--green)", fontSize: 19 }}>
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
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--green)", marginBottom: 4 }}>Submitted!</div>
            <div style={{ fontSize: 20, color: "var(--text3)" }}>Waiting for teacher to reveal...</div>
          </div>
        ) : (
          <RepeatingInput
            value={inputRaw}
            onChange={setInputRaw}
            onSubmit={handleSubmit}
            disabled={submitted}
          />
        )}
      </div>
    </div>
  );
}

//  Create Session 
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
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Decimal Operations Worksheet</h2>
        <p style={{ color: "var(--text2)", fontSize: 20, marginBottom: 20 }}>
          20 questions covering decimal multiplication, fraction-to-decimal conversion, decimal division, and order of operations.
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
        <div style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "12px 14px", marginBottom: 20, fontSize: 20, color: "var(--text2)" }}>
          <strong>20 questions - {TOTAL_POINTS} points total</strong><br />
          Decimal multiplication - Fraction to decimal - Decimal division - Order of operations
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
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,var(--blue),var(--cyan))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "#fff" }}>WS</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 20 }}>GCA</div>
              <div style={{ color: "var(--text3)", fontSize: 19 }}>Decimal Operations Session</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onHome}>Back to Home</button>
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

