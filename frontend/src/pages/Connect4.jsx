import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import Peer from "peerjs"
import QuestionOverlay from "../components/QuestionOverlay"

const ROWS = 6
const COLS = 7

export default function Connect4() {
  const navigate = useNavigate()
  
  // Create an initial empty board (array of columns)
  const initialBoard = Array.from({ length: COLS }, () => Array(ROWS).fill(null))
  
  const [board, setBoard] = useState(initialBoard)
  const [redIsNext, setRedIsNext] = useState(true)
  const [winner, setWinner] = useState(null)
  const [winningCells, setWinningCells] = useState([])
  const [hoveredCol, setHoveredCol] = useState(null)
  const [showQuestion, setShowQuestion] = useState(false)
  const [hasShownQuestionForThisGame, setHasShownQuestionForThisGame] = useState(false)

  // P2P State
  const [peerId, setPeerId] = useState("")
  const [joinId, setJoinId] = useState("")
  const [status, setStatus] = useState("local") // "local", "hosting", "connected"
  const [isHost, setIsHost] = useState(true)
  const [copied, setCopied] = useState(false)
  
  const peerRef = useRef(null)
  const connRef = useRef(null)

  useEffect(() => {
    const peer = new Peer()
    peer.on('open', (id) => setPeerId(id))
    peer.on('connection', (conn) => setupConnection(conn, true))
    peerRef.current = peer
    return () => peer.destroy()
  }, [])

  const setupConnection = (conn, asHost) => {
    conn.on('open', () => {
      connRef.current = conn
      setStatus("connected")
      setIsHost(asHost)
      resetGame()
      setHasShownQuestionForThisGame(false)
    })
    
    conn.on('data', (data) => {
      if (data.type === 'move') {
        setBoard(data.board)
        setRedIsNext(data.redIsNext)
        setWinner(data.winner)
        setWinningCells(data.winningCells)
      } else if (data.type === 'restart') {
        resetGame()
        setHasShownQuestionForThisGame(false)
      }
    })
    
    conn.on('close', () => {
      setStatus("local")
      connRef.current = null
      setHasShownQuestionForThisGame(false)
    })
  }

  const checkWinner = (b) => {
    const directions = [
      [[0, 1], [0, -1]], // Horizontal
      [[1, 0], [-1, 0]], // Vertical
      [[1, 1], [-1, -1]], // Diagonal 1
      [[1, -1], [-1, 1]] // Diagonal 2
    ]

    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        const currentData = b[c][r]
        if (!currentData) continue

        for (const dir of directions) {
          let count = 1
          let cells = [{c, r}]
          for (const [dc, dr] of dir) {
            let nc = c + dc; let nr = r + dr
            while (nc >= 0 && nc < COLS && nr >= 0 && nr < ROWS && b[nc][nr] === currentData) {
              count++; cells.push({c: nc, r: nr}); nc += dc; nr += dr
            }
          }
          if (count >= 4) return { winner: currentData, cells }
        }
      }
    }
    return null
  }

  useEffect(() => {
    if (winner && !hasShownQuestionForThisGame) {
      // Determine if I am the loser
      const amILoser = (winner === "Red" && !isHost) || (winner === "Yellow" && isHost);
      
      if (amILoser) {
        setTimeout(() => {
          setShowQuestion(true);
          setHasShownQuestionForThisGame(true);
        }, 500);
      } else {
        // Even if I'm not the loser, mark it so we don't check again this game
        setHasShownQuestionForThisGame(true);
      }
    }
  }, [winner, isHost, hasShownQuestionForThisGame])

  const dropDisc = (colIndex) => {
    if (winner) return
    
    // P2P Turn Check
    if (status === "connected") {
      const myTurn = (isHost && redIsNext) || (!isHost && !redIsNext)
      if (!myTurn) return
    }

    const col = board[colIndex]
    const rowIndex = col.indexOf(null)
    if (rowIndex === -1) return

    const newBoard = board.map(c => [...c])
    const currentPlayer = redIsNext ? "Red" : "Yellow"
    newBoard[colIndex][rowIndex] = currentPlayer

    const winResult = checkWinner(newBoard)
    const newWinner = winResult?.winner || null
    const newWinningCells = winResult?.cells || []
    const nextRedIsNext = !redIsNext

    setBoard(newBoard)
    if (winResult) {
      setWinner(newWinner)
      setWinningCells(newWinningCells)
    } else {
      setRedIsNext(nextRedIsNext)
    }

    if (status === "connected" && connRef.current) {
      connRef.current.send({
        type: 'move',
        board: newBoard,
        redIsNext: winResult ? redIsNext : nextRedIsNext,
        winner: newWinner,
        winningCells: newWinningCells
      })
    }
  }

  const resetGame = () => {
    setBoard(initialBoard)
    setRedIsNext(true)
    setWinner(null)
    setWinningCells([])
    if (status === "connected" && connRef.current && isHost) {
      connRef.current.send({ type: 'restart' })
    }
  }

  const displayRows = []
  for (let r = ROWS - 1; r >= 0; r--) {
    let rowCells = []
    for (let c = 0; c < COLS; c++) {
      rowCells.push({ c, r, value: board[c][r] })
    }
    displayRows.push(rowCells)
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center py-10 px-4 font-sans relative overflow-hidden">
      
      {/* Background blobs */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-red-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute top-0 right-20 w-72 h-72 bg-yellow-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-40 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      
      <div className="relative z-10 w-full max-w-2xl bg-white/80 backdrop-blur-xl border border-white/50 p-6 md:p-8 rounded-[2rem] shadow-2xl flex flex-col items-center">
        
        <div className="w-full flex justify-between items-center mb-6">
          <button 
            onClick={() => navigate('/home')}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-yellow-500 tracking-tight">
            Connect 4
          </h1>
          
          <button onClick={resetGame} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition-colors" title="Restart">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </button>
        </div>

        {/* Multiplayer UI */}
        {status === "local" && (
          <div className="w-full mb-6 p-4 bg-white/60 rounded-2xl border border-red-100 flex flex-col gap-3 shadow-sm">
            <p className="text-xs font-bold text-gray-400 text-center uppercase tracking-widest">Multiplayer</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button 
                onClick={() => setStatus("hosting")} 
                className="flex-1 py-2.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 font-bold rounded-xl transition-all shadow-sm active:scale-95"
              >
                Host Game
              </button>
              <div className="flex flex-1 gap-1">
                <input 
                  type="text" 
                  placeholder="Paste Code" 
                  value={joinId}
                  onChange={(e) => setJoinId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-400 font-mono text-xs shadow-inner"
                />
                <button 
                  onClick={() => {
                    if (!joinId) return
                    const conn = peerRef.current.connect(joinId)
                    setupConnection(conn, false)
                  }} 
                  className="py-2.5 px-4 bg-gray-800 hover:bg-black text-white font-bold rounded-xl transition-all shadow-sm active:scale-95"
                >
                  Join
                </button>
              </div>
            </div>
          </div>
        )}

        {status === "hosting" && (
          <div className="w-full mb-6 p-4 bg-gradient-to-br from-red-50 to-white rounded-2xl border-2 border-red-200 flex flex-col items-center gap-3 shadow-sm">
            <span className="text-sm font-extrabold text-red-500 animate-pulse tracking-wide">Waiting for opponent...</span>
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
                  className="p-3 bg-gray-50 border-l border-gray-100 hover:bg-red-50 text-red-500 transition-colors"
                >
                  {copied ? "✓" : "❐"}
                </button>
              </div>
            </div>
            <button onClick={() => setStatus("local")} className="text-xs text-gray-400 hover:text-gray-600 uppercase font-bold tracking-wider mt-1 transition-colors">Cancel</button>
          </div>
        )}

        {status === "connected" && (
          <div className="w-full mb-6 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 flex justify-between items-center shadow-sm">
            <span className="text-sm font-bold text-emerald-700 flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
              Multiplayer Active
            </span>
            <span className="text-xs font-black px-3 py-1.5 bg-white rounded-lg text-gray-700 border border-emerald-100 shadow-sm">
              You play: <span className={isHost ? 'text-red-500' : 'text-yellow-500'}>{isHost ? "Red" : "Yellow"}</span>
            </span>
          </div>
        )}

        {/* Status Indicator */}
        <div className="mb-8 w-full">
          <div className="flex items-center justify-center p-4 rounded-2xl bg-gray-50/80 border border-gray-100 shadow-sm">
            {winner ? (
              <span className="text-2xl font-black flex items-center gap-2 animate-bounce">
                🎉 <span className={winner === 'Red' ? 'text-red-500' : 'text-yellow-500'}>{winner} Wins!</span> 🎉
              </span>
            ) : (
              <span className="text-xl font-bold flex items-center gap-3 text-gray-700">
                {status === "connected" ? (
                  ((isHost && redIsNext) || (!isHost && !redIsNext)) ? "Your turn:" : "Opponent's turn:"
                ) : (
                  "Current turn:"
                )}
                <div className={`w-8 h-8 rounded-full shadow-inner border-2 border-black/10 transition-colors duration-300 ${redIsNext ? 'bg-red-500 shadow-red-500/50' : 'bg-yellow-400 shadow-yellow-500/50'}`}></div>
              </span>
            )}
          </div>
        </div>

        {/* The Board */}
        <div className="p-3 bg-blue-600 rounded-[2rem] shadow-[inset_0_4px_10px_rgba(0,0,0,0.5),0_20px_40px_rgba(37,99,235,0.3)] border-b-[12px] border-blue-800 relative select-none touch-manipulation">
          <div className="grid grid-cols-7 gap-2 mb-2 px-1">
            {Array.from({length: COLS}).map((_, colIndex) => (
              <div key={`indicator-${colIndex}`} className="h-4 flex justify-center">
                {!winner && hoveredCol === colIndex && board[colIndex].indexOf(null) !== -1 && (
                  <div className={`w-8 h-4 rounded-t-full transition-colors animate-[dropIn_0.2s_ease-out] ${redIsNext ? 'bg-red-500' : 'bg-yellow-400'}`}></div>
                )}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2 p-2 relative z-10 bg-blue-700/50 rounded-xl">
            {displayRows.map((rowCells, i) => (
              rowCells.map((cell) => {
                const isWinningPiece = winningCells.some(w => w.c === cell.c && w.r === cell.r)
                return (
                  <div 
                    key={`${cell.c}-${cell.r}`}
                    onClick={() => dropDisc(cell.c)}
                    onMouseEnter={() => setHoveredCol(cell.c)}
                    onMouseLeave={() => setHoveredCol(null)}
                    className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 relative cursor-pointer group"
                  >
                    <div className="absolute inset-0 bg-[#FDFBF7] rounded-full z-0 group-hover:bg-white transition-colors"></div>
                    {cell.value && (
                      <div className={`absolute inset-1 rounded-full z-10 shadow-[inset_-3px_-3px_10px_rgba(0,0,0,0.3),inset_3px_3px_10px_rgba(255,255,255,0.4)] animate-[dropPiece_0.4s_cubic-bezier(0.25,0.46,0.45,0.94)_both] ${cell.value === 'Red' ? 'bg-gradient-to-br from-red-400 to-red-600' : 'bg-gradient-to-br from-yellow-300 to-yellow-500'}`}>
                        {isWinningPiece && <div className="absolute inset-0 rounded-full border-4 border-white animate-pulse shadow-[0_0_15px_white]"></div>}
                      </div>
                    )}
                    <div className="absolute inset-0 rounded-full shadow-[inset_0_4px_8px_rgba(0,0,0,0.4)] z-20 pointer-events-none"></div>
                  </div>
                )
              })
            ))}
          </div>
        </div>
      </div>

      <QuestionOverlay 
        isOpen={showQuestion} 
        onAnswer={() => setShowQuestion(false)} 
        topic="Cognitive Science"
      />

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes dropPiece {
          0% { transform: translateY(-300%); opacity: 0; }
          60% { transform: translateY(10%); opacity: 1; }
          80% { transform: translateY(-5%); }
          100% { transform: translateY(0); }
        }
        @keyframes dropIn {
          0% { transform: translateY(-10px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
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
  )
}
