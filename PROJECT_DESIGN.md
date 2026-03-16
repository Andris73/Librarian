# Librarian - Project Design Document

> **Last Updated:** 2026-03-16
> **Status:** Active Development

---

## 1. Project Overview

**Librarian** is a Docker-based web application that combines:
- **Audiobookshelf (ABS)** - Audiobook library management
- **Jackett** - Torrent indexer API
- **Transmission** - Torrent download client

**Goal:** Create a unified interface for browsing, searching, and recommending audiobooks with a sophisticated recommendation engine.

---

## 2. Current Architecture

### Tech Stack
- **Backend:** FastAPI (Python)
- **Frontend:** Next.js + React + TailwindCSS
- **Container:** Single Docker container with frontend static files served via FastAPI
- **Network:** `network_mode: host` for simplicity

### Key Files
| File | Purpose |
|------|---------|
| `backend/app/api/main.py` | FastAPI routes and endpoints |
| `backend/app/services/audiobookshelf.py` | ABS API client |
| `backend/app/services/jackett.py` | Jackett API client |
| `backend/app/services/transmission.py` | Transmission RPC client |
| `backend/app/config.py` | Settings management |
| `frontend/src/components/Library.tsx` | Library display |
| `frontend/src/components/SearchPage.tsx` | Jackett search |
| `frontend/src/components/SettingsPage.tsx` | Configuration |
| `frontend/src/components/Sidebar.tsx` | Navigation + status |
| `frontend/src/app/recommended/page.tsx` | Recommendations (basic) |

### Connections
| Service | URL | Status |
|---------|-----|--------|
| Audiobookshelf | `http://localhost:13378` | ✅ Working |
| Jackett | `http://localhost:9117` | ✅ Working |
| Transmission | `http://localhost:9091` | ✅ Working |

---

## 3. What Works Now

### Library Tab
- Fetches all books from ABS library
- Displays covers, titles, authors, duration
- Library selector dropdown
- Play button UI (not functional yet)

### Search Tab
- Searches Jackett for audiobooks
- Displays results with title, author, size, seeders
- Download button sends to Transmission

### Recommended Tab (BASIC - Needs Rewrite)
- Fetches books from ABS library
- For each book, searches Jackett
- **Problems:**
  - No genre matching
  - No similar books analysis
  - No scoring
  - Naive algorithm (search each book title = poor results)
  - No deduplication
  - No external metadata enrichment

### Settings Tab
- Configure URLs and API keys for all services
- Test connection buttons
- Status indicators (colored circles: green/red/gray)

### Sidebar
- Navigation
- Connection status dots (ABS, Jackett, Transmission)

---

## 4. Known Issues & Lessons Learned

### Network Configuration
- `network_mode: host` works best for accessing host services
- Cannot use both `ports` and `network_mode: host` together
- Using `localhost` within the container with host mode

### API Authentication
- **Jackett:** Uses query param `?apikey=` not header (tested both)
- **ABS:** Uses Bearer token header
- **Transmission:** Requires session ID handling (409 → retry with X-Transmission-Session-Id)

### Audiobookshelf API
- Endpoint: `/api/libraries/{id}/items` (NOT `/books`)
- Use `minified=0` for full response data
- Response structure:
  ```json
  {
    "results": [
      {
        "id": "...",
        "media": {
          "metadata": {
            "title": "...",
            "authorName": "...",
            "narratorName": "...",
            "description": "..."
          },
          "duration": 3600
        },
        "mediaProgress": {
          "progress": 0.5,
          "isComplete": false
        }
      }
    ]
  }
  ```

### Cover Art Proxy
- Backend endpoint `/api/abs/items/{id}/cover` proxies ABS covers
- Need to use `await response.aread()` not `response.content` for StreamingResponse

---

## 5. Recommendation Engine - The Master Plan

### Vision
Build a sophisticated recommendation system that:
1. Uses entire ABS library as user preference data
2. Weights books by completion + re-listens
3. Enriches with external metadata sources
4. Filters out already-owned books
5. Verifies download availability
6. Caches results for performance

### Data Sources (Desired)

| Source | Data | Priority |
|--------|------|----------|
| **Audiobookshelf** | Library, authors, series, genres, progress, completion, re-listens | Required |
| **Open Library** | Search, covers, ratings, author works, similar books | Required |
| **Hardcover** | Ratings, reviews, recommendations | Future |
| **Jackett** | Download availability | Required |
| **abs-tract** | Goodreads + Kindle metadata | Future |
| **Shelfmark** | Could integrate for search | Consider |

### Recommended Algorithm

