# Zaflix

Zaflix is a React + Vite web application containerized with Docker and integrated with a GitHub Actions CI/CD pipeline.

## Features

- **React & Vite**: Extremely fast development server and optimized build process.
- **Docker Support**: Preconfigured `Dockerfile` utilizing multi-stage builds (`node:20-alpine` + `nginx:alpine`) to minimize final image size.
- **Docker Compose**: Single-command local environment startup.
- **CI/CD Integration**: Automatic Docker builds and pushes to GitHub Container Registry (GHCR) on pushes to the `main` branch.

---

## Local Development

### 1. Traditional Node.js
Ensure you have Node.js installed, then run:

```bash
# Install dependencies
npm install

# Run dev server (will expose on host)
npm run dev

# Build for production
npm run build
```

### 2. Run with Docker Compose
If you have Docker Desktop installed and running, you can run the built production version of the app locally:

```bash
# Build and start the container
docker compose up -d --build
```
Once started, access the application at **`http://localhost:8080`**.

---

## CI/CD Pipeline & GitHub Container Registry

The repository contains a GitHub Actions workflow under `.github/workflows/docker-publish.yml`. When you push to the `main` branch, the workflow will:

1. Checkout the source code.
2. Build the production Docker image.
3. Authenticate with the GitHub Container Registry (`ghcr.io`).
4. Publish the built image to your repository's packages (tagged as `latest` and with the commit SHA).

### Deploying to GitHub

To link this local project to your GitHub repository and activate the pipeline:

```bash
# Stage and commit files
git add .
git commit -m "Initial commit with Docker and CI/CD workflow"

# Rename local branch to main
git branch -m main

# Link your remote GitHub repository
git remote add origin git@github.com:<YOUR_GITHUB_USERNAME>/zaflix.git

# Push to GitHub
git push -u origin main
```

---

## Homelab Deployment

To deploy this application to your homelab using Docker Compose, you can pull the prebuilt image from the GitHub Container Registry (GHCR) rather than compiling the source code locally.

Create a `docker-compose.yml` in your homelab deployment directory:

```yaml
version: '3.8'

services:
  zaflix:
    image: ghcr.io/fikrinasarudin/zaflix:latest
    container_name: zaflix-web
    ports:
      - "8080:80"
    restart: unless-stopped
```

Run the container:
```bash
docker compose up -d
```
