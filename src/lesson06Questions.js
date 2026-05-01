// Lesson 6 - Multiple Signed Numbers, Distributive Property, Like Terms, Product Rule

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randChoice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// - Warm-up A: Composite Shape (same as L4 warmup-a but perimeter+area only) -
function mulOk(a, b) {
  return !(Math.max(...String(a).split("").map(Number)) > 3 &&
           Math.max(...String(b).split("").map(Number)) > 3);
}
function genLShape() {
  let W, H, cw, ch, attempts = 0;
  do {
    W = randInt(30, 70); H = randInt(30, 70);
    cw = randInt(10, W-15); ch = randInt(10, H-15);
    attempts++;
  } while (attempts < 200 && (!mulOk(W, H-ch) || !mulOk(W-cw, ch)));
  const area = W*(H-ch) + (W-cw)*ch;
  const sides = [
    { length:W,dir:"h" },{ length:H-ch,dir:"v" },
    { length:cw,dir:"h" },{ length:ch,dir:"v" },
    { length:W-cw,dir:"h" },{ length:H,dir:"v" },
  ];
  const perimeter = sides.reduce((s,x)=>s+x.length,0);
  const scale=2.5;
  const vertices=[
    {x:0,y:H*scale},{x:W*scale,y:H*scale},{x:W*scale,y:ch*scale},
    {x:(W-cw)*scale,y:ch*scale},{x:(W-cw)*scale,y:0},{x:0,y:0},
  ];
  return { shape:"L",W,H,cw,ch,sides,vertices,area,perimeter,
    splitExplanation:W+"x"+(H-ch)+"+"+(W-cw)+"x"+ch+"="+(W*(H-ch))+"+"+((W-cw)*ch)+"="+area };
}
function genTShape() {
  let W,bh,sh,tw,stemLeft,attempts=0;
  do {
    W=randInt(40,70);bh=randInt(15,30);sh=randInt(20,40);
    tw=randInt(15,W-25);stemLeft=randInt(10,W-tw-10);
    attempts++;
  } while (attempts<200&&(!mulOk(W,bh)||!mulOk(tw,sh)));
  const area=W*bh+tw*sh;
  const sides=[
    {length:W,dir:"h"},{length:bh,dir:"v"},
    {length:W-stemLeft-tw,dir:"h"},{length:sh,dir:"v"},
    {length:tw,dir:"h"},{length:sh,dir:"v"},
    {length:stemLeft,dir:"h"},{length:bh,dir:"v"},
  ];
  const perimeter=sides.reduce((s,x)=>s+x.length,0);
  const H=bh+sh;const scale=2.5;
  const vertices=[
    {x:0,y:H*scale},{x:W*scale,y:H*scale},{x:W*scale,y:sh*scale},
    {x:(stemLeft+tw)*scale,y:sh*scale},{x:(stemLeft+tw)*scale,y:0},
    {x:stemLeft*scale,y:0},{x:stemLeft*scale,y:sh*scale},{x:0,y:sh*scale},
  ];
  return { shape:"T",W,H,bh,sh,tw,stemLeft,sides,vertices,area,perimeter,
    splitExplanation:W+"x"+bh+"+"+tw+"x"+sh+"="+(W*bh)+"+"+(tw*sh)+"="+area };
}
function genUShape() {
  let W,H,lw,rw,ch,attempts=0;
  do {
    W=randInt(40,70);H=randInt(40,70);
    lw=randInt(10,20);rw=randInt(10,20);ch=randInt(15,H-15);
    attempts++;
  } while (attempts<200&&(!mulOk(lw,H)||!mulOk(rw,H)||!mulOk(W-lw-rw,H-ch)));
  const stripH=H-ch;
  const area=lw*H+rw*H+(W-lw-rw)*stripH;
  const sides=[
    {length:W,dir:"h"},{length:H,dir:"v"},{length:rw,dir:"h"},{length:ch,dir:"v"},
    {length:W-lw-rw,dir:"h"},{length:ch,dir:"v"},{length:lw,dir:"h"},{length:H,dir:"v"},
  ];
  const perimeter=sides.reduce((s,x)=>s+x.length,0);
  const scale=2;
  const vertices=[
    {x:0,y:H*scale},{x:W*scale,y:H*scale},{x:W*scale,y:0},{x:(W-rw)*scale,y:0},
    {x:(W-rw)*scale,y:ch*scale},{x:lw*scale,y:ch*scale},{x:lw*scale,y:0},{x:0,y:0},
  ];
  return { shape:"U",W,H,lw,rw,ch,stripH,sides,vertices,area,perimeter,
    splitExplanation:lw+"x"+H+"="+lw*H+", "+rw+"x"+H+"="+rw*H+", "+(W-lw-rw)+"x"+stripH+"="+(W-lw-rw)*stripH+" => "+area };
}

