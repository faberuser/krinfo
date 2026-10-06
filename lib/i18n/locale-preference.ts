import { isLocale, type Locale } from "./locales"

export const LOCALE_COOKIE = "krinfo-language"

export function preferredLocale(languages: readonly string[]): Locale {
	for (const language of languages) {
		if (isLocale(language)) return language
		const tag = language.toLowerCase()
		if (/^zh-(tw|hk|mo|hant)(-|$)/.test(tag)) return "zh-Hant"
		if (tag === "zh" || tag.startsWith("zh-")) return "zh-Hans"
		const base = tag.split("-")[0]
		if (isLocale(base)) return base
	}
	return "en"
}
