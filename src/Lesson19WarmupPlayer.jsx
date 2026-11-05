import { useState, useEffect, useRef } from "react";
import useActivityTracking from "./core/useActivityTracking";
import { saveProgress, getProgress } from "./core/firebase";

export const TOPIC_ID = "lesson19-warmup-v1";
const STREAK_NEEDED = 3;

// LOGIC START
function randInt(min,max){return Math.floor(Math.random()*(max-min+1))+min;}
function pick(arr){return arr[Math.floor(Math.random()*arr.length)];}
function gcd(a,b){return b===0?a:gcd(b,a%b);}

// Exact decimal string for n / 10^d
function dec(n,d){
  if(d===0) return String(n);
  const s=String(n).padStart(d+1,"0");
  return (s.slice(0,s.length-d)+"."+s.slice(s.length-d)).replace(/0+$/,"").replace(/\.$/,"");
}
// Normalize a typed decimal: "0.10" -> "0.1", ".5" -> "0.5", "007" -> "7"
function normDec(s){
  s=s.trim();
  if(!/^\d*\.?\d*$/.test(s)||s===""||s===".") return null;
  let [i,f=""]=s.split(".");
  i=i.replace(/^0+/,"")||"0";
  f=f.replace(/0+$/,"");
  return f?i+"."+f:i;
}

// Activity 1: multiply two decimals
function genMul(){
  for(let t=0;t<1000;t++){
    const da=pick([1,1,2]),db=pick([1,2]);
    if(da+db>3) continue;
    const na=da===1?randInt(2,99):randInt(1,999);
    const nb=db===1?randInt(2,99):randInt(1,99);
    if(na%10===0||nb%10===0) continue;
    if(na===1&&da===2) continue;
    const prod=na*nb,places=da+db;
    const ps=String(prod).padStart(places+1,"0");
    const raw=ps.slice(0,ps.length-places)+"."+ps.slice(ps.length-places);
    return{type:"mul",na,da,nb,db,a:dec(na,da),b:dec(nb,db),prod,places,raw,ans:dec(prod,places)};
  }
  return genMul();
}
function gradeMul(input,ans){return normDec(input)===ans;}

// Activity 2: long division, remainder written as a fraction
function genDiv(){
  // about 1 in 4 problems divides evenly
  const wantEven=Math.random()<0.25;
  for(let t=0;t<5000;t++){
    const d=randInt(2,9);
    const n=randInt(100,9999);
    const q=Math.floor(n/d),r=n%d;
    if(q<10) continue;
    if(wantEven!==(r===0)) continue;
    return{type:"div",n,d,q,r,steps:longDivSteps(n,d)};
  }
  return genDiv();
}

// Steps of the standard algorithm, starting from the first partial dividend >= divisor
function longDivSteps(n,d){
  const digits=String(n).split("").map(Number);
  const steps=[];let cur=0,started=false;
  digits.forEach((dg,i)=>{
    cur=cur*10+dg;
    if(!started&&cur<d) return;
    started=true;
    const k=Math.floor(cur/d),sub=k*d,rem=cur-sub;
    steps.push({cur,k,sub,rem,last:i===digits.length-1});
    cur=rem;
  });
  return steps;
}

