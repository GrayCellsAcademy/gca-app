import { useState, useEffect, useRef, useCallback } from "react";
import {
  createGame, findOrCreateMatch, submitAnswer, placeMark,
  onGameChange, postGameRatings, getRating, getAllRatings,
  checkWinner, getComputerLevel, generateQuestions,
} from "./tictactoe";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "./core/firebase";

//  Helpers 
const SYMBOLS = { X: "X", O: "O" };
const WIN_COLORS = { X: "var(--blue)", O: "var(--red)" };

function ratingLabel(games) {
  return games < 20 ? "P" : ""; // P = provisional
}

//  Question Display 
function QuestionBox({ question, onCorrect, onWrong, disabled }) {
  const [input, setInput] = useState("");
  const [shake, setShake] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    setInput("");
    if (inputRef.current) inputRef.current.focus();
  }, [question?.a, question?.b]);

  const handleSubmit = () => {
    if (!question || disabled) return;
    const ans = parseInt(input);
    if (ans === question.answer) {
      onCorrect();
    } else {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setInput("");
      onWrong?.();
    }
  };

  if (!question) return null;

  return (
    <div style={{
      background: "var(--surface)", border: "2px solid var(--blue)",
      borderRadius: "var(--radius)", padding: "16px 20px",
      animation: shake ? "shake 0.4s ease" : "none",
      textAlign: "center",
    }}>
      <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 6 }}>Answer to place your mark:</div>
      <div style={{ fontSize: 36, fontWeight: 900, fontFamily: "var(--mono)", color: "var(--text)", marginBottom: 12 }}>
        {question.a} x {question.b} = ?
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
          disabled={disabled}
          type="number"
          autoFocus
          style={{ width: 100, fontSize: 24, textAlign: "center", fontFamily: "var(--mono)", padding: "8px" }}
        />
        <button className="btn btn-primary" onClick={handleSubmit} disabled={disabled || !input}>
          OK
        </button>
      </div>
    </div>
  );
}

//  Tic Tac Toe Board 
function Board({ board, winLine, onCellClick, canPlace, symbol }) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
      gap: 6, maxWidth: 300, margin: "0 auto",
    }}>
      {board.map((cell, i) => {
        const isWin = winLine?.includes(i);
        const isEmpty = cell === null;
        const isClickable = isEmpty && canPlace;
        return (
          <div key={i}
            onClick={() => isClickable && onCellClick(i)}
            style={{
              width: 90, height: 90,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 48, fontWeight: 900,
              background: isWin ? "rgba(251,191,36,0.15)" : "var(--surface)",
              border: "2px solid " + (isWin ? "var(--amber)" : isClickable ? "var(--blue)" : "var(--border)"),
              borderRadius: "var(--radius)",
              cursor: isClickable ? "pointer" : "default",
              color: cell === "X" ? "var(--blue)" : cell === "O" ? "var(--red)" : "var(--text3)",
              transition: "all 0.15s",
              boxShadow: isClickable ? "0 0 0 2px rgba(59,130,246,0.2)" : "none",
            }}>
            {cell || (isClickable ? "+" : "")}
          </div>
        );
      })}
    </div>
  );
}

//  Rating Badge 
function RatingBadge({ rating, games, name, symbol }) {
  const color = symbol === "X" ? "var(--blue)" : "var(--red)";
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      background: "var(--surface)", border: "2px solid " + color,
      borderRadius: "var(--radius)", padding: "10px 16px", minWidth: 100,
    }}>
      <div style={{ fontSize: 24, fontWeight: 900, color }}>{symbol}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 2 }}>{name}</div>
      <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "var(--mono)" }}>
        {rating}{ratingLabel(games)}
      </div>
      <div style={{ fontSize: 11, color: "var(--text3)" }}>{games} games</div>
    </div>
  );
}

