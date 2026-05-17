import { useState, useEffect, useRef } from "react";
import { saveProgress as fbSaveProgress, getProgress } from "./core/firebase";
import {
  genSimplifyThenSolve, gradeSimplifyLHS, gradeSimplifyThenSolve,
  genBothSides, gradeBothSidesElimChoice, gradeBothSidesResult, gradeBothSidesSolve,
  genBothSidesSimplify,
  gradeBothSidesSimplifyLHS, gradeBothSidesSimplifyRHS,
  gradeBothSidesSimplifyElim, gradeBothSidesSimplifyResult, gradeBothSidesSimplifyFinal,
  genNoSolutionQuestion, gradeNoSolutionStage2, gradeNoSolutionStage3,
  genRadicalEquations, gradeRadicalSolve,
} from "./lesson10Questions";

export const LESSON10_MASTERY_TOPIC_ID = "lesson10-mastery-v1";
const STREAK3 = 3;
const STREAK2 = 2;

// -- KaTeX --
function useKaTeX() {
  useEffect(() => {
    if (window.katex) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css";
    document.head.appendChild(link);
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js";
    s.async = true;
    document.head.appendChild(s);
  }, []);
}

function KaTeXBlock({ expr }) {
  const ref = useRef(null);
  useEffect(() => {
    const go = () => {
      if (window.katex && ref.current) {
        try { window.katex.render(expr, ref.current, { throwOnError: false, displayMode: true }); } catch {}
      } else setTimeout(go, 100);
    };
    go();
  });
  return <div ref={ref} style={{ fontSize: 26, margin: "6px 0", minHeight: 36 }} />;
}

function StreakDots({ current, needed }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
      {Array.from({ length: needed }).map((_, i) => (
        <div key={i} style={{ width: 13, height: 13, borderRadius: "50%", background: i < current ? "var(--green)" : "var(--surface2)", border: "2px solid " + (i < current ? "var(--green)" : "var(--border2)"), transition: "all 0.2s" }} />
      ))}
      <span style={{ fontSize: 20, color: "var(--text3)", marginLeft: 6 }}>{current}/{needed}</span>
    </div>
  );
}

function FeedbackBanner({ correct, message, onNext, nextLabel }) {
  return (
    <div style={{ textAlign: "center", marginTop: 12 }}>
      <div style={{ fontSize: 24, fontWeight: 800, color: correct ? "var(--green)" : "var(--red)", marginBottom: 10 }}>
        {correct ? "Correct!" : "Incorrect"}
      </div>
      {message && (
        <div style={{ fontSize: 20, color: "var(--text2)", marginBottom: 14, background: correct ? "rgba(22,163,74,0.06)" : "rgba(239,68,68,0.06)", border: "1px solid " + (correct ? "rgba(22,163,74,0.2)" : "rgba(239,68,68,0.2)"), borderRadius: "var(--radius-sm)", padding: "10px 16px" }}>
          {message}
        </div>
      )}
      <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }} onClick={onNext}>
        {nextLabel || (correct ? "Next" : "Try Again")}
      </button>
    </div>
  );
}

function TextInput({ onSubmit, placeholder, allowNeg, allowEq, wide }) {
  const [val, setVal] = useState("");
  const ref = useRef(null);
  useEffect(() => { setVal(""); setTimeout(() => ref.current?.focus(), 80); }, []);
  const filter = allowEq ? v => v.replace(/[^0-9\-\+\=xa-z\s]/gi, "")
    : allowNeg ? v => v.replace(/[^0-9\-,a-z\s]/gi, "")
    : v => v.replace(/[^0-9a-z\s]/gi, "");
  const submit = () => { if (val.trim()) { onSubmit(val.trim()); setVal(""); } };
  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
      <input ref={ref} value={val} onChange={e => setVal(filter(e.target.value))}
        onKeyDown={e => e.key === "Enter" && submit()}
        placeholder={placeholder || ""}
        style={{ textAlign: "center", fontSize: 22, fontFamily: "var(--mono)", fontWeight: 700, padding: "10px", width: wide ? 260 : 200 }} />
      <button className="btn btn-primary" style={{ fontSize: 20, padding: "10px 20px" }}
        onMouseDown={e => { e.preventDefault(); submit(); }} disabled={!val.trim()}>OK</button>
    </div>
  );
}

