// Lesson 23 - Percent: Notation, Conversions, Percent of a Number, Word Problems

function randChoice(arr) { return arr[Math.floor(Math.random()*arr.length)]; }
function shuffle(arr) { const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }
function gcd(a,b){ a=Math.abs(a);b=Math.abs(b); return b===0?a:gcd(b,a%b); }
function reduce(n,d){ if(n===0)return[0,1]; const g=gcd(Math.abs(n),Math.abs(d)); return[n/g,d/g]; }

function decOk(input,correct){
  const v=parseFloat(String(input||"").trim().replace(/,/g,"").replace(/\$/g,""));
  return!isNaN(v)&&Math.abs(v-correct)<1e-6;
}
function fracOk(input,rn,rd){
  const s=String(input||"").trim();
  const fx=s.match(/^(\d+)\/(\d+)$/);if(!fx)return false;
  const n=parseInt(fx[1]),d=parseInt(fx[2]);
  const[in_,id_]=reduce(n,d);const[cn,cd]=reduce(rn,rd);
  return in_===cn&&id_===cd;
}
function pctOk(input,correct){
  const s=String(input||"").trim().toLowerCase().replace(/percent/,"").replace(/%/,"").trim();
  const v=parseFloat(s);
  return!isNaN(v)&&Math.abs(v-correct)<1e-6;
}

// -- Warm-ups --
export function genWarmupA(){
  return{type:"warmup-a",expr:"2.5 L = ? mL",answer:2500,displayAnswer:"2500",prompt:"Convert."};
}
export function gradeWarmupA(input){return decOk(input,2500);}

export function genWarmupB(){
  return{type:"warmup-b",expr:"2 miles = ? ft",answer:10560,displayAnswer:"10560",prompt:"Convert using dimensional analysis."};
}
export function gradeWarmupB(input){return decOk(input,10560);}

export function genWarmupC(){
  return{type:"warmup-c",expr:"20 m/s = ? km/h",answer:72,displayAnswer:"72",prompt:"Convert."};
}
export function gradeWarmupC(input){return decOk(input,72);}

export function genWarmupD(){
  return{type:"warmup-d",expr:"150 cm3 water = ? g",answer:150,displayAnswer:"150",prompt:"Convert (water: 1 cm3 = 1 g)."};
}
export function gradeWarmupD(input){return decOk(input,150);}

// -- A1: Write percent from description --
const PCT_DESC_POOL=[
  {desc:"45 out of 100",answer:45},
  {desc:"7 per hundred",answer:7},
  {desc:"one hundred twenty per hundred",answer:120},
  {desc:"8 out of 100",answer:8},
  {desc:"thirty per hundred",answer:30},
  {desc:"one hundred fifty out of 100",answer:150},
  {desc:"2 per hundred",answer:2},
  {desc:"ninety out of 100",answer:90},
  {desc:"sixty-five per hundred",answer:65},
  {desc:"one hundred out of 100",answer:100},
];
export function genPctDesc(){
  const probs=shuffle([...PCT_DESC_POOL]).slice(0,5).map(p=>({...p,displayAnswer:p.answer+"%"}));
  return{type:"pct-desc",problems:probs,prompt:"Write each as a percent."};
}
export function gradePctDescItem(input,item){return pctOk(input,item.answer);}
export function gradePctDesc(input,q){
  try{const ans=JSON.parse(input);return q.problems.every((p,i)=>gradePctDescItem(ans[i],p));}catch{return false;}
}

// -- A2: Percent to fraction --
const PCT_TO_FRAC_POOL=[
  {pct:50,rn:1,rd:2},{pct:25,rn:1,rd:4},{pct:75,rn:3,rd:4},{pct:20,rn:1,rd:5},
  {pct:40,rn:2,rd:5},{pct:60,rn:3,rd:5},{pct:80,rn:4,rd:5},{pct:10,rn:1,rd:10},
  {pct:90,rn:9,rd:10},{pct:15,rn:3,rd:20},
];
export function genPctToFrac(){
  const probs=shuffle([...PCT_TO_FRAC_POOL]).slice(0,4).map(p=>({...p,displayAnswer:`${p.rn}/${p.rd}`}));
  return{type:"pct-to-frac",problems:probs,prompt:"Convert each percent to a simplified fraction."};
}
export function gradePctToFracItem(input,item){return fracOk(input,item.rn,item.rd);}
export function gradePctToFrac(input,q){
  try{const ans=JSON.parse(input);return q.problems.every((p,i)=>gradePctToFracItem(ans[i],p));}catch{return false;}
}

