// Lesson 17 - Quotient Rule, Factoring GCF, Solving Equations with Fractions

function randInt(min, max) { return Math.floor(Math.random()*(max-min+1))+min; }
function randChoice(arr) { return arr[Math.floor(Math.random()*arr.length)]; }
function shuffle(arr) { const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }
function gcd(a,b){ a=Math.abs(a);b=Math.abs(b); return b===0?a:gcd(b,a%b); }
function lcm(a,b){ return Math.abs(a*b)/gcd(a,b); }
function reduce(n,d){ if(n===0)return[0,1]; const g=gcd(Math.abs(n),Math.abs(d)); return[n/g,d/g]; }

// - Answer parsing helpers -
function parseFrac(str){
  const s=String(str||"").trim();
  const neg=s.startsWith("-"); const abs=neg?s.slice(1).trim():s;
  const mx=abs.replace(/\s*-\s*/g," ").match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if(mx){const num=parseInt(mx[1])*parseInt(mx[3])+parseInt(mx[2]);return{num:neg?-num:num,den:parseInt(mx[3])};}
  const fx=abs.match(/^(\d+)\/(\d+)$/);
  if(fx)return{num:neg?-parseInt(fx[1]):parseInt(fx[1]),den:parseInt(fx[2])};
  const ix=abs.match(/^(\d+)$/);
  if(ix)return{num:neg?-parseInt(ix[1]):parseInt(ix[1]),den:1};
  return null;
}
function fracOk(input,rn,rd){
  const p=parseFrac(input); if(!p)return false;
  const[in_,id_]=reduce(p.num,p.den); const[cn,cd]=reduce(rn,rd);
  return in_===cn&&id_===cd;
}

// Parse algebraic expression like "5x^4", "3x^3", "x^2", "4", "2x"
// Returns {coeff, exp} meaning coeff * x^exp
function parseAlg(str){
  const s=String(str||"").trim().replace(/\s+/g,"").replace(/\*/g,"");
  // integer only: "5"
  if(/^-?\d+$/.test(s)) return{coeff:parseInt(s),exp:0};
  // x only: "x" or "-x"
  if(/^-?x$/.test(s)) return{coeff:s.startsWith("-")?-1:1,exp:1};
  // coeff*x: "3x" or "-3x"
  const cxm=s.match(/^(-?\d+)x$/);
  if(cxm)return{coeff:parseInt(cxm[1]),exp:1};
  // x^n: "x^4" or "-x^4"
  const xpm=s.match(/^(-?)x\^(\d+)$/);
  if(xpm)return{coeff:xpm[1]==="-"?-1:1,exp:parseInt(xpm[2])};
  // coeff*x^n: "3x^4" or "-3x^4"
  const cxpm=s.match(/^(-?\d+)x\^(\d+)$/);
  if(cxpm)return{coeff:parseInt(cxpm[1]),exp:parseInt(cxpm[2])};
  return null;
}

function algOk(input,coeff,exp){
  const p=parseAlg(input); if(!p)return false;
  return p.coeff===coeff&&p.exp===exp;
}

function fmtAlg(coeff,exp){
  if(exp===0)return String(coeff);
  const c=coeff===1?"":coeff===-1?"-":String(coeff);
  const x=exp===1?"x":`x^${exp}`;
  return`${c}${x}`;
}

// Parse factored form: "k(ax+b)" or "kx(ax+b)" or "k(ax-b)"
function parseFactored(str){
  const s=String(str||"").trim().replace(/\s+/g,"");
  // kx(ax+b) or kx(ax-b)
  const mx2=s.match(/^(\d+)x\((-?\d+)x([+-]\d+)\)$/);
  if(mx2){
    const k=parseInt(mx2[1]),a=parseInt(mx2[2]),b=parseInt(mx2[3]);
    return{gcfCoeff:k,gcfExp:1,innerA:a,innerB:b};
  }
  // k(ax+b) or k(ax-b)
  const mx1=s.match(/^(\d+)\((-?\d+)x([+-]\d+)\)$/);
  if(mx1){
    const k=parseInt(mx1[1]),a=parseInt(mx1[2]),b=parseInt(mx1[3]);
    return{gcfCoeff:k,gcfExp:0,innerA:a,innerB:b};
  }
  // k(x+b) or k(x-b)
  const mx0=s.match(/^(\d+)\(x([+-]\d+)\)$/);
  if(mx0){
    const k=parseInt(mx0[1]),b=parseInt(mx0[2]);
    return{gcfCoeff:k,gcfExp:0,innerA:1,innerB:b};
  }
  // kx(x+b) or kx(x-b)
  const mx3=s.match(/^(\d+)x\(x([+-]\d+)\)$/);
  if(mx3){
    const k=parseInt(mx3[1]),b=parseInt(mx3[2]);
    return{gcfCoeff:k,gcfExp:1,innerA:1,innerB:b};
  }
  return null;
}

