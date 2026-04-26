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
    title: "Addition Table",
    description: "Master single-digit addition mentally and quickly.",
    subject: "math", gradeLevel: "6+", icon: "", type: "drill", status: "published", order: 1,
    Player: AdditionTablesPlayer,
  },
  "subtraction-tables-v1": {
    id: "subtraction-tables-v1",
    title: "Subtraction Table",
    description: "Master single-digit subtraction mentally and quickly.",
    subject: "math", gradeLevel: "6+", icon: "", type: "drill", status: "published", order: 2,
    Player: SubtractionTablesPlayer,
  },
  "times-tables-v1": {
    id: "times-tables-v1",
    title: "Times Table (2 & 3)",
    description: "Master the 2s and 3s times tables.",
    subject: "math", gradeLevel: "6+", icon: "", type: "drill", status: "published", order: 3,
    Player: TimesTablesPlayer,
  },
  "lesson01-mastery-v1": {
    id: "lesson01-mastery-v1",
    title: "HW 1 (019)",
    description: "Column addition and subtraction mastery.",
    subject: "math", gradeLevel: "6+", icon: "", type: "mastery", status: "published", order: 4,
    Player: Lesson01MasteryPlayer,
  },
  "lesson02-mastery-v1": {
    id: "lesson02-mastery-v1",
    title: "HW 2 (019)",
    description: "Geometry mastery: segments, polygons, rectangles, squares, and composite shapes.",
    subject: "math", gradeLevel: "6+", icon: "", type: "mastery", status: "published", order: 5,
    Player: Lesson02MasteryPlayer,
  },
  "lesson03-mastery-v1": {
    id: "lesson03-mastery-v1",
    title: "HW 3 (019)",
    description: "Column multiplication, long division, and area mastery.",
    subject: "math", gradeLevel: "6+", icon: "", type: "mastery", status: "published", order: 6,
    Player: Lesson03MasteryPlayer,
  },
  "review-homework-v1": {
    id: "review-homework-v1",
    title: "HW 4 (019)",
    description: "Final exam review - practice all 44 topics at your own pace.",
    subject: "math", gradeLevel: "6+", icon: "", type: "homework", status: "published", order: 7,
    Player: ReviewHomework,
  },
  "column-addition-v1": {
    id: "column-addition-v1",
    title: "Column Addition",
    description: "Learn to add multi-digit numbers using column addition.",
    subject: "math", gradeLevel: "6+", icon: "", type: "guided-practice", status: "published", order: 10,
    Player: ColumnAdditionPlayer,
  },
  "lesson01-extra-credit-v1": {
    id: "lesson01-extra-credit-v1",
    title: "Missing Digit Challenge",
    description: "Find the missing digit in column addition and subtraction problems.",
    subject: "math", gradeLevel: "6+", icon: "", type: "extra-credit", status: "published", order: 11,
    Player: ExtraCredit01Player,
  },
};

export function getTopic(id) { return TOPICS[id] || null; }
export function getPublishedTopics() { return Object.values(TOPICS).filter(t => t.status === "published"); }
export function getAllTopics() { return Object.values(TOPICS); }