// -- Activity 2: Simplify and Solve --
function SimplifySolveMastery({ onCorrect, onWrong }) {
  useKaTeX();
  const [q] = useState(() => genSimplifyThenSolve());
  const [stage, setStage] = useState(0);
  const [feedback, setFeedback] = useState(null);

  const handleStage1 = (val) => {
    const correct = gradeSimplifyLHS(val, q);
    setFeedback({ correct, stage: 0 });
    if (!correct) onWrong();
  };

  const handleStage2 = (val) => {
    const correct = gradeSimplifyThenSolve(val, q);
    setFeedback({ correct, stage: 1 });
    if (correct) onCorrect(); else onWrong();
  };

  return (
    <div>
      <div style={{ fontSize: 20, color: "var(--text3)", marginBottom: 6, fontWeight: 600 }}>
        {stage === 0 ? "Stage 1: Simplify the left side" : "Stage 2: Solve for x"}
      </div>
      <KaTeXBlock expr={stage === 0 ? q.latex : q.simplifiedEq} />

      {stage === 0 && !feedback && (
        <div>
          <div style={{ fontSize: 20, color: "var(--text3)", marginBottom: 6 }}>Enter the resulting equation after simplifying the left side (e.g. 8x - 12 = 4)</div>
          <TextInput key="s1" onSubmit={handleStage1} allowEq wide />
        </div>
      )}
      {stage === 0 && feedback && (
        <FeedbackBanner correct={feedback.correct}
          message={feedback.correct ? null : `Simplified: ${q.simplifiedEq}`}
          onNext={() => { if (feedback.correct) { setStage(1); setFeedback(null); } else setFeedback(null); }}
          nextLabel={feedback.correct ? "Next Stage" : "Try Again"} />
      )}
      {stage === 1 && !feedback && (
        <TextInput key="s2" onSubmit={handleStage2} allowNeg placeholder="Enter x" />
      )}
      {stage === 1 && feedback && (
        <FeedbackBanner correct={feedback.correct}
          message={feedback.correct ? null : `x = ${q.x}`}
          onNext={() => setFeedback(null)}
          nextLabel={feedback.correct ? "Next Problem" : "Try Again"} />
      )}
    </div>
  );
}

