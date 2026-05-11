// Lesson 1 - Column Addition and Subtraction

function randInt(min, max) { return Math.floor(Math.random()*(max-min+1))+min; }
function shuffle(arr) { const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }

// - Activity 1: Column addition without carrying -
// 3-digit + 2 or 3-digit, no carrying (each column sums <= 9)
export function genAddNoCarry() {
  for (let attempt=0; attempt<500; attempt++) {
    const use3=Math.random()<0.5;
    const a=randInt(100,999);
    let b;
    if (use3) {
      b=randInt(100,999);
    } else {
      b=randInt(10,99);
    }
    // Check no carry: each digit column sums <= 9
    const a1=a%10, a2=Math.floor(a/10)%10, a3=Math.floor(a/100)%10;
    const b1=b%10, b2=Math.floor(b/10)%10, b3=Math.floor(b/100)%10;
    if (a1+b1<=9 && a2+b2<=9 && a3+b3<=9) {
      return {
        type:"add-no-carry", nums:[a,b],
        answer:a+b, displayAnswer:String(a+b),
        prompt:"Add using column addition.",
      };
    }
  }
  return {type:"add-no-carry",nums:[312,245],answer:557,displayAnswer:"557",prompt:"Add using column addition."};
}

// - Activity 2: Column addition with carrying -
// 3-digit + 3-digit, must have at least one carry
export function genAddWithCarry() {
  for (let attempt=0; attempt<500; attempt++) {
    const a=randInt(100,999);
    const b=randInt(100,999);
    const a1=a%10, a2=Math.floor(a/10)%10, a3=Math.floor(a/100)%10;
    const b1=b%10, b2=Math.floor(b/10)%10, b3=Math.floor(b/100)%10;
    // Must have at least one carry
    const hasCarry = (a1+b1)>=10 || (a2+b2)>=10 || (a3+b3)>=10;
    if (hasCarry && a+b<=9999) {
      return {
        type:"add-carry", nums:[a,b],
        answer:a+b, displayAnswer:String(a+b),
        prompt:"Add using column addition.",
      };
    }
  }
  return {type:"add-carry",nums:[456,789],answer:1245,displayAnswer:"1245",prompt:"Add using column addition."};
}

// - Activity 3: Column addition of multiple numbers -
// 3-4 numbers: one 4-digit, two 3-digit, one 2-digit (in random order)
export function genAddMultiple() {
  const a=randInt(1000,4999);
  const b=randInt(100,999);
  const c=randInt(100,999);
  const d=randInt(10,99);
  const nums=shuffle([a,b,c,d]);
  const total=a+b+c+d;
  return {
    type:"add-multiple", nums,
    answer:total, displayAnswer:String(total),
    prompt:"Add all numbers using column addition.",
  };
}

// - Activity 4: Column subtraction without borrowing -
// 3-digit minus 3-digit, no borrowing (each digit of top >= corresponding digit of bottom)
export function genSubNoCarry() {
  for (let attempt=0; attempt<500; attempt++) {
    const b=randInt(100,899);
    const a=randInt(b+1,999);
    const a1=a%10, a2=Math.floor(a/10)%10, a3=Math.floor(a/100)%10;
    const b1=b%10, b2=Math.floor(b/10)%10, b3=Math.floor(b/100)%10;
    if (a1>=b1 && a2>=b2 && a3>=b3) {
      return {
        type:"sub-no-carry", nums:[a,b],
        answer:a-b, displayAnswer:String(a-b),
        prompt:"Subtract using column subtraction.",
      };
    }
  }
  return {type:"sub-no-carry",nums:[987,654],answer:333,displayAnswer:"333",prompt:"Subtract using column subtraction."};
}

