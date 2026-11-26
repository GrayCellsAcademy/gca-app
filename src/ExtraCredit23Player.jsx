import { useState, useEffect, useRef } from "react";
import useActivityTracking from "./core/useActivityTracking";
import { saveProgress, getProgress } from "./core/firebase";

export const TOPIC_ID = "lesson23-ec-v1";
const STREAK_NEEDED = 2;

// LOGIC START
function randInt(min,max){return Math.floor(Math.random()*(max-min+1))+min;}
function pick(arr){return arr[Math.floor(Math.random()*arr.length)];}
function gcd(a,b){return b===0?a:gcd(b,a%b);}
function commas(n){
  const s=typeof n==="number"?String(n):n;
  const [i,f]=s.split(".");
  return i.replace(/\B(?=(\d{3})+(?!\d))/g,",")+(f?"."+f:"");
}
// cents (integer) -> "1,234.50" or "1,234" when whole dollars
function money(c){
  const d=Math.floor(c/100),r=c%100;
  return commas(d)+(r?"."+String(r).padStart(2,"0"):"");
}
const NAMES=["Ivan","Maya","Leo","Sofia","Omar","Grace","Mateo","Aisha","Ben","Lena","Ravi","Chloe"];

// ---------- Activity 1: two percent changes in a row ----------
// kind "money": amounts in dollars, answer may have cents; kind "count": answer is a whole number
const CHANGE_CONTEXTS=[
  {kind:"money",S:[500,6000,100],
    text:(nm,S,a,b)=>`${nm} invested $${commas(S)}. In the first year the investment went ${a.up?"up":"down"} by ${a.p}%. In the second year it went ${b.up?"up":"down"} by ${b.p}%. How much is ${nm}'s investment worth now?`},
  {kind:"money",S:[200,1200,20],
    text:(nm,S,a,b)=>`A bike costs $${commas(S)}. The store ${a.up?"raises":"lowers"} the price by ${a.p}%. A month later, it ${b.up?"raises":"lowers"} the new price by ${b.p}%. What is the price of the bike now?`},
  {kind:"count",S:[2000,40000,100],unit:"people",
    text:(nm,S,a,b)=>`A town has ${commas(S)} people. In one year the population ${a.up?"grows":"shrinks"} by ${a.p}%. The next year it ${b.up?"grows":"shrinks"} by ${b.p}%. How many people live in the town now?`},
  {kind:"money",S:[40,400,10],
    text:(nm,S,a,b)=>`${nm} buys a rare trading card for $${commas(S)}. In the first month its value ${a.up?"rises":"falls"} by ${a.p}%. In the second month it ${b.up?"rises":"falls"} by ${b.p}%. What is the card worth now?`},
  {kind:"count",S:[400,2400,100],unit:"students",
    text:(nm,S,a,b)=>`A school has ${commas(S)} students. The next year, enrollment ${a.up?"increases":"decreases"} by ${a.p}%. The year after that, it ${b.up?"increases":"decreases"} by ${b.p}%. How many students are at the school now?`},
  {kind:"count",S:[1000,20000,100],unit:"players",
    text:(nm,S,a,b)=>`An online game has ${commas(S)} players. In the first week the number of players ${a.up?"goes up":"goes down"} by ${a.p}%. In the second week it ${b.up?"goes up":"goes down"} by ${b.p}%. How many players does the game have now?`},
  {kind:"money",S:[800,3000,50],
    text:(nm,S,a,b)=>`The rent for an apartment is $${commas(S)} per month. One year the rent ${a.up?"goes up":"goes down"} by ${a.p}%. The next year the new rent ${b.up?"goes up":"goes down"} by ${b.p}%. What is the monthly rent now?`},
  {kind:"count",S:[1000,10000,100],unit:"kg",
    text:(nm,S,a,b)=>`An orchard harvests ${commas(S)} kg of apples. The next year the harvest ${a.up?"increases":"decreases"} by ${a.p}%. The year after that, it ${b.up?"increases":"decreases"} by ${b.p}%. How many kilograms of apples are harvested now?`},
];
const PCTS=[5,10,15,20,25,30,40,50];