// -- Activity 3: Variables on Both Sides (3 stages) --
function BothSidesMastery({ onCorrect, onWrong }) {
  useKaTeX();
  const [q] = useState(() => genBothSides());
  const [stage, setStage] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [eliminatedA, setEliminatedA] = useState(null);
  const [choice, setChoice] = useState("");

  const handleStage1Submit = () => {
    const correct = gradeBothSidesElimChoice(choice, q);
    if (correct) {
      const elA = choice.toLowerCase().replace(/\s/g, "") === q.aStr.toLowerCase().replace(/\s/g, "");
      setEliminatedA(elA);
      setFeedback({ correct: true, stage: 0 });
    } else {
      setFeedback({ correct: false, stage: 0 });
      onWrong();
    }
  };

  const handleStage2 = (val) => {
    const qWithElim = { ...q, _eliminatedA: eliminatedA };
    const correct = gradeBothSidesResult(val, qWithElim, eliminatedA);
    setFeedback({ correct, stage: 1 });
    if (!correct) onWrong();
  };

  const handleStage3 = (val) => {
    const correct = gradeBothSidesSolve(val, q);
    setFeedback({ correct, stage: 2 });
    if (correct) onCorrect(); else onWrong();
  };

  const resultEq = eliminatedA ? q.resultEqA : q.resultEqB;

  return (
    <div>
      <div style={{ fontSize: 20, color: "var(--text3)", marginBottom: 6, fontWeight: 600 }}>
        {["Stage 1: Choose term to eliminate", "Stage 2: Write resulting equation", "Stage 3: Solve for x"][stage]}
      </div>
      <KaTeXBlock expr={stage === 2 && resultEq ? resultEq : q.latex} />

      {stage === 0 && !feedback && (
        <div>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 12 }}>
            {[q.aStr, q.cStr].map(opt => (
              <button key={opt} onClick={() => setChoice(opt)}
                style={{ padding: "12px 24px", borderRadius: "var(--radius-sm)", border: "2px solid " + (choice === opt ? "var(--blue)" : "var(--border)"), background: choice === opt ? "rgba(27,143,255,0.15)" : "var(--surface)", fontFamily: "var(--mono)", fontSize: 22, fontWeight: 800, cursor: "pointer", color: choice === opt ? "var(--blue)" : "var(--text)" }}>
                {opt}
              </button>
            ))}
          </div>
          <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }}
            onClick={handleStage1Submit} disabled={!choice}>Submit</button>
        </div>
      )}
      {stage === 0 && feedback && (
        <FeedbackBanner correct={feedback.correct}
          message={feedback.correct ? null : `Eliminate either ${q.aStr} or ${q.cStr} - both are valid.`}
          onNext={() => { if (feedback.correct) { setStage(1); setFeedback(null); } else setFeedback(null); }}
          nextLabel={feedback.correct ? "Next Stage" : "Try Again"} />
      )}

      {stage === 1 && !feedback && (
        <div>
          <div style={{ fontSize: 20, color: "var(--text3)", marginBottom: 6 }}>Enter the resulting equation</div>
          <TextInput key="b2" onSubmit={handleStage2} allowEq wide />
        </div>
      )}
      {stage === 1 && feedback && (
        <FeedbackBanner correct={feedback.correct}
          message={feedback.correct ? null : `Result: ${resultEq}`}
          onNext={() => { if (feedback.correct) { setStage(2); setFeedback(null); } else setFeedback(null); }}
          nextLabel={feedback.correct ? "Next Stage" : "Try Again"} />
      )}

      {stage === 2 && !feedback && (
        <TextInput key="b3" onSubmit={handleStage3} allowNeg placeholder="Enter x" />
      )}
      {stage === 2 && feedback && (
        <FeedbackBanner correct={feedback.correct}
          message={feedback.correct ? null : `x = ${q.x}`}
          onNext={() => setFeedback(null)}
          nextLabel={feedback.correct ? "Next Problem" : "Try Again"} />
      )}
    </div>
  );
}

// -- Activity 4: Both Sides with Simplification (5 stages) --
function BothSidesSimplifyMastery({ onCorrect, onWrong }) {
  useKaTeX();
  const [q] = useState(() => genBothSidesSimplify());
  const [stage, setStage] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [choice, setChoice] = useState("");

  const stageLabels = [
    "Stage 1: Simplify left side",
    "Stage 2: Simplify right side",
    "Stage 3: Choose term to eliminate",
    "Stage 4: Write resulting equation",
    "Stage 5: Solve for x",
  ];

  const handleSubmit = (val) => {
    let correct = false;
    if (stage === 0) correct = gradeBothSidesSimplifyLHS(val, q);
    else if (stage === 1) correct = gradeBothSidesSimplifyRHS(val, q);
    else if (stage === 3) correct = gradeBothSidesSimplifyResult(val, q);
    else if (stage === 4) correct = gradeBothSidesSimplifyFinal(val, q);
    setFeedback({ correct, stage });
    if (!correct) onWrong();
    if (correct && stage === 4) onCorrect();
  };

  const handleElimSubmit = () => {
    const correct = gradeBothSidesSimplifyElim(choice, q);
    setFeedback({ correct, stage: 2 });
    if (!correct) onWrong();
  };

  const nextStage = () => {
    setStage(s => s + 1);
    setFeedback(null);
    setChoice("");
  };

  const wrongMessages = [
    `Simplified LHS: ${q.simplifiedLHS}`,
    `Simplified RHS: ${q.simplifiedRHS}`,
    `Eliminate either ${q.aStr} or ${q.eStr}`,
    `Result: ${q.resultEq}`,
    `x = ${q.x}`,
  ];

  const displayExpr = () => {
    if (stage === 0 || stage === 1) return q.latex;
    if (stage === 2 || stage === 3) return `${q.simplifiedLHS} = ${q.simplifiedRHS}`;
    return q.resultEq;
  };

  return (
    <div>
      <div style={{ fontSize: 20, color: "var(--text3)", marginBottom: 6, fontWeight: 600 }}>{stageLabels[stage]}</div>
      <KaTeXBlock expr={displayExpr()} />

      {stage === 2 ? (
        !feedback ? (
          <div>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 12 }}>
              {[q.aStr, q.eStr].map(opt => (
                <button key={opt} onClick={() => setChoice(opt)}
                  style={{ padding: "12px 24px", borderRadius: "var(--radius-sm)", border: "2px solid " + (choice === opt ? "var(--blue)" : "var(--border)"), background: choice === opt ? "rgba(27,143,255,0.15)" : "var(--surface)", fontFamily: "var(--mono)", fontSize: 22, fontWeight: 800, cursor: "pointer", color: choice === opt ? "var(--blue)" : "var(--text)" }}>
                  {opt}
                </button>
              ))}
            </div>
            <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }}
              onClick={handleElimSubmit} disabled={!choice}>Submit</button>
          </div>
        ) : (
          <FeedbackBanner correct={feedback.correct}
            message={feedback.correct ? null : wrongMessages[2]}
            onNext={() => { if (feedback.correct) nextStage(); else setFeedback(null); }}
            nextLabel={feedback.correct ? "Next Stage" : "Try Again"} />
        )
      ) : !feedback ? (
        <div>
          {stage < 2 && <div style={{ fontSize: 20, color: "var(--text3)", marginBottom: 6 }}>Do not solve - simplify only.</div>}
          <TextInput key={`stage${stage}`} onSubmit={handleSubmit}
            allowEq={stage < 4} allowNeg={stage === 4}
            placeholder={stage === 4 ? "Enter x" : "e.g. 10x+3"} wide={stage < 4} />
        </div>
      ) : (
        <FeedbackBanner correct={feedback.correct}
          message={feedback.correct ? null : wrongMessages[stage]}
          onNext={() => { if (feedback.correct) { if (stage < 4) nextStage(); } else setFeedback(null); }}
          nextLabel={feedback.correct ? (stage < 4 ? "Next Stage" : "Next Problem") : "Try Again"} />
      )}
    </div>
  );
}

