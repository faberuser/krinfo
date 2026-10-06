import { loadMessages } from "@/lib/i18n/load-messages"
import { cookies, headers } from "next/headers"
import { getRequestConfig } from "next-intl/server"
import { isLocale, type Locale } from "@/lib/i18n/locales"
import { LOCALE_COOKIE, preferredLocale } from "@/lib/i18n/locale-preference"

export default getRequestConfig(async () => {
	let locale: Locale = "en"
	if (process.env.NEXT_STATIC_EXPORT !== "true") {
		const saved = (await cookies()).get(LOCALE_COOKIE)?.value
		if (isLocale(saved)) locale = saved
		else {
			const languages = ((await headers()).get("accept-language") ?? "")
				.split(",").map((entry) => {
					const [tag, quality] = entry.trim().split(";q=")
					return { tag, quality: quality === undefined ? 1 : Number(quality) }
				}).filter(({ quality }) => quality > 0).sort((a, b) => b.quality - a.quality)
			locale = preferredLocale(languages.map(({ tag }) => tag))
		}
	}
	return { locale, messages: await loadMessages(locale), timeZone: "UTC" }
})
