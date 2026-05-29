// Lesson 15 - Adding and Subtracting Fractions

function randInt(min, max) { return Math.floor(Math.random()*(max-min+1))+min; }
function randChoice(arr) { return arr[Math.floor(Math.random()*arr.length)]; }
function shuffle(arr) { const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }

function gcd(a,b){ a=Math.abs(a);b=Math.abs(b); return b===0?a:gcd(b,a%b); }
function lcm(a,b){ return Math.abs(a*b)/gcd(a,b); }
function reduce(n,d){
  if(d===0) return [n,d];
  if(n===0) return [0,1];
  const g=gcd(Math.abs(n),Math.abs(d));
  const sign=d<0?-1:1;
  return [sign*n/g,sign*d/g];
}
function primeFactors(n){ const f={}; let d=2; n=Math.abs(n); while(n>1){while(n%d===0){f[d]=(f[d]||0)+1;n/=d;}d++;} return f; }
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

// Parse a fraction/mixed number/integer string
// Returns {whole, num, den, neg} where value = whole + num/den (neg applies to all)
function parseFrac(str){
  const s=String(str).trim();
  if(!s) return null;
  const neg=s.startsWith("-");
  const abs=neg?s.slice(1).trim():s;
  // mixed: "2 1/3"
  const mx=abs.replace(/\s*-\s*/g," ").match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if(mx) return {whole:parseInt(mx[1]),num:parseInt(mx[2]),den:parseInt(mx[3]),neg};
  // fraction: "5/7"
  const fx=abs.match(/^(\d+)\/(\d+)$/);
  if(fx) return {whole:0,num:parseInt(fx[1]),den:parseInt(fx[2]),neg};
  // integer: "3"
  const ix=abs.match(/^(\d+)$/);
  if(ix) return {whole:parseInt(ix[1]),num:0,den:1,neg};
  return null;
}

function fracValue(p){
  if(!p) return NaN;
  const v=p.whole+p.num/p.den;
  return p.neg?-v:v;
}

// Format a fraction result (num/den as integers, may be negative)
// Returns simplified string: "-1/3", "2/3", "-1", "3", "1 2/3", etc.
function fmtFrac(num, den, asMixed=false){
  if(den===0) return "0";
  const [rn,rd]=reduce(num,den);
  if(rd===1) return String(rn);
  if(asMixed && Math.abs(rn)>=rd){
    const sign=rn<0?"-":"";
    const whole=Math.floor(Math.abs(rn)/rd);
    const rem=Math.abs(rn)%rd;
    return rem===0?`${sign}${whole}`:`${sign}${whole} ${rem}/${rd}`;
  }
  return `${rn}/${rd}`;
}

function fmtMixed(num, den){
  const [rn,rd]=reduce(num,den);
  if(rd===1) return String(rn);
  if(Math.abs(rn)<rd) return `${rn}/${rd}`;
  const sign=rn<0?"-":"";
  const whole=Math.floor(Math.abs(rn)/rd);
  const rem=Math.abs(rn)%rd;
  return rem===0?`${sign}${whole}`:`${sign}${whole} ${rem}/${rd}`;
}

function answerMatches(input, correctNum, correctDen){
  const p=parseFrac(String(input).trim());
  if(!p) return false;
  const inputNum=p.neg?-(p.whole*p.den+p.num):(p.whole*p.den+p.num);
  const inputDen=p.den;
  const [rn,rd]=reduce(correctNum,correctDen);
  const [in_,id_]=reduce(inputNum,inputDen);
  return rn===in_&&rd===id_;
}

// - Warm-up A: Reduce 24/36 -
export function genWarmupA(){
  return {type:"warmup-a",n:24,d:36,rn:2,rd:3,answer:"2/3",displayAnswer:"2/3",prompt:"Reduce 24/36 to lowest terms."};
}
export function gradeWarmupA(input,q){ return answerMatches(input,q.rn,q.rd); }

