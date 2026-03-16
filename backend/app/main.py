from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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


@app.get("/")
async def root():
    return {"message": "Librarian API", "version": "0.1.0"}


@app.get("/health")
async def health():
    return {"status": "healthy"}
