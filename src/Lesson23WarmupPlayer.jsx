import { useState, useEffect, useRef } from "react";
import useActivityTracking from "./core/useActivityTracking";
import { saveProgress, getProgress } from "./core/firebase";

export const TOPIC_ID = "lesson23-warmup-v1";
const STREAK_NEEDED = 2;   // sets of 3 in a row
const PER_SET = 4;

// LOGIC START
function randInt(min,max){return Math.floor(Math.random()*(max-min+1))+min;}
function pick(arr){return arr[Math.floor(Math.random()*arr.length)];}
function shuffle(arr){const a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

// n / 10^d as an exact decimal string (d may be negative: adds zeros)
function dec(n,d){
  if(d<=0) return String(n)+"0".repeat(-d);
  const s=String(n).padStart(d+1,"0");
  return (s.slice(0,s.length-d)+"."+s.slice(s.length-d)).replace(/0+$/,"").replace(/\.$/,"");
}
// "0.50" -> "0.5", ".5" -> "0.5", "1,200" -> "1200"
function normDec(s){
  s=s.replace(/[,\s]/g,"");
  if(!/^\d*\.?\d*$/.test(s)||s===""||s===".") return null;
  let [i,f=""]=s.split(".");
  i=i.replace(/^0+/,"")||"0";
  f=f.replace(/0+$/,"");
  return f?i+"."+f:i;
}
function commas(str){
  const [i,f]=str.split(".");
  return i.replace(/\B(?=(\d{3})+(?!\d))/g,",")+(f?"."+f:"");
}

// ---------- Activity 1: multiply or divide a decimal by 10, 100 or 1000 ----------
function genDecOne(){
  const places=randInt(1,3);
  const intPart=randInt(0,99);
  let frac="";for(let i=0;i<places;i++) frac+=randInt(i===places-1?1:0,9);   // last digit not 0
  const n=Number(String(intPart)+frac);                                        // value = n / 10^places
  const k=randInt(1,3),op=Math.random()<0.5?"x":"/";
  const ans=op==="x"?dec(n,places-k):dec(n,places+k);
  return{value:dec(n,places),op,k,power:Math.pow(10,k),ans};
}
function genDecSet(){
  const set=[];const seen=new Set();
  while(set.length<PER_SET){const q=genDecOne();const key=q.value+q.op+q.k;if(seen.has(key)) continue;seen.add(key);set.push(q);}
  // make sure a set has both a multiply and a divide
  if(set.every(q=>q.op===set[0].op)) return genDecSet();
  return{type:"dec",items:set};
}
function gradeDec(input,q){return normDec(input)===q.ans;}

// ---------- Activity 1: terminating decimal to a fraction ----------
function gcd(a,b){return b===0?a:gcd(b,a%b);}
function genFracOne(){
  const places=pick([1,2,2,3]);
  const whole=Math.random()<0.75?0:randInt(1,9);
  let digits="";for(let i=0;i<places;i++) digits+=randInt(i===places-1?1:0,9);   // last digit not 0
  const num=Number(String(whole)+digits),den=Math.pow(10,places);
  const g=gcd(num,den);
  return{value:dec(num,places),num,den,rn:num/g,rd:den/g};
}
function genFracSet(){
  const items=[];const seen=new Set();
  while(items.length<PER_SET){const q=genFracOne();if(seen.has(q.value)) continue;seen.add(q.value);items.push(q);}
  // at least one hundredths and one other place value
  if(!items.some(q=>q.den===100)||items.every(q=>q.den===items[0].den)) return genFracSet();
  return{type:"frac",items:items.map(q=>({...q,ans:q.num+"/"+q.den}))};
}
// Any equal fraction or mixed number counts (no need to simplify); decimals do not
function gradeFrac(input,q){
  const s=input.trim().replace(/\s*\/\s*/g,"/").replace(/\s+/g," ");
  let n,d;
  let m=s.match(/^(\d+) (\d+)\/(\d+)$/);
  if(m){const w=+m[1],a=+m[2],b=+m[3];if(b===0||a>=b) return false;n=w*b+a;d=b;}
  else if((m=s.match(/^(\d+)\/(\d+)$/))){n=+m[1];d=+m[2];if(d===0) return false;}
  else return false;
  return n*q.den===q.num*d;
}
// LOGIC END

function StreakDots({current,needed}){
  return(
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
      <span style={{fontSize:20,color:"var(--text3)"}}>Sets in a row:</span>
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

const TOPICS=[
  {id:"frac",label:"Decimals to Fractions",subLabel:"Write each decimal as a fraction",gen:genFracSet},
  {id:"dec",label:"Decimals x 10, 100, 1000",subLabel:"Multiply or divide by 10, 100 or 1000",gen:genDecSet},
];

const TIMES="\u00d7",DIVS="\u00f7";
const rowStyle={background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"12px 14px",
  display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"};
const qStyle={fontSize:24,fontWeight:800,fontFamily:"var(--mono)",whiteSpace:"nowrap"};
const inStyle={flex:"1 1 110px",minWidth:0,textAlign:"center",fontSize:24,fontFamily:"var(--mono)",fontWeight:700,padding:"8px"};

export default function Lesson23WarmupPlayer({user,topic,onHome}){
  useActivityTracking(user,TOPIC_ID,"Warmup 23 (019)");
  const topicId=topic?.id||TOPIC_ID;

  const [topicIdx,setTopicIdx]=useState(0);
  const [streak,setStreak]=useState(0);
  const [problem,setProblem]=useState(null);
  const [answers,setAnswers]=useState(Array(PER_SET).fill(""));
  const [results,setResults]=useState(null);
  const [phase,setPhase]=useState("question");
  const [loading,setLoading]=useState(true);
  const refs=[useRef(null),useRef(null),useRef(null),useRef(null)];
  const pending=useRef(null);

  const cur=TOPICS[topicIdx];

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
    setAnswers(Array(PER_SET).fill(""));setResults(null);setPhase("question");pending.current=null;
    setTimeout(()=>refs[0].current?.focus(),80);
  };

  const saveProg=async(ti,st,done)=>{
    await saveProgress(user.id,topicId,{
      started:true,completed:done,
      percentComplete:done?100:Math.round((ti/TOPICS.length)*100),
      data:{topicIdx:ti,streak:st,completed:done},
    });
  };

  const allFilled=answers.every(a=>a.trim()!=="");

  const handleSubmit=async()=>{
    if(!problem||phase!=="question"||!allFilled)return;
    const res=problem.items.map((q,i)=>problem.type==="dec"?gradeDec(answers[i],q):gradeFrac(answers[i],q));
    setResults(res);
    if(res.every(Boolean)){
      const ns=streak+1;setStreak(ns);setPhase("correct");
      if(ns>=STREAK_NEEDED){
        const next=topicIdx+1;
        if(next>=TOPICS.length){pending.current={action:"done"};await saveProg(next,0,true);}
        else{pending.current={action:"next",ti:next};await saveProg(next,0,false);}
      } else {
        pending.current={action:"stay"};await saveProg(topicIdx,ns,false);
      }
    } else {
      setStreak(0);setPhase("wrong");await saveProg(topicIdx,0,false);
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
        <p style={{color:"var(--text2)",fontSize:19,marginBottom:24}}>Ready for Classwork 23!</p>
        <button className="btn btn-primary btn-lg" style={{width:"100%"}} onClick={onHome}> Back to Home</button>
      </div>
    </div>
  );

  const p=problem;
  const qText=q=>p.type==="dec"
    ?q.value+" "+(q.op==="x"?TIMES:DIVS)+" "+commas(String(q.power))+" ="
    :q.value+" =";
  const unitAfter=q=>null;
  const explain=q=>p.type==="dec"
    ?"Move the decimal point "+q.k+" place"+(q.k>1?"s":"")+" to the "+(q.op==="x"?"right":"left")+": "+commas(q.ans)
    :q.value+" = "+q.num+"/"+q.den+(q.rd!==q.den?" = "+q.rn+"/"+q.rd+" (simplified)":"");

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
            <div style={{fontSize:22,fontWeight:800,color:"var(--green)",marginBottom:6}}>All 4 correct!</div>
            <div style={{fontSize:19,color:"var(--text3)",marginBottom:20}}>Sets in a row: {streak}/{STREAK_NEEDED}</div>
            <button className="btn btn-success" style={{width:"100%",fontSize:20,padding:"13px"}}
              onClick={handleCorrectNext}>
              {pending.current?.action==="done"?"Finish":pending.current?.action==="next"?"Next activity":"Next set"}
            </button>
          </div>
        )}

        {phase==="wrong"&&p&&results&&(
          <div style={{animation:"popIn 0.25s ease"}}>
            <div style={{fontSize:19,fontWeight:700,color:"#fca5a5",marginBottom:12,textAlign:"center"}}>
              Not all correct. Streak reset.
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:14}}>
              {p.items.map((q,i)=>(
                <div key={i} style={{...rowStyle,display:"block",
                  border:"1px solid "+(results[i]?"rgba(16,185,129,0.35)":"rgba(239,68,68,0.35)")}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                    <span style={{...qStyle,fontSize:20}}>{qText(q)}</span>
                    {results[i]
                      ?<span style={{fontSize:20,fontFamily:"var(--mono)",fontWeight:800,color:"var(--green)"}}>{answers[i]}</span>
                      :<>
                        <span style={{fontSize:19,fontFamily:"var(--mono)",color:"var(--red)",textDecoration:"line-through"}}>{answers[i]}</span>
                        <span style={{fontSize:20,fontFamily:"var(--mono)",fontWeight:800,color:"var(--green)"}}>{p.type==="frac"?q.ans:commas(q.ans)}</span>
                      </>}
                  </div>
                  {!results[i]&&<div style={{fontSize:15,fontFamily:"var(--mono)",color:"var(--text3)",marginTop:4}}>{explain(q)}</div>}
                </div>
              ))}
            </div>
            <button className="btn btn-success" style={{width:"100%",fontSize:20,padding:"13px"}}
              onClick={()=>newProblem(topicIdx)}>
              Got it - try a new set
            </button>
          </div>
        )}

        {phase==="question"&&p&&(
          <>
            <p style={{textAlign:"center",fontSize:17,color:"var(--text3)",marginBottom:10}}>
              Answer all four. All four must be correct.
            </p>
            <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:14}}>
              {p.items.map((q,i)=>(
                <div key={i} style={rowStyle}>
                  <span style={qStyle}>{qText(q)}</span>
                  <input ref={refs[i]} value={answers[i]}
                    onChange={e=>{const v=e.target.value.replace(p.type==="frac"?/[^0-9\/ ]/g:/[^0-9.,]/g,"");setAnswers(prev=>prev.map((x,j)=>j===i?v:x));}}
                    onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();if(i<PER_SET-1) refs[i+1].current?.focus();else handleSubmit();}}}
                    inputMode={p.type==="frac"?"text":"decimal"} style={inStyle}/>
                  {unitAfter(q)}
                </div>
              ))}
            </div>
            <button className="btn btn-primary" style={{width:"100%",fontSize:20,padding:"14px"}}
              onMouseDown={e=>{e.preventDefault();handleSubmit();}}
              onTouchEnd={e=>{e.preventDefault();handleSubmit();}}
              disabled={!allFilled}>
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
