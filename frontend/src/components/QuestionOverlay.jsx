import { useState } from "react";

export default function QuestionOverlay({ isOpen, onAnswer, topic = "General AI" }) {
  const [selectedOption, setSelectedOption] = useState(null);
  const [isCorrect, setIsCorrect] = useState(null);

  if (!isOpen) return null;

  const mockQuestion = {
    text: "Which of the following best describes 'Agentic AI'?",
    options: [
      "AI that only follows static scripts",
      "AI capable of autonomous goal-setting and execution",
      "AI that only generates images",
      "AI that requires manual input for every single step"
    ],
    correctIndex: 1
  };

  const handleSelect = (index) => {
    setSelectedOption(index);
    const correct = index === mockQuestion.correctIndex;
    setIsCorrect(correct);
    
    // Small delay to show feedback before closing
    setTimeout(() => {
      onAnswer(correct);
      setSelectedOption(null);
      setIsCorrect(null);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#2C3E2C]/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white/90 backdrop-blur-2xl p-8 rounded-[2.5rem] shadow-2xl border border-white/50 max-w-md w-full transform animate-in zoom-in-95 duration-300">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-[#8B9D8B]/20 rounded-2xl flex items-center justify-center mb-6">
            <span className="text-3xl">🧠</span>
          </div>
          
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-[#8B9D8B] mb-2">
            Cerebro Challenge: {topic}
          </h2>
          
          <h3 className="text-xl font-bold text-[#2C3E2C] mb-8 leading-tight">
            {mockQuestion.text}
          </h3>

          <div className="grid grid-cols-1 gap-3 w-full">
            {mockQuestion.options.map((option, index) => {
              let buttonStyle = "bg-gray-50 border-gray-100 text-gray-700 hover:bg-[#8B9D8B]/10 hover:border-[#8B9D8B]/30";
              
              if (selectedOption !== null) {
                if (index === mockQuestion.correctIndex) {
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

          <div className="mt-8 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            Correct answers earn +10 SGA Coins
          </div>
        </div>
      </div>
    </div>
  );
}
