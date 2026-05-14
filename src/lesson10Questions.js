// Lesson 10 - Linear Equations: Multiple Variables, Both Sides, No Solution, Radicals

function randInt(min, max) { return Math.floor(Math.random()*(max-min+1))+min; }
function randChoice(arr) { return arr[Math.floor(Math.random()*arr.length)]; }
function shuffle(arr) { const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }

// Normalize algebraic expression for grading
function normalizeExpr(str) {
  let s = String(str).trim().toLowerCase().replace(/\s+/g,"").replace(/\*/g,"");
  const terms = []; let i = 0;
  while (i < s.length) {
    let sign = 1;
    if (s[i]==="+") { i++; } else if (s[i]==="-") { sign=-1; i++; }
    let coeff = "";
    while (i<s.length && /\d/.test(s[i])) { coeff+=s[i]; i++; }
    let varPart = "";
    while (i<s.length && /[a-z\^]/.test(s[i])) {
      if (s[i]==="^") { i++; let exp=""; while(i<s.length&&/\d/.test(s[i])){exp+=s[i];i++;} varPart+="^"+exp; }
      else { varPart+=s[i]; i++; }
    }
    if (coeff===""&&varPart==="") { i++; continue; }
    const c=(coeff===""?1:parseInt(coeff))*sign;
    terms.push({c,v:varPart});
  }
  return terms.sort((a,b)=>a.v.localeCompare(b.v)||a.c-b.c);
}

function termsEqual(a,b) {
  if(a.length!==b.length) return false;
  return a.every((t,i)=>t.c===b[i].c&&t.v===b[i].v);
}

function gradeExpr(input, expected) {
  try {
    return termsEqual(normalizeExpr(input), normalizeExpr(expected));
  } catch { return false; }
}

function gradeEquation(input, expected) {
  try {
    const si=String(input).trim().toLowerCase().replace(/\s/g,"");
    const se=String(expected).trim().toLowerCase().replace(/\s/g,"");
    if(si===se) return true;
    const pi=si.split("="); const pe=se.split("=");
    if(pi.length!==2||pe.length!==2) return false;
    return (termsEqual(normalizeExpr(pi[0]),normalizeExpr(pe[0]))&&termsEqual(normalizeExpr(pi[1]),normalizeExpr(pe[1])))||
           (termsEqual(normalizeExpr(pi[0]),normalizeExpr(pe[1]))&&termsEqual(normalizeExpr(pi[1]),normalizeExpr(pe[0])));
  } catch { return false; }
}

const LENGTH_UNITS = ["cm","mm","m","in","ft","yd"];

// - Warm-up A: Missing side of rectangle -
export function genWarmupA() {
  const unit=randChoice(LENGTH_UNITS);
  const L=randInt(20,55), W=randInt(20,55);
  const P=2*L+2*W;
  const missingL=Math.random()<0.5;
  const knownVal=missingL?W:L;
  const missingVal=missingL?L:W;
  const knownLabel=missingL?"W":"L";
  const missingLabel=missingL?"L":"W";
  return {
    type:"warmup-a", L, W, P, unit, knownVal, knownLabel, missingVal, missingLabel,
    answer:`${missingVal} ${unit}`, displayAnswer:`${missingLabel} = ${missingVal} ${unit}`,
    prompt:"Find the missing side of the rectangle.",
  };
}

export function gradeWarmupA(input, question) {
  const s=String(input).trim().toLowerCase().replace(/\s+/g,"");
  return s===`${question.missingVal}${question.unit}`;
}

