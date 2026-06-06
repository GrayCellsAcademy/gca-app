// Lesson 18 - Decimals: Place Value, Conversion, Operations, Metric Length

function randInt(min, max) { return Math.floor(Math.random()*(max-min+1))+min; }
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

function fracOk(input,rn,rd){
  const s=String(input||"").trim();
  const neg=s.startsWith("-"); const abs=neg?s.slice(1).trim():s;
  const mx=abs.replace(/\s*-\s*/g," ").match(/^(\d+)\s+(\d+)\/(\d+)$/);
  let num,den;
  if(mx){num=parseInt(mx[1])*parseInt(mx[3])+parseInt(mx[2]);den=parseInt(mx[3]);}
  else{const fx=abs.match(/^(\d+)\/(\d+)$/);if(fx){num=parseInt(fx[1]);den=parseInt(fx[2]);}
  else{const ix=abs.match(/^(\d+)$/);if(ix){num=parseInt(ix[1]);den=1;}else return false;}}
  if(neg)num=-num;
  const[in_,id_]=reduce(num,den);const[cn,cd]=reduce(rn,rd);
  return in_===cn&&id_===cd;
}

function decOk(input,correct){
  const v=parseFloat(String(input).trim());
  return!isNaN(v)&&Math.abs(v-correct)<1e-9;
}

// - Warm-ups -
export function genWarmupA(){return{type:"warmup-a",n1:3,d1:5,n2:5,d2:6,rn:1,rd:2,answer:"1/2",displayAnswer:"1/2",prompt:"Multiply and simplify."};}
export function gradeWarmupA(input,q){return fracOk(input,q.rn,q.rd);}

export function genWarmupB(){return{type:"warmup-b",w1:2,n1:1,d1:4,w2:1,n2:1,d2:2,rn:3,rd:2,answer:"1 1/2",displayAnswer:"1 1/2",prompt:"Divide and simplify."};}
export function gradeWarmupB(input,q){return fracOk(input,q.rn,q.rd);}

export function genWarmupC(){return{type:"warmup-c",expr:"12x - 18",gcfC:6,gcfE:0,aA:2,aB:-3,answer:"6(2x-3)",displayAnswer:"6(2x-3)",prompt:"Factor the GCF."};}
export function gradeWarmupC(input,q){
  const s=String(input||"").trim().replace(/\s+/g,"").replace(/\u2013/g,"-");
  const m=s.match(/^(\d+)\((-?\d+)x([+-]\d+)\)$/);
  return!!(m&&parseInt(m[1])===q.gcfC&&parseInt(m[2])===q.aA&&parseInt(m[3])===q.aB);
}

export function genWarmupD(){return{type:"warmup-d",c1:15,e1:6,c2:3,e2:2,rc:5,re:4,answer:"5x^4",displayAnswer:"5x^4",prompt:"Apply the quotient rule."};}
export function gradeWarmupD(input,q){
  const s=String(input||"").trim().replace(/\s+/g,"").replace(/\*/g,"");
  const m=s.match(/^(\d+)x\^(\d+)$/);
  return!!(m&&parseInt(m[1])===q.rc&&parseInt(m[2])===q.re);
}

// - A1: Place value identification -
const PLACE_NAMES=["tenths","hundredths","thousandths","ten-thousandths","hundred-thousandths"];
function genPlaceValueItem(){
  const decPlaces=randInt(1,4);
  const intPart=randInt(0,99);
  let decStr="";
  for(let i=0;i<decPlaces;i++)decStr+=randInt(0,9);
  // Pick which digit to underline (only decimal positions)
  const pos=randInt(0,decPlaces-1); // 0=tenths, 1=hundredths...
  const num=parseFloat(`${intPart}.${decStr}`);
  const digit=parseInt(decStr[pos]);
  const options=shuffle([...PLACE_NAMES].slice(0,Math.max(4,pos+2))).slice(0,4);
  if(!options.includes(PLACE_NAMES[pos]))options[0]=PLACE_NAMES[pos];
  return{number:`${intPart}.${decStr}`,digit,pos,answer:PLACE_NAMES[pos],options:shuffle(options),underlineIdx:intPart.toString().length+1+pos};
}
export function genPlaceValue(){
  const items=Array.from({length:6},()=>genPlaceValueItem());
  return{type:"place-value",items,prompt:"Select the place value of the underlined digit."};
}
export function gradePlaceValueItem(input,item){return String(input).trim().toLowerCase()===item.answer;}
export function gradePlaceValue(input,q){
  try{const ans=JSON.parse(input);return q.items.every((item,i)=>gradePlaceValueItem(ans[i],item));}catch{return false;}
}