// - Warm-up B: Mixed to improper 3 2/5 -
export function genWarmupB(){
  return {type:"warmup-b",whole:3,num:2,den:5,imp:17,answer:"17/5",displayAnswer:"17/5",prompt:"Convert 3 2/5 to an improper fraction."};
}
export function gradeWarmupB(input,q){
  const m=String(input).trim().match(/^(\d+)\/(\d+)$/);
  return m&&parseInt(m[1])===q.imp&&parseInt(m[2])===q.den;
}

// - Warm-up C: Improper to mixed 17/3 -
export function genWarmupC(){
  return {type:"warmup-c",num:17,den:3,whole:5,rem:2,answer:"5 2/3",displayAnswer:"5 2/3",prompt:"Convert 17/3 to a mixed number."};
}
export function gradeWarmupC(input,q){
  const s=String(input).trim().replace(/\s*-\s*/g," ");
  const m=s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  return m&&parseInt(m[1])===q.whole&&parseInt(m[2])===q.rem&&parseInt(m[3])===q.den;
}

// - Warm-up D: Equivalent fraction 5/8 = ?/24 -
export function genWarmupD(){
  return {type:"warmup-d",n1:5,d1:8,d2:24,answer:"15",displayAnswer:"15",prompt:"Find the missing numerator: 5/8 = ?/24"};
}
export function gradeWarmupD(input,q){ return parseInt(String(input).trim())===15; }

// - Helpers for generating fraction arithmetic -
const SIMPLE_DENOMS=[3,4,5,6,7,8,9,10,12];

function genCommonDenomPair(requireSimplify=false){
  for(let i=0;i<200;i++){
    const den=randChoice(SIMPLE_DENOMS);
    const op=randChoice(["+","-"]);
    let n1=randInt(1,den-1), n2=randInt(1,den-1);
    if(op==="-") while(n1<=n2) n2=randInt(1,den-1);
    const resNum=op==="+"?n1+n2:n1-n2;
    const g=gcd(resNum,den);
    const isSimplifiable=g>1&&resNum!==den;
    if(requireSimplify&&!isSimplifiable) continue;
    if(!requireSimplify&&isSimplifiable) continue;
    return {n1,n2,den,op,resNum,resDen:den};
  }
  // fallback
  return requireSimplify
    ?{n1:3,n2:5,den:12,op:"+",resNum:8,resDen:12}
    :{n1:2,n2:3,den:7,op:"+",resNum:5,resDen:7};
}

function genCommonDenomNeg(){
  // Result is negative or crosses zero
  const den=randChoice([3,5,7,9]);
  const combos=[
    ()=>{const n1=randInt(1,den-1),n2=randInt(n1+1,den);return{n1,n2,den,op:"+",neg1:false,neg2:true};},
    ()=>{const n1=randInt(1,den-1),n2=randInt(1,den-1);return{n1,n2,den,op:"+",neg1:true,neg2:true};},
    ()=>{const n1=randInt(1,den-2),n2=randInt(n1+1,den-1);return{n1,n2,den,op:"-",neg1:false,neg2:false};},
    ()=>{const n1=randInt(1,den-1),n2=randInt(1,den-1);return{n1,n2,den,op:"-",neg1:true,neg2:false};},
  ];
  const {n1,n2,den,op,neg1,neg2}=randChoice(combos)();
  const a=neg1?-n1:n1, b=neg2?-n2:n2;
  const res=op==="+"?a+b:a-b;
  const [rn,rd]=reduce(res,den);
  return {n1:neg1?-n1:n1,n2:neg2?-n2:n2,den,op,resNum:res,resDen:den,rn,rd};
}

