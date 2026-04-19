import React, { useState, useEffect, useRef } from "react";
import { setDoc, doc, updateDoc } from "firebase/firestore";
import {
  createClassworkSession, onSessionChange, onClassworkAnswersChange,
  getTeacherClasses, addToScore, db,
} from "./core/firebase";
import { REVIEW_TOPICS, generateReviewQuestion, gradeReviewAnswer } from "./reviewQuestions";


// Load KaTeX
function useKaTeX() {
  useEffect(() => {
    if (window.katex) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.css";
    document.head.appendChild(link);
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.js";
    document.head.appendChild(script);
  }, []);
}


// KaTeX for LaTeX rendering
function KaTeX({ expr }) {
  const ref = React.useRef(null);
  useEffect(() => {
    if (ref.current && window.katex) {
      try {
        window.katex.render(expr, ref.current, { throwOnError: false, displayMode: true });
      } catch (e) {
        if (ref.current) ref.current.innerText = expr;
      }
    }
  }, [expr]);
  return <div ref={ref} style={{ textAlign: "center", fontSize: 22, padding: "8px 0" }} />;
}

const POINTS = 5;

//  Fraction Display 
function Frac({ n, d, large }) {
  const fs = large ? 28 : 20;
  return (
    <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", verticalAlign: "middle", margin: "0 4px" }}>
      <span style={{ fontSize: fs, fontFamily: "var(--mono)", fontWeight: 700, borderBottom: "2px solid var(--text)", paddingBottom: 2, lineHeight: 1 }}>{n}</span>
      <span style={{ fontSize: fs, fontFamily: "var(--mono)", fontWeight: 700, paddingTop: 2, lineHeight: 1 }}>{d}</span>
    </span>
  );
}

//  Column Arithmetic Display 
function ColumnDisplay({ a, b, op }) {
  const maxLen = Math.max(String(a).length, String(b).length);
  const aStr = String(a).padStart(maxLen, " ");
  const bStr = String(b).padStart(maxLen, " ");
  const CW = 32, CH = 40, OW = 32;
  return (
    <svg width={OW + maxLen * CW + 16} height={CH * 2 + 16} style={{ display: "block", margin: "0 auto" }}>
      {aStr.split("").map((ch, i) => ch !== " " && (
        <text key={i} x={OW + i * CW + CW / 2} y={CH * 0.75} textAnchor="middle" fontSize="28" fontWeight="700" fill="var(--text)" fontFamily="var(--mono)">{ch}</text>
      ))}
      <text x={OW - 6} y={CH + CH * 0.75} textAnchor="end" fontSize="24" fill="var(--text3)" fontFamily="var(--mono)">{op}</text>
      {bStr.split("").map((ch, i) => ch !== " " && (
        <text key={i} x={OW + i * CW + CW / 2} y={CH + CH * 0.75} textAnchor="middle" fontSize="28" fontWeight="700" fill="var(--text)" fontFamily="var(--mono)">{ch}</text>
      ))}
      <line x1={OW} y1={CH * 2 + 2} x2={OW + maxLen * CW} y2={CH * 2 + 2} stroke="var(--text)" strokeWidth="2" />
    </svg>
  );
}

//  Square SVG 

function ColumnSubtractWork({ a, b }) {
  const aStr = String(a), bStr = String(b);
  const maxLen = Math.max(aStr.length, bStr.length);
  const aPad = aStr.padStart(maxLen, "0");
  const bPad = bStr.padStart(maxLen, "0");
  const CW = 36, CH = 44, OW = 36;
  const ANNOT_H = 34; // extra space above for annotations
  const aDigits = aPad.split("").map(Number);
  const bDigits = bPad.split("").map(Number);
  const working = [...aDigits];
  for (let i = maxLen - 1; i >= 0; i--) {
    if (working[i] < bDigits[i]) {
      let j = i - 1;
      while (j >= 0 && working[j] === 0) { working[j] = 9; j--; }
      if (j >= 0) { working[j]--; working[i] += 10; }
    }
  }
  const result = a - b;
  const resultStr = String(result).padStart(maxLen, "0");
  const W = OW + maxLen * CW + 16;
  const H = ANNOT_H + CH * 3 + 20;
  const topY = ANNOT_H + CH * 0.78; // y for top number row
  return (
    <svg width={W} height={H} style={{ display: "block", margin: "0 auto" }}>
      {aDigits.map((d, i) => {
        const changed = working[i] !== d;
        const cx = OW + i * CW + CW / 2;
        return (
          <g key={i}>
            {changed && (
              <>
                {/* Strikethrough original digit */}
                <line x1={cx - 10} y1={topY - 8} x2={cx + 10} y2={topY - 24}
                  stroke="var(--red)" strokeWidth="1.5" />
                {/* New borrowed value above */}
                <text x={cx} y={ANNOT_H - 4} textAnchor="middle"
                  fontSize="22" fontWeight="800" fill="var(--blue)" fontFamily="var(--mono)">{working[i]}</text>
              </>
            )}
            <text x={cx} y={topY} textAnchor="middle" fontSize="26" fontWeight="700"
              fill={changed ? "var(--text3)" : "var(--text)"} fontFamily="var(--mono)">{d}</text>
          </g>
        );
      })}
      <text x={OW - 6} y={ANNOT_H + CH + CH * 0.78} textAnchor="end"
        fontSize="22" fill="var(--text3)" fontFamily="var(--mono)">-</text>
      {bPad.split("").map((ch, i) => (
        <text key={i} x={OW + i * CW + CW / 2} y={ANNOT_H + CH + CH * 0.78}
          textAnchor="middle" fontSize="26" fontWeight="700" fill="var(--text)" fontFamily="var(--mono)">{ch}</text>
      ))}
      <line x1={OW} y1={ANNOT_H + CH * 2 + 4} x2={OW + maxLen * CW} y2={ANNOT_H + CH * 2 + 4}
        stroke="var(--text)" strokeWidth="2" />
      {resultStr.split("").map((ch, i) => (
        <text key={i} x={OW + i * CW + CW / 2} y={ANNOT_H + CH * 2 + CH * 0.78}
          textAnchor="middle" fontSize="26" fontWeight="800" fill="var(--green)" fontFamily="var(--mono)">{ch}</text>
      ))}
    </svg>
  );
}

