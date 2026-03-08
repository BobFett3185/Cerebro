import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import Peer from "peerjs"
import QuestionOverlay from "../components/QuestionOverlay"

export default function TicTacToe() {
  const navigate = useNavigate()
  const [board, setBoard] = useState(Array(9).fill(null))
  const [xIsNext, setXIsNext] = useState(true)
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
    peer.on('open', (id) => {
      setPeerId(id)
    })
    peer.on('connection', (conn) => {
      setupConnection(conn, true)
    })
    peerRef.current = peer

    return () => {
      peer.destroy()
    }
  }, [])

  const setupConnection = (conn, asHost) => {
    conn.on('open', () => {
      connRef.current = conn
      setStatus("connected")
      setIsHost(asHost)
      
      // Reset game when newly connected
      setBoard(Array(9).fill(null))
      setXIsNext(true)
      setHasShownQuestionForThisGame(false)
    })
    
    conn.on('data', (data) => {
      if (data.type === 'move') {
        setBoard(data.board)
        setXIsNext(data.xIsNext)
      } else if (data.type === 'restart') {
        setBoard(Array(9).fill(null))
        setXIsNext(true)
        setHasShownQuestionForThisGame(false)
      }
    })
    
    conn.on('close', () => {
      setStatus("local")
      connRef.current = null
      setBoard(Array(9).fill(null))
      setXIsNext(true)
      setHasShownQuestionForThisGame(false)
      // Optional: show a small alert or toast
    })
  }

  const hostGame = () => {
    setStatus("hosting")
    setBoard(Array(9).fill(null))
    setXIsNext(true)
    setHasShownQuestionForThisGame(false)
  }

  const joinGame = () => {
    if (!joinId) return
    const conn = peerRef.current.connect(joinId)
    setupConnection(conn, false)
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(peerId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Determine winner
  const calculateWinner = (squares) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ]
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i]
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return { winner: squares[a], line: lines[i] }
      }
    }
    return null
  }

  const winInfo = calculateWinner(board)
  const winner = winInfo?.winner
  const winningLine = winInfo?.line || []
  const isDraw = !winner && board.every((square) => square !== null)

  useEffect(() => {
    if (winner && !hasShownQuestionForThisGame) {
      // Determine if I am the loser
      const amILoser = (winner === "X" && !isHost) || (winner === "O" && isHost);
      
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

  const handleClick = (i) => {
    if (status === "connected") {
      const myTurn = (isHost && xIsNext) || (!isHost && !xIsNext)
      if (!myTurn) return // waiting for opponent
    }

    if (board[i] || winner) return
    const newBoard = [...board]
    newBoard[i] = xIsNext ? "X" : "O"
    setBoard(newBoard)
    const nextTurn = !xIsNext
    setXIsNext(nextTurn)

    if (status === "connected" && connRef.current) {
      connRef.current.send({ type: 'move', board: newBoard, xIsNext: nextTurn })
    }
  }

  const resetGame = () => {
    setBoard(Array(9).fill(null))
    setXIsNext(true)
    if (status === "connected" && connRef.current) {
      connRef.current.send({ type: 'restart' })
    }
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">
      
      {/* Vibrant Background Blobs */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-pink-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
      <div className="absolute top-0 right-20 w-72 h-72 bg-yellow-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-40 w-72 h-72 bg-cyan-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>

      <div className="relative z-10 w-full max-w-md bg-white/80 backdrop-blur-xl p-8 rounded-[2rem] shadow-2xl border border-white/50 flex flex-col items-center">
        
        <div className="w-full flex justify-between items-center mb-6">
          <button 
            onClick={() => navigate('/home')}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-500 tracking-tight">
            Tic-Tac-Toe
          </h1>
          <div className="w-10"></div> {/* Spacer to center title */}
        </div>

        {/* P2P Multiplayer Networking UI */}
        {status === "local" && (
          <div className="w-full mb-6 p-4 bg-white/60 rounded-2xl border border-pink-100 flex flex-col gap-3 shadow-sm">
            <p className="text-xs font-bold text-gray-400 text-center uppercase tracking-widest">Multiplayer</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button 
                onClick={hostGame} 
                className="flex-1 py-2.5 bg-gradient-to-r from-pink-100 to-pink-50 hover:from-pink-200 hover:to-pink-100 border border-pink-200 text-pink-600 font-bold rounded-xl transition-all shadow-sm active:scale-95"
              >
                Host Game
              </button>
              <div className="flex flex-1 gap-1">
                <input 
                  type="text" 
                  placeholder="Paste Code" 
                  value={joinId}
                  onChange={(e) => setJoinId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 font-mono text-xs shadow-inner"
                />
                <button 
                  onClick={joinGame} 
                  className="py-2.5 px-4 bg-gradient-to-r from-cyan-100 to-cyan-50 hover:from-cyan-200 hover:to-cyan-100 border border-cyan-200 text-cyan-700 font-bold rounded-xl transition-all shadow-sm active:scale-95"
                >
                  Join
                </button>
              </div>
            </div>
          </div>
        )}

        {status === "hosting" && (
          <div className="w-full mb-6 p-4 bg-gradient-to-br from-pink-50 to-white rounded-2xl border-2 border-pink-200 flex flex-col items-center gap-3 shadow-sm">
            <span className="text-sm font-extrabold text-pink-500 animate-pulse tracking-wide">Waiting for opponent...</span>
            <div className="flex flex-col items-center gap-1 w-full relative">
              <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Your Invite Code</span>
              <div className="flex items-center gap-0 bg-white border border-gray-100 shadow-inner rounded-xl overflow-hidden w-full max-w-[250px]">
                <div className="px-3 py-2 w-full font-mono font-black text-gray-700 text-center truncate select-all overflow-x-auto whitespace-nowrap scrollbar-hide">
                  {peerId || "Generating..."}
                </div>
                <button onClick={copyToClipboard} className="p-3 bg-gray-50 border-l border-gray-100 hover:bg-pink-50 text-pink-500 transition-colors" title="Copy code">
                  {copied ? (
                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  )}
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
              You play: <span className={isHost ? 'text-pink-500 text-sm' : 'text-cyan-500 text-sm'}>{isHost ? "X" : "O"}</span>
            </span>
          </div>
        )}

        {/* Status indicator */}
        <div className="mb-6 flex items-center justify-center p-3 rounded-2xl bg-gray-50/80 border border-gray-100 shadow-sm w-full">
          {winner ? (
            <span className="text-2xl font-bold animate-bounce text-green-500">
              {winner} Wins! 🎉
            </span>
          ) : isDraw ? (
            <span className="text-2xl font-bold text-gray-500">
              It's a Draw! 🤝
            </span>
          ) : (
            <span className="text-xl font-semibold text-gray-700 flex items-center gap-2">
              {status === "connected" ? (
                ((isHost && xIsNext) || (!isHost && !xIsNext)) ? "Your turn:" : "Opponent's turn:"
              ) : (
                "Next player:"
              )}
              <span className={`text-2xl font-black ${xIsNext ? 'text-pink-500' : 'text-cyan-500'}`}>
                {xIsNext ? "X" : "O"}
              </span>
            </span>
          )}
        </div>

        {/* The Board */}
        <div className="grid grid-cols-3 grid-rows-3 gap-3 w-full max-w-[320px] aspect-square mb-8">
          {board.map((cell, index) => {
            const isWinningCell = winningLine.includes(index)
            return (
              <button
                key={index}
                onClick={() => handleClick(index)}
                disabled={winner || cell || (status === "connected" && ((isHost && !xIsNext) || (!isHost && xIsNext)))}
                className={`
                  relative overflow-hidden
                  rounded-2xl text-6xl font-black shadow-inner transition-all duration-300 transform
                  flex items-center justify-center border-2 border-gray-100
                  ${!cell && !winner && (status === "local" || ((isHost && xIsNext) || (!isHost && !xIsNext))) ? 'hover:bg-gray-100 hover:scale-105 active:scale-95 cursor-pointer bg-white shadow-sm' : ''}
                  ${!cell && status === "connected" && ((isHost && !xIsNext) || (!isHost && xIsNext)) ? 'cursor-not-allowed opacity-50 bg-gray-50' : ''}
                  ${cell ? 'bg-white shadow-md' : ''}
                  ${isWinningCell ? 'animate-pulse scale-105 bg-green-50 !border-green-400 shadow-green-200' : ''}
                `}
              >
                {cell && (
                  <span 
                    className={`
                      animate-[pop_0.2s_ease-out]
                      ${cell === 'X' ? 'text-pink-500' : 'text-cyan-500'}
                      ${isWinningCell ? 'scale-110 drop-shadow-md' : ''}
                    `}
                  >
                    {cell}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Controls */}
        <button
          onClick={resetGame}
          disabled={status === "connected" && !isHost}
          className={`w-full py-4 px-8 rounded-xl shadow-lg transition-transform transition-colors flex items-center justify-center gap-2 font-bold focus:outline-none ${status === "connected" && !isHost ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none border border-gray-200' : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white hover:scale-[1.02] active:scale-95 border-none'}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {status === "connected" && !isHost ? "Waiting for Host to Restart" : "Restart Game"}
        </button>
        
      </div>

      {/* Question Challenge Overlay */}
      <QuestionOverlay 
        isOpen={showQuestion} 
        onAnswer={() => setShowQuestion(false)} 
        topic="Technology"
      />
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pop {
          0% { transform: scale(0.5); opacity: 0; }
          70% { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  )
}
