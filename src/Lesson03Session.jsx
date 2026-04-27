import { useState, useEffect, useRef } from "react";
import { setDoc, doc, updateDoc } from "firebase/firestore";
import {
  createClassworkSession, onSessionChange, onClassworkAnswersChange,
  getTeacherClasses, addToScore, db,
} from "./core/firebase";
import {
  LESSON03_TOPICS, generateLesson03Question, gradeLesson03Answer,
} from "./lesson03Questions";

const POINTS = 5;

// -- ColumnMultiplyWork (copied from ReviewSession) --
function ColumnMultiplyWork({ a, b }) {
  const bStr = String(b), aStr = String(a);
  const bDigitsR = bStr.split("").map(Number).reverse();
  const product = a * b;
  const maxLen = Math.max(aStr.length + bStr.length, String(product).length) + 2;
  const CW = 30, CH = 38, OW = 36;
  const CARRY_H = 24;
  const totalRows = 2 + bDigitsR.length + (bDigitsR.length > 1 ? 1 : 0);
  const W = OW + maxLen * CW + 16;
  const carryStripH = CARRY_H * bDigitsR.length + 4;
  const H = carryStripH + CH * totalRows + 20;
  const rowY = (r) => carryStripH + CH * r + CH * 0.75;
  const carryY = (pi) => rowY(0) - (pi + 1) * (CARRY_H + 4);
  const line1Y = rowY(1) + CH * 0.28;
  const lastPartialRow = 1 + bDigitsR.length;
  const line2Y = rowY(lastPartialRow) + CH * 0.28;
  const productRow = lastPartialRow + (bDigitsR.length > 1 ? 1 : 0);
  const rowText = (num, r, color) => {
    const s = String(Math.round(Math.abs(num))).padStart(maxLen, " ");
    return s.split("").map((ch, i) => ch !== " " ? (
      <text key={i} x={OW + i * CW + CW / 2} y={rowY(r)} textAnchor="middle"
        fontSize="22" fontWeight={color === "var(--green)" ? "800" : "700"}
        fill={color} fontFamily="var(--mono)">{ch}</text>
    ) : null);
  };
  return (
    <svg width={W} height={H} style={{ display: "block", margin: "0 auto" }}>
      {rowText(a, 0, "var(--text)")}
      <text x={OW - 6} y={rowY(1)} textAnchor="end" fontSize="20" fill="var(--text3)" fontFamily="var(--mono)">x</text>
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
                textAnchor="middle" fontSize="20" fontWeight="800" fill="var(--blue)" fontFamily="var(--mono)">{c.val}</text>
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

// -- LongDivisionWork: running-cursor layout, correct zero-in-middle --
function LongDivisionWork({ dividend, divisor, quotient, remainder }) {
  const dvStr = String(dividend);
  const nDigits = dvStr.length;
  const CW = 34, CH = 42, OW = 56, HEADER = 50;

  // Build one step per quotient digit
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

  // Assign Y positions using a running cursor.
  // Normal step (q>0, si=0):  sub + line + diff  = 2 rows
  // Normal step (q>0, si>0):  working(dim) + sub + line + diff = 3 rows worth but packed:
  //   workY = cursor + CH*0.72
  //   subY  = cursor + CH + CH*0.72
  //   lineY = cursor + CH*2 + 4
  //   diffY = cursor + CH*2 + CH*0.72
  //   advance cursor by CH*3
  // Zero step (q=0, si>0):    working(dim) + line + 0 = 2 rows
  //   workY = cursor + CH*0.72
  //   lineY = cursor + CH + 4
  //   diffY = cursor + CH + CH*0.72
  //   advance cursor by CH*2
  // First step (si=0):        sub + line + diff, no working shown
  //   subY  = cursor + CH*0.72
  //   lineY = cursor + CH + 4
  //   diffY = cursor + CH + CH*0.72
  //   advance cursor by CH*2

  let cursor = HEADER + CH;
  const positioned = steps.map((step, si) => {
    const isFirst = si === 0;
    let pos;
    if (isFirst) {
      pos = {
        workY: null,
        subY:  cursor + CH * 0.72,
        lineY: cursor + CH + 4,
        diffY: cursor + CH + CH * 0.72,
        advance: CH * 2,
      };
    } else if (step.q === 0) {
      pos = {
        workY: cursor + CH * 0.72,
        subY:  null,
        lineY: cursor + CH + 4,
        diffY: cursor + CH + CH * 0.72,
        advance: CH * 2,
      };
    } else {
      pos = {
        workY: cursor + CH * 0.72,
        subY:  cursor + CH + CH * 0.72,
        lineY: cursor + CH * 2 + 4,
        diffY: cursor + CH * 2 + CH * 0.72,
        advance: CH * 3,
      };
    }
    cursor += pos.advance;
    return { ...step, ...pos };
  });

  const totalH = cursor + CH + 20;
  const W = OW + nDigits * CW + 60;
  const cx = (col) => OW + col * CW + CW / 2;

  const rn = (num, rightCol, y, color, size, opacity) => {
    const s = String(num);
    return s.split("").map((ch, ki) => {
      const col = rightCol - s.length + 1 + ki;
      if (col < 0) return null;
      return (
        <text key={ki} x={cx(col)} y={y} textAnchor="middle"
          fontSize={size} fontWeight="700" fill={color}
          opacity={opacity ?? 1} fontFamily="var(--mono)">{ch}</text>
      );
    });
  };

  const lineX = (step) => {
    const nums = [step.working, step.q > 0 ? step.sub : 0].filter(n => n > 0);
    const maxLen = Math.max(...nums.map(n => String(n).length), 1);
    return {
      left:  cx(Math.max(0, step.col - maxLen + 1)) - 6,
      right: cx(step.col) + CW * 0.45,
    };
  };

  const lastDiffY = positioned.length > 0 ? positioned[positioned.length - 1].diffY : totalH - 20;

  return (
    <div style={{ overflowX: "auto", marginTop: 8 }}>
      <svg width={W} height={totalH} style={{ display: "block", margin: "0 auto", minWidth: W }}>
        {/* Divisor */}
        <text x={OW - 10} y={HEADER + CH * 0.78} textAnchor="end"
          fontSize="26" fontWeight="700" fill="var(--text)" fontFamily="var(--mono)">{divisor}</text>
        {/* Bracket */}
        <line x1={OW-2} y1={HEADER+CH*0.18} x2={OW-2} y2={HEADER+CH}
          stroke="var(--text)" strokeWidth="2.5" />
        <line x1={OW-2} y1={HEADER+CH*0.18} x2={OW+nDigits*CW+4} y2={HEADER+CH*0.18}
          stroke="var(--text)" strokeWidth="2.5" />
        {/* Dividend */}
        {dvStr.split("").map((ch, ci) => (
          <text key={ci} x={cx(ci)} y={HEADER+CH*0.78} textAnchor="middle"
            fontSize="26" fontWeight="700" fill="var(--text)" fontFamily="var(--mono)">{ch}</text>
        ))}
        {/* Quotient above bracket */}
        {positioned.map((step, si) => (
          <text key={si} x={cx(step.col)} y={HEADER-8} textAnchor="middle"
            fontSize="26" fontWeight="800" fill="var(--green)" fontFamily="var(--mono)">{step.q}</text>
        ))}
        {/* Work rows */}
        {positioned.map((step, si) => {
          const isLast = si === positioned.length - 1;
          const { left: ll, right: lr } = lineX(step);
          return (
            <g key={si}>
              {step.workY !== null && rn(step.working, step.col, step.workY, "var(--text3)", 22, 0.6)}
              {step.subY  !== null && rn(step.sub,     step.col, step.subY,  "var(--text)", 24)}
              <line x1={ll} y1={step.lineY} x2={lr} y2={step.lineY}
                stroke={step.q === 0 ? "var(--text2)" : "var(--text)"} strokeWidth="1.5" />
              {rn(step.q === 0 ? 0 : step.diff, step.col, step.diffY,
                isLast ? "var(--blue)" : "var(--text)", 22)}
            </g>
          );
        })}
        {/* Remainder label */}
        {remainder > 0 && (
          <text x={OW + nDigits * CW + 10} y={lastDiffY}
            fontSize="20" fontWeight="700" fill="var(--blue)" fontFamily="var(--mono)">
            R{remainder}
          </text>
        )}
      </svg>
    </div>
  );
}

// -- SVG: Rectilinear shape with color-coded split rectangles on reveal --
function RectilinearSVG({ question, revealCorrect }) {
  const { vertices, sides, unit, hideIndices, shape, W: qW, H: qH, cw, ch, bh, sh, tw, stemLeft, lw, rw } = question;
  const hiddenSet = new Set(hideIndices || []);
  if (!vertices) return null;
  const SVG_W = 400, SVG_H = 360;
  const xs = vertices.map(v => v.x), ys = vertices.map(v => v.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const scale = Math.min((SVG_W - 120) / (maxX - minX || 1), (SVG_H - 120) / (maxY - minY || 1));
  const offX = (SVG_W - (maxX - minX) * scale) / 2;
  const offY = (SVG_H - (maxY - minY) * scale) / 2;
  const sv = vertices.map(v => ({ x: (v.x - minX) * scale + offX, y: (v.y - minY) * scale + offY }));
  const n = sv.length;
  const cx2 = sv.reduce((s, p) => s + p.x, 0) / n;
  const cy2 = sv.reduce((s, p) => s + p.y, 0) / n;
  const mids = sv.map((p, i) => ({ x: (p.x + sv[(i + 1) % n].x) / 2, y: (p.y + sv[(i + 1) % n].y) / 2 }));
  const pathD = sv.map((p, i) => (i === 0 ? "M" : "L") + " " + p.x.toFixed(1) + " " + p.y.toFixed(1)).join(" ") + " Z";

  // Build split-rectangle overlay using already-transformed sv vertex positions
  // L shape (6 vertices): sv[0]=bot-left, sv[1]=bot-right, sv[2]=inner-right, sv[3]=inner-corner, sv[4]=inner-top, sv[5]=top-left
  // T shape (8 vertices): sv[0]=bot-left, sv[1]=bot-right, sv[2]=right-shoulder, sv[3]=stem-right-base, sv[4]=stem-right-top, sv[5]=stem-left-top, sv[6]=stem-left-base, sv[7]=left-shoulder
  // U shape (8 vertices): sv[0]=bot-left, sv[1]=bot-right, sv[2]=top-right, sv[3]=inner-top-right, sv[4]=inner-bot-right, sv[5]=inner-bot-left, sv[6]=inner-top-left, sv[7]=top-left
  let rect1 = null, rect2 = null, rect3 = null;
  if (revealCorrect && shape && sv.length >= 6) {
    if (shape === "L") {
      // Split into: bottom rect (full width, lower portion) + top-left rect (narrower, upper portion)
      // Bottom rect: from sv[0] (bot-left) to sv[2] (inner-right corner)
      const x0 = sv[0].x, x1 = sv[1].x;  // left and right x
      const y0 = sv[0].y;                  // bottom y
      const y2 = sv[2].y;                  // inner step y
      const y5 = sv[5].y;                  // top y
      const x4 = sv[4].x;                  // inner vertical x
      rect1 = { x: x0, y: y2, w: x1 - x0, h: y0 - y2 }; // bottom rect
      rect2 = { x: x0, y: y5, w: x4 - x0, h: y2 - y5 }; // top-left rect
    } else if (shape === "T" && sv.length >= 8) {
      // Base rect: full width bottom, stem rect: narrower top
      const x0 = sv[0].x, x1 = sv[1].x;
      const y0 = sv[0].y;                  // bottom y
      const shoulderY = sv[2].y;           // shoulder height
      const stemTopY = sv[4].y;            // stem top y
      const stemLeftX = sv[6].x;           // stem left x
      const stemRightX = sv[3].x;          // stem right x
      rect1 = { x: x0, y: shoulderY, w: x1 - x0, h: y0 - shoulderY }; // base
      rect2 = { x: stemLeftX, y: stemTopY, w: stemRightX - stemLeftX, h: shoulderY - stemTopY }; // stem
    } else if (shape === "U" && sv.length >= 8) {
      // Addition method: left arm + bottom strip + right arm
      // Vertices: [0]=bot-left, [1]=bot-right, [2]=top-right, [3]=inner-top-right,
      //           [4]=inner-bot-right, [5]=inner-bot-left, [6]=inner-top-left, [7]=top-left
      const botY        = sv[0].y;   // bottom y
      const topY        = sv[2].y;   // top y (arms reach here)
      const innerBotY   = sv[4].y;   // where inner cutout bottom is = bottom of arms inner face
      const innerRightX = sv[3].x;   // right edge of inner cutout
      const innerLeftX  = sv[6].x;   // left edge of inner cutout
      const leftX       = sv[0].x;   // left outer edge
      const rightX      = sv[1].x;   // right outer edge
      rect1 = { x: leftX,       y: topY,      w: innerLeftX - leftX,  h: botY - topY };   // left arm
      rect2 = { x: innerRightX, y: topY,      w: rightX - innerRightX, h: botY - topY };  // right arm
      rect3 = { x: innerLeftX,  y: innerBotY, w: innerRightX - innerLeftX, h: botY - innerBotY }; // bottom strip
      // Strip height label: place on the LEFT interior dotted line (innerLeftX)
      // midpoint vertically between innerBotY and botY
      rect3.labelX = innerLeftX;
      rect3.labelY = (innerBotY + botY) / 2;
      rect3.stripH = question.stripH;
      rect3.unit   = question.unit;
    }
  }

  return (
    <svg viewBox={"0 0 " + SVG_W + " " + SVG_H} style={{ width: "100%", maxWidth: 400, display: "block", margin: "0 auto" }}>
      {/* Split rectangle coloring on reveal */}
      {revealCorrect && rect1 && (
        <rect x={rect1.x} y={rect1.y} width={rect1.w} height={rect1.h}
          fill="rgba(232,99,10,0.18)" stroke="rgba(232,99,10,0.6)" strokeWidth="2" strokeDasharray="6,3" rx="2" />
      )}
      {revealCorrect && rect2 && (
        <rect x={rect2.x} y={rect2.y} width={rect2.w} height={rect2.h}
          fill="rgba(124,58,237,0.15)" stroke="rgba(124,58,237,0.6)" strokeWidth="2" strokeDasharray="6,3" rx="2" />
      )}
      {revealCorrect && rect3 && (
        <rect x={rect3.x} y={rect3.y} width={rect3.w} height={rect3.h}
          fill="rgba(16,185,129,0.15)" stroke="rgba(16,185,129,0.6)" strokeWidth="2" strokeDasharray="6,3" rx="2" />
      )}
      {/* Strip height label on the left interior dotted boundary line */}
      {revealCorrect && rect3 && rect3.stripH && (
        <g>
          <rect x={rect3.labelX + 4} y={rect3.labelY - 13} width={68} height={26} rx={5}
            fill="var(--bg2)" stroke="rgba(16,185,129,0.8)" strokeWidth="1.5" />
          <text x={rect3.labelX + 38} y={rect3.labelY + 6} textAnchor="middle" fontSize="20"
            fontWeight="800" fill="var(--green)" fontFamily="var(--mono)">
            {rect3.stripH}{rect3.unit}
          </text>
        </g>
      )}
      <path d={pathD} stroke="var(--blue)" strokeWidth="2.5" fill="rgba(59,130,246,0.04)" />
      {sv.map((p, i) => {
        const next = sv[(i + 1) % n];
        const m = mids[i];
        const ex = next.x - p.x, ey = next.y - p.y;
        const el = Math.sqrt(ex * ex + ey * ey) || 1;
        const perpX = -ey / el, perpY = ex / el;
        const outDir = (m.x - cx2) * perpX + (m.y - cy2) * perpY > 0 ? 1 : -1;
        const lx = m.x + perpX * outDir * 20;
        const ly = m.y + perpY * outDir * 20;
        const isHidden = hiddenSet.has(i);
        const showQ = isHidden && !revealCorrect;
        const sideLen = sides && sides[i] ? sides[i].length : "?";
        return (
          <g key={i}>
            <line x1={p.x} y1={p.y} x2={next.x} y2={next.y} stroke="var(--blue)" strokeWidth="2.5" />
            <rect x={lx - 32} y={ly - 14} width={64} height={28} rx={5}
              fill={showQ ? "rgba(251,191,36,0.15)" : "var(--bg2)"}
              stroke={showQ ? "var(--amber)" : isHidden ? "var(--green)" : "var(--border)"} strokeWidth="1" />
            <text x={lx} y={ly + 6} textAnchor="middle" fontSize="20" fontWeight="700"
              fill={showQ ? "#7c3aed" : isHidden ? "var(--green)" : "var(--text)"} fontFamily="var(--mono)">
              {showQ ? "?" : sideLen + unit}
            </text>
          </g>
        );
      })}
      <text x={SVG_W / 2} y={SVG_H - 8} textAnchor="middle" fontSize="20" fill="var(--text3)" fontStyle="italic">Not drawn to scale</text>
    </svg>
  );
}

// - SVG: Rectangle with unit labels -
function RectangleAreaSVG({ question }) {
  const { lengthVal, lengthUnit, widthVal, widthUnit } = question;
  const W = 380, H = 260;
  const rx = 60, ry = 40, rw = 240, rh = 160;
  return (
    <svg viewBox={"0 0 " + W + " " + H} style={{ width: "100%", maxWidth: 380, display: "block", margin: "0 auto" }}>
      <rect x={rx} y={ry} width={rw} height={rh} stroke="var(--blue)" strokeWidth="2.5" fill="rgba(59,130,246,0.07)" rx="2" />
      <polyline points={(rx+14)+","+ry+" "+(rx+14)+","+(ry+14)+" "+rx+","+(ry+14)} fill="none" stroke="var(--text3)" strokeWidth="1.5" />
      {/* Length label - top */}
      <rect x={rx+rw/2-36} y={ry-22} width={72} height={22} rx={4} fill="var(--bg2)" stroke="var(--border)" strokeWidth="1" />
      <text x={rx+rw/2} y={ry-6} textAnchor="middle" fontSize="20" fontWeight="700" fill="var(--text)" fontFamily="var(--mono)">{lengthVal} {lengthUnit}</text>
      {/* Width label - right */}
      <rect x={rx+rw+6} y={ry+rh/2-12} width={72} height={24} rx={4} fill="var(--bg2)" stroke="var(--border)" strokeWidth="1" />
      <text x={rx+rw+42} y={ry+rh/2+6} textAnchor="middle" fontSize="20" fontWeight="700" fill="var(--text)" fontFamily="var(--mono)">{widthVal} {widthUnit}</text>
      <text x={W/2} y={H-6} textAnchor="middle" fontSize="20" fill="var(--text3)" fontStyle="italic">Not drawn to scale</text>
    </svg>
  );
}

// - SVG: Square with one side labeled -
function SquareAreaSVG({ question }) {
  const { s, unit } = question;
  const W = 280, H = 280;
  const sx = 50, sy = 50, sw = 180;
  return (
    <svg viewBox={"0 0 " + W + " " + H} style={{ width: "100%", maxWidth: 280, display: "block", margin: "0 auto" }}>
      <rect x={sx} y={sy} width={sw} height={sw} stroke="var(--blue)" strokeWidth="2.5" fill="rgba(59,130,246,0.07)" />
      <polyline points={(sx+14)+","+sy+" "+(sx+14)+","+(sy+14)+" "+sx+","+(sy+14)} fill="none" stroke="var(--text3)" strokeWidth="1.5" />
      <rect x={sx+sw/2-28} y={sy-20} width={56} height={22} rx={4} fill="var(--bg2)" stroke="var(--border)" strokeWidth="1" />
      <text x={sx+sw/2} y={sy-4} textAnchor="middle" fontSize="20" fontWeight="700" fill="var(--text)" fontFamily="var(--mono)">{s} {unit}</text>
    </svg>
  );
}

// - Column multiplication display -
function ColMultiplySVG({ a, b }) {
  const aStr = String(a), bStr = String(b);
  const maxLen = Math.max(aStr.length, bStr.length) + 1;
  const CW = 26, CH = 36, OW = 26;
  const totalW = OW + maxLen * CW + 8;
  const totalH = CH * 2 + 10 + CH;
  const pad = (str) => str.padStart(maxLen, " ");
  const pA = pad(aStr), pB = pad(bStr);
  const lineY = CH * 2 + 8;
  return (
    <svg width={totalW} height={totalH} style={{ display: "block", margin: "0 auto", overflow: "visible" }}>
      {pA.split("").map((ch, ci) => ch !== " " && (
        <text key={"a"+ci} x={OW+ci*CW+CW/2} y={CH*0.75} textAnchor="middle" fontSize="24" fontWeight="700" fill="var(--text)" fontFamily="var(--mono)">{ch}</text>
      ))}
      <text x={OW-4} y={CH*1.75} textAnchor="end" fontSize="20" fill="var(--text3)" fontFamily="var(--mono)">x</text>
      {pB.split("").map((ch, ci) => ch !== " " && (
        <text key={"b"+ci} x={OW+ci*CW+CW/2} y={CH*1.75} textAnchor="middle" fontSize="24" fontWeight="700" fill="var(--text)" fontFamily="var(--mono)">{ch}</text>
      ))}
      <line x1={OW} y1={lineY} x2={OW+maxLen*CW} y2={lineY} stroke="var(--text)" strokeWidth="2.5" />
      <text x={OW+maxLen*CW-CW/2} y={lineY+CH*0.75} textAnchor="middle" fontSize="22" fontWeight="700" fill="var(--text3)" fontFamily="var(--mono)">?</text>
    </svg>
  );
}

// - Long division display -
function LongDivisionSVG({ dividend, divisor }) {
  const W = 260, H = 80;
  const divStr = String(dividend);
  return (
    <svg viewBox={"0 0 " + W + " " + H} style={{ width: "100%", maxWidth: 260, display: "block", margin: "0 auto" }}>
      <text x={60} y={52} fontSize="30" fontWeight="700" fill="var(--text)" fontFamily="var(--mono)">{divisor}</text>
      <line x1={80} y1={10} x2={80} y2={60} stroke="var(--text)" strokeWidth="2.5" />
      <line x1={80} y1={10} x2={80+divStr.length*22+10} y2={10} stroke="var(--text)" strokeWidth="2.5" />
      <text x={86} y={52} fontSize="30" fontWeight="700" fill="var(--text)" fontFamily="var(--mono)">{divStr}</text>
    </svg>
  );
}

// - Question display router -
function QuestionDisplay({ question, revealCorrect }) {
  if (!question) return null;
  const q = question;
  switch (q.type) {
    case "warmup":
      return <RectilinearSVG question={q} revealCorrect={false} />;
    case "round-multiply":
      return (
        <div style={{ textAlign: "center", fontFamily: "var(--mono)", fontSize: 42, fontWeight: 900, letterSpacing: "-1px", color: "var(--text)", margin: "8px 0" }}>
          {q.a} x {q.b}
        </div>
      );
    case "col-multiply-1":
    case "col-multiply-2":
    case "col-multiply-3":
      return (
        <div style={{ display: "flex", justifyContent: "center", margin: "8px 0" }}>
          <ColMultiplySVG a={q.a} b={q.b} />
        </div>
      );
    case "long-division":
    case "long-division-zero":
      return (
        <div style={{ display: "flex", justifyContent: "center", margin: "8px 0" }}>
          <LongDivisionSVG dividend={q.dividend} divisor={q.divisor} />
        </div>
      );
    case "rectangle-area":
      return <RectangleAreaSVG question={q} />;
    case "square-area":
      return <SquareAreaSVG question={q} />;
    case "composite-area":
      return <RectilinearSVG question={q} revealCorrect={revealCorrect} />;
    default:
      return null;
  }
}

// - Answer inputs -

// Warmup: three inputs - missing side 1, missing side 2, perimeter
function WarmupAnswerInput({ question, onSubmit, submitted }) {
  const [m1, setM1] = useState("");
  const [m2, setM2] = useState("");
  const [perim, setPerim] = useState("");
  const ref = useRef(null);
  useEffect(() => { setM1(""); setM2(""); setPerim(""); setTimeout(() => ref.current?.focus(), 100); }, [question?.id]);
  const handleSubmit = () => {
    if (!m1.trim() || !m2.trim() || !perim.trim()) return;
    onSubmit(JSON.stringify({
      m1: parseInt(m1.replace(/[^0-9]/g, "")),
      m2: parseInt(m2.replace(/[^0-9]/g, "")),
      perimeter: parseInt(perim.replace(/[^0-9]/g, "")),
    }));
  };
  const { missing1, missing2, unit } = question;
  return (
    <div>
      <div style={{ fontSize: 20, color: "var(--text3)", marginBottom: 8 }}>Enter all three values (numbers only, units are {unit})</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 120 }}>
          <div style={{ fontSize: 20, color: "var(--text3)", marginBottom: 3 }}>Missing side 1 ({missing1?.label})</div>
          <input ref={ref} value={m1} onChange={e => setM1(e.target.value)} inputMode="numeric" disabled={submitted}
            placeholder={"e.g. 35" + unit} style={{ width: "100%", fontSize: 20, fontFamily: "var(--mono)", padding: "8px 10px" }} />
        </div>
        <div style={{ flex: 1, minWidth: 120 }}>
          <div style={{ fontSize: 20, color: "var(--text3)", marginBottom: 3 }}>Missing side 2 ({missing2?.label})</div>
          <input value={m2} onChange={e => setM2(e.target.value)} inputMode="numeric" disabled={submitted}
            placeholder={"e.g. 58" + unit} style={{ width: "100%", fontSize: 20, fontFamily: "var(--mono)", padding: "8px 10px" }} />
        </div>
        <div style={{ flex: 1, minWidth: 120 }}>
          <div style={{ fontSize: 20, color: "var(--text3)", marginBottom: 3 }}>Perimeter</div>
          <input value={perim} onChange={e => setPerim(e.target.value)} inputMode="numeric" disabled={submitted}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            placeholder={"e.g. 180" + unit} style={{ width: "100%", fontSize: 20, fontFamily: "var(--mono)", padding: "8px 10px" }} />
        </div>
      </div>
      <button className="btn btn-primary" style={{ width: "100%" }} onClick={handleSubmit}
        disabled={submitted || !m1.trim() || !m2.trim() || !perim.trim()}>Submit All</button>
    </div>
  );
}

// Composite area: 3 inputs - missing side 1, missing side 2, area
function CompositeAreaAnswerInput({ question, onSubmit, submitted }) {
  const [m1, setM1] = useState("");
  const [m2, setM2] = useState("");
  const [area, setArea] = useState("");
  const ref = useRef(null);
  useEffect(() => { setM1(""); setM2(""); setArea(""); setTimeout(() => ref.current?.focus(), 100); }, [question?.id]);
  const handleSubmit = () => {
    if (!m1.trim() || !m2.trim() || !area.trim()) return;
    onSubmit(JSON.stringify({
      m1: parseInt(m1.replace(/[^0-9]/g, "")),
      m2: parseInt(m2.replace(/[^0-9]/g, "")),
      area: parseInt(area.replace(/[^0-9]/g, "")),
    }));
  };
  const { missingAnswers, unit } = question;
  return (
    <div>
      <div style={{ fontSize: 20, color: "var(--text3)", marginBottom: 8 }}>
        Find the two missing sides and the area (numbers only, units are {unit} and sq {unit})
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 100 }}>
          <div style={{ fontSize: 20, color: "var(--text3)", marginBottom: 3 }}>Missing side 1</div>
          <input ref={ref} value={m1} onChange={e => setM1(e.target.value)} inputMode="numeric" disabled={submitted}
            placeholder={"e.g. 25"} style={{ width: "100%", fontSize: 20, fontFamily: "var(--mono)", padding: "8px 10px" }} />
        </div>
        <div style={{ flex: 1, minWidth: 100 }}>
          <div style={{ fontSize: 20, color: "var(--text3)", marginBottom: 3 }}>Missing side 2</div>
          <input value={m2} onChange={e => setM2(e.target.value)} inputMode="numeric" disabled={submitted}
            placeholder={"e.g. 18"} style={{ width: "100%", fontSize: 20, fontFamily: "var(--mono)", padding: "8px 10px" }} />
        </div>
        <div style={{ flex: 1, minWidth: 100 }}>
          <div style={{ fontSize: 20, color: "var(--text3)", marginBottom: 3 }}>Area (sq {unit})</div>
          <input value={area} onChange={e => setArea(e.target.value)} inputMode="numeric" disabled={submitted}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            placeholder={"e.g. 900"} style={{ width: "100%", fontSize: 20, fontFamily: "var(--mono)", padding: "8px 10px" }} />
        </div>
      </div>
      <button className="btn btn-primary" style={{ width: "100%" }} onClick={handleSubmit}
        disabled={submitted || !m1.trim() || !m2.trim() || !area.trim()}>Submit All</button>
    </div>
  );
}

