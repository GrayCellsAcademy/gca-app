//  Tic Tac Toe Firebase Functions 

import { db } from "./core/firebase";
import {
  doc, getDoc, setDoc, updateDoc, onSnapshot,
  collection, query, where, getDocs, arrayUnion, serverTimestamp,
  runTransaction,
} from "firebase/firestore";

//  Generate question sequence 
export function generateQuestions(count = 20) {
  const qs = [];
  for (let i = 0; i < count; i++) {
    const a = Math.floor(Math.random() * 8) + 2; // 2-9
    const b = Math.floor(Math.random() * 9) + 1; // 1-9
    qs.push({ a, b, answer: a * b });
  }
  return qs;
}

//  ELO calculation 
export function calcElo(ratingA, ratingB, result, gamesA) {
  // result: 1 = A wins, 0 = A loses, 0.5 = tie
  const K = gamesA < 20 ? 40 : 20; // higher K for provisional
  const expected = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  const change = Math.round(K * (result - expected));
  return { newRating: ratingA + change, change };
}

//  Get or create rating 
export async function getRating(uid) {
  const snap = await getDoc(doc(db, "ratings", uid));
  if (snap.exists()) return snap.data();
  return { rating: 1200, games: 0, wins: 0, losses: 0, ties: 0, maxComputerLevel: 0, provisional: true };
}

export async function getAllRatings() {
  const snap = await getDocs(collection(db, "ratings"));
  return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
}

export async function updateRating(uid, updates) {
  await setDoc(doc(db, "ratings", uid), updates, { merge: true });
}

//  Create a new game 
export async function createGame(playerX, playerO, isComputer = false) {
  const gameId = "game_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const questions = generateQuestions(20);
  const gameData = {
    status: "playing",
    players: { X: playerX, O: playerO },
    board: Array(9).fill(null),
    questions,
    progress: {
      [playerX.uid]: { qIdx: 0, pendingPlace: false, answered: 0 },
      [playerO.uid]: { qIdx: 0, pendingPlace: false, answered: 0 },
    },
    winner: null,
    isComputer,
    createdAt: Date.now(),
  };
  await setDoc(doc(db, "games", gameId), gameData);
  return gameId;
}

//  Find or create matchmaking 
export async function findOrCreateMatch(player) {
  // Look for a waiting game
  const q = query(
    collection(db, "games"),
    where("status", "==", "waiting"),
  );
  const snap = await getDocs(q);
  for (const d of snap.docs) {
    const game = d.data();
    if (game.players.X.uid !== player.uid) {
      // Join this game as O
      const questions = generateQuestions(20);
      await updateDoc(doc(db, "games", d.id), {
        status: "playing",
        "players.O": player,
        questions,
        progress: {
          [game.players.X.uid]: { qIdx: 0, pendingPlace: false, answered: 0 },
          [player.uid]: { qIdx: 0, pendingPlace: false, answered: 0 },
        },
      });
      return { gameId: d.id, symbol: "O" };
    }
  }
  // Create a waiting game as X
  const gameId = "game_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  await setDoc(doc(db, "games", gameId), {
    status: "waiting",
    players: { X: player, O: null },
    board: Array(9).fill(null),
    questions: [],
    progress: { [player.uid]: { qIdx: 0, pendingPlace: false, answered: 0 } },
    winner: null,
    isComputer: false,
    createdAt: Date.now(),
  });
  return { gameId, symbol: "X" };
}

//  Submit correct answer  set pendingPlace 
export async function submitAnswer(gameId, uid) {
  await updateDoc(doc(db, "games", gameId), {
    [`progress.${uid}.pendingPlace`]: true,
    [`progress.${uid}.answered`]: (Date.now()),
  });
}

//  Place mark on board 
export function checkWinner(board) {
  const lines = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6],
  ];
  for (const [a,b,c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line: [a,b,c] };
    }
  }
  if (board.every(c => c !== null)) return { winner: "tie", line: [] };
  return null;
}

export async function placeMark(gameId, uid, cellIdx, symbol, currentQIdx) {
  let result = null;
  let cellTaken = false;

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(doc(db, "games", gameId));
    if (!snap.exists()) return;
    const game = snap.data();
    if (game.board[cellIdx] !== null) {
      cellTaken = true;
      return; // cell already taken - transaction will still commit but we flag it
    }

    const newBoard = [...game.board];
    newBoard[cellIdx] = symbol;
    result = checkWinner(newBoard);

    const updates = {
      board: newBoard,
      [`progress.${uid}.pendingPlace`]: false,
      [`progress.${uid}.qIdx`]: currentQIdx + 1,
    };

    if (result) {
      updates.status = "finished";
      updates.winner = result.winner;
      updates.winLine = result.line;
    }

    transaction.update(doc(db, "games", gameId), updates);
  });

  return cellTaken ? { cellTaken: true } : result;
}

//  Post game ratings 
export async function postGameRatings(game) {
  const { players, winner } = game;
  if (!players.O || winner === null) return;

  const [ratingX, ratingO] = await Promise.all([
    getRating(players.X.uid),
    getRating(players.O.uid),
  ]);

  let resultX, resultO;
  if (winner === "X") { resultX = 1; resultO = 0; }
  else if (winner === "O") { resultX = 0; resultO = 1; }
  else { resultX = 0.5; resultO = 0.5; }

  const { newRating: newX, change: changeX } = calcElo(ratingX.rating, ratingO.rating, resultX, ratingX.games);
  const { newRating: newO, change: changeO } = calcElo(ratingO.rating, ratingX.rating, resultO, ratingO.games);

  const gamesX = ratingX.games + 1;
  const gamesO = ratingO.games + 1;

  await Promise.all([
    updateRating(players.X.uid, {
      uid: players.X.uid,
      name: players.X.name,
      rating: newX,
      games: gamesX,
      wins: ratingX.wins + (winner === "X" ? 1 : 0),
      losses: ratingX.losses + (winner === "O" ? 1 : 0),
      ties: ratingX.ties + (winner === "tie" ? 1 : 0),
      provisional: gamesX < 20,
      change: changeX,
    }),
    updateRating(players.O.uid, {
      uid: players.O.uid,
      name: players.O.name,
      rating: newO,
      games: gamesO,
      wins: ratingO.wins + (winner === "O" ? 1 : 0),
      losses: ratingO.losses + (winner === "X" ? 1 : 0),
      ties: ratingO.ties + (winner === "tie" ? 1 : 0),
      provisional: gamesO < 20,
      change: changeO,
    }),
  ]);

  return { changeX, changeO, newX, newO };
}

//  Listen to game changes 
export function onGameChange(gameId, cb) {
  return onSnapshot(doc(db, "games", gameId), snap => {
    if (snap.exists()) cb(snap.data());
  });
}

//  Computer move 
export function getComputerLevel(rating) {
  // Level 1: 30s, each level 10% faster. Level n: 30 * 0.9^(n-1)
  // Max level where time > 1s: 30 * 0.9^(n-1) > 1 => n < 1 + log(1/30)/log(0.9) ~ 33
  const maxLevel = 33;
  // Map rating to level: 1200 = level 3, each 100 points = 1 level
  const level = Math.max(1, Math.min(maxLevel, Math.round((rating - 900) / 100)));
  const delayMs = Math.round(30000 * Math.pow(0.9, level - 1));
  return { level, delayMs };
}

