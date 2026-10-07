import { useState, useEffect, useRef } from "react";
import useActivityTracking from "./core/useActivityTracking";
import { saveProgress, getProgress } from "./core/firebase";

export const TOPIC_ID = "lesson12-ec-v1";
const STREAK_NEEDED = 3;

function randInt(min,max){return Math.floor(Math.random()*(max-min+1))+min;}
function pick(arr){return arr[Math.floor(Math.random()*arr.length)];}

//  KaTeX
function useKaTeX() {
  const [ready, setReady] = useState(!!window.katex);
  useEffect(()=>{
    if (window.katex){setReady(true);return;}
    const link=document.createElement("link");link.rel="stylesheet";
    link.href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css";document.head.appendChild(link);
    const script=document.createElement("script");script.src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js";
    script.async=true;script.onload=()=>setReady(true);document.head.appendChild(script);
  },[]);
  return ready;
}
function KaTeX({expr,display}){
  const ref=useRef(null);
  useEffect(()=>{if(ref.current&&window.katex){try{window.katex.render(expr,ref.current,{throwOnError:false,displayMode:!!display});}catch{}}});
  return display?<div ref={ref} style={{margin:"8px 0"}}/>:<span ref={ref}/>;
}

//  Activity 1: Multi-step signed expression
function genMultiStep() {
  for (let attempt=0;attempt<2000;attempt++){
    const A=pick([-2,-3,-4,-5,-6]), B=pick([-2,-3,-4,-5]);
    const C=randInt(2,5), n=pick([2,3]);
    const Cval=-(C**n);
    const useS1Cbrt=Math.random()<0.4;
    const s1Val=useS1Cbrt?pick([2,3,4]):randInt(2,9);
    const SQ="\\sqrt", CB="\\sqrt[3]";
    const s1Latex=useS1Cbrt?CB+"{"+s1Val**3+"}":SQ+"{"+s1Val**2+"}";
    const op1=Math.random()<0.5?1:-1;
    const inner1=Cval+op1*s1Val;
    const s2Val=randInt(2,6);
    const s2Latex=SQ+"{"+s2Val**2+"}";
    const op2=Math.random()<0.5?1:-1;
    const inner2=B*inner1+op2*s2Val;
    const result=A*inner2;
    if(!Number.isInteger(result)) continue;
    if(Math.abs(result)<20||Math.abs(result)>800) continue;
    const op1Sym=op1===1?'+':'-', op2Sym=op2===1?'+':'-';
    const T="\\times", L="\\left(", R="\\right)";
    const inner1Latex="-"+C+"^{"+n+"} "+op1Sym+" "+s1Latex;
    const inner2Latex="("+B+") "+T+" "+L+inner1Latex+R+" "+op2Sym+" "+s2Latex;
    const latex=A+" "+T+" "+L+inner2Latex+R;
    return {type:'multi',latex,result,A,B,C,n,Cval,s1Val,s1Latex,op1,op1Sym,inner1,s2Val,s2Latex,op2,op2Sym,inner2};
  }
  return genMultiStep();
}

//  Activity 2: Inequalities with variables on both sides
const OPS=['<','<=','>','>='];
function opLatex(op){return op==='<='?'\\leq':op==='>='?'\\geq':op;}
function opFlip(op){return{'<':'>','<=':'>=','>':'<','>=':'<='}[op];}
function sgn(n,forceSign=false){return n>=0?(forceSign?'+':'')+n:String(n);}
function coef(n){return n===1?'':n===-1?'-':String(n);}

function solveLinear(lhsCoef,rhs,op){
  if(lhsCoef===0||rhs%lhsCoef!==0) return null;
  const x=rhs/lhsCoef;
  const finalOp=lhsCoef<0?opFlip(op):op;
  return {x,op:finalOp};
}

