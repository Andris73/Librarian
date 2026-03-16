from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App settings
    app_name: str = "Librarian"
    app_port: int = 8000
    debug: bool = False
    config_dir: str = "/config"

    # Audiobookshelf settings
    abs_url: str = "http://localhost:13378"
    abs_api_token: str = ""

    # Jackett settings
    jackett_url: str = "http://localhost:9117"
    jackett_api_key: str = ""

    # Transmission settings
    transmission_url: str = "http://localhost:9091"
    transmission_username: str = "admin"
    transmission_password: str = "admin"

    # Download settings
    download_path: str = "/data/audiobooks"

    # Database
    sqlite_path: str = "librarian.db"

    # Audible (for search)
    audible_region: str = "us"

    class Config:
        env_prefix = "LIBRARIAN_"


@lru_cache
def get_settings() -> Settings:
    return Settings()