//  Main Game Component 
function GameView({ gameId, symbol, user, game, onFinish }) {
  const myUid = user.id;
  const oppSymbol = symbol === "X" ? "O" : "X";
  const myProgress = game.progress?.[myUid] || { qIdx: 0, pendingPlace: false };
  const oppUid = symbol === "X" ? game.players.O?.uid : game.players.X?.uid;
  const oppProgress = oppUid ? (game.progress?.[oppUid] || { qIdx: 0, pendingPlace: false }) : null;

  const currentQuestion = myProgress.pendingPlace ? null : (game.questions?.[myProgress.qIdx] || null);
  const canPlace = myProgress.pendingPlace && game.status === "playing";
  const winLine = game.winLine || [];

  const postedRef = useRef(false);

  // Post ratings when game finishes
  useEffect(() => {
    if (game.status === "finished" && !game.isComputer && !postedRef.current) {
      postedRef.current = true;
      postGameRatings(game);
    }
  }, [game.status]);

  const handleCorrect = async () => {
    await submitAnswer(gameId, myUid);
  };

  const [cellTakenMsg, setCellTakenMsg] = useState(false);

  const handleCellClick = async (cellIdx) => {
    if (!canPlace) return;
    const result = await placeMark(gameId, myUid, cellIdx, symbol, myProgress.qIdx);
    if (result?.cellTaken) {
      setCellTakenMsg(true);
      setTimeout(() => setCellTakenMsg(false), 2000);
    }
  };

  const myName = symbol === "X" ? game.players.X?.name : game.players.O?.name;
  const oppName = symbol === "X" ? game.players.O?.name : game.players.X?.name;

  return (
    <div style={{ maxWidth: 500, margin: "0 auto" }}>
      {/* Status bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontSize: 13, color: "var(--text3)" }}>
          You are <strong style={{ color: symbol === "X" ? "var(--blue)" : "var(--red)" }}>{symbol}</strong>
        </div>
        {game.status === "playing" && (
          <div style={{ display: "flex", gap: 12, fontSize: 13 }}>
            <span style={{ color: "var(--blue)" }}>X: Q{(game.progress?.[game.players.X?.uid]?.qIdx || 0) + 1}</span>
            <span style={{ color: "var(--red)" }}>O: Q{(game.progress?.[game.players.O?.uid]?.qIdx || 0) + 1}</span>
          </div>
        )}
      </div>

      {/* Board */}
      <div style={{ marginBottom: 16 }}>
        <Board
          board={game.board}
          winLine={winLine}
          onCellClick={handleCellClick}
          canPlace={canPlace}
          symbol={symbol}
        />
      </div>

      {/* Question or Place instruction */}
      {game.status === "playing" && (
        <div>
          {canPlace ? (
            <div style={{
              background: cellTakenMsg ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)",
              border: "2px solid " + (cellTakenMsg ? "var(--red)" : "var(--green)"),
              borderRadius: "var(--radius)", padding: "16px", textAlign: "center",
            }}>
              {cellTakenMsg ? (
                <div style={{ fontSize: 18, fontWeight: 800, color: "var(--red)" }}>
                  That cell was just taken! Pick another cell.
                </div>
              ) : (
                <div style={{ fontSize: 18, fontWeight: 800, color: "var(--green)", marginBottom: 4 }}>
                  Correct! Click any open cell to place your {symbol}
                </div>
              )}
            </div>
          ) : (
            <QuestionBox
              question={currentQuestion}
              onCorrect={handleCorrect}
            />
          )}
        </div>
      )}

      {/* Opponent status */}
      {game.status === "playing" && oppProgress && (
        <div style={{ marginTop: 12, fontSize: 13, color: "var(--text3)", textAlign: "center" }}>
          {oppProgress.pendingPlace
            ? <span style={{ color: symbol === "X" ? "var(--red)" : "var(--blue)", fontWeight: 700 }}>{oppName} is placing their mark...</span>
            : <span>{oppName} is on question {(oppProgress.qIdx || 0) + 1}</span>
          }
        </div>
      )}

      {/* Game over */}
      {game.status === "finished" && (
        <div style={{
          marginTop: 16, background: "var(--surface)", border: "2px solid var(--border)",
          borderRadius: "var(--radius)", padding: "20px", textAlign: "center",
        }}>
          {game.winner === "tie" ? (
            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text)" }}>It's a tie!</div>
          ) : game.winner === symbol ? (
            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--green)" }}>You win!</div>
          ) : (
            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--red)" }}>{oppName} wins!</div>
          )}
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={onFinish}>
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}