// - Warm-up B: Distributive equation -
// Form: a(bx - c) = d
export function genWarmupB() {
  for(let attempt=0;attempt<300;attempt++){
    const a=randInt(2,6), b=randInt(2,6);
    const x=randInt(-8,8); if(x===0) continue;
    const c=randInt(1,10);
    const plusMinus=Math.random()<0.5;
    const d=plusMinus?a*(b*x+c):a*(b*x-c);
    if(Math.abs(d)>99) continue;
    const latex=plusMinus?`${a}(${b}x + ${c}) = ${d}`:`${a}(${b}x - ${c}) = ${d}`;
    return {
      type:"warmup-b", a, b, c, d, x, plusMinus,
      latex, solution:x, answer:String(x), displayAnswer:`x = ${x}`,
      prompt:"Solve for x.",
    };
  }
  return {type:"warmup-b",a:5,b:3,c:1,d:85,x:6,plusMinus:false,latex:"5(3x - 1) = 85",solution:6,answer:"6",displayAnswer:"x = 6",prompt:"Solve for x."};
}

export function gradeWarmupB(input,q){
  return parseInt(String(input).replace(/\s/g,""),10)===q.solution;
}

// - Warm-up C: Four power equations -
export function genWarmupC() {
  const base=randChoice([4,8,16,27,64]);
  // Always use 8 for clean demo, or randomize
  const b=randChoice([4,8,16,25,27,64]);
  const sqrtB=Math.round(Math.sqrt(b));
  const cbrtB=Math.round(Math.cbrt(b));
  const eqs=[
    {latex:`x^2 = ${b}`,  answer:`-${sqrtB},${sqrtB}`, displayAnswer:`x = -${sqrtB} or ${sqrtB}`},
    {latex:`x^2 = -${b}`, answer:"no solution",         displayAnswer:"No real solution"},
    {latex:`x^3 = ${b}`,  answer:String(cbrtB),         displayAnswer:`x = ${cbrtB}`},
    {latex:`x^3 = -${b}`, answer:String(-cbrtB),        displayAnswer:`x = -${cbrtB}`},
  ];
  const shuffled=shuffle(eqs);
  return {
    type:"warmup-c", b, sqrtB, cbrtB, eqs:shuffled,
    answer:JSON.stringify(shuffled.map(e=>e.answer)),
    prompt:"Solve each equation. Comma-separate two solutions, or type 'no solution'.",
  };
}

export function gradeWarmupCItem(input, eq) {
  const s=String(input).trim().toLowerCase().replace(/\s/g,"");
  const ans=eq.answer.toLowerCase().replace(/\s/g,"");
  if(s===ans) return true;
  // Accept reversed order for two solutions
  if(ans.includes(",")) {
    const parts=ans.split(","); const rParts=parts.slice().reverse().join(",");
    return s===rParts;
  }
  return false;
}

// - Topic 1: Simplify then solve (3(5x-4)-7x=4 form) -
// Form: a(bx - c) - dx = e
export function genSimplifyThenSolve() {
  for(let attempt=0;attempt<400;attempt++){
    const a=randInt(2,5), b=randInt(2,6), d=randInt(1,6);
    const x=randInt(-9,9); if(x===0) continue;
    const c=randInt(1,10);
    const sign1=Math.random()<0.5?1:-1; // sign of c in parens
    const sign2=Math.random()<0.5?1:-1; // sign of d term
    // Expand: a*b*x + a*sign1*c + sign2*d*x = e
    const coeff = a*b + sign2*d;
    if(Math.abs(coeff)<2||Math.abs(coeff)>9) continue;
    const constant = a*sign1*c;
    if(Math.abs(constant)>50) continue;
    const e = coeff*x + constant;
    if(Math.abs(e)>50) continue;

    // Build latex
    const cStr=sign1>=0?`${b}x + ${c}`:`${b}x - ${c}`;
    const dStr=sign2>=0?`+ ${d}x`:`- ${d}x`;
    const latex=`${a}(${cStr}) ${dStr} = ${e}`;

    // Simplified LHS: coeff*x + constant
    const constStr=constant===0?"":constant>0?`+ ${constant}`:`- ${Math.abs(constant)}`;
    const simplifiedLHS=`${coeff}x ${constStr}`.trim();
    const simplifiedEq=`${simplifiedLHS} = ${e}`;

    return {
      type:"simplify-then-solve", latex, x,
      simplifiedLHS, simplifiedEq,
      answer:String(x), displayAnswer:`x = ${x}`,
      prompt:"",
    };
  }
  return {type:"simplify-then-solve",latex:"3(5x - 4) - 7x = 4",x:4,simplifiedLHS:"8x - 12",simplifiedEq:"8x - 12 = 4",answer:"4",displayAnswer:"x = 4",prompt:""};
}

