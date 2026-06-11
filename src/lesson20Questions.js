// Lesson 20 - Ratios, Proportions, and Conversions

function randInt(min, max) { return Math.floor(Math.random()*(max-min+1))+min; }
function randChoice(arr) { return arr[Math.floor(Math.random()*arr.length)]; }
function shuffle(arr) { const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }
function gcd(a,b){ a=Math.abs(a);b=Math.abs(b); return b===0?a:gcd(b,a%b); }
function reduce(n,d){ if(n===0)return[0,1]; const g=gcd(Math.abs(n),Math.abs(d)); return[n/g,d/g]; }

function decOk(input,correct){
  const v=parseFloat(String(input||"").trim().replace(/,/g,""));
  return!isNaN(v)&&Math.abs(v-correct)<1e-9;
}
function fracOk(input,rn,rd){
  const s=String(input||"").trim();
  const fx=s.match(/^(\d+)\/(\d+)$/);
  if(fx){const[,n,d]=[null,parseInt(fx[1]),parseInt(fx[2])];const[in_,id_]=reduce(n,d);const[cn,cd]=reduce(rn,rd);return in_===cn&&id_===cd;}
  const ix=s.match(/^(\d+)$/);
  if(ix)return rd===1&&parseInt(ix[1])===rn;
  return false;
}

// Parse ratio from "a:b", "a/b", "a to b"
function parseRatio(str){
  const s=String(str||"").trim().replace(/\s+/g," ");
  const m1=s.match(/^(\d+):(\d+)$/);if(m1)return[parseInt(m1[1]),parseInt(m1[2])];
  const m2=s.match(/^(\d+)\/(\d+)$/);if(m2)return[parseInt(m2[1]),parseInt(m2[2])];
  const m3=s.match(/^(\d+)\s+to\s+(\d+)$/i);if(m3)return[parseInt(m3[1]),parseInt(m3[2])];
  return null;
}
function ratioOk(input,a,b){
  const r=parseRatio(input);if(!r)return false;
  const[in_a,in_b]=[r[0],r[1]];
  const[ra,rb]=reduce(a,b);const[ria,rib]=reduce(in_a,in_b);
  return ria===ra&&rib===rb;
}

// - Warm-ups -
export function genWarmupA(){return{type:"warmup-a",n:3,d:8,answer:0.375,displayAnswer:"0.375",prompt:"Convert to a decimal."};}
export function gradeWarmupA(input){return decOk(input,0.375);}

export function genWarmupB(){return{type:"warmup-b",dividend:12.75,divisor:3,answer:4.25,displayAnswer:"4.25",prompt:"Divide."};}
export function gradeWarmupB(input){return decOk(input,4.25);}

export function genWarmupC(){return{type:"warmup-c",dividend:4.5,divisor:0.5,answer:9,displayAnswer:"9",prompt:"Divide."};}
export function gradeWarmupC(input){return decOk(input,9);}

export function genWarmupD(){return{type:"warmup-d",eq:"0.25x + 0.5 = 1",answer:2,displayAnswer:"2",prompt:"Solve for x."};}
export function gradeWarmupD(input){return decOk(input,2);}

