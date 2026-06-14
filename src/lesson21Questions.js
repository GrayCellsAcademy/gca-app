// Lesson 21 - Converting Repeating Decimals to Fractions

function randChoice(arr) { return arr[Math.floor(Math.random()*arr.length)]; }
function shuffle(arr) { const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }
function gcd(a,b){ a=Math.abs(a);b=Math.abs(b); return b===0?a:gcd(b,a%b); }
function reduce(n,d){ if(n===0)return[0,1]; const g=gcd(Math.abs(n),Math.abs(d)); return[n/g,d/g]; }

function fmtFrac(n,d){
  const[rn,rd]=reduce(n,d);
  if(rd===1)return String(rn);
  if(Math.abs(rn)>rd){const w=Math.floor(Math.abs(rn)/rd);const r=Math.abs(rn)%rd;return`${rn<0?"-":""}${w} ${r}/${rd}`;}
  return`${rn}/${rd}`;
}

function decOk(input,correct){
  const v=parseFloat(String(input||"").trim());
  return!isNaN(v)&&Math.abs(v-correct)<1e-9;
}

function fracOk(input,rn,rd){
  const s=String(input||"").trim();
  if(!s)return false;
  const mx=s.replace(/\s*-\s*/g," ").match(/^(\d+)\s+(\d+)\/(\d+)$/);
  let num,den;
  if(mx){num=parseInt(mx[1])*parseInt(mx[3])+parseInt(mx[2]);den=parseInt(mx[3]);}
  else{const fx=s.match(/^(\d+)\/(\d+)$/);if(fx){num=parseInt(fx[1]);den=parseInt(fx[2]);}
  else{const ix=s.match(/^(\d+)$/);if(ix){num=parseInt(ix[1]);den=1;}else return false;}}
  const[in_,id_]=reduce(num,den);const[cn,cd]=reduce(rn,rd);
  return in_===cn&&id_===cd;
}

function parseRatio(str){
  const s=String(str||"").trim().replace(/\s+/g," ");
  const m1=s.match(/^(\d+):(\d+)$/);if(m1)return[parseInt(m1[1]),parseInt(m1[2])];
  const m2=s.match(/^(\d+)\/(\d+)$/);if(m2)return[parseInt(m2[1]),parseInt(m2[2])];
  return null;
}
function ratioOk(input,a,b){
  const r=parseRatio(input);if(!r)return false;
  const[ra,rb]=reduce(a,b);const[ria,rib]=reduce(r[0],r[1]);
  return ria===ra&&rib===rb;
}

// - Warm-ups -
// Warmup A: Simplify ratio 18:24
export function genWarmupA(){
  return{type:"warmup-a",a:18,b:24,ra:3,rb:4,displayAnswer:"3:4",prompt:"Simplify the ratio."};
}
export function gradeWarmupA(input){return ratioOk(input,3,4);}

// Warmup B: Find missing term 3:4 = x:20
export function genWarmupB(){
  return{type:"warmup-b",ratio:"3:4 = x:20",x:15,displayAnswer:"15",prompt:"Find the value of x."};
}
export function gradeWarmupB(input){return decOk(input,15);}

// Warmup C: Convert fraction to repeating decimal 1/3
export function genWarmupC(){
  return{type:"warmup-c",latex:"\\dfrac{1}{3}",displayAnswer:"0.\\overline{3}",answer:"1/3",prompt:"Convert to a decimal."};
}
export function gradeWarmupC(input){
  const s=String(input||"").trim().replace(/\s+/g,"");
  return["0.333...","0.33...","0.3...","0.[3]","0.3333..."].includes(s)||decOk(input,0.3333);
}

// Warmup D: Write ratio from statement
export function genWarmupD(){
  return{type:"warmup-d",stmt:"A bag has 6 apples and 9 oranges. What is the ratio of apples to total fruit?",a:2,b:5,displayAnswer:"2:5",prompt:"Write the ratio in simplest form."};
}
export function gradeWarmupD(input){return ratioOk(input,2,5);}

