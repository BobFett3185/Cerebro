# Cerebro
#This is my fork of the project so I can add more stuff

**Learn while you play.** Cerebro is an adaptive learning platform that challenges users with AI-generated quiz questions whenever they lose a game, turning defeats into learning moments.

Built for HackAI 2026.

---

## What It Does

Cerebro wraps competitive mini-games (Chess, Tic-Tac-Toe, Connect 4) with a smart learning layer. When you lose, Google Gemini generates a multiple-choice question tailored to your chosen topic and your past performance. Get it right, earn SGA Coins. Get it wrong, the next question gets easier on that concept. Win streaks push the difficulty up.

---

## Features

- 3 Multiplayer Games: Chess, Tic-Tac-Toe, Connect 4 (P2P via PeerJS)
- Adaptive Questions: Gemini generates questions that adapt difficulty based on your history
- Topic Selection: Choose from 20+ topics across Professional, Technical, Fun, and Academic categories
- Manage Topics: Add or remove topics from your profile at any time
- Coin Rewards: Earn coins for correct answers and earn a spot on the leaderboard
- Auth0 Authentication: Secure, passwordless sign-in
- MongoDB Atlas: Persistent user profiles, skill selections, and question history

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite, TailwindCSS |
| Backend | FastAPI (Python) |
| Database | MongoDB Atlas (Motor async driver) |
| AI | Google Gemini API (gemini-2.5-flash) |
| Auth | Auth0 |
| P2P Multiplayer | PeerJS |

---

## Project Structure

```
HackAI-2026/
├── frontend/               # React + Vite app
│   └── src/
│       ├── pages/          # SignIn, Home, SkillSelect, ManageSkills, Chess, TicTacToe, Connect4
│       ├── components/     # QuestionOverlay, SkillPickerModal
│       └── context/        # UserContext (global auth state)
│
└── backend/                # FastAPI server
    ├── routes/
    │   ├── auth.py         # POST /auth/users/login
    │   ├── skills.py       # GET /skills/profile, POST /skills/update-skills, /set-current-skill
    │   └── questions.py    # GET /questions/generate, POST /questions/submit-answer
    ├── services/
    │   └── gemini_service.py   # Adaptive question generation
    ├── models/schemas.py
    ├── config.py           # MongoDB + Gemini config (reads from .env)
    └── main.py             # App entry point + CORS
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+
- A MongoDB Atlas cluster
- A Google Gemini API key
- An Auth0 application (SPA)

---

### Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
.\venv\Scripts\activate        # Windows
# source venv/bin/activate     # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Create .env file
```

**`backend/.env`**
```env
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/skillgame?appName=Cluster0
MONGODB_DB_NAME=skillgame
GEMINI_API_KEY=your_gemini_api_key_here
```

```bash
# Start the server
python -m uvicorn main:app --reload
```

Backend runs at `http://localhost:8000`. Swagger docs at `http://localhost:8000/docs`.

---

### Frontend Setup

```bash
cd frontend
npm install
```

**`frontend/.env`**
```env
VITE_AUTH0_DOMAIN=your-tenant.auth0.com
VITE_AUTH0_CLIENT_ID=your_auth0_client_id
```

```bash
npm run dev
```

Frontend runs at `http://localhost:5173`.

---

## How the Adaptive Learning Works

1. User selects topics during onboarding (e.g. Sports Trivia, Blockchain Fundamentals)
2. Before starting a game, user picks which topic to study this session
3. When the user loses, a question overlay appears. Gemini generates a fresh MCQ based on:
   - The selected topic
   - The last 10 answered questions (correct/incorrect)
4. Correct answers lead to harder next questions and SGA Coins awarded
5. Wrong answers lead to easier next questions, same concept reinforced
6. All answers are logged to MongoDB for persistent adaptation across sessions

---

## Key API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/users/login` | Find or create user by email |
| GET | `/skills/profile?email=` | Get user profile and selected skills |
| POST | `/skills/update-skills` | Update selected topic list |
| POST | `/skills/set-current-skill` | Set active topic for next game |
| GET | `/questions/generate?email=` | Generate adaptive Gemini question |
| POST | `/questions/submit-answer` | Record answer in question history |

---

## MongoDB Atlas Note

Make sure your current IP address is whitelisted in Atlas under Network Access. The SSL handshake will fail if your IP is not on the allowlist.

---

## Team

Built at HackAI 2026.
