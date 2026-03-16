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
