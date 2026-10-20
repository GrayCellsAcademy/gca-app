import { useState, useEffect, useRef } from "react";
import useActivityTracking from "./core/useActivityTracking";
import { saveProgress, getProgress } from "./core/firebase";

export const TOPIC_ID = "lesson16-warmup-v1";
const STREAK_NEEDED = 3;

function randInt(min,max){return Math.floor(Math.random()*(max-min+1))+min;}
function pick(arr){return arr[Math.floor(Math.random()*arr.length)];}
function gcd(a,b){return b===0?a:gcd(b,a%b);}
function lcm(a,b){return(a*b)/gcd(a,b);}

// Activity 1: Simplify 2-digit/2-digit fraction where GCF is a product of >= 2 single-digit primes
const VALID_GCFS=[4,6,8,9,10,12,14,15,18,20,21,24,25,28,30,35,36];
function genSimplify(){
  for(let i=0;i<500;i++){
    const g=pick(VALID_GCFS);
    const aMin=Math.max(1,Math.ceil(10/g));
    const bMax=Math.floor(99/g);
    if(aMin>=bMax) continue;
    const a=randInt(aMin,bMax-1);
    const b=randInt(a+1,bMax);
    if(gcd(a,b)!==1) continue;
    const num=a*g,den=b*g;
    if(num<10||num>99||den<10||den>99) continue;
    return{type:"simplify",num,den,ansNum:a,ansDen:b,gcf:g};
  }
  return genSimplify();
}

// Activity 2: Add/subtract fractions where LCD < product of denominators (gcd(d1,d2) > 1)
function genAddSub(){
  for(let i=0;i<1000;i++){
    const d1=randInt(3,18),d2=randInt(3,18);
    if(d1===d2||gcd(d1,d2)===1) continue;
    const L=lcm(d1,d2);
    const n1=randInt(1,d1-1),n2=randInt(1,d2-1);
    if(gcd(n1,d1)!==1||gcd(n2,d2)!==1) continue;
    const op=Math.random()<0.5?1:-1;
    const resNum=n1*(L/d1)+op*n2*(L/d2);
    if(resNum<=0||resNum>=L) continue;
    const g=gcd(resNum,L);
    return{type:"addsub",d1,d2,n1,n2,opStr:op===1?"+":"-",L,
      resNum,ansDen:L/g,ansNum:resNum/g};
  }
  return genAddSub();
}

function gradeSimplify(input,ansNum,ansDen){
  const s=input.trim();
  const fMatch=s.match(/^(\d+)\/(\d+)$/);
  if(fMatch){
    const n=+fMatch[1],d=+fMatch[2];
    return d!==0&&gcd(n,d)===1&&n===ansNum&&d===ansDen;
  }
  if(ansDen===1){const m=s.match(/^(\d+)$/);if(m)return +m[1]===ansNum;}
  return false;
}

function gradeAddSub(input,ansNum,ansDen){
  const s=input.trim();
  const fMatch=s.match(/^(\d+)\/(\d+)$/);
  if(fMatch){
    const n=+fMatch[1],d=+fMatch[2];
    return d!==0&&gcd(n,d)===1&&n===ansNum&&d===ansDen;
  }
  if(ansDen===1){const m=s.match(/^(\d+)$/);if(m)return +m[1]===ansNum;}
  return false;
}

