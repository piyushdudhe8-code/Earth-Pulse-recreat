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