function genDiffDenomPair(){
  const pairs=[
    [2,3],[2,5],[3,4],[3,5],[4,5],[2,7],[3,7],[4,7],[5,6],[3,8],[5,8],[4,9],[5,9],[2,9],[3,10],[7,10],[5,12],[7,12],[4,15],[3,8]
  ];
  const [d1,d2]=randChoice(pairs);
  const op=randChoice(["+","-"]);
  const n1=randInt(1,d1-1), n2=randInt(1,d2-1);
  const cd=lcm(d1,d2);
  const resNum=op==="+"?n1*(cd/d1)+n2*(cd/d2):n1*(cd/d1)-n2*(cd/d2);
  const [rn,rd]=reduce(resNum,cd);
  return {n1,d1,n2,d2,op,resNum,resDen:cd,rn,rd,lcd:cd};
}

function genDiffDenomNegHelper(){
  const pairs=[[2,3],[3,4],[4,5],[5,6],[2,5],[3,7],[5,8]];
  const [d1,d2]=randChoice(pairs);
  const combos=["+-","--","pos-neg","neg+pos"];
  const combo=randChoice(combos);
  let n1=randInt(1,d1-1),n2=randInt(1,d2-1),op,neg1=false,neg2=false;
  if(combo==="+-"){op="+";neg2=true;}
  else if(combo==="--"){op="-";neg1=true;}
  else if(combo==="pos-neg"){op="-";neg2=true;}
  else{op="+";neg1=true;}
  const a=neg1?-n1:n1, b=neg2?-n2:n2;
  const cd=lcm(d1,d2);
  const resNum=op==="+"?a*(cd/d1)+b*(cd/d2):a*(cd/d1)-b*(cd/d2);
  const [rn,rd]=reduce(resNum,cd);
  return {n1:neg1?-n1:n1,n2:neg2?-n2:n2,d1,d2,op,resNum,resDen:cd,rn,rd,lcd:cd};
}

function fmtSignedFrac(n,d){
  if(n<0) return `-${Math.abs(n)}/${d}`;
  return `${n}/${d}`;
}
function displayProblem(n1,d1,n2,d2,op){
  const f1=d1===0?String(n1):fmtSignedFrac(n1,d1);
  const f2=d2===0?String(n2):fmtSignedFrac(n2,d2);
  // If second is negative and op is +, show as addition of negative
  if(n2<0&&op==="+") return `${f1} + (${f2})`;
  if(n2<0&&op==="-") return `${f1} - (${f2})`;
  return `${f1} ${op} ${f2}`;
}

// - A1: Common denominator, no simplification (4 simultaneous) -
export function genCommonDenomSimple(){
  const problems=[];
  for(let i=0;i<4;i++){
    const p=genCommonDenomPair(false);
    const display=`${p.n1}/${p.den} ${p.op} ${p.n2}/${p.den}`;
    const ans=`${p.resNum}/${p.resDen}`;
    problems.push({...p,display,answer:ans,displayAnswer:ans});
  }
  return {type:"common-simple",problems,prompt:"Add or subtract. No need to simplify."};
}
export function gradeCommonSimpleItem(input,item){
  const p=parseFrac(String(input).trim());
  if(!p) return false;
  return p.whole===0&&p.num===item.resNum&&p.den===item.resDen&&!p.neg;
}
export function gradeCommonSimple(input,q){
  try{const ans=JSON.parse(input);return q.problems.every((p,i)=>gradeCommonSimpleItem(ans[i],p));}catch{return false;}
}

// - A2: Common denominator with simplification (4 simultaneous) -
export function genCommonDenomSimplify(){
  const problems=[];
  for(let i=0;i<4;i++){
    const p=genCommonDenomPair(true);
    const [rn,rd]=reduce(p.resNum,p.resDen);
    const display=`${p.n1}/${p.den} ${p.op} ${p.n2}/${p.den}`;
    const ans=`${rn}/${rd}`;
    problems.push({...p,rn,rd,display,answer:ans,displayAnswer:ans});
  }
  return {type:"common-simplify",problems,prompt:"Add or subtract. Simplify your answer."};
}
export function gradeCommonSimplifyItem(input,item){
  return answerMatches(input,item.rn,item.rd);
}
export function gradeCommonSimplify(input,q){
  try{const ans=JSON.parse(input);return q.problems.every((p,i)=>gradeCommonSimplifyItem(ans[i],p));}catch{return false;}
}

