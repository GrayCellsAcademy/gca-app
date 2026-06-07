// Lesson 19 - Decimal Division, Fraction-to-Decimal, Dividing by Decimals, Equations

function randInt(min, max) { return Math.floor(Math.random()*(max-min+1))+min; }
function randChoice(arr) { return arr[Math.floor(Math.random()*arr.length)]; }
function shuffle(arr) { const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }
function gcd(a,b){ a=Math.abs(a);b=Math.abs(b); return b===0?a:gcd(b,a%b); }
function reduce(n,d){ if(n===0)return[0,1]; const g=gcd(Math.abs(n),Math.abs(d)); return[n/g,d/g]; }

function fmtDec(n){
  const s=String(parseFloat(n.toPrecision(10)));
  return s;
}

function decOk(input,correct){
  const v=parseFloat(String(input||"").trim().replace(/,/g,""));
  return!isNaN(v)&&Math.abs(v-correct)<1e-9;
}

function fracOk(input,rn,rd){
  const s=String(input||"").trim();
  if(!s)return false;
  const neg=s.startsWith("-");const abs=neg?s.slice(1).trim():s;
  const mx=abs.replace(/\s*-\s*/g," ").match(/^(\d+)\s+(\d+)\/(\d+)$/);
  let num,den;
  if(mx){num=parseInt(mx[1])*parseInt(mx[3])+parseInt(mx[2]);den=parseInt(mx[3]);}
  else{const fx=abs.match(/^(\d+)\/(\d+)$/);if(fx){num=parseInt(fx[1]);den=parseInt(fx[2]);}
  else{const ix=abs.match(/^(\d+)(\.\d+)?$/);if(ix){num=parseFloat(ix[0])*rd;den=rd;}else return false;}}
  if(neg)num=-num;
  const[in_,id_]=reduce(num,den);const[cn,cd]=reduce(rn,rd);
  return in_===cn&&id_===cd;
}

// - Warm-ups -
export function genWarmupA(){
  return{type:"warmup-a",a:2.5,b:0.4,answer:1,displayAnswer:"1",prompt:"Multiply."};
}
export function gradeWarmupA(input){return decOk(input,1);}

export function genWarmupB(){
  return{type:"warmup-b",dec:0.125,rn:1,rd:8,answer:"1/8",displayAnswer:"1/8",prompt:"Convert to a simplified fraction."};
}
export function gradeWarmupB(input,q){return fracOk(input,q.rn,q.rd);}

export function genWarmupC(){
  return{type:"warmup-c",a:12.35,b:6.7,answer:19.05,displayAnswer:"19.05",prompt:"Add."};
}
export function gradeWarmupC(input){return decOk(input,19.05);}

export function genWarmupD(){
  return{type:"warmup-d",number:"345.678",underlineIdx:5,digit:7,answer:"hundredths",
    options:["tenths","hundredths","thousandths","ten-thousandths"],prompt:"Select the place value of the underlined digit."};
}
export function gradeWarmupD(input){return String(input||"").trim().toLowerCase()==="hundredths";}

