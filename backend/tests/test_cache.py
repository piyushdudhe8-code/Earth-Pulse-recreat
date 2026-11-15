import sqlite3
from concurrent.futures import ThreadPoolExecutor

from app.services.cache import SQLiteResponseCache


def test_cache_round_trips_json_payload(tmp_path) -> None:
    cache = SQLiteResponseCache(str(tmp_path / "responses.sqlite3"))
    payload = {"api_version": "test-version", "cached": True}

    cache.set("request-key", payload)

    assert cache.get("request-key") == payload


def test_cache_does_not_return_expired_payload(tmp_path) -> None:
    cache = SQLiteResponseCache(str(tmp_path / "responses.sqlite3"), ttl_seconds=-1)
    cache.set("request-key", {"cached": True})

    assert cache.get("request-key") is None


def test_cache_migrates_legacy_schema_during_concurrent_reads(tmp_path) -> None:
    path = tmp_path / "legacy.sqlite3"
    with sqlite3.connect(path) as connection:
        connection.execute(
            """
            CREATE TABLE api_response_cache (
                cache_key TEXT PRIMARY KEY,
                payload TEXT NOT NULL,
                expires_at REAL NOT NULL
            )
            """
        )
    cache = SQLiteResponseCache(str(path))

    with ThreadPoolExecutor(max_workers=8) as executor:
        results = list(executor.map(cache.get_entry, [f"request-{i}" for i in range(16)]))

    assert results == [None] * 16
