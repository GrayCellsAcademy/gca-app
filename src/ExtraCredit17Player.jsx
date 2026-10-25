import { useState, useEffect, useRef } from "react";
import useActivityTracking from "./core/useActivityTracking";
import { saveProgress, getProgress } from "./core/firebase";

export const TOPIC_ID = "lesson17-ec-v1";
const STREAK_NEEDED = 2;

// LOGIC START
function randInt(min,max){return Math.floor(Math.random()*(max-min+1))+min;}
function pick(arr){return arr[Math.floor(Math.random()*arr.length)];}

// ---------- Activity 1: catch-up problems ----------
const LEN={in:1,ft:12,yd:36};
const LEN_ABBR={in:"in",ft:"ft",yd:"yd"};
const LEN_WORD={in:["inch","inches"],ft:["foot","feet"],yd:["yard","yards"]};
const TIME_ABBR={sec:"sec",min:"min"};
const TIME_WORD={sec:"seconds",min:"minutes"};

// units: [length unit, time unit, top speed] so speeds stay believable
const CONTEXTS=[
  {thing:"robot vacuum",things:"robot vacuums",verb:"rolls",units:[["in","sec",16],["ft","min",40]]},
  {thing:"remote-control car",things:"remote-control cars",verb:"drives",units:[["ft","sec",20],["yd","sec",8]]},
  {thing:"snail",things:"snails",verb:"crawls",units:[["in","min",10]]},
  {thing:"tortoise",things:"tortoises",verb:"walks",units:[["ft","min",30],["yd","min",10]]},
  {thing:"toy boat",things:"toy boats",verb:"floats",units:[["ft","sec",6],["in","sec",20]]},
  {thing:"ladybug",things:"ladybugs",verb:"crawls",units:[["in","min",20],["in","sec",4]]},
];

function genChase(){
  for(let i=0;i<5000;i++){
    const ctx=pick(CONTEXTS);
    const [u,tu,top]=pick(ctx.units);
    const D=pick(Object.keys(LEN).filter(k=>k!==u));
    const slow=randInt(1,top-1),k=randInt(1,Math.min(6,top-slow)),fast=slow+k;
    const t=randInt(3,30);
    const distU=k*t;                       // gap in speed units
    const distIn=distU*LEN[u];
    if(distIn%LEN[D]!==0) continue;
    const distD=distIn/LEN[D];             // gap as given in the problem
    if(distD<2||distD>400) continue;
    return{type:"chase",ctx,u,tu,D,slow,fast,k,t,distU,distD,ans:t};
  }
  return genChase();
}

// ---------- Activity 2: complex integer computation ----------
function tokenize(s){
  const t=[];let i=0;
  while(i<s.length){
    const c=s[i];
    if(c===" "){i++;continue;}
    if(/\d/.test(c)){let j=i;while(j<s.length&&/\d/.test(s[j]))j++;t.push({k:"n",v:+s.slice(i,j)});i=j;continue;}
    t.push({k:c});i++;
  }
  return t;
}

// Exact integer evaluation. Exponent binds tighter than a leading minus,
// so -7^2 = -49 while (-7)^2 = 49. Throws on a non-exact division.
// Records the value of each power and each parenthesized group as a step.
function evaluate(s){
  const toks=tokenize(s);let p=0;const steps=[];
  const peek=()=>toks[p];
  const isOp=k=>peek()&&peek().k===k;
  function expr(){
    let v=term();
    while(isOp("+")||isOp("-")){const op=toks[p++].k;const r=term();v=op==="+"?v+r:v-r;}
    return v;
  }
  function term(){
    let v=unary();
    while(isOp("*")||isOp("/")){
      const op=toks[p++].k;const r=unary();
      if(op==="*") v=v*r;
      else{if(r===0||v%r!==0) throw new Error("inexact");v=v/r;}
    }
    return v;
  }
  function unary(){
    if(isOp("-")){
      const start=p;p++;
      const powNext=toks[p]&&toks[p].k==="n"&&toks[p+1]&&toks[p+1].k==="^";
      const v=-unary();
      if(powNext) steps.push({a:start,b:p,v});
      return v;
    }
    return power();
  }
  function power(){
    const start=p;let v=primary();
    if(isOp("^")){p++;const e=toks[p++].v;v=Math.pow(v,e);steps.push({a:start,b:p,v});}
    return v;
  }
  function primary(){
    const t=toks[p++];
    if(!t) throw new Error("eof");
    if(t.k==="n") return t.v;
    if(t.k==="("){
      const start=p-1;const v=expr();
      if(!toks[p]||toks[p].k!==")") throw new Error("paren");
      p++;
      const inner=toks.slice(start+1,p-1);
      const trivial=(inner.length===1&&inner[0].k==="n")||(inner.length===2&&inner[0].k==="-"&&inner[1].k==="n");
      const last=steps[steps.length-1];
      const wrapsLast=last&&last.a===start+1&&last.b===p-1;
      if(!trivial&&!wrapsLast) steps.push({a:start,b:p,v});
      return v;
    }
    throw new Error("bad token");
  }
  const v=expr();
  if(p!==toks.length) throw new Error("trailing");
  return{v,steps,toks};
}

