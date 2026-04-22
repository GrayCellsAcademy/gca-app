import { useState, useEffect } from "react";
import { saveProgress, getProgress } from "./core/firebase";
import { REVIEW_TOPICS, generateReviewQuestion, gradeReviewAnswer } from "./reviewQuestions";
import {
  QuestionDisplay, AnswerInput, MixedNumberInput,
  fracToLatex, KaTeX, useKaTeX, NumberLine, UnitSpan,
} from "./ReviewSession";

export const REVIEW_HOMEWORK_TOPIC_ID = "review-homework-v1";

// Streak badge shown on the topic grid
function StreakBadge({ streak }) {
  if (streak === null || streak === undefined) {
    return (
      <div style={{
        fontSize: 11, fontWeight: 700, color: "var(--text3)",
        background: "var(--surface2)", borderRadius: 99,
        padding: "2px 8px", letterSpacing: "0.04em",
      }}>not tried</div>
    );
  }
  if (streak === 0) {
    return (
      <div style={{
        fontSize: 11, fontWeight: 700, color: "var(--amber)",
        background: "rgba(245,158,11,0.12)", borderRadius: 99,
        padding: "2px 8px",
      }}>tried, 0 in a row</div>
    );
  }
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, color: "var(--green)",
      background: "rgba(16,185,129,0.12)", borderRadius: 99,
      padding: "2px 8px",
    }}>{streak} in a row</div>
  );
}

// Summary bar across the top
function SummaryBar({ streaks }) {
  const total = REVIEW_TOPICS.length;
  const tried = REVIEW_TOPICS.filter(t => streaks["q" + t.id] !== null && streaks["q" + t.id] !== undefined).length;
  const streaking = REVIEW_TOPICS.filter(t => (streaks["q" + t.id] || 0) >= 3).length;
  return (
    <div style={{
      display: "flex", gap: 20, flexWrap: "wrap",
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: "var(--radius-sm)", padding: "10px 16px",
      marginBottom: 20, fontSize: 13,
    }}>
      <span><strong style={{ color: "var(--blue)" }}>{tried}</strong><span style={{ color: "var(--text3)" }}>/{total} tried</span></span>
      <span><strong style={{ color: "var(--green)" }}>{streaking}</strong><span style={{ color: "var(--text3)" }}> with streak 3+</span></span>
      <span style={{ color: "var(--text3)" }}>No grade - just practice</span>
    </div>
  );
}

// Topic grid - all 44 topics
function TopicGrid({ streaks, onSelect }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
      gap: 8,
    }}>
      {REVIEW_TOPICS.map(t => {
        const streak = streaks["q" + t.id];
        const tried = streak !== null && streak !== undefined;
        const good = (streak || 0) >= 3;
        return (
          <button
            key={t.id}
            onClick={() => onSelect(t.id)}
            style={{
              background: good ? "rgba(16,185,129,0.06)" : tried ? "rgba(245,158,11,0.05)" : "var(--surface)",
              border: "1.5px solid " + (good ? "rgba(16,185,129,0.3)" : tried ? "rgba(245,158,11,0.25)" : "var(--border)"),
              borderRadius: "var(--radius-sm)",
              padding: "10px 12px",
              cursor: "pointer",
              textAlign: "left",
              fontFamily: "var(--font)",
              transition: "all 0.15s",
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", marginBottom: 4 }}>
              Q{t.id}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 6, lineHeight: 1.3 }}>
              {t.label}
            </div>
            <StreakBadge streak={streak} />
          </button>
        );
      })}
    </div>
  );
}

