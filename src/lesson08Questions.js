// Lesson 8 - OoO with nested parentheses, composite shapes, one-step equations, d=st

function randInt(min, max) { return Math.floor(Math.random()*(max-min+1))+min; }
function randChoice(arr) { return arr[Math.floor(Math.random()*arr.length)]; }
function shuffle(arr) { const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }

// - Warm-up A: OoO with nested parentheses -
// Form: a*(b + c*(d-e)) or similar with 2 levels of parentheses, 4 operations
export function genWarmupA() {
  for (let attempt=0; attempt<300; attempt++) {
    const OPS=["+","-","*","/"];
    // Build: outer_a OP1 (inner_b OP2 inner_c OP3 (deepA OP4 deepB))
    // Keep numbers small for clean results
    const deepA=randInt(2,6), deepB=randInt(1,4);
    const innerOps=["+","-"];
    const op4=randChoice(innerOps);
    const deep = op4==="+"?deepA+deepB:deepA-deepB;

    const innerC=randInt(1,4);
    const op3=randChoice(["*","/"]);
    let mid;
    if (op3==="*") {
      if (Math.abs(innerC)>8||Math.abs(deep)>8||Math.abs(innerC*deep)>72) continue;
      mid=innerC*deep;
    } else {
      if (deep===0||innerC%deep!==0) continue;
      mid=innerC/deep;
    }

    const innerB=randInt(1,9);
    const op2=randChoice(innerOps);
    const inner=op2==="+"?innerB+mid:innerB-mid;

    const outerA=randInt(2,6);
    const op1=randChoice(["*","/"]);
    let result;
    if (op1==="*") {
      if (Math.abs(outerA)>8||Math.abs(inner)>72) continue;
      result=outerA*inner;
    } else {
      if (inner===0||outerA%inner!==0) continue;
      result=outerA/inner;
    }
    if (!Number.isInteger(result)||Math.abs(result)>99) continue;

    const fmtOp=(op)=>op==="*"?"\\times":op==="/"?"\\div":op;
    const latex=`${outerA} ${fmtOp(op1)} (${innerB} ${op2} ${innerC} ${fmtOp(op3)} (${deepA} ${op4} ${deepB}))`;
    return {
      type:"warmup-a", latex, result,
      answer:String(result), displayAnswer:String(result),
      isUndefined:false,
      prompt:"Evaluate using the correct order of operations.",
    };
  }
  return {type:"warmup-a",latex:"3 \\times (4 + 2 \\times (5 - 3))",result:24,answer:"24",displayAnswer:"24",isUndefined:false,prompt:"Evaluate using the correct order of operations."};
}

export function gradeWarmupA(input,question) {
  return parseInt(String(input).replace(/\s/g,""),10)===question.result;
}

