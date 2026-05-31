// Lesson 16 - Multiplying and Dividing Fractions

function randInt(min, max) { return Math.floor(Math.random()*(max-min+1))+min; }
function randChoice(arr) { return arr[Math.floor(Math.random()*arr.length)]; }
function shuffle(arr) { const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }

function gcd(a,b){ a=Math.abs(a);b=Math.abs(b); return b===0?a:gcd(b,a%b); }
function lcm(a,b){ return Math.abs(a*b)/gcd(a,b); }
function reduce(n,d){ if(n===0)return[0,1]; const g=gcd(Math.abs(n),Math.abs(d)); const sign=d<0?-1:1; return[sign*n/g,sign*d/g]; }
function primeFactors(n){ const f={}; let d=2; n=Math.abs(n); while(n>1){while(n%d===0){f[d]=(f[d]||0)+1;n/=d;}d++;} return f; }
function countPrimeFactors(n){ return Object.values(primeFactors(n)).reduce((s,e)=>s+e,0); }

function fmtFrac(n,d){
  const[rn,rd]=reduce(n,d);
  if(rd===1)return String(rn);
  if(Math.abs(rn)>rd){
    const sign=rn<0?"-":"";
    const whole=Math.floor(Math.abs(rn)/rd);
    const rem=Math.abs(rn)%rd;
    return rem===0?`${sign}${whole}`:`${sign}${whole} ${rem}/${rd}`;
  }
  return `${rn}/${rd}`;
}

function parseFrac(str){
  const s=String(str||"").trim();
  if(!s)return null;
  const neg=s.startsWith("-");
  const abs=neg?s.slice(1).trim():s;
  const mx=abs.replace(/\s*-\s*/g," ").match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if(mx){const num=parseInt(mx[1])*parseInt(mx[3])+parseInt(mx[2]);return{num:neg?-num:num,den:parseInt(mx[3])};}
  const fx=abs.match(/^(\d+)\/(\d+)$/);
  if(fx)return{num:neg?-parseInt(fx[1]):parseInt(fx[1]),den:parseInt(fx[2])};
  const ix=abs.match(/^(\d+)$/);
  if(ix)return{num:neg?-parseInt(ix[1]):parseInt(ix[1]),den:1};
  return null;
}

function answerMatches(input,rn,rd){
  const p=parseFrac(input);
  if(!p)return false;
  const[in_,id_]=reduce(p.num,p.den);
  const[cn,cd]=reduce(rn,rd);
  return in_===cn&&id_===cd;
}

function answerMatchesSimplified(input,rn,rd){
  const p=parseFrac(input);
  if(!p)return false;
  const[in_,id_]=reduce(p.num,p.den);
  const[cn,cd]=reduce(rn,rd);
  if(in_!==cn||id_!==cd)return false;
  // Must be simplified
  if(p.den!==1&&gcd(Math.abs(p.num),p.den)!==1)return false;
  return true;
}

// - Warm-up A: Reduce fraction (GCF = product of 2+ primes, num/den 20-200) -
export function genWarmupA(){
  for(let i=0;i<500;i++){
    const n=randInt(20,200),d=randInt(20,200);
    if(n===d)continue;
    const g=gcd(n,d);
    if(g<=1)continue;
    if(countPrimeFactors(g)<2)continue;
    const[rn,rd]=reduce(n,d);
    if(rn===1||rd===1)continue; // too easy
    return{type:"warmup-a",n,d,rn,rd,answer:`${rn}/${rd}`,displayAnswer:`${rn}/${rd}`,prompt:`Simplify ${n}/${d} to lowest terms.`};
  }
  return{type:"warmup-a",n:60,d:84,rn:5,rd:7,answer:"5/7",displayAnswer:"5/7",prompt:"Simplify 60/84 to lowest terms."};
}
export function gradeWarmupA(input,q){return answerMatchesSimplified(input,q.rn,q.rd);}