// -- Activity 5: No Solution / All Real Numbers --
function NoSolutionMastery({ onCorrect, onWrong }) {
  useKaTeX();
  const [q] = useState(() => genNoSolutionQuestion());
  // Use stage 2 and 3 from the generator (not the trivial cases)
  const isStage3 = Math.random() < 0.5;
  const latex = isStage3 ? q.stage3Latex : q.stage2Latex;
  const correctAnswer = isStage3 ? q.stage3Answer : q.stage2Answer;
  const [feedback, setFeedback] = useState(null);
  const [choice, setChoice] = useState("");

  const handleSubmit = () => {
    const s = choice.trim().toLowerCase().replace(/\s/g, "");
    const ans = correctAnswer.toLowerCase().replace(/\s/g, "");
    const correct = s === ans || (s === "allreals" && ans === "allrealnumbers");
    setFeedback({ correct });
    if (correct) onCorrect(); else onWrong();
  };

  const opts = ["No solution", "All real numbers"];

  return (
    <div>
      <KaTeXBlock expr={latex} />
      {feedback ? (
        <FeedbackBanner correct={feedback.correct}
          message={feedback.correct ? null : `Answer: ${correctAnswer}`}
          onNext={() => setFeedback(null)} />
      ) : (
        <div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 12 }}>
            {opts.map(o => (
              <button key={o} onClick={() => setChoice(o)}
                style={{ padding: "12px 22px", borderRadius: "var(--radius-sm)", border: "2px solid " + (choice === o ? "var(--blue)" : "var(--border)"), background: choice === o ? "rgba(27,143,255,0.15)" : "var(--surface)", fontFamily: "var(--font)", fontSize: 20, fontWeight: 700, cursor: "pointer", color: choice === o ? "var(--blue)" : "var(--text)" }}>
                {o}
              </button>
            ))}
          </div>
          <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }}
            onClick={handleSubmit} disabled={!choice}>Submit</button>
        </div>
      )}
    </div>
  );
}