export function gradeSimplifyLHS(input,q){ return gradeExpr(input, q.simplifiedLHS); }
export function gradeSimplifyThenSolve(input,q){ return parseInt(String(input).replace(/\s/g,""),10)===q.x; }

// - Topic 2: Variables on both sides -
// Form: ax + b = cx + d
export function genBothSides() {
  for(let attempt=0;attempt<400;attempt++){
    const a=(Math.random()<0.5?-1:1)*randInt(2,9);
    const c=(Math.random()<0.5?-1:1)*randInt(2,9);
    if(a===c) continue;
    const x=randInt(-9,9); if(x===0) continue;
    const b=randInt(-20,20);
    const d=a*x+b-c*x;
    if(Math.abs(d)>50) continue;
    if(!Number.isInteger(d)) continue;

    // Build latex: ax+b=cx+d
    const aStr=a===1?"x":a===-1?"-x":`${a}x`;
    const bStr=b>=0?`+ ${b}`:`- ${Math.abs(b)}`;
    const cStr=c===1?"x":c===-1?"-x":`${c}x`;
    const dStr=d>=0?String(d):`${d}`;
    const latex=`${aStr} ${bStr} = ${cStr} ${dStr}`;

    // After eliminating cx term: (a-c)x + b = d
    const newCoeff=a-c;
    const newConstStr=b>=0?`+ ${b}`:`- ${Math.abs(b)}`;
    const resultEqA=`${newCoeff}x ${newConstStr} = ${d}`;

    // After eliminating ax term: b = (c-a)x + d
    const newCoeffB=c-a;
    const resultEqB=`${b} = ${newCoeffB}x ${d>=0?`+ ${d}`:`- ${Math.abs(d)}`}`;

    return {
      type:"both-sides", latex, a, b, c, d, x,
      aStr, cStr,
      resultEqA, resultEqB, // after eliminating cx or ax respectively
      answer:String(x), displayAnswer:`x = ${x}`,
      prompt:"",
    };
  }
  return {type:"both-sides",latex:"5x + 3 = 2x + 9",a:5,b:3,c:2,d:9,x:2,aStr:"5x",cStr:"2x",resultEqA:"3x + 3 = 9",resultEqB:"3 = -3x + 9",answer:"2",displayAnswer:"x = 2",prompt:""};
}

export function gradeBothSidesElimChoice(input,q){
  // Accept either "ax" or "cx" as valid elimination choice
  const s=String(input).trim().toLowerCase().replace(/\s/g,"");
  return s===q.aStr.toLowerCase().replace(/\s/g,"")||s===q.cStr.toLowerCase().replace(/\s/g,"");
}

export function gradeBothSidesResult(input,q,eliminatedA){
  // Grade the resulting equation after elimination
  const expected = eliminatedA ? q.resultEqA : q.resultEqB;
  return gradeEquation(input, expected);
}

export function gradeBothSidesSolve(input,q){
  return parseInt(String(input).replace(/\s/g,""),10)===q.x;
}