// - A1: Whole number division to decimal (step by step) -
const DIV_DEC_SBS_POOL=[
  {dividend:13,divisor:4,quotient:3,remainder:1,answer:3.25},
  {dividend:7,divisor:2,quotient:3,remainder:1,answer:3.5},
  {dividend:22,divisor:5,quotient:4,remainder:2,answer:4.4},
  {dividend:15,divisor:6,quotient:2,remainder:3,answer:2.5},
  {dividend:37,divisor:8,quotient:4,remainder:5,answer:4.625},
  {dividend:11,divisor:4,quotient:2,remainder:3,answer:2.75},
  {dividend:9,divisor:4,quotient:2,remainder:1,answer:2.25},
  {dividend:17,divisor:4,quotient:4,remainder:1,answer:4.25},
  {dividend:19,divisor:5,quotient:3,remainder:4,answer:3.8},
  {dividend:23,divisor:4,quotient:5,remainder:3,answer:5.75},
  {dividend:41,divisor:8,quotient:5,remainder:1,answer:5.125},
  {dividend:33,divisor:8,quotient:4,remainder:1,answer:4.125},
];
export function genDivDecSBS(){
  const p=randChoice(DIV_DEC_SBS_POOL);
  return{type:"div-dec-sbs",...p,
    displayAnswer:fmtDec(p.answer),
    prompt:`Divide: ${p.dividend} \\div ${p.divisor}`};
}
export function gradeDivDecSBSStage1(input,q){
  // Accept "Q R R" or "quotient remainder R" formats
  const s=String(input||"").trim().replace(/\s+/g," ");
  const m=s.match(/^(\d+)\s+[Rr](\d+)$/)||s.match(/^(\d+)[Rr](\d+)$/)||s.match(/^(\d+),\s*(\d+)$/);
  if(!m)return false;
  return parseInt(m[1])===q.quotient&&parseInt(m[2])===q.remainder;
}
export function gradeDivDecSBSStage2(input,q){
  // Accept the dividend with decimal e.g. "13.00" or "13.0"
  const v=parseFloat(String(input||"").trim());
  return!isNaN(v)&&Math.abs(v-q.dividend)<1e-9&&String(input||"").includes(".");
}
export function gradeDivDecSBSStage3(input,q){return decOk(input,q.answer);}

// - A2: Whole number division direct -
const DIV_DEC_DIRECT=[
  {dividend:7,divisor:2,answer:3.5},{dividend:22,divisor:5,answer:4.4},
  {dividend:15,divisor:6,answer:2.5},{dividend:37,divisor:8,answer:4.625},
  {dividend:9,divisor:4,answer:2.25},{dividend:13,divisor:4,answer:3.25},
  {dividend:11,divisor:8,answer:1.375},{dividend:17,divisor:5,answer:3.4},
  {dividend:19,divisor:4,answer:4.75},{dividend:23,divisor:8,answer:2.875},
];
export function genDivDecDirect(){
  const probs=shuffle([...DIV_DEC_DIRECT]).slice(0,4).map(p=>({
    ...p,display:`${p.dividend} \\div ${p.divisor}`,answer:p.answer,displayAnswer:fmtDec(p.answer),
  }));
  return{type:"div-dec-direct",problems:probs,prompt:"Divide. Enter the decimal quotient."};
}
export function gradeDivDecDirectItem(input,item){return decOk(input,item.answer);}
export function gradeDivDecDirect(input,q){
  try{const ans=JSON.parse(input);return q.problems.every((p,i)=>gradeDivDecDirectItem(ans[i],p));}catch{return false;}
}

// - A3: Fraction to terminating decimal -
const FRAC_TO_DEC_POOL=[
  {latex:"\\dfrac{1}{2}",n:1,d:2,answer:0.5},{latex:"\\dfrac{3}{4}",n:3,d:4,answer:0.75},
  {latex:"\\dfrac{2}{5}",n:2,d:5,answer:0.4},{latex:"\\dfrac{7}{8}",n:7,d:8,answer:0.875},
  {latex:"\\dfrac{1}{4}",n:1,d:4,answer:0.25},{latex:"\\dfrac{3}{5}",n:3,d:5,answer:0.6},
  {latex:"\\dfrac{1}{8}",n:1,d:8,answer:0.125},{latex:"\\dfrac{4}{5}",n:4,d:5,answer:0.8},
  {latex:"\\dfrac{3}{8}",n:3,d:8,answer:0.375},{latex:"\\dfrac{9}{10}",n:9,d:10,answer:0.9},
];
export function genFracToDec(){
  const probs=shuffle([...FRAC_TO_DEC_POOL]).slice(0,4).map(p=>({
    ...p,displayAnswer:fmtDec(p.answer),
  }));
  return{type:"frac-to-dec",problems:probs,prompt:"Convert each fraction to a decimal."};
}
export function gradeFracToDecItem(input,item){return decOk(input,item.answer);}
export function gradeFracToDec(input,q){
  try{const ans=JSON.parse(input);return q.problems.every((p,i)=>gradeFracToDecItem(ans[i],p));}catch{return false;}
}