let lastCtx1=-1;
function genChange(){
  for(let t=0;t<5000;t++){
    let ci=randInt(0,CHANGE_CONTEXTS.length-1);
    if(ci===lastCtx1) continue;
    const c=CHANGE_CONTEXTS[ci];
    const S=randInt(c.S[0]/c.S[2],c.S[1]/c.S[2])*c.S[2];
    const a={up:Math.random()<0.5,p:pick(PCTS)},b={up:Math.random()<0.5,p:pick(PCTS)};
    if(a.p===b.p&&a.up===b.up&&Math.random()<0.5) continue;
    const f1=100+(a.up?a.p:-a.p),f2=100+(b.up?b.p:-b.p);
    // exact values: money in cents, counts in whole units
    let mid,end;
    if(c.kind==="money"){
      if((S*f1)%1!==0) continue;
      mid=S*f1;                         // cents after the first change (S dollars * f1/100 * 100)
      if((mid*f2)%100!==0) continue;
      end=mid*f2/100;                   // cents after the second change
    } else {
      if((S*f1)%100!==0) continue;
      mid=S*f1/100;
      if((mid*f2)%100!==0) continue;
      end=mid*f2/100;
    }
    lastCtx1=ci;
    return{type:"change",kind:c.kind,unit:c.unit,S,a,b,f1,f2,mid,end,text:c.text(pick(NAMES),S,a,b)};
  }
  return genChange();
}

// ---------- Activity 2: a fraction of a percent of a quantity ----------
const PART_CONTEXTS=[
  {kind:"count",Q:[30,90],unit:"years old",
    text:(n1,n2,Q,f,p)=>`${n1} is ${Q} years old. ${n2} is ${f} of ${p}% of ${n1}'s age. How old is ${n2}?`},
  {kind:"money",Q:[40,600],
    text:(n1,n2,Q,f,p)=>`${n1} has $${commas(Q)} saved. ${n1} spends ${f} of ${p}% of the savings on a gift. How much does the gift cost?`},
  {kind:"count",Q:[60,600],unit:"marbles",
    text:(n1,n2,Q,f,p)=>`A jar holds ${Q} marbles. ${p}% of the marbles are blue, and ${f} of the blue marbles have stripes. How many striped blue marbles are in the jar?`},
  {kind:"count",Q:[200,1500],unit:"students",
    text:(n1,n2,Q,f,p)=>`A school has ${commas(Q)} students. ${p}% of the students play a sport, and ${f} of those students play soccer. How many students play soccer?`},
  {kind:"count",Q:[100,900],unit:"pages",
    text:(n1,n2,Q,f,p)=>`${n1}'s book has ${Q} pages. On Saturday ${n1} reads ${f} of ${p}% of the book. How many pages does ${n1} read on Saturday?`},
  {kind:"count",Q:[200,2000],unit:"g",
    text:(n1,n2,Q,f,p)=>`A bag holds ${commas(Q)} g of flour. A recipe uses ${p}% of the bag, and ${f} of that amount goes into the frosting. How many grams of flour go into the frosting?`},
  {kind:"count",Q:[20,120],unit:"km",
    text:(n1,n2,Q,f,p)=>`A bike trail is ${Q} km long. ${n1} rides ${f} of ${p}% of the trail before lunch. How many kilometers does ${n1} ride before lunch?`},
  {kind:"count",Q:[40,400],unit:"cards",
    text:(n1,n2,Q,f,p)=>`${n1} has ${Q} baseball cards. ${n2} has ${f} of ${p}% as many cards as ${n1}. How many cards does ${n2} have?`},
];
const PART_PCTS=[10,20,25,30,40,50,60,75,80];
const FRACS=[[1,2],[1,3],[2,3],[1,4],[3,4],[1,5],[2,5],[3,5],[4,5],[1,6],[5,6],[3,8],[5,8]];

let lastCtx2=-1;
function genPart(){
  for(let t=0;t<20000;t++){
    const ci=randInt(0,PART_CONTEXTS.length-1);
    if(ci===lastCtx2) continue;
    const c=PART_CONTEXTS[ci];
    const Q=randInt(c.Q[0],c.Q[1]),p=pick(PART_PCTS),[fn,fd]=pick(FRACS);
    // p% of Q must be a whole number, and so must fn/fd of it
    if((Q*p)%100!==0) continue;
    const X=Q*p/100;
    if((X*fn)%fd!==0) continue;
    const Y=X*fn/fd;
    if(Y<1) continue;
    const n1=pick(NAMES);let n2=pick(NAMES);while(n2===n1) n2=pick(NAMES);
    lastCtx2=ci;
    return{type:"part",kind:c.kind,unit:c.unit,Q,p,fn,fd,X,Y,text:c.text(n1,n2,commas(Q),fn+"/"+fd,p)};
  }
  return genPart();
}

