import { useState, useEffect, useRef } from "react";
import useActivityTracking from "./core/useActivityTracking";
import { saveProgress, getProgress } from "./core/firebase";

export const TOPIC_ID = "lesson12-warmup-v1";
const STREAK_NEEDED = 2;

function randInt(min,max){return Math.floor(Math.random()*(max-min+1))+min;}
function pick(arr){return arr[Math.floor(Math.random()*arr.length)];}
function shuffle(arr){const a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

//  Activity 1: Long Division with zero in tens or hundreds place
function genDivProblem() {
  for (let attempt=0; attempt<1000; attempt++) {
    const d = randInt(6, 9);
    const zeroPos = Math.random() < 0.5 ? 'tens' : 'hundreds';
    let q;
    if (zeroPos === 'tens') {
      const use4 = Math.random() < 0.5;
      if (use4) {
        const a=randInt(1,9), b=randInt(1,9), c=randInt(0,9);
        q = a*1000 + b*100 + c;
      } else {
        const a=randInt(2,9), c=randInt(0,9);
        q = a*100 + c;
      }
    } else {
      const a=randInt(1,9), b=randInt(1,9), c=randInt(0,9);
      q = a*1000 + b*10 + c;
    }
    const dividend = q * d;
    const dStr = dividend.toString();
    if (dStr.length < 4 || dStr.length > 5) continue;
    const qStr = q.toString();
    const tensDigit = parseInt(qStr[qStr.length-2]||'0');
    const hundredsDigit = parseInt(qStr[qStr.length-3]||'0');
    if (zeroPos==='tens' && tensDigit !== 0) continue;
    if (zeroPos==='hundreds' && hundredsDigit !== 0) continue;
    return { type:'div', dividend, divisor:d, quotient:q, zeroPos };
  }
  return null;
}

//  Activity 2: 8 Signed Arithmetic Forms at Once
function genSignedEight() {
  let a,b;
  do { a=randInt(1,9); b=randInt(1,9); } while(a>=b);
  const problems = shuffle([
    {display:`${a} + ${b}`,        answer:a+b},
    {display:`${a} + (-${b})`,     answer:a-b},
    {display:`-${a} + ${b}`,       answer:b-a},
    {display:`-${a} + (-${b})`,    answer:-(a+b)},
    {display:`${a} - ${b}`,        answer:a-b},
    {display:`${a} - (-${b})`,     answer:a+b},
    {display:`-${a} - ${b}`,       answer:-(a+b)},
    {display:`-${a} - (-${b})`,    answer:b-a},
  ]);
  return { type:'signed-eight', a, b, problems };
}

//  Streak Dots
function StreakDots({ current, needed }) {
  return (
    <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:16 }}>
      <span style={{ fontSize:20,color:"var(--text3)" }}>Streak:</span>
      {Array.from({length:needed}).map((_,i)=>(
        <div key={i} style={{ width:13,height:13,borderRadius:"50%",
          background:i<current?"var(--green)":"var(--surface2)",
          border:`2px solid ${i<current?"var(--green)":"var(--border2)"}`,transition:"all 0.2s" }} />
      ))}
      <span style={{ fontSize:20,color:"var(--text3)" }}>{current}/{needed}</span>
    </div>
  );
}

//  8-problem grid
function SignedEightGrid({ problems, onSubmit }) {
  const [answers, setAnswers] = useState(Array(8).fill(""));
  const refs = Array.from({length:8}, ()=>useRef(null));

  useEffect(()=>{
    setAnswers(Array(8).fill(""));
    setTimeout(()=>refs[0].current?.focus(), 80);
  }, [problems]);

  const setAnswer = (i,val) => setAnswers(prev=>{const n=[...prev];n[i]=val.replace(/[^0-9\-]/g,"");return n;});
  const handleKey = (e,i) => { if(e.key==="Enter"){if(i<7)refs[i+1].current?.focus(); else onSubmit(answers);} };
  const allFilled = answers.every(a=>a.trim()!=="");

  return (
    <div>
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16 }}>
        {problems.map((p,i)=>(
          <div key={i} style={{ background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"10px 12px" }}>
            <div style={{ fontSize:18,fontWeight:700,fontFamily:"var(--mono)",color:"var(--text)",marginBottom:6,textAlign:"center" }}>
              {p.display} =
            </div>
            <input ref={refs[i]} value={answers[i]}
              onChange={e=>setAnswer(i,e.target.value)}
              onKeyDown={e=>handleKey(e,i)}
              inputMode="numeric" placeholder=""
              style={{ textAlign:"center",fontSize:22,fontFamily:"var(--mono)",fontWeight:700,padding:"6px",width:"100%",borderRadius:"var(--radius-sm)" }} />
          </div>
        ))}
      </div>
      <button className="btn btn-primary" style={{ width:"100%",fontSize:20,padding:"14px" }}
        onMouseDown={e=>{e.preventDefault();onSubmit(answers);}}
        onTouchEnd={e=>{e.preventDefault();onSubmit(answers);}}
        disabled={!allFilled}>
        Submit All
      </button>
    </div>
  );
}

