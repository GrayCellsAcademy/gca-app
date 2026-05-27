// Lesson 14 - Introduction to Fractions

function randInt(min, max) { return Math.floor(Math.random()*(max-min+1))+min; }
function randChoice(arr) { return arr[Math.floor(Math.random()*arr.length)]; }
function shuffle(arr) { const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }

function gcd(a,b){ return b===0?a:gcd(b,a%b); }
function reduce(n,d){ const g=gcd(Math.abs(n),Math.abs(d)); return [n/g,d/g]; }

function primeFactors(n){ const f={}; let d=2; while(n>1){while(n%d===0){f[d]=(f[d]||0)+1;n/=d;}d++;} return f; }
function formatPF(n){
  const f=primeFactors(n);
  return Object.entries(f).sort(([a],[b])=>a-b).map(([p,e])=>e===1?p:`${p}^${e}`).join(" x ");
}
function parsePF(str){
  const s=String(str).trim().toLowerCase().replace(/\u00d7/g,"x").replace(/\*/g,"x").replace(/\s+/g,"");
  const f={};
  for(const t of s.split("x")){
    const m=t.match(/^(\d+)(?:\^(\d+))?$/);
    if(!m) return null;
    f[parseInt(m[1])]=(f[parseInt(m[1])]||0)+(m[2]?parseInt(m[2]):1);
  }
  return f;
}
function pfsEqual(a,b){
  if(!a||!b) return false;
  const ka=Object.keys(a),kb=Object.keys(b);
  if(ka.length!==kb.length) return false;
  return ka.every(k=>a[k]===b[k]);
}

// Parse fraction input: "3/4", "1 1/2", "1-1/2", "3/4"
function parseFraction(str){
  const s=String(str).trim().replace(/\s*-\s*/g," ").replace(/\s+/g," ");
  // Mixed: "1 1/2"
  const mixedMatch=s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if(mixedMatch){
    const whole=parseInt(mixedMatch[1]),num=parseInt(mixedMatch[2]),den=parseInt(mixedMatch[3]);
    return {whole,num,den,value:whole+num/den,isProper:false,isMixed:true};
  }
  // Improper/proper: "3/4"
  const fracMatch=s.match(/^(\d+)\/(\d+)$/);
  if(fracMatch){
    const num=parseInt(fracMatch[1]),den=parseInt(fracMatch[2]);
    return {whole:0,num,den,value:num/den,isMixed:false,isProper:num<den};
  }
  // Whole number
  const wholeMatch=s.match(/^(\d+)$/);
  if(wholeMatch) return {whole:parseInt(wholeMatch[1]),num:0,den:1,value:parseInt(wholeMatch[1]),isMixed:false};
  return null;
}

function fractionEqual(a,b){
  if(!a||!b) return false;
  // Compare by value (handle mixed and improper equivalence)
  const aVal=a.whole+(a.num/a.den);
  const bVal=b.whole+(b.num/b.den);
  return Math.abs(aVal-bVal)<0.0001;
}

// - Warm-up A: Prime factorization of 84 -
export function genWarmupA(){
  const n=84;
  const f=primeFactors(n);
  return {type:"warmup-a",n,factors:f,answer:formatPF(n),displayAnswer:formatPF(n),prompt:`Enter the prime factorization of ${n}.`};
}
export function gradeWarmupA(input,q){ return pfsEqual(parsePF(input),q.factors); }

// - Warm-up B: GCF of two 2-digit numbers (GCF is product of 2+ primes) -
export function genWarmupB(){
  // Find pairs where GCF has at least 2 prime factors (counting multiplicity)
  for(let attempt=0;attempt<500;attempt++){
    const a=randInt(20,99), b=randInt(20,99);
    if(a===b) continue;
    const g=gcd(a,b);
    if(g<6) continue; // need at least 2*3=6
    const pf=primeFactors(g);
    const total=Object.values(pf).reduce((s,e)=>s+e,0);
    if(total<2) continue; // need 2+ prime factors
    return {type:"warmup-b",a,b,g,answer:String(g),displayAnswer:String(g),prompt:`Find the GCF of ${a} and ${b}.`};
  }
  return {type:"warmup-b",a:36,b:48,g:12,answer:"12",displayAnswer:"12",prompt:"Find the GCF of 36 and 48."};
}
export function gradeWarmupB(input,q){ return parseInt(String(input).trim())===q.g; }

