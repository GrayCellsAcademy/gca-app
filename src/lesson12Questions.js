// Lesson 12 - Divisibility Rules and Prime Factorization

function randInt(min, max) { return Math.floor(Math.random()*(max-min+1))+min; }
function randChoice(arr) { return arr[Math.floor(Math.random()*arr.length)]; }
function shuffle(arr) { const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }

// Divisibility helpers
function divBy(n, d) {
  if (d===2) return n%2===0;
  if (d===3) return String(n).split("").reduce((s,c)=>s+parseInt(c),0)%3===0;
  if (d===4) return n%4===0;
  if (d===5) return n%5===0;
  if (d===6) return n%2===0 && String(n).split("").reduce((s,c)=>s+parseInt(c),0)%3===0;
  if (d===9) return String(n).split("").reduce((s,c)=>s+parseInt(c),0)%9===0;
  if (d===10) return n%10===0;
  return false;
}

function digitSum(n) {
  return String(n).split("").reduce((s,c)=>s+parseInt(c),0);
}

// - Warm-up A: Two-step inequality -
function parseIneq(str) {
  const s = String(str).trim().toLowerCase()
    .replace(/\u2264/g,"<=").replace(/\u2265/g,">=").replace(/\s+/g,"");
  const m = s.match(/^x([<>]=?)(-?\d+)$|^(-?\d+)([<>]=?)x$/);
  if (!m) return null;
  if (m[1]) return { sym:m[1], val:parseInt(m[2]) };
  const flip={"<":">",">":"<","<=":">=",">=":"<="};
  return { sym:flip[m[4]], val:parseInt(m[3]) };
}
function ineqEqual(a,b) { return a&&b&&a.sym===b.sym&&a.val===b.val; }

export function genWarmupA() {
  for(let i=0;i<200;i++){
    const a=(Math.random()<0.5?-1:1)*randInt(2,8);
    const b=randInt(-15,15); if(b===0) continue;
    const sym=randChoice([">","<","<=",">="]);
    const sol=randInt(-9,9); if(sol===0) continue;
    const c=a*sol+b; if(Math.abs(c)>30) continue;
    const flips=a<0;
    const resultSym=flips?{">":" <","<":">","<=":">=",">=":"<="}[sym]:sym;
    const aStr=a===1?"x":a===-1?"-x":`${a}x`;
    const bStr=b>0?`+ ${b}`:`- ${Math.abs(b)}`;
    const symDisp={"<":"<",">":">","<=":"\u2264",">=":"\u2265"}[sym];
    const solDisp={"<":"<",">":">","<=":"\u2264",">=":"\u2265"}[resultSym];
    return {
      type:"warmup-a",
      display:`${aStr} ${bStr} ${symDisp} ${c}`,
      answer:{sym:resultSym,val:sol},
      displayAnswer:`x ${solDisp} ${sol}`,
    };
  }
  return {type:"warmup-a",display:"-3x + 7 \u2264 16",answer:{sym:">=",val:-3},displayAnswer:"x \u2265 -3"};
}
export function gradeWarmupA(input,q){ return ineqEqual(parseIneq(input),q.answer); }

// - Warm-up B: Special case inequality -
export function genWarmupB() {
  const allReal=Math.random()<0.5;
  const a=randInt(2,5), b=randInt(1,8), c=randInt(1,6);
  const sym=randChoice(["<",">","<=",">="]);
  const symStr={"<":"<",">":">","<=":"\u2264",">=":"\u2265"}[sym];
  if(allReal){
    const rhs=a*b+c;
    return {type:"warmup-b",display:`${a}(x + ${b}) + ${c} ${symStr} ${a}x + ${rhs}`,allReal,answer:"all real numbers",displayAnswer:"All real numbers"};
  } else {
    const k=randInt(1,5);
    const rhs=a*b+c+k;
    return {type:"warmup-b",display:`${a}(x + ${b}) + ${c} ${symStr} ${a}x + ${rhs}`,allReal,answer:"no solution",displayAnswer:"No solution"};
  }
}
export function gradeWarmupB(input,q){
  const s=String(input).trim().toLowerCase().replace(/\s/g,"");
  return (s==="allrealnumbers"||s==="allreals")&&q.allReal || s==="nosolution"&&!q.allReal;
}

