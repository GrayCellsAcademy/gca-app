// Lesson 2  Geometry Question Generators

const UNITS = ["cm", "mm", "m", "km", "in", "ft", "yd", "mi"];

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randUnit() {
  return UNITS[Math.floor(Math.random() * UNITS.length)];
}
function normalizeAnswer(str) {
  return str.toLowerCase().replace(/\s+/g, "").trim();
}

//  Topic 1: Line Segments 
// 3 connected segments with bend angles
export function genLineSegments() {
  const unit = randUnit();
  const a = randInt(10, 99);
  const b = randInt(10, 99);
  const c = randInt(10, 99);
  const total = a + b + c;
  // Bend angles in degrees, random but visible
  const angle1 = randInt(-40, 40);
  const angle2 = randInt(-40, 40);
  return {
    type: "line-segments",
    segments: [a, b, c],
    unit,
    angles: [angle1, angle2], // bend angles at joints
    answer: total + unit,
    displayAnswer: `${total} ${unit}`,
    prompt: `Find the total length.`,
  };
}

export function gradeLineSegments(input, question) {
  const n = normalizeAnswer(input);
  const correct = normalizeAnswer(question.answer);
  return n === correct || n === normalizeAnswer(question.displayAnswer);
}

//  Topic 2: Perimeter of Polygons 
// Irregular polygon, 3-6 sides, convex
export function genPolygon() {
  const unit = randUnit();
  const sides = randInt(3, 6);
  const lengths = Array.from({ length: sides }, () => randInt(10, 99));
  const perimeter = lengths.reduce((s, n) => s + n, 0);
  // Generate convex polygon vertices
  const vertices = generateConvexPolygon(sides);
  return {
    type: "polygon",
    sides,
    lengths,
    unit,
    vertices,
    answer: perimeter + unit,
    displayAnswer: `${perimeter} ${unit}`,
    prompt: `Find the perimeter of this polygon.`,
  };
}

function generateConvexPolygon(n) {
  // Generate n points on a circle with random radii variation
  const cx = 150, cy = 150, r = 100;
  const angles = Array.from({ length: n }, (_, i) => (2 * Math.PI * i) / n + Math.random() * 0.4);
  angles.sort((a, b) => a - b);
  return angles.map(a => ({
    x: cx + r * (0.7 + Math.random() * 0.3) * Math.cos(a),
    y: cy + r * (0.7 + Math.random() * 0.3) * Math.sin(a),
  }));
}

export function gradePolygon(input, question) {
  const n = normalizeAnswer(input);
  return n === normalizeAnswer(question.answer) || n === normalizeAnswer(question.displayAnswer);
}

//  Topic 3B: Rectangle Perimeter 
export function genRectanglePerimeter() {
  const unit = randUnit();
  const w = randInt(10, 99);
  const h = randInt(10, 99);
  const perimeter = 2 * (w + h);
  return {
    type: "rectangle-perimeter",
    w, h, unit,
    answer: perimeter + unit,
    displayAnswer: `${perimeter} ${unit}`,
    prompt: `Find the perimeter of this rectangle.`,
  };
}

export function gradeRectangle(input, question) {
  const n = normalizeAnswer(input);
  return n === normalizeAnswer(question.answer) || n === normalizeAnswer(question.displayAnswer);
}

//  Topic 4: Square Perimeter 
export function genSquarePerimeter() {
  const unit = randUnit();
  const s = randInt(10, 99);
  const perimeter = 4 * s;
  return {
    type: "square-perimeter",
    s, unit,
    answer: perimeter + unit,
    displayAnswer: `${perimeter} ${unit}`,
    prompt: `Find the perimeter of this square.`,
  };
}

export function gradeSquare(input, question) {
  const n = normalizeAnswer(input);
  return n === normalizeAnswer(question.answer) || n === normalizeAnswer(question.displayAnswer);
}

//  Topic 5: Composite Rectilinear Shapes 
// L, T, U shapes