// - A1: Write ratio from statement -
// Part-to-part statements
const RATIO_STMT_PP=[
  {stmt:"There are 3 red marbles and 5 blue marbles. What is the ratio of red to blue?",a:3,b:5},
  {stmt:"A class has 12 boys and 16 girls. What is the ratio of boys to girls?",a:3,b:4},
  {stmt:"A bag has 8 apples and 6 oranges. What is the ratio of apples to oranges?",a:4,b:3},
  {stmt:"A team won 9 games and lost 3. What is the ratio of wins to losses?",a:3,b:1},
  {stmt:"There are 10 students and 2 teachers. What is the ratio of students to teachers?",a:5,b:1},
  {stmt:"A recipe uses 4 cups of flour and 2 cups of sugar. What is the ratio of flour to sugar?",a:2,b:1},
  {stmt:"A parking lot has 15 cars and 5 trucks. What is the ratio of cars to trucks?",a:3,b:1},
  {stmt:"A bouquet has 6 roses and 9 tulips. What is the ratio of roses to tulips?",a:2,b:3},
  {stmt:"There are 14 fiction books and 21 non-fiction books. What is the ratio of fiction to non-fiction?",a:2,b:3},
];
// Part-to-whole statements (answer uses part and total)
const RATIO_STMT_PW=[
  {stmt:"There are 5 red marbles and 3 green marbles. What is the ratio of green marbles to the total number of marbles?",a:3,b:8},
  {stmt:"A class has 20 students total and 8 wear glasses. What is the ratio of glasses-wearers to total students?",a:2,b:5},
  {stmt:"A bag has 4 apples and 6 oranges. What is the ratio of apples to the total number of fruits?",a:2,b:5},
  {stmt:"A team has 7 wins and 3 losses. What is the ratio of losses to total games played?",a:3,b:10},
  {stmt:"There are 9 girls and 6 boys in a club. What is the ratio of girls to total members?",a:3,b:5},
];
export function genRatioStatements(){
  // Always include exactly 2 part-to-whole problems
  const pw=shuffle([...RATIO_STMT_PW]).slice(0,2);
  const pp=shuffle([...RATIO_STMT_PP]).slice(0,3);
  const probs=shuffle([...pp,...pw]).map(p=>({
    ...p,answer:`${p.a}:${p.b}`,displayAnswer:`${p.a}:${p.b}`,
  }));
  return{type:"ratio-stmt",problems:probs,prompt:"Write each ratio in simplest form. For part-to-whole, the second term is the total."};
}
export function gradeRatioStmtItem(input,item){return ratioOk(input,item.a,item.b);}
export function gradeRatioStmt(input,q){
  try{const ans=JSON.parse(input);return q.problems.every((p,i)=>gradeRatioStmtItem(ans[i],p));}catch{return false;}
}

// - A2: Identify ratio from picture (teacher-paced, MC) -
// Simple shape counts - student writes ratio
const PICTURE_RATIOS=[
  {desc:"4 circles and 6 squares",a:2,b:3,display:"circles to squares"},
  {desc:"3 triangles and 9 rectangles",a:1,b:3,display:"triangles to rectangles"},
  {desc:"5 stars and 10 hearts",a:1,b:2,display:"stars to hearts"},
  {desc:"8 circles and 4 squares",a:2,b:1,display:"circles to squares"},
  {desc:"6 blue dots and 9 red dots",a:2,b:3,display:"blue to red"},
];
export function genPictureRatio(){
  const p=randChoice(PICTURE_RATIOS);
  return{type:"picture-ratio",...p,answer:`${p.a}:${p.b}`,displayAnswer:`${p.a}:${p.b}`,prompt:`Write the ratio of ${p.display} in simplest form.`};
}
export function gradePictureRatio(input,q){return ratioOk(input,q.a,q.b);}

// - A3: Simplify ratio -
const SIMPLIFY_POOL=[
  {a:6,b:9,ra:2,rb:3},{a:15,b:20,ra:3,rb:4},{a:24,b:30,ra:4,rb:5},{a:14,b:21,ra:2,rb:3},
  {a:12,b:16,ra:3,rb:4},{a:10,b:25,ra:2,rb:5},{a:8,b:12,ra:2,rb:3},{a:18,b:24,ra:3,rb:4},
  {a:20,b:28,ra:5,rb:7},{a:9,b:15,ra:3,rb:5},{a:16,b:20,ra:4,rb:5},{a:30,b:45,ra:2,rb:3},
];
export function genSimplifyRatio(){
  const probs=shuffle([...SIMPLIFY_POOL]).slice(0,4).map(p=>({
    ...p,display:`${p.a}:${p.b}`,answer:`${p.ra}:${p.rb}`,displayAnswer:`${p.ra}:${p.rb}`,
  }));
  return{type:"simplify-ratio",problems:probs,prompt:"Simplify each ratio."};
}
export function gradeSimplifyRatioItem(input,item){return ratioOk(input,item.ra,item.rb);}
export function gradeSimplifyRatio(input,q){
  try{const ans=JSON.parse(input);return q.problems.every((p,i)=>gradeSimplifyRatioItem(ans[i],p));}catch{return false;}
}

// - A4: Convert ratio to fraction -
const RATIO_FRAC_POOL=[
  {a:3,b:4},{a:2,b:5},{a:7,b:8},{a:1,b:3},{a:5,b:6},
  {a:3,b:7},{a:4,b:9},{a:2,b:3},{a:5,b:8},{a:1,b:4},
];
export function genRatioToFrac(){
  const probs=shuffle([...RATIO_FRAC_POOL]).slice(0,4).map(p=>({
    ...p,ratioDisplay:`${p.a}:${p.b}`,answer:`${p.a}/${p.b}`,displayAnswer:`${p.a}/${p.b}`,
  }));
  return{type:"ratio-frac",problems:probs,prompt:"Write each ratio as a fraction."};
}
export function gradeRatioFracItem(input,item){return fracOk(input,item.a,item.b);}
export function gradeRatioFrac(input,q){
  try{const ans=JSON.parse(input);return q.problems.every((p,i)=>gradeRatioFracItem(ans[i],p));}catch{return false;}
}