// - Warm-up C: LCM of two 2-digit numbers (GCF is product of 2+ primes) -
function lcm(a,b){ return (a*b)/gcd(a,b); }
export function genWarmupC(){
  for(let attempt=0;attempt<500;attempt++){
    const a=randInt(12,60), b=randInt(12,60);
    if(a===b) continue;
    const g=gcd(a,b);
    if(g<6) continue;
    const pf=primeFactors(g);
    const total=Object.values(pf).reduce((s,e)=>s+e,0);
    if(total<2) continue;
    const l=lcm(a,b);
    if(l>300) continue;
    return {type:"warmup-c",a,b,l,answer:String(l),displayAnswer:String(l),prompt:`Find the LCM of ${a} and ${b}.`};
  }
  return {type:"warmup-c",a:12,b:18,l:36,answer:"36",displayAnswer:"36",prompt:"Find the LCM of 12 and 18."};
}
export function gradeWarmupC(input,q){ return parseInt(String(input).trim())===q.l; }

// - Topic 1 A1: Identify fraction from picture -
const DENOMS=[2,3,4,5,6,8,10];
export function genIdentifyFraction(){
  const den=randChoice(DENOMS);
  const num=randInt(1,den-1);
  const shape=randChoice(["circle","rectangle"]);
  return {
    type:"identify-fraction",num,den,shape,
    answer:`${num}/${den}`,displayAnswer:`${num}/${den}`,
    prompt:`What fraction is shaded?`,
  };
}
export function gradeIdentifyFraction(input,q){
  const p=parseFraction(String(input).trim());
  if(!p) return false;
  const [rn,rd]=reduce(p.num||p.whole,p.den||1);
  const [qn,qd]=reduce(q.num,q.den);
  return rn===qn&&rd===qd;
}

// - Topic 2 A3: Classify the fraction -
const CLASSIFY_FRACTIONS=shuffle([
  {num:0,den:5,correct:"zero",display:"0/5"},
  {num:2,den:3,correct:"proper",display:"2/3"},
  {num:7,den:7,correct:"one",display:"7/7"},
  {num:9,den:4,correct:"improper",display:"9/4"},
  {num:12,den:5,correct:"improper",display:"12/5"},
  {num:0,den:1,correct:"zero",display:"0/1"},
]);
export function genClassifyFractions(){
  const fractions=shuffle([
    {num:0,den:5,correct:"zero",display:"0/5"},
    {num:2,den:3,correct:"proper",display:"2/3"},
    {num:7,den:7,correct:"one",display:"7/7"},
    {num:9,den:4,correct:"improper",display:"9/4"},
    {num:12,den:5,correct:"improper",display:"12/5"},
    {num:0,den:1,correct:"zero",display:"0/1"},
  ]);
  return {type:"classify-fractions",fractions,prompt:"Classify each fraction."};
}
export function gradeClassifyItem(answer,item){
  return String(answer).trim().toLowerCase()===item.correct;
}
export function gradeClassifyFractions(input,q){
  try{
    const ans=JSON.parse(input);
    return q.fractions.every((f,i)=>gradeClassifyItem(ans[i],f));
  }catch{return false;}
}

