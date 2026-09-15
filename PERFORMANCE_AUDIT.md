# Performance optimization report

## Scope and baseline

Audited Next.js **16.3.4**, React **19.2.8**, App Router, and the installed Next.js documentation. The initial working tree was clean. No dependencies, experimental settings, authentication rules, or cache lifetimes were changed.

| Routes | Rendering strategy, unchanged |
| --- | --- |
| `/`, `/news` | Prerendered, hourly revalidation of public Steam news |
| `/heroes`, `/artifacts`, `/bosses`, `/softcap`, `/stats`, `/team-builder` | Static route output with client interactions |
| Hero, artifact, and boss details; intercepted detail routes | Empty `generateStaticParams` in server deployments: generated on demand; explicit prerendering in static exports |
| `/api/list-model-files` | Dynamic filesystem API |

The global sidebar wrapper previously returned `null` until mounting, preventing visible page content from being server-rendered despite static route generation. Version-sensitive pages also have their own hydration gates to restore localStorage preferences.

Data comes from local JSON/assets and Steam RSS/API fallbacks. There is no application database, authentication layer, middleware/proxy, analytics SDK, or third-party tracking script in the request path. `scripts/kr-proxy.js` is a separate deployment helper. Global theme/version/comparison providers support real interactions. Three.js viewers and global search already had dynamic boundaries. Fonts already use `next/font`; metadata and static-export image configuration already exist.

## Issues addressed and changes

| Files | Change and benefit | Trade-off |
| --- | --- | --- |
| `components/sidebar/sidebar-provider-with-storage.tsx` | Removed the application-wide mount gate. The shell and suitable page content now render before JavaScript; initial server and client sidebar state match. | More HTML is sent because visible markup is now present. A saved collapsed sidebar is restored after hydration and can still move content. |
| `app/home.tsx`, `components/steam-news-carousel.tsx`, `app/page.tsx` (replacing `app/client.tsx`) | Kept home introduction/community markup on the server; isolated carousel/dialog state in a client component. | Carousel interactions still hydrate normally. |
| `app/stats/page.tsx`, `types.ts`, `client.tsx`, `components/hero-section.tsx` | Compute hero comparison summaries during prerendering using the existing diff algorithm. Send identity, status, and change counts instead of complete hero records. Read independent JSON collections concurrently with async filesystem I/O. | Build computes every supported version pair. Detailed comparison data remains inline so expanding a hero or switching versions requires no new request. |
| `components/sidebar/client-sidebar.tsx` | Prefetch the two largest tools, Stats and Team Builder, on mouse hover or keyboard focus instead of simply entering the viewport. | A click without prior hover/focus may wait for route data. |
| `components/sidebar/sidebar-inset-client.tsx`, `components/ui/{button,dialog,separator,sheet,sidebar,tooltip}.tsx` | Use direct comparison/primitive imports instead of broad barrels. Reuse already installed Radix packages. | No component API or dependency changes. |
| `app/heroes/[...slug]/models/{getCostumes,getHeroModels,getVoices}.ts` | Request-scoped React caching shares identical asset lookups across data versions. Costume enumeration is async and avoids a redundant existence check. | Cache ends with the request; no new persistent stale-data risk. |
| `app/api/list-model-files/route.ts` | Async directory enumeration replaces blocking existence/read calls. Existing successful response format and missing-path/directory statuses are preserved. | No persistent caching of runtime asset directories. |
| `components/models/ModelViewer.tsx` | Import JSZip on model download and the GIF converter on GIF export. | First use fetches a deferred module; existing error handling remains active. |
| `app/artifacts/client.tsx`, `app/bosses/client.tsx`, `app/heroes/[...slug]/client.tsx`, `app/home.tsx` | Replace invalid viewport hints with actual 40/64/80px image sizes and nonzero intrinsic dimensions. | Image optimization remains disabled in static-export mode as before. |
| `.dockerignore` | Exclude local model/audio/data repositories, Python environment, agent files, and TypeScript build metadata from Docker context. The Dockerfile already clones the asset repositories in dedicated stages. | Docker continues to obtain asset revisions through its existing clone process. |
| `app/team-builder/utils.ts`, `utils.test.ts` | Validation found a pre-existing mismatch: the version extractor read two bits while both encoder and decoder use three. Corrected it and added round-trip tests for every data version. | Existing three-bit URL format is unchanged; shared teams now select the correct hero collection. |

## Measurements

Local production builds, same machine and data. Decimal KB/MB. HTML sizes are response bytes; gzip values are locally compressed response bodies. JavaScript values sum the script files referenced by each route's HTML, including the compatibility/nomodule script; they are **not** field-measured First Load JS. Next.js 16's build output does not report the old First Load JS table.