// - A4: Repeating decimals -
const REPEATING_POOL=[
  {latex:"\\dfrac{1}{3}",answer:"0.333...",alts:["0.3...","0.33...","0.3333...","1/3"],display:"1/3"},
  {latex:"\\dfrac{2}{3}",answer:"0.666...",alts:["0.6...","0.67...","0.6666...","2/3"],display:"2/3"},
  {latex:"\\dfrac{5}{6}",answer:"0.8333...",alts:["0.83...","0.833...","0.8333...","5/6"],display:"5/6"},
  {latex:"\\dfrac{4}{9}",answer:"0.444...",alts:["0.4...","0.44...","0.4444...","4/9"],display:"4/9"},
  {latex:"\\dfrac{1}{6}",answer:"0.1666...",alts:["0.16...","0.166...","0.1666...","1/6"],display:"1/6"},
  {latex:"\\dfrac{1}{9}",answer:"0.111...",alts:["0.1...","0.11...","0.1111...","1/9"],display:"1/9"},
];
export function genRepeatingDec(){
  const probs=shuffle([...REPEATING_POOL]).slice(0,4).map(p=>({...p}));
  return{type:"repeating-dec",problems:probs,prompt:"Express each fraction as a repeating decimal (use ... to show repeating)."};
}
export function gradeRepeatingItem(input,item){
  const s=String(input||"").trim().replace(/\s+/g,"");
  // Accept any of the alts or the main answer
  const all=[item.answer,...item.alts];
  return all.some(a=>s.toLowerCase()===a.toLowerCase());
}
export function gradeRepeating(input,q){
  try{const ans=JSON.parse(input);return q.problems.every((p,i)=>gradeRepeatingItem(ans[i],p));}catch{return false;}
}

// - A5: Classify terminating or repeating -
function isTerminating(n,d){
  const[rn,rd]=reduce(n,d);
  let x=rd;
  while(x%2===0)x/=2;
  while(x%5===0)x/=5;
  return x===1;
}
const CLASSIFY_POOL=[
  {latex:"\\dfrac{1}{2}",n:1,d:2},{latex:"\\dfrac{1}{3}",n:1,d:3},
  {latex:"\\dfrac{3}{8}",n:3,d:8},{latex:"\\dfrac{5}{6}",n:5,d:6},
  {latex:"\\dfrac{1}{4}",n:1,d:4},{latex:"\\dfrac{2}{7}",n:2,d:7},
  {latex:"\\dfrac{4}{5}",n:4,d:5},{latex:"\\dfrac{5}{9}",n:5,d:9},
  {latex:"\\dfrac{7}{8}",n:7,d:8},{latex:"\\dfrac{1}{6}",n:1,d:6},
  {latex:"\\dfrac{3}{4}",n:3,d:4},{latex:"\\dfrac{4}{11}",n:4,d:11},
];
export function genClassify(){
  const items=shuffle([...CLASSIFY_POOL]).slice(0,6).map(p=>({
    ...p,answer:isTerminating(p.n,p.d)?"Terminating":"Repeating",
    options:["Terminating","Repeating"],
  }));
  return{type:"classify",items,prompt:"Select Terminating or Repeating for each fraction."};
}
export function gradeClassifyItem(input,item){
  return String(input||"").trim().toLowerCase()===item.answer.toLowerCase();
}
export function gradeClassify(input,q){
  try{const ans=JSON.parse(input);return q.items.every((item,i)=>gradeClassifyItem(ans[i],item));}catch{return false;}
}