// - A3: Common denominator with negatives (4 simultaneous) -
export function genCommonDenomNeg(){
  const problems=[];
  for(let i=0;i<4;i++){
    const p=genCommonDenomNeg();
    const display=displayProblem(p.n1,p.den,p.n2,p.den,p.op);
    problems.push({...p,display,answer:fmtFrac(p.rn,p.rd),displayAnswer:fmtFrac(p.rn,p.rd)});
  }
  return {type:"common-neg",problems,prompt:"Add or subtract. Simplify your answer."};
}
export function gradeCommonNegItem(input,item){
  return answerMatches(input,item.rn,item.rd);
}
export function gradeCommonNeg(input,q){
  try{const ans=JSON.parse(input);return q.problems.every((p,i)=>gradeCommonNegItem(ans[i],p));}catch{return false;}
}

// - A4: Find a common denominator (5 problems, free response) -
export function genFindCommonDenom(){
  const pairs=[[2,3],[3,4],[2,5],[3,5],[4,6],[5,6],[3,8],[4,9],[2,7],[5,8]];
  const prob=shuffle(pairs).slice(0,5).map(([d1,d2])=>({d1,d2,lcd:lcm(d1,d2),answer:String(lcm(d1,d2)),displayAnswer:`any multiple of ${lcm(d1,d2)} (e.g. ${lcm(d1,d2)})`}));
  return {type:"find-cd",problems:prob,prompt:"Enter any common denominator for each pair."};
}
export function gradeFindCDItem(input,item){
  const n=parseInt(String(input).trim());
  return Number.isInteger(n)&&n>0&&n%item.d1===0&&n%item.d2===0;
}
export function gradeFindCD(input,q){
  try{const ans=JSON.parse(input);return q.problems.every((p,i)=>gradeFindCDItem(ans[i],p));}catch{return false;}
}

// - A5: Staged conversion to common denominator -
export function genStagedCD(){
  const p=genDiffDenomPair();
  // Ensure positive simple case for step-by-step
  const {n1,d1,n2,d2,op,lcd,resNum,resDen,rn,rd}=p;
  const mult1=lcd/d1, mult2=lcd/d2;
  const conv1n=n1*mult1, conv2n=n2*mult2;
  return {
    type:"staged-cd",n1,d1,n2,d2,op,lcd,mult1,mult2,conv1n,conv2n,
    resNum,resDen,rn,rd,
    display:`${n1}/${d1} ${op} ${n2}/${d2}`,
    displayAnswer:fmtFrac(rn,rd,true),
  };
}
export function gradeStagedCDStage(stage,input,q){
  const v=parseInt(String(input).trim());
  const s=String(input).trim();
  switch(stage){
    case 1: return Number.isInteger(v)&&v>0&&v%q.d1===0&&v%q.d2===0;
    case 2: { const cd=v; return cd===q.lcd; } // accept if matches lcd (simplest)
    case 3: return answerMatches(s,q.conv1n,q.lcd);
    case 4: return v===q.mult2;
    case 5: return answerMatches(s,q.conv2n,q.lcd);
    case 6: return answerMatches(s,q.resNum,q.resDen);
    case 7: return answerMatches(s,q.rn,q.rd);
    default: return false;
  }
}

// - A6: Different denominators direct (4 simultaneous) -
export function genDiffDenomDirect(){
  const problems=[];
  for(let i=0;i<4;i++){
    const p=genDiffDenomPair();
    const display=`${p.n1}/${p.d1} ${p.op} ${p.n2}/${p.d2}`;
    problems.push({...p,display,answer:fmtFrac(p.rn,p.rd,true),displayAnswer:fmtFrac(p.rn,p.rd,true)});
  }
  return {type:"diff-direct",problems,prompt:"Add or subtract. Simplify your answer."};
}
export function gradeDiffDirectItem(input,item){
  return answerMatches(input,item.rn,item.rd);
}
export function gradeDiffDirect(input,q){
  try{const ans=JSON.parse(input);return q.problems.every((p,i)=>gradeDiffDirectItem(ans[i],p));}catch{return false;}
}