// -- Activity 6: sqrt(x) = a --
function SqrtMastery({ onCorrect, onWrong }) {
  useKaTeX();
  const PERFECT_SQUARES = [0,1,4,9,16,25,36,49,64,81,100];
  const genQ = () => {
    const type = Math.random() < 0.33 ? "neg" : Math.random() < 0.5 ? "zero" : "pos";
    if (type === "pos") {
      const root = Math.floor(Math.random() * 10) + 1; // 1-10
      const a = root;
      return { latex: `\\sqrt{x} = ${a}`, solution: a * a, answer: String(a * a), isNoSol: false };
    } else if (type === "neg") {
      const a = Math.floor(Math.random() * 9) + 1; // 1-9
      return { latex: `\\sqrt{x} = -${a}`, solution: null, answer: "no solution", isNoSol: true };
    } else {
      return { latex: `\\sqrt{x} = 0`, solution: 0, answer: "0", isNoSol: false };
    }
  };
  const [q] = useState(() => genQ());
  const [feedback, setFeedback] = useState(null);

  const handleSubmit = (val) => {
    const s = val.trim().toLowerCase().replace(/\s/g, "");
    const correct = q.isNoSol ? (s === "nosolution" || s === "no solution") : parseInt(s) === q.solution;
    setFeedback({ correct });
    if (correct) onCorrect(); else onWrong();
  };

  return (
    <div>
      <KaTeXBlock expr={q.latex} />
      <div style={{ fontSize: 20, color: "var(--text3)", marginBottom: 8, textAlign: "center" }}>
        Enter x value, or type "no solution"
      </div>
      {feedback ? (
        <FeedbackBanner correct={feedback.correct}
          message={feedback.correct ? null : `Answer: ${q.isNoSol ? "no solution" : `x = ${q.solution}`}`}
          onNext={() => setFeedback(null)} />
      ) : (
        <TextInput onSubmit={handleSubmit} allowNeg placeholder={q.isNoSol ? "no solution" : "Enter x"} />
      )}
    </div>
  );
}

// -- Activity 7: cbrt(x) = a --
function CbrtMastery({ onCorrect, onWrong }) {
  useKaTeX();
  const CUBES = [-125,-64,-27,-8,-1,0,1,8,27,64,125];
  const genQ = () => {
    const a = CUBES[Math.floor(Math.random() * CUBES.length)];
    const root = Math.round(Math.cbrt(a));
    const aStr = a < 0 ? `(${a})` : String(a);
    return { latex: `\\sqrt[3]{x} = ${a >= 0 ? a : a}`, a, root, answer: String(root) };
  };
  const [q] = useState(() => genQ());
  const [feedback, setFeedback] = useState(null);

  const handleSubmit = (val) => {
    const correct = parseInt(val.trim()) === q.root;
    setFeedback({ correct });
    if (correct) onCorrect(); else onWrong();
  };

  return (
    <div>
      <KaTeXBlock expr={`\\sqrt[3]{x} = ${q.a}`} />
      <div style={{ fontSize: 20, color: "var(--text3)", marginBottom: 8, textAlign: "center" }}>Enter the value of x</div>
      {feedback ? (
        <FeedbackBanner correct={feedback.correct}
          message={feedback.correct ? null : `x = ${q.root}`}
          onNext={() => setFeedback(null)} />
      ) : (
        <TextInput onSubmit={handleSubmit} allowNeg placeholder="Enter x" />
      )}
    </div>
  );
}

// -- Steps --
const STEPS = [
  { id: "simplify-solve", label: "Simplify and Solve",              description: "a(bx+c)+dx=e, 2 stages, 3 correct in a row",    streak: STREAK3 },
  { id: "both-sides",     label: "Variables on Both Sides",         description: "ax+b=cx+d, 3 stages, 2 correct in a row",       streak: STREAK2 },
  { id: "both-simplify",  label: "Both Sides with Simplification",  description: "5 stages, 2 correct in a row",                   streak: STREAK2 },
  { id: "no-solution",    label: "No Solution / All Real Numbers",  description: "Select answer type, 3 correct in a row",         streak: STREAK3 },
  { id: "sqrt-x",         label: "Square Root Equations",           description: "sqrt(x) = a, 3 correct in a row",                streak: STREAK3 },
  { id: "cbrt-x",         label: "Cube Root Equations",             description: "cbrt(x) = a, 3 correct in a row",               streak: STREAK3 },
];