// - A5: Is it a proportion? -
const PROPORTION_CHECK_POOL=[
  {a:2,b:3,c:4,d:6,isProp:true},{a:3,b:5,c:6,d:10,isProp:true},
  {a:1,b:2,c:2,d:3,isProp:false},{a:4,b:7,c:8,d:14,isProp:true},
  {a:5,b:6,c:10,d:12,isProp:true},{a:2,b:5,c:3,d:7,isProp:false},
  {a:1,b:3,c:3,d:9,isProp:true},{a:3,b:4,c:7,d:9,isProp:false},
  {a:5,b:8,c:10,d:16,isProp:true},{a:2,b:7,c:4,d:12,isProp:false},
  {a:3,b:9,c:1,d:3,isProp:true},{a:6,b:8,c:9,d:11,isProp:false},
];
export function genProportionCheck(){
  const items=shuffle([...PROPORTION_CHECK_POOL]).slice(0,6).map(p=>({
    ...p,
    latex:`${p.a}:${p.b} = ${p.c}:${p.d}`,
    isLatex:false,
    answer:p.isProp?"Yes":"No",
    options:["Yes","No"],
  }));
  return{type:"prop-check",items,prompt:"Is each equation a true proportion? Select Yes or No."};
}
export function gradePropCheckItem(input,item){
  return String(input||"").trim().toLowerCase()===(item.isProp?"yes":"no");
}
export function gradePropCheck(input,q){
  try{const ans=JSON.parse(input);return q.items.every((item,i)=>gradePropCheckItem(ans[i],item));}catch{return false;}
}

// - A6: Check proportion using cross multiplication (step by step) -
const CROSS_MULT_POOL=[
  {a:3,b:4,c:9,d:12,isProp:true},{a:2,b:5,c:4,d:10,isProp:true},
  {a:5,b:6,c:10,d:11,isProp:false},{a:1,b:3,c:4,d:12,isProp:true},
  {a:3,b:7,c:6,d:15,isProp:false},{a:4,b:5,c:8,d:10,isProp:true},
  {a:2,b:3,c:5,d:8,isProp:false},{a:7,b:8,c:14,d:16,isProp:true},
];
export function genCrossMultSBS(){
  const p=randChoice(CROSS_MULT_POOL);
  // means: b*c, extremes: a*d
  const means=p.b*p.c,extremes=p.a*p.d;
  return{type:"cross-mult-sbs",...p,means,extremes,
    answer:p.isProp?"Proportion":"Not a Proportion",displayAnswer:p.isProp?"Proportion":"Not a Proportion",
    prompt:`Check: ${p.a}/${p.b} = ${p.c}/${p.d}`};
}
export function gradeCrossMultStage1(input,q){return parseInt(String(input||"").trim())===q.means;}
export function gradeCrossMultStage2(input,q){return parseInt(String(input||"").trim())===q.extremes;}
export function gradeCrossMultStage3(input,q){
  const s=String(input||"").trim().toLowerCase();
  return q.isProp?(s==="proportion"||s==="yes"):(!s.includes("not")===false||s==="not a proportion"||s==="no");
}