// - A2: Write decimal from description -
const DECIMAL_DESCRIPTIONS=[
  {desc:"five and three tenths",value:5.3,answer:"5.3"},
  {desc:"twelve and forty-seven hundredths",value:12.47,answer:"12.47"},
  {desc:"six hundred twenty-three thousandths",value:0.623,answer:"0.623"},
  {desc:"eight and five hundredths",value:8.05,answer:"8.05"},
  {desc:"one and two hundred fifty thousandths",value:1.25,answer:"1.25"},
  {desc:"three and seven tenths",value:3.7,answer:"3.7"},
  {desc:"twenty and four hundredths",value:20.04,answer:"20.04"},
  {desc:"nine thousandths",value:0.009,answer:"0.009"},
  {desc:"six and fifteen hundredths",value:6.15,answer:"6.15"},
  {desc:"forty-two and eight tenths",value:42.8,answer:"42.8"},
  {desc:"forty-five thousandths",value:0.045,answer:"0.045"},
  {desc:"seven hundredths",value:0.07,answer:"0.07"},
];
export function genDecimalDesc(){
  const items=shuffle([...DECIMAL_DESCRIPTIONS]).slice(0,5);
  return{type:"decimal-desc",items,prompt:"Write the decimal for each description."};
}
export function gradeDecimalDescItem(input,item){return decOk(input,item.value);}
export function gradeDecimalDesc(input,q){
  try{const ans=JSON.parse(input);return q.items.every((item,i)=>gradeDecimalDescItem(ans[i],item));}catch{return false;}
}

// - A3: Convert decimal to fraction (MC) -
const DEC_TO_FRAC_POOL=[
  {dec:0.75,rn:3,rd:4,options:["3/4","75/100","15/20","1/2"]},
  {dec:0.5,rn:1,rd:2,options:["1/2","5/10","50/100","2/4"]},
  {dec:0.25,rn:1,rd:4,options:["1/4","25/100","5/20","1/5"]},
  {dec:0.8,rn:4,rd:5,options:["4/5","8/10","80/100","3/4"]},
  {dec:0.6,rn:3,rd:5,options:["3/5","6/10","60/100","2/3"]},
  {dec:0.125,rn:1,rd:8,options:["1/8","125/1000","25/200","1/4"]},
  {dec:0.4,rn:2,rd:5,options:["2/5","4/10","40/100","1/3"]},
  {dec:0.375,rn:3,rd:8,options:["3/8","375/1000","37/100","1/3"]},
];
export function genDecToFracMC(){
  const items=shuffle([...DEC_TO_FRAC_POOL]).slice(0,5).map(p=>({
    ...p,answer:fmtFrac(p.rn,p.rd),shuffledOptions:shuffle([...p.options]),
  }));
  return{type:"dec-frac-mc",items,prompt:"Select the simplified fraction for each decimal."};
}
export function gradeDecToFracMCItem(input,item){return fracOk(input,item.rn,item.rd);}
export function gradeDecToFracMC(input,q){
  try{const ans=JSON.parse(input);return q.items.every((item,i)=>gradeDecToFracMCItem(ans[i],item));}catch{return false;}
}