// - Topic 3 A5: Identify point on number line -
export function genNumberLinePoint(){
  // Generate a point between 0 and 2
  const type=randChoice(["proper","improper","mixed"]);
  let num,den,whole,display,value;
  if(type==="proper"){
    den=randChoice([2,3,4,5,6,8]);
    num=randInt(1,den-1);
    whole=0; value=num/den;
    display=`${num}/${den}`;
  } else if(type==="improper"){
    den=randChoice([2,3,4,5,6]);
    num=den+randInt(1,den); // > 1, up to 2
    if(num>2*den) num=den+1;
    whole=0; value=num/den;
    display=`${num}/${den}`;
  } else {
    whole=1; den=randChoice([2,3,4,5,6,8]);
    num=randInt(1,den-1);
    value=whole+num/den;
    display=`1 ${num}/${den}`;
  }
  // Store value as numerator/denominator pair (Firestore-safe, no float)
  const totalNum = whole*den + num; // value = totalNum/den
  return {
    type:"number-line",num,den,whole,value,totalNum,display,
    answer:display,displayAnswer:display,
    acceptImproper:true,
    prompt:"What fraction or mixed number is marked on the number line?",
  };
}
export function gradeNumberLinePoint(input,q){
  const p=parseFraction(String(input).trim());
  if(!p) return false;
  const inputVal=p.isMixed?(p.whole+p.num/p.den):p.num/p.den;
  // Use totalNum/den for comparison if value is missing (Firestore float issue)
  const targetVal = (q.value !== undefined) ? q.value : (q.totalNum/q.den);
  return Math.abs(inputVal-targetVal)<0.001;
}

// - Topic 4 A7: Convert improper to mixed -
export function genImproperToMixed(){
  const pool=[
    {num:7,den:3},{num:11,den:4},{num:8,den:5},{num:13,den:6},
    {num:9,den:4},{num:11,den:3},{num:17,den:5},{num:15,den:4},
    {num:10,den:3},{num:13,den:5},{num:19,den:6},{num:11,den:7},
  ];
  const fracs=shuffle(pool).slice(0,4);
  return {
    type:"improper-to-mixed",
    fractions:fracs.map(f=>{
      const whole=Math.floor(f.num/f.den);
      const rem=f.num%f.den;
      return {...f,whole,rem,answer:`${whole} ${rem}/${f.den}`,displayAnswer:`${whole} ${rem}/${f.den}`};
    }),
    prompt:"Convert each improper fraction to a mixed number.",
  };
}
export function gradeImproperToMixedItem(input,item){
  const s=String(input).trim().replace(/\s*-\s*/g," ");
  const m=s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if(!m) return false;
  return parseInt(m[1])===item.whole&&parseInt(m[2])===item.rem&&parseInt(m[3])===item.den;
}
export function gradeImproperToMixed(input,q){
  try{
    const ans=JSON.parse(input);
    return q.fractions.every((f,i)=>gradeImproperToMixedItem(ans[i],f));
  }catch{return false;}
}

// - Topic 4 A8: Convert mixed to improper -
export function genMixedToImproper(){
  const pool=[
    {whole:2,num:1,den:3},{whole:3,num:2,den:5},{whole:1,num:3,den:4},{whole:4,num:2,den:7},
    {whole:2,num:3,den:5},{whole:3,num:1,den:4},{whole:5,num:2,den:3},{whole:2,num:5,den:6},
    {whole:1,num:2,den:5},{whole:3,num:3,den:7},{whole:4,num:1,den:3},{whole:2,num:4,den:9},
  ];
  const fracs=shuffle(pool).slice(0,4);
  return {
    type:"mixed-to-improper",
    fractions:fracs.map(f=>{
      const impNum=f.whole*f.den+f.num;
      return {...f,impNum,answer:`${impNum}/${f.den}`,displayAnswer:`${impNum}/${f.den}`};
    }),
    prompt:"Convert each mixed number to an improper fraction.",
  };
}
export function gradeMixedToImproperItem(input,item){
  const m=String(input).trim().match(/^(\d+)\/(\d+)$/);
  if(!m) return false;
  return parseInt(m[1])===item.impNum&&parseInt(m[2])===item.den;
}
export function gradeMixedToImproper(input,q){
  try{
    const ans=JSON.parse(input);
    return q.fractions.every((f,i)=>gradeMixedToImproperItem(ans[i],f));
  }catch{return false;}
}

