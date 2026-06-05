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
  // negative exponent: "1/x" or "1/x^n"
  const neg1=s.match(/^(\d+)\/x$/);
  if(neg1)return{coeff:parseInt(neg1[1]),exp:-1,coeffN:parseInt(neg1[1]),coeffD:1};
  const negn=s.match(/^(\d+)\/x\^(\d+)$/);
  if(negn)return{coeff:parseInt(negn[1]),exp:-parseInt(negn[2]),coeffN:parseInt(negn[1]),coeffD:1};
  // fractional coeff with negative exp: "1/(2x^4)" or "3/(2x^3)"
  const negfrac=s.match(/^(\d+)\/\((\d+)x\^(\d+)\)$/);
  if(negfrac)return{coeff:0,exp:-parseInt(negfrac[3]),coeffN:parseInt(negfrac[1]),coeffD:parseInt(negfrac[2])};
  const negfrac1=s.match(/^(\d+)\/\((\d+)x\)$/);
  if(negfrac1)return{coeff:0,exp:-1,coeffN:parseInt(negfrac1[1]),coeffD:parseInt(negfrac1[2])};
  // fractional coeff with positive exp: "x/2" or "x^3/4" or "3x^2/4"
  const posfrac1=s.match(/^(\d+)x\^(\d+)\/(\d+)$/);
  if(posfrac1)return{coeff:0,exp:parseInt(posfrac1[2]),coeffN:parseInt(posfrac1[1]),coeffD:parseInt(posfrac1[3])};
  const posfrac2=s.match(/^x\^(\d+)\/(\d+)$/);
  if(posfrac2)return{coeff:0,exp:parseInt(posfrac2[1]),coeffN:1,coeffD:parseInt(posfrac2[2])};
  const posfrac3=s.match(/^x\/(\d+)$/);
  if(posfrac3)return{coeff:0,exp:1,coeffN:1,coeffD:parseInt(posfrac3[1])};
  const posfrac4=s.match(/^(\d+)x\/(\d+)$/);
  if(posfrac4)return{coeff:0,exp:1,coeffN:parseInt(posfrac4[1]),coeffD:parseInt(posfrac4[2])};
  return null;
}

function algOk(input,coeff,exp,coeffN,coeffD){
  const p=parseAlg(input); if(!p)return false;
  if(p.exp!==exp)return false;
  // Compare coefficients as fractions
  const inN=p.coeffN!==undefined?p.coeffN:p.coeff;
  const inD=p.coeffD!==undefined?p.coeffD:1;
  const tgN=coeffN!==undefined?coeffN:coeff;
  const tgD=coeffD!==undefined?coeffD:1;
  const gi=gcd(Math.abs(inN),inD); const gt=gcd(Math.abs(tgN),tgD);
  return(inN/gi===tgN/gt)&&(inD/gi===tgD/gt);
}

