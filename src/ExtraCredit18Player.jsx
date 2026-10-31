import { useState, useEffect, useRef } from "react";
import useActivityTracking from "./core/useActivityTracking";
import { saveProgress, getProgress } from "./core/firebase";

export const TOPIC_ID = "lesson18-ec-v1";
const STREAK_NEEDED = 2;

// LOGIC START
function randInt(min,max){return Math.floor(Math.random()*(max-min+1))+min;}
function pick(arr){return arr[Math.floor(Math.random()*arr.length)];}

// Size of each unit in millimeters
const MM={mm:1,cm:10,dm:100,m:1000,km:1000000};
const ORDER=["mm","cm","dm","m","km"];

// Exact decimal display of n / 10^d
function dec(n,d){
  if(d===0) return String(n);
  const s=String(n).padStart(d+1,"0");
  let out=s.slice(0,s.length-d)+"."+s.slice(s.length-d);
  out=out.replace(/0+$/,"").replace(/\.$/,"");
  return out;
}
// Length L (an integer count of base units) written in unit u
function inUnit(L,base,u){
  const f=MM[u]/MM[base];                 // 1, 10, 100 or 1000
  const d=Math.round(Math.log10(f));
  return dec(L,d);
}
function commas(n){return n.toLocaleString("en-US");}

// ---------- Activity 1: two parts in different units ----------
const OBJECTS={
  km:["hiking trail","bike path","tunnel","race course","bridge"],
  m:["rope","fence","garden hose","pipe","train platform"],
  dm:["ribbon","wooden board","strip of paper","shelf"],
};

function genParts(){
  for(let i=0;i<5000;i++){
    const i1=randInt(1,4),i2=randInt(1,i1-1>=1?i1-1:1);
    if(i2>=i1) continue;
    const u1=ORDER[i1],u2=ORDER[i2];      // u1 bigger than u2, both cm..km
    if(u2==="mm") continue;
    const ai=randInt(0,i2-1),A=ORDER[ai]; // answer unit, smaller than both
    // part 1: n1 / 10^d1 of u1
    const d1=u1==="cm"?pick([0,1]):pick([0,1,1,2]);
    const n1=d1===0?randInt(1,20):randInt(d1===1?11:101,d1===1?99:999);
    if(d1>0&&n1%10===0) continue;
    // part 2: n2 / 10^d2 of u2
    const d2=pick([0,0,1]);
    const n2=d2===0?randInt(2,950):randInt(11,999);
    if(d2>0&&n2%10===0) continue;
    if(MM[u1]/Math.pow(10,d1)<1||MM[u2]/Math.pow(10,d2)<1) continue;
    const mm1=n1*MM[u1]/Math.pow(10,d1),mm2=n2*MM[u2]/Math.pow(10,d2);
    if(!Number.isInteger(mm1)||!Number.isInteger(mm2)) continue;
    // keep the second part shorter than the first, so the object reads naturally
    if(mm2>=mm1) continue;
    const tot=mm1+mm2;
    if(tot%MM[A]!==0) continue;
    const a1=mm1/MM[A],a2=mm2/MM[A],ans=tot/MM[A];
    if(ans>10000000) continue;
    const big=u1==="km"?"km":u1==="m"?"m":"dm";
    return{type:"parts",obj:pick(OBJECTS[big]),u1,u2,A,v1:dec(n1,d1),v2:dec(n2,d2),a1,a2,ans};
  }
  return genParts();
}

// ---------- Activity 2: L / T / U shapes with mixed units ----------
function shapeL(){
  const W=randInt(55,90),H=randInt(55,90),cw=randInt(20,W-25),ch=randInt(20,H-25);
  return{shape:"L",
    lens:[W,H-ch,cw,ch,W-cw,H],dirs:["h","v","h","v","h","v"],
    verts:[[0,H],[W,H],[W,ch],[W-cw,ch],[W-cw,0],[0,0]],
    hide:Math.random()<0.5?[2,3]:[0,5],
    area:W*H-cw*ch,areaWork:W+" x "+H+" - "+cw+" x "+ch};
}
function shapeT(){
  const W=randInt(60,90),bh=randInt(20,35),sh=randInt(25,45);
  const tw=randInt(20,W-30),sl=randInt(12,W-tw-12),H=bh+sh;
  return{shape:"T",
    lens:[W,bh,W-sl-tw,sh,tw,sh,sl,bh],dirs:["h","v","h","v","h","v","h","v"],
    verts:[[0,H],[W,H],[W,sh],[sl+tw,sh],[sl+tw,0],[sl,0],[sl,sh],[0,sh]],
    hide:Math.random()<0.5?[2,3]:[0,1],
    area:W*bh+tw*sh,areaWork:W+" x "+bh+" + "+tw+" x "+sh};
}
function shapeU(){
  const W=randInt(60,90),H=randInt(60,90),lw=randInt(15,22),rw=randInt(15,22),ch=randInt(25,H-20);
  return{shape:"U",
    lens:[W,H,rw,ch,W-lw-rw,ch,lw,H],dirs:["h","v","h","v","h","v","h","v"],
    verts:[[0,H],[W,H],[W,0],[W-rw,0],[W-rw,ch],[lw,ch],[lw,0],[0,0]],
    hide:Math.random()<0.5?[3,4]:[0,1],
    area:W*H-(W-lw-rw)*ch,areaWork:W+" x "+H+" - "+(W-lw-rw)+" x "+ch};
}

