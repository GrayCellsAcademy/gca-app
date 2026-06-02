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
import TimesTablesPlayer9 from "./TimesTablesPlayer9";
import DivisionTablesPlayer from "./DivisionTablesPlayer";
import DivisionTablesPlayer67 from "./DivisionTablesPlayer67";
import DivisionTablesPlayer8 from "./DivisionTablesPlayer8";
import DivisionTablesPlayer9 from "./DivisionTablesPlayer9";
import Lesson03MasteryPlayer from "./Lesson03MasteryPlayer";
import Lesson04MasteryPlayer from "./Lesson04MasteryPlayer";
import Lesson05MasteryPlayer from "./Lesson05MasteryPlayer";
import Lesson06MasteryPlayer from "./Lesson06MasteryPlayer";
import Lesson07MasteryPlayer from "./Lesson07MasteryPlayer";
import Lesson08MasteryPlayer from "./Lesson08MasteryPlayer";
import Lesson09MasteryPlayer from "./Lesson09MasteryPlayer";
import Lesson10MasteryPlayer from "./Lesson10MasteryPlayer";
import Lesson11MasteryPlayer from "./Lesson11MasteryPlayer";
import Lesson12MasteryPlayer, { PerfectSquares12Player } from "./Lesson12MasteryPlayer";
import Lesson13MasteryPlayer, { PerfectSquares13Player } from "./Lesson13MasteryPlayer";
import Lesson14MasteryPlayer, { PerfectCubesPlayer14 } from "./Lesson14MasteryPlayer";
import Lesson15MasteryPlayer, { PerfectCubes2Player } from "./Lesson15MasteryPlayer";
import Lesson16MasteryPlayer, { MultZerosPlayer } from "./Lesson16MasteryPlayer";

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
  "times-tables-9-v1": {
    id: "times-tables-9-v1",
    title: "Times Table (9)",
    description: "Master the 9s times table.",
    subject: "math", gradeLevel: "6+", icon: "", type: "drill", status: "published", order: 12,
    Player: TimesTablesPlayer9,
  },
  "division-tables-v1": {
    id: "division-tables-v1",
    title: "Division Tables (2-5)",
    description: "Master dividing by 2, 3, 4, and 5.",
    subject: "math", gradeLevel: "6+", icon: "", type: "drill", status: "published", order: 13,
    Player: DivisionTablesPlayer,
  },
  "division-tables-67-v1": {
    id: "division-tables-67-v1",
    title: "Division Tables (6-7)",
    description: "Master dividing by 6 and 7.",
    subject: "math", gradeLevel: "6+", icon: "", type: "drill", status: "published", order: 14,
    Player: DivisionTablesPlayer67,
  },
  "division-tables-8-v1": {
    id: "division-tables-8-v1",
    title: "Division Tables (8)",
    description: "Master dividing by 8.",
    subject: "math", gradeLevel: "6+", icon: "", type: "drill", status: "published", order: 15,
    Player: DivisionTablesPlayer8,
  },
  "division-tables-9-v1": {
    id: "division-tables-9-v1",
    title: "Division Tables (9)",
    description: "Master dividing by 9.",
    subject: "math", gradeLevel: "6+", icon: "", type: "drill", status: "published", order: 16,
    Player: DivisionTablesPlayer9,
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
    subject: "math", gradeLevel: "6+", icon: "", type: "mastery", status: "published", order: 16,
    Player: Lesson07MasteryPlayer,
  },
  "lesson08-mastery-v1": {
    id: "lesson08-mastery-v1",
    title: "HW 8 (019)",
    description: "Expression vs equation, identifying solutions, one-step equations, and speed/distance/time.",
    subject: "math", gradeLevel: "6+", icon: "", type: "mastery", status: "published", order: 17,
    Player: Lesson08MasteryPlayer,
  },
  "lesson09-mastery-v1": {
    id: "lesson09-mastery-v1",
    title: "HW 9 (019)",
    description: "Rectangle perimeter/missing side, two-step equations, distributive property, and power equations.",
    subject: "math", gradeLevel: "6+", icon: "", type: "mastery", status: "published", order: 18,
    Player: Lesson09MasteryPlayer,
  },
  "lesson10-mastery-v1": {
    id: "lesson10-mastery-v1",
    title: "HW 10 (019)",
    description: "Linear equations with simplification, variables on both sides, no solution, and radical equations.",
    subject: "math", gradeLevel: "6+", icon: "", type: "mastery", status: "published", order: 19,
    Player: Lesson10MasteryPlayer,
  },
  "lesson11-mastery-v1": {
    id: "lesson11-mastery-v1",
    title: "HW 11 (019)",
    description: "Checking solutions, one-step and two-step inequalities, special cases, and mixed practice.",
    subject: "math", gradeLevel: "6+", icon: "", type: "mastery", status: "published", order: 20,
    Player: Lesson11MasteryPlayer,
  },
  "perfect-squares-12-v1": {
    id: "perfect-squares-12-v1",
    title: "Perfect Squares (11-15)",
    description: "Memorize and drill perfect squares from 11 to 15.",
    subject: "math", gradeLevel: "6+", icon: "", type: "drill", status: "published", order: 21,
    Player: PerfectSquares12Player,
  },
  "perfect-squares-13-v1": {
    id: "perfect-squares-13-v1",
    title: "Perfect Squares (16-20)",
    description: "Memorize and drill perfect squares 16-20, then review all 11-20.",
    subject: "math", gradeLevel: "6+", icon: "", type: "drill", status: "published", order: 23,
    Player: PerfectSquares13Player,
  },
  "lesson13-mastery-v1": {
    id: "lesson13-mastery-v1",
    title: "HW 13 (019)",
    description: "Factors, multiples, GCF, LCM, and word problems.",
    subject: "math", gradeLevel: "6+", icon: "", type: "mastery", status: "published", order: 24,
    Player: Lesson13MasteryPlayer,
  },
  "perfect-cubes-v1": {
    id: "perfect-cubes-v1",
    title: "Perfect Cubes (1-5)",
    description: "Memorize and drill perfect cubes 1- through 5-.",
    subject: "math", gradeLevel: "6+", icon: "", type: "drill", status: "published", order: 25,
    Player: PerfectCubesPlayer14,
  },
  "perfect-cubes-2-v1": {
    id: "perfect-cubes-2-v1",
    title: "Perfect Cubes (6-10)",
    description: "Memorize and drill perfect cubes 6-10, then review all 1-10.",
    subject: "math", gradeLevel: "6+", icon: "", type: "drill", status: "published", order: 27,
    Player: PerfectCubes2Player,
  },
  "mult-zeros-v1": {
    id: "mult-zeros-v1",
    title: "Multiplying with Zeros",
    description: "Tutorial and 8-second timed drill, 3 in a row.",
    subject: "math", gradeLevel: "6+", icon: "", type: "drill", status: "published", order: 29,
    Player: MultZerosPlayer,
  },
  "lesson16-mastery-v1": {
    id: "lesson16-mastery-v1",
    title: "HW 16 (019)",
    description: "Multiplying and dividing fractions, reciprocals, mixed numbers, and mixed operations.",
    subject: "math", gradeLevel: "6+", icon: "", type: "mastery", status: "published", order: 30,
    Player: Lesson16MasteryPlayer,
  },
  "lesson15-mastery-v1": {
    id: "lesson15-mastery-v1",
    title: "HW 15 (019)",
    description: "Adding and subtracting fractions - common denominators, different denominators, mixed numbers.",
    subject: "math", gradeLevel: "6+", icon: "", type: "mastery", status: "published", order: 28,
    Player: Lesson15MasteryPlayer,
  },
  "lesson14-mastery-v1": {
    id: "lesson14-mastery-v1",
    title: "HW 14 (019)",
    description: "Fraction pictures, classification, number lines, conversions, equivalent fractions, and reducing.",
    subject: "math", gradeLevel: "6+", icon: "", type: "mastery", status: "published", order: 26,
    Player: Lesson14MasteryPlayer,
  },
  "lesson12-mastery-v1": {
    id: "lesson12-mastery-v1",
    title: "HW 12 (019)",
    description: "Perfect squares 11-15, divisibility rules, prime/composite, and prime factorization.",
    subject: "math", gradeLevel: "6+", icon: "", type: "mastery", status: "published", order: 22,
    Player: Lesson12MasteryPlayer,
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

