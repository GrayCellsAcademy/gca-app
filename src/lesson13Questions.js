// Lesson 13 - Factors, Multiples, GCF, LCM

function randInt(min, max) { return Math.floor(Math.random()*(max-min+1))+min; }
function randChoice(arr) { return arr[Math.floor(Math.random()*arr.length)]; }
function shuffle(arr) { const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }

// -- Math helpers --
function getFactors(n) {
  const f=[];
  for(let i=1;i<=n;i++) if(n%i===0) f.push(i);
  return f;
}

function isPrime(n) {
  if(n<2) return false;
  for(let i=2;i<=Math.sqrt(n);i++) if(n%i===0) return false;
  return true;
}

function primeFactors(n) {
  const f={}; let d=2;
  while(n>1){ while(n%d===0){f[d]=(f[d]||0)+1;n/=d;}d++; }
  return f;
}

function formatPF(n) {
  const f=primeFactors(n);
  return Object.entries(f).sort(([a],[b])=>a-b)
    .map(([p,e])=>e===1?p:`${p}^${e}`).join(" x ");
}

function parsePF(str) {
  const s=String(str).trim().toLowerCase()
    .replace(/\u00d7/g,"x").replace(/\*/g,"x").replace(/\s+/g,"");
  const f={};
  for(const t of s.split("x")){
    const m=t.match(/^(\d+)(?:\^(\d+))?$/);
    if(!m) return null;
    f[parseInt(m[1])]=(f[parseInt(m[1])]||0)+(m[2]?parseInt(m[2]):1);
  }
  return f;
}

function pfsEqual(a,b) {
  if(!a||!b) return false;
  const ka=Object.keys(a),kb=Object.keys(b);
  if(ka.length!==kb.length) return false;
  return ka.every(k=>a[k]===b[k]);
}

function gcf(a,b) { return b===0?a:gcf(b,a%b); }
function lcm(a,b) { return (a*b)/gcf(a,b); }

// -- Warm-up A: Divisibility mixed --
export function genWarmupA() {
  const ALL=[2,3,4,5,6,9,10];
  let n;
  do { n=randInt(1000,9999); } while(ALL.filter(d=>n%d===0).length===0);
  const correct=ALL.filter(d=>n%d===0);
  return {type:"warmup-a",n,correct,answer:JSON.stringify(correct),displayAnswer:correct.join(", "),prompt:`Select ALL divisibility rules that apply to ${n}.`};
}
export function gradeWarmupA(input,q){
  try{
    const sel=JSON.parse(input).map(Number);
    const c=q.correct;
    if(c.length!==sel.length) return false;
    return c.every(v=>sel.includes(v));
  }catch{return false;}
}

// -- Warm-up B: Prime or Composite (number 1) --
export function genWarmupB() {
  return {type:"warmup-b",n:1,answer:"neither",displayAnswer:"Neither (1 is not prime and not composite)",prompt:"Is 1 prime or composite?"};
}
export function gradeWarmupB(input,q){
  const s=String(input).trim().toLowerCase().replace(/\s/g,"");
  return s==="neither"||s==="notprime"||s==="composite";
}

// -- Warm-up C: Prime factorization of 72 --
export function genWarmupC() {
  const n=72;
  const f=primeFactors(n);
  const pf=formatPF(n);
  return {type:"warmup-c",n,factors:f,answer:pf,displayAnswer:pf,prompt:`Enter the prime factorization of ${n}.`};
}
export function gradeWarmupC(input,q){
  return pfsEqual(parsePF(input),q.factors);
}

