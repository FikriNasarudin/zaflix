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

## 🛠️ How to Run and Use

> [!IMPORTANT]  
> The code in this repository is the **frontend web interface** only. To stream media, it must connect to a running Jellyfin media server backend.

### Local Development (Frontend Only)

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

## 🐳 Deploying to a Docker Jellyfin Server

If you already have a running Jellyfin server in Docker, you can apply your compiled custom UI using one of two methods:

### Method 1: The Quick Test (`docker cp`) — *No restarts required*
Use this to copy built files directly into your running container:

1. **Compile your production files**:
   ```bash
   npm run build:production
   ```
2. **Copy files directly into the container**:
   ```bash
   docker cp ./dist/. <your-container-name-or-id>:/jellyfin/jellyfin-web/
   ```
   *(Replace `<your-container-name-or-id>` with your running Jellyfin container name).*
3. Refresh your browser (do a hard refresh with `Ctrl + F5` to clear cache).
   *(Note: If the container is recreated or updated, this copy will be reset.)*

### Method 2: Permanent Volume Mount — *Recommended*
Mount the compiled `dist` directory as a volume to keep it persistent.

* **Docker Compose**: Add the mount to your volumes list:
  ```yaml
  services:
    jellyfin:
      image: jellyfin/jellyfin
      # ... your existing configs ...
      volumes:
        - ./dist:/jellyfin/jellyfin-web:ro
  ```

* **Docker Run CLI**: Add the `-v volume flag**:
  ```bash
  docker run -d \
    --name jellyfin \
    -v $(pwd)/dist:/jellyfin/jellyfin-web:ro \
    # ... your existing port/volume flags ...
    jellyfin/jellyfin
  ```

> [!TIP]
> **Can I use `git` and `curl` directly inside my Jellyfin server?**  
> **No.** The official Jellyfin Docker image is minimal and secure, meaning development/download utilities like `git` or `curl` are not installed inside the container.  
> **Best Practice**: Always clone, pull, and compile this repository on your **host machine** (where you run Docker) using `git` and `npm`, and then mount the output `dist` folder into the container using **Method 2** above. This keeps your running container lightweight, clean, and secure.

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
