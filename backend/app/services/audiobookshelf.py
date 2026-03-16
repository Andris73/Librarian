import httpx
from typing import Optional
from ..config import get_settings


class AudiobookshelfClient:
    def __init__(self):
        self.settings = get_settings()
        self.base_url = self.settings.abs_url
        self.api_token = self.settings.abs_api_token
        self.client = httpx.AsyncClient(
            base_url=self.base_url,
            headers={"Authorization": f"Bearer {self.api_token}"},
            timeout=30.0,
        )

    async def close(self):
        await self.client.aclose()

    async def get_libraries(self) -> dict:
        response = await self.client.get("/api/libraries")
        response.raise_for_status()
        return response.json()

    async def get_library_books(
        self, library_id: str, limit: int = 100, offset: int = 0
    ) -> dict:
        response = await self.client.get(
            f"/api/libraries/{library_id}/books",
            params={"limit": limit, "offset": offset},
        )
        response.raise_for_status()
        return response.json()

    async def get_book(self, book_id: str) -> dict:
        response = await self.client.get(f"/api/books/{book_id}")
        response.raise_for_status()
        return response.json()

    async def get_book_file(self, book_id: str, file_id: str) -> bytes:
        response = await self.client.get(f"/api/books/{book_id}/file/{file_id}")
        response.raise_for_status()
        return response.content

    async def get_streaming_url(self, book_id: str, chapter_id: str) -> str:
        response = await self.client.get(f"/api/books/{book_id}/chapter/{chapter_id}")
        response.raise_for_status()
        data = response.json()
        return data.get("url", "")

    async def get_user_settings(self) -> dict:
        response = await self.client.get("/api/user/settings")
        response.raise_for_status()
        return response.json()

    async def sync_library(self, library_id: str) -> dict:
        response = await self.client.post(f"/api/libraries/{library_id}/scan")
        response.raise_for_status()
        return response.json()

    async def search_library(self, library_id: str, query: str) -> dict:
        response = await self.client.get(
            f"/api/libraries/{library_id}/search", params={"q": query}
        )
        response.raise_for_status()
        return response.json()

    async def get_podcasts(self) -> dict:
        response = await self.client.get("/api/podcasts")
        response.raise_for_status()
        return response.json()
