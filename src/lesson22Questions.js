// Lesson 22 - Metric Units, Dimensional Analysis, Velocity Conversions

function randChoice(arr) { return arr[Math.floor(Math.random()*arr.length)]; }
function shuffle(arr) { const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }

function decOk(input,correct){
  const v=parseFloat(String(input||"").trim().replace(/,/g,""));
  return!isNaN(v)&&Math.abs(v-correct)<1e-6;
}
function fracOk(input,rn,rd){
  const s=String(input||"").trim();
  const fx=s.match(/^(\d+)\/(\d+)$/);if(!fx)return false;
  const n=parseInt(fx[1]),d=parseInt(fx[2]);
  function gcd(a,b){return b===0?a:gcd(b,a%b);}
  const g=gcd(Math.abs(n),Math.abs(d));
  return n/g===rn&&d/g===rd;
}

// - Warm-ups -
export function genWarmupA(){
  return{type:"warmup-a",overline:"0.\\overline{6}",rn:2,rd:3,displayAnswer:"2/3",prompt:"Convert to a fraction."};
}
export function gradeWarmupA(input){return fracOk(input,2,3);}

export function genWarmupB(){
  return{type:"warmup-b",from:42,fromU:"inches",toU:"feet",answer:3.5,displayAnswer:"3.5",prompt:"Convert."};
}
export function gradeWarmupB(input){return decOk(input,3.5);}

export function genWarmupC(){
  return{type:"warmup-c",from:8.2,fromU:"cm",toU:"mm",answer:82,displayAnswer:"82",prompt:"Convert."};
}
export function gradeWarmupC(input){return decOk(input,82);}

export function genWarmupD(){
  return{type:"warmup-d",from:3.25,fromU:"km",toU:"m",answer:3250,displayAnswer:"3250",prompt:"Convert."};
}
export function gradeWarmupD(input){return decOk(input,3250);}

// - A1: Identify metric prefix -
const PREFIX_POOL=[
  {stmt:"One thousandth of a gram is a ___",accept:["milligram","mg"],display:"milligram (mg)"},
  {stmt:"One hundredth of a liter is a ___",accept:["centiliter","cl","cL"],display:"centiliter (cL)"},
  {stmt:"One tenth of a gram is a ___",accept:["decigram","dg"],display:"decigram (dg)"},
  {stmt:"One thousand grams is a ___",accept:["kilogram","kg"],display:"kilogram (kg)"},
  {stmt:"One thousandth of a liter is a ___",accept:["milliliter","ml","mL"],display:"milliliter (mL)"},
  {stmt:"One thousand liters is a ___",accept:["kiloliter","kl","kL"],display:"kiloliter (kL)"},
  {stmt:"One hundredth of a gram is a ___",accept:["centigram","cg"],display:"centigram (cg)"},
  {stmt:"One tenth of a liter is a ___",accept:["deciliter","dl","dL"],display:"deciliter (dL)"},
  {stmt:"1000 mg equals one ___",accept:["gram","g"],display:"gram (g)"},
  {stmt:"1000 mL equals one ___",accept:["liter","l","L"],display:"liter (L)"},
];
export function genPrefixID(){
  const items=shuffle([...PREFIX_POOL]).slice(0,4);
  return{type:"prefix-id",items,prompt:"Identify the correct metric unit."};
}
export function gradePrefixIDItem(input,item){
  const s=String(input||"").trim().toLowerCase();
  return item.accept.some(a=>s===a.toLowerCase());
}
export function gradePrefixID(input,q){
  try{const ans=JSON.parse(input);return q.items.every((p,i)=>gradePrefixIDItem(ans[i],p));}catch{return false;}
}