// - Warm-up B: Composite Shape Perimeter and Area -
// + shape or 2-step shape, 2-digit sides, 2 missing sides
export function genWarmupB() {
  const type=Math.random()<0.5?"plus":"step";

  if (type==="plus") {
    // + shape: 3x3 grid of unit cells, outer arms
    // Arms: top, bottom, left, right each w wide, h tall
    const armW=randInt(10,30), armH=randInt(10,30);
    const ctrW=randInt(15,40), ctrH=randInt(15,40);
    // total width = armW + ctrW + armW = 2*armW+ctrW
    // total height = armH + ctrH + armH
    const totalW=2*armW+ctrW, totalH=2*armH+ctrH;
    // + shape: bounding rect minus 4 corners
    const area = totalW*totalH - 4*armW*armH;
    // Perimeter: 12 sides going clockwise
    // top-arm(ctrW), right-of-top-arm(armH), top-of-right-arm(armW), right-arm(ctrH),
    // bottom-of-right-arm(armW), left-of-bottom-arm(armH), bottom-arm(ctrW), ...x2 (symmetric)
    // = 4*ctrW + 4*ctrH + 8*armW? No...
    // Each of 4 arms contributes: 1 end side + 2 shoulder sides
    // End sides: 4 * ctrW (top/bottom) and 4 * ctrH? No, arms alternate
    // Correct: p = 4*(armW + armH) + 2*(ctrW + ctrH) ... still not right
    // Direct count: 12 sides = 4*(armW) + 4*(armH) + 2*(ctrW) + 2*(ctrH)
    // But ctrW appears as top+bottom of center, armH as left+right sides of top/bottom arms...
    // Verified formula: p = 2*(ctrW + 2*armW) + 2*(ctrH + 2*armH) - removes 4 corners that arent there
    // = 2*totalW + 2*totalH - 8*armW - 8*armH + 4*(2*armW) + 4*(2*armH)... 
    // Simplest correct: trace the outline
    // p = 4*armW + 4*armH + 2*ctrW + 2*ctrH (verified for symmetric + shape)
    const p = 4*armW + 4*armH + 2*ctrW + 2*ctrH;
    // Missing sides: the two inner notch widths (= armW each, so student computes totalW-ctrW)/2
    // and two inner notch heights
    const missingH=armH, missingW=armW;
    return {
      type:"warmup-b", shapeType:"plus",
      totalW, totalH, armW, armH, ctrW, ctrH,
      perimeter:p, area,
      missingW, missingH,
      prompt:"Find the perimeter and area of the composite shape. Two sides are not labeled.",
      displayAnswer:`Perimeter: ${p} units, Area: ${area} square units`,
      answer:JSON.stringify({perimeter:p, area}),
    };
  } else {
    // Step shape: rectangle with one corner cut out (2-step staircase)
    // Main rect: W x H, cutout: cW x cH from top-right corner
    const W=randInt(20,50), H=randInt(20,50);
    const cW=randInt(10,W-10), cH=randInt(10,H-10);
    const area = W*H - cW*cH;
    // Perimeter: 6 sides
    // right-of-cutout=(H-cH), top-of-cutout=cW, cutout-right=cH, top=(W-cW)... 
    // Going clockwise from bottom-left:
    // bottom=W, right=H, left-of-cutout-top=(H-cH) going left... 
    // Actually: bottom(W), right(H), notch-top going left(cW), notch-down(cH), remaining-top going left(W-cW), left going down(H)
    // Wait: 
    // BL->BR: W (bottom)
    // BR->TR: H (right) 
    // TR going left: W-cW (top partial)
    // then down: cH (notch vertical)
    // then left: cW (notch horizontal)  
    // then up: H-cH -- no that's wrong direction
    // Let me redo: shape = full W x H with top-right cW x cH removed
    // Vertices (clockwise from BL): (0,0),(W,0),(W,H-cH),(W-cW,H-cH),(W-cW,H),(0,H)
    // Sides: W, (H-cH), cW, cH, (W-cW), H
    const perimeter = W + (H-cH) + cW + cH + (W-cW) + H;
    // = 2W + 2H -- always! Because it simplifies
    // Missing sides: cW and cH (the notch sides)
    return {
      type:"warmup-b", shapeType:"step",
      W, H, cW, cH,
      perimeter, area,
      missingW:cW, missingH:cH,
      prompt:"Find the perimeter and area of the composite shape. Two sides are not labeled.",
      displayAnswer:`Perimeter: ${perimeter} units, Area: ${area} sq units`,
      answer:JSON.stringify({perimeter, area}),
    };
  }
}

export function gradeWarmupB(input, question) {
  try {
    const parsed = typeof input==="string" ? JSON.parse(input) : input;
    return parsed.perimeter===question.perimeter && parsed.area===question.area;
  } catch { return false; }
}