// - Topic 5 A9: Find missing numerator or denominator -
export function genMissingEquiv(){
  const denoms=[2,3,4,5,6,8,10,12];
  for(let i=0;i<200;i++){
    const d1=randChoice(denoms);
    const n1=randInt(1,d1-1);
    const mult=randInt(2,6);
    const d2=d1*mult, n2=n1*mult;
    const missingNum=Math.random()<0.5;
    if(missingNum){
      return {type:"missing-equiv",n1,d1,n2:null,d2,missing:"numerator",answer:String(n2),displayAnswer:String(n2),
        display:`${n1}/${d1} = ?/${d2}`,prompt:`Find the missing numerator: ${n1}/${d1} = ?/${d2}`};
    } else {
      return {type:"missing-equiv",n1,d1,n2,d2:null,missing:"denominator",answer:String(d2),displayAnswer:String(d2),
        display:`${n1}/${d1} = ${n2}/?`,prompt:`Find the missing denominator: ${n1}/${d1} = ${n2}/?`};
    }
  }
  return {type:"missing-equiv",n1:2,d1:3,n2:null,d2:12,missing:"numerator",answer:"8",displayAnswer:"8",display:"2/3 = ?/12",prompt:"Find the missing numerator: 2/3 = ?/12"};
}
export function gradeMissingEquiv(input,q){
  return parseInt(String(input).trim())===parseInt(q.answer);
}

// - Topic 5 A10: Generate equivalent fraction -
export function genEquivFraction(){
  const denoms=[2,3,4,5,6,8];
  const d=randChoice(denoms);
  const n=randInt(1,d-1);
  return {
    type:"equiv-fraction",n,d,
    answer:`any multiple of ${n}/${d}`,
    displayAnswer:`e.g. ${n*2}/${d*2}`,
    prompt:`Enter any fraction equivalent to ${n}/${d} (other than ${n}/${d} itself).`,
  };
}
export function gradeEquivFraction(input,q){
  const p=parseFraction(String(input).trim());
  if(!p||!p.den) return false;
  const {num:pn,den:pd}=p;
  if(pn===q.n&&pd===q.d) return false; // must be different
  const [rn,rd]=reduce(pn,pd);
  const [qrn,qrd]=reduce(q.n,q.d);
  return rn===qrn&&rd===qrd;
}

// - Topic 6 A11: Reduce fraction (MC) -
export function genReduceMC(){
  // Generate reducible fraction and 4 options
  const reducibles=[
    {n:8,d:12},{n:6,d:9},{n:10,d:15},{n:12,d:16},{n:9,d:12},
    {n:6,d:8},{n:15,d:20},{n:14,d:21},{n:8,d:20},{n:6,d:10},
    {n:4,d:6},{n:9,d:15},{n:10,d:12},{n:12,d:18},{n:15,d:25},
  ];
  const {n,d}=randChoice(reducibles);
  const [rn,rd]=reduce(n,d);
  // Generate wrong options: partially reduced or wrong
  const wrongs=new Set();
  const g=gcd(n,d);
  const factors=[2,3,4,5,g].filter(f=>f>1&&f<g&&n%f===0&&d%f===0);
  factors.forEach(f=>wrongs.add(`${n/f}/${d/f}`));
  wrongs.add(`${n}/${d}`); // original unreduced
  wrongs.delete(`${rn}/${rd}`);
  const options=shuffle([`${rn}/${rd}`,...[...wrongs].slice(0,3)]);
  const correctIdx=options.indexOf(`${rn}/${rd}`);
  return {
    answer:String(correctIdx),displayAnswer:`${rn}/${rd}`,
    prompt:`Reduce ${n}/${d} to lowest terms.`,
  };
}
export function gradeReduceMC(input,q){
  return parseInt(String(input).trim())===q.correctIdx;
}

