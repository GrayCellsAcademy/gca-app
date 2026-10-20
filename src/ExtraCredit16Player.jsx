import { useState, useEffect, useRef } from "react";
import useActivityTracking from "./core/useActivityTracking";
import { saveProgress, getProgress } from "./core/firebase";

export const TOPIC_ID = "lesson16-ec-v1";
const STREAK_NEEDED = 2;

// LOGIC START
function randInt(min,max){return Math.floor(Math.random()*(max-min+1))+min;}
function pick(arr){return arr[Math.floor(Math.random()*arr.length)];}
const UNITS=["in","ft","yd","cm","m"];
function gcd(a,b){return b===0?a:gcd(b,a%b);}
function lcm(a,b){return(a*b)/gcd(a,b);}
function red(n,d){const g=gcd(Math.abs(n),d);return[n/g,d/g];}

// Rectangle: side A = proper fraction n1/d1, side B = mixed number w n2/d2.
// Both in simplest form, d1 != d2. Reduced denominators of the sum of the
// sides, the perimeter and the area are all less than d1*d2.
function genRect(){
  for(let i=0;i<5000;i++){
    const d1=randInt(2,12),n1=randInt(1,d1-1);
    if(gcd(n1,d1)!==1) continue;
    const d2=randInt(2,12);
    if(d2===d1) continue;
    const n2=randInt(1,d2-1);
    if(gcd(n2,d2)!==1) continue;
    const w=randInt(1,5);
    const N2=w*d2+n2;
    const prod=d1*d2;
    const L=lcm(d1,d2);
    const x=n1*(L/d1),y=N2*(L/d2);
    const [sn,sd]=red(x+y,L);
    const [pn,pd]=red(2*(x+y),L);
    const [an,ad]=red(n1*N2,prod);
    if(sd>=prod||pd>=prod||ad>=prod) continue;
    if(pd===1||ad===1) continue;
    if(ad>60) continue;
    return{n1,d1,w,n2,d2,N2,L,x,y,sn,sd,pn,pd,an,ad,unit:pick(UNITS)};
  }
  return genRect();
}

function genPerim(){
  const r=genRect();
  return{...r,given:Math.random()<0.5?"frac":"mixed"};
}

// Parse a student answer. Must be in simplest form.
// Accepts "w n/d" (proper, reduced fraction part), "n/d" (reduced, d>1), or "n".
function parseAns(input){
  const s=input.trim().replace(/\s+/g," ");
  let m=s.match(/^(\d+) (\d+)\/(\d+)$/);
  if(m){
    const w=+m[1],n=+m[2],d=+m[3];
    if(w===0||n===0||d<2||n>=d||gcd(n,d)!==1) return null;
    return{n:w*d+n,d};
  }
  m=s.match(/^(\d+)\/(\d+)$/);
  if(m){
    const n=+m[1],d=+m[2];
    if(n===0||d<2||gcd(n,d)!==1) return null;
    return{n,d};
  }
  m=s.match(/^(\d+)$/);
  if(m) return{n:+m[1],d:1};
  return null;
}

function checkAns(input,n,d){
  const v=parseAns(input);
  return !!v&&v.n===n&&v.d===d;
}

function fmt(n,d){
  if(d===1) return String(n);
  const w=Math.floor(n/d),r=n%d;
  if(w===0) return n+"/"+d;
  return w+" "+r+"/"+d;
}
// LOGIC END

function Frac({n,d,sz=22}){
  return(
    <span style={{display:"inline-flex",flexDirection:"column",alignItems:"center",
      gap:1,verticalAlign:"middle",margin:"0 2px"}}>
      <span style={{fontSize:sz,fontWeight:900,fontFamily:"var(--mono)",lineHeight:1.1}}>{n}</span>
      <span style={{display:"block",width:"100%",minWidth:18,height:2,
        background:"currentColor",borderRadius:1}}/>
      <span style={{fontSize:sz,fontWeight:900,fontFamily:"var(--mono)",lineHeight:1.1}}>{d}</span>
    </span>
  );
}