function genLShape(unit) {
  const W = randInt(55, 90);
  const H = randInt(55, 90);
  const cw = randInt(20, W - 25);
  const ch = randInt(20, H - 25);
  const sides = [
    { length: W,    label: "bottom",     dir: "h" },
    { length: H-ch, label: "right",      dir: "v" },
    { length: cw,   label: "top-right",  dir: "h" },
    { length: ch,   label: "inner-vert", dir: "v" },
    { length: W-cw, label: "top-left",   dir: "h" },
    { length: H,    label: "left",       dir: "v" },
  ];
  const perimeter = sides.reduce((s, x) => s + x.length, 0);
  // L shape: randomly hide either the short sides OR the long sides
  // Short option: hide top-right(2,h) and inner-vert(3,v) - short derivable sides
  // Long option: hide bottom(0,h) and left(5,v) - long sides derivable as sum of opposites
  const hideShort = Math.random() < 0.5;
  const hideIndices = hideShort ? [2, 3] : [0, 5];
  const hideIdx = hideIndices[0];
  const scale = 2;
  const vertices = [
    { x: 0,            y: H*scale },
    { x: W*scale,      y: H*scale },
    { x: W*scale,      y: ch*scale },
    { x: (W-cw)*scale, y: ch*scale },
    { x: (W-cw)*scale, y: 0 },
    { x: 0,            y: 0 },
  ];
  return { shape: "L", W, H, cw, ch, sides, perimeter, hideIdx, hideIndices, vertices, unit };
}

function genTShape(unit) {
  // T shape: wide base with a narrower stem rising from the top center
  // Base: W wide, bh tall. Stem: tw wide, sh tall, centered on base
  const W = randInt(60, 90);
  const bh = randInt(20, 35); // base height
  const sh = randInt(25, 45); // stem height
  const tw = randInt(20, Math.max(21, W - 30)); // stem width
  const stemLeft = randInt(12, Math.max(13, W - tw - 12)); // stem left offset
  const H = bh + sh; // total height
  // Vertices clockwise from bottom-left:
  // bottom-left -> bottom-right -> right-base-top -> stem-right-base -> stem-right-top
  // -> stem-left-top -> stem-left-base -> left-base-top -> back to start
  const scale = 2;
  const vertices = [
    { x: 0,                   y: H*scale },          // bottom-left
    { x: W*scale,             y: H*scale },          // bottom-right
    { x: W*scale,             y: sh*scale },         // right shoulder
    { x: (stemLeft+tw)*scale, y: sh*scale },         // stem-right bottom
    { x: (stemLeft+tw)*scale, y: 0 },               // stem-right top
    { x: stemLeft*scale,      y: 0 },               // stem-left top
    { x: stemLeft*scale,      y: sh*scale },         // stem-left bottom
    { x: 0,                   y: sh*scale },         // left shoulder
  ];
  // Sides clockwise: bottom(W), right(H-sh=bh... wait
  // Going around: bottom, right-outer(bh... 
  // Let me think carefully about the sides
  const rightOuter = H - sh; // = bh
  const leftOuter = H - sh;  // = bh
  const sides = [
    { length: W,              dir: "h", label: "bottom" },
    { length: bh,             dir: "v", label: "right-outer" },
    { length: W-stemLeft-tw,  dir: "h", label: "right-shoulder" },
    { length: sh,             dir: "v", label: "stem-right" },
    { length: tw,             dir: "h", label: "stem-top" },
    { length: sh,             dir: "v", label: "stem-left" },
    { length: stemLeft,       dir: "h", label: "left-shoulder" },
    { length: bh,             dir: "v", label: "left-outer" },
  ];
  const perimeter = sides.reduce((s, x) => s + x.length, 0);
  // T shape: hide left-shoulder (idx 6) and right-shoulder (idx 2) - both derivable
  // T shape: randomly hide short or long sides
  // Short: hide right-shoulder(2,h) and stem-right(3,v)
  // Long: hide bottom(0,h) and right-outer(1,v) - bottom = sum of 3 h-sides, right-outer = left-outer
  const hideShort = Math.random() < 0.5;
  const hideIndices = hideShort ? [2, 3] : [0, 1];
  const hideIdx = hideIndices[0];
  return { shape: "T", W, H, bh, sh, tw, stemLeft, sides, perimeter, hideIdx, hideIndices, vertices, unit };
}

