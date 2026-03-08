import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Peer from "peerjs";
import QuestionOverlay from "../components/QuestionOverlay";

// ── Constants ──────────────────────────────────────────────────────────────────
const SVG_PIECES = {
  wP: "https://upload.wikimedia.org/wikipedia/commons/4/45/Chess_plt45.svg",
  wN: "https://upload.wikimedia.org/wikipedia/commons/7/70/Chess_nlt45.svg",
  wB: "https://upload.wikimedia.org/wikipedia/commons/b/b1/Chess_blt45.svg",
  wR: "https://upload.wikimedia.org/wikipedia/commons/7/72/Chess_rlt45.svg",
  wQ: "https://upload.wikimedia.org/wikipedia/commons/1/15/Chess_qlt45.svg",
  wK: "https://upload.wikimedia.org/wikipedia/commons/4/42/Chess_klt45.svg",
  bP: "https://upload.wikimedia.org/wikipedia/commons/c/c7/Chess_pdt45.svg",
  bN: "https://upload.wikimedia.org/wikipedia/commons/e/ef/Chess_ndt45.svg",
  bB: "https://upload.wikimedia.org/wikipedia/commons/9/98/Chess_bdt45.svg",
  bR: "https://upload.wikimedia.org/wikipedia/commons/f/ff/Chess_rdt45.svg",
  bQ: "https://upload.wikimedia.org/wikipedia/commons/4/47/Chess_qdt45.svg",
  bK: "https://upload.wikimedia.org/wikipedia/commons/f/f0/Chess_kdt45.svg",
};

const TEXT_PIECES = {
  wK: "♔", wQ: "♕", wR: "♖", wB: "♗", wN: "♘", wP: "♙",
  bK: "♚", bQ: "♛", bR: "♜", bB: "♝", bN: "♞", bP: "♟",
};

const INIT_BOARD = [
  ["bR","bN","bB","bQ","bK","bB","bN","bR"],
  ["bP","bP","bP","bP","bP","bP","bP","bP"],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  ["wP","wP","wP","wP","wP","wP","wP","wP"],
  ["wR","wN","wB","wQ","wK","wB","wN","wR"],
];

const color = (p) => p ? p[0] : null;
const type  = (p) => p ? p[1] : null;
const opp   = (c) => c === "w" ? "b" : "w";
const inBounds = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
const clone = (b) => b.map(r => [...r]);

// ── Raw move generation (ignores check) ───────────────────────────────────────
function rawMoves(board, r, c, enPassant, castleRights) {
  const piece = board[r][c];
  if (!piece) return [];
  const col = color(piece);
  const t   = type(piece);
  const moves = [];
  const push = (tr, tc) => { if (inBounds(tr, tc)) moves.push([tr, tc]); };
  const slide = (dr, dc) => {
    let nr = r + dr, nc = c + dc;
    while (inBounds(nr, nc)) {
      if (board[nr][nc]) {
        if (color(board[nr][nc]) !== col) moves.push([nr, nc]);
        break;
      }
      moves.push([nr, nc]);
      nr += dr; nc += dc;
    }
  };

  if (t === "P") {
    const dir = col === "w" ? -1 : 1;
    const startRow = col === "w" ? 6 : 1;
    if (inBounds(r + dir, c) && !board[r + dir][c]) {
      push(r + dir, c);
      if (r === startRow && !board[r + 2 * dir][c]) push(r + 2 * dir, c);
    }
    for (const dc of [-1, 1]) {
      if (inBounds(r + dir, c + dc)) {
        if (board[r + dir][c + dc] && color(board[r + dir][c + dc]) !== col)
          push(r + dir, c + dc);
        if (enPassant && enPassant[0] === r + dir && enPassant[1] === c + dc)
          push(r + dir, c + dc);
      }
    }
  }
  if (t === "N") {
    for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
      const nr = r + dr, nc = c + dc;
      if (inBounds(nr, nc) && color(board[nr][nc]) !== col) push(nr, nc);
    }
  }
  if (t === "B" || t === "Q") { slide(-1,-1); slide(-1,1); slide(1,-1); slide(1,1); }
  if (t === "R" || t === "Q") { slide(-1,0); slide(1,0); slide(0,-1); slide(0,1); }
  if (t === "K") {
    for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
      const nr = r + dr, nc = c + dc;
      if (inBounds(nr, nc) && color(board[nr][nc]) !== col) push(nr, nc);
    }
    // Castling
    if (castleRights) {
      const row = col === "w" ? 7 : 0;
      if (r === row && c === 4) {
        const [ks, qs] = col === "w"
          ? [castleRights.wK, castleRights.wQ]
          : [castleRights.bK, castleRights.bQ];
        if (ks && !board[row][5] && !board[row][6]) push(row, 6);
        if (qs && !board[row][3] && !board[row][2] && !board[row][1]) push(row, 2);
      }
    }
  }
  return moves;
}