// - A6: Decimal / whole number step by step -
const DEC_DIV_WHOLE_SBS=[
  {dividend:12.5,divisor:5,answer:2.5},{dividend:8.4,divisor:4,answer:2.1},
  {dividend:15.75,divisor:3,answer:5.25},{dividend:6.25,divisor:5,answer:1.25},
  {dividend:9.6,divisor:4,answer:2.4},{dividend:7.2,divisor:6,answer:1.2},
  {dividend:18.9,divisor:9,answer:2.1},{dividend:4.5,divisor:3,answer:1.5},
];
export function genDecDivWholeSBS(){
  const p=randChoice(DEC_DIV_WHOLE_SBS);
  return{type:"dec-div-whole-sbs",...p,
    displayAnswer:fmtDec(p.answer),
    prompt:`Divide: ${p.dividend} \\div ${p.divisor}`};
}
export function gradeDecDivWholeSBSStage1(input,q){
  // Accept any description mentioning decimal point in quotient aligned above dividend
  const s=String(input||"").trim().toLowerCase();
  // Accept if they write the quotient with decimal e.g. "2.5" or describe alignment
  return s.includes(".")&&!isNaN(parseFloat(s.split(/\s/)[0]));
}
export function gradeDecDivWholeSBSStage2(input,q){return decOk(input,q.answer);}

// - A7: Decimal / whole number direct -
const DEC_DIV_WHOLE_DIRECT=[
  {dividend:8.4,divisor:4,answer:2.1},{dividend:15.75,divisor:3,answer:5.25},
  {dividend:6.25,divisor:5,answer:1.25},{dividend:22.5,divisor:6,answer:3.75},
  {dividend:9.6,divisor:4,answer:2.4},{dividend:7.2,divisor:6,answer:1.2},
  {dividend:18.9,divisor:7,answer:2.7},{dividend:4.8,divisor:4,answer:1.2},
];
export function genDecDivWholeDirect(){
  const probs=shuffle([...DEC_DIV_WHOLE_DIRECT]).slice(0,4).map(p=>({
    ...p,display:`${p.dividend} \\div ${p.divisor}`,displayAnswer:fmtDec(p.answer),
  }));
  return{type:"dec-div-whole-direct",problems:probs,prompt:"Divide. Enter the decimal quotient."};
}
export function gradeDecDivWholeDirectItem(input,item){return decOk(input,item.answer);}
export function gradeDecDivWholeDirect(input,q){
  try{const ans=JSON.parse(input);return q.problems.every((p,i)=>gradeDecDivWholeDirectItem(ans[i],p));}catch{return false;}
}

// - A8: Convert division by decimal to whole number divisor -
const CONV_DIV_POOL=[
  {expr:"6.3 \\div 0.3",newDividend:63,newDivisor:3,factor:10,display:"6.3 / 0.3"},
  {expr:"4.5 \\div 0.5",newDividend:45,newDivisor:5,factor:10,display:"4.5 / 0.5"},
  {expr:"3.6 \\div 0.12",newDividend:360,newDivisor:12,factor:100,display:"3.6 / 0.12"},
  {expr:"0.45 \\div 0.05",newDividend:45,newDivisor:5,factor:100,display:"0.45 / 0.05"},
  {expr:"7.2 \\div 0.8",newDividend:72,newDivisor:8,factor:10,display:"7.2 / 0.8"},
  {expr:"2.5 \\div 0.2",newDividend:25,newDivisor:2,factor:10,display:"2.5 / 0.2"},
  {expr:"1.8 \\div 0.06",newDividend:180,newDivisor:6,factor:100,display:"1.8 / 0.06"},
  {expr:"0.9 \\div 0.03",newDividend:90,newDivisor:3,factor:100,display:"0.9 / 0.03"},
];
export function genConvDiv(){
  const probs=shuffle([...CONV_DIV_POOL]).slice(0,5).map(p=>({
    ...p,answer:`${p.newDividend} / ${p.newDivisor}`,displayAnswer:`${p.newDividend} \\div ${p.newDivisor}`,
  }));
  return{type:"conv-div",problems:probs,prompt:"Rewrite each as a division by a whole number."};
}
export function gradeConvDivItem(input,item){
  const s=String(input||"").trim().replace(/\s+/g,"").replace(/-/g,"/");
  const m=s.match(/^(\d+)[/-](\d+)$/);
  if(!m)return false;
  const a=parseInt(m[1]),b=parseInt(m[2]);
  // Accept equivalent (same ratio)
  return(a===item.newDividend&&b===item.newDivisor)||(a/b===item.newDividend/item.newDivisor&&Number.isInteger(a)&&Number.isInteger(b));
}
export function gradeConvDiv(input,q){
  try{const ans=JSON.parse(input);return q.problems.every((p,i)=>gradeConvDivItem(ans[i],p));}catch{return false;}
}