| Measurement | Before | After |
| --- | ---: | ---: |
| Stats HTML | 2,831,016 B | 1,371,404 B (**51.6% smaller**) |
| Stats HTML, gzip | 626,983 B | 186,539 B (**70.2% smaller**) |
| Stats referenced JS | 920,684 B | 834,501 B |
| Stats referenced JS, summed gzip | 281,103 B | 260,686 B |
| Home referenced JS | 892,300 B | 834,469 B |
| News referenced JS | 892,300 B | 812,059 B |
| Softcap referenced JS | 896,253 B | 807,412 B |
| Home startup script requests, including automatic prefetch | 28 | 24 |
| Home visible content without JavaScript | Absent | Present |
| Eager desktop prefetch of Stats/Team Builder | Both | Neither; deferred until intent |
| Identical hero model/voice/costume helper calls across versions | Up to 4 executions per helper | 1 per distinct argument per request |
| Turbopack asset-tracing warnings | 28 | 27 |
| Production compilation, single samples | 20.2 s | 25.9 s |

Compilation varied across warm builds and concurrent validation; **no build-speed improvement is claimed**. Home HTML grew from approximately 85 KB to 164 KB, news from 97 KB to 182 KB, and Team Builder from 1.91 MB to 1.93 MB because removing the global gate includes real server markup. Hero-detail payload sizes also vary with request-scoped reference deduplication.

LCP, INP, CLS, TTFB under concurrent production traffic, peak memory, and container image size were not measured reliably enough for before/after claims. No database-query reduction applies to this filesystem-backed application.

## Validation

- Production build passes with models/voices enabled in the local configuration.
- Static export passes: **269 pages**, `/krinfo` base path, models/voices disabled, API/intercepting routes omitted exactly as in the Pages workflow. Checked home, hero detail, and stats in a browser against exported files.
- `node node_modules/typescript/bin/tsc --noEmit` passes.
- `npm run lint` passes with the same two pre-existing warnings in `scripts/kr-proxy.js`; the existing browser-mapping freshness notice remains.
- `bun test app/team-builder/utils.test.ts`: **4 passed**, covering hero identity, version, equipment and perk selections for all versions.
- Production browser checks cover nine routes, desktop/mobile navigation, sidebar persistence, Ctrl+K search, intercepted detail opening/dismissal, hero tabs, version comparison, team selection and shared-URL reload, and home rendering without JavaScript.
- Stats hero-index text and the expanded Kasel comparison match the captured pre-change text exactly.
- Model listing checks preserve valid file lists, HTTP 400 for missing path, and HTTP 404 for missing directory.
- No hydration errors or uncaught browser exceptions were observed in these flows.
- Docker daemon is unavailable locally, so container execution/image-size claims are excluded. Interactive 3D animation, recording, and actual ZIP/GIF exports were not exhaustively exercised.

## Remaining opportunities

**High impact**

- Generate bounded model/audio asset manifests instead of broad runtime filesystem patterns. The remaining 27 tracing warnings include tens of thousands of file matches. Requires coordinating asset publication and runtime mounts; hiding the patterns would risk missing deployment files.
- Further reduce Team Builder's 1.93 MB HTML payload and Stats' remaining inline comparison data. Loading selected versions/details on demand requires loading/error/offline behavior decisions and static-export support.
- Resolve per-page hydration gates and preference-related layout shifts with a deliberate preference/SSR strategy. Home now renders early, but version-sensitive pages still wait for saved preferences.
- Add production Web Vitals and route/asset timing telemetry before choosing LCP preloads, rendering priorities, or concurrency limits.

**Medium impact**

- Serve model/audio files through a CDN with versioned cache keys, and bound or parallelize model export downloads based on realistic asset sizes and client memory.
- Evaluate a standalone, non-root Docker runtime. The current Dockerfile already uses multiple stages and a production dependency installation, but also installs TypeScript at runtime and expects optional assets to arrive separately. Validate complete tracing and runtime asset availability before changing packaging.
- Review detail-page Open Graph URLs for static deployments: manually constructed `/_next/image` URLs do not exist on a static host. Canonicals and a sitemap also merit a separate SEO pass.

**Low impact**

- Audit mono-font preload and remaining image `sizes` declarations against representative viewports; retain typography and avoid guessing the LCP element.
- Review unused/duplicate dependency declarations and the two lockfiles separately from this optimization. No lockfile churn or dependency removal was introduced here.

Temporary validation output remains under ignored `build/static-export-check/`: automatic approval review rejected recursive cleanup without providing a detailed reason. Junctions to the application's original assets and dependencies were removed safely; the original directories are intact.
