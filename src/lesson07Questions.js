// Lesson 7 - Signed Multiplication/Division, Negative Powers, Roots, OoO

function randInt(min, max) { return Math.floor(Math.random()*(max-min+1))+min; }
function randChoice(arr) { return arr[Math.floor(Math.random()*arr.length)]; }
function shuffle(arr) { const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }

// - Warm-up A: Distributive simplification -
// Fixed: 4(x-2)-(3x-5) = 4x-8-3x+5 = x-3
export function genWarmupA() {
  // Vary coefficients each time
  const a=randInt(2,6), b=randInt(1,5), c=randInt(2,5), d=randInt(1,6);
  // a(x-b)-(cx-d) = ax-ab-cx+d = (a-c)x+(d-ab)
  const xCoeff=a-c, constant=d-a*b;
  let answer="";
  if(xCoeff===1) answer="x"; else if(xCoeff===-1) answer="-x"; else answer=xCoeff+"x";
  if(constant>0) answer+="+"+constant; else if(constant<0) answer+=constant;
  if(!answer||answer==="0") answer="0";
  const latex=a+"(x-"+b+")-("+c+"x-"+d+")";
  return {
    type:"warmup-a",latex,answer,displayAnswer:answer,
    prompt:"Simplify the expression.",
  };
}

// - Warm-up B: Exponential distributive -
// Fixed: 3x^2(5x^3-7x-2) = 15x^5-21x^3-6x^2
export function genWarmupB() {
  const a=randInt(2,5), m=randInt(2,3);
  const b=randInt(2,7), n=randInt(2,4);
  const c=randInt(2,7), p=randInt(1,2);
  const d=randInt(1,5);
  // a*x^m*(b*x^n - c*x^p - d)
  const t1coeff=a*b, t1exp=m+n;
  const t2coeff=a*c, t2exp=m+p;
  const t3coeff=a*d, t3exp=m;
  const fmtTerm=(coeff,exp)=>{
    const c=coeff===1?"":coeff;
    const e=exp===1?"x":"x^{"+exp+"}";
    return c+e;
  };
  const latex=a+"x^{"+m+"}("+b+"x^{"+n+"}-"+c+"x^{"+p+"}-"+d+")";
  const answer=t1coeff+"x^"+t1exp+"-"+t2coeff+"x^"+t2exp+"-"+t3coeff+"x^"+t3exp;
  const latexAnswer=fmtTerm(t1coeff,t1exp)+"-"+fmtTerm(t2coeff,t2exp)+"-"+fmtTerm(t3coeff,t3exp);
  return {
    type:"warmup-b",latex,latexAnswer,answer,displayAnswer:latexAnswer,
    prompt:"Simplify using the product rule and distributive property.",
  };
}

export function gradeAlgebra(input, question) {
  try {
    const norm=(s)=>{
      s=s.trim().toLowerCase().replace(/\s+/g,"");
      const terms=[]; let i=0;
      while(i<s.length){
        let sign=1;
        if(s[i]==="+"){i++;}else if(s[i]==="-"){sign=-1;i++;}
        let coeff="";
        while(i<s.length&&/\d/.test(s[i])){coeff+=s[i];i++;}
        let varPart="";
        while(i<s.length&&/[a-z\^]/.test(s[i])){
          if(s[i]==="^"){i++;let exp="";while(i<s.length&&/\d/.test(s[i])){exp+=s[i];i++;}varPart+="^"+exp;}
          else{varPart+=s[i];i++;}
        }
        if(coeff===""&&varPart===""){i++;continue;}
        const c=(coeff===""?1:parseInt(coeff))*sign;
        terms.push({c,v:varPart});
      }
      return terms.sort((a,b)=>a.v.localeCompare(b.v)||a.c-b.c);
    };
    const st=norm(input), ct=norm(question.answer);
    if(st.length!==ct.length) return false;
    const ss=[...st].sort((a,b)=>a.v.localeCompare(b.v)||a.c-b.c);
    const sc=[...ct].sort((a,b)=>a.v.localeCompare(b.v)||a.c-b.c);
    return ss.every((t,i)=>t.c===sc[i].c&&t.v===sc[i].v);
  } catch { return false; }
}