// - A9: Divide by decimal step by step -
const DIV_DEC_SBS2_POOL=[
  {dividend:4.5,divisor:0.5,factor:10,newDividend:45,newDivisor:5,answer:9},
  {dividend:6.3,divisor:0.3,factor:10,newDividend:63,newDivisor:3,answer:21},
  {dividend:7.2,divisor:0.8,factor:10,newDividend:72,newDivisor:8,answer:9},
  {dividend:3.6,divisor:0.12,factor:100,newDividend:360,newDivisor:12,answer:30},
  {dividend:0.45,divisor:0.05,factor:100,newDividend:45,newDivisor:5,answer:9},
  {dividend:2.5,divisor:0.2,factor:10,newDividend:25,newDivisor:2,answer:12.5},
  {dividend:8.4,divisor:0.7,factor:10,newDividend:84,newDivisor:7,answer:12},
];
export function genDivDecSBS2(){
  const p=randChoice(DIV_DEC_SBS2_POOL);
  return{type:"div-dec-sbs2",...p,
    displayAnswer:fmtDec(p.answer),
    prompt:`Divide: ${p.dividend} \\div ${p.divisor}`};
}
export function gradeDivDecSBS2Stage1(input,q){
  return parseInt(String(input||"").trim())===q.factor;
}
export function gradeDivDecSBS2Stage2(input,q){
  const s=String(input||"").trim().replace(/\s+/g,"").replace(/-/g,"/");
  const m=s.match(/^(\d+)[/-](\d+)$/);
  if(!m)return false;
  return parseInt(m[1])===q.newDividend&&parseInt(m[2])===q.newDivisor;
}
export function gradeDivDecSBS2Stage3(input,q){return decOk(input,q.answer);}

// - A10: Divide by decimal direct -
const DIV_DEC_DIRECT2=[
  {expr:"7.2 \\div 0.8",answer:9},{expr:"3.6 \\div 0.12",answer:30},
  {expr:"0.45 \\div 0.05",answer:9},{expr:"2.5 \\div 0.2",answer:12.5},
  {expr:"6.3 \\div 0.7",answer:9},{expr:"4.8 \\div 0.6",answer:8},
  {expr:"1.8 \\div 0.06",answer:30},{expr:"0.9 \\div 0.03",answer:30},
];
export function genDivDecDirect2(){
  const probs=shuffle([...DIV_DEC_DIRECT2]).slice(0,4).map(p=>({
    ...p,displayAnswer:fmtDec(p.answer),
  }));
  return{type:"div-dec-direct2",problems:probs,prompt:"Divide. Enter the quotient."};
}
export function gradeDivDecDirect2Item(input,item){return decOk(input,item.answer);}
export function gradeDivDecDirect2(input,q){
  try{const ans=JSON.parse(input);return q.problems.every((p,i)=>gradeDivDecDirect2Item(ans[i],p));}catch{return false;}
}