function shoelace(v){
  let s=0;for(let i=0;i<v.length;i++){const[a,b]=v[i],[c,d]=v[(i+1)%v.length];s+=a*d-c*b;}
  return Math.abs(s)/2;
}

function genShape(){
  const base=pick(["mm","cm","dm","m"]);
  for(let tries=0;tries<1000;tries++){
    const s=pick([shapeL,shapeT,shapeU])();
    if(Math.random()<0.5) s.verts=s.verts.map(([x,y])=>[y,x]);
    const bi=ORDER.indexOf(base);
    // label units: the base unit and bigger units up to 1000 times the base
    const choices=ORDER.slice(bi).filter(u=>MM[u]/MM[base]<=1000);
    const units=s.lens.map(()=>pick(choices));
    const shown=s.lens.map((_,i)=>i).filter(i=>!s.hide.includes(i));
    const shownUnits=new Set(shown.map(i=>units[i]));
    if(shownUnits.size<Math.min(3,choices.length)) continue;
    const labels=s.lens.map((L,i)=>inUnit(L,base,units[i])+" "+units[i]);
    const perimeter=s.lens.reduce((a,b)=>a+b,0);
    if(shoelace(s.verts)!==s.area) continue;   // sanity check
    return{type:"shape",...s,base,units,labels,perimeter};
  }
  return genShape();
}

