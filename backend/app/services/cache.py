import json
import os
import sqlite3
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class CachedResponse:
    payload: dict[str, Any]
    source_url: str
    retrieved_at_utc: str


class SQLiteResponseCache:
    def __init__(self, path: str | None = None, ttl_seconds: int = 86_400) -> None:
        default_path = Path(__file__).resolve().parents[2] / "data" / "nasa_power_cache.sqlite3"
        self.path = Path(path or os.environ.get("EARTH_PULSE_CACHE_PATH", default_path))
        self.ttl_seconds = ttl_seconds

    def get(self, key: str) -> dict[str, Any] | None:
        entry = self.get_entry(key)
        return entry.payload if entry else None

    def get_entry(self, key: str) -> CachedResponse | None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with sqlite3.connect(self.path, timeout=10) as connection:
            self._ensure_schema(connection)
            row = connection.execute(
                """
                SELECT payload, expires_at, source_url, retrieved_at_utc
                FROM api_response_cache WHERE cache_key = ?
                """,
                (key,),
            ).fetchone()
            if row is None:
                return None
            payload, expires_at, source_url, retrieved_at_utc = row
            if expires_at <= time.time():
                connection.execute(
                    "DELETE FROM api_response_cache WHERE cache_key = ?", (key,)
                )
                return None
            value = json.loads(payload)
            if not isinstance(value, dict):
                raise ValueError("Cached NASA POWER response is not a JSON object")
            return CachedResponse(
                payload=value,
                source_url=source_url,
                retrieved_at_utc=retrieved_at_utc,
            )

    def set(
        self,
        key: str,
        payload: dict[str, Any],
        source_url: str = "",
        retrieved_at_utc: str = "",
    ) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        serialized = json.dumps(payload, separators=(",", ":"), allow_nan=False)
        with sqlite3.connect(self.path, timeout=10) as connection:
            self._ensure_schema(connection)
            connection.execute(
                """
                INSERT INTO api_response_cache (
                    cache_key, payload, expires_at, source_url, retrieved_at_utc
                )
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(cache_key) DO UPDATE SET
                    payload = excluded.payload,
                    expires_at = excluded.expires_at,
                    source_url = excluded.source_url,
                    retrieved_at_utc = excluded.retrieved_at_utc
                """,
                (
                    key,
                    serialized,
                    time.time() + self.ttl_seconds,
                    source_url,
                    retrieved_at_utc,
                ),
            )

    @staticmethod
    def _ensure_schema(connection: sqlite3.Connection) -> None:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS api_response_cache (
                cache_key TEXT PRIMARY KEY,
                payload TEXT NOT NULL,
                expires_at REAL NOT NULL,
                source_url TEXT NOT NULL DEFAULT '',
                retrieved_at_utc TEXT NOT NULL DEFAULT ''
            )
            """
        )
        for column in ("source_url", "retrieved_at_utc"):
            columns = {
                row[1]
                for row in connection.execute(
                    "PRAGMA table_info(api_response_cache)"
                ).fetchall()
            }
            if column in columns:
                continue
            try:
                connection.execute(
                    f"ALTER TABLE api_response_cache "
                    f"ADD COLUMN {column} TEXT NOT NULL DEFAULT ''"
                )
            except sqlite3.OperationalError:
                columns = {
                    row[1]
                    for row in connection.execute(
                        "PRAGMA table_info(api_response_cache)"
                    ).fetchall()
                }
                if column not in columns:
                    raise