// - Warm-up B: Add fractions, different denoms, GCF(d1,d2)>2, denoms 10-20 -
export function genWarmupB(){
  for(let i=0;i<500;i++){
    const d1=randInt(10,20),d2=randInt(10,20);
    if(d1===d2)continue;
    if(gcd(d1,d2)<=2)continue;
    const n1=randInt(1,d1-1),n2=randInt(1,d2-1);
    const cd=lcm(d1,d2);
    const resNum=n1*(cd/d1)+n2*(cd/d2);
    const[rn,rd]=reduce(resNum,cd);
    return{type:"warmup-b",n1,d1,n2,d2,lcd:cd,rn,rd,answer:fmtFrac(rn,rd),displayAnswer:fmtFrac(rn,rd),prompt:`Add ${n1}/${d1} + ${n2}/${d2}.`};
  }
  return{type:"warmup-b",n1:3,d1:12,n2:2,d2:18,lcd:36,rn:13,rd:36,answer:"13/36",displayAnswer:"13/36",prompt:"Add 3/12 + 2/18."};
}
export function gradeWarmupB(input,q){return answerMatchesSimplified(input,q.rn,q.rd);}

// - A1: Multiply fractions (unsimplified OK) -
const MULT_PAIRS=[
  {n1:2,d1:3,n2:1,d2:4},{n1:1,d1:2,n2:3,d2:5},{n1:4,d1:7,n2:1,d2:2},{n1:2,d1:5,n2:3,d2:4},
  {n1:3,d1:8,n2:2,d2:3},{n1:5,d1:6,n2:1,d2:3},{n1:3,d1:4,n2:2,d2:9},{n1:1,d1:3,n2:3,d2:5},
  {n1:2,d1:7,n2:3,d2:4},{n1:5,d1:8,n2:2,d2:5},{n1:1,d1:4,n2:4,d2:7},{n1:3,d1:10,n2:2,d2:3},
];
export function genMultSimple(){
  const probs=shuffle([...MULT_PAIRS]).slice(0,4).map(p=>{
    const rawN=p.n1*p.n2,rawD=p.d1*p.d2;
    return{...p,rawN,rawD,answer:`${rawN}/${rawD}`,displayAnswer:`${rawN}/${rawD}`,display:`${p.n1}/${p.d1} x ${p.n2}/${p.d2}`};
  });
  return{type:"mult-simple",problems:probs,prompt:"Multiply. Unsimplified is OK."};
}
export function gradeMultSimpleItem(input,item){
  const p=parseFrac(input);if(!p)return false;
  return answerMatches(input,item.rawN,item.rawD);
}
export function gradeMultSimple(input,q){
  try{const ans=JSON.parse(input);return q.problems.every((p,i)=>gradeMultSimpleItem(ans[i],p));}catch{return false;}
}

// - A2: Multiply fractions (simplified required) -
export function genMultSimplify(){
  const probs=shuffle([...MULT_PAIRS]).slice(0,4).map(p=>{
    const rawN=p.n1*p.n2,rawD=p.d1*p.d2;
    const[rn,rd]=reduce(rawN,rawD);
    return{...p,rawN,rawD,rn,rd,answer:fmtFrac(rn,rd),displayAnswer:fmtFrac(rn,rd),display:`${p.n1}/${p.d1} x ${p.n2}/${p.d2}`};
  });
  return{type:"mult-simplify",problems:probs,prompt:"Multiply and simplify."};
}
export function gradeMultSimplifyItem(input,item){return answerMatchesSimplified(input,item.rn,item.rd);}
export function gradeMultSimplify(input,q){
  try{const ans=JSON.parse(input);return q.problems.every((p,i)=>gradeMultSimplifyItem(ans[i],p));}catch{return false;}
}