// -- A3: Fraction to percent --
const FRAC_TO_PCT_POOL=[
  {rn:1,rd:2,pct:50},{rn:3,rd:5,pct:60},{rn:3,rd:4,pct:75},{rn:2,rd:5,pct:40},
  {rn:7,rd:10,pct:70},{rn:1,rd:20,pct:5},{rn:1,rd:4,pct:25},{rn:4,rd:5,pct:80},
  {rn:9,rd:10,pct:90},{rn:1,rd:5,pct:20},
];
export function genFracToPct(){
  const probs=shuffle([...FRAC_TO_PCT_POOL]).slice(0,4).map(p=>({...p,displayAnswer:p.pct+"%"}));
  return{type:"frac-to-pct",problems:probs,prompt:"Convert each fraction to a percent."};
}
export function gradeFracToPctItem(input,item){return pctOk(input,item.pct);}
export function gradeFracToPct(input,q){
  try{const ans=JSON.parse(input);return q.problems.every((p,i)=>gradeFracToPctItem(ans[i],p));}catch{return false;}
}

// -- A4: Percent to decimal --
const PCT_TO_DEC_POOL=[
  {pct:45,dec:0.45},{pct:8,dec:0.08},{pct:150,dec:1.5},{pct:0.5,dec:0.005},
  {pct:25,dec:0.25},{pct:120,dec:1.2},{pct:3,dec:0.03},{pct:60,dec:0.6},
  {pct:200,dec:2},{pct:0.25,dec:0.0025},
];
export function genPctToDec(){
  const probs=shuffle([...PCT_TO_DEC_POOL]).slice(0,4).map(p=>({...p,displayAnswer:String(p.dec)}));
  return{type:"pct-to-dec",problems:probs,prompt:"Convert each percent to a decimal."};
}
export function gradePctToDecItem(input,item){return decOk(input,item.dec);}
export function gradePctToDec(input,q){
  try{const ans=JSON.parse(input);return q.problems.every((p,i)=>gradePctToDecItem(ans[i],p));}catch{return false;}
}

// -- A5: Decimal to percent --
const DEC_TO_PCT_POOL=[
  {dec:0.75,pct:75},{dec:0.03,pct:3},{dec:1.2,pct:120},{dec:0.005,pct:0.5},
  {dec:0.45,pct:45},{dec:0.6,pct:60},{dec:1.5,pct:150},{dec:0.08,pct:8},
  {dec:2,pct:200},{dec:0.0025,pct:0.25},
];
export function genDecToPct(){
  const probs=shuffle([...DEC_TO_PCT_POOL]).slice(0,4).map(p=>({...p,displayAnswer:p.pct+"%"}));
  return{type:"dec-to-pct",problems:probs,prompt:"Convert each decimal to a percent."};
}
export function gradeDecToPctItem(input,item){return pctOk(input,item.pct);}
export function gradeDecToPct(input,q){
  try{const ans=JSON.parse(input);return q.problems.every((p,i)=>gradeDecToPctItem(ans[i],p));}catch{return false;}
}

// -- A6: Given percent, find fraction and decimal (2-stage) --
const GIVEN_PCT_POOL=[
  {pct:60,rn:3,rd:5,dec:0.6},{pct:25,rn:1,rd:4,dec:0.25},
  {pct:75,rn:3,rd:4,dec:0.75},{pct:40,rn:2,rd:5,dec:0.4},
  {pct:20,rn:1,rd:5,dec:0.2},{pct:80,rn:4,rd:5,dec:0.8},
  {pct:50,rn:1,rd:2,dec:0.5},{pct:15,rn:3,rd:20,dec:0.15},
];
export function genGivenPct(){
  const p=randChoice(GIVEN_PCT_POOL);
  return{type:"given-pct",...p,displayAnswer:`${p.rn}/${p.rd} and ${p.dec}`,prompt:`${p.pct}% = ?`};
}
export function gradeGivenPctS1(input,q){return fracOk(input,q.rn,q.rd);}
export function gradeGivenPctS2(input,q){return decOk(input,q.dec);}

