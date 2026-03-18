import { useState, useEffect, useRef } from "react";
import { buildTierQuestions, TIER_COLORS, speak, ADDITION_TOPIC_ID } from "./additionTables";
import { saveProgress, getProgress } from "./firebase";

const QUESTION_TIME = 15;

// ─── Shared UI ────────────────────────────────────────────────────
function CountdownRing({ seconds, total }) {
  const r = 24, circ = 2 * Math.PI * r;
  const pct = seconds / total;
  const danger = seconds <= 4, warn = seconds <= 8;
  const color = danger ? "#ef4444" : warn ? "#f59e0b" : "#10b981";
  return (
    <div style={{position:"relative",width:60,height:60,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <svg width={60} height={60} style={{position:"absolute",top:0,left:0,transform:"rotate(-90deg)"}}>
        <circle cx={30} cy={30} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={4}/>
        <circle cx={30} cy={30} r={r} fill="none" stroke={color} strokeWidth={4}
          strokeDasharray={circ} strokeDashoffset={circ*(1-pct)} strokeLinecap="round"
          style={{transition:"stroke-dashoffset 0.9s linear,stroke 0.3s"}}/>
      </svg>
      <span style={{fontFamily:"var(--mono)",fontSize:16,fontWeight:700,color,
        animation:danger?"pulse 0.5s ease-in-out infinite":"none"}}>{seconds}</span>
    </div>
  );
}

function SpeakBtn({ text, color="#3b82f6" }) {
  const [playing, setPlaying] = useState(false);
  return (
    <button onClick={()=>{ setPlaying(true); speak(text,()=>setPlaying(false)); }}
      style={{
        display:"inline-flex",alignItems:"center",gap:6,
        padding:"8px 16px",borderRadius:99,border:`1.5px solid ${color}`,
        background:playing?color:"transparent",color:playing?"#fff":color,
        fontFamily:"var(--font)",fontWeight:600,fontSize:13,cursor:"pointer",
        transition:"all 0.2s"
      }}>
      {playing?"🔊 Playing…":"🔊 Hear instructions"}
    </button>
  );
}

function CorrectFlash() {
  return (
    <div style={{
      position:"fixed",inset:0,pointerEvents:"none",zIndex:999,
      background:"rgba(16,185,129,0.12)",
      animation:"fadeIn 0.1s ease, fadeOut 0.3s ease 0.2s forwards"
    }}/>
  );
}

// ─── Lesson Screen ────────────────────────────────────────────────
function AdditionVisual() {
  // Shows 3 dots + 2 dots = 5 dots
  const dot = (color) => (
    <div style={{
      width:28, height:28, borderRadius:"50%",
      background:color, boxShadow:`0 0 10px ${color}88`,
      display:"inline-block", margin:3,
    }}/>
  );
  return (
    <div style={{
      background:"var(--bg2)", borderRadius:"var(--radius)",
      padding:"24px 20px", textAlign:"center", marginBottom:16
    }}>
      <div style={{fontSize:13, color:"var(--text3)", marginBottom:12, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.06em"}}>
        3 + 2 = 5
      </div>
      <div style={{display:"flex", alignItems:"center", justifyContent:"center", gap:12, flexWrap:"wrap"}}>
        {/* 3 dots */}
        <div style={{display:"flex", alignItems:"center", gap:2}}>
          {[0,1,2].map(i=>(
            <div key={i} style={{width:28,height:28,borderRadius:"50%",background:"var(--blue)",boxShadow:"0 0 10px rgba(59,130,246,0.6)",margin:3}}/>
          ))}
        </div>
        <div style={{fontSize:28, fontWeight:900, color:"var(--text2)"}}>+</div>
        {/* 2 dots */}
        <div style={{display:"flex", alignItems:"center", gap:2}}>
          {[0,1].map(i=>(
            <div key={i} style={{width:28,height:28,borderRadius:"50%",background:"var(--cyan)",boxShadow:"0 0 10px rgba(6,182,212,0.6)",margin:3}}/>
          ))}
        </div>
        <div style={{fontSize:28, fontWeight:900, color:"var(--text2)"}}>=</div>
        {/* 5 dots */}
        <div style={{display:"flex", alignItems:"center", gap:2}}>
          {[0,1,2,3,4].map(i=>(
            <div key={i} style={{width:28,height:28,borderRadius:"50%",background:"var(--green)",boxShadow:"0 0 10px rgba(16,185,129,0.6)",margin:3}}/>
          ))}
        </div>
      </div>
      <div style={{marginTop:14, display:"flex", justifyContent:"center", gap:24, fontSize:13, color:"var(--text3)"}}>
        <span><span style={{color:"var(--blue)", fontWeight:700}}>3</span> blue dots</span>
        <span><span style={{color:"var(--cyan)", fontWeight:700}}>2</span> cyan dots</span>
        <span><span style={{color:"var(--green)", fontWeight:700}}>5</span> total</span>
      </div>
    </div>
  );
}

function LessonScreen({ onComplete, isReview }) {
  const voiceText = "Welcome to Addition Tables! Here is what you are about to do. You are going to memorize every single digit addition fact — from 1 plus 1 all the way to 9 plus 9. That is 81 facts total, and by the end of this course, you will know all of them instantly. Now, why is that worth your time? Think about a problem like this: find two numbers that add up to 14 and multiply to 48. To solve that quickly in your head, you need to know your addition facts cold — no counting, no hesitating. The same is true for long division, fractions, and mental math in everyday life. Every time you have to stop and count on your fingers, it slows you down and uses up brain power you need for the harder part of the problem. Students who have these facts memorized think faster, make fewer errors, and find advanced math much less stressful. So let's build that foundation right now. You will work one number at a time, starting with adding 1s. Each question gives you 15 seconds. Let's go!";

  useEffect(()=>{
    const t = setTimeout(()=>speak(voiceText), 600);
    return ()=>{ clearTimeout(t); window.speechSynthesis?.cancel(); };
  },[]);

  return (
    <div style={{maxWidth:680,margin:"0 auto",animation:"fadeUp 0.4s ease"}}>
      <div className="card" style={{marginBottom:20}}>
        <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:20}}>
          <div style={{fontSize:40}}>➕</div>
          <div>
            <h2 style={{fontSize:24,fontWeight:800,letterSpacing:"-0.3px",marginBottom:4}}>
              Addition Tables
            </h2>
            <p style={{color:"var(--text2)",fontSize:14}}>Read this before you start</p>
          </div>
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:16}}>

          {/* 1. What you're about to do */}
          <div style={{
            background:"var(--bg2)",borderRadius:"var(--radius)",padding:"18px 20px",
            borderLeft:"3px solid var(--blue)"
          }}>
            <p style={{fontSize:15,fontWeight:700,color:"var(--blue)",marginBottom:8}}>
              🎯 What you're about to do
            </p>
            <p style={{fontSize:16,lineHeight:1.75,color:"var(--text)"}}>
              You are going to <strong>memorize every single-digit addition fact</strong> — from{" "}
              <strong style={{fontFamily:"var(--mono)",color:"var(--cyan)"}}>1+1</strong> all the way to{" "}
              <strong style={{fontFamily:"var(--mono)",color:"var(--cyan)"}}>9+9</strong>.
              That is 81 facts total. By the end, you will know all of them <em>instantly</em>.
            </p>
          </div>

          {/* 2. Why it's worth their time */}
          <div style={{
            background:"var(--bg2)",borderRadius:"var(--radius)",padding:"18px 20px",
            borderLeft:"3px solid var(--amber)"
          }}>
            <p style={{fontSize:15,fontWeight:700,color:"var(--amber)",marginBottom:8}}>
              ⚡ Why this is worth your time
            </p>
            <p style={{fontSize:15,lineHeight:1.75,color:"var(--text2)",marginBottom:10}}>
              Think about a problem like: <em>find two numbers that add up to 14 and multiply to 48.</em> To solve that quickly, you need addition facts memorized — no counting, no hesitating.
            </p>
            <p style={{fontSize:15,lineHeight:1.75,color:"var(--text2)"}}>
              Every time you stop to count on your fingers, it slows you down and uses up brain power you need for the harder part of the problem. Students who have these facts memorized <strong style={{color:"var(--text)"}}>think faster, make fewer errors, and find algebra much less stressful.</strong>
            </p>
          </div>

          {/* 3. What addition means */}
          <div style={{
            background:"var(--bg2)",borderRadius:"var(--radius)",padding:"18px 20px",
            borderLeft:"3px solid var(--cyan)"
          }}>
            <p style={{fontSize:15,fontWeight:700,color:"var(--cyan)",marginBottom:8}}>
              📖 What addition means
            </p>
            <p style={{fontSize:15,lineHeight:1.75,color:"var(--text)",marginBottom:12}}>
              Addition means combining two groups to find their total. When you see{" "}
              <strong style={{fontFamily:"var(--mono)",color:"var(--cyan)",fontSize:17}}>3 + 2 = 5</strong>,
              it means 3 things and 2 more things make 5 things altogether.
            </p>
            <AdditionVisual/>
          </div>

          {/* 4. Goal */}
          <div style={{
            background:"rgba(16,185,129,0.08)",borderRadius:"var(--radius)",padding:"18px 20px",
            border:"1px solid rgba(16,185,129,0.2)"
          }}>
            <p style={{fontSize:15,fontWeight:700,color:"var(--green)",marginBottom:8}}>
              ✅ Your goal
            </p>
            <p style={{fontSize:15,lineHeight:1.75,color:"var(--text2)"}}>
              Work through all 9 tiers — one number at a time — until every fact feels automatic.
              You have <strong style={{color:"var(--amber)"}}>15 seconds</strong> per question.
              Wrong answers stay in the rotation until you get them right.
            </p>
          </div>

        </div>

        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:24,flexWrap:"wrap",gap:12}}>
          <SpeakBtn text={voiceText} color="var(--blue)"/>
          <button className="btn btn-primary btn-lg" onClick={onComplete}>
            {isReview ? "← Back to Practice" : "Start with 1s →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tier Intro Screen ────────────────────────────────────────────
function TierIntroScreen({ tierNum, masteredTiers, onStart }) {
  const color = TIER_COLORS[tierNum] || "#3b82f6";
  const msg = `Tier ${tierNum}. Adding ${tierNum} to every number from 1 to 9.${masteredTiers.length>0?` You will also see review questions from the ${masteredTiers.map(t=>`${t}s`).join(", ")} you have already learned. Those only need 1 correct answer each.`:""} New questions need 3 correct answers in a row. You have 15 seconds per question. Let's go!`;

  useEffect(()=>{
    const t = setTimeout(()=>speak(msg), 500);
    return ()=>{ clearTimeout(t); window.speechSynthesis?.cancel(); };
  },[]);

  return (
    <div style={{maxWidth:560,margin:"0 auto",animation:"fadeUp 0.4s ease"}}>
      <div className="card">
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{
            display:"inline-flex",alignItems:"center",justifyContent:"center",
            width:72,height:72,borderRadius:"50%",
            background:`${color}22`,border:`2px solid ${color}`,
            fontSize:32,marginBottom:16,
          }}>➕</div>
          <h2 style={{fontSize:28,fontWeight:800,marginBottom:6}}>
            Adding {tierNum}s
          </h2>
          <p style={{color:"var(--text2)",fontSize:15}}>
            {tierNum}+1 through {tierNum}+9
          </p>
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:24}}>
          <div style={{
            background:"var(--bg2)",borderRadius:"var(--radius)",padding:"14px 16px",
            display:"flex",justifyContent:"space-between",alignItems:"center"
          }}>
            <span style={{color:"var(--text2)",fontSize:14}}>New questions</span>
            <span style={{
              background:`${color}22`,color,fontWeight:700,fontSize:13,
              padding:"3px 12px",borderRadius:99
            }}>3 correct in a row</span>
          </div>
          {masteredTiers.length>0&&(
            <div style={{
              background:"var(--bg2)",borderRadius:"var(--radius)",padding:"14px 16px",
              display:"flex",justifyContent:"space-between",alignItems:"center"
            }}>
              <span style={{color:"var(--text2)",fontSize:14}}>
                Review ({masteredTiers.map(t=>`${t}s`).join(", ")})
              </span>
              <span style={{
                background:"rgba(16,185,129,0.15)",color:"var(--green)",fontWeight:700,fontSize:13,
                padding:"3px 12px",borderRadius:99
              }}>1 correct each</span>
            </div>
          )}
          <div style={{
            background:"var(--bg2)",borderRadius:"var(--radius)",padding:"14px 16px",
            display:"flex",justifyContent:"space-between",alignItems:"center"
          }}>
            <span style={{color:"var(--text2)",fontSize:14}}>Time per question</span>
            <span style={{
              background:"rgba(245,158,11,0.15)",color:"var(--amber)",fontWeight:700,fontSize:13,
              padding:"3px 12px",borderRadius:99
            }}>15 seconds</span>
          </div>
        </div>

        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
          <SpeakBtn text={msg} color={color}/>
          <button className="btn btn-lg" onClick={onStart}
            style={{background:color,color:"#fff"}}>
            Let's go! →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Question Screen ──────────────────────────────────────────────
