import { connection } from "next/server"
import { getSteamProxyOptions } from "@/lib/steam-proxy"
import { proxySteamImages } from "@/lib/steam-images"

export interface NewsItem {
	title: string
	url: string
	date: string
	contents: string
	/** Precomputed: whether the item is less than 7 days old */
	isNew: boolean
	/** Precomputed: formatted date string for display */
	formattedDate: string
}

const APP_ID = 3689540
const REVALIDATE_SECONDS = 60 * 60
const REQUEST_TIMEOUT_MS = 10_000
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000

// Steam exposes the same feed on two hosts. Querying both prevents a temporary
// outage or block on one host from making the whole news section disappear.
const RSS_URLS = [
	`https://store.steampowered.com/feeds/news/app/${APP_ID}/?cc=us&l=english`,
	`https://steamcommunity.com/games/${APP_ID}/rss/`,
]

const API_URL = `https://api.steampowered.com/ISteamNews/GetNewsForApp/v0002/?appid=${APP_ID}&count=100&maxlength=0&format=json`

function decodeXmlEntities(value: string): string {
	return value
		.replace(/&#x([\da-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
		.replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 10)))
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&apos;|&#39;/g, "'")
		.replace(/&amp;/g, "&")
}

function extractXmlTag(tag: string, content: string): string {
	const tagPattern = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i")
	const match = content.match(tagPattern)
	if (!match) return ""

	const value = match[1].trim()
	const cdataMatch = value.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/)
	return (cdataMatch?.[1] ?? value).trim()
}

function createNewsItem(title: string, url: string, date: string, contents: string, now: number): NewsItem | null {
	const dateMs = new Date(date).getTime()
	if (!title || !url || !Number.isFinite(dateMs)) return null

	return {
		title,
		url,
		date,
		contents,
		isNew: now - dateMs >= 0 && now - dateMs < ONE_WEEK_MS,
		formattedDate: new Date(dateMs).toLocaleDateString(),
	}
}

export function parseSteamRss(xml: string, now = Date.now()): NewsItem[] {
	if (!/<rss(?:\s|>)/i.test(xml)) {
		throw new Error("Steam returned a response that is not RSS")
	}

	const items: NewsItem[] = []
	const itemPattern = /<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi
	let match: RegExpExecArray | null

	while ((match = itemPattern.exec(xml)) !== null) {
		const itemContent = match[1]
		const item = createNewsItem(
			decodeXmlEntities(extractXmlTag("title", itemContent)),
			decodeXmlEntities(extractXmlTag("link", itemContent)),
			decodeXmlEntities(extractXmlTag("pubDate", itemContent)),
			decodeXmlEntities(extractXmlTag("description", itemContent)),
			now,
		)

		if (item) items.push(item)
	}

	if (items.length === 0) throw new Error("Steam RSS response contained no valid news items")
	return items
}

interface SteamApiNewsItem {
	title?: string
	url?: string
	date?: number
	contents?: string
}

interface SteamApiResponse {
	appnews?: { newsitems?: SteamApiNewsItem[] }
}

function steamBbcodeToHtml(value: string): string {
	return value
		.replace(/\{STEAM_CLAN_IMAGE\}/g, "https://clan.cloudflare.steamstatic.com/images")
		.replace(/\[img(?:\s+src=(["']))?([^\]"']+)\1?\]\[\/img\]/gi, '<img src="$2" alt="">')
		.replace(/\[url=([^\]]+)\]([\s\S]*?)\[\/url\]/gi, '<a href="$1" target="_blank" rel="noopener noreferrer">$2</a>')
		.replace(/\[url\]([\s\S]*?)\[\/url\]/gi, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>')
		.replace(/\[(\/)?(b|i|u|p|h1|h2|h3|blockquote)\]/gi, "<$1$2>")
		.replace(/\[br\]/gi, "<br>")
		.replace(/\[\/br\]/gi, "")
		.replace(/\[\*\]/g, "<li>")
		.replace(/\[\/\*\]/g, "</li>")
		.replace(/\[list\]/gi, "<ul>")
		.replace(/\[\/list\]/gi, "</ul>")
		.replace(/\[[^\]]+\]/g, "")
}

export function parseSteamApi(data: SteamApiResponse, now = Date.now()): NewsItem[] {
	const apiItems = data.appnews?.newsitems
	if (!Array.isArray(apiItems)) throw new Error("Steam News API returned an invalid response")

	const items = apiItems.flatMap((apiItem) => {
		const date = typeof apiItem.date === "number" ? new Date(apiItem.date * 1000).toISOString() : ""
		const item = createNewsItem(
			apiItem.title?.trim() ?? "",
			apiItem.url?.trim() ?? "",
			date,
			steamBbcodeToHtml(apiItem.contents ?? ""),
			now,
		)
		return item ? [item] : []
	})

	if (items.length === 0) throw new Error("Steam News API response contained no valid news items")
	return items
}

async function fetchSteam(url: string, accept: string): Promise<Response> {
	const controller = new AbortController()
	const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

	try {
		const response = await fetch(url, {
			...getSteamProxyOptions(),
			headers: {
				Accept: accept,
				"User-Agent": "krinfo/1.0 (Steam news reader)",
			},
			next: { revalidate: REVALIDATE_SECONDS },
			signal: controller.signal,
		})

		if (!response.ok) throw new Error(`Steam request failed with HTTP ${response.status}`)
		return response
	} finally {
		clearTimeout(timeout)
	}
}

async function fetchRss(url: string): Promise<NewsItem[]> {
	const response = await fetchSteam(url, "application/rss+xml, application/xml;q=0.9, text/xml;q=0.8")
	return parseSteamRss(await response.text())
}

async function fetchApi(): Promise<NewsItem[]> {
	const response = await fetchSteam(API_URL, "application/json")
	return parseSteamApi((await response.json()) as SteamApiResponse)
}

export async function getSteamNews(limit?: number): Promise<NewsItem[]> {
	// Docker supplies the proxy at runtime. Static exports fetch during the build.
	if (process.env.NEXT_STATIC_EXPORT !== "true") await connection()

	try {
		let items: NewsItem[]

		try {
			items = await Promise.any(RSS_URLS.map(fetchRss))
		} catch (rssError) {
			console.warn("Steam RSS endpoints failed; using the Steam News API fallback", rssError)
			items = await fetchApi()
		}

		const selected = limit === undefined ? items : items.slice(0, Math.max(0, limit))
		// Static hosting has no server image endpoint; retain CDN URLs in exports.
		if (process.env.NEXT_STATIC_EXPORT === "true") return selected
		return selected.map((item) => ({
			...item,
			contents: proxySteamImages(item.contents, process.env.NEXT_PUBLIC_BASE_PATH || ""),
		}))
	} catch (error) {
		console.error("Error fetching Steam news from every source:", error)
		return []
	}
}