// -- Topic 1 A1: List all factors (MC) --
export function genListFactors() {
  const n=randInt(12,60);
  const correct=getFactors(n);
  const toLabel=arr=>"{"+arr.join(", ")+"}";
  // Generate 3 wrong sets
  const wrongs=[];
  let attempts=0;
  while(wrongs.length<3&&attempts<200){
    attempts++;
    let wrong=[...correct];
    const op=randChoice(["remove","add","swap"]);
    if(op==="remove"&&wrong.length>2){
      wrong.splice(randInt(1,wrong.length-2),1);
    } else if(op==="add"){
      let extra; do{extra=randInt(2,n-1);}while(wrong.includes(extra));
      wrong=[...wrong,extra].sort((a,b)=>a-b);
    } else {
      const idx=randInt(1,wrong.length-2);
      let rep; do{rep=randInt(2,n-1);}while(wrong.includes(rep));
      wrong[idx]=rep; wrong.sort((a,b)=>a-b);
    }
    const ws=JSON.stringify(wrong);
    if(ws!==JSON.stringify(correct)&&!wrongs.find(w=>JSON.stringify(w)===ws)) wrongs.push(wrong);
  }
  const allOptions=shuffle([correct,...wrongs.slice(0,3)]);
  const correctIdx=allOptions.findIndex(o=>JSON.stringify(o)===JSON.stringify(correct));
  // Store as flat strings so Firestore can serialize
  const optionLabels=allOptions.map(toLabel);
  return {
    type:"list-factors",n,correctIdx,
    optionLabels,
    answer:String(correctIdx),
    displayAnswer:toLabel(correct),
    prompt:`Select the complete set of factors of ${n}.`,
  };
}
export function gradeListFactors(input,q){
  return parseInt(String(input).trim())===q.correctIdx;
}

// -- Topic 1 A2: Missing factor --
export function genMissingFactor() {
  const n=randInt(12,80);
  const factors=getFactors(n).filter(f=>f>1&&f<n);
  if(factors.length<2) return genMissingFactor();
  const a=randChoice(factors);
  const b=n/a;
  return {
    type:"missing-factor",n,a,b,
    display:`${a} x ___ = ${n}`,
    answer:String(b),displayAnswer:String(b),
    prompt:`Find the missing factor: ${a} - ___ = ${n}`,
  };
}
export function gradeMissingFactor(input,q){
  return parseInt(String(input).trim())===q.b;
}

// -- Topic 2 A3: First five multiples --
export function genFirstFiveMultiples() {
  const n=randInt(2,12);
  const multiples=[n,n*2,n*3,n*4,n*5];
  return {
    type:"first-five-multiples",n,multiples,
    answer:multiples.join(","),
    displayAnswer:multiples.join(", "),
    prompt:`Enter the first 5 multiples of ${n}, separated by commas.`,
  };
}
export function gradeFirstFiveMultiples(input,q){
  const given=String(input).replace(/\s/g,"").split(",").map(Number);
  if(given.length!==5) return false;
  return given.every((v,i)=>v===q.multiples[i]);
}

// -- Topic 2 A4: Is it a multiple? (6 simultaneous) --
export function genIsMultiple() {
  const base=randChoice([4,6,7,8,9]);
  const statements=[];
  // Generate 6: mix of yes and no
  const yesNos=shuffle([true,true,true,false,false,false]);
  for(let i=0;i<6;i++){
    let n;
    if(yesNos[i]){ n=base*randInt(2,12); }
    else { do{n=randInt(base*2,base*12);}while(n%base===0); }
    statements.push({n,base,isMultiple:yesNos[i],display:`Is ${n} a multiple of ${base}?`});
  }
  return {type:"is-multiple",base,statements,prompt:`For each, is the number a multiple of ${base}?`};
}
export function gradeIsMultipleItem(answer,item){
  return Boolean(answer)===item.isMultiple;
}
export function gradeIsMultiple(input,q){
  try{
    const ans=JSON.parse(input);
    return q.statements.every((s,i)=>Boolean(ans[i])===s.isMultiple);
  }catch{return false;}
}