function QuestionScreen({ tierNum, questions, onComplete, onHome, onReviewLesson }) {
  const [qs, setQs] = useState(questions);
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState("");
  const [wrong, setWrong] = useState(null);
  const [timer, setTimer] = useState(QUESTION_TIME);
  const [showFlash, setShowFlash] = useState(false);
  const inputRef = useRef(null);
  const timerRef = useRef(null);
  const color = TIER_COLORS[tierNum] || "#3b82f6";
  const remaining = qs.length;
  const totalStarted = questions.length;
  const done = totalStarted - remaining;

  // Focus input
  useEffect(()=>{
    if (!wrong) setTimeout(()=>inputRef.current?.focus(), 80);
  },[idx, wrong]);

  // Timer
  useEffect(()=>{
    if (wrong) { clearInterval(timerRef.current); return; }
    clearInterval(timerRef.current);
    setTimer(QUESTION_TIME);
    let t = QUESTION_TIME;
    timerRef.current = setInterval(()=>{
      t--;
      setTimer(t);
      if (t <= 0) {
        clearInterval(timerRef.current);
        const q = qs[idx % qs.length];
        if (q) {
          speak(`Time's up! The correct answer is ${q.a + q.b}.`);
          const newQs = [...qs];
          const i = idx % newQs.length;
          newQs[i] = {...newQs[i], streak:0, streakNeeded: newQs[i].streakNeeded+1};
          setQs(newQs);
          setWrong({a:q.a, b:q.b, correct:q.a+q.b, timedOut:true});
          setInput("");
        }
      }
    }, 1000);
    return ()=>clearInterval(timerRef.current);
  },[idx, wrong]);

  const handleSubmit = () => {
    const val = parseInt(input.trim(), 10);
    setInput("");
    const i = idx % qs.length;
    const q = qs[i];
    const correct = q.a + q.b;

    if (val === correct) {
      clearInterval(timerRef.current);
      setShowFlash(true);
      setTimeout(()=>setShowFlash(false), 400);
      const newQs = [...qs];
      newQs[i] = {...newQs[i], streak: newQs[i].streak+1};
      if (newQs[i].streak >= newQs[i].streakNeeded) {
        newQs.splice(i, 1);
        if (newQs.length === 0) {
          onComplete();
          return;
        }
      }
      setQs(newQs);
      setIdx(p => (p+1) % newQs.length);
    } else {
      clearInterval(timerRef.current);
      speak(`The correct answer is ${correct}.`);
      const newQs = [...qs];
      newQs[i] = {...newQs[i], streak:0, streakNeeded: newQs[i].streakNeeded+1};
      setQs(newQs);
      setWrong({a:q.a, b:q.b, correct});
      setInput("");
    }
  };

  const dismissWrong = () => {
    setWrong(null);
    setIdx(p => (p+1) % qs.length);
    setTimeout(()=>inputRef.current?.focus(), 80);
  };

  const q = qs[idx % qs.length];
  if (!q) return null;

  return (
    <div style={{maxWidth:560,margin:"0 auto",animation:"fadeUp 0.3s ease"}}>
      {showFlash && <CorrectFlash/>}

      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,gap:8}}>
        <div style={{
          background:`${color}22`,border:`1px solid ${color}44`,
          borderRadius:99,padding:"6px 16px",
          fontSize:15,fontWeight:700,color,flexShrink:0
        }}>
          Adding {tierNum}s
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center",flexShrink:0}}>
          <button className="btn btn-ghost btn-sm"
            style={{fontSize:14,whiteSpace:"nowrap"}}
            onClick={()=>{ clearInterval(timerRef.current); onReviewLesson(); }}>
            📖 Review Lesson
          </button>
          <button className="btn btn-ghost btn-sm"
            style={{fontSize:14,whiteSpace:"nowrap"}}
            onClick={onHome}>
            ← Home
          </button>
        </div>
      </div>

      {/* Progress */}
      <div style={{marginBottom:20}}>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:14,
          color:"var(--text3)",marginBottom:6}}>
          <span>{done} cleared</span>
          <span>{remaining} remaining</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{
            width:`${(done/totalStarted)*100}%`,
            background:`linear-gradient(90deg,${color},${color}99)`
          }}/>
        </div>
      </div>

      {/* Question card */}
      <div className="card" style={{textAlign:"center",position:"relative"}}>
        {/* Timer */}
        <div style={{position:"absolute",top:16,right:16}}>
          {!wrong && <CountdownRing seconds={timer} total={QUESTION_TIME}/>}
        </div>

        {/* Streak dots */}
        {!wrong && (
          <div style={{display:"flex",gap:8,justifyContent:"center",marginBottom:16}}>
            {Array.from({length:q.streakNeeded}).map((_,i)=>(
              <div key={i} style={{
                width:13,height:13,borderRadius:"50%",
                background:i<q.streak?color:"var(--surface2)",
                border:`2px solid ${i<q.streak?color:"var(--border2)"}`,
                transition:"all 0.2s"
              }}/>
            ))}
          </div>
        )}

        {wrong ? (
          <div style={{animation:"popIn 0.25s ease"}}>
            <div style={{fontSize:18,fontWeight:700,color:"#fca5a5",marginBottom:10}}>
              {wrong.timedOut ? "⏰ Time's up!" : "Not quite!"}
            </div>
            <div style={{
              fontFamily:"var(--mono)",fontSize:"clamp(48px,10vw,72px)",fontWeight:700,
              color:"var(--text)",marginBottom:8
            }}>
              {wrong.a} + {wrong.b} = <span style={{color:"var(--green)"}}>{wrong.correct}</span>
            </div>
            <p style={{color:"var(--text2)",fontSize:17,marginBottom:20}}>
              The correct answer is <strong style={{color:"var(--text)"}}>{wrong.correct}</strong>
            </p>
            <button className="btn btn-success" style={{width:"100%",fontSize:18,padding:"16px"}}
              onMouseDown={e=>{e.preventDefault();dismissWrong();}}
              onTouchEnd={e=>{e.preventDefault();dismissWrong();}}>
              Got it — keep going! →
            </button>
          </div>
        ) : (
          <>
            <div style={{
              fontFamily:"var(--mono)",
              fontSize:"clamp(54px,11vw,80px)",
              fontWeight:700,
              color:"var(--text)",
              marginBottom:4,
              marginTop:8,
              letterSpacing:"-2px"
            }}>
              {q.a} + {q.b} = ?
            </div>
            {!q.isCurrent && (
              <div style={{fontSize:14,color:"var(--text3)",marginBottom:12}}>
                Review question
              </div>
            )}
            <input
              ref={inputRef}
              value={input}
              onChange={e=>setInput(e.target.value.replace(/\D/g,""))}
              onKeyDown={e=>e.key==="Enter"&&handleSubmit()}
              placeholder="?"
              inputMode="numeric"
              style={{
                textAlign:"center",
                fontSize:"clamp(32px,7vw,48px)",
                fontFamily:"var(--mono)",
                fontWeight:700,
                padding:"16px",
                marginBottom:14,
                marginTop:8,
                borderColor: "var(--border2)",
              }}
            />
            <button className="btn btn-primary"
              style={{width:"100%",fontSize:20,padding:"16px"}}
              onMouseDown={e=>{e.preventDefault();handleSubmit();}}
              onTouchEnd={e=>{e.preventDefault();handleSubmit();}}>
              Submit ✓
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Celebration Screen ───────────────────────────────────────────
function CelebrationScreen({ tierNum, isLast, onContinue }) {
  const color = TIER_COLORS[tierNum] || "#3b82f6";
  const nextColor = TIER_COLORS[tierNum+1] || "#3b82f6";
  const msg = isLast
    ? `Incredible! You have mastered all nine addition tiers! You can now add any single digit numbers instantly. That is a huge achievement!`
    : `Amazing! You have mastered adding ${tierNum}s! You are on a roll! Up next, adding ${tierNum+1}s.`;

  useEffect(()=>{
    const t = setTimeout(()=>speak(msg), 400);
    return()=>{ clearTimeout(t); window.speechSynthesis?.cancel(); };
  },[]);

  return (
    <div style={{maxWidth:520,margin:"0 auto",textAlign:"center",animation:"fadeUp 0.4s ease"}}>
      <div className="card">
        <div style={{fontSize:64,marginBottom:16,animation:"pulse 1.5s ease-in-out infinite"}}>
          {isLast ? "🏆" : "⭐"}
        </div>
        <h2 style={{fontSize:28,fontWeight:800,marginBottom:8}}>
          {isLast ? "All Addition Tables Mastered!" : `Adding ${tierNum}s — Done!`}
        </h2>
        <p style={{color:"var(--text2)",fontSize:15,marginBottom:28}}>
          {isLast
            ? "You've completed every single-digit addition fact. Outstanding work!"
            : `Great job! Ready to tackle adding ${tierNum+1}s?`}
        </p>
        <button className="btn btn-lg" onClick={onContinue}
          style={{background: isLast?"var(--amber)":nextColor, color:"#fff", width:"100%"}}>
          {isLast ? "🏆 View My Progress" : `Start Adding ${tierNum+1}s →`}
        </button>
      </div>
    </div>
  );
}

// ─── Main Player ──────────────────────────────────────────────────
export default function AdditionTablesPlayer({ user, onHome }) {
  const [screen, setScreen] = useState("loading"); // loading|lesson|tier-intro|questions|celebration|done
  const [currentTier, setCurrentTier] = useState(1);
  const [masteredTiers, setMasteredTiers] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [saving, setSaving] = useState(false);

  // Load progress
  useEffect(()=>{
    const load = async () => {
      const prog = await getProgress(user.id, ADDITION_TOPIC_ID);
      if (prog) {
        const mastered = prog.masteredTiers || [];
        const tier = prog.currentTier || 1;
        setMasteredTiers(mastered);
        setCurrentTier(tier);
        // Skip lesson if already started
        setScreen(mastered.length === 0 && tier === 1 ? "lesson" : "tier-intro");
      } else {
        setScreen("lesson");
      }
    };
    load();
  },[]);

  const saveCurrentProgress = async (tier, mastered) => {
    setSaving(true);
    await saveProgress(user.id, ADDITION_TOPIC_ID, {
      currentTier: tier,
      masteredTiers: mastered,
      completed: mastered.length === 9,
    });
    setSaving(false);
  };

  const startTier = (tier, mastered) => {
    const qs = buildTierQuestions(tier, mastered);
    setQuestions(qs);
    setScreen("questions");
  };

  const handleTierComplete = async () => {
    const newMastered = [...masteredTiers, currentTier];
    setMasteredTiers(newMastered);
    const isLast = currentTier === 9;
    await saveCurrentProgress(isLast ? currentTier : currentTier+1, newMastered);
    setScreen("celebration");
  };

  const handleCelebrationContinue = () => {
    if (currentTier === 9) {
      onHome();
      return;
    }
    const nextTier = currentTier + 1;
    setCurrentTier(nextTier);
    setScreen("tier-intro");
  };

  if (screen === "loading") return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:60}}>
      <div className="spinner"/>
    </div>
  );

  if (screen === "lesson") return (
    <LessonScreen isReview={false} onComplete={async ()=>{
      await saveCurrentProgress(1, []);
      setScreen("tier-intro");
    }}/>
  );

  if (screen === "lesson-review") return (
    <LessonScreen isReview={true} onComplete={()=>{
      setScreen("questions");
    }}/>
  );

  if (screen === "tier-intro") return (
    <TierIntroScreen
      tierNum={currentTier}
      masteredTiers={masteredTiers}
      onStart={()=>startTier(currentTier, masteredTiers)}
    />
  );

  if (screen === "questions") return (
    <QuestionScreen
      tierNum={currentTier}
      questions={questions}
      onComplete={handleTierComplete}
      onHome={onHome}
      onReviewLesson={()=>setScreen("lesson-review")}
    />
  );

  if (screen === "celebration") return (
    <CelebrationScreen
      tierNum={currentTier}
      isLast={currentTier === 9}
      onContinue={handleCelebrationContinue}
    />
  );

  return null;
}
