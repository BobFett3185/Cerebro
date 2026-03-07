import { useState } from "react"
import { useAuth0 } from "@auth0/auth0-react"
import { useNavigate } from "react-router-dom"

export default function SkillSelect() {
  const { user, logout, isAuthenticated, isLoading } = useAuth0()
  const navigate = useNavigate()

  // State to track selected skills
  const [selectedSkills, setSelectedSkills] = useState([])

  if (isLoading) return <div>Loading...</div>

  // Define our skill categories based on the requirements
  const categories = [
    {
      title: "Professional Topics",
      skills: [
        "Public Speaking",
        "Leadership",
        "Negotiation",
        "Time Management",
        "Personal Finance",
        "Resume Writing"
      ],
      color: "border-blue-500",
      bgColor: "bg-blue-50"
    },
    {
      title: "Technical Topics",
      skills: [
        "Cybersecurity Basics",
        "Data Literacy",
        "Prompt Engineering",
        "Blockchain Fundamentals",
        "Excel & Spreadsheets"
      ],
      color: "border-green-500",
      bgColor: "bg-green-50"
    },
    {
      title: "Fun Topics",
      skills: [
        "Sports Trivia",
        "Music Theory",
        "Geography",
        "Science Facts",
        "Movie & TV Trivia",
        "Food & Cooking"
      ],
      color: "border-purple-500",
      bgColor: "bg-purple-50"
    }
  ]

  // Toggle a skill in our array
  const handleToggle = (skill) => {
    setSelectedSkills((prev) =>
      prev.includes(skill)
        ? prev.filter((s) => s !== skill)
        : [...prev, skill]
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Topic Selection</h1>
          {isAuthenticated && (
            <div className="flex items-center gap-4">
              <span className="text-gray-700">Welcome, {user?.name}</span>
              <button
                onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors"
              >
                Log Out
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-extrabold text-gray-900 mb-4">What do you want to play/learn?</h2>
          <p className="text-gray-600 text-lg">Select the topics you'd like to learn about while you play. You can always change these later!</p>
        </div>

        {/* CSS Grid for the 3 columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {categories.map((category) => (
            <div
              key={category.title}
              className={`bg-white rounded-xl shadow border-t-8 ${category.color} p-6 hover:shadow-lg transition-shadow duration-300`}
            >
              <h3 className="text-2xl font-bold text-gray-800 mb-6 pb-2 border-b border-gray-100">
                {category.title}
              </h3>
              
              <div className="space-y-3">
                {category.skills.map((skill) => (
                  <label
                    key={skill}
                    className={`flex items-start p-3 rounded-lg cursor-pointer transition-colors border ${
                      selectedSkills.includes(skill)
                        ? `border-gray-300 ${category.bgColor}`
                        : "border-transparent hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center h-6">
                      <input
                        type="checkbox"
                        className="w-5 h-5 border-gray-300 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                        checked={selectedSkills.includes(skill)}
                        onChange={() => handleToggle(skill)}
                      />
                    </div>
                    <div className="ml-3 flex flex-col">
                      <span className="text-gray-700 font-medium select-none">{skill}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center mt-8">
          <button
            onClick={() => navigate("/home")}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-12 rounded-lg text-xl shadow-md hover:shadow-lg transition-transform transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            disabled={selectedSkills.length === 0}
          >
            {selectedSkills.length > 0
              ? `Continue with ${selectedSkills.length} selected ${selectedSkills.length === 1 ? 'topic' : 'topics'}`
              : "Select a topic to continue"}
          </button>
        </div>
      </main>
    </div>
  )
}
