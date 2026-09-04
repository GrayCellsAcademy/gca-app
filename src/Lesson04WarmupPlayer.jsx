import { useState, useEffect, useRef } from "react";
import useActivityTracking from "./core/useActivityTracking";
import { saveProgress, getProgress } from "./core/firebase";

export const TOPIC_ID = "lesson04-warmup-v1";
const STREAK_NEEDED = 2;

//  Generators (inline - same constraints as CW3)
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function hasTrailingZero(n) { return n % 10 === 0; }
function maxDigit(n) { return Math.max(...String(n).split("").map(Number)); }

function genColMulPair(aRange, bRange) {
  let a, b, attempts = 0;
  do {
    a = randInt(aRange[0], aRange[1]);
    b = randInt(bRange[0], bRange[1]);
    attempts++;
    if (attempts > 500) break;
  } while (
    hasTrailingZero(a) || hasTrailingZero(b) ||
    (maxDigit(a) > 3 && maxDigit(b) > 3)
  );
  return { a, b, answer: a * b };
}

function genColMultiply3x2() {
  // 3-digit x 2-digit, same digit constraint as CW3
  const { a, b, answer } = genColMulPair([101, 999], [11, 99]);
  return { type: "col-multiply-warmup", a, b, answer, prompt: "Find the product." };
}

function genLongDiv4x1() {
  // 4-digit dividend, divisor 2-3, digit constraint
  let dividend, divisor, attempts = 0;
  do {
    divisor = Math.random() < 0.5 ? 2 : 3;
    dividend = randInt(1000, 9999);
    attempts++;
    if (attempts > 500) break;
  } while (maxDigit(dividend) > 3 && maxDigit(divisor) > 3);
  const quotient = Math.floor(dividend / divisor);
  const remainder = dividend % divisor;
  const ans = remainder > 0 ? quotient + "r" + remainder : String(quotient);
  return { type: "long-div-warmup", dividend, divisor, quotient, remainder, answer: ans, prompt: "Find the quotient. Use r for remainder (e.g. 86r1)." };
}

function gradeColMultiply(input, q) {
  return parseInt(String(input).replace(/,/g, ""), 10) === q.answer;
}
function gradeLongDiv(input, q) {
  const norm = s => String(s).toLowerCase().replace(/\s+/g, "").replace(/r0$/, "").trim();
  return norm(input) === norm(q.answer);
}

//  Display Components (copied from Lesson03MasteryPlayer)
function ColumnMultiplyWork({ a, b }) {
  const bStr = String(b), aStr = String(a);
  const product = a * b;
  const maxLen = Math.max(aStr.length + bStr.length, String(product).length) + 2;
  const CW = 28, CH = 36, OW = 32;
  const W = OW + maxLen * CW + 12;
  const carryH = 22;
  const bDigitsR = bStr.split("").map(Number).reverse();
  const totalRows = 2 + bDigitsR.length + (bDigitsR.length > 1 ? 1 : 0);
  const H = carryH * bDigitsR.length + CH * totalRows + 20;
  const carryStripH = carryH * bDigitsR.length + 4;
  const rowY = (r) => carryStripH + CH * r + CH * 0.75;
  const carryY = (pi) => rowY(0) - (pi + 1) * (carryH + 2);
  const line1Y = rowY(1) + CH * 0.28;
  const lastPartialRow = 1 + bDigitsR.length;
  const line2Y = rowY(lastPartialRow) + CH * 0.28;
  const productRow = lastPartialRow + (bDigitsR.length > 1 ? 1 : 0);
  const rowText = (num, r, color) => {
    const s = String(Math.round(Math.abs(num))).padStart(maxLen, " ");
    return s.split("").map((ch, i) => ch !== " " ? (
      <text key={i} x={OW + i * CW + CW / 2} y={rowY(r)} textAnchor="middle"
        fontSize="20" fontWeight={color === "var(--green)" ? "800" : "700"}
        fill={color} fontFamily="var(--mono)">{ch}</text>
    ) : null);
  };
  return (
    <svg width={W} height={H} style={{ display: "block", margin: "0 auto" }}>
      {rowText(a, 0, "var(--text)")}
      <text x={OW - 4} y={rowY(1)} textAnchor="end" fontSize="18" fill="var(--text3)" fontFamily="var(--mono)">x</text>
      {rowText(b, 1, "var(--text)")}
      <line x1={OW} y1={line1Y} x2={OW + maxLen * CW} y2={line1Y} stroke="var(--text)" strokeWidth="2" />
      {bDigitsR.map((d, pi) => {
        const partial = a * d * Math.pow(10, pi);
        const aDigitsR = aStr.split("").map(Number).reverse();
        let carry = 0; const carries = [];
        for (let i = 0; i < aDigitsR.length; i++) {
          const prod = aDigitsR[i] * d + carry;
          carry = Math.floor(prod / 10);
          carries.push({ col: maxLen - 2 - i - pi, val: carry });
        }
        return (
          <g key={pi}>
            {carries.map((c, ci) => c.val > 0 && c.col >= 0 ? (
              <text key={ci} x={OW + c.col * CW + CW / 2} y={carryY(pi)}
                textAnchor="middle" fontSize="16" fontWeight="800" fill="var(--blue)" fontFamily="var(--mono)">{c.val}</text>
            ) : null)}
            {rowText(partial, pi + 2, "var(--text2)")}
          </g>
        );
      })}
      {bDigitsR.length > 1 && <line x1={OW} y1={line2Y} x2={OW + maxLen * CW} y2={line2Y} stroke="var(--text)" strokeWidth="2" />}
      {rowText(product, productRow, "var(--green)")}
    </svg>
  );
}