function genTypeA(){
  for(let i=0;i<500;i++){
    const a=randInt(2,5),b=randInt(1,4),c=randInt(-6,6);if(c===0)continue;
    const d=randInt(1,8),e=randInt(-8,8);
    const coefX=a*b-d,constant=e-a*c;
    if(coefX===0)continue;
    const op=pick(OPS);
    const sol=solveLinear(coefX,constant,op);
    if(!sol||Math.abs(sol.x)>10||sol.x===0)continue;
    const latex=`${a}(${coef(b)}x ${sgn(c,true)}) ${opLatex(op)} ${coef(d)}x ${sgn(e,true)}`;
    const expandLatex=`${coef(a*b)}x ${sgn(a*c,true)} ${opLatex(op)} ${coef(d)}x ${sgn(e,true)}`;
    return {typeId:'A',a,b,c,d,e,op,sol,latex,expandLatex,
      steps:[`Distribute: ${coef(a)}(${coef(b)}x${sgn(c,true)}) = ${coef(a*b)}x${sgn(a*c,true)}`,
             `Move x terms: ${coef(a*b-d)}x ${opLatex(op)} ${e-a*c}`,
             `Divide: x ${opLatex(sol.op)} ${sol.x}${coefX<0?' (flip inequality since dividing by negative)':''}`]};
  }
  return null;
}

function genTypeB(){
  for(let i=0;i<500;i++){
    const a=randInt(1,6),b=randInt(1,4),c=randInt(-8,8);
    const d=randInt(1,6),e=randInt(1,4),f=randInt(-8,8);
    const coefX=(a+b)-(d+e),constant=f-c;
    if(coefX===0)continue;
    const op=pick(OPS);
    const sol=solveLinear(coefX,constant,op);
    if(!sol||Math.abs(sol.x)>10||sol.x===0)continue;
    const latex=`${coef(a)}x + ${coef(b)}x ${sgn(c,true)} ${opLatex(op)} ${coef(d)}x + ${coef(e)}x ${sgn(f,true)}`;
    return {typeId:'B',a,b,c,d,e,f,op,sol,latex,
      steps:[`Combine left: ${coef(a+b)}x${sgn(c,true)}  |  Combine right: ${coef(d+e)}x${sgn(f,true)}`,
             `Move x terms: ${coef(a+b-d-e)}x ${opLatex(op)} ${f-c}`,
             `Divide: x ${opLatex(sol.op)} ${sol.x}${coefX<0?' (flip inequality)':''}`]};
  }
  return null;
}

function genTypeC(){
  for(let i=0;i<500;i++){
    const a=randInt(2,4),b=randInt(1,3),c=randInt(-5,5);if(c===0)continue;
    const d=randInt(1,5),e=randInt(1,5),f=randInt(1,4),g=randInt(-8,8);
    const coefX=(a*b+d)-(e+f),constant=g-a*c;
    if(coefX===0)continue;
    const op=pick(OPS);
    const sol=solveLinear(coefX,constant,op);
    if(!sol||Math.abs(sol.x)>10||sol.x===0)continue;
    const latex=`${a}(${coef(b)}x ${sgn(c,true)}) + ${coef(d)}x ${opLatex(op)} ${coef(e)}x + ${coef(f)}x ${sgn(g,true)}`;
    return {typeId:'C',a,b,c,d,e,f,g,op,sol,latex,
      steps:[`Distribute left: ${coef(a*b)}x${sgn(a*c,true)}+${coef(d)}x = ${coef(a*b+d)}x${sgn(a*c,true)}`,
             `Combine right: ${coef(e+f)}x${sgn(g,true)}`,
             `Move x terms: ${coef(a*b+d-e-f)}x ${opLatex(op)} ${g-a*c}`,
             `Divide: x ${opLatex(sol.op)} ${sol.x}${coefX<0?' (flip inequality)':''}`]};
  }
  return null;
}

const TYPE_GENS=[genTypeA,genTypeB,genTypeC];
function genInequality(problemCount){
  // Cycle through types to guarantee both distributive and combining appear
  const gen=TYPE_GENS[problemCount%3];
  return gen()||genTypeA();
}