// - Warm-up C: Division by 8 or 9 -
export function genWarmupC() {
  const a=randInt(2,9);
  let b; do{b=randInt(2,9);}while(b===a);
  const types=["zero-num","zero-den"];
  const type1=randChoice(types), type2=randChoice(types);
  const style1=Math.random()<0.5?"fraction":"standard";
  const style2=style1==="fraction"?"standard":"fraction";
  const makeProb=(type,n,style)=>{
    const num=type==="zero-num"?0:n;
    const den=type==="zero-num"?n:0;
    const isUndef=type==="zero-den";
    const latex=style==="fraction"
      ?`\\dfrac{${num}}{${den}}`
      :`${num} \\div ${den}`;
    return {num,den,style,latex,answer:isUndef?"undefined":"0",isUndefined:isUndef};
  };
  const prob1=makeProb(type1,a,style1);
  const prob2=makeProb(type2,b,style2);
  return {
    type:"warmup-c", prob1, prob2,
    answer:JSON.stringify({ans1:prob1.answer,ans2:prob2.answer}),
    displayAnswer:`Expr 1: ${prob1.answer}, Expr 2: ${prob2.answer}`,
    prompt:"Evaluate each expression. Enter a number or press UNDEFINED.",
  };
}
export function gradeWarmupC(input,q){
  try {
    const ans=JSON.parse(input);
    const norm=s=>String(s).trim().toLowerCase().replace(/\s/g,"");
    return norm(ans.ans1)===norm(q.prob1.answer)&&norm(ans.ans2)===norm(q.prob2.answer);
  } catch { return false; }
}

// - Topic 1: Divisible by 2, 5, or 10? -
function gen3or4DigitNum(avoid=[]) {
  let n;
  do { n=randInt(100,9999); } while(avoid.includes(n));
  return n;
}

export function genDivisibility2510() {
  // Generate 3 numbers with varied divisibility
  const nums=[];
  // Ensure variety: one divisible by all three, one by 5 only, one by 2 only
  const templates=[
    ()=>{ let n; do{n=randInt(10,99)*10;}while(n<100||n>9999); return n; }, // div by 10 (also 2,5)
    ()=>{ let n; do{n=randInt(20,199)*5;}while(n%10===0||n<100||n>9999); return n; }, // div by 5 not 10
    ()=>{ let n; do{n=randInt(50,4999)*2;}while(n%5===0||n<100||n>9999); return n; }, // div by 2 not 5
  ];
  const shuffled=shuffle(templates);
  for(const t of shuffled) nums.push(t());
  return {
    type:"div-2510", nums,
    answers:nums.map(n=>({
      by2:divBy(n,2), by5:divBy(n,5), by10:divBy(n,10),
      correct:[2,5,10].filter(d=>divBy(n,d)),
    })),
    prompt:"For each number, select ALL divisibility rules that apply.",
  };
}
export function gradeDivisibility2510Item(input,item){
  try {
    const sel=JSON.parse(input);
    const correct=new Set(item.correct.map(String));
    const given=new Set(sel.map(String));
    if(correct.size!==given.size) return false;
    return [...correct].every(v=>given.has(v));
  } catch { return false; }
}

// - Topic 2: Divisible by 3 or 9? -
export function genDivisibility39() {
  const nums=[];
  // Ensure variety of cases
  const pool=[
    ()=>{ let n; do{n=randInt(10,999);}while(!divBy(n,9)||n<100); return n; }, // div by both
    ()=>{ let n; do{n=randInt(10,999);}while(!divBy(n,3)||divBy(n,9)||n<100); return n; }, // div by 3 not 9
    ()=>{ let n; do{n=randInt(10,999);}while(divBy(n,3)||n<100); return n; }, // neither
    ()=>{ let n; do{n=randInt(10,999);}while(divBy(n,3)||n<100); return n; }, // neither
  ];
  for(const p of shuffle(pool)) nums.push(p());
  return {
    type:"div-39", nums,
    answers:nums.map(n=>({
      by3:divBy(n,3), by9:divBy(n,9),
      correct:divBy(n,9)?"both":divBy(n,3)?"3only":"neither",
      displayAnswer:divBy(n,9)?"Both":divBy(n,3)?"Divisible by 3 only":"Neither",
    })),
    prompt:"For each number, select: Divisible by 3, Divisible by 9, Both, or Neither.",
  };
}
export function gradeDivisibility39Item(input,item){
  const s=String(input).trim().toLowerCase().replace(/\s/g,"");
  return s===item.correct.toLowerCase().replace(/\s/g,"");
}