// - Topic 6 A12: Reduce fraction (free response) -
export function genReduceFree(){
  const reducibles=[
    {n:18,d:24},{n:12,d:16},{n:15,d:20},{n:10,d:15},{n:8,d:12},
    {n:6,d:9},{n:20,d:25},{n:14,d:21},{n:16,d:24},{n:9,d:12},
    {n:15,d:25},{n:12,d:20},{n:18,d:27},{n:10,d:14},{n:6,d:15},
  ];
  const {n,d}=randChoice(reducibles);
  const [rn,rd]=reduce(n,d);
  return {
    type:"reduce-free",n,d,rn,rd,
    answer:`${rn}/${rd}`,displayAnswer:`${rn}/${rd}`,
    prompt:`Reduce ${n}/${d} to lowest terms.`,
  };
}
export function gradeReduceFree(input,q){
  const m=String(input).trim().match(/^(\d+)\/(\d+)$/);
  if(!m) return false;
  const n=parseInt(m[1]),d=parseInt(m[2]);
  return n===q.rn&&d===q.rd;
}

// - Topic 6 A13: Mixed review -
export function genMixedReview(){
  // 6 simultaneous questions covering all skills
  const identFrac=()=>{
    const den=randChoice([2,3,4,6,8]);
    const num=randInt(1,den-1);
    return {subtype:"identify",num,den,display:`[Shaded: ${num}/${den}]`,answer:`${num}/${den}`,displayAnswer:`${num}/${den}`};
  };
  const classifyFrac=()=>{
    const options=[
      {num:0,den:5,correct:"zero",display:"0/5"},
      {num:2,den:3,correct:"proper",display:"2/3"},
      {num:7,den:7,correct:"one (= 1)",display:"7/7"},
      {num:9,den:4,correct:"improper",display:"9/4"},
    ];
    const item=randChoice(options);
    return {subtype:"classify",display:item.display,answer:item.correct,displayAnswer:item.correct,correct:item.correct};
  };
  const impToMix=()=>{
    const pool=[{num:7,den:3},{num:11,den:4},{num:8,den:5},{num:13,den:6}];
    const f=randChoice(pool);
    const whole=Math.floor(f.num/f.den),rem=f.num%f.den;
    return {subtype:"imp-to-mix",display:`${f.num}/${f.den}`,whole,rem,den:f.den,answer:`${whole} ${rem}/${f.den}`,displayAnswer:`${whole} ${rem}/${f.den}`};
  };
  const mixToImp=()=>{
    const pool=[{whole:2,num:1,den:3},{whole:3,num:2,den:5},{whole:1,num:3,den:4}];
    const f=randChoice(pool);
    const imp=f.whole*f.den+f.num;
    return {subtype:"mix-to-imp",display:`${f.whole} ${f.num}/${f.den}`,whole:f.whole,num:f.num,den:f.den,imp,answer:`${imp}/${f.den}`,displayAnswer:`${imp}/${f.den}`};
  };
  const missingEquiv=()=>{
    const d1=randChoice([2,3,4,6]);
    const n1=randInt(1,d1-1);
    const mult=randInt(2,5);
    const n2=n1*mult,d2=d1*mult;
    return {subtype:"missing-equiv",n1,d1,d2,answer:String(n2),displayAnswer:String(n2),display:`${n1}/${d1} = ?/${d2}`};
  };
  const reduceFrac=()=>{
    const pool=[{n:8,d:12},{n:6,d:9},{n:10,d:15},{n:12,d:16}];
    const {n,d}=randChoice(pool);
    const [rn,rd]=reduce(n,d);
    return {subtype:"reduce",n,d,rn,rd,display:`${n}/${d}`,answer:`${rn}/${rd}`,displayAnswer:`${rn}/${rd}`};
  };
  const questions=shuffle([identFrac(),classifyFrac(),impToMix(),mixToImp(),missingEquiv(),reduceFrac()]);
}
export function gradeMixedReviewItem(input,item){
  if(!input) return false;
  const s=String(input).trim();
  if(item.subtype==="identify"){
    const p=parseFraction(s);
    if(!p) return false;
    const [rn,rd]=reduce(p.num,p.den);
    const [qrn,qrd]=reduce(item.num,item.den);
    return rn===qrn&&rd===qrd;
  }
  if(item.subtype==="classify") return s.toLowerCase().includes(item.correct.toLowerCase().split(" ")[0]);
  if(item.subtype==="imp-to-mix"){
    const m=s.replace(/\s*-\s*/g," ").match(/^(\d+)\s+(\d+)\/(\d+)$/);
    return m&&parseInt(m[1])===item.whole&&parseInt(m[2])===item.rem&&parseInt(m[3])===item.den;
  }
  if(item.subtype==="mix-to-imp"){
    const m=s.match(/^(\d+)\/(\d+)$/);
    return m&&parseInt(m[1])===item.imp&&parseInt(m[2])===item.den;
  }
  if(item.subtype==="missing-equiv") return parseInt(s)===parseInt(item.answer);
  if(item.subtype==="reduce"){
    const m=s.match(/^(\d+)\/(\d+)$/);
    return m&&parseInt(m[1])===item.rn&&parseInt(m[2])===item.rd;
  }
  return false;
}
export function gradeMixedReview(input,q){
  try{
    const ans=JSON.parse(input);
    return q.questions.every((item,i)=>gradeMixedReviewItem(ans[i],item));
  }catch{return false;}
}