// - A7: Find missing term (step by step) -
const MISSING_SBS_POOL=[
  {type:"a/b=x/d",a:2,b:5,d:10,x:4},{type:"a/b=x/d",a:3,b:4,d:12,x:9},
  {type:"a/b=x/d",a:1,b:2,d:8,x:4},{type:"a/b=x/d",a:5,b:6,d:12,x:10},
  {type:"a/b=c/x",a:3,b:4,c:9,x:12},{type:"a/b=c/x",a:2,b:3,c:8,x:12},
  {type:"x/b=c/d",b:7,c:4,d:14,x:2},{type:"x/b=c/d",b:5,c:3,d:15,x:1},
];
function sbsDisplay(p){
  if(p.type==="a/b=x/d")return{latex:`\\dfrac{${p.a}}{${p.b}} = \\dfrac{x}{${p.d}}`,crossEq:`${p.a} \\times ${p.d} = ${p.b} \\times x`,simplified:`${p.a*p.d} = ${p.b}x`};
  if(p.type==="a/b=c/x")return{latex:`\\dfrac{${p.a}}{${p.b}} = \\dfrac{${p.c}}{x}`,crossEq:`${p.a} \\times x = ${p.b} \\times ${p.c}`,simplified:`${p.a}x = ${p.b*p.c}`};
  if(p.type==="x/b=c/d")return{latex:`\\dfrac{x}{${p.b}} = \\dfrac{${p.c}}{${p.d}}`,crossEq:`x \\times ${p.d} = ${p.b} \\times ${p.c}`,simplified:`${p.d}x = ${p.b*p.c}`};
  return{latex:"",crossEq:"",simplified:""};
}
export function genMissingSBS(){
  const p=randChoice(MISSING_SBS_POOL);
  const disp=sbsDisplay(p);
  return{type:"missing-sbs",...p,...disp,answer:p.x,displayAnswer:String(p.x),prompt:"Find the missing value."};
}
export function gradeMissingSBSStage1(input,q){
  // Accept the cross-mult equation e.g. "2x10=5x" or just the equation with numbers
  const s=String(input||"").trim().replace(/\s+/g,"");
  const nums=s.match(/\d+/g)||[];
  if(nums.length>=3){
    if(q.type==="a/b=x/d") return parseInt(nums[0])===q.a&&parseInt(nums[1])===q.d||parseInt(nums[0])===q.a*q.d;
    if(q.type==="a/b=c/x") return parseInt(nums[0])===q.b*q.c;
    if(q.type==="x/b=c/d") return parseInt(nums[0])===q.b*q.c;
  }
  return parseInt(s)===q.a*q.d||parseInt(s)===q.b*q.c||parseInt(s)===q.b*q.c;
}
export function gradeMissingSBSStage2(input,q){return decOk(input,q.x);}

// - A8: Find missing term (direct) -
const MISSING_DIRECT_POOL=[
  {latex:"\\dfrac{3}{4} = \\dfrac{x}{12}",x:9,pos:"top-right"},
  {latex:"\\dfrac{5}{6} = \\dfrac{10}{x}",x:12,pos:"bottom-right"},
  {latex:"\\dfrac{x}{7} = \\dfrac{4}{14}",x:2,pos:"top-left"},
  {latex:"\\dfrac{8}{x} = \\dfrac{2}{3}",x:12,pos:"bottom-left"},
  {latex:"\\dfrac{2}{3} = \\dfrac{x}{9}",x:6,pos:"top-right"},
  {latex:"\\dfrac{3}{5} = \\dfrac{x}{15}",x:9,pos:"top-right"},
  {latex:"\\dfrac{x}{4} = \\dfrac{6}{8}",x:3,pos:"top-left"},
  {latex:"\\dfrac{4}{x} = \\dfrac{8}{10}",x:5,pos:"bottom-left"},
  {latex:"\\dfrac{1}{3} = \\dfrac{x}{12}",x:4,pos:"top-right"},
  {latex:"\\dfrac{7}{x} = \\dfrac{14}{10}",x:5,pos:"bottom-left"},
];
export function genMissingDirect(){
  const probs=shuffle([...MISSING_DIRECT_POOL]).slice(0,4).map(p=>({
    ...p,answer:String(p.x),displayAnswer:String(p.x),
  }));
  return{type:"missing-direct",problems:probs,prompt:"Find the value of x."};
}
export function gradeMissingDirectItem(input,item){return decOk(input,item.x);}
export function gradeMissingDirect(input,q){
  try{const ans=JSON.parse(input);return q.problems.every((p,i)=>gradeMissingDirectItem(ans[i],p));}catch{return false;}
}

// - A9: Convert yards to inches -
const YD_TO_IN_POOL=[
  {yards:2.5,inches:90},{yards:3,inches:108},{yards:1.5,inches:54},
  {yards:4,inches:144},{yards:0.5,inches:18},{yards:2,inches:72},
  {yards:5,inches:180},{yards:1.25,inches:45},
];
export function genYdToIn(){
  const probs=shuffle([...YD_TO_IN_POOL]).slice(0,5).map(p=>({
    ...p,display:`${p.yards} ${p.yards===1?"yard":"yards"} = ? inches`,
    answer:p.inches,displayAnswer:String(p.inches),
  }));
  return{type:"yd-to-in",problems:probs,prompt:"Convert yards to inches using a proportion. (1 yard = 36 inches)"};
}
export function gradeYdToInItem(input,item){return decOk(input,item.inches);}
export function gradeYdToIn(input,q){
  try{const ans=JSON.parse(input);return q.problems.every((p,i)=>gradeYdToInItem(ans[i],p));}catch{return false;}
}