// - A2: Convert metric mass -
const MASS_POOL=[
  {expr:"3.5 \\text{ kg} = \\ ? \\text{ g}",answer:3500,display:"3.5 kg = ? g"},
  {expr:"250 \\text{ mg} = \\ ? \\text{ g}",answer:0.25,display:"250 mg = ? g"},
  {expr:"1.2 \\text{ cg} = \\ ? \\text{ mg}",answer:12,display:"1.2 cg = ? mg"},
  {expr:"500 \\text{ g} = \\ ? \\text{ kg}",answer:0.5,display:"500 g = ? kg"},
  {expr:"4 \\text{ kg} = \\ ? \\text{ g}",answer:4000,display:"4 kg = ? g"},
  {expr:"750 \\text{ mg} = \\ ? \\text{ g}",answer:0.75,display:"750 mg = ? g"},
  {expr:"2.5 \\text{ g} = \\ ? \\text{ mg}",answer:2500,display:"2.5 g = ? mg"},
  {expr:"300 \\text{ cg} = \\ ? \\text{ g}",answer:3,display:"300 cg = ? g"},
  {expr:"0.8 \\text{ kg} = \\ ? \\text{ g}",answer:800,display:"0.8 kg = ? g"},
  {expr:"1500 \\text{ g} = \\ ? \\text{ kg}",answer:1.5,display:"1500 g = ? kg"},
];
export function genMassConv(){
  const probs=shuffle([...MASS_POOL]).slice(0,4).map(p=>({...p,displayAnswer:String(p.answer)}));
  return{type:"mass-conv",problems:probs,prompt:"Convert each mass measurement."};
}
export function gradeMassConvItem(input,item){return decOk(input,item.answer);}
export function gradeMassConv(input,q){
  try{const ans=JSON.parse(input);return q.problems.every((p,i)=>gradeMassConvItem(ans[i],p));}catch{return false;}
}

// - A3: Convert metric volume -
const VOL_POOL=[
  {expr:"2.5 \\text{ L} = \\ ? \\text{ mL}",answer:2500,display:"2.5 L = ? mL"},
  {expr:"750 \\text{ mL} = \\ ? \\text{ L}",answer:0.75,display:"750 mL = ? L"},
  {expr:"3.2 \\text{ cL} = \\ ? \\text{ mL}",answer:32,display:"3.2 cL = ? mL"},
  {expr:"1500 \\text{ mL} = \\ ? \\text{ L}",answer:1.5,display:"1500 mL = ? L"},
  {expr:"4 \\text{ L} = \\ ? \\text{ mL}",answer:4000,display:"4 L = ? mL"},
  {expr:"0.5 \\text{ L} = \\ ? \\text{ mL}",answer:500,display:"0.5 L = ? mL"},
  {expr:"2500 \\text{ mL} = \\ ? \\text{ L}",answer:2.5,display:"2500 mL = ? L"},
  {expr:"8 \\text{ dL} = \\ ? \\text{ mL}",answer:800,display:"8 dL = ? mL"},
  {expr:"3 \\text{ L} = \\ ? \\text{ cL}",answer:300,display:"3 L = ? cL"},
  {expr:"450 \\text{ mL} = \\ ? \\text{ L}",answer:0.45,display:"450 mL = ? L"},
];
export function genVolConv(){
  const probs=shuffle([...VOL_POOL]).slice(0,4).map(p=>({...p,displayAnswer:String(p.answer)}));
  return{type:"vol-conv",problems:probs,prompt:"Convert each volume measurement."};
}
export function gradeVolConvItem(input,item){return decOk(input,item.answer);}
export function gradeVolConv(input,q){
  try{const ans=JSON.parse(input);return q.problems.every((p,i)=>gradeVolConvItem(ans[i],p));}catch{return false;}
}