// Money answers in dollars (cents allowed, "$" and commas optional); counts are whole numbers
function gradeNum(input,correct,kind){
  const s=input.replace(/[$,\s]/g,"");
  if(kind==="money"){
    const m=s.match(/^(\d+)(?:\.(\d{1,2}))?$/);
    if(!m) return false;
    const cents=Number(m[1])*100+(m[2]?Number(m[2].padEnd(2,"0")):0);
    return cents===correct;           // correct is in cents
  }
  return /^\d+$/.test(s)&&Number(s)===correct;
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

const TOPICS=[
  {id:"change",label:"Percent of a Percent",subLabel:"Two percent changes in a row",gen:genChange},
  {id:"part",label:"Fraction of a Percent",subLabel:"Find a fraction of a percent of an amount",gen:genPart},
];

const TIMES="\u00d7";
const workStyle={fontFamily:"var(--mono)",fontSize:16,color:"var(--text3)",lineHeight:2,
  background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"10px 16px",marginBottom:12};
const inputStyle={textAlign:"center",fontSize:28,fontFamily:"var(--mono)",fontWeight:700,padding:"12px",flex:1,minWidth:0};

export default function ExtraCredit23Player({user,topic,onHome}){
  useActivityTracking(user,TOPIC_ID,"Classwork 23 EC (019)");
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
    const correct=p.type==="change"?gradeNum(input,p.end,p.kind):gradeNum(input,p.kind==="money"?p.Y*100:p.Y,p.kind);
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
        <p style={{color:"var(--text2)",fontSize:19,marginBottom:24}}>Great work with percents!</p>
        <button className="btn btn-primary btn-lg" style={{width:"100%"}} onClick={onHome}> Back to Home</button>
      </div>
    </div>
  );

  const p=problem;
  const isMoney=p&&p.kind==="money";

  let work=null,answerStr="";
  if(p&&p.type==="change"){
    const m1=p.kind==="money"?"$"+money(p.mid):commas(p.mid)+" "+p.unit;
    const e1=p.kind==="money"?"$"+money(p.end):commas(p.end)+" "+p.unit;
    answerStr=e1;
    const step=(ch,f,from,to)=>
      `${ch.up?"Up":"Down"} ${ch.p}% means ${f}% of the amount: ${from} ${TIMES} ${f/100} = ${to}`;
    work=(
      <div style={workStyle}>
        <div>{step(p.a,p.f1,isMoney?"$"+commas(p.S):commas(p.S),m1)}</div>
        <div>{step(p.b,p.f2,m1,e1)}</div>
      </div>
    );
  } else if(p){
    answerStr=isMoney?"$"+commas(p.Y):commas(p.Y)+" "+p.unit;
    const q=isMoney?"$"+commas(p.Q):commas(p.Q);
    const x=isMoney?"$"+commas(p.X):commas(p.X);
    work=(
      <div style={workStyle}>
        <div>{p.p}% of {q} = {q} {TIMES} {p.p/100} = {x}</div>
        <div>{p.fn}/{p.fd} of {x} = {x} {TIMES} {p.fn} &divide; {p.fd} = {answerStr}</div>
      </div>
    );
  }

  return(
    <div style={{maxWidth:640,margin:"0 auto",animation:"fadeUp 0.3s ease"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
        marginBottom:16,flexWrap:"wrap",gap:8}}>
        <div>
          <div style={{fontSize:19,color:"var(--amber)",marginBottom:2,fontWeight:700}}>
            Extra Credit - Classwork 23 &middot; Activity {topicIdx+1} of {TOPICS.length}
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
            <div style={{background:"var(--bg2)",borderRadius:"var(--radius)",padding:"14px 18px",marginBottom:12,
              fontSize:18,lineHeight:1.55}}>{p.text}</div>
            {work}
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:16,marginBottom:14,flexWrap:"wrap"}}>
              {wrongAns&&<span style={{fontSize:20,fontFamily:"var(--mono)",color:"var(--red)",
                textDecoration:"line-through"}}>{wrongAns}</span>}
              <span style={{fontSize:24,fontFamily:"var(--mono)",fontWeight:800,color:"var(--green)"}}>{answerStr}</span>
            </div>
            <button className="btn btn-success" style={{width:"100%",fontSize:20,padding:"13px"}}
              onClick={()=>newProblem(topicIdx)}>
              Got it - try again
            </button>
          </div>
        )}

        {phase==="question"&&p&&(
          <>
            <div style={{background:"var(--bg2)",borderRadius:"var(--radius)",padding:"18px 20px",marginBottom:16,
              fontSize:20,lineHeight:1.6}}>{p.text}</div>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
              {isMoney&&<span style={{fontSize:28,fontWeight:800,fontFamily:"var(--mono)"}}>$</span>}
              <input ref={inputRef} value={input}
                onChange={e=>setInput(e.target.value.replace(isMoney?/[^0-9.,$]/g:/[^0-9,]/g,""))}
                onKeyDown={e=>e.key==="Enter"&&handleSubmit()}
                inputMode={isMoney?"decimal":"numeric"} style={inputStyle}/>
              {!isMoney&&p.unit&&<span style={{fontSize:20,fontWeight:800,color:"var(--text2)"}}>{p.unit}</span>}
            </div>
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