//  Input grading for inequalities
function gradeIneq(input,sol){
  const s=input.trim().toLowerCase().replace(/\s+/g,'');
  // Check longest operators first
  for(const sym of ['>=','<=','>','<']){
    const idx=s.indexOf(sym);
    if(idx<0)continue;
    const lhs=s.slice(0,idx),rhs=s.slice(idx+sym.length);
    if(lhs!=='x')continue;
    const n=parseInt(rhs,10);
    if(isNaN(n))continue;
    const opNorm={'>=':'>=','<=':'<=','>':'>','<':'<'}[sym];
    return opNorm===sol.op&&n===sol.x;
  }
  return false;
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

const ACTIVITIES=[
  {id:'multi',label:'Multi-Step Signed Expression',description:'Evaluate the expression step by step',gen:()=>genMultiStep()},
  {id:'ineq',label:'Linear Inequalities',description:'Variables on both sides - distribute and combine like terms',gen:null},
];

export default function ExtraCredit12Player({user,topic,onHome}){
  useActivityTracking(user,TOPIC_ID,"Classwork 12 EC (019)");
  const topicId=topic?.id||TOPIC_ID;
  const katexReady=useKaTeX();

  const [actIdx,setActIdx]=useState(0);
  const [streak,setStreak]=useState(0);
  const [problem,setProblem]=useState(null);
  const [input,setInput]=useState("");
  const [phase,setPhase]=useState("question");
  const [loading,setLoading]=useState(true);
  const [wrongAns,setWrongAns]=useState(null);
  const [selectedOp,setSelectedOp]=useState(null);
  const [problemCount,setProblemCount]=useState(0);
  const inputRef=useRef(null);
  const pendingNext=useRef(null);

  const currentActivity=ACTIVITIES[actIdx];

  useEffect(()=>{
    const load=async()=>{
      const prog=await getProgress(user.id,topicId);
      if(prog?.data){
        const{actIdx:ai,streak:st,completed,problemCount:pc}=prog.data;
        if(completed){setPhase("done");setLoading(false);return;}
        setActIdx(Math.min(ai||0,ACTIVITIES.length-1));
        setStreak(st||0);setProblemCount(pc||0);
      }
      setLoading(false);
    };load();
  },[]);

  useEffect(()=>{if(!loading&&actIdx<ACTIVITIES.length)newProblem(problemCount);},[actIdx,loading]);

  const newProblem=(pc)=>{
    const p=actIdx===0?genMultiStep():genInequality(pc);
    setProblem(p);setProblemCount(pc+1);
    setInput("");setPhase("question");setWrongAns(null);setSelectedOp(null);pendingNext.current=null;
    setTimeout(()=>inputRef.current?.focus(),80);
  };

  const handleSubmit=async()=>{
    if(!problem||phase!=="question"||!input.trim())return;
    const correct=actIdx===0
      ?parseInt(input.trim(),10)===problem.result
      :(!!selectedOp&&selectedOp===problem.sol.op&&parseInt(input.trim(),10)===problem.sol.x);
    if(correct){
      const newStreak=streak+1;setStreak(newStreak);setPhase("correct");
      const final=newStreak>=STREAK_NEEDED;
      const nextAi=final?actIdx+1:actIdx;
      const done=nextAi>=ACTIVITIES.length&&final;
      pendingNext.current={final,nextAi,done};
      await saveProgress(user.id,topicId,{
        started:true,completed:done,
        percentComplete:done?100:Math.round((nextAi/ACTIVITIES.length)*100),
        data:{actIdx:nextAi,streak:final?0:newStreak,completed:done,problemCount:problemCount+1},
      });
    } else {
      setStreak(0);setWrongAns(input);setPhase("wrong");
      await saveProgress(user.id,topicId,{
        started:true,completed:false,
        percentComplete:Math.round((actIdx/ACTIVITIES.length)*100),
        data:{actIdx,streak:0,completed:false,problemCount},
      });
    }
  };

  const handleNext=()=>{
    const p=pendingNext.current;if(!p)return;
    if(p.done)setPhase("done");
    else if(p.final){setActIdx(p.nextAi);setStreak(0);}
    else newProblem(problemCount);
  };

  if(loading)return<div style={{display:"flex",justifyContent:"center",padding:60}}><div className="spinner"/></div>;

  if(phase==="done")return(
    <div style={{maxWidth:520,margin:"0 auto",textAlign:"center",animation:"fadeUp 0.4s ease"}}>
      <div className="card">
        <div style={{fontSize:64,marginBottom:16}}></div>
        <h2 style={{fontSize:28,fontWeight:800,marginBottom:8}}>Extra Credit Complete!</h2>
        <p style={{color:"var(--text2)",fontSize:19,marginBottom:24}}>Excellent work on signed expressions and inequalities!</p>
        <button className="btn btn-primary btn-lg" style={{width:"100%"}} onClick={onHome}> Back to Home</button>
      </div>
    </div>
  );

  const isMulti=currentActivity.id==="multi";
  const isIneq=currentActivity.id==="ineq";

  return(
    <div style={{maxWidth:660,margin:"0 auto",animation:"fadeUp 0.3s ease"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:8}}>
        <div>
          <div style={{fontSize:19,color:"var(--amber)",marginBottom:2,fontWeight:700}}>Extra Credit - Activity {actIdx+1} of {ACTIVITIES.length}</div>
          <div style={{fontSize:20,fontWeight:700}}>{currentActivity?.label}</div>
          <div style={{fontSize:17,color:"var(--text3)"}}>{currentActivity?.description}</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onHome}> Home</button>
      </div>
      <div style={{marginBottom:16}}>
        <div style={{height:5,background:"var(--surface2)",borderRadius:99,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${(actIdx/ACTIVITIES.length)*100}%`,background:"linear-gradient(90deg,var(--amber),#f97316)",borderRadius:99}}/>
        </div>
      </div>

      <div className="card">
        <StreakDots current={streak} needed={STREAK_NEEDED}/>

        {phase==="correct"&&(
          <div style={{animation:"popIn 0.25s ease",textAlign:"center"}}>
            <div style={{fontSize:28,marginBottom:8}}></div>
            <div style={{fontSize:22,fontWeight:800,color:"var(--green)",marginBottom:6}}>{pendingNext.current?.final?"Activity complete!":"Correct!"}</div>
            <div style={{fontSize:19,color:"var(--text3)",marginBottom:20}}>Streak: {streak}/{STREAK_NEEDED}</div>
            <button className="btn btn-success" style={{width:"100%",fontSize:20,padding:"13px"}} onClick={handleNext}>
               {pendingNext.current?.final?"Next activity":"Next problem"}
            </button>
          </div>
        )}

        {phase==="wrong"&&problem&&(
          <div style={{animation:"popIn 0.25s ease"}}>
            <div style={{fontSize:19,fontWeight:700,color:"#fca5a5",marginBottom:12,textAlign:"center"}}>Not quite! Streak reset.</div>
            {katexReady&&<KaTeX expr={problem.latex} display={true}/>}
            {isMulti&&(
              <div style={{fontSize:17,color:"var(--text3)",marginBottom:10,lineHeight:1.9,background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"10px 14px"}}>
                <div>Inner: -{problem.C}^{problem.n} = {problem.Cval}</div>
                <div>Step 1: {problem.Cval} {problem.op1Sym} {problem.s1Val} = {problem.inner1}</div>
                <div>Step 2: ({problem.B}) {'\u00d7'} {problem.inner1} {problem.op2Sym} {problem.s2Val} = {problem.inner2}</div>
                <div>Result: {problem.A} {'\u00d7'} {problem.inner2} = <strong style={{color:"var(--green)"}}>{problem.result}</strong></div>
              </div>
            )}
            {isIneq&&problem.steps&&(
              <div style={{fontSize:17,color:"var(--text3)",marginBottom:10,lineHeight:2,background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"10px 14px"}}>
                {problem.steps.map((s,i)=><div key={i}>{i+1}. {s}</div>)}
              </div>
            )}
            <div style={{textAlign:"center",marginBottom:12}}>
              {wrongAns&&<span style={{fontSize:20,fontFamily:"var(--mono)",color:"var(--red)",textDecoration:"line-through",marginRight:16}}>{wrongAns}</span>}
              <span style={{fontSize:22,fontFamily:"var(--mono)",fontWeight:800,color:"var(--green)"}}>
                {isMulti?problem.result:`x ${problem.sol.op} ${problem.sol.x}`}
              </span>
            </div>
            <button className="btn btn-success" style={{width:"100%",fontSize:20,padding:"13px"}} onClick={()=>newProblem(problemCount)}>Got it - try again</button>
          </div>
        )}

        {phase==="question"&&problem&&(
          <>
            {isIneq&&problem.typeId&&(
              <div style={{fontSize:16,color:"var(--text3)",marginBottom:8,fontStyle:"italic"}}>
                {problem.typeId==='A'?"Hint: try distributing first":problem.typeId==='B'?"Hint: combine like terms first":"Hint: distribute, then combine like terms"}
              </div>
            )}
            {katexReady&&<KaTeX expr={problem.latex} display={true}/>}
                        {katexReady&&<KaTeX expr={problem.latex} display={true}/>}
            {isIneq&&(
              <>
                <p style={{textAlign:"center",fontSize:18,color:"var(--text2)",marginBottom:10}}>Select the inequality sign, then enter the number:</p>
                <div style={{display:"flex",gap:8,justifyContent:"center",marginBottom:12}}>
                  {[['<','<'],['\u2264','<='],['>',">"],['-','>=']].map(([sym,op])=>(
                    <button key={op} onClick={()=>setSelectedOp(op)}
                      style={{padding:"10px 18px",fontSize:26,fontWeight:800,borderRadius:"var(--radius-sm)",cursor:"pointer",
                        border:`2px solid ${selectedOp===op?"var(--blue)":"var(--border)"}`,
                        background:selectedOp===op?"rgba(59,130,246,0.15)":"var(--surface)",
                        color:selectedOp===op?"var(--blue)":"var(--text2)",transition:"all 0.15s"}}>
                      x {sym} ?
                    </button>
                  ))}
                </div>
              </>
            )}
            <input ref={inputRef} value={input}
              onChange={e=>setInput(e.target.value.replace(/[^0-9\-]/g,""))}
              onKeyDown={e=>e.key==="Enter"&&handleSubmit()}
              inputMode="numeric" placeholder="?"
              style={{textAlign:"center",fontSize:24,fontFamily:"var(--mono)",fontWeight:700,padding:"12px",marginBottom:12}}/>
            <button className="btn btn-primary" style={{width:"100%",fontSize:20,padding:"14px"}}
              onMouseDown={e=>{e.preventDefault();handleSubmit();}}
              onTouchEnd={e=>{e.preventDefault();handleSubmit();}}
              disabled={isIneq?(!selectedOp||!input.trim()):!input.trim()}>
              Submit
            </button>
          </>
        )}
      </div>

      <div style={{marginTop:16,display:"flex",gap:8}}>
        {ACTIVITIES.map((a,i)=>{
          const done=i<actIdx,active=i===actIdx;
          return(<div key={a.id} style={{fontSize:19,fontWeight:700,padding:"4px 14px",borderRadius:99,
            background:done?"rgba(16,185,129,0.15)":active?"rgba(245,158,11,0.15)":"var(--surface)",
            color:done?"var(--green)":active?"var(--amber)":"var(--text3)",
            border:`1px solid ${done?"rgba(16,185,129,0.3)":active?"rgba(245,158,11,0.3)":"var(--border)"}`}}>
            {done?" ":active?" ":""}{a.label}
          </div>);
        })}
      </div>
    </div>
  );
}