export default function Lesson10MasteryPlayer({ user, topic, onHome }) {
  useKaTeX();
  const topicId = topic?.id || LESSON10_MASTERY_TOPIC_ID;
  const [loading, setLoading] = useState(true);
  const [stepIdx, setStepIdx] = useState(0);
  const [streak, setStreak] = useState(0);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const load = async () => {
      const prog = await getProgress(user.id, topicId);
      if (prog?.data?.completed) { setCompleted(true); setLoading(false); return; }
      if (prog?.data?.stepIdx !== undefined) setStepIdx(prog.data.stepIdx);
      if (prog?.data?.streak !== undefined) setStreak(prog.data.streak);
      setLoading(false);
    };
    load();
  }, []);

  const save = async (si, st, done) => {
    const pct = done ? 100 : Math.round((si / STEPS.length) * 100);
    await fbSaveProgress(user.id, topicId, {
      started: true, completed: done, percentComplete: pct,
      data: { stepIdx: si, streak: st, completed: done },
    });
    setStepIdx(si); setStreak(st);
    if (done) setCompleted(true);
  };

  const handleCorrect = async () => {
    const needed = STEPS[stepIdx]?.streak || STREAK3;
    const newStreak = streak + 1;
    if (newStreak >= needed) {
      const nextStep = stepIdx + 1;
      await save(nextStep, 0, nextStep >= STEPS.length);
    } else {
      await save(stepIdx, newStreak, false);
    }
  };

  const handleWrong = async () => {
    await save(stepIdx, 0, false);
  };

  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><div className="spinner" /></div>;

  if (completed) return (
    <div style={{ maxWidth: 520, margin: "0 auto", textAlign: "center" }}>
      <div className="card">
        <div style={{ fontSize: 48, fontWeight: 900, color: "var(--amber)", marginBottom: 16 }}>100%</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>HW 10 (019) Complete!</h2>
        <p style={{ fontSize: 20, color: "var(--text2)", marginBottom: 24 }}>Linear equations and radicals mastered!</p>
        <button className="btn btn-primary btn-lg" style={{ width: "100%" }} onClick={onHome}>Back to Home</button>
      </div>
    </div>
  );

  const step = STEPS[stepIdx];
  if (!step) return null;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "clamp(16px,3vw,32px)" }} className="dot-bg">
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,var(--blue),var(--orange))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "#fff" }}>L10</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 22 }}>HW 10 (019): Mastery Activities</div>
              <div style={{ fontSize: 20, color: "var(--text3)" }}>Complete each activity to advance</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onHome}>Back to Home</button>
        </div>

        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 16 }}>
          {STEPS.map((s, i) => {
            const done = i < stepIdx, active = i === stepIdx;
            return (
              <div key={s.id} style={{ fontSize: 19, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: done ? "rgba(22,163,74,0.12)" : active ? "rgba(27,143,255,0.12)" : "var(--surface)", color: done ? "var(--green)" : active ? "var(--blue)" : "var(--text3)", border: "1px solid " + (done ? "rgba(22,163,74,0.3)" : active ? "rgba(27,143,255,0.3)" : "var(--border)") }}>
                {done ? "done" : s.label}
              </div>
            );
          })}
        </div>

        <div className="card">
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{step.label}</div>
            <div style={{ fontSize: 20, color: "var(--text2)" }}>{step.description}</div>
          </div>
          <StreakDots current={streak} needed={step.streak} />

          {step.id === "simplify-solve" && <SimplifySolveMastery key={stepIdx + "-" + streak} onCorrect={handleCorrect} onWrong={handleWrong} />}
          {step.id === "both-sides"    && <BothSidesMastery key={stepIdx + "-" + streak} onCorrect={handleCorrect} onWrong={handleWrong} />}
          {step.id === "both-simplify" && <BothSidesSimplifyMastery key={stepIdx + "-" + streak} onCorrect={handleCorrect} onWrong={handleWrong} />}
          {step.id === "no-solution"   && <NoSolutionMastery key={stepIdx + "-" + streak} onCorrect={handleCorrect} onWrong={handleWrong} />}
          {step.id === "sqrt-x"        && <SqrtMastery key={stepIdx + "-" + streak} onCorrect={handleCorrect} onWrong={handleWrong} />}
          {step.id === "cbrt-x"        && <CbrtMastery key={stepIdx + "-" + streak} onCorrect={handleCorrect} onWrong={handleWrong} />}
        </div>
      </div>
    </div>
  );
}