// Shows n/d as a mixed number when improper
function Val({n,d,sz=22,wsz=30}){
  if(d===1) return <span style={{fontSize:wsz,fontWeight:900,fontFamily:"var(--mono)"}}>{n}</span>;
  const w=Math.floor(n/d),r=n%d;
  if(w===0) return <Frac n={n} d={d} sz={sz}/>;
  return(
    <span style={{display:"inline-flex",alignItems:"center",gap:4}}>
      <span style={{fontSize:wsz,fontWeight:900,fontFamily:"var(--mono)"}}>{w}</span>
      <Frac n={r} d={d} sz={sz}/>
    </span>
  );
}

function U({unit,sq,sz=20}){
  return(
    <span style={{fontSize:sz,fontWeight:700,fontFamily:"var(--mono)",marginLeft:6}}>
      {unit}{sq&&<sup style={{fontSize:"0.65em"}}>2</sup>}
    </span>
  );
}

function UnitButtons({unit,value,onChange}){
  return(
    <div style={{display:"flex",gap:8,justifyContent:"center",marginTop:6}}>
      {[["lin",false],["sq",true]].map(([k,sq])=>{
        const on=value===k;
        return(
          <button key={k} type="button" className={"btn "+(on?"btn-primary":"btn-ghost")}
            style={{minWidth:90,fontSize:19,padding:"8px 14px",
              border:"2px solid "+(on?"var(--blue)":"var(--border2)")}}
            onMouseDown={e=>e.preventDefault()}
            onClick={()=>onChange(k)}>
            <U unit={unit} sq={sq} sz={19}/>
          </button>
        );
      })}
    </div>
  );
}

