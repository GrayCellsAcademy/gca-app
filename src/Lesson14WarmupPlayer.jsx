import { useState, useEffect, useRef } from "react";
import useActivityTracking from "./core/useActivityTracking";
import { saveProgress, getProgress } from "./core/firebase";

export const TOPIC_ID = "lesson14-warmup-v1";
const STREAK_NEEDED = 2;

function randInt(min,max){return Math.floor(Math.random()*(max-min+1))+min;}
function pick(arr){return arr[Math.floor(Math.random()*arr.length)];}
function gcd(a,b){return b===0?a:gcd(b,a%b);}

//  Activity 1: Word problems - dividing a whole into equal parts
const CONTEXTS = [
  { name:"rope",
    prompt:(w,n)=>`A ${w} ft rope was cut into ${n} equal pieces. How long is each piece?`,
    unit:"ft" },
  { name:"ribbon",
    prompt:(w,n)=>`A ${w} m ribbon was cut into ${n} equal pieces. How long is each piece?`,
    unit:"m" },
  { name:"pizza",
    prompt:(_,n)=>`A pizza was divided equally among ${n} people. What fraction of the pizza did each person get?`,
    unit:"of the pizza", fixedW:1 },
  { name:"chocolate",
    prompt:(_,n)=>`A chocolate bar was broken into ${n} equal pieces. What fraction of the bar is each piece?`,
    unit:"of the bar", fixedW:1 },
  { name:"flour",
    prompt:(w,n)=>`A ${w} kg bag of flour was divided equally into ${n} portions. How much flour is in each portion?`,
    unit:"kg" },
  { name:"field",
    prompt:(w,n)=>`A ${w} acre field was divided into ${n} equal plots. How large is each plot?`,
    unit:"acres" },
  { name:"water",
    prompt:(w,n)=>`A ${w} liter tank of water was poured equally into ${n} containers. How much is in each container?`,
    unit:"liters" },
  { name:"journey",
    prompt:(w,n)=>`A ${w} mile journey was split into ${n} equal stages. How long is each stage?`,
    unit:"miles" },
];

function genWordProblem() {
  const ctx = pick(CONTEXTS);
  const n = randInt(2, 9);
  const q = randInt(1, 10);
  const w = ctx.fixedW ? ctx.fixedW * n : n * q;
  const answer = ctx.fixedW ? 1 : q;
  return { type:'word', prompt:ctx.prompt(w,n), unit:ctx.unit, w, n, answer };
}

function gradeWordProblem(input, prob) {
  // Accept "a/b" - check cross-multiplication: a*n == b*w
  const s = input.trim().replace(/\s+/g,'');
  const m = s.match(/^(\d+)\/(\d+)$/);
  if (!m) return false;
  const a = parseInt(m[1],10), b = parseInt(m[2],10);
  return b > 0 && a * prob.n === b * prob.w;
}

//  Activity 2: GCF of 2 two-digit numbers
function genGCF2() {
  for (let attempt=0; attempt<500; attempt++) {
    const g=randInt(2,9);
    let a,b;
    do { a=randInt(2,12); b=randInt(2,12); } while(a===b||gcd(a,b)!==1);
    const n1=g*a, n2=g*b;
    if(n1<10||n1>99||n2<10||n2>99) continue;
    return { type:'gcf', nums:[Math.min(n1,n2),Math.max(n1,n2)], gcf:g };
  }
  return genGCF2();
}

//  Streak Dots
function StreakDots({current,needed}){
  return(
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
      <span style={{fontSize:20,color:"var(--text3)"}}>Streak:</span>
      {Array.from({length:needed}).map((_,i)=>(
        <div key={i} style={{width:13,height:13,borderRadius:"50%",
          background:i<current?"var(--green)":"var(--surface2)",
          border:`2px solid ${i<current?"var(--green)":"var(--border2)"}`,transition:"all 0.2s"}}/>
      ))}
      <span style={{fontSize:20,color:"var(--text3)"}}>{current}/{needed}</span>
    </div>
  );
}

const TOPICS = [
  { id:"word", label:"Fractions as Division", subLabel:"Enter your answer as a whole number", gen:genWordProblem },
  { id:"gcf",  label:"Greatest Common Factor", subLabel:"Find the GCF of two numbers", gen:genGCF2 },
];

