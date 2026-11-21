import { useState, useEffect, useRef } from "react";
import useActivityTracking from "./core/useActivityTracking";
import { saveProgress, getProgress } from "./core/firebase";

export const TOPIC_ID = "lesson22-ec-v1";
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
function gradeRep(str,p,q){
  const v=parseRep(str);
  return !!v&&v[0]*q===p*v[1];
}

// ---------- Activity 1: ax + b = cx + d (two fractions, two decimals) ----------
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
    // the two fractions must have different denominators
    const fr=[a,b,c,d].filter(v=>!v.isDec);
    if(fr[0].d===fr[1].d) continue;
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
// ---------- Activity 2: three-step integer expressions ----------
// One power or root, one multiplication or division, one addition or subtraction.
// Tree nodes: {t:"n",v} number, {t:"b",op,l,r} + - * /, {t:"p",e,x} power, {t:"r",k,x} root
const MINUS="\u2212";
function numN(v){return{t:"n",v};}
function nz(lo,hi){let v=0;while(v===0)v=randInt(lo,hi);return v;}
function sgn(v){return Math.random()<0.5?-v:v;}
function divisors(n){const a=Math.abs(n),out=[];for(let d=2;d<=a;d++)if(a%d===0)out.push(d);return out;}

// A subtree using one + / - or one x / / that equals target
function makeVal(target,kind){
  if(kind==="A"){
    const op=pick(["+","-"]),b=nz(1,15)*(Math.random()<0.3?-1:1);
    const a=op==="+"?target-b:target+b;
    if(a===0||Math.abs(a)>200) return null;
    return{t:"b",op,l:numN(a),r:numN(b)};
  }
  const op=pick(["*","/"]);
  if(op==="*"){
    if(target===0) return null;
    const ds=divisors(target);if(!ds.length) return null;
    const a=sgn(pick(ds)),b=target/a;
    if(Math.abs(b)<2&&Math.random()<0.7) return null;
    return{t:"b",op,l:numN(a),r:numN(b)};
  }
  const b=sgn(randInt(2,9)),a=target*b;
  if(a===0||Math.abs(a)>300) return null;
  return{t:"b",op,l:numN(a),r:numN(b)};
}

// A power or root node whose inside is `inner` ("lit", "A" or "M"); returns node and its value
function makePR(kind,inner,undef){
  if(kind==="sq"||kind==="cu"){
    const e=kind==="sq"?2:3,t=sgn(e===2?randInt(1,12):randInt(1,5));
    const x=inner==="lit"?numN(t):makeVal(t,inner);
    if(!x) return null;
    return{node:{t:"p",e,x},val:Math.pow(t,e)};
  }
  const k=kind==="sqrt"?2:3,r=k===2?randInt(1,12):randInt(1,5);
  let rad=k===2?r*r:r*r*r;
  if(k===2&&undef) rad=-rad;
  if(k===3&&Math.random()<0.4) rad=-rad;
  const x=inner==="lit"?numN(rad):makeVal(rad,inner);
  if(!x) return null;
  return{node:{t:"r",k,x},val:undef?null:(k===2?r:(rad<0?-r:r))};
}

