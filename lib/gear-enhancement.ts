export type EnhancementValues = Record<string, Record<string, string> | string>

function enhancementValue(values: EnhancementValues | undefined, key: string, level: string) {
	const levels = values?.[key]
	return typeof levels === "string" ? levels.split(",")[Number(level)]?.trim() : levels?.[level]
}

/** Resolve hero star dictionaries and artifact comma-separated star values. */
export function resolveEnhancementDescription(
	description: string,
	values?: EnhancementValues,
	level = "0",
) {
	return description.replace(/\{(\d+)\}/g, (placeholder, key: string) =>
		enhancementValue(values, key, level) ?? placeholder,
	)
}

/** Highlight only enhancement slots, keeping equal-valued fixed numbers untouched. */
export function getEnhancementDescription(
	description: string,
	values: EnhancementValues | undefined,
	level: string,
) {
	const highlights: string[] = []
	const text = description.replace(/([+-]?)\{(\d+)\}/g, (placeholder, sign: string, key: string) => {
		const value = enhancementValue(values, key, level)
		if (value === undefined) return placeholder
		const index = highlights.length
		highlights.push(sign + value)
		return `{enhancement:${index}}`
	})
	return { text, highlights }
}