export function genWarmupA() {
  const shape=randChoice(["L","T","U"]);
  const unit=randChoice(["ft","yd","cm","m"]);
  const shapeData=shape==="L"?genLShape():shape==="T"?genTShape():genUShape();
  const { sides,perimeter,area,vertices }=shapeData;
  let hideIndices=shape==="L"?[2,3]:shape==="T"?[2,3]:[3,4];
  const missingAnswers=hideIndices.map(i=>({ idx:i,length:sides[i].length,dir:sides[i].dir }));
  return {
    type:"warmup-a",...shapeData,unit,hideIndices,missingAnswers,
    answer:JSON.stringify({ perimeter,area }),
    displayAnswer:"Perimeter: "+perimeter+unit+", Area: "+area+" sq "+unit,
    prompt:"Find the two missing sides, then the perimeter and area.",
  };
}

export function gradeWarmupA(input, question) {
  try {
    const ans=JSON.parse(input);
    return parseInt(ans.perimeter)===question.perimeter && parseInt(ans.area)===question.area;
  } catch { return false; }
}

// - Warm-up B: Order of Operations 3 ops (updated constraints) -
function evalOp(op,a,b) {
  switch(op) {
    case "+": return a+b;
    case "-": return a-b;
    case "*": return a*b;
    case "/": return b===0?null:Number.isInteger(a/b)?a/b:null;
    case "^": return Math.pow(a,b);
    default: return null;
  }
}
function evalWithPrecedence(tokens) {
  let nums=[...tokens.filter((_,i)=>i%2===0)];
  let ops=[...tokens.filter((_,i)=>i%2===1)];
  let i=0;
  while(i<ops.length) {
    if(ops[i]==="*"||ops[i]==="/") {
      const r=evalOp(ops[i],nums[i],nums[i+1]);
      if(r===null||!Number.isInteger(r)||r<0) return null;
      nums.splice(i,2,r); ops.splice(i,1);
    } else i++;
  }
  let result=nums[0];
  for(let j=0;j<ops.length;j++) {
    result=evalOp(ops[j],result,nums[j+1]);
    if(result===null||!Number.isInteger(result)||result<0) return null;
  }
  if(result===null||!Number.isInteger(result)||result<0||result>1000) return null;
  return result;
}
function latexOp(op) {
  if(op==="*") return "\\times";
  if(op==="/") return "\\div";
  return op;
}
function latexPair(a,op,b) {
  if(op==="^") return a+"^{"+b+"}";
  if(op==="/") return "\\dfrac{"+a+"}{"+b+"}";
  if(op==="*") return a+" \\times "+b;
  return a+" "+op+" "+b;
}

