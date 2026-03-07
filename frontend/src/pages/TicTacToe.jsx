import { useState } from "react"
import { useNavigate } from "react-router-dom"

export default function TicTacToe() {
  const navigate = useNavigate()
  const [board, setBoard] = useState(Array(9).fill(null))
  const [xIsNext, setXIsNext] = useState(true)

  // Determine winner
  const calculateWinner = (squares) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
      [0, 4, 8], [2, 4, 6]             // diagonals
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

  const handleClick = (i) => {
    if (board[i] || winner) return
    const newBoard = [...board]
    newBoard[i] = xIsNext ? "X" : "O"
    setBoard(newBoard)
    setXIsNext(!xIsNext)
  }

  const resetGame = () => {
    setBoard(Array(9).fill(null))
    setXIsNext(true)
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">
      
      {/* Vibrant Background Blobs */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-pink-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
      <div className="absolute top-0 right-20 w-72 h-72 bg-yellow-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-40 w-72 h-72 bg-cyan-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>

      <div className="relative z-10 w-full max-w-md bg-white/80 backdrop-blur-xl p-8 rounded-[2rem] shadow-2xl border border-white/50 flex flex-col items-center">
        
        <div className="w-full flex justify-between items-center mb-8">
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
              Next player: 
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
                disabled={winner || cell}
                className={`
                  relative overflow-hidden
                  rounded-2xl text-6xl font-black shadow-inner transition-all duration-300 transform
                  flex items-center justify-center border-2 border-gray-100
                  ${!cell && !winner ? 'hover:bg-gray-100 hover:scale-105 active:scale-95 cursor-pointer bg-white shadow-sm' : ''}
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
          className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold py-4 px-8 rounded-xl shadow-lg transition-transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Restart Game
        </button>
        
      </div>
      
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
      `}} />
    </div>
  )
}