// - A1: Single-digit repeating decimal SBS -
const SINGLE_REP_POOL=[
  {dec:"0.333...",overline:"0.\\overline{3}",mult:10,tenX:"3.333...",nineX:3,rn:1,rd:3,intermediate:"3/9"},
  {dec:"0.444...",overline:"0.\\overline{4}",mult:10,tenX:"4.444...",nineX:4,rn:4,rd:9,intermediate:"4/9"},
  {dec:"0.666...",overline:"0.\\overline{6}",mult:10,tenX:"6.666...",nineX:6,rn:2,rd:3,intermediate:"6/9"},
  {dec:"0.777...",overline:"0.\\overline{7}",mult:10,tenX:"7.777...",nineX:7,rn:7,rd:9,intermediate:"7/9"},
  {dec:"0.222...",overline:"0.\\overline{2}",mult:10,tenX:"2.222...",nineX:2,rn:2,rd:9,intermediate:"2/9"},
  {dec:"0.555...",overline:"0.\\overline{5}",mult:10,tenX:"5.555...",nineX:5,rn:5,rd:9,intermediate:"5/9"},
  {dec:"0.888...",overline:"0.\\overline{8}",mult:10,tenX:"8.888...",nineX:8,rn:8,rd:9,intermediate:"8/9"},
  {dec:"0.111...",overline:"0.\\overline{1}",mult:10,tenX:"1.111...",nineX:1,rn:1,rd:9,intermediate:"1/9"},
];
export function genSingleRepSBS(){
  const p=randChoice(SINGLE_REP_POOL);
  return{type:"single-rep-sbs",...p,displayAnswer:fmtFrac(p.rn,p.rd),
    prompt:`Convert ${p.dec} to a fraction.`};
}
// Stage graders
export function gradeSingleRepS1(input,q){
  // Accept "x = 0.333..." or just "0.333..."
  const s=String(input||"").trim().replace(/\s+/g,"").toLowerCase();
  return s===`x=${q.dec}`||s===q.dec||s==="x="+q.dec.replace(/\.\.\./,"...")||s.startsWith("x=0.");
}
export function gradeSingleRepS2(input,q){
  // Accept "10x = 3.333..." or "10x=3.333" or just "3.333..."
  const s=String(input||"").trim().replace(/\s+/g,"").toLowerCase();
  const expected=`10x=${q.tenX}`;
  return s===expected||s===q.tenX||s.startsWith("10x="+q.nineX+".")||
    (s.includes("10x")&&s.includes(String(q.nineX)));
}
export function gradeSingleRepS3(input,q){
  // Accept "9x = N" or just the number
  const s=String(input||"").trim().replace(/\s+/g,"").toLowerCase();
  const n=String(q.nineX);
  return s===`9x=${n}`||s===`9x=${n}.0`||parseInt(s)===q.nineX||
    (s.includes("9x")&&s.includes(n))||s===n;
}
export function gradeSingleRepS4(input,q){
  // Accept intermediate or final fraction
  return fracOk(input,q.rn,q.rd)||input.trim()===q.intermediate;
}
export function gradeSingleRepS5(input,q){return fracOk(input,q.rn,q.rd);}

// - A2: Single-digit repeating decimal direct -
const SINGLE_REP_DIRECT=[
  {overline:"0.\\overline{5}",dec:"0.555...",rn:5,rd:9},
  {overline:"0.\\overline{8}",dec:"0.888...",rn:8,rd:9},
  {overline:"0.\\overline{2}",dec:"0.222...",rn:2,rd:9},
  {overline:"0.\\overline{1}",dec:"0.111...",rn:1,rd:9},
  {overline:"0.\\overline{4}",dec:"0.444...",rn:4,rd:9},
  {overline:"0.\\overline{7}",dec:"0.777...",rn:7,rd:9},
  {overline:"0.\\overline{6}",dec:"0.666...",rn:2,rd:3},
];
export function genSingleRepDirect(){
  const probs=shuffle([...SINGLE_REP_DIRECT]).slice(0,4).map(p=>({
    ...p,displayAnswer:fmtFrac(p.rn,p.rd),
  }));
  return{type:"single-rep-direct",problems:probs,prompt:"Convert each repeating decimal to a simplified fraction."};
}
export function gradeSingleRepDirectItem(input,item){return fracOk(input,item.rn,item.rd);}
export function gradeSingleRepDirect(input,q){
  try{const ans=JSON.parse(input);return q.problems.every((p,i)=>gradeSingleRepDirectItem(ans[i],p));}catch{return false;}
}