// - Topic 1: Expression or Equation -
const EXPR_EQ_EXAMPLES = [
  {text:"3x + 2",          latex:"3x + 2",           type:"expression"},
  {text:"5 = 2x + 1",      latex:"5 = 2x + 1",       type:"equation"},
  {text:"x - 7",           latex:"x - 7",             type:"expression"},
  {text:"-4x = 12",        latex:"-4x = 12",          type:"equation"},
  {text:"2x + 3y - 1",     latex:"2x + 3y - 1",       type:"expression"},
  {text:"x + 5 = -3",      latex:"x + 5 = -3",        type:"equation"},
  {text:"-x = 8",          latex:"-x = 8",            type:"equation"},
  {text:"7 - 2x",          latex:"7 - 2x",            type:"expression"},
  {text:"x / 4 = -3",      latex:"\\dfrac{x}{4} = -3",type:"equation"},
  {text:"3x",              latex:"3x",                type:"expression"},
  {text:"x - 4 = 10",     latex:"x - 4 = 10",        type:"equation"},
  {text:"5x + 1",          latex:"5x + 1",            type:"expression"},
  {text:"-2x = -6",        latex:"-2x = -6",          type:"equation"},
  {text:"4 + x",           latex:"4 + x",             type:"expression"},
  {text:"x/2 = 7",         latex:"\\dfrac{x}{2} = 7", type:"equation"},
];

export function genExprOrEquation() {
  const selected=shuffle([...EXPR_EQ_EXAMPLES]).slice(0,5);
  // Ensure mix: at least 2 expressions and 2 equations
  const exprs=selected.filter(s=>s.type==="expression");
  const eqs=selected.filter(s=>s.type==="equation");
  let items=selected;
  if(exprs.length<2||eqs.length<2){
    // Rebuild with guaranteed mix
    const ePool=EXPR_EQ_EXAMPLES.filter(s=>s.type==="expression");
    const qPool=EXPR_EQ_EXAMPLES.filter(s=>s.type==="equation");
    items=[...shuffle(ePool).slice(0,2),...shuffle(qPool).slice(0,2),randChoice(EXPR_EQ_EXAMPLES)];
    items=shuffle(items);
  }
  return {
    type:"expr-or-equation", items,
    answer:JSON.stringify(items.map(i=>i.type)),
    displayAnswer:items.map(i=>`${i.text}: ${i.type}`).join(", "),
    prompt:"For each, select Expression or Equation.",
  };
}

export function gradeExprOrEquation(input, question) {
  try {
    const ans=JSON.parse(input);
    const correct=JSON.parse(question.answer);
    return ans.every((a,i)=>a===correct[i]);
  } catch { return false; }
}

// - Topic 1: Identifying Solutions -
export function genIdentifySolutions() {
  const isQuadratic=Math.random()<0.5;
  if(isQuadratic){
    // Two nonzero integer roots r1, r2 between -5 and 5
    let r1,r2;
    do{ r1=randInt(-5,5); r2=randInt(-5,5); }while(r1===0||r2===0||r1===r2);
    // (x-r1)(x-r2) = x^2 - (r1+r2)x + r1*r2
    const b=-(r1+r2), c=r1*r2;
    const bStr=b===0?"":b>0?`+ ${b}x`:`- ${Math.abs(b)}x`;
    const cStr=c===0?"":c>0?`+ ${c}`:`- ${Math.abs(c)}`;
    const latex=`x^2 ${bStr} ${cStr} = 0`;
    const options=shuffle([-5,-4,-3,-2,-1,1,2,3,4,5]);
    const answers=options.map(o=>({value:o, isSolution:o===r1||o===r2}));
    return {
      type:"identify-solutions", equationType:"quadratic",
      latex, roots:[r1,r2], options:answers,
      answer:JSON.stringify(answers.map(a=>a.isSolution)),
      displayAnswer:`x = ${r1} and x = ${r2}`,
      prompt:"Select whether each value is a solution or not a solution.",
    };
  } else {
    // Cubic: three nonzero roots between -3 and 3
    let roots;
    do{
      const pool=shuffle([-3,-2,-1,1,2,3]);
      roots=[pool[0],pool[1],pool[2]];
    }while(new Set(roots).size!==3);
    // x^3 - (r1+r2+r3)x^2 + (r1r2+r1r3+r2r3)x - r1r2r3
    const [r1,r2,r3]=roots;
    const a=-(r1+r2+r3);
    const b=r1*r2+r1*r3+r2*r3;
    const c=-(r1*r2*r3);
    const fmt=(coeff,varStr)=>{
      if(coeff===0) return "";
      if(coeff===1) return `+ ${varStr}`;
      if(coeff===-1) return `- ${varStr}`;
      return coeff>0?`+ ${coeff}${varStr}`:`- ${Math.abs(coeff)}${varStr}`;
    };
    const latex=`x^3 ${fmt(a,"x^2")} ${fmt(b,"x")} ${c===0?"":c>0?`+ ${c}`:`- ${Math.abs(c)}`} = 0`;
    const options=shuffle([-3,-2,-1,1,2,3]);
    const answers=options.map(o=>({value:o, isSolution:roots.includes(o)}));
    return {
      type:"identify-solutions", equationType:"cubic",
      latex, roots, options:answers,
      answer:JSON.stringify(answers.map(a=>a.isSolution)),
      displayAnswer:`x = ${roots.join(", ")}`,
      prompt:"Select whether each value is a solution or not a solution.",
    };
  }
}

