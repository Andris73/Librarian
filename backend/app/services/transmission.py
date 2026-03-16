import httpx
import base64
from typing import Optional
from ..config import get_settings


class TransmissionClient:
    def __init__(self):
        self.settings = get_settings()
        self.base_url = self.settings.transmission_url
        self.username = self.settings.transmission_username
        self.password = self.settings.transmission_password
        self.session_id: Optional[str] = None

        auth = base64.b64encode(f"{self.username}:{self.password}".encode()).decode()
        self.client = httpx.AsyncClient(
            base_url=self.base_url,
            headers={
                "Authorization": f"Basic {auth}",
                "Content-Type": "application/json",
            },
            timeout=30.0,
        )

    async def close(self):
        await self.client.aclose()

    async def _rpc(self, method: str, arguments: dict = None) -> dict:
        payload = {"method": method, "arguments": arguments or {}}

        headers = {}
        if self.session_id:
            headers["X-Transmission-Session-Id"] = self.session_id

        response = await self.client.post(
            "/transmission/rpc", json=payload, headers=headers
        )

        if response.status_code == 409:
            self.session_id = response.headers.get("X-Transmission-Session-Id")
            if self.session_id:
                headers["X-Transmission-Session-Id"] = self.session_id
                response = await self.client.post(
                    "/transmission/rpc", json=payload, headers=headers
                )

        response.raise_for_status()
        return response.json()

    async def get_torrents(self, ids: Optional[list] = None) -> list:
        arguments = {}
        if ids:
            arguments["ids"] = ids
        result = await self._rpc("torrent-get", arguments)
        return result.get("arguments", {}).get("torrents", [])

    async def add_torrent(self, url: str, download_dir: Optional[str] = None) -> dict:
        arguments = {"filename": url}
        if download_dir:
            arguments["download-dir"] = download_dir
        result = await self._rpc("torrent-add", arguments)
        return result.get("arguments", {}).get("torrent-added", {})

    async def add_magnet(self, magnet: str, download_dir: Optional[str] = None) -> dict:
        arguments = {"filename": magnet}
        if download_dir:
            arguments["download-dir"] = download_dir
        result = await self._rpc("torrent-add", arguments)
        return result.get("arguments", {}).get("torrent-added", {})

    async def remove_torrent(self, ids: list, delete_data: bool = False) -> dict:
        arguments = {"ids": ids, "delete-local-data": delete_data}
        return await self._rpc("torrent-remove", arguments)

    async def get_torrent(self, torrent_id: int) -> dict:
        torrents = await self.get_torrents([torrent_id])
        return torrents[0] if torrents else {}

    async def get_free_space(self, path: str = "/data") -> dict:
        result = await self._rpc("free-space", {"path": path})
        return result.get("arguments", {})

    async def start_torrent(self, torrent_id: int) -> dict:
        return await self._rpc("torrent-start", {"ids": [torrent_id]})

    async def stop_torrent(self, torrent_id: int) -> dict:
        return await self._rpc("torrent-stop", {"ids": [torrent_id]})