// - A4: Convert decimal to fraction (free response) -
const DEC_FREE_POOL=[
  // Fractions that are already in lowest terms (not reducible)
  {dec:0.7,rn:7,rd:10,answer:"7/10"},{dec:0.3,rn:3,rd:10,answer:"3/10"},
  {dec:0.9,rn:9,rd:10,answer:"9/10"},{dec:0.11,rn:11,rd:100,answer:"11/100"},
  {dec:0.13,rn:13,rd:100,answer:"13/100"},{dec:0.17,rn:17,rd:100,answer:"17/100"},
  {dec:0.21,rn:21,rd:100,answer:"21/100"},{dec:0.37,rn:37,rd:100,answer:"37/100"},
  {dec:0.43,rn:43,rd:100,answer:"43/100"},{dec:0.09,rn:9,rd:100,answer:"9/100"},
  {dec:0.007,rn:7,rd:1000,answer:"7/1000"},{dec:0.023,rn:23,rd:1000,answer:"23/1000"},
];
export function genDecToFracFree(){
  const items=shuffle([...DEC_FREE_POOL]).slice(0,5);
  return{type:"dec-frac-free",items,prompt:"Write each decimal as a fraction."};
}
export function gradeDecToFracFreeItem(input,item){return fracOk(input,item.rn,item.rd);}
export function gradeDecToFracFree(input,q){
  try{const ans=JSON.parse(input);return q.items.every((item,i)=>gradeDecToFracFreeItem(ans[i],item));}catch{return false;}
}

// - A5: Equivalent decimals (trailing zeros) -
const EQUIV_DEC_POOL=[
  {dec:"0.3",value:0.3,answer1:"0.30",answer2:"0.300"},
  {dec:"0.5",value:0.5,answer1:"0.50",answer2:"0.500"},
  {dec:"1.4",value:1.4,answer1:"1.40",answer2:"1.400"},
  {dec:"2.7",value:2.7,answer1:"2.70",answer2:"2.700"},
  {dec:"0.8",value:0.8,answer1:"0.80",answer2:"0.800"},
  {dec:"3.1",value:3.1,answer1:"3.10",answer2:"3.100"},
];
export function genEquivDec(){
  const items=shuffle([...EQUIV_DEC_POOL]).slice(0,3);
  return{type:"equiv-dec",items,prompt:"Enter two equivalent decimals using trailing zeros."};
}
export function gradeEquivDecItem(inputs,item){
  if(!Array.isArray(inputs)||inputs.length<2)return false;
  const vals=inputs.map(s=>parseFloat(String(s).trim()));
  if(vals.some(isNaN))return false;
  if(!vals.every(v=>Math.abs(v-item.value)<1e-9))return false;
  // Must have at least one extra trailing zero
  const strs=inputs.map(s=>String(s).trim());
  return strs.some(s=>s.includes(".")&&s.endsWith("0"));
}
export function gradeEquivDec(input,q){
  try{const ans=JSON.parse(input);return q.items.every((item,i)=>gradeEquivDecItem(ans[i],item));}catch{return false;}
}

// - A6: Align decimals (trailing zeros for addition) -
const ALIGN_DEC_POOL=[
  {a:"2.5",b:"3.75",aligned_a:"2.50",aligned_b:"3.75",places:2},
  {a:"1.3",b:"4.125",aligned_a:"1.300",aligned_b:"4.125",places:3},
  {a:"10.4",b:"2.67",aligned_a:"10.40",aligned_b:"2.67",places:2},
  {a:"5.2",b:"0.375",aligned_a:"5.200",aligned_b:"0.375",places:3},
  {a:"3.14",b:"2.7",aligned_a:"3.14",aligned_b:"2.70",places:2},
  {a:"0.9",b:"4.25",aligned_a:"0.90",aligned_b:"4.25",places:2},
];
export function genAlignDec(){
  const items=shuffle([...ALIGN_DEC_POOL]).slice(0,3);
  return{type:"align-dec",items,prompt:"Rewrite each pair with the same number of decimal places."};
}
export function gradeAlignDecItem(inputs,item){
  if(!Array.isArray(inputs)||inputs.length<2)return false;
  const[s1,s2]=inputs.map(s=>String(s).trim());
  if(parseFloat(s1)!==parseFloat(item.aligned_a)||parseFloat(s2)!==parseFloat(item.aligned_b))return false;
  const dec1=(s1.includes(".")?s1.split(".")[1]||"":"").length;
  const dec2=(s2.includes(".")?s2.split(".")[1]||"":"").length;
  return dec1===dec2&&dec1===item.places;
}
export function gradeAlignDec(input,q){
  try{const ans=JSON.parse(input);return q.items.every((item,i)=>gradeAlignDecItem(ans[i],item));}catch{return false;}
}

