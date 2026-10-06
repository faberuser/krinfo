# krinfo

A web application that provides a number of data from the mobile game King's Raid.

## Features

- **Hero Database**: Detailed information on heroes, including profile, skills, perks, unique weapons, unique treasures, soul weapons, splasharts, costumes, 3D models and voice lines.
- **Artifacts & Bosses**: Comprehensive list of game artifacts and detailed boss information.
- **Team Builder**: Plan and create your ideal team compositions.
- **Softcaps**: View detailed statistics and softcap thresholds for optimized builds.
- **Stats**: Compare stat numbers between versions.
- **Compare Tool**: Compare different heroes or artifacts side-by-side.
- **3D Model Viewer**: Web-based interactive 3D models of the heroes via Three.js.
- **News Feed**: Catch up with the latest King's Raid news via Steam RSS.
- **Languages**: Switch the interface and available game translations using the language dropdown beside the data-version selector. Translation sources and generation tools live in `kingsraid-table-data/website-data/`.

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

## Environment Variables

Create a `.env` file for local usage. See `.env.example` for all available options.

### Environment Variables:

- `NEXT_PUBLIC_ENABLE_MODELS_VOICES`: Set to "true" to enable Models and Voices features (optional, default: false)
- `NEXT_PUBLIC_BASE_PATH`: Base path for the application (e.g., "/krinfo" for GitHub Pages) (optional)
- `NEXT_STATIC_EXPORT`: Set to "true" when building for static export (optional, default: false)
- `NEXT_PUBLIC_SITE_URL`: Site URL for metadata (optional)
- `DOCKER_IMAGE`: Docker Compose's image, mostly for custom registry in case you want full build (optional, default: "ghcr.io/faberuser/krinfo:latest")
- `CONTAINER_NAME`: Docker Compose's container name (optional, default: "krinfo")
- `DOCKER_PORT`: Docker Compose's container port (optional, default: 3000)

## Game-data maintenance

Game-data builders and translation sources live in the sibling
`kingsraid-table-data/website-data/` project. See its `README.md` for rebuilding
and publishing data. This website consumes generated files from the
`public/kingsraid-data` submodule; it does not run the game-data pipeline during builds.

## Localization

Website UI uses `next-intl` with generated, named message catalogs in
`messages/`. The language dropdown keeps the current URL and saves a
`krinfo-language` cookie. Server deployments resolve that cookie (or the browser's
Accept-Language preference) before rendering. Existing localStorage preferences
are migrated on the first visit without a cookie.

Static exports use the same dropdown and messages. They display a loading
placeholder until the browser preference and translations are ready. Localized
game records also wait for their requested locale before becoming visible;
failed requests show the existing fallback notice. Known incomplete game
translations remain English, as recorded by the data pipeline.

Translation sources and stable UI message IDs live in the sibling
`kingsraid-table-data/website-data/locales/` directory. Run its
`node website-data/scripts/generate-ui-locales.mjs` command from that repository
to publish catalogs and the generated dynamic-label mapping. Use
`<Text messageKey="uiLanguage" />` or `useTranslations()` for named UI messages.
Dynamic labels from game metadata retain a compatibility adapter; gameplay
records continue to load from `table-data/{version}/{locale}/`.

Checks: `bun run test:localization`, `bunx tsc --noEmit`, and
`node tests/i18n-browser.cjs` against a production server (default port 3119).
Set `TEST_BASE` for another URL and `STATIC_TEST=true` for an exported site.
The browser test uses Playwright from `build/browser-tools` or `PLAYWRIGHT_MODULE`.
Static builds still use the API/intercepting-route exclusions in the existing
GitHub Pages workflow.

Game entities use stable `id` values and localized `name` values: all entities store `id` first at the root. Hero/boss localized names remain
in `profile.name`; artifact/rune names stay at the top level.
URLs, assets, release order, and saved teams use IDs. Lists search the selected
language's names, canonical IDs, and aliases directly with Fuse; there is no
translation-based search adapter. Existing English IDs and team URL ordering
are unchanged. Costume/voice file metadata has its own display labels.