function findKing(board, col) {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (board[r][c] === col + "K") return [r, c];
  return null;
}

function isAttacked(board, r, c, byColor) {
  for (let sr = 0; sr < 8; sr++)
    for (let sc = 0; sc < 8; sc++)
      if (color(board[sr][sc]) === byColor)
        if (rawMoves(board, sr, sc, null, null).some(([tr, tc]) => tr === r && tc === c))
          return true;
  return false;
}

function applyMove(board, from, to, enPassant) {
  const nb = clone(board);
  const piece = nb[from[0]][from[1]];
  const t = type(piece), col = color(piece);

  nb[to[0]][to[1]] = piece;
  nb[from[0]][from[1]] = null;

  // En passant capture
  if (t === "P" && enPassant && to[0] === enPassant[0] && to[1] === enPassant[1]) {
    const capRow = col === "w" ? to[0] + 1 : to[0] - 1;
    nb[capRow][to[1]] = null;
  }
  // Castling rook
  if (t === "K" && Math.abs(to[1] - from[1]) === 2) {
    const row = from[0];
    if (to[1] === 6) { nb[row][5] = nb[row][7]; nb[row][7] = null; }
    if (to[1] === 2) { nb[row][3] = nb[row][0]; nb[row][0] = null; }
  }
  return nb;
}

function legalMoves(board, r, c, enPassant, castleRights) {
  const col = color(board[r][c]);
  if (!col) return [];
  const candidates = rawMoves(board, r, c, enPassant, castleRights);
  return candidates.filter(([tr, tc]) => {
    const nb = applyMove(board, [r, c], [tr, tc], enPassant);
    // Castling: cannot pass through check
    if (type(board[r][c]) === "K" && Math.abs(tc - c) === 2) {
      const mid = c + (tc > c ? 1 : -1);
      if (isAttacked(board, r, mid, opp(col))) return false;
      if (isAttacked(board, r, c,   opp(col))) return false;
    }
    const kingTarget = findKing(nb, col);
    if (!kingTarget) return false;
    const [kr, kc] = kingTarget;
    return !isAttacked(nb, kr, kc, opp(col));
  });
}

function allLegalMoves(board, col, enPassant, castleRights) {
  const moves = [];
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (color(board[r][c]) === col)
        legalMoves(board, r, c, enPassant, castleRights)
          .forEach(to => moves.push({ from: [r, c], to }));
  return moves;
}

function isInCheck(board, col) {
  const kingTarget = findKing(board, col);
  if (!kingTarget) return false;
  const [kr, kc] = kingTarget;
  return isAttacked(board, kr, kc, opp(col));
}