// - A4: cm-, mL, g equivalence -
const CM3_POOL=[
  {stage1:"250 \\text{ cm}^3 = \\ ? \\text{ mL}",a1:250,stage2:"250 \\text{ cm}^3 \\text{ of water} = \\ ? \\text{ g}",a2:250},
  {stage1:"500 \\text{ mL} = \\ ? \\text{ cm}^3",a1:500,stage2:"500 \\text{ mL of water} = \\ ? \\text{ g}",a2:500},
  {stage1:"1 \\text{ L} = \\ ? \\text{ cm}^3",a1:1000,stage2:"1 \\text{ L of water} = \\ ? \\text{ g}",a2:1000},
  {stage1:"400 \\text{ g water} = \\ ? \\text{ mL}",a1:400,stage2:"400 \\text{ g water} = \\ ? \\text{ cm}^3",a2:400},
  {stage1:"750 \\text{ cm}^3 = \\ ? \\text{ mL}",a1:750,stage2:"750 \\text{ cm}^3 \\text{ of water} = \\ ? \\text{ g}",a2:750},
];
export function genCm3Conv(){
  const p=randChoice(CM3_POOL);
  return{type:"cm3-conv",...p,displayAnswer:String(p.a2),prompt:"Use: 1 cm\\u00b3 = 1 mL = 1 g (water)"};
}
export function gradeCm3Stage1(input,q){return decOk(input,q.a1);}
export function gradeCm3Stage2(input,q){return decOk(input,q.a2);}

// - A5: Fish tank word problem (step by step) -
const TANK_POOL=[
  {l:30,w:20,h:15,vol:9000,liters:9,kg:9},
  {l:40,w:25,h:10,vol:10000,liters:10,kg:10},
  {l:50,w:20,h:20,vol:20000,liters:20,kg:20},
  {l:25,w:15,h:12,vol:4500,liters:4.5,kg:4.5},
  {l:60,w:30,h:25,vol:45000,liters:45,kg:45},
];
export function genTankProblem(){
  const p=randChoice(TANK_POOL);
  return{type:"tank-problem",...p,
    displayAnswer:String(p.kg),
    prompt:`A fish tank is ${p.l} cm long, ${p.w} cm wide, and ${p.h} cm tall. Find the volume, volume in liters, and mass of water in kg.`};
}
export function gradeTankStage1(input,q){return decOk(input,q.vol);}
export function gradeTankStage2(input,q){return decOk(input,q.liters);}
export function gradeTankStage3(input,q){return decOk(input,q.kg);}

// - A6: Write conversion factor (MC) -
const CF_POOL=[
  {stmt:"Convert inches to feet",correct:"1 ft / 12 in",wrong:"12 in / 1 ft",latex:"\\dfrac{1\\text{ ft}}{12\\text{ in}}",latex_wrong:"\\dfrac{12\\text{ in}}{1\\text{ ft}}"},
  {stmt:"Convert centimeters to meters",correct:"1 m / 100 cm",wrong:"100 cm / 1 m",latex:"\\dfrac{1\\text{ m}}{100\\text{ cm}}",latex_wrong:"\\dfrac{100\\text{ cm}}{1\\text{ m}}"},
  {stmt:"Convert grams to kilograms",correct:"1 kg / 1000 g",wrong:"1000 g / 1 kg",latex:"\\dfrac{1\\text{ kg}}{1000\\text{ g}}",latex_wrong:"\\dfrac{1000\\text{ g}}{1\\text{ kg}}"},
  {stmt:"Convert liters to milliliters",correct:"1000 mL / 1 L",wrong:"1 L / 1000 mL",latex:"\\dfrac{1000\\text{ mL}}{1\\text{ L}}",latex_wrong:"\\dfrac{1\\text{ L}}{1000\\text{ mL}}"},
  {stmt:"Convert minutes to seconds",correct:"60 s / 1 min",wrong:"1 min / 60 s",latex:"\\dfrac{60\\text{ s}}{1\\text{ min}}",latex_wrong:"\\dfrac{1\\text{ min}}{60\\text{ s}}"},
  {stmt:"Convert feet to inches",correct:"12 in / 1 ft",wrong:"1 ft / 12 in",latex:"\\dfrac{12\\text{ in}}{1\\text{ ft}}",latex_wrong:"\\dfrac{1\\text{ ft}}{12\\text{ in}}"},
  {stmt:"Convert meters to centimeters",correct:"100 cm / 1 m",wrong:"1 m / 100 cm",latex:"\\dfrac{100\\text{ cm}}{1\\text{ m}}",latex_wrong:"\\dfrac{1\\text{ m}}{100\\text{ cm}}"},
];
export function genConvFactor(){
  const items=shuffle([...CF_POOL]).slice(0,5).map(p=>{
    const opts=shuffle([p.latex,p.latex_wrong]);
    return{...p,options:opts,answer:p.latex};
  });
  return{type:"conv-factor",items,prompt:"Select the correct conversion factor."};
}
export function gradeConvFactorItem(input,item){
  const s=String(input||"").trim();
  return s===item.latex||s===item.correct;
}
export function gradeConvFactor(input,q){
  try{const ans=JSON.parse(input);return q.items.every((p,i)=>gradeConvFactorItem(ans[i],p));}catch{return false;}
}

