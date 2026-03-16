from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

from .api.main import router as api_router
from .config import get_settings

settings = get_settings()

app = FastAPI(title=settings.app_name, debug=settings.debug, version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)

FRONTEND_PATH = "/app/frontend/.next"


@app.get("/")
async def root():
    return FileResponse(f"{FRONTEND_PATH}/out/index.html")


@app.get("/health")
async def health():
    return {"status": "healthy"}


if os.path.exists(f"{FRONTEND_PATH}/out"):
    app.mount(
        "/_next", StaticFiles(directory=f"{FRONTEND_PATH}/out/_next"), name="static"
    )