export default function Lesson14WarmupPlayer({ user, topic, onHome }) {
  useActivityTracking(user, TOPIC_ID, "Warmup 14 (019)");
  const topicId = topic?.id || TOPIC_ID;

  const [topicIdx, setTopicIdx] = useState(0);
  const [streak, setStreak] = useState(0);
  const [problem, setProblem] = useState(null);
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState("question");
  const [loading, setLoading] = useState(true);
  const inputRef = useRef(null);
  const pendingProgress = useRef(null);

  const currentTopic = TOPICS[topicIdx];

  useEffect(()=>{
    const load=async()=>{
      const prog=await getProgress(user.id,topicId);
      if(prog?.data){const{topicIdx:ti,streak:st}=prog.data;setTopicIdx(Math.min(ti||0,TOPICS.length-1));setStreak(st||0);}
      setLoading(false);
    };load();
  },[]);

  useEffect(()=>{if(!loading)newProblem(topicIdx);},[topicIdx,loading]);

  const newProblem=(ti)=>{
    setProblem(TOPICS[ti]?.gen());
    setInput("");setPhase("question");pendingProgress.current=null;
    setTimeout(()=>inputRef.current?.focus(),80);
  };

  const saveProgress_=async(ti,st,done)=>{
    await saveProgress(user.id,topicId,{
      started:true,completed:done,
      percentComplete:done?100:Math.round((ti/TOPICS.length)*100),
      data:{topicIdx:ti,streak:st},
    });
  };

  const handleCorrect=async()=>{
    const newStreak=streak+1;setStreak(newStreak);setPhase("correct");
    if(newStreak>=STREAK_NEEDED){
      const nextTi=topicIdx+1;
      if(nextTi>=TOPICS.length){pendingProgress.current={action:"done"};await saveProgress_(nextTi,0,true);}
      else{pendingProgress.current={action:"next",ti:nextTi};await saveProgress_(nextTi,0,false);}
    } else{pendingProgress.current={action:"stay"};await saveProgress_(topicIdx,newStreak,false);}
  };

  const handleWrong=async()=>{setStreak(0);setPhase("wrong");await saveProgress_(topicIdx,0,false);};

  const handleSubmit=async()=>{
    if(!problem||phase!=="question"||!input.trim())return;
    const correct=problem.type==="word"
      ?parseInt(input.trim(),10)===problem.answer
      :parseInt(input.trim(),10)===problem.gcf;
    if(correct)await handleCorrect(); else await handleWrong();
  };

  const handleCorrectNext=()=>{
    const p=pendingProgress.current;if(!p)return;
    if(p.action==="done")setPhase("celebration");
    else if(p.action==="next"){setTopicIdx(p.ti);setStreak(0);}
    else newProblem(topicIdx);
  };

  if(loading)return<div style={{display:"flex",justifyContent:"center",padding:60}}><div className="spinner"/></div>;

  if(phase==="celebration"||topicIdx>=TOPICS.length)return(
    <div style={{maxWidth:520,margin:"0 auto",textAlign:"center",animation:"fadeUp 0.4s ease"}}>
      <div className="card">
        <div style={{fontSize:64,marginBottom:16}}></div>
        <h2 style={{fontSize:28,fontWeight:800,marginBottom:8}}>Warmup Complete!</h2>
        <p style={{color:"var(--text2)",fontSize:19,marginBottom:24}}>Ready for Classwork 14!</p>
        <button className="btn btn-primary btn-lg" style={{width:"100%"}} onClick={onHome}> Back to Home</button>
      </div>
    </div>
  );

  const isWord=currentTopic.id==="word";
  const isGCF=currentTopic.id==="gcf";

  return(
    <div style={{maxWidth:620,margin:"0 auto",animation:"fadeUp 0.3s ease"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:8}}>
        <div>
          <div style={{fontSize:19,color:"var(--text3)",marginBottom:2}}>Activity {topicIdx+1} of {TOPICS.length} - {currentTopic.label}</div>
          <div style={{fontSize:20,fontWeight:700,color:"var(--blue)"}}>{currentTopic.subLabel}</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onHome}> Home</button>
      </div>
      <div style={{marginBottom:16}}>
        <div style={{height:5,background:"var(--surface2)",borderRadius:99,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${(topicIdx/TOPICS.length)*100}%`,background:"linear-gradient(90deg,var(--blue),var(--cyan))",borderRadius:99}}/>
        </div>
      </div>

      <div className="card">
        <StreakDots current={streak} needed={STREAK_NEEDED}/>

        {phase==="correct"&&(
          <div style={{animation:"popIn 0.25s ease",textAlign:"center"}}>
            <div style={{fontSize:28,marginBottom:8}}></div>
            <div style={{fontSize:22,fontWeight:800,color:"var(--green)",marginBottom:6}}>Correct!</div>
            <div style={{fontSize:19,color:"var(--text3)",marginBottom:20}}>Streak: {streak}/{STREAK_NEEDED}</div>
            <button className="btn btn-success" style={{width:"100%",fontSize:20,padding:"13px"}} onClick={handleCorrectNext}> Next problem</button>
          </div>
        )}

        {phase==="wrong"&&problem&&(
          <div style={{animation:"popIn 0.25s ease"}}>
            <div style={{fontSize:19,fontWeight:700,color:"#fca5a5",marginBottom:12,textAlign:"center"}}>Not quite! Streak reset.</div>
            {isWord&&(
              <div style={{background:"var(--bg2)",borderRadius:"var(--radius)",padding:"14px 18px",marginBottom:10,fontSize:19}}>{problem.prompt}</div>
            )}
            {isGCF&&(
              <div style={{textAlign:"center",fontSize:28,fontWeight:900,fontFamily:"var(--mono)",marginBottom:10}}>
                {problem.nums[0]} and {problem.nums[1]}
              </div>
            )}
            <div style={{textAlign:"center",marginBottom:12}}>
              <span style={{fontSize:22,fontFamily:"var(--mono)",fontWeight:800,color:"var(--green)"}}>
                {isWord?`${problem.answer}`:problem.gcf}
              </span>
            </div>
            <button className="btn btn-success" style={{width:"100%",fontSize:20,padding:"13px"}} onClick={()=>newProblem(topicIdx)}>Got it - try again</button>
          </div>
        )}

        {phase==="question"&&problem&&(
          <>
            {isWord&&(
              <div style={{background:"var(--bg2)",borderRadius:"var(--radius)",padding:"16px 20px",marginBottom:20,fontSize:19,lineHeight:1.8}}>
                {problem.prompt}
              </div>
            )}
            {isGCF&&(
              <div style={{textAlign:"center",marginBottom:20}}>
                <p style={{fontSize:19,fontWeight:600,color:"var(--text2)",marginBottom:10}}>Find the GCF of:</p>
                <div style={{display:"flex",gap:16,justifyContent:"center"}}>
                  {problem.nums.map((n,i)=>(
                    <div key={i} style={{background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"14px 24px",fontSize:36,fontWeight:900,fontFamily:"var(--mono)"}}>{n}</div>
                  ))}
                </div>
              </div>
            )}
            <input ref={inputRef} value={input}
              onChange={e=>setInput(e.target.value.replace(isWord?/[^0-9/]/g:/[^0-9]/g,""))}
              onKeyDown={e=>e.key==="Enter"&&handleSubmit()}
              inputMode="numeric"
              placeholder=""
              style={{textAlign:"center",fontSize:26,fontFamily:"var(--mono)",fontWeight:700,padding:"12px",marginBottom:12}}/>
            <button className="btn btn-primary" style={{width:"100%",fontSize:20,padding:"14px"}}
              onMouseDown={e=>{e.preventDefault();handleSubmit();}}
              onTouchEnd={e=>{e.preventDefault();handleSubmit();}}
              disabled={!input.trim()}>
              Submit
            </button>
          </>
        )}
      </div>

      <div style={{marginTop:16,display:"flex",gap:6}}>
        {TOPICS.map((t,i)=>{
          const done=i<topicIdx,active=i===topicIdx;
          return(<div key={t.id} style={{fontSize:20,fontWeight:700,padding:"4px 14px",borderRadius:99,
            background:done?"rgba(16,185,129,0.15)":active?"rgba(59,130,246,0.15)":"var(--surface)",
            color:done?"var(--green)":active?"var(--blue)":"var(--text3)",
            border:`1px solid ${done?"rgba(16,185,129,0.3)":active?"rgba(59,130,246,0.3)":"var(--border)"}`}}>
            {done?" ":active?" ":""}{t.label}
          </div>);
        })}
      </div>
    </div>
  );
}