// - A7: Dimensional analysis step by step -
const DA_SBS_POOL=[
  {value:36,fromU:"in",toU:"ft",factor:"\\dfrac{1\\text{ ft}}{12\\text{ in}}",answer:3,answerDisplay:"3 ft",startDisplay:"36\\text{ in}"},
  {value:2.5,fromU:"miles",toU:"ft",factor:"\\dfrac{5280\\text{ ft}}{1\\text{ mile}}",answer:13200,answerDisplay:"13200 ft",startDisplay:"2.5\\text{ miles}"},
  {value:1500,fromU:"mg",toU:"g",factor:"\\dfrac{1\\text{ g}}{1000\\text{ mg}}",answer:1.5,answerDisplay:"1.5 g",startDisplay:"1500\\text{ mg}"},
  {value:3.2,fromU:"L",toU:"mL",factor:"\\dfrac{1000\\text{ mL}}{1\\text{ L}}",answer:3200,answerDisplay:"3200 mL",startDisplay:"3.2\\text{ L}"},
  {value:4.5,fromU:"kg",toU:"g",factor:"\\dfrac{1000\\text{ g}}{1\\text{ kg}}",answer:4500,answerDisplay:"4500 g",startDisplay:"4.5\\text{ kg}"},
  {value:180,fromU:"cm",toU:"m",factor:"\\dfrac{1\\text{ m}}{100\\text{ cm}}",answer:1.8,answerDisplay:"1.8 m",startDisplay:"180\\text{ cm}"},
];
export function genDASBS(){
  const p=randChoice(DA_SBS_POOL);
  return{type:"da-sbs",...p,displayAnswer:p.answerDisplay,
    prompt:`Convert: ${p.value} ${p.fromU} to ${p.toU}`};
}
export function gradeDASBSS1(input,q){
  const s=String(input||"").trim().replace(/\s+/g,"").toLowerCase();
  return s.includes(String(q.value))&&(s.includes(q.fromU.toLowerCase())||s.includes(q.fromU.toLowerCase().replace(/s$/,"")));
}
export function gradeDASBSS2(input,q){
  const s=String(input||"").trim().replace(/\s+/g,"").toLowerCase();
  const cf=q.factor.replace(/[\\{}]/g,"").replace(/text/g,"").toLowerCase();
  return s===q.factor||s===q.factor.replace(/\s/g,"")||
    (s.includes("1")&&(s.includes(q.toU.toLowerCase())||s.includes(q.fromU.toLowerCase())));
}
export function gradeDASBSS3(input,q){return decOk(input,q.answer);}