// -- A7: Given fraction, find percent and decimal (2-stage) --
const GIVEN_FRAC_POOL=[
  {rn:3,rd:8,pct:37.5,dec:0.375},{rn:1,rd:8,pct:12.5,dec:0.125},
  {rn:5,rd:8,pct:62.5,dec:0.625},{rn:7,rd:8,pct:87.5,dec:0.875},
  {rn:1,rd:4,pct:25,dec:0.25},{rn:3,rd:4,pct:75,dec:0.75},
  {rn:1,rd:5,pct:20,dec:0.2},{rn:2,rd:5,pct:40,dec:0.4},
];
export function genGivenFrac(){
  const p=randChoice(GIVEN_FRAC_POOL);
  return{type:"given-frac",...p,displayAnswer:`${p.pct}% and ${p.dec}`,prompt:`\\dfrac{${p.rn}}{${p.rd}} = ?`};
}
export function gradeGivenFracS1(input,q){return pctOk(input,q.pct);}
export function gradeGivenFracS2(input,q){return decOk(input,q.dec);}

// -- A8: Given decimal, find percent and fraction (2-stage) --
const GIVEN_DEC_POOL=[
  {dec:0.125,pct:12.5,rn:1,rd:8},{dec:0.375,pct:37.5,rn:3,rd:8},
  {dec:0.625,pct:62.5,rn:5,rd:8},{dec:0.25,pct:25,rn:1,rd:4},
  {dec:0.75,pct:75,rn:3,rd:4},{dec:0.2,pct:20,rn:1,rd:5},
  {dec:0.4,pct:40,rn:2,rd:5},{dec:0.6,pct:60,rn:3,rd:5},
];
export function genGivenDec(){
  const p=randChoice(GIVEN_DEC_POOL);
  return{type:"given-dec",...p,displayAnswer:`${p.pct}% and ${p.rn}/${p.rd}`,prompt:`${p.dec} = ?`};
}
export function gradeGivenDecS1(input,q){return pctOk(input,q.pct);}
export function gradeGivenDecS2(input,q){return fracOk(input,q.rn,q.rd);}

// -- A9: Percent of a number direct --
const PCT_OF_POOL=[
  {pct:20,num:50,answer:10},{pct:35,num:200,answer:70},
  {pct:150,num:40,answer:60},{pct:0.5,num:600,answer:3},
  {pct:25,num:80,answer:20},{pct:10,num:90,answer:9},
  {pct:75,num:120,answer:90},{pct:60,num:50,answer:30},
];
export function genPctOf(){
  const probs=shuffle([...PCT_OF_POOL]).slice(0,4).map(p=>({...p,displayAnswer:String(p.answer)}));
  return{type:"pct-of",problems:probs,prompt:"Find the value."};
}
export function gradePctOfItem(input,item){return decOk(input,item.answer);}
export function gradePctOf(input,q){
  try{const ans=JSON.parse(input);return q.problems.every((p,i)=>gradePctOfItem(ans[i],p));}catch{return false;}
}

// -- A10: Find the whole step by step --
const FIND_WHOLE_SBS_POOL=[
  {part:15,pct:25,whole:60},{part:12,pct:30,whole:40},
  {part:45,pct:75,whole:60},{part:8,pct:20,whole:40},
  {part:36,pct:120,whole:30},{part:9,pct:15,whole:60},
  {part:21,pct:35,whole:60},{part:18,pct:45,whole:40},
];
export function genFindWholeSBS(){
  const p=randChoice(FIND_WHOLE_SBS_POOL);
  return{type:"find-whole-sbs",...p,displayAnswer:String(p.whole),
    prompt:`${p.part} is ${p.pct}% of what number?`};
}
export function gradeFindWholeS1(input,q){
  const s=String(input||"").trim().replace(/\s+/g,"");
  const decForm=q.pct/100;
  return s.includes(String(q.part))&&(s.includes(String(decForm))||s.includes(String(q.pct)));
}
export function gradeFindWholeS2(input,q){return decOk(input,q.whole);}

