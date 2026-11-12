import { useState, useEffect, useRef } from "react";
import useActivityTracking from "./core/useActivityTracking";
import { saveProgress, getProgress } from "./core/firebase";

export const TOPIC_ID = "lesson20-warmup-v1";
const STREAK_NEEDED = 3;

// LOGIC START
function randInt(min,max){return Math.floor(Math.random()*(max-min+1))+min;}
function pick(arr){return arr[Math.floor(Math.random()*arr.length)];}
function gcd(a,b){a=Math.abs(a);b=Math.abs(b);return b===0?a:gcd(b,a%b);}
function red(n,d){const g=gcd(n,d);return[n/g,d/g];}

function dec(n,d){
  if(d===0) return String(n);
  const s=String(n).padStart(d+1,"0");
  return (s.slice(0,s.length-d)+"."+s.slice(s.length-d)).replace(/0+$/,"").replace(/\.$/,"");
}
function fmt(n,d){
  if(d===1) return String(n);
  const w=Math.floor(n/d),r=n%d;
  return w===0?n+"/"+d:w+" "+r+"/"+d;
}

// ---------- Activity 1: multiply or divide mixed numbers ----------
const DENS=[2,3,4,5,6,8,9,10,12];
function randMixed(){
  for(;;){
    const d=pick(DENS),n=randInt(1,d-1),w=randInt(1,4);
    if(gcd(n,d)===1) return{w,n,d,N:w*d+n};
  }
}
function genMixed(){
  const op=Math.random()<0.5?"x":"/";
  for(let t=0;t<5000;t++){
    const A=randMixed(),B=randMixed();
    // A x B = (A.N * B.N) / (A.d * B.d);  A / B = (A.N * B.d) / (A.d * B.N)
    const top=op==="x"?A.N*B.N:A.N*B.d,bot=op==="x"?A.d*B.d:A.d*B.N;
    const [rn,rd]=red(top,bot);
    if(rd===1&&Math.random()<0.8) continue;   // whole-number answers only now and then
    if(rd>24||rn/rd>30) continue;
    if(gcd(top,bot)===1&&Math.random()<0.6) continue;  // prefer problems that simplify
    return{type:"mixed",op,A,B,top,bot,rn,rd};
  }
  return genMixed();
}

// Simplest form: whole number, reduced fraction, or mixed number with a reduced proper fraction
function parseAns(input){
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
  m=s.match(/^(\d+)$/);
  if(m) return[+m[1],1];
  return null;
}
function gradeMixed(input,rn,rd){const v=parseAns(input);return !!v&&v[0]===rn&&v[1]===rd;}

// ---------- Activity 2: decimal divided by a one-digit decimal ----------
function genDecDiv(){
  for(let t=0;t<5000;t++){
    const dg=randInt(2,9),ps=pick([1,1,2]);
    const N=randInt(11,999),pa=pick([1,2]);
    if(N%10===0) continue;
    const [p,q]=red(N*Math.pow(10,ps),dg*Math.pow(10,pa));
    const val=p/q;
    if(val<0.1||val>=1000) continue;
    const ex=expand(p,q);
    if(ex.non.length+ex.rep.length>5) continue;
    return{type:"dec",dg,ps,N,pa,dividend:dec(N,pa),divisor:dec(dg,ps),p,q,ex};
  }
  return genDecDiv();
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
// Parse "12.5" or "0.1[6]" (brackets mark the repeating digits) into a fraction [num, den]
function parseRep(str){
  const m=str.trim().match(/^(\d*)(?:\.(\d*))?(?:\[(\d+)\])?$/);
  if(!m) return null;
  const ip=m[1]||"",np=m[2]||"",rp=m[3]||"";
  if(ip===""&&np===""&&rp==="") return null;
  if(rp&&m[2]===undefined) return null;
  if((ip+np+rp).length>10) return null;
  if(!rp) return[Number((ip+np)||"0"),Math.pow(10,np.length)];
  return[Number(ip+np+rp)-Number((ip+np)||"0"),Math.pow(10,np.length)*(Math.pow(10,rp.length)-1)];
}
function gradeDec(str,p,q){const v=parseRep(str);return !!v&&v[0]*q===p*v[1];}
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
      gap:1,verticalAlign:"middle",margin:"0 2px"}}>
      <span style={{fontSize:sz,fontWeight:900,fontFamily:"var(--mono)",lineHeight:1.1}}>{n}</span>
      <span style={{display:"block",width:"100%",minWidth:18,height:2,background:"currentColor",borderRadius:1}}/>
      <span style={{fontSize:sz,fontWeight:900,fontFamily:"var(--mono)",lineHeight:1.1}}>{d}</span>
    </span>
  );
}
function Mixed({m,sz=24}){
  return(
    <span style={{display:"inline-flex",alignItems:"center",gap:3}}>
      <span style={{fontSize:sz+8,fontWeight:900,fontFamily:"var(--mono)"}}>{m.w}</span>
      <Frac n={m.n} d={m.d} sz={sz}/>
    </span>
  );
}

