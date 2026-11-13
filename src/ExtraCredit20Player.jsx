import { useState, useEffect, useRef } from "react";
import useActivityTracking from "./core/useActivityTracking";
import { saveProgress, getProgress } from "./core/firebase";

export const TOPIC_ID = "lesson20-ec-v1";
const STREAK_NEEDED = 2;

// LOGIC START
function randInt(min,max){return Math.floor(Math.random()*(max-min+1))+min;}
function pick(arr){return arr[Math.floor(Math.random()*arr.length)];}

// ---------- Activity 1: a : x = x : b ----------
// Three groups where the ratio of the 1st to the 2nd equals the ratio of the 2nd to the 3rd.
const STORIES=[
  {things:"beads",groups:["red","blue","green"],where:"in a jar"},
  {things:"fruits",groups:["apples","bananas","oranges"],where:"in a basket",plural:true},
  {things:"animals",groups:["cats","dogs","rabbits"],where:"at a shelter",plural:true},
  {things:"books",groups:["mystery","science","history"],where:"on a shelf"},
  {things:"stickers",groups:["star","heart","smiley"],where:"in an album"},
  {things:"marbles",groups:["yellow","purple","white"],where:"in a bag"},
  {things:"flowers",groups:["roses","tulips","daisies"],where:"in a garden",plural:true},
  {things:"cards",groups:["sports","animal","comic"],where:"in a collection"},
];

function genGeo(){
  for(let t=0;t<5000;t++){
    const x=randInt(4,30),sq=x*x;
    const divs=[];for(let a=2;a<x;a++) if(sq%a===0) divs.push(a);
    if(!divs.length) continue;
    const a=pick(divs),b=sq/a;
    if(b>150||b===a) continue;
    const st=pick(STORIES);
    const flip=Math.random()<0.5;          // sometimes the bigger number comes first
    return{type:"geo",st,a:flip?b:a,b:flip?a:b,x,prod:sq};
  }
  return genGeo();
}
function name(st,i){return st.plural?st.groups[i]:st.groups[i]+" "+st.things;}
function gradeGeo(input,x){const s=input.replace(/[,\s]/g,"");return /^\d+$/.test(s)&&+s===x;}

// ---------- Activity 2: area with sides in different units ----------
const MM={mm:1,cm:10,dm:100,m:1000,km:1000000};
const ORDER=["mm","cm","dm","m","km"];

function dec(n,d){
  if(d===0) return String(n);
  const s=String(n).padStart(d+1,"0");
  return (s.slice(0,s.length-d)+"."+s.slice(s.length-d)).replace(/0+$/,"").replace(/\.$/,"");
}
// Exact decimal string for a BigInt fraction n / 10^k after simplifying
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
  // whole number 2..99, or one decimal place like 2.5
  if(Math.random()<0.6) return{n:randInt(2,99),d:0};
  for(;;){const n=randInt(11,99);if(n%10!==0) return{n,d:1};}
}
function genArea(){
  for(let t=0;t<5000;t++){
    const i1=randInt(0,4),i2=randInt(0,4);
    if(i1===i2) continue;
    const u1=ORDER[i1],u2=ORDER[i2];
    const f=MM[u1]>MM[u2]?MM[u1]/MM[u2]:MM[u2]/MM[u1];
    if(f>1000) continue;                       // keep the units within 1000 of each other
    const L1=randLen(),L2=randLen();
    // both lengths in mm, as integers (all values have at most 1 decimal place, mm is 1/10 of cm)
    const mm1=L1.n*MM[u1]/Math.pow(10,L1.d),mm2=L2.n*MM[u2]/Math.pow(10,L2.d);
    if(!Number.isInteger(mm1)||!Number.isInteger(mm2)) continue;
    const small=MM[u1]<MM[u2]?u1:u2;
    const s1=mm1/MM[small],s2=mm2/MM[small];   // sides in the smaller unit
    if(!Number.isInteger(s1)||!Number.isInteger(s2)) continue;
    if(s1*s2>1000000) continue;
    return{type:"area",u1,u2,v1:dec(L1.n,L1.d),v2:dec(L2.n,L2.d),
      areaMM2:BigInt(mm1)*BigInt(mm2),small,s1,s2,horizFirst:Math.random()<0.5};
  }
  return genArea();
}
// Area written in unit u (square units), as an exact decimal string
function areaIn(p,u){
  const k=Math.round(2*Math.log10(MM[u]));    // divide mm^2 by 10^k
  return bigDec(p.areaMM2,k);
}
// Correct if the number equals the area in the square unit picked
function gradeArea(input,unit,p){
  if(!unit||!unit.sq) return false;
  const s=input.replace(/[,\s]/g,"");
  const m=s.match(/^(\d*)(?:\.(\d*))?$/);
  if(!m||s===""||s===".") return false;
  const digits=(m[1]||"")+(m[2]||""),dp=(m[2]||"").length;
  if(digits.length>18) return false;
  const k=BigInt(Math.round(2*Math.log10(MM[unit.u])));
  // value = digits / 10^dp  in unit^2 ;  in mm^2 = digits * 10^k / 10^dp
  return BigInt(digits||"0")*(BigInt(10)**k)===p.areaMM2*(BigInt(10)**BigInt(dp));
}
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
        style={{flex:"1 1 0",minWidth:0,padding:"8px 2px",fontSize:18,fontWeight:800,fontFamily:"var(--mono)",
          borderRadius:"var(--radius-sm)",cursor:"pointer",
          border:"2px solid "+(on?"var(--blue)":"var(--border2)"),
          background:on?"var(--blue)":"var(--surface)",color:on?"#fff":"var(--text)"}}>
        <U u={u} sq={sq}/>
      </button>
    );
  };
  return(
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      <div style={{display:"flex",gap:6}}>{ORDER.map(u=>btn(u,false))}</div>
      <div style={{display:"flex",gap:6}}>{ORDER.map(u=>btn(u,true))}</div>
    </div>
  );
}