function factoredOk(input,gcfCoeff,gcfExp,innerA,innerB){
  const p=parseFactored(String(input||"").trim().replace(/\s+/g,"").replace(/\u2013/g,"-").replace(/\u2212/g,"-"));
  if(!p)return false;
  return p.gcfCoeff===gcfCoeff&&p.gcfExp===gcfExp&&p.innerA===innerA&&p.innerB===innerB;
}

// - Warm-up A: Multiply fractions 3/5 x 5/6 -
export function genWarmupA(){
  return{type:"warmup-a",n1:3,d1:5,n2:5,d2:6,rn:1,rd:2,answer:"1/2",displayAnswer:"1/2",prompt:"Multiply and simplify."};
}
export function gradeWarmupA(input,q){return fracOk(input,q.rn,q.rd);}

// - Warm-up B: Divide mixed numbers 2 1/4 / 1 1/2 -
export function genWarmupB(){
  return{type:"warmup-b",w1:2,n1:1,d1:4,w2:1,n2:1,d2:2,rn:3,rd:2,answer:"1 1/2",displayAnswer:"1 1/2",prompt:"Divide and simplify."};
}
export function gradeWarmupB(input,q){return fracOk(input,q.rn,q.rd);}

// - Warm-up C: Factor GCF from 12x - 18 -
export function genWarmupC(){
  return{type:"warmup-c",expression:"12x - 18",gcfCoeff:6,gcfExp:0,innerA:2,innerB:-3,answer:"6(2x-3)",displayAnswer:"6(2x-3)",prompt:"Factor the GCF from 12x - 18."};
}
export function gradeWarmupC(input,q){return factoredOk(input,q.gcfCoeff,q.gcfExp,q.innerA,q.innerB);}

// - Warm-up D: Quotient Rule 15x^6 / 3x^2 -
export function genWarmupD(){
  return{type:"warmup-d",coeff1:15,exp1:6,coeff2:3,exp2:2,rCoeff:5,rExp:4,answer:"5x^4",displayAnswer:"5x^4",prompt:"Apply the quotient rule."};
}
export function gradeWarmupD(input,q){return algOk(input,q.rCoeff,q.rExp);}

// - A1: Quotient Rule (positive exponents) 4 simultaneous -
const QUOT_SIMPLE=[
  {c1:1,e1:7,c2:1,e2:3,rc:1,re:4},{c1:6,e1:5,c2:2,e2:2,rc:3,re:3},
  {c1:10,e1:8,c2:5,e2:2,rc:2,re:6},{c1:12,e1:9,c2:4,e2:4,rc:3,re:5},
  {c1:8,e1:6,c2:4,e2:1,rc:2,re:5},{c1:9,e1:7,c2:3,e2:3,rc:3,re:4},
  {c1:15,e1:8,c2:5,e2:3,rc:3,re:5},{c1:6,e1:10,c2:2,e2:4,rc:3,re:6},
  {c1:1,e1:6,c2:1,e2:2,rc:1,re:4},{c1:4,e1:9,c2:2,e2:5,rc:2,re:4},
];
export function genQuotSimple(){
  const probs=shuffle([...QUOT_SIMPLE]).slice(0,4).map(p=>({
    ...p,
    display:`${p.c1===1?"":p.c1}x^{${p.e1}} \\div ${p.c2===1?"":p.c2}x^{${p.e2}}`,
    answer:fmtAlg(p.rc,p.re),displayAnswer:fmtAlg(p.rc,p.re),
  }));
  return{type:"quot-simple",problems:probs,prompt:"Apply the quotient rule. Simplify."};
}
export function gradeQuotSimpleItem(input,item){return algOk(input,item.rc,item.re);}
export function gradeQuotSimple(input,q){
  try{const ans=JSON.parse(input);return q.problems.every((p,i)=>gradeQuotSimpleItem(ans[i],p));}catch{return false;}
}

