from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from pydantic import BaseModel

from ..services.audiobookshelf import AudiobookshelfClient
from ..services.jackett import JackettClient
from ..services.transmission import TransmissionClient

router = APIRouter()


class AudiobookshelfDeps:
    def __init__(self):
        self.client = AudiobookshelfClient()

    async def __aenter__(self):
        return self.client

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.client.close()


class JackettDeps:
    def __init__(self):
        self.client = JackettClient()

    async def __aenter__(self):
        return self.client

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.client.close()


class TransmissionDeps:
    def __init__(self):
        self.client = TransmissionClient()

    async def __aenter__(self):
        return self.client

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.client.close()


class LibraryItem(BaseModel):
    id: str
    title: str
    author: str
    narrator: Optional[str] = None
    description: Optional[str] = None
    coverUrl: Optional[str] = None
    duration: Optional[int] = None
    progress: Optional[float] = None
    isComplete: bool = False


class SearchResult(BaseModel):
    title: str
    author: str
    description: Optional[str] = None
    coverUrl: Optional[str] = None
    asin: Optional[str] = None
    url: Optional[str] = None
    source: str


class DownloadRequest(BaseModel):
    url: str
    title: str


class DownloadStatus(BaseModel):
    id: int
    name: str
    status: str
    progress: float
    downloadedBytes: int
    totalBytes: int


@router.get("/api/libraries")
async def get_libraries(abs: AudiobookshelfClient = Depends(AudiobookshelfDeps)):
    """Get all libraries from audiobookshelf"""
    try:
        return await abs.get_libraries()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/libraries/{library_id}/books")
async def get_library_books(
    library_id: str,
    limit: int = 100,
    offset: int = 0,
    abs: AudiobookshelfClient = Depends(AudiobookshelfDeps),
):
    """Get books from a specific library"""
    try:
        return await abs.get_library_books(library_id, limit, offset)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/books/{book_id}")
async def get_book(
    book_id: str, abs: AudiobookshelfClient = Depends(AudiobookshelfDeps)
):
    """Get book details"""
    try:
        return await abs.get_book(book_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/books/{book_id}/stream/{chapter_id}")
async def get_stream_url(
    book_id: str,
    chapter_id: str,
    abs: AudiobookshelfClient = Depends(AudiobookshelfDeps),
):
    """Get streaming URL for a chapter"""
    try:
        url = await abs.get_streaming_url(book_id, chapter_id)
        return {"url": url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/search/jackett")
async def search_jackett(
    query: str, category: int = 3030, jackett: JackettClient = Depends(JackettDeps)
):
    """Search for audiobooks using Jackett"""
    try:
        return await jackett.search(query, category)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/download")
async def add_download(
    request: DownloadRequest,
    transmission: TransmissionClient = Depends(TransmissionDeps),
):
    """Add a new download to Transmission"""
    try:
        result = await transmission.add_torrent(request.url)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/downloads")
async def get_downloads(transmission: TransmissionClient = Depends(TransmissionDeps)):
    """Get all downloads from Transmission"""
    try:
        torrents = await transmission.get_torrents()
        return {"torrents": torrents}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/downloads/{torrent_id}")
async def get_download(
    torrent_id: int, transmission: TransmissionClient = Depends(TransmissionDeps)
):
    """Get a specific download from Transmission"""
    try:
        torrent = await transmission.get_torrent(torrent_id)
        return torrent
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/api/downloads/{torrent_id}")
async def remove_download(
    torrent_id: int,
    delete_data: bool = False,
    transmission: TransmissionClient = Depends(TransmissionDeps),
):
    """Remove a download from Transmission"""
    try:
        return await transmission.remove_torrent([torrent_id], delete_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/downloads/{torrent_id}/start")
async def start_download(
    torrent_id: int, transmission: TransmissionClient = Depends(TransmissionDeps)
):
    """Start a paused download"""
    try:
        return await transmission.start_torrent(torrent_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/downloads/{torrent_id}/stop")
async def stop_download(
    torrent_id: int, transmission: TransmissionClient = Depends(TransmissionDeps)
):
    """Pause a download"""
    try:
        return await transmission.stop_torrent(torrent_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/config")
async def get_config():
    """Get current configuration (non-sensitive)"""
    from ..config import get_settings

    settings = get_settings()
    return {
        "abs_url": settings.abs_url,
        "jackett_url": settings.jackett_url,
        "transmission_url": settings.transmission_url,
    }


@router.get("/api/test/abs")
async def test_abs():
    """Test connection to Audiobookshelf"""
    import httpx
    from ..config import get_settings
    import logging

    settings = get_settings()
    logger = logging.getLogger("librarian")
    logger.info(f"Testing ABS connection to: {settings.abs_url}")

    if not settings.abs_api_token:
        return {"status": "error", "message": "No API token configured"}

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{settings.abs_url}/api/libraries",
                headers={"Authorization": f"Bearer {settings.abs_api_token}"},
            )
            if response.status_code == 200:
                return {
                    "status": "success",
                    "message": "Connected to Audiobookshelf",
                    "data": response.json(),
                }
            else:
                return {
                    "status": "error",
                    "message": f"HTTP {response.status_code}",
                    "detail": response.text,
                }
    except Exception as e:
        logger.error(f"ABS connection error: {e}")
        return {"status": "error", "message": str(e)}


@router.get("/api/test/jackett")
async def test_jackett():
    """Test connection to Jackett"""
    import httpx
    from ..config import get_settings
    import logging

    settings = get_settings()
    logger = logging.getLogger("librarian")
    logger.info(f"Testing Jackett connection to: {settings.jackett_url}")

    if not settings.jackett_api_key:
        return {"status": "error", "message": "No API key configured"}

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{settings.jackett_url}/api/v2.0/indexers",
                params={"apikey": settings.jackett_api_key},
            )
            if response.status_code == 200:
                return {"status": "success", "message": "Connected to Jackett"}
            else:
                return {
                    "status": "error",
                    "message": f"HTTP {response.status_code}",
                    "detail": response.text,
                }
    except Exception as e:
        logger.error(f"Jackett connection error: {e}")
        return {"status": "error", "message": str(e)}


@router.get("/api/test/transmission")
async def test_transmission():
    """Test connection to Transmission"""
    import httpx
    import base64
    from ..config import get_settings
    import logging

    settings = get_settings()
    logger = logging.getLogger("librarian")
    logger.info(f"Testing Transmission connection to: {settings.transmission_url}")

    try:
        auth = base64.b64encode(
            f"{settings.transmission_username}:{settings.transmission_password}".encode()
        ).decode()
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{settings.transmission_url}/transmission/rpc",
                headers={"Authorization": f"Basic {auth}"},
                json={"method": "session-get"},
            )
            if response.status_code == 200:
                return {"status": "success", "message": "Connected to Transmission"}
            else:
                return {
                    "status": "error",
                    "message": f"HTTP {response.status_code}",
                    "detail": response.text,
                }
    except Exception as e:
        logger.error(f"Transmission connection error: {e}")
        return {"status": "error", "message": str(e)}
