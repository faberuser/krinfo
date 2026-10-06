// Share URL validation between feed rewriting and the server image endpoint.
export function parseSteamImageUrl(value: string): URL | null {
	try {
		const decoded = value.replace(/&(?:amp|#0*38|#x0*26);/gi, "&")
		const url = new URL(decoded.startsWith("//") ? `https:${decoded}` : decoded)
		if (
			(url.protocol !== "https:" && url.protocol !== "http:") ||
			!url.hostname.endsWith(".steamstatic.com") ||
			!url.pathname.startsWith("/images/") ||
			url.username || url.password || (url.port && url.port !== "443")
		) return null
		url.protocol = "https:"
		url.hash = ""
		return url
	} catch {
		return null
	}
}

export function proxySteamImages(html: string, basePath = ""): string {
	const proxyUrl = (value: string) => {
		const url = parseSteamImageUrl(value)
		return url ? `${basePath}/api/steam-image?url=${encodeURIComponent(url.href)}` : value
	}
	return html.replace(/<(?:img|source)\b[^>]*>/gi, (tag) =>
		tag.replace(/([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g,
			(attribute: string, name: string, doubleQuoted?: string, singleQuoted?: string, unquoted?: string) => {
				const value = doubleQuoted ?? singleQuoted ?? unquoted ?? ""
				const lowerName = name.toLowerCase()
				const replacement = lowerName === "src" || lowerName === "data-src"
					? proxyUrl(value)
					: lowerName === "srcset" || lowerName === "data-srcset"
						? value.replace(/(?:https?:)?\/\/[^\s,]+/gi, proxyUrl)
						: value
				return replacement === value ? attribute : `${name}="${replacement}"`
			},
		),
	)
}