// - A2: Quotient Rule with coefficients (mixed) 4 simultaneous -
const QUOT_MIXED=[
  {c1:15,e1:6,c2:3,e2:2,rc:5,re:4},{c1:24,e1:7,c2:6,e2:4,rc:4,re:3},
  {c1:36,e1:9,c2:9,e2:5,rc:4,re:4},{c1:20,e1:8,c2:5,e2:3,rc:4,re:5},
  {c1:18,e1:7,c2:6,e2:3,rc:3,re:4},{c1:28,e1:8,c2:7,e2:2,rc:4,re:6},
  {c1:30,e1:9,c2:6,e2:4,rc:5,re:5},{c1:16,e1:8,c2:4,e2:5,rc:4,re:3},
  {c1:21,e1:7,c2:7,e2:3,rc:3,re:4},{c1:32,e1:10,c2:8,e2:6,rc:4,re:4},
];
export function genQuotMixed(){
  const probs=shuffle([...QUOT_MIXED]).slice(0,4).map(p=>({
    ...p,
    display:`${p.c1}x^{${p.e1}} \\div ${p.c2}x^{${p.e2}}`,
    answer:fmtAlg(p.rc,p.re),displayAnswer:fmtAlg(p.rc,p.re),
  }));
  return{type:"quot-mixed",problems:probs,prompt:"Divide and simplify."};
}
export function gradeQuotMixedItem(input,item){return algOk(input,item.rc,item.re);}
export function gradeQuotMixed(input,q){
  try{const ans=JSON.parse(input);return q.problems.every((p,i)=>gradeQuotMixedItem(ans[i],p));}catch{return false;}
}

// - A3: Identify GCF multiple choice 5 problems -
const GCF_ID_POOL=[
  {expr:"12x+18",gcf:6,options:[2,3,6,9]},
  {expr:"8x-12",gcf:4,options:[2,4,6,8]},
  {expr:"15x+25",gcf:5,options:[3,5,10,15]},
  {expr:"9x^2-6x",gcf:"3x",options:["x","3","3x","9x"]},
  {expr:"24x^2+16x",gcf:"8x",options:["4x","8","8x","16x"]},
  {expr:"14x-21",gcf:7,options:[3,7,14,21]},
  {expr:"18x+27",gcf:9,options:[3,6,9,18]},
  {expr:"10x^2-15x",gcf:"5x",options:["5","5x","10x","15x"]},
  {expr:"20x-30",gcf:10,options:[5,10,15,20]},
  {expr:"6x^2+9x",gcf:"3x",options:["3","3x","6","6x"]},
];
export function genGCFIdentify(){
  const probs=shuffle([...GCF_ID_POOL]).slice(0,5).map(p=>({
    ...p,answer:String(p.gcf),displayAnswer:String(p.gcf),
    shuffledOptions:shuffle([...p.options]),
  }));
  return{type:"gcf-identify",problems:probs,prompt:"Select the GCF of each expression."};
}
export function gradeGCFIdentifyItem(input,item){
  return String(input).trim()===String(item.gcf);
}
export function gradeGCFIdentify(input,q){
  try{const ans=JSON.parse(input);return q.problems.every((p,i)=>gradeGCFIdentifyItem(ans[i],p));}catch{return false;}
}

// - A4: Factor GCF step by step -
const FACTOR_SBS_POOL=[
  {expr:"8x-12",gcfCoeff:4,gcfExp:0,innerA:2,innerB:-3,answer:"4(2x-3)"},
  {expr:"15x+25",gcfCoeff:5,gcfExp:0,innerA:3,innerB:5,answer:"5(3x+5)"},
  {expr:"6x-9",gcfCoeff:3,gcfExp:0,innerA:2,innerB:-3,answer:"3(2x-3)"},
  {expr:"9x^2-6x",gcfCoeff:3,gcfExp:1,innerA:3,innerB:-2,answer:"3x(3x-2)"},
  {expr:"24x^2+16x",gcfCoeff:8,gcfExp:1,innerA:3,innerB:2,answer:"8x(3x+2)"},
  {expr:"14x-21",gcfCoeff:7,gcfExp:0,innerA:2,innerB:-3,answer:"7(2x-3)"},
  {expr:"18x+27",gcfCoeff:9,gcfExp:0,innerA:2,innerB:3,answer:"9(2x+3)"},
  {expr:"10x^2-15x",gcfCoeff:5,gcfExp:1,innerA:2,innerB:-3,answer:"5x(2x-3)"},
];
export function genFactorSBS(){
  const p=randChoice(FACTOR_SBS_POOL);
  const gcfDisplay=p.gcfExp===0?String(p.gcfCoeff):`${p.gcfCoeff}x`;
  return{type:"factor-sbs",...p,gcfDisplay,displayAnswer:p.answer,prompt:`Factor: ${p.expr}`};
}
export function gradeFactorSBSStage1(input,q){
  const s=String(input||"").trim();
  return s===String(q.gcfCoeff)||(q.gcfExp>0&&(s===`${q.gcfCoeff}x`||s===q.gcfDisplay));
}
export function gradeFactorSBSStage2(input,q){
  return factoredOk(input,q.gcfCoeff,q.gcfExp,q.innerA,q.innerB);
}