// - A7: Different denominators with negatives (4 simultaneous) -
export function genDiffDenomNeg(){
  const problems=[];
  for(let i=0;i<4;i++){
    const p=genDiffDenomNegHelper();
    const display=displayProblem(p.n1,p.d1,p.n2,p.d2,p.op);
    problems.push({...p,display,answer:fmtFrac(p.rn,p.rd,true),displayAnswer:fmtFrac(p.rn,p.rd,true)});
  }
  return {type:"diff-neg",problems,prompt:"Add or subtract. Simplify your answer."};
}
export function gradeDiffNegItem(input,item){
  return answerMatches(input,item.rn,item.rd);
}
export function gradeDiffNeg(input,q){
  try{const ans=JSON.parse(input);return q.problems.every((p,i)=>gradeDiffNegItem(ans[i],p));}catch{return false;}
}

// - A8: Add mixed numbers simple (3 problems) -
export function genAddMixedSimple(){
  const pool=[
    {w1:1,n1:1,d:3,w2:2,n2:1},{w1:2,n1:1,d:4,w2:1,n2:2},{w1:3,n1:1,d:5,w2:1,n2:2},
    {w1:1,n1:2,d:7,w2:3,n2:3},{w1:2,n1:1,d:8,w2:1,n2:3},{w1:4,n1:1,d:6,w2:2,n2:2},
  ];
  const probs=shuffle(pool).slice(0,3).map(p=>{
    const rn=(p.w1+p.w2)*p.d+(p.n1+p.n2);
    const[rnn,rdd]=reduce(rn,p.d);
    const ans=fmtMixed(rnn,rdd);
    return {...p,resNum:rn,resDen:p.d,answer:ans,displayAnswer:ans,
      display:`${p.w1} ${p.n1}/${p.d} + ${p.w2} ${p.n2}/${p.d}`};
  });
  return {type:"add-mixed-simple",problems:probs,prompt:"Add the mixed numbers. Simplify if needed."};
}
export function gradeAddMixedSimpleItem(input,item){
  return answerMatches(input,item.resNum,item.resDen);
}
export function gradeAddMixedSimple(input,q){
  try{const ans=JSON.parse(input);return q.problems.every((p,i)=>gradeAddMixedSimpleItem(ans[i],p));}catch{return false;}
}

// - A9: Subtract mixed numbers simple (3 problems) -
export function genSubMixedSimple(){
  const pool=[
    {w1:4,n1:3,d:5,w2:1,n2:1},{w1:5,n1:7,d:8,w2:2,n2:3},{w1:6,n1:2,d:3,w2:4,n2:1},
    {w1:7,n1:5,d:6,w2:3,n2:1},{w1:5,n1:3,d:4,w2:2,n2:1},{w1:8,n1:4,d:7,w2:3,n2:2},
  ];
  const probs=shuffle(pool).slice(0,3).map(p=>{
    const rn=(p.w1-p.w2)*p.d+(p.n1-p.n2);
    const[rnn,rdd]=reduce(rn,p.d);
    const ans=fmtMixed(rnn,rdd);
    return {...p,resNum:rn,resDen:p.d,answer:ans,displayAnswer:ans,
      display:`${p.w1} ${p.n1}/${p.d} - ${p.w2} ${p.n2}/${p.d}`};
  });
  return {type:"sub-mixed-simple",problems:probs,prompt:"Subtract the mixed numbers. Simplify if needed."};
}
export function gradeSubMixedSimpleItem(input,item){
  return answerMatches(input,item.resNum,item.resDen);
}
export function gradeSubMixedSimple(input,q){
  try{const ans=JSON.parse(input);return q.problems.every((p,i)=>gradeSubMixedSimpleItem(ans[i],p));}catch{return false;}
}

