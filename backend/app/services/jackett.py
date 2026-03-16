import httpx
from typing import Optional
from ..config import get_settings


class JackettClient:
    def __init__(self):
        self.settings = get_settings()
        self.base_url = self.settings.jackett_url
        self.api_key = self.settings.jackett_api_key
        self.client = httpx.AsyncClient(base_url=self.base_url, timeout=60.0)

    def _headers(self) -> dict:
        return {"X-Api-Key": self.api_key}

    async def close(self):
        await self.client.aclose()

    async def get_indexers(self) -> dict:
        response = await self.client.get("/api/v2.0/indexers", headers=self._headers())
        response.raise_for_status()
        return response.json()

    async def search(
        self, query: str, category: int = 3030, indexer: Optional[str] = None
    ) -> dict:
        params = {
            "q": query,
            "cat": str(category),
        }
        if indexer:
            params["indexer"] = indexer

        response = await self.client.get(
            "/api/v2.0/indexers/all/results", params=params, headers=self._headers()
        )
        response.raise_for_status()
        return response.json()

    async def get_torznab_feed(
        self, indexer: str, query: str, category: int = 3030
    ) -> dict:
        response = await self.client.get(
            f"/api/v2.0/indexers/{indexer}/results/torznab",
            params={"q": query, "cat": str(category)},
            headers=self._headers(),
        )
        response.raise_for_status()
        return response.json()

    async def get_download_url(self, link: str) -> str:
        if "torznab" in link or "jackett" in link.lower():
            response = await self.client.get(link, headers=self._headers())
            response.raise_for_status()
            return response.text
        return link