const barStyle={borderTop:"2px solid currentColor",paddingTop:1};
function RepNum({ex}){
  return(
    <span style={{fontFamily:"var(--mono)"}}>
      {ex.ip}{(ex.non||ex.rep)?".":""}{ex.non}{ex.rep&&<span style={barStyle}>{ex.rep}</span>}
    </span>
  );
}
function TypedNum({text,rep}){
  if(!rep) return <span style={{fontFamily:"var(--mono)"}}>{text}</span>;
  return(
    <span style={{fontFamily:"var(--mono)"}}>
      {text.slice(0,rep.s)}<span style={barStyle}>{text.slice(rep.s,rep.e)}</span>{text.slice(rep.e)}
    </span>
  );
}

const TOPICS=[
  {id:"mixed",label:"Mixed Numbers",subLabel:"Multiply and divide mixed numbers",gen:genMixed},
  {id:"dec",label:"Dividing Decimals",subLabel:"Divide by a decimal",gen:genDecDiv},
];

const TIMES="\u00d7",DIVS="\u00f7";
const workStyle={fontFamily:"var(--mono)",fontSize:16,color:"var(--text3)",lineHeight:2.1,
  background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"10px 16px",marginBottom:12};
const inputStyle={textAlign:"center",fontSize:28,fontFamily:"var(--mono)",fontWeight:700,padding:"12px"};

