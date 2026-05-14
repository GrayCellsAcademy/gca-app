import { useState, useEffect, useRef } from "react";
import { saveProgress as fbSaveProgress, getProgress } from "./core/firebase";
import {
  genWarmupA, gradeWarmupA,
  genRectMissingSide, gradeRectSolve,
  genTwoStepEq, gradeTwoStepFirstOp, gradeTwoStepResult, gradeTwoStepSolve,
  genDistributiveEq, gradeDistribute, gradeDistEqSolve,
  genSolveSquare, gradeSolveSquare,
  genSolveCube, gradeSolveCube,
} from "./lesson09Questions";

export const LESSON09_MASTERY_TOPIC_ID = "lesson09-mastery-v1";
const STREAK = 3;

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

function TextInput({ onSubmit, placeholder, allowNeg, allowEq }) {
  const [val, setVal] = useState("");
  const ref = useRef(null);
  useEffect(() => { setVal(""); setTimeout(() => ref.current?.focus(), 80); }, []);
  const filter = allowEq
    ? v => v.replace(/[^0-9\-\+\=xa-z\s]/gi, "")
    : allowNeg
    ? v => v.replace(/[^0-9\-,a-z\s]/gi, "")
    : v => v.replace(/[^0-9a-z\s\.]/gi, "");
  const submit = () => { if (val.trim()) { onSubmit(val.trim()); setVal(""); } };
  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
      <input ref={ref} value={val} onChange={e => setVal(filter(e.target.value))}
        onKeyDown={e => e.key === "Enter" && submit()}
        placeholder={placeholder || ""}
        style={{ textAlign: "center", fontSize: 24, fontFamily: "var(--mono)", fontWeight: 700, padding: "10px", width: 220 }} />
      <button className="btn btn-primary" style={{ fontSize: 20, padding: "10px 20px" }}
        onMouseDown={e => { e.preventDefault(); submit(); }} disabled={!val.trim()}>OK</button>
    </div>
  );
}

// -- Activity 2: Perimeter of Rectangle --
function RectPerimMastery({ onCorrect, onWrong }) {
  const [q] = useState(() => genWarmupA());
  const [feedback, setFeedback] = useState(null);

  const handleSubmit = (val) => {
    const correct = gradeWarmupA(val, q);
    setFeedback({ correct, val });
    if (correct) onCorrect(); else onWrong();
  };

  const VW = 520, VH = 340, pad = 70;
  const minL = Math.max(q.L, 20), minW = Math.max(q.W, 20);
  const scale = Math.min((VW - 2*pad) / minL, (VH - 2*pad) / minW) * 0.80;
  const rw = minL * scale, rh = minW * scale;
  const ox = (VW - rw) / 2, oy = (VH - rh) / 2;
  const f = "#4b5068", g = 28;

  return (
    <div>
      <svg viewBox={`0 0 ${VW} ${VH}`} style={{ width: "100%", maxWidth: 520, display: "block", margin: "0 auto" }}>
        <rect x={ox} y={oy} width={rw} height={rh} fill="rgba(27,143,255,0.07)" stroke="var(--blue)" strokeWidth="2.5" />
        {/* Bottom: L - midpoint of bottom side */}
        <text x={ox+rw/2} y={oy+rh+g} textAnchor="middle" fontSize="15" fill={f} fontWeight="700">{q.L} {q.unit}</text>
        {/* Left: W - midpoint of left side */}
        <text x={ox-g} y={oy+rh/2} textAnchor="middle" fontSize="15" fill={f} fontWeight="700" transform={`rotate(-90,${ox-g},${oy+rh/2})`}>{q.W} {q.unit}</text>
      </svg>
      <div style={{ fontSize: 20, color: "var(--text3)", textAlign: "center", marginBottom: 10 }}>Enter perimeter with units (e.g. 48 ft)</div>
      {feedback ? (
        <FeedbackBanner correct={feedback.correct}
          message={feedback.correct ? null : `P = 2-${q.L} + 2-${q.W} = ${q.perimeter} ${q.unit}`}
          onNext={() => setFeedback(null)} />
      ) : (
        <TextInput onSubmit={handleSubmit} placeholder={`e.g. ${q.perimeter} ${q.unit}`} />
      )}
    </div>
  );
}