// - A5: Factor GCF direct 5 simultaneous -
const FACTOR_DIRECT_POOL=[
  {expr:"15x+25",gcfCoeff:5,gcfExp:0,innerA:3,innerB:5,answer:"5(3x+5)"},
  {expr:"9x^2-6x",gcfCoeff:3,gcfExp:1,innerA:3,innerB:-2,answer:"3x(3x-2)"},
  {expr:"14x-21",gcfCoeff:7,gcfExp:0,innerA:2,innerB:-3,answer:"7(2x-3)"},
  {expr:"24x^2+16x",gcfCoeff:8,gcfExp:1,innerA:3,innerB:2,answer:"8x(3x+2)"},
  {expr:"18x-27",gcfCoeff:9,gcfExp:0,innerA:2,innerB:-3,answer:"9(2x-3)"},
  {expr:"6x+9",gcfCoeff:3,gcfExp:0,innerA:2,innerB:3,answer:"3(2x+3)"},
  {expr:"10x^2-15x",gcfCoeff:5,gcfExp:1,innerA:2,innerB:-3,answer:"5x(2x-3)"},
  {expr:"12x+18",gcfCoeff:6,gcfExp:0,innerA:2,innerB:3,answer:"6(2x+3)"},
  {expr:"20x^2+12x",gcfCoeff:4,gcfExp:1,innerA:5,innerB:3,answer:"4x(5x+3)"},
  {expr:"8x-20",gcfCoeff:4,gcfExp:0,innerA:2,innerB:-5,answer:"4(2x-5)"},
];
export function genFactorDirect(){
  const probs=shuffle([...FACTOR_DIRECT_POOL]).slice(0,5).map(p=>({
    ...p,displayAnswer:p.answer,
  }));
  return{type:"factor-direct",problems:probs,prompt:"Factor the GCF from each expression."};
}
export function gradeFactorDirectItem(input,item){
  return factoredOk(input,item.gcfCoeff,item.gcfExp,item.innerA,item.innerB);
}
export function gradeFactorDirect(input,q){
  try{const ans=JSON.parse(input);return q.problems.every((p,i)=>gradeFactorDirectItem(ans[i],p));}catch{return false;}
}

// - A6: Find LCD of equation (multiple choice) 5 problems -
const LCD_MC_POOL=[
  {eq:"\\frac{1}{2}x + \\frac{1}{3} = \\frac{3}{4}",denoms:[2,3,4],lcd:12,options:[6,12,24,48]},
  {eq:"\\frac{1}{3}x - \\frac{1}{6} = \\frac{1}{2}",denoms:[3,6,2],lcd:6,options:[3,6,12,18]},
  {eq:"\\frac{3}{4}x + \\frac{1}{2} = \\frac{5}{8}",denoms:[4,2,8],lcd:8,options:[4,8,16,24]},
  {eq:"\\frac{1}{5}x + \\frac{1}{2} = \\frac{3}{10}",denoms:[5,2,10],lcd:10,options:[5,10,20,30]},
  {eq:"\\frac{2}{3}x - \\frac{1}{4} = \\frac{5}{6}",denoms:[3,4,6],lcd:12,options:[6,12,18,24]},
  {eq:"\\frac{1}{4}x + \\frac{1}{6} = \\frac{5}{12}",denoms:[4,6,12],lcd:12,options:[6,12,24,48]},
  {eq:"\\frac{3}{5}x - \\frac{1}{2} = \\frac{1}{10}",denoms:[5,2,10],lcd:10,options:[5,10,20,40]},
  {eq:"\\frac{1}{6}x + \\frac{1}{4} = \\frac{1}{3}",denoms:[6,4,3],lcd:12,options:[6,12,18,24]},
];
export function genLCDMultiChoice(){
  const probs=shuffle([...LCD_MC_POOL]).slice(0,5).map(p=>({
    ...p,answer:String(p.lcd),displayAnswer:String(p.lcd),
    shuffledOptions:shuffle([...p.options]),
  }));
  return{type:"lcd-mc",problems:probs,prompt:"Select the LCD for each equation."};
}
export function gradeLCDMCItem(input,item){return parseInt(String(input).trim())===item.lcd;}
export function gradeLCDMC(input,q){
  try{const ans=JSON.parse(input);return q.problems.every((p,i)=>gradeLCDMCItem(ans[i],p));}catch{return false;}
}

