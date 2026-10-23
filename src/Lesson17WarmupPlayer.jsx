import { useState, useEffect, useRef } from "react";
import useActivityTracking from "./core/useActivityTracking";
import { saveProgress, getProgress } from "./core/firebase";

export const TOPIC_ID = "lesson17-warmup-v1";
const STREAK_NEEDED = 3;

// LOGIC START
function randInt(min,max){return Math.floor(Math.random()*(max-min+1))+min;}
function pick(arr){return arr[Math.floor(Math.random()*arr.length)];}
function shuffle(arr){const a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function gcd(a,b){return b===0?a:gcd(b,a%b);}
function lcm(a,b){return(a*b)/gcd(a,b);}

// Prime factorization as [[p,e],...]
function factor(n){
  const out=[];
  for(let p=2;p<=n;p++){let e=0;while(n%p===0){n/=p;e++;}if(e)out.push([p,e]);}
  return out;
}

// Activity 1: four different numbers from 2-12 with LCM < 100.
// Sets where the LCM is just the largest number are left out.
const LCM_SETS=(()=>{
  const sets=[];
  for(let a=2;a<=12;a++)for(let b=a+1;b<=12;b++)for(let c=b+1;c<=12;c++)for(let d=c+1;d<=12;d++){
    const L=[a,b,c,d].reduce(lcm);
    if(L<100&&L!==d) sets.push([a,b,c,d]);
  }
  return sets;
})();

function genLcm(){
  const nums=shuffle(pick(LCM_SETS));
  return{type:"lcm",nums,ans:nums.reduce(lcm)};
}

// Activity 2: product rule x^n * x^m
function genProduct(){
  const n=randInt(1,9),m=randInt(1,9);
  return{type:"prod",n,m,ans:n+m};
}

function gradeLcm(input,ans){
  const s=input.trim();
  return /^\d+$/.test(s)&&+s===ans;
}

// Accepts x^k (spaces and capital X allowed)
function parsePow(input){
  const s=input.replace(/\s+/g,"").toLowerCase();
  if(s==="x") return 1;
  const m=s.match(/^x\^(\d+)$/);
  return m?+m[1]:null;
}
function gradeProduct(input,ans){return parsePow(input)===ans;}
// LOGIC END

function Pow({e,sz=34}){
  return(
    <span style={{fontSize:sz,fontWeight:800,fontFamily:"var(--mono)",fontStyle:"italic"}}>
      x{e!==1&&<sup style={{fontSize:"0.6em",fontStyle:"normal"}}>{e}</sup>}
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
          border:"2px solid "+(i<current?"var(--green)":"var(--border2)"),
          transition:"all 0.2s"}}/>
      ))}
      <span style={{fontSize:20,color:"var(--text3)"}}>{current}/{needed}</span>
    </div>
  );
}

const TOPICS=[
  {id:"lcm",label:"Least Common Multiple",subLabel:"Find the LCM of four numbers",gen:genLcm},
  {id:"prod",label:"Product Rule",subLabel:"Multiply powers with the same base",gen:genProduct},
];

const workStyle={fontFamily:"var(--mono)",fontSize:16,color:"var(--text3)",lineHeight:2.1,
  background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"10px 16px",marginBottom:12};