// - A8: Dimensional analysis direct -
const DA_DIRECT=[
  {expr:"2.5 \\text{ miles} \\to \\text{ft}",answer:13200,display:"2.5 miles to ft"},
  {expr:"1500 \\text{ mg} \\to \\text{g}",answer:1.5,display:"1500 mg to g"},
  {expr:"3.2 \\text{ L} \\to \\text{mL}",answer:3200,display:"3.2 L to mL"},
  {expr:"4.5 \\text{ kg} \\to \\text{g}",answer:4500,display:"4.5 kg to g"},
  {expr:"180 \\text{ cm} \\to \\text{m}",answer:1.8,display:"180 cm to m"},
  {expr:"5280 \\text{ ft} \\to \\text{miles}",answer:1,display:"5280 ft to miles"},
  {expr:"2500 \\text{ mL} \\to \\text{L}",answer:2.5,display:"2500 mL to L"},
  {expr:"750 \\text{ g} \\to \\text{kg}",answer:0.75,display:"750 g to kg"},
];
export function genDADirect(){
  const probs=shuffle([...DA_DIRECT]).slice(0,4).map(p=>({...p,displayAnswer:String(p.answer)}));
  return{type:"da-direct",problems:probs,prompt:"Convert each. Enter numerical answer."};
}
export function gradeDADirectItem(input,item){return decOk(input,item.answer);}
export function gradeDADirect(input,q){
  try{const ans=JSON.parse(input);return q.problems.every((p,i)=>gradeDADirectItem(ans[i],p));}catch{return false;}
}

// - A9: m/s to km/h -
const MS_TO_KMH=[
  {val:10,answer:36},{val:25,answer:90},{val:5,answer:18},
  {val:15,answer:54},{val:20,answer:72},{val:30,answer:108},
  {val:8,answer:28.8},{val:12,answer:43.2},
];
export function genMsToKmh(){
  const probs=shuffle([...MS_TO_KMH]).slice(0,5).map(p=>({
    ...p,expr:`${p.val}\\text{ m/s} = \\ ?\\text{ km/h}`,displayAnswer:String(p.answer),
  }));
  return{type:"ms-to-kmh",problems:probs,prompt:"Convert m/s to km/h. (Multiply by 3.6)"};
}
export function gradeMsToKmhItem(input,item){return decOk(input,item.answer);}
export function gradeMsToKmh(input,q){
  try{const ans=JSON.parse(input);return q.problems.every((p,i)=>gradeMsToKmhItem(ans[i],p));}catch{return false;}
}

// - A10: km/h to m/s -
const KMH_TO_MS=[
  {val:90,answer:25},{val:36,answer:10},{val:72,answer:20},
  {val:54,answer:15},{val:108,answer:30},{val:18,answer:5},
  {val:126,answer:35},{val:144,answer:40},
];
export function genKmhToMs(){
  const probs=shuffle([...KMH_TO_MS]).slice(0,5).map(p=>({
    ...p,expr:`${p.val}\\text{ km/h} = \\ ?\\text{ m/s}`,displayAnswer:String(p.answer),
  }));
  return{type:"kmh-to-ms",problems:probs,prompt:"Convert km/h to m/s. (Divide by 3.6)"};
}
export function gradeKmhToMsItem(input,item){return decOk(input,item.answer);}
export function gradeKmhToMs(input,q){
  try{const ans=JSON.parse(input);return q.problems.every((p,i)=>gradeKmhToMsItem(ans[i],p));}catch{return false;}
}

// - A11: mph to ft/s -
const MPH_TO_FTS=[
  {val:60,answer:88},{val:30,answer:44},{val:45,answer:66},
  {val:15,answer:22},{val:90,answer:132},{val:75,answer:110},
  {val:55,answer:80.67},{val:25,answer:36.67},
];
export function genMphToFts(){
  const probs=shuffle([...MPH_TO_FTS]).slice(0,5).map(p=>({
    ...p,expr:`${p.val}\\text{ mph} = \\ ?\\text{ ft/s}`,displayAnswer:String(parseFloat(p.answer.toFixed(2))),
  }));
  return{type:"mph-to-fts",problems:probs,prompt:"Convert mph to ft/s. (Multiply by 22/15)"};
}
export function gradeMphToFtsItem(input,item){return decOk(input,item.answer);}
export function gradeMphToFts(input,q){
  try{const ans=JSON.parse(input);return q.problems.every((p,i)=>gradeMphToFtsItem(ans[i],p));}catch{return false;}
}