// Question panel for a single topic
function QuestionPanel({ topicId, streak, onStreakChange, onBack }) {
  useKaTeX();
  const [question, setQuestion] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null); // null | { correct, answer }
  const [currentStreak, setCurrentStreak] = useState(streak ?? null);

  const topic = REVIEW_TOPICS.find(t => t.id === topicId);

  useEffect(() => {
    generateNew();
  }, [topicId]);

  const generateNew = () => {
    const q = generateReviewQuestion(topicId);
    setQuestion(q);
    setSubmitted(false);
    setResult(null);
  };

  const handleSubmit = (inputVal) => {
    if (!question || submitted) return;
    const ans = String(inputVal).trim();
    if (!ans) return;
    const correct = gradeReviewAnswer(ans, question);
    const newStreak = correct ? (currentStreak || 0) + 1 : 0;
    setCurrentStreak(newStreak);
    setResult({ correct, answer: ans });
    setSubmitted(true);
    onStreakChange(topicId, newStreak);
  };

  const handleTryAgain = () => {
    generateNew();
  };

  if (!topic || !question) return null;

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <button className="btn btn-ghost btn-sm" onClick={onBack}>
          Back to topics
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Q{topicId} - {topic.label}
          </div>
        </div>
        <StreakBadge streak={currentStreak} />
      </div>

      <div className="card">
        {/* Prompt */}
        {!["q38","q39","q43","q44"].includes(question.type) && (
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: "var(--text2)" }}>
            {question.prompt}
          </div>
        )}

        {/* Question display */}
        <QuestionDisplay question={question} revealing={submitted} />

        {/* Result */}
        {submitted ? (
          <div style={{ marginTop: 16 }}>
            {/* Correct/incorrect banner */}
            <div style={{
              textAlign: "center", fontWeight: 800, fontSize: 20, marginBottom: 12,
              color: result.correct ? "var(--green)" : "var(--red)",
            }}>
              {result.correct ? "Correct!" : "Incorrect"}
            </div>

            {/* Show correct answer if wrong */}
            {!result.correct && (
              <div style={{
                background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)",
                borderRadius: "var(--radius-sm)", padding: "10px 14px", marginBottom: 12, textAlign: "center",
              }}>
                <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 4 }}>Correct answer</div>
                {(() => {
                  const q = question;
                  if (q.type === "q13") return <KaTeX expr={q.variable + "^{" + q.total + "}"} />;
                  if (q.type === "q26") return <KaTeX expr={q.n > q.m ? q.v + "^{" + (q.n - q.m) + "}" : "\\dfrac{1}{" + q.v + "^{" + (q.m - q.n) + "}}"} />;
                  if (q.type === "q16") return <KaTeX expr={q.answerLatex || q.displayAnswer || q.answer} />;
                  if (q.type === "q23") {
                    let ans = null;
                    try { ans = typeof q.answer === "object" ? q.answer : JSON.parse(q.answer); } catch {}
                    return ans ? <NumberLine value={ans.val} filled={ans.filled} shadeRight={ans.shadeRight} interactive={false} /> : null;
                  }
                  if (["q25","q27","q28","q29","q30","q31","q32","q33","q34"].includes(q.type)) {
                    return <KaTeX expr={fracToLatex(q.displayAnswer || q.answer)} />;
                  }
                  return (
                    <strong style={{ fontSize: 18, color: "var(--green)", fontFamily: "var(--mono)" }}>
                      {q.displayAnswer || q.answerNum || q.answer}
                      {q.answerUnit ? <> <UnitSpan unit={q.answerUnit} /></> : ""}
                    </strong>
                  );
                })()}
              </div>
            )}

            {/* Current streak display */}
            <div style={{ textAlign: "center", fontSize: 13, color: "var(--text3)", marginBottom: 16 }}>
              {result.correct
                ? "Current streak: " + currentStreak + " in a row"
                : "Streak reset to 0"}
            </div>

            {/* Buttons */}
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleTryAgain}>
                Try another
              </button>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onBack}>
                Back to topics
              </button>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 14 }}>
            <AnswerInput question={question} onSubmit={handleSubmit} submitted={submitted} />
          </div>
        )}
      </div>
    </div>
  );
}

// Main export
export default function ReviewHomework({ user, onHome }) {
  useKaTeX();
  const [streaks, setStreaks] = useState({}); // { q1: null|number, q2: null|number, ... }
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load progress
  useEffect(() => {
    const load = async () => {
      const prog = await getProgress(user.id, REVIEW_HOMEWORK_TOPIC_ID);
      if (prog?.data?.streaks) {
        setStreaks(prog.data.streaks);
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleStreakChange = async (topicId, newStreak) => {
    const key = "q" + topicId;
    const updated = { ...streaks, [key]: newStreak };
    setStreaks(updated);
    // Compute summary stats for the universal progress schema
    const tried = REVIEW_TOPICS.filter(t => updated["q" + t.id] !== null && updated["q" + t.id] !== undefined).length;
    await saveProgress(user.id, REVIEW_HOMEWORK_TOPIC_ID, {
      started: true,
      completed: false, // no completion concept for homework
      percentComplete: Math.round((tried / REVIEW_TOPICS.length) * 100),
      data: { streaks: updated },
    });
  };

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
      <div className="spinner" />
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "clamp(16px,3vw,32px)" }} className="dot-bg">
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: 24, flexWrap: "wrap", gap: 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: "linear-gradient(135deg,var(--blue),var(--purple))",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 800, color: "#fff",
            }}>HW</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 18 }}>Final Exam Review</div>
              <div style={{ color: "var(--text3)", fontSize: 12 }}>Homework - Practice at your own pace</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onHome}>Back to Home</button>
        </div>

        {selectedTopic ? (
          <QuestionPanel
            key={selectedTopic}
            topicId={selectedTopic}
            streak={streaks["q" + selectedTopic]}
            onStreakChange={handleStreakChange}
            onBack={() => setSelectedTopic(null)}
          />
        ) : (
          <>
            <SummaryBar streaks={streaks} />
            <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 16 }}>
              Tap any topic to practice. No grade - your streak shows how many you got right in a row.
            </div>
            <TopicGrid streaks={streaks} onSelect={setSelectedTopic} />
          </>
        )}
      </div>
    </div>
  );
}