function genUShape(unit) {
  const W = randInt(60, 90);
  const H = randInt(60, 90);
  const lw = randInt(15, 22); // left arm width
  const rw = randInt(15, 22); // right arm width
  const ch = randInt(25, H - 20); // cutout height
  const sides = [
    { length: W,         label: "bottom",      dir: "h" },
    { length: H,         label: "right",       dir: "v" },
    { length: rw,        label: "top-right",   dir: "h" },
    { length: ch,        label: "inner-right", dir: "v" },
    { length: W-lw-rw,   label: "inner-top",   dir: "h" },
    { length: ch,        label: "inner-left",  dir: "v" },
    { length: lw,        label: "top-left",    dir: "h" },
    { length: H,         label: "left",        dir: "v" },
  ];
  const perimeter = sides.reduce((s, x) => s + x.length, 0);
  // U shape: randomly hide short or long sides
  // Short: hide inner-right(3,v) and inner-top(4,h)
  // Long: hide bottom(0,h) and right(1,v) - derivable as sum of opposites
  const hideShort = Math.random() < 0.5;
  const hideIndices = hideShort ? [3, 4] : [0, 1];
  const hideIdx = hideIndices[0];
  const scale = 2;
  const vertices = [
    { x: 0,           y: H*scale },
    { x: W*scale,     y: H*scale },
    { x: W*scale,     y: 0 },
    { x: (W-rw)*scale, y: 0 },
    { x: (W-rw)*scale, y: ch*scale },
    { x: lw*scale,    y: ch*scale },
    { x: lw*scale,    y: 0 },
    { x: 0,           y: 0 },
  ];
  return { shape: "U", W, H, lw, rw, ch, sides, perimeter, hideIdx, hideIndices, vertices, unit };
}

export function genRectilinearShape(activityType) {
  const unit = randUnit();
  // Equal probability L/T/U, random rotation for all
  const shapeIdx = randInt(0, 2);
  const shapeType = ["L", "T", "U"][shapeIdx];
  const shouldRotate = Math.random() < 0.5; // rotate any shape 90deg
  let shapeData;
  if (shapeType === "L") shapeData = genLShape(unit);
  else if (shapeType === "T") shapeData = genTShape(unit);
  else shapeData = genUShape(unit);
  if (shouldRotate) {
    // Rotate 90 degrees: swap x/y in vertices, swap h/v in sides
    shapeData = {
      ...shapeData,
      vertices: shapeData.vertices.map(v => ({ x: v.y, y: v.x })),
      sides: shapeData.sides.map(s => ({ ...s, dir: s.dir === "h" ? "v" : "h" })),
    };
  }

  const { sides, perimeter, hideIdx } = shapeData;
  const missingLen = sides[hideIdx].length;

  if (activityType === "5A") {
    // For L/T/U shapes, a key property is:
    // One long horizontal side = sum of shorter horizontal sides opposite it
    // One long vertical side = sum of shorter vertical sides opposite it
    // Find a horizontal side and the horizontal sides on the opposite face that sum to it
    const { sides } = shapeData;
    // Find the longest horizontal side
    const hSides = sides.map((s, i) => ({ ...s, i })).filter(s => s.dir === "h");
    const vSides = sides.map((s, i) => ({ ...s, i })).filter(s => s.dir === "v");
    // Find the longest side in each direction and randomly pick one
    hSides.sort((a, b) => b.length - a.length);
    vSides.sort((a, b) => b.length - a.length);
    // Pick direction based on which has a valid sum relationship
    // The longest side in a direction should equal sum of others in same direction
    const hValid = hSides.length > 1 && hSides[0].length === hSides.slice(1).reduce((s, x) => s + x.length, 0);
    const vValid = vSides.length > 1 && vSides[0].length === vSides.slice(1).reduce((s, x) => s + x.length, 0);
    const useHorizontal = hValid && (!vValid || Math.random() < 0.5);
    const candSides = useHorizontal ? hSides : vSides;
    if (candSides.length < 2) {
      // Fallback - just use horizontal
      hSides.sort((a, b) => b.length - a.length);
    }
    const highlightSide = candSides[0];
    const sumSides = candSides.slice(1);
    const correctIndices = sumSides.map(s => s.i);
    return {
      type: "rectilinear-5A",
      ...shapeData,
      highlightSideIdx: highlightSide.i,
      correctSideIndices: correctIndices,
      prompt: "Click all shorter sides on the opposite side that sum to the highlighted (orange) side.",
      activityType: "5A",
    };
  } else if (activityType === "5B") {
    // Two missing sides - student clicks each and enters length
    const hideIndices = shapeData.hideIndices || [shapeData.hideIdx];
    const missingAnswers = hideIndices.map(i => ({ idx: i, length: sides[i].length, dir: sides[i].dir }));
    return {
      type: "rectilinear-5B",
      ...shapeData,
      hideIndices,
      missingAnswers,
      prompt: "Click each missing side and enter its length.",
      activityType: "5B",
    };
  } else {
    // 5C: two sides missing, student enters perimeter
    const hideIndices = shapeData.hideIndices || [shapeData.hideIdx];
    return {
      type: "rectilinear-5C",
      ...shapeData,
      hideIndices,
      answer: perimeter + unit,
      displayAnswer: `${perimeter} ${unit}`,
      prompt: "Find the perimeter of this shape.",
      activityType: "5C",
    };
  }
}