//  Computer Game 
function ComputerGame({ user, level, onFinish }) {
  const [gameId, setGameId] = useState(null);
  const [game, setGame] = useState(null);

  const computerUid = "computer_" + level;
  const computerPlayer = { uid: computerUid, name: "Computer Lv." + level };
  const humanPlayer = { uid: user.id, name: user.name };

  useEffect(() => {
    const start = async () => {
      const id = await createGame(humanPlayer, computerPlayer, true);
      setGameId(id);
    };
    start();
  }, []);

  useEffect(() => {
    if (!gameId) return;
    const unsub = onGameChange(gameId, setGame);
    return () => unsub();
  }, [gameId]);

  // Computer logic
  const computerTimerRef = useRef(null);
  const { delayMs } = getComputerLevel(level * 100 + 900);
  const actualDelay = Math.round(30000 * Math.pow(0.9, level - 1));

  useEffect(() => {
    if (!game || game.status !== "playing") return;
    const compProgress = game.progress?.[computerUid];
    if (!compProgress) return;

    if (compProgress.pendingPlace) {
      // Computer picks best cell
      computerTimerRef.current = setTimeout(async () => {
        const board = game.board;
        // Try to win, block, or pick center/corner/random
        const empty = board.map((c, i) => c === null ? i : -1).filter(i => i >= 0);
        if (empty.length === 0) return;

        const pick = (sym) => {
          const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
          for (const [a,b,c] of lines) {
            const cells = [board[a], board[b], board[c]];
            const empties = [a,b,c].filter(i => board[i] === null);
            if (cells.filter(c => c === sym).length === 2 && empties.length === 1) return empties[0];
          }
          return null;
        };

        let cell = pick("O") ?? pick("X") ?? (board[4] === null ? 4 : null) ??
          [0,2,6,8].find(i => board[i] === null) ?? empty[0];

        await placeMark(gameId, computerUid, cell, "O", compProgress.qIdx);
      }, 500);
    } else {
      // Computer answers after delay
      computerTimerRef.current = setTimeout(async () => {
        if (game.status !== "playing") return;
        await submitAnswer(gameId, computerUid);
      }, actualDelay);
    }

    return () => clearTimeout(computerTimerRef.current);
  }, [game?.progress?.[computerUid]?.qIdx, game?.progress?.[computerUid]?.pendingPlace, game?.status]);

  if (!game) return <div style={{ textAlign: "center", padding: 40 }}><div className="spinner" /></div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontWeight: 700 }}>vs Computer - Level {level}</div>
        <div style={{ fontSize: 13, color: "var(--text3)" }}>
          Computer answers in ~{(actualDelay / 1000).toFixed(1)}s
        </div>
      </div>
      <GameView
        gameId={gameId}
        symbol="X"
        user={user}
        game={game}
        onFinish={onFinish}
      />
    </div>
  );
}

//  Matchmaking / Lobby 
function Lobby({ user, rating, onStartComputer, onJoinGame }) {
  const [waiting, setWaiting] = useState(false);
  const [gameId, setGameId] = useState(null);
  const [symbol, setSymbol] = useState(null);
  const [computerLevel, setComputerLevel] = useState(1);
  const unsubRef = useRef(null);

  const handleOnline = async () => {
    setWaiting(true);
    const result = await findOrCreateMatch({ uid: user.id, name: user.name });
    setGameId(result.gameId);
    setSymbol(result.symbol);

    // Watch for opponent to join
    unsubRef.current = onGameChange(result.gameId, (g) => {
      if (g.status === "playing" && g.players.O) {
        unsubRef.current?.();
        onJoinGame(result.gameId, result.symbol);
      }
    });
  };

  const handleCancel = async () => {
    if (gameId) {
      await updateDoc(doc(db, "games", gameId), { status: "cancelled" });
    }
    unsubRef.current?.();
    setWaiting(false);
    setGameId(null);
  };

  return (
    <div style={{ maxWidth: 480, margin: "0 auto" }}>
      <div className="card" style={{ textAlign: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 4 }}>Math Tic Tac Toe</div>
        <div style={{ fontSize: 14, color: "var(--text2)", marginBottom: 16 }}>
          Answer multiplication questions to place your marks. Get 3 in a row to win!
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "var(--mono)", color: "var(--blue)", marginBottom: 4 }}>
          {rating.rating}{ratingLabel(rating.games)}
        </div>
        <div style={{ fontSize: 13, color: "var(--text3)" }}>
          {rating.games} games - {rating.wins}W {rating.losses}L {rating.ties}T
          {rating.provisional ? " - Provisional" : ""}
        </div>
      </div>

      {waiting ? (
        <div className="card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Waiting for opponent...</div>
          <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 16 }}>
            You are <strong style={{ color: "var(--blue)" }}>X</strong> - Share the site with a friend to play!
          </div>
          <div className="spinner" style={{ margin: "0 auto 16px" }} />
          <button className="btn btn-ghost" onClick={handleCancel}>Cancel</button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <button className="btn btn-primary btn-lg" onClick={handleOnline}>
            Play vs Online Opponent
          </button>

          <div className="card">
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Play vs Computer</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <label style={{ fontSize: 13, color: "var(--text2)" }}>Level:</label>
              <input type="range" min={1} max={20} value={computerLevel}
                onChange={e => setComputerLevel(Number(e.target.value))}
                style={{ flex: 1 }} />
              <span style={{ fontWeight: 800, minWidth: 30, textAlign: "center" }}>{computerLevel}</span>
            </div>
            <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 12 }}>
              Computer answers in ~{(30 * Math.pow(0.9, computerLevel - 1)).toFixed(1)}s
              {rating.maxComputerLevel > 0 && ` - Your best: Level ${rating.maxComputerLevel}`}
            </div>
            <button className="btn btn-ghost" style={{ width: "100%" }}
              onClick={() => onStartComputer(computerLevel)}>
              Start vs Computer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

