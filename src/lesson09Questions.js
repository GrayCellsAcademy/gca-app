// Lesson 9 - Two-Step Equations, Distributive Property, Rectangle, Power Equations

function randInt(min, max) { return Math.floor(Math.random()*(max-min+1))+min; }
function randChoice(arr) { return arr[Math.floor(Math.random()*arr.length)]; }
function shuffle(arr) { const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }

// Helper: normalize algebraic expression for grading (same as L6)
function normalizeExpr(str) {
  let s = str.trim().toLowerCase().replace(/\s+/g,"");
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

function gradeEquation(input, expected) {
  // Accept equation like "2x=8" or "x=4" - check both sides
  try {
    const s=input.trim().toLowerCase().replace(/\s/g,"");
    const e=expected.trim().toLowerCase().replace(/\s/g,"");
    if (s===e) return true;
    // Parse both sides of = and normalize
    const splitInput=s.split("="); const splitExpected=e.split("=");
    if(splitInput.length!==2||splitExpected.length!==2) return false;
    const lIn=normalizeExpr(splitInput[0]), rIn=normalizeExpr(splitInput[1]);
    const lEx=normalizeExpr(splitExpected[0]), rEx=normalizeExpr(splitExpected[1]);
    return (termsEqual(lIn,lEx)&&termsEqual(rIn,rEx)) ||
           (termsEqual(lIn,rEx)&&termsEqual(rIn,lEx));
  } catch { return false; }
}

// - Warm-up A: Rectangle Perimeter -
const LENGTH_UNITS = ["cm","mm","m","km","in","ft","yd","mi"];

export function genWarmupA() {
  const L=randInt(10,99), W=randInt(10,99);
  const unit=randChoice(LENGTH_UNITS);
  const perimeter=2*L+2*W;
  return {
    type:"warmup-a", L, W, unit, perimeter,
    answer:`${perimeter} ${unit}`,
    displayAnswer:`${perimeter} ${unit}`,
    prompt:"Find the perimeter of the rectangle. Enter your answer with units.",
  };
}

export function gradeWarmupA(input, question) {
  const s=input.trim().toLowerCase().replace(/\s+/g,"");
  const expected=`${question.perimeter}${question.unit}`;
  return s===expected;
}

// - Warm-up B: One-Step Equation Review -
export function genWarmupB() {
  const form=randChoice(["add","sub","mul","div","negx"]);
  let latex, solution;
  if (form==="add") {
    const a=(Math.random()<0.4?-1:1)*randInt(1,12);
    const x=(Math.random()<0.4?-1:1)*randInt(1,12);
    const b=x+a;
    latex=`x ${a>=0?`+ ${a}`:`- ${Math.abs(a)}`} = ${b}`;
    solution=x;
  } else if (form==="sub") {
    const a=randInt(1,12);
    const x=(Math.random()<0.4?-1:1)*randInt(1,12);
    latex=`x - ${a} = ${x-a}`;
    solution=x;
  } else if (form==="mul") {
    const a=(Math.random()<0.4?-1:1)*randInt(2,9);
    const x=(Math.random()<0.4?-1:1)*randInt(1,9);
    const aStr=a===-1?"-":a===1?"":String(a);
    latex=`${a}x = ${a*x}`;
    solution=x;
  } else if (form==="div") {
    const a=(Math.random()<0.4?-1:1)*randInt(2,9);
    const x=(Math.random()<0.4?-1:1)*randInt(1,9);
    const b=x; const c=a*x;
    latex=`\\dfrac{x}{${a<0?`(${a})`:a}} = ${b}`;
    solution=c;
  } else {
    const a=(Math.random()<0.4?-1:1)*randInt(1,12);
    latex=`-x = ${a}`;
    solution=-a;
  }
  return {
    type:"warmup-b", form, latex, solution,
    answer:String(solution), displayAnswer:`x = ${solution}`,
    prompt:"Solve for x.",
  };
}

export function gradeWarmupB(input, question) {
  return parseInt(String(input).replace(/\s/g,""),10)===question.solution;
}

// - Topic 1: Two-Step Equations -
// Forms: ax+b=c; ax-b=c; -x+b=c; -x-b=c
export function genTwoStepEq() {
  for (let attempt=0; attempt<300; attempt++) {
    const useNeg=Math.random()<0.25;
    const a=useNeg?-1:(Math.random()<0.5?-1:1)*randInt(2,9);
    const x=randInt(-9,9); if(x===0) continue;
    const b=(Math.random()<0.5?-1:1)*randInt(1,20);
    const c=a*x+b;
    if(Math.abs(c)>50||Math.abs(b)>50) continue;
    if(!Number.isInteger(c)) continue;

    // Build latex: ax+b=c or ax-b=c
    const aStr=a===-1?"-":a===1?"":String(a);
    const bStr=b>=0?`+ ${b}`:`- ${Math.abs(b)}`;
    const latex=`${aStr}x ${bStr} = ${c}`;

    // First operation: undo the constant (add or subtract b)
    const firstOp=b>0?"subtract":"add";
    const firstNum=Math.abs(b);
    const afterFirst=c-b; // right side after first op
    // Simplified equation: ax = c-b
    const simplifiedLatex=`${aStr}x = ${afterFirst}`;
    const simplifiedAnswer=`${aStr}x = ${afterFirst}`;

    return {
      type:"two-step-eq", a, b, c, x,
      latex, simplifiedLatex, simplifiedAnswer,
      firstOp, firstNum,
      answer:String(x), displayAnswer:`x = ${x}`,
      prompt:"",
    };
  }
  return {type:"two-step-eq",a:2,b:5,c:13,x:4,latex:"2x + 5 = 13",simplifiedLatex:"2x = 8",simplifiedAnswer:"2x = 8",firstOp:"subtract",firstNum:5,answer:"4",displayAnswer:"x = 4",prompt:""};
}

// Activity 1: Choose first operation
export function gradeTwoStepFirstOp(input, question) {
  try {
    const {op,num}=JSON.parse(input);
    return op===question.firstOp && parseInt(num)===question.firstNum;
  } catch { return false; }
}

// Activity 2: Write resulting equation
export function gradeTwoStepResult(input, question) {
  return gradeEquation(input, question.simplifiedAnswer);
}

// Activity 3: Solve resulting equation
export function gradeTwoStepSolve(input, question) {
  return parseInt(String(input).replace(/\s/g,""),10)===question.x;
}

// Activity 4: Full solve
export function gradeTwoStepFull(input, question) {
  return parseInt(String(input).replace(/\s/g,""),10)===question.x;
}

// - Topic 2: Distributive Property Equations -
// Forms: a(bx+c)=d; a(bx-c)=d; -(ax+b)=c; -(ax-b)=c
export function genDistributiveEq() {
  for (let attempt=0; attempt<300; attempt++) {
    const useNeg=Math.random()<0.3;
    let a,b,c,d,latex,expandedLHS,expandedLatex,solution;

    if (useNeg) {
      // -(ax+b)=c or -(ax-b)=c
      a=randInt(2,6); b=randInt(1,10);
      const plusMinus=Math.random()<0.5;
      // solution: x from -ax-b=c (plus) - x=-(c+b)/a
      //           -ax+b=c (minus) - x=(b-c)/a
      if (plusMinus) {
        // -(ax+b)=c - -ax-b=c - x=-(c+b)/a
        c=randInt(-30,30);
        if((c+b)%a!==0) continue;
        solution=-(c+b)/a;
        if(!Number.isInteger(solution)||solution===0) continue;
        latex=`-(${a}x + ${b}) = ${c}`;
        expandedLHS=`-${a}x - ${b}`;
        expandedLatex=`-${a}x - ${b} = ${c}`;
      } else {
        // -(ax-b)=c - -ax+b=c - x=(b-c)/a
        c=randInt(-30,30);
        if((b-c)%a!==0) continue;
        solution=(b-c)/a;
        if(!Number.isInteger(solution)||solution===0) continue;
        latex=`-(${a}x - ${b}) = ${c}`;
        expandedLHS=`-${a}x + ${b}`;
        expandedLatex=`-${a}x + ${b} = ${c}`;
      }
    } else {
      // a(bx+c)=d or a(bx-c)=d
      a=randInt(2,6); b=randInt(2,6);
      const plusMinus=Math.random()<0.5;
      if (plusMinus) {
        c=randInt(1,10);
        // a(bx+c)=d - abx+ac=d - x=(d-ac)/(ab)
        // Pick x first
        const x=randInt(-8,8); if(x===0) continue;
        d=a*(b*x+c);
        if(Math.abs(d)>50) continue;
        solution=x;
        latex=`${a}(${b}x + ${c}) = ${d}`;
        expandedLHS=`${a*b}x + ${a*c}`;
        expandedLatex=`${a*b}x + ${a*c} = ${d}`;
      } else {
        c=randInt(1,10);
        const x=randInt(-8,8); if(x===0) continue;
        d=a*(b*x-c);
        if(Math.abs(d)>50) continue;
        solution=x;
        latex=`${a}(${b}x - ${c}) = ${d}`;
        expandedLHS=`${a*b}x - ${a*c}`;
        expandedLatex=`${a*b}x - ${a*c} = ${d}`;
      }
    }

    return {
      type:"dist-eq", latex, expandedLHS, expandedLatex, solution,
      answer:String(solution), displayAnswer:`x = ${solution}`,
      expandedAnswer:expandedLHS,
      prompt:"",
    };
  }
  return {type:"dist-eq",latex:"3(2x + 5) = 39",expandedLHS:"6x + 15",expandedLatex:"6x + 15 = 39",solution:4,answer:"4",displayAnswer:"x = 4",expandedAnswer:"6x + 15",prompt:""};
}

export function gradeDistribute(input, question) {
  // Grade the expanded LHS only
  const norm=(s)=>normalizeExpr(s);
  return termsEqual(norm(input), norm(question.expandedAnswer));
}

export function gradeDistEqSolve(input, question) {
  return parseInt(String(input).replace(/\s/g,""),10)===question.solution;
}

// - Topic 3: Rectangle Missing Side -
export function genRectMissingSide() {
  const unit=randChoice(LENGTH_UNITS);
  // Pick L and W (2-digit), ensure perimeter is even
  const L=randInt(10,49), W=randInt(10,49);
  const P=2*L+2*W; // always even
  // Randomly which side is missing
  const missingL=Math.random()<0.5;
  const knownVal=missingL?W:L;
  const missingVal=missingL?L:W;
  const knownLabel=missingL?"W":"L";
  const missingLabel=missingL?"L":"W";

  return {
    type:"rect-missing", L, W, P, unit,
    knownVal, knownLabel, missingVal, missingLabel,
    // Substituted eq: 2(missingVal) + 2(knownVal) = P
    substitutedEq:`2(${missingVal})+2(${knownVal})=${P}`,
    answer:`${missingVal} ${unit}`,
    displayAnswer:`${missingVal} ${unit}`,
    prompt:"Find the missing side of the rectangle.",
  };
}

// Activity 1: Substitution clicks - graded separately by the UI
export function gradeRectSubstitution(input, question) {
  try {
    const {P,known}=JSON.parse(input);
    return P===question.P && known===question.knownVal;
  } catch { return false; }
}

// Activity 2: Solve for missing side
export function gradeRectSolve(input, question) {
  const s=input.trim().toLowerCase().replace(/\s+/g,"");
  return s===`${question.missingVal}${question.unit}`;
}

// - Topic 4: Power Equations -
const PERFECT_SQUARES=[0,1,4,9,16,25,36,49,64,81,100];
const PERFECT_CUBES_POS=[0,1,8,27,64,125];
const PERFECT_CUBES_NEG=[-1,-8,-27,-64,-125];

export function genPowerNumSolutions() {
  const isSquare=Math.random()<0.5;
  let latex, numSolutions, a;
  if (isSquare) {
    // x^2=a: pos=2 sols, zero=1 sol, neg=0 sols
    const type=randChoice(["pos","zero","neg"]);
    if (type==="pos") { a=randChoice([1,4,9,16,25,36,49,64,81,100]); numSolutions=2; }
    else if (type==="zero") { a=0; numSolutions=1; }
    else { a=-randChoice([1,4,9,16,25]); numSolutions=0; }
    latex=`x^2 = ${a}`;
  } else {
    // x^3=a: always 1 solution
    a=randChoice([...PERFECT_CUBES_POS,...PERFECT_CUBES_NEG]);
    numSolutions=1;
    latex=`x^3 = ${a}`;
  }
  return {
    type:"power-num-solutions", latex, a, isSquare, numSolutions,
    answer:String(numSolutions), displayAnswer:`${numSolutions} solution${numSolutions!==1?"s":""}`,
    prompt:"How many solutions does this equation have?",
  };
}

export function gradePowerNumSolutions(input, question) {
  return parseInt(String(input),10)===question.numSolutions;
}

export function genSolveSquare() {
  const type=randChoice(["pos","zero","neg"]);
  let a, answer, displayAnswer;
  if (type==="pos") {
    const root=randChoice([1,2,3,4,5,6,7,8,9,10]);
    a=root*root;
    answer=`-${root},${root}`;
    displayAnswer=`x = -${root} or x = ${root}`;
  } else if (type==="zero") {
    a=0; answer="0"; displayAnswer="x = 0";
  } else {
    a=-randChoice([1,4,9,16,25]);
    answer="no solution"; displayAnswer="No real solution";
  }
  return {
    type:"solve-square", a,
    latex:`x^2 = ${a}`,
    answer, displayAnswer,
    isNeg:type==="neg", isZero:type==="zero",
    prompt:"Solve for x. Enter both solutions comma-separated, or 'no solution'.",
  };
}

export function gradeSolveSquare(input, question) {
  const s=input.trim().toLowerCase().replace(/\s/g,"");
  if (question.isNeg) return s==="nosolution"||s==="no solution";
  if (question.isZero) return s==="0";
  // Two solutions: accept -r,r or r,-r
  const root=Math.sqrt(question.a);
  const opts=[`-${root},${root}`,`${root},-${root}`];
  return opts.includes(s);
}

export function genSolveCube() {
  const a=randChoice([...PERFECT_CUBES_POS,...PERFECT_CUBES_NEG]);
  const root=Math.round(Math.cbrt(a));
  return {
    type:"solve-cube", a, root,
    latex:`x^3 = ${a}`,
    answer:String(root), displayAnswer:`x = ${root}`,
    prompt:"Solve for x.",
  };
}

export function gradeSolveCube(input, question) {
  return parseInt(String(input).replace(/\s/g,""),10)===question.root;
}

// - Topic registry -
export const LESSON09_TOPICS=[
  {id:"warmup-a",           label:"Warm-up: Rectangle Perimeter",      description:"2-digit L and W, enter P with units"},
  {id:"warmup-b",           label:"Warm-up: One-Step Equations",       description:"Mix of all forms"},
  {id:"two-step-first-op",  label:"Two-Step: Choose First Operation",  description:"Add/Subtract/Multiply/Divide + number"},
  {id:"two-step-result",    label:"Two-Step: Write Result Equation",   description:"After first operation"},
  {id:"two-step-solve",     label:"Two-Step: Solve Simplified",        description:"Solve ax=b or -x=b"},
  {id:"two-step-full",      label:"Two-Step: Full Solve",              description:"Solve ax+b=c directly"},
  {id:"dist-expand",        label:"Distributive: Expand Only",         description:"Expand left side"},
  {id:"dist-solve-after",   label:"Distributive: Solve Expanded",      description:"Given expanded equation"},
  {id:"dist-full",          label:"Distributive: Full Solve",          description:"Original equation, full solve"},
  {id:"rect-sub",           label:"Rectangle: Substitution",           description:"Click to substitute P and known side"},
  {id:"rect-solve",         label:"Rectangle: Solve for Missing Side", description:"Enter value with units"},
  {id:"power-num-sols",     label:"Power: Number of Solutions",        description:"x-=a or x-=a"},
  {id:"power-solve-sq",     label:"Power: Solve x-=a",                description:"Enter both solutions or 'no solution'"},
  {id:"power-solve-cu",     label:"Power: Solve x-=a",                description:"Enter single solution"},
];

export function generateLesson09Question(topicId) {
  switch(topicId) {
    case "warmup-a":          return genWarmupA();
    case "warmup-b":          return genWarmupB();
    case "two-step-first-op": return genTwoStepEq();
    case "two-step-result":   return genTwoStepEq();
    case "two-step-solve":    return genTwoStepEq();
    case "two-step-full":     return genTwoStepEq();
    case "dist-expand":       return genDistributiveEq();
    case "dist-solve-after":  return genDistributiveEq();
    case "dist-full":         return genDistributiveEq();
    case "rect-sub":          return genRectMissingSide();
    case "rect-solve":        return genRectMissingSide();
    case "power-num-sols":    return genPowerNumSolutions();
    case "power-solve-sq":    return genSolveSquare();
    case "power-solve-cu":    return genSolveCube();
    default:                  return genTwoStepEq();
  }
}

export function gradeLesson09Answer(input, question) {
  if (!input||!question) return false;
  switch(question.type) {
    case "warmup-a":          return gradeWarmupA(input,question);
    case "warmup-b":          return gradeWarmupB(input,question);
    case "two-step-eq":
      // type stored on question, but topicId tells us which grader
      if (question._grader==="first-op") return gradeTwoStepFirstOp(input,question);
      if (question._grader==="result")   return gradeTwoStepResult(input,question);
      if (question._grader==="solve")    return gradeTwoStepSolve(input,question);
      return gradeTwoStepFull(input,question);
    case "dist-eq":
      if (question._grader==="expand") return gradeDistribute(input,question);
      return gradeDistEqSolve(input,question);
    case "rect-missing":
      if (question._grader==="sub") return gradeRectSubstitution(input,question);
      return gradeRectSolve(input,question);
    case "power-num-solutions": return gradePowerNumSolutions(input,question);
    case "solve-square":       return gradeSolveSquare(input,question);
    case "solve-cube":         return gradeSolveCube(input,question);
    default: return false;
  }
}
