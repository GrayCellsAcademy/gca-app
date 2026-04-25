//  Topic Registry
import AdditionTablesPlayer from "./AdditionTablesPlayer";
import ColumnAdditionPlayer from "./ColumnAdditionPlayer";
import Lesson01MasteryPlayer from "./Lesson01MasteryPlayer";
import ExtraCredit01Player from "./ExtraCredit01Player";
import ReviewHomework from "./ReviewHomework";
import Lesson02MasteryPlayer from "./Lesson02MasteryPlayer";
import SubtractionTablesPlayer from "./SubtractionTablesPlayer";
import TimesTablesPlayer from "./TimesTablesPlayer";
import Lesson03MasteryPlayer from "./Lesson03MasteryPlayer";

export const TOPICS = {
  "addition-tables-v1": {
    id: "addition-tables-v1",
    title: "HW 1 (019): Addition Tables",
    description: "Master single-digit addition mentally and quickly - the foundation of all arithmetic.",
    subject: "math", gradeLevel: "6+", icon: "", type: "drill", status: "published", order: 1,
    Player: AdditionTablesPlayer,
  },
  "lesson01-mastery-v1": {
    id: "lesson01-mastery-v1",
    title: "HW 2 (019): Column Add & Subtract Mastery",
    description: "Master column addition and subtraction across 6 difficulty levels - no carrying to borrowing from zero.",
    subject: "math", gradeLevel: "6+", icon: "", type: "mastery", status: "published", order: 2,
    Player: Lesson01MasteryPlayer,
  },
  "subtraction-tables-v1": {
    id: "subtraction-tables-v1",
    title: "HW 3 (019): Subtraction Tables",
    description: "Master single-digit subtraction mentally and quickly - timed drills with cumulative review.",
    subject: "math", gradeLevel: "6+", icon: "", type: "drill", status: "published", order: 3,
    Player: SubtractionTablesPlayer,
  },
  "lesson02-mastery-v1": {
    id: "lesson02-mastery-v1",
    title: "HW 4 (019): Geometry Mastery",
    description: "7 geometry mastery activities: segments, polygons, rectangles, squares, and composite shapes.",
    subject: "math", gradeLevel: "6+", icon: "", type: "mastery", status: "published", order: 4,
    Player: Lesson02MasteryPlayer,
  },
  "review-homework-v1": {
    id: "review-homework-v1",
    title: "HW 5 (019): Final Exam Review",
    description: "Practice all 44 final exam topics at your own pace. No grade - just build your streak on each question type.",
    subject: "math", gradeLevel: "6+", icon: "", type: "homework", status: "published", order: 5,
    Player: ReviewHomework,
  },
  "times-tables-v1": {
    id: "times-tables-v1",
    title: "HW 6 (019): Times Tables",
    description: "Master the 2s and 3s times tables through skip counting, in-order drills, and random practice.",
    subject: "math", gradeLevel: "6+", icon: "", type: "drill", status: "published", order: 6,
    Player: TimesTablesPlayer,
  },
  "lesson03-mastery-v1": {
    id: "lesson03-mastery-v1",
    title: "HW 7 (019): Multiply, Divide & Area Mastery",
    description: "Column multiplication, long division, and area of rectangles, squares, and composite shapes.",
    subject: "math", gradeLevel: "6+", icon: "", type: "mastery", status: "published", order: 7,
    Player: Lesson03MasteryPlayer,
  },
  "column-addition-v1": {
    id: "column-addition-v1",
    title: "Column Addition",
    description: "Learn to add multi-digit numbers using column addition - with and without carrying.",
    subject: "math", gradeLevel: "6+", icon: "", type: "guided-practice", status: "published", order: 10,
    Player: ColumnAdditionPlayer,
  },
  "lesson01-extra-credit-v1": {
    id: "lesson01-extra-credit-v1",
    title: "Missing Digit Challenge",
    description: "Find the missing digit in column addition and subtraction problems. Get all 6 types correct in a row.",
    subject: "math", gradeLevel: "6+", icon: "", type: "extra-credit", status: "published", order: 11,
    Player: ExtraCredit01Player,
  },
};

export function getTopic(id) { return TOPICS[id] || null; }
export function getPublishedTopics() { return Object.values(TOPICS).filter(t => t.status === "published"); }
export function getAllTopics() { return Object.values(TOPICS); }