// - A3: Two-digit repeating decimal SBS -
const TWO_REP_POOL=[
  {dec:"0.272727...",overline:"0.\\overline{27}",mult:100,hundX:"27.272727...",ninetyNineX:27,rn:3,rd:11,intermediate:"27/99"},
  {dec:"0.121212...",overline:"0.\\overline{12}",mult:100,hundX:"12.121212...",ninetyNineX:12,rn:4,rd:33,intermediate:"12/99"},
  {dec:"0.454545...",overline:"0.\\overline{45}",mult:100,hundX:"45.454545...",ninetyNineX:45,rn:5,rd:11,intermediate:"45/99"},
  {dec:"0.363636...",overline:"0.\\overline{36}",mult:100,hundX:"36.363636...",ninetyNineX:36,rn:4,rd:11,intermediate:"36/99"},
  {dec:"0.181818...",overline:"0.\\overline{18}",mult:100,hundX:"18.181818...",ninetyNineX:18,rn:2,rd:11,intermediate:"18/99"},
  {dec:"0.090909...",overline:"0.\\overline{09}",mult:100,hundX:"9.090909...",ninetyNineX:9,rn:1,rd:11,intermediate:"9/99"},
];
export function genTwoRepSBS(){
  const p=randChoice(TWO_REP_POOL);
  return{type:"two-rep-sbs",...p,displayAnswer:fmtFrac(p.rn,p.rd),
    prompt:`Convert ${p.dec} to a fraction.`};
}
export function gradeTwoRepS1(input,q){
  const s=String(input||"").trim().replace(/\s+/g,"").toLowerCase();
  return s===`x=${q.dec}`||s===q.dec||s.startsWith("x=0.");
}
export function gradeTwoRepS2(input,q){
  const s=String(input||"").trim().replace(/\s+/g,"").toLowerCase();
  return s===`100x=${q.hundX}`||s===q.hundX||
    (s.includes("100x")&&s.includes(String(q.ninetyNineX)))||
    s.startsWith(String(q.ninetyNineX)+".");
}
export function gradeTwoRepS3(input,q){
  const s=String(input||"").trim().replace(/\s+/g,"").toLowerCase();
  const n=String(q.ninetyNineX);
  return s===`99x=${n}`||parseInt(s)===q.ninetyNineX||
    (s.includes("99x")&&s.includes(n))||s===n;
}
export function gradeTwoRepS4(input,q){
  return fracOk(input,q.rn,q.rd)||input.trim()===q.intermediate;
}

// - A4: Two-digit repeating decimal direct -
const TWO_REP_DIRECT=[
  {overline:"0.\\overline{36}",dec:"0.363636...",rn:4,rd:11},
  {overline:"0.\\overline{18}",dec:"0.181818...",rn:2,rd:11},
  {overline:"0.\\overline{27}",dec:"0.272727...",rn:3,rd:11},
  {overline:"0.\\overline{12}",dec:"0.121212...",rn:4,rd:33},
  {overline:"0.\\overline{45}",dec:"0.454545...",rn:5,rd:11},
  {overline:"0.\\overline{09}",dec:"0.090909...",rn:1,rd:11},
];
export function genTwoRepDirect(){
  const probs=shuffle([...TWO_REP_DIRECT]).slice(0,3).map(p=>({
    ...p,displayAnswer:fmtFrac(p.rn,p.rd),
  }));
  return{type:"two-rep-direct",problems:probs,prompt:"Convert each repeating decimal to a simplified fraction."};
}
export function gradeTwoRepDirectItem(input,item){return fracOk(input,item.rn,item.rd);}
export function gradeTwoRepDirect(input,q){
  try{const ans=JSON.parse(input);return q.problems.every((p,i)=>gradeTwoRepDirectItem(ans[i],p));}catch{return false;}
}