// Area answer input: number + unit choice buttons (for rectangle and square only)
function AreaAnswerInput({ question, onSubmit, submitted }) {
  const [value, setValue] = useState("");
  const [selectedUnit, setSelectedUnit] = useState(null);
  const ref = useRef(null);
  useEffect(() => { setValue(""); setSelectedUnit(null); setTimeout(() => ref.current?.focus(), 100); }, [question?.id]);

  let unitChoices;
  if (question.type === "rectangle-area") {
    unitChoices = question.areaYd !== null ? ["sq ft", "sq yd"] : ["sq ft"];
  } else {
    unitChoices = ["sq " + question.unit];
  }

  const handleSubmit = () => {
    if (!value.trim() || !selectedUnit) return;
    onSubmit(JSON.stringify({ value: parseInt(value.replace(/,/g, "")), unit: selectedUnit.replace(/\s+/g, "") }));
  };

  return (
    <div>
      <div style={{ fontSize: 20, color: "var(--text3)", marginBottom: 6 }}>
        {question.type === "rectangle-area" ? "Convert if needed, then enter area and choose units." : "Enter area and choose units."}
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input ref={ref} value={value} onChange={e => setValue(e.target.value.replace(/[^0-9,]/g, ""))}
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
          inputMode="numeric" placeholder="Area" disabled={submitted}
          style={{ flex: 1, fontSize: 22, fontFamily: "var(--mono)", fontWeight: 700, padding: "10px 14px" }} />
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        {unitChoices.map(u => (
          <button key={u} onClick={() => setSelectedUnit(u)} disabled={submitted}
            className={"btn btn-sm " + (selectedUnit === u ? "btn-primary" : "btn-ghost")}
            style={{ fontSize: 20, padding: "8px 16px" }}>
            {u}
          </button>
        ))}
      </div>
      <button className="btn btn-primary" style={{ width: "100%" }} onClick={handleSubmit}
        disabled={submitted || !value.trim() || !selectedUnit}>Submit</button>
    </div>
  );
}

