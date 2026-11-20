import { useState, useEffect, useRef } from "react";
import useActivityTracking from "./core/useActivityTracking";
import { saveProgress, getProgress } from "./core/firebase";

export const TOPIC_ID = "lesson21-ec-v1";
const STREAK_NEEDED = 2;

// LOGIC START
function randInt(min,max){return Math.floor(Math.random()*(max-min+1))+min;}
function pick(arr){return arr[Math.floor(Math.random()*arr.length)];}

// ---------- Activity 1: perimeter and area with sides in different units ----------
const MM={mm:1,cm:10,dm:100,m:1000,km:1000000};
const ORDER=["mm","cm","dm","m","km"];

function dec(n,d){
  if(d===0) return String(n);
  const s=String(n).padStart(d+1,"0");
  return (s.slice(0,s.length-d)+"."+s.slice(s.length-d)).replace(/0+$/,"").replace(/\.$/,"");
}
// Exact decimal string for BigInt n / 10^k
function bigDec(n,k){
  let s=n.toString();
  if(k<=0) return s+"0".repeat(-k);
  s=s.padStart(k+1,"0");
  return (s.slice(0,s.length-k)+"."+s.slice(s.length-k)).replace(/0+$/,"").replace(/\.$/,"");
}
function commas(str){
  const [i,f]=str.split(".");
  return i.replace(/\B(?=(\d{3})+(?!\d))/g,",")+(f?"."+f:"");
}
function randLen(){
  if(Math.random()<0.6) return{n:randInt(2,99),d:0};
  for(;;){const n=randInt(11,99);if(n%10!==0) return{n,d:1};}
}
function genRect(){
  for(let t=0;t<5000;t++){
    const i1=randInt(0,4),i2=randInt(0,4);
    if(i1===i2) continue;
    const u1=ORDER[i1],u2=ORDER[i2];
    const f=MM[u1]>MM[u2]?MM[u1]/MM[u2]:MM[u2]/MM[u1];
    if(f>1000) continue;                       // keep the two units within 1000 of each other
    const L1=randLen(),L2=randLen();
    const mm1=L1.n*MM[u1]/Math.pow(10,L1.d),mm2=L2.n*MM[u2]/Math.pow(10,L2.d);
    if(!Number.isInteger(mm1)||!Number.isInteger(mm2)) continue;
    const small=MM[u1]<MM[u2]?u1:u2;
    const s1=mm1/MM[small],s2=mm2/MM[small];   // sides in the smaller unit
    if(!Number.isInteger(s1)||!Number.isInteger(s2)) continue;
    if(s1*s2>1000000) continue;
    return{type:"rect",u1,u2,v1:dec(L1.n,L1.d),v2:dec(L2.n,L2.d),small,s1,s2,
      perimMM:BigInt(2*(mm1+mm2)),areaMM2:BigInt(mm1)*BigInt(mm2),horizFirst:Math.random()<0.5};
  }
  return genRect();
}
// Exponent of 10 that converts mm (power 1) or mm^2 (power 2) into unit u
function kOf(u,power){return Math.round(power*Math.log10(MM[u]));}
function inUnit(valMM,u,power){return bigDec(valMM,kOf(u,power));}
// Correct when the unit has the right power (plain for perimeter, square for area)
// and the number equals the measurement in that unit exactly.
function gradeQty(input,unit,valMM,power){
  if(!unit||(power===2)!==unit.sq) return false;
  const s=input.replace(/[,\s]/g,"");
  const m=s.match(/^(\d*)(?:\.(\d*))?$/);
  if(!m||s===""||s===".") return false;
  const digits=(m[1]||"")+(m[2]||""),dp=(m[2]||"").length;
  if(digits.length>18) return false;
  const k=BigInt(kOf(unit.u,power));
  return BigInt(digits||"0")*(BigInt(10)**k)===valMM*(BigInt(10)**BigInt(dp));
}