// Negative numbers after an operator are written in parentheses
function sn(n){return n<0?"(-"+(-n)+")":String(n);}
// Leading position (start of the whole expression or of a group)
function ln(n){return n<0?"-"+(-n):String(n);}
function nz(min,max){let v=0;while(v===0)v=randInt(min,max);return v;}
function sgn(n){return Math.random()<0.4?-n:n;}

const TEMPLATES=[
  // 1 -(2 -(3 -(4 -(5 - 6))))
  ()=>{
    const len=randInt(5,6);
    const ns=Array.from({length:len},()=>sgn(randInt(1,9)));
    let s=ln(ns[len-2])+" - "+sn(ns[len-1]);
    for(let i=len-3;i>=0;i--) s=ln(ns[i])+" - ("+s+")";
    return s;
  },
  // -6 * ((-3)^2 - 2)
  ()=>{
    const a=randInt(2,9),b=randInt(2,6),c=randInt(1,30);
    return pick([
      "-"+a+" * ((-"+b+")^2 - "+c+")",
      a+" * ("+c+" - (-"+b+")^2)",
      "-"+a+" * (-"+b+"^2 + "+c+")",
    ]);
  },
  // (-7^2 + (-5)^2)^2
  ()=>{
    const a=randInt(2,9),b=randInt(2,9);
    return pick(["(-"+a+"^2 + (-"+b+")^2)^2","((-"+a+")^2 - "+b+"^2)^2"]);
  },
  // -24 / (6^3 / (-2)^3 / (-3^2))
  ()=>{
    const [k,d]=pick([[2,2],[3,3],[4,2],[4,4],[6,3]]);
    const C=randInt(2,3),B=C*k;
    const q=k*k*k/(d*d);
    const A=q*randInt(1,6);
    return "-"+A+" / ("+B+"^3 / (-"+C+")^3 / (-"+d+"^2))";
  },
  // (-15 * (-6) + 18 * (-4)) / (-9)
  ()=>{
    const a=randInt(2,18),b=randInt(2,12),c=randInt(2,18),d=randInt(2,12);
    const N=a*b-c*d;
    const divs=[];for(let e=2;e<=12;e++) if(N!==0&&N%e===0) divs.push(e);
    if(!divs.length) return null;
    const e=pick(divs);
    return "(-"+a+" * (-"+b+") + "+c+" * (-"+d+")) / (-"+e+")";
  },
  // (-2)^3 - 3^2 * (4 - 6)
  ()=>{
    const a=randInt(2,4),b=randInt(2,5),c=sgn(randInt(1,9)),d=randInt(1,9);
    return "(-"+a+")^3 - "+b+"^2 * ("+ln(c)+" - "+sn(d)+")";
  },
  // -3^2 - (-4)^3 / (5 - 7)
  ()=>{
    const a=randInt(2,6),b=randInt(2,4),c=randInt(1,9),d=randInt(1,9);
    return "-"+a+"^2 - (-"+b+")^3 / ("+c+" - "+d+")";
  },
];

function genCompute(){
  for(let i=0;i<5000;i++){
    const s=pick(TEMPLATES)();
    if(!s) continue;
    let r;
    try{r=evaluate(s);}catch(e){continue;}
    if(!Number.isInteger(r.v)||r.v===0||Math.abs(r.v)>600) continue;
    return{type:"compute",expr:s,toks:r.toks,steps:r.steps,ans:r.v};
  }
  return genCompute();
}

function gradeInt(input,ans){
  const s=input.replace(/\u2212/g,"-").replace(/\s+/g,"");
  return /^-?\d+$/.test(s)&&+s===ans;
}
// LOGIC END

const MINUS="\u2212",DOT="\u00b7",DIV="\u00f7";

// Render tokens a..b as math, with superscript exponents
function MathToks({toks,a=0,b,sz=30}){
  const end=b==null?toks.length:b;
  const out=[];
  for(let i=a;i<end;i++){
    const t=toks[i];
    if(t.k==="n"){out.push(<span key={i}>{t.v}</span>);continue;}
    if(t.k==="^"){
      const e=toks[i+1];
      out.push(<sup key={i} style={{fontSize:"0.6em"}}>{e.v}</sup>);i++;continue;
    }
    if(t.k==="("||t.k===")"){out.push(<span key={i}>{t.k}</span>);continue;}
    const prev=i>a?toks[i-1]:null;
    const unary=t.k==="-"&&(!prev||prev.k==="("||["+","-","*","/","^"].includes(prev.k));
    const sym=t.k==="-"?MINUS:t.k==="*"?DOT:t.k==="/"?DIV:"+";
    out.push(<span key={i}>{unary?sym:" "+sym+" "}</span>);
  }
  return <span style={{fontSize:sz,fontWeight:800,fontFamily:"var(--mono)",whiteSpace:"pre-wrap"}}>{out}</span>;
}

function fmtInt(n){return n<0?MINUS+(-n):String(n);}

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

function plural(n,[one,many]){return n===1?one:many;}