const TOPICS=[
  {id:"geo",label:"Proportion Word Problems",subLabel:"Find the missing middle number",gen:genGeo},
  {id:"area",label:"Area with Mixed Units",subLabel:"Find the area and choose the units",gen:genArea},
];

const TIMES="\u00d7";
const workStyle={fontFamily:"var(--mono)",fontSize:16,color:"var(--text3)",lineHeight:2.1,
  background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"10px 16px",marginBottom:12};
const inputStyle={textAlign:"center",fontSize:28,fontFamily:"var(--mono)",fontWeight:700,padding:"12px"};

export default function ExtraCredit20Player({user,topic,onHome}){
  useActivityTracking(user,TOPIC_ID,"Classwork 20 EC (019)");
  const topicId=topic?.id||TOPIC_ID;

  const [topicIdx,setTopicIdx]=useState(0);
  const [streak,setStreak]=useState(0);
  const [problem,setProblem]=useState(null);
  const [input,setInput]=useState("");
  const [unit,setUnit]=useState(null);
  const [phase,setPhase]=useState("question");
  const [loading,setLoading]=useState(true);
  const [wrong,setWrong]=useState(null);
  const inputRef=useRef(null);
  const pending=useRef(null);

  const cur=TOPICS[topicIdx];
  const isGeo=cur?.id==="geo";

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
    setInput("");setUnit(null);setPhase("question");setWrong(null);pending.current=null;
    setTimeout(()=>inputRef.current?.focus(),80);
  };

  const saveProg=async(ti,st,done)=>{
    await saveProgress(user.id,topicId,{
      started:true,completed:done,
      percentComplete:done?100:Math.round((ti/TOPICS.length)*100),
      data:{topicIdx:ti,streak:st,completed:done},
    });
  };

  const canSubmit=isGeo?!!input.trim():(!!input.trim()&&!!unit);

  const handleSubmit=async()=>{
    if(!problem||phase!=="question"||!canSubmit)return;
    const p=problem;
    const correct=p.type==="geo"?gradeGeo(input,p.x):gradeArea(input,unit,p);
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
      setStreak(0);setWrong({text:input,unit});setPhase("wrong");
      await saveProg(topicIdx,0,false);
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
        <p style={{color:"var(--text2)",fontSize:19,marginBottom:24}}>Great work with ratios and units!</p>
        <button className="btn btn-primary btn-lg" style={{width:"100%"}} onClick={onHome}> Back to Home</button>
      </div>
    </div>
  );

  const p=problem;

  const geoText=p&&p.type==="geo"&&(
    <div style={{fontSize:20,lineHeight:1.6,textAlign:"left"}}>
      There are {p.st.things} {p.st.where}. The ratio of {name(p.st,0)} to {name(p.st,1)} is the same
      as the ratio of {name(p.st,1)} to {name(p.st,2)}. There are <b>{p.a}</b> {name(p.st,0)} and{" "}
      <b>{p.b}</b> {name(p.st,2)}. How many {name(p.st,1)} are there?
    </div>
  );

  let work=null,answerEl=null;
  if(p&&phase==="wrong"){
    if(p.type==="geo"){
      work=(
        <div style={workStyle}>
          <div>{p.a} : x = x : {p.b}</div>
          <div>Cross multiply: x {TIMES} x = {p.a} {TIMES} {p.b} = {p.prod}</div>
          <div>{p.x} {TIMES} {p.x} = {p.prod}, so x = {p.x}</div>
        </div>
      );
      answerEl=<span style={{fontFamily:"var(--mono)"}}>{p.x}</span>;
    } else {
      const sm=p.small,big=p.u1===sm?p.u2:p.u1;
      const vBig=p.u1===sm?p.v2:p.v1,sBig=p.u1===sm?p.s2:p.s1,sSmall=p.u1===sm?p.s1:p.s2;
      const vSmall=p.u1===sm?p.v1:p.v2;
      const inSmall=commas(areaIn(p,sm)),inBig=commas(areaIn(p,big));
      work=(
        <div style={workStyle}>
          <div>Use the same unit for both sides: {vBig} {big} = {commas(String(sBig))} {sm}</div>
          <div>Area = {commas(String(sBig))} {TIMES} {vSmall} = {inSmall} <U u={sm} sq/></div>
          <div>Same area in {big}<sup>2</sup>: {inBig} <U u={big} sq/></div>
        </div>
      );
      answerEl=<span style={{fontFamily:"var(--mono)"}}>{inSmall} <U u={sm} sq/></span>;
    }
  }

  return(
    <div style={{maxWidth:640,margin:"0 auto",animation:"fadeUp 0.3s ease"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
        marginBottom:16,flexWrap:"wrap",gap:8}}>
        <div>
          <div style={{fontSize:19,color:"var(--amber)",marginBottom:2,fontWeight:700}}>
            Extra Credit - Classwork 20 &middot; Activity {topicIdx+1} of {TOPICS.length}
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
            {p.type==="geo"
              ?<div style={{background:"var(--bg2)",borderRadius:"var(--radius)",padding:"16px 20px",marginBottom:12}}>{geoText}</div>
              :<div style={{textAlign:"center",marginBottom:8}}><RectFig p={p}/></div>}
            {work}
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:16,marginBottom:14,flexWrap:"wrap"}}>
              <span style={{fontSize:20,fontFamily:"var(--mono)",color:"var(--red)",textDecoration:"line-through"}}>
                {wrong.text}{wrong.unit&&<> <U u={wrong.unit.u} sq={wrong.unit.sq}/></>}
              </span>
              <span style={{fontSize:24,fontWeight:800,color:"var(--green)"}}>{answerEl}</span>
            </div>
            <button className="btn btn-success" style={{width:"100%",fontSize:20,padding:"13px"}}
              onClick={()=>newProblem(topicIdx)}>
              Got it - try again
            </button>
          </div>
        )}

        {phase==="question"&&p&&(
          <>
            {p.type==="geo"?(
              <div style={{background:"var(--bg2)",borderRadius:"var(--radius)",padding:"18px 22px",marginBottom:16}}>
                {geoText}
              </div>
            ):(
              <>
                <p style={{textAlign:"center",fontSize:19,fontWeight:600,color:"var(--text2)",marginBottom:6}}>
                  Find the area of the rectangle.
                </p>
                <div style={{textAlign:"center",marginBottom:2}}><RectFig p={p}/></div>
                <div style={{textAlign:"center",fontSize:15,color:"var(--text3)",marginBottom:10}}>Not drawn to scale</div>
              </>
            )}
            <input ref={inputRef} value={input}
              onChange={e=>setInput(isGeo
                ?e.target.value.replace(/[^0-9]/g,"")
                :e.target.value.replace(/[^0-9.,]/g,""))}
              onKeyDown={e=>e.key==="Enter"&&handleSubmit()}
              inputMode={isGeo?"numeric":"decimal"}
              style={{...inputStyle,width:"100%",boxSizing:"border-box",marginBottom:10}}/>
            {!isGeo&&(
              <div style={{marginBottom:12}}>
                <div style={{fontSize:17,fontWeight:700,color:"var(--text2)",marginBottom:6,textAlign:"center"}}>Units</div>
                <UnitButtons value={unit} onChange={setUnit}/>
              </div>
            )}
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
