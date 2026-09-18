import { useState, useEffect, useRef } from "react";
import useActivityTracking from "./core/useActivityTracking";
import { saveProgress, getProgress } from "./core/firebase";

export const TOPIC_ID = "lesson08-ec-v1";
const STREAK_NEEDED = 3;

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

//  12 Contexts: (speed, time, distance) generators with unit conversion
// Each generator returns { prompt, answer, unit }

// Precomputed valid worm pairs (s=in/min, t=min, d=ft) all integers
const WORM_PAIRS = [
  {s:1,t:12,d:1},{s:1,t:24,d:2},{s:1,t:36,d:3},
  {s:2,t:6,d:1},{s:2,t:12,d:2},{s:2,t:24,d:4},
  {s:3,t:4,d:1},{s:3,t:8,d:2},{s:3,t:12,d:3},
  {s:4,t:6,d:2},{s:4,t:12,d:4},{s:6,t:2,d:1},
  {s:6,t:4,d:2},{s:6,t:8,d:4},{s:6,t:12,d:6},
];

const CONTEXTS = [
  // ---- mph, minutes <-> hours ----
  { name:"car",
    genSpeed:()=>{ const s=pick([20,30,40,50,60,80]); const hr=pick([1,2,3,4,5,6]); const d=s*hr;
      return { prompt:`A car travels ${d} miles in ${hr*60} minutes. What is its speed in miles per hour (mph)?`, answer:s, unit:"mph" }; },
    genTime:()=>{ const s=pick([20,30,40,50,60]); const hr=pick([1,2,3,4,5,6]); const d=s*hr;
      return { prompt:`A car drives at ${s} mph and covers ${d} miles. How many minutes does the trip take?`, answer:hr*60, unit:"minutes" }; },
    genDist:()=>{ const s=pick([20,30,40,50,60]); const hr=pick([1,2,3,4,5,6]); const d=s*hr;
      return { prompt:`A car drives at ${s} mph for ${hr*60} minutes. How many miles does it travel?`, answer:d, unit:"miles" }; },
  },
  { name:"train",
    genSpeed:()=>{ const s=pick([60,80,100,120]); const hr=pick([1,2,3,4]); const d=s*hr;
      return { prompt:`A train travels ${d} miles in ${hr*60} minutes. What is its speed in miles per hour?`, answer:s, unit:"mph" }; },
    genTime:()=>{ const s=pick([60,80,100,120]); const hr=pick([1,2,3,4]); const d=s*hr;
      return { prompt:`A train moves at ${s} mph and covers ${d} miles. How many minutes does the journey take?`, answer:hr*60, unit:"minutes" }; },
    genDist:()=>{ const s=pick([60,80,100,120]); const hr=pick([1,2,3,4]); const d=s*hr;
      return { prompt:`A train travels at ${s} mph for ${hr*60} minutes. How many miles does it travel?`, answer:d, unit:"miles" }; },
  },
  { name:"plane",
    genSpeed:()=>{ const s=pick([200,300,400,500]); const hr=pick([1,2,3,4]); const d=s*hr;
      return { prompt:`An airplane flies ${d} miles in ${hr*60} minutes. What is its speed in miles per hour?`, answer:s, unit:"mph" }; },
    genTime:()=>{ const s=pick([200,300,400,500]); const hr=pick([1,2,3,4]); const d=s*hr;
      return { prompt:`A plane flies at ${s} mph and travels ${d} miles. How many minutes does the flight last?`, answer:hr*60, unit:"minutes" }; },
    genDist:()=>{ const s=pick([200,300,400,500]); const hr=pick([1,2,3,4]); const d=s*hr;
      return { prompt:`A plane flies at ${s} mph for ${hr*60} minutes. How many miles does it cover?`, answer:d, unit:"miles" }; },
  },
  // ---- miles/day, weeks <-> days ----
  { name:"cyclist",
    genSpeed:()=>{ const s=pick([10,15,20,25,30]); const wk=pick([1,2,3,4]); const d=s*wk*7;
      return { prompt:`A cyclist rides ${d} miles in ${wk} week${wk>1?'s':''}. How many miles per day does the cyclist average?`, answer:s, unit:"miles/day" }; },
    genTime:()=>{ const s=pick([10,15,20,25,30]); const wk=pick([1,2,3,4]); const d=s*wk*7;
      return { prompt:`A cyclist rides ${s} miles per day. The trip is ${d} miles. How many weeks does it take?`, answer:wk, unit:"weeks" }; },
    genDist:()=>{ const s=pick([10,15,20,25,30]); const wk=pick([1,2,3,4]); const d=s*wk*7;
      return { prompt:`A cyclist rides ${s} miles per day for ${wk} week${wk>1?'s':''}. How many miles total?`, answer:d, unit:"miles" }; },
  },
  { name:"ship",
    genSpeed:()=>{ const s=pick([50,100,150,200]); const wk=pick([1,2,3,4]); const d=s*wk*7;
      return { prompt:`A ship travels ${d} miles in ${wk} week${wk>1?'s':''}. What is its speed in miles per day?`, answer:s, unit:"miles/day" }; },
    genTime:()=>{ const s=pick([50,100,150,200]); const wk=pick([1,2,3,4]); const d=s*wk*7;
      return { prompt:`A ship sails ${s} miles per day. The voyage is ${d} miles. How many weeks will it take?`, answer:wk, unit:"weeks" }; },
    genDist:()=>{ const s=pick([50,100,150,200]); const wk=pick([1,2,3,4]); const d=s*wk*7;
      return { prompt:`A ship sails ${s} miles per day for ${wk} week${wk>1?'s':''}. How far does it travel?`, answer:d, unit:"miles" }; },
  },
  { name:"hiker",
    genSpeed:()=>{ const s=pick([7,14,21,28]); const wk=pick([1,2,3,4]); const d=s*wk*7;
      return { prompt:`A hiker walks ${d} miles over ${wk} week${wk>1?'s':''}. How many miles per day is that?`, answer:s, unit:"miles/day" }; },
    genTime:()=>{ const s=pick([7,14,21,28]); const wk=pick([1,2,3,4]); const d=s*wk*7;
      return { prompt:`A hiker walks ${s} miles per day. The trail is ${d} miles long. How many weeks to complete it?`, answer:wk, unit:"weeks" }; },
    genDist:()=>{ const s=pick([7,14,21,28]); const wk=pick([1,2,3,4]); const d=s*wk*7;
      return { prompt:`A hiker walks ${s} miles per day for ${wk} week${wk>1?'s':''}. How many total miles?`, answer:d, unit:"miles" }; },
  },
  // ---- ft/sec, minutes <-> seconds ----
  { name:"sprinter",
    genSpeed:()=>{ const s=pick([5,8,10,15,20,25]); const min=pick([1,2,3,4,5]); const d=s*min*60;
      return { prompt:`A sprinter runs ${d} feet in ${min} minute${min>1?'s':''}. What is the speed in feet per second?`, answer:s, unit:"ft/sec" }; },
    genTime:()=>{ const s=pick([5,8,10,15,20,25]); const min=pick([1,2,3,4,5]); const d=s*min*60;
      return { prompt:`A sprinter runs at ${s} ft/sec and covers ${d} feet. How many minutes does it take?`, answer:min, unit:"minutes" }; },
    genDist:()=>{ const s=pick([5,8,10,15,20,25]); const min=pick([1,2,3,4,5]); const d=s*min*60;
      return { prompt:`A sprinter runs ${s} feet per second for ${min} minute${min>1?'s':''}. How many feet does the sprinter cover?`, answer:d, unit:"feet" }; },
  },
  { name:"swimmer",
    genSpeed:()=>{ const s=pick([2,3,4,5,6]); const min=pick([1,2,3,5,10]); const d=s*min*60;
      return { prompt:`A swimmer covers ${d} feet in ${min} minute${min>1?'s':''}. What is the swimmer's speed in feet per second?`, answer:s, unit:"ft/sec" }; },
    genTime:()=>{ const s=pick([2,3,4,5,6]); const min=pick([1,2,3,5,10]); const d=s*min*60;
      return { prompt:`A swimmer moves at ${s} ft/sec and swims ${d} feet. How many minutes does it take?`, answer:min, unit:"minutes" }; },
    genDist:()=>{ const s=pick([2,3,4,5,6]); const min=pick([1,2,3,5,10]); const d=s*min*60;
      return { prompt:`A swimmer swims at ${s} feet per second for ${min} minute${min>1?'s':''}. How many feet does the swimmer travel?`, answer:d, unit:"feet" }; },
  },
  { name:"cheetah",
    genSpeed:()=>{ const s=pick([40,50,60,80,100]); const min=pick([1,2,3,4]); const d=s*min*60;
      return { prompt:`A cheetah runs ${d} feet in ${min} minute${min>1?'s':''}. What is its speed in feet per second?`, answer:s, unit:"ft/sec" }; },
    genTime:()=>{ const s=pick([40,50,60,80,100]); const min=pick([1,2,3,4]); const d=s*min*60;
      return { prompt:`A cheetah runs at ${s} ft/sec and covers ${d} feet. How many minutes does it run?`, answer:min, unit:"minutes" }; },
    genDist:()=>{ const s=pick([40,50,60,80,100]); const min=pick([1,2,3,4]); const d=s*min*60;
      return { prompt:`A cheetah runs at ${s} feet per second for ${min} minute${min>1?'s':''}. How many feet does it cover?`, answer:d, unit:"feet" }; },
  },
  // ---- miles/month, years <-> months ----
  { name:"spaceship",
    genSpeed:()=>{ const s=pick([10000,20000,30000,40000,50000]); const yr=pick([1,2,3,4,5]); const d=s*yr*12;
      return { prompt:`A spaceship travels ${d.toLocaleString()} miles in ${yr} year${yr>1?'s':''}. What is its speed in miles per month?`, answer:s, unit:"miles/month" }; },
    genTime:()=>{ const s=pick([10000,20000,30000,40000,50000]); const yr=pick([1,2,3,4,5]); const d=s*yr*12;
      return { prompt:`A spaceship travels ${s.toLocaleString()} miles per month. It must cover ${d.toLocaleString()} miles. How many years will it take?`, answer:yr, unit:"years" }; },
    genDist:()=>{ const s=pick([10000,20000,30000,40000,50000]); const yr=pick([1,2,3,4,5]); const d=s*yr*12;
      return { prompt:`A spaceship travels ${s.toLocaleString()} miles per month for ${yr} year${yr>1?'s':''}. How many miles does it cover?`, answer:d, unit:"miles" }; },
  },
  { name:"bird",
    genSpeed:()=>{ const s=pick([100,200,300,400,500]); const yr=pick([1,2,3,4,5]); const d=s*yr*12;
      return { prompt:`A migratory bird travels ${d.toLocaleString()} miles over ${yr} year${yr>1?'s':''}. What is its average speed in miles per month?`, answer:s, unit:"miles/month" }; },
    genTime:()=>{ const s=pick([100,200,300,400,500]); const yr=pick([1,2,3,4,5]); const d=s*yr*12;
      return { prompt:`A migratory bird travels ${s} miles per month. Its journey is ${d.toLocaleString()} miles. How many years does it take?`, answer:yr, unit:"years" }; },
    genDist:()=>{ const s=pick([100,200,300,400,500]); const yr=pick([1,2,3,4,5]); const d=s*yr*12;
      return { prompt:`A migratory bird travels ${s} miles per month for ${yr} year${yr>1?'s':''}. How many miles does it migrate?`, answer:d, unit:"miles" }; },
  },
  // ---- in/min, feet <-> inches ----
  { name:"worm",
    genSpeed:()=>{ const p=pick(WORM_PAIRS);
      return { prompt:`A worm crawls ${p.d} foot${p.d>1?'s':''} in ${p.t} minutes. What is its speed in inches per minute?`, answer:p.s, unit:"in/min" }; },
    genTime:()=>{ const p=pick(WORM_PAIRS);
      return { prompt:`A worm moves at ${p.s} inch${p.s>1?'es':''} per minute. It crawls ${p.d} foot${p.d>1?'s':''}. How many minutes does it take?`, answer:p.t, unit:"minutes" }; },
    genDist:()=>{ const p=pick(WORM_PAIRS);
      return { prompt:`A worm crawls at ${p.s} inch${p.s>1?'es':''} per minute for ${p.t} minutes. How many feet does it travel?`, answer:p.d, unit:"feet" }; },
  },
];