export function genWarmupB() {
  // Updated constraints: mul - only ONE factor may have digit >6; div - divisor <=6; same power/root as L4
  for(let attempt=0;attempt<300;attempt++) {
    const allOps=["+","-","*","/"];
    const op1=randChoice(allOps),op2=randChoice(allOps),op3=randChoice(allOps);
    const allOpsArr=[op1,op2,op3];
    const hasAddSub=allOpsArr.some(o=>o==="+"||o==="-");
    const hasMulDiv=allOpsArr.some(o=>o==="*"||o==="/");
    if(!hasAddSub||!hasMulDiv) continue;

    let a,b,c,d;
    // Generate operands with updated constraints
    a=randInt(2,9);
    b=op1==="*"?randInt(2,6):op1==="/"?randInt(2,6):randInt(2,9);
    c=op2==="*"?randInt(2,6):op2==="/"?randInt(2,6):randInt(2,9);
    d=op3==="*"?randInt(2,6):op3==="/"?randInt(2,6):randInt(2,9);

    // Mul constraint: only one factor may have digit >6
    if(op1==="*"&&Math.max(a,b)>6&&Math.min(a,b)>6) continue;
    if(op2==="*"&&Math.max(b,c)>6&&Math.min(b,c)>6) continue; // approximate
    if(op3==="*"&&Math.max(c,d)>6&&Math.min(c,d)>6) continue;
    // Div constraints
    if(op1==="/"&&(b>6||b===1)) continue;
    if(op2==="/"&&(c>6||c===1)) continue;
    if(op3==="/"&&(d>6||d===1)) continue;
    // No trivial ops
    if(op1==="*"&&(a===1||b===1)) continue;
    if(op2==="*"&&(b===1||c===1)) continue;
    if(op3==="*"&&(c===1||d===1)) continue;
    if(op1==="^"&&b===1) continue;

    const result=evalWithPrecedence([a,op1,b,op2,c,op3,d]);
    if(result===null) continue;

    const latex=latexPair(a,op1,b)+" "+latexOp(op2)+" "+c+" "+latexOp(op3)+" "+d;
    return {
      type:"warmup-b",latex,result,
      answer:String(result),displayAnswer:String(result),isUndefined:false,
      prompt:"Evaluate using the correct order of operations.",
    };
  }
  return { type:"warmup-b",latex:"3 + 2 \\times 4 - 5",result:6,answer:"6",displayAnswer:"6",isUndefined:false,prompt:"Evaluate using the correct order of operations." };
}

export function gradeWarmupB(input,question) {
  return parseInt(input.replace(/,/g,""),10)===question.result;
}

// - Warm-up C: Adding/Subtracting Signed Numbers (at least one negative) -
export function genWarmupC() {
  const TYPES=[
    { n1Neg:false,n2Neg:true,sub:false },  // a+(-b)
    { n1Neg:true,n2Neg:false,sub:false },   // -a+b
    { n1Neg:true,n2Neg:true,sub:false },    // -a+(-b)
    { n1Neg:false,n2Neg:false,sub:true },   // a-b
    { n1Neg:false,n2Neg:true,sub:true },    // a-(-b)
    { n1Neg:true,n2Neg:false,sub:true },    // -a-b
    { n1Neg:true,n2Neg:true,sub:true },     // -a-(-b)
  ];
  const t=randChoice(TYPES);
  let a,b;
  do { a=randInt(1,20); b=randInt(1,20); } while(a===b);
  const v1=t.n1Neg?-a:a;
  const v2=t.n2Neg?-b:b;
  const result=t.sub?v1-v2:v1+v2;
  const makeLatex=(n1Neg,n2Neg,subtract,a,b)=>{
    const n1=n1Neg?"-"+a:String(a);
    const n2str=n2Neg?"(-"+b+")":String(b);
    return n1+(subtract?" - ":" + ")+n2str;
  };
  const latex=makeLatex(t.n1Neg,t.n2Neg,t.sub,a,b);
  return {
    type:"warmup-c",v1,v2,result,latex,
    answer:String(result),displayAnswer:String(result),
    prompt:"Calculate. Enter the result (include minus sign if negative).",
  };
}

export function gradeWarmupC(input,question) {
  return parseInt(input.replace(/\s/g,""),10)===question.result;
}