// -- Activity 3: Missing Side of Rectangle --
function RectMissingSideMastery({ onCorrect, onWrong }) {
  const [q] = useState(() => genRectMissingSide());
  const [feedback, setFeedback] = useState(null);

  const handleSubmit = (val) => {
    const correct = gradeRectSolve(val, q);
    setFeedback({ correct });
    if (correct) onCorrect(); else onWrong();
  };

  const VW = 520, VH = 340, pad = 70;
  const minL = Math.max(q.L, 20), minW = Math.max(q.W, 20);
  const scale = Math.min((VW - 2*pad) / minL, (VH - 2*pad) / minW) * 0.80;
  const rw = minL * scale, rh = minW * scale;
  const ox = (VW - rw) / 2, oy = (VH - rh) / 2;
  const f = "#4b5068", g = 28;
  const Llabel = q.knownLabel === "L" ? `${q.knownVal} ${q.unit}` : "?";
  const Wlabel = q.knownLabel === "W" ? `${q.knownVal} ${q.unit}` : "?";
  const Lcol = q.knownLabel === "L" ? f : "var(--orange)";
  const Wcol = q.knownLabel === "W" ? f : "var(--orange)";

  return (
    <div>
      <svg viewBox={`0 0 ${VW} ${VH}`} style={{ width: "100%", maxWidth: 520, display: "block", margin: "0 auto" }}>
        <rect x={ox} y={oy} width={rw} height={rh} fill="rgba(27,143,255,0.07)" stroke="var(--blue)" strokeWidth="2.5" />
        {/* Bottom: L - midpoint of bottom side */}
        <text x={ox+rw/2} y={oy+rh+g} textAnchor="middle" fontSize="15" fill={Lcol} fontWeight="700">{Llabel}</text>
        {/* Left: W - midpoint of left side */}
        <text x={ox-g} y={oy+rh/2} textAnchor="middle" fontSize="15" fill={Wcol} fontWeight="700" transform={`rotate(-90,${ox-g},${oy+rh/2})`}>{Wlabel}</text>
      </svg>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 10, margin: "8px auto 10px", display: "flex", justifyContent: "center" }}>
        <span style={{ fontSize: 20, color: "var(--text3)", fontWeight: 600 }}>Perimeter:</span>
        <span style={{ fontSize: 22, fontWeight: 800, fontFamily: "var(--mono)", color: "var(--blue)" }}>P = {q.P} {q.unit}</span>
      </div>
      <div style={{ fontSize: 20, color: "var(--text3)", textAlign: "center", marginBottom: 10 }}>Find {q.missingLabel}. Enter value with units (e.g. 14 ft)</div>
      {feedback ? (
        <FeedbackBanner correct={feedback.correct}
          message={feedback.correct ? null : `2(${q.knownVal}) + 2${q.missingLabel} = ${q.P} - ${q.missingLabel} = ${q.missingVal} ${q.unit}`}
          onNext={() => setFeedback(null)} />
      ) : (
        <TextInput onSubmit={handleSubmit} placeholder={`e.g. 14 ${q.unit}`} />
      )}
    </div>
  );
}

// -- Activity 4: Two-Step Equations (3 stages) --
const EQ_STAGES = ["first-op", "result", "solve"];
const STAGE_LABELS = ["Stage 1: Choose First Operation", "Stage 2: Write Resulting Equation", "Stage 3: Solve for x"];