function gradeInt(input,ans){
  const s=input.replace(/[,\s]/g,"");
  return /^\d+$/.test(s)&&+s===ans;
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

function SqUnit({u}){return <span>{u}<sup style={{fontSize:"0.65em"}}>2</sup></span>;}

function pointInPoly(x,y,pts){
  let inside=false;
  for(let i=0,j=pts.length-1;i<pts.length;j=i++){
    const[xi,yi]=pts[i],[xj,yj]=pts[j];
    if(((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi)) inside=!inside;
  }
  return inside;
}

function ShapeSVG({p,reveal}){
  const VW=420,VH=360,pad=80;
  const xs=p.verts.map(v=>v[0]),ys=p.verts.map(v=>v[1]);
  const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
  const sc=Math.min((VW-2*pad)/(maxX-minX),(VH-2*pad)/(maxY-minY));
  const ox=(VW-(maxX-minX)*sc)/2,oy=(VH-(maxY-minY)*sc)/2;
  const pts=p.verts.map(([x,y])=>[(x-minX)*sc+ox,(y-minY)*sc+oy]);
  const d=pts.map((q,i)=>(i?"L":"M")+q[0].toFixed(1)+" "+q[1].toFixed(1)).join(" ")+" Z";
  const n=pts.length;
  const CH=9.2,TH=17;   // approximate character width and text height (15px mono)

  // Build label boxes
  const labs=[];
  pts.forEach((a,i)=>{
    const hidden=p.hide.includes(i);
    if(hidden&&!reveal) return;
    const b=pts[(i+1)%n];
    const mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2;
    const horiz=Math.abs(a[1]-b[1])<0.5;
    let nx=horiz?0:1,ny=horiz?1:0;
    if(pointInPoly(mx+nx*4,my+ny*4,pts)){nx=-nx;ny=-ny;}
    const text=hidden?p.lens[i]+" "+p.base:p.labels[i];
    const len=text.length*CH;
    // a vertical side that faces another part of the shape (inside a notch) gets a turned label
    let rot=false;
    if(!horiz) for(let t=12;t<=400&&!rot;t+=4) if(pointInPoly(mx+nx*t,my,pts)) rot=true;
    const w=horiz?len:(rot?TH:len),h=horiz?TH:(rot?len:TH);
    const gap=6;
    const dist=(horiz?h:w)/2+gap;
    labs.push({text,hidden,rot,nx,ny,w,h,cx:mx+nx*dist,cy:my+ny*dist});
  });

  // Push overlapping labels apart along their outward direction
  const overlap=(A,B)=>Math.abs(A.cx-B.cx)<(A.w+B.w)/2+3&&Math.abs(A.cy-B.cy)<(A.h+B.h)/2+3;
  for(let it=0;it<40;it++){
    let moved=false;
    for(let i=0;i<labs.length;i++) for(let j=i+1;j<labs.length;j++){
      if(overlap(labs[i],labs[j])){
        const m=labs[j].rot||labs[j].nx===0?labs[j]:labs[i];
        m.cx+=m.nx*5;m.cy+=m.ny*5;moved=true;
      }
    }
    if(!moved) break;
  }

  return(
    <svg viewBox={"0 0 "+VW+" "+VH} style={{width:"100%",maxWidth:460,display:"block",margin:"0 auto"}}>
      <path d={d} fill="rgba(59,130,246,0.08)" stroke="var(--blue)" strokeWidth="3" strokeLinejoin="round"/>
      {labs.map((L,i)=>(
        <text key={i} x={L.cx} y={L.cy} textAnchor="middle" dominantBaseline="central"
          transform={L.rot?"rotate(-90 "+L.cx+" "+L.cy+")":undefined}
          fontSize="15" fontWeight="800" fontFamily="var(--mono)"
          fill={L.hidden?"var(--green)":"var(--text)"}
          stroke="var(--bg2)" strokeWidth="4" paintOrder="stroke">{L.text}</text>
      ))}
    </svg>
  );
}

const TOPICS=[
  {id:"parts",label:"Metric Lengths",subLabel:"Add two lengths given in different units",gen:genParts},
  {id:"shape",label:"Perimeter & Area",subLabel:"Shapes with sides in different metric units",gen:genShape},
];

const inputStyle={textAlign:"center",fontSize:26,fontFamily:"var(--mono)",fontWeight:700,padding:"10px"};
const workStyle={fontFamily:"var(--mono)",fontSize:16,color:"var(--text3)",lineHeight:2.1,
  background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"10px 16px",marginBottom:12};

export default function ExtraCredit18Player({user,topic,onHome}){
  useActivityTracking(user,TOPIC_ID,"Classwork 18 EC (019)");
  const topicId=topic?.id||TOPIC_ID;

  const [topicIdx,setTopicIdx]=useState(0);
  const [streak,setStreak]=useState(0);
  const [problem,setProblem]=useState(null);
  const [inA,setInA]=useState("");
  const [inB,setInB]=useState("");
  const [phase,setPhase]=useState("question");
  const [loading,setLoading]=useState(true);
  const [wrong,setWrong]=useState(null);
  const refA=useRef(null);
  const refB=useRef(null);
  const pending=useRef(null);

  const cur=TOPICS[topicIdx];
  const isShape=cur?.id==="shape";

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
    setInA("");setInB("");setPhase("question");setWrong(null);pending.current=null;
    setTimeout(()=>refA.current?.focus(),80);
  };

  const saveProg=async(ti,st,done)=>{
    await saveProgress(user.id,topicId,{
      started:true,completed:done,
      percentComplete:done?100:Math.round((ti/TOPICS.length)*100),
      data:{topicIdx:ti,streak:st,completed:done},
    });
  };

  const canSubmit=isShape?(inA.trim()&&inB.trim()):inA.trim();

  const handleSubmit=async()=>{
    if(!problem||phase!=="question"||!canSubmit)return;
    const p=problem;
    let okA,okB=true;
    if(p.type==="parts") okA=gradeInt(inA,p.ans);
    else{okA=gradeInt(inA,p.perimeter);okB=gradeInt(inB,p.area);}
    if(okA&&okB){
      const ns=streak+1;setStreak(ns);setPhase("correct");
      if(ns>=STREAK_NEEDED){
        const next=topicIdx+1;
        if(next>=TOPICS.length){pending.current={action:"done"};await saveProg(next,0,true);}
        else{pending.current={action:"next",ti:next};await saveProg(next,0,false);}
      } else {
        pending.current={action:"stay"};await saveProg(topicIdx,ns,false);
      }
    } else {
      setStreak(0);setWrong({a:inA,b:inB,okA,okB});setPhase("wrong");
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
        <p style={{color:"var(--text2)",fontSize:19,marginBottom:24}}>Great work with metric units!</p>
        <button className="btn btn-primary btn-lg" style={{width:"100%"}} onClick={onHome}> Back to Home</button>
      </div>
    </div>
  );

  const p=problem;

  const partsText=p&&p.type==="parts"&&(
    <div style={{fontSize:20,lineHeight:1.6,textAlign:"left"}}>
      A {p.obj} is made of two parts. One part is <b>{p.v1} {p.u1}</b> long and the other part
      is <b>{p.v2} {p.u2}</b> long. What is the total length of the {p.obj} in <b>{p.A}</b>?
    </div>
  );

  const shapePrompt=p&&p.type==="shape"&&(
    <div style={{textAlign:"center",fontSize:19,fontWeight:600,color:"var(--text2)",marginBottom:6}}>
      Find the perimeter in <b>{p.base}</b> and the area in <b><SqUnit u={p.base}/></b>.
    </div>
  );

  const ansLine=(label,studentVal,ok,val,unitEl)=>(
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:12,marginBottom:8,flexWrap:"wrap"}}>
      {label&&<span style={{fontSize:19,fontWeight:700,color:"var(--text2)"}}>{label}:</span>}
      {!ok&&<span style={{fontSize:20,fontFamily:"var(--mono)",color:"var(--red)",
        textDecoration:"line-through"}}>{studentVal}</span>}
      <span style={{fontSize:24,fontFamily:"var(--mono)",fontWeight:800,color:"var(--green)"}}>
        {commas(val)} {unitEl}
      </span>
    </div>
  );

  let work=null;
  if(p&&phase==="wrong"){
    if(p.type==="parts"){
      work=(
        <div style={workStyle}>
          <div>{p.v1} {p.u1} = {commas(p.a1)} {p.A}</div>
          <div>{p.v2} {p.u2} = {commas(p.a2)} {p.A}</div>
          <div>Total = {commas(p.a1)} + {commas(p.a2)} = {commas(p.ans)} {p.A}</div>
        </div>
      );
    } else {
      work=(
        <div style={workStyle}>
          <div>All sides in {p.base}: {p.lens.join(", ")}</div>
          <div>Perimeter = {p.lens.join(" + ")} = {commas(p.perimeter)} {p.base}</div>
          <div>Area = {p.areaWork} = {commas(p.area)} <SqUnit u={p.base}/></div>
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
            Extra Credit - Classwork 18 &middot; Activity {topicIdx+1} of {TOPICS.length}
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
            {p.type==="parts"?(
              <div style={{background:"var(--bg2)",borderRadius:"var(--radius)",padding:"16px 20px",marginBottom:12}}>
                {partsText}
              </div>
            ):(
              <div style={{marginBottom:8}}><ShapeSVG p={p} reveal/></div>
            )}
            {work}
            {p.type==="parts"
              ?ansLine(null,wrong.a,wrong.okA,p.ans,p.A)
              :<>
                {ansLine("Perimeter",wrong.a,wrong.okA,p.perimeter,p.base)}
                {ansLine("Area",wrong.b,wrong.okB,p.area,<SqUnit u={p.base}/>)}
              </>}
            <button className="btn btn-success" style={{width:"100%",fontSize:20,padding:"13px",marginTop:8}}
              onClick={()=>newProblem(topicIdx)}>
              Got it - try again
            </button>
          </div>
        )}

        {phase==="question"&&p&&(
          <>
            {p.type==="parts"?(
              <>
                <div style={{background:"var(--bg2)",borderRadius:"var(--radius)",padding:"18px 22px",marginBottom:16}}>
                  {partsText}
                </div>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                  <input ref={refA} value={inA}
                    onChange={e=>setInA(e.target.value.replace(/[^0-9,]/g,""))}
                    onKeyDown={e=>e.key==="Enter"&&handleSubmit()}
                    inputMode="numeric" style={{...inputStyle,flex:1}}/>
                  <span style={{fontSize:24,fontWeight:800,fontFamily:"var(--mono)"}}>{p.A}</span>
                </div>
              </>
            ):(
              <>
                {shapePrompt}
                <div style={{marginBottom:10}}><ShapeSVG p={p}/></div>
                <div style={{marginBottom:10}}>
                  <div style={{fontSize:18,fontWeight:700,color:"var(--text2)",marginBottom:4}}>Perimeter</div>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <input ref={refA} value={inA}
                      onChange={e=>setInA(e.target.value.replace(/[^0-9,]/g,""))}
                      onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();refB.current?.focus();}}}
                      inputMode="numeric" style={{...inputStyle,flex:1}}/>
                    <span style={{fontSize:22,fontWeight:800,fontFamily:"var(--mono)",minWidth:44}}>{p.base}</span>
                  </div>
                </div>
                <div style={{marginBottom:12}}>
                  <div style={{fontSize:18,fontWeight:700,color:"var(--text2)",marginBottom:4}}>Area</div>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <input ref={refB} value={inB}
                      onChange={e=>setInB(e.target.value.replace(/[^0-9,]/g,""))}
                      onKeyDown={e=>e.key==="Enter"&&handleSubmit()}
                      inputMode="numeric" style={{...inputStyle,flex:1}}/>
                    <span style={{fontSize:22,fontWeight:800,fontFamily:"var(--mono)",minWidth:44}}><SqUnit u={p.base}/></span>
                  </div>
                </div>
              </>
            )}
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
