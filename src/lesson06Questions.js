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

// - Topic 2: Distributive Property -
const DISTRIBUTIVE_PROBLEMS=[
  { id:"d1", display:"2(3x+1)",   latex:"2(3x+1)",   answer:"6x+2" },
  { id:"d2", display:"(3x+1)2",   latex:"(3x+1)2",   answer:"6x+2" },
  { id:"d3", display:"2(3x-1)",   latex:"2(3x-1)",   answer:"6x-2" },
  { id:"d4", display:"-2(3x-1)",  latex:"-2(3x-1)",  answer:"-6x+2" },
  { id:"d5", display:"-(3x-1)",   latex:"-(3x-1)",   answer:"-3x+1" },
  { id:"d6", display:"2(3x-4y-6)",latex:"2(3x-4y-6)","answer":"6x-8y-12" },
];

export function genDistributive(problemIdx) {
  const p=DISTRIBUTIVE_PROBLEMS[problemIdx];
  return {
    type:"distributive",problemIdx,...p,
    prompt:"Expand the expression.",
  };
}

// Normalize an algebraic expression for comparison
// Rules: ignore extra spaces, accept different term order, 1x=x, -1x=-x
function normalizeExpr(str) {
  let s=str.trim().toLowerCase().replace(/\s+/g,"");
  // Parse into terms
  const terms=[];
  let i=0;
  while(i<s.length) {
    let sign=1;
    if(s[i]==="+") { i++; }
    else if(s[i]==="-") { sign=-1; i++; }
    else if(i>0) break;
    // Parse coefficient and variable
    let coeff="";
    while(i<s.length&&/\d/.test(s[i])) { coeff+=s[i]; i++; }
    let varPart="";
    while(i<s.length&&/[a-z]/.test(s[i])) { varPart+=s[i]; i++; }
    // Skip + between terms
    if(i<s.length&&s[i]==="+") i++;
    const c=(coeff===""?1:parseInt(coeff))*sign;
    const v=varPart.split("").sort().join(""); // sort variable letters
    terms.push({ c,v });
  }
  // Sort terms by variable part, then by coefficient
  terms.sort((a,b)=>a.v.localeCompare(b.v)||a.c-b.c);
  return terms.map(t=>({c:t.c,v:t.v}));
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
// Activity 1: Identifying like terms (click-to-group)
const LIKE_TERMS_SETS=[
  { terms:["3x","5y","7x","2z","9y","4z"],   groups:[["3x","7x"],["5y","9y"],["2z","4z"]], soloIndices:[] },
  { terms:["2x","4xy","6x","3y","8xy","5z"],  groups:[["2x","6x"],["4xy","8xy"]], soloIndices:[3,5] },
  { terms:["5a","3b","2a","7c","9b","4d"],    groups:[["5a","2a"],["3b","9b"]], soloIndices:[3,5] },
  { terms:["6x","4y","2x","8y","3z","5w"],    groups:[["6x","2x"],["4y","8y"]], soloIndices:[4,5] },
  { terms:["7ab","2c","5ab","4d","3c","6e"],  groups:[["7ab","5ab"],["2c","3c"]], soloIndices:[3,5] },
];

export function genLikeTermsIdentify() {
  const set=randChoice(LIKE_TERMS_SETS);
  const terms=shuffle([...set.terms]);
  // Remap groups to shuffled indices
  const groups=set.groups.map(g=>g.map(t=>terms.indexOf(t)));
  return {
    type:"like-terms-identify",terms,groups,
    answer:JSON.stringify(groups),
    displayAnswer:set.groups.map(g=>g.join(", ")).join(" | "),
    prompt:"Click terms to group like terms together. Use different colors for each group.",
  };
}

export function gradeLikeTermsIdentify(input,question) {
  try {
    const studentGroups=JSON.parse(input).map(g=>[...g].sort((a,b)=>a-b));
    const correctGroups=question.groups.map(g=>[...g].sort((a,b)=>a-b));
    // Each correct group must appear in student groups (order of groups doesn't matter)
    return correctGroups.every(cg=>studentGroups.some(sg=>sg.length===cg.length&&sg.every((v,i)=>v===cg[i])));
  } catch { return false; }
}

// Activities 2-5: Combining like terms
const COMBINE_PROBLEMS=[
  { id:"c2", latex:"3x + 5y + 2x",                       answer:"5x+5y" },
  { id:"c3", latex:"4a + 3b - 4a + 7b",                   answer:"10b" },
  { id:"c4", latex:"2x + 3y + 5x + 4y + 6",               answer:"7x+7y+6" },
  { id:"c5a",latex:"3(2x+5)+4",                           answer:"6x+19" },
  { id:"c5b",latex:"3(2x-7)-(5x-4)",                      answer:"x-17" },
];

export function genCombineLikeTerms(actIdx) {
  // actIdx 0=act2, 1=act3, 2=act4, 3=act5
  const problems=actIdx<3?[COMBINE_PROBLEMS[actIdx]]:COMBINE_PROBLEMS.slice(3);
  const p=randChoice(problems);
  return {
    type:"combine-like-terms",actIdx,...p,
    prompt:"Simplify by combining like terms.",
  };
}

export function gradeCombineLikeTerms(input,question) {
  return gradeDistributive(input,question); // same normalizer
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

// - Topic registry -
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
  { id:"like-terms-id",  label:"Like Terms: Identify",            description:"Click to group like terms" },
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
  if(topicId==="like-terms-id") return genLikeTermsIdentify();
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
    case "like-terms-identify": return gradeLikeTermsIdentify(input,question);
    case "combine-like-terms":  return gradeCombineLikeTerms(input,question);
    case "product-rule":    return gradeProductRule(input,question);
    default: return false;
  }
}
