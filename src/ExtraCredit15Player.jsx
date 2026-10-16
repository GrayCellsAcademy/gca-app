import { useState, useEffect, useRef } from "react";
import useActivityTracking from "./core/useActivityTracking";
import { saveProgress, getProgress } from "./core/firebase";

export const TOPIC_ID = "lesson15-ec-v1";
const STREAK_NEEDED = 3;

function randInt(min,max){return Math.floor(Math.random()*(max-min+1))+min;}
function pick(arr){return arr[Math.floor(Math.random()*arr.length)];}
function gcd(a,b){return b===0?a:gcd(b,a%b);}
function lcm(a,b){return(a*b)/gcd(a,b);}

// Positive mixed A minus positive mixed B where B > A (result is negative)
function genSubMixed(){
  const DENS=[2,3,4,5,6,8];
  for(let i=0;i<2000;i++){
    const aDen=pick(DENS);
    const bDen=pick(DENS.filter(d=>d!==aDen));
    const aWhole=randInt(1,3),bWhole=randInt(1,4);
    const aNumer=randInt(1,aDen-1),bNumer=randInt(1,bDen-1);
    const aNum=aWhole*aDen+aNumer,bNum=bWhole*bDen+bNumer;
    const L=lcm(aDen,bDen);
    const aL=aNum*(L/aDen),bL=bNum*(L/bDen);
    const diffNum=aL-bL;
    if(diffNum>=0) continue;
    const g=gcd(Math.abs(diffNum),L);
    const resNum=diffNum/g,resDen=L/g;
    const absN=Math.abs(resNum);
    const resWhole=Math.floor(absN/resDen),resFracN=absN%resDen;
    if(resFracN===0) continue;
    if(resWhole>4) continue;
    return{aWhole,aNumer,aDen,bWhole,bNumer,bDen,L,aL,bL,diffNum,resNum,resDen,resWhole,resFracN};
  }
  return genSubMixed();
}

function gradeAnswer(input,resNum,resDen){
  const s=input.trim().replace(/\s+/g,' ').replace(/^-\s+/,'-');
  const eq=(n1,d1,n2,d2)=>n1*d2===n2*d1;
  const mMatch=s.match(/^-(\d+)\s+(\d+)\/(\d+)$/);
  if(mMatch){
    const w=+mMatch[1],n=+mMatch[2],d=+mMatch[3];
    if(d===0||n===0||n>=d) return false;
    return eq(-(w*d+n),d,resNum,resDen);
  }
  const fMatch=s.match(/^-(\d+)\/(\d+)$/);
  if(fMatch){const n=+fMatch[1],d=+fMatch[2];if(d===0)return false;return eq(-n,d,resNum,resDen);}
  const iMatch=s.match(/^-(\d+)$/);
  if(iMatch) return eq(-+iMatch[1],1,resNum,resDen);
  return false;
}

function Frac({n,d,sz=22}){
  return(
    <span style={{display:"inline-flex",flexDirection:"column",alignItems:"center",gap:1,verticalAlign:"middle",margin:"0 2px"}}>
      <span style={{fontSize:sz,fontWeight:900,fontFamily:"var(--mono)",lineHeight:1.1}}>{n}</span>
      <span style={{display:"block",width:"100%",minWidth:18,height:2,background:"currentColor",borderRadius:1}}/>
      <span style={{fontSize:sz,fontWeight:900,fontFamily:"var(--mono)",lineHeight:1.1}}>{d}</span>
    </span>
  );
}

function Mixed({w,n,d,sz=32,fsz=22}){
  return(
    <span style={{display:"inline-flex",alignItems:"center",gap:5}}>
      <span style={{fontSize:sz,fontWeight:900,fontFamily:"var(--mono)"}}>{w}</span>
      <Frac n={n} d={d} sz={fsz}/>
    </span>
  );
}

