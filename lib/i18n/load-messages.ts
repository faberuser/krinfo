import type { Locale } from "./locales"
import type { Messages } from "./messages"

// Explicit imports let Next.js split catalogs into on-demand locale chunks.
const catalogs = {
	en: () => import("@/messages/en.json"),
	ko: () => import("@/messages/ko.json"),
	ja: () => import("@/messages/ja.json"),
	"zh-Hans": () => import("@/messages/zh-Hans.json"),
	"zh-Hant": () => import("@/messages/zh-Hant.json"),
	fr: () => import("@/messages/fr.json"),
	de: () => import("@/messages/de.json"),
	ru: () => import("@/messages/ru.json"),
} satisfies Record<Locale, () => Promise<{ default: Messages }>>

export async function loadMessages(locale: Locale): Promise<Messages> {
	return (await catalogs[locale]()).default
}
