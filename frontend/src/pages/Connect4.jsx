import { useState } from "react"
import { useNavigate } from "react-router-dom"

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

  const checkWinner = (b) => {
    // Check horizontal, vertical, and diagonal lines for 4 in a row
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
            let nc = c + dc
            let nr = r + dr
            while (nc >= 0 && nc < COLS && nr >= 0 && nr < ROWS && b[nc][nr] === currentData) {
              count++
              cells.push({c: nc, r: nr})
              nc += dc
              nr += dr
            }
          }
          if (count >= 4) {
            return { winner: currentData, cells }
          }
        }
      }
    }
    return null
  }

  const dropDisc = (colIndex) => {
    if (winner) return

    const col = board[colIndex]
    const rowIndex = col.indexOf(null) // Find first empty slot from bottom (index 0)
    
    // Column full
    if (rowIndex === -1) return

    const newBoard = board.map(c => [...c])
    const currentPlayer = redIsNext ? "Red" : "Yellow"
    newBoard[colIndex][rowIndex] = currentPlayer

    setBoard(newBoard)
    
    const winResult = checkWinner(newBoard)
    if (winResult) {
      setWinner(winResult.winner)
      setWinningCells(winResult.cells)
    } else {
      setRedIsNext(!redIsNext)
    }
  }

  const resetGame = () => {
    setBoard(initialBoard)
    setRedIsNext(true)
    setWinner(null)
    setWinningCells([])
  }

  // To display properly, we need to map rows from top to bottom
  // So row 5 is top, row 0 is bottom.
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
      
      {/* Background abstract elements */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-[#8B9D8B]/20 to-transparent"></div>
      
      <div className="relative z-10 w-full max-w-2xl bg-white border border-gray-200 p-6 md:p-8 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] flex flex-col items-center">
        
        <div className="w-full flex justify-between items-center mb-6">
          <button 
            onClick={() => navigate('/home')}
            className="p-2 bg-gray-100 hover:bg-[#8B9D8B]/20 hover:text-[#2C3E2C] rounded-full text-gray-500 transition-colors"
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

        {/* Turn Indicator */}
        <div className="mb-8 w-full">
          <div className="flex items-center justify-center p-4 rounded-2xl bg-gray-50 border border-gray-200">
            {winner ? (
              <span className="text-2xl font-black flex items-center gap-2 animate-bounce">
                🎉 <span className={winner === 'Red' ? 'text-red-500' : 'text-yellow-500'}>{winner} Wins!</span> 🎉
              </span>
            ) : (
              <span className="text-xl font-bold flex items-center gap-3">
                Current turn: 
                <div className={`w-8 h-8 rounded-full shadow-inner border-2 border-black/10 transition-colors duration-300 ${redIsNext ? 'bg-red-500 shadow-red-500/50' : 'bg-yellow-400 shadow-yellow-500/50'}`}></div>
              </span>
            )}
          </div>
        </div>

        {/* The Board container */}
        <div className="p-3 bg-blue-600 rounded-2xl shadow-[inset_0_3px_6px_rgba(0,0,0,0.4),0_10px_20px_rgba(37,99,235,0.4)] border-b-8 border-blue-800 relative select-none touch-manipulation">
          
          {/* Top hover indicators (shows where disc will drop) */}
          <div className="grid grid-cols-7 gap-2 mb-2 px-1">
            {Array.from({length: COLS}).map((_, colIndex) => (
              <div 
                key={`indicator-${colIndex}`} 
                className="h-4 flex justify-center"
              >
                {!winner && hoveredCol === colIndex && board[colIndex].indexOf(null) !== -1 && (
                  <div className={`w-8 h-4 rounded-t-full transition-colors animate-[dropIn_0.2s_ease-out] ${redIsNext ? 'bg-red-500' : 'bg-yellow-400'}`}></div>
                )}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2 p-1 relative z-10">
            {displayRows.map((rowCells, i) => (
              rowCells.map((cell) => {
                const isWinningPiece = winningCells.some(w => w.c === cell.c && w.r === cell.r)
                
                return (
                  <div 
                    key={`${cell.c}-${cell.r}`}
                    onClick={() => dropDisc(cell.c)}
                    onMouseEnter={() => setHoveredCol(cell.c)}
                    onMouseLeave={() => setHoveredCol(null)}
                    className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 relative cursor-pointer"
                  >
                    {/* The physical hole background (drawn behind) */}
                    <div className="absolute inset-0 bg-[#FDFBF7] rounded-full z-0"></div>
                    
                    {/* The Disc */}
                    {cell.value && (
                      <div 
                        className={`
                          absolute inset-1 rounded-full z-10 
                          shadow-[inset_-3px_-3px_10px_rgba(0,0,0,0.3),inset_3px_3px_10px_rgba(255,255,255,0.4)]
                          animate-[dropPiece_0.4s_cubic-bezier(0.25,0.46,0.45,0.94)_both]
                          ${cell.value === 'Red' ? 'bg-gradient-to-br from-red-400 to-red-600' : 'bg-gradient-to-br from-yellow-300 to-yellow-500'}
                        `}
                      >
                        {/* Shimmer effect for winning pieces */}
                        {isWinningPiece && (
                          <div className="absolute inset-0 rounded-full border-4 border-white animate-pulse shadow-[0_0_15px_white]"></div>
                        )}
                      </div>
                    )}

                    {/* The hole shadow overlay (drawn in front to give 3D depth) */}
                    <div className="absolute inset-0 rounded-full shadow-[inset_0_4px_8px_rgba(0,0,0,0.6)] z-20 pointer-events-none"></div>
                  </div>
                )
              })
            ))}
          </div>
          
          {/* Board Legs */}
          <div className="absolute -bottom-6 left-2 w-4 h-6 bg-blue-800 rounded-b-md"></div>
          <div className="absolute -bottom-6 right-2 w-4 h-6 bg-blue-800 rounded-b-md"></div>
        </div>
      </div>

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
      `}} />
    </div>
  )
}