// - A11: Identify multiplier to clear decimals -
const CLEAR_DEC_EQ_POOL=[
  {eq:"0.5x + 0.25 = 1.25",maxPlaces:2,multiplier:100},
  {eq:"0.3x - 0.2 = 0.4",maxPlaces:1,multiplier:10},
  {eq:"0.25x + 0.5 = 1",maxPlaces:2,multiplier:100},
  {eq:"1.2x = 3.6",maxPlaces:1,multiplier:10},
  {eq:"0.05x + 0.1 = 0.3",maxPlaces:2,multiplier:100},
  {eq:"0.4x - 0.8 = 1.2",maxPlaces:1,multiplier:10},
  {eq:"0.75x + 0.5 = 2",maxPlaces:2,multiplier:100},
  {eq:"0.6x - 0.3 = 0.9",maxPlaces:1,multiplier:10},
];
export function genClearDecEq(){
  const probs=shuffle([...CLEAR_DEC_EQ_POOL]).slice(0,5).map(p=>({
    ...p,answer:String(p.multiplier),displayAnswer:String(p.multiplier),
  }));
  return{type:"clear-dec-eq",problems:probs,prompt:"Enter the power of 10 needed to clear all decimals."};
}
export function gradeClearDecEqItem(input,item){
  return parseInt(String(input||"").trim())===item.multiplier;
}
export function gradeClearDecEq(input,q){
  try{const ans=JSON.parse(input);return q.problems.every((p,i)=>gradeClearDecEqItem(ans[i],p));}catch{return false;}
}

// - A12: Clear decimals and solve step by step -
const CLEAR_SOLVE_POOL=[
  {eq:"0.5x + 0.25 = 1.25",multiplier:100,cleared:"50x + 25 = 125",xNum:2,xDen:1,answer:"2"},
  {eq:"0.3x - 0.2 = 0.4",multiplier:10,cleared:"3x - 2 = 4",xNum:2,xDen:1,answer:"2"},
  {eq:"0.25x + 0.5 = 1",multiplier:100,cleared:"25x + 50 = 100",xNum:2,xDen:1,answer:"2"},
  {eq:"1.2x = 3.6",multiplier:10,cleared:"12x = 36",xNum:3,xDen:1,answer:"3"},
  {eq:"0.05x + 0.1 = 0.3",multiplier:100,cleared:"5x + 10 = 30",xNum:4,xDen:1,answer:"4"},
  {eq:"0.4x - 0.8 = 1.2",multiplier:10,cleared:"4x - 8 = 12",xNum:5,xDen:1,answer:"5"},
  {eq:"0.6x - 0.3 = 0.9",multiplier:10,cleared:"6x - 3 = 9",xNum:2,xDen:1,answer:"2"},
  {eq:"0.75x + 0.5 = 2",multiplier:100,cleared:"75x + 50 = 200",xNum:2,xDen:1,answer:"2"},
];
export function genClearSolveSBS(){
  const p=randChoice(CLEAR_SOLVE_POOL);
  return{type:"clear-solve-sbs",...p,
    displayAnswer:p.answer,
    prompt:`Solve: ${p.eq}`};
}
export function gradeClearSolveSBSStage1(input,q){
  return parseInt(String(input||"").trim())===q.multiplier;
}
export function gradeClearSolveSBSStage2(input,q){
  const s=String(input||"").trim().replace(/\s+/g," ");
  const target=q.cleared.replace(/\s+/g," ");
  return s===target;
}
export function gradeClearSolveSBSStage3(input,q){
  return decOk(input,q.xNum/q.xDen);
}

// - A13: Solve decimal equations direct -
const SOLVE_DEC_DIRECT=[
  {eq:"0.3x - 0.2 = 0.4",xNum:2,xDen:1,answer:"2"},
  {eq:"0.25x + 0.5 = 1",xNum:2,xDen:1,answer:"2"},
  {eq:"1.2x = 3.6",xNum:3,xDen:1,answer:"3"},
  {eq:"0.05x + 0.1 = 0.3",xNum:4,xDen:1,answer:"4"},
  {eq:"0.4x - 0.8 = 1.2",xNum:5,xDen:1,answer:"5"},
  {eq:"0.6x - 0.3 = 0.9",xNum:2,xDen:1,answer:"2"},
  {eq:"0.5x + 1 = 2.5",xNum:3,xDen:1,answer:"3"},
  {eq:"0.2x - 0.6 = 0.4",xNum:5,xDen:1,answer:"5"},
];
export function genSolveDecDirect(){
  const probs=shuffle([...SOLVE_DEC_DIRECT]).slice(0,4).map(p=>({...p}));
  return{type:"solve-dec-direct",problems:probs,prompt:"Solve for x."};
}
export function gradeSolveDecDirectItem(input,item){return decOk(input,item.xNum/item.xDen);}
export function gradeSolveDecDirect(input,q){
  try{const ans=JSON.parse(input);return q.problems.every((p,i)=>gradeSolveDecDirectItem(ans[i],p));}catch{return false;}
}

