// Lesson 11 - Inequalities

function randInt(min, max) { return Math.floor(Math.random()*(max-min+1))+min; }
function randChoice(arr) { return arr[Math.floor(Math.random()*arr.length)]; }
function shuffle(arr) { const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }

// Normalize inequality answer: "x > 3", "x>3", "x >3" - {sym, val}
function parseIneq(str) {
  const s = String(str).trim().toLowerCase()
    .replace(/\u2212/g,"-").replace(/\u2264/g,"<=").replace(/\u2265/g,">=")
    .replace(/\s+/g,"");
  const m = s.match(/^x([<>]=?)(-?\d+)$|^(-?\d+)([<>]=?)x$/);
  if (!m) return null;
  if (m[1]) return { sym: m[1], val: parseInt(m[2]) };
  // reversed: 3 > x - x < 3
  const flip = {"<":">",">":"<","<=":">=",">=":"<="};
  return { sym: flip[m[4]]||m[4], val: parseInt(m[3]) };
}

function ineqEqual(a, b) {
  if (!a || !b) return false;
  return a.sym === b.sym && a.val === b.val;
}

// - Warm-up A: Two-step equation -
export function genWarmupA() {
  for (let i=0;i<200;i++) {
    const a=randInt(2,9), b=randInt(-20,20);
    const x=randInt(-9,9); if(x===0) continue;
    const c=a*x+b;
    if(Math.abs(c)>50) continue;
    const bStr=b>=0?`+ ${b}`:`- ${Math.abs(b)}`;
    const latex=`${a}x ${bStr} = ${c}`;
    return { type:"warmup-a", latex, solution:x, answer:String(x), displayAnswer:`x = ${x}` };
  }
  return { type:"warmup-a", latex:"3x + 7 = 22", solution:5, answer:"5", displayAnswer:"x = 5" };
}
export function gradeWarmupA(input,q){ return parseInt(String(input).replace(/\s/g,""),10)===q.solution; }

// - Warm-up B: Variables on both sides -
export function genWarmupB() {
  for (let i=0;i<300;i++) {
    const a=randInt(2,9), c=randInt(2,9); if(a===c) continue;
    const b=randInt(-15,15), x=randInt(-9,9); if(x===0) continue;
    const d=a*x+b-c*x;
    if(Math.abs(d)>30||!Number.isInteger(d)) continue;
    const aStr=`${a}x`, bStr=b>=0?`+ ${b}`:`- ${Math.abs(b)}`;
    const cStr=`${c}x`, dStr=d>=0?`+ ${d}`:`- ${Math.abs(d)}`;
    return { type:"warmup-b", latex:`${aStr} ${bStr} = ${cStr} ${dStr}`, solution:x, answer:String(x), displayAnswer:`x = ${x}` };
  }
  return { type:"warmup-b", latex:"5x - 3 = 2x + 9", solution:4, answer:"4", displayAnswer:"x = 4" };
}
export function gradeWarmupB(input,q){ return parseInt(String(input).replace(/\s/g,""),10)===q.solution; }

// - Warm-up C: Square root equation -
export function genWarmupC() {
  const roots=[1,2,3,4,5,6,7,8,9,10];
  const root=randChoice(roots);
  return { type:"warmup-c", latex:`\\sqrt{x} = ${root}`, solution:root*root, answer:String(root*root), displayAnswer:`x = ${root*root}` };
}
export function gradeWarmupC(input,q){ return parseInt(String(input).replace(/\s/g,""),10)===q.solution; }

// - Topic 1: Is it a Solution? -
// Fixed 6 statements, shuffled
export function genIsSolution() {
  const statements = shuffle([
    { latex:"x > 5,\\ x = 6",   answer:true,  display:"x > 5, x = 6"  },
    { latex:"x > 5,\\ x = 5",   answer:false, display:"x > 5, x = 5"  },
    { latex:"x \\geq 5,\\ x = 5", answer:true, display:"x - 5, x = 5" },
    { latex:"x < -2,\\ x = -3", answer:true,  display:"x < -2, x = -3" },
    { latex:"x \\leq -2,\\ x = -2", answer:true, display:"x - -2, x = -2" },
    { latex:"x \\leq -2,\\ x = -1", answer:false, display:"x - -2, x = -1" },
  ]);
  return { type:"is-solution", statements, prompt:"For each, is the given value a solution?" };
}
export function gradeIsSolution(answers, q) {
  // answers: array of booleans, one per statement
  try {
    const ans = typeof answers==="string" ? JSON.parse(answers) : answers;
    return q.statements.every((s,i) => Boolean(ans[i]) === s.answer);
  } catch { return false; }
}
export function gradeIsSolutionItem(answer, idx, q) {
  return Boolean(answer) === q.statements[idx].answer;
}