export default function Lesson17WarmupPlayer({user,topic,onHome}){
  useActivityTracking(user,TOPIC_ID,"Warmup 17 (019)");
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
  const isLcm=cur?.id==="lcm";

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
    const correct=p.type==="lcm"?gradeLcm(input,p.ans):gradeProduct(input,p.ans);
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
        <p style={{color:"var(--text2)",fontSize:19,marginBottom:24}}>Ready for Classwork 17!</p>
        <button className="btn btn-primary btn-lg" style={{width:"100%"}} onClick={onHome}> Back to Home</button>
      </div>
    </div>
  );

  const p=problem;

  const lcmDisplay=p&&p.type==="lcm"&&(
    <span style={{fontSize:30,fontWeight:800,fontFamily:"var(--mono)"}}>
      {p.nums.join(",  ")}
    </span>
  );
  const prodDisplay=p&&p.type==="prod"&&(
    <span style={{display:"inline-flex",alignItems:"center",gap:14}}>
      <Pow e={p.n}/>
      <span style={{fontSize:30,fontWeight:700,color:"var(--text3)"}}>&middot;</span>
      <Pow e={p.m}/>
    </span>
  );

  // Live preview of the typed power, so students can see what x^k means
  const preview=!isLcm&&input.trim()?parsePow(input):null;

  // LCM worked solution: highest power of each prime
  let lcmWork=null;
  if(p&&p.type==="lcm"){
    const best={};
    p.nums.forEach(n=>factor(n).forEach(([q,e])=>{best[q]=Math.max(best[q]||0,e);}));
    const fstr=n=>factor(n).map(([q,e])=>e>1?q+"^"+e:String(q)).join(" x ");
    const primes=Object.keys(best).map(Number).sort((a,b)=>a-b);
    lcmWork=(
      <div style={workStyle}>
        {p.nums.map(n=><div key={n}>{n} = {fstr(n)}</div>)}
        <div>Highest powers: {primes.map(q=>best[q]>1?q+"^"+best[q]:String(q)).join(" x ")}</div>
        <div>LCM = {p.ans}</div>
      </div>
    );
  }

  const ansStr=p?(p.type==="lcm"?String(p.ans):"x^"+p.ans):"";

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
              <span style={{display:"inline-flex",alignItems:"center",
                background:"var(--bg2)",borderRadius:"var(--radius)",padding:"14px 28px"}}>
                {isLcm?lcmDisplay:prodDisplay}
              </span>
            </div>
            {isLcm?lcmWork:(
              <div style={workStyle}>
                <div>Same base: add the exponents</div>
                <div>{p.n} + {p.m} = {p.ans}</div>
              </div>
            )}
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:16,marginBottom:14}}>
              {wrongAns&&<span style={{fontSize:20,fontFamily:"var(--mono)",color:"var(--red)",
                textDecoration:"line-through"}}>{wrongAns}</span>}
              {isLcm
                ?<span style={{fontSize:24,fontFamily:"var(--mono)",fontWeight:800,color:"var(--green)"}}>{ansStr}</span>
                :<span style={{color:"var(--green)"}}><Pow e={p.ans} sz={28}/></span>}
            </div>
            <button className="btn btn-success" style={{width:"100%",fontSize:20,padding:"13px"}}
              onClick={()=>newProblem(topicIdx)}>
              Got it - try again
            </button>
          </div>
        )}

        {phase==="question"&&p&&(
          <>
            <div style={{textAlign:"center",marginBottom:20}}>
              <p style={{fontSize:19,fontWeight:600,color:"var(--text2)",marginBottom:14}}>
                {isLcm?"Find the LCM of:":"Simplify:"}
              </p>
              <span style={{display:"inline-flex",alignItems:"center",
                background:"var(--bg2)",borderRadius:"var(--radius)",padding:"20px 36px"}}>
                {isLcm?lcmDisplay:prodDisplay}
              </span>
            </div>
            {!isLcm&&(
              <p style={{textAlign:"center",fontSize:16,color:"var(--text3)",marginBottom:8}}>
                Use ^ to type an exponent.
              </p>
            )}
            <input ref={inputRef} value={input}
              onChange={e=>setInput(isLcm
                ?e.target.value.replace(/[^0-9]/g,"")
                :e.target.value.replace(/[^0-9xX^ ]/g,""))}
              onKeyDown={e=>e.key==="Enter"&&handleSubmit()}
              inputMode={isLcm?"numeric":"text"} autoCapitalize="off" autoCorrect="off"
              style={{textAlign:"center",fontSize:28,fontFamily:"var(--mono)",fontWeight:700,
                padding:"12px",marginBottom:preview!=null?6:12}}/>
            {preview!=null&&(
              <div style={{textAlign:"center",marginBottom:10,color:"var(--text2)"}}>
                <Pow e={preview} sz={24}/>
              </div>
            )}
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