// - Topic registry -
export const LESSON19_TOPICS=[
  {id:"warmup-a",            label:"Warm-up: Multiply Decimals",        description:"2.5 x 0.4"},
  {id:"warmup-b",            label:"Warm-up: Decimal to Fraction",      description:"0.125"},
  {id:"warmup-c",            label:"Warm-up: Add Decimals",             description:"12.35 + 6.7"},
  {id:"warmup-d",            label:"Warm-up: Place Value",              description:"345.678"},
  {id:"div-dec-direct",      label:"A1: Whole Num Division (Direct)",   description:"4 simultaneous"},
  {id:"frac-to-dec",         label:"A2: Fraction to Decimal",           description:"4 simultaneous"},
  {id:"repeating-dec",       label:"A3: Repeating Decimals",            description:"4 simultaneous"},
  {id:"classify",            label:"A4: Classify Term./Repeating",      description:"6 simultaneous"},
  {id:"dec-div-whole-direct",label:"A5: Decimal / Whole (Direct)",      description:"4 simultaneous"},
  {id:"conv-div",            label:"A6: Convert Div by Decimal",        description:"5 simultaneous"},
  {id:"div-dec-direct2",     label:"A7: Divide by Decimal (Direct)",   description:"4 simultaneous"},
  {id:"clear-dec-eq",        label:"A8: Identify Multiplier",          description:"5 simultaneous"},
  {id:"solve-dec-direct",    label:"A9: Solve Decimal Equations",      description:"4 simultaneous"},
];

export function generateLesson19Question(topicId){
  switch(topicId){
    case "warmup-a":             return genWarmupA();
    case "warmup-b":             return genWarmupB();
    case "warmup-c":             return genWarmupC();
    case "warmup-d":             return genWarmupD();
    case "div-dec-direct":       return genDivDecDirect();
    case "frac-to-dec":          return genFracToDec();
    case "repeating-dec":        return genRepeatingDec();
    case "classify":             return genClassify();
    case "dec-div-whole-direct": return genDecDivWholeDirect();
    case "conv-div":             return genConvDiv();
    case "div-dec-direct2":      return genDivDecDirect2();
    case "clear-dec-eq":         return genClearDecEq();
    case "solve-dec-direct":     return genSolveDecDirect();
    default:                     return genWarmupA();
  }
}

export function gradeLesson19Answer(input,question){
  if(!input||!question)return false;
  switch(question.type){
    case "warmup-a":             return gradeWarmupA(input);
    case "warmup-b":             return gradeWarmupB(input,question);
    case "warmup-c":             return gradeWarmupC(input);
    case "warmup-d":             return gradeWarmupD(input);
    case "div-dec-direct":       return gradeDivDecDirect(input,question);
    case "frac-to-dec":          return gradeFracToDec(input,question);
    case "repeating-dec":        return gradeRepeating(input,question);
    case "classify":             return gradeClassify(input,question);
    case "dec-div-whole-direct": return gradeDecDivWholeDirect(input,question);
    case "conv-div":             return gradeConvDiv(input,question);
    case "div-dec-direct2":      return gradeDivDecDirect2(input,question);
    case "clear-dec-eq":         return gradeClearDecEq(input,question);
    case "solve-dec-direct":     return gradeSolveDecDirect(input,question);
    default:                     return false;
  }
}