function LongDivisionWork({ dividend, divisor, quotient, remainder }) {
  const dvStr = String(dividend);
  const nDigits = dvStr.length;
  const CW = 30, CH = 40, OW = 50, HEADER = 46;
  const steps = [];
  let working = 0, started = false;
  for (let i = 0; i < nDigits; i++) {
    working = working * 10 + parseInt(dvStr[i]);
    if (!started && working < divisor && i < nDigits - 1) continue;
    started = true;
    const q = Math.floor(working / divisor);
    const sub = q * divisor;
    const diff = working - sub;
    steps.push({ col: i, working, q, sub, diff });
    working = diff;
  }
  let cursor = HEADER + CH;
  const positioned = steps.map((step, si) => {
    const isFirst = si === 0;
    let pos;
    if (isFirst) {
      pos = { workY: null, subY: cursor + CH * 0.72, lineY: cursor + CH + 4, diffY: cursor + CH + CH * 0.72, advance: CH * 2 };
    } else if (step.q === 0) {
      pos = { workY: cursor + CH * 0.72, subY: null, lineY: cursor + CH + 4, diffY: cursor + CH + CH * 0.72, advance: CH * 2 };
    } else {
      pos = { workY: cursor + CH * 0.72, subY: cursor + CH + CH * 0.72, lineY: cursor + CH * 2 + 4, diffY: cursor + CH * 2 + CH * 0.72, advance: CH * 3 };
    }
    cursor += pos.advance;
    return { ...step, ...pos };
  });
  const W = OW + nDigits * CW + 50;
  const H = cursor + CH + 16;
  const cx = (col) => OW + col * CW + CW / 2;
  const rn = (num, rightCol, y, color, size, opacity) => {
    const s = String(num);
    return s.split("").map((ch, ki) => {
      const col = rightCol - s.length + 1 + ki;
      if (col < 0) return null;
      return <text key={ki} x={cx(col)} y={y} textAnchor="middle" fontSize={size} fontWeight="700" fill={color} opacity={opacity ?? 1} fontFamily="var(--mono)">{ch}</text>;
    });
  };
  const lineX = (step) => {
    const nums = [step.working, step.q > 0 ? step.sub : 0].filter(n => n > 0);
    const maxLen = Math.max(...nums.map(n => String(n).length), 1);
    return { left: cx(Math.max(0, step.col - maxLen + 1)) - 5, right: cx(step.col) + CW * 0.4 };
  };
  const lastDiffY = positioned.length > 0 ? positioned[positioned.length - 1].diffY : H - 16;
  return (
    <div style={{ overflowX: "auto" }}>
      <svg width={W} height={H} style={{ display: "block", margin: "0 auto", minWidth: W }}>
        <text x={OW - 8} y={HEADER + CH * 0.78} textAnchor="end" fontSize="24" fontWeight="700" fill="var(--text)" fontFamily="var(--mono)">{divisor}</text>
        <line x1={OW - 2} y1={HEADER + CH * 0.18} x2={OW - 2} y2={HEADER + CH} stroke="var(--text)" strokeWidth="2.5" />
        <line x1={OW - 2} y1={HEADER + CH * 0.18} x2={OW + nDigits * CW + 4} y2={HEADER + CH * 0.18} stroke="var(--text)" strokeWidth="2.5" />
        {dvStr.split("").map((ch, ci) => (
          <text key={ci} x={cx(ci)} y={HEADER + CH * 0.78} textAnchor="middle" fontSize="24" fontWeight="700" fill="var(--text)" fontFamily="var(--mono)">{ch}</text>
        ))}
        {positioned.map((step, si) => (
          <text key={si} x={cx(step.col)} y={HEADER - 8} textAnchor="middle" fontSize="24" fontWeight="800" fill="var(--green)" fontFamily="var(--mono)">{step.q}</text>
        ))}
        {positioned.map((step, si) => {
          const isLast = si === positioned.length - 1;
          const { left: ll, right: lr } = lineX(step);
          return (
            <g key={si}>
              {step.workY !== null && rn(step.working, step.col, step.workY, "var(--text3)", 20, 0.6)}
              {step.subY !== null && rn(step.sub, step.col, step.subY, "var(--text)", 22)}
              <line x1={ll} y1={step.lineY} x2={lr} y2={step.lineY} stroke={step.q === 0 ? "var(--text2)" : "var(--text)"} strokeWidth="1.5" />
              {rn(step.q === 0 ? 0 : step.diff, step.col, step.diffY, isLast ? "var(--blue)" : "var(--text)", 20)}
            </g>
          );
        })}
        {remainder > 0 && (
          <text x={OW + nDigits * CW + 8} y={lastDiffY} fontSize="14" fontWeight="700" fill="var(--blue)" fontFamily="var(--mono)">R{remainder}</text>
        )}
      </svg>
    </div>
  );
}