// - A3: Cross cancellation step by step -
const CROSS_CANCEL_PAIRS=[
  {n1:2,d1:3,n2:3,d2:4},{n1:2,d1:5,n2:5,d2:6},{n1:3,d1:4,n2:4,d2:9},
  {n1:4,d1:5,n2:5,d2:8},{n1:3,d1:7,n2:7,d2:9},{n1:6,d1:7,n2:7,d2:8},
  {n1:2,d1:9,n2:3,d2:4},{n1:5,d1:6,n2:3,d2:10},{n1:4,d1:9,n2:3,d2:8},
];
export function genCrossCancel(){
  const p=randChoice(CROSS_CANCEL_PAIRS);
  // Find cancellable common factors between n1&d2 and n2&d1
  const g1=gcd(p.n1,p.d2),g2=gcd(p.n2,p.d1);
  const cn1=p.n1/g1,cd2=p.d2/g1,cn2=p.n2/g2,cd1=p.d1/g2;
  const rawN=cn1*cn2,rawD=cd1*cd2;
  const[rn,rd]=reduce(rawN,rawD);
  return{
    type:"cross-cancel",n1:p.n1,d1:p.d1,n2:p.n2,d2:p.d2,
    g1,g2,cn1,cd1,cn2,cd2,rawN,rawD,rn,rd,
    cancelledDisplay:`${cn1}/${cd1} x ${cn2}/${cd2}`,
    productDisplay:`${rawN}/${rawD}`,
    answer:fmtFrac(rn,rd),displayAnswer:fmtFrac(rn,rd),
    display:`${p.n1}/${p.d1} x ${p.n2}/${p.d2}`,
    prompt:`Multiply using cross cancellation: ${p.n1}/${p.d1} x ${p.n2}/${p.d2}`,
  };
}
export function gradeCrossCancelStage1(input,q){
  // Accept the cancelled fractions in order n1/d1 x n2/d2 after cancellation
  const s=String(input).trim().replace(/\s*x\s*/i," x ");
  const m=s.match(/^(\d+)\/(\d+)\s+x\s+(\d+)\/(\d+)$/);
  if(!m)return false;
  const[,a,b,c,d]=m.map(Number);
  return(a===q.cn1&&b===q.cd1&&c===q.cn2&&d===q.cd2)||
        (a===q.cn2&&b===q.cd2&&c===q.cn1&&d===q.cd1);
}
export function gradeCrossCancelStage2(input,q){return answerMatches(input,q.rawN,q.rawD)||answerMatches(input,q.rn,q.rd);}
export function gradeCrossCancelStage3(input,q){return answerMatchesSimplified(input,q.rn,q.rd);}

// - A4: Multiply with cross cancellation (direct) -
const CROSS_DIRECT=[
  {n1:3,d1:4,n2:4,d2:5,rn:3,rd:5},{n1:2,d1:5,n2:5,d2:6,rn:1,rd:3},
  {n1:7,d1:8,n2:4,d2:21,rn:1,rd:6},{n1:9,d1:10,n2:5,d2:18,rn:1,rd:4},
  {n1:4,d1:9,n2:3,d2:8,rn:1,rd:6},{n1:5,d1:6,n2:3,d2:10,rn:1,rd:4},
  {n1:6,d1:7,n2:7,d2:9,rn:2,rd:3},{n1:8,d1:15,n2:5,d2:12,rn:2,rd:9},
];
export function genCrossDirectSet(){
  const probs=shuffle([...CROSS_DIRECT]).slice(0,4).map(p=>({
    ...p,answer:fmtFrac(p.rn,p.rd),displayAnswer:fmtFrac(p.rn,p.rd),display:`${p.n1}/${p.d1} x ${p.n2}/${p.d2}`
  }));
  return{type:"cross-direct",problems:probs,prompt:"Multiply. Simplify your answer."};
}
export function gradeCrossDirectItem(input,item){return answerMatchesSimplified(input,item.rn,item.rd);}
export function gradeCrossDirect(input,q){
  try{const ans=JSON.parse(input);return q.problems.every((p,i)=>gradeCrossDirectItem(ans[i],p));}catch{return false;}
}

// - A5: Fraction x whole number -
const FRAC_WHOLE=[
  {n:3,d:4,w:2,rn:3,rd:2},{n:2,d:3,w:6,rn:4,rd:1},{n:5,d:8,w:4,rn:5,rd:2},
  {n:7,d:10,w:5,rn:7,rd:2},{n:3,d:5,w:5,rn:3,rd:1},{n:2,d:9,w:3,rn:2,rd:3},
  {n:5,d:6,w:3,rn:5,rd:2},{n:4,d:7,w:7,rn:4,rd:1},{n:3,d:8,w:4,rn:3,rd:2},
  {n:1,d:3,w:9,rn:3,rd:1},{n:5,d:12,w:4,rn:5,rd:3},{n:7,d:8,w:8,rn:7,rd:1},
];
export function genFracTimesWhole(){
  const probs=shuffle([...FRAC_WHOLE]).slice(0,4).map(p=>({
    ...p,answer:fmtFrac(p.rn,p.rd),displayAnswer:fmtFrac(p.rn,p.rd),display:`${p.n}/${p.d} x ${p.w}`
  }));
  return{type:"frac-whole",problems:probs,prompt:"Multiply. Simplify your answer."};
}
export function gradeFracWholeItem(input,item){return answerMatchesSimplified(input,item.rn,item.rd);}
export function gradeFracWhole(input,q){
  try{const ans=JSON.parse(input);return q.problems.every((p,i)=>gradeFracWholeItem(ans[i],p));}catch{return false;}
}

