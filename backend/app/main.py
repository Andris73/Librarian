import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse
import os
import sys

logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger("librarian")

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

FRONTEND_PATH = "/app/frontend/out"


@app.get("/")
async def root():
    logger.info("Serving root")
    return FileResponse(f"{FRONTEND_PATH}/index.html")


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.get("/_next/{rest:path}")
async def next_static(rest: str):
    file_path = f"{FRONTEND_PATH}/_next/{rest}"
    logger.info(f"Next.js static: {rest}")
    if os.path.exists(file_path):
        return FileResponse(file_path)
    logger.warning(f"Not found: {file_path}")
    return HTMLResponse("Not Found", status_code=404)


@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    path = full_path.rstrip("/")
    logger.info(f"Frontend request: {path}")

    if path.startswith("_next"):
        return HTMLResponse("Not Found", status_code=404)

    if path == "":
        return FileResponse(f"{FRONTEND_PATH}/index.html")

    html_file = f"{FRONTEND_PATH}/{path}/index.html"
    if os.path.exists(html_file):
        return FileResponse(html_file)

    fallback = f"{FRONTEND_PATH}/index.html"
    if os.path.exists(fallback):
        return FileResponse(fallback)

    logger.warning(f"404 for path: {path}")
    return HTMLResponse("Not Found", status_code=404)


if os.path.exists(f"{FRONTEND_PATH}"):
    app.mount("/_next", StaticFiles(directory=f"{FRONTEND_PATH}/_next"), name="static")