// - Activity 5: Column subtraction with borrowing -
// 4-digit minus 4 or 3-digit, must borrow at least once (no zeros in top number)
export function genSubWithCarry() {
  for (let attempt=0; attempt<500; attempt++) {
    const use4=Math.random()<0.5;
    // Top: 4-digit, no zeros in any digit position
    let a;
    do { a=randInt(1000,9999); }
    while (String(a).includes('0'));
    const b=use4?randInt(1000,a-1):randInt(100,999);
    const result=a-b;
    if (result<=0) continue;
    // Must borrow: at least one digit of bottom > corresponding digit of top
    const a1=a%10, a2=Math.floor(a/10)%10, a3=Math.floor(a/100)%10, a4=Math.floor(a/1000)%10;
    const b1=b%10, b2=Math.floor(b/10)%10, b3=Math.floor(b/100)%10, b4=Math.floor(b/1000)%10;
    const mustBorrow = b1>a1 || b2>a2 || b3>a3 || b4>a4;
    if (mustBorrow) {
      return {
        type:"sub-carry", nums:[a,b],
        answer:result, displayAnswer:String(result),
        prompt:"Subtract using column subtraction.",
      };
    }
  }
  return {type:"sub-carry",nums:[5432,2879],answer:2553,displayAnswer:"2553",prompt:"Subtract using column subtraction."};
}

// - Activity 6: Column subtraction with borrowing from zero -
// 5 or 4-digit minus 4-digit, top number has zeros that require borrowing across
export function genSubBorrowZero() {
  for (let attempt=0; attempt<500; attempt++) {
    const use5=Math.random()<0.5;
    let a,b;
    if (use5) {
      // 5-digit with at least one zero in middle positions
      const d5=randInt(1,9);
      const d4=0; // zero to borrow from
      const d3=randInt(1,9);
      const d2=randInt(0,9);
      const d1=randInt(0,9);
      a=d5*10000+d4*1000+d3*100+d2*10+d1;
      b=randInt(1000,Math.min(a-1,9999));
    } else {
      // 4-digit with zero in hundreds or tens
      const which=Math.random()<0.5?"hundreds":"tens";
      if (which==="hundreds") {
        const d4=randInt(2,9), d3=0, d2=randInt(1,9), d1=randInt(0,9);
        a=d4*1000+d3*100+d2*10+d1;
      } else {
        const d4=randInt(2,9), d3=randInt(1,9), d2=0, d1=randInt(1,9);
        a=d4*1000+d3*100+d2*10+d1;
      }
      b=randInt(1000,a-1);
    }
    const result=a-b;
    if (result<=0) continue;
    // Verify top has at least one zero
    if (!String(a).includes('0')) continue;
    // Must require borrowing across the zero
    const a1=a%10, a2=Math.floor(a/10)%10, a3=Math.floor(a/100)%10;
    const b1=b%10, b2=Math.floor(b/10)%10, b3=Math.floor(b/100)%10;
    if (b1>a1 || b2>a2 || b3>a3) {
      return {
        type:"sub-borrow-zero", nums:[a,b],
        answer:result, displayAnswer:String(result),
        prompt:"Subtract using column subtraction. Watch for zeros!",
      };
    }
  }
  return {type:"sub-borrow-zero",nums:[30042,1865],answer:28177,displayAnswer:"28177",prompt:"Subtract using column subtraction. Watch for zeros!"};
}

export function gradeArithmetic(input, question) {
  return parseInt(String(input).replace(/[\s,]/g,""),10)===question.answer;
}

// - Topic registry -
export const LESSON01_TOPICS=[
  {id:"add-no-carry",    label:"Addition: No Carrying",          description:"3-digit + 2 or 3-digit"},
  {id:"add-carry",      label:"Addition: With Carrying",         description:"3-digit + 3-digit"},
  {id:"add-multiple",   label:"Addition: Multiple Numbers",      description:"4-digit + 3-digit + 3-digit + 2-digit"},
  {id:"sub-no-carry",   label:"Subtraction: No Borrowing",       description:"3-digit - 3-digit"},
  {id:"sub-carry",      label:"Subtraction: With Borrowing",     description:"4-digit - 4 or 3-digit"},
  {id:"sub-borrow-zero",label:"Subtraction: Borrowing from Zero",description:"Numbers with zeros"},
];

export function generateLesson01Question(topicId) {
  switch(topicId) {
    case "add-no-carry":     return genAddNoCarry();
    case "add-carry":        return genAddWithCarry();
    case "add-multiple":     return genAddMultiple();
    case "sub-no-carry":     return genSubNoCarry();
    case "sub-carry":        return genSubWithCarry();
    case "sub-borrow-zero":  return genSubBorrowZero();
    default:                 return genAddNoCarry();
  }
}

export function gradeLesson01Answer(input, question) {
  return gradeArithmetic(input, question);
}
