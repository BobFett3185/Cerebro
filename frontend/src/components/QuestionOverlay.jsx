import { useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import axios from "axios";

export default function QuestionOverlay({ isOpen, onAnswer }) {
  const { user } = useAuth0();
  const [question, setQuestion] = useState(null);
  const [topic, setTopic] = useState("");
  const [selectedOption, setSelectedOption] = useState(null);
  const [isCorrect, setIsCorrect] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch question from Gemini every time the overlay opens
  useEffect(() => {
    if (!isOpen || !user?.email) return;

    const fetchQuestion = async () => {
      setIsLoading(true);
      setError("");
      setSelectedOption(null);
      setIsCorrect(null);
      setQuestion(null);

      try {
        const res = await axios.get(
          `http://localhost:8000/questions/generate?email=${encodeURIComponent(user.email)}`
        );
        setQuestion(res.data.question);
        setTopic(res.data.topic || "Knowledge");
      } catch (err) {
        console.error("Failed to fetch question:", err);
        setError("Couldn't load a question. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestion();
  }, [isOpen, user?.email]);

  if (!isOpen) return null;

  // Normalize options — can be strings or {id, text} objects
  const normalizedOptions = question?.options?.map((opt) =>
    typeof opt === "string" ? opt : opt.text
  ) ?? [];

  // Find index of correct answer in options
  const correctIndex = normalizedOptions.findIndex((opt) => {
    if (!question) return false;
    const ca = question.correct_answer ?? "";
    // Match exact text OR match id letter (a/b/c/d)
    if (opt.toLowerCase() === ca.toLowerCase()) return true;
    const optLetter = String.fromCharCode(97 + normalizedOptions.indexOf(opt));
    return optLetter === ca.toLowerCase();
  });

  const handleSelect = async (index) => {
    if (selectedOption !== null) return;
    setSelectedOption(index);
    const correct = index === correctIndex;
    setIsCorrect(correct);

    // Record in question history (fire and forget)
    if (user?.email && question) {
      try {
        await axios.post(
          `http://localhost:8000/questions/submit-answer?` +
          `email=${encodeURIComponent(user.email)}` +
          `&question=${encodeURIComponent(question.question_text ?? question.question ?? "")}` +
          `&selected_answer=${encodeURIComponent(normalizedOptions[index])}` +
          `&correct_answer=${encodeURIComponent(question.correct_answer)}` +
          `&was_correct=${correct}`
        );
      } catch (err) {
        console.error("Failed to submit answer:", err);
      }
    }

    setTimeout(() => {
      onAnswer(correct);
      setSelectedOption(null);
      setIsCorrect(null);
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#2C3E2C]/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white/90 backdrop-blur-2xl p-8 rounded-[2.5rem] shadow-2xl border border-white/50 max-w-md w-full transform animate-in zoom-in-95 duration-300">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-[#8B9D8B]/20 rounded-2xl flex items-center justify-center mb-6">
            <span className="text-3xl">🧠</span>
          </div>

          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-[#8B9D8B] mb-2">
            Cerebro Challenge{topic ? `: ${topic}` : ""}
          </h2>

          {isLoading ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="w-10 h-10 border-4 border-[#8B9D8B] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-400 font-semibold">Generating your question...</p>
            </div>
          ) : error ? (
            <div className="py-6">
              <p className="text-red-500 font-semibold mb-4">{error}</p>
              <button
                onClick={() => onAnswer(false)}
                className="px-6 py-3 rounded-2xl bg-gray-100 text-gray-600 font-bold hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          ) : question ? (
            <>
              <h3 className="text-xl font-bold text-[#2C3E2C] mb-8 leading-tight">
                {question.question_text ?? question.question ?? ""}
              </h3>

              <div className="grid grid-cols-1 gap-3 w-full">
                {normalizedOptions.map((option, index) => {
                  let buttonStyle = "bg-gray-50 border-gray-100 text-gray-700 hover:bg-[#8B9D8B]/10 hover:border-[#8B9D8B]/30";

                  if (selectedOption !== null) {
                    if (index === correctIndex) {
                      buttonStyle = "bg-green-100 border-green-500 text-green-700 shadow-[0_0_15px_rgba(34,197,94,0.3)] scale-105";
                    } else if (index === selectedOption) {
                      buttonStyle = "bg-red-100 border-red-500 text-red-700 opacity-80";
                    } else {
                      buttonStyle = "bg-gray-50 border-gray-100 text-gray-400 opacity-50";
                    }
                  }

                  return (
                    <button
                      key={index}
                      disabled={selectedOption !== null}
                      onClick={() => handleSelect(index)}
                      className={`px-6 py-4 rounded-2xl border-2 font-semibold text-left transition-all duration-300 ${buttonStyle}`}
                    >
                      <div className="flex items-center gap-4">
                        <span className="w-8 h-8 rounded-lg bg-white/50 flex items-center justify-center text-xs font-bold border border-black/5">
                          {String.fromCharCode(65 + index)}
                        </span>
                        {option}
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedOption !== null && (
                <div className={`mt-6 px-5 py-3 rounded-2xl font-bold text-sm ${isCorrect ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                  {isCorrect ? "✅ Correct! +10 SGA Coins" : `❌ The answer is: ${question.correct_answer}`}
                </div>
              )}

              {question.explanation && selectedOption !== null && (
                <p className="mt-3 text-xs text-gray-500 leading-relaxed">{question.explanation}</p>
              )}

              <div className="mt-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Correct answers earn +10 SGA Coins
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