// - Topic 1: Sign of Product/Quotient -
export function genSignOfProduct() {
  let a,b; do{a=randInt(2,7);b=randInt(2,7);}while(a===b);
  const exprs=shuffle([
    {label:"a*b",    display:a+" x "+b,    sign:"+"},
    {label:"-a*b",   display:"-"+a+" x "+b,   sign:"-"},
    {label:"a*-b",   display:a+" x (-"+b+")", sign:"-"},
    {label:"-a*-b",  display:"-"+a+" x (-"+b+")",sign:"+"},
    {label:"a/b",    display:a+" / "+b,    sign:"+"},
    {label:"a/-b",   display:a+" / (-"+b+")", sign:"-"},
    {label:"-a/b",   display:"-"+a+" / "+b,   sign:"-"},
    {label:"-a/-b",  display:"-"+a+" / (-"+b+")",sign:"+"},
  ]);
  return {
    type:"sign-of-product", a, b, exprs,
    answer:JSON.stringify(exprs.map(e=>e.sign)),
    displayAnswer:exprs.map(e=>e.display+": "+e.sign).join(", "),
    prompt:"For each expression, select + or - for the sign of the result.",
  };
}

export function gradeSignOfProduct(input, question) {
  try {
    const ans=JSON.parse(input);
    const correct=JSON.parse(question.answer);
    return ans.every((a,i)=>a===correct[i]);
  } catch { return false; }
}

// - Topic 2: Sign of Negative Base Powers -
export function genNegativePower() {
  const a=randInt(2,5);
  const exprs=shuffle([
    {label:"-a^2",   latex:"-"+a+"^2",  sign:"-", note:"exponent applies to "+a+" only"},
    {label:"(-a)^2", latex:"(-"+a+")^2",sign:"+", note:"negative base squared = positive"},
    {label:"-a^3",   latex:"-"+a+"^3",  sign:"-", note:"exponent applies to "+a+" only"},
    {label:"(-a)^3", latex:"(-"+a+")^3",sign:"-", note:"negative base, odd exponent = negative"},
  ]);
  return {
    type:"negative-power", a, exprs,
    answer:JSON.stringify(exprs.map(e=>e.sign)),
    displayAnswer:exprs.map(e=>e.latex+": "+e.sign).join(", "),
    prompt:"For each expression, select + or - for the sign of the result.",
  };
}

export function gradeNegativePower(input, question) {
  try {
    const ans=JSON.parse(input);
    const correct=JSON.parse(question.answer);
    return ans.every((a,i)=>a===correct[i]);
  } catch { return false; }
}

// - Topic 3: Roots of Negative Numbers -
const PERFECT_SQUARES=[1,4,9,16,25,36,49];

export function genNegativeRoot() {
  const isSqrt=Math.random()<0.5;
  if(isSqrt){
    const sq=randChoice(PERFECT_SQUARES);
    return {
      type:"negative-root",rootType:"sqrt",radicand:-sq,
      latex:"\\sqrt{-"+sq+"}",
      answer:"undefined",displayAnswer:"Undefined",isUndefined:true,
      prompt:"Evaluate. Enter a number or select Undefined.",
    };
  } else {
    const b=randInt(1,5);
    const radicand=-(b*b*b);
    return {
      type:"negative-root",rootType:"cbrt",radicand,b,
      latex:"\\sqrt[3]{"+radicand+"}",
      answer:String(-b),displayAnswer:String(-b),isUndefined:false,
      prompt:"Evaluate. Enter a number or select Undefined.",
    };
  }
}

export function gradeNegativeRoot(input, question) {
  if(question.isUndefined) return String(input).toLowerCase().replace(/\s/g,"")===
"undefined";
  return parseInt(input,10)===parseInt(question.answer,10);
}

// - Helpers for OoO and variable expressions -
function evalOp(op,a,b){
  if(op==="+") return a+b;
  if(op==="-") return a-b;
  if(op==="*") return a*b;
  if(op==="/") return b===0?null:Number.isInteger(a/b)?a/b:null;
  if(op==="^") return Math.pow(a,b);
  return null;
}

