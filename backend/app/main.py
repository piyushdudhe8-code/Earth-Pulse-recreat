import os
from pathlib import Path
from urllib.parse import urlsplit

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

from app.routers.analysis import router as analysis_router
from app.routers.cmr import router as cmr_router
from app.routers.geocoding import router as geocoding_router
from app.routers.health import router as health_router
from app.routers.probability import router as probability_router
from app.routers.projection import router as projection_router
from app.routers.research import router as research_router

app = FastAPI(
    title="Earth Pulse API",
    description="API for exploring Earth's climate using NASA data.",
    version="0.1.0",
)


def cors_origins_from_env(raw_origins: str | None) -> list[str]:
    if raw_origins is None:
        return [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ]

    origins = [origin.strip().rstrip("/") for origin in raw_origins.split(",")]
    origins = [origin for origin in origins if origin]
    if not origins or "*" in origins:
        raise ValueError(
            "EARTH_PULSE_CORS_ORIGINS must contain one or more explicit origins."
        )

    for origin in origins:
        parsed = urlsplit(origin)
        is_local = parsed.hostname in {
            "localhost",
            "127.0.0.1",
            "::1",
        }
        if (
            parsed.scheme not in {"http", "https"}
            or not parsed.netloc
            or parsed.path not in {"", "/"}
            or parsed.query
            or parsed.fragment
            or parsed.username
            or parsed.password
            or (parsed.scheme != "https" and not is_local)
        ):
            raise ValueError(
                "Each CORS value must be an HTTPS origin (HTTP is allowed for localhost): "
                f"{origin}"
            )
    return origins


app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins_from_env(os.getenv("EARTH_PULSE_CORS_ORIGINS")),
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
)


@app.get("/", tags=["health"])
def get_root() -> dict[str, str]:
    return {"status": "ok", "service": "earth-pulse-api"}


app.include_router(health_router)
app.include_router(analysis_router)
app.include_router(cmr_router)
app.include_router(geocoding_router)
app.include_router(probability_router)
app.include_router(projection_router)
app.include_router(research_router)