// - A12: Mixed velocity direct -
const VEL_MIXED=[
  {expr:"20\\text{ m/s} \\to \\text{km/h}",answer:72,display:"20 m/s to km/h"},
  {expr:"72\\text{ km/h} \\to \\text{m/s}",answer:20,display:"72 km/h to m/s"},
  {expr:"30\\text{ mph} \\to \\text{ft/s}",answer:44,display:"30 mph to ft/s"},
  {expr:"110\\text{ ft/s} \\to \\text{mph}",answer:75,display:"110 ft/s to mph"},
  {expr:"15\\text{ m/s} \\to \\text{km/h}",answer:54,display:"15 m/s to km/h"},
  {expr:"90\\text{ km/h} \\to \\text{m/s}",answer:25,display:"90 km/h to m/s"},
  {expr:"60\\text{ mph} \\to \\text{ft/s}",answer:88,display:"60 mph to ft/s"},
  {expr:"66\\text{ ft/s} \\to \\text{mph}",answer:45,display:"66 ft/s to mph"},
];
export function genVelMixed(){
  const probs=shuffle([...VEL_MIXED]).slice(0,4).map(p=>({...p,displayAnswer:String(p.answer)}));
  return{type:"vel-mixed",problems:probs,prompt:"Convert each velocity. Enter numerical answer."};
}
export function gradeVelMixedItem(input,item){return decOk(input,item.answer);}
export function gradeVelMixed(input,q){
  try{const ans=JSON.parse(input);return q.problems.every((p,i)=>gradeVelMixedItem(ans[i],p));}catch{return false;}
}

// - A13: Mixed review (2 simultaneous) -
const MIXED_REVIEW_POOL=[
  {expr:"2.5 \\text{ kg} \\to \\text{g}",answer:2500,display:"2.5 kg to g"},
  {expr:"750 \\text{ mL} \\to \\text{L}",answer:0.75,display:"750 mL to L"},
  {expr:"500 \\text{ cm}^3 \\text{ water} \\to \\text{g}",answer:500,display:"500 cm- water to g"},
  {expr:"3 \\text{ miles} \\to \\text{ft}",answer:15840,display:"3 miles to ft"},
  {expr:"15 \\text{ m/s} \\to \\text{km/h}",answer:54,display:"15 m/s to km/h"},
  {expr:"108 \\text{ km/h} \\to \\text{m/s}",answer:30,display:"108 km/h to m/s"},
  {expr:"45 \\text{ mph} \\to \\text{ft/s}",answer:66,display:"45 mph to ft/s"},
  {expr:"2000 \\text{ g} \\to \\text{kg}",answer:2,display:"2000 g to kg"},
  {expr:"3.5 \\text{ L} \\to \\text{mL}",answer:3500,display:"3.5 L to mL"},
  {expr:"400 \\text{ cm}^3 \\text{ water} \\to \\text{mL}",answer:400,display:"400 cm- water to mL"},
];
export function genMixedReview(){
  const probs=shuffle([...MIXED_REVIEW_POOL]).slice(0,2).map(p=>({...p,displayAnswer:String(p.answer)}));
  return{type:"mixed-review",problems:probs,prompt:"Mixed review."};
}
export function gradeMixedReviewItem(input,item){return decOk(input,item.answer);}
export function gradeMixedReview(input,q){
  try{const ans=JSON.parse(input);return q.problems.every((p,i)=>gradeMixedReviewItem(ans[i],p));}catch{return false;}
}