export function gradeIdentifySolutions(input, question) {
  try {
    const ans=JSON.parse(input);
    const correct=JSON.parse(question.answer);
    return ans.every((a,i)=>a===correct[i]);
  } catch { return false; }
}

// - Topic 1: Solving One-Step Equations -
export function genOneStepEquation() {
  const form=randChoice(["add","sub","mul","div"]);
  let latex, solution, latexSolution;

  if(form==="add"){
    // x + a = b  =>  x = b - a
    const a=(Math.random()<0.4?-1:1)*randInt(1,12);
    const x=(Math.random()<0.4?-1:1)*randInt(1,12);
    const b=x+a;
    const aStr=a>=0?`+ ${a}`:`- ${Math.abs(a)}`;
    latex=`x ${aStr} = ${b}`;
    solution=x;
  } else if(form==="sub"){
    // x - a = b  =>  x = b + a
    const a=randInt(1,12);
    const x=(Math.random()<0.4?-1:1)*randInt(1,12);
    const b=x-a;
    latex=`x - ${a} = ${b}`;
    solution=x;
  } else if(form==="mul"){
    // ax = b  =>  x = b/a, |a| <= 8
    const a=(Math.random()<0.4?-1:1)*randInt(2,8);
    const x=(Math.random()<0.4?-1:1)*randInt(1,9);
    const b=a*x;
    latex=`${a}x = ${b}`;
    solution=x;
  } else {
    // x/a = b  =>  x = ab, |a| <= 8
    const a=(Math.random()<0.4?-1:1)*randInt(2,8);
    const b=(Math.random()<0.4?-1:1)*randInt(1,8);
    const x=a*b;
    const aStr=a<0?`(${a})`:String(a);
    latex=`\\dfrac{x}{${aStr}} = ${b}`;
    solution=x;
  }

  return {
    type:"one-step-eq", form, latex, solution,
    answer:String(solution), displayAnswer:`x = ${solution}`,
    prompt:"Solve for x. Enter your answer as a number.",
  };
}

export function gradeOneStepEquation(input, question) {
  return parseInt(String(input).replace(/\s/g,""),10)===question.solution;
}

// - Topic 1: Solving -x = integer -
export function genNegX() {
  const a=(Math.random()<0.4?-1:1)*randInt(1,12);
  // -x = a  =>  x = -a
  return {
    type:"neg-x",
    latex:`-x = ${a}`,
    solution:-a,
    answer:String(-a), displayAnswer:`x = ${-a}`,
    prompt:"Solve for x. Enter your answer as a number.",
  };
}

export function gradeNegX(input, question) {
  return parseInt(String(input).replace(/\s/g,""),10)===question.solution;
}

// - Topic 2: d = s - t helpers -
// Constraints: all positive ints, products <= 72, divisors <= 8, integer quotient
function genDST() {
  // s in 1-8, t in 1-8, d = s*t <= 72
  const s=randInt(1,8), t=randInt(1,8);
  const d=s*t;
  return {d,s,t};
}

const UNITS_DIST=["miles","feet","inches","yards"];
const UNITS_TIME=["seconds","minutes","hours"];
const UNITS_SPEED=["miles per hour","feet per second","inches per second","yards per minute"];