function Rect({top,left}){
  const W=200,H=110;
  return(
    <div style={{position:"relative",display:"inline-block",padding:"70px 16px 16px 112px"}}>
      <div style={{width:W,height:H,border:"3px solid var(--blue)",
        background:"rgba(59,130,246,0.08)",borderRadius:4}}/>
      <div style={{position:"absolute",top:0,left:112,width:W,height:66,
        display:"flex",alignItems:"center",justifyContent:"center"}}>{top}</div>
      <div style={{position:"absolute",top:70,left:0,width:108,height:H,
        display:"flex",alignItems:"center",justifyContent:"center"}}>{left}</div>
    </div>
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
  {id:"pa",label:"Perimeter & Area",subLabel:"Find the perimeter and the area",gen:genRect},
  {id:"area",label:"Area from Perimeter",subLabel:"Use the perimeter to find the area",gen:genPerim},
];

const inputStyle={textAlign:"center",fontSize:26,fontFamily:"var(--mono)",fontWeight:700,padding:"10px"};
const workStyle={fontFamily:"var(--mono)",fontSize:16,color:"var(--text3)",lineHeight:2.1,
  background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"10px 16px",marginBottom:12};

export default function ExtraCredit16Player({user,topic,onHome}){
  useActivityTracking(user,TOPIC_ID,"Classwork 16 EC (019)");
  const topicId=topic?.id||TOPIC_ID;

  const [topicIdx,setTopicIdx]=useState(0);
  const [streak,setStreak]=useState(0);
  const [problem,setProblem]=useState(null);
  const [inP,setInP]=useState("");
  const [inA,setInA]=useState("");
  const [uP,setUP]=useState(null);
  const [uA,setUA]=useState(null);
  const [phase,setPhase]=useState("question");
  const [loading,setLoading]=useState(true);
  const [wrong,setWrong]=useState(null);
  const refP=useRef(null);
  const refA=useRef(null);
  const pending=useRef(null);

  const cur=TOPICS[topicIdx];
  const isPA=cur?.id==="pa";

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
    setInP("");setInA("");setUP(null);setUA(null);setPhase("question");setWrong(null);pending.current=null;
    setTimeout(()=>(TOPICS[ti].id==="pa"?refP:refA).current?.focus(),80);
  };

  const saveProg=async(ti,st,done)=>{
    await saveProgress(user.id,topicId,{
      started:true,completed:done,
      percentComplete:done?100:Math.round((ti/TOPICS.length)*100),
      data:{topicIdx:ti,streak:st,completed:done},
    });
  };

  const canSubmit=isPA?(inP.trim()&&inA.trim()&&uP&&uA):(inA.trim()&&uA);

  const handleSubmit=async()=>{
    if(!problem||phase!=="question"||!canSubmit)return;
    const p=problem;
    const okPn=isPA?checkAns(inP,p.pn,p.pd):true;
    const okPu=isPA?uP==="lin":true;
    const okAn=checkAns(inA,p.an,p.ad);
    const okAu=uA==="sq";
    const okP=okPn&&okPu,okA=okAn&&okAu;
    if(okP&&okA){
      const ns=streak+1;setStreak(ns);setPhase("correct");
      if(ns>=STREAK_NEEDED){
        const next=topicIdx+1;
        if(next>=TOPICS.length){pending.current={action:"done"};await saveProg(next,0,true);}
        else{pending.current={action:"next",ti:next};await saveProg(next,0,false);}
      } else {
        pending.current={action:"stay"};await saveProg(topicIdx,ns,false);
      }
    } else {
      setStreak(0);setWrong({p:inP,a:inA,up:uP,ua:uA,okPn,okPu,okAn,okAu});setPhase("wrong");
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
        <p style={{color:"var(--text2)",fontSize:19,marginBottom:24}}>Great work with rectangles!</p>
        <button className="btn btn-primary btn-lg" style={{width:"100%"}} onClick={onHome}> Back to Home</button>
      </div>
    </div>
  );

  const p=problem;
  const fracLabel=p&&<span style={{display:"inline-flex",alignItems:"center"}}><Frac n={p.n1} d={p.d1} sz={24}/><U unit={p.unit}/></span>;
  const mixedLabel=p&&<span style={{display:"inline-flex",alignItems:"center"}}><Val n={p.N2} d={p.d2} sz={24} wsz={32}/><U unit={p.unit}/></span>;
  // Mixed side is always the longer one, so it goes on top
  const topLabel=p&&(isPA||p.given==="mixed"?mixedLabel:null);
  const leftLabel=p&&(isPA||p.given==="frac"?fracLabel:null);

  const formatNote=(
    <p style={{textAlign:"center",fontSize:16,color:"var(--text3)",marginBottom:10}}>
      Write each answer as a mixed number (e.g. 3 1/4) or a fraction in simplest form, and choose the units.
    </p>
  );

  const ansLine=(label,studentVal,studentU,okN,okU,n,d,sq)=>(
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:12,marginBottom:8,flexWrap:"wrap"}}>
      <span style={{fontSize:19,fontWeight:700,color:"var(--text2)"}}>{label}:</span>
      {!(okN&&okU)&&<span style={{fontSize:20,fontFamily:"var(--mono)",color:"var(--red)",
        textDecoration:"line-through"}}>{studentVal}{studentU&&<U unit={p.unit} sq={studentU==="sq"} sz={18}/>}</span>}
      <span style={{fontSize:24,fontFamily:"var(--mono)",fontWeight:800,
        color:"var(--green)"}}>{fmt(n,d)}<U unit={p.unit} sq={sq} sz={22}/></span>
    </div>
  );

  // Activity 2 work values
  let givenStr="",otherStr="";
  if(p){
    const fracStr=p.n1+"/"+p.d1,mixStr=fmt(p.N2,p.d2);
    givenStr=p.given==="frac"?fracStr:mixStr;
    otherStr=p.given==="frac"?mixStr:fracStr;
  }

  return(
    <div style={{maxWidth:620,margin:"0 auto",animation:"fadeUp 0.3s ease"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
        marginBottom:16,flexWrap:"wrap",gap:8}}>
        <div>
          <div style={{fontSize:19,color:"var(--amber)",marginBottom:2,fontWeight:700}}>
            Extra Credit - Classwork 16 &middot; Activity {topicIdx+1} of {TOPICS.length}
          </div>
          <div style={{fontSize:20,fontWeight:700}}>{cur.label}</div>
          <div style={{fontSize:17,color:"var(--text3)"}}>{cur.subLabel}</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onHome}> Home</button>
      </div>

      <div className="card">
        <StreakDots current={streak} needed={STREAK_NEEDED}/>

        {p&&phase!=="correct"&&(
          <div style={{textAlign:"center",marginBottom:12}}>
            {!isPA&&(
              <div style={{display:"inline-flex",alignItems:"center",gap:10,marginBottom:4,
                background:"var(--bg2)",borderRadius:"var(--radius)",padding:"10px 20px"}}>
                <span style={{fontSize:20,fontWeight:700,color:"var(--text2)"}}>Perimeter =</span>
                <Val n={p.pn} d={p.pd} sz={22} wsz={30}/>
                <U unit={p.unit} sz={22}/>
              </div>
            )}
            <div><Rect top={topLabel} left={leftLabel}/></div>
          </div>
        )}

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
            {isPA?(
              <div style={workStyle}>
                <div>{fmt(p.N2,p.d2)} = {p.N2}/{p.d2}</div>
                <div>{p.n1}/{p.d1} + {p.N2}/{p.d2} = {p.x}/{p.L} + {p.y}/{p.L} = {fmt(p.sn,p.sd)}</div>
                <div>Perimeter = 2 &times; {fmt(p.sn,p.sd)} = {fmt(p.pn,p.pd)} {p.unit}</div>
                <div>Area = {p.n1}/{p.d1} &times; {p.N2}/{p.d2} = {fmt(p.an,p.ad)} {p.unit}<sup>2</sup></div>
              </div>
            ):(
              <div style={workStyle}>
                <div>Half the perimeter: {fmt(p.pn,p.pd)} / 2 = {fmt(p.sn,p.sd)}</div>
                <div>Other side: {fmt(p.sn,p.sd)} - {givenStr} = {otherStr} {p.unit}</div>
                <div>Area = {p.n1}/{p.d1} &times; {p.N2}/{p.d2} = {fmt(p.an,p.ad)} {p.unit}<sup>2</sup></div>
              </div>
            )}
            {isPA&&ansLine("Perimeter",wrong.p,wrong.up,wrong.okPn,wrong.okPu,p.pn,p.pd,false)}
            {ansLine("Area",wrong.a,wrong.ua,wrong.okAn,wrong.okAu,p.an,p.ad,true)}
            <button className="btn btn-success" style={{width:"100%",fontSize:20,padding:"13px",marginTop:8}}
              onClick={()=>newProblem(topicIdx)}>
              Got it - try again
            </button>
          </div>
        )}

        {phase==="question"&&p&&(
          <>
            {formatNote}
            {isPA&&(
              <div style={{marginBottom:10}}>
                <div style={{fontSize:18,fontWeight:700,color:"var(--text2)",marginBottom:4}}>Perimeter</div>
                <input ref={refP} value={inP}
                  onChange={e=>setInP(e.target.value.replace(/[^0-9/ ]/g,""))}
                  onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();refA.current?.focus();}}}
                  inputMode="text" style={inputStyle}/>
                <UnitButtons unit={p.unit} value={uP} onChange={setUP}/>
              </div>
            )}
            <div style={{marginBottom:12}}>
              <div style={{fontSize:18,fontWeight:700,color:"var(--text2)",marginBottom:4}}>Area</div>
              <input ref={refA} value={inA}
                onChange={e=>setInA(e.target.value.replace(/[^0-9/ ]/g,""))}
                onKeyDown={e=>e.key==="Enter"&&handleSubmit()}
                inputMode="text" style={inputStyle}/>
              <UnitButtons unit={p.unit} value={uA} onChange={setUA}/>
            </div>
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