// - A7: Clear denominators step by step -
const CLEAR_DENOM_POOL=[
  {eq:"\\frac{1}{2}x + \\frac{1}{3} = \\frac{3}{4}",lcd:12,cleared:"6x + 4 = 9",rn:5,rd:6,solDisplay:"x = 5/6",xNum:5,xDen:6},
  {eq:"\\frac{2}{3}x - \\frac{1}{6} = \\frac{1}{2}",lcd:6,cleared:"4x - 1 = 3",rn:1,rd:1,solDisplay:"x = 1",xNum:1,xDen:1},
  {eq:"\\frac{3}{4}x + \\frac{1}{4} = 1",lcd:4,cleared:"3x + 1 = 4",rn:1,rd:1,solDisplay:"x = 1",xNum:1,xDen:1},
  {eq:"\\frac{1}{5}x - \\frac{1}{10} = \\frac{1}{10}",lcd:10,cleared:"2x - 1 = 1",rn:1,rd:1,solDisplay:"x = 1",xNum:1,xDen:1},
  {eq:"\\frac{1}{3}x + \\frac{1}{6} = \\frac{1}{2}",lcd:6,cleared:"2x + 1 = 3",rn:1,rd:1,solDisplay:"x = 1",xNum:1,xDen:1},
  {eq:"\\frac{3}{4}x - \\frac{1}{2} = \\frac{1}{4}",lcd:4,cleared:"3x - 2 = 1",rn:1,rd:1,solDisplay:"x = 1",xNum:1,xDen:1},
  {eq:"\\frac{2}{5}x + \\frac{1}{5} = 1",lcd:5,cleared:"2x + 1 = 5",rn:2,rd:1,solDisplay:"x = 2",xNum:2,xDen:1},
];
export function genClearDenom(){
  const p=randChoice(CLEAR_DENOM_POOL);
  return{type:"clear-denom",...p,answer:p.solDisplay,displayAnswer:p.solDisplay,prompt:`Solve: ${p.eq}`};
}
export function gradeClearDenomStage1(input,q){return parseInt(String(input).trim())===q.lcd;}
export function gradeClearDenomStage2(input,q){
  // Accept the cleared equation (flexible whitespace)
  const s=String(input||"").trim().replace(/\s+/g," ");
  const target=q.cleared.replace(/\s+/g," ");
  return s===target;
}
export function gradeClearDenomStage3(input,q){return fracOk(input,q.xNum,q.xDen);}

