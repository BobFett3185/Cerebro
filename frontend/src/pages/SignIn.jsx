import { useAuth0 } from "@auth0/auth0-react"
import { useEffect } from "react"
import { useNavigate } from "react-router-dom"

export default function SignIn() {
  const { loginWithRedirect, isAuthenticated, isLoading } = useAuth0()
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated) navigate("/skill-select")
  }, [isAuthenticated, navigate])

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-screen bg-[#FDFBF7]">
      <div className="w-16 h-16 border-4 border-[#8B9D8B] border-t-transparent rounded-full animate-spin"></div>
    </div>
  )

  return (
    <div className="relative min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center overflow-hidden font-sans">
      
      {/* Soft, Calming Background Gradients */}
      <div className="absolute inset-0 bg-gradient-to-tr from-[#E6E1D3]/50 via-[#FDFBF7] to-[#8B9D8B]/10 z-0"></div>
      
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-[#8B9D8B]/20 rounded-full blur-[100px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#E6E1D3]/40 rounded-full blur-[120px] pointer-events-none z-0"></div>

      {/* Floating Game / Cerebro SVGs in the Background - Softened colors */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-[0.4]">
        
        {/* Chess Knight */}
        <svg className="absolute top-[10%] left-[10%] w-32 h-32 text-[#A3B1A3] transform -rotate-12 drop-shadow-sm" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12.75 2.25c-.2-.48-1.3-.48-1.5 0-.58 1.4-1.92 2.25-3.5 2.25-1.93 0-3.5.78-3.5 1.75 0 1.25 1.25 1.88 2.5 2.25-.38.75-1 3.25-.25 5L8.5 16.5h7l2-3 .5-5.5c-1.25-1.5-3.75-1.75-5.25-2V3.75c1.88-.25 3.5-.75 3.5-1.5 0-1.8 1.8-.8 1.8-.8s.68-.45.45-.65c-1.3-1.1-2.95 1.45-5.75 1.45zM6 18c0 .83.67 1.5 1.5 1.5h9c.83 0 1.5-.67 1.5-1.5v-1H6v1zm2 2.5v1h8v-1H8z"/>
        </svg>

        {/* Game Controller */}
        <svg className="absolute bottom-[10%] right-[10%] w-40 h-40 text-[#D4CDBC] transform rotate-12 drop-shadow-sm" fill="currentColor" viewBox="0 0 24 24">
          <path d="M21.58 8.19c-.38-2.58-2.61-4.19-5.18-4.19H7.6c-2.57 0-4.8 1.61-5.18 4.19L1 18.06c-.15 1.05.68 1.94 1.74 1.94h3.6l2.1-3h7.11l2.1 3h3.6c1.06 0 1.89-.89 1.74-1.94l-1.41-9.87zM8 12.5H6v2H4.5v-2h-2V11h2V9H6v2h2v1.5zm8-1.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm3 3c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
        </svg>

        {/* Target / Bullseye */}
        <svg className="absolute top-[20%] right-[15%] w-28 h-28 text-[#C2BCA8] transform rotate-45 drop-shadow-sm" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm0-7c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zm0 4c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>
        </svg>

        {/* Brain / Network Node */}
        <svg className="absolute bottom-[20%] left-[10%] w-32 h-32 text-[#8B9D8B] transform -rotate-12 drop-shadow-sm" fill="currentColor" viewBox="0 0 24 24">
          <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
        </svg>
      </div>

      {/* Login Card (Warm Glassmorphism style) */}
      <div className="relative z-10 w-full max-w-md mx-6 p-10 bg-white/60 backdrop-blur-2xl border border-white/80 rounded-[2rem] shadow-[0_8px_32px_0_rgba(139,157,139,0.15)] flex flex-col items-center">
        
        {/* Soft Sage Logo Icon */}
        <div className="mb-6 mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-[#8B9D8B] to-[#6A7B6A] rounded-2xl flex items-center justify-center shadow-lg shadow-[#8B9D8B]/20 transform rotate-3 hover:rotate-12 transition-transform duration-300">
            <svg className="w-12 h-12 text-[#FDFBF7]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
            </svg>
          </div>
        </div>

        {/* Title & Description */}
        <h1 className="text-5xl font-extrabold text-[#2C3E2C] tracking-tight mb-3 text-center">
          Cerebro
        </h1>
        <p className="text-[#6A7B6A] font-medium text-center mb-10 text-lg leading-relaxed max-w-xs">
          Level up your mind. Master new skills while you play.
        </p>

        {/* Auth Buttons */}
        <div className="w-full space-y-4">
          <button
            onClick={() => loginWithRedirect({ authorizationParams: { prompt: "login" } })}
            className="w-full group overflow-hidden bg-white hover:bg-[#F3EFE6] text-[#4A5D4A] font-semibold py-4 px-6 rounded-xl border-2 border-[#E6E1D3] transition-all duration-300 flex justify-center items-center shadow-sm hover:shadow"
          >
            <span>Sign In</span>
          </button>
          
          <button
            onClick={() => loginWithRedirect({ authorizationParams: { screen_hint: "signup" } })}
            className="w-full group overflow-hidden bg-[#8B9D8B] hover:bg-[#788978] text-[#FDFBF7] font-semibold py-4 px-6 rounded-xl transition-all duration-300 flex justify-center items-center shadow-md hover:shadow-lg hover:shadow-[#8B9D8B]/30"
          >
            <span className="flex items-center gap-2">
              Create Account
              <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </span>
          </button>
        </div>
        
      </div>

    </div>
  )
}