// - Topic 3: Variables on both sides with simplification -
// Form: a(bx-c)+dx = ex+f OR similar with simplification needed on each side
export function genBothSidesSimplify() {
  for(let attempt=0;attempt<400;attempt++){
    const a=randInt(2,4), b=randInt(2,5), c=randInt(1,8), d=randInt(1,5);
    const e=randInt(2,9), f=randInt(-20,20);
    const sign1=Math.random()<0.5?1:-1;
    // LHS: a(bx-c)+dx = (ab+d)x - ac
    const lhsCoeff=a*b+d;
    const lhsConst=a*sign1*c;
    if(Math.abs(lhsCoeff)<2||Math.abs(lhsCoeff)>9) continue;
    if(lhsCoeff===e) continue; // would give no solution or all reals
    // x = (f - lhsConst) / (lhsCoeff - e)
    const num=f-lhsConst;
    const den=lhsCoeff-e;
    if(den===0||num%den!==0) continue;
    const x=num/den;
    if(!Number.isInteger(x)||x===0||Math.abs(x)>9) continue;
    // RHS: ex+f (already simplified)
    const d2=randInt(1,4); // extra term on RHS for "simplification"
    const rhsConst=f;
    // Make RHS require simplification: e*x + d2 + (rhsConst-d2) - need two terms
    const rhs1=rhsConst-d2;

    const cStr=sign1>=0?`${b}x + ${c}`:`${b}x - ${c}`;
    const latex=`${a}(${cStr}) + ${d}x = ${e}x + ${d2} + ${rhs1}`;

    const lhsConstStr=lhsConst===0?"":lhsConst>0?`+ ${lhsConst}`:`- ${Math.abs(lhsConst)}`;
    const simplifiedLHS=`${lhsCoeff}x ${lhsConstStr}`.trim();
    const simplifiedRHS=`${e}x + ${rhsConst}`;

    // After eliminating smaller coeff
    const newCoeff=lhsCoeff-e;
    const newConstStr=lhsConst>=0?`- ${lhsConst}`:`+ ${Math.abs(lhsConst)}`;
    const resultEq=`${newCoeff}x = ${rhsConst-lhsConst}`;

    return {
      type:"both-sides-simplify", latex, x,
      simplifiedLHS, simplifiedRHS,
      lhsCoeff, lhsConst, e, rhsConst,
      aStr:`${lhsCoeff}x`, eStr:`${e}x`,
      resultEq,
      answer:String(x), displayAnswer:`x = ${x}`,
      prompt:"",
    };
  }
  return {type:"both-sides-simplify",latex:"3(2x + 1) + 4x = 5x + 3 + 6",x:1,simplifiedLHS:"10x + 3",simplifiedRHS:"5x + 9",lhsCoeff:10,lhsConst:3,e:5,rhsConst:9,aStr:"10x",eStr:"5x",resultEq:"5x = 6",answer:"1",displayAnswer:"x = 1",prompt:""};
}

export function gradeBothSidesSimplifyLHS(input,q){ return gradeExpr(input,q.simplifiedLHS); }
export function gradeBothSidesSimplifyRHS(input,q){ return gradeExpr(input,q.simplifiedRHS); }
export function gradeBothSidesSimplifyResult(input,q){ return gradeEquation(input,q.resultEq); }
export function gradeBothSidesSimplifyElim(input,q){ 
  const s=String(input).trim().toLowerCase().replace(/\s/g,"");
  return s===q.aStr.toLowerCase().replace(/\s/g,"")||s===q.eStr.toLowerCase().replace(/\s/g,"");
}
export function gradeBothSidesSimplifyFinal(input,q){ return parseInt(String(input).replace(/\s/g,""),10)===q.x; }