// - Topic 2: Missing digit -
export function genMissingDigit() {
  const divisor=randChoice([3,9]);
  // Generate a 4-digit number, blank one digit
  const digits=[randInt(1,9),randInt(0,9),randInt(0,9),randInt(0,9)];
  const blankIdx=randInt(0,3);
  const sum=digits.reduce((s,d)=>s+d,0);
  const blankVal=digits[blankIdx];
  const target=divisor===3?Math.ceil(sum/3)*3:Math.ceil(sum/9)*9;

  // Find all valid missing digits (0-9) that make sum divisible by divisor
  const restSum=sum-blankVal;
  const valid=[];
  for(let d=0;d<=9;d++){
    if((restSum+d)%divisor===0) valid.push(d);
  }

  // Ensure at least 1 valid, generate 3 options including at least one valid
  let options=shuffle([...new Set([...valid.slice(0,2),...[0,1,2,3,4,5,6,7,8,9].filter(d=>!valid.includes(d)).slice(0,1)])]).slice(0,3);
  if(!options.some(o=>valid.includes(o))) options=[valid[0],...options.slice(0,2)];
  options=shuffle(options);

  const numStr=digits.map((d,i)=>i===blankIdx?"_":String(d)).join("");
  return {
    type:"missing-digit", numStr, blankIdx, digits, divisor, valid, options,
    rule:`Divisible by ${divisor}`,
    answer:JSON.stringify(valid.filter(v=>options.includes(v))),
    displayAnswer:`Missing digit(s): ${valid.filter(v=>options.includes(v)).join(" or ")}`,
    prompt:`Find the missing digit to make the number divisible by ${divisor}.`,
  };
}
export function gradeMissingDigit(input,q){
  try {
    const sel=JSON.parse(input);
    const correct=q.valid.filter(v=>q.options.includes(v));
    const given=sel.map(Number);
    if(correct.length!==given.length) return false;
    return correct.every(v=>given.includes(v));
  } catch { return false; }
}

// - Topic 3: Divisible by 4 or 6? -
export function genDivisibility46() {
  const nums=[];
  const pool=[
    ()=>{ let n; do{n=randInt(100,9999);}while(!divBy(n,4)||!divBy(n,6)); return n; }, // both
    ()=>{ let n; do{n=randInt(100,9999);}while(!divBy(n,4)||divBy(n,6)); return n; }, // 4 only
    ()=>{ let n; do{n=randInt(100,9999);}while(divBy(n,4)||!divBy(n,6)); return n; }, // 6 only
    ()=>{ let n; do{n=randInt(100,9999);}while(divBy(n,4)||divBy(n,6)); return n; }, // neither
  ];
  for(const p of shuffle(pool)) nums.push(p());
  return {
    type:"div-46", nums,
    answers:nums.map(n=>({
      by4:divBy(n,4), by6:divBy(n,6),
      correct:divBy(n,4)&&divBy(n,6)?"both":divBy(n,4)?"4only":divBy(n,6)?"6only":"neither",
      displayAnswer:divBy(n,4)&&divBy(n,6)?"Both":divBy(n,4)?"Divisible by 4":divBy(n,6)?"Divisible by 6":"Neither",
    })),
    prompt:"For each number, select: Divisible by 4, Divisible by 6, Both, or Neither.",
  };
}
export function gradeDivisibility46Item(input,item){
  const s=String(input).trim().toLowerCase().replace(/\s/g,"");
  return s===item.correct.toLowerCase().replace(/\s/g,"");
}