function ColumnMultiplyWork({ a, b }) {
  const bStr = String(b);
  const aStr = String(a);
  const bDigitsR = bStr.split("").map(Number).reverse(); // right to left
  const product = a * b;
  const maxLen = Math.max(aStr.length + bStr.length, String(product).length) + 2;
  const CW = 30, CH = 38, OW = 36;
  // Each partial product row gets its own carry strip above it
  // Carries for row r appear between row r+1 and row r+2 in the SVG grid
  const CARRY_H = 24; // height of carry strip per row
  const totalRows = 2 + bDigitsR.length + (bDigitsR.length > 1 ? 1 : 0);
  const W = OW + maxLen * CW + 16;
  const carryStripH = CARRY_H * bDigitsR.length + 4;
  const H = carryStripH + CH * totalRows + 20;

  // y position of row r (0=multiplicand, 1=multiplier, 2+=partials, last=product)
  const rowY = (r) => {
    // All rows shift down by carryStripH to make room above for carry marks
    const carryStripH = CARRY_H * bDigitsR.length + 4;
    return carryStripH + CH * r + CH * 0.75;
  };
  // Carries always appear above the multiplicand (row 0), one strip per partial
  const carryY = (partialIdx) => rowY(0) - CARRY_H - 2 + partialIdx * (CARRY_H + 2);

  const rowText = (num, r, color) => {
    const s = String(Math.round(Math.abs(num))).padStart(maxLen, " ");
    return s.split("").map((ch, i) => ch !== " " ? (
      <text key={i} x={OW + i * CW + CW / 2} y={rowY(r)} textAnchor="middle"
        fontSize="22" fontWeight={color === "var(--green)" ? "800" : "700"}
        fill={color} fontFamily="var(--mono)">{ch}</text>
    ) : null);
  };

  // Line y positions
  const line1Y = rowY(1) + CH * 0.28;
  const lastPartialRow = 1 + bDigitsR.length;
  const line2Y = rowY(lastPartialRow) + CH * 0.28;
  const productRow = lastPartialRow + (bDigitsR.length > 1 ? 1 : 0);

  return (
    <svg width={W} height={H} style={{ display: "block", margin: "0 auto" }}>
      {rowText(a, 0, "var(--text)")}
      <text x={OW - 6} y={rowY(1)} textAnchor="end" fontSize="20" fill="var(--text3)" fontFamily="var(--mono)">x</text>
      {rowText(b, 1, "var(--text)")}
      <line x1={OW} y1={line1Y} x2={OW + maxLen * CW} y2={line1Y} stroke="var(--text)" strokeWidth="2" />
      {bDigitsR.map((d, partialIdx) => {
        const partial = a * d * Math.pow(10, partialIdx);
        // Compute carries: col = maxLen-2-i always (relative to multiplicand)
        const aDigitsR = aStr.split("").map(Number).reverse();
        let carry = 0;
        const carries = [];
        for (let i = 0; i < aDigitsR.length; i++) {
          const prod = aDigitsR[i] * d + carry;
          carry = Math.floor(prod / 10);
          carries.push({ col: maxLen - 2 - i - partialIdx, val: carry });
        }
        const cy = carryY(partialIdx);
        return (
          <g key={partialIdx}>
            {carries.map((c, ci) => c.val > 0 && c.col >= 0 ? (
              <text key={ci} x={OW + c.col * CW + CW / 2} y={cy}
                textAnchor="middle" fontSize="20" fontWeight="800"
                fill="var(--blue)" fontFamily="var(--mono)">{c.val}</text>
            ) : null)}
            {rowText(partial, partialIdx + 2, "var(--text2)")}
          </g>
        );
      })}
      {bDigitsR.length > 1 && (
        <line x1={OW} y1={line2Y} x2={OW + maxLen * CW} y2={line2Y} stroke="var(--text)" strokeWidth="2" />
      )}
      {rowText(product, productRow, "var(--green)")}
    </svg>
  );
}


function SquareDisplay({ s, unit, showAll }) {
  const W = 240, H = 240, sx = 40, sy = 40, sw = 160;
  return (
    <svg viewBox={"0 0 " + W + " " + H} style={{ width: 240, display: "block", margin: "0 auto" }}>
      <rect x={sx} y={sy} width={sw} height={sw} stroke="var(--blue)" strokeWidth="2.5" fill="rgba(59,130,246,0.07)" />
      <text x={sx + sw / 2} y={sy - 10} textAnchor="middle" fontSize="16" fontWeight="700" fill="var(--text)" fontFamily="var(--mono)">{s} {unit}</text>
      {showAll && (<>
        <text x={sx + sw + 14} y={sy + sw / 2 + 6} textAnchor="start" fontSize="16" fontWeight="700" fill="var(--green)" fontFamily="var(--mono)">{s} {unit}</text>
        <text x={sx + sw / 2} y={sy + sw + 22} textAnchor="middle" fontSize="16" fontWeight="700" fill="var(--green)" fontFamily="var(--mono)">{s} {unit}</text>
        <text x={sx - 14} y={sy + sw / 2 + 6} textAnchor="end" fontSize="16" fontWeight="700" fill="var(--green)" fontFamily="var(--mono)">{s} {unit}</text>
      </>)}
    </svg>
  );
}

//  Rectangle SVG 
function RectDisplay({ w, h, unit, showAll }) {
  const W = 280, H = 220, rx = 40, ry = 30, rw = 200, rh = 160;
  return (
    <svg viewBox={"0 0 " + W + " " + H} style={{ width: 280, display: "block", margin: "0 auto" }}>
      <rect x={rx} y={ry} width={rw} height={rh} stroke="var(--blue)" strokeWidth="2.5" fill="rgba(59,130,246,0.07)" />
      <text x={rx + rw / 2} y={ry - 10} textAnchor="middle" fontSize="15" fontWeight="700" fill="var(--text)" fontFamily="var(--mono)">{w} {unit}</text>
      <text x={rx + rw + 12} y={ry + rh / 2 + 6} textAnchor="start" fontSize="15" fontWeight="700" fill="var(--text)" fontFamily="var(--mono)">{h} {unit}</text>
      {showAll && (<>
        <text x={rx + rw / 2} y={ry + rh + 20} textAnchor="middle" fontSize="15" fontWeight="700" fill="var(--green)" fontFamily="var(--mono)">{w} {unit}</text>
        <text x={rx - 12} y={ry + rh / 2 + 6} textAnchor="end" fontSize="15" fontWeight="700" fill="var(--green)" fontFamily="var(--mono)">{h} {unit}</text>
      </>)}
    </svg>
  );
}