// - Topic 4: No solution / All real numbers -
export function genNoSolutionQuestion() {
  // Stage 1: trivial cases (a=a - all real, a=b - no solution)
  const a=randInt(2,20);
  const b=randInt(2,20); const bDiff=b===a?b+1:b;
  const trivial=[
    {latex:`${a} = ${a}`, answer:"all real numbers", displayAnswer:"All real numbers"},
    {latex:`${a} = ${bDiff}`, answer:"no solution", displayAnswer:"No solution"},
  ];

  // Stage 2: variable terms cancel, no simplification
  // a*x + b = a*x + c (b-c - no solution) or a*x + b = a*x + b (- all real)
  const ca=randInt(2,8);
  const cb=randInt(-15,15);
  const allReal=Math.random()<0.5;
  const cc=allReal?cb:cb+(Math.random()<0.5?randInt(1,10):-randInt(1,10));
  const stage2Latex=ca===1?`x + ${cb} = x + ${cc}`:`${ca}x + ${cb} = ${ca}x + ${cc}`;
  const stage2Answer=allReal?"all real numbers":"no solution";

  // Stage 3: needs one simplification step per side first
  // e.g. 2(x+3)=2x+6 - all real; 2(x+3)=2x+8 - no solution
  const sa=randInt(2,5), sb=randInt(1,8);
  const allReal3=Math.random()<0.5;
  const sc=allReal3?sa*sb:sa*sb+(Math.random()<0.5?1:-1)*randInt(1,5);
  const stage3Latex=`${sa}(x + ${sb}) = ${sa}x + ${sc}`;
  const stage3Answer=allReal3?"all real numbers":"no solution";

  return {
    type:"no-solution",
    trivial, trivial_a:a, trivial_b:bDiff,
    stage2Latex, stage2Answer, stage2AllReal:allReal,
    stage3Latex, stage3Answer, stage3AllReal:allReal3,
    prompt:"",
  };
}

export function gradeNoSolutionTrivial(input,idx,q){
  const s=String(input).trim().toLowerCase().replace(/\s/g,"");
  const ans=q.trivial[idx].answer.toLowerCase().replace(/\s/g,"");
  return s===ans||s==="allreals"&&ans==="allrealnumbers"||s==="allrealnumbers"&&ans==="allreals";
}
export function gradeNoSolutionStage2(input,q){
  const s=String(input).trim().toLowerCase().replace(/\s/g,"");
  const ans=q.stage2Answer.toLowerCase().replace(/\s/g,"");
  return s===ans||s==="allreals"&&ans==="allrealnumbers";
}
export function gradeNoSolutionStage3(input,q){
  const s=String(input).trim().toLowerCase().replace(/\s/g,"");
  const ans=q.stage3Answer.toLowerCase().replace(/\s/g,"");
  return s===ans||s==="allreals"&&ans==="allrealnumbers";
}

// - Topic 5: Square roots and cube roots of x -
const PERFECT_SQUARES=[1,4,9,16,25,36,49,64,81,100];
const PERFECT_CUBES=[1,8,27,64,125];

export function genRadicalEquations() {
  const sqA=randChoice([2,3,4,5,6,7,8,9,10]);
  const cbA=randChoice([1,2,3,4,5]);

  const eqs=[
    {
      latex:`\\sqrt{x} = ${sqA}`,
      solutionType:"one positive",
      answer:String(sqA*sqA), displayAnswer:`x = ${sqA*sqA}`,
      explanation:`\\sqrt{x} = ${sqA} \\Rightarrow x = ${sqA}^2 = ${sqA*sqA}`,
    },
    {
      latex:`\\sqrt{x} = -${sqA}`,
      solutionType:"no solution",
      answer:"no solution", displayAnswer:"No solution (sqrt can't equal negative)",
      explanation:`\\sqrt{x} \\geq 0 \\text{ always, so no solution}`,
    },
    {
      latex:`\\sqrt{x} = 0`,
      solutionType:"zero",
      answer:"0", displayAnswer:"x = 0",
      explanation:`\\sqrt{x} = 0 \\Rightarrow x = 0`,
    },
    {
      latex:`\\sqrt[3]{x} = ${cbA}`,
      solutionType:"one positive",
      answer:String(cbA*cbA*cbA), displayAnswer:`x = ${cbA**3}`,
      explanation:`\\sqrt[3]{x} = ${cbA} \\Rightarrow x = ${cbA}^3 = ${cbA**3}`,
    },
    {
      latex:`\\sqrt[3]{x} = -${cbA}`,
      solutionType:"one negative",
      answer:String(-(cbA*cbA*cbA)), displayAnswer:`x = ${-(cbA**3)}`,
      explanation:`\\sqrt[3]{x} = -${cbA} \\Rightarrow x = (-${cbA})^3 = ${-(cbA**3)}`,
    },
    {
      latex:`\\sqrt[3]{x} = 0`,
      solutionType:"zero",
      answer:"0", displayAnswer:"x = 0",
      explanation:`\\sqrt[3]{x} = 0 \\Rightarrow x = 0`,
    },
  ];

  return {
    type:"radical-equations",
    eqs:shuffle(eqs), sqA, cbA,
    prompt:"",
  };
}