// - Topic registry -
export const LESSON14_TOPICS=[
  {id:"warmup-a",        label:"Warm-up: Prime Factorization",  description:"Factor 84"},
  {id:"warmup-b",        label:"Warm-up: GCF",                  description:"GCF of 36 and 48"},
  {id:"warmup-c",        label:"Warm-up: LCM",                  description:"LCM of 12 and 18"},
  {id:"identify-fraction",label:"A1: Identify Fraction from Picture", description:"Enter fraction a/b"},
  {id:"classify-fractions",label:"A3: Classify the Fraction",   description:"6 simultaneous Zero/Proper/One/Improper"},
  {id:"number-line",     label:"A5: Identify Point on Number Line", description:"Enter fraction or mixed number"},
  {id:"improper-to-mixed",label:"A7: Convert Improper to Mixed",description:"4 simultaneous"},
  {id:"mixed-to-improper",label:"A8: Convert Mixed to Improper",description:"4 simultaneous"},
  {id:"missing-equiv",   label:"A9: Missing Numerator/Denominator", description:"Equivalent fractions"},
  {id:"equiv-fraction",  label:"A10: Generate Equivalent Fraction", description:"Enter any equivalent fraction"},
  {id:"reduce-free",     label:"A12: Reduce Fraction (Free)",   description:"Enter fraction in lowest terms"},
];

export function generateLesson14Question(topicId){
  switch(topicId){
    case "warmup-a":         return genWarmupA();
    case "warmup-b":         return genWarmupB();
    case "warmup-c":         return genWarmupC();
    case "identify-fraction":return genIdentifyFraction();
    case "classify-fractions":return genClassifyFractions();
    case "number-line":      return genNumberLinePoint();
    case "improper-to-mixed":return genImproperToMixed();
    case "mixed-to-improper":return genMixedToImproper();
    case "missing-equiv":    return genMissingEquiv();
    case "equiv-fraction":   return genEquivFraction();
    case "reduce-free":      return genReduceFree();
    default:                 return genWarmupA();
  }
}

export function gradeLesson14Answer(input,question){
  if(!input||!question) return false;
  switch(question.type){
    case "warmup-a":          return gradeWarmupA(input,question);
    case "warmup-b":          return gradeWarmupB(input,question);
    case "warmup-c":          return gradeWarmupC(input,question);
    case "identify-fraction": return gradeIdentifyFraction(input,question);
    case "classify-fractions":return gradeClassifyFractions(input,question);
    case "number-line":       return gradeNumberLinePoint(input,question);
    case "improper-to-mixed": return gradeImproperToMixed(input,question);
    case "mixed-to-improper": return gradeMixedToImproper(input,question);
    case "missing-equiv":     return gradeMissingEquiv(input,question);
    case "equiv-fraction":    return gradeEquivFraction(input,question);
    case "reduce-free":       return gradeReduceFree(input,question);
    default:                  return false;
  }
}



