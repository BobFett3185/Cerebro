import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Chess as ChessGame } from "chess.js"
import { Chessboard } from "react-chessboard"

export default function Chess() {
  const navigate = useNavigate()
  const [game, setGame] = useState(new ChessGame())
  const [gameOver, setGameOver] = useState(null)

  // Custom board theme styling
  const customDarkSquareStyle = { backgroundColor: '#8B9D8B' } // Sage green
  const customLightSquareStyle = { backgroundColor: '#FDFBF7' } // Beige

  // Evaluate game state
  useEffect(() => {
    if (game.isGameOver()) {
      if (game.isCheckmate()) {
        setGameOver(`Checkmate! ${game.turn() === 'w' ? 'Black' : 'White'} wins! 🎉`)
      } else if (game.isDraw()) {
        setGameOver("It's a draw! 🤝")
      } else if (game.isStalemate()) {
        setGameOver("Stalemate! 🤝")
      } else {
        setGameOver("Game Over")
      }
    } else {
      setGameOver(null)
    }
  }, [game.fen()])

  // Computer makes a move when it's Black's turn
  useEffect(() => {
    if (game.turn() === 'b' && !game.isGameOver()) {
      const timer = setTimeout(() => {
        const possibleMoves = game.moves()
        if (possibleMoves.length > 0) {
          const randomIdx = Math.floor(Math.random() * possibleMoves.length)
          const gameCopy = new ChessGame(game.fen())
          gameCopy.move(possibleMoves[randomIdx])
          setGame(gameCopy)
        }
      }, 400)
      return () => clearTimeout(timer)
    }
  }, [game])

  const onDrop = (sourceSquare, targetSquare) => {
    try {
      // Create a fresh instance using PGN for complete history retention
      const gameCopy = new ChessGame()
      gameCopy.loadPgn(game.pgn())
      
      const move = gameCopy.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: "q", // always promote to queen for simplicity
      })

      // Illegal move
      if (move === null) return false
      
      // Update state if legal
      setGame(gameCopy)
      return true
    } catch {
      return false
    }
  }

  const resetGame = () => {
    setGame(new ChessGame())
    setGameOver(null)
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">

      {/* Background ambient light */}
      <div className="absolute top-[20%] left-[10%] w-[30vw] h-[30vw] min-w-[300px] rounded-full bg-[#E6E1D3] blur-[100px] mix-blend-multiply opacity-50 z-0 pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-[10%] right-[10%] w-[40vw] h-[40vw] min-w-[400px] rounded-full bg-[#8B9D8B] blur-[120px] mix-blend-multiply opacity-20 z-0 pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-2xl bg-white/90 backdrop-blur-xl p-6 md:p-8 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-[#E6E1D3] flex flex-col items-center">

        {/* Header */}
        <div className="w-full flex justify-between items-center mb-6">
          <button
            onClick={() => navigate('/home')}
            className="p-3 bg-[#FDFBF7] hover:bg-[#E6E1D3] rounded-full text-[#4A5D4A] shadow-sm transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>

          <h1 className="text-3xl md:text-4xl font-extrabold text-[#2C3E2C] tracking-tight">
            Chess
          </h1>

          <button
            onClick={resetGame}
            className="p-3 bg-[#FDFBF7] hover:bg-[#E6E1D3] rounded-full text-[#4A5D4A] shadow-sm transition-colors"
            title="Restart"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </button>
        </div>

        {/* Status indicator */}
        <div className="mb-6 w-full">
          <div className={`flex items-center justify-center p-4 rounded-2xl border transition-all duration-300 ${gameOver ? 'bg-[#8B9D8B] border-[#788978] shadow-lg shadow-[#8B9D8B]/30' : 'bg-[#FDFBF7] border-[#E6E1D3]'}`}>
            {gameOver ? (
              <span className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                {gameOver}
              </span>
            ) : (
              <span className="text-lg font-semibold text-[#4A5D4A] flex items-center gap-3">
                Current turn:
                <div className={`px-4 py-1.5 rounded-full font-bold shadow-sm transition-colors duration-300 ${game.turn() === 'w' ? 'bg-white text-[#2C3E2C] border border-gray-200' : 'bg-[#2C3E2C] text-white border border-[#2C3E2C]'}`}>
                  {game.turn() === 'w' ? "White (You)" : "Black (Computer)"}
                </div>
              </span>
            )}
          </div>
        </div>

        {/* The Board container - removed overflow-hidden to prevent 3D clipping */}
        <div className="w-full aspect-square max-w-[500px] mb-4 shadow-[0_10px_30px_rgba(139,157,139,0.2)] rounded-lg border-4 border-[#2C3E2C]/10 bg-white relative">
          <Chessboard
            position={game.fen()}
            onPieceDrop={onDrop}
            animationDuration={300}
            customDarkSquareStyle={customDarkSquareStyle}
            customLightSquareStyle={customLightSquareStyle}
          />
        </div>

        <p className="text-[#6A7B6A] font-medium mt-2 text-center w-full">
          Drag and drop pieces to play. You play as White!
        </p>

      </div>
    </div>
  )
}