const TOPICS = [
  { id:"div",         label:"Long Division",           subLabel:"4-5 digit \u00f7 single digit (watch for zeros!)", gen:genDivProblem },
  { id:"signed-eight",label:"Signed Arithmetic",       subLabel:"All 8 forms at once",                             gen:genSignedEight },
];

export default function Lesson12WarmupPlayer({ user, topic, onHome }) {
  useActivityTracking(user, TOPIC_ID, "Warmup 12 (019)");
  const topicId = topic?.id || TOPIC_ID;

  const [topicIdx, setTopicIdx] = useState(0);
  const [streak, setStreak] = useState(0);
  const [problem, setProblem] = useState(null);
  const [phase, setPhase] = useState("question");
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const inputRef = useRef(null);
  const pendingProgress = useRef(null);

  const currentTopic = TOPICS[topicIdx];

  useEffect(()=>{
    const load=async()=>{
      const prog=await getProgress(user.id, topicId);
      if(prog?.data){const{topicIdx:ti,streak:st}=prog.data;setTopicIdx(Math.min(ti||0,TOPICS.length-1));setStreak(st||0);}
      setLoading(false);
    };
    load();
  },[]);

  useEffect(()=>{if(!loading)newProblem(topicIdx);},[topicIdx,loading]);

  const newProblem=(ti)=>{
    setProblem(TOPICS[ti]?.gen());
    setInput(""); setPhase("question"); pendingProgress.current=null;
    setTimeout(()=>inputRef.current?.focus(),80);
  };

  const saveProgress_=async(ti,st,done)=>{
    await saveProgress(user.id, topicId,{
      started:true, completed:done,
      percentComplete:done?100:Math.round((ti/TOPICS.length)*100),
      data:{topicIdx:ti, streak:st},
    });
  };

  const handleCorrect=async()=>{
    const newStreak=streak+1; setStreak(newStreak); setPhase("correct");
    if(newStreak>=STREAK_NEEDED){
      const nextTi=topicIdx+1;
      if(nextTi>=TOPICS.length){pendingProgress.current={action:"done"};await saveProgress_(nextTi,0,true);}
      else{pendingProgress.current={action:"next",ti:nextTi};await saveProgress_(nextTi,0,false);}
    } else{pendingProgress.current={action:"stay"};await saveProgress_(topicIdx,newStreak,false);}
  };

  const handleWrong=async()=>{setStreak(0);setPhase("wrong");await saveProgress_(topicIdx,0,false);};

  const handleDivSubmit=async()=>{
    const n=parseInt(input.trim(),10);
    if(!isNaN(n)&&n===problem.quotient) await handleCorrect(); else await handleWrong();
  };

  const handleSignedSubmit=async(answers)=>{
    const allCorrect=answers.every((v,i)=>{const n=parseInt(v.trim(),10);return !isNaN(n)&&n===problem.problems[i].answer;});
    if(allCorrect) await handleCorrect(); else await handleWrong();
  };

  const handleCorrectNext=()=>{
    const p=pendingProgress.current; if(!p) return;
    if(p.action==="done") setPhase("celebration");
    else if(p.action==="next"){setTopicIdx(p.ti);setStreak(0);}
    else newProblem(topicIdx);
  };

  if(loading) return <div style={{display:"flex",justifyContent:"center",padding:60}}><div className="spinner"/></div>;

  if(phase==="celebration"||topicIdx>=TOPICS.length) return (
    <div style={{maxWidth:520,margin:"0 auto",textAlign:"center",animation:"fadeUp 0.4s ease"}}>
      <div className="card">
        <div style={{fontSize:64,marginBottom:16}}></div>
        <h2 style={{fontSize:28,fontWeight:800,marginBottom:8}}>Warmup Complete!</h2>
        <p style={{color:"var(--text2)",fontSize:19,marginBottom:24}}>Ready for Classwork 12!</p>
        <button className="btn btn-primary btn-lg" style={{width:"100%"}} onClick={onHome}> Back to Home</button>
      </div>
    </div>
  );

  const isDiv=currentTopic.id==="div";
  const isSigned=currentTopic.id==="signed-eight";

  return (
    <div style={{maxWidth:640,margin:"0 auto",animation:"fadeUp 0.3s ease"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:8}}>
        <div>
          <div style={{fontSize:19,color:"var(--text3)",marginBottom:2}}>Activity {topicIdx+1} of {TOPICS.length} - {currentTopic.label}</div>
          <div style={{fontSize:20,fontWeight:700,color:"var(--blue)"}}>{currentTopic.subLabel}</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onHome}> Home</button>
      </div>
      <div style={{marginBottom:16}}>
        <div style={{height:5,background:"var(--surface2)",borderRadius:99,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${(topicIdx/TOPICS.length)*100}%`,background:"linear-gradient(90deg,var(--blue),var(--cyan))",borderRadius:99}} />
        </div>
      </div>

      <div className="card">
        <StreakDots current={streak} needed={STREAK_NEEDED} />

        {phase==="correct"&&(
          <div style={{animation:"popIn 0.25s ease",textAlign:"center"}}>
            <div style={{fontSize:28,marginBottom:8}}></div>
            <div style={{fontSize:22,fontWeight:800,color:"var(--green)",marginBottom:6}}>
              {isSigned?"All 8 correct!":"Correct!"}
            </div>
            <div style={{fontSize:19,color:"var(--text3)",marginBottom:20}}>Streak: {streak}/{STREAK_NEEDED}</div>
            <button className="btn btn-success" style={{width:"100%",fontSize:20,padding:"13px"}} onClick={handleCorrectNext}> Next problem</button>
          </div>
        )}

        {phase==="wrong"&&problem&&(
          <div style={{animation:"popIn 0.25s ease"}}>
            <div style={{fontSize:19,fontWeight:700,color:"#fca5a5",marginBottom:12,textAlign:"center"}}>Not quite! Streak reset.</div>
            {isDiv&&(
              <div style={{textAlign:"center",marginBottom:12}}>
                <div style={{fontSize:26,fontFamily:"var(--mono)",fontWeight:800,marginBottom:8}}>
                  {problem.dividend.toLocaleString()} \u00f7 {problem.divisor}
                </div>
                <div style={{fontSize:22,fontWeight:700}}>
                  = <span style={{color:"var(--green)"}}>{problem.quotient.toLocaleString()}</span>
                </div>
                <div style={{fontSize:17,color:"var(--text3)",marginTop:6}}>
                  Check: {problem.quotient.toLocaleString()} {'\u00d7'} {problem.divisor} = {problem.dividend.toLocaleString()}
                </div>
                <div style={{fontSize:17,color:"var(--amber)",marginTop:4}}>
                  Note the zero in the {problem.zeroPos} place!
                </div>
              </div>
            )}
            {isSigned&&(
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:12}}>
                {problem.problems.map((p,i)=>(
                  <div key={i} style={{fontSize:17,fontFamily:"var(--mono)",fontWeight:700,
                    background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"6px 10px",textAlign:"center"}}>
                    {p.display} = <span style={{color:"var(--green)"}}>{p.answer}</span>
                  </div>
                ))}
              </div>
            )}
            <button className="btn btn-success" style={{width:"100%",fontSize:20,padding:"13px"}} onClick={()=>newProblem(topicIdx)}>Got it - try again</button>
          </div>
        )}

        {phase==="question"&&problem&&(
          <>
            {isDiv&&(
              <>
                <p style={{textAlign:"center",fontSize:19,fontWeight:600,color:"var(--text2)",marginBottom:16}}>
                  Find the quotient. (Hint: watch for a zero placeholder!)
                </p>
                <div style={{textAlign:"center",fontSize:32,fontFamily:"var(--mono)",fontWeight:900,
                  background:"var(--bg2)",borderRadius:"var(--radius)",padding:"18px",marginBottom:20}}>
                  {problem.dividend.toLocaleString()} {'\u00f7'} {problem.divisor}
                </div>
                <input ref={inputRef} value={input}
                  onChange={e=>setInput(e.target.value.replace(/[^0-9]/g,""))}
                  onKeyDown={e=>e.key==="Enter"&&handleDivSubmit()}
                  inputMode="numeric" placeholder="?"
                  style={{textAlign:"center",fontSize:28,fontFamily:"var(--mono)",fontWeight:700,padding:"12px",marginBottom:12}} />
                <button className="btn btn-primary" style={{width:"100%",fontSize:20,padding:"14px"}}
                  onMouseDown={e=>{e.preventDefault();handleDivSubmit();}}
                  onTouchEnd={e=>{e.preventDefault();handleDivSubmit();}}
                  disabled={!input.trim()}>
                  Submit
                </button>
              </>
            )}
            {isSigned&&(
              <>
                <p style={{textAlign:"center",fontSize:19,fontWeight:600,color:"var(--text2)",marginBottom:16}}>
                  Evaluate all 8 expressions. (a={problem.a}, b={problem.b})
                </p>
                <SignedEightGrid problems={problem.problems} onSubmit={handleSignedSubmit} />
              </>
            )}
          </>
        )}
      </div>

      <div style={{marginTop:16,display:"flex",gap:6}}>
        {TOPICS.map((t,i)=>{
          const done=i<topicIdx,active=i===topicIdx;
          return (
            <div key={t.id} style={{fontSize:20,fontWeight:700,padding:"4px 14px",borderRadius:99,
              background:done?"rgba(16,185,129,0.15)":active?"rgba(59,130,246,0.15)":"var(--surface)",
              color:done?"var(--green)":active?"var(--blue)":"var(--text3)",
              border:`1px solid ${done?"rgba(16,185,129,0.3)":active?"rgba(59,130,246,0.3)":"var(--border)"}`}}>
              {done?" ":active?" ":""}{t.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
