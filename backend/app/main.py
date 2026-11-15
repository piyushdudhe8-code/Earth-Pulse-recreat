from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

from app.routers.analysis import router as analysis_router
from app.routers.geocoding import router as geocoding_router
from app.routers.health import router as health_router
from app.routers.probability import router as probability_router
from app.routers.research import router as research_router

app = FastAPI(
    title="Earth Pulse API",
    description="API for exploring Earth's climate using NASA data.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(analysis_router)
app.include_router(geocoding_router)
app.include_router(probability_router)
app.include_router(research_router)