// - Topic 3: Mixed review (all rules) -
export function genMixedRules() {
  const nums=[];
  // Generate 6 numbers with varied divisibility
  while(nums.length<6){
    const n=randInt(100,9999);
    if(!nums.includes(n)) nums.push(n);
  }
  return {
    type:"mixed-rules", nums,
    answers:nums.map(n=>({
      rules:[2,3,4,5,6,9,10].filter(d=>divBy(n,d)),
    })),
    prompt:"For each number, select ALL divisibility rules that apply (2, 3, 4, 5, 6, 9, 10).",
  };
}
export function gradeMixedRulesItem(input,item){
  try {
    const sel=JSON.parse(input).map(Number);
    const correct=item.rules;
    if(correct.length!==sel.length) return false;
    return correct.every(v=>sel.includes(v));
  } catch { return false; }
}

// - Topic 4: Prime or Composite? -
export function genPrimeComposite() {
  const nums=shuffle([1,2,3,4,5,6,7,8,9]);
  function classify(n){
    if(n===1) return "neither";
    if(n===2||n===3||n===5||n===7) return "prime";
    return "composite";
  }
  return {
    type:"prime-composite", nums,
    answers:nums.map(n=>({ n, correct:classify(n), displayAnswer:classify(n).charAt(0).toUpperCase()+classify(n).slice(1) })),
    prompt:"For each number, select: Prime, Composite, or Neither (for 1).",
  };
}
export function gradePrimeCompositeItem(input,item){
  return String(input).trim().toLowerCase()===item.correct;
}

// - Topic 5: Factor tree first step -
export function genFactorTree() {
  const composites=[12,18,20,24,28,30,36,40,42,48,50,60,72,84,90,100];
  const n=randChoice(composites);
  // Generate factor pairs (excluding 1 and n)
  const pairs=[];
  for(let i=2;i<n;i++){
    if(n%i===0&&i<=n/i) pairs.push([i,n/i]);
  }
  const correct="D"; // always "all of the above" since any factor pair works
  const shown=shuffle(pairs).slice(0,3);
  return {
    type:"factor-tree", n,
    pairs:shown, correct,
    answer:"D",
    displayAnswer:"D) All of the above - any factor pair is a valid first step",
    prompt:`Which factor pair could be the first step in a factor tree for ${n}?`,
  };
}
export function gradeFactorTree(input,q){
  return String(input).trim().toUpperCase()==="D";
}

// - Topic 5: Prime factorization multiple choice -
function primeFactors(n){
  const factors={};
  let d=2;
  while(n>1){
    while(n%d===0){ factors[d]=(factors[d]||0)+1; n/=d; }
    d++;
  }
  return factors;
}
function formatPF(factors){
  return Object.entries(factors).sort(([a],[b])=>a-b)
    .map(([p,e])=>e===1?p:`${p}^${e}`).join(" x ");
}

export function genPFMultipleChoice() {
  const ns=[12,18,20,24,28,30,36,40,42,48,50,60,72,84,90,100];
  const n=randChoice(ns);
  const correct=formatPF(primeFactors(n));
  // Generate 3 wrong answers
  const wrongs=new Set();
  while(wrongs.size<3){
    const factors=primeFactors(n);
    const keys=Object.keys(factors);
    const k=randChoice(keys);
    const wrong={...factors};
    wrong[k]=wrong[k]+randChoice([-1,1]);
    if(wrong[k]<=0) delete wrong[k];
    const s=formatPF(wrong);
    if(s!==correct&&s.length>0) wrongs.add(s);
  }
  const options=shuffle([correct,...wrongs]);
  return {
    type:"pf-mc", n, correct, options,
    answer:correct, displayAnswer:correct,
    prompt:`Select the correct prime factorization of ${n}.`,
  };
}
export function gradePFMultipleChoice(input,q){
  return String(input).trim()===q.correct;
}