// - A6: Find the reciprocal -
const RECIP_POOL=[
  {display:"2/3",rn:3,rd:2},{display:"5",rn:1,rd:5},{display:"1/4",rn:4,rd:1},
  {display:"7",rn:1,rd:7},{display:"3/2",rn:2,rd:3},{display:"1/8",rn:8,rd:1},
  {display:"4/5",rn:5,rd:4},{display:"3/7",rn:7,rd:3},{display:"9",rn:1,rd:9},
  {display:"5/3",rn:3,rd:5},{display:"1/6",rn:6,rd:1},{display:"8/3",rn:3,rd:8},
];
export function genReciprocals(){
  const items=shuffle([...RECIP_POOL]).slice(0,6);
  return{type:"reciprocals",items,prompt:"Find the reciprocal of each."};
}
export function gradeReciprocalItem(input,item){return answerMatches(input,item.rn,item.rd);}
export function gradeReciprocals(input,q){
  try{const ans=JSON.parse(input);return q.items.every((item,i)=>gradeReciprocalItem(ans[i],item));}catch{return false;}
}

// - A7: Divide fractions step by step -
const DIV_PAIRS=[
  {n1:2,d1:3,n2:3,d2:4},{n1:1,d1:2,n2:3,d2:4},{n1:3,d1:5,n2:2,d2:7},
  {n1:5,d1:6,n2:1,d2:3},{n1:4,d1:9,n2:2,d2:3},{n1:3,d1:8,n2:3,d2:4},
  {n1:2,d1:7,n2:4,d2:5},{n1:5,d1:8,n2:5,d2:6},{n1:1,d1:3,n2:2,d2:5},
];
export function genDivideStepByStep(){
  const p=randChoice(DIV_PAIRS);
  // reciprocal of n2/d2 is d2/n2
  const multN1=p.n1,multD1=p.d1,multN2=p.d2,multD2=p.n2;
  const rawN=multN1*multN2,rawD=multD1*multD2;
  const[rn,rd]=reduce(rawN,rawD);
  return{
    type:"divide-steps",n1:p.n1,d1:p.d1,n2:p.n2,d2:p.d2,
    multN1,multD1,multN2,multD2,rawN,rawD,rn,rd,
    reciprocalDisplay:`${p.d2}/${p.n2}`,
    multiplyDisplay:`${p.n1}/${p.d1} x ${p.d2}/${p.n2}`,
    productDisplay:`${rawN}/${rawD}`,
    answer:fmtFrac(rn,rd),displayAnswer:fmtFrac(rn,rd),
    display:`${p.n1}/${p.d1} / ${p.n2}/${p.d2}`,
    prompt:`Divide: ${p.n1}/${p.d1} / ${p.n2}/${p.d2}`,
  };
}
export function gradeDivideStage1(input,q){
  const s=String(input).trim().replace(/\s*x\s*/i," x ");
  const m=s.match(/^(\d+)\/(\d+)\s+x\s+(\d+)\/(\d+)$/);
  if(!m)return false;
  const[,a,b,c,d]=m.map(Number);
  return a===q.n1&&b===q.d1&&c===q.multN2&&d===q.multD2;
}
export function gradeDivideStage2(input,q){return answerMatches(input,q.rawN,q.rawD)||answerMatches(input,q.rn,q.rd);}
export function gradeDivideStage3(input,q){return answerMatchesSimplified(input,q.rn,q.rd);}

