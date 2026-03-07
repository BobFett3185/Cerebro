import { BrowserRouter, Routes, Route } from "react-router-dom"
import SignIn from "./pages/SignIn"
import SkillSelect from "./pages/SkillSelect"
import Analysis from "./pages/Analysis"
import Home from "./pages/Home"
import Chess from "./pages/Chess"
import TicTacToe from "./pages/TicTacToe"
import Connect4 from "./pages/Connect4"
import Leaderboard from "./pages/Leaderboard"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SignIn />} />
        <Route path="/skill-select" element={<SkillSelect />} />
        <Route path="/analysis" element={<Analysis />} />
        <Route path="/home" element={<Home />} />
        <Route path="/chess" element={<Chess />} />
        <Route path="/tictactoe" element={<TicTacToe />} />
        <Route path="/connect4" element={<Connect4 />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
      </Routes>
    </BrowserRouter>
  )
}

