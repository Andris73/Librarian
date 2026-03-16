from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
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
async def get_libraries():
    """Get all libraries from audiobookshelf"""
    import logging

    logger = logging.getLogger("librarian")
    from ..services.audiobookshelf import AudiobookshelfClient

    client = AudiobookshelfClient()
    try:
        logger.info(
            f"ABS URL: {client.base_url}, Token: {client.api_token[:10] if client.api_token else 'empty'}..."
        )
        result = await client.get_libraries()
        logger.info(f"Libraries result: {result}")
        return result
    except Exception as e:
        logger.error(f"Error fetching libraries: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        await client.close()


@router.get("/api/libraries/{library_id}/books")
async def get_library_books(
    library_id: str,
    limit: int = 100,
    offset: int = 0,
):
    """Get books from a specific library"""
    import logging

    logger = logging.getLogger("librarian")
    from ..services.audiobookshelf import AudiobookshelfClient

    client = AudiobookshelfClient()
    try:
        logger.info(f"Fetching books for library: {library_id}")
        result = await client.get_library_books(library_id, limit, offset)
        logger.info(
            f"Books result keys: {result.keys() if isinstance(result, dict) else 'not a dict'}"
        )
        return result
    except Exception as e:
        logger.error(f"Error fetching books: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        await client.close()


@router.get("/api/books/{book_id}")
async def get_book(book_id: str):
    """Get book details"""
    import logging

    logger = logging.getLogger("librarian")
    from ..services.audiobookshelf import AudiobookshelfClient

    client = AudiobookshelfClient()
    try:
        return await client.get_book(book_id)
    except Exception as e:
        logger.error(f"Error fetching book: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        await client.close()


@router.get("/api/abs/items/{item_id}/cover")
async def get_item_cover(item_id: str):
    """Get cover image for a library item"""
    import logging
    import httpx

    logger = logging.getLogger("librarian")
    from ..config import get_settings

    settings = get_settings()
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{settings.abs_url}/api/items/{item_id}/cover",
                headers={"Authorization": f"Bearer {settings.abs_api_token}"},
                follow_redirects=True,
            )
            if response.status_code == 200:
                content = await response.aread()
                content_type = response.headers.get("content-type", "image/jpeg")
                return StreamingResponse(
                    iter([content]),
                    media_type=content_type,
                    headers={"Cache-Control": "public, max-age=3600"},
                )
            elif response.status_code == 404:
                raise HTTPException(status_code=404, detail="Cover not found")
            else:
                raise HTTPException(
                    status_code=response.status_code, detail="Failed to fetch cover"
                )
    except Exception as e:
        logger.error(f"Error fetching cover: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/books/{book_id}/stream/{chapter_id}")
async def get_stream_url(book_id: str, chapter_id: str):
    """Get streaming URL for a chapter"""
    import logging

    logger = logging.getLogger("librarian")
    from ..services.audiobookshelf import AudiobookshelfClient

    client = AudiobookshelfClient()
    try:
        url = await client.get_streaming_url(book_id, chapter_id)
        return {"url": url}
    except Exception as e:
        logger.error(f"Error getting stream URL: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        await client.close()


@router.get("/api/search/jackett")
async def search_jackett(query: str, category: int = 3030):
    """Search for audiobooks using Jackett"""
    import logging

    logger = logging.getLogger("librarian")
    from ..services.jackett import JackettClient

    client = JackettClient()
    try:
        return await client.search(query, category)
    except Exception as e:
        logger.error(f"Error searching Jackett: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        await client.close()


@router.post("/api/download")
async def add_download(request: DownloadRequest):
    """Add a new download to Transmission"""
    import logging

    logger = logging.getLogger("librarian")
    from ..services.transmission import TransmissionClient

    client = TransmissionClient()
    try:
        result = await client.add_torrent(request.url)
        return result
    except Exception as e:
        logger.error(f"Error adding download: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        await client.close()


@router.get("/api/downloads")
async def get_downloads():
    """Get all downloads from Transmission"""
    import logging

    logger = logging.getLogger("librarian")
    from ..services.transmission import TransmissionClient

    client = TransmissionClient()
    try:
        torrents = await client.get_torrents()
        return {"torrents": torrents}
    except Exception as e:
        logger.error(f"Error getting downloads: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        await client.close()


@router.get("/api/downloads/{torrent_id}")
async def get_download(torrent_id: int):
    """Get a specific download from Transmission"""
    import logging

    logger = logging.getLogger("librarian")
    from ..services.transmission import TransmissionClient

    client = TransmissionClient()
    try:
        torrent = await client.get_torrent(torrent_id)
        return torrent
    except Exception as e:
        logger.error(f"Error getting download: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        await client.close()


@router.delete("/api/downloads/{torrent_id}")
async def remove_download(torrent_id: int, delete_data: bool = False):
    """Remove a download from Transmission"""
    import logging

    logger = logging.getLogger("librarian")
    from ..services.transmission import TransmissionClient

    client = TransmissionClient()
    try:
        return await client.remove_torrent([torrent_id], delete_data)
    except Exception as e:
        logger.error(f"Error removing download: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        await client.close()


@router.post("/api/downloads/{torrent_id}/start")
async def start_download(torrent_id: int):
    """Start a paused download"""
    import logging

    logger = logging.getLogger("librarian")
    from ..services.transmission import TransmissionClient

    client = TransmissionClient()
    try:
        return await client.start_torrent(torrent_id)
    except Exception as e:
        logger.error(f"Error starting download: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        await client.close()


@router.post("/api/downloads/{torrent_id}/stop")
async def stop_download(torrent_id: int):
    """Pause a download"""
    import logging

    logger = logging.getLogger("librarian")
    from ..services.transmission import TransmissionClient

    client = TransmissionClient()
    try:
        return await client.stop_torrent(torrent_id)
    except Exception as e:
        logger.error(f"Error stopping download: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        await client.close()


@router.get("/api/config")
async def get_config():
    """Get current configuration"""
    from ..config import get_settings

    settings = get_settings()
    return {
        "abs_url": settings.abs_url,
        "abs_api_token": settings.abs_api_token,
        "jackett_url": settings.jackett_url,
        "jackett_api_key": settings.jackett_api_key,
        "transmission_url": settings.transmission_url,
        "transmission_username": settings.transmission_username,
        "transmission_password": settings.transmission_password,
        "selected_library_id": settings.selected_library_id,
    }


class ConfigUpdate(BaseModel):
    abs_url: Optional[str] = None
    abs_api_token: Optional[str] = None
    jackett_url: Optional[str] = None
    jackett_api_key: Optional[str] = None
    transmission_url: Optional[str] = None
    transmission_username: Optional[str] = None
    transmission_password: Optional[str] = None
    selected_library_id: Optional[str] = None


@router.post("/api/config")
async def update_config(config: ConfigUpdate):
    """Update configuration"""
    import os
    from ..config import get_settings

    if config.abs_url is not None:
        os.environ["LIBRARIAN_ABS_URL"] = config.abs_url
    if config.abs_api_token is not None:
        os.environ["LIBRARIAN_ABS_API_TOKEN"] = config.abs_api_token
    if config.jackett_url is not None:
        os.environ["LIBRARIAN_JACKETT_URL"] = config.jackett_url
    if config.jackett_api_key is not None:
        os.environ["LIBRARIAN_JACKETT_API_KEY"] = config.jackett_api_key
    if config.transmission_url is not None:
        os.environ["LIBRARIAN_TRANSMISSION_URL"] = config.transmission_url
    if config.transmission_username is not None:
        os.environ["LIBRARIAN_TRANSMISSION_USERNAME"] = config.transmission_username
    if config.transmission_password is not None:
        os.environ["LIBRARIAN_TRANSMISSION_PASSWORD"] = config.transmission_password
    if config.selected_library_id is not None:
        os.environ["LIBRARIAN_SELECTED_LIBRARY_ID"] = config.selected_library_id

    get_settings.cache_clear()
    settings = get_settings()
    return {
        "abs_url": settings.abs_url,
        "abs_api_token": settings.abs_api_token,
        "jackett_url": settings.jackett_url,
        "jackett_api_key": settings.jackett_api_key,
        "transmission_url": settings.transmission_url,
        "transmission_username": settings.transmission_username,
        "transmission_password": settings.transmission_password,
        "selected_library_id": settings.selected_library_id,
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
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=False) as client:
            response = await client.get(
                f"{settings.jackett_url}/api/v2.0/indexers",
                headers={"X-Api-Key": settings.jackett_api_key},
            )
            if response.status_code == 200:
                return {"status": "success", "message": "Connected to Jackett"}
            elif response.status_code == 302:
                return {
                    "status": "error",
                    "message": "Invalid API key - redirected to login",
                }
            else:
                return {
                    "status": "error",
                    "message": f"HTTP {response.status_code}",
                    "detail": response.text[:200],
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
            elif response.status_code == 409:
                session_id = response.headers.get("X-Transmission-Session-Id")
                if session_id:
                    response = await client.post(
                        f"{settings.transmission_url}/transmission/rpc",
                        headers={
                            "Authorization": f"Basic {auth}",
                            "X-Transmission-Session-Id": session_id,
                        },
                        json={"method": "session-get"},
                    )
                    if response.status_code == 200:
                        return {
                            "status": "success",
                            "message": "Connected to Transmission",
                        }

                return {"status": "error", "message": "Failed to get valid session"}
            else:
                return {
                    "status": "error",
                    "message": f"HTTP {response.status_code}",
                    "detail": response.text[:200],
                }
    except Exception as e:
        logger.error(f"Transmission connection error: {e}")
        return {"status": "error", "message": str(e)}
