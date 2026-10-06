import { parseSteamImageUrl } from "@/lib/steam-images"
import { getSteamProxyOptions } from "@/lib/steam-proxy"

export const runtime = "nodejs"

const cacheSeconds = 24 * 60 * 60
const maxImageBytes = 20 * 1024 * 1024
const imageTypes = new Set(["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif", "image/bmp"])

function failure(message: string, status: number) {
	return new Response(message, { status, headers: { "Cache-Control": "no-store" } })
}

export async function GET(request: Request) {
	const value = new URL(request.url).searchParams.get("url")
	const url = value ? parseSteamImageUrl(value) : null
	if (!url) return failure("Invalid Steam image URL", 400)

	const controller = new AbortController()
	const timeout = setTimeout(() => controller.abort(), 20_000)
	try {
		const image = await fetch(url.href, {
			...getSteamProxyOptions(),
			redirect: "error",
			signal: controller.signal,
			next: { revalidate: cacheSeconds },
		})
		if (!image.ok) {
			await image.body?.cancel()
			return failure("Steam image unavailable", image.status === 404 || image.status === 410 ? image.status : 502)
		}
		const contentType = image.headers.get("content-type")?.split(";")[0].trim().toLowerCase()
		if (!contentType || !imageTypes.has(contentType)) {
			await image.body?.cancel()
			return failure("Unsupported Steam image type", 502)
		}
		if (Number(image.headers.get("content-length")) > maxImageBytes) {
			await image.body?.cancel()
			return failure("Steam image is too large", 502)
		}
		const data = await image.arrayBuffer()
		if (data.byteLength > maxImageBytes) return failure("Steam image is too large", 502)
		return new Response(data, {
			headers: {
				"Content-Type": contentType,
				"Content-Length": String(data.byteLength),
				"Cache-Control": `public, max-age=${cacheSeconds}, s-maxage=${cacheSeconds}`,
				"X-Content-Type-Options": "nosniff",
			},
		})
	} catch (error) {
		console.warn("Error fetching Steam image:", error)
		return failure("Steam image unavailable", controller.signal.aborted ? 504 : 502)
	} finally {
		clearTimeout(timeout)
	}
}
