import { useState, useEffect, useRef } from "react";
import useActivityTracking from "./core/useActivityTracking";
import { saveProgress, getProgress } from "./core/firebase";

export const TOPIC_ID = "lesson18-warmup-v1";
const STREAK_NEEDED = 3;

// LOGIC START
function randInt(min,max){return Math.floor(Math.random()*(max-min+1))+min;}
function pick(arr){return arr[Math.floor(Math.random()*arr.length)];}
function shuffle(arr){const a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function gcd(a,b){a=Math.abs(a);b=Math.abs(b);return b===0?a:gcd(b,a%b);}
function lcm(a,b){return(a*b)/gcd(a,b);}
function red(n,d){const g=gcd(n,d);return[n/g,d/g];}

// Activity 1: place value of each digit in a 7-digit number
const PLACES=["millions","hundred thousands","ten thousands","thousands","hundreds","tens","ones"];
function genPlace(){
  const digits=[randInt(1,9),...Array.from({length:6},()=>randInt(0,9))];
  let bank=shuffle(PLACES);
  while(bank.every((l,i)=>l===PLACES[i])) bank=shuffle(PLACES);
  return{type:"place",digits,bank};
}

// Activity 2: (a/b)x +/- c/d = e/f with three different denominators
const DENS=[2,3,4,5,6,8,9,10,12];
function genEq(){
  const wantWhole=Math.random()<0.4;
  for(let i=0;i<20000;i++){
    const b=pick(DENS),d=pick(DENS);
    if(b===d) continue;
    const a=randInt(1,b-1),c=randInt(1,d-1);
    if(gcd(a,b)!==1||gcd(c,d)!==1) continue;
    const sg=Math.random()<0.5?1:-1;
    let xn,xd;
    if(wantWhole){xn=randInt(1,4);xd=1;}
    else{xd=randInt(2,12);xn=randInt(1,3*xd);if(gcd(xn,xd)!==1) continue;}
    // e/f = (a/b)(xn/xd) + sg*c/d
    const [e,f]=red(a*xn*d+sg*c*b*xd,b*xd*d);
    if(e<=0) continue;
    if(f===b||f===d) continue;
    const L=[b,d,f].reduce(lcm);
    if(L>36) continue;
    if(f>24) continue;
    const A=a*L/b,C=c*L/d,E=e*L/f;
    const R=E-sg*C;                         // A x = R
    const [rn,rd]=red(R,A);
    if(rn!==xn||rd!==xd) continue;         // sanity check
    return{type:"eq",a,b,c,d,e,f,sg,L,A,C,E,R,xn,xd};
  }
  return genEq();
}

// Answer must be in simplest form: whole number, reduced fraction, or mixed number
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
function gradeEq(input,xn,xd){const v=parseAns(input);return !!v&&v.n===xn&&v.d===xd;}

function fmt(n,d){
  if(d===1) return String(n);
  const w=Math.floor(n/d),r=n%d;
  return w===0?n+"/"+d:w+" "+r+"/"+d;
}
// LOGIC END

function Frac({n,d,sz=24}){
  return(
    <span style={{display:"inline-flex",flexDirection:"column",alignItems:"center",
      gap:1,verticalAlign:"middle",margin:"0 3px"}}>
      <span style={{fontSize:sz,fontWeight:900,fontFamily:"var(--mono)",lineHeight:1.1}}>{n}</span>
      <span style={{display:"block",width:"100%",minWidth:18,height:2,background:"currentColor",borderRadius:1}}/>
      <span style={{fontSize:sz,fontWeight:900,fontFamily:"var(--mono)",lineHeight:1.1}}>{d}</span>
    </span>
  );
}

function Equation({p,sz=26}){
  const t={fontSize:sz+4,fontWeight:800,fontFamily:"var(--mono)"};
  return(
    <span style={{display:"inline-flex",alignItems:"center",gap:8,flexWrap:"wrap",justifyContent:"center"}}>
      <span style={{display:"inline-flex",alignItems:"center"}}>
        <Frac n={p.a} d={p.b} sz={sz}/><span style={{...t,fontStyle:"italic"}}>x</span>
      </span>
      <span style={t}>{p.sg>0?"+":"\u2212"}</span>
      <Frac n={p.c} d={p.d} sz={sz}/>
      <span style={t}>=</span>
      {p.f===1?<span style={t}>{p.e}</span>:<Frac n={p.e} d={p.f} sz={sz}/>}
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

function useNarrow(){
  const q="(max-width: 560px)";
  const [narrow,setNarrow]=useState(()=>typeof window!=="undefined"&&window.matchMedia?window.matchMedia(q).matches:false);
  useEffect(()=>{
    if(!window.matchMedia) return;
    const mq=window.matchMedia(q);
    const h=e=>setNarrow(e.matches);
    mq.addEventListener?mq.addEventListener("change",h):mq.addListener(h);
    return()=>{mq.removeEventListener?mq.removeEventListener("change",h):mq.removeListener(h);};
  },[]);
  return narrow;
}

const chipBase={borderRadius:8,fontWeight:700,cursor:"grab",userSelect:"none",
  touchAction:"none",textAlign:"center",lineHeight:1.15};

// Drag (mouse or touch) a label onto a digit, or tap a label and then tap a digit
function PlaceBoard({p,placements,setPlacements,locked,result}){
  const narrow=useNarrow();
  const [selected,setSelected]=useState(null);
  const [drag,setDrag]=useState(null);
  const dragRef=useRef(null);

  const place=(label,slot)=>{
    setPlacements(prev=>{
      const next=prev.map(l=>l===label?null:l);
      next[slot]=label;
      return next;
    });
    setSelected(null);
  };
  const unplace=label=>setPlacements(prev=>prev.map(l=>l===label?null:l));

  const onDown=(e,label,from)=>{
    if(locked) return;
    e.preventDefault();e.stopPropagation();
    try{e.currentTarget.setPointerCapture(e.pointerId);}catch(err){}
    dragRef.current={label,from,sx:e.clientX,sy:e.clientY,moved:false};
  };
  const onMove=e=>{
    const d=dragRef.current;if(!d) return;
    if(!d.moved&&Math.hypot(e.clientX-d.sx,e.clientY-d.sy)>6) d.moved=true;
    if(d.moved) setDrag({label:d.label,x:e.clientX,y:e.clientY});
  };
  const onUp=e=>{
    const d=dragRef.current;dragRef.current=null;setDrag(null);
    if(!d) return;
    if(d.moved){
      const el=document.elementFromPoint(e.clientX,e.clientY);
      const slot=el&&el.closest?el.closest("[data-slot]"):null;
      if(slot) place(d.label,+slot.getAttribute("data-slot"));
      else if(el&&el.closest&&el.closest("[data-bank]")) unplace(d.label);
    } else if(d.from==="bank"){
      setSelected(s=>s===d.label?null:d.label);
    } else {
      unplace(d.label);
    }
  };
  const onCancel=()=>{dragRef.current=null;setDrag(null);};

  const chipHandlers=(label,from)=>({
    onPointerDown:e=>onDown(e,label,from),
    onPointerMove:onMove,onPointerUp:onUp,onPointerCancel:onCancel,
  });

  const bank=p.bank.filter(l=>!placements.includes(l));

  const zone=(i,style)=>{
    const lab=placements[i];
    const ok=result?lab===PLACES[i]:null;
    const border=result?(ok?"var(--green)":"var(--red)")
      :selected&&!lab?"var(--blue)":"var(--border2)";
    return(
      <div data-slot={i}
        onClick={()=>{if(!locked&&selected) place(selected,i);}}
        style={{border:(lab?"2px solid ":"2px dashed ")+border,borderRadius:8,
          display:"flex",alignItems:"center",justifyContent:"center",padding:3,
          background:result?(ok?"rgba(16,185,129,0.10)":"rgba(239,68,68,0.10)"):"var(--bg2)",
          cursor:selected?"pointer":"default",...style}}>
        {lab&&(
          <div {...chipHandlers(lab,i)}
            style={{...chipBase,fontSize:narrow?16:12,padding:"4px 6px",width:"100%",
              background:"rgba(59,130,246,0.15)",color:"var(--blue)",
              opacity:drag&&drag.label===lab?0.35:1,cursor:locked?"default":"grab"}}>
            {lab}
          </div>
        )}
      </div>
    );
  };

  const correction=i=>result&&placements[i]!==PLACES[i]&&(
    <div style={{fontSize:narrow?15:11,fontWeight:700,color:"var(--green)",textAlign:"center",marginTop:3}}>
      {PLACES[i]}
    </div>
  );

  return(
    <div>
      {narrow?(
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:14}}>
          {p.digits.map((_,i)=>(
            <div key={i}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontFamily:"var(--mono)",fontSize:22,fontWeight:800,whiteSpace:"nowrap",minWidth:118}}>
                  {p.digits.map((dg,j)=>(
                    <span key={j}>
                      <span style={j===i
                        ?{color:"var(--blue)",textDecoration:"underline",textDecorationThickness:3}
                        :{color:"var(--text3)",opacity:0.55}}>{dg}</span>
                      {(j===0||j===3)&&<span style={{color:"var(--text3)",opacity:0.55}}>,</span>}
                    </span>
                  ))}
                </span>
                {zone(i,{flex:1,minHeight:44})}
              </div>
              {correction(i)}
            </div>
          ))}
        </div>
      ):(
        <div style={{display:"flex",gap:6,marginBottom:14}}>
          {p.digits.map((dg,i)=>(
            <div key={i} style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",alignItems:"stretch"}}>
              <div style={{textAlign:"center",fontFamily:"var(--mono)",fontSize:44,fontWeight:900,lineHeight:1.2}}>
                <span style={{position:"relative"}}>
                  {dg}
                  {(i===0||i===3)&&<span style={{position:"absolute",left:"100%",top:0}}>,</span>}
                </span>
              </div>
              <div style={{textAlign:"center",fontSize:18,color:"var(--text3)",lineHeight:1}}>&darr;</div>
              {zone(i,{minHeight:62,marginTop:4})}
              {correction(i)}
            </div>
          ))}
        </div>
      )}

      {!result&&(
        <div data-bank="1" style={{display:"flex",flexWrap:"wrap",gap:8,justifyContent:"center",
          minHeight:52,padding:10,borderRadius:10,background:"var(--surface)",border:"1px solid var(--border)"}}>
          {bank.length===0&&<span style={{fontSize:16,color:"var(--text3)",alignSelf:"center"}}>All labels placed</span>}
          {bank.map(l=>(
            <div key={l} {...chipHandlers(l,"bank")}
              style={{...chipBase,fontSize:17,padding:"8px 12px",
                background:selected===l?"var(--blue)":"rgba(59,130,246,0.12)",
                color:selected===l?"#fff":"var(--blue)",
                border:"2px solid "+(selected===l?"var(--blue)":"rgba(59,130,246,0.35)"),
                opacity:drag&&drag.label===l?0.35:1}}>
              {l}
            </div>
          ))}
        </div>
      )}

      {drag&&(
        <div style={{...chipBase,position:"fixed",left:drag.x,top:drag.y,transform:"translate(-50%,-50%)",
          pointerEvents:"none",zIndex:1000,fontSize:17,padding:"8px 12px",
          background:"var(--blue)",color:"#fff",boxShadow:"0 6px 18px rgba(0,0,0,0.3)"}}>
          {drag.label}
        </div>
      )}
    </div>
  );
}