// -- Topic 3 A5: GCF by listing factors (MC) --
export function genGCFByFactors() {
  const pairs=[[12,18],[18,24],[16,24],[20,30],[15,25],[12,30],[18,27],[24,36],[14,21],[16,28]];
  const [a,b]=randChoice(pairs);
  const g=gcf(a,b);
  const fa=getFactors(a), fb=getFactors(b);
  // Wrong options: other common factors or nearby numbers
  const common=fa.filter(f=>fb.includes(f));
  const wrongs=common.filter(f=>f!==g).concat([g+1,g+2,g-1].filter(v=>v>0&&v!==g)).slice(0,3);
  while(wrongs.length<3) wrongs.push(wrongs[wrongs.length-1]+1);
  const options=shuffle([g,...wrongs.slice(0,3)]);
  const correctIdx=options.indexOf(g);
  return {
    type:"gcf-factors",a,b,g,options,correctIdx,
    factors_a:fa,factors_b:fb,common,
    answer:String(correctIdx),displayAnswer:String(g),
    prompt:`Find the GCF of ${a} and ${b} by listing factors.`,
  };
}
export function gradeGCFByFactors(input,q){
  return parseInt(String(input).trim())===q.correctIdx;
}

// -- Topic 3 A6: GCF by prime factorization (3 stages) --
export function genGCFByPF() {
  const pairs=[[36,48],[36,60],[24,36],[18,30],[12,18],[20,30],[24,40],[18,27],[12,30],[24,36]];
  const [a,b]=randChoice(pairs);
  const fa=primeFactors(a), fb=primeFactors(b);
  const allPrimes=[...new Set([...Object.keys(fa),...Object.keys(fb)].map(Number))].sort((x,y)=>x-y);
  const commonPrimes=allPrimes.filter(p=>fa[p]&&fb[p]);
  const g=gcf(a,b);
  // Stage 2: for each common prime, options are [exponent in a, exponent in b]
  const primeOptions=commonPrimes.map(p=>({
    prime:p,
    expA:fa[p]||0,
    expB:fb[p]||0,
    correct:Math.min(fa[p]||0,fb[p]||0),
  }));
  return {
    type:"gcf-pf",a,b,g,
    pf_a:formatPF(a),pf_b:formatPF(b),
    factors_a:fa,factors_b:fb,
    allPrimes,commonPrimes,primeOptions,
    answer:String(g),displayAnswer:String(g),
    prompt:`Find the GCF of ${a} and ${b} using prime factorization.`,
  };
}
export function gradeGCFByPFStage1a(input,q){ return pfsEqual(parsePF(input),q.factors_a); }
export function gradeGCFByPFStage1b(input,q){ return pfsEqual(parsePF(input),q.factors_b); }
export function gradeGCFByPFStage2(input,q){
  try{
    const ans=JSON.parse(input);
    return q.primeOptions.every((po,i)=>parseInt(ans[i])===po.correct);
  }catch{return false;}
}
export function gradeGCFByPFStage3(input,q){
  return parseInt(String(input).trim())===q.g;
}

// -- Topic 3 A7: GCF direct free response --
export function genGCFDirect(idx=0) {
  const pool=[
    {a:18,b:24,g:6},{a:12,b:30,g:6},{a:20,b:28,g:4},
    {a:15,b:25,g:5},{a:16,b:24,g:8},{a:14,b:21,g:7},
    {a:24,b:36,g:12},{a:18,b:27,g:9},{a:30,b:45,g:15},
  ];
  const item=pool[idx%pool.length];
  return {type:"gcf-direct",a:item.a,b:item.b,g:item.g,answer:String(item.g),displayAnswer:String(item.g),prompt:`Find the GCF of ${item.a} and ${item.b}.`};
}
export function gradeGCFDirect(input,q){
  return parseInt(String(input).trim())===q.g;
}

// -- Topic 4 A8: LCM by listing multiples (MC) --
export function genLCMByMultiples() {
  const pairs=[[4,6],[4,10],[3,5],[6,8],[4,9],[5,6],[3,8],[6,10],[4,7],[5,8]];
  const [a,b]=randChoice(pairs);
  const l=lcm(a,b);
  const wrongs=[l*2,l+a,l+b,l-Math.min(a,b)].filter(v=>v>0&&v!==l);
  const options=shuffle([l,...wrongs.slice(0,3)]);
  const correctIdx=options.indexOf(l);
  return {
    type:"lcm-multiples",a,b,l,options,correctIdx,
    answer:String(correctIdx),displayAnswer:String(l),
    prompt:`Find the LCM of ${a} and ${b} by listing multiples.`,
  };
}
export function gradeLCMByMultiples(input,q){
  return parseInt(String(input).trim())===q.correctIdx;
}