//  Number Line 
function NumberLine({ value, filled, shadeRight, onClick, interactive }) {
  const W = 520, H = 80, y = 44;
  const min = -11, max = 11;
  const xOf = v => 20 + ((v - min) / (max - min)) * (W - 40);
  const cx = value !== null ? xOf(value) : null;
  return (
    <svg viewBox={"0 0 " + W + " " + H} style={{ width: "100%", maxWidth: 520, display: "block", margin: "0 auto", cursor: interactive ? "pointer" : "default" }}
      onClick={interactive ? (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (W / rect.width);
        const v = Math.round(min + ((x - 20) / (W - 40)) * (max - min));
        if (v >= min && v <= max) onClick(v);
      } : null}>
      <line x1={10} y1={y} x2={W - 10} y2={y} stroke="var(--text)" strokeWidth="2" />
      <polygon points={(W - 10) + "," + y + " " + (W - 18) + "," + (y - 5) + " " + (W - 18) + "," + (y + 5)} fill="var(--text)" />
      <polygon points={"10," + y + " 18," + (y - 5) + " 18," + (y + 5)} fill="var(--text)" />
      {Array.from({ length: max - min + 1 }, (_, i) => {
        const v = min + i;
        const x = xOf(v);
        return (
          <g key={v}>
            <line x1={x} y1={y - 5} x2={x} y2={y + 5} stroke="var(--text)" strokeWidth="1.5" />
            {v % 2 === 0 && <text x={x} y={y + 18} textAnchor="middle" fontSize="10" fill="var(--text2)">{v}</text>}
          </g>
        );
      })}
      {cx !== null && shadeRight !== null && (
        <line x1={shadeRight ? cx : 20} y1={y} x2={shadeRight ? W - 20 : cx} y2={y}
          stroke="var(--blue)" strokeWidth="4" strokeLinecap="round" />
      )}
      {cx !== null && (
        <circle cx={cx} cy={y} r={8} fill={filled ? "var(--blue)" : "var(--bg)"} stroke="var(--blue)" strokeWidth="2.5" />
      )}
    </svg>
  );
}