// - A10: Add mixed numbers with carrying (3 problems) -
export function genAddMixedCarry(){
  const pool=[
    {w1:2,n1:3,d:4,w2:1,n2:3},{w1:3,n1:5,d:6,w2:2,n2:5},{w1:1,n1:2,d:3,w2:2,n2:2},
    {w1:2,n1:3,d:5,w2:1,n2:4},{w1:3,n1:5,d:8,w2:2,n2:7},{w1:4,n1:4,d:7,w2:1,n2:5},
  ];
  const probs=shuffle(pool).slice(0,3).map(p=>{
    const totalN=p.n1+p.n2+p.w1*p.d+p.w2*p.d; // total as improper
    // resNum as fraction of den: total fraction = (w1+w2)*d + n1+n2
    const fracNum=p.n1+p.n2;
    const carry=Math.floor(fracNum/p.d);
    const remNum=fracNum%p.d;
    const wholeRes=p.w1+p.w2+carry;
    const[rnn,rdd]=reduce(remNum===0?wholeRes:wholeRes*p.d+remNum,remNum===0?1:p.d);
    const ans=fmtMixed(rnn,rdd);
    return {w1:p.w1,n1:p.n1,w2:p.w2,n2:p.n2,d:p.d,resNum:p.w1*p.d+p.n1+(p.w2*p.d+p.n2),resDen:p.d,answer:ans,displayAnswer:ans,
      display:`${p.w1} ${p.n1}/${p.d} + ${p.w2} ${p.n2}/${p.d}`};
  });
  return {type:"add-mixed-carry",problems:probs,prompt:"Add. Simplify your answer."};
}
export function gradeAddMixedCarryItem(input,item){
  return answerMatches(input,item.resNum,item.resDen);
}
export function gradeAddMixedCarry(input,q){
  try{const ans=JSON.parse(input);return q.problems.every((p,i)=>gradeAddMixedCarryItem(ans[i],p));}catch{return false;}
}

// - A11: Subtract mixed numbers with borrowing (3 problems) -
export function genSubMixedBorrow(){
  const pool=[
    {w1:4,n1:1,d:4,w2:2,n2:3},{w1:5,n1:1,d:3,w2:2,n2:2},{w1:6,n1:1,d:5,w2:3,n2:4},
    {w1:7,n1:2,d:7,w2:4,n2:5},{w1:5,n1:1,d:6,w2:2,n2:5},{w1:8,n1:1,d:8,w2:3,n2:5},
  ];
  const probs=shuffle(pool).slice(0,3).map(p=>{
    // borrow: (w1-1) + (d+n1)/d - w2 + n2/d
    const totalNum=(p.w1*p.d+p.n1)-(p.w2*p.d+p.n2);
    const[rnn,rdd]=reduce(totalNum,p.d);
    const ans=fmtMixed(rnn,rdd);
    return {w1:p.w1,n1:p.n1,w2:p.w2,n2:p.n2,d:p.d,resNum:totalNum,resDen:p.d,answer:ans,displayAnswer:ans,
      display:`${p.w1} ${p.n1}/${p.d} - ${p.w2} ${p.n2}/${p.d}`};
  });
  return {type:"sub-mixed-borrow",problems:probs,prompt:"Subtract. Simplify your answer."};
}
export function gradeSubMixedBorrowItem(input,item){
  return answerMatches(input,item.resNum,item.resDen);
}
export function gradeSubMixedBorrow(input,q){
  try{const ans=JSON.parse(input);return q.problems.every((p,i)=>gradeSubMixedBorrowItem(ans[i],p));}catch{return false;}
}

