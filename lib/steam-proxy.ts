import { ProxyAgent, type Dispatcher } from "undici"

interface SteamProxyOptions {
	proxy?: string
	dispatcher?: Dispatcher
}

const agents = new Map<string, ProxyAgent>()

export function getSteamProxyOptions(): SteamProxyOptions {
	const proxy = process.env.STEAM_NEWS_PROXY?.trim()
	if (!proxy) return {}

	try {
		const url = new URL(proxy)
		if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error()
	} catch {
		throw new Error("STEAM_NEWS_PROXY must be an HTTP or HTTPS proxy URL")
	}

	// Bun uses its native proxy option; Node fetch uses an Undici dispatcher.
	if (process.versions.bun) return { proxy }

	let agent = agents.get(proxy)
	if (!agent) {
		agent = new ProxyAgent(proxy)
		agents.set(proxy, agent)
	}
	return { dispatcher: agent }
}