// - Topic 1 Activity 2: Multiple choice solution sets -
export function genSolutionSet() {
  const syms=["<",">","<=",">="];
  const sym=randChoice(syms);
  const boundary=randInt(-8,8);
  // Generate 3 numbers: one clearly in set, one clearly not, one on boundary
  let inside, outside, boundary2;
  if(sym===">"||sym===">=") {
    inside=boundary+randInt(2,5);
    outside=boundary-randInt(2,5);
    boundary2=boundary;
  } else {
    inside=boundary-randInt(2,5);
    outside=boundary+randInt(2,5);
    boundary2=boundary;
  }
  const symDisplay={"<":"<",">":">","<=":"-",">=":"-"}[sym];
  const symLatex={"<":"<",">":">","<=":"\\leq",">=":"\\geq"}[sym];
  const options=shuffle([inside,outside,boundary2]);
  const solutions=options.filter(n=>{
    if(sym==="<") return n<boundary;
    if(sym===">") return n>boundary;
    if(sym==="<=") return n<=boundary;
    return n>=boundary;
  });
  return {
    type:"solution-set", sym, symDisplay, symLatex, boundary,
    latex:`x ${symLatex} ${boundary}`,
    options, solutions,
    answer:JSON.stringify(solutions),
    displayAnswer:`Solutions: ${solutions.join(", ")}`,
    prompt:"Select all numbers that are in the solution set.",
  };
}
export function gradeSolutionSet(input, q) {
  try {
    const ans=JSON.parse(input);
    const correct=new Set(q.solutions.map(String));
    const given=new Set(ans.map(String));
    if(correct.size!==given.size) return false;
    return [...correct].every(v=>given.has(v));
  } catch { return false; }
}

// - Topic 2: Match inequality to number line -
// Three distractors: correct, wrong circle type, wrong direction
export function genNumberLineMatch() {
  const syms=["<",">","<=",">="];
  const sym=randChoice(syms);
  const vals=[-3,-2,-1,1,2,3]; const val=vals[Math.floor(Math.random()*vals.length)];
  const symDisplay={"<":"<",">":">","<=":"-",">=":"-"}[sym];
  const symLatex={"<":"<",">":">","<=":"\\leq",">=":"\\geq"}[sym];
  // Correct: right circle (open/closed) + right direction
  // Wrong A: right circle, wrong direction
  // Wrong B: wrong circle, right direction
  const isOpen=sym==="<"||sym===">";
  const isRight=sym===">"||sym===">=";
  const options=shuffle([
    { label:"A", circle:isOpen?"open":"closed", direction:isRight?"right":"left", correct:true  },
    { label:"B", circle:isOpen?"open":"closed", direction:isRight?"left":"right", correct:false },
    { label:"C", circle:isOpen?"closed":"open", direction:isRight?"right":"left", correct:false },
  ]);
  const correctLabel=options.find(o=>o.correct).label;
  return {
    type:"number-line-match", sym, symDisplay, symLatex, val,
    latex:`x ${symLatex} ${val}`,
    options, correctLabel,
    answer:correctLabel,
    displayAnswer:`${correctLabel} - ${isOpen?"open":"closed"} circle at ${val}, arrow pointing ${isRight?"right":"left"}`,
    prompt:"Which number line correctly represents the inequality?",
  };
}
export function gradeNumberLineMatch(input, q) {
  return String(input).trim().toUpperCase()===q.correctLabel.toUpperCase();
}