const TOPICS=[
  {id:"place",label:"Place Value",subLabel:"Drag each place value name to its digit",gen:genPlace},
  {id:"eq",label:"Equations with Fractions",subLabel:"Solve for x",gen:genEq},
];

const workStyle={fontFamily:"var(--mono)",fontSize:16,color:"var(--text3)",lineHeight:2.1,
  background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"10px 16px",marginBottom:12};

export default function Lesson18WarmupPlayer({user,topic,onHome}){
  useActivityTracking(user,TOPIC_ID,"Warmup 18 (019)");
  const topicId=topic?.id||TOPIC_ID;

  const [topicIdx,setTopicIdx]=useState(0);
  const [streak,setStreak]=useState(0);
  const [problem,setProblem]=useState(null);
  const [input,setInput]=useState("");
  const [placements,setPlacements]=useState(Array(7).fill(null));
  const [phase,setPhase]=useState("question");
  const [loading,setLoading]=useState(true);
  const [wrongAns,setWrongAns]=useState(null);
  const inputRef=useRef(null);
  const pending=useRef(null);

  const cur=TOPICS[topicIdx];
  const isPlace=cur?.id==="place";

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
    setInput("");setPlacements(Array(7).fill(null));
    setPhase("question");setWrongAns(null);pending.current=null;
    if(TOPICS[ti].id==="eq") setTimeout(()=>inputRef.current?.focus(),80);
  };

  const saveProg=async(ti,st,done)=>{
    await saveProgress(user.id,topicId,{
      started:true,completed:done,
      percentComplete:done?100:Math.round((ti/TOPICS.length)*100),
      data:{topicIdx:ti,streak:st,completed:done},
    });
  };

  const canSubmit=isPlace?placements.every(Boolean):!!input.trim();

  const handleSubmit=async()=>{
    if(!problem||phase!=="question"||!canSubmit)return;
    const p=problem;
    const correct=p.type==="place"
      ?placements.every((l,i)=>l===PLACES[i])
      :gradeEq(input,p.xn,p.xd);
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
        <p style={{color:"var(--text2)",fontSize:19,marginBottom:24}}>Ready for Classwork 18!</p>
        <button className="btn btn-primary btn-lg" style={{width:"100%"}} onClick={onHome}> Back to Home</button>
      </div>
    </div>
  );

  const p=problem;
  const minus="\u2212";
  const eqWork=p&&p.type==="eq"&&(
    <div style={workStyle}>
      <div>LCD({p.b}, {p.d}{p.f>1?", "+p.f:""}) = {p.L}</div>
      <div>Multiply every term by {p.L}:</div>
      <div>{p.A}x {p.sg>0?"+":minus} {p.C} = {p.E}</div>
      <div>{p.A}x = {p.E} {p.sg>0?minus:"+"} {p.C} = {p.R}</div>
      <div>x = {p.R}/{p.A}{fmt(p.xn,p.xd)!==p.R+"/"+p.A?" = "+fmt(p.xn,p.xd):""}</div>
    </div>
  );

  return(
    <div style={{maxWidth:680,margin:"0 auto",animation:"fadeUp 0.3s ease"}}>
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
            {p.type==="place"?(
              <PlaceBoard p={p} placements={placements} setPlacements={()=>{}} locked result/>
            ):(
              <>
                <div style={{textAlign:"center",marginBottom:12}}>
                  <span style={{display:"inline-flex",background:"var(--bg2)",borderRadius:"var(--radius)",padding:"14px 22px"}}>
                    <Equation p={p} sz={22}/>
                  </span>
                </div>
                {eqWork}
                <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:16,marginBottom:14}}>
                  {wrongAns&&<span style={{fontSize:20,fontFamily:"var(--mono)",color:"var(--red)",
                    textDecoration:"line-through"}}>x = {wrongAns}</span>}
                  <span style={{fontSize:24,fontFamily:"var(--mono)",fontWeight:800,color:"var(--green)"}}>
                    x = {fmt(p.xn,p.xd)}
                  </span>
                </div>
              </>
            )}
            <button className="btn btn-success" style={{width:"100%",fontSize:20,padding:"13px",marginTop:8}}
              onClick={()=>newProblem(topicIdx)}>
              Got it - try again
            </button>
          </div>
        )}

        {phase==="question"&&p&&(
          <>
            {p.type==="place"?(
              <>
                <p style={{textAlign:"center",fontSize:17,color:"var(--text3)",marginBottom:12}}>
                  Drag each label onto its digit, or tap a label and then tap the digit.
                </p>
                <PlaceBoard p={p} placements={placements} setPlacements={setPlacements}/>
                <div style={{height:14}}/>
              </>
            ):(
              <>
                <div style={{textAlign:"center",marginBottom:18}}>
                  <p style={{fontSize:19,fontWeight:600,color:"var(--text2)",marginBottom:12}}>Solve for x:</p>
                  <span style={{display:"inline-flex",background:"var(--bg2)",borderRadius:"var(--radius)",padding:"18px 26px"}}>
                    <Equation p={p}/>
                  </span>
                </div>
                <p style={{textAlign:"center",fontSize:16,color:"var(--text3)",marginBottom:8}}>
                  Answer as a whole number, fraction or mixed number (e.g. 2 1/3) in simplest form.
                </p>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                  <span style={{fontSize:28,fontFamily:"var(--mono)",fontWeight:800,fontStyle:"italic"}}>x =</span>
                  <input ref={inputRef} value={input}
                    onChange={e=>setInput(e.target.value.replace(/[^0-9/ ]/g,""))}
                    onKeyDown={e=>e.key==="Enter"&&handleSubmit()}
                    inputMode="text"
                    style={{flex:1,textAlign:"center",fontSize:28,fontFamily:"var(--mono)",fontWeight:700,padding:"12px"}}/>
                </div>
              </>
            )}
            <button className="btn btn-primary" style={{width:"100%",fontSize:20,padding:"14px"}}
              onMouseDown={e=>{e.preventDefault();handleSubmit();}}
              onTouchEnd={e=>{e.preventDefault();handleSubmit();}}
              disabled={!canSubmit}>
              {isPlace?"Check":"Submit"}
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