//  Streak Dots
function StreakDots({ current, needed }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
      <span style={{ fontSize: 20, color: "var(--text3)" }}>Streak:</span>
      {Array.from({ length: needed }).map((_, i) => (
        <div key={i} style={{
          width: 13, height: 13, borderRadius: "50%",
          background: i < current ? "var(--green)" : "var(--surface2)",
          border: `2px solid ${i < current ? "var(--green)" : "var(--border2)"}`,
          transition: "all 0.2s",
        }} />
      ))}
      <span style={{ fontSize: 20, color: "var(--text3)" }}>{current}/{needed}</span>
    </div>
  );
}

const TOPICS = [
  { id: "mul3x2", label: "Column Multiplication", subLabel: "3-digit x 2-digit", gen: genColMultiply3x2 },
  { id: "div4x1", label: "Long Division", subLabel: "4-digit / 1-digit", gen: genLongDiv4x1 },
];

export default function Lesson04WarmupPlayer({ user, topic, onHome }) {
  useActivityTracking(user, TOPIC_ID, "Warmup 4 (019)");
  const topicId = topic?.id || TOPIC_ID;

  const [topicIdx, setTopicIdx] = useState(0);
  const [streak, setStreak] = useState(0);
  const [problem, setProblem] = useState(null);
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState("question");
  const [loading, setLoading] = useState(true);
  const inputRef = useRef(null);
  const pendingProgress = useRef(null);

  const currentTopic = TOPICS[topicIdx];

  useEffect(() => {
    const load = async () => {
      const prog = await getProgress(user.id, topicId);
      if (prog?.data) {
        const { topicIdx: ti, streak: st } = prog.data;
        setTopicIdx(Math.min(ti || 0, TOPICS.length - 1));
        setStreak(st || 0);
      }
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    if (!loading) newProblem(topicIdx);
  }, [topicIdx, loading]);

  const newProblem = (ti) => {
    const gen = TOPICS[ti]?.gen;
    if (gen) {
      setProblem(gen());
      setInput("");
      setPhase("question");
      pendingProgress.current = null;
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  };

  const saveCurrentProgress = async (ti, st, done) => {
    await saveProgress(user.id, topicId, {
      started: true, completed: done,
      percentComplete: done ? 100 : Math.round((ti / TOPICS.length) * 100),
      data: { topicIdx: ti, streak: st },
    });
  };

  const gradeAnswer = (input, prob) => {
    if (prob.type === "col-multiply-warmup") return gradeColMultiply(input, prob);
    return gradeLongDiv(input, prob);
  };

  const handleSubmit = async () => {
    if (!problem || phase !== "question") return;
    if (!input.trim()) return;
    if (gradeAnswer(input, problem)) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      setPhase("correct");
      if (newStreak >= STREAK_NEEDED) {
        const nextTi = topicIdx + 1;
        if (nextTi >= TOPICS.length) {
          pendingProgress.current = { action: "done" };
          await saveCurrentProgress(nextTi, 0, true);
        } else {
          pendingProgress.current = { action: "next", ti: nextTi };
          await saveCurrentProgress(nextTi, 0, false);
        }
      } else {
        pendingProgress.current = { action: "stay" };
        await saveCurrentProgress(topicIdx, newStreak, false);
      }
    } else {
      setStreak(0);
      setPhase("wrong");
      await saveCurrentProgress(topicIdx, 0, false);
    }
  };

  const handleCorrectNext = () => {
    const p = pendingProgress.current;
    if (!p) return;
    if (p.action === "done") setPhase("celebration");
    else if (p.action === "next") { setTopicIdx(p.ti); setStreak(0); }
    else newProblem(topicIdx);
  };

  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><div className="spinner" /></div>;

  if (phase === "celebration" || topicIdx >= TOPICS.length) return (
    <div style={{ maxWidth: 520, margin: "0 auto", textAlign: "center", animation: "fadeUp 0.4s ease" }}>
      <div className="card">
        <div style={{ fontSize: 64, marginBottom: 16 }}></div>
        <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Warmup Complete!</h2>
        <p style={{ color: "var(--text2)", fontSize: 19, marginBottom: 24 }}>Ready for Classwork 4!</p>
        <button className="btn btn-primary btn-lg" style={{ width: "100%" }} onClick={onHome}> Back to Home</button>
      </div>
    </div>
  );

  const isMul = problem?.type === "col-multiply-warmup";
  const isDiv = problem?.type === "long-div-warmup";

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", animation: "fadeUp 0.3s ease" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ fontSize: 19, color: "var(--text3)", marginBottom: 2 }}>
            Activity {topicIdx + 1} of {TOPICS.length} - {currentTopic.label}
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--blue)" }}>{currentTopic.subLabel}</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onHome}> Home</button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 20, color: "var(--text3)", marginBottom: 4 }}>
          <span>Overall progress</span>
          <span>{topicIdx}/{TOPICS.length} activities</span>
        </div>
        <div style={{ height: 5, background: "var(--surface2)", borderRadius: 99, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${(topicIdx / TOPICS.length) * 100}%`, background: "linear-gradient(90deg,var(--blue),var(--cyan))", borderRadius: 99 }} />
        </div>
      </div>

      <div className="card">
        <StreakDots current={streak} needed={STREAK_NEEDED} />

        <p style={{ textAlign: "center", fontSize: 19, fontWeight: 600, color: "var(--text2)", marginBottom: 16 }}>
          {problem?.prompt}
        </p>

        {phase === "wrong" && problem && (
          <div style={{ marginBottom: 16 }}>
            {isMul && <ColumnMultiplyWork a={problem.a} b={problem.b} />}
            {isDiv && <LongDivisionWork dividend={problem.dividend} divisor={problem.divisor} quotient={problem.quotient} remainder={problem.remainder} />}
          </div>
        )}

        {phase !== "wrong" && problem && (
          <div style={{ textAlign: "center", fontSize: 28, fontWeight: 800, fontFamily: "var(--mono)", marginBottom: 20, color: "var(--text)" }}>
            {isMul ? `${problem.a} x ${problem.b}` : `${problem.dividend} / ${problem.divisor}`}
          </div>
        )}

        {phase === "correct" ? (
          <div style={{ animation: "popIn 0.25s ease", textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}></div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--green)", marginBottom: 6 }}>Correct!</div>
            <div style={{ fontSize: 19, color: "var(--text3)", marginBottom: 20 }}>Streak: {streak}/{STREAK_NEEDED}</div>
            <button className="btn btn-success" style={{ width: "100%", fontSize: 20, padding: "13px" }} onClick={handleCorrectNext}> Next problem</button>
          </div>
        ) : phase === "wrong" ? (
          <div style={{ animation: "popIn 0.25s ease" }}>
            <div style={{ fontSize: 19, fontWeight: 700, color: "#fca5a5", marginBottom: 8, textAlign: "center" }}>
              Not quite! Here's the worked solution:
            </div>
            <div style={{ fontSize: 20, color: "var(--text3)", textAlign: "center", marginBottom: 16 }}>
              Streak reset - try another problem
            </div>
            <button className="btn btn-success" style={{ width: "100%", fontSize: 20, padding: "13px" }}
              onClick={() => { setStreak(0); newProblem(topicIdx); }}>
              Got it - try again
            </button>
          </div>
        ) : (
          <>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              inputMode={isMul ? "numeric" : "text"}
              placeholder={isMul ? "?" : "e.g. 86r1"}
              style={{ textAlign: "center", fontSize: 34, fontFamily: "var(--mono)", fontWeight: 700, padding: "12px", marginBottom: 12 }}
            />
            <button className="btn btn-primary" style={{ width: "100%", fontSize: 20, padding: "14px" }}
              onMouseDown={e => { e.preventDefault(); handleSubmit(); }}
              onTouchEnd={e => { e.preventDefault(); handleSubmit(); }}
              disabled={!input.trim()}>
              Submit
            </button>
          </>
        )}
      </div>

      <div style={{ marginTop: 16, display: "flex", gap: 6 }}>
        {TOPICS.map((t, i) => {
          const done = i < topicIdx, active = i === topicIdx;
          return (
            <div key={t.id} style={{
              fontSize: 20, fontWeight: 700, padding: "4px 14px", borderRadius: 99,
              background: done ? "rgba(16,185,129,0.15)" : active ? "rgba(59,130,246,0.15)" : "var(--surface)",
              color: done ? "var(--green)" : active ? "var(--blue)" : "var(--text3)",
              border: `1px solid ${done ? "rgba(16,185,129,0.3)" : active ? "rgba(59,130,246,0.3)" : "var(--border)"}`,
            }}>
              {done ? " " : active ? " " : ""}{t.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