// - A8: Divide fractions (direct) -
const DIV_DIRECT=[
  {n1:1,d1:2,n2:3,d2:4,rn:2,rd:3},{n1:3,d1:5,n2:2,d2:7,rn:21,rd:10},
  {n1:5,d1:6,n2:1,d2:3,rn:5,rd:2},{n1:4,d1:9,n2:2,d2:3,rn:2,rd:3},
  {n1:3,d1:4,n2:1,d2:2,rn:3,rd:2},{n1:2,d1:7,n2:4,d2:7,rn:1,rd:2},
  {n1:5,d1:8,n2:5,d2:6,rn:3,rd:4},{n1:3,d1:10,n2:3,d2:5,rn:1,rd:2},
];
export function genDivideDirect(){
  const probs=shuffle([...DIV_DIRECT]).slice(0,4).map(p=>({
    ...p,answer:fmtFrac(p.rn,p.rd),displayAnswer:fmtFrac(p.rn,p.rd),display:`${p.n1}/${p.d1} / ${p.n2}/${p.d2}`
  }));
  return{type:"divide-direct",problems:probs,prompt:"Divide. Simplify your answer."};
}
export function gradeDivideDirectItem(input,item){return answerMatchesSimplified(input,item.rn,item.rd);}
export function gradeDivideDirect(input,q){
  try{const ans=JSON.parse(input);return q.problems.every((p,i)=>gradeDivideDirectItem(ans[i],p));}catch{return false;}
}

// - A9: Whole number / fraction and fraction / whole number -
const WHOLE_DIV=[
  {type:"w/f",w:3,n:1,d:2,rn:6,rd:1},{type:"w/f",w:2,n:3,d:4,rn:8,rd:3},
  {type:"w/f",w:5,n:2,d:3,rn:15,rd:2},{type:"w/f",w:4,n:3,d:5,rn:20,rd:3},
  {type:"f/w",n:1,d:2,w:3,rn:1,rd:6},{type:"f/w",n:3,d:4,w:2,rn:3,rd:8},
  {type:"f/w",n:2,d:5,w:4,rn:1,rd:10},{type:"f/w",n:5,d:6,w:3,rn:5,rd:18},
];
export function genWholeDivFrac(){
  const probs=shuffle([...WHOLE_DIV]).slice(0,4).map(p=>{
    const display=p.type==="w/f"?`${p.w} / ${p.n}/${p.d}`:`${p.n}/${p.d} / ${p.w}`;
    return{...p,display,answer:fmtFrac(p.rn,p.rd),displayAnswer:fmtFrac(p.rn,p.rd)};
  });
  return{type:"whole-div",problems:probs,prompt:"Divide. Simplify your answer."};
}
export function gradeWholeDivItem(input,item){return answerMatchesSimplified(input,item.rn,item.rd);}
export function gradeWholeDiv(input,q){
  try{const ans=JSON.parse(input);return q.problems.every((p,i)=>gradeWholeDivItem(ans[i],p));}catch{return false;}
}

// - A10: Multiply mixed numbers -
const MIX_MULT=[
  {w1:1,n1:1,d1:2,w2:2,n2:1,d2:3,rn:7,rd:2},
  {w1:2,n1:1,d1:4,w2:1,n2:2,d2:3,rn:15,rd:4},
  {w1:1,n1:3,d1:5,w2:2,n2:1,d2:2,rn:4,rd:1},
  {w1:1,n1:1,d1:3,w2:2,n2:1,d2:4,rn:4,rd:1},
  {w1:2,n1:2,d1:3,w2:1,n2:1,d2:2,rn:4,rd:1},
  {w1:1,n1:1,d1:2,w2:1,n2:1,d2:3,rn:2,rd:1},
];
export function genMultMixed(){
  const probs=shuffle([...MIX_MULT]).slice(0,3).map(p=>({
    ...p,
    display:`${p.w1} ${p.n1}/${p.d1} x ${p.w2} ${p.n2}/${p.d2}`,
    answer:fmtFrac(p.rn,p.rd),displayAnswer:fmtFrac(p.rn,p.rd),
    imp1:p.w1*p.d1+p.n1,imp2:p.w2*p.d2+p.n2,
  }));
  return{type:"mult-mixed",problems:probs,prompt:"Convert to improper fractions, then multiply. Simplify."};
}
export function gradeMultMixedItem(input,item){return answerMatchesSimplified(input,item.rn,item.rd);}
export function gradeMultMixed(input,q){
  try{const ans=JSON.parse(input);return q.problems.every((p,i)=>gradeMultMixedItem(ans[i],p));}catch{return false;}
}