function fmtAlg(coeff,exp,coeffN,coeffD){
  // coeffN/coeffD is optional fractional coefficient; coeff is integer fallback
  const cn=coeffN!==undefined?coeffN:coeff;
  const cd=coeffD!==undefined?coeffD:1;
  const g=gcd(Math.abs(cn),cd); const rn=cn/g; const rd=cd/g;
  const isFrac=rd!==1;
  if(exp===0)return isFrac?`${rn}/${rd}`:String(rn);
  if(exp<0){
    const absExp=Math.abs(exp);
    const xPart=absExp===1?"x":`x^${absExp}`;
    if(isFrac) return `${rn}/(${rd}${xPart})`;
    return rn===1?`1/${xPart}`:`${rn}/${xPart}`;
  }
  const xPart=exp===1?"x":`x^${exp}`;
  if(isFrac) return `${rn}${xPart}/${rd}`;
  const c=rn===1?"":String(rn);
  return`${c}${xPart}`;
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

// - Warm-up A: Multiply fractions (cross-cancellation required) -
export function genWarmupA(){
  // Pairs where cross-cancellation is needed: n1 shares factor with d2, n2 shares factor with d1
  const pool=[
    {n1:3,d1:5,n2:5,d2:6,rn:1,rd:2},{n1:2,d1:3,n2:3,d2:4,rn:1,rd:2},
    {n1:4,d1:5,n2:5,d2:8,rn:1,rd:2},{n1:3,d1:4,n2:8,d2:9,rn:2,rd:3},
    {n1:5,d1:6,n2:3,d2:10,rn:1,rd:4},{n1:7,d1:8,n2:4,d2:21,rn:1,rd:6},
    {n1:6,d1:7,n2:7,d2:9,rn:2,rd:3},{n1:4,d1:9,n2:3,d2:8,rn:1,rd:6},
    {n1:9,d1:10,n2:5,d2:18,rn:1,rd:4},{n1:5,d1:8,n2:4,d2:15,rn:1,rd:6},
  ];
  const p=randChoice(pool);
  const ans=p.rn===1&&p.rd===1?"1":p.rd===1?String(p.rn):`${p.rn}/${p.rd}`;
  return{type:"warmup-a",...p,answer:ans,displayAnswer:ans,prompt:"Multiply and simplify."};
}
export function gradeWarmupA(input,q){return fracOk(input,q.rn,q.rd);}

// - Warm-up B: Divide mixed numbers (answer is mixed number > 2, needs simplification) -
export function genWarmupB(){
  // Verified pool: all answers are mixed numbers > 2 with simplification needed
  const pool=[
    {w1:3,n1:3,d1:4,w2:1,n2:1,d2:4,rn:3,rd:1},   // 15/4 / 5/4 = 3 -- skip (integer)
    {w1:4,n1:1,d1:2,w2:1,n2:3,d2:4,rn:18,rd:7},   // 9/2 / 7/4 = 18/7 = 2 4/7
    {w1:5,n1:1,d1:3,w2:1,n2:3,d2:4,rn:64,rd:21},  // 16/3 / 7/4 = 64/21 = 3 1/21
    {w1:3,n1:1,d1:2,w2:1,n2:1,d2:4,rn:14,rd:5},   // 7/2 / 5/4 = 14/5 = 2 4/5
    {w1:4,n1:2,d1:3,w2:1,n2:1,d2:2,rn:28,rd:9},   // 14/3 / 3/2 = 28/9 = 3 1/9
    {w1:5,n1:1,d1:2,w2:2,n2:1,d2:6,rn:33,rd:13},  // not clean -- use simpler
    {w1:3,n1:3,d1:4,w2:1,n2:1,d2:3,rn:9,rd:4},    // 15/4 / 4/3 = 45/16 -- let me recalc
  ];
  // Use a clean verified pool
  const verified=[
    {w1:4,n1:1,d1:2,w2:1,n2:3,d2:4,rn:18,rd:7},   // 9/2 / 7/4 = 36/14 = 18/7 = 2 4/7
    {w1:3,n1:1,d1:2,w2:1,n2:1,d2:4,rn:14,rd:5},   // 7/2 / 5/4 = 28/10 = 14/5 = 2 4/5
    {w1:4,n1:2,d1:3,w2:1,n2:1,d2:2,rn:28,rd:9},   // 14/3 / 3/2 = 28/9 = 3 1/9
    {w1:5,n1:1,d1:3,w2:1,n2:3,d2:4,rn:64,rd:21},  // 16/3 / 7/4 = 64/21 = 3 1/21
    {w1:3,n1:3,d1:4,w2:1,n2:1,d2:3,rn:45,rd:16},  // 15/4 / 4/3 = 45/16 = 2 13/16
    {w1:4,n1:1,d1:4,w2:1,n2:2,d2:3,rn:51,rd:20},  // 17/4 / 5/3 = 51/20 = 2 11/20
    {w1:5,n1:1,d1:2,w2:1,n2:3,d2:4,rn:22,rd:7},   // 11/2 / 7/4 = 44/14 = 22/7 = 3 1/7
  ];
  const p=randChoice(verified);
  function fmtMixed(n,d){const[rn,rd]=reduce(n,d);if(rd===1)return String(rn);if(rn>rd){const w=Math.floor(rn/rd);const r=rn%rd;return`${w} ${r}/${rd}`;}return`${rn}/${rd}`;}
  const ans=fmtMixed(p.rn,p.rd);
  return{type:"warmup-b",...p,answer:ans,displayAnswer:ans,prompt:"Divide and simplify."};
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
  // positive result, integer coefficient
  {c1:1,e1:7,c2:1,e2:3,rc:1,re:4},{c1:6,e1:5,c2:2,e2:2,rc:3,re:3},
  {c1:10,e1:8,c2:5,e2:2,rc:2,re:6},{c1:12,e1:9,c2:4,e2:4,rc:3,re:5},
  {c1:9,e1:7,c2:3,e2:3,rc:3,re:4},{c1:15,e1:8,c2:5,e2:3,rc:3,re:5},
  // positive result, fractional coefficient (rcN/rcD)
  {c1:3,e1:5,c2:6,e2:2,rcN:1,rcD:2,re:3},{c1:2,e1:6,c2:8,e2:3,rcN:1,rcD:4,re:3},
  {c1:4,e1:7,c2:6,e2:2,rcN:2,rcD:3,re:5},{c1:3,e1:8,c2:9,e2:4,rcN:1,rcD:3,re:4},
  // negative result, integer coefficient (c1===c2)
  {c1:1,e1:2,c2:1,e2:5,rc:1,re:-3},{c1:1,e1:4,c2:1,e2:9,rc:1,re:-5},
  {c1:4,e1:3,c2:4,e2:7,rc:1,re:-4},{c1:3,e1:2,c2:3,e2:6,rc:1,re:-4},
  // negative result, fractional coefficient
  {c1:3,e1:2,c2:6,e2:7,rcN:1,rcD:2,re:-5},{c1:2,e1:3,c2:8,e2:9,rcN:1,rcD:4,re:-6},
  {c1:4,e1:1,c2:6,e2:5,rcN:2,rcD:3,re:-4},{c1:3,e1:2,c2:9,e2:8,rcN:1,rcD:3,re:-6},
];
export function genQuotSimple(){
  const probs=shuffle([...QUOT_SIMPLE]).slice(0,4).map(p=>{
    const n1=p.e1===1?"x":`x^{${p.e1}}`;
    const n2=p.e2===1?"x":`x^{${p.e2}}`;
    const c1d=p.c1===1?"":String(p.c1);
    const c2d=p.c2===1?"":String(p.c2);
    const rc=p.rcN!==undefined?p.rcN:(p.rc||1);
    const rd=p.rcD!==undefined?p.rcD:1;
    const ans=fmtAlg(rc,p.re,p.rcN,p.rcD);
    return{...p,display:`${c1d}${n1} \\div ${c2d}${n2}`,answer:ans,displayAnswer:ans};
  });
  return{type:"quot-simple",problems:probs,prompt:"Apply the quotient rule. Simplify."};
}
export function gradeQuotSimpleItem(input,item){
  const rc=item.rcN!==undefined?item.rcN:(item.rc||1);
  const rd=item.rcD!==undefined?item.rcD:1;
  return algOk(input,rc,item.re,item.rcN,item.rcD);
}
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
  {expr:"12x+18",gcf:6},{expr:"8x-12",gcf:4},{expr:"15x+25",gcf:5},
  {expr:"9x^2-6x",gcf:"3x"},{expr:"24x^2+16x",gcf:"8x"},{expr:"14x-21",gcf:7},
  {expr:"18x+27",gcf:9},{expr:"10x^2-15x",gcf:"5x"},{expr:"20x-30",gcf:10},
  {expr:"6x^2+9x",gcf:"3x"},{expr:"8x^2+12x",gcf:"4x"},{expr:"21x-14",gcf:7},
];
export function genGCFIdentify(){
  const probs=shuffle([...GCF_ID_POOL]).slice(0,5).map(p=>({
    ...p,answer:String(p.gcf),displayAnswer:String(p.gcf),
  }));
  return{type:"gcf-identify",problems:probs,prompt:"Enter the GCF of each expression."};
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
  {id:"quot-simple",  label:"A1: Quotient Rule (Basic)",      description:"4 simultaneous"},
  {id:"gcf-identify", label:"A2: Identify GCF",              description:"5 free response"},
  {id:"factor-sbs",   label:"A3: Factor GCF (Step by Step)",  description:"2-stage"},
  {id:"factor-direct",label:"A4: Factor GCF (Direct)",        description:"5 simultaneous"},
  {id:"lcd-mc",       label:"A5: Find LCD",                   description:"5 multiple choice"},
  {id:"clear-denom",  label:"A6: Clear Denominators (Steps)", description:"3-stage"},
  {id:"solve-direct", label:"A7: Solve (Direct)",             description:"4 simultaneous"},
];

export function generateLesson17Question(topicId){
  switch(topicId){
    case "warmup-a":     return genWarmupA();
    case "warmup-b":     return genWarmupB();
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
    case "quot-simple":  return gradeQuotSimple(input,question);
    case "gcf-identify": return gradeGCFIdentify(input,question);
    case "factor-sbs":   return gradeFactorSBSStage2(input,question);
    case "factor-direct":return gradeFactorDirect(input,question);
    case "lcd-mc":       return gradeLCDMC(input,question);
    case "clear-denom":  return gradeClearDenomStage3(input,question);
    case "solve-direct": return gradeSolveDirect(input,question);
    default:             return false;
  }
}

