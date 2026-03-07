import { useAuth0 } from "@auth0/auth0-react"
import { useNavigate } from "react-router-dom"

export default function Leaderboard() {
  const { user, isAuthenticated, isLoading } = useAuth0()
  const navigate = useNavigate()

  // Mock Leaderboard Data
  const leaderboardData = [
    { id: 1, name: "Keane Ferdinand", score: 12450, rank: 1 },
    { id: 2, name: "Alex Chen", score: 11200, rank: 2 },
    { id: 3, name: "Sarah Jenkins", score: 10850, rank: 3 },
    { id: 4, name: "Marcus Johnson", score: 9500, rank: 4 },
    { id: 5, name: "Priya Patel", score: 8900, rank: 5 },
    { id: 6, name: "David Kim", score: 8250, rank: 6 },
    { id: 7, name: "Emily Davis", score: 7600, rank: 7 },
    { id: 8, name: "James Williams", score: 6400, rank: 8 },
  ]

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-screen bg-[#FDFBF7]">
      <div className="w-16 h-16 border-4 border-[#8B9D8B] border-t-transparent rounded-full animate-spin"></div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col font-sans">
      
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-[#E6E1D3] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          
          {/* Back Button & Logo */}
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/home')}
              className="p-2 -ml-2 rounded-full hover:bg-[#E6E1D3] text-[#4A5D4A] transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/home')}>
              <div className="w-8 h-8 bg-gradient-to-br from-[#8B9D8B] to-[#6A7B6A] rounded-lg flex items-center justify-center shadow-md">
                <svg className="w-5 h-5 text-[#FDFBF7]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                </svg>
              </div>
              <span className="text-xl font-bold text-[#2C3E2C] tracking-tight">Cerebro</span>
            </div>
          </div>

          {isAuthenticated && (
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-[#6A7B6A]">Playing as:</span>
              <span className="text-[#2C3E2C] font-semibold">{user?.name || user?.email}</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-4xl font-extrabold text-[#2C3E2C] mb-2">Global Leaderboard</h2>
            <p className="text-lg text-[#6A7B6A]">See how you stack up against other players.</p>
          </div>
          <div className="hidden md:flex items-center gap-2 bg-[#E6E1D3] px-4 py-2 rounded-lg shadow-inner">
            <span className="text-[#4A5D4A] font-semibold">Total Players:</span>
            <span className="text-[#2C3E2C] font-bold">1,204</span>
          </div>
        </div>

        {/* Leaderboard Table Card */}
        <div className="bg-white rounded-[2rem] shadow-lg border border-[#E6E1D3] overflow-hidden">
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8F6F0] border-b-2 border-[#E6E1D3]">
                  <th className="py-5 px-6 font-semibold text-[#4A5D4A] uppercase tracking-wider text-sm w-24 text-center">Rank</th>
                  <th className="py-5 px-6 font-semibold text-[#4A5D4A] uppercase tracking-wider text-sm">Player</th>
                  <th className="py-5 px-6 font-semibold text-[#4A5D4A] uppercase tracking-wider text-sm text-right">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E1D3]/50">
                {leaderboardData.map((player) => {
                  
                  // Styling Top 3 distinctly
                  const isTop3 = player.rank <= 3;
                  const rankStyles = {
                    1: "bg-yellow-100 text-yellow-700 border-yellow-200",
                    2: "bg-gray-100 text-gray-600 border-gray-200",
                    3: "bg-orange-100 text-orange-700 border-orange-200",
                  }
                  
                  return (
                    <tr 
                      key={player.id} 
                      className={`hover:bg-[#FDFBF7] transition-colors duration-150 group 
                        ${player.name === user?.name ? 'bg-[#8B9D8B]/10 hover:bg-[#8B9D8B]/20' : ''}`}
                    >
                      <td className="py-4 px-6 text-center">
                        <div className={`mx-auto w-10 h-10 flex items-center justify-center rounded-xl font-bold border shadow-sm
                          ${rankStyles[player.rank] || "bg-white text-[#6A7B6A] border-[#E6E1D3]"}`}>
                          {player.rank === 1 ? '🥇' : player.rank === 2 ? '🥈' : player.rank === 3 ? '🥉' : player.rank}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg
                            ${player.name === user?.name ? 'bg-[#8B9D8B] text-white' : 'bg-[#E6E1D3] text-[#4A5D4A]'}`}>
                            {player.name.charAt(0)}
                          </div>
                          <div>
                            <span className={`font-semibold block ${player.name === user?.name ? 'text-[#2C3E2C]' : 'text-[#4A5D4A]'}`}>
                              {player.name}
                              {player.name === user?.name && <span className="ml-2 text-xs bg-[#8B9D8B]/20 text-[#2C3E2C] px-2 py-0.5 rounded-full font-bold">YOU</span>}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <span className="text-xl font-bold tracking-tight text-[#2C3E2C]">
                          {player.score.toLocaleString()}
                        </span>
                        <span className="text-[#6A7B6A] text-sm ml-1">pts</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          
          {/* Pagination / Load More Footer */}
          <div className="bg-[#F8F6F0] py-4 px-6 border-t border-[#E6E1D3] flex justify-center">
            <button className="text-[#8B9D8B] hover:text-[#4A5D4A] font-semibold transition-colors flex items-center gap-2">
              Load More Players
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

        </div>

      </main>
    </div>
  )
}