function build(undef){
  const kind=undef?"sqrt":pick(["sq","cu","sqrt","cbrt"]);
  const shape=undef?pick(["inA","inM"]):pick(["lit","lit","inA","inM","outer"]);
  if(shape==="lit"){
    // P(literal), then x or / with a number, then + or - with a number
    const P=makePR(kind,"lit",false);if(!P) return null;
    const mop=pick(["*","/"]),pLeft=Math.random()<0.5;
    let y;
    if(mop==="*") y=sgn(randInt(2,9));
    else if(pLeft){const ds=divisors(P.val);if(!ds.length) return null;y=sgn(pick(ds));}
    else{if(P.val===0) return null;y=P.val*sgn(randInt(1,6));}
    const M={t:"b",op:mop,l:pLeft?P.node:numN(y),r:pLeft?numN(y):P.node};
    const aop=pick(["+","-"]),c=nz(-20,20),mFirst=Math.random()<0.5;
    return{t:"b",op:aop,l:mFirst?M:numN(c),r:mFirst?numN(c):M};
  }
  if(shape==="inA"){
    // P(a +/- b) combined with x or / and a number
    const P=makePR(kind,"A",undef);if(!P) return null;
    const mop=pick(["*","/"]),pLeft=Math.random()<0.6;
    let y;
    if(undef||mop==="*") y=sgn(randInt(2,9));
    else if(pLeft){const ds=divisors(P.val);if(!ds.length) return null;y=sgn(pick(ds));}
    else{if(P.val===0) return null;y=P.val*sgn(randInt(1,6));}
    return{t:"b",op:mop,l:pLeft?P.node:numN(y),r:pLeft?numN(y):P.node};
  }
  if(shape==="inM"){
    // P(a x/ b) combined with + or - and a number
    const P=makePR(kind,"M",undef);if(!P) return null;
    const aop=pick(["+","-"]),c=nz(-20,20),pLeft=Math.random()<0.5;
    return{t:"b",op:aop,l:pLeft?P.node:numN(c),r:pLeft?numN(c):P.node};
  }
  // outer: (a +/- b) x/ P(literal)
  const P=makePR(kind,"lit",false);if(!P) return null;
  const mop=pick(["*","/"]),pLeft=Math.random()<0.5;
  let t;
  if(mop==="*") t=sgn(randInt(2,12));
  else if(pLeft){const ds=divisors(P.val);if(!ds.length) return null;t=sgn(pick(ds));}
  else{if(P.val===0) return null;t=P.val*sgn(randInt(1,5));}
  const A=makeVal(t,"A");if(!A) return null;
  return{t:"b",op:mop,l:pLeft?P.node:A,r:pLeft?A:P.node};
}

// Plain-text rendering (used in the worked steps)
const PREC={"+":1,"-":1,"*":2,"/":2};
function prec(n){return n.t==="b"?PREC[n.op]:n.t==="n"?5:4;}
function txt(n,first){
  if(n.t==="n") return n.v<0?(first?MINUS+(-n.v):"("+MINUS+(-n.v)+")"):String(n.v);
  if(n.t==="p"){
    const needP=n.x.t!=="n"||n.x.v<0;
    return (needP?"("+txt(n.x,true)+")":txt(n.x,true))+(n.e===2?"\u00b2":"\u00b3");
  }
  if(n.t==="r") return (n.k===2?"\u221a":"\u221b")+"("+txt(n.x,true)+")";
  const sym={"+":" + ","-":" "+MINUS+" ","*":" \u00d7 ","/":" \u00f7 "}[n.op];
  const wl=prec(n.l)<PREC[n.op],wr=prec(n.r)<PREC[n.op]||(prec(n.r)===PREC[n.op]&&(n.op==="-"||n.op==="/"));
  const L=wl?"("+txt(n.l,true)+")":txt(n.l,first);
  const R=wr?"("+txt(n.r,true)+")":txt(n.r,false);
  return L+sym+R;
}
function fmtInt(v){return v<0?MINUS+(-v):String(v);}

// Exact evaluation with steps; a square root of a negative number makes the result undefined
function evalExpr(root){
  const steps=[];
  function ev(n,first){
    if(n.t==="n") return{v:n.v};
    if(n.t==="b"){
      const a=ev(n.l,first);if(a.undef||a.err) return a;
      const b=ev(n.r,false);if(b.undef||b.err) return b;
      let v;
      if(n.op==="+") v=a.v+b.v;else if(n.op==="-") v=a.v-b.v;else if(n.op==="*") v=a.v*b.v;
      else{if(b.v===0||a.v%b.v!==0) return{err:true};v=a.v/b.v;}
      steps.push({text:txt(n,first),v});return{v};
    }
    const x=ev(n.x,true);if(x.undef||x.err) return x;
    if(n.t==="p"){const v=Math.pow(x.v,n.e);steps.push({text:txt(n,first),v});return{v};}
    if(n.k===2){
      if(x.v<0){steps.push({text:txt(n,first),undef:true,rad:x.v});return{undef:true};}
      const r=Math.round(Math.sqrt(x.v));if(r*r!==x.v) return{err:true};
      steps.push({text:txt(n,first),v:r});return{v:r};
    }
    const r=Math.round(Math.cbrt(x.v));if(r*r*r!==x.v) return{err:true};
    steps.push({text:txt(n,first),v:r});return{v:r};
  }
  const res=ev(root,true);
  return{...res,steps};
}