// ---------- Activity 2: Egyptian fractions ----------
// [numerator, denominator, a shortest sum of distinct unit fractions]. Each target needs at least
// as many unit fractions as listed (3, 4 or 5); the list was checked by a full search.
const EGYPT=[[4,5,[2,4,20]],[3,7,[4,7,28]],[5,7,[2,6,21]],[6,7,[2,3,42]],[7,8,[2,3,24]],[7,9,[2,6,9]],[8,9,[2,3,18]],[9,10,[2,3,15]],[5,11,[3,11,33]],[7,11,[2,11,22]],[8,11,[2,5,70,77]],[9,11,[2,4,20,55]],[10,11,[2,3,22,33]],[11,12,[2,3,12]],[3,13,[6,26,39]],[4,13,[4,26,52]],[8,13,[2,13,26]],[9,13,[2,6,39]],[10,13,[2,4,52]],[12,13,[2,3,13,78]],[11,14,[2,4,28]],[13,14,[2,4,7,28]],[7,15,[3,10,30]],[11,15,[2,5,30]],[13,15,[2,3,30]],[14,15,[2,3,10]],[7,16,[3,16,24]],[11,16,[2,8,16]],[13,16,[2,4,16]],[15,16,[2,3,16,24]],[7,17,[3,17,51]],[8,17,[3,15,17,85]],[10,17,[2,17,34]],[14,17,[2,4,17,68]],[15,17,[2,3,34,51]],[16,17,[2,3,17,34,51]],[13,18,[2,6,18]],[17,18,[2,3,9]],[9,19,[4,5,76,95]],[11,19,[2,19,38]],[13,19,[2,6,57]],[14,19,[2,6,19,57]],[15,19,[2,4,38,76]],[13,20,[2,10,20]],[17,20,[2,4,10]],[19,20,[2,4,5]],[13,21,[2,12,28]],[17,21,[2,6,7]],[19,21,[2,3,14]],[20,21,[2,3,12,28]],[7,22,[4,20,55]],[9,22,[3,22,33]],[17,22,[2,4,44]],[19,22,[2,3,33]],[21,22,[2,3,11,33]],[13,23,[2,23,46]],[16,23,[2,6,46,138]],[18,23,[2,4,46,92]],[20,23,[2,3,46,69]],[21,23,[2,3,23,46,69]],[22,23,[2,3,10,69,115]],[17,24,[2,6,24]],[19,24,[2,4,24]],[23,24,[2,3,8]],[4,25,[10,25,50]],[8,25,[4,20,50]],[11,25,[3,15,25]],[12,25,[3,9,45,75]],[14,25,[2,25,50]],[16,25,[2,10,25]],[18,25,[2,5,50]],[22,25,[2,3,30,75]],[23,25,[2,3,15,50]],[24,25,[2,4,5,100]],[19,26,[2,6,26,39]],[21,26,[2,4,26,52]],[23,26,[2,3,26,78]],[8,27,[4,36,54]],[11,27,[3,18,54]],[13,27,[3,9,27]],[16,27,[2,18,27]],[17,27,[2,9,54]],[19,27,[2,6,27]],[20,27,[2,5,45,54]],[22,27,[2,6,9,27]],[23,27,[2,3,54]],[25,27,[2,3,18,27]],[26,27,[2,3,9,54]],[13,28,[3,12,21]],[17,28,[2,14,28]],[19,28,[2,7,28]],[23,28,[2,4,14]],[25,28,[2,4,7]],[27,28,[2,3,12,21]],[16,29,[2,29,58]],[21,29,[2,5,58,145]],[23,29,[2,4,29,116]],[25,29,[2,3,58,87]],[27,29,[2,3,12,116,174]],[28,29,[2,4,5,116,145]],[19,30,[2,10,30]],[23,30,[2,5,15]],[29,30,[2,3,10,30]],[22,31,[2,6,31,93]],[24,31,[2,4,62,124]],[30,31,[2,3,8,186,248]],[7,32,[6,32,48]],[13,32,[3,24,32]],[19,32,[2,16,32]],[21,32,[2,8,32]],[23,32,[2,6,32,48]],[25,32,[2,4,32]],[29,32,[2,3,24,32]],[31,32,[2,3,8,96]],[5,33,[9,45,55]],[8,33,[6,22,33]],[10,33,[6,11,22]],[16,33,[3,9,45,55]],[19,33,[2,22,33]],[20,33,[2,12,44]],[23,33,[2,6,33]],[25,33,[2,6,11]],[26,33,[2,6,11,33]],[29,33,[2,3,22]],[31,33,[2,3,12,44]],[32,33,[2,3,11,22]],[13,34,[3,34,51]],[15,34,[3,17,34,51]],[27,34,[2,4,34,68]],[29,34,[2,3,51]],[31,34,[2,3,17,51]],[33,34,[2,3,15,17,85]],[11,35,[5,15,21]],[13,35,[4,14,20]],[16,35,[3,10,42]],[17,35,[4,5,28]],[19,35,[3,7,15]],[22,35,[2,10,35]],[24,35,[2,10,20,28]],[26,35,[2,7,10]],[27,35,[2,5,14]],[29,35,[2,4,20,35]],[31,35,[2,4,10,28]],[32,35,[2,3,21,30]],[33,35,[2,4,7,20]],[34,35,[2,3,14,15]],[17,36,[3,12,18]],[23,36,[2,12,18]],[25,36,[2,9,12]],[29,36,[2,4,18]],[31,36,[2,4,9]],[35,36,[2,3,12,18]],[11,37,[4,37,74,148]],[16,37,[3,12,111,148]],[29,37,[2,4,37,148]],[9,38,[6,19,57]],[31,38,[2,4,19,76]],[33,38,[2,3,38,114]],[37,38,[2,4,5,76,95]],[11,39,[6,13,26]],[17,39,[3,12,52]],[22,39,[2,26,39]],[25,39,[2,12,26,52]],[28,39,[2,6,26,78]],[29,39,[2,6,13]],[31,39,[2,4,39,52]],[32,39,[2,6,7,91]],[34,39,[2,3,26]],[35,39,[2,3,26,39]],[37,39,[2,3,13,26]],[38,39,[2,3,12,26,52]],[17,40,[3,20,24]],[19,40,[3,10,24]],[23,40,[2,24,30]],[27,40,[2,8,20]],[29,40,[2,8,10]],[31,40,[2,4,40]],[33,40,[2,5,8]],[37,40,[2,3,20,24]],[39,40,[2,3,10,24]]];
function bgcd(a,b){while(b){[a,b]=[b,a%b];}return a;}
function genEgypt(){
  const want=Math.random()<0.5?3:Math.random()<0.7?4:5;
  const [n,d,terms]=pick(EGYPT.filter(e=>e[2].length===want));
  return{type:"egypt",n,d,terms,k:terms.length};
}
// Sum of 1/x for the denominators given, as a reduced BigInt fraction
function unitSum(dens){
  let a=BigInt(0),b=BigInt(1);
  for(const x of dens){const X=BigInt(x);a=a*X+b;b=b*X;const g=bgcd(a,b);a/=g;b/=g;}
  return[a,b];
}
// Correct when the denominators are whole numbers 2 or more, all different, and the sum is exact
function gradeEgypt(dens,n,d){
  const xs=dens.map(s=>s.trim()).filter(s=>s!=="");
  if(xs.length<2||!xs.every(s=>/^\d{1,7}$/.test(s))) return{ok:false,why:"Each denominator must be a whole number."};
  const v=xs.map(Number);
  if(v.some(x=>x<2)) return{ok:false,why:"Each denominator must be 2 or more."};
  if(new Set(v).size!==v.length) return{ok:false,why:"All the unit fractions must be different."};
  const [a,b]=unitSum(v);
  const ok=a*BigInt(d)===BigInt(n)*b;
  return{ok,why:ok?"":"Your fractions add up to "+a+"/"+b+", not "+n+"/"+d+".",sum:[a,b]};
}
function lcmAll(xs){let l=1;for(const x of xs){l=l*x/Number(bgcd(BigInt(l),BigInt(x)));}return l;}
// LOGIC END

