// ─── Addition Tables Topic Definition ────────────────────────────
// Tiers 1-9: Adding that number to 1-9
// Each tier: current questions need 3 correct, previous tier questions need 1 correct

export const ADDITION_TOPIC_ID = "addition-tables-v1";

export const ADDITION_TOPIC = {
  id: ADDITION_TOPIC_ID,
  title: "Addition Tables",
  subject: "math",
  description: "Master single-digit addition mentally and quickly — the foundation of all arithmetic.",
  gradeLevel: "6+",
  status: "published",
  type: "addition-tables",
  tiers: 9, // 1 through 9
  createdAt: Date.now(),
};

// Build questions for a given tier
// tierNum: 1-9
// masteredTiers: array of previously completed tier numbers
export function buildTierQuestions(tierNum, masteredTiers) {
  // Current tier: tierNum + 1 through tierNum + 9
  const current = Array.from({length:9},(_,i)=>({
    a: tierNum,
    b: i+1,
    streakNeeded: 3,
    streak: 0,
    isCurrent: true,
  }));

  // Previous tiers review: 1 correct needed
  const review = masteredTiers.flatMap(t =>
    Array.from({length:9},(_,i)=>({
      a: t,
      b: i+1,
      streakNeeded: 1,
      streak: 0,
      isCurrent: false,
    }))
  );

  return shuffle([...current, ...review]);
}

function shuffle(arr) {
  const a = [...arr];
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}

// ─── Tier colors ─────────────────────────────────────────────────
export const TIER_COLORS = {
  1:"#3b82f6",2:"#06b6d4",3:"#10b981",4:"#84cc16",
  5:"#f59e0b",6:"#f97316",7:"#ef4444",8:"#8b5cf6",9:"#ec4899",
};

// ─── Speech helper ───────────────────────────────────────────────
export function speak(text, onEnd) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 0.92; utter.pitch = 1.1; utter.volume = 1.0;
  const preferred = [
    "Google US English Female","Samantha",
    "Microsoft Zira - English (United States)",
    "Microsoft Aria Online (Natural) - English (United States)",
    "Google US English","Karen","Moira",
  ];
  const trySpeak = (voices) => {
    const picked = preferred.reduce((f,n)=>f||voices.find(v=>v.name===n),null)
      || voices.find(v=>v.lang==="en-US")
      || voices.find(v=>v.lang.startsWith("en"))
      || voices[0];
    if (picked) utter.voice = picked;
    if (onEnd) utter.onend = onEnd;
    window.speechSynthesis.speak(utter);
  };
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) {
    window.speechSynthesis.onvoiceschanged = () => trySpeak(window.speechSynthesis.getVoices());
  } else {
    trySpeak(voices);
  }
}