// - A11: Divide mixed numbers -
const MIX_DIV=[
  {w1:2,n1:1,d1:2,w2:1,n2:1,d2:4,rn:2,rd:1},
  {w1:3,n1:1,d1:3,w2:1,n2:2,d2:3,rn:2,rd:1},
  {w1:1,n1:3,d1:4,w2:2,n2:1,d2:2,rn:7,rd:10},
  {w1:2,n1:2,d1:3,w2:1,n2:1,d2:3,rn:2,rd:1},
  {w1:3,n1:1,d1:2,w2:1,n2:3,d2:4,rn:14,rd:5},
  {w1:1,n1:1,d1:2,w2:3,n2:0,d2:1,rn:1,rd:2},
];
export function genDivideMixed(){
  const probs=shuffle([...MIX_DIV]).slice(0,3).map(p=>{
    const imp1=p.w1*p.d1+p.n1;
    const w2=p.w2,n2=p.n2,d2=p.d2;
    const imp2=n2===0?w2:w2*d2+n2;
    const display=n2===0?`${p.w1} ${p.n1}/${p.d1} / ${p.w2}`:`${p.w1} ${p.n1}/${p.d1} / ${p.w2} ${p.n2}/${p.d2}`;
    return{...p,imp1,imp2,display,answer:fmtFrac(p.rn,p.rd),displayAnswer:fmtFrac(p.rn,p.rd)};
  });
  return{type:"divide-mixed",problems:probs,prompt:"Convert to improper fractions, then divide. Simplify."};
}
export function gradeDivideMixedItem(input,item){return answerMatchesSimplified(input,item.rn,item.rd);}
export function gradeDivideMixed(input,q){
  try{const ans=JSON.parse(input);return q.problems.every((p,i)=>gradeDivideMixedItem(ans[i],p));}catch{return false;}
}

// - A12: Mixed review (1 problem, 2 operations) -
function fmtKatex(n,d){return d===1?String(n):`\\dfrac{${n}}{${d}}`;}
export function genMixedReview(){
  const addSub=randChoice(["add","sub"]);
  const multDiv=randChoice(["mult","div"]);
  const useParens=Math.random()<0.5;

  // Generate two simple fractions for add/sub
  const as_pairs=[[1,2,1,3],[2,3,1,4],[3,4,1,3],[1,2,2,5],[3,5,1,4],[2,3,3,8]];
  const [an1,ad1,an2,ad2]=randChoice(as_pairs);
  const as_cd=lcm(ad1,ad2);
  const as_res=addSub==="add"?an1*(as_cd/ad1)+an2*(as_cd/ad2):an1*(as_cd/ad1)-an2*(as_cd/ad2);
  const[as_rn,as_rd]=reduce(as_res,as_cd);

  // Generate two simple fractions for mult/div
  const md_pairs=[[1,2,2,3],[3,4,2,5],[1,3,3,4],[2,5,5,6],[3,8,4,9],[1,4,4,5]];
  const[mn1,md1,mn2,md2]=randChoice(md_pairs);
  const md_rn_raw=multDiv==="mult"?mn1*mn2:mn1*md2;
  const md_rd_raw=multDiv==="mult"?md1*md2:md1*mn2;
  const[md_rn,md_rd]=reduce(md_rn_raw,md_rd_raw);

  // Combine: (as_result) OP (md_result) OR (md_result) OP (as_result)
  const asFirst=Math.random()<0.5;
  // Final calculation
  let finalN,finalD,display,katexDisplay;
  if(asFirst){
    if(useParens){
      // (as) op (md)
      if(addSub==="add"&&multDiv==="mult"){
        const cd=lcm(as_rd,md_rd);
        finalN=as_rn*(cd/as_rd)+md_rn*(cd/md_rd); finalD=cd;
      } else if(addSub==="sub"&&multDiv==="mult"){
        const cd=lcm(as_rd,md_rd);
        finalN=as_rn*(cd/as_rd)-md_rn*(cd/md_rd); finalD=cd;
      } else if(multDiv==="div"){
        finalN=as_rn*md_rd; finalD=as_rd*md_rn;
      } else {finalN=as_rn*md_rn;finalD=as_rd*md_rd;}
    } else {
      // no parens - same result
      const cd=lcm(as_rd,md_rd);
      finalN=as_rn*(cd/as_rd)+md_rn*(cd/md_rd); finalD=cd;
    }
  } else {
    const cd=lcm(as_rd,md_rd);
    finalN=md_rn*(cd/md_rd)+as_rn*(cd/as_rd); finalD=cd;
  }
  const[rn,rd]=reduce(finalN,finalD);

  // Build display
  const asStr=`${an1}/${ad1} ${addSub==="add"?"+":"-"} ${an2}/${ad2}`;
  const mdStr=`${mn1}/${md1} ${multDiv==="mult"?"x":"/"} ${mn2}/${md2}`;
  if(asFirst){
    display=useParens?`(${asStr}) ${multDiv==="mult"?"x":"/"} (${mdStr})`:`${asStr} + ${mdStr}`;
  } else {
    display=useParens?`(${mdStr}) ${addSub==="add"?"+":"-"} (${asStr})`:`${mdStr} + ${asStr}`;
  }

  return{type:"mixed-review",display,rn,rd,answer:fmtFrac(rn,rd),displayAnswer:fmtFrac(rn,rd),prompt:"Evaluate and simplify."};
}
export function gradeMixedReview(input,q){return answerMatchesSimplified(input,q.rn,q.rd);}