function StreakDots({current,needed}){
  return(
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
      <span style={{fontSize:20,color:"var(--text3)"}}>Streak:</span>
      {Array.from({length:needed}).map((_,i)=>(
        <div key={i} style={{width:13,height:13,borderRadius:"50%",
          background:i<current?"var(--green)":"var(--surface2)",
          border:"2px solid "+(i<current?"var(--green)":"var(--border2)"),
          transition:"all 0.2s"}}/>
      ))}
      <span style={{fontSize:20,color:"var(--text3)"}}>{current}/{needed}</span>
    </div>
  );
}

function U({u,sq}){return <span>{u}{sq&&<sup style={{fontSize:"0.65em"}}>2</sup>}</span>;}

function Frac({n,d,sz=24}){
  return(
    <span style={{display:"inline-flex",flexDirection:"column",alignItems:"center",
      gap:1,verticalAlign:"middle",margin:"0 2px"}}>
      <span style={{fontSize:sz,fontWeight:900,fontFamily:"var(--mono)",lineHeight:1.1}}>{n}</span>
      <span style={{display:"block",width:"100%",minWidth:18,height:2,background:"currentColor",borderRadius:1}}/>
      <span style={{fontSize:sz,fontWeight:900,fontFamily:"var(--mono)",lineHeight:1.1}}>{d}</span>
    </span>
  );
}

