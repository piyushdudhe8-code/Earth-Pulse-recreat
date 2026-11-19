import pytest

from app.main import cors_origins_from_env


def test_cors_origins_default_to_local_development_origins() -> None:
    assert cors_origins_from_env(None) == [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]


def test_cors_origins_parse_multiple_https_domains_and_normalize_slashes() -> None:
    assert cors_origins_from_env(
        " https://earth-pulse.example ,https://preview.example/ "
    ) == ["https://earth-pulse.example", "https://preview.example"]


@pytest.mark.parametrize(
    "value",
    [
        "",
        "*",
        "https://example.com/path",
        "http://example.com",
        "http://192.168.225.145:3000",
        "ftp://example.com",
    ],
)
def test_cors_origins_reject_wildcards_and_non_origins(value: str) -> None:
    with pytest.raises(ValueError):
        cors_origins_from_env(value)