// - Topic 1: Multiple Signed Numbers -
export function genMultipleSigned() {
  const count=randInt(4,6);
  let nums=[];
  // Ensure at least one positive and one negative
  for(let i=0;i<count;i++) {
    const sign=Math.random()<0.5?1:-1;
    nums.push(sign*randInt(1,50));
  }
  if(nums.every(n=>n>0)) nums[randInt(0,count-1)]*=-1;
  if(nums.every(n=>n<0)) nums[randInt(0,count-1)]*=-1;
  const result=nums.reduce((s,n)=>s+n,0);
  // Build expression: nums[0] + nums[1] + ... (using + for positive, - for negative using subtraction)
  let latex=nums[0]<0?"(-"+Math.abs(nums[0])+")":String(nums[0]);
  for(let i=1;i<nums.length;i++) {
    if(nums[i]<0) latex+=" + (-"+Math.abs(nums[i])+")";
    else latex+=" + "+nums[i];
  }
  return {
    type:"multiple-signed",nums,result,latex,
    answer:String(result),displayAnswer:String(result),
    prompt:"Calculate the sum. Enter the result.",
  };
}

export function gradeMultipleSigned(input,question) {
  return parseInt(input.replace(/\s/g,""),10)===question.result;
}

// - Topic 2: Distributive Property - vary coefficients 2-9, keep signs -
export function genDistributive(problemIdx) {
  const a=randInt(2,9), b=randInt(2,9), c=randInt(2,9), d=randInt(2,9), e=randInt(2,9);
  let display,latex,answer;
  if (problemIdx===0) {
    // a(bx+c) => abx+ac
    display=a+"("+b+"x+"+c+")";
    latex=a+"("+b+"x+"+c+")";
    answer=(a*b)+"x+"+(a*c);
  } else if (problemIdx===1) {
    // (bx+c)a => abx+ac
    display="("+b+"x+"+c+")"+a;
    latex="("+b+"x+"+c+")"+a;
    answer=(a*b)+"x+"+(a*c);
  } else if (problemIdx===2) {
    // a(bx-c) => abx-ac
    display=a+"("+b+"x-"+c+")";
    latex=a+"("+b+"x-"+c+")";
    answer=(a*b)+"x-"+(a*c);
  } else if (problemIdx===3) {
    // -a(bx-c) => -abx+ac
    display="-"+a+"("+b+"x-"+c+")";
    latex="-"+a+"("+b+"x-"+c+")";
    answer="-"+(a*b)+"x+"+(a*c);
  } else if (problemIdx===4) {
    // -(bx-c) => -bx+c
    display="-("+b+"x-"+c+")";
    latex="-("+b+"x-"+c+")";
    answer="-"+b+"x+"+c;
  } else {
    // a(bx-cy-d) => abx-acy-ad
    display=a+"("+b+"x-"+c+"y-"+d+")";
    latex=a+"("+b+"x-"+c+"y-"+d+")";
    answer=(a*b)+"x-"+(a*c)+"y-"+(a*d);
  }
  return {
    type:"distributive",problemIdx,display,latex,answer,
    latexAnswer:answer,displayAnswer:answer,
    prompt:"Expand the expression.",
  };
}

// Normalize an algebraic expression for comparison
// Rules: ignore extra spaces, accept different term order, 1x=x, -1x=-x
function normalizeExpr(str) {
  let s = str.trim().toLowerCase().replace(/\s+/g, "");
  const terms = [];
  let i = 0;
  while (i < s.length) {
    let sign = 1;
    if (s[i] === "+") { i++; }
    else if (s[i] === "-") { sign = -1; i++; }
    // parse coefficient
    let coeff = "";
    while (i < s.length && /\d/.test(s[i])) { coeff += s[i]; i++; }
    // parse variable part
    let varPart = "";
    while (i < s.length && /[a-z\^0-9]/.test(s[i])) {
      // handle x^n notation
      if (s[i] === "^") { i++; let exp=""; while(i<s.length&&/\d/.test(s[i])){exp+=s[i];i++;} varPart+="^"+exp; }
      else { varPart += s[i]; i++; }
    }
    if (coeff === "" && varPart === "") { i++; continue; } // skip unexpected char
    const c = (coeff === "" ? 1 : parseInt(coeff)) * sign;
    const v = varPart;
    terms.push({ c, v });
  }
  return terms.sort((a, b) => a.v.localeCompare(b.v) || a.c - b.c);
}

