import { useState, useEffect, useRef } from "react";
import useActivityTracking from "./core/useActivityTracking";
import { saveProgress, getProgress } from "./core/firebase";

export const TOPIC_ID = "lesson19-ec-v1";
const STREAK_NEEDED = 2;

// LOGIC START
function randInt(min,max){return Math.floor(Math.random()*(max-min+1))+min;}
function pick(arr){return arr[Math.floor(Math.random()*arr.length)];}
function shuffle(arr){const a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function gcd(a,b){a=Math.abs(a);b=Math.abs(b);return b===0?a:gcd(b,a%b);}
function lcm(a,b){return(a*b)/gcd(a,b);}
function red(n,d){const g=gcd(n,d);return[n/g,d/g];}

// Exact decimal string for n / 10^d (keeps no trailing zeros)
function dec(n,d){
  if(d===0) return String(n);
  const s=String(n).padStart(d+1,"0");
  return (s.slice(0,s.length-d)+"."+s.slice(s.length-d)).replace(/0+$/,"").replace(/\.$/,"");
}

// Decimal expansion of p/q: integer part, non-repeating digits, repeating digits
function expand(p,q){
  const ip=Math.floor(p/q);let r=p%q;
  const seen={};let digits="";
  while(r!==0&&seen[r]===undefined){
    seen[r]=digits.length;
    r*=10;digits+=Math.floor(r/q);r%=q;
  }
  if(r===0) return{ip,non:digits,rep:""};
  return{ip,non:digits.slice(0,seen[r]),rep:digits.slice(seen[r])};
}

// ---------- Activity 1: missing side of a rectangle ----------
// Given side: one non-zero digit (2,3,4,5,6,8,9) as a decimal such as 0.6 or 0.03.
// The digits of the area, read as a whole number, are not divisible by that digit.
const SIDE_DIGITS=[2,3,4,5,6,8,9];
const UNITS=["cm","m","in","ft"];
function genRect(){
  for(let t=0;t<5000;t++){
    const dg=pick(SIDE_DIGITS),ps=pick([1,1,2]);
    const N=randInt(11,999),pa=pick([1,2,2]);
    if(N%10===0||N%dg===0) continue;
    // answer = (N / 10^pa) / (dg / 10^ps)
    const [p,q]=red(N*Math.pow(10,ps),dg*Math.pow(10,pa));
    const val=p/q;
    if(val<0.1||val>=1000) continue;
    const ex=expand(p,q);
    if(ex.non.length+ex.rep.length>5) continue;
    return{type:"rect",dg,ps,N,pa,area:dec(N,pa),side:dec(dg,ps),p,q,ex,
      unit:pick(UNITS),givenTop:Math.random()<0.5};
  }
  return genRect();
}

// Parse "12.5", "0.1[6]" (brackets mark the repeating digits) into a fraction [num, den]
function parseRep(str){
  const m=str.trim().match(/^(\d*)(?:\.(\d*))?(?:\[(\d+)\])?$/);
  if(!m) return null;
  const ip=m[1]||"",np=m[2]||"",rp=m[3]||"";
  if(ip===""&&np===""&&rp==="") return null;
  if(rp&&m[2]===undefined) return null;          // a bar needs a decimal point before it
  if((ip+np+rp).length>10) return null;
  if(!rp) return[Number((ip+np)||"0"),Math.pow(10,np.length)];
  return[Number(ip+np+rp)-Number((ip+np)||"0"),Math.pow(10,np.length)*(Math.pow(10,rp.length)-1)];
}
function gradeRect(str,p,q){
  const v=parseRep(str);
  return !!v&&v[0]*q===p*v[1];
}

// ---------- Activity 2: ax + b = cx + d ----------
const FRAC_DENS=[2,3,4,5,6,8];
function randFrac(){
  for(;;){const d=pick(FRAC_DENS),n=randInt(1,d-1);if(gcd(n,d)===1) return{n,d,isDec:false,text:n+"/"+d};}
}
function randDec(){
  if(Math.random()<0.25){const k=pick([25,75,125,175]);const[n,d]=red(k,100);return{n,d,isDec:true,text:dec(k,2)};}
  for(;;){const k=randInt(1,29);if(k%10===0) continue;const[n,d]=red(k,10);return{n,d,isDec:true,text:dec(k,1),tn:k,td:10};}
}
function genEq(){
  for(let t=0;t<20000;t++){
    const kinds=shuffle(["d","d","f","f"]);
    const [a,b,c,d]=kinds.map(k=>k==="d"?randDec():randFrac());
    const L=[a,b,c,d].reduce((acc,v)=>lcm(acc,v.d),1);
    if(L>120) continue;
    const A=a.n*L/a.d,B=b.n*L/b.d,C=c.n*L/c.d,D=d.n*L/d.d;
    if(A===C) continue;
    // (A - C) x = D - B
    let left=A-C,right=D-B;
    if(left<0){left=-left;right=-right;}
    if(right<=0) continue;
    const [xn,xd]=red(right,left);
    if(xd===1||xd>12||xn>60) continue;
    return{type:"eq",a,b,c,d,L,A,B,C,D,left,right,xn,xd};
  }
  return genEq();
}

// Accepts a reduced fraction, a mixed number in simplest form, or an exact decimal
function parseEqAns(input){
  const s=input.trim().replace(/\s+/g," ");
  let m=s.match(/^(\d+) (\d+)\/(\d+)$/);
  if(m){
    const w=+m[1],n=+m[2],d=+m[3];
    if(w===0||n===0||d<2||n>=d||gcd(n,d)!==1) return null;
    return[w*d+n,d];
  }
  m=s.match(/^(\d+)\/(\d+)$/);
  if(m){
    const n=+m[1],d=+m[2];
    if(n===0||d<2||gcd(n,d)!==1) return null;
    return[n,d];
  }
  m=s.match(/^(\d*)\.(\d+)$/);
  if(m&&(m[1]+m[2]).length<=10) return red(Number((m[1]+m[2])),Math.pow(10,m[2].length));
  return null;
}
function gradeEq(input,xn,xd){const v=parseEqAns(input);return !!v&&v[0]*xd===xn*v[1];}

function fmt(n,d){
  if(d===1) return String(n);
  const w=Math.floor(n/d),r=n%d;
  return w===0?n+"/"+d:w+" "+r+"/"+d;
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

const barStyle={borderTop:"2px solid currentColor",paddingTop:1};

// Decimal with a bar over the repeating digits
function RepNum({ex}){
  return(
    <span style={{fontFamily:"var(--mono)"}}>
      {ex.ip}{(ex.non||ex.rep)?".":""}{ex.non}{ex.rep&&<span style={barStyle}>{ex.rep}</span>}
    </span>
  );
}
// What the student typed, with their bar
function TypedNum({text,rep}){
  if(!rep) return <span style={{fontFamily:"var(--mono)"}}>{text}</span>;
  return(
    <span style={{fontFamily:"var(--mono)"}}>
      {text.slice(0,rep.s)}<span style={barStyle}>{text.slice(rep.s,rep.e)}</span>{text.slice(rep.e)}
    </span>
  );
}

function Sq({u}){return <span>{u}<sup style={{fontSize:"0.65em"}}>2</sup></span>;}

function RectFig({p}){
  const W=210,H=120;
  const lab=<span style={{fontSize:22,fontWeight:800,fontFamily:"var(--mono)"}}>{p.side} {p.unit}</span>;
  return(
    <div style={{position:"relative",display:"inline-block",padding:"40px 12px 12px 104px"}}>
      <div style={{width:W,height:H,border:"3px solid var(--blue)",background:"rgba(59,130,246,0.08)",
        borderRadius:4,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
        <span style={{fontSize:17,color:"var(--text3)",fontWeight:700}}>Area</span>
        <span style={{fontSize:24,fontWeight:800,fontFamily:"var(--mono)"}}>{p.area} <Sq u={p.unit}/></span>
      </div>
      <div style={{position:"absolute",top:0,left:104,width:W,height:38,
        display:"flex",alignItems:"center",justifyContent:"center"}}>{p.givenTop?lab:null}</div>
      <div style={{position:"absolute",top:40,left:0,width:98,height:H,
        display:"flex",alignItems:"center",justifyContent:"center"}}>{p.givenTop?null:lab}</div>
    </div>
  );
}

function Term({v,sz}){
  return v.isDec
    ?<span style={{fontSize:sz+4,fontWeight:800,fontFamily:"var(--mono)"}}>{v.text}</span>
    :<Frac n={v.n} d={v.d} sz={sz}/>;
}
function Equation({p,sz=24}){
  const t={fontSize:sz+4,fontWeight:800,fontFamily:"var(--mono)"};
  const x=<span style={{...t,fontStyle:"italic"}}>x</span>;
  return(
    <span style={{display:"inline-flex",alignItems:"center",gap:7,flexWrap:"wrap",justifyContent:"center"}}>
      <span style={{display:"inline-flex",alignItems:"center"}}><Term v={p.a} sz={sz}/>{x}</span>
      <span style={t}>+</span><Term v={p.b} sz={sz}/>
      <span style={t}>=</span>
      <span style={{display:"inline-flex",alignItems:"center"}}><Term v={p.c} sz={sz}/>{x}</span>
      <span style={t}>+</span><Term v={p.d} sz={sz}/>
    </span>
  );
}

const TOPICS=[
  {id:"rect",label:"Missing Side",subLabel:"Use the area to find the missing side",gen:genRect},
  {id:"eq",label:"Equations",subLabel:"Decimals and fractions on both sides",gen:genEq},
];

const workStyle={fontFamily:"var(--mono)",fontSize:16,color:"var(--text3)",lineHeight:2.1,
  background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"10px 16px",marginBottom:12};
const inputStyle={textAlign:"center",fontSize:28,fontFamily:"var(--mono)",fontWeight:700,padding:"12px"};

export default function ExtraCredit19Player({user,topic,onHome}){
  useActivityTracking(user,TOPIC_ID,"Classwork 19 EC (019)");
  const topicId=topic?.id||TOPIC_ID;

  const [topicIdx,setTopicIdx]=useState(0);
  const [streak,setStreak]=useState(0);
  const [problem,setProblem]=useState(null);
  const [input,setInput]=useState("");
  const [rep,setRep]=useState(null);          // {s,e}: digits under the bar
  const [phase,setPhase]=useState("question");
  const [loading,setLoading]=useState(true);
  const [wrong,setWrong]=useState(null);
  const inputRef=useRef(null);
  const pending=useRef(null);

  const cur=TOPICS[topicIdx];
  const isRect=cur?.id==="rect";

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
    setInput("");setRep(null);setPhase("question");setWrong(null);pending.current=null;
    setTimeout(()=>inputRef.current?.focus(),80);
  };

  const saveProg=async(ti,st,done)=>{
    await saveProgress(user.id,topicId,{
      started:true,completed:done,
      percentComplete:done?100:Math.round((ti/TOPICS.length)*100),
      data:{topicIdx:ti,streak:st,completed:done},
    });
  };

  // Bar button: bar the highlighted digits; with nothing highlighted, bar the last digit.
  // Pressing it again with nothing highlighted removes the bar.
  const applyBar=()=>{
    const el=inputRef.current;if(!el) return;
    if(/[\/ ]/.test(input)) return;
    const s=el.selectionStart,e=el.selectionEnd;
    if(s!=null&&e!=null&&s<e){
      if(/^\d+$/.test(input.slice(s,e))) setRep({s,e});
      return;
    }
    if(rep){setRep(null);return;}
    if(/\d$/.test(input)) setRep({s:input.length-1,e:input.length});
  };

  const handleSubmit=async()=>{
    if(!problem||phase!=="question"||!input.trim())return;
    const p=problem;
    let correct;
    const barred=rep?input.slice(0,rep.s)+"["+input.slice(rep.s,rep.e)+"]"+input.slice(rep.e):null;
    if(p.type==="rect") correct=gradeRect(barred||input,p.p,p.q);
    else correct=barred?gradeRect(barred,p.xn,p.xd):gradeEq(input,p.xn,p.xd);
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
      setStreak(0);setWrong({text:input,rep});setPhase("wrong");
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
        <p style={{color:"var(--text2)",fontSize:19,marginBottom:24}}>Excellent work with decimals!</p>
        <button className="btn btn-primary btn-lg" style={{width:"100%"}} onClick={onHome}> Back to Home</button>
      </div>
    </div>
  );

  const barButton=(
    <button type="button" title="Mark repeating digits"
      onMouseDown={e=>e.preventDefault()} onClick={applyBar}
      style={{padding:"10px 14px",fontSize:20,fontFamily:"var(--mono)",fontWeight:900,
        border:"2px solid "+(rep?"var(--blue)":"var(--border2)"),borderRadius:"var(--radius-sm)",
        background:rep?"rgba(59,130,246,0.15)":"var(--surface)",color:"var(--text)",cursor:"pointer"}}>
      <span style={barStyle}>abc</span>
    </button>
  );
  const barPreview=rep&&(
    <div style={{textAlign:"center",minHeight:34,marginBottom:8,fontSize:24,fontWeight:800,color:"var(--blue)"}}>
      Your answer: <TypedNum text={input} rep={rep}/>
    </div>
  );

  const p=problem;
  const divs="\u00f7",minus="\u2212";

  let work=null;
  if(p&&phase==="wrong"){
    if(p.type==="rect"){
      // make the divisor a whole number: move the point p.ps places in both numbers
      const f=Math.pow(10,p.ps),bot=p.dg;
      const top=p.pa>=p.ps?dec(p.N,p.pa-p.ps):String(p.N*Math.pow(10,p.ps-p.pa));
      const dots=p.ex.rep?p.ex.ip+"."+p.ex.non+p.ex.rep.repeat(3)+"...":null;
      work=(
        <div style={workStyle}>
          <div>Missing side = area {divs} given side = {p.area} {divs} {p.side}</div>
          <div>Multiply both by {f}: {top} {divs} {bot}</div>
          <div>{top} {divs} {bot} = {dots?dots:<RepNum ex={p.ex}/>}</div>
          {dots&&<div>The {p.ex.rep} repeats, so write <RepNum ex={p.ex}/></div>}
        </div>
      );
    } else {
      const decs=[p.a,p.b,p.c,p.d].filter(v=>v.isDec);
      work=(
        <div style={workStyle}>
          {decs.map((v,i)=><div key={i}>{v.text} = {v.n}/{v.d}</div>)}
          <div>LCD = {p.L}. Multiply every term by {p.L}:</div>
          <div>{p.A}x + {p.B} = {p.C}x + {p.D}</div>
          <div>{p.A>p.C
            ?p.A+"x "+minus+" "+p.C+"x = "+p.D+" "+minus+" "+p.B
            :p.B+" "+minus+" "+p.D+" = "+p.C+"x "+minus+" "+p.A+"x"}</div>
          <div>{p.left}x = {p.right}</div>
          <div>x = {p.right}/{p.left}{fmt(p.xn,p.xd)!==p.right+"/"+p.left?" = "+fmt(p.xn,p.xd):""}</div>
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
            Extra Credit - Classwork 19 &middot; Activity {topicIdx+1} of {TOPICS.length}
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

        {phase==="wrong"&&p&&wrong&&(
          <div style={{animation:"popIn 0.25s ease"}}>
            <div style={{fontSize:19,fontWeight:700,color:"#fca5a5",marginBottom:12,textAlign:"center"}}>
              Not quite! Streak reset.
            </div>
            <div style={{textAlign:"center",marginBottom:10}}>
              {p.type==="rect"?<RectFig p={p}/>:(
                <span style={{display:"inline-flex",background:"var(--bg2)",borderRadius:"var(--radius)",padding:"14px 20px"}}>
                  <Equation p={p} sz={20}/>
                </span>
              )}
            </div>
            {work}
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:16,marginBottom:14,flexWrap:"wrap"}}>
              <span style={{fontSize:20,color:"var(--red)",textDecoration:"line-through"}}>
                <TypedNum text={wrong.text} rep={wrong.rep}/>
              </span>
              <span style={{fontSize:24,fontWeight:800,color:"var(--green)"}}>
                {p.type==="rect"
                  ?<><RepNum ex={p.ex}/> <span style={{fontFamily:"var(--mono)"}}>{p.unit}</span></>
                  :<span style={{fontFamily:"var(--mono)"}}>x = {fmt(p.xn,p.xd)}
                    {(()=>{const ex=expand(p.xn,p.xd);return ex.non.length+ex.rep.length<=6
                      ?<> = <RepNum ex={ex}/></>:null;})()}</span>}
              </span>
            </div>
            <button className="btn btn-success" style={{width:"100%",fontSize:20,padding:"13px"}}
              onClick={()=>newProblem(topicIdx)}>
              Got it - try again
            </button>
          </div>
        )}

        {phase==="question"&&p&&p.type==="rect"&&(
          <>
            <p style={{textAlign:"center",fontSize:19,fontWeight:600,color:"var(--text2)",marginBottom:6}}>
              Find the missing side of the rectangle.
            </p>
            <div style={{textAlign:"center",marginBottom:10}}><RectFig p={p}/></div>
            <div style={{background:"rgba(59,130,246,0.06)",border:"1px solid rgba(59,130,246,0.2)",
              borderRadius:"var(--radius-sm)",padding:"8px 12px",marginBottom:10,fontSize:16,color:"var(--text2)"}}>
              For a repeating decimal: type the digits once, highlight the repeating digit(s), then press
              the <span style={{fontFamily:"var(--mono)",fontWeight:900,...barStyle}}>abc</span> button.
              With nothing highlighted, the bar goes over the last digit.
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
              <input ref={inputRef} value={input} maxLength={10}
                onChange={e=>{setInput(e.target.value.replace(/[^0-9.]/g,""));setRep(null);}}
                onKeyDown={e=>e.key==="Enter"&&handleSubmit()}
                inputMode="decimal" style={{...inputStyle,flex:1,minWidth:0}}/>
              {barButton}
              <span style={{fontSize:22,fontWeight:800,fontFamily:"var(--mono)"}}>{p.unit}</span>
            </div>
            {barPreview}
            <button className="btn btn-primary" style={{width:"100%",fontSize:20,padding:"14px"}}
              onMouseDown={e=>{e.preventDefault();handleSubmit();}}
              onTouchEnd={e=>{e.preventDefault();handleSubmit();}}
              disabled={!input.trim()}>
              Submit
            </button>
          </>
        )}

        {phase==="question"&&p&&p.type==="eq"&&(
          <>
            <div style={{textAlign:"center",marginBottom:16}}>
              <p style={{fontSize:19,fontWeight:600,color:"var(--text2)",marginBottom:12}}>Solve for x:</p>
              <span style={{display:"inline-flex",background:"var(--bg2)",borderRadius:"var(--radius)",padding:"18px 22px"}}>
                <Equation p={p}/>
              </span>
            </div>
            <p style={{textAlign:"center",fontSize:16,color:"var(--text3)",marginBottom:8}}>
              Answer as a fraction or mixed number (e.g. 2 1/3) in simplest form, or as a decimal.
              For a repeating decimal, highlight the repeating digit(s) and press the
              <span style={{fontFamily:"var(--mono)",fontWeight:900,marginLeft:5,display:"inline-block",lineHeight:1.1,...barStyle}}>abc</span> button.
            </p>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
              <span style={{fontSize:28,fontFamily:"var(--mono)",fontWeight:800,fontStyle:"italic"}}>x =</span>
              <input ref={inputRef} value={input}
                onChange={e=>{setInput(e.target.value.replace(/[^0-9./ ]/g,""));setRep(null);}}
                onKeyDown={e=>e.key==="Enter"&&handleSubmit()}
                inputMode="text" style={{...inputStyle,flex:1,minWidth:0}}/>
              {barButton}
            </div>
            {barPreview}
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