function ChaseText({p}){
  const sp=LEN_ABBR[p.u]+"/"+TIME_ABBR[p.tu];
  const c=p.ctx;
  return(
    <div style={{fontSize:20,lineHeight:1.6,color:"var(--text)",textAlign:"left"}}>
      <p style={{marginBottom:10}}>
        Two {c.things} start at the same time on a straight path. One starts at Point A and the
        other starts at Point B, which is <b>{p.distD} {plural(p.distD,LEN_WORD[p.D])}</b> ahead
        of Point A. Both move in the same direction, away from Point A.
      </p>
      <p style={{marginBottom:10}}>
        The {c.thing} from Point A {c.verb} at <b>{p.fast} {sp}</b>. The {c.thing} from
        Point B {c.verb} at <b>{p.slow} {sp}</b>.
      </p>
      <p style={{fontWeight:700}}>
        How many {TIME_WORD[p.tu]} will it take the {c.thing} from Point A to catch up to the
        one from Point B?
      </p>
    </div>
  );
}

const TOPICS=[
  {id:"chase",label:"Catch-Up Problems",subLabel:"Speed, distance and time with unit conversion",gen:genChase},
  {id:"compute",label:"Integer Computation",subLabel:"Order of operations with negatives and exponents",gen:genCompute},
];

const workStyle={fontFamily:"var(--mono)",fontSize:16,color:"var(--text3)",lineHeight:2.1,
  background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"10px 16px",marginBottom:12};

export default function ExtraCredit17Player({user,topic,onHome}){
  useActivityTracking(user,TOPIC_ID,"Classwork 17 EC (019)");
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
  const isChase=cur?.id==="chase";

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
    const correct=gradeInt(input,problem.ans);
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
        <h2 style={{fontSize:28,fontWeight:800,marginBottom:8}}>Extra Credit Complete!</h2>
        <p style={{color:"var(--text2)",fontSize:19,marginBottom:24}}>Excellent work!</p>
        <button className="btn btn-primary btn-lg" style={{width:"100%"}} onClick={onHome}> Back to Home</button>
      </div>
    </div>
  );

  const p=problem;
  const problemBox=p&&(
    <div style={{background:"var(--bg2)",borderRadius:"var(--radius)",padding:"18px 22px",
      marginBottom:16,textAlign:"center"}}>
      {p.type==="chase"?<ChaseText p={p}/>:<MathToks toks={p.toks} sz={28}/>}
    </div>
  );

  let work=null;
  if(p&&phase==="wrong"){
    if(p.type==="chase"){
      const sp=LEN_ABBR[p.u];
      work=(
        <div style={workStyle}>
          <div>Gap: {p.distD} {LEN_ABBR[p.D]} = {p.distU} {sp}</div>
          <div>Gap closes by {p.fast} - {p.slow} = {p.k} {sp} each {p.tu==="sec"?"second":"minute"}</div>
          <div>Time = {p.distU} / {p.k} = {p.t} {TIME_WORD[p.tu]}</div>
        </div>
      );
    } else {
      work=(
        <div style={workStyle}>
          {p.steps.map((st,i)=>(
            <div key={i}>
              <MathToks toks={p.toks} a={st.a} b={st.b} sz={16}/>
              <span style={{fontFamily:"var(--mono)"}}> = {fmtInt(st.v)}</span>
            </div>
          ))}
          <div style={{fontWeight:700}}>Answer = {fmtInt(p.ans)}</div>
        </div>
      );
    }
  }

  return(
    <div style={{maxWidth:640,margin:"0 auto",animation:"fadeUp 0.3s ease"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
        marginBottom:16,flexWrap:"wrap",gap:8}}>
        <div>
          <div style={{fontSize:19,color:"var(--amber)",marginBottom:2,fontWeight:700}}>
            Extra Credit - Classwork 17 &middot; Activity {topicIdx+1} of {TOPICS.length}
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

        {phase==="wrong"&&p&&(
          <div style={{animation:"popIn 0.25s ease"}}>
            <div style={{fontSize:19,fontWeight:700,color:"#fca5a5",marginBottom:12,textAlign:"center"}}>
              Not quite! Streak reset.
            </div>
            {problemBox}
            {work}
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:16,marginBottom:14}}>
              {wrongAns&&<span style={{fontSize:20,fontFamily:"var(--mono)",color:"var(--red)",
                textDecoration:"line-through"}}>{wrongAns}</span>}
              <span style={{fontSize:24,fontFamily:"var(--mono)",fontWeight:800,color:"var(--green)"}}>
                {fmtInt(p.ans)}{p.type==="chase"?" "+TIME_WORD[p.tu]:""}
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
            {p.type==="compute"&&(
              <p style={{textAlign:"center",fontSize:19,fontWeight:600,color:"var(--text2)",marginBottom:10}}>
                Compute:
              </p>
            )}
            {problemBox}
            <input ref={inputRef} value={input}
              onChange={e=>setInput(isChase
                ?e.target.value.replace(/[^0-9]/g,"")
                :e.target.value.replace(/[^0-9-]/g,""))}
              onKeyDown={e=>e.key==="Enter"&&handleSubmit()}
              inputMode={isChase?"numeric":"text"}
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