// - A7: Add decimals step by step -
const ADD_DEC_POOL=[
  {a:12.3,b:5.67,aligned_a:"12.30",aligned_b:"5.67",sum:17.97,places:2},
  {a:3.5,b:2.125,aligned_a:"3.500",aligned_b:"2.125",sum:5.625,places:3},
  {a:8.4,b:1.63,aligned_a:"8.40",aligned_b:"1.63",sum:10.03,places:2},
  {a:15.7,b:3.425,aligned_a:"15.700",aligned_b:"3.425",sum:19.125,places:3},
  {a:0.9,b:4.35,aligned_a:"0.90",aligned_b:"4.35",sum:5.25,places:2},
  {a:6.1,b:2.875,aligned_a:"6.100",aligned_b:"2.875",sum:8.975,places:3},
];
export function genAddDecSBS(){
  const p=randChoice(ADD_DEC_POOL);
  return{type:"add-dec-sbs",...p,answer:String(p.sum),displayAnswer:String(p.sum),prompt:`Add: ${p.a} + ${p.b}`};
}
export function gradeAddDecSBSStage1(input,q){
  const s=String(input||"").trim().replace(/\s+/g," ");
  const parts=s.split(/\s+and\s+|\s*,\s*|\s+/);
  if(parts.length<2)return false;
  return decOk(parts[0],parseFloat(q.aligned_a))&&decOk(parts[1],parseFloat(q.aligned_b));
}
export function gradeAddDecSBSStage2(input,q){return decOk(input,q.sum);}

// - A8: Subtract decimals step by step -
const SUB_DEC_POOL=[
  {a:15.2,b:6.78,aligned_a:"15.20",aligned_b:"6.78",diff:8.42,places:2},
  {a:20.5,b:3.125,aligned_a:"20.500",aligned_b:"3.125",diff:17.375,places:3},
  {a:8.0,b:2.43,aligned_a:"8.00",aligned_b:"2.43",diff:5.57,places:2},
  {a:12.3,b:4.875,aligned_a:"12.300",aligned_b:"4.875",diff:7.425,places:3},
  {a:5.1,b:1.67,aligned_a:"5.10",aligned_b:"1.67",diff:3.43,places:2},
];
export function genSubDecSBS(){
  const p=randChoice(SUB_DEC_POOL);
  return{type:"sub-dec-sbs",...p,answer:String(p.diff),displayAnswer:String(p.diff),prompt:`Subtract: ${p.a} - ${p.b}`};
}
export function gradeSubDecSBSStage1(input,q){
  const s=String(input||"").trim().replace(/\s+/g," ");
  const parts=s.split(/\s+and\s+|\s*,\s*|\s+/);
  if(parts.length<2)return false;
  return decOk(parts[0],parseFloat(q.aligned_a))&&decOk(parts[1],parseFloat(q.aligned_b));
}
export function gradeSubDecSBSStage2(input,q){return decOk(input,q.diff);}

// - A9: Add/subtract decimals direct -
const ADD_SUB_DIRECT=[
  {expr:"23.45 + 6.7",answer:30.15},{expr:"100.5 - 34.28",answer:66.22},
  {expr:"7.8 + 0.49",answer:8.29},{expr:"50.1 - 23.456",answer:26.644},
  {expr:"14.3 + 5.75",answer:20.05},{expr:"8.6 - 3.125",answer:5.475},
  {expr:"0.99 + 1.1",answer:2.09},{expr:"12.5 - 4.375",answer:8.125},
];
export function genAddSubDirect(){
  const probs=shuffle([...ADD_SUB_DIRECT]).slice(0,4);
  return{type:"add-sub-direct",problems:probs,prompt:"Calculate each. Enter exact decimal answer."};
}
export function gradeAddSubDirectItem(input,item){return decOk(input,item.answer);}
export function gradeAddSubDirect(input,q){
  try{const ans=JSON.parse(input);return q.problems.every((p,i)=>gradeAddSubDirectItem(ans[i],p));}catch{return false;}
}