// - A8: Solve by clearing denominators (direct) 4 simultaneous -
const SOLVE_DIRECT_POOL=[
  {eq:"\\frac{1}{2}x + \\frac{1}{4} = \\frac{3}{4}",xNum:1,xDen:1,answer:"1",displayAnswer:"x = 1"},
  {eq:"\\frac{2}{3}x - \\frac{1}{6} = \\frac{1}{2}",xNum:1,xDen:1,answer:"1",displayAnswer:"x = 1"},
  {eq:"\\frac{3}{4}x + \\frac{1}{4} = 1",xNum:1,xDen:1,answer:"1",displayAnswer:"x = 1"},
  {eq:"\\frac{1}{5}x - \\frac{1}{10} = \\frac{1}{10}",xNum:1,xDen:1,answer:"1",displayAnswer:"x = 1"},
  {eq:"\\frac{1}{3}x + \\frac{1}{6} = \\frac{1}{2}",xNum:1,xDen:1,answer:"1",displayAnswer:"x = 1"},
  {eq:"\\frac{2}{5}x + \\frac{1}{5} = 1",xNum:2,xDen:1,answer:"2",displayAnswer:"x = 2"},
  {eq:"\\frac{3}{4}x - \\frac{1}{2} = \\frac{1}{4}",xNum:1,xDen:1,answer:"1",displayAnswer:"x = 1"},
  {eq:"\\frac{1}{2}x - \\frac{1}{3} = \\frac{1}{6}",xNum:1,xDen:1,answer:"1",displayAnswer:"x = 1"},
  {eq:"\\frac{2}{3}x + \\frac{1}{3} = \\frac{5}{3}",xNum:2,xDen:1,answer:"2",displayAnswer:"x = 2"},
  {eq:"\\frac{3}{5}x - \\frac{1}{5} = 1",xNum:2,xDen:1,answer:"2",displayAnswer:"x = 2"},
];
export function genSolveDirect(){
  const probs=shuffle([...SOLVE_DIRECT_POOL]).slice(0,4);
  return{type:"solve-direct",problems:probs,prompt:"Solve for x."};
}
export function gradeSolveDirectItem(input,item){return fracOk(input,item.xNum,item.xDen);}
export function gradeSolveDirect(input,q){
  try{const ans=JSON.parse(input);return q.problems.every((p,i)=>gradeSolveDirectItem(ans[i],p));}catch{return false;}
}

// - Topic registry -
export const LESSON17_TOPICS=[
  {id:"warmup-a",     label:"Warm-up: Multiply Fractions",    description:"3/5 x 5/6"},
  {id:"warmup-b",     label:"Warm-up: Divide Mixed Numbers",  description:"2 1/4 / 1 1/2"},
  {id:"warmup-c",     label:"Warm-up: Factor GCF",            description:"12x - 18"},
  {id:"warmup-d",     label:"Warm-up: Quotient Rule",         description:"15x^6 / 3x^2"},
  {id:"quot-simple",  label:"A1: Quotient Rule (Basic)",      description:"4 simultaneous"},
  {id:"quot-mixed",   label:"A2: Quotient Rule (Mixed)",      description:"4 simultaneous"},
  {id:"gcf-identify", label:"A3: Identify GCF",              description:"5 multiple choice"},
  {id:"factor-sbs",   label:"A4: Factor GCF (Step by Step)",  description:"2-stage"},
  {id:"factor-direct",label:"A5: Factor GCF (Direct)",        description:"5 simultaneous"},
  {id:"lcd-mc",       label:"A6: Find LCD",                   description:"5 multiple choice"},
  {id:"clear-denom",  label:"A7: Clear Denominators (Steps)", description:"3-stage"},
  {id:"solve-direct", label:"A8: Solve (Direct)",             description:"4 simultaneous"},
];

export function generateLesson17Question(topicId){
  switch(topicId){
    case "warmup-a":     return genWarmupA();
    case "warmup-b":     return genWarmupB();
    case "warmup-c":     return genWarmupC();
    case "warmup-d":     return genWarmupD();
    case "quot-simple":  return genQuotSimple();
    case "quot-mixed":   return genQuotMixed();
    case "gcf-identify": return genGCFIdentify();
    case "factor-sbs":   return genFactorSBS();
    case "factor-direct":return genFactorDirect();
    case "lcd-mc":       return genLCDMultiChoice();
    case "clear-denom":  return genClearDenom();
    case "solve-direct": return genSolveDirect();
    default:             return genWarmupA();
  }
}

export function gradeLesson17Answer(input,question){
  if(!input||!question)return false;
  switch(question.type){
    case "warmup-a":     return gradeWarmupA(input,question);
    case "warmup-b":     return gradeWarmupB(input,question);
    case "warmup-c":     return gradeWarmupC(input,question);
    case "warmup-d":     return gradeWarmupD(input,question);
    case "quot-simple":  return gradeQuotSimple(input,question);
    case "quot-mixed":   return gradeQuotMixed(input,question);
    case "gcf-identify": return gradeGCFIdentify(input,question);
    case "factor-sbs":   return gradeFactorSBSStage2(input,question);
    case "factor-direct":return gradeFactorDirect(input,question);
    case "lcd-mc":       return gradeLCDMC(input,question);
    case "clear-denom":  return gradeClearDenomStage3(input,question);
    case "solve-direct": return gradeSolveDirect(input,question);
    default:             return false;
  }
}