function termsEqual(a,b) {
  if(a.length!==b.length) return false;
  // Sort both by var then coeff
  const sa=[...a].sort((x,y)=>x.v.localeCompare(y.v)||x.c-y.c);
  const sb=[...b].sort((x,y)=>x.v.localeCompare(y.v)||x.c-y.c);
  return sa.every((t,i)=>t.c===sb[i].c&&t.v===sb[i].v);
}

export function gradeDistributive(input,question) {
  try {
    const studentTerms=normalizeExpr(input);
    const correctTerms=normalizeExpr(question.answer);
    return termsEqual(studentTerms,correctTerms);
  } catch { return false; }
}

// - Topic 3: Combining Like Terms -
// Activities 2-5: Combining like terms - varied coefficients
export function genCombineLikeTerms(actIdx) {
  const r=()=>randInt(2,9);
  const rn=()=>(Math.random()<0.3?-1:1)*randInt(2,9); // occasionally negative
  let latex,answer;

  if (actIdx===0) {
    // 3 terms, one pair to combine: ax + by + cx = (a+c)x + by
    const a=r(),b=r(),c=r();
    const ac=a+c;
    latex=a+"x + "+b+"y + "+c+"x";
    answer=ac+"x+"+b+"y";
  } else if (actIdx===1) {
    // 4 terms, two pairs, one cancels: ax + by - ax + cy = (b+c)y or similar
    const a=r(),b=r(),c=r();
    // Ensure one pair cancels: ax - ax = 0
    latex=a+"a + "+b+"b - "+a+"a + "+c+"b";
    answer=(b+c)+"b";
  } else if (actIdx===2) {
    // 5 terms, two pairs to combine: ax+by+cx+dy+e
    const a=r(),b=r(),c=r(),d=r(),e=r();
    latex=a+"x + "+b+"y + "+c+"x + "+d+"y + "+e;
    answer=(a+c)+"x+"+(b+d)+"y+"+e;
  } else {
    // Distribute + combine: a(bx+c)+d or a(bx-c)-(dx-e)
    const type=Math.random()<0.5?'A':'B';
    if (type==='A') {
      const a=r(),b=r(),c=r(),d=r();
      latex=a+"("+b+"x+"+c+")+"+d;
      answer=(a*b)+"x+"+(a*c+d);
    } else {
      const a=r(),b=r(),c=r(),d=r(),e=r();
      // a(bx-c)-(dx-e) = abx-ac-dx+e = (ab-d)x+(e-ac)
      const xCoeff=a*b-d;
      const constCoeff=e-a*c;
      latex=a+"("+b+"x-"+c+")-("+d+"x-"+e+")";
      const xPart=xCoeff===0?"":(xCoeff===1?"x":xCoeff==="-1"?"-x":xCoeff+"x");
      const constPart=constCoeff===0?"":constCoeff>0?(xPart?"+"+constCoeff:String(constCoeff)):String(constCoeff);
      answer=(xPart+constPart)||"0";
    }
  }
  return {
    type:"combine-like-terms",actIdx,latex,answer,
    latexAnswer:answer,displayAnswer:answer,
    prompt:"Simplify by combining like terms.",
  };
}

export function gradeCombineLikeTerms(input,question) {
  return gradeDistributive(input,question); // same normalizer handles any order
}

// - Topic 4: Product Rule -
export function genProductRule() {
  const a=randInt(1,9),b=randInt(1,9);
  const m=randInt(1,9),n=randInt(1,9);
  const coeff=a*b;
  const exp=m+n;
  // LaTeX: ax^m \cdot bx^n
  const aStr=a===1?"":String(a);
  const bStr=b===1?"":String(b);
  const mStr=m===1?"x":"x^{"+m+"}";
  const nStr=n===1?"x":"x^{"+n+"}";
  const latex=aStr+mStr+" \\cdot "+bStr+nStr;
  // Answer: coeffx^exp
  const coeffStr=coeff===1?"":String(coeff);
  const expStr=exp===1?"x":"x^{"+exp+"}";
  const answer=(coeff===1?"":String(coeff))+"x"+(exp===1?"":"^"+exp);
  const latexAnswer=coeffStr+expStr;
  return {
    type:"product-rule",a,b,m,n,coeff,exp,
    latex,latexAnswer,
    answer, // normalizable form
    displayAnswer:latexAnswer,
    prompt:"Simplify using the product rule. Enter your answer.",
  };
}