// - A5: Non-repeating part SBS -
const MIXED_REP_SBS=[
  {dec:"0.8333...",overline:"0.8\\overline{3}",mult:10,tenX:"8.333...",diff:"7.5",nineX:"7.5",nineXNum:75,nineXDen:10,rn:5,rd:6,intermediate:"7.5/9"},
  {dec:"0.1666...",overline:"0.1\\overline{6}",mult:10,tenX:"1.666...",diff:"1.5",nineX:"1.5",nineXNum:15,nineXDen:10,rn:1,rd:6,intermediate:"1.5/9"},
  {dec:"0.4166...",overline:"0.41\\overline{6}",mult:100,tenX:"41.666...",diff:"41.25",nineX:"37.5",nineXNum:375,nineXDen:10,rn:5,rd:12,intermediate:"37.5/90"},
];
export function genMixedRepSBS(){
  const p=randChoice(MIXED_REP_SBS);
  return{type:"mixed-rep-sbs",...p,displayAnswer:fmtFrac(p.rn,p.rd),
    prompt:`Convert ${p.dec} to a fraction.`};
}
export function gradeMixedRepS1(input,q){
  const s=String(input||"").trim().replace(/\s+/g,"").toLowerCase();
  return s===`x=${q.dec}`||s===q.dec||s.startsWith("x=0.");
}
export function gradeMixedRepS2(input,q){
  const s=String(input||"").trim().replace(/\s+/g,"").toLowerCase();
  return s===`${q.mult}x=${q.tenX}`||s===q.tenX||
    (s.includes(String(q.mult)+"x"))||s.startsWith(q.tenX.split(".")[0]+".");
}
export function gradeMixedRepS3(input,q){
  const s=String(input||"").trim().replace(/\s+/g,"");
  return s===q.diff||s===q.nineX||
    s.replace("x","").includes(q.nineX)||
    s===`${q.mult-1}x=${q.nineX}`||s===`9x=${q.nineX}`;
}
export function gradeMixedRepS4(input,q){
  return fracOk(input,q.rn,q.rd)||input.trim()===q.intermediate;
}

// - A6: Mixed repeating decimal direct -
const MIXED_REP_DIRECT=[
  {overline:"0.1\\overline{6}",dec:"0.1666...",rn:1,rd:6},
  {overline:"0.8\\overline{3}",dec:"0.8333...",rn:5,rd:6},
  {overline:"0.41\\overline{6}",dec:"0.4166...",rn:5,rd:12},
  {overline:"0.125\\overline{125}",dec:"0.125125...",rn:125,rd:999},
  {overline:"0.08\\overline{3}",dec:"0.0833...",rn:1,rd:12},
  {overline:"0.58\\overline{3}",dec:"0.5833...",rn:7,rd:12},
];
export function genMixedRepDirect(){
  const probs=shuffle([...MIXED_REP_DIRECT]).slice(0,4).map(p=>({
    ...p,displayAnswer:fmtFrac(p.rn,p.rd),
  }));
  return{type:"mixed-rep-direct",problems:probs,prompt:"Convert each repeating decimal to a simplified fraction."};
}
export function gradeMixedRepDirectItem(input,item){return fracOk(input,item.rn,item.rd);}
export function gradeMixedRepDirect(input,q){
  try{const ans=JSON.parse(input);return q.problems.every((p,i)=>gradeMixedRepDirectItem(ans[i],p));}catch{return false;}
}

// - Topic registry -
export const LESSON21_TOPICS=[
  {id:"warmup-a",          label:"Warm-up: Simplify Ratio",          description:"18:24"},
  {id:"warmup-b",          label:"Warm-up: Missing Term",            description:"3:4 = x:20"},
  {id:"warmup-c",          label:"Warm-up: Fraction to Decimal",     description:"1/3"},
  {id:"warmup-d",          label:"Warm-up: Write Ratio",             description:"Statement"},
  {id:"single-rep-direct", label:"A1: Single-Digit Repeat", description:"4 simultaneous"},
  {id:"two-rep-direct",    label:"A2: Two-Digit Repeat",    description:"3 simultaneous"},
  {id:"mixed-rep-direct",  label:"A3: Mixed Repeating",     description:"4 simultaneous"},
];

export function generateLesson21Question(topicId){
  switch(topicId){
    case "warmup-a":          return genWarmupA();
    case "warmup-b":          return genWarmupB();
    case "warmup-c":          return genWarmupC();
    case "warmup-d":          return genWarmupD();
    case "single-rep-direct": return genSingleRepDirect();
    case "two-rep-direct":    return genTwoRepDirect();
    case "mixed-rep-direct":  return genMixedRepDirect();
    default:                  return genWarmupA();
  }
}

export function gradeLesson21Answer(input,question){
  if(!input||!question)return false;
  switch(question.type){
    case "warmup-a":          return gradeWarmupA(input);
    case "warmup-b":          return gradeWarmupB(input);
    case "warmup-c":          return gradeWarmupC(input);
    case "warmup-d":          return gradeWarmupD(input);
    case "single-rep-direct": return gradeSingleRepDirect(input,question);
    case "two-rep-direct":    return gradeTwoRepDirect(input,question);
    case "mixed-rep-direct":  return gradeMixedRepDirect(input,question);
    default:                  return false;
  }
}