// - Topic 3: Identify if sign flips -
export function genSignFlip() {
  const items = shuffle([
    { latex:"x + 3 > 7",         flips:false, desc:"Add/subtract: no flip"      },
    { latex:"x - 5 \\leq 2",     flips:false, desc:"Add/subtract: no flip"      },
    { latex:"2x \\geq 8",        flips:false, desc:"Multiply by positive: no flip" },
    { latex:"-3x < 12",          flips:true,  desc:"Divide by negative: flip"   },
    { latex:"\\dfrac{x}{4} > 2", flips:false, desc:"Divide by positive: no flip" },
    { latex:"\\dfrac{x}{-2} \\leq 6", flips:true, desc:"Divide by negative: flip" },
  ]);
  return { type:"sign-flip", items, prompt:"For each inequality, does the sign flip when solving for x?" };
}
export function gradeSignFlip(answers, q) {
  try {
    const ans=typeof answers==="string"?JSON.parse(answers):answers;
    return q.items.every((item,i)=>Boolean(ans[i])===item.flips);
  } catch { return false; }
}
export function gradeSignFlipItem(answer, idx, q) {
  return Boolean(answer)===q.items[idx].flips;
}

// - Topic 3 Activity 6: Solve one-step inequality (4 simultaneous) -
export function genOneStepIneqs() {
  const items=shuffle([
    { latex:"x + 7 > 10",         answer:{sym:">",val:3},   display:"x > 3",   flips:false },
    { latex:"x - 4 \\leq 3",      answer:{sym:"<=",val:7},  display:"x - 7",   flips:false },
    { latex:"3x \\geq 15",        answer:{sym:">=",val:5},  display:"x - 5",   flips:false },
    { latex:"-2x < 8",            answer:{sym:">",val:-4},  display:"x > -4",  flips:true  },
  ]);
  return { type:"one-step-ineqs", items, prompt:"Solve each inequality. Enter answer as e.g. x > 3 or x - -4." };
}
export function gradeOneStepIneqItem(input, item) {
  const parsed=parseIneq(input);
  return ineqEqual(parsed, item.answer);
}
export function gradeOneStepIneqs(answers, q) {
  try {
    const ans=typeof answers==="string"?JSON.parse(answers):answers;
    return q.items.every((item,i)=>gradeOneStepIneqItem(ans[i]||"",item));
  } catch { return false; }
}

// - Topic 4: Two-step inequality (3 one at a time) -
export function genTwoStepIneq() {
  // One of 3 fixed problems, or random
  const pool=[
    { latex:"2x + 5 > 13",         answer:{sym:">",val:4},   display:"x > 4",   flips:false },
    { latex:"-3x - 4 \\leq 11",    answer:{sym:">=",val:-5}, display:"x - -5",  flips:true  },
    { latex:"4x - 7 \\geq 9",      answer:{sym:">=",val:4},  display:"x - 4",   flips:false },
  ];
  return { type:"two-step-ineq", pool, currentIdx:0, prompt:"Solve the inequality." };
}
export function genTwoStepIneqItem(idx) {
  const pool=[
    { latex:"2x + 5 > 13",         answer:{sym:">",val:4},   display:"x > 4",   flips:false },
    { latex:"-3x - 4 \\leq 11",    answer:{sym:">=",val:-5}, display:"x \\geq -5", display2:"x - -5", flips:true  },
    { latex:"4x - 7 \\geq 9",      answer:{sym:">=",val:4},  display:"x - 4",   flips:false },
  ];
  return pool[idx] || pool[0];
}
export function gradeTwoStepIneq(input, item) {
  const parsed=parseIneq(input);
  return ineqEqual(parsed, item.answer);
}

// - Topic 5: Special cases -
export function genSpecialCases() {
  const items=shuffle([
    { latex:"x + 2 < x + 5",       allReal:true,  simplifies:"2 < 5 (true)"  },
    { latex:"x + 5 < x + 2",       allReal:false, simplifies:"5 < 2 (false)" },
    { latex:"2x + 3 \\leq 2x + 3", allReal:true,  simplifies:"3 - 3 (true)"  },
    { latex:"2x + 3 > 2x + 5",     allReal:false, simplifies:"3 > 5 (false)" },
  ]);
  return { type:"special-cases", items, prompt:"For each, select All Real Numbers or No Solution." };
}
export function gradeSpecialCases(answers, q) {
  try {
    const ans=typeof answers==="string"?JSON.parse(answers):answers;
    return q.items.every((item,i)=>Boolean(ans[i])===item.allReal);
  } catch { return false; }
}
export function gradeSpecialCasesItem(answer, idx, q) {
  return Boolean(answer)===q.items[idx].allReal;
}