// - Topic 2: Identify correct formula -
export function genIdentifyFormula() {
  const {d,s,t}=genDST();
  const unit=randChoice(["distance","speed","time"]);
  const problems=shuffle([
    {ask:"distance", given:`speed = ${s}, time = ${t}`, correct:"Multiply"},
    {ask:"speed",    given:`distance = ${d}, time = ${t}`, correct:"Divide"},
    {ask:"time",     given:`distance = ${d}, speed = ${s}`, correct:"Divide"},
  ]);
  return {
    type:"identify-formula", problems,
    answer:JSON.stringify(problems.map(p=>p.correct)),
    displayAnswer:problems.map(p=>`Find ${p.ask}: ${p.correct}`).join(", "),
    prompt:"For each problem, select Multiply or Divide - no numbers needed yet.",
  };
}

export function gradeIdentifyFormula(input, question) {
  try {
    const ans=JSON.parse(input);
    const correct=JSON.parse(question.answer);
    return ans.every((a,i)=>a===correct[i]);
  } catch { return false; }
}

// - Topic 2: Solve for Distance (with optional conversion) -
export function genSolveDistance() {
  const {d,s,t}=genDST();
  const convert=Math.random()<0.5;
  if(convert){
    // Give speed in feet/sec, ask for inches
    const dFeet=d, dInches=d*12;
    return {
      type:"solve-distance",
      prompt:`A vehicle travels at ${s} feet per second for ${t} seconds. How many inches does it travel?`,
      latex:`${s} \\text{ ft/s} \\times ${t} \\text{ s} = ? \\text{ inches}`,
      answer:String(dInches), displayAnswer:String(dInches)+" inches",
      solution:dInches, needsConversion:true,
      workingHint:`${s} - ${t} = ${dFeet} feet = ${dFeet} - 12 = ${dInches} inches`,
    };
  } else {
    return {
      type:"solve-distance",
      prompt:`A vehicle travels at ${s} miles per hour for ${t} hours. How many miles does it travel?`,
      latex:`${s} \\times ${t} = ?`,
      answer:String(d), displayAnswer:String(d)+" miles",
      solution:d, needsConversion:false,
      workingHint:`${s} - ${t} = ${d}`,
    };
  }
}

export function gradeSolveDistance(input, question) {
  return parseInt(String(input).replace(/\s/g,""),10)===question.solution;
}

// - Topic 2: Solve for Speed -
export function genSolveSpeed() {
  const {d,s,t}=genDST();
  const convert=Math.random()<0.5;
  if(convert){
    // Give distance in feet, ask for speed in inches/sec
    const dFeet=d, dInches=d*12, sInches=s*12;
    return {
      type:"solve-speed",
      prompt:`A vehicle travels ${dFeet} feet in ${t} seconds. What is its speed in inches per second?`,
      answer:String(sInches), displayAnswer:String(sInches)+" inches/sec",
      solution:sInches, needsConversion:true,
      workingHint:`${dFeet} ft = ${dInches} inches; ${dInches} - ${t} = ${sInches} in/s`,
    };
  } else {
    return {
      type:"solve-speed",
      prompt:`A vehicle travels ${d} miles in ${t} hours. What is its speed in miles per hour?`,
      answer:String(s), displayAnswer:String(s)+" mph",
      solution:s, needsConversion:false,
      workingHint:`${d} - ${t} = ${s}`,
    };
  }
}

export function gradeSolveSpeed(input, question) {
  return parseInt(String(input).replace(/\s/g,""),10)===question.solution;
}

// - Topic 2: Solve for Time -
export function genSolveTime() {
  const {d,s,t}=genDST();
  const convert=Math.random()<0.5;
  if(convert){
    // Give distance in inches, speed in feet/sec, ask for time
    const dInches=d*12;
    return {
      type:"solve-time",
      prompt:`A vehicle travels ${dInches} inches at ${s} feet per second. How many seconds does it take?`,
      answer:String(t), displayAnswer:String(t)+" seconds",
      solution:t, needsConversion:true,
      workingHint:`${dInches} inches = ${d} feet; ${d} - ${s} = ${t} seconds`,
    };
  } else {
    return {
      type:"solve-time",
      prompt:`A vehicle travels ${d} miles at ${s} miles per hour. How many hours does it take?`,
      answer:String(t), displayAnswer:String(t)+" hours",
      solution:t, needsConversion:false,
      workingHint:`${d} - ${s} = ${t}`,
    };
  }
}

