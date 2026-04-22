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

function fracToLatex(s) {
  if (!s) return s;
  const mixed = String(s).match(/^(-?\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return mixed[1] + "\\dfrac{" + mixed[2] + "}{" + mixed[3] + "}";
  const frac = String(s).match(/^(-?\d+)\/(\d+)$/);
  if (frac) return "\\dfrac{" + frac[1] + "}{" + frac[2] + "}";
  return String(s);
}



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

function ColumnAdditionReveal({ numbers, label }) {
  if (!numbers || numbers.length === 0) return null;
  const maxLen = Math.max(...numbers.map(n => String(n).length));
  const total = numbers.reduce((a, b) => a + b, 0);
  // Carries
  const carries = Array(maxLen).fill(0);
  for (let pos = 0; pos < maxLen; pos++) {
    let sum = pos > 0 ? carries[pos-1] : 0;
    numbers.forEach(n => {
      const s = String(n); const idx = s.length - 1 - pos;
      if (idx >= 0) sum += parseInt(s[idx]);
    });
    carries[pos] = Math.floor(sum / 10);
  }
  const carryAbove = Array(maxLen).fill(0);
  for (let pos = 0; pos < maxLen - 1; pos++) carryAbove[maxLen-2-pos] = carries[pos];
  const CW = 32, CH = 38, OW = 36;
  const W = OW + maxLen * CW + 16;
  const H = CH * (numbers.length + 1) + 30;
  const getD = (n, col) => { const s = String(n); const idx = col-(maxLen-s.length); return (idx>=0&&idx<s.length)?s[idx]:null; };
  return (
    <div style={{ marginTop: 10, display: "inline-block" }}>
      {label && <div style={{ fontSize: 14, color: "var(--text3)", marginBottom: 4, fontWeight: 600 }}>{label}</div>}
      <svg width={W} height={H} style={{ display: "block" }}>
        {carryAbove.map((c, i) => c > 0 && (
          <text key={i} x={OW+i*CW+CW/2} y={18} textAnchor="middle" fontSize="14" fontWeight="800" fill="var(--blue)" fontFamily="var(--mono)">{c}</text>
        ))}
        {numbers.map((n, ri) => (
          <g key={ri}>
            {ri === numbers.length-1 && <text x={OW-4} y={24+ri*CH+CH*0.68} textAnchor="end" fontSize="18" fill="var(--text3)" fontFamily="var(--mono)">+</text>}
            {Array.from({length:maxLen},(_,ci)=>{const d=getD(n,ci);return d?(<text key={ci} x={OW+ci*CW+CW/2} y={24+ri*CH+CH*0.68} textAnchor="middle" fontSize="24" fontWeight="700" fill="var(--text)" fontFamily="var(--mono)">{d}</text>):null;})}
          </g>
        ))}
        <line x1={OW} y1={24+numbers.length*CH+2} x2={OW+maxLen*CW} y2={24+numbers.length*CH+2} stroke="var(--text)" strokeWidth="2"/>
        {String(total).split("").map((ch,ci)=>{const col=maxLen-String(total).length+ci;return(<text key={ci} x={OW+col*CW+CW/2} y={24+numbers.length*CH+CH*0.72} textAnchor="middle" fontSize="24" fontWeight="800" fill="var(--green)" fontFamily="var(--mono)">{ch}</text>);})}
      </svg>
    </div>
  );
}

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
  // Carries stack above the multiplicand: ones carries closest, tens carries above
  const carryY = (partialIdx) => rowY(0) - (partialIdx + 1) * (CARRY_H + 4);

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
  const W = 340, H = 280, sx = 70, sy = 50, sw = 160;
  return (
    <svg viewBox={"0 0 " + W + " " + H} style={{ width: "100%", maxWidth: 340, display: "block", margin: "0 auto" }}>
      <rect x={sx} y={sy} width={sw} height={sw} stroke="var(--blue)" strokeWidth="2.5" fill="rgba(59,130,246,0.07)" />
      <text x={sx + sw / 2} y={sy - 12} textAnchor="middle" fontSize="16" fontWeight="700" fill="var(--text)" fontFamily="var(--mono)">{s} {unit}</text>
      {showAll && (<>
        <text x={sx + sw + 16} y={sy + sw / 2 + 6} textAnchor="start" fontSize="16" fontWeight="700" fill="var(--green)" fontFamily="var(--mono)">{s} {unit}</text>
        <text x={sx + sw / 2} y={sy + sw + 24} textAnchor="middle" fontSize="16" fontWeight="700" fill="var(--green)" fontFamily="var(--mono)">{s} {unit}</text>
        <text x={sx - 16} y={sy + sw / 2 + 6} textAnchor="end" fontSize="16" fontWeight="700" fill="var(--green)" fontFamily="var(--mono)">{s} {unit}</text>
      </>)}
    </svg>
  );
}

//  Rectangle SVG 
function RectDisplay({ w, h, unit, showAll }) {
  const W = 380, H = 240, rx = 70, ry = 36, rw = 200, rh = 160;
  return (
    <svg viewBox={"0 0 " + W + " " + H} style={{ width: "100%", maxWidth: 380, display: "block", margin: "0 auto" }}>
      <rect x={rx} y={ry} width={rw} height={rh} stroke="var(--blue)" strokeWidth="2.5" fill="rgba(59,130,246,0.07)" />
      <text x={rx + rw / 2} y={ry - 12} textAnchor="middle" fontSize="16" fontWeight="700" fill="var(--text)" fontFamily="var(--mono)">{w} {unit}</text>
      <text x={rx + rw + 14} y={ry + rh / 2 + 6} textAnchor="start" fontSize="16" fontWeight="700" fill="var(--text)" fontFamily="var(--mono)">{h} {unit}</text>
      {showAll && (<>
        <text x={rx + rw / 2} y={ry + rh + 22} textAnchor="middle" fontSize="16" fontWeight="700" fill="var(--green)" fontFamily="var(--mono)">{w} {unit}</text>
        <text x={rx - 14} y={ry + rh / 2 + 6} textAnchor="end" fontSize="16" fontWeight="700" fill="var(--green)" fontFamily="var(--mono)">{h} {unit}</text>
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

function UnitSpan({ unit }) {
  if (!unit) return null;
  if (unit.includes("^2")) {
    const base = unit.replace("^2", "");
    return <span style={{ fontFamily: "var(--mono)" }}>{base}<sup>2</sup></span>;
  }
  if (unit.includes("^3")) {
    const base = unit.replace("^3", "");
    return <span style={{ fontFamily: "var(--mono)" }}>{base}<sup>3</sup></span>;
  }
  return <span style={{ fontFamily: "var(--mono)" }}>{unit}</span>;
}


function LongDivisionWork({ dividend, divisor, quotient, remainder }) {
  const dvStr = String(dividend);
  const nDigits = dvStr.length;
  const CW = 34, CH = 48, OW = 56, HEADER = 54;

  // Standard long division: group digits until working >= divisor
  const steps = [];
  let current = 0;
  let i = 0;
  while (i < nDigits) {
    current = current * 10 + parseInt(dvStr[i]);
    if (current < divisor && steps.length === 0 && i < nDigits - 1) {
      i++; continue; // keep grouping initial digits
    }
    const q = Math.floor(current / divisor);
    const sub = q * divisor;
    const diff = current - sub;
    steps.push({ rightCol: i, current, q, sub, diff });
    current = diff;
    i++;
  }

  // Quotient: right-align digits over their rightCol
  // Build quotient display: for each step, place q digit at rightCol
  const qDigits = steps.map(s => ({ col: s.rightCol, digit: String(s.q) }));

  const W = OW + nDigits * CW + 60;
  const H = HEADER + CH + steps.length * 2 * CH + 20;
  const cx = (col) => OW + col * CW + CW / 2;

  const renderNum = (num, rightCol, y, color, size) => {
    const s = String(num);
    return s.split("").map((ch, ki) => {
      const col = rightCol - s.length + 1 + ki;
      return (
        <text key={ki} x={cx(col)} y={y} textAnchor="middle"
          fontSize={size} fontWeight="700" fill={color} fontFamily="var(--mono)">{ch}</text>
      );
    });
  };

  return (
    <div style={{ overflowX: "auto", marginTop: 16 }}>
      <svg width={W} height={H} style={{ display: "block", margin: "0 auto", minWidth: W }}>
        {/* Divisor */}
        <text x={OW - 10} y={HEADER + CH * 0.78} textAnchor="end"
          fontSize="26" fontWeight="700" fill="var(--text)" fontFamily="var(--mono)">{divisor}</text>
        {/* Bracket */}
        <line x1={OW - 2} y1={HEADER + CH * 0.18} x2={OW - 2} y2={HEADER + CH}
          stroke="var(--text)" strokeWidth="2.5" />
        <line x1={OW - 2} y1={HEADER + CH * 0.18} x2={OW + nDigits * CW + 4} y2={HEADER + CH * 0.18}
          stroke="var(--text)" strokeWidth="2.5" />
        {/* Dividend */}
        {dvStr.split("").map((ch, ci) => (
          <text key={ci} x={cx(ci)} y={HEADER + CH * 0.78} textAnchor="middle"
            fontSize="26" fontWeight="700" fill="var(--text)" fontFamily="var(--mono)">{ch}</text>
        ))}
        {/* Quotient digits above bracket, each over its rightCol */}
        {qDigits.map((qd, qi) => (
          <text key={qi} x={cx(qd.col)} y={HEADER - 10} textAnchor="middle"
            fontSize="26" fontWeight="800" fill="var(--green)" fontFamily="var(--mono)">{qd.digit}</text>
        ))}
        {/* Steps: each produces working number, subtraction, line, difference */}
        {steps.map((step, si) => {
          const baseY = HEADER + CH + si * 2 * CH;
          const workY = baseY + CH * 0.78;
          const subY  = baseY + CH * 0.78;  // sub on same row as work for first step
          const lineY = baseY + CH + 2;
          const diffY = baseY + CH + CH * 0.78;
          const isLast = si === steps.length - 1;
          // working number shown only if different from prev diff or first visible step
          const showWork = si > 0 && step.current >= 10;
          const subLen = String(step.sub || 0).length;
          const lineLeft  = cx(Math.max(0, step.rightCol - Math.max(subLen, String(step.current).length) + 1)) - 4;
          const lineRight = cx(step.rightCol) + CW * 0.4;
          return (
            <g key={si}>
              {/* Show working number if it spans >1 col (brought down) */}
              {showWork && renderNum(step.current, step.rightCol, workY - CH, "var(--text3)", 20)}
              {/* Subtracted value */}
              {step.sub > 0 && renderNum(step.sub, step.rightCol, subY, "var(--text)", 22)}
              {/* Line */}
              <line x1={lineLeft} y1={lineY} x2={lineRight} y2={lineY}
                stroke="var(--text)" strokeWidth="1.5" />
              {/* Difference */}
              {renderNum(step.diff, step.rightCol, diffY,
                isLast ? "var(--blue)" : "var(--text)", 22)}
            </g>
          );
        })}
        {/* R label */}
        {remainder > 0 && (
          <text x={OW + nDigits * CW + 10}
            y={HEADER + CH + (steps.length * 2 - 1) * CH + CH * 0.78}
            fontSize="15" fontWeight="700" fill="var(--blue)" fontFamily="var(--mono)">R{remainder}</text>
        )}
      </svg>
    </div>
  );
}


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
      return (
        <div>
          <SquareDisplay s={q.s} unit={q.unit} showAll={revealing} />
          {revealing && <ColumnAdditionReveal numbers={[q.s, q.s, q.s, q.s]} label={"Perimeter = " + q.s*4 + " " + q.unit} />}
        </div>
      );
    case "q4":
      return (
        <div>
          {q.shape === "square"
            ? <SquareDisplay s={q.s} unit={q.unit} showAll={revealing} />
            : <RectDisplay w={q.w} h={q.h} unit={q.unit} showAll={revealing} />}
          {revealing && (
            q.shape === "square"
              ? <ColumnMultiplyWork a={q.s} b={q.s} />
              : <ColumnMultiplyWork a={q.w} b={q.h} />
          )}
        </div>
      );
    case "q5":
      return (
        <div style={{ display: "flex", gap: 60, justifyContent: "center", alignItems: "center", flexWrap: "wrap", padding: "10px 0" }}>
          {[q.prob1, q.prob2].map((p, i) => (
            <div key={i} style={{ textAlign: "center", minWidth: 120 }}>
              <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 8, fontWeight: 600 }}>Expression {i+1}</div>
              {p.style === "fraction"
                ? <KaTeX expr={"\\dfrac{" + p.num + "}{" + p.den + "}"} />
                : <KaTeX expr={String(p.num) + " \\div " + String(p.den)} />
              }
            </div>
          ))}
        </div>
      );
    case "q6":
      return (
        <div>
          <KaTeX expr={String(q.dividend) + " \\div " + String(q.divisor)} />
          {revealing && <LongDivisionWork dividend={q.dividend} divisor={q.divisor}
            quotient={q.quotient} remainder={q.remainder} />}
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
    case "q9": case "q10": {
      const makeExpr = (p) => {
        if (q.type === "q9") {
          // addition: a + (b) where b is negative
          return p.a + (p.b >= 0 ? " + " + p.b : " + (" + p.b + ")");
        } else {
          // subtraction: a - b, showing negative numbers in parens
          return (p.a < 0 ? "(" + p.a + ")" : String(p.a)) + " - " + (p.b < 0 ? "(" + p.b + ")" : String(p.b));
        }
      };
      return (
        <div style={{ display: "flex", gap: 120, justifyContent: "center", flexWrap: "wrap", alignItems: "center" }}>
          {[q.prob1, q.prob2].map((p, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 6, fontWeight: 600 }}>Problem {i+1}</div>
              <KaTeX expr={makeExpr(p)} />
            </div>
          ))}
        </div>
      );
    }
    case "q11": {
      // Parse terms handling both + and - separators, build KaTeX
      const raw11 = q.expr.trim().replace(/\s*-\s*/g, " -").replace(/\s*\+\s*/g, " +");
      const terms11 = raw11.split(/\s+/).filter(Boolean);
      const latex11 = terms11.reduce((acc, t) => {
        if (acc === "") return t;
        if (t.startsWith("-")) return acc + " - " + t.slice(1);
        return acc + " + " + (t.startsWith("+") ? t.slice(1) : t);
      }, "");
      return <KaTeX expr={latex11} />;
    }
    case "q12": {
      const toLatex12 = (p) => {
        if (p.form === "neg-base") return "(-" + p.a + ")^{" + p.n + "}";
        if (p.form === "neg-neg-base") return "-(-" + p.a + ")^{" + p.n + "}";
        return "-(" + p.a + "^{" + p.n + "})";
      };
      return (
        <div style={{ display: "flex", gap: 120, justifyContent: "center", flexWrap: "wrap", alignItems: "center" }}>
          {[q.prob1, q.prob2].map((p, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 6, fontWeight: 600 }}>Problem {i+1}</div>
              <KaTeX expr={toLatex12(p)} />
            </div>
          ))}
        </div>
      );
    }
    case "q13": {
      // Build LaTeX: x^2 \cdot x \cdot x^3
      const factors13 = q.exponents.map(e => e === 1 ? q.variable : q.variable + "^{" + e + "}");
      return <KaTeX expr={factors13.join(" \\cdot ")} />;
    }
    case "q14": case "q15": {
      // Convert expr to LaTeX
      const toLaTeX14 = (expr) => {
        return expr
          .replace(/(\d+)([a-z])/g, "$1$2")  // keep as is, KaTeX handles
          .replace(/\//g, "\\div ")
          .replace(/(-\d+)/g, "($1)");        // wrap negatives in parens
      };
      return (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 18, color: "var(--text2)", marginBottom: 12, fontWeight: 600 }}>Given: {q.given}</div>
          <KaTeX expr={toLaTeX14(q.expr)} />
        </div>
      );
    }
    case "q16":
      return (
        <div style={{ textAlign: "center" }}>
          {q.latex
            ? <KaTeX expr={q.latex} />
            : <div style={{ fontSize: 28, fontFamily: "var(--mono)", fontWeight: 700 }}>{q.expr}</div>
          }
        </div>
      );
    case "q17":
      return <div style={{ fontSize: 28, fontFamily: "var(--mono)", fontWeight: 700, textAlign: "center" }}>{q.expr}</div>;
    case "q18":
      return (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 26, fontFamily: "var(--mono)", fontWeight: 700 }}>{q.expr}</div>
        </div>
      );
    case "q24":
      return (
        <div style={{ textAlign: "center" }}>
          {q.latex
            ? <KaTeX expr={q.latex} />
            : <div style={{ fontSize: 26, fontFamily: "var(--mono)", fontWeight: 700 }}>{q.expr}</div>
          }
        </div>
      );
    case "q19": case "q20": case "q21": case "q22":
      return (
        <div style={{ textAlign: "center" }}>
          {(q.type === "q20" || q.type === "q21" || q.type === "q22") && (
            <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 6 }}>Give answer as a fraction if needed</div>
          )}
          {q.latex
            ? <KaTeX expr={q.latex} />
            : <div style={{ fontSize: 26, fontFamily: "var(--mono)", fontWeight: 700 }}>{q.expr}</div>
          }
        </div>
      );
    case "q23":
      return (
        <div style={{ fontSize: 24, fontFamily: "var(--mono)", fontWeight: 700, textAlign: "center", marginBottom: 4 }}>{q.expr}</div>
      );
    case "q25":
      return <div style={{ textAlign: "center" }}><KaTeX expr={"\\dfrac{" + q.n + "}{" + q.d + "}"} /></div>;
    case "q26":
      return <div style={{ textAlign: "center" }}><KaTeX expr={"\\dfrac{" + q.v + "^{" + q.n + "}}{" + q.v + "^{" + q.m + "}}"} /></div>;
    case "q27": case "q28":
      return (
        <div style={{ textAlign: "center" }}>
          <KaTeX expr={"\\dfrac{" + q.n1 + "}{" + q.d1 + "} " + (q.type === "q27" ? "\\times" : "\\div") + " \\dfrac{" + q.n2 + "}{" + q.d2 + "}"} />
        </div>
      );
    case "q29": {
      const [n1, d1, n2, d2] = q.nums;
      const frac = (n, d) => {
        if (n === null || n === undefined) return "\\dfrac{?}{" + d + "}";
        if (d === null || d === undefined) return "\\dfrac{" + n + "}{?}";
        return "\\dfrac{" + n + "}{" + d + "}";
      };
      return (
        <div style={{ textAlign: "center" }}>
          <KaTeX expr={frac(n1, d1) + " = " + frac(n2, d2)} />
        </div>
      );
    }
    case "q30":
      return (
        <div style={{ textAlign: "center" }}>
          <KaTeX expr={"\\dfrac{" + q.n1 + "}{" + q.d1 + "} " + (q.op === "+" ? "+" : "-") + " \\dfrac{" + q.n2 + "}{" + q.d2 + "}"} />
        </div>
      );
    case "q31": case "q32": case "q33": {
      const op31 = q.type === "q31" ? "\\times" : (q.op === "+" ? "+" : "-");
      const m1 = fracToLatex(q.mixed1), m2 = fracToLatex(q.mixed2);
      return (
        <div style={{ textAlign: "center" }}>
          <KaTeX expr={m1 + " " + op31 + " " + m2} />
        </div>
      );
    }
    case "q34":
      return (
        <div style={{ textAlign: "center" }}>
          {q.latex
            ? <KaTeX expr={q.latex} />
            : <div style={{ fontSize: 22, fontFamily: "var(--mono)", fontWeight: 700 }}>{q.expr}</div>
          }
        </div>
      );
    case "q35":
      return (
        <div style={{ textAlign: "center" }}>
          <KaTeX expr={q.a + " - " + q.b} />
        </div>
      );
    case "q36":
      return (
        <div style={{ textAlign: "center" }}>
          <KaTeX expr={q.a + " \\times " + q.b} />
        </div>
      );
    case "q37":
      return (
        <div style={{ textAlign: "center" }}>
          {q.latex
            ? <KaTeX expr={q.latex} />
            : <div style={{ fontSize: 28, fontFamily: "var(--mono)", fontWeight: 700 }}>{q.dividend} / {q.divisor}</div>
          }
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
function MixedNumberInput({ submitted, onSubmit }) {
  const [whole, setWhole] = useState("");
  const [num, setNum] = useState("");
  const [den, setDen] = useState("");
  const buildAnswer = () => {
    const w = whole.trim(), n = num.trim(), d = den.trim();
    if (w && n && d) return w + " " + n + "/" + d;
    if (!w && n && d) return n + "/" + d;
    if (w && !n && !d) return w;
    return "";
  };
  const answer = buildAnswer();
  const fieldStyle = { fontSize: 20, fontFamily: "var(--mono)", textAlign: "center", padding: "10px 6px", width: 64, borderRadius: 8, border: "1.5px solid var(--border)", background: "var(--input)", color: "var(--text)" };
  return (
    <div>
      <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 10 }}>
        Enter as a mixed number. Leave whole blank if answer is a fraction only.
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "center", marginBottom: 12 }}>
        <input style={fieldStyle} value={whole} onChange={e => setWhole(e.target.value)}
          placeholder="W" disabled={submitted} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <input style={fieldStyle} value={num} onChange={e => setNum(e.target.value)}
            placeholder="N" disabled={submitted} />
          <div style={{ width: 64, height: 2, background: "var(--text)", borderRadius: 1 }} />
          <input style={fieldStyle} value={den} onChange={e => setDen(e.target.value)}
            placeholder="D" disabled={submitted} />
        </div>
      </div>
      {answer ? (
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <KaTeX expr={fracToLatex(answer)} />
        </div>
      ) : (
        <div style={{ textAlign: "center", fontSize: 13, color: "var(--text3)", marginBottom: 8 }}>
          Fill in fields above
        </div>
      )}
      <button className="btn btn-primary" style={{ width: "100%" }}
        onClick={() => onSubmit(answer)} disabled={submitted || !answer}>Submit</button>
    </div>
  );
}

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
        ans = input;
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
                placeholder="Enter answer" disabled={submitted} ref={i === 0 ? ref : null} />
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
              onClick={() => setSelectedUnit(u)} disabled={submitted}><UnitSpan unit={u} /></button>
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
    const opSymbol = { "<": "<", ">": ">", "<=": "\u2264", ">=": "\u2265" };
    return (
      <div>
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", justifyContent: "center" }}>
          {ops24.map(op => (
            <button key={op}
              className={"btn btn-sm " + (selectedOp === op ? "btn-primary" : "btn-ghost")}
              style={{ minWidth: 52, fontSize: 22, fontWeight: 700 }}
              onClick={() => setSelectedOp(op)}
              disabled={submitted}>
              {opSymbol[op]}
            </button>
          ))}
        </div>
        <div style={{ textAlign: "center", fontSize: 20, fontFamily: "var(--mono)", fontWeight: 700, marginBottom: 8, color: "var(--text2)" }}>
          x {selectedOp ? opSymbol[selectedOp] : <span style={{ color: "var(--text3)" }}>?</span>} {input || <span style={{ color: "var(--text3)" }}>___</span>}
        </div>
        <input style={inputStyle} value={input} onChange={e => setInput(e.target.value)} ref={ref}
          placeholder="value (e.g. 3/2)" disabled={submitted} />
        <button className="btn btn-primary" style={{ width: "100%", marginTop: 8 }} onClick={handleSubmit}
          disabled={submitted || !input.trim() || !selectedOp}>Submit</button>
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

  if (["q30","q31","q32","q33"].includes(q.type)) {
    return <MixedNumberInput submitted={submitted} onSubmit={onSubmit} />;
  }

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
  useKaTeX();
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

  const [genError, setGenError] = useState("");

  const handleGenerate = async () => {
    setGenError("");
    try {
      const q = generateReviewQuestion(currentTopic.id);
      if (!q) { setGenError("Generator returned null for topic " + currentTopic.id); return; }
      q.id = "q_" + Date.now().toString(36);
      q.points = POINTS;
      // Sanitize: Firestore rejects undefined values
      const clean = JSON.parse(JSON.stringify(q));
      revealedRef.current = false;
      setAnswers([]);
      await updateDoc(doc(db, "sessions", sessionId), {
        status: "question", currentQuestion: clean,
        timerSeconds: timerInput, timerEndsAt: Date.now() + timerInput * 1000,
        questionCount: (session.questionCount || 0) + 1,
      });
    } catch (e) {
      console.error("handleGenerate error:", e);
      setGenError(e.message || String(e));
    }
  };

  const handleReveal = async () => {
    if (revealedRef.current) return;
    revealedRef.current = true;
    try {
      for (const ans of answers) {
        if (ans.answer !== undefined && gradeReviewAnswer(ans.answer, question)) {
          await addToScore(sessionId, ans.uid, POINTS);
        }
      }
      await updateDoc(doc(db, "sessions", sessionId), { status: "revealing" });
    } catch (e) { console.error("handleReveal error:", e); setGenError(e.message || String(e)); }
  };

  const handleNextTopic = async () => {
    setGenError("");
    try {
      const nextIdx = Math.min(currentTopicIdx + 1, REVIEW_TOPICS.length - 1);
      setCurrentTopicIdx(nextIdx);
      const q = generateReviewQuestion(REVIEW_TOPICS[nextIdx].id);
      q.id = "q_" + Date.now().toString(36);
      q.points = POINTS;
      const clean = JSON.parse(JSON.stringify(q));
      revealedRef.current = false;
      setAnswers([]);
      await updateDoc(doc(db, "sessions", sessionId), {
        status: "question", currentQuestion: clean,
        timerSeconds: timerInput, timerEndsAt: Date.now() + timerInput * 1000,
        questionCount: (session.questionCount || 0) + 1,
      });
    } catch (e) { console.error("handleNextTopic error:", e); setGenError(e.message || String(e)); }
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
          {genError && <div style={{ color: "var(--red)", fontSize: 12, marginTop: 4, wordBreak: "break-all" }}>{genError}</div>}
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
                {!["q38","q39","q43","q44"].includes(question.type) && <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>{question.prompt}</div>}
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
                    {question.type === "q13" ? (
                      <KaTeX expr={question.variable + "^{" + question.total + "}"} />
                    ) : question.type === "q26" ? (
                      <KaTeX expr={question.n > question.m
                        ? question.v + "^{" + (question.n - question.m) + "}"
                        : "\\dfrac{1}{" + question.v + "^{" + (question.m - question.n) + "}}"} />
                    ) : question.type === "q23" ? (() => {
                      let ans = null;
                      try { ans = typeof question.answer === "object" ? question.answer : JSON.parse(question.answer); } catch {}
                      return ans ? <NumberLine value={ans.val} filled={ans.filled} shadeRight={ans.shadeRight} interactive={false} /> : null;
                    })() : question.type === "q16" ? (
                      <KaTeX expr={question.answerLatex || question.displayAnswer || question.answer} />
                    ) : ["q25","q27","q28","q29","q30","q31","q32","q33","q34"].includes(question.type) ? (
                      <KaTeX expr={fracToLatex(question.displayAnswer || question.answer)} />
                    ) : (
                      <div style={{ fontSize: 20, fontWeight: 800, color: "var(--green)", fontFamily: "var(--mono)" }}>
                        {question.displayAnswer || question.answerNum || question.answer}
                        {question.answerUnit ? <> <UnitSpan unit={question.answerUnit} /></> : ""}
                      </div>
                    )}
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
  useKaTeX();
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
            {!["q38","q39","q43","q44"].includes(question.type) && <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>{question.prompt}</div>}
            <QuestionDisplay question={question} revealing={session.status === "revealing"} />
          </>
        )}
        {session.status === "revealing" ? (
          <div style={{ textAlign: "center", marginTop: 12 }}>
            {question?.type === "q23" && (() => {
              let ans = null;
              try { ans = typeof question.answer === "object" ? question.answer : JSON.parse(question.answer); } catch {}
              return (
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: result?.correct ? "var(--green)" : result ? "var(--red)" : "var(--text3)", marginBottom: 8 }}>
                    {result ? (result.correct ? "Correct! +" + POINTS + " pts" : "Incorrect") : "No answer submitted."}
                  </div>
                  {ans && <NumberLine value={ans.val} filled={ans.filled} shadeRight={ans.shadeRight} interactive={false} />}
                </div>
              );
            })()}
            {question?.type !== "q23" && (result ? (
              <>
                <div style={{ fontSize: 20, fontWeight: 800, color: result.correct ? "var(--green)" : "var(--red)", marginBottom: 6 }}>
                  {result.correct ? "Correct! +" + POINTS + " pts" : "Incorrect"}
                </div>
                {!result.correct && question?.answer && (
                  <div style={{ color: "var(--green)", fontSize: 16, marginTop: 4 }}>
                    {question.type === "q13"
                      ? <span>Correct: <KaTeX expr={question.variable + "^{" + question.total + "}"} /></span>
                      : question.type === "q26"
                      ? <span>Correct: <KaTeX expr={question.n > question.m ? question.v + "^{" + (question.n - question.m) + "}" : "\\dfrac{1}{" + question.v + "^{" + (question.m - question.n) + "}}"} /></span>
                      : question.type === "q16"
                      ? <span>Correct: <KaTeX expr={question.answerLatex || question.displayAnswer || question.answer} /></span>
                      : ["q25","q27","q28","q29","q30","q31","q32","q33","q34"].includes(question.type)
                      ? <span>Correct: <KaTeX expr={fracToLatex(question.displayAnswer || question.answer)} /></span>
                      : <strong>{question.displayAnswer || question.answerNum || question.answer}{question.answerUnit ? <> <UnitSpan unit={question.answerUnit} /></> : ""}</strong>
                    }
                  </div>
                )}
              </>
            ) : (
              <div>
                <div style={{ color: "var(--text3)", marginBottom: 4 }}>No answer submitted.</div>
                {question?.answer && <div style={{ color: "var(--green)", fontSize: 16 }}>
                    {question.type === "q13"
                      ? <span>Correct: <KaTeX expr={question.variable + "^{" + question.total + "}"} /></span>
                      : question.type === "q26"
                      ? <span>Correct: <KaTeX expr={question.n > question.m ? question.v + "^{" + (question.n - question.m) + "}" : "\\dfrac{1}{" + question.v + "^{" + (question.m - question.n) + "}}"} /></span>
                      : question.type === "q16"
                      ? <span>Correct: <KaTeX expr={question.answerLatex || question.displayAnswer || question.answer} /></span>
                      : ["q25","q27","q28","q29","q30","q31","q32","q33","q34"].includes(question.type)
                      ? <span>Correct: <KaTeX expr={fracToLatex(question.displayAnswer || question.answer)} /></span>
                      : <strong>{question.displayAnswer || question.answerNum || question.answer}{question.answerUnit ? <> <UnitSpan unit={question.answerUnit} /></> : ""}</strong>
                    }
                  </div>}
              </div>
            ))}
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