// - A10: Convert inches to yards -
const IN_TO_YD_POOL=[
  {inches:108,yards:3},{inches:72,yards:2},{inches:36,yards:1},
  {inches:90,yards:2.5},{inches:54,yards:1.5},{inches:144,yards:4},
  {inches:18,yards:0.5},{inches:180,yards:5},{inches:45,yards:1.25},
];
export function genInToYd(){
  const probs=shuffle([...IN_TO_YD_POOL]).slice(0,5).map(p=>({
    ...p,display:`${p.inches} inches = ? yards`,
    answer:p.yards,displayAnswer:String(p.yards),
  }));
  return{type:"in-to-yd",problems:probs,prompt:"Convert inches to yards using a proportion. (1 yard = 36 inches)"};
}
export function gradeInToYdItem(input,item){return decOk(input,item.yards);}
export function gradeInToYd(input,q){
  try{const ans=JSON.parse(input);return q.problems.every((p,i)=>gradeInToYdItem(ans[i],p));}catch{return false;}
}

// - A11: Set up proportion from word problem -
const PROP_SETUP_POOL=[
  {problem:"A recipe uses 2 cups of flour for 3 cups of sugar. How many cups of flour for 9 cups of sugar?",
   accept:["2/3=x/9","2:3=x:9","x/9=2/3"],answer:"2/3 = x/9",xVal:6,
   hint:"flour:sugar"},
  {problem:"A car travels 60 miles in 2 hours. How far in 5 hours at the same rate?",
   accept:["60/2=x/5","x/5=60/2","2/60=5/x"],answer:"60/2 = x/5",xVal:150,
   hint:"miles:hours"},
  {problem:"If 3 shirts cost $45, how much do 7 shirts cost?",
   accept:["3/45=7/x","45/3=x/7","7/x=3/45"],answer:"3/45 = 7/x",xVal:105,
   hint:"shirts:cost"},
  {problem:"A map uses 1 inch for every 50 miles. How many inches for 200 miles?",
   accept:["1/50=x/200","x/200=1/50","50/1=200/x"],answer:"1/50 = x/200",xVal:4,
   hint:"inches:miles"},
  {problem:"A factory produces 120 parts in 4 hours. How many parts in 10 hours?",
   accept:["120/4=x/10","x/10=120/4","4/120=10/x"],answer:"120/4 = x/10",xVal:300,
   hint:"parts:hours"},
  {problem:"A tree casts a 6 ft shadow. A person 5 ft tall casts a 2 ft shadow. How tall is the tree?",
   accept:["5/2=x/6","x/6=5/2","2/5=6/x"],answer:"5/2 = x/6",xVal:15,
   hint:"height:shadow"},
];
export function genPropSetup(){
  const probs=shuffle([...PROP_SETUP_POOL]).slice(0,5).map(p=>({
    ...p,displayAnswer:p.answer,
  }));
  return{type:"prop-setup",problems:probs,prompt:"Write a proportion for each word problem. Use x for the unknown."};
}
export function gradePropSetupItem(input,item){
  const s=String(input||"").trim().replace(/\s+/g,"").toLowerCase();
  return item.accept.some(a=>s===a.replace(/\s+/g,"").toLowerCase());
}
export function gradePropSetup(input,q){
  try{const ans=JSON.parse(input);return q.problems.every((p,i)=>gradePropSetupItem(ans[i],p));}catch{return false;}
}

// - A12: Solve ratio word problem (direct) -
const WORD_PROB_POOL=[
  {problem:"The ratio of boys to girls is 3:5. If there are 15 boys, how many girls?",answer:25},
  {problem:"A car uses 2 gallons of gas per 50 miles. How many gallons for 175 miles?",answer:7},
  {problem:"If 4 pencils cost $1.20, how much do 10 pencils cost? (Enter answer in dollars)",answer:3},
  {problem:"A map scale is 1 inch = 80 miles. A distance measures 3.5 inches. How many miles?",answer:280},
  {problem:"A recipe for 4 servings uses 3 cups of milk. How many cups for 12 servings?",answer:9},
  {problem:"The ratio of red to blue is 2:7. There are 28 blue tiles. How many red tiles?",answer:8},
  {problem:"A printer prints 24 pages in 3 minutes. How many pages in 8 minutes?",answer:64},
  {problem:"If 5 apples weigh 2 pounds, how many pounds do 15 apples weigh?",answer:6},
];
export function genWordProb(){
  const probs=shuffle([...WORD_PROB_POOL]).slice(0,4).map(p=>({
    ...p,displayAnswer:String(p.answer),
  }));
  return{type:"word-prob",problems:probs,prompt:"Solve each word problem."};
}
export function gradeWordProbItem(input,item){return decOk(input,item.answer);}
export function gradeWordProb(input,q){
  try{const ans=JSON.parse(input);return q.problems.every((p,i)=>gradeWordProbItem(ans[i],p));}catch{return false;}
}