function evalWithPrecedence(tokens){
  // tokens: [num, op, num, op, ...]
  // Handles: ^ first, then */ , then +-
  let nums=[...tokens.filter((_,i)=>i%2===0)];
  let ops=[...tokens.filter((_,i)=>i%2===1)];
  // Pass 1: exponents
  let i=0;
  while(i<ops.length){
    if(ops[i]==="^"){
      const r=evalOp("^",nums[i],nums[i+1]);
      if(r===null) return null;
      nums.splice(i,2,r); ops.splice(i,1);
    } else i++;
  }
  // Pass 2: */ 
  i=0;
  while(i<ops.length){
    if(ops[i]==="*"||ops[i]==="/"){
      const r=evalOp(ops[i],nums[i],nums[i+1]);
      if(r===null||!Number.isInteger(r)) return null;
      nums.splice(i,2,r); ops.splice(i,1);
    } else i++;
  }
  // Pass 3: +-
  let result=nums[0];
  for(let j=0;j<ops.length;j++){
    result=evalOp(ops[j],result,nums[j+1]);
    if(result===null||!Number.isInteger(result)) return null;
  }
  return result;
}

function latexOp(op){
  if(op==="*") return "\\times";
  if(op==="/") return "\\div";
  return op;
}

function digitMax(n){return Math.max(...String(Math.abs(n)).split("").map(Number));}

// - Topic 4: Order of Operations with Signed Numbers -
export function genSignedOoO() {
  const OPS=["+","-","*","/","^"];
  for(let attempt=0;attempt<400;attempt++){
    const op1=randChoice(OPS),op2=randChoice(OPS),op3=randChoice(OPS),op4=randChoice(OPS);
    const allOps=[op1,op2,op3,op4];
    const hasAddSub=allOps.some(o=>o==="+"||o==="-");
    const hasMulDiv=allOps.some(o=>o==="*"||o==="/");
    if(!hasAddSub||!hasMulDiv) continue;

    // Generate signed operands
    const sign=()=>Math.random()<0.4?-1:1;
    let a=sign()*randInt(1,9);
    let b,c,d,e;

    // Apply constraints per op
    if(op1==="*"){b=sign()*randInt(1,7);if(digitMax(a)>7&&digitMax(b)>7)continue;}
    else if(op1==="/"){b=sign()*(randInt(1,7));} // no zero
    else if(op1==="^"){a=randInt(2,5);b=randInt(2,3);}
    else b=sign()*randInt(1,9);

    if(op2==="*"){c=sign()*randInt(1,7);} 
    else if(op2==="/"){c=sign()*(randInt(1,7));}
    else if(op2==="^"){c=randInt(2,3);}
    else c=sign()*randInt(1,9);

    if(op3==="*"){d=sign()*randInt(1,7);}
    else if(op3==="/"){d=sign()*(randInt(1,7));}
    else if(op3==="^"){d=randInt(2,3);}
    else d=sign()*randInt(1,9);

    if(op4==="*"){e=sign()*randInt(1,7);}
    else if(op4==="/"){e=sign()*(randInt(1,7));}
    else if(op4==="^"){e=randInt(2,3);}
    else e=sign()*randInt(1,9);

    // No division by zero
    if((op1==="/"&&b===0)||(op2==="/"&&c===0)||(op3==="/"&&d===0)||(op4==="/"&&e===0)) continue;

    const result=evalWithPrecedence([a,op1,b,op2,c,op3,d,op4,e]);
    if(result===null||!Number.isInteger(result)) continue;
    if(Math.abs(result)>99) continue;

    // Build LaTeX - handle negative numbers with parens
    const fmt=(n)=>n<0?"("+n+")":String(n);
    const latex=fmt(a)+" "+latexOp(op1)+" "+fmt(b)+" "+latexOp(op2)+" "+fmt(c)+" "+latexOp(op3)+" "+fmt(d)+" "+latexOp(op4)+" "+fmt(e);

    return {
      type:"signed-ooo",latex,result,
      answer:String(result),displayAnswer:String(result),isUndefined:false,
      prompt:"Evaluate using the correct order of operations.",
    };
  }
  // Fallback
  return {type:"signed-ooo",latex:"2 + 3 \\times (-4) - 1",result:-11,answer:"-11",displayAnswer:"-11",isUndefined:false,prompt:"Evaluate using the correct order of operations."};
}

export function gradeSignedOoO(input,question){
  if(question.isUndefined) return String(input).toLowerCase().replace(/\s/g,"") === "undefined";
  return parseInt(input.replace(/\s/g,""),10)===question.result;
}