// - A10: Count decimal places -
const COUNT_PLACES_POOL=[
  {a:"2.3",b:"4.56",pa:1,pb:2,total:3},  // 3
  {a:"0.5",b:"0.2",pa:1,pb:1,total:2},   // 2
  {a:"1.25",b:"3.4",pa:2,pb:1,total:3},  // 3
  {a:"0.04",b:"2",pa:2,pb:0,total:2},    // 2
  {a:"3.1",b:"2.5",pa:1,pb:1,total:2},   // 2
  {a:"1.2",b:"0.03",pa:1,pb:2,total:3},  // 3
  {a:"4",b:"1.5",pa:0,pb:1,total:1},     // 1
  {a:"3",b:"2.4",pa:0,pb:1,total:1},     // 1
  {a:"0.125",b:"2",pa:3,pb:0,total:3},   // 3
  {a:"1.4",b:"0.5",pa:1,pb:1,total:2},   // 2
  {a:"5",b:"0.7",pa:0,pb:1,total:1},     // 1
  {a:"0.25",b:"4",pa:2,pb:0,total:2},    // 2
];
export function genCountPlaces(){
  // Pick 5 items with no more than 2 sharing the same total
  const shuffled=shuffle([...COUNT_PLACES_POOL]);
  const counts={}; const result=[];
  for(const item of shuffled){
    const t=item.total;
    if((counts[t]||0)<2){counts[t]=(counts[t]||0)+1;result.push(item);}
    if(result.length===5)break;
  }
  return{type:"count-places",items:result,prompt:"Enter the total number of decimal places in both factors combined."};
}
export function gradeCountPlacesItem(input,item){return parseInt(String(input).trim())===item.total;}
export function gradeCountPlaces(input,q){
  try{const ans=JSON.parse(input);return q.items.every((item,i)=>gradeCountPlacesItem(ans[i],item));}catch{return false;}
}

// - A11: Multiply decimals step by step -
const MULT_DEC_SBS_POOL=[
  {a:2.3,b:4.56,whole_a:23,whole_b:456,whole_prod:10488,places:3,answer:10.488},
  {a:1.2,b:3.4,whole_a:12,whole_b:34,whole_prod:408,places:2,answer:4.08},
  {a:0.5,b:0.8,whole_a:5,whole_b:8,whole_prod:40,places:2,answer:0.4},
  {a:2.5,b:1.4,whole_a:25,whole_b:14,whole_prod:350,places:2,answer:3.5},
  {a:3.6,b:0.25,whole_a:36,whole_b:25,whole_prod:900,places:3,answer:0.9},
  {a:1.5,b:2.4,whole_a:15,whole_b:24,whole_prod:360,places:2,answer:3.6},
];
export function genMultDecSBS(){
  const p=randChoice(MULT_DEC_SBS_POOL);
  return{type:"mult-dec-sbs",...p,answer:String(p.answer),displayAnswer:String(p.answer),prompt:`Multiply: ${p.a} - ${p.b}`};
}
export function gradeMultDecSBSStage1(input,q){return parseInt(String(input).trim())===q.whole_prod;}
export function gradeMultDecSBSStage2(input,q){return parseInt(String(input).trim())===q.places;}
export function gradeMultDecSBSStage3(input,q){return decOk(input,q.answer);}

// - A12: Multiply decimals direct -
const MULT_DEC_DIRECT=[
  {expr:"1.2 * 3.4",answer:4.08},{expr:"0.5 * 0.2",answer:0.1},
  {expr:"2.5 * 0.03",answer:0.075},{expr:"3.75 * 2",answer:7.5},
  {expr:"0.4 * 0.6",answer:0.24},{expr:"1.5 * 1.2",answer:1.8},
  {expr:"2.3 * 0.4",answer:0.92},{expr:"0.25 * 0.8",answer:0.2},
];
export function genMultDecDirect(){
  const probs=shuffle([...MULT_DEC_DIRECT]).slice(0,4);
  return{type:"mult-dec-direct",problems:probs,prompt:"Multiply each. Accept with or without trailing zeros."};
}
export function gradeMultDecDirectItem(input,item){return decOk(input,item.answer);}
export function gradeMultDecDirect(input,q){
  try{const ans=JSON.parse(input);return q.problems.every((p,i)=>gradeMultDecDirectItem(ans[i],p));}catch{return false;}
}