// - Topic registry -
export const LESSON16_TOPICS=[
  {id:"warmup-a",      label:"Warm-up: Simplify Fraction",      description:"Large fraction, GCF = product of 2+ primes"},
  {id:"warmup-b",      label:"Warm-up: Add Fractions",          description:"Different denominators 10-20"},
  {id:"mult-simple",   label:"A1: Multiply (No Simplify)",      description:"4 simultaneous, unsimplified OK"},
  {id:"mult-simplify", label:"A2: Multiply and Simplify",       description:"4 simultaneous, simplified required"},
  {id:"cross-cancel",  label:"A3: Cross Cancellation (Steps)",  description:"3-stage step by step"},
  {id:"cross-direct",  label:"A4: Multiply with Cancellation",  description:"4 simultaneous, simplified"},
  {id:"frac-whole",    label:"A5: Fraction x Whole Number",     description:"4 simultaneous"},
  {id:"reciprocals",   label:"A6: Find the Reciprocal",         description:"6 simultaneous"},
  {id:"divide-steps",  label:"A7: Divide Fractions (Steps)",    description:"3-stage step by step"},
  {id:"divide-direct", label:"A8: Divide Fractions (Direct)",   description:"4 simultaneous"},
  {id:"whole-div",     label:"A9: Whole / Fraction",            description:"4 simultaneous"},
  {id:"mult-mixed",    label:"A10: Multiply Mixed Numbers",     description:"3 problems"},
  {id:"divide-mixed",  label:"A11: Divide Mixed Numbers",       description:"3 problems"},
  {id:"mixed-review",  label:"A12: Mixed Review",               description:"1 problem, 2 operations"},
];

export function generateLesson16Question(topicId){
  switch(topicId){
    case "warmup-a":     return genWarmupA();
    case "warmup-b":     return genWarmupB();
    case "mult-simple":  return genMultSimple();
    case "mult-simplify":return genMultSimplify();
    case "cross-cancel": return genCrossCancel();
    case "cross-direct": return genCrossDirectSet();
    case "frac-whole":   return genFracTimesWhole();
    case "reciprocals":  return genReciprocals();
    case "divide-steps": return genDivideStepByStep();
    case "divide-direct":return genDivideDirect();
    case "whole-div":    return genWholeDivFrac();
    case "mult-mixed":   return genMultMixed();
    case "divide-mixed": return genDivideMixed();
    case "mixed-review": return genMixedReview();
    default:             return genWarmupA();
  }
}

export function gradeLesson16Answer(input,question){
  if(!input||!question)return false;
  switch(question.type){
    case "warmup-a":     return gradeWarmupA(input,question);
    case "warmup-b":     return gradeWarmupB(input,question);
    case "mult-simple":  return gradeMultSimple(input,question);
    case "mult-simplify":return gradeMultSimplify(input,question);
    case "cross-cancel": return gradeCrossCancelStage3(input,question);
    case "cross-direct": return gradeCrossDirect(input,question);
    case "frac-whole":   return gradeFracWhole(input,question);
    case "reciprocals":  return gradeReciprocals(input,question);
    case "divide-steps": return gradeDivideStage3(input,question);
    case "divide-direct":return gradeDivideDirect(input,question);
    case "whole-div":    return gradeWholeDiv(input,question);
    case "mult-mixed":   return gradeMultMixed(input,question);
    case "divide-mixed": return gradeDivideMixed(input,question);
    case "mixed-review": return gradeMixedReview(input,question);
    default:             return false;
  }
}