function RectFig({p}){
  const W=200,H=110;
  const top=p.horizFirst?p.v1+" "+p.u1:p.v2+" "+p.u2;
  const left=p.horizFirst?p.v2+" "+p.u2:p.v1+" "+p.u1;
  const lab={fontSize:22,fontWeight:800,fontFamily:"var(--mono)"};
  return(
    <div style={{position:"relative",display:"inline-block",padding:"40px 12px 12px 104px"}}>
      <div style={{width:W,height:H,border:"3px solid var(--blue)",background:"rgba(59,130,246,0.08)",borderRadius:4}}/>
      <div style={{position:"absolute",top:0,left:104,width:W,height:38,display:"flex",
        alignItems:"center",justifyContent:"center"}}><span style={lab}>{top}</span></div>
      <div style={{position:"absolute",top:40,left:0,width:98,height:H,display:"flex",
        alignItems:"center",justifyContent:"center"}}><span style={lab}>{left}</span></div>
    </div>
  );
}

function UnitButtons({value,onChange}){
  const btn=(u,sq)=>{
    const on=value&&value.u===u&&value.sq===sq;
    return(
      <button key={u+sq} type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>onChange({u,sq})}
        style={{flex:"1 1 0",minWidth:0,padding:"6px 2px",fontSize:17,fontWeight:800,fontFamily:"var(--mono)",
          borderRadius:"var(--radius-sm)",cursor:"pointer",
          border:"2px solid "+(on?"var(--blue)":"var(--border2)"),
          background:on?"var(--blue)":"var(--surface)",color:on?"#fff":"var(--text)"}}>
        <U u={u} sq={sq}/>
      </button>
    );
  };
  return(
    <div style={{display:"flex",flexDirection:"column",gap:5}}>
      <div style={{display:"flex",gap:5}}>{ORDER.map(u=>btn(u,false))}</div>
      <div style={{display:"flex",gap:5}}>{ORDER.map(u=>btn(u,true))}</div>
    </div>
  );
}

const TOPICS=[
  {id:"rect",label:"Perimeter & Area",subLabel:"Sides in different metric units",gen:genRect},
  {id:"egypt",label:"Egyptian Fractions",subLabel:"Write the fraction as a sum of different unit fractions",gen:genEgypt},
];

const TIMES="\u00d7";
const workStyle={fontFamily:"var(--mono)",fontSize:16,color:"var(--text3)",lineHeight:2.1,
  background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"10px 16px",marginBottom:12};
const inputStyle={textAlign:"center",fontSize:26,fontFamily:"var(--mono)",fontWeight:700,padding:"10px",width:"100%",boxSizing:"border-box"};
const MAX_TERMS=8;