// - A13: Adjacent metric unit conversions -
const METRIC_ADJ=[
  {from:3.5,fromU:"cm",toU:"mm",factor:10,answer:35,expr:"3.5 cm = ? mm"},
  {from:120,fromU:"mm",toU:"cm",factor:0.1,answer:12,expr:"120 mm = ? cm"},
  {from:4,fromU:"dm",toU:"cm",factor:10,answer:40,expr:"4 dm = ? cm"},
  {from:250,fromU:"cm",toU:"dm",factor:0.1,answer:25,expr:"250 cm = ? dm"},
  {from:2.3,fromU:"m",toU:"dm",factor:10,answer:23,expr:"2.3 m = ? dm"},
  {from:450,fromU:"cm",toU:"m",factor:0.01,answer:4.5,expr:"450 cm = ? m"},
  {from:7,fromU:"cm",toU:"mm",factor:10,answer:70,expr:"7 cm = ? mm"},
  {from:35,fromU:"mm",toU:"cm",factor:0.1,answer:3.5,expr:"35 mm = ? cm"},
  {from:5,fromU:"m",toU:"dm",factor:10,answer:50,expr:"5 m = ? dm"},
  {from:300,fromU:"dm",toU:"m",factor:0.1,answer:30,expr:"300 dm = ? m"},
];
export function genMetricAdj(){
  const probs=shuffle([...METRIC_ADJ]).slice(0,6);
  return{type:"metric-adj",problems:probs,prompt:"Convert between adjacent metric units."};
}
export function gradeMetricAdjItem(input,item){return decOk(input,item.answer);}
export function gradeMetricAdj(input,q){
  try{const ans=JSON.parse(input);return q.problems.every((p,i)=>gradeMetricAdjItem(ans[i],p));}catch{return false;}
}

// - A14: Non-adjacent metric conversions -
const METRIC_NONADJ=[
  {from:2.5,fromU:"m",toU:"mm",answer:2500,expr:"2.5 m = ? mm"},
  {from:300,fromU:"cm",toU:"m",answer:3,expr:"300 cm = ? m"},
  {from:1.2,fromU:"km",toU:"m",answer:1200,expr:"1.2 km = ? m"},
  {from:4500,fromU:"m",toU:"km",answer:4.5,expr:"4500 m = ? km"},
  {from:0.75,fromU:"km",toU:"cm",answer:75000,expr:"0.75 km = ? cm"},
  {from:1250,fromU:"mm",toU:"m",answer:1.25,expr:"1250 mm = ? m"},
  {from:3,fromU:"km",toU:"mm",answer:3000000,expr:"3 km = ? mm"},
  {from:500,fromU:"cm",toU:"km",answer:0.005,expr:"500 cm = ? km"},
  {from:8,fromU:"m",toU:"mm",answer:8000,expr:"8 m = ? mm"},
  {from:0.4,fromU:"km",toU:"m",answer:400,expr:"0.4 km = ? m"},
];
export function genMetricNonAdj(){
  const probs=shuffle([...METRIC_NONADJ]).slice(0,6);
  return{type:"metric-nonadj",problems:probs,prompt:"Convert between non-adjacent metric units."};
}
export function gradeMetricNonAdjItem(input,item){return decOk(input,item.answer);}
export function gradeMetricNonAdj(input,q){
  try{const ans=JSON.parse(input);return q.problems.every((p,i)=>gradeMetricNonAdjItem(ans[i],p));}catch{return false;}
}