function genProblem(actIdx) {
  const ctx = pick(CONTEXTS);
  if (actIdx === 0) return ctx.genSpeed();
  if (actIdx === 1) return ctx.genTime();
  return ctx.genDist();
}

//  Streak Dots
function StreakDots({ current, needed }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
      <span style={{ fontSize:20, color:"var(--text3)" }}>Streak:</span>
      {Array.from({ length:needed }).map((_,i) => (
        <div key={i} style={{ width:13, height:13, borderRadius:"50%",
          background: i<current?"var(--green)":"var(--surface2)",
          border:`2px solid ${i<current?"var(--green)":"var(--border2)"}`,
          transition:"all 0.2s" }} />
      ))}
      <span style={{ fontSize:20, color:"var(--text3)" }}>{current}/{needed}</span>
    </div>
  );
}

const ACTIVITIES = [
  { id:"speed", label:"Solve for Speed", description:"Find the rate given distance and time" },
  { id:"time", label:"Solve for Time", description:"Find the time given speed and distance" },
  { id:"distance", label:"Solve for Distance", description:"Find the distance given speed and time" },
];

export default function ExtraCredit08Player({ user, topic, onHome }) {
  useActivityTracking(user, TOPIC_ID, "Classwork 8 EC (019)");
  const topicId = topic?.id || TOPIC_ID;

  const [actIdx, setActIdx] = useState(0);
  const [streak, setStreak] = useState(0);
  const [problem, setProblem] = useState(null);
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState("question");
  const [loading, setLoading] = useState(true);
  const [wrongAns, setWrongAns] = useState(null);
  const inputRef = useRef(null);
  const pendingNext = useRef(null);

  const currentActivity = ACTIVITIES[actIdx];

  useEffect(() => {
    const load = async () => {
      const prog = await getProgress(user.id, topicId);
      if (prog?.data) {
        const { actIdx:ai, streak:st, completed } = prog.data;
        if (completed) { setPhase("done"); setLoading(false); return; }
        setActIdx(Math.min(ai||0, ACTIVITIES.length-1));
        setStreak(st||0);
      }
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    if (!loading && actIdx < ACTIVITIES.length) newProblem();
  }, [actIdx, loading]);

  const newProblem = () => {
    setProblem(genProblem(actIdx));
    setInput(""); setPhase("question"); setWrongAns(null); pendingNext.current = null;
    setTimeout(() => inputRef.current?.focus(), 80);
  };

  const gradeAnswer = () => {
    if (!problem) return false;
    const n = parseFloat(input.trim().replace(/,/g,""));
    return !isNaN(n) && n === problem.answer;
  };

  const handleSubmit = async () => {
    if (!problem || phase !== "question" || !input.trim()) return;
    if (gradeAnswer()) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      setPhase("correct");
      const final = newStreak >= STREAK_NEEDED;
      const nextAi = final ? actIdx + 1 : actIdx;
      const done = nextAi >= ACTIVITIES.length && final;
      pendingNext.current = { final, nextAi, done };
      await saveProgress(user.id, topicId, {
        started:true, completed:done,
        percentComplete: done?100:Math.round((nextAi/ACTIVITIES.length)*100),
        data:{ actIdx:nextAi, streak:final?0:newStreak, completed:done },
      });
    } else {
      setStreak(0); setWrongAns(input); setPhase("wrong");
      await saveProgress(user.id, topicId, {
        started:true, completed:false,
        percentComplete:Math.round((actIdx/ACTIVITIES.length)*100),
        data:{ actIdx, streak:0, completed:false },
      });
    }
  };

  const handleNext = () => {
    const p = pendingNext.current;
    if (!p) return;
    if (p.done) setPhase("done");
    else if (p.final) { setActIdx(p.nextAi); setStreak(0); }
    else newProblem();
  };

  if (loading) return <div style={{ display:"flex", justifyContent:"center", padding:60 }}><div className="spinner"/></div>;

  if (phase === "done") return (
    <div style={{ maxWidth:520, margin:"0 auto", textAlign:"center", animation:"fadeUp 0.4s ease" }}>
      <div className="card">
        <div style={{ fontSize:64, marginBottom:16 }}></div>
        <h2 style={{ fontSize:28, fontWeight:800, marginBottom:8 }}>Extra Credit Complete!</h2>
        <p style={{ color:"var(--text2)", fontSize:19, marginBottom:24 }}>You mastered speed, distance, and time with unit conversions!</p>
        <button className="btn btn-primary btn-lg" style={{ width:"100%" }} onClick={onHome}> Back to Home</button>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth:640, margin:"0 auto", animation:"fadeUp 0.3s ease" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, flexWrap:"wrap", gap:8 }}>
        <div>
          <div style={{ fontSize:19, color:"var(--amber)", marginBottom:2, fontWeight:700 }}>
            Extra Credit - Activity {actIdx+1} of {ACTIVITIES.length}
          </div>
          <div style={{ fontSize:20, fontWeight:700 }}>{currentActivity?.label}</div>
          <div style={{ fontSize:17, color:"var(--text3)" }}>{currentActivity?.description}</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onHome}> Home</button>
      </div>

      <div style={{ marginBottom:16 }}>
        <div style={{ height:5, background:"var(--surface2)", borderRadius:99, overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${(actIdx/ACTIVITIES.length)*100}%`,
            background:"linear-gradient(90deg,var(--amber),#f97316)", borderRadius:99 }} />
        </div>
      </div>

      <div className="card">
        <StreakDots current={streak} needed={STREAK_NEEDED} />

        {phase === "correct" && (
          <div style={{ animation:"popIn 0.25s ease", textAlign:"center" }}>
            <div style={{ fontSize:28, marginBottom:8 }}></div>
            <div style={{ fontSize:22, fontWeight:800, color:"var(--green)", marginBottom:6 }}>
              {pendingNext.current?.final ? "Activity complete!" : "Correct!"}
            </div>
            <div style={{ fontSize:19, color:"var(--text3)", marginBottom:20 }}>Streak: {streak}/{STREAK_NEEDED}</div>
            <button className="btn btn-success" style={{ width:"100%", fontSize:20, padding:"13px" }} onClick={handleNext}>
               {pendingNext.current?.final ? "Next activity" : "Next problem"}
            </button>
          </div>
        )}

        {phase === "wrong" && problem && (
          <div style={{ animation:"popIn 0.25s ease" }}>
            <div style={{ fontSize:19, fontWeight:700, color:"#fca5a5", marginBottom:12, textAlign:"center" }}>Not quite! Streak reset.</div>
            <div style={{ background:"var(--bg2)", borderRadius:"var(--radius)", padding:"14px 18px", marginBottom:12, fontSize:19, lineHeight:1.8 }}>
              {problem.prompt}
            </div>
            <div style={{ textAlign:"center", marginBottom:12 }}>
              {wrongAns && <span style={{ fontSize:20, fontFamily:"var(--mono)", color:"var(--red)", textDecoration:"line-through", marginRight:16 }}>{wrongAns}</span>}
              <span style={{ fontSize:22, fontFamily:"var(--mono)", fontWeight:800, color:"var(--green)" }}>{problem.answer.toLocaleString()} {problem.unit}</span>
            </div>
            <button className="btn btn-success" style={{ width:"100%", fontSize:20, padding:"13px" }} onClick={newProblem}>
              Got it - try again
            </button>
          </div>
        )}

        {phase === "question" && problem && (
          <>
            <div style={{ background:"var(--bg2)", borderRadius:"var(--radius)", padding:"16px 20px", marginBottom:20, fontSize:19, lineHeight:1.9, color:"var(--text)" }}>
              {problem.prompt}
            </div>
            <div style={{ textAlign:"center", fontSize:17, color:"var(--text3)", marginBottom:10 }}>
              Answer in: <strong>{problem.unit}</strong>
            </div>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value.replace(/[^0-9.,]/g,""))}
              onKeyDown={e => e.key==="Enter" && handleSubmit()}
              inputMode="numeric"
              placeholder="?"
              style={{ textAlign:"center", fontSize:28, fontFamily:"var(--mono)", fontWeight:700, padding:"12px", marginBottom:12 }}
            />
            <button className="btn btn-primary" style={{ width:"100%", fontSize:20, padding:"14px" }}
              onMouseDown={e => { e.preventDefault(); handleSubmit(); }}
              onTouchEnd={e => { e.preventDefault(); handleSubmit(); }}
              disabled={!input.trim()}>
              Submit
            </button>
          </>
        )}
      </div>

      <div style={{ marginTop:16, display:"flex", gap:8, flexWrap:"wrap" }}>
        {ACTIVITIES.map((a,i) => {
          const done=i<actIdx, active=i===actIdx;
          return (
            <div key={a.id} style={{
              fontSize:19, fontWeight:700, padding:"4px 14px", borderRadius:99,
              background:done?"rgba(16,185,129,0.15)":active?"rgba(245,158,11,0.15)":"var(--surface)",
              color:done?"var(--green)":active?"var(--amber)":"var(--text3)",
              border:`1px solid ${done?"rgba(16,185,129,0.3)":active?"rgba(245,158,11,0.3)":"var(--border)"}`,
            }}>
              {done?" ":active?" ":""}{a.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
