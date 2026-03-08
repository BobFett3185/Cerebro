import { useState, useEffect } from "react"
import { useAuth0 } from "@auth0/auth0-react"
import { useNavigate } from "react-router-dom"
import axios from "axios"

export default function SkillPickerModal({ gameRoute, onClose }) {
  const { user } = useAuth0()
  const navigate = useNavigate()

  const [skills, setSkills] = useState([])
  const [selectedSkill, setSelectedSkill] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isConfirming, setIsConfirming] = useState(false)
  const [error, setError] = useState("")

  // Fetch user's preselected skills from DB
  useEffect(() => {
    if (!user?.email) return
    const fetchProfile = async () => {
      try {
        const res = await axios.get(
          `http://localhost:8000/skills/profile?email=${encodeURIComponent(user.email)}`
        )
        setSkills(res.data.user?.selected_skills || [])
      } catch (err) {
        console.error("Failed to load skills:", err)
        setError("Couldn't load your topics. Please try again.")
      } finally {
        setIsLoading(false)
      }
    }
    fetchProfile()
  }, [user?.email])

  const handleConfirm = async () => {
    if (!selectedSkill) return
    setIsConfirming(true)
    try {
      await axios.post("http://localhost:8000/skills/set-current-skill", {
        email: user.email,
        current_skill: selectedSkill,
      })
      onClose()
      navigate(gameRoute)
    } catch (err) {
      console.error("Failed to set current skill:", err)
      setError("Couldn't save your topic selection. Please try again.")
      setIsConfirming(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(44, 62, 44, 0.45)", backdropFilter: "blur(6px)" }}
    >
      <div className="relative w-full max-w-md bg-white/90 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-white/60 p-8 flex flex-col gap-6">
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div>
          <h2 className="text-2xl font-extrabold text-[#2C3E2C] tracking-tight">Choose Your Topic</h2>
          <p className="text-[#6A7B6A] mt-1 text-sm">
            Pick what you want to learn while you play.
          </p>
        </div>

        {/* Skill Cards */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-10 h-10 border-4 border-[#8B9D8B] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <p className="text-red-500 text-sm font-semibold text-center">{error}</p>
        ) : skills.length === 0 ? (
          <p className="text-gray-400 text-sm text-center">No topics selected yet. Go to settings to pick some!</p>
        ) : (
          <div className="flex flex-col gap-3 max-h-64 overflow-y-auto pr-1">
            {skills.map((skill) => {
              const isSelected = selectedSkill === skill
              return (
                <button
                  key={skill}
                  onClick={() => setSelectedSkill(skill)}
                  className={`w-full text-left px-5 py-4 rounded-2xl border-2 font-semibold transition-all duration-200 ${
                    isSelected
                      ? "border-[#8B9D8B] bg-[#8B9D8B]/10 text-[#2C3E2C] shadow-md scale-[1.02]"
                      : "border-[#E6E1D3] bg-white text-[#4A5D4A] hover:border-[#8B9D8B]/50 hover:bg-[#F8F6F0]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{skill}</span>
                    {isSelected && (
                      <svg className="w-5 h-5 text-[#8B9D8B]" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* Confirm Button */}
        <button
          onClick={handleConfirm}
          disabled={!selectedSkill || isConfirming}
          className="w-full py-4 rounded-2xl font-bold text-lg transition-all duration-200 shadow-md
            bg-[#8B9D8B] hover:bg-[#6A7B6A] text-white
            disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
        >
          {isConfirming ? "Starting..." : selectedSkill ? `Play with: ${selectedSkill}` : "Select a topic first"}
        </button>
      </div>
    </div>
  )
}
