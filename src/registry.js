//  Topic Registry
import AdditionTablesPlayer from "./AdditionTablesPlayer";
import ColumnAdditionPlayer from "./ColumnAdditionPlayer";
import Lesson01MasteryPlayer from "./Lesson01MasteryPlayer";
import ExtraCredit01Player from "./ExtraCredit01Player";
import ReviewHomework from "./ReviewHomework";
import Lesson02MasteryPlayer from "./Lesson02MasteryPlayer";
import SubtractionTablesPlayer from "./SubtractionTablesPlayer";
import TimesTablesPlayer from "./TimesTablesPlayer";
import TimesTablesPlayer45 from "./TimesTablesPlayer45";
import TimesTablesPlayer6 from "./TimesTablesPlayer6";
import TimesTablesPlayer7 from "./TimesTablesPlayer7";
import TimesTablesPlayer8 from "./TimesTablesPlayer8";
import Lesson03MasteryPlayer from "./Lesson03MasteryPlayer";
import Lesson04MasteryPlayer from "./Lesson04MasteryPlayer";
import Lesson05MasteryPlayer from "./Lesson05MasteryPlayer";
import Lesson06MasteryPlayer from "./Lesson06MasteryPlayer";
import Lesson07MasteryPlayer from "./Lesson07MasteryPlayer";

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
  "times-tables-45-v1": {
    id: "times-tables-45-v1",
    title: "Times Table (4 & 5)",
    description: "Master the 4s and 5s times tables.",
    subject: "math", gradeLevel: "6+", icon: "", type: "drill", status: "published", order: 8,
    Player: TimesTablesPlayer45,
  },
  "times-tables-6-v1": {
    id: "times-tables-6-v1",
    title: "Times Table (6)",
    description: "Master the 6s times table.",
    subject: "math", gradeLevel: "6+", icon: "", type: "drill", status: "published", order: 9,
    Player: TimesTablesPlayer6,
  },
  "times-tables-7-v1": {
    id: "times-tables-7-v1",
    title: "Times Table (7)",
    description: "Master the 7s times table.",
    subject: "math", gradeLevel: "6+", icon: "", type: "drill", status: "published", order: 10,
    Player: TimesTablesPlayer7,
  },
  "times-tables-8-v1": {
    id: "times-tables-8-v1",
    title: "Times Table (8)",
    description: "Master the 8s times table.",
    subject: "math", gradeLevel: "6+", icon: "", type: "drill", status: "published", order: 11,
    Player: TimesTablesPlayer8,
  },
  "lesson04-mastery-v1": {
    id: "lesson04-mastery-v1",
    title: "HW 4 (019)",
    description: "Exponents, square roots, cube roots, order of operations, and variable expressions.",
    subject: "math", gradeLevel: "6+", icon: "", type: "mastery", status: "published", order: 12,
    Player: Lesson04MasteryPlayer,
  },
  "lesson05-mastery-v1": {
    id: "lesson05-mastery-v1",
    title: "HW 5 (019)",
    description: "Comparing signed numbers, absolute value, multiple minus signs, and signed operations.",
    subject: "math", gradeLevel: "6+", icon: "", type: "mastery", status: "published", order: 13,
    Player: Lesson05MasteryPlayer,
  },
  "lesson06-mastery-v1": {
    id: "lesson06-mastery-v1",
    title: "HW 6 (019)",
    description: "Multiple signed numbers, distributive property, combining like terms, product rule.",
    subject: "math", gradeLevel: "6+", icon: "", type: "mastery", status: "published", order: 14,
    Player: Lesson06MasteryPlayer,
  },
  "lesson07-mastery-v1": {
    id: "lesson07-mastery-v1",
    title: "HW 7 (019)",
    description: "Sign of products, negative base powers, roots of negatives, signed OoO and variable expressions.",
    subject: "math", gradeLevel: "6+", icon: "", type: "mastery", status: "published", order: 15,
    Player: Lesson07MasteryPlayer,
  },
  "review-homework-v1": {
    id: "review-homework-v1",
    title: "Final Exam Review",
    description: "Practice all 44 final exam topics at your own pace. No grade - just build your streak on each question type.",
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
