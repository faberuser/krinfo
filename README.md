# King's Raid Info

A web application that provides a number of data from the mobile game King's Raid.

## Data and 3D Model Files

Data and illustrations are stored in [kingsraid-data](https://github.com/faberuser/kingsraid-data) (required). 3D model and audio files are in self-hosted Git servers [kingsraid-models](https://gitea.k-clowd.top/faberuser/kingsraid-models) and [kingsraid-audio](https://gitea.k-clowd.top/faberuser/kingsraid-audio) due to their large size (optional).

**By default**, only the `kingsraid-data` submodule is used to keep the repository size manageable. The models and audio submodules are optional and only needed if you want the Models and Voices features (total size ~40GB).

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/)
- Git

### Installation

Firstly, clone the repository:

```bash
git clone https://github.com/faberuser/kingsraid.git
cd kingsraid
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
docker build -t kingsraid .
```

2. Run the container:

```bash
docker run -p 3000:3000 kingsraid
```

### Full Build (with Models and Voices)

To include 3D models and voices:

1. Build the image with the environment variable:

```bash
docker build --build-arg NEXT_PUBLIC_ENABLE_MODELS_VOICES=true -t kingsraid .
```

2. Run the container:

```bash
docker run -p 3000:3000 kingsraid
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

## Environment Variables

Create a `.env` file for local usage. See `.env.example` for all available options.

### Environment Variables:

- `NEXT_PUBLIC_ENABLE_MODELS_VOICES`: Set to "true" to enable Models and Voices features (optional, default: false)
- `NEXT_PUBLIC_BASE_PATH`: Base path for the application (e.g., "/kingsraid" for GitHub Pages) (optional)
- `NEXT_STATIC_EXPORT`: Set to "true" when building for static export (optional, default: false)
- `NEXT_PUBLIC_SITE_URL`: Site URL for metadata (optional)
- `DOCKER_IMAGE`: Docker Compose's image, mostly for custom registry in case you want full build (optional, default: "ghcr.io/faberuser/kingsraid:latest")
- `CONTAINER_NAME`: Docker Compose's container name (optional, default: "kingsraid")
- `DOCKER_PORT`: Docker Compose's container port (optional, default: 3000)

## Known Bugs

- 3D models doesn't have face expressions.
- There are several 3D models having face detached/wrong position
  (Exported from AssetStudio, would appriciate if anyone know how to fix)