// -- Topic 4 A9: LCM by prime factorization (3 stages) --
export function genLCMByPF() {
  const pairs=[[12,18],[12,20],[8,12],[10,15],[6,14],[9,12],[8,18],[12,15],[10,12],[6,10]];
  const [a,b]=randChoice(pairs);
  const fa=primeFactors(a), fb=primeFactors(b);
  const allPrimes=[...new Set([...Object.keys(fa),...Object.keys(fb)].map(Number))].sort((x,y)=>x-y);
  const l=lcm(a,b);
  const primeOptions=allPrimes.map(p=>({
    prime:p,
    expA:fa[p]||0,
    expB:fb[p]||0,
    correct:Math.max(fa[p]||0,fb[p]||0),
  }));
  return {
    type:"lcm-pf",a,b,l,
    pf_a:formatPF(a),pf_b:formatPF(b),
    factors_a:fa,factors_b:fb,
    allPrimes,primeOptions,
    answer:String(l),displayAnswer:String(l),
    prompt:`Find the LCM of ${a} and ${b} using prime factorization.`,
  };
}
export function gradeLCMByPFStage1a(input,q){ return pfsEqual(parsePF(input),q.factors_a); }
export function gradeLCMByPFStage1b(input,q){ return pfsEqual(parsePF(input),q.factors_b); }
export function gradeLCMByPFStage2(input,q){
  try{
    const ans=JSON.parse(input);
    return q.primeOptions.every((po,i)=>parseInt(ans[i])===po.correct);
  }catch{return false;}
}
export function gradeLCMByPFStage3(input,q){
  return parseInt(String(input).trim())===q.l;
}

// -- Topic 4 A10: LCM direct free response --
export function genLCMDirect(idx=0) {
  const pool=[
    {a:6,b:8,l:24},{a:4,b:10,l:20},{a:6,b:9,l:18},
    {a:8,b:12,l:24},{a:6,b:14,l:42},{a:10,b:15,l:30},
    {a:12,b:18,l:36},{a:9,b:15,l:45},{a:6,b:20,l:60},
  ];
  const item=pool[idx%pool.length];
  return {type:"lcm-direct",a:item.a,b:item.b,l:item.l,answer:String(item.l),displayAnswer:String(item.l),prompt:`Find the LCM of ${item.a} and ${item.b}.`};
}
export function gradeLCMDirect(input,q){
  return parseInt(String(input).trim())===q.l;
}

// -- Topic 5 A11: Word problem GCF vs LCM --
const WORD_PROBLEMS=[
  {text:"You have 24 red balloons and 36 blue balloons. You want to make identical bouquets with no leftovers. What is the greatest number of bouquets you can make?",nums:[24,36],useGCF:true,answer:12,hint:"GCF: largest group size with no leftovers"},
  {text:"Buses leave the station every 8 minutes and trains every 12 minutes. They just left together. In how many minutes will they next leave at the same time?",nums:[8,12],useGCF:false,answer:24,hint:"LCM: next time events coincide"},
  {text:"You have 18 apples and 24 oranges. You want to make identical fruit baskets using all the fruit. What is the greatest number of baskets you can make?",nums:[18,24],useGCF:true,answer:6,hint:"GCF: divide into equal groups"},
  {text:"A flute plays every 6 beats and a drum plays every 9 beats. They play together on beat 1. What is the next beat where they play together?",nums:[6,9],useGCF:false,answer:18,hint:"LCM: next coincidence"},
  {text:"Tiles are 15cm and 20cm wide. What is the shortest length of wall that can be tiled exactly with either size?",nums:[15,20],useGCF:false,answer:60,hint:"LCM: smallest common length"},
  {text:"Two classes of 30 and 42 students will be split into equal groups with no students left over. What is the largest possible group size?",nums:[30,42],useGCF:true,answer:6,hint:"GCF: largest equal group"},
];
export function genWordProblem() {
  const wp=randChoice(WORD_PROBLEMS);
  return {
    type:"word-problem",
    text:wp.text,nums:wp.nums,useGCF:wp.useGCF,
    answer:JSON.stringify({method:wp.useGCF?"gcf":"lcm",value:wp.answer}),
    displayAnswer:`${wp.useGCF?"GCF":"LCM"} = ${wp.answer}`,
    correctMethod:wp.useGCF?"gcf":"lcm",
    correctValue:wp.answer,
    hint:wp.hint,
    prompt:"Select GCF or LCM, then enter the answer.",
  };
}
export function gradeWordProblem(input,q){
  try{
    const ans=JSON.parse(input);
    return ans.method===q.correctMethod&&parseInt(ans.value)===q.correctValue;
  }catch{return false;}
}