// - Topic 5: Prime factorization free response -
function parsePF(str){
  // Normalize: "2^2 x 3^2", "2^2*3^2", "2^2 - 3^2" - {2:2, 3:2}
  const s=String(str).trim().toLowerCase()
    .replace(/\u00d7/g,"x").replace(/\*/g,"x").replace(/\s+/g,"");
  const factors={};
  const terms=s.split("x");
  for(const t of terms){
    const m=t.match(/^(\d+)(?:\^(\d+))?$/);
    if(!m) return null;
    const base=parseInt(m[1]), exp=m[2]?parseInt(m[2]):1;
    factors[base]=(factors[base]||0)+exp;
  }
  return factors;
}
function pfsEqual(a,b){
  if(!a||!b) return false;
  const ka=Object.keys(a), kb=Object.keys(b);
  if(ka.length!==kb.length) return false;
  return ka.every(k=>a[k]===b[k]);
}

export function genPFFreeResponse() {
  const ns=[12,15,18,20,24,28,30,36,40,42,48,50,54,60,72];
  const n=randChoice(ns);
  const factors=primeFactors(n);
  return {
    type:"pf-free", n, factors,
    answer:formatPF(factors),
    displayAnswer:formatPF(factors),
    prompt:`Enter the prime factorization of ${n}. Use ^ for exponents and - or * for multiplication.`,
  };
}
export function gradePFFreeResponse(input,q){
  const parsed=parsePF(input);
  return pfsEqual(parsed,q.factors);
}

// - Topic registry -
export const LESSON12_TOPICS=[
  { id:"warmup-a",    label:"Warm-up: Two-Step Inequality",    description:"Solve with possible sign flip"       },
  { id:"warmup-b",    label:"Warm-up: Special Case Inequality",description:"All Real or No Solution"             },
  { id:"warmup-c",    label:"Warm-up: Division by 8 or 9",     description:"Enter numerical answer"             },
  { id:"div-2510",    label:"Divisible by 2, 5, or 10?",       description:"3 numbers, multi-select per number" },
  { id:"div-39",      label:"Divisible by 3 or 9?",            description:"4 numbers, 4 choices each"          },
  { id:"missing-digit",label:"Find the Missing Digit",         description:"Make number divisible by 3 or 9"    },
  { id:"div-46",      label:"Divisible by 4 or 6?",            description:"4 numbers, 4 choices each"          },
  { id:"mixed-rules", label:"Mixed Divisibility Review",       description:"6 numbers, all 7 rules"             },
  { id:"prime-composite",label:"Prime or Composite?",          description:"Numbers 1-9"                        },
  { id:"factor-tree", label:"Factor Tree First Step",          description:"Multiple choice A/B/C/D"            },
  { id:"pf-mc",       label:"Prime Factorization (MC)",        description:"Select correct factorization"       },
  { id:"pf-free",     label:"Prime Factorization (Free)",      description:"Enter using ^ and -"                },
];

export function generateLesson12Question(topicId){
  switch(topicId){
    case "warmup-a":       return genWarmupA();
    case "warmup-b":       return genWarmupB();
    case "warmup-c":       return genWarmupC();
    case "div-2510":       return genDivisibility2510();
    case "div-39":         return genDivisibility39();
    case "missing-digit":  return genMissingDigit();
    case "div-46":         return genDivisibility46();
    case "mixed-rules":    return genMixedRules();
    case "prime-composite":return genPrimeComposite();
    case "pf-mc":          return genPFMultipleChoice();
    case "pf-free":        return genPFFreeResponse();
    default:               return genWarmupA();
  }
}

export function gradeLesson12Answer(input,question){
  if(!input||!question) return false;
  switch(question.type){
    case "warmup-a":       return gradeWarmupA(input,question);
    case "warmup-b":       return gradeWarmupB(input,question);
    case "warmup-c":       return gradeWarmupC(input,question);
    case "div-2510":
    case "div-39":
    case "div-46":
    case "mixed-rules":
    case "prime-composite":
      // All items must be correct - graded per-item in session
      return false; // use per-item graders
    case "missing-digit":  return gradeMissingDigit(input,question);
    case "pf-mc":          return gradePFMultipleChoice(input,question);
    case "pf-free":        return gradePFFreeResponse(input,question);
    default:               return false;
  }
}