// -- A11: Find the whole direct --
const FIND_WHOLE_DIRECT_POOL=[
  {part:12,pct:30,answer:40},{part:45,pct:75,answer:60},
  {part:8,pct:20,answer:40},{part:36,pct:120,answer:30},
  {part:9,pct:15,answer:60},{part:21,pct:35,answer:60},
  {part:18,pct:45,answer:40},{part:14,pct:70,answer:20},
];
export function genFindWholeDirect(){
  const probs=shuffle([...FIND_WHOLE_DIRECT_POOL]).slice(0,4).map(p=>({
    ...p,displayAnswer:String(p.answer),
  }));
  return{type:"find-whole-direct",problems:probs,prompt:"Find the unknown number."};
}
export function gradeFindWholeDirectItem(input,item){return decOk(input,item.answer);}
export function gradeFindWholeDirect(input,q){
  try{const ans=JSON.parse(input);return q.problems.every((p,i)=>gradeFindWholeDirectItem(ans[i],p));}catch{return false;}
}

// -- A12: Percent word problem (single, teacher-paced) --
const WORD_PROB_POOL=[
  {problem:"A shirt costs $40 and is on sale for 25% off. What is the sale price?",answer:30},
  {problem:"A meal costs $50. A 20% tip is added. What is the tip amount?",answer:10},
  {problem:"A TV originally $300 is discounted 15%. What is the new price?",answer:255},
  {problem:"Sales tax is 8%. What is the tax on a $25 purchase?",answer:2},
  {problem:"A population of 200 increases by 10%. What is the new population?",answer:220},
  {problem:"A $60 jacket is marked down 30%. What is the sale price?",answer:42},
  {problem:"A $80 item has a 5% sales tax added. What is the total cost?",answer:84},
  {problem:"A class of 30 students has 40% boys. How many boys are there?",answer:12},
];
export function genWordProb(){
  const p=randChoice(WORD_PROB_POOL);
  return{type:"word-prob",problem:p.problem,answer:p.answer,displayAnswer:String(p.answer),prompt:p.problem};
}
export function gradeWordProb(input,q){return decOk(input,q.answer);}

// -- A13: Mixed percent review (6 simultaneous) --
const MIXED_REVIEW_POOL=[
  {kind:"pct-to-frac",expr:"60\\% \\to \\text{fraction}",answer:"3/5",check:(s)=>fracOk(s,3,5)},
  {kind:"frac-to-dec",expr:"\\dfrac{3}{4} \\to \\text{decimal}",answer:"0.75",check:(s)=>decOk(s,0.75)},
  {kind:"pct-of",expr:"30\\% \\text{ of } 50",answer:"15",check:(s)=>decOk(s,15)},
  {kind:"find-whole",expr:"10 \\text{ is } 20\\% \\text{ of what?}",answer:"50",check:(s)=>decOk(s,50)},
  {kind:"word",expr:"\\$50 \\text{ item, } 20\\% \\text{ off} \\to \\text{sale price}",answer:"40",check:(s)=>decOk(s,40)},
  {kind:"dec-to-pct",expr:"0.45 \\to \\text{percent}",answer:"45%",check:(s)=>pctOk(s,45)},
];
export function genMixedReview(){
  const items=MIXED_REVIEW_POOL.map(p=>({...p,displayAnswer:p.answer}));
  return{type:"mixed-review",items,prompt:"Mixed percent review."};
}
export function gradeMixedReviewItem(input,item){
  try{return item.check(String(input||""));}catch{return false;}
}
export function gradeMixedReview(input,q){
  try{const ans=JSON.parse(input);return q.items.every((item,i)=>gradeMixedReviewItem(ans[i],item));}catch{return false;}
}

