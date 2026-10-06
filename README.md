# krinfo

A web application that provides a number of data from the mobile game King's Raid.

## Features

- **Hero Database**: Detailed information on heroes, including profile, skills, perks, unique weapons, unique treasures, soul weapons, splasharts, costumes, 3D models and voice lines.
- **Artifacts & Bosses**: Comprehensive list of game artifacts and detailed boss information.
- **Team Builder**: Plan and create your ideal team compositions.
- **Softcaps**: View detailed statistics and softcap thresholds for optimized builds.
- **Stats**: Compare heroes, class perks and runes between any two versions. Details load in the selected language when a card opens. The data pipeline maintains one `comparison-index.json` per version.
- **Compare Tool**: Compare different heroes or artifacts side-by-side.
- **3D Model Viewer**: Web-based interactive 3D models of the heroes via Three.js.
- **News Feed**: Catch up with the latest King's Raid news via Steam RSS.
- **Languages**: Switch the interface and available game translations.

_Data being used includes before doomsday (Vespa) and distributed by Masangsoft (currently 3 CBTs)._

## Getting Started

### Data and 3D Model Files

Data and illustrations are stored in [kingsraid-data](https://github.com/faberuser/kingsraid-data) (required). 3D model and audio files are in self-hosted Git servers [kingsraid-models](https://gitea.k-clowd.top/faberuser/kingsraid-models) and [kingsraid-audio](https://gitea.k-clowd.top/faberuser/kingsraid-audio) due to their large size (optional).

**By default**, only the `kingsraid-data` submodule is used to keep the repository size manageable. The models and audio submodules are optional and only needed if you want the Models and Voices features (total size ~40GB).

### Prerequisites

- [Bun](https://bun.sh/)
- Git

### Installation

Firstly, clone the repository:

```bash
git clone https://github.com/faberuser/krinfo.git
cd krinfo
```

### Default Setup

This setup includes only the required data and is suitable for most deployments:

1. Initialize basic data submodule:

```bash
git submodule update --init public/kingsraid-data
```

2. Install dependencies:

```bash
bun install
```

3. Run the development server:

```bash
bun dev
```

The Models and Voices tabs will be disabled by default.

### Full Setup (with Models & Voices)

If you want the 3D model viewer and voice lines features:

1. Clone the optional repositories:

```bash
git clone https://gitea.k-clowd.top/faberuser/kingsraid-models public/kingsraid-models
git clone https://gitea.k-clowd.top/faberuser/kingsraid-audio public/kingsraid-audio
```

2. Create environment file to enable these features:

Linux:

```bash
echo "NEXT_PUBLIC_ENABLE_MODELS_VOICES=true" > .env
```

Windows:

```bash
"NEXT_PUBLIC_ENABLE_MODELS_VOICES=true" | Out-File -FilePath .env -Encoding utf8
```

3. Install dependencies:

```bash
bun install
```

4. Run the development server:

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Docker Deployment

The application can be deployed using Docker:

### Default Build

1. Build the image:

```bash
docker build -t krinfo .
```

2. Run the container:

```bash
docker run -p 3000:3000 krinfo
```

### Full Build (with Models and Voices)

To include 3D models and voices:

1. Build the image with the environment variable:

```bash
docker build --build-arg NEXT_PUBLIC_ENABLE_MODELS_VOICES=true -t krinfo .
```

2. Run the container:

```bash
docker run -p 3000:3000 krinfo
```

### Using Docker Compose

Due to GHCR limitation, Docker image only support standard version.

**To use the pre-built image (default, no build):**

```bash
docker-compose up -d
```

**To build:**

```bash
docker-compose -f docker-compose.yml -f docker-compose.build.yml up -d --build
```

The application will be available at [http://localhost:3000](http://localhost:3000) (or the port specified in your environment).

### Steam Proxy

If your server cannot access Steam, set this in the Compose `.env` file or
Portainer stack environment variables, then recreate the container:

```dotenv
STEAM_NEWS_PROXY=http://192.168.1.9:1080
```

This runtime setting covers Steam RSS, the News API fallback, and news images.
Both thumbnails and images inside articles load from our server through
`/api/steam-image`. The endpoint uses the configured proxy and caches images for
24 hours. Leave the setting empty for direct connections. Use an HTTP or HTTPS
proxy URL; the proxy must be reachable from inside the container.

Static exports such as GitHub Pages keep the original Steam image URLs because
they have no server to run this endpoint.

## Environment Variables

Create a `.env` file for local usage. See `.env.example` for all available options.

### Environment Variables:

- `NEXT_PUBLIC_ENABLE_MODELS_VOICES`: Set to "true" to enable Models and Voices features (optional, default: false)
- `NEXT_PUBLIC_BASE_PATH`: Base path for the application (e.g., "/krinfo" for GitHub Pages) (optional)
- `NEXT_STATIC_EXPORT`: Set to "true" when building for static export (optional, default: false)
- `NEXT_PUBLIC_SITE_URL`: Site URL for metadata (optional)
- `STEAM_NEWS_PROXY`: Server-only HTTP/HTTPS proxy URL for Steam news and images (optional, empty connects directly; configurable at Docker runtime)
- `DOCKER_IMAGE`: Docker Compose's image, mostly for custom registry in case you want full build (optional, default: "ghcr.io/faberuser/krinfo:latest")
- `CONTAINER_NAME`: Docker Compose's container name (optional, default: "krinfo")
- `DOCKER_PORT`: Docker Compose's container port (optional, default: 3000)
