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

//  Topic 3A: Rectangle Equal Sides 
// Student identifies which sides are equal (click-based, handled in component)
export function genRectangleEqualSides() {
  const unit = randUnit();
  const w = randInt(10, 99);
  const h = randInt(10, 99);
  // Rectangle sides: top=w, right=h, bottom=w, left=h
  return {
    type: "rectangle-equal-sides",
    w, h, unit,
    answer: "pairs",
    prompt: `Click the two pairs of equal sides in this rectangle.`,
    // Correct pairs: [top,bottom] and [left,right]
    pairs: [[0, 2], [1, 3]], // indices: 0=top,1=right,2=bottom,3=left
  };
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
  // L shape: big rect minus corner
  // Outer: W x H, cutout: cw x ch from top-right
  const W = randInt(55, 90);
  const H = randInt(55, 90);
  const cw = randInt(20, W - 25);
  const ch = randInt(20, H - 25);
  // Sides: going clockwise from bottom-left
  // bottom=W, right-short=H-ch, top-right=cw, inner-vert=ch, top-left=W-cw, left=H
  const sides = [
    { length: W,    label: "bottom",     dir: "h" },
    { length: H-ch, label: "right",      dir: "v" },
    { length: cw,   label: "top-right",  dir: "h" },
    { length: ch,   label: "inner-vert", dir: "v" },
    { length: W-cw, label: "top-left",   dir: "h" },
    { length: H,    label: "left",       dir: "v" },
  ];
  const perimeter = sides.reduce((s, x) => s + x.length, 0);
  // Pick one side to hide
  const hideIdx = Math.floor(Math.random() * sides.length);
  // Vertices for SVG (scaled)
  const scale = 2;
  const vertices = [
    { x: 0,      y: H*scale },     // bottom-left
    { x: W*scale,y: H*scale },     // bottom-right
    { x: W*scale,y: ch*scale },    // right notch bottom
    { x: (W-cw)*scale, y: ch*scale }, // inner corner
    { x: (W-cw)*scale, y: 0 },    // top-left of notch
    { x: 0,      y: 0 },           // top-left
  ];
  return { shape: "L", W, H, cw, ch, sides, perimeter, hideIdx, vertices, unit };
}

function genTShape(unit) {
  const W = randInt(60, 90);
  const H = randInt(50, 80);
  const tw = randInt(20, W - 35); // stem width
  const th = randInt(20, H - 20); // stem height
  const stemLeft = randInt(15, W - tw - 15);
  // sides: bottom-left, bottom-stem-left, stem-left, stem-right, bottom-stem-right, bottom-right, top-right, top-left
  const sides = [
    { length: stemLeft,    label: "bottom-left",       dir: "h" },
    { length: th,          label: "stem-left-vert",    dir: "v" },
    { length: tw,          label: "stem-bottom",       dir: "h" },
    { length: th,          label: "stem-right-vert",   dir: "v" },
    { length: W-stemLeft-tw, label: "bottom-right",   dir: "h" },
    { length: H,           label: "right",             dir: "v" },
    { length: W,           label: "top",               dir: "h" },
    { length: H,           label: "left",              dir: "v" },
  ];
  const perimeter = sides.reduce((s, x) => s + x.length, 0);
  const hideIdx = Math.floor(Math.random() * sides.length);
  const scale = 2;
  const vertices = [
    { x: 0,                      y: H*scale },
    { x: stemLeft*scale,         y: H*scale },
    { x: stemLeft*scale,         y: (H-th)*scale },
    { x: (stemLeft+tw)*scale,    y: (H-th)*scale },
    { x: (stemLeft+tw)*scale,    y: H*scale },
    { x: W*scale,                y: H*scale },
    { x: W*scale,                y: 0 },
    { x: 0,                      y: 0 },
  ];
  return { shape: "T", W, H, tw, th, stemLeft, sides, perimeter, hideIdx, vertices, unit };
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
  const hideIdx = Math.floor(Math.random() * sides.length);
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
  return { shape: "U", W, H, lw, rw, ch, sides, perimeter, hideIdx, vertices, unit };
}

export function genRectilinearShape(activityType) {
  const unit = randUnit();
  const shapeType = ["L", "T", "U"][randInt(0, 2)];
  const rotateU = shapeType === "U" && Math.random() < 0.5; // sometimes rotate U 90deg
  let shapeData;
  if (shapeType === "L") shapeData = genLShape(unit);
  else if (shapeType === "T") shapeData = genTShape(unit);
  else {
    shapeData = genUShape(unit);
    if (rotateU) {
      // Rotate 90 degrees: swap x/y in vertices, swap h/v in sides
      shapeData = {
        ...shapeData,
        vertices: shapeData.vertices.map(v => ({ x: v.y, y: v.x })),
        sides: shapeData.sides.map(s => ({ ...s, dir: s.dir === "h" ? "v" : "h" })),
      };
    }
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
    // Randomly pick horizontal or vertical
    const useHorizontal = Math.random() < 0.5;
    const candSides = useHorizontal ? hSides : vSides;
    const otherSides = useHorizontal ? hSides : vSides;
    candSides.sort((a, b) => b.length - a.length);
    const highlightSide = candSides[0]; // longest side in chosen direction
    const sumSides = candSides.slice(1); // remaining sides that sum to it
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
    return {
      type: "rectilinear-5B",
      ...shapeData,
      answer: missingLen + unit,
      displayAnswer: `${missingLen} ${unit}`,
      prompt: "Find the missing side length.",
      activityType: "5B",
    };
  } else {
    return {
      type: "rectilinear-5C",
      ...shapeData,
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
    case "rectilinear-5A": {
      // input is comma-separated selected side indices
      const selected = input.split(",").map(Number).filter(n => !isNaN(n)).sort().join(",");
      const correct = (question.correctSideIndices || []).slice().sort().join(",");
      return selected === correct;
    }
    case "rectilinear-5B":
    case "rectilinear-5C": return gradeRectilinear(input, question);
    default: return false;
  }
}

export const LESSON02_TOPICS = [
  { id: "1", label: "Line Segments", description: "Segment addition  find total length" },
  { id: "2", label: "Perimeter of Polygons", description: "Irregular polygon, 3-6 sides" },
  { id: "3A", label: "Rectangles  Equal Sides", description: "Click the two pairs of equal sides" },
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
    case "3A": return genRectangleEqualSides();
    case "3B": return genRectanglePerimeter();
    case "4":  return genSquarePerimeter();
    case "5A": return genRectilinearShape("5A");
    case "5B": return genRectilinearShape("5B");
    case "5C": return genRectilinearShape("5C");
    default:   return genLineSegments();
  }
}
