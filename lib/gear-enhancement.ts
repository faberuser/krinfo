type EnhancementValues = Record<string, Record<string, string>>

function tokenizeDescription(text: string) {
	const tokens: { value: string; start: number; end: number }[] = []
	let shape = ""
	let cursor = 0
	// Color tags contain digits too, but are not enhancement values.
	for (const match of text.matchAll(/\[[0-9a-f]{6}\]|(\{\d+\}|[+-]?\d+(?:[.,]\d+)*)/gi)) {
		if (match[1] === undefined) continue
		shape += text.slice(cursor, match.index) + "\0"
		cursor = match.index + match[0].length
		tokens.push({ value: match[0], start: match.index, end: cursor })
	}
	return { shape: shape + text.slice(cursor), tokens }
}

/** Mark enhancement slots without mistaking fixed, equal-valued numbers for them. */
export function getEnhancementDescription(
	description: string,
	descriptionByStar: Record<string, string> | undefined,
	values: EnhancementValues | undefined,
	level: string,
) {
	const resolve = (text: string, star: string) =>
		text.replace(/\{(\d+)\}/g, (placeholder, key: string) => values?.[key]?.[star] ?? placeholder)
	const current = resolve(descriptionByStar?.[level] ?? description, level)
	const { shape, tokens } = tokenizeDescription(current)
	const highlighted = new Set<number>()
	const template = tokenizeDescription(description)
	// Some 0★ exports paraphrase the template. Its slots still apply when the
	// entire ordered sequence of resolved and fixed numbers matches.
	const sameNumericLayout =
		template.tokens.length === tokens.length &&
		template.tokens.every((token, index) =>
			resolve(token.value, level).replace(/,/g, ".") === tokens[index].value.replace(/,/g, "."),
		)
	if (template.shape === shape || sameNumericLayout) {
		template.tokens.forEach((token, index) => {
			const key = /^\{(\d+)\}$/.exec(token.value)?.[1]
			if (key !== undefined && values?.[key]?.[level] !== undefined) highlighted.add(index)
		})
	}

	// Exported descriptions may use different wording at different stars. Compare
	// matching sentences so those descriptions remain authoritative, including at 0★.
	for (let star = 0; star <= 5; star++) {
		const other = tokenizeDescription(resolve(descriptionByStar?.[String(star)] ?? description, String(star)))
		if (other.shape !== shape) continue
		tokens.forEach((token, index) => {
			if (token.value !== other.tokens[index].value && !token.value.startsWith("{")) highlighted.add(index)
		})
	}

	const highlights: string[] = []
	let text = ""
	let cursor = 0
	tokens.forEach((token, index) => {
		if (!highlighted.has(index)) return
		text += current.slice(cursor, token.start) + `{enhancement:${highlights.length}}`
		highlights.push(token.value)
		cursor = token.end
	})
	return { text: text + current.slice(cursor), highlights }
}
