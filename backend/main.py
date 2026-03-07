from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import close_mongo_connection, get_database
from models.schemas import HealthResponse
from routes.auth import router as auth_router
from routes.skills import router as skills_router
from routes.questions import router as questions_router
from routes.games import router as games_router
from routes.leaderboard import router as leaderboard_router
from routes.analysis import router as analysis_router


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    db = get_database()
    await db.command("ping")
    yield
    await close_mongo_connection()


app = FastAPI(
    title="HackAI Backend",
    version="0.1.0",
    lifespan=lifespan,
)

# -- CORS – allow local frontend dev servers ----------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -- Routes -------------------------------------------------------------------
app.include_router(auth_router)
app.include_router(skills_router)
app.include_router(questions_router)
app.include_router(games_router)
app.include_router(leaderboard_router)
app.include_router(analysis_router)


@app.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    return HealthResponse()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