function StreakDots({current,needed}){
  return(
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
      <span style={{fontSize:20,color:"var(--text3)"}}>Streak:</span>
      {Array.from({length:needed}).map((_,i)=>(
        <div key={i} style={{width:13,height:13,borderRadius:"50%",
          background:i<current?"var(--green)":"var(--surface2)",
          border:"2px solid "+(i<current?"var(--green)":"var(--border2)"),transition:"all 0.2s"}}/>
      ))}
      <span style={{fontSize:20,color:"var(--text3)"}}>{current}/{needed}</span>
    </div>
  );
}

export default function ExtraCredit15Player({user,topic,onHome}){
  useActivityTracking(user,TOPIC_ID,"Classwork 15 EC (019)");
  const topicId=topic?.id||TOPIC_ID;

  const [streak,setStreak]=useState(0);
  const [problem,setProblem]=useState(null);
  const [input,setInput]=useState("");
  const [phase,setPhase]=useState("question");
  const [loading,setLoading]=useState(true);
  const [wrongAns,setWrongAns]=useState(null);
  const inputRef=useRef(null);
  const pendingDone=useRef(false);

  useEffect(()=>{
    const load=async()=>{
      const prog=await getProgress(user.id,topicId);
      if(prog?.data){
        const{streak:st,completed}=prog.data;
        if(completed){setPhase("done");setLoading(false);return;}
        setStreak(st||0);
      }
      setLoading(false);
    };load();
  },[]);

  useEffect(()=>{if(!loading&&phase!=="done")newProblem();},[loading]);

  const newProblem=()=>{
    setProblem(genSubMixed());setInput("");setPhase("question");setWrongAns(null);pendingDone.current=false;
    setTimeout(()=>inputRef.current?.focus(),80);
  };

  const handleSubmit=async()=>{
    if(!problem||phase!=="question"||!input.trim())return;
    const correct=gradeAnswer(input,problem.resNum,problem.resDen);
    if(correct){
      const ns=streak+1;setStreak(ns);const done=ns>=STREAK_NEEDED;pendingDone.current=done;setPhase("correct");
      await saveProgress(user.id,topicId,{started:true,completed:done,
        percentComplete:done?100:Math.round((ns/STREAK_NEEDED)*100),
        data:{streak:ns,completed:done}});
    } else {
      setStreak(0);setWrongAns(input);setPhase("wrong");
      await saveProgress(user.id,topicId,{started:true,completed:false,percentComplete:0,
        data:{streak:0,completed:false}});
    }
  };

  if(loading)return<div style={{display:"flex",justifyContent:"center",padding:60}}><div className="spinner"/></div>;

  if(phase==="done")return(
    <div style={{maxWidth:520,margin:"0 auto",textAlign:"center",animation:"fadeUp 0.4s ease"}}>
      <div className="card">
        <div style={{fontSize:64,marginBottom:16}}></div>
        <h2 style={{fontSize:28,fontWeight:800,marginBottom:8}}>Extra Credit Complete!</h2>
        <p style={{color:"var(--text2)",fontSize:19,marginBottom:24}}>Excellent work subtracting mixed numbers!</p>
        <button className="btn btn-primary btn-lg" style={{width:"100%"}} onClick={onHome}> Back to Home</button>
      </div>
    </div>
  );

  const p=problem;
  const needsReduction=p&&(p.resNum!==p.diffNum||p.resDen!==p.L);
  const ansStr=p?(p.resWhole>0?"-"+p.resWhole+" "+p.resFracN+"/"+p.resDen:p.resNum+"/"+p.resDen):"";

  return(
    <div style={{maxWidth:620,margin:"0 auto",animation:"fadeUp 0.3s ease"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:8}}>
        <div>
          <div style={{fontSize:19,color:"var(--amber)",marginBottom:2,fontWeight:700}}>Extra Credit - Classwork 15</div>
          <div style={{fontSize:20,fontWeight:700}}>Subtracting Mixed Numbers</div>
          <div style={{fontSize:17,color:"var(--text3)"}}>Both numbers are positive - result is negative</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onHome}> Home</button>
      </div>

      <div className="card">
        <StreakDots current={streak} needed={STREAK_NEEDED}/>

        {phase==="correct"&&(
          <div style={{animation:"popIn 0.25s ease",textAlign:"center"}}>
            <div style={{fontSize:28,marginBottom:8}}></div>
            <div style={{fontSize:22,fontWeight:800,color:"var(--green)",marginBottom:6}}>
              {pendingDone.current?"Activity complete!":"Correct!"}
            </div>
            <div style={{fontSize:19,color:"var(--text3)",marginBottom:20}}>Streak: {streak}/{STREAK_NEEDED}</div>
            <button className="btn btn-success" style={{width:"100%",fontSize:20,padding:"13px"}}
              onClick={()=>pendingDone.current?setPhase("done"):newProblem()}>
               {pendingDone.current?"Finish":"Next problem"}
            </button>
          </div>
        )}

        {phase==="wrong"&&p&&(
          <div style={{animation:"popIn 0.25s ease"}}>
            <div style={{fontSize:19,fontWeight:700,color:"#fca5a5",marginBottom:10,textAlign:"center"}}>Not quite! Streak reset.</div>
            <div style={{textAlign:"center",marginBottom:12}}>
              <span style={{display:"inline-flex",alignItems:"center",gap:14,
                background:"var(--bg2)",borderRadius:"var(--radius)",padding:"14px 22px"}}>
                <Mixed w={p.aWhole} n={p.aNumer} d={p.aDen}/>
                <span style={{fontSize:30,fontWeight:700,color:"var(--text3)"}}>-</span>
                <Mixed w={p.bWhole} n={p.bNumer} d={p.bDen}/>
              </span>
            </div>
            <div style={{fontSize:16,color:"var(--text3)",lineHeight:2.1,
              background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"10px 16px",
              marginBottom:12,fontFamily:"var(--mono)"}}>
              <div>LCD({p.aDen}, {p.bDen}) = {p.L}</div>
              <div>{p.aWhole} {p.aNumer}/{p.aDen} = {p.aL}/{p.L}</div>
              <div>{p.bWhole} {p.bNumer}/{p.bDen} = {p.bL}/{p.L}</div>
              <div>{p.aL}/{p.L} - {p.bL}/{p.L} = {p.diffNum}/{p.L}</div>
              {needsReduction&&<div>Reduced: {p.resNum}/{p.resDen}</div>}
              {p.resWhole>0&&<div>= -{p.resWhole} {p.resFracN}/{p.resDen}</div>}
            </div>
            <div style={{textAlign:"center",marginBottom:14}}>
              {wrongAns&&<span style={{fontSize:20,fontFamily:"var(--mono)",color:"var(--red)",
                textDecoration:"line-through",marginRight:16}}>{wrongAns}</span>}
              <span style={{fontSize:24,fontFamily:"var(--mono)",fontWeight:800,color:"var(--green)"}}>{ansStr}</span>
            </div>
            <button className="btn btn-success" style={{width:"100%",fontSize:20,padding:"13px"}} onClick={newProblem}>
              Got it - try again
            </button>
          </div>
        )}

        {phase==="question"&&p&&(
          <>
            <div style={{textAlign:"center",marginBottom:22}}>
              <span style={{display:"inline-flex",alignItems:"center",gap:18,
                background:"var(--bg2)",borderRadius:"var(--radius)",padding:"20px 32px"}}>
                <Mixed w={p.aWhole} n={p.aNumer} d={p.aDen}/>
                <span style={{fontSize:36,fontWeight:700,color:"var(--text3)"}}>-</span>
                <Mixed w={p.bWhole} n={p.bNumer} d={p.bDen}/>
              </span>
            </div>
            <p style={{textAlign:"center",fontSize:16,color:"var(--text3)",marginBottom:8}}>
              Write as -w n/d (e.g. -2 1/3) or as -n/d (e.g. -3/4). Reduce fully.
            </p>
            <input ref={inputRef} value={input}
              onChange={e=>setInput(e.target.value.replace(/[^0-9/ -]/g,""))}
              onKeyDown={e=>e.key==="Enter"&&handleSubmit()}
              inputMode="text" placeholder="-w n/d"
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
    </div>
  );
}