export function gradeProductRule(input,question) {
  // Normalize: remove spaces, accept x=x^1, 1x=x
  const norm=(s)=>{
    let t=s.trim().toLowerCase().replace(/\s+/g,"");
    // Normalize 1x^n -> x^n
    t=t.replace(/^1x/,"x");
    // Normalize x^1 -> x
    t=t.replace(/x\^1\b/,"x");
    // Normalize x^1 at end
    t=t.replace(/x\^1$/,"x");
    return t;
  };
  return norm(input)===norm(question.answer);
}

// - Like Terms Identify (after product rule) -
// 6 terms: 2 with same single variable, 2 with same 2-var combo (different order), 2 with same coeff but different var
const SINGLE_VARS = ["x","y","z","a","b","n","m"];
const DOUBLE_VARS = [["u","v"],["x","y"],["a","b"],["m","n"],["p","q"]];


export const LESSON06_TOPICS=[
  { id:"warmup-a",       label:"Warm-up: Composite Shape",        description:"Perimeter + area, 2 missing sides" },
  { id:"warmup-b",       label:"Warm-up: Order of Operations",    description:"3 operations, updated constraints" },
  { id:"warmup-c",       label:"Warm-up: Signed Numbers",         description:"Two signed numbers, at least one negative" },
  { id:"multiple-signed",label:"Multiple Signed Numbers",          description:"4-6 numbers, free response" },
  { id:"distributive-0", label:"Distributive: 2(3x+1)",           description:"Problem 1 of 6" },
  { id:"distributive-1", label:"Distributive: (3x+1)2",           description:"Problem 2 of 6" },
  { id:"distributive-2", label:"Distributive: 2(3x-1)",           description:"Problem 3 of 6" },
  { id:"distributive-3", label:"Distributive: -2(3x-1)",          description:"Problem 4 of 6" },
  { id:"distributive-4", label:"Distributive: -(3x-1)",           description:"Problem 5 of 6" },
  { id:"distributive-5", label:"Distributive: 2(3x-4y-6)",        description:"Problem 6 of 6" },
  { id:"combine-2",      label:"Like Terms: Combine (3 terms)",   description:"One pair to combine" },
  { id:"combine-3",      label:"Like Terms: Combine (4 terms)",   description:"Two pairs, one cancels" },
  { id:"combine-4",      label:"Like Terms: Combine (5 terms)",   description:"Two pairs to combine" },
  { id:"combine-5",      label:"Like Terms: Distribute+Combine",  description:"With distribution" },
  { id:"product-rule",   label:"Product Rule",                    description:"ax^m * bx^n" },
];

export function generateLesson06Question(topicId) {
  if(topicId==="warmup-a") return genWarmupA();
  if(topicId==="warmup-b") return genWarmupB();
  if(topicId==="warmup-c") return genWarmupC();
  if(topicId==="multiple-signed") return genMultipleSigned();
  if(topicId.startsWith("distributive-")) return genDistributive(parseInt(topicId.split("-")[1]));
  if(topicId==="combine-2") return genCombineLikeTerms(0);
  if(topicId==="combine-3") return genCombineLikeTerms(1);
  if(topicId==="combine-4") return genCombineLikeTerms(2);
  if(topicId==="combine-5") return genCombineLikeTerms(3);
  if(topicId==="product-rule") return genProductRule();
  return genMultipleSigned();
}

export function gradeLesson06Answer(input,question) {
  if(!input||!question) return false;
  switch(question.type) {
    case "warmup-a":        return gradeWarmupA(input,question);
    case "warmup-b":        return gradeWarmupB(input,question);
    case "warmup-c":        return gradeWarmupC(input,question);
    case "multiple-signed": return gradeMultipleSigned(input,question);
    case "distributive":    return gradeDistributive(input,question);
    case "combine-like-terms":  return gradeCombineLikeTerms(input,question);
    case "product-rule":    return gradeProductRule(input,question);
    default: return false;
  }
}