function gameStatus(board, turn, enPassant, castleRights) {
  const moves = allLegalMoves(board, turn, enPassant, castleRights);
  if (moves.length === 0) {
    return isInCheck(board, turn) ? "checkmate" : "stalemate";
  }
  if (isInCheck(board, turn)) return "check";
  return "playing";
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function Chess() {
  const navigate = useNavigate();
  const [board, setBoard]         = useState(INIT_BOARD.map(r => [...r]));
  const [turn, setTurn]           = useState("w");
  const [selected, setSelected]   = useState(null);
  const [highlights, setHighlights] = useState([]);
  const [enPassant, setEnPassant] = useState(null);
  const [castleRights, setCastle] = useState({ wK: true, wQ: true, bK: true, bQ: true });
  const [status, setStatus]       = useState("playing");
  const [lastMove, setLastMove]   = useState(null);
  const [promoState, setPromoState] = useState(null); // { board, to, turn, ep, castle }
  const [capturedW, setCapturedW] = useState([]);
  const [capturedB, setCapturedB] = useState([]);
  const [moveLog, setMoveLog]     = useState([]);
  const [showQuestion, setShowQuestion] = useState(false);

  // P2P State (matching TicTacToe)
  const [peerId, setPeerId] = useState("");
  const [joinId, setJoinId] = useState("");
  const [p2pStatus, setP2pStatus] = useState("local"); 
  const [isHost, setIsHost] = useState(true);
  const [copied, setCopied] = useState(false);
  const peerRef = useRef(null);
  const connRef = useRef(null);

  useEffect(() => {
    const peer = new Peer();
    peer.on('open', (id) => setPeerId(id));
    peer.on('connection', (conn) => setupConnection(conn, true));
    peerRef.current = peer;
    return () => peer.destroy();
  }, []);

  const setupConnection = (conn, asHost) => {
    conn.on('open', () => {
      connRef.current = conn;
      setP2pStatus("connected");
      setIsHost(asHost);
      reset();
    });
    conn.on('data', (data) => {
      if (data.type === 'move') {
        setBoard(data.board);
        setTurn(data.turn);
        setEnPassant(data.enPassant);
        setCastle(data.castleRights);
        setStatus(data.status);
        setLastMove(data.lastMove);
        setCapturedW(data.capturedW);
        setCapturedB(data.capturedB);
        setMoveLog(data.moveLog);
      } else if (data.type === 'restart') {
        reset();
      }
    });
    conn.on('close', () => {
      setP2pStatus("local");
      connRef.current = null;
    });
  };

  const finalize = useCallback((nb, from, to, newTurn, newEP, newCastle, captured) => {
    const newStatus = gameStatus(nb, newTurn, newEP, newCastle);
    const newCapturedW = captured && color(captured) === "w" ? [...capturedW, captured] : capturedW;
    const newCapturedB = captured && color(captured) === "b" ? [...capturedB, captured] : capturedB;
    
    setBoard(nb);
    setTurn(newTurn);
    setEnPassant(newEP);
    setCastle(newCastle);
    setStatus(newStatus);
    setLastMove({ from, to });
    setSelected(null);
    setHighlights([]);
    setCapturedW(newCapturedW);
    setCapturedB(newCapturedB);

    if (captured) {
      // Only show the question to the player who LOST the piece
      const lostPieceColor = color(captured);
      const amITheVictim = (lostPieceColor === 'w' && isHost) || (lostPieceColor === 'b' && !isHost);
      
      if (amITheVictim) {
        setTimeout(() => setShowQuestion(true), 500);
      }
    }

    if (p2pStatus === "connected" && connRef.current) {
      connRef.current.send({
        type: 'move',
        board: nb,
        turn: newTurn,
        enPassant: newEP,
        castleRights: newCastle,
        status: newStatus,
        lastMove: { from, to },
        capturedW: newCapturedW,
        capturedB: newCapturedB,
        moveLog: moveLog // moveLog update happens in doMove
      });
    }
  }, [capturedW, capturedB, p2pStatus, moveLog]);

  const doMove = useCallback((from, to, boardState, ep, castle) => {
    const piece  = boardState[from[0]][from[1]];
    const t      = type(piece);
    const c      = color(piece);
    const captured = boardState[to[0]][to[1]];

    let nb = applyMove(boardState, from, to, ep);
    let newEP = null;
    let newCastle = { ...castle };

    if (t === "P" && Math.abs(to[0] - from[0]) === 2)
      newEP = [(from[0] + to[0]) / 2, to[1]];

    if (t === "K") { if (c === "w") { newCastle.wK = false; newCastle.wQ = false; } else { newCastle.bK = false; newCastle.bQ = false; } }
    if (t === "R") {
      if (from[0] === 7 && from[1] === 7) newCastle.wK = false;
      if (from[0] === 7 && from[1] === 0) newCastle.wQ = false;
      if (from[0] === 0 && from[1] === 7) newCastle.bK = false;
      if (from[0] === 0 && from[1] === 0) newCastle.bQ = false;
    }

    if (t === "P" && (to[0] === 0 || to[0] === 7)) {
      setPromoState({ board: nb, from, to, turn: opp(c), ep: newEP, castle: newCastle, captured });
      return;
    }

    const colFiles = ["a","b","c","d","e","f","g","h"];
    const moveStr = `${TEXT_PIECES[piece]}${colFiles[from[1]]}${8 - from[0]}→${colFiles[to[1]]}${8 - to[0]}`;
    setMoveLog(log => [...log, { str: moveStr, col: c }]);

    finalize(nb, from, to, opp(c), newEP, newCastle, captured);
  }, [finalize, capturedW, capturedB, p2pStatus, moveLog]);

  const handlePromo = useCallback((pieceType) => {
    if (!promoState) return;
    const { board: nb, to, turn: newTurn, ep, castle, captured } = promoState;
    const col = newTurn === "w" ? "b" : "w"; // promoting player
    nb[to[0]][to[1]] = col + pieceType;
    setPromoState(null);
    const moveStr = `${TEXT_PIECES[col + pieceType]}=${pieceType}`;
    setMoveLog(log => [...log, { str: moveStr, col }]);
    finalize(nb, promoState.from, to, newTurn, ep, castle, captured);
  }, [promoState, finalize]);

  const handleClick = useCallback((r, c) => {
    if (status === "checkmate" || status === "stalemate" || promoState) return;
    
    // P2P Turn Check
    if (p2pStatus === "connected") {
      const myTurn = (isHost && turn === "w") || (!isHost && turn === "b");
      if (!myTurn) return;
    }

    if (selected) {
      const isLegal = highlights.some(([hr, hc]) => hr === r && hc === c);
      if (isLegal) {
        doMove(selected, [r, c], board, enPassant, castleRights);
      } else if (color(board[r][c]) === turn) {
        const moves = legalMoves(board, r, c, enPassant, castleRights);
        setSelected([r, c]);
        setHighlights(moves);
      } else {
        setSelected(null);
        setHighlights([]);
      }
    } else {
      if (color(board[r][c]) === turn) {
        const moves = legalMoves(board, r, c, enPassant, castleRights);
        setSelected([r, c]);
        setHighlights(moves);
      }
    }
  }, [selected, highlights, board, enPassant, castleRights, turn, status, promoState, doMove, p2pStatus, isHost]);

  const reset = () => {
    setBoard(INIT_BOARD.map(r => [...r]));
    setTurn("w"); setSelected(null); setHighlights([]);
    setEnPassant(null); setCastle({ wK: true, wQ: true, bK: true, bQ: true });
    setStatus("playing"); setLastMove(null); setPromoState(null);
    setCapturedW([]); setCapturedB([]); setMoveLog([]);
    if (p2pStatus === "connected" && connRef.current && isHost) {
      connRef.current.send({ type: 'restart' });
    }
  };

  const isHighlighted = (r, c) => highlights.some(([hr, hc]) => hr === r && hc === c);
  const isSelected    = (r, c) => selected && selected[0] === r && selected[1] === c;
  const isLastMove    = (r, c) => lastMove && (
    (lastMove.from[0] === r && lastMove.from[1] === c) ||
    (lastMove.to[0]   === r && lastMove.to[1]   === c)
  );
  const kingPos = (status === "check" || status === "checkmate") ? findKing(board, turn) : null;

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">
      
      {/* Background blobs (themed) */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-[#8B9D8B] rounded-full filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute top-0 right-20 w-72 h-72 bg-yellow-200 rounded-full filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-40 w-72 h-72 bg-emerald-200 rounded-full filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>

      <div className="relative z-10 w-full max-w-5xl bg-white/80 backdrop-blur-xl p-6 md:p-8 rounded-[2rem] shadow-2xl border border-white/50 flex flex-col items-center">
        
        {/* Header */}
        <div className="w-full flex justify-between items-center mb-6">
          <button 
            onClick={() => navigate('/home')}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#6b7c6b] to-[#2C3E2C] tracking-tight">
            Chess
          </h1>
          <button onClick={reset} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </button>
        </div>

        {/* Multiplayer UI (Same as TicTacToe) */}
        {p2pStatus === "local" && (
          <div className="w-full mb-6 p-4 bg-white/60 rounded-2xl border border-[#8B9D8B]/30 flex flex-col gap-3 shadow-sm max-w-md">
            <p className="text-xs font-bold text-gray-400 text-center uppercase tracking-widest">Multiplayer</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button 
                onClick={() => setP2pStatus("hosting")} 
                className="flex-1 py-2.5 bg-[#8B9D8B]/10 hover:bg-[#8B9D8B]/20 border border-[#8B9D8B]/30 text-[#4A5D4A] font-bold rounded-xl transition-all shadow-sm active:scale-95"
              >
                Host Game
              </button>
              <div className="flex flex-1 gap-1">
                <input 
                  type="text" 
                  placeholder="Paste Code" 
                  value={joinId}
                  onChange={(e) => setJoinId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#8B9D8B] font-mono text-xs shadow-inner"
                />
                <button 
                  onClick={() => {
                    if (!joinId) return;
                    const conn = peerRef.current.connect(joinId);
                    setupConnection(conn, false);
                  }} 
                  className="py-2.5 px-4 bg-gray-800 hover:bg-black text-white font-bold rounded-xl transition-all shadow-sm active:scale-95"
                >
                  Join
                </button>
              </div>
            </div>
          </div>
        )}

        {p2pStatus === "hosting" && (
          <div className="w-full mb-6 p-4 bg-gradient-to-br from-[#8B9D8B]/10 to-white rounded-2xl border-2 border-[#8B9D8B]/30 flex flex-col items-center gap-3 shadow-sm max-w-md">
            <span className="text-sm font-extrabold text-[#4A5D4A] animate-pulse tracking-wide">Waiting for opponent...</span>
            <div className="flex flex-col items-center gap-1 w-full relative">
              <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Your Invite Code</span>
              <div className="flex items-center gap-0 bg-white border border-gray-100 shadow-inner rounded-xl overflow-hidden w-full max-w-[250px]">
                <div className="px-3 py-2 w-full font-mono font-black text-gray-700 text-center truncate select-all overflow-x-auto whitespace-nowrap scrollbar-hide">
                  {peerId || "Generating..."}
                </div>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(peerId);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }} 
                  className="p-3 bg-gray-50 border-l border-gray-100 hover:bg-[#8B9D8B]/10 text-[#4A5D4A] transition-colors"
                >
                  {copied ? "✓" : "❐"}
                </button>
              </div>
            </div>
            <button onClick={() => setP2pStatus("local")} className="text-xs text-gray-400 hover:text-gray-600 uppercase font-bold tracking-wider mt-1 transition-colors">Cancel</button>
          </div>
        )}

        {p2pStatus === "connected" && (
          <div className="w-full mb-6 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 flex justify-between items-center shadow-sm max-w-md">
            <span className="text-sm font-bold text-emerald-700 flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
              Multiplayer Active
            </span>
            <span className="text-xs font-black px-3 py-1.5 bg-white rounded-lg text-gray-700 border border-emerald-100 shadow-sm">
              You play: <span className={isHost ? 'text-[#8B9D8B]' : 'text-gray-800'}>{isHost ? "White" : "Black"}</span>
            </span>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8 w-full items-start justify-center">
          
          {/* Left Panel - Status & Captured */}
          <div className="w-full lg:w-48 flex flex-col gap-4 order-2 lg:order-1">
            <div className="bg-[#8B9D8B]/5 border border-[#8B9D8B]/20 p-4 rounded-2xl shadow-sm">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Status</p>
              <p className={`text-lg font-black ${status === 'checkmate' ? 'text-red-500' : 'text-[#2C3E2C]'}`}>
                {status === "checkmate" ? `${opp(turn).toUpperCase()} WINS!` :
                 status === "stalemate" ? "DRAW" :
                 status === "check"     ? "CHECK!" :
                 p2pStatus === "connected" ? 
                    ((isHost && turn === 'w') || (!isHost && turn === 'b') ? "Your Turn" : "Opponent's Turn") :
                    `${turn === "w" ? "White" : "Black"}'s turn`}
              </p>
            </div>

            <div className="bg-white border border-gray-100 p-4 rounded-2xl shadow-sm">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Captured By Black</p>
              <div className="flex flex-wrap gap-1 min-h-[40px]">
                {capturedW.map((p, i) => <img key={i} src={SVG_PIECES[p]} className="w-6 h-6 object-contain" alt="" />)}
              </div>
            </div>

            <div className="bg-white border border-gray-100 p-4 rounded-2xl shadow-sm">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Captured By White</p>
              <div className="flex flex-wrap gap-1 min-h-[40px]">
                {capturedB.map((p, i) => <img key={i} src={SVG_PIECES[p]} className="w-6 h-6 object-contain" alt="" />)}
              </div>
            </div>
          </div>

          {/* Center - Board */}
          <div className="flex flex-col items-center order-1 lg:order-2">
            <div className="relative group">
              {/* File Labels (Left) */}
              <div className="absolute -left-6 top-0 bottom-0 flex flex-col justify-around py-4 text-[10px] font-bold text-gray-400">
                {[8,7,6,5,4,3,2,1].map(n => <span key={n}>{n}</span>)}
              </div>
              
              <div 
                className="grid grid-cols-8 grid-rows-8 border-4 border-[#2C3E2C]/10 rounded-lg overflow-hidden shadow-2xl"
                style={{ width: 'min(80vw, 500px)', height: 'min(80vw, 500px)' }}
              >
                {board.map((row, r) => row.map((piece, c) => {
                  const light = (r + c) % 2 === 0;
                  const sel = isSelected(r, c);
                  const hi = isHighlighted(r, c);
                  const lm = isLastMove(r, c);
                  const inKingCheck = kingPos && kingPos[0] === r && kingPos[1] === c;

                  let bg = light ? "#FDFBF7" : "#8B9D8B";
                  if (lm) bg = light ? "#E3E7A4" : "#C1C67E";
                  if (sel) bg = "#FFF9C4";
                  if (inKingCheck) bg = "#FEE2E2";

                  return (
                    <div 
                      key={`${r}-${c}`}
                      onClick={() => handleClick(r, c)}
                      className="relative flex items-center justify-center cursor-pointer transition-colors duration-100 overflow-hidden"
                      style={{ background: bg }}
                    >
                      {/* Highlight Dot for Empty Square */}
                      {hi && !piece && (
                        <div className="w-1/4 h-1/4 bg-black/10 rounded-full"></div>
                      )}
                      
                      {/* Highlight Ring for Capture */}
                      {hi && piece && (
                        <div className="absolute inset-2 border-4 border-black/10 rounded-full"></div>
                      )}

                      {/* Piece Icon */}
                      {piece && (
                        <img 
                          src={SVG_PIECES[piece]} 
                          alt=""
                          className={`
                            w-4/5 h-4/5 object-contain select-none z-10 
                            transition-transform duration-200 ${sel ? 'scale-110 -translate-y-1' : ''}
                          `}
                        />
                      )}
                    </div>
                  );
                }))}
              </div>

              {/* Rank Labels (Bottom) */}
              <div className="flex justify-around mt-2 px-2 text-[10px] font-bold text-gray-400 w-full uppercase tracking-widest">
                {["a","b","c","d","e","f","g","h"].map(f => <span key={f}>{f}</span>)}
              </div>
            </div>
          </div>

          {/* Right Panel - Move Log */}
          <div className="w-full lg:w-40 bg-white/60 border border-gray-100 p-4 rounded-2xl shadow-inner h-[300px] lg:h-[500px] overflow-y-auto scrollbar-hide order-3">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 sticky top-0 bg-white/60 py-1">Move Log</p>
            <div className="flex flex-col gap-2">
              {moveLog.map((m, i) => (
                <div key={i} className="flex items-center gap-2 text-xs border-b border-gray-50 pb-1">
                  <span className="w-5 text-gray-300 font-mono italic">{i + 1}.</span>
                  <span className={`font-bold ${m.col === 'w' ? 'text-[#2C3E2C]' : 'text-black'}`}>{m.str}</span>
                </div>
              ))}
              {moveLog.length === 0 && <p className="text-gray-300 text-xs italic">No moves yet</p>}
            </div>
          </div>

        </div>
      </div>

      {/* Promotion Modal (Themed) */}
      {promoState && (
        <div className="fixed inset-0 bg-[#2C3E2C]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-[2rem] shadow-2xl border border-white/50 text-center max-w-xs w-full">
            <h2 className="text-xl font-black text-[#2C3E2C] mb-6">Promote Pawn</h2>
            <div style={{ display: "flex", gap: "16px" }}>
              {["Q","R","B","N"].map(p => {
                const col = promoState.turn === "w" ? "b" : "w";
                return (
                  <button key={p} onClick={() => handlePromo(p)} className="h-20 w-20 bg-gray-50 hover:bg-[#8B9D8B]/10 rounded-2xl flex items-center justify-center p-2 border-2 border-transparent hover:border-[#8B9D8B] transition-all">
                    <img src={SVG_PIECES[col + p]} alt={p} className="w-full h-full object-contain" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Question Challenge Overlay */}
      <QuestionOverlay 
        isOpen={showQuestion} 
        onAnswer={() => setShowQuestion(false)} 
        topic="Strategy & Logic"
      />

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob { animation: blob 7s infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}