//  Leaderboard 
function Leaderboard({ currentUid }) {
  const [ratings, setRatings] = useState([]);
  useEffect(() => {
    getAllRatings().then(r => setRatings(r.sort((a,b) => b.rating - a.rating)));
  }, []);

  return (
    <div style={{ maxWidth: 500, margin: "0 auto" }}>
      <h3 style={{ fontWeight: 800, fontSize: 18, marginBottom: 12 }}>Leaderboard</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {ratings.map((r, i) => (
          <div key={r.uid} style={{
            display: "flex", alignItems: "center", gap: 12,
            background: r.uid === currentUid ? "rgba(59,130,246,0.1)" : "var(--surface)",
            border: "1px solid " + (r.uid === currentUid ? "var(--blue)" : "var(--border)"),
            borderRadius: "var(--radius-sm)", padding: "10px 14px",
          }}>
            <div style={{ width: 28, fontWeight: 800, color: i < 3 ? "var(--amber)" : "var(--text3)", fontSize: 14 }}>
              #{i+1}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{r.name || r.uid}</div>
              <div style={{ fontSize: 11, color: "var(--text3)" }}>
                {r.games}G - {r.wins}W {r.losses}L {r.ties}T
                {r.maxComputerLevel > 0 ? " - CPU Lv." + r.maxComputerLevel : ""}
              </div>
            </div>
            <div style={{ fontWeight: 900, fontSize: 20, fontFamily: "var(--mono)" }}>
              {r.rating}{ratingLabel(r.games)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

//  Main TicTacToe Page 
export default function TicTacToe({ user, onHome }) {
  const [view, setView] = useState("lobby"); // lobby | computer | online | leaderboard
  const [gameId, setGameId] = useState(null);
  const [symbol, setSymbol] = useState(null);
  const [game, setGame] = useState(null);
  const [rating, setRating] = useState({ rating: 1200, games: 0, wins: 0, losses: 0, ties: 0, maxComputerLevel: 0, provisional: true });
  const [computerLevel, setComputerLevel] = useState(1);

  useEffect(() => {
    getRating(user.id).then(setRating);
  }, [view]);

  useEffect(() => {
    if (!gameId || view !== "online") return;
    const unsub = onGameChange(gameId, setGame);
    return () => unsub();
  }, [gameId, view]);

  const handleJoinGame = (gId, sym) => {
    setGameId(gId);
    setSymbol(sym);
    setView("online");
  };

  const handleStartComputer = (level) => {
    setComputerLevel(level);
    setView("computer");
  };

  const handleFinish = () => {
    setView("lobby");
    setGame(null);
    setGameId(null);
    getRating(user.id).then(setRating);
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "clamp(16px,3vw,32px)" }} className="dot-bg">
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,var(--blue),var(--purple,#8b5cf6))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 900, color: "#fff" }}>
              XO
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 18 }}>Math Tic Tac Toe</div>
              <div style={{ fontSize: 12, color: "var(--text3)" }}>Multiply to win</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {view !== "leaderboard" && (
              <button className="btn btn-ghost btn-sm" onClick={() => setView("leaderboard")}>Leaderboard</button>
            )}
            {view === "leaderboard" && (
              <button className="btn btn-ghost btn-sm" onClick={() => setView("lobby")}>Back</button>
            )}
            <button className="btn btn-ghost btn-sm" onClick={onHome}>Home</button>
          </div>
        </div>

        {view === "lobby" && (
          <Lobby
            user={user}
            rating={rating}
            onStartComputer={handleStartComputer}
            onJoinGame={handleJoinGame}
          />
        )}

        {view === "computer" && (
          <ComputerGame
            user={user}
            level={computerLevel}
            onFinish={handleFinish}
          />
        )}

        {view === "online" && game && (
          <GameView
            gameId={gameId}
            symbol={symbol}
            user={user}
            game={game}
            onFinish={handleFinish}
          />
        )}

        {view === "online" && !game && (
          <div style={{ textAlign: "center", padding: 60 }}><div className="spinner" /></div>
        )}

        {view === "leaderboard" && <Leaderboard currentUid={user.id} />}
      </div>
    </div>
  );
}
