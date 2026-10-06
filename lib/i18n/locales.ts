export const LANGUAGES = [
	{ code: "en", label: "English" },
	{ code: "ko", label: "한국어" },
	{ code: "ja", label: "日本語" },
	{ code: "zh-Hans", label: "简体中文" },
	{ code: "zh-Hant", label: "繁體中文" },
	{ code: "fr", label: "Français" },
	{ code: "de", label: "Deutsch" },
	{ code: "ru", label: "Русский" },
] as const

export type Locale = (typeof LANGUAGES)[number]["code"]
export type Dictionary = Record<string, string>
export function isLocale(value: unknown): value is Locale {
	return LANGUAGES.some(({ code }) => code === value)
}

// English source messages are stable presentation keys, never entity identifiers.
export function translate(text: string, ui: Dictionary): string {
	const trimmed = text.trim()
	const lookup = (key: string) => Object.hasOwn(ui, key) ? ui[key] : undefined
	const translated = lookup(trimmed)
	if (translated !== undefined) return text.replace(trimmed, () => translated)
	// Labels frequently include a trailing colon in the existing interface.
	if (trimmed.endsWith(":")) {
		const label = trimmed.slice(0, -1)
		const value = lookup(label)
		if (value !== undefined) return text.replace(label, () => value)
	}
	const position = /^(Front|Middle|Back)-(\d+)$/.exec(trimmed)
	if (position) {
		const label = lookup(position[1] === "Back" ? "Backline" : position[1])
		if (label) return text.replace(trimmed, () => `${label}-${position[2]}`)
	}
	const numberedLabel = /^(Costume|Skill|Stage) (\d+)$/.exec(trimmed)
	if (numberedLabel) {
		const label = lookup(numberedLabel[1])
		if (label) return text.replace(trimmed, () => `${label} ${numberedLabel[2]}`)
	}
	return text
}