export function gradeSolveTime(input, question) {
  return parseInt(String(input).replace(/\s/g,""),10)===question.solution;
}

// - Topic 2: Mixed (3 simultaneous) -
export function genMixedDST() {
  const dQ=genSolveDistance();
  const sQ=genSolveSpeed();
  const tQ=genSolveTime();
  const problems=[dQ,sQ,tQ];
  return {
    type:"mixed-dst", problems,
    answer:JSON.stringify(problems.map(p=>p.solution)),
    displayAnswer:problems.map(p=>p.displayAnswer).join(", "),
    prompt:"Solve each problem. Enter a number for each.",
  };
}

export function gradeMixedDST(input, question) {
  try {
    const ans=JSON.parse(input);
    const correct=JSON.parse(question.answer);
    return ans.every((a,i)=>parseInt(String(a),10)===correct[i]);
  } catch { return false; }
}

// - Topic registry -
export const LESSON08_TOPICS=[
  {id:"warmup-a",          label:"Warm-up: Nested OoO",           description:"Order of operations with nested parentheses"},
  {id:"warmup-b",          label:"Warm-up: Composite Shapes",     description:"Perimeter and area, 2 missing sides"},
  {id:"expr-or-equation",  label:"Expression or Equation",        description:"5 items, classify each"},
  {id:"identify-solutions",label:"Identifying Solutions",         description:"Quadratic or cubic, select solutions"},
  {id:"one-step-eq",       label:"Solving One-Step Equations",    description:"x+a=b, ax=b, x/a=b forms"},
  {id:"neg-x",             label:"Solving -x = integer",          description:"-x = a, find x"},
  {id:"identify-formula",  label:"Identify Correct Formula",      description:"Multiply or Divide for d, s, t"},
  {id:"solve-distance",    label:"Solve for Distance",            description:"d = s-t with optional conversion"},
  {id:"solve-speed",       label:"Solve for Speed",               description:"s = d/t with optional conversion"},
  {id:"solve-time",        label:"Solve for Time",                description:"t = d/s with optional conversion"},
  {id:"mixed-dst",         label:"Mixed d=st Problems",           description:"3 simultaneous, one of each type"},
];

export function generateLesson08Question(topicId){
  switch(topicId){
    case "warmup-a":          return genWarmupA();
    case "warmup-b":          return genWarmupB();
    case "expr-or-equation":  return genExprOrEquation();
    case "identify-solutions":return genIdentifySolutions();
    case "one-step-eq":       return genOneStepEquation();
    case "neg-x":             return genNegX();
    case "identify-formula":  return genIdentifyFormula();
    case "solve-distance":    return genSolveDistance();
    case "solve-speed":       return genSolveSpeed();
    case "solve-time":        return genSolveTime();
    case "mixed-dst":         return genMixedDST();
    default:                  return genOneStepEquation();
  }
}

export function gradeLesson08Answer(input, question){
  if(!input||!question) return false;
  switch(question.type){
    case "warmup-a":          return gradeWarmupA(input,question);
    case "warmup-b":          return gradeWarmupB(input,question);
    case "expr-or-equation":  return gradeExprOrEquation(input,question);
    case "identify-solutions":return gradeIdentifySolutions(input,question);
    case "one-step-eq":       return gradeOneStepEquation(input,question);
    case "neg-x":             return gradeNegX(input,question);
    case "identify-formula":  return gradeIdentifyFormula(input,question);
    case "solve-distance":    return gradeSolveDistance(input,question);
    case "solve-speed":       return gradeSolveSpeed(input,question);
    case "solve-time":        return gradeSolveTime(input,question);
    case "mixed-dst":         return gradeMixedDST(input,question);
    default: return false;
  }
}