function genExpr(){
  const undef=Math.random()<0.2;
  for(let t=0;t<20000;t++){
    const tree=build(undef);if(!tree) continue;
    const r=evalExpr(tree);
    if(r.err) continue;
    if(!!r.undef!==undef) continue;
    if(!undef&&Math.abs(r.v)>1000) continue;
    return{type:"expr",tree,undef,v:undef?null:r.v,steps:r.steps,text:txt(tree,true)};
  }
  return genExpr();
}
function gradeExpr(input,undefPicked,p){
  if(p.undef) return undefPicked;
  if(undefPicked) return false;
  const s=input.replace(/\s+/g,"").replace(/\u2212/g,"-");
  return /^-?\d+$/.test(s)&&Number(s)===p.v;
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

// Math rendering of an expression tree with real radical signs and exponents
function Ex({n,first=true}){
  if(n.t==="n") return <span>{n.v<0?(first?MINUS+(-n.v):"("+MINUS+(-n.v)+")"):n.v}</span>;
  if(n.t==="p"){
    const needP=n.x.t!=="n"||n.x.v<0;
    return <span>{needP?<>(<Ex n={n.x}/>)</>:<Ex n={n.x}/>}<sup style={{fontSize:"0.6em"}}>{n.e}</sup></span>;
  }
  if(n.t==="r") return(
    <span style={{display:"inline-flex",alignItems:"flex-start",whiteSpace:"nowrap"}}>
      {n.k===3&&<sup style={{fontSize:"0.5em",marginRight:-4,marginTop:2}}>3</sup>}
      <span style={{fontSize:"1.15em",lineHeight:1}}>{"\u221a"}</span>
      <span style={{borderTop:"2px solid currentColor",paddingTop:2,paddingLeft:2,paddingRight:2,marginTop:3}}><Ex n={n.x}/></span>
    </span>
  );
  const sym={"+":" + ","-":" "+MINUS+" ","*":" \u00d7 ","/":" \u00f7 "}[n.op];
  const wl=prec(n.l)<PREC[n.op],wr=prec(n.r)<PREC[n.op]||(prec(n.r)===PREC[n.op]&&(n.op==="-"||n.op==="/"));
  return(
    <span style={{whiteSpace:"pre"}}>
      {wl?<>(<Ex n={n.l}/>)</>:<Ex n={n.l} first={first}/>}{sym}{wr?<>(<Ex n={n.r}/>)</>:<Ex n={n.r} first={false}/>}
    </span>
  );
}

const TOPICS=[
  {id:"eq",label:"Equations",subLabel:"Decimals and fractions on both sides",gen:genEq},
  {id:"expr",label:"Order of Operations",subLabel:"Powers, roots and integers",gen:genExpr},
];

const workStyle={fontFamily:"var(--mono)",fontSize:16,color:"var(--text3)",lineHeight:2.1,
  background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"10px 16px",marginBottom:12};
const inputStyle={textAlign:"center",fontSize:28,fontFamily:"var(--mono)",fontWeight:700,padding:"12px"};

export default function ExtraCredit22Player({user,topic,onHome}){
  useActivityTracking(user,TOPIC_ID,"Classwork 22 EC (019)");
  const topicId=topic?.id||TOPIC_ID;

  const [topicIdx,setTopicIdx]=useState(0);
  const [streak,setStreak]=useState(0);
  const [problem,setProblem]=useState(null);
  const [input,setInput]=useState("");
  const [rep,setRep]=useState(null);          // {s,e}: digits under the bar
  const [undefPicked,setUndefPicked]=useState(false);
  const [phase,setPhase]=useState("question");
  const [loading,setLoading]=useState(true);
  const [wrong,setWrong]=useState(null);
  const inputRef=useRef(null);
  const pending=useRef(null);

  const cur=TOPICS[topicIdx];
  const isExpr=cur?.id==="expr";

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
    setInput("");setRep(null);setUndefPicked(false);setPhase("question");setWrong(null);pending.current=null;
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
    if(!problem||phase!=="question"||!(input.trim()||undefPicked))return;
    const p=problem;
    let correct;
    const barred=rep?input.slice(0,rep.s)+"["+input.slice(rep.s,rep.e)+"]"+input.slice(rep.e):null;
    if(p.type==="expr") correct=gradeExpr(input,undefPicked,p);
    else correct=barred?gradeRep(barred,p.xn,p.xd):gradeEq(input,p.xn,p.xd);
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
      setStreak(0);setWrong({text:undefPicked?"undefined":input,rep:undefPicked?null:rep});setPhase("wrong");
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
        <p style={{color:"var(--text2)",fontSize:19,marginBottom:24}}>Excellent work!</p>
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
    if(p.type==="expr"){
      work=(
        <div style={workStyle}>
          {p.steps.map((st,i)=>(
            <div key={i}>{st.undef
              ?<>{st.text}: the square root of {fmtInt(st.rad)} is undefined (no number times itself is negative)</>
              :<>{st.text} = {fmtInt(st.v)}</>}</div>
          ))}
          <div style={{fontWeight:700}}>Answer: {p.undef?"undefined":fmtInt(p.v)}</div>
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
            Extra Credit - Classwork 22 &middot; Activity {topicIdx+1} of {TOPICS.length}
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
              <span style={{display:"inline-flex",background:"var(--bg2)",borderRadius:"var(--radius)",padding:"14px 20px"}}>
                {p.type==="expr"
                  ?<span style={{fontSize:24,fontWeight:800,fontFamily:"var(--mono)"}}><Ex n={p.tree}/></span>
                  :<Equation p={p} sz={20}/>}
              </span>
            </div>
            {work}
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:16,marginBottom:14,flexWrap:"wrap"}}>
              <span style={{fontSize:20,color:"var(--red)",textDecoration:"line-through"}}>
                <TypedNum text={wrong.text} rep={wrong.rep}/>
              </span>
              <span style={{fontSize:24,fontWeight:800,color:"var(--green)"}}>
                {p.type==="expr"
                  ?<span style={{fontFamily:"var(--mono)"}}>{p.undef?"undefined":fmtInt(p.v)}</span>
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

        {phase==="question"&&p&&p.type==="expr"&&(
          <>
            <p style={{textAlign:"center",fontSize:19,fontWeight:600,color:"var(--text2)",marginBottom:12}}>Evaluate:</p>
            <div style={{textAlign:"center",marginBottom:16}}>
              <span style={{display:"inline-flex",background:"var(--bg2)",borderRadius:"var(--radius)",padding:"20px 24px",
                fontSize:28,fontWeight:800,fontFamily:"var(--mono)",maxWidth:"100%",overflowX:"auto"}}>
                <Ex n={p.tree}/>
              </span>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
              <input ref={inputRef} value={undefPicked?"":input} disabled={undefPicked}
                onChange={e=>setInput(e.target.value.replace(/[^0-9-]/g,""))}
                onKeyDown={e=>e.key==="Enter"&&handleSubmit()}
                inputMode="text" style={{...inputStyle,flex:1,minWidth:0,opacity:undefPicked?0.4:1}}/>
              <button type="button" onMouseDown={e=>e.preventDefault()}
                onClick={()=>{setUndefPicked(u=>!u);}}
                style={{padding:"12px 14px",fontSize:18,fontWeight:800,borderRadius:"var(--radius-sm)",cursor:"pointer",
                  border:"2px solid "+(undefPicked?"var(--blue)":"var(--border2)"),
                  background:undefPicked?"var(--blue)":"var(--surface)",color:undefPicked?"#fff":"var(--text)"}}>
                Undefined
              </button>
            </div>
            <button className="btn btn-primary" style={{width:"100%",fontSize:20,padding:"14px"}}
              onMouseDown={e=>{e.preventDefault();handleSubmit();}}
              onTouchEnd={e=>{e.preventDefault();handleSubmit();}}
              disabled={!(input.trim()||undefPicked)}>
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
            <p style={{textAlign:"center",fontSize:16,color:"var(--text3)",marginBottom:8,lineHeight:1.9}}>
              Answer as a fraction or mixed number (e.g. 2 1/3) in simplest form, or as a decimal.
              For a repeating decimal, highlight the repeating digit(s) and press the
              <span style={{display:"inline-flex",flexDirection:"column",verticalAlign:"bottom",fontWeight:900,lineHeight:1.2,marginLeft:5}}>
                <span style={{height:2,background:"currentColor"}}/><span>abc</span>
              </span> button.
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