function TwoStepMastery({ onCorrect, onWrong }) {
  useKaTeX();
  const [q] = useState(() => genTwoStepEq());
  const [stage, setStage] = useState(0);
  const [op, setOp] = useState("");
  const [num, setNum] = useState("");
  const [feedback, setFeedback] = useState(null);

  const ops = ["add", "subtract", "multiply", "divide"];

  const submitFirstOp = () => {
    const input = JSON.stringify({ op, num });
    const correct = gradeTwoStepFirstOp(input, q);
    setFeedback({ correct, stage: 0 });
    if (!correct) onWrong();
  };

  const handleStage1Next = () => {
    if (feedback.correct) { setStage(1); setFeedback(null); }
    else { onWrong(); setFeedback(null); }
  };

  const handleStage2 = (val) => {
    const correct = gradeTwoStepResult(val, q);
    setFeedback({ correct, stage: 1 });
    if (!correct) onWrong();
  };

  const handleStage2Next = () => {
    if (feedback.correct) { setStage(2); setFeedback(null); }
    else { setFeedback(null); }
  };

  const handleStage3 = (val) => {
    const correct = gradeTwoStepSolve(val, q);
    setFeedback({ correct, stage: 2 });
    if (correct) onCorrect(); else onWrong();
  };

  const inverse = { add: "Subtract", sub: "Add", mul: "Divide", div: "Multiply" };

  return (
    <div>
      <div style={{ fontSize: 20, color: "var(--text3)", marginBottom: 6, fontWeight: 600 }}>{STAGE_LABELS[stage]}</div>
      <KaTeXBlock expr={q.latex} />

      {stage === 0 && !feedback && (
        <div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginBottom: 12 }}>
            {ops.map(o => (
              <button key={o} onClick={() => setOp(o)}
                style={{ padding: "10px 18px", borderRadius: "var(--radius-sm)", border: "2px solid " + (op === o ? "var(--blue)" : "var(--border)"), background: op === o ? "rgba(27,143,255,0.15)" : "var(--surface)", fontFamily: "var(--font)", fontSize: 20, fontWeight: 700, cursor: "pointer", color: op === o ? "var(--blue)" : "var(--text)", textTransform: "capitalize" }}>
                {o}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 20 }}>Number:</span>
            <input value={num} onChange={e => setNum(e.target.value.replace(/[^0-9]/g, ""))}
              inputMode="numeric"
              style={{ textAlign: "center", fontSize: 24, fontFamily: "var(--mono)", fontWeight: 700, padding: "8px", width: 100 }} />
          </div>
          {op && num && <div style={{ textAlign: "center", fontSize: 20, color: "var(--text2)", marginBottom: 12, fontStyle: "italic" }}>"{op.charAt(0).toUpperCase()+op.slice(1)} {num} from both sides"</div>}
          <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }}
            onClick={submitFirstOp} disabled={!op || !num}>Submit</button>
        </div>
      )}

      {stage === 0 && feedback && (
        <FeedbackBanner correct={feedback.correct}
          message={feedback.correct ? null : `First step: ${inverse[q.firstOp]} ${q.firstNum} from both sides - ${q.simplifiedAnswer}`}
          onNext={handleStage1Next}
          nextLabel={feedback.correct ? "Next Stage" : "Try Again"} />
      )}

      {stage === 1 && !feedback && (
        <div>
          <div style={{ fontSize: 20, color: "var(--text3)", marginBottom: 6 }}>After the first step, what is the resulting equation? (e.g. 2x=8)</div>
          <TextInput key="stage2" onSubmit={handleStage2} allowEq placeholder={`e.g. ${q.simplifiedAnswer}`} />
        </div>
      )}

      {stage === 1 && feedback && (
        <FeedbackBanner correct={feedback.correct}
          message={feedback.correct ? null : `After first step: ${q.simplifiedAnswer}`}
          onNext={handleStage2Next}
          nextLabel={feedback.correct ? "Next Stage" : "Try Again"} />
      )}

      {stage === 2 && !feedback && (
        <div>
          <div style={{ fontSize: 20, color: "var(--text3)", marginBottom: 6 }}>Solve: <strong style={{ fontFamily: "var(--mono)" }}>{q.simplifiedAnswer}</strong></div>
          <TextInput key="stage3" onSubmit={handleStage3} allowNeg placeholder="Enter x value" />
        </div>
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

// -- Activity 5: Distributive Equations (2 stages) --
function DistributiveMastery({ onCorrect, onWrong }) {
  useKaTeX();
  const [q] = useState(() => genDistributiveEq());
  const [stage, setStage] = useState(0);
  const [feedback, setFeedback] = useState(null);

  const handleStage1 = (val) => {
    const correct = gradeDistribute(val, q);
    setFeedback({ correct, stage: 0 });
    if (!correct) onWrong();
  };

  const handleStage1Next = () => {
    if (feedback.correct) { setStage(1); setFeedback(null); }
    else { setFeedback(null); }
  };

  const handleStage2 = (val) => {
    const correct = gradeDistEqSolve(val, q);
    setFeedback({ correct, stage: 1 });
    if (correct) onCorrect(); else onWrong();
  };

  return (
    <div>
      <div style={{ fontSize: 20, color: "var(--text3)", marginBottom: 6, fontWeight: 600 }}>
        {stage === 0 ? "Stage 1: Expand the left side" : "Stage 2: Solve the equation"}
      </div>
      <KaTeXBlock expr={stage === 0 ? q.latex.split("=")[0].trim() : q.expandedLatex} />

      {stage === 0 && !feedback && (
        <div>
          <div style={{ fontSize: 20, color: "var(--text3)", marginBottom: 6 }}>Enter the expanded left side (e.g. 6x+15)</div>
          <TextInput key="d1" onSubmit={handleStage1} allowEq placeholder={`e.g. ${q.expandedAnswer}`} />
        </div>
      )}
      {stage === 0 && feedback && (
        <FeedbackBanner correct={feedback.correct}
          message={feedback.correct ? null : `Expanded: ${q.expandedAnswer}`}
          onNext={handleStage1Next}
          nextLabel={feedback.correct ? "Next Stage" : "Try Again"} />
      )}

      {stage === 1 && !feedback && (
        <div>
          <div style={{ fontSize: 20, color: "var(--text3)", marginBottom: 6 }}>Solve for x</div>
          <TextInput key="d2" onSubmit={handleStage2} allowNeg placeholder="Enter x value" />
        </div>
      )}
      {stage === 1 && feedback && (
        <FeedbackBanner correct={feedback.correct}
          message={feedback.correct ? null : `x = ${q.solution}`}
          onNext={() => setFeedback(null)}
          nextLabel={feedback.correct ? "Next Problem" : "Try Again"} />
      )}
    </div>
  );
}

// -- Activity 6: Solve x-=a --
function SolveSquareMastery({ onCorrect, onWrong }) {
  useKaTeX();
  const [q] = useState(() => genSolveSquare());
  const [feedback, setFeedback] = useState(null);

  const handleSubmit = (val) => {
    const correct = gradeSolveSquare(val, q);
    setFeedback({ correct });
    if (correct) onCorrect(); else onWrong();
  };

  return (
    <div>
      <KaTeXBlock expr={q.latex} />
      <div style={{ fontSize: 20, color: "var(--text3)", marginBottom: 8, textAlign: "center" }}>
        {q.isNeg ? "Type \"no solution\" if no real solution exists." : q.isZero ? "Enter the single solution." : "Enter both solutions comma-separated (e.g. -3,3)"}
      </div>
      {feedback ? (
        <FeedbackBanner correct={feedback.correct}
          message={feedback.correct ? null : `Answer: ${q.displayAnswer}`}
          onNext={() => setFeedback(null)} />
      ) : (
        <TextInput onSubmit={handleSubmit} allowNeg placeholder={q.isNeg ? "no solution" : q.isZero ? "0" : "-r,r"} />
      )}
    </div>
  );
}

// -- Activity 7: Solve x-=a --
function SolveCubeMastery({ onCorrect, onWrong }) {
  useKaTeX();
  const [q] = useState(() => genSolveCube());
  const [feedback, setFeedback] = useState(null);

  const handleSubmit = (val) => {
    const correct = gradeSolveCube(val, q);
    setFeedback({ correct });
    if (correct) onCorrect(); else onWrong();
  };

  return (
    <div>
      <KaTeXBlock expr={q.latex} />
      <div style={{ fontSize: 20, color: "var(--text3)", marginBottom: 8, textAlign: "center" }}>Enter the single solution.</div>
      {feedback ? (
        <FeedbackBanner correct={feedback.correct}
          message={feedback.correct ? null : `Answer: ${q.displayAnswer}`}
          onNext={() => setFeedback(null)} />
      ) : (
        <TextInput onSubmit={handleSubmit} allowNeg placeholder="Enter x value" />
      )}
    </div>
  );
}

// -- Steps --
const STEPS = [
  { id: "rect-perim",  label: "Perimeter of Rectangle",    description: "Enter P with units, 3 correct in a row" },
  { id: "rect-miss",   label: "Missing Side of Rectangle", description: "Enter missing side with units, 3 correct in a row" },
  { id: "two-step",    label: "Two-Step Equations",        description: "3 stages per problem, 3 correct in a row" },
  { id: "dist-eq",     label: "Distributive Equations",    description: "2 stages per problem, 3 correct in a row" },
  { id: "solve-sq",    label: "Solve x- = a",              description: "3 correct in a row" },
  { id: "solve-cu",    label: "Solve x- = a",              description: "3 correct in a row" },
];

export default function Lesson09MasteryPlayer({ user, topic, onHome }) {
  useKaTeX();
  const topicId = topic?.id || LESSON09_MASTERY_TOPIC_ID;
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
    const newStreak = streak + 1;
    if (newStreak >= STREAK) {
      const nextStep = stepIdx + 1;
      const done = nextStep >= STEPS.length;
      await save(nextStep, 0, done);
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
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>HW 9 (019) Complete!</h2>
        <p style={{ fontSize: 20, color: "var(--text2)", marginBottom: 24 }}>Equations, rectangles, and power equations mastered!</p>
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
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,var(--blue),var(--orange))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "#fff" }}>L9</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 22 }}>HW 9 (019): Mastery Activities</div>
              <div style={{ fontSize: 20, color: "var(--text3)" }}>3 correct in a row to advance</div>
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
          <StreakDots current={streak} needed={STREAK} />

          {step.id === "rect-perim" && <RectPerimMastery key={stepIdx + "-" + streak} onCorrect={handleCorrect} onWrong={handleWrong} />}
          {step.id === "rect-miss"  && <RectMissingSideMastery key={stepIdx + "-" + streak} onCorrect={handleCorrect} onWrong={handleWrong} />}
          {step.id === "two-step"   && <TwoStepMastery key={stepIdx + "-" + streak} onCorrect={handleCorrect} onWrong={handleWrong} />}
          {step.id === "dist-eq"    && <DistributiveMastery key={stepIdx + "-" + streak} onCorrect={handleCorrect} onWrong={handleWrong} />}
          {step.id === "solve-sq"   && <SolveSquareMastery key={stepIdx + "-" + streak} onCorrect={handleCorrect} onWrong={handleWrong} />}
          {step.id === "solve-cu"   && <SolveCubeMastery key={stepIdx + "-" + streak} onCorrect={handleCorrect} onWrong={handleWrong} />}
        </div>
      </div>
    </div>
  );
}