// - Topic registry -
export const LESSON23_TOPICS=[
  {id:"warmup-a",          label:"Warm-up: Metric Volume",        description:"2.5 L = ? mL"},
  {id:"warmup-b",          label:"Warm-up: Dimensional Analysis",  description:"2 miles to ft"},
  {id:"warmup-c",          label:"Warm-up: Velocity",              description:"20 m/s to km/h"},
  {id:"warmup-d",          label:"Warm-up: cm3 to g",               description:"150 cm3 water"},
  {id:"pct-desc",          label:"A1: Write Percent from Description", description:"5 simultaneous"},
  {id:"pct-to-frac",       label:"A2: Percent to Fraction",        description:"4 simultaneous"},
  {id:"frac-to-pct",       label:"A3: Fraction to Percent",        description:"4 simultaneous"},
  {id:"pct-to-dec",        label:"A4: Percent to Decimal",         description:"4 simultaneous"},
  {id:"dec-to-pct",        label:"A5: Decimal to Percent",         description:"4 simultaneous"},
  {id:"given-pct",         label:"A6: Given Percent, Find Both",   description:"2-stage"},
  {id:"given-frac",        label:"A7: Given Fraction, Find Both",  description:"2-stage"},
  {id:"given-dec",         label:"A8: Given Decimal, Find Both",   description:"2-stage"},
  {id:"pct-of",            label:"A9: Percent of a Number",        description:"4 simultaneous"},
  {id:"find-whole-sbs",    label:"A10: Find the Whole (Steps)",    description:"2-stage"},
  {id:"find-whole-direct", label:"A11: Find the Whole (Direct)",   description:"4 simultaneous"},
  {id:"word-prob",         label:"A12: Percent Word Problem",      description:"Single, teacher-paced"},
  {id:"mixed-review",      label:"A13: Mixed Percent Review",      description:"6 simultaneous"},
];

export function generateLesson23Question(topicId){
  switch(topicId){
    case "warmup-a":          return genWarmupA();
    case "warmup-b":          return genWarmupB();
    case "warmup-c":          return genWarmupC();
    case "warmup-d":          return genWarmupD();
    case "pct-desc":          return genPctDesc();
    case "pct-to-frac":       return genPctToFrac();
    case "frac-to-pct":       return genFracToPct();
    case "pct-to-dec":        return genPctToDec();
    case "dec-to-pct":        return genDecToPct();
    case "given-pct":         return genGivenPct();
    case "given-frac":        return genGivenFrac();
    case "given-dec":         return genGivenDec();
    case "pct-of":            return genPctOf();
    case "find-whole-sbs":    return genFindWholeSBS();
    case "find-whole-direct": return genFindWholeDirect();
    case "word-prob":         return genWordProb();
    case "mixed-review":      return genMixedReview();
    default:                  return genWarmupA();
  }
}

export function gradeLesson23Answer(input,question){
  if(!input||!question)return false;
  switch(question.type){
    case "warmup-a":          return gradeWarmupA(input);
    case "warmup-b":          return gradeWarmupB(input);
    case "warmup-c":          return gradeWarmupC(input);
    case "warmup-d":          return gradeWarmupD(input);
    case "pct-desc":          return gradePctDesc(input,question);
    case "pct-to-frac":       return gradePctToFrac(input,question);
    case "frac-to-pct":       return gradeFracToPct(input,question);
    case "pct-to-dec":        return gradePctToDec(input,question);
    case "dec-to-pct":        return gradeDecToPct(input,question);
    case "given-pct":         return gradeGivenPctS2(input,question);
    case "given-frac":        return gradeGivenFracS2(input,question);
    case "given-dec":         return gradeGivenDecS2(input,question);
    case "pct-of":            return gradePctOf(input,question);
    case "find-whole-sbs":    return gradeFindWholeS2(input,question);
    case "find-whole-direct": return gradeFindWholeDirect(input,question);
    case "word-prob":         return gradeWordProb(input,question);
    case "mixed-review":      return gradeMixedReview(input,question);
    default:                  return false;
  }
}