```
1. FETCH USER DATA
   └─> All books from ABS (entire library)
       ├─ Weight: Completed + re-listened = HIGH (score: 1.0)
       ├─ Weight: Completed once = MEDIUM (score: 0.7)
       └─ Weight: Not started/partial = LOW (score: 0.3)

2. EXTRACT FEATURES
   ├─ Authors (frequency = author affinity)
   ├─ Genres (frequency = genre preference)
   ├─ Series (find next in series)
   └─ Narrators (frequency = narrator preference)

3. ENRICH WITH EXTERNAL DATA
   ├─ For each feature → query Open Library
   ├─ Get: ratings, similar books, covers
   └─ For each candidate → query availability

4. SCORE & RANK
   Score = (AuthorMatch × 0.30) +
           (GenreMatch × 0.25) +
           (SeriesNext × 0.20) +
           (NarratorMatch × 0.10) +
           (ExternalRating × 0.10) +
           (Popularity × 0.05)

5. FILTER
   └─ Remove books already in library

6. VERIFY AVAILABILITY
   └─ Check Jackett for download links

7. CACHE & SERVE
   └─ Daily refresh at ~2am, serve from cache
```

### Initial Weights (Tunable)
| Factor | Weight | Notes |
|--------|--------|-------|
| Author match | 30% | User loves an author |
| Genre match | 25% | User reads fantasy |
| Series continuation | 20% | Next book in series |
| Narrator match | 10% | User loves narrator |
| External rating | 10% | Goodreads/Audible rating |
| Popularity | 5% | Many reviews = trusted |

### Caching Strategy
- **Daily refresh:** Scheduled job at ~2am (configurable)
- **Cache storage:** SQLite file in `/config`
- **Rate limiting:**
  - Open Library: 100 req/IP max
  - Implement exponential backoff
  - Queue requests with delays

---

## 6. External Research Findings

### Shelfmark (calibrain/shelfmark)
- **What it does:** Unified search/discover/download for books/audiobooks
- **Similar to our Search page goals**
- **Tech:** Python Flask + React/TypeScript
- **Metadata providers:** Hardcover, Open Library, Google Books, Audible
- **Download:** Prowlarr (not direct Jackett!)
- **Key insight:** Use Prowlarr instead of direct Jackett for reliability

### abs-tract
- Go-based metadata provider for ABS
- Pulls from Goodreads + Kindle
- Good for author photos, covers

### AudiMeta
- Was an Audible metadata provider
- **Being discontinued March 20, 2026**
- Not worth integrating

### Open Library APIs
- **Search:** `https://openlibrary.org/search.json?q=...`
- **Covers:** `https://covers.openlibrary.org/b/isbn/{isbn}-{size}.jpg`
- **Ratings:** `https://openlibrary.org/works/{id}/ratings.json`
- **Author works:** `https://openlibrary.org/authors/{id}/works.json`
- **Rate limit:** 100 requests/IP - needs caching

---

## 7. Implementation Phases

### Phase 1: Foundation (Immediate)
- [ ] Refactor recommendation engine backend
- [ ] Create recommendation service with proper scoring
- [ ] Implement caching layer (SQLite)

### Phase 2: External Data
- [ ] Open Library integration for metadata
- [ ] Cover art fetching
- [ ] Basic rating support

### Phase 3: Filtering
- [ ] Remove owned books from recommendations
- [ ] Deduplication logic

### Phase 4: Availability
- [ ] Jackett verification of recommendations

### Phase 5: Advanced
- [ ] Hardcover API integration
- [ ] Series detection improvement
- [ ] User preference tuning

---

## 8. Open Questions / Decisions Needed

1. **Shelfmark Integration:** Should we integrate with Shelfmark's API or rebuild similar functionality?

2. **Prowlarr vs Jackett:** Switch to Prowlarr for search (more reliable, handles indexer management)?

3. **Hardcover:** Integrate directly or use Open Library + custom scoring?

4. **Database:** Is SQLite sufficient for caching, or need Redis/PostgreSQL?

5. **Series Detection:** How important? Complex because series naming varies

6. **Scope:**
   - Search page ≈ Shelfmark (find & download)
   - Recommendations = Custom engine (ABS library → recommendations)
   - Does this separation make sense?

---

## 9. Commands Reference

```bash
# Build and run
docker compose -f docker-compose.librarian.yml up -d --build

# Check logs
docker logs librarian

# Access
# http://localhost:3000 (if ports configured) or localhost:8000 (host mode)
```

---

## 10. Future Ideas

- [ ] Audio playback within Librarian
- [ ] Progress syncing back to ABS
- [ ] Multiple library support
- [ ] User authentication
- [ ] Request system (like Shelfmark)
- [ ] Email notifications for new recommendations
- [ ] Listening statistics dashboard

---

*This document is a living specification. Update as the project evolves.*