// - Topic registry -
export const LESSON22_TOPICS=[
  {id:"warmup-a",     label:"Warm-up: Repeating Dec to Frac",  description:"0.666..."},
  {id:"warmup-b",     label:"Warm-up: Inches to Feet",         description:"42 in = ? ft"},
  {id:"warmup-c",     label:"Warm-up: cm to mm",               description:"8.2 cm"},
  {id:"warmup-d",     label:"Warm-up: km to m",                description:"3.25 km"},
  {id:"prefix-id",    label:"A1: Identify Metric Prefix",      description:"4 simultaneous"},
  {id:"mass-conv",    label:"A2: Metric Mass Conversions",     description:"4 simultaneous"},
  {id:"vol-conv",     label:"A3: Metric Volume Conversions",   description:"4 simultaneous"},
  {id:"cm3-conv",     label:"A4: cm\u00b3, mL, g Connection", description:"2-stage"},
  {id:"tank-problem", label:"A5: Fish Tank Word Problem",      description:"3-stage"},
  {id:"conv-factor",  label:"A6: Write Conversion Factor",     description:"5 simultaneous MC"},
  {id:"da-sbs",       label:"A7: Dimensional Analysis (Steps)",description:"3-stage"},
  {id:"da-direct",    label:"A8: Dimensional Analysis (Direct)",description:"4 simultaneous"},
  {id:"ms-to-kmh",    label:"A9: m/s to km/h",                description:"5 simultaneous"},
  {id:"kmh-to-ms",    label:"A10: km/h to m/s",               description:"5 simultaneous"},
  {id:"mph-to-fts",   label:"A11: mph to ft/s",               description:"5 simultaneous"},
  {id:"vel-mixed",    label:"A12: Mixed Velocity",             description:"4 simultaneous"},
  {id:"mixed-review", label:"A13: Mixed Review",              description:"2 simultaneous"},
];

export function generateLesson22Question(topicId){
  switch(topicId){
    case "warmup-a":     return genWarmupA();
    case "warmup-b":     return genWarmupB();
    case "warmup-c":     return genWarmupC();
    case "warmup-d":     return genWarmupD();
    case "prefix-id":    return genPrefixID();
    case "mass-conv":    return genMassConv();
    case "vol-conv":     return genVolConv();
    case "cm3-conv":     return genCm3Conv();
    case "tank-problem": return genTankProblem();
    case "conv-factor":  return genConvFactor();
    case "da-sbs":       return genDASBS();
    case "da-direct":    return genDADirect();
    case "ms-to-kmh":    return genMsToKmh();
    case "kmh-to-ms":    return genKmhToMs();
    case "mph-to-fts":   return genMphToFts();
    case "vel-mixed":    return genVelMixed();
    case "mixed-review": return genMixedReview();
    default:             return genWarmupA();
  }
}

export function gradeLesson22Answer(input,question){
  if(!input||!question)return false;
  switch(question.type){
    case "warmup-a":     return gradeWarmupA(input);
    case "warmup-b":     return gradeWarmupB(input);
    case "warmup-c":     return gradeWarmupC(input);
    case "warmup-d":     return gradeWarmupD(input);
    case "prefix-id":    return gradePrefixID(input,question);
    case "mass-conv":    return gradeMassConv(input,question);
    case "vol-conv":     return gradeVolConv(input,question);
    case "cm3-conv":     return gradeCm3Stage2(input,question);
    case "tank-problem": return gradeTankStage3(input,question);
    case "conv-factor":  return gradeConvFactor(input,question);
    case "da-sbs":       return gradeDASBSS3(input,question);
    case "da-direct":    return gradeDADirect(input,question);
    case "ms-to-kmh":    return gradeMsToKmh(input,question);
    case "kmh-to-ms":    return gradeKmhToMs(input,question);
    case "mph-to-fts":   return gradeMphToFts(input,question);
    case "vel-mixed":    return gradeVelMixed(input,question);
    case "mixed-review": return gradeMixedReview(input,question);
    default:             return false;
  }
}

