# Zaflix

A **Netflix-inspired** custom [Jellyfin Web](https://github.com/jellyfin/jellyfin-web) client with a dark purple-neon glassmorphic theme.

---

## What is Zaflix?

Zaflix transforms the default Jellyfin experience into a visually rich, Netflix-like interface while keeping your existing Jellyfin media server as the backend. It features:

- **Hero Billboard** — Auto-rotating hero section with backdrop, logo overlays, video clips, and dot navigation
- **Smooth Carousels** — Drag-to-scroll rows with momentum for movies, TV shows, and collections
- **Detail Modals** — Rich overlay with cast, episodes (per-season), similar items, and collection info
- **Video Player Overlay** — Post-play "Up Next" screen with circular countdown, keyboard shortcut hints, and glassmorphic on-screen controls
- **Full-Text Search** — Debounced grouped results with lazy-loaded image cards
- **Clean Lightweight Theme** — Dark glassmorphic UI with purple neon accents, smooth transitions, and loading skeletons
- **Mobile-First** — Bottom navigation bar, touch swipe gestures, responsive layouts, and auto-rotate to landscape on playback
- **Continue Watching** — Resume from where you left off with episode thumbnails

---

## Based On

This project is a customized fork of the **[Jellyfin Web Client](https://github.com/jellyfin/jellyfin-web)**, the official frontend for [Jellyfin](https://jellyfin.org) media server. All custom components (Billboard, MediaRow, DetailsModal, EndScreen, search, bottom nav) are built with **React** on top of the existing Jellyfin infrastructure.

---

## Prerequisites

- A running **Jellyfin server** (version 10.8+)
- **Docker** (for container deployment) **or** **Node.js 20+** and **npm** (for manual development)
- **Git** (to clone the repository)

---

## Quick Start

### Option 1: Docker (mount as Jellyfin web root)

```bash
git clone https://github.com/FikriNasarudin/zaflix.git
cd zaflix
git checkout release
```

Then mount the directory into your Jellyfin container:

```yaml
services:
  jellyfin:
    image: jellyfin/jellyfin
    volumes:
      - /path/to/zaflix:/jellyfin/jellyfin-web:ro
```

### Option 2: Build from source

```bash
git clone https://github.com/FikriNasarudin/zaflix.git
cd zaflix
git checkout staging
npm install
npm run build:production
```

Copy the `dist/` folder to your web server or mount it into your Jellyfin container.

### Option 3: Development server

```bash
git clone https://github.com/FikriNasarudin/zaflix.git
cd zaflix
npm install
npm start
```

Open `http://localhost:8080` and connect to your Jellyfin server.

---

## Project Structure

| Path | Description |
|------|-------------|
| `src/apps/modern/` | React-based modern app (Zaflix components) |
| `src/apps/modern/components/` | Billboard, MediaRow, DetailsModal, EndScreen, BottomNav |
| `src/apps/modern/hooks/` | React Query hooks for data fetching |
| `src/apps/modern/styles/` | CSS overrides and theme constants |
| `src/apps/modern/routes/` | Page components (home, search, video, movies, shows) |
| `src/apps/legacy/` | Original Jellyfin Web UI (unchanged) |
| `src/components/` | Shared components used by both modern and legacy apps |

---

## License

This project inherits the **GNU General Public License v2.0** from the Jellyfin Web project.