//  Question Display 
function QuestionDisplay({ question, revealing }) {
  if (!question) return null;
  const q = question;

  switch (q.type) {
    case "q1":
      return revealing
        ? <ColumnSubtractWork a={q.a} b={q.b} />
        : <ColumnDisplay a={q.a} b={q.b} op="-" />;
    case "q2":
      return revealing
        ? <ColumnMultiplyWork a={q.a} b={q.b} />
        : <ColumnDisplay a={q.a} b={q.b} op="x" />;
    case "q3":
      return <SquareDisplay s={q.s} unit={q.unit} showAll={revealing} />;
    case "q4":
      return q.shape === "square"
        ? <SquareDisplay s={q.s} unit={q.unit} showAll={revealing} />
        : <RectDisplay w={q.w} h={q.h} unit={q.unit} showAll={revealing} />;
    case "q5":
      return (
        <div style={{ display: "flex", gap: 32, justifyContent: "center", flexWrap: "wrap" }}>
          {[q.prob1, q.prob2].map((p, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              {p.style === "fraction"
                ? <Frac n={p.num} d={p.den} large />
                : <div style={{ fontSize: 32, fontFamily: "var(--mono)", fontWeight: 700 }}>{p.num} / {p.den}</div>
              }
            </div>
          ))}
        </div>
      );
    case "q6":
      return (
        <div style={{ textAlign: "center", fontSize: 28, fontFamily: "var(--mono)", fontWeight: 700 }}>
          {q.dividend} / {q.divisor}
        </div>
      );
    case "q7":
      return <KaTeX expr={q.latex} />;
    case "q8":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
          {q.pairs.map((p, i) => (
            <div key={i} style={{ fontSize: 24, fontFamily: "var(--mono)", fontWeight: 700 }}>
              {p.a} {revealing ? <span style={{ color: "var(--green)" }}>{p.answer}</span> : "___"} {p.b}
            </div>
          ))}
        </div>
      );
    case "q9": case "q10":
      return (
        <div style={{ display: "flex", gap: 32, justifyContent: "center", flexWrap: "wrap" }}>
          {[q.prob1, q.prob2].map((p, i) => (
            <div key={i} style={{ fontSize: 24, fontFamily: "var(--mono)", fontWeight: 700, textAlign: "center" }}>
              {p.a} {q.type === "q9" ? "+" : "-"} ({p.b})
            </div>
          ))}
        </div>
      );
    case "q11":
      return <div style={{ fontSize: 28, fontFamily: "var(--mono)", fontWeight: 700, textAlign: "center" }}>{q.expr}</div>;
    case "q12":
      return (
        <div style={{ display: "flex", gap: 32, justifyContent: "center", flexWrap: "wrap" }}>
          {[q.prob1, q.prob2].map((p, i) => (
            <div key={i} style={{ fontSize: 28, fontFamily: "var(--mono)", fontWeight: 700 }}>{p.expr}</div>
          ))}
        </div>
      );
    case "q13":
      return <div style={{ fontSize: 24, fontFamily: "var(--mono)", fontWeight: 700, textAlign: "center" }}>{q.expr}</div>;
    case "q14": case "q15":
      return (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 14, color: "var(--text2)", marginBottom: 8 }}>Given: {q.given}</div>
          <div style={{ fontSize: 28, fontFamily: "var(--mono)", fontWeight: 700 }}>{q.expr}</div>
        </div>
      );
    case "q16": case "q17":
      return <div style={{ fontSize: 28, fontFamily: "var(--mono)", fontWeight: 700, textAlign: "center" }}>{q.expr}</div>;
    case "q18": case "q19": case "q20": case "q21": case "q22": case "q24":
      return (
        <div style={{ textAlign: "center" }}>
          {(q.type === "q20" || q.type === "q21" || q.type === "q22") && (
            <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 6 }}>Give answer as a fraction if needed</div>
          )}
          <div style={{ fontSize: 26, fontFamily: "var(--mono)", fontWeight: 700 }}>{q.expr}</div>
        </div>
      );
    case "q23":
      return (
        <div>
          <div style={{ fontSize: 24, fontFamily: "var(--mono)", fontWeight: 700, textAlign: "center", marginBottom: 12 }}>{q.expr}</div>
          <NumberLine value={revealing ? q.answer.val : null} filled={revealing ? q.answer.filled : false}
            shadeRight={revealing ? q.answer.shadeRight : null} interactive={false} />
        </div>
      );
    case "q25":
      return <div style={{ textAlign: "center" }}><Frac n={q.n} d={q.d} large /></div>;
    case "q26":
      return <div style={{ fontSize: 26, fontFamily: "var(--mono)", fontWeight: 700, textAlign: "center" }}>{q.expr}</div>;
    case "q27": case "q28":
      return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
          <Frac n={q.n1} d={q.d1} large />
          <span style={{ fontSize: 28, fontWeight: 700 }}>{q.type === "q27" ? "x" : "/"}</span>
          <Frac n={q.n2} d={q.d2} large />
        </div>
      );
    case "q29": {
      const [n1, d1, n2, d2] = q.nums;
      return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
          <Frac n={n1 ?? "?"} d={d1 ?? "?"} large />
          <span style={{ fontSize: 28, fontWeight: 700 }}>=</span>
          <Frac n={n2 ?? "?"} d={d2 ?? "?"} large />
        </div>
      );
    }
    case "q30":
      return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
          <Frac n={q.n1} d={q.d1} large />
          <span style={{ fontSize: 28, fontWeight: 700 }}>{q.op}</span>
          <Frac n={q.n2} d={q.d2} large />
        </div>
      );
    case "q31": case "q32": case "q33":
      return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
          <span style={{ fontSize: 24, fontFamily: "var(--mono)", fontWeight: 700 }}>{q.mixed1}</span>
          <span style={{ fontSize: 28, fontWeight: 700 }}>
            {q.type === "q31" ? "x" : q.op === "+" ? "+" : "-"}
          </span>
          <span style={{ fontSize: 24, fontFamily: "var(--mono)", fontWeight: 700 }}>{q.mixed2}</span>
        </div>
      );
    case "q34":
      return <div style={{ fontSize: 22, fontFamily: "var(--mono)", fontWeight: 700, textAlign: "center" }}>{q.expr}</div>;
    case "q35":
      return <ColumnDisplay a={q.a} b={q.b} op="-" />;
    case "q36":
      return <ColumnDisplay a={q.a} b={q.b} op="x" />;
    case "q37":
      return (
        <div style={{ fontSize: 28, fontFamily: "var(--mono)", fontWeight: 700, textAlign: "center" }}>
          {q.dividend} / {q.divisor}
        </div>
      );
    case "q38":
      return (
        <div>
          <div style={{ fontSize: 15, marginBottom: 12 }}>{q.story}</div>
          <div style={{ fontSize: 14, color: "var(--text2)", marginBottom: 4 }}>(a) {q.qa}</div>
          <div style={{ fontSize: 14, color: "var(--text2)" }}>(b) {q.qb}</div>
        </div>
      );
    case "q39":
      return <div style={{ fontSize: 15, lineHeight: 1.8 }}>{q.story}</div>;
    case "q40":
      return <div style={{ fontSize: 36, fontFamily: "var(--mono)", fontWeight: 700, textAlign: "center" }}>{q.dec}</div>;
    case "q41":
      return <div style={{ fontSize: 36, fontFamily: "var(--mono)", fontWeight: 700, textAlign: "center" }}>{q.dec}</div>;
    case "q42":
      return <div style={{ fontSize: 24, fontWeight: 700, textAlign: "center" }}>Find {q.a}% of {q.b}</div>;
    case "q43": case "q44":
      return (
        <div>
          <div style={{ fontSize: 15, marginBottom: 10 }}>{q.story}</div>
          {q.table && (
            <table style={{ borderCollapse: "collapse", fontSize: 13, marginBottom: 8 }}>
              <tbody>
                {q.table.map((row, i) => (
                  <tr key={i}><td style={{ padding: "3px 10px", border: "1px solid var(--border)" }}>{row}</td></tr>
                ))}
              </tbody>
            </table>
          )}
          <div style={{ fontSize: 13, color: "var(--text3)" }}>Include the correct unit in your answer.</div>
        </div>
      );
    default:
      return <div style={{ fontSize: 20, fontFamily: "var(--mono)" }}>{q.prompt}</div>;
  }
}

