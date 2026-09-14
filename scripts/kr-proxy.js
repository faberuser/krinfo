export default {
	async fetch(request) {
		const HOME_SERVER = "https://kingsraid-real.k-clowd.top"
		// Define the base URL of the backup (without trailing slash)
		const BACKUP_SERVER = "https://faberuser.github.io"
		const BACKUP_BASE_PATH = "/krinfo" // Or "/krinfo-error"

		const url = new URL(request.url)
		const isOptimizedImage = url.pathname === "/_next/image"
		const isStatic = isOptimizedImage || /\.(png|jpg|jpeg|gif|css|js|ico|svg|woff2|webp|fbx|wav|json)$/i.test(url.pathname)

		// Helper to fetch from backup if home fails
		const fetchBackup = async () => {
			const backupUrl = new URL(request.url)
			backupUrl.hostname = new URL(BACKUP_SERVER).hostname

			// GitHub Pages has the original files, but no Next.js image optimizer.
			if (isOptimizedImage) {
				const source = url.searchParams.get("url")
				// Only map local public assets; never fetch arbitrary remote sources.
				if (!source || !source.startsWith("/") || source.startsWith("//")) {
					return new Response("Image backup unavailable", { status: 502 })
				}
				const imageUrl = new URL(source, url.origin)
				if (imageUrl.origin !== url.origin || !imageUrl.pathname.startsWith("/kingsraid-data/assets/")) {
					return new Response("Image backup unavailable", { status: 502 })
				}
				backupUrl.pathname = imageUrl.pathname
				backupUrl.search = imageUrl.search
			}

			// If your Github Pages deployment uses /krinfo as the base path,
			// we need to ensure it's in the path we fetch
			if (backupUrl.pathname !== BACKUP_BASE_PATH && !backupUrl.pathname.startsWith(`${BACKUP_BASE_PATH}/`)) {
				backupUrl.pathname = `${BACKUP_BASE_PATH}${backupUrl.pathname === "/" ? "" : backupUrl.pathname}`
			}

			// We explicitly DO NOT pass the original request headers (like `Host`)
			// so Cloudflare resolves the GitHub Pages host correctly.
			return fetch(backupUrl.toString(), {
				method: request.method,
			})
		}

		let timeoutId = null
		try {
			// 1. Setup Home Server URL
			const homeUrl = new URL(request.url)
			homeUrl.hostname = new URL(HOME_SERVER).hostname

			const controller = new AbortController()
			// Optimized images can take longer on a cold cache, just like static files.
			// Apply the 3-second timeout only to page/app requests.
			if (!isStatic) {
				timeoutId = setTimeout(() => controller.abort(), 3000)
			}

			// 2. Fetch from Home Server
			const response = await fetch(homeUrl.toString(), {
				method: request.method,
				headers: request.headers,
				signal: controller.signal,
				redirect: "manual",
			})

			if (timeoutId) clearTimeout(timeoutId)

			// Release the failed response before opening the backup connection.
			if (response.status >= 500) {
				await response.body?.cancel()
				return fetchBackup()
			}

			return response
		} catch (e) {
			// 4. Fallback on network failure or Timeout
			return fetchBackup()
		} finally {
			if (timeoutId) clearTimeout(timeoutId)
		}
	},
}