// Accepts "q", "q r/d" (fraction may be reduced or not, must be proper), or "r/d" when q is 0
function gradeDiv(input,q,r,d){
  const s=input.trim().replace(/\s+/g," ");
  if(r===0) return /^\d+$/.test(s)&&+s===q;
  const m=s.match(/^(\d+) (\d+)\/(\d+)$/);
  if(!m) return false;
  const w=+m[1],a=+m[2],b=+m[3];
  if(w!==q||b===0||a===0||a>=b) return false;
  return a*d===r*b;
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

function Frac({n,d,sz=22}){
  return(
    <span style={{display:"inline-flex",flexDirection:"column",alignItems:"center",
      gap:1,verticalAlign:"middle",margin:"0 2px"}}>
      <span style={{fontSize:sz,fontWeight:900,fontFamily:"var(--mono)",lineHeight:1.1}}>{n}</span>
      <span style={{display:"block",width:"100%",minWidth:18,height:2,background:"currentColor",borderRadius:1}}/>
      <span style={{fontSize:sz,fontWeight:900,fontFamily:"var(--mono)",lineHeight:1.1}}>{d}</span>
    </span>
  );
}

function DivAnswer({q,r,d}){
  if(r===0) return <span>{q}</span>;
  const g=gcd(r,d);
  return(
    <span style={{display:"inline-flex",alignItems:"center",gap:4}}>
      <span>{q}</span><Frac n={r} d={d}/>
      {g>1&&<><span style={{margin:"0 6px"}}>=</span><span>{q}</span><Frac n={r/g} d={d/g}/></>}
    </span>
  );
}

const TOPICS=[
  {id:"mul",label:"Multiplying Decimals",subLabel:"Find the product",gen:genMul},
  {id:"div",label:"Long Division",subLabel:"Write any remainder as a fraction",gen:genDiv},
];

const workStyle={fontFamily:"var(--mono)",fontSize:16,color:"var(--text3)",lineHeight:2,
  background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"10px 16px",marginBottom:12};

export default function Lesson19WarmupPlayer({user,topic,onHome}){
  useActivityTracking(user,TOPIC_ID,"Warmup 19 (019)");
  const topicId=topic?.id||TOPIC_ID;

  const [topicIdx,setTopicIdx]=useState(0);
  const [streak,setStreak]=useState(0);
  const [problem,setProblem]=useState(null);
  const [input,setInput]=useState("");
  const [phase,setPhase]=useState("question");
  const [loading,setLoading]=useState(true);
  const [wrongAns,setWrongAns]=useState(null);
  const inputRef=useRef(null);
  const pending=useRef(null);

  const cur=TOPICS[topicIdx];
  const isMul=cur?.id==="mul";

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
    setInput("");setPhase("question");setWrongAns(null);pending.current=null;
    setTimeout(()=>inputRef.current?.focus(),80);
  };

  const saveProg=async(ti,st,done)=>{
    await saveProgress(user.id,topicId,{
      started:true,completed:done,
      percentComplete:done?100:Math.round((ti/TOPICS.length)*100),
      data:{topicIdx:ti,streak:st,completed:done},
    });
  };

  const handleSubmit=async()=>{
    if(!problem||phase!=="question"||!input.trim())return;
    const p=problem;
    const correct=p.type==="mul"?gradeMul(input,p.ans):gradeDiv(input,p.q,p.r,p.d);
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
      setStreak(0);setWrongAns(input);setPhase("wrong");await saveProg(topicIdx,0,false);
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
        <h2 style={{fontSize:28,fontWeight:800,marginBottom:8}}>Warmup Complete!</h2>
        <p style={{color:"var(--text2)",fontSize:19,marginBottom:24}}>Ready for Classwork 19!</p>
        <button className="btn btn-primary btn-lg" style={{width:"100%"}} onClick={onHome}> Back to Home</button>
      </div>
    </div>
  );

  const p=problem;
  const times="\u00d7",divs="\u00f7",minus="\u2212";
  const problemDisplay=p&&(
    <span style={{fontSize:34,fontWeight:800,fontFamily:"var(--mono)"}}>
      {p.type==="mul"?p.a+" "+times+" "+p.b:p.n.toLocaleString("en-US")+" "+divs+" "+p.d}
    </span>
  );

  let work=null;
  if(p&&phase==="wrong"){
    if(p.type==="mul"){
      work=(
        <div style={workStyle}>
          <div>Multiply without the decimal points: {p.na} {times} {p.nb} = {p.prod}</div>
          <div>Decimal places: {p.da} + {p.db} = {p.places}</div>
          <div>Move the point {p.places} places: {p.raw}{p.raw!==p.ans?" = "+p.ans:""}</div>
        </div>
      );
    } else {
      work=(
        <div style={workStyle}>
          {p.steps.map((s,i)=>(
            <div key={i}>
              {s.cur} {divs} {p.d} = {s.k}, {s.k} {times} {p.d} = {s.sub}, {s.cur} {minus} {s.sub} = {s.rem}
              {s.last?"":", bring down the next digit"}
            </div>
          ))}
          <div>Quotient {p.q}, remainder {p.r}{p.r>0?" \u2192 "+p.q+" "+p.r+"/"+p.d:""}</div>
        </div>
      );
    }
  }

  return(
    <div style={{maxWidth:620,margin:"0 auto",animation:"fadeUp 0.3s ease"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
        marginBottom:16,flexWrap:"wrap",gap:8}}>
        <div>
          <div style={{fontSize:19,color:"var(--text3)",marginBottom:2}}>
            Activity {topicIdx+1} of {TOPICS.length} &mdash; {cur.label}
          </div>
          <div style={{fontSize:20,fontWeight:700,color:"var(--blue)"}}>{cur.subLabel}</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onHome}> Home</button>
      </div>

      <div style={{marginBottom:16}}>
        <div style={{height:5,background:"var(--surface2)",borderRadius:99,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${(topicIdx/TOPICS.length)*100}%`,
            background:"linear-gradient(90deg,var(--blue),var(--cyan))",
            borderRadius:99,transition:"width 0.4s ease"}}/>
        </div>
      </div>

      <div className="card">
        <StreakDots current={streak} needed={STREAK_NEEDED}/>

        {phase==="correct"&&(
          <div style={{animation:"popIn 0.25s ease",textAlign:"center"}}>
            <div style={{fontSize:22,fontWeight:800,color:"var(--green)",marginBottom:6}}>Correct!</div>
            <div style={{fontSize:19,color:"var(--text3)",marginBottom:20}}>Streak: {streak}/{STREAK_NEEDED}</div>
            <button className="btn btn-success" style={{width:"100%",fontSize:20,padding:"13px"}}
              onClick={handleCorrectNext}>
              {pending.current?.action==="done"?"Finish":"Next problem"}
            </button>
          </div>
        )}

        {phase==="wrong"&&p&&(
          <div style={{animation:"popIn 0.25s ease"}}>
            <div style={{fontSize:19,fontWeight:700,color:"#fca5a5",marginBottom:12,textAlign:"center"}}>
              Not quite! Streak reset.
            </div>
            <div style={{textAlign:"center",marginBottom:12}}>
              <span style={{display:"inline-flex",background:"var(--bg2)",borderRadius:"var(--radius)",padding:"14px 26px"}}>
                {problemDisplay}
              </span>
            </div>
            {work}
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:16,marginBottom:14,flexWrap:"wrap"}}>
              {wrongAns&&<span style={{fontSize:20,fontFamily:"var(--mono)",color:"var(--red)",
                textDecoration:"line-through"}}>{wrongAns}</span>}
              <span style={{fontSize:24,fontFamily:"var(--mono)",fontWeight:800,color:"var(--green)"}}>
                {p.type==="mul"?p.ans:<DivAnswer q={p.q} r={p.r} d={p.d}/>}
              </span>
            </div>
            <button className="btn btn-success" style={{width:"100%",fontSize:20,padding:"13px"}}
              onClick={()=>newProblem(topicIdx)}>
              Got it - try again
            </button>
          </div>
        )}

        {phase==="question"&&p&&(
          <>
            <div style={{textAlign:"center",marginBottom:18}}>
              <span style={{display:"inline-flex",background:"var(--bg2)",borderRadius:"var(--radius)",padding:"22px 34px"}}>
                {problemDisplay}
              </span>
            </div>
            {!isMul&&(
              <p style={{textAlign:"center",fontSize:16,color:"var(--text3)",marginBottom:8}}>
                If there is a remainder, write a mixed number (e.g. 25 3/7).
              </p>
            )}
            <input ref={inputRef} value={input}
              onChange={e=>setInput(isMul
                ?e.target.value.replace(/[^0-9.]/g,"")
                :e.target.value.replace(/[^0-9/ ]/g,""))}
              onKeyDown={e=>e.key==="Enter"&&handleSubmit()}
              inputMode={isMul?"decimal":"text"}
              style={{textAlign:"center",fontSize:28,fontFamily:"var(--mono)",fontWeight:700,
                padding:"12px",marginBottom:12}}/>
            <button className="btn btn-primary" style={{width:"100%",fontSize:20,padding:"14px"}}
              onMouseDown={e=>{e.preventDefault();handleSubmit();}}
              onTouchEnd={e=>{e.preventDefault();handleSubmit();}}
              disabled={!input.trim()}>
              Submit
            </button>
          </>
        )}
      </div>

      <div style={{marginTop:16,display:"flex",gap:6,flexWrap:"wrap"}}>
        {TOPICS.map((t,i)=>{
          const done=i<topicIdx,active=i===topicIdx;
          return(
            <div key={t.id} style={{fontSize:18,fontWeight:700,padding:"4px 14px",borderRadius:99,
              background:done?"rgba(16,185,129,0.15)":active?"rgba(59,130,246,0.15)":"var(--surface)",
              color:done?"var(--green)":active?"var(--blue)":"var(--text3)",
              border:"1px solid "+(done?"rgba(16,185,129,0.3)":active?"rgba(59,130,246,0.3)":"var(--border)")}}>
              {t.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