// - A12: Whole number - fraction (4 problems) -
export function genWholeAndFrac(){
  const pool=[
    {w:3,n:1,d:4,op:"+",neg_w:false,neg_f:false},
    {w:5,n:2,d:3,op:"-",neg_w:false,neg_f:false},
    {w:2,n:3,d:5,op:"+",neg_w:true,neg_f:false},
    {w:4,n:1,d:2,op:"-",neg_w:false,neg_f:true},
    {w:3,n:2,d:7,op:"+",neg_w:false,neg_f:false},
    {w:6,n:1,d:3,op:"-",neg_w:false,neg_f:false},
  ];
  const probs=shuffle(pool).slice(0,4).map(p=>{
    const wv=p.neg_w?-p.w:p.w;
    const fv=p.neg_f?-p.n:p.n;
    const resNum=p.op==="+"?wv*p.d+fv:wv*p.d-fv;
    const[rnn,rdd]=reduce(resNum,p.d);
    const ans=fmtMixed(rnn,rdd);
    const ws=p.neg_w?`-${p.w}`:String(p.w);
    const fs=p.neg_f?`(-${p.n}/${p.d})`:`${p.n}/${p.d}`;
    return {...p,wv,resNum,resDen:p.d,answer:ans,displayAnswer:ans,display:`${ws} ${p.op} ${fs}`};
  });
  return {type:"whole-frac",problems:probs,prompt:"Add or subtract. Simplify your answer."};
}
export function gradeWholeFracItem(input,item){
  return answerMatches(input,item.resNum,item.resDen);
}
export function gradeWholeFrac(input,q){
  try{const ans=JSON.parse(input);return q.problems.every((p,i)=>gradeWholeFracItem(ans[i],p));}catch{return false;}
}

// - A13: Mixed review (6 simultaneous) -
export function genMixedReview(){
  const types=shuffle([
    ()=>{const p=genCommonDenomPair(true);const[rn,rd]=reduce(p.resNum,p.resDen);return{subtype:"common-simplify",display:`${p.n1}/${p.den} ${p.op} ${p.n2}/${p.den}`,rn,rd,answer:fmtFrac(rn,rd)};},
    ()=>{const p=genDiffDenomPair();return{subtype:"diff-direct",display:`${p.n1}/${p.d1} ${p.op} ${p.n2}/${p.d2}`,rn:p.rn,rd:p.rd,answer:fmtFrac(p.rn,p.rd,true)};},
    ()=>{const p=genAddMixedSimple();const q=p.problems[0];return{subtype:"add-mixed",display:q.display,resNum:q.resNum,resDen:q.resDen,answer:q.answer};},
    ()=>{const p=genAddMixedCarry();const q=p.problems[0];return{subtype:"add-carry",display:q.display,resNum:q.resNum,resDen:q.resDen,answer:q.answer};},
    ()=>{const p=genSubMixedBorrow();const q=p.problems[0];return{subtype:"sub-borrow",display:q.display,resNum:q.resNum,resDen:q.resDen,answer:q.answer};},
    ()=>{const p=genWholeAndFrac();const q=p.problems[0];return{subtype:"whole-frac",display:q.display,resNum:q.resNum,resDen:q.resDen,answer:q.answer};},
  ]).slice(0,6).map(f=>f());
  return {type:"mixed-review",questions:types,prompt:"Answer each. Simplify all answers."};
}
export function gradeMixedReviewItem(input,item){
  if(item.rn!==undefined) return answerMatches(input,item.rn,item.rd);
  return answerMatches(input,item.resNum,item.resDen);
}
export function gradeMixedReview(input,q){
  try{const ans=JSON.parse(input);return q.questions.every((item,i)=>gradeMixedReviewItem(ans[i],item));}catch{return false;}
}

