export interface TextPart { text: string; kind: "same" | "removed" | "added" }

/** Word segmentation also supplies readable boundaries for Japanese and Chinese. */
export function diffText(from: string, to: string, locale: string): TextPart[] {
	if (from === to) return [{ text: to, kind: "same" }]
	const segmenter = new Intl.Segmenter(locale, { granularity: "word" })
	const tokenize = (text: string) => Array.from(segmenter.segment(text), item => item.segment)
	const a = tokenize(from), b = tokenize(to)
	// Very long source text falls back to complete before/after blocks.
	if (a.length * b.length > 250_000) return [{ text: from, kind: "removed" }, { text: "\n", kind: "same" }, { text: to, kind: "added" }]
	const table = Array.from({ length: a.length + 1 }, () => new Uint32Array(b.length + 1))
	for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--)
		table[i][j] = a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1])
	const parts: TextPart[] = []
	const push = (text: string, kind: TextPart["kind"]) => {
		const last = parts[parts.length - 1]
		if (last?.kind === kind) last.text += text
		else parts.push({ text, kind })
	}
	let i = 0, j = 0
	while (i < a.length || j < b.length) {
		if (i < a.length && j < b.length && a[i] === b[j]) { push(a[i++], "same"); j++ }
		else if (i < a.length && (j === b.length || table[i + 1][j] >= table[i][j + 1])) push(a[i++], "removed")
		else push(b[j++], "added")
	}
	return parts
}