// - A15: Mixed metric conversions -
const METRIC_MIXED=[
  {from:1500,fromU:"mm",toU:"dm",answer:1.5,expr:"1500 mm = ? dm"},
  {from:2.4,fromU:"km",toU:"cm",answer:240000,expr:"2.4 km = ? cm"},
  {from:350,fromU:"dm",toU:"km",answer:0.035,expr:"350 dm = ? km"},
  {from:0.08,fromU:"m",toU:"cm",answer:8,expr:"0.08 m = ? cm"},
  {from:4.5,fromU:"dm",toU:"mm",answer:450,expr:"4.5 dm = ? mm"},
  {from:2000,fromU:"cm",toU:"km",answer:0.02,expr:"2000 cm = ? km"},
  {from:0.3,fromU:"m",toU:"mm",answer:300,expr:"0.3 m = ? mm"},
  {from:75,fromU:"mm",toU:"dm",answer:0.75,expr:"75 mm = ? dm"},
];
export function genMetricMixed(){
  const probs=shuffle([...METRIC_MIXED]).slice(0,4);
  return{type:"metric-mixed",problems:probs,prompt:"Mixed metric length conversions."};
}
export function gradeMetricMixedItem(input,item){return decOk(input,item.answer);}
export function gradeMetricMixed(input,q){
  try{const ans=JSON.parse(input);return q.problems.every((p,i)=>gradeMetricMixedItem(ans[i],p));}catch{return false;}
}

// - Topic registry -
export const LESSON18_TOPICS=[
  {id:"warmup-a",       label:"Warm-up: Multiply Fractions",         description:"3/5 x 5/6"},
  {id:"warmup-b",       label:"Warm-up: Divide Mixed Numbers",       description:"2 1/4 / 1 1/2"},
  {id:"warmup-c",       label:"Warm-up: Factor GCF",                 description:"12x - 18"},
  {id:"warmup-d",       label:"Warm-up: Quotient Rule",              description:"15x^6 / 3x^2"},
  {id:"place-value",    label:"A1: Place Value",                     description:"6 simultaneous MC"},
  {id:"decimal-desc",   label:"A2: Write Decimal from Description",  description:"5 problems"},
  {id:"dec-frac-free",  label:"A3: Decimal to Fraction",             description:"5 problems"},
  {id:"add-sub-direct", label:"A4: Add/Subtract Direct",             description:"4 simultaneous"},
  {id:"count-places",   label:"A5: Count Decimal Places",           description:"5 problems"},
  {id:"mult-dec-direct",label:"A6: Multiply Decimals Direct",       description:"4 simultaneous"},
  {id:"metric-adj",     label:"A7: Adjacent Metric Units",          description:"6 simultaneous"},
  {id:"metric-nonadj",  label:"A8: Non-Adjacent Metric Units",      description:"6 simultaneous"},
];

export function generateLesson18Question(topicId){
  switch(topicId){
    case "warmup-a":       return genWarmupA();
    case "warmup-b":       return genWarmupB();
    case "warmup-c":       return genWarmupC();
    case "warmup-d":       return genWarmupD();
    case "place-value":    return genPlaceValue();
    case "decimal-desc":   return genDecimalDesc();
case "dec-frac-free":  return genDecToFracFree();
    case "add-sub-direct": return genAddSubDirect();
    case "count-places":   return genCountPlaces();
    case "mult-dec-direct":return genMultDecDirect();
    case "metric-adj":     return genMetricAdj();
    case "metric-nonadj":  return genMetricNonAdj();
default:               return genWarmupA();
  }
}

export function gradeLesson18Answer(input,question){
  if(!input||!question)return false;
  switch(question.type){
    case "warmup-a":       return gradeWarmupA(input,question);
    case "warmup-b":       return gradeWarmupB(input,question);
    case "warmup-c":       return gradeWarmupC(input,question);
    case "warmup-d":       return gradeWarmupD(input,question);
    case "place-value":    return gradePlaceValue(input,question);
    case "decimal-desc":   return gradeDecimalDesc(input,question);
case "dec-frac-free":  return gradeDecToFracFree(input,question);
    case "add-sub-direct": return gradeAddSubDirect(input,question);
    case "count-places":   return gradeCountPlaces(input,question);
    case "mult-dec-direct":return gradeMultDecDirect(input,question);
    case "metric-adj":     return gradeMetricAdj(input,question);
    case "metric-nonadj":  return gradeMetricNonAdj(input,question);
default:               return false;
  }
}