// - Topic 5: Variable Expressions with Signed Values -
export function genSignedVarExpr() {
  for(let attempt=0;attempt<400;attempt++){
    const useTwo=Math.random()<0.35;
    const xVal=(Math.random()<0.5?-1:1)*randInt(1,5);
    const yVal=useTwo?(Math.random()<0.5?-1:1)*randInt(1,5):null;

    const OPS=["+","-","*","/"];
    const op1=randChoice(OPS), op2=randChoice(OPS);
    const hasAddSub=[op1,op2].some(o=>o==="+"||o==="-");
    const hasMulDiv=[op1,op2].some(o=>o==="*"||o==="/");
    if(!hasAddSub||!hasMulDiv) continue;

    const coeff=randInt(2,5);
    const b=(op1==="/"||op1==="*")?randInt(2,5):randInt(1,6);
    const c=(op2==="/"||op2==="*")?randInt(2,5):randInt(1,6);

    if(op1==="/"&&b===0) continue;
    if(op2==="/"&&c===0) continue;

    // Evaluate: coeff*x op1 b op2 c (treating ax as single computed value)
    const axVal=coeff*xVal;
    const r1=evalOp(op1,axVal,b);
    if(r1===null||!Number.isInteger(r1)) continue;
    const result=evalOp(op2,r1,c);
    if(result===null||!Number.isInteger(result)) continue;
    if(Math.abs(result)>99) continue;

    // Format: coeff*x written as "3x", division as fraction
    const axLatex=coeff===1?"x":coeff+"x";
    let latex,given;
    if(op1==="/"){
      latex="\\dfrac{"+axLatex+"}{"+b+"} "+latexOp(op2)+" "+c;
      if(r1===null||!Number.isInteger(r1)) continue;
    } else {
      const b2=b<0?"("+b+")":String(b);
      const c2=c<0?"("+c+")":String(c);
      latex=axLatex+" "+latexOp(op1)+" "+b2+" "+latexOp(op2)+" "+c2;
    }
    given="x = "+xVal+(useTwo&&yVal!==null?", y = "+yVal:"");

    return {
      type:"signed-var-expr",latex,result,xVal,yVal,coeff,given,
      answer:String(result),displayAnswer:String(result),isUndefined:false,
      prompt:"Evaluate the expression. Given: "+given,
    };
  }
  return {type:"signed-var-expr",latex:"2x + 3 - 1",result:-2,xVal:-2,yVal:null,coeff:2,given:"x = -2",answer:"-2",displayAnswer:"-2",isUndefined:false,prompt:"Evaluate. Given: x = -2"};
}

export function gradeSignedVarExpr(input,question){
  if(question.isUndefined) return String(input).toLowerCase().replace(/\s/g,"") === "undefined";
  return parseInt(input.replace(/\s/g,""),10)===question.result;
}

// - Topic registry -
export const LESSON07_TOPICS=[
  {id:"warmup-a",       label:"Warm-up: Distributive Simplify",    description:"Distribute and combine like terms"},
  {id:"warmup-b",       label:"Warm-up: Exponential Distributive",  description:"Product rule + distributive"},
  {id:"sign-of-product",label:"Sign of Product/Quotient",           description:"8 expressions simultaneously"},
  {id:"negative-power", label:"Sign of Negative Base Powers",       description:"4 expressions simultaneously"},
  {id:"negative-root",  label:"Roots of Negative Numbers",          description:"sqrt(-n) or cbrt(-n)"},
  {id:"signed-ooo",     label:"Order of Operations (Signed)",       description:"4 operations, signed numbers"},
  {id:"signed-var-expr",label:"Variable Expressions (Signed)",      description:"3 ops, signed values"},
];

export function generateLesson07Question(topicId){
  switch(topicId){
    case "warmup-a":       return genWarmupA();
    case "warmup-b":       return genWarmupB();
    case "sign-of-product":return genSignOfProduct();
    case "negative-power": return genNegativePower();
    case "negative-root":  return genNegativeRoot();
    case "signed-ooo":     return genSignedOoO();
    case "signed-var-expr":return genSignedVarExpr();
    default:               return genSignedOoO();
  }
}

export function gradeLesson07Answer(input,question){
  if(!input||!question) return false;
  switch(question.type){
    case "warmup-a":
    case "warmup-b":        return gradeAlgebra(input,question);
    case "sign-of-product": return gradeSignOfProduct(input,question);
    case "negative-power":  return gradeNegativePower(input,question);
    case "negative-root":   return gradeNegativeRoot(input,question);
    case "signed-ooo":      return gradeSignedOoO(input,question);
    case "signed-var-expr": return gradeSignedVarExpr(input,question);
    default: return false;
  }
}
