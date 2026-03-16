# Librarian

A Docker-based web UI that combines audiobookshelf playback with Jackett/Transmission downloading - a unified "browse, request, download, play" experience.

## Architecture

```
┌─────────────────────────────────────────────┐
│                   Librarian                  │
│  ┌─────────────┐  ┌─────────────┐          │
│  │  Playback   │  │   Search    │          │
│  │  (ABS API)  │  │(Jackett)    │          │
│  └─────────────┘  └─────────────┘          │
│  ┌─────────────────────────────────────┐   │
│  │     Download (Transmission)         │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
         │                  │                  │
         ▼                  ▼                  ▼
   ┌──────────┐      ┌───────────┐     ┌────────────┐
   │Audiobook │      │  Jackett  │     │Transmission│
   │  shelf   │      │  :9117    │     │   :9091    │
   │ :13378   │      └───────────┘     └────────────┘
   └──────────┘
```

## Quick Start

### Option 1: Connect to Existing Mediastack (Recommended)

If you already have audiobookshelf, jackett, and transmission running, use this to iterate on Librarian separately:

```bash
# 1. Create .env with your API tokens
echo "ABS_API_TOKEN=your_audiobookshelf_token" > .env
echo "JACKETT_API_KEY=your_jackett_key" >> .env

# 2. Build and start Librarian
docker-compose -f docker-compose.librarian.yml up -d --build
```

This uses `network_mode: host` and `host.docker.internal` to connect to your existing services on:
- `http://host.docker.internal:13378` → Audiobookshelf
- `http://host.docker.internal:9117` → Jackett
- `http://host.docker.internal:9091` → Transmission

### Option 2: Full Stack

If you want Librarian to manage everything in one compose file:

```bash
# Copy .env.example to .env and fill in your values
cp .env.example .env

# Start all services
docker-compose up -d
```

### Option 3: Add to Existing Compose

Add the following service to your existing `docker-compose.yml`:

```yaml
  librarian:
    image: ghcr.io/yourusername/librarian:latest
    container_name: librarian
    networks:
      - media
    ports:
      - 3000:3000
    volumes:
      - /mnt/disk1/appdata/librarian:/config
    environment:
      - PUID=1000
      - PGID=1001
      - TZ=Europe/London
      - LIBRARIAN_ABS_URL=http://audiobookshelf:80
      - LIBRARIAN_ABS_API_TOKEN=${ABS_API_TOKEN}
      - LIBRARIAN_JACKETT_URL=http://jackett:9117
      - LIBRARIAN_JACKETT_API_KEY=${JACKETT_API_KEY}
      - LIBRARIAN_TRANSMISSION_URL=http://transmission:9091
      - LIBRARIAN_TRANSMISSION_USERNAME=admin
      - LIBRARIAN_TRANSMISSION_PASSWORD=admin
      - LIBRARIAN_DOWNLOAD_PATH=/data/audiobooks
    restart: unless-stopped
    depends_on:
      audiobookshelf:
        condition: service_healthy
      jackett:
        condition: service_healthy
      transmission:
        condition: service_healthy
```

## Configuration

| Environment Variable | Description | Default |
|---------------------|-------------|---------|
| `LIBRARIAN_ABS_URL` | Audiobookshelf URL | `http://audiobookshelf:80` |
| `LIBRARIAN_ABS_API_TOKEN` | Audiobookshelf API token | - |
| `LIBRARIAN_JACKETT_URL` | Jackett URL | `http://jackett:9117` |
| `LIBRARIAN_JACKETT_API_KEY` | Jackett API key | - |
| `LIBRARIAN_TRANSMISSION_URL` | Transmission URL | `http://transmission:9091` |
| `LIBRARIAN_TRANSMISSION_USERNAME` | Transmission username | `admin` |
| `LIBRARIAN_TRANSMISSION_PASSWORD` | Transmission password | `admin` |
| `LIBRARIAN_DOWNLOAD_PATH` | Download path | `/data/audiobooks` |

## Getting API Tokens

### Audiobookshelf
1. Log in to Audiobookshelf
2. Go to your user settings (click your username)
3. Click "Create Token" under API Tokens
4. Copy the token

### Jackett
1. Go to your Jackett UI
2. Click the "API Key" button (top right)
3. Copy your API key

## Jackett Download Folder

Make sure Jackett is configured to download to the same folder that Audiobookshelf watches:

- In Jackett: Settings → Advanced → Downloads → Save to: `/downloads`
- This should map to `/mnt/disk1/downloads/audiobooks` in Docker

## Development

```bash
# Backend
cd backend
uv sync
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev
```

Then access the frontend at http://localhost:3000 (proxies API to port 8000)

## Tech Stack

- **Backend**: FastAPI (Python)
- **Frontend**: Next.js + React + TailwindCSS
- **Database**: SQLite

## License

MIT