// - Topic registry -
export const LESSON20_TOPICS=[
  {id:"warmup-a",      label:"Warm-up: Fraction to Decimal",    description:"3/8"},
  {id:"warmup-b",      label:"Warm-up: Decimal / Whole",        description:"12.75 / 3"},
  {id:"warmup-c",      label:"Warm-up: Divide by Decimal",      description:"4.5 / 0.5"},
  {id:"warmup-d",      label:"Warm-up: Decimal Equation",       description:"0.25x + 0.5 = 1"},
  {id:"ratio-stmt",    label:"A1: Write Ratio from Statement",  description:"5 simultaneous"},
  {id:"picture-ratio", label:"A2: Ratio from Picture",          description:"Teacher-paced"},
  {id:"simplify-ratio",label:"A3: Simplify Ratio",              description:"4 simultaneous"},
  {id:"ratio-frac",    label:"A4: Ratio to Fraction",           description:"4 simultaneous"},
  {id:"prop-check",    label:"A5: Is it a Proportion?",         description:"6 simultaneous"},
  {id:"cross-mult-sbs",label:"A6: Cross Multiplication (Steps)",description:"3-stage"},
  {id:"missing-sbs",   label:"A7: Missing Term (Steps)",        description:"2-stage"},
  {id:"missing-direct",label:"A8: Missing Term (Direct)",       description:"4 simultaneous"},
  {id:"yd-to-in",      label:"A9: Yards to Inches",            description:"5 simultaneous"},
  {id:"in-to-yd",      label:"A10: Inches to Yards",           description:"5 simultaneous"},
  {id:"prop-setup",    label:"A11: Set Up Proportion",          description:"5 simultaneous"},
  {id:"word-prob",     label:"A12: Solve Word Problems",        description:"4 simultaneous"},
];

export function generateLesson20Question(topicId){
  switch(topicId){
    case "warmup-a":       return genWarmupA();
    case "warmup-b":       return genWarmupB();
    case "warmup-c":       return genWarmupC();
    case "warmup-d":       return genWarmupD();
    case "ratio-stmt":     return genRatioStatements();
    case "picture-ratio":  return genPictureRatio();
    case "simplify-ratio": return genSimplifyRatio();
    case "ratio-frac":     return genRatioToFrac();
    case "prop-check":     return genProportionCheck();
    case "cross-mult-sbs": return genCrossMultSBS();
    case "missing-sbs":    return genMissingSBS();
    case "missing-direct": return genMissingDirect();
    case "yd-to-in":       return genYdToIn();
    case "in-to-yd":       return genInToYd();
    case "prop-setup":     return genPropSetup();
    case "word-prob":      return genWordProb();
    default:               return genWarmupA();
  }
}

export function gradeLesson20Answer(input,question){
  if(!input||!question)return false;
  switch(question.type){
    case "warmup-a":       return gradeWarmupA(input);
    case "warmup-b":       return gradeWarmupB(input);
    case "warmup-c":       return gradeWarmupC(input);
    case "warmup-d":       return gradeWarmupD(input);
    case "ratio-stmt":     return gradeRatioStmt(input,question);
    case "picture-ratio":  return gradePictureRatio(input,question);
    case "simplify-ratio": return gradeSimplifyRatio(input,question);
    case "ratio-frac":     return gradeRatioFrac(input,question);
    case "prop-check":     return gradePropCheck(input,question);
    case "cross-mult-sbs": return gradeCrossMultStage3(input,question);
    case "missing-sbs":    return gradeMissingSBSStage2(input,question);
    case "missing-direct": return gradeMissingDirect(input,question);
    case "yd-to-in":       return gradeYdToIn(input,question);
    case "in-to-yd":       return gradeInToYd(input,question);
    case "prop-setup":     return gradePropSetup(input,question);
    case "word-prob":      return gradeWordProb(input,question);
    default:               return false;
  }
}