function Frac({n,d,sz=26}){
  return(
    <span style={{display:"inline-flex",flexDirection:"column",alignItems:"center",
      gap:1,verticalAlign:"middle",margin:"0 3px"}}>
      <span style={{fontSize:sz,fontWeight:900,fontFamily:"var(--mono)",lineHeight:1.1}}>{n}</span>
      <span style={{display:"block",width:"100%",minWidth:20,height:2,
        background:"currentColor",borderRadius:1}}/>
      <span style={{fontSize:sz,fontWeight:900,fontFamily:"var(--mono)",lineHeight:1.1}}>{d}</span>
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
  {id:"simplify",label:"Simplifying Fractions",subLabel:"Reduce to lowest terms",gen:genSimplify},
  {id:"addsub",label:"Add & Subtract Fractions",subLabel:"Find the LCD and reduce your answer",gen:genAddSub},
];

export default function Lesson16WarmupPlayer({user,topic,onHome}){
  useActivityTracking(user,TOPIC_ID,"Warmup 16 (019)");
  const topicId=topic?.id||TOPIC_ID;

  const [topicIdx,setTopicIdx]=useState(0);
  const [streak,setStreak]=useState(0);
  const [problem,setProblem]=useState(null);
  const [input,setInput]=useState("");
  const [phase,setPhase]=useState("question");
  const [loading,setLoading]=useState(true);
  const [wrongAns,setWrongAns]=useState(null);
  const inputRef=useRef(null);
  const pendingProgress=useRef(null);

  const currentTopic=TOPICS[topicIdx];

  useEffect(()=>{
    const load=async()=>{
      const prog=await getProgress(user.id,topicId);
      if(prog?.data){
        const{topicIdx:ti,streak:st}=prog.data;
        setTopicIdx(Math.min(ti||0,TOPICS.length-1));
        setStreak(st||0);
      }
      setLoading(false);
    };load();
  },[]);

  useEffect(()=>{if(!loading)newProblem(topicIdx);},[topicIdx,loading]);

  const newProblem=(ti)=>{
    setProblem(TOPICS[ti]?.gen());
    setInput("");setPhase("question");setWrongAns(null);pendingProgress.current=null;
    setTimeout(()=>inputRef.current?.focus(),80);
  };

  const saveProg=async(ti,st,done)=>{
    await saveProgress(user.id,topicId,{
      started:true,completed:done,
      percentComplete:done?100:Math.round((ti/TOPICS.length)*100),
      data:{topicIdx:ti,streak:st},
    });
  };

  const handleSubmit=async()=>{
    if(!problem||phase!=="question"||!input.trim())return;
    const p=problem;
    const correct=p.type==="simplify"
      ?gradeSimplify(input,p.ansNum,p.ansDen)
      :gradeAddSub(input,p.ansNum,p.ansDen);
    if(correct){
      const ns=streak+1;setStreak(ns);setPhase("correct");
      if(ns>=STREAK_NEEDED){
        const next=topicIdx+1;
        if(next>=TOPICS.length){
          pendingProgress.current={action:"done"};await saveProg(next,0,true);
        } else {
          pendingProgress.current={action:"next",ti:next};await saveProg(next,0,false);
        }
      } else {
        pendingProgress.current={action:"stay"};await saveProg(topicIdx,ns,false);
      }
    } else {
      setStreak(0);setWrongAns(input);setPhase("wrong");await saveProg(topicIdx,0,false);
    }
  };

  const handleCorrectNext=()=>{
    const p=pendingProgress.current;if(!p)return;
    if(p.action==="done") setPhase("celebration");
    else if(p.action==="next"){setTopicIdx(p.ti);setStreak(0);}
    else newProblem(topicIdx);
  };

  if(loading)return(
    <div style={{display:"flex",justifyContent:"center",padding:60}}>
      <div className="spinner"/>
    </div>
  );

  if(phase==="celebration"||topicIdx>=TOPICS.length)return(
    <div style={{maxWidth:520,margin:"0 auto",textAlign:"center",animation:"fadeUp 0.4s ease"}}>
      <div className="card">
        <div style={{fontSize:64,marginBottom:16}}></div>
        <h2 style={{fontSize:28,fontWeight:800,marginBottom:8}}>Warmup Complete!</h2>
        <p style={{color:"var(--text2)",fontSize:19,marginBottom:24}}>Ready for Classwork 16!</p>
        <button className="btn btn-primary btn-lg" style={{width:"100%"}} onClick={onHome}>
           Back to Home
        </button>
      </div>
    </div>
  );

  const pr=problem;
  const ansStr=pr?(pr.ansDen===1?String(pr.ansNum):pr.ansNum+"/"+pr.ansDen):"";
  const isSimplify=currentTopic.id==="simplify";

  return(
    <div style={{maxWidth:620,margin:"0 auto",animation:"fadeUp 0.3s ease"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
        marginBottom:16,flexWrap:"wrap",gap:8}}>
        <div>
          <div style={{fontSize:19,color:"var(--text3)",marginBottom:2}}>
            Activity {topicIdx+1} of {TOPICS.length} &mdash; {currentTopic.label}
          </div>
          <div style={{fontSize:20,fontWeight:700,color:"var(--blue)"}}>{currentTopic.subLabel}</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onHome}> Home</button>
      </div>

      <div style={{marginBottom:16}}>
        <div style={{height:5,background:"var(--surface2)",borderRadius:99,overflow:"hidden"}}>
          <div style={{height:"100%",
            width:`${(topicIdx/TOPICS.length)*100}%`,
            background:"linear-gradient(90deg,var(--blue),var(--cyan))",
            borderRadius:99,transition:"width 0.4s ease"}}/>
        </div>
      </div>

      <div className="card">
        <StreakDots current={streak} needed={STREAK_NEEDED}/>

        {phase==="correct"&&(
          <div style={{animation:"popIn 0.25s ease",textAlign:"center"}}>
            <div style={{fontSize:28,marginBottom:8}}></div>
            <div style={{fontSize:22,fontWeight:800,color:"var(--green)",marginBottom:6}}>Correct!</div>
            <div style={{fontSize:19,color:"var(--text3)",marginBottom:20}}>
              Streak: {streak}/{STREAK_NEEDED}
            </div>
            <button className="btn btn-success"
              style={{width:"100%",fontSize:20,padding:"13px"}}
              onClick={handleCorrectNext}>
               Next problem
            </button>
          </div>
        )}

        {phase==="wrong"&&pr&&(
          <div style={{animation:"popIn 0.25s ease"}}>
            <div style={{fontSize:19,fontWeight:700,color:"#fca5a5",marginBottom:12,textAlign:"center"}}>
              Not quite! Streak reset.
            </div>

            {isSimplify&&(
              <>
                <div style={{textAlign:"center",marginBottom:12}}>
                  <span style={{display:"inline-flex",alignItems:"center",
                    background:"var(--bg2)",borderRadius:"var(--radius)",padding:"14px 36px"}}>
                    <Frac n={pr.num} d={pr.den}/>
                  </span>
                </div>
                <div style={{fontFamily:"var(--mono)",fontSize:16,color:"var(--text3)",lineHeight:2.1,
                  background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"10px 16px",marginBottom:12}}>
                  <div>GCF({pr.num}, {pr.den}) = {pr.gcf}</div>
                  <div>{pr.num} / {pr.gcf} = {pr.ansNum}</div>
                  <div>{pr.den} / {pr.gcf} = {pr.ansDen}</div>
                </div>
              </>
            )}

            {!isSimplify&&(
              <>
                <div style={{textAlign:"center",marginBottom:12}}>
                  <span style={{display:"inline-flex",alignItems:"center",gap:10,
                    background:"var(--bg2)",borderRadius:"var(--radius)",padding:"14px 24px"}}>
                    <Frac n={pr.n1} d={pr.d1}/>
                    <span style={{fontSize:28,fontWeight:700,color:"var(--text3)"}}>{pr.opStr}</span>
                    <Frac n={pr.n2} d={pr.d2}/>
                  </span>
                </div>
                <div style={{fontFamily:"var(--mono)",fontSize:16,color:"var(--text3)",lineHeight:2.1,
                  background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"10px 16px",marginBottom:12}}>
                  <div>LCD({pr.d1}, {pr.d2}) = {pr.L}</div>
                  <div>{pr.n1}/{pr.d1} = {pr.n1*(pr.L/pr.d1)}/{pr.L}</div>
                  <div>{pr.n2}/{pr.d2} = {pr.n2*(pr.L/pr.d2)}/{pr.L}</div>
                  <div>
                    {pr.n1*(pr.L/pr.d1)}/{pr.L} {pr.opStr} {pr.n2*(pr.L/pr.d2)}/{pr.L} = {pr.resNum}/{pr.L}
                  </div>
                  {(pr.resNum!==pr.ansNum||pr.L!==pr.ansDen)&&(
                    <div>Reduced: {pr.ansNum}/{pr.ansDen}</div>
                  )}
                </div>
              </>
            )}

            <div style={{textAlign:"center",marginBottom:14}}>
              {wrongAns&&(
                <span style={{fontSize:20,fontFamily:"var(--mono)",color:"var(--red)",
                  textDecoration:"line-through",marginRight:16}}>{wrongAns}</span>
              )}
              <span style={{fontSize:24,fontFamily:"var(--mono)",fontWeight:800,
                color:"var(--green)"}}>{ansStr}</span>
            </div>
            <button className="btn btn-success"
              style={{width:"100%",fontSize:20,padding:"13px"}}
              onClick={()=>newProblem(topicIdx)}>
              Got it - try again
            </button>
          </div>
        )}

        {phase==="question"&&pr&&(
          <>
            {isSimplify&&(
              <div style={{textAlign:"center",marginBottom:20}}>
                <p style={{fontSize:19,fontWeight:600,color:"var(--text2)",marginBottom:14}}>
                  Simplify the fraction:
                </p>
                <span style={{display:"inline-flex",alignItems:"center",
                  background:"var(--bg2)",borderRadius:"var(--radius)",padding:"22px 44px"}}>
                  <Frac n={pr.num} d={pr.den} sz={34}/>
                </span>
              </div>
            )}

            {!isSimplify&&(
              <div style={{textAlign:"center",marginBottom:20}}>
                <p style={{fontSize:19,fontWeight:600,color:"var(--text2)",marginBottom:14}}>
                  Compute and reduce:
                </p>
                <span style={{display:"inline-flex",alignItems:"center",gap:12,
                  background:"var(--bg2)",borderRadius:"var(--radius)",padding:"18px 30px"}}>
                  <Frac n={pr.n1} d={pr.d1} sz={30}/>
                  <span style={{fontSize:32,fontWeight:700,color:"var(--text3)"}}>{pr.opStr}</span>
                  <Frac n={pr.n2} d={pr.d2} sz={30}/>
                </span>
              </div>
            )}

            <p style={{textAlign:"center",fontSize:16,color:"var(--text3)",marginBottom:8}}>
              Write as n/d in lowest terms.
            </p>
            <input ref={inputRef} value={input}
              onChange={e=>setInput(e.target.value.replace(/[^0-9/]/g,""))}
              onKeyDown={e=>e.key==="Enter"&&handleSubmit()}
              inputMode="decimal" placeholder="n/d"
              style={{textAlign:"center",fontSize:28,fontFamily:"var(--mono)",
                fontWeight:700,padding:"12px",marginBottom:12}}/>
            <button className="btn btn-primary"
              style={{width:"100%",fontSize:20,padding:"14px"}}
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
              {done?" ":active?" ":""}{t.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