// -- Topic registry --
export const LESSON13_TOPICS=[
  {id:"warmup-a",    label:"Warm-up: Divisibility Review",    description:"Select all rules that apply"},
  {id:"warmup-b",    label:"Warm-up: Prime or Composite?",    description:"Is 1 prime or composite?"},
  {id:"warmup-c",    label:"Warm-up: Prime Factorization",    description:"Factor 72"},
  {id:"list-factors",label:"A1: List All Factors",            description:"Select correct factor set (MC)"},
  {id:"missing-factor",label:"A2: Missing Factor",            description:"Find the missing factor"},
  {id:"first-five-multiples",label:"A3: First Five Multiples",description:"Enter first 5 multiples"},
  {id:"is-multiple", label:"A4: Is it a Multiple?",           description:"6 simultaneous Yes/No"},
  {id:"gcf-factors", label:"A5: GCF by Listing Factors",      description:"Multiple choice"},
  {id:"gcf-pf",      label:"A6: GCF by Prime Factorization",  description:"3-stage step-by-step"},
  {id:"gcf-direct",  label:"A7: GCF Direct",                  description:"3 problems, free response"},
  {id:"lcm-multiples",label:"A8: LCM by Listing Multiples",   description:"Multiple choice"},
  {id:"lcm-pf",      label:"A9: LCM by Prime Factorization",  description:"3-stage step-by-step"},
  {id:"lcm-direct",  label:"A10: LCM Direct",                 description:"3 problems, free response"},
  {id:"word-problem",label:"A11: GCF vs LCM Word Problem",    description:"Select method + answer"},
];

export function generateLesson13Question(topicId,extra){
  switch(topicId){
    case "warmup-a":    return genWarmupA();
    case "warmup-b":    return genWarmupB();
    case "warmup-c":    return genWarmupC();
    case "list-factors":return genListFactors();
    case "missing-factor":return genMissingFactor();
    case "first-five-multiples":return genFirstFiveMultiples();
    case "is-multiple": return genIsMultiple();
    case "gcf-factors": return genGCFByFactors();
    case "gcf-pf":      return genGCFByPF();
    case "gcf-direct":  return genGCFDirect(extra?.idx||0);
    case "lcm-multiples":return genLCMByMultiples();
    case "lcm-pf":      return genLCMByPF();
    case "lcm-direct":  return genLCMDirect(extra?.idx||0);
    case "word-problem":return genWordProblem();
    default:            return genWarmupA();
  }
}

export function gradeLesson13Answer(input,question){
  if(!input||!question) return false;
  switch(question.type){
    case "warmup-a":    return gradeWarmupA(input,question);
    case "warmup-b":    return gradeWarmupB(input,question);
    case "warmup-c":    return gradeWarmupC(input,question);
    case "list-factors":return gradeListFactors(input,question);
    case "missing-factor":return gradeMissingFactor(input,question);
    case "first-five-multiples":return gradeFirstFiveMultiples(input,question);
    case "is-multiple": return gradeIsMultiple(input,question);
    case "gcf-factors": return gradeGCFByFactors(input,question);
    case "gcf-pf":      return parseInt(String(input).trim())===question.g;
    case "gcf-direct":  return gradeGCFDirect(input,question);
    case "lcm-multiples":return gradeLCMByMultiples(input,question);
    case "lcm-pf":      return parseInt(String(input).trim())===question.l;
    case "lcm-direct":  return gradeLCMDirect(input,question);
    case "word-problem":return gradeWordProblem(input,question);
    default:            return false;
  }
}