// - Topic registry -
export const LESSON15_TOPICS=[
  {id:"warmup-a",           label:"Warm-up: Reduce Fraction",         description:"24/36"},
  {id:"warmup-b",           label:"Warm-up: Mixed to Improper",       description:"3 2/5"},
  {id:"warmup-c",           label:"Warm-up: Improper to Mixed",       description:"17/3"},
  {id:"warmup-d",           label:"Warm-up: Equivalent Fraction",     description:"5/8 = ?/24"},
  {id:"common-simple",      label:"A1: Common Denom (No Simplify)",   description:"4 simultaneous"},
  {id:"common-simplify",    label:"A2: Common Denom + Simplify",      description:"4 simultaneous"},
  {id:"common-neg",         label:"A3: Common Denom + Negatives",     description:"4 simultaneous"},
  {id:"find-cd",            label:"A4: Find Common Denominator",      description:"5 free response"},
  {id:"staged-cd",          label:"A5: Staged Conversion (Step by Step)", description:"7 stages"},
  {id:"diff-direct",        label:"A6: Different Denoms Direct",      description:"4 simultaneous"},
  {id:"diff-neg",           label:"A7: Different Denoms + Negatives", description:"4 simultaneous"},
  {id:"add-mixed-simple",   label:"A8: Add Mixed (Simple)",           description:"3 problems"},
  {id:"sub-mixed-simple",   label:"A9: Subtract Mixed (Simple)",      description:"3 problems"},
  {id:"add-mixed-carry",    label:"A10: Add Mixed (Carrying)",        description:"3 problems"},
  {id:"sub-mixed-borrow",   label:"A11: Subtract Mixed (Borrowing)",  description:"3 problems"},
  {id:"whole-frac",         label:"A12: Whole Number - Fraction",     description:"4 simultaneous"},
  {id:"mixed-review",       label:"A13: Mixed Review",                description:"6 simultaneous"},
];

export function generateLesson15Question(topicId){
  switch(topicId){
    case "warmup-a":        return genWarmupA();
    case "warmup-b":        return genWarmupB();
    case "warmup-c":        return genWarmupC();
    case "warmup-d":        return genWarmupD();
    case "common-simple":   return genCommonDenomSimple();
    case "common-simplify": return genCommonDenomSimplify();
    case "common-neg":      return genCommonDenomNeg();
    case "find-cd":         return genFindCommonDenom();
    case "staged-cd":       return genStagedCD();
    case "diff-direct":     return genDiffDenomDirect();
    case "diff-neg":        return genDiffDenomNeg();
    case "add-mixed-simple":return genAddMixedSimple();
    case "sub-mixed-simple":return genSubMixedSimple();
    case "add-mixed-carry": return genAddMixedCarry();
    case "sub-mixed-borrow":return genSubMixedBorrow();
    case "whole-frac":      return genWholeAndFrac();
    case "mixed-review":    return genMixedReview();
    default:                return genWarmupA();
  }
}

export function gradeLesson15Answer(input,question){
  if(!input||!question) return false;
  switch(question.type){
    case "warmup-a":        return gradeWarmupA(input,question);
    case "warmup-b":        return gradeWarmupB(input,question);
    case "warmup-c":        return gradeWarmupC(input,question);
    case "warmup-d":        return gradeWarmupD(input,question);
    case "common-simple":   return gradeCommonSimple(input,question);
    case "common-simplify": return gradeCommonSimplify(input,question);
    case "common-neg":      return gradeCommonNeg(input,question);
    case "find-cd":         return gradeFindCD(input,question);
    case "staged-cd":       return parseInt(String(input).trim())===question.rn; // final answer
    case "diff-direct":     return gradeDiffDirect(input,question);
    case "diff-neg":        return gradeDiffNeg(input,question);
    case "add-mixed-simple":return gradeAddMixedSimple(input,question);
    case "sub-mixed-simple":return gradeSubMixedSimple(input,question);
    case "add-mixed-carry": return gradeAddMixedCarry(input,question);
    case "sub-mixed-borrow":return gradeSubMixedBorrow(input,question);
    case "whole-frac":      return gradeWholeFrac(input,question);
    case "mixed-review":    return gradeMixedReview(input,question);
    default:                return false;
  }
}