// Plain numeric input for multiplication and division
function NumericAnswerInput({ question, onSubmit, submitted }) {
  const [value, setValue] = useState("");
  const ref = useRef(null);
  useEffect(() => { setValue(""); setTimeout(() => ref.current?.focus(), 100); }, [question?.id]);
  const handleSubmit = () => { if (value.trim()) onSubmit(value.trim()); };
  const isDivision = question.type === "long-division" || question.type === "long-division-zero";
  return (
    <div>
      {isDivision && (
        <div style={{ fontSize: 20, color: "var(--text3)", marginBottom: 6 }}>Use r for remainder, e.g. 86r1</div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <input ref={ref} value={value}
          onChange={e => setValue(isDivision ? e.target.value.replace(/[^0-9rR]/g, "") : e.target.value.replace(/[^0-9,]/g, ""))}
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
          inputMode={isDivision ? "text" : "numeric"}
          placeholder={isDivision ? "e.g. 86r1" : "Answer"} disabled={submitted}
          style={{ flex: 1, textAlign: "center", fontSize: 28, fontFamily: "var(--mono)", fontWeight: 700, padding: "12px" }} />
        <button className="btn btn-primary" style={{ fontSize: 20, padding: "12px 20px" }} onClick={handleSubmit}
          disabled={submitted || !value.trim()}>OK</button>
      </div>
    </div>
  );
}

function AnswerInput({ question, onSubmit, submitted }) {
  if (!question) return null;
  if (question.type === "warmup") return <WarmupAnswerInput question={question} onSubmit={onSubmit} submitted={submitted} />;
  if (question.type === "composite-area") return <CompositeAreaAnswerInput question={question} onSubmit={onSubmit} submitted={submitted} />;
  if (question.type === "rectangle-area" || question.type === "square-area") {
    return <AreaAnswerInput question={question} onSubmit={onSubmit} submitted={submitted} />;
  }
  return <NumericAnswerInput question={question} onSubmit={onSubmit} submitted={submitted} />;
}

// - Reveal calculation with worked solutions -
function RevealCalculation({ question }) {
  if (!question) return null;
  const q = question;

  if (q.type === "warmup") {
    return (
      <div style={{ fontSize: 20, color: "var(--text2)", marginTop: 8 }}>
        <div>Missing side 1 ({q.missing1?.label}): <strong style={{ color: "var(--green)", fontFamily: "var(--mono)" }}>{q.missing1?.length}{q.unit}</strong></div>
        <div>Missing side 2 ({q.missing2?.label}): <strong style={{ color: "var(--green)", fontFamily: "var(--mono)" }}>{q.missing2?.length}{q.unit}</strong></div>
        <div>Perimeter: <strong style={{ color: "var(--green)", fontFamily: "var(--mono)" }}>{q.perimeter}{q.unit}</strong></div>
      </div>
    );
  }
  if (q.type === "round-multiply") {
    return (
      <div style={{ fontSize: 20, color: "var(--text2)", marginTop: 8, fontFamily: "var(--mono)" }}>
        {q.a} x {q.b} = <strong style={{ color: "var(--green)" }}>{q.answer}</strong>
      </div>
    );
  }
  if (q.type === "col-multiply-1" || q.type === "col-multiply-2" || q.type === "col-multiply-3") {
    return <div style={{ marginTop: 12 }}><ColumnMultiplyWork a={q.a} b={q.b} /></div>;
  }
  if (q.type === "long-division" || q.type === "long-division-zero") {
    return <div style={{ marginTop: 12 }}><LongDivisionWork dividend={q.dividend} divisor={q.divisor} quotient={q.quotient} remainder={q.remainder} /></div>;
  }
  if (q.type === "rectangle-area") {
    const { lengthVal, lengthUnit, widthVal, widthUnit, areaFt, areaYd } = q;
    const needsConvert = lengthUnit !== widthUnit;
    return (
      <div style={{ fontSize: 20, color: "var(--text2)", marginTop: 8, fontFamily: "var(--mono)" }}>
        {needsConvert && lengthUnit === "yd" && <div>{lengthVal} yd = {lengthVal * 3} ft, so {lengthVal * 3} ft x {widthVal} ft = <strong style={{ color: "var(--green)" }}>{areaFt} sq ft</strong></div>}
        {needsConvert && widthUnit === "yd" && <div>{widthVal} yd = {widthVal * 3} ft, so {lengthVal} ft x {widthVal * 3} ft = <strong style={{ color: "var(--green)" }}>{areaFt} sq ft</strong></div>}
        {!needsConvert && <div>{lengthVal} {lengthUnit} x {widthVal} {widthUnit} = <strong style={{ color: "var(--green)" }}>{areaFt} sq ft</strong></div>}
        {areaYd !== null && <div style={{ marginTop: 4, color: "var(--text3)" }}>Or: {areaYd} sq yd</div>}
      </div>
    );
  }
  if (q.type === "composite-area") {
    return (
      <div style={{ fontSize: 20, color: "var(--text2)", marginTop: 8 }}>
        {q.missingAnswers && q.missingAnswers.map((ma, i) => (
          <div key={i}>Missing side {i + 1}: <strong style={{ color: "var(--green)", fontFamily: "var(--mono)" }}>{ma.length}{q.unit}</strong></div>
        ))}
        {q.splitExplanation && <div style={{ fontFamily: "var(--mono)", marginTop: 6 }}>{q.splitExplanation} = <strong style={{ color: "var(--green)" }}>{q.area} sq {q.unit}</strong></div>}
      </div>
    );
  }
  return null;
}


// - Timer bar -
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
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 20, color: "var(--text3)", marginBottom: 4 }}>
        <span>Time remaining</span>
        <span style={{ fontWeight: 700, color, fontSize: 20 }}>{remaining}s</span>
      </div>
      <div style={{ height: 7, background: "var(--surface2)", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ height: "100%", width: pct + "%", background: color, borderRadius: 99, transition: "width 0.5s linear" }} />
      </div>
    </div>
  );
}

