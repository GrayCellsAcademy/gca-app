import { useState, useEffect, useRef } from "react";
import useActivityTracking from "./core/useActivityTracking";
import { saveProgress, getProgress } from "./core/firebase";
import {
  TOPICS, computeCarries, computeBorrows,
  genAddNoCarry, genAddCarry, genAddMulti,
  genSubNoBorow, genSubBorrow, genSubBorrowZero,
} from "./lesson01Mastery";

export const TOPIC_ID = "lesson01-mastery-v1";
const STREAK_NEEDED = 2;
const EC_STREAK_NEEDED = 3;
const CORE_TOPICS = 6;

//  Column Problem Display
function ColumnProblem({ problem, showAnswer = false, showWorking = false }) {
  const isAddition = problem.type.startsWith("add");
  const numbers = isAddition ? problem.numbers : [problem.top, problem.bot];
  const maxLen = Math.max(...numbers.map(n => String(n).length));
  const padded = numbers.map(n => String(n).padStart(maxLen, " "));
  const answer = problem.answer;

  const carries = (showWorking && isAddition && problem.type !== "add-no-carry")
    ? computeCarries(problem.numbers) : {};
  const { borrows } = (showWorking && !isAddition && problem.type !== "sub-no-borrow")
    ? computeBorrows(problem.top, problem.bot) : { borrows: [] };

  const borrowMap = {};
  borrows.forEach(b => { borrowMap[b.col] = b; });

  const cellW = 38;
  const cellH = 44;

  return (
    <div style={{ display: "inline-block", background: "var(--bg2)", borderRadius: "var(--radius)", padding: "16px 24px", fontFamily: "var(--mono)" }}>
      {isAddition && Object.keys(carries).length > 0 && (
        <div style={{ display: "flex", gap: 2, paddingLeft: 32, marginBottom: 2 }}>
          {Array.from({ length: maxLen }, (_, ci) => {
            const carryVal = carries[ci];
            return (
              <div key={ci} style={{ width: cellW, height: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "var(--amber)" }}>
                {carryVal || ""}
              </div>
            );
          })}
        </div>
      )}
      {padded.map((row, ri) => (
        <div key={ri} style={{ display: "flex", alignItems: "center", gap: 2, marginBottom: 2 }}>
          <div style={{ width: 28, textAlign: "right", fontSize: 28, color: "var(--text3)", paddingRight: 4 }}>
            {ri === padded.length - 1 ? (isAddition ? "+" : "-") : ""}
          </div>
          {row.split("").map((ch, ci) => {
            const borrow = borrowMap[ci];
            return (
              <div key={ci} style={{ width: cellW, height: cellH, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative" }}>
                {showWorking && !isAddition && ri === 0 && borrow && (
                  <div style={{ position: "absolute", top: -30, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", minWidth: 28 }}>

                    <div style={{ fontSize: borrow.newVal >= 10 ? 14 : 20, color: "var(--amber)", fontWeight: 800, lineHeight: 1 }}>{borrow.newVal}</div>
                  </div>
                )}
                <div style={{ fontSize: 28, fontWeight: 700, color: ch === " " ? "transparent" : "var(--text)", textDecoration: (showWorking && !isAddition && ri === 0 && borrow) ? "line-through" : "none", textDecorationColor: "var(--red)" }}>
                  {ch === " " ? "0" : ch}
                </div>
              </div>
            );
          })}
        </div>
      ))}
      <div style={{ borderTop: "2.5px solid var(--text2)", margin: "4px 0 4px 30px" }} />
      {showAnswer && (
        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
          <div style={{ width: 28 }} />
          {String(answer).padStart(maxLen, " ").split("").map((ch, ci) => (
            <div key={ci} style={{ width: cellW, height: cellH, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 800, color: ch === " " ? "transparent" : "var(--green)" }}>
              {ch === " " ? "0" : ch}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

//  Missing Digit Problem Display + Input
//  Handles EC1 (2-addend add), EC2 (3-addend add), EC3 (5-digit sub)
function MissingDigitProblem({ problem, inputs, onFocus, focusedCell, submitted, correct }) {
  const topicId = problem.type;
  const isEC3 = topicId === "missing-digit-sub5";
  const isEC2 = topicId === "missing-digit-add3";

  // Build display rows
  // EC1: rows = [aStr, bStr], sumStr 5-char, hiddenAddends [{row,col,value}], hiddenSumCol (from right)
  // EC2: rows = [aStr, bStr, cStr], sumStr 5-char, same hidden structure
  // EC3: rows = [topStr(5), botStr(4 padded to 5)], resultStr(4 padded to 5), hiddenNums [{row,col,value}], hiddenResultCol (topStr index)

  const cellW = 40;
  const cellH = 48;
  const fontSize = 26;

  const getHiddenSet = () => {
    if (isEC3) {
      const s = new Set();
      problem.hiddenNums.forEach(h => s.add(`${h.row}-${h.col}`));
      return s;
    }
    const s = new Set();
    problem.hiddenAddends.forEach(h => s.add(`${h.row}-${h.col}`));
    return s;
  };

  const hiddenSet = getHiddenSet();

  const getResultHiddenKey = () => {
    if (isEC3) return `result-${problem.hiddenResultCol}`;
    return `sum-${4 - problem.hiddenSumCol}`;
  };

  const resultHiddenKey = getResultHiddenKey();

  const isResultHidden = (ci) => {
    if (isEC3) return ci === problem.hiddenResultCol;
    return ci === (4 - problem.hiddenSumCol);
  };

  const cellStyle = (isHidden, key) => {
    const isFocused = focusedCell === key;
    let bg = "transparent", border = "2px solid transparent", color = "var(--text)";
    if (isHidden) {
      bg = submitted
        ? (correct?.[key] ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)")
        : isFocused ? "rgba(59,130,246,0.2)" : "rgba(59,130,246,0.08)";
      border = submitted
        ? (correct?.[key] ? "2px solid var(--green)" : "2px solid var(--red)")
        : isFocused ? "2px solid var(--blue)" : "2px solid rgba(59,130,246,0.3)";
      color = submitted ? (correct?.[key] ? "var(--green)" : "var(--red)") : "var(--blue)";
    }
    return { width: cellW, height: cellH, display: "flex", alignItems: "center", justifyContent: "center", fontSize, fontWeight: 700, fontFamily: "var(--mono)", background: bg, border, borderRadius: 6, color, cursor: isHidden ? "pointer" : "default", transition: "all 0.2s" };
  };

  const renderCell = (ch, key, isHidden, isLeadingZero) => (
    <div key={key} style={cellStyle(isHidden, key)} onClick={() => isHidden && onFocus(key)}>
      {isHidden ? (
        inputs[key] !== undefined ? inputs[key] : (
          <div style={{ width: 18, height: 3, background: "var(--blue)", borderRadius: 2, opacity: 0.6 }} />
        )
      ) : (isLeadingZero ? "" : ch)}
    </div>
  );

  // Addend rows (EC1: 2 rows, EC2: 3 rows, EC3: top+bot)
  const addendStrs = isEC3
    ? [problem.topStr, problem.botStr.padStart(5, " ")]
    : isEC2
    ? [problem.aStr, problem.bStr, problem.cStr]
    : [problem.aStr, problem.bStr];

  const resultStr = isEC3
    ? " " + problem.resultStr  // pad to 5 chars with leading space
    : problem.sumStr;

  const totalRows = addendStrs.length;

  return (
    <div style={{ display: "inline-block", background: "var(--bg2)", borderRadius: "var(--radius)", padding: "16px 20px", fontFamily: "var(--mono)" }}>
      {addendStrs.map((rowStr, ri) => (
        <div key={ri} style={{ display: "flex", alignItems: "center", gap: 2, marginBottom: 2 }}>
          <div style={{ width: 28, textAlign: "right", fontSize: 26, color: "var(--text3)", paddingRight: 4 }}>
            {ri === totalRows - 1 ? (isEC3 ? "-" : "+") : ""}
          </div>
          {rowStr.split("").map((ch, ci) => {
            const key = `${ri}-${ci}`;
            const isHidden = hiddenSet.has(key);
            const isLeadingZero = ch === " " || (ch === "0" && ci === 0 && isEC3 && ri === 1);
            return renderCell(ch, key, isHidden, isLeadingZero);
          })}
        </div>
      ))}
      <div style={{ borderTop: "2.5px solid var(--text2)", margin: "4px 0 4px 30px" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
        <div style={{ width: 28 }} />
        {resultStr.split("").map((ch, ci) => {
          const key = `result-${ci}`;
          const isHidden = isResultHidden(ci);
          const isLeadingZero = ch === " " || (ch === "0" && ci === 0 && !problem.sumIs5 && !isEC3);
          return renderCell(ch, key, isHidden, isLeadingZero);
        })}
      </div>
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

//  Main Player
export default function Lesson01MasteryPlayer({ user, topic, onHome }) {
  useActivityTracking(user, "lesson01-mastery-v1", "HW 1 (019)");
  const topicId = topic?.id || TOPIC_ID;

  const [topicIdx, setTopicIdx] = useState(0);
  const [subtypeIdx, setSubtypeIdx] = useState(0);
  const [streak, setStreak] = useState(0);
  const [problem, setProblem] = useState(null);
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState("question"); // question | correct | wrong | celebration
  const [loading, setLoading] = useState(true);
  const inputRef = useRef(null);
  const pendingProgress = useRef(null);

  // Missing digit state
  const [mdInputs, setMdInputs] = useState({});
  const [mdFocused, setMdFocused] = useState(null);
  const [mdSubmitted, setMdSubmitted] = useState(false);
  const [mdCorrect, setMdCorrect] = useState({});

  const currentTopic = TOPICS[topicIdx];
  const currentSubtype = currentTopic?.subtypes[subtypeIdx];
  const isEC = currentTopic?.isExtraCredit;
  const isMissingDigit = isEC;

  // Load progress
  useEffect(() => {
    const load = async () => {
      const prog = await getProgress(user.id, topicId);
      if (prog?.data) {
        const { topicIdx: ti, subtypeIdx: si, streak: st } = prog.data;
        setTopicIdx(ti || 0);
        setSubtypeIdx(si || 0);
        setStreak(st || 0);
      }
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    if (!loading && TOPICS[topicIdx]) {
      newProblem(topicIdx, subtypeIdx);
    }
  }, [topicIdx, subtypeIdx, loading]);

  const newProblem = (ti, si) => {
    setProblem(null);
    const gen = TOPICS[ti]?.subtypes[si]?.gen;
    if (gen) {
      setProblem(gen());
      setInput("");
      setPhase("question");
      setMdInputs({});
      setMdFocused(null);
      setMdSubmitted(false);
      setMdCorrect({});
      pendingProgress.current = null;
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  };

  const computePercent = (ti) => {
    const coreCount = Math.min(ti, CORE_TOPICS);
    const extraCount = Math.max(0, ti - CORE_TOPICS);
    return Math.round((coreCount / CORE_TOPICS) * 100) + extraCount * 10;
  };

  const saveCurrentProgress = async (ti, si, st) => {
    const allDone = ti >= TOPICS.length;
    await saveProgress(user.id, topicId, {
      started: true,
      completed: allDone,
      percentComplete: computePercent(ti),
      data: { topicIdx: ti, subtypeIdx: si, streak: st },
    });
  };

  const handleSubmit = async () => {
    if (!problem || phase !== "question") return;
    const val = parseInt(input.trim(), 10);
    if (isNaN(val)) return;

    if (val === problem.answer) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      setPhase("correct");
      if (newStreak >= STREAK_NEEDED) {
        const nextSi = subtypeIdx + 1;
        const subtypes = currentTopic.subtypes;
        if (nextSi < subtypes.length) {
          pendingProgress.current = { action: "nextSubtype", ti: topicIdx, si: nextSi };
        } else {
          const nextTi = topicIdx + 1;
          pendingProgress.current = nextTi >= TOPICS.length
            ? { action: "done", ti: nextTi }
            : { action: "nextTopic", ti: nextTi };
        }
      } else {
        pendingProgress.current = { action: "stay", ti: topicIdx, si: subtypeIdx, st: newStreak };
      }
      await saveCurrentProgress(
        pendingProgress.current.ti ?? topicIdx,
        pendingProgress.current.si ?? subtypeIdx,
        pendingProgress.current.st ?? newStreak
      );
    } else {
      setStreak(0);
      setPhase("wrong");
      await saveCurrentProgress(topicIdx, subtypeIdx, 0);
    }
  };

  const handleCorrectNext = () => {
    const p = pendingProgress.current;
    if (!p) return;
    if (p.action === "done") { setPhase("celebration"); }
    else if (p.action === "nextTopic") { setProblem(null); setTopicIdx(p.ti); setSubtypeIdx(0); setStreak(0); }
    else if (p.action === "nextSubtype") { setSubtypeIdx(p.si); setStreak(0); }
    else { newProblem(topicIdx, subtypeIdx); }
  };

  const handleWrongContinue = () => {
    setStreak(0);
    newProblem(topicIdx, subtypeIdx);
  };

  // Missing digit: get all hidden cell keys from problem
  const getMdCells = (prob) => {
    if (!prob) return [];
    if (prob.type === "missing-digit-sub5") {
      return [
        ...prob.hiddenNums.map(h => `${h.row}-${h.col}`),
        `result-${prob.hiddenResultCol}`,
      ];
    }
    return [
      ...prob.hiddenAddends.map(h => `${h.row}-${h.col}`),
      `sum-${4 - prob.hiddenSumCol}`,
    ];
  };

  // Missing digit: grade a submitted answer
  const gradeMd = (prob, inputs) => {
    const correct = {};
    let allCorrect = true;
    if (prob.type === "missing-digit-sub5") {
      prob.hiddenNums.forEach(h => {
        const key = `${h.row}-${h.col}`;
        const ok = String(inputs[key]) === String(h.value);
        correct[key] = ok;
        if (!ok) allCorrect = false;
      });
      const rKey = `result-${prob.hiddenResultCol}`;
      const rOk = String(inputs[rKey]) === String(prob.hiddenResultValue);
      correct[rKey] = rOk;
      if (!rOk) allCorrect = false;
    } else {
      prob.hiddenAddends.forEach(h => {
        const key = `${h.row}-${h.col}`;
        const ok = String(inputs[key]) === String(h.value);
        correct[key] = ok;
        if (!ok) allCorrect = false;
      });
      const sKey = `sum-${4 - prob.hiddenSumCol}`;
      const sOk = String(inputs[sKey]) === String(prob.hiddenSumValue);
      correct[sKey] = sOk;
      if (!sOk) allCorrect = false;
    }
    return { correct, allCorrect };
  };

  const handleMdKeyDown = (e) => {
    if (!mdFocused) return;
    if (/^[0-9]$/.test(e.key)) {
      setMdInputs(prev => ({ ...prev, [mdFocused]: e.key }));
    } else if (e.key === "Backspace") {
      setMdInputs(prev => ({ ...prev, [mdFocused]: undefined }));
    }
  };

  useEffect(() => {
    window.addEventListener("keydown", handleMdKeyDown);
    return () => window.removeEventListener("keydown", handleMdKeyDown);
  }, [mdFocused]);

  const handleMdSubmit = async () => {
    if (!problem || mdSubmitted) return;
    const allCells = getMdCells(problem);
    if (allCells.some(k => mdInputs[k] === undefined)) return;

    const { correct, allCorrect } = gradeMd(problem, mdInputs);
    setMdCorrect(correct);
    setMdSubmitted(true);

    if (allCorrect) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak >= EC_STREAK_NEEDED) {
        const nextTi = topicIdx + 1;
        pendingProgress.current = nextTi >= TOPICS.length
          ? { action: "done", ti: nextTi }
          : { action: "nextTopic", ti: nextTi };
        await saveCurrentProgress(nextTi, 0, 0);
      } else {
        pendingProgress.current = { action: "stay", ti: topicIdx, si: subtypeIdx, st: newStreak };
        await saveCurrentProgress(topicIdx, subtypeIdx, newStreak);
      }
    } else {
      setStreak(0);
      pendingProgress.current = null;
      await saveCurrentProgress(topicIdx, subtypeIdx, 0);
    }
  };

  const handleMdNext = () => {
    const p = pendingProgress.current;
    if (!p) { newProblem(topicIdx, subtypeIdx); return; }
    if (p.action === "done") { setPhase("celebration"); }
    else if (p.action === "nextTopic") { setTopicIdx(p.ti); setSubtypeIdx(0); setStreak(0); }
    else { newProblem(topicIdx, subtypeIdx); }
  };

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
      <div className="spinner" />
    </div>
  );

  if (phase === "celebration" || topicIdx >= TOPICS.length) return (
    <div style={{ maxWidth: 520, margin: "0 auto", textAlign: "center", animation: "fadeUp 0.4s ease" }}>
      <div className="card">
        <div style={{ fontSize: 64, marginBottom: 16 }}></div>
        <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Mastery Complete!</h2>
        <p style={{ color: "var(--text2)", fontSize: 19, marginBottom: 24 }}>
          You've mastered all 6 topics - column addition and subtraction with all difficulty levels!
        </p>
        <button className="btn btn-primary btn-lg" style={{ width: "100%" }} onClick={onHome}>
           Back to Home
        </button>
      </div>
    </div>
  );

  const totalSubtypes = TOPICS.reduce((s, t) => s + t.subtypes.length, 0);
  const completedSubtypes = TOPICS.slice(0, topicIdx).reduce((s, t) => s + t.subtypes.length, 0) + subtypeIdx;

  if (isEC && topicIdx < CORE_TOPICS) {
    return (
      <div style={{ maxWidth: 520, margin: "0 auto", textAlign: "center", animation: "fadeUp 0.4s ease" }}>
        <div className="card">
          <div style={{ fontSize: 48, marginBottom: 12 }}></div>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Extra Credit Locked</h2>
          <p style={{ color: "var(--text2)", fontSize: 19, marginBottom: 24 }}>
            Complete all 6 core topics first to unlock extra credit.
          </p>
          <button className="btn btn-ghost" onClick={onHome}>Back to Home</button>
        </div>
      </div>
    );
  }

  const streakNeeded = isEC ? EC_STREAK_NEEDED : STREAK_NEEDED;
  const allMdCells = isMissingDigit && problem ? getMdCells(problem) : [];
  const mdAllFilled = allMdCells.length > 0 && allMdCells.every(k => mdInputs[k] !== undefined);

  return (
    <div style={{ maxWidth: 620, margin: "0 auto", animation: "fadeUp 0.3s ease" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ fontSize: 19, color: "var(--text3)", marginBottom: 2 }}>
            {isEC ? "Extra Credit" : `Topic ${topicIdx + 1} of ${CORE_TOPICS}`}  {currentTopic.label}
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: isEC ? "var(--amber)" : "var(--blue)" }}>
            {currentSubtype?.label}
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onHome}> Home</button>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 20, color: "var(--text3)", marginBottom: 4 }}>
          <span>Overall progress</span>
          <span>{completedSubtypes}/{totalSubtypes} subtypes</span>
        </div>
        <div style={{ height: 5, background: "var(--surface2)", borderRadius: 99, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${(completedSubtypes / totalSubtypes) * 100}%`, background: "linear-gradient(90deg,var(--blue),var(--cyan))", borderRadius: 99 }} />
        </div>
      </div>

      <div className="card">
        <StreakDots current={streak} needed={streakNeeded} />

        {isMissingDigit ? (
          <>
            <p style={{ textAlign: "center", fontSize: 19, fontWeight: 600, color: "var(--text2)", marginBottom: 14 }}>
              Click each blank and type the missing digit.
            </p>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
              {problem && (
                <MissingDigitProblem
                  problem={problem}
                  inputs={mdInputs}
                  onFocus={setMdFocused}
                  focusedCell={mdFocused}
                  submitted={mdSubmitted}
                  correct={mdCorrect}
                />
              )}
            </div>
            {mdFocused && !mdSubmitted && (
              <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
                {[1,2,3,4,5,6,7,8,9,0].map(d => (
                  <button key={d}
                    style={{ width: 44, height: 44, borderRadius: 8, border: "1px solid var(--border2)", background: "var(--bg2)", fontSize: 22, fontWeight: 700, fontFamily: "var(--mono)", cursor: "pointer", color: "var(--text)" }}
                    onMouseDown={e => { e.preventDefault(); setMdInputs(prev => ({ ...prev, [mdFocused]: String(d) })); }}>
                    {d}
                  </button>
                ))}
              </div>
            )}
            {mdSubmitted ? (
              <div style={{ animation: "popIn 0.25s ease" }}>
                <div style={{ fontSize: 19, fontWeight: 700, textAlign: "center", marginBottom: 12,
                  color: Object.values(mdCorrect).every(Boolean) ? "var(--green)" : "var(--red)" }}>
                  {Object.values(mdCorrect).every(Boolean) ? "Correct!" : "Not quite - check the highlighted digits"}
                </div>
                <button className="btn btn-success" style={{ width: "100%", fontSize: 20, padding: "13px" }}
                  onClick={handleMdNext}>
                  {Object.values(mdCorrect).every(Boolean) ? " Next problem" : " Try another"}
                </button>
              </div>
            ) : (
              <button className="btn btn-primary" style={{ width: "100%", fontSize: 20, padding: "14px" }}
                onClick={handleMdSubmit} disabled={!mdAllFilled}>
                Submit
              </button>
            )}
          </>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
              {problem && (
                <ColumnProblem
                  problem={problem}
                  showAnswer={phase === "wrong"}
                  showWorking={phase === "wrong"}
                />
              )}
            </div>
            {phase === "correct" ? (
              <div style={{ animation: "popIn 0.25s ease", textAlign: "center" }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}></div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "var(--green)", marginBottom: 6 }}>Correct!</div>
                <div style={{ fontSize: 19, color: "var(--text3)", marginBottom: 20 }}>
                  Streak: {streak}/{streakNeeded}
                </div>
                <button className="btn btn-success" style={{ width: "100%", fontSize: 20, padding: "13px" }}
                  onClick={handleCorrectNext}>
                   Next problem
                </button>
              </div>
            ) : phase === "wrong" ? (
              <div style={{ animation: "popIn 0.25s ease" }}>
                <div style={{ fontSize: 19, fontWeight: 700, color: "#fca5a5", marginBottom: 8, textAlign: "center" }}>
                  Not quite! Here's the worked solution:
                </div>
                <div style={{ fontSize: 20, color: "var(--text3)", textAlign: "center", marginBottom: 16 }}>
                  Streak reset - try another {currentSubtype?.label} problem
                </div>
                <button className="btn btn-success" style={{ width: "100%", fontSize: 20, padding: "13px" }}
                  onClick={handleWrongContinue}>
                  Got it - try again
                </button>
              </div>
            ) : (
              <>
                <p style={{ textAlign: "center", fontSize: 19, fontWeight: 600, color: "var(--text2)", marginBottom: 14 }}>
                  What is the answer?
                </p>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={e => e.key === "Enter" && handleSubmit()}
                  inputMode="numeric"
                  placeholder="?"
                  style={{ textAlign: "center", fontSize: 34, fontFamily: "var(--mono)", fontWeight: 700, padding: "12px", marginBottom: 12 }}
                />
                <button className="btn btn-primary" style={{ width: "100%", fontSize: 20, padding: "14px" }}
                  onMouseDown={e => { e.preventDefault(); handleSubmit(); }}
                  onTouchEnd={e => { e.preventDefault(); handleSubmit(); }}>
                  Submit
                </button>
              </>
            )}
          </>
        )}
      </div>

      {/* Topic roadmap */}
      <div style={{ marginTop: 16, display: "flex", gap: 6, flexWrap: "wrap" }}>
        {TOPICS.map((t, i) => {
          const done = i < topicIdx;
          const active = i === topicIdx;
          const ecTopic = t.isExtraCredit;
          return (
            <div key={t.id} style={{
              fontSize: 20, fontWeight: 700, padding: "4px 10px", borderRadius: 99,
              background: done ? "rgba(16,185,129,0.15)" : active ? (ecTopic ? "rgba(245,158,11,0.15)" : "rgba(59,130,246,0.15)") : "var(--surface)",
              color: done ? "var(--green)" : active ? (ecTopic ? "var(--amber)" : "var(--blue)") : "var(--text3)",
              border: `1px solid ${done ? "rgba(16,185,129,0.3)" : active ? (ecTopic ? "rgba(245,158,11,0.3)" : "rgba(59,130,246,0.3)") : "var(--border)"}`,
            }}>
              {done ? " " : active ? " " : ""}{t.icon} {ecTopic ? "EC" : (t.id.includes("add") ? "Add" : "Sub")} {ecTopic ? "" : i + 1}
            </div>
          );
        })}
      </div>
    </div>
  );
}