export function gradeRadicalType(input, eq) {
  const s=String(input).trim().toLowerCase().replace(/\s/g,"");
  const map={
    "one positive":"onepositive","no solution":"nosolution",
    "zero":"zero","one negative":"onenegative",
  };
  return s===map[eq.solutionType]||s===eq.solutionType.toLowerCase().replace(/\s/g,"");
}

export function gradeRadicalSolve(input, eq) {
  const s=String(input).trim().toLowerCase().replace(/\s/g,"");
  if(eq.answer==="no solution") return s==="nosolution"||s==="no solution";
  return parseInt(s,10)===parseInt(eq.answer,10);
}

// - Topic registry -
export const LESSON10_TOPICS=[
  {id:"warmup-a",           label:"Warm-up: Missing Rectangle Side",    description:"Enter missing side with units"},
  {id:"warmup-b",           label:"Warm-up: Distributive Equation",     description:"Solve a(bx-c)=d"},
  {id:"warmup-c",           label:"Warm-up: Four Power Equations",      description:"x-=-n and x-=-n"},
  {id:"simplify-then-solve",label:"Simplify Then Solve",                description:"Simplify LHS, then solve"},
  {id:"both-sides",         label:"Variables on Both Sides",            description:"ax+b=cx+d, 3 stages"},
  {id:"both-sides-simplify",label:"Both Sides with Simplification",     description:"Simplify each side first"},
  {id:"no-solution",        label:"No Solution / All Real Numbers",     description:"Identify equation type"},
  {id:"radical-equations",  label:"Radical Equations",                  description:"sqrt(x) and cbrt(x)"},
];

export function generateLesson10Question(topicId) {
  switch(topicId){
    case "warmup-a":            return genWarmupA();
    case "warmup-b":            return genWarmupB();
    case "warmup-c":            return genWarmupC();
    case "simplify-then-solve": return genSimplifyThenSolve();
    case "both-sides":          return genBothSides();
    case "both-sides-simplify": return genBothSidesSimplify();
    case "no-solution":         return genNoSolutionQuestion();
    case "radical-equations":   return genRadicalEquations();
    default:                    return genBothSides();
  }
}

export function gradeLesson10Answer(input, question, graderKey) {
  if(!input||!question) return false;
  switch(question.type){
    case "warmup-a":            return gradeWarmupA(input,question);
    case "warmup-b":            return gradeWarmupB(input,question);
    case "simplify-then-solve":
      if(graderKey==="lhs") return gradeSimplifyLHS(input,question);
      return gradeSimplifyThenSolve(input,question);
    case "both-sides":
      if(graderKey==="elim") return gradeBothSidesElimChoice(input,question);
      if(graderKey==="result") return gradeBothSidesResult(input,question,question._eliminatedA);
      return gradeBothSidesSolve(input,question);
    case "both-sides-simplify":
      if(graderKey==="lhs") return gradeBothSidesSimplifyLHS(input,question);
      if(graderKey==="rhs") return gradeBothSidesSimplifyRHS(input,question);
      if(graderKey==="elim") return gradeBothSidesSimplifyElim(input,question);
      if(graderKey==="result") return gradeBothSidesSimplifyResult(input,question);
      return gradeBothSidesSimplifyFinal(input,question);
    case "no-solution":
      if(graderKey==="trivial0") return gradeNoSolutionTrivial(input,0,question);
      if(graderKey==="trivial1") return gradeNoSolutionTrivial(input,1,question);
      if(graderKey==="stage2") return gradeNoSolutionStage2(input,question);
      return gradeNoSolutionStage3(input,question);
    default: return false;
  }
}