// - Topic 5 Activity 9: Solve and classify -
export function genSolveClassify() {
  // Always all-real or no-solution result
  const allReal=Math.random()<0.5;
  if(allReal) {
    // e.g. 3(x-2)+4 >= 3x-2 - 3x-6+4 >= 3x-2 - 3x-2 >= 3x-2 - -2 >= -2 true
    const a=randInt(2,5), b=randInt(1,8), k=randInt(1,6);
    // a(x-b)+k >= ax - (ab-k)
    const rhs=a*b-k; // so that lhs=ax-ab+k=ax-(ab-k)=rhs
    const sym=randChoice(["<","<=",">=",">"]);
    const symLatex={"<":"<",">":">","<=":"\\leq",">=":"\\geq"}[sym];
    const rhsStr=rhs>=0?String(rhs):`(${rhs})`;
    return {
      type:"solve-classify", allReal, sym,
      latex:`${a}(x - ${b}) + ${k} ${symLatex} ${a}x - ${rhs}`,
      answer:"all real numbers", displayAnswer:"All real numbers",
    };
  } else {
    // a(x+b)+k > ax+c where ab+k - c, always false
    const a=randInt(2,5), b=randInt(1,8), k=randInt(1,6);
    const c=a*b+k+randInt(1,5); // c > ab+k so lhs const < rhs const
    const sym=randChoice(["<",">"]);
    const symLatex={"<":"<",">":">"}[sym];
    return {
      type:"solve-classify", allReal, sym,
      latex:`${a}(x + ${b}) + ${k} ${symLatex} ${a}x + ${c}`,
      answer:"no solution", displayAnswer:"No solution",
    };
  }
}
export function gradeSolveClassify(input, q) {
  const s=String(input).trim().toLowerCase().replace(/\s/g,"");
  return (s==="allrealnumbers"||s==="allreals")&&q.allReal || s==="nosolution"&&!q.allReal;
}

// - Registry -
export const LESSON11_TOPICS=[
  { id:"warmup-a",        label:"Warm-up: Two-Step Equation",     description:"Solve ax+b=c"               },
  { id:"warmup-b",        label:"Warm-up: Variables Both Sides",  description:"Solve ax+b=cx+d"            },
  { id:"warmup-c",        label:"Warm-up: Square Root Equation",  description:"Solve sqrt(x)=a"            },
  { id:"is-solution",     label:"Is it a Solution?",              description:"6 simultaneous Yes/No"      },
  { id:"solution-set",    label:"Solution Set Check",             description:"Select all solutions"       },
  { id:"number-line",     label:"Match Number Line",              description:"A/B/C selection"             },
  { id:"sign-flip",       label:"Does the Sign Flip?",            description:"6 simultaneous Flip/No Flip" },
  { id:"one-step-ineqs",  label:"Solve One-Step Inequalities",    description:"4 simultaneous"             },
  { id:"two-step-ineq",   label:"Solve Two-Step Inequality",      description:"3 problems one at a time"   },
  { id:"special-cases",   label:"Special Cases",                  description:"4 simultaneous All Real/No Sol" },
  { id:"solve-classify",  label:"Solve and Classify",             description:"All real or no solution"    },
];

export function generateLesson11Question(topicId, extra) {
  switch(topicId){
    case "warmup-a":       return genWarmupA();
    case "warmup-b":       return genWarmupB();
    case "warmup-c":       return genWarmupC();
    case "is-solution":    return genIsSolution();
    case "solution-set":   return genSolutionSet();
    case "number-line":    return genNumberLineMatch();
    case "sign-flip":      return genSignFlip();
    case "one-step-ineqs": return genOneStepIneqs();
    case "two-step-ineq":  return genTwoStepIneqItem(extra?.ineqIdx||0);
    case "special-cases":  return genSpecialCases();
    case "solve-classify": return genSolveClassify();
    default:               return genWarmupA();
  }
}
