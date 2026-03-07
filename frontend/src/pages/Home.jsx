import { useAuth0 } from "@auth0/auth0-react"
import { useNavigate } from "react-router-dom"

export default function Home() {
  const { user, logout, isAuthenticated, isLoading } = useAuth0()
  const navigate = useNavigate()

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-screen bg-[#FDFBF7]">
      <div className="w-16 h-16 border-4 border-[#8B9D8B] border-t-transparent rounded-full animate-spin"></div>
    </div>
  )

  const games = [
    {
      id: "chess",
      title: "Chess",
      path: "/chess",
      icon: (
        <svg className="w-20 h-20 text-[#2C3E2C] group-hover:scale-110 transition-transform duration-300" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12.75 2.25c-.2-.48-1.3-.48-1.5 0-.58 1.4-1.92 2.25-3.5 2.25-1.93 0-3.5.78-3.5 1.75 0 1.25 1.25 1.88 2.5 2.25-.38.75-1 3.25-.25 5L8.5 16.5h7l2-3 .5-5.5c-1.25-1.5-3.75-1.75-5.25-2V3.75c1.88-.25 3.5-.75 3.5-1.5 0-1.8 1.8-.8 1.8-.8s.68-.45.45-.65c-1.3-1.1-2.95 1.45-5.75 1.45zM6 18c0 .83.67 1.5 1.5 1.5h9c.83 0 1.5-.67 1.5-1.5v-1H6v1zm2 2.5v1h8v-1H8z"/>
        </svg>
      ),
      bgColor: "bg-[#E6E1D3]",
      hoverBg: "hover:bg-[#D4CDBC]"
    },
    {
      id: "tictactoe",
      title: "Tic-Tac-Toe",
      path: "/tictactoe",
      icon: (
        <svg className="w-20 h-20 text-[#FDFBF7] group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 8h8v8H8z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m-4-12L4 4m16 0l-4 4m0 8l4 4M4 20l4-4" />
        </svg>
      ),
      bgColor: "bg-[#8B9D8B]",
      hoverBg: "hover:bg-[#788978]"
    },
    {
      id: "connect4",
      title: "Connect 4",
      path: "/connect4",
      icon: (
        <svg className="w-20 h-20 text-[#2C3E2C] group-hover:scale-110 transition-transform duration-300" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="6" cy="6" r="3" />
          <circle cx="12" cy="6" r="3" />
          <circle cx="18" cy="6" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="12" cy="12" r="3" />
          <circle cx="18" cy="12" r="3" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="12" cy="18" r="3" />
          <circle cx="18" cy="18" r="3" />
        </svg>
      ),
      bgColor: "bg-[#A3B1A3]",
      hoverBg: "hover:bg-[#8B9D8B]"
    }
  ]

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col font-sans">
      
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-[#E6E1D3] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center gap-3">
            {/* Minimal Cerebro Logo */}
            <div className="w-10 h-10 bg-gradient-to-br from-[#8B9D8B] to-[#6A7B6A] rounded-lg flex items-center justify-center shadow-md">
              <svg className="w-6 h-6 text-[#FDFBF7]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
              </svg>
            </div>
            <h1 className="text-2xl font-extrabold text-[#2C3E2C] tracking-tight">Cerebro</h1>
          </div>

          {isAuthenticated && (
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/leaderboard')}
                className="bg-[#E6E1D3] hover:bg-[#D4CDBC] text-[#4A5D4A] font-semibold py-2 px-4 rounded-lg shadow-sm transition-all duration-200 hidden sm:block"
              >
                Leaderboard
              </button>
              <div className="hidden sm:flex items-center gap-2 border-l border-[#8B9D8B]/30 pl-4">
                <span className="text-[#6A7B6A]">Playing as:</span>
                <span className="text-[#2C3E2C] font-semibold">{user?.name || user?.email}</span>
              </div>
              <button
                onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
                className="bg-white hover:bg-[#F3EFE6] border border-[#E6E1D3] text-[#4A5D4A] font-semibold py-2 px-4 rounded-lg shadow-sm transition-all duration-200"
              >
                Log Out
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
        
        <div className="text-center mb-12">
          <h2 className="text-4xl sm:text-5xl font-extrabold text-[#2C3E2C] mb-4">Choose Your Game</h2>
          <p className="text-xl text-[#6A7B6A] max-w-2xl mx-auto">
            Select a game to start playing. You'll review your selected topics as you progress!
          </p>
        </div>

        {/* Game Selection Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl">
          {games.map((game) => (
            <button
              key={game.id}
              onClick={() => navigate(game.path)}
              className={`group flex flex-col items-center justify-center aspect-square rounded-[2rem] shadow-md border-2 border-transparent hover:border-[#FDFBF7] ${game.bgColor} ${game.hoverBg} transition-all duration-300 hover:shadow-xl hover:-translate-y-2 relative overflow-hidden`}
            >
              {/* Soft interior glow */}
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              
              <div className="relative z-10 flex flex-col items-center gap-6">
                {game.icon}
                <span className={`text-2xl font-bold ${game.id === 'tictactoe' ? 'text-[#FDFBF7]' : 'text-[#2C3E2C]'}`}>
                  {game.title}
                </span>
              </div>
            </button>
          ))}
        </div>

      </main>
    </div>
  )
}