//  Answer Input 
function AnswerInput({ question, onSubmit, submitted }) {
  const [input, setInput] = useState("");
  const [input2, setInput2] = useState("");
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [selectedOp, setSelectedOp] = useState(null);
  const [nlVal, setNlVal] = useState(null);
  const [nlFilled, setNlFilled] = useState(true);
  const [nlShadeRight, setNlShadeRight] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    setInput(""); setInput2(""); setSelectedUnit(null); setSelectedOp(null);
    setNlVal(null); setNlFilled(true); setNlShadeRight(null);
    setTimeout(() => ref.current?.focus(), 100);
  }, [question?.type, question?.topicId]);

  if (!question) return null;
  const q = question;

  const handleSubmit = () => {
    let ans;
    switch (q.type) {
      case "q4":
        ans = JSON.stringify({ num: input, unit: selectedUnit });
        break;
      case "q5":
        ans = JSON.stringify({ ans1: input, ans2: input2 });
        break;
      case "q6":
        ans = JSON.stringify({ quotient: input, remainder: input2 });
        break;
      case "q8":
        try { ans = JSON.stringify(JSON.parse(input)); } catch { ans = input; }
        break;
      case "q9": case "q10": case "q12":
        ans = JSON.stringify({ ans1: input, ans2: input2 });
        break;
      case "q23":
        ans = JSON.stringify({ val: nlVal, filled: nlFilled, shadeRight: nlShadeRight });
        break;
      case "q24":
        ans = selectedOp + " " + input;
        break;
      case "q38":
        ans = JSON.stringify({ ansa: input, ansb: input2 });
        break;
      case "q39":
        ans = input + " " + q.unit;
        break;
      case "q43": case "q44":
        ans = JSON.stringify({ num: input, unit: selectedUnit });
        break;
      default:
        ans = input;
    }
    onSubmit(ans);
  };

  const inputStyle = { fontSize: 20, fontFamily: "var(--mono)", padding: "10px 14px", width: "100%", marginBottom: 8 };
  const btnStyle = { marginRight: 6, marginBottom: 6 };

  // Multi-input types
  if (q.type === "q5") {
    return (
      <div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 12 }}>
          {[q.prob1, q.prob2].map((p, i) => (
            <div key={i} style={{ flex: 1, minWidth: 140 }}>
              <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 4 }}>Problem {i + 1}</div>
              <input style={inputStyle} value={i === 0 ? input : input2}
                onChange={e => i === 0 ? setInput(e.target.value) : setInput2(e.target.value)}
                placeholder="0 or undefined" disabled={submitted} ref={i === 0 ? ref : null} />
              <button className="btn btn-ghost btn-sm" style={btnStyle}
                onClick={() => i === 0 ? setInput("undefined") : setInput2("undefined")}>
                UNDEFINED
              </button>
            </div>
          ))}
        </div>
        <button className="btn btn-primary" style={{ width: "100%" }} onClick={handleSubmit} disabled={submitted}>Submit</button>
      </div>
    );
  }

  if (q.type === "q6") {
    return (
      <div>
        <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
          <div style={{ flex: 2 }}>
            <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 4 }}>Quotient</div>
            <input style={inputStyle} value={input} onChange={e => setInput(e.target.value)} ref={ref} disabled={submitted} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 4 }}>Remainder</div>
            <input style={inputStyle} value={input2} onChange={e => setInput2(e.target.value)} disabled={submitted} />
          </div>
        </div>
        <button className="btn btn-primary" style={{ width: "100%" }} onClick={handleSubmit} disabled={submitted || !input || !input2}>Submit</button>
      </div>
    );
  }

  if (q.type === "q4") {
    return (
      <div>
        <input style={inputStyle} value={input} onChange={e => setInput(e.target.value)} ref={ref}
          placeholder="Enter area" disabled={submitted} />
        <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
          {q.unitChoices.map(u => (
            <button key={u} className={"btn btn-sm " + (selectedUnit === u ? "btn-primary" : "btn-ghost")}
              onClick={() => setSelectedUnit(u)} disabled={submitted}>{u}</button>
          ))}
        </div>
        <button className="btn btn-primary" style={{ width: "100%" }} onClick={handleSubmit}
          disabled={submitted || !input || !selectedUnit}>Submit</button>
      </div>
    );
  }

  if (q.type === "q8") {
    const [ops, setOps] = useState(["", "", ""]);
    const updateOp = (i, v) => { const n = [...ops]; n[i] = v; setOps(n); };
    return (
      <div>
        {q.pairs.map((p, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 22, fontFamily: "var(--mono)", fontWeight: 700, minWidth: 40, textAlign: "right" }}>{p.a}</span>
            <div style={{ display: "flex", gap: 6 }}>
              {["<", "=", ">"].map(op => (
                <button key={op} className={"btn btn-sm " + (ops[i] === op ? "btn-primary" : "btn-ghost")}
                  onClick={() => updateOp(i, op)} disabled={submitted}>{op}</button>
              ))}
            </div>
            <span style={{ fontSize: 22, fontFamily: "var(--mono)", fontWeight: 700, minWidth: 40 }}>{p.b}</span>
          </div>
        ))}
        <button className="btn btn-primary" style={{ width: "100%", marginTop: 8 }}
          onClick={() => onSubmit(JSON.stringify(ops))}
          disabled={submitted || ops.some(o => !o)}>Submit</button>
      </div>
    );
  }

  if (q.type === "q9" || q.type === "q10" || q.type === "q12") {
    return (
      <div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 12 }}>
          {[0, 1].map(i => (
            <div key={i} style={{ flex: 1, minWidth: 140 }}>
              <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 4 }}>Problem {i + 1}</div>
              <input style={inputStyle} value={i === 0 ? input : input2}
                onChange={e => i === 0 ? setInput(e.target.value) : setInput2(e.target.value)}
                disabled={submitted} ref={i === 0 ? ref : null} />
            </div>
          ))}
        </div>
        <button className="btn btn-primary" style={{ width: "100%" }} onClick={handleSubmit} disabled={submitted || !input || !input2}>Submit</button>
      </div>
    );
  }

  if (q.type === "q23") {
    return (
      <div>
        <NumberLine value={nlVal} filled={nlFilled} shadeRight={nlShadeRight}
          interactive={!submitted} onClick={v => {
            if (nlVal === v) setNlShadeRight(s => s === null ? true : s ? false : null);
            else { setNlVal(v); setNlShadeRight(null); }
          }} />
        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 10, flexWrap: "wrap" }}>
          <button className={"btn btn-sm " + (!nlFilled ? "btn-primary" : "btn-ghost")} onClick={() => setNlFilled(false)} disabled={submitted}>Open circle</button>
          <button className={"btn btn-sm " + (nlFilled ? "btn-primary" : "btn-ghost")} onClick={() => setNlFilled(true)} disabled={submitted}>Filled circle</button>
          {nlVal !== null && nlShadeRight === null && (
            <>
              <button className="btn btn-sm btn-ghost" onClick={() => setNlShadeRight(false)} disabled={submitted}>Shade left</button>
              <button className="btn btn-sm btn-ghost" onClick={() => setNlShadeRight(true)} disabled={submitted}>Shade right</button>
            </>
          )}
        </div>
        <button className="btn btn-primary" style={{ width: "100%", marginTop: 10 }}
          onClick={handleSubmit} disabled={submitted || nlVal === null || nlShadeRight === null}>Submit</button>
      </div>
    );
  }

  if (q.type === "q24") {
    const ops24 = ["<", ">", "<=", ">="];
    return (
      <div>
        <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 6 }}>x</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
          {ops24.map(op => (
            <button key={op} className={"btn btn-sm " + (selectedOp === op ? "btn-primary" : "btn-ghost")}
              onClick={() => setSelectedOp(op)} disabled={submitted}>{op}</button>
          ))}
        </div>
        <input style={inputStyle} value={input} onChange={e => setInput(e.target.value)} ref={ref}
          placeholder="value" disabled={submitted} />
        <button className="btn btn-primary" style={{ width: "100%", marginTop: 8 }} onClick={handleSubmit}
          disabled={submitted || !input || !selectedOp}>Submit</button>
      </div>
    );
  }

  if (q.type === "q38") {
    return (
      <div>
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 4 }}>(a) {q.qa}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input style={{ ...inputStyle, marginBottom: 0 }} value={input} onChange={e => setInput(e.target.value)} ref={ref}
              placeholder="e.g. 3:5" disabled={submitted} />
          </div>
        </div>
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 4 }}>(b) {q.qb}</div>
          <input style={{ ...inputStyle, marginBottom: 0 }} value={input2} onChange={e => setInput2(e.target.value)}
            placeholder="e.g. 7:4" disabled={submitted} />
        </div>
        <button className="btn btn-primary" style={{ width: "100%" }} onClick={handleSubmit}
          disabled={submitted || !input || !input2}>Submit</button>
      </div>
    );
  }

  if (q.type === "q39") {
    return (
      <div>
        <input style={inputStyle} value={input} onChange={e => setInput(e.target.value)} ref={ref}
          placeholder={"Enter number of " + q.unit} disabled={submitted} />
        <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 8 }}>Unit: {q.unit}</div>
        <button className="btn btn-primary" style={{ width: "100%" }} onClick={handleSubmit}
          disabled={submitted || !input}>Submit</button>
      </div>
    );
  }

  if (q.type === "q41") {
    return (
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input style={{ ...inputStyle, flex: 1, marginBottom: 0 }} value={input}
          onChange={e => setInput(e.target.value)} ref={ref} placeholder="e.g. 45" disabled={submitted} />
        <button className="btn btn-ghost" style={{ fontSize: 20, padding: "10px 16px" }}
          onClick={() => setInput(v => v + "%")}>%</button>
        <button className="btn btn-primary" onClick={() => onSubmit(input)} disabled={submitted || !input}>Submit</button>
      </div>
    );
  }

  if (q.type === "q43" || q.type === "q44") {
    return (
      <div>
        <input style={inputStyle} value={input} onChange={e => setInput(e.target.value)} ref={ref}
          placeholder="Enter number" disabled={submitted} />
        <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
          {q.units.map(u => (
            <button key={u} className={"btn btn-sm " + (selectedUnit === u ? "btn-primary" : "btn-ghost")}
              onClick={() => setSelectedUnit(u)} disabled={submitted}>{u}</button>
          ))}
        </div>
        <button className="btn btn-primary" style={{ width: "100%" }} onClick={handleSubmit}
          disabled={submitted || !input || !selectedUnit}>Submit</button>
      </div>
    );
  }

  // Default: single text input
  return (
    <div>
      {(q.type === "q20" || q.type === "q21" || q.type === "q22" || q.type === "q34") && (
        <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 6 }}>Enter as fraction (e.g. 3/4) if not a whole number</div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <input ref={ref} style={{ ...inputStyle, flex: 1, marginBottom: 0 }} value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && onSubmit(input)}
          placeholder="Answer" disabled={submitted} />
        <button className="btn btn-primary" onClick={() => onSubmit(input)}
          disabled={submitted || !input.trim()}>Submit</button>
      </div>
    </div>
  );
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
      if (left === 0 && !expiredRef.current) { expiredRef.current = true; onExpired?.(); }
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [endsAt]);
  const pct = Math.max(0, (remaining / totalSeconds) * 100);
  const color = remaining <= 5 ? "var(--red)" : remaining <= 10 ? "var(--amber)" : "var(--green)";
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text3)", marginBottom: 4 }}>
        <span>Time remaining</span>
        <span style={{ fontWeight: 700, color, fontSize: 16 }}>{remaining}s</span>
      </div>
      <div style={{ height: 7, background: "var(--surface2)", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ height: "100%", width: pct + "%", background: color, borderRadius: 99, transition: "width 0.5s linear" }} />
      </div>
    </div>
  );
}

