# Zaflix (Customized Jellyfin Web Client)

This repository is a customized version of the official **[Jellyfin Web Client](https://github.com/jellyfin/jellyfin-web)**, styled with the sleek, dark, glassmorphic **Zaflix** theme.

---

## 📂 Workspace Layout

- **Root Directory (`/`)**: Holds the customized `jellyfin-web` codebase.
- **[`/react`](./react)**: Holds the original standalone custom React + Vite client.

---

## 🎨 Theme Customization Details (Zaflix Style)

The official Jellyfin Web client styling has been customized with the following design tokens:
* **Background Color**: `#0a0614` (Deep velvet violet)
* **Card & Panel Backgrounds**: `#140d27` (Dark amethyst)
* **Accent & Primary Colors**: `#c26df0` (Neon purple/magenta) with `#d991ff` hover/glow highlights
* **Divider & Action Borders**: `rgba(211, 82, 255, 0.2)`
* **Typography**: Integrated Google Fonts (`Outfit` for headings and brand elements, `Inter` for standard UI copy)
* **Aesthetics**: Glassmorphism on headers, neon outline inputs, smooth cubic scaling cards on hover, and glowing linear gradients on primary buttons.

---

## 🛠️ Local Development (Frontend Only)

To run the custom UI locally and connect it to your existing backend server:

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the development server**:
   ```bash
   npm start
   ```
   *This starts the Webpack dev server, which will compile your custom styling and host the site (usually on `http://localhost:8080`).*

3. **Connect to your server**:
   - Open your browser to the URL displayed in the terminal (e.g., `http://localhost:8080`).
   - Enter the IP address/domain and credentials of your backend Jellyfin server to log in and test your customized interface.

---

## 🚀 CI/CD Automated Deployment (Recommended)

A GitHub Actions workflow is configured in [deploy.yml](.github/workflows/deploy.yml) to automatically compile and deploy your code. The local `dist` folder remains in `.gitignore` on your development branch (`staging`).

### How it works:
1. When you push your code modifications to the **`staging`** branch, the GitHub Action automatically runs, installs Node 24, compiles your UI via `npm run build:production`, and pushes the compiled files directly into a clean **`release`** branch.
2. The `release` branch contains the ready-to-serve web assets at its root.

### Setup on your Server:

To deploy the compiled files on your server:

1. **Clone and checkout the `release` branch**:
   ```bash
   # Go to your media-server directory
   cd /shares/usb-storage/media-server/jellyfin
   
   # Clone (or go into the existing folder)
   cd zaflix
   
   # Checkout the release branch (only contains compiled static assets)
   git fetch origin
   git checkout release
   ```

2. **To update the UI in the future**:
   Simply run this on your server when you push changes to staging (wait a minute for the CI/CD to finish building):
   ```bash
   git pull
   ```

---

## 🐳 Running on Docker Jellyfin Server

Update your Docker volume configurations on the server to point to the root of the **`release`** branch repository path (since the compiled assets are directly in the root of the branch, not inside a `dist/` subfolder):

### Docker Compose
```yaml
services:
  jellyfin:
    image: jellyfin/jellyfin
    # ... your existing configs ...
    volumes:
      - /shares/usb-storage/media-server/jellyfin/zaflix:/jellyfin/jellyfin-web:ro
```

### Docker Run CLI
```bash
docker run -d \
  --name jellyfin \
  -v /shares/usb-storage/media-server/jellyfin/zaflix:/jellyfin/jellyfin-web:ro \
  # ... your other mounts ...
  jellyfin/jellyfin
```

---

## ⚙️ Original Standalone React Client (Vite)
If you want to run the standalone React client:
```bash
cd react
npm install
npm run dev
```
Check out the **[React Client README](./react/README.md)** for details on homelab and Docker compose deployment.

---

## ⚖️ License
This project inherits the original **GNU General Public License v2.0** of the Jellyfin Web project.
