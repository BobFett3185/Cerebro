import { useState, useEffect } from "react"
import { useAuth0 } from "@auth0/auth0-react"
import { useNavigate } from "react-router-dom"
import axios from "axios"

const ALL_CATEGORIES = [
  {
    title: "Professional Topics",
    emoji: "💼",
    color: "from-blue-500 to-blue-600",
    lightBg: "bg-blue-50",
    border: "border-blue-200",
    badgeBg: "bg-blue-500",
    skills: [
      "Public Speaking", "Leadership", "Negotiation",
      "Time Management", "Personal Finance", "Resume Writing"
    ]
  },
  {
    title: "Technical Topics",
    emoji: "⚙️",
    color: "from-emerald-500 to-emerald-600",
    lightBg: "bg-emerald-50",
    border: "border-emerald-200",
    badgeBg: "bg-emerald-500",
    skills: [
      "Cybersecurity Basics", "Data Literacy", "Prompt Engineering",
      "Blockchain Fundamentals", "Excel & Spreadsheets"
    ]
  },
  {
    title: "Fun Topics",
    emoji: "🎉",
    color: "from-purple-500 to-purple-600",
    lightBg: "bg-purple-50",
    border: "border-purple-200",
    badgeBg: "bg-purple-500",
    skills: [
      "Sports Trivia", "Music Theory", "Geography",
      "Science Facts", "Movie & TV Trivia", "Food & Cooking"
    ]
  },
  {
    title: "Academic Topics",
    emoji: "📚",
    color: "from-amber-500 to-amber-600",
    lightBg: "bg-amber-50",
    border: "border-amber-200",
    badgeBg: "bg-amber-500",
    skills: [
      "World History", "Philosophy", "Psychology Basics",
      "Economics", "Creative Writing", "Critical Thinking"
    ]
  }
]

export default function ManageSkills() {
  const { user, isLoading } = useAuth0()
  const navigate = useNavigate()

  const [selectedSkills, setSelectedSkills] = useState([])
  const [originalSkills, setOriginalSkills] = useState([])
  const [isFetching, setIsFetching] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState("") // "success" | "error" | ""
  const [errorMsg, setErrorMsg] = useState("")

  // Load existing skills from DB
  useEffect(() => {
    if (!user?.email) return
    const fetchProfile = async () => {
      try {
        const res = await axios.get(
          `http://localhost:8000/skills/profile?email=${encodeURIComponent(user.email)}`
        )
        const current = res.data.user?.selected_skills || []
        setSelectedSkills(current)
        setOriginalSkills(current)
      } catch (err) {
        console.error("Failed to load profile:", err)
        setErrorMsg("Couldn't load your current skills.")
      } finally {
        setIsFetching(false)
      }
    }
    fetchProfile()
  }, [user?.email])

  const toggleSkill = (skill) => {
    setSelectedSkills(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    )
    setSaveStatus("")
  }

  const hasChanges = JSON.stringify([...selectedSkills].sort()) !== JSON.stringify([...originalSkills].sort())

  const handleSave = async () => {
    if (selectedSkills.length === 0) {
      setErrorMsg("Please select at least one topic.")
      return
    }
    setErrorMsg("")
    setIsSaving(true)
    try {
      await axios.post("http://localhost:8000/skills/update-skills", {
        email: user.email,
        selected_skills: selectedSkills
      })
      setOriginalSkills([...selectedSkills])
      setSaveStatus("success")
    } catch (err) {
      console.error("Failed to save skills:", err)
      setSaveStatus("error")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading || isFetching) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#8B9D8B] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] font-sans">

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-[#E6E1D3] sticky top-0 z-50">
        <div className="max-w-4xl mx-auto py-4 px-4 sm:px-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/home")}
              className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-extrabold text-[#2C3E2C] tracking-tight">Manage Topics</h1>
              <p className="text-xs text-[#8B9D8B] font-medium">Customize what you learn</p>
            </div>
          </div>

          {/* Save Button in header */}
          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving || selectedSkills.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-200
              bg-[#8B9D8B] hover:bg-[#6A7B6A] text-white shadow-md
              disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
            )}
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto py-10 px-4 sm:px-6">

        {/* Status banners */}
        {saveStatus === "success" && (
          <div className="mb-6 flex items-center gap-3 px-5 py-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 font-semibold animate-in slide-in-from-top duration-300">
            <span className="text-xl">✅</span>
            Topics saved! Your questions will now adapt to your new selection.
          </div>
        )}
        {saveStatus === "error" && (
          <div className="mb-6 flex items-center gap-3 px-5 py-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 font-semibold">
            <span className="text-xl">❌</span>
            Couldn't save changes. Please try again.
          </div>
        )}
        {errorMsg && (
          <div className="mb-6 px-5 py-3 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm font-semibold">
            {errorMsg}
          </div>
        )}

        {/* Selected count badge */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-[#6A7B6A] text-sm">
              Toggle topics on or off. Changes are saved when you hit <strong>Save Changes</strong>.
            </p>
          </div>
          <div className={`px-4 py-2 rounded-full text-sm font-black border-2 ${
            selectedSkills.length === 0
              ? "border-red-300 text-red-500 bg-red-50"
              : "border-[#8B9D8B] text-[#4A5D4A] bg-[#8B9D8B]/10"
          }`}>
            {selectedSkills.length} topic{selectedSkills.length !== 1 ? "s" : ""} selected
          </div>
        </div>

        {/* Category grids */}
        <div className="space-y-10">
          {ALL_CATEGORIES.map((cat) => (
            <div key={cat.title}>
              {/* Category header */}
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-lg font-extrabold text-[#2C3E2C]">{cat.title}</h2>
              </div>

              {/* Skill chips */}
              <div className="flex flex-wrap gap-3">
                {cat.skills.map((skill) => {
                  const isSelected = selectedSkills.includes(skill)
                  return (
                    <button
                      key={skill}
                      onClick={() => toggleSkill(skill)}
                      className={`relative flex items-center gap-2 px-5 py-3 rounded-2xl border-2 font-semibold text-sm transition-all duration-200 select-none
                        ${isSelected
                          ? `${cat.lightBg} ${cat.border} text-[#2C3E2C] shadow-md scale-[1.03]`
                          : "bg-white border-[#E6E1D3] text-[#6A7B6A] hover:border-[#8B9D8B]/50 hover:bg-[#F8F6F0]"
                        }`}
                    >
                      {isSelected && (
                        <span className={`w-5 h-5 rounded-full ${cat.badgeBg} flex items-center justify-center flex-shrink-0`}>
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </span>
                      )}
                      {skill}
                      {!isSelected && (
                        <span className="text-[#8B9D8B] font-black text-base leading-none">+</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Floating save nudge when there are unsaved changes */}
        {hasChanges && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center gap-4 px-6 py-4 bg-[#2C3E2C] text-white rounded-2xl shadow-2xl">
              <span className="text-sm font-semibold">You have unsaved changes</span>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-[#8B9D8B] hover:bg-[#6A7B6A] rounded-xl text-sm font-bold transition-colors"
              >
                {isSaving ? "Saving..." : "Save Now"}
              </button>
              <button
                onClick={() => { setSelectedSkills(originalSkills); setSaveStatus(""); setErrorMsg(""); }}
                className="text-sm text-white/60 hover:text-white font-semibold transition-colors"
              >
                Discard
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}
