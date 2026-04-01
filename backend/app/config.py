from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    APP_NAME: str = "OpenClaw Agent Management"
    DEBUG: bool = True
    
    DATABASE_URL: str = "sqlite+aiosqlite:///./agentmgt.db"
    
    HEARTBEAT_TIMEOUT_SECONDS: int = 120
    HEARTBEAT_INTERVAL_SECONDS: int = 30
    
    MAX_MEMORY_CACHE_SIZE: int = 1000
    
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:5173"]
    
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    class Config:
        env_file = ".env"
        extra = "allow"


settings = Settings()