export default function Lesson20WarmupPlayer({user,topic,onHome}){
  useActivityTracking(user,TOPIC_ID,"Warmup 20 (019)");
  const topicId=topic?.id||TOPIC_ID;

  const [topicIdx,setTopicIdx]=useState(0);
  const [streak,setStreak]=useState(0);
  const [problem,setProblem]=useState(null);
  const [input,setInput]=useState("");
  const [rep,setRep]=useState(null);
  const [phase,setPhase]=useState("question");
  const [loading,setLoading]=useState(true);
  const [wrong,setWrong]=useState(null);
  const inputRef=useRef(null);
  const pending=useRef(null);

  const cur=TOPICS[topicIdx];
  const isMixed=cur?.id==="mixed";

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
    if(p.type==="mixed") correct=gradeMixed(input,p.rn,p.rd);
    else{
      const str=rep?input.slice(0,rep.s)+"["+input.slice(rep.s,rep.e)+"]"+input.slice(rep.e):input;
      correct=gradeDec(str,p.p,p.q);
    }
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
        <h2 style={{fontSize:28,fontWeight:800,marginBottom:8}}>Warmup Complete!</h2>
        <p style={{color:"var(--text2)",fontSize:19,marginBottom:24}}>Ready for Classwork 20!</p>
        <button className="btn btn-primary btn-lg" style={{width:"100%"}} onClick={onHome}> Back to Home</button>
      </div>
    </div>
  );

  const p=problem;
  const opStyle={fontSize:30,fontWeight:800,color:"var(--text3)"};
  const problemDisplay=p&&(p.type==="mixed"
    ?<span style={{display:"inline-flex",alignItems:"center",gap:12}}>
      <Mixed m={p.A}/><span style={opStyle}>{p.op==="x"?TIMES:DIVS}</span><Mixed m={p.B}/>
    </span>
    :<span style={{fontSize:34,fontWeight:800,fontFamily:"var(--mono)"}}>{p.dividend} {DIVS} {p.divisor}</span>);

  let work=null;
  if(p&&phase==="wrong"){
    if(p.type==="mixed"){
      const a=p.A,b=p.B;
      work=(
        <div style={workStyle}>
          <div>{a.w} {a.n}/{a.d} = {a.N}/{a.d},  {b.w} {b.n}/{b.d} = {b.N}/{b.d}</div>
          {p.op==="x"
            ?<div>{a.N}/{a.d} {TIMES} {b.N}/{b.d} = {p.top}/{p.bot}</div>
            :<>
              <div>Multiply by the reciprocal: {a.N}/{a.d} {TIMES} {b.d}/{b.N}</div>
              <div>= {p.top}/{p.bot}</div>
            </>}
          {(p.top!==p.rn||p.bot!==p.rd)&&<div>Simplify: {p.rn}/{p.rd}</div>}
          {p.rd>1&&p.rn>p.rd&&<div>As a mixed number: {fmt(p.rn,p.rd)}</div>}
        </div>
      );
    } else {
      const f=Math.pow(10,p.ps);
      const top=p.pa>=p.ps?dec(p.N,p.pa-p.ps):String(p.N*Math.pow(10,p.ps-p.pa));
      const dots=p.ex.rep?p.ex.ip+"."+p.ex.non+p.ex.rep.repeat(3)+"...":null;
      work=(
        <div style={workStyle}>
          <div>Make the divisor a whole number: multiply both by {f}</div>
          <div>{p.dividend} {DIVS} {p.divisor} = {top} {DIVS} {p.dg}</div>
          <div>{top} {DIVS} {p.dg} = {dots?dots:<RepNum ex={p.ex}/>}</div>
          {dots&&<div>The {p.ex.rep} repeats, so write <RepNum ex={p.ex}/></div>}
        </div>
      );
    }
  }

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

        {phase==="wrong"&&p&&wrong&&(
          <div style={{animation:"popIn 0.25s ease"}}>
            <div style={{fontSize:19,fontWeight:700,color:"#fca5a5",marginBottom:12,textAlign:"center"}}>
              Not quite! Streak reset.
            </div>
            <div style={{textAlign:"center",marginBottom:12}}>
              <span style={{display:"inline-flex",background:"var(--bg2)",borderRadius:"var(--radius)",padding:"14px 24px"}}>
                {problemDisplay}
              </span>
            </div>
            {work}
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:16,marginBottom:14,flexWrap:"wrap"}}>
              <span style={{fontSize:20,color:"var(--red)",textDecoration:"line-through"}}>
                <TypedNum text={wrong.text} rep={wrong.rep}/>
              </span>
              <span style={{fontSize:24,fontWeight:800,color:"var(--green)"}}>
                {p.type==="mixed"
                  ?<span style={{fontFamily:"var(--mono)"}}>{fmt(p.rn,p.rd)}</span>
                  :<RepNum ex={p.ex}/>}
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
            <div style={{textAlign:"center",marginBottom:16}}>
              <span style={{display:"inline-flex",background:"var(--bg2)",borderRadius:"var(--radius)",padding:"20px 30px"}}>
                {problemDisplay}
              </span>
            </div>
            {isMixed?(
              <p style={{textAlign:"center",fontSize:16,color:"var(--text3)",marginBottom:8}}>
                Write your answer in simplest form (e.g. 3 1/4).
              </p>
            ):(
              <p style={{textAlign:"center",fontSize:16,color:"var(--text3)",marginBottom:8}}>
                For a repeating decimal, type the digits once, highlight the repeating digit(s), then press
                the <span style={{fontFamily:"var(--mono)",fontWeight:900,display:"inline-block",lineHeight:1.1,...barStyle}}>abc</span> button.
              </p>
            )}
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
              <input ref={inputRef} value={input} maxLength={12}
                onChange={e=>{setInput(isMixed
                  ?e.target.value.replace(/[^0-9/ ]/g,"")
                  :e.target.value.replace(/[^0-9.]/g,""));setRep(null);}}
                onKeyDown={e=>e.key==="Enter"&&handleSubmit()}
                inputMode={isMixed?"text":"decimal"} style={{...inputStyle,flex:1,minWidth:0}}/>
              {!isMixed&&(
                <button type="button" title="Mark repeating digits"
                  onMouseDown={e=>e.preventDefault()} onClick={applyBar}
                  style={{padding:"10px 14px",fontSize:20,fontFamily:"var(--mono)",fontWeight:900,
                    border:"2px solid "+(rep?"var(--blue)":"var(--border2)"),borderRadius:"var(--radius-sm)",
                    background:rep?"rgba(59,130,246,0.15)":"var(--surface)",color:"var(--text)",cursor:"pointer"}}>
                  <span style={barStyle}>abc</span>
                </button>
              )}
            </div>
            {rep&&(
              <div style={{textAlign:"center",marginBottom:8,fontSize:24,fontWeight:800,color:"var(--blue)"}}>
                Your answer: <TypedNum text={input} rep={rep}/>
              </div>
            )}
            <button className="btn btn-primary" style={{width:"100%",fontSize:20,padding:"14px",marginTop:4}}
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