export default function ExtraCredit21Player({user,topic,onHome}){
  useActivityTracking(user,TOPIC_ID,"Classwork 21 EC (019)");
  const topicId=topic?.id||TOPIC_ID;

  const [topicIdx,setTopicIdx]=useState(0);
  const [streak,setStreak]=useState(0);
  const [problem,setProblem]=useState(null);
  const [inP,setInP]=useState("");
  const [inA,setInA]=useState("");
  const [uP,setUP]=useState(null);
  const [uA,setUA]=useState(null);
  const [dens,setDens]=useState(["","",""]);
  const [phase,setPhase]=useState("question");
  const [loading,setLoading]=useState(true);
  const [wrong,setWrong]=useState(null);
  const firstRef=useRef(null);
  const areaRef=useRef(null);
  const pending=useRef(null);

  const cur=TOPICS[topicIdx];
  const isRect=cur?.id==="rect";

  useEffect(()=>{
    const load=async()=>{
      const prog=await getProgress(user.id,topicId);
      if(prog?.data){
        const{topicIdx:ti,streak:st,completed}=prog.data;
        if(completed){setPhase("done");setLoading(false);return;}
        setTopicIdx(Math.min(ti||0,TOPICS.length-1));
        setStreak(st||0);
      }
      setLoading(false);
    };load();
  },[]);

  useEffect(()=>{if(!loading&&phase!=="done")newProblem(topicIdx);},[topicIdx,loading]);

  const newProblem=(ti)=>{
    setProblem(TOPICS[ti].gen());
    setInP("");setInA("");setUP(null);setUA(null);setDens(["","",""]);
    setPhase("question");setWrong(null);pending.current=null;
    setTimeout(()=>firstRef.current?.focus(),80);
  };

  const saveProg=async(ti,st,done)=>{
    await saveProgress(user.id,topicId,{
      started:true,completed:done,
      percentComplete:done?100:Math.round((ti/TOPICS.length)*100),
      data:{topicIdx:ti,streak:st,completed:done},
    });
  };

  const filled=dens.filter(s=>s.trim()!=="").length;
  const canSubmit=isRect?(inP.trim()&&inA.trim()&&uP&&uA):filled>=2;

  const handleSubmit=async()=>{
    if(!problem||phase!=="question"||!canSubmit)return;
    const p=problem;
    let correct,info={};
    if(p.type==="rect"){
      const okP=gradeQty(inP,uP,p.perimMM,1),okA=gradeQty(inA,uA,p.areaMM2,2);
      correct=okP&&okA;info={p:inP,a:inA,uP,uA,okP,okA};
    } else {
      const g=gradeEgypt(dens,p.n,p.d);
      correct=g.ok;info={dens:dens.filter(s=>s.trim()!==""),why:g.why};
    }
    if(correct){
      const ns=streak+1;setStreak(ns);setPhase("correct");
      if(ns>=STREAK_NEEDED){
        const next=topicIdx+1;
        if(next>=TOPICS.length){pending.current={action:"done"};await saveProg(next,0,true);}
        else{pending.current={action:"next",ti:next};await saveProg(next,0,false);}
      } else {
        pending.current={action:"stay"};await saveProg(topicIdx,ns,false);
      }
    } else {
      setStreak(0);setWrong(info);setPhase("wrong");await saveProg(topicIdx,0,false);
    }
  };

  const handleCorrectNext=()=>{
    const pd=pending.current;if(!pd)return;
    if(pd.action==="done") setPhase("done");
    else if(pd.action==="next"){setTopicIdx(pd.ti);setStreak(0);}
    else newProblem(topicIdx);
  };

  if(loading)return(
    <div style={{display:"flex",justifyContent:"center",padding:60}}><div className="spinner"/></div>
  );

  if(phase==="done")return(
    <div style={{maxWidth:520,margin:"0 auto",textAlign:"center",animation:"fadeUp 0.4s ease"}}>
      <div className="card">
        <div style={{fontSize:64,marginBottom:16}}></div>
        <h2 style={{fontSize:28,fontWeight:800,marginBottom:8}}>Extra Credit Complete!</h2>
        <p style={{color:"var(--text2)",fontSize:19,marginBottom:24}}>You think like an ancient Egyptian mathematician!</p>
        <button className="btn btn-primary btn-lg" style={{width:"100%"}} onClick={onHome}> Back to Home</button>
      </div>
    </div>
  );

  const p=problem;

  // Egyptian fraction target display
  const egyptTarget=p&&p.type==="egypt"&&(
    <div style={{textAlign:"center",marginBottom:14}}>
      <span style={{display:"inline-flex",alignItems:"center",gap:10,background:"var(--bg2)",
        borderRadius:"var(--radius)",padding:"16px 28px"}}>
        <Frac n={p.n} d={p.d} sz={32}/>
      </span>
    </div>
  );

  // An example answer, checked with a common denominator
  const egyptExample=p&&p.type==="egypt"&&(()=>{
    const L=lcmAll([...p.terms,p.d]);
    return(
      <div style={workStyle}>
        <div>One answer with the fewest fractions ({p.k}):</div>
        <div style={{fontSize:18,color:"var(--text2)"}}>{p.n}/{p.d} = {p.terms.map(t=>"1/"+t).join(" + ")}</div>
        {L<=100000&&<div>Check with denominator {L}: {p.terms.map(t=>(L/t)+"/"+L).join(" + ")} = {L/p.d*p.n}/{L} = {p.n}/{p.d}</div>}
      </div>
    );
  })();

  const lineFor=(label,student,unit,ok,val,power)=>(
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:12,marginBottom:8,flexWrap:"wrap"}}>
      <span style={{fontSize:19,fontWeight:700,color:"var(--text2)"}}>{label}:</span>
      {!ok&&<span style={{fontSize:19,fontFamily:"var(--mono)",color:"var(--red)",textDecoration:"line-through"}}>
        {student}{unit&&<> <U u={unit.u} sq={unit.sq}/></>}</span>}
      <span style={{fontSize:22,fontFamily:"var(--mono)",fontWeight:800,color:"var(--green)"}}>
        {commas(inUnit(val,p.small,power))} <U u={p.small} sq={power===2}/></span>
    </div>
  );

  let work=null;
  if(p&&phase==="wrong"&&p.type==="rect"){
    const sm=p.small,big=p.u1===sm?p.u2:p.u1;
    const vBig=p.u1===sm?p.v2:p.v1,sBig=p.u1===sm?p.s2:p.s1,sSmall=p.u1===sm?p.s1:p.s2;
    work=(
      <div style={workStyle}>
        <div>Same unit for both sides: {vBig} {big} = {commas(String(sBig))} {sm}</div>
        <div>Perimeter = 2 {TIMES} ({commas(String(sBig))} + {commas(String(sSmall))}) = {commas(inUnit(p.perimMM,sm,1))} {sm}</div>
        <div>Area = {commas(String(sBig))} {TIMES} {commas(String(sSmall))} = {commas(inUnit(p.areaMM2,sm,2))} <U u={sm} sq/></div>
        <div>In {big}: perimeter {commas(inUnit(p.perimMM,big,1))} {big}, area {commas(inUnit(p.areaMM2,big,2))} <U u={big} sq/></div>
      </div>
    );
  }

  const answerBox=(label,val,setVal,unit,setUnit,ref,onEnter)=>(
    <div style={{marginBottom:12}}>
      <div style={{fontSize:18,fontWeight:700,color:"var(--text2)",marginBottom:4}}>{label}</div>
      <input ref={ref} value={val}
        onChange={e=>setVal(e.target.value.replace(/[^0-9.,]/g,""))}
        onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();onEnter();}}}
        inputMode="decimal" style={{...inputStyle,marginBottom:6}}/>
      <UnitButtons value={unit} onChange={setUnit}/>
    </div>
  );
  return(
    <div style={{maxWidth:640,margin:"0 auto",animation:"fadeUp 0.3s ease"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
        marginBottom:16,flexWrap:"wrap",gap:8}}>
        <div>
          <div style={{fontSize:19,color:"var(--amber)",marginBottom:2,fontWeight:700}}>
            Extra Credit - Classwork 21 &middot; Activity {topicIdx+1} of {TOPICS.length}
          </div>
          <div style={{fontSize:20,fontWeight:700}}>{cur.label}</div>
          <div style={{fontSize:17,color:"var(--text3)"}}>{cur.subLabel}</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onHome}> Home</button>
      </div>

      <div className="card">
        <StreakDots current={streak} needed={STREAK_NEEDED}/>

        {phase==="correct"&&(
          <div style={{animation:"popIn 0.25s ease",textAlign:"center"}}>
            <div style={{fontSize:22,fontWeight:800,color:"var(--green)",marginBottom:6}}>
              {pending.current?.action==="done"?"Activity complete!":"Correct!"}
            </div>
            <div style={{fontSize:19,color:"var(--text3)",marginBottom:20}}>Streak: {streak}/{STREAK_NEEDED}</div>
            <button className="btn btn-success" style={{width:"100%",fontSize:20,padding:"13px"}}
              onClick={handleCorrectNext}>
              {pending.current?.action==="done"?"Finish":"Next problem"}
            </button>
          </div>
        )}

        {phase==="wrong"&&p&&wrong&&(
          <div style={{animation:"popIn 0.25s ease"}}>
            <div style={{fontSize:19,fontWeight:700,color:"#fca5a5",marginBottom:12,textAlign:"center"}}>
              Not quite! Streak reset.
            </div>
            {p.type==="rect"?(
              <>
                <div style={{textAlign:"center",marginBottom:8}}><RectFig p={p}/></div>
                {work}
                {lineFor("Perimeter",wrong.p,wrong.uP,wrong.okP,p.perimMM,1)}
                {lineFor("Area",wrong.a,wrong.uA,wrong.okA,p.areaMM2,2)}
                <div style={{textAlign:"center",fontSize:15,color:"var(--text3)",marginBottom:10}}>
                  Any unit is fine if the number matches it.
                </div>
              </>
            ):(
              <>
                {egyptTarget}
                <div style={{textAlign:"center",fontSize:18,marginBottom:10}}>
                  <span style={{fontFamily:"var(--mono)",color:"var(--red)",textDecoration:"line-through"}}>
                    {wrong.dens.map(x=>"1/"+x).join(" + ")}</span>
                  <div style={{fontSize:16,color:"#fca5a5",marginTop:4}}>{wrong.why}</div>
                </div>
                {egyptExample}
              </>
            )}
            <button className="btn btn-success" style={{width:"100%",fontSize:20,padding:"13px",marginTop:4}}
              onClick={()=>newProblem(topicIdx)}>
              Got it - try again
            </button>
          </div>
        )}

        {phase==="question"&&p&&p.type==="rect"&&(
          <>
            <p style={{textAlign:"center",fontSize:19,fontWeight:600,color:"var(--text2)",marginBottom:4}}>
              Find the perimeter and the area. Choose the units for each answer.
            </p>
            <div style={{textAlign:"center",marginBottom:2}}><RectFig p={p}/></div>
            <div style={{textAlign:"center",fontSize:15,color:"var(--text3)",marginBottom:10}}>Not drawn to scale</div>
            {answerBox("Perimeter",inP,setInP,uP,setUP,firstRef,()=>areaRef.current?.focus())}
            {answerBox("Area",inA,setInA,uA,setUA,areaRef,handleSubmit)}
            <button className="btn btn-primary" style={{width:"100%",fontSize:20,padding:"14px"}}
              onMouseDown={e=>{e.preventDefault();handleSubmit();}}
              onTouchEnd={e=>{e.preventDefault();handleSubmit();}}
              disabled={!canSubmit}>
              Submit
            </button>
          </>
        )}

        {phase==="question"&&p&&p.type==="egypt"&&(
          <>
            <p style={{textAlign:"center",fontSize:18,color:"var(--text2)",marginBottom:10}}>
              Write this fraction as a sum of unit fractions (numerator 1). Every denominator must be different.
            </p>
            {egyptTarget}
            <div style={{display:"flex",flexWrap:"wrap",alignItems:"center",justifyContent:"center",gap:6,marginBottom:12}}>
              <span style={{fontSize:26,fontWeight:800,fontFamily:"var(--mono)"}}>=</span>
              {dens.map((v,i)=>(
                <span key={i} style={{display:"inline-flex",alignItems:"center",gap:6}}>
                  {i>0&&<span style={{fontSize:24,fontWeight:800,color:"var(--text3)"}}>+</span>}
                  <span style={{display:"inline-flex",flexDirection:"column",alignItems:"center"}}>
                    <span style={{fontSize:22,fontWeight:900,fontFamily:"var(--mono)",lineHeight:1.1}}>1</span>
                    <span style={{display:"block",width:62,height:2,background:"currentColor",margin:"2px 0"}}/>
                    <input ref={i===0?firstRef:null} value={v} maxLength={7}
                      onChange={e=>{const x=e.target.value.replace(/[^0-9]/g,"");setDens(prev=>prev.map((y,j)=>j===i?x:y));}}
                      onKeyDown={e=>e.key==="Enter"&&handleSubmit()}
                      inputMode="numeric"
                      style={{width:62,textAlign:"center",fontSize:20,fontFamily:"var(--mono)",fontWeight:800,padding:"4px 2px"}}/>
                  </span>
                </span>
              ))}
            </div>
            <div style={{display:"flex",gap:8,marginBottom:12}}>
              <button type="button" className="btn btn-ghost" style={{flex:1,fontSize:17}}
                disabled={dens.length>=MAX_TERMS} onClick={()=>setDens(prev=>[...prev,""])}>+ Add a fraction</button>
              <button type="button" className="btn btn-ghost" style={{flex:1,fontSize:17}}
                disabled={dens.length<=2} onClick={()=>setDens(prev=>prev.slice(0,-1))}>&minus; Remove last</button>
            </div>
            <button className="btn btn-primary" style={{width:"100%",fontSize:20,padding:"14px"}}
              onMouseDown={e=>{e.preventDefault();handleSubmit();}}
              onTouchEnd={e=>{e.preventDefault();handleSubmit();}}
              disabled={!canSubmit}>
              Submit
            </button>
          </>
        )}
      </div>
    </div>
  );
}