export function gradeRectilinear(input, question) {
  const n = normalizeAnswer(input);
  return n === normalizeAnswer(question.answer) || n === normalizeAnswer(question.displayAnswer);
}

export function gradeLesson02Answer(input, question) {
  switch (question.type) {
    case "line-segments": return gradeLineSegments(input, question);
    case "polygon": return gradePolygon(input, question);
    case "rectangle-perimeter": return gradeRectangle(input, question);
    case "square-perimeter": return gradeSquare(input, question);
      // input is comma-separated selected side indices, correct = 0,1,2,3 (all four sides)
      const sel = input.split(",").map(Number).filter(n => !isNaN(n)).sort().join(",");
      return sel === "0,1,2,3";
    }
    case "rectilinear-5A": {
      // input is comma-separated selected side indices
      const selected = input.split(",").map(Number).filter(n => !isNaN(n)).sort().join(",");
      const correct = (question.correctSideIndices || []).slice().sort().join(",");
      return selected === correct;
    }
    case "rectilinear-5B": {
      try {
        const answers = JSON.parse(input);
        return question.missingAnswers.every(ma => {
          const given = answers.find(a => a.idx === ma.idx);
          if (!given) return false;
          // Accept just the number or number+unit
          const givenNum = parseInt(String(given.value).replace(/[^0-9]/g, ""));
          return givenNum === ma.length;
        });
      } catch {
        return false;
      }
    }
    case "rectilinear-5C": return gradeRectilinear(input, question);
    default: return false;
  }
}

export const LESSON02_TOPICS = [
  { id: "1", label: "Line Segments", description: "Segment addition  find total length" },
  { id: "2", label: "Perimeter of Polygons", description: "Irregular polygon, 3-6 sides" },
  { id: "3B", label: "Rectangles  Perimeter", description: "Find perimeter given two sides" },
  { id: "4", label: "Squares  Perimeter", description: "Find perimeter given one side" },
  { id: "5A", label: "Composite Shapes  Summing Sides", description: "Click sides that sum to highlighted side" },
  { id: "5B", label: "Composite Shapes  Missing Side", description: "Find the missing side length" },
  { id: "5C", label: "Composite Shapes  Perimeter", description: "Find perimeter with one missing side" },
];

export function generateLesson02Question(topicId) {
  switch (topicId) {
    case "1":  return genLineSegments();
    case "2":  return genPolygon();
    case "3B": return genRectanglePerimeter();
    case "4":  return genSquarePerimeter();
    case "5A": return genRectilinearShape("5A");
    case "5B": return genRectilinearShape("5B");
    case "5C": return genRectilinearShape("5C");
    default:   return genLineSegments();
  }
}