// - Teacher view -
function TeacherLesson03({ session, sessionId, uid }) {
  const [answers, setAnswers] = useState([]);
  const [timerInput, setTimerInput] = useState(90);
  const [currentTopicIdx, setCurrentTopicIdx] = useState(0);
  const revealedRef = useRef(false);
  const question = session.currentQuestion;
  const participants = session.participants || {};
  const totalStudents = Object.keys(participants).length;
  const currentTopic = LESSON03_TOPICS[currentTopicIdx];

  useEffect(() => {
    if (!question?.id) return;
    setAnswers([]);
    revealedRef.current = false;
    const unsub = onClassworkAnswersChange(sessionId, question.id, setAnswers);
    return () => unsub();
  }, [question?.id]);

  const handleGenerate = async () => {
    const q = generateLesson03Question(currentTopic.id);
    const qId = "q_" + Date.now().toString(36);
    q.id = qId; q.points = POINTS;
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
      if (ans.answer !== undefined && gradeLesson03Answer(ans.answer, question)) {
        await addToScore(sessionId, ans.uid, POINTS);
      }
    }
    await updateDoc(doc(db, "sessions", sessionId), { status: "revealing" });
  };

  const handleTimerExpired = async () => {
    if (session.status === "question" && !revealedRef.current) await handleReveal();
  };

  const handleNextTopic = async () => {
    const nextIdx = Math.min(currentTopicIdx + 1, LESSON03_TOPICS.length - 1);
    setCurrentTopicIdx(nextIdx);
    const q = generateLesson03Question(LESSON03_TOPICS[nextIdx].id);
    const qId = "q_" + Date.now().toString(36);
    q.id = qId; q.points = POINTS;
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
  const correctCount = answers.filter(a => gradeLesson03Answer(a.answer, question)).length;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 20, color: "var(--text3)", marginBottom: 2 }}>Join Code</div>
            <div style={{ fontSize: 36, fontWeight: 900, fontFamily: "var(--mono)", color: "var(--blue)", letterSpacing: "0.15em" }}>{session.joinCode}</div>
            <div style={{ fontSize: 20, color: "var(--text3)" }}>{totalStudents} student{totalStudents !== 1 ? "s" : ""} joined</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <label style={{ fontSize: 20, color: "var(--text2)" }}>Seconds:</label>
              <input type="number" min={10} max={300} value={timerInput}
                onChange={e => setTimerInput(Number(e.target.value))}
                style={{ width: 70, padding: "6px 10px", fontSize: 20, textAlign: "center" }} />
            </div>
            {session.status === "question" && <button className="btn btn-ghost" onClick={handleReveal}>Reveal</button>}
            {session.status === "revealing" && (
              <>
                <button className="btn btn-ghost" onClick={handleGenerate}>Repeat Topic</button>
                {currentTopicIdx < LESSON03_TOPICS.length - 1 && (
                  <button className="btn btn-primary" onClick={handleNextTopic}>
                    Next: {LESSON03_TOPICS[currentTopicIdx + 1].label}
                  </button>
                )}
              </>
            )}
            <button className="btn btn-ghost" style={{ color: "var(--red)" }} onClick={handleEnd}>End</button>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 16, alignItems: "start" }}>
        {/* Topic sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Topic</div>
          {LESSON03_TOPICS.map((t, i) => {
            const isActive = i === currentTopicIdx;
            const isDone = i < currentTopicIdx;
            return (
              <button key={t.id} onClick={() => setCurrentTopicIdx(i)}
                style={{ background: isActive ? "rgba(59,130,246,0.15)" : "var(--surface)", border: "2px solid " + (isActive ? "var(--blue)" : isDone ? "rgba(16,185,129,0.3)" : "var(--border)"), borderRadius: "var(--radius)", padding: "8px 12px", cursor: "pointer", textAlign: "left", fontFamily: "var(--font)" }}>
                <div style={{ fontWeight: 700, fontSize: 20, color: isActive ? "var(--blue)" : isDone ? "var(--green)" : "var(--text)" }}>
                  {isDone ? "done " : isActive ? "now " : (i + 1) + ". "}{t.label}
                </div>
                <div style={{ fontSize: 20, color: "var(--text3)", marginTop: 2 }}>{t.description}</div>
              </button>
            );
          })}
          <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={handleGenerate} disabled={session.status === "question"}>
            Generate Question
          </button>
        </div>

        {/* Main panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {session.status === "waiting" && (
            <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
              <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Waiting for students</h3>
              <p style={{ color: "var(--blue)", fontFamily: "var(--mono)", fontSize: 24, fontWeight: 900 }}>{session.joinCode}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 12 }}>
                {Object.values(participants).map(p => (
                  <div key={p.name} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "5px 12px", fontSize: 20, fontWeight: 600 }}>{p.name}</div>
                ))}
              </div>
            </div>
          )}

          {question && (session.status === "question" || session.status === "revealing") && (
            <>
              <div className="card">
                <div style={{ fontSize: 20, color: "var(--text3)", marginBottom: 8 }}>
                  {currentTopic.label} - {submittedCount}/{totalStudents} submitted - {correctCount} correct
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", marginBottom: 12 }}>{question.prompt}</div>
                <QuestionDisplay question={question} revealCorrect={session.status === "revealing"} />
                {session.status === "question" && session.timerEndsAt && (
                  <div style={{ marginTop: 12 }}>
                    <TimerBar endsAt={session.timerEndsAt} totalSeconds={session.timerSeconds} onExpired={handleTimerExpired} />
                  </div>
                )}
                {session.status === "revealing" && (
                  <div style={{ marginTop: 12, background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "var(--radius-sm)", padding: "12px 16px" }}>
                    <div style={{ fontSize: 20, color: "var(--text3)", marginBottom: 6 }}>Correct answer</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "var(--green)", fontFamily: "var(--mono)", marginBottom: 6 }}>
                      {question.displayAnswer}
                    </div>
                    <RevealCalculation question={question} />
                  </div>
                )}
                <div style={{ height: 6, background: "var(--surface2)", borderRadius: 99, overflow: "hidden", marginTop: 12 }}>
                  <div style={{ height: "100%", width: (totalStudents > 0 ? (submittedCount / totalStudents) * 100 : 0) + "%", background: "var(--blue)", borderRadius: 99, transition: "width 0.3s" }} />
                </div>
              </div>

              <div className="card">
                <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }}>Student Answers</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 280, overflowY: "auto" }}>
                  {Object.entries(participants).map(([pUid, p]) => {
                    const ans = answers.find(a => a.uid === pUid);
                    const has = ans?.answer !== undefined && ans?.answer !== null && ans?.answer !== "";
                    const correct = has && gradeLesson03Answer(ans.answer, question);
                    return (
                      <div key={pUid} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "7px 12px", border: "1px solid " + (has ? (correct ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)") : "var(--border)") }}>
                        <span style={{ fontWeight: 600, fontSize: 20 }}>{p.name}</span>
                        {has ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            {session.status === "revealing" && <span style={{ fontFamily: "var(--mono)", fontSize: 20, color: "var(--text2)" }}>{ans.answer}</span>}
                            <span style={{ fontWeight: 700, color: correct ? "var(--green)" : "var(--red)" }}>{correct ? "+" + POINTS : "X"}</span>
                          </div>
                        ) : <span style={{ fontSize: 20, color: "var(--text3)" }}>thinking...</span>}
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

// - Student view -
function StudentLesson03({ session, sessionId, uid }) {
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
    const correct = gradeLesson03Answer(ans, question);
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
      <p style={{ color: "var(--text2)" }}>Lesson 3 - Multiplication, Division, and Area</p>
    </div>
  );

  if (session.status === "ended") return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Session ended</h2>
      <p style={{ color: "var(--text2)" }}>Final score: <strong>{myScore} pts</strong></p>
    </div>
  );

  return (
    <div style={{ maxWidth: 560, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "5px 12px", fontSize: 20, fontWeight: 700 }}>
          Score: {myScore} pts
        </div>
      </div>
      <div className="card" key={question?.id}>
        {session.status === "question" && session.timerEndsAt && !submitted && (
          <TimerBar endsAt={session.timerEndsAt} totalSeconds={session.timerSeconds} />
        )}
        {question && (
          <>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 12, color: "var(--text)" }}>{question.prompt}</div>
            <QuestionDisplay question={question} revealCorrect={session.status === "revealing"} />
          </>
        )}
        {session.status === "revealing" ? (
          <div style={{ textAlign: "center", marginTop: 12 }}>
            {result ? (
              <>
                <div style={{ fontSize: 20, fontWeight: 800, color: result.correct ? "var(--green)" : "var(--red)", marginBottom: 6 }}>
                  {result.correct ? "Correct! +" + POINTS + " pts" : "Incorrect"}
                </div>
                {!result.correct && question?.displayAnswer && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ color: "var(--green)", fontSize: 20, marginBottom: 4 }}>
                      Correct: <strong style={{ fontFamily: "var(--mono)" }}>{question.displayAnswer}</strong>
                    </div>
                    <RevealCalculation question={question} />
                  </div>
                )}
              </>
            ) : (
              <div>
                <div style={{ color: "var(--text3)", marginBottom: 4 }}>No answer submitted.</div>
                {question?.displayAnswer && (
                  <>
                    <div style={{ color: "var(--green)", fontSize: 20, marginBottom: 6 }}>
                      Correct: <strong style={{ fontFamily: "var(--mono)" }}>{question.displayAnswer}</strong>
                    </div>
                    <RevealCalculation question={question} />
                  </>
                )}
              </div>
            )}
          </div>
        ) : submitted ? (
          <div style={{ textAlign: "center", marginTop: 12 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--green)", marginBottom: 4 }}>Submitted!</div>
            <div style={{ fontSize: 20, color: "var(--text3)" }}>Waiting for teacher to reveal...</div>
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

// - Session creator -
function CreateLesson03Session({ user, onCreated }) {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [timer, setTimer] = useState(90);
  const [loading, setLoading] = useState(false);
  useEffect(() => { getTeacherClasses(user.id).then(setClasses); }, []);
  const handleCreate = async () => {
    setLoading(true);
    try {
      const { sessionId } = await createClassworkSession(user.id, selectedClass, timer);
      await updateDoc(doc(db, "sessions", sessionId), { type: "lesson03" });
      onCreated(sessionId);
    } catch (e) { console.error(e); }
    setLoading(false);
  };
  return (
    <div style={{ maxWidth: 480, margin: "0 auto" }}>
      <div className="card">
        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Lesson 3 - Multiplication, Division and Area</h2>
        <p style={{ color: "var(--text2)", fontSize: 20, marginBottom: 16 }}>Round number multiplication, column multiplication, long division, and area of rectangles, squares, and composite shapes.</p>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 20, fontWeight: 600, color: "var(--text2)", display: "block", marginBottom: 5 }}>Class</label>
          <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} style={{ width: "100%", padding: "10px 12px", fontSize: 20 }}>
            <option value="">Select a class...</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 20, fontWeight: 600, color: "var(--text2)", display: "block", marginBottom: 5 }}>Default seconds per question</label>
          <input type="number" min={30} max={300} value={timer} onChange={e => setTimer(Number(e.target.value))} style={{ width: "100%", padding: "10px 12px", fontSize: 20 }} />
        </div>
        <button className="btn btn-primary btn-lg" style={{ width: "100%" }} onClick={handleCreate} disabled={loading || !selectedClass}>
          {loading ? "Creating..." : "Start Session"}
        </button>
      </div>
    </div>
  );
}

// - Main export -
export default function Lesson03Session({ user, onHome }) {
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
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,var(--blue),var(--cyan))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "#fff" }}>L3</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 20 }}>GCA</div>
              <div style={{ color: "var(--text3)", fontSize: 20 }}>Lesson 3 - Multiplication, Division and Area</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onHome}>Back to Home</button>
        </div>
        {view === "create" && <CreateLesson03Session user={user} onCreated={(sid) => { setSessionId(sid); setView("session"); }} />}
        {view === "session" && session && (
          user.role === "teacher"
            ? <TeacherLesson03 session={session} sessionId={sessionId} uid={user.id} />
            : <StudentLesson03 session={session} sessionId={sessionId} uid={user.id} />
        )}
        {view === "session" && !session && (
          <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><div className="spinner" /></div>
        )}
      </div>
    </div>
  );
}

export { TeacherLesson03 as Lesson03TeacherView, StudentLesson03 as Lesson03StudentView };