//  Teacher View 
function TeacherReview({ session, sessionId, uid }) {
  const [answers, setAnswers] = useState([]);
  const [timerInput, setTimerInput] = useState(90);
  const [currentTopicIdx, setCurrentTopicIdx] = useState(0);
  const revealedRef = useRef(false);
  const question = session.currentQuestion;
  const participants = session.participants || {};
  const totalStudents = Object.keys(participants).length;
  const currentTopic = REVIEW_TOPICS[currentTopicIdx];

  useEffect(() => {
    if (!question?.id) return;
    setAnswers([]);
    revealedRef.current = false;
    const unsub = onClassworkAnswersChange(sessionId, question.id, setAnswers);
    return () => unsub();
  }, [question?.id]);

  const handleGenerate = async () => {
    const q = generateReviewQuestion(currentTopic.id);
    q.id = "q_" + Date.now().toString(36);
    q.points = POINTS;
    revealedRef.current = false;
    setAnswers([]);
    await updateDoc(doc(db, "sessions", sessionId), {
      status: "question", currentQuestion: q,
      timerSeconds: timerInput, timerEndsAt: Date.now() + timerInput * 1000,
      questionCount: (session.questionCount || 0) + 1,
    });
  };

  const handleReveal = async () => {
    if (revealedRef.current) return;
    revealedRef.current = true;
    for (const ans of answers) {
      if (ans.answer !== undefined && gradeReviewAnswer(ans.answer, question)) {
        await addToScore(sessionId, ans.uid, POINTS);
      }
    }
    await updateDoc(doc(db, "sessions", sessionId), { status: "revealing" });
  };

  const handleNextTopic = async () => {
    const nextIdx = Math.min(currentTopicIdx + 1, REVIEW_TOPICS.length - 1);
    setCurrentTopicIdx(nextIdx);
    const q = generateReviewQuestion(REVIEW_TOPICS[nextIdx].id);
    q.id = "q_" + Date.now().toString(36);
    q.points = POINTS;
    revealedRef.current = false;
    setAnswers([]);
    await updateDoc(doc(db, "sessions", sessionId), {
      status: "question", currentQuestion: q,
      timerSeconds: timerInput, timerEndsAt: Date.now() + timerInput * 1000,
      questionCount: (session.questionCount || 0) + 1,
    });
  };

  const handleEnd = async () => {
    if (confirm("End the session?")) await updateDoc(doc(db, "sessions", sessionId), { status: "ended" });
  };

  const submittedCount = answers.length;
  const correctCount = answers.filter(a => gradeReviewAnswer(a.answer, question)).length;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 13, color: "var(--text3)" }}>Join Code</div>
            <div style={{ fontSize: 36, fontWeight: 900, fontFamily: "var(--mono)", color: "var(--blue)", letterSpacing: "0.15em" }}>{session.joinCode}</div>
            <div style={{ fontSize: 13, color: "var(--text3)" }}>{totalStudents} student{totalStudents !== 1 ? "s" : ""} joined</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <label style={{ fontSize: 13, color: "var(--text2)" }}>Seconds:</label>
              <input type="number" min={10} max={300} value={timerInput}
                onChange={e => setTimerInput(Number(e.target.value))}
                style={{ width: 70, padding: "6px 10px", fontSize: 14, textAlign: "center" }} />
            </div>
            {session.status === "question" && <button className="btn btn-ghost" onClick={handleReveal}>Reveal</button>}
            {session.status === "revealing" && (
              <>
                <button className="btn btn-ghost" onClick={handleGenerate}>Repeat</button>
                {currentTopicIdx < REVIEW_TOPICS.length - 1 && (
                  <button className="btn btn-primary" onClick={handleNextTopic}>
                    Next: Q{REVIEW_TOPICS[currentTopicIdx + 1].id}
                  </button>
                )}
              </>
            )}
            <button className="btn btn-ghost" style={{ color: "var(--red)" }} onClick={handleEnd}>End</button>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 16, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>Question Type</div>
          <div style={{ maxHeight: 500, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
            {REVIEW_TOPICS.map((t, i) => {
              const isActive = i === currentTopicIdx;
              const isDone = i < currentTopicIdx;
              return (
                <button key={t.id} onClick={() => setCurrentTopicIdx(i)}
                  style={{ background: isActive ? "rgba(232,99,10,0.1)" : "var(--surface)", border: "1.5px solid " + (isActive ? "var(--blue)" : isDone ? "rgba(16,185,129,0.3)" : "var(--border)"), borderRadius: "var(--radius-sm)", padding: "6px 10px", cursor: "pointer", textAlign: "left", fontFamily: "var(--font)" }}>
                  <div style={{ fontWeight: 700, fontSize: 11, color: isActive ? "var(--blue)" : isDone ? "var(--green)" : "var(--text)" }}>
                    {isDone ? "done " : isActive ? "now " : "Q" + t.id + ". "}{t.label}
                  </div>
                </button>
              );
            })}
          </div>
          <button className="btn btn-primary" style={{ marginTop: 8, fontSize: 14 }}
            onClick={handleGenerate} disabled={session.status === "question"}>
            Generate Q{currentTopic.id}
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {session.status === "waiting" && (
            <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
              <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Waiting for students</h3>
              <p style={{ color: "var(--blue)", fontFamily: "var(--mono)", fontSize: 28, fontWeight: 900 }}>{session.joinCode}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 12 }}>
                {Object.values(participants).map(p => (
                  <div key={p.name} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "5px 12px", fontSize: 13, fontWeight: 600 }}>{p.name}</div>
                ))}
              </div>
            </div>
          )}

          {question && (session.status === "question" || session.status === "revealing") && (
            <>
              <div className="card">
                <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 6 }}>
                  Q{currentTopic.id}: {currentTopic.label} - {submittedCount}/{totalStudents} submitted - {correctCount} correct
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>{question.prompt}</div>
                <QuestionDisplay question={question} revealing={session.status === "revealing"} />
                {session.status === "question" && session.timerEndsAt && (
                  <div style={{ marginTop: 12 }}>
                    <TimerBar endsAt={session.timerEndsAt} totalSeconds={session.timerSeconds} onExpired={async () => {
                      if (session.status === "question" && !revealedRef.current) await handleReveal();
                    }} />
                  </div>
                )}
                {session.status === "revealing" && (
                  <div style={{ marginTop: 12, background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "var(--radius-sm)", padding: "10px 14px" }}>
                    <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 4 }}>Correct answer</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "var(--green)", fontFamily: "var(--mono)" }}>{question.answer}</div>
                  </div>
                )}
                <div style={{ height: 6, background: "var(--surface2)", borderRadius: 99, overflow: "hidden", marginTop: 12 }}>
                  <div style={{ height: "100%", width: (totalStudents > 0 ? (submittedCount / totalStudents) * 100 : 0) + "%", background: "var(--blue)", borderRadius: 99, transition: "width 0.3s" }} />
                </div>
              </div>

              <div className="card">
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Student Answers</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 260, overflowY: "auto" }}>
                  {Object.entries(participants).map(([pUid, p]) => {
                    const ans = answers.find(a => a.uid === pUid);
                    const has = ans?.answer !== undefined && ans?.answer !== "";
                    const correct = has && gradeReviewAnswer(ans.answer, question);
                    return (
                      <div key={pUid} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "7px 12px", border: "1px solid " + (has ? (correct ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)") : "var(--border)") }}>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</span>
                        {has ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            {session.status === "revealing" && <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--text2)" }}>{ans.answer}</span>}
                            <span style={{ fontWeight: 700, color: correct ? "var(--green)" : "var(--red)" }}>{correct ? "+" + POINTS : "X"}</span>
                          </div>
                        ) : <span style={{ fontSize: 12, color: "var(--text3)" }}>thinking...</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

//  Student View 
function StudentReview({ session, sessionId, uid }) {
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [lastQId, setLastQId] = useState(null);
  const question = session.currentQuestion;
  const participants = session.participants || {};
  const myScore = participants[uid]?.totalScore || 0;

  useEffect(() => {
    if (question?.id && question.id !== lastQId) {
      setSubmitted(false); setResult(null); setLastQId(question.id);
    }
  }, [question?.id]);

  const handleSubmit = async (inputVal) => {
    if (!question || submitted) return;
    const ans = String(inputVal).trim();
    if (!ans) return;
    const correct = gradeReviewAnswer(ans, question);
    await setDoc(doc(db, "sessions", sessionId, "answers", uid + "_" + question.id), {
      uid, questionId: question.id, answer: ans, correct, submittedAt: Date.now(),
    });
    if (correct) await addToScore(sessionId, uid, POINTS);
    setResult({ correct, answer: ans });
    setSubmitted(true);
  };

  if (session.status === "waiting") return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Waiting for teacher...</h2>
      <p style={{ color: "var(--text2)" }}>Final Exam Review session is about to begin!</p>
    </div>
  );

  if (session.status === "ended") return (
    <div className="card" style={{ maxWidth: 400, margin: "0 auto", textAlign: "center", padding: "32px" }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Session Complete!</h2>
      <div style={{ fontSize: 28, fontWeight: 900, color: "var(--blue)" }}>{myScore} pts</div>
    </div>
  );

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 13, color: "var(--text3)" }}>{question?.topicLabel || ""}</div>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "5px 12px", fontSize: 13, fontWeight: 700 }}>Score: {myScore} pts</div>
      </div>
      <div className="card" key={question?.id}>
        {session.status === "question" && session.timerEndsAt && !submitted && (
          <TimerBar endsAt={session.timerEndsAt} totalSeconds={session.timerSeconds} />
        )}
        {question && (
          <>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>{question.prompt}</div>
            <QuestionDisplay question={question} revealing={session.status === "revealing"} />
          </>
        )}
        {session.status === "revealing" ? (
          <div style={{ textAlign: "center", marginTop: 12 }}>
            {result ? (
              <>
                <div style={{ fontSize: 20, fontWeight: 800, color: result.correct ? "var(--green)" : "var(--red)", marginBottom: 6 }}>
                  {result.correct ? "Correct! +" + POINTS + " pts" : "Incorrect"}
                </div>
                {!result.correct && question?.answer && (
                  <div style={{ color: "var(--green)", fontSize: 16, marginTop: 4 }}>
                    Correct: <strong style={{ fontFamily: "var(--mono)" }}>{question.answer}</strong>
                  </div>
                )}
              </>
            ) : (
              <div>
                <div style={{ color: "var(--text3)", marginBottom: 4 }}>No answer submitted.</div>
                {question?.answer && <div style={{ color: "var(--green)", fontSize: 16 }}>Correct: <strong style={{ fontFamily: "var(--mono)" }}>{question.answer}</strong></div>}
              </div>
            )}
          </div>
        ) : submitted ? (
          <div style={{ textAlign: "center", marginTop: 12 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--green)", marginBottom: 4 }}>Submitted!</div>
            <div style={{ fontSize: 12, color: "var(--text3)" }}>Waiting for teacher to reveal...</div>
          </div>
        ) : question ? (
          <div style={{ marginTop: 14 }}>
            <AnswerInput question={question} onSubmit={handleSubmit} submitted={submitted} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

//  Create Session 
function CreateReviewSession({ user, onCreated }) {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [timer, setTimer] = useState(90);
  const [loading, setLoading] = useState(false);
  useEffect(() => { getTeacherClasses(user.id).then(setClasses); }, []);
  const handleCreate = async () => {
    setLoading(true);
    try {
      const { sessionId } = await createClassworkSession(user.id, selectedClass, timer);
      await updateDoc(doc(db, "sessions", sessionId), { type: "review" });
      onCreated(sessionId);
    } catch (e) { console.error(e); }
    setLoading(false);
  };
  return (
    <div style={{ maxWidth: 480, margin: "0 auto" }}>
      <div className="card">
        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Final Exam Review</h2>
        <p style={{ color: "var(--text2)", fontSize: 13, marginBottom: 16 }}>44 question types covering all topics from the course.</p>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text2)", display: "block", marginBottom: 5 }}>Class</label>
          <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} style={{ width: "100%", padding: "10px 12px", fontSize: 14 }}>
            <option value="">Select a class...</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text2)", display: "block", marginBottom: 5 }}>Default seconds per question</label>
          <input type="number" min={30} max={300} value={timer} onChange={e => setTimer(Number(e.target.value))} style={{ width: "100%", padding: "10px 12px", fontSize: 14 }} />
        </div>
        <button className="btn btn-primary btn-lg" style={{ width: "100%" }} onClick={handleCreate} disabled={loading || !selectedClass}>
          {loading ? "Creating..." : "Start Session"}
        </button>
      </div>
    </div>
  );
}

//  Main Export 
export default function ReviewSession({ user, onHome }) {
  useKaTeX();
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
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,var(--blue),var(--purple))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#fff" }}>REV</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 18 }}>GCA</div>
              <div style={{ color: "var(--text3)", fontSize: 12 }}>Final Exam Review</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onHome}>Back to Home</button>
        </div>
        {view === "create" && <CreateReviewSession user={user} onCreated={(sid) => { setSessionId(sid); setView("session"); }} />}
        {view === "session" && session && (
          user.role === "teacher"
            ? <TeacherReview session={session} sessionId={sessionId} uid={user.id} />
            : <StudentReview session={session} sessionId={sessionId} uid={user.id} />
        )}
        {view === "session" && !session && (
          <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><div className="spinner" /></div>
        )}
      </div>
    </div>
  );
}
export { TeacherReview as ReviewTeacherView, StudentReview as ReviewStudentView };
