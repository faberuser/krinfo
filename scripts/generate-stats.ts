/**
 * Kings Raid Stats Generator
 *
 * Generates hero comparison JSON files for the /stats page.
 * Files are saved to /public/kingsraid-stats/{versionA}_vs_{versionB}/{HeroName}.json
 *
 * Usage:
 *   npx tsx scripts/generate-stats.ts
 *
 * Providers (via environment variables):
 *   LLM_PROVIDER=gemini   Google Gemini API (requires GEMINI_API_KEY)
 *   LLM_PROVIDER=openai   OpenAI or OpenAI-compatible (requires OPENAI_API_KEY)
 *   LLM_PROVIDER=local    Local server: Ollama, LM Studio, etc. (requires LLM_BASE_URL)
 *
 * Environment Variables:
 *   LLM_PROVIDER     - Provider: gemini (default) | openai | local
 *   LLM_MODEL        - Model name (default: gemini-3-flash-preview)
 *   GEMINI_API_KEY   - Google Gemini API key
 *   OPENAI_API_KEY   - OpenAI API key
 *   OPENAI_BASE_URL  - OpenAI-compatible base URL (default: http://127.0.0.1:3030/v1)
 *   LLM_BASE_URL     - Base URL for local providers
 *
 * Behavior:
 *   - Skips already-generated files (delete them manually to regenerate)
 *   - Batches up to 100 diffs per LLM request to minimize API calls
 */

import fs from "node:fs"
import path from "node:path"

// ── Config ────────────────────────────────────────────────────────────────────

const TABLE_DATA = path.join(process.cwd(), "public", "kingsraid-data", "table-data")
const STATS_DIR = path.join(process.cwd(), "public", "kingsraid-stats")

// Provider config
type Provider = "gemini" | "openai" | "local"
const DEFAULT_PROVIDER: Provider = (process.env.LLM_PROVIDER as Provider) || "openai"
const DEFAULT_MODEL = process.env.LLM_MODEL || "gemini-3-flash-preview"

// API Keys and endpoints
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ""
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ""
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "http://127.0.0.1:3030/v1"
const LOCAL_BASE_URL = process.env.LLM_BASE_URL || ""

const MAX_BATCH_SIZE = 100 // Process up to 100 diffs per API call

// ── Runtime config ───────────────────────────────────────────────────────────

const LLM_PROVIDER: Provider = DEFAULT_PROVIDER
const LLM_MODEL = DEFAULT_MODEL

// ── Input types ───────────────────────────────────────────────────────────────

interface SkillEntry {
	name: string
	cost: string | null
	cooldown: string | null
	description: string
}

interface UWData {
	name: string
	description: string
	value: Record<string, Record<string, string>>
}

interface UTData {
	name: string
	description: string
	value: Record<string, Record<string, string>>
}

interface SWData {
	description: string
	cooldown: string
	uses: string
	advancement: Record<string, string>
}

interface BatchQueueItem {
	id: string
	label: string
	from: string
	to: string
}

interface HeroData {
	profile: { name: string; class: string; thumbnail: string }
	skills: Record<string, SkillEntry>
	books: Record<string, { II: string; III: string; IV: string }>
	perks: {
		t3: Record<string, { light?: { effect: string }; dark?: { effect: string } }>
		t5: { light: { effect: string }; dark: { effect: string } }
	}
	uw?: UWData
	uts?: Record<string, UTData>
	sw?: SWData
}

// ── Output format (consumed by client.tsx) ────────────────────────────────────

export type TextDiff = { from?: string | null; to?: string | null; unified?: string; _queueId?: string }

export interface HeroComparison {
	heroName: string
	versionA: string
	versionB: string
	generatedAt: string
	skills: Record<
		string,
		{
			hasChanges: boolean
			name?: TextDiff
			cooldown?: TextDiff
			mana_cost?: TextDiff
			description?: TextDiff
		}
	>
	books: Record<
		string,
		{
			skillName: string
			hasChanges: boolean
			II?: TextDiff
			III?: TextDiff
			IV?: TextDiff
		}
	>
	perks_t3: Record<
		string,
		{
			hasChanges: boolean
			light?: TextDiff
			dark?: TextDiff
		}
	>
	perks_t5?: {
		hasChanges: boolean
		light?: TextDiff
		dark?: TextDiff
	}
	uw?: {
		hasChanges: boolean
		description?: TextDiff
		values: Record<string, TextDiff>
	}
	uts: Record<
		string,
		{
			name: string
			hasChanges: boolean
			description?: TextDiff
			values: Record<string, TextDiff>
		}
	>
	sw?: {
		hasChanges: boolean
		description?: TextDiff
		cooldown?: TextDiff
		uses?: TextDiff
		advancement: Record<string, TextDiff>
	}
}

// ── LLM ──────────────────────────────────────────────────────────────────────

const LLM_SYSTEM_PROMPT = `You analyze King's Raid game ability descriptions between two game versions.
Your task: produce ONE unified description showing numeric/stat value changes inline as [A->B].

Rules:
- IGNORE damage multipliers and formulas: skip tokens like ???, expressions like "299*(0.7+0.3*Skill Level*Awakening Coefficient)+189.1%", or any raw damage numbers preceding "of ATK" or "M.DMG"/"P.DMG"
- IGNORE pure wording changes with no numeric/stat changes. If only wording changed, return only version B.
- For stat effects (ATK/DEF reduction %, duration in sec, buff percentages, HP %, cooldown, uses, etc.), show changed values as [A->B] — e.g. [15%->10%], [10 sec->5 sec]
- If a stat/effect only exists in version A (removed in B), write [(removed) value/effect]
- If a stat/effect only exists in version B (added in A), write [(added) value/effect]
- Keep sentence structure from version B, adjusted to reflect A->B changes
- Output ONLY the unified description text — no explanations, no preamble, no markdown`

// ── Batch queue for LLM processing ────────────────────────────────────────────

const batchQueue: BatchQueueItem[] = []
const batchResults: Record<string, string> = {}

async function callLLM(prompt: string): Promise<string | null> {
	const controller = new AbortController()
	const timeout = setTimeout(() => controller.abort(), 30 * 60 * 1000) // 30 min max

	try {
		if (LLM_PROVIDER === "gemini") {
			return await callGemini(prompt, controller.signal)
		} else if (LLM_PROVIDER === "openai") {
			return await callOpenAI(prompt, controller.signal)
		} else if (LLM_PROVIDER === "local") {
			return await callOpenAI(prompt, controller.signal, LOCAL_BASE_URL)
		}
		console.error(`❌ Unknown provider: ${LLM_PROVIDER}`)
		return null
	} finally {
		clearTimeout(timeout)
	}
}

async function callGemini(prompt: string, signal: AbortSignal): Promise<string | null> {
	if (!GEMINI_API_KEY) {
		console.error("❌ GEMINI_API_KEY environment variable not set")
		return null
	}

	try {
		const response = await fetch(
			`https://generativelanguage.googleapis.com/v1beta/models/${LLM_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				signal,
				body: JSON.stringify({
					system_instruction: {
						parts: [{ text: LLM_SYSTEM_PROMPT }],
					},
					contents: [
						{
							parts: [{ text: prompt }],
						},
					],
					generationConfig: {
						temperature: 0,
						maxOutputTokens: 262144,
					},
				}),
			},
		)
		if (!response.ok) {
			const error = await response.text()
			console.error(`Gemini API error: ${response.status}`, error)
			return null
		}
		const data = (await response.json()) as {
			candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
		}
		const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? null
		return text || null
	} catch (error) {
		console.error("Gemini API call failed:", error)
		return null
	}
}

async function callOpenAI(
	prompt: string,
	signal: AbortSignal,
	baseUrl: string = OPENAI_BASE_URL,
): Promise<string | null> {
	const apiKey = LLM_PROVIDER === "local" ? "not-needed-for-local" : OPENAI_API_KEY

	// if (!apiKey && LLM_PROVIDER !== "local") {
	// 	console.error("❌ OPENAI_API_KEY environment variable not set")
	// 	return null
	// }

	try {
		const response = await fetch(`${baseUrl}/chat/completions`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...(LLM_PROVIDER !== "local" && { Authorization: `Bearer ${apiKey}` }),
			},
			signal,
			body: JSON.stringify({
				model: LLM_MODEL,
				messages: [
					{ role: "system", content: LLM_SYSTEM_PROMPT },
					{ role: "user", content: prompt },
				],
				temperature: 0,
				max_tokens: 262144,
			}),
		})

		if (!response.ok) {
			const error = await response.text()
			console.error(`OpenAI API error: ${response.status}`, error)
			return null
		}

		const data = (await response.json()) as {
			choices?: Array<{ message?: { content?: string } }>
		}
		const text = data.choices?.[0]?.message?.content?.trim() ?? null
		return text || null
	} catch (error) {
		console.error("OpenAI API call failed:", error)
		return null
	}
}

async function processBatchQueue(): Promise<void> {
	if (batchQueue.length === 0) return

	console.log(`\n🤖 Processing ${batchQueue.length} LLM enrichments in batches (${LLM_PROVIDER})...`)

	let processed = 0
	for (let i = 0; i < batchQueue.length; i += MAX_BATCH_SIZE) {
		const batch = batchQueue.slice(i, i + MAX_BATCH_SIZE)
		const batchNum = Math.floor(i / MAX_BATCH_SIZE) + 1
		const totalBatches = Math.ceil(batchQueue.length / MAX_BATCH_SIZE)

		process.stdout.write(`  [Batch ${batchNum}/${totalBatches}] Processing ${batch.length} items...`)

		// Build batch prompt with numbered items
		const batchPrompt = batch
			.map((item, idx) => `Item ${idx + 1} [${item.label}]:\nVersion A:\n${item.from}\n\nVersion B:\n${item.to}`)
			.join("\n\n---\n\n")

		const instruction = `/no_think\nProcess the following ${batch.length} text comparison(s). For each item, output ONLY the unified description text on its own line, in the same order as input. No explanations, numbering, or extra formatting.\n\n${batchPrompt}`

		const response = await callLLM(instruction)
		if (!response) {
			process.stdout.write(" ✗ failed\n")
			continue
		}

		// Parse response: split by double newline or blank lines, match to batch items
		const lines = response.split("\n").filter((l) => l.trim())
		batch.forEach((item, idx) => {
			if (idx < lines.length) {
				batchResults[item.id] = lines[idx].trim()
				processed++
			}
		})

		process.stdout.write(` ✓ (${processed}/${batchQueue.length} done)\n`)
	}

	console.log(`✅ Batch processing complete!`)
}

function queueTextDiffForEnrichment(diff: TextDiff, label: string): string {
	if (!diff.from || !diff.to) return ""

	const id = `${label}_${batchQueue.length}`
	batchQueue.push({ id, label, from: diff.from, to: diff.to })
	return id
}

function getEnrichedTextDiff(diff: TextDiff, diffId: string): TextDiff {
	if (!diffId || !batchResults[diffId]) return diff
	return { unified: batchResults[diffId] } // drop from/to when unified is available
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function stripColorCodes(text: string): string {
	return text.replace(/\[[0-9a-fA-F]{6}\]|\[-\]/g, "")
}

function stripAwakeningCoefficient(text: string): string {
	return text.replace(/\n+Awakening Coefficient\([^)]+\):[\s\S]*$/, "").trimEnd()
}

/** Clean text for storage: strip color codes and awakening footnotes. */
function cleanText(text: string): string {
	return stripAwakeningCoefficient(stripColorCodes(text)).trim()
}

/**
 * Normalize for equality comparison only.
 * Collapses operator whitespace and replaces both legacy ??? and CBT awakening
 * formulas with a common token so they never register as a diff.
 */
function normalizeDesc(text: string): string {
	const collapsed = stripAwakeningCoefficient(stripColorCodes(text))
		.replace(/\s*\+\s*/g, "+")
		.replace(/\s*-\s*/g, "-")
	return collapsed.replace(/[\d.]+\*\(0\.7\+\(0\.3\*Skill Level\*Awakening Coefficient\)\)\+[\d.]+/g, "???")
}

/** Extract sorted numeric values from text. Used to detect pure wording-only changes. */
function extractNumbers(text: string): string {
	return (text.match(/\d+(?:\.\d+)?/g) ?? []).sort().join(",")
}

function hasNumericChange(a: string, b: string): boolean {
	return extractNumbers(a) !== extractNumbers(b)
}

function tierValues(valueMap: Record<string, string>): string {
	return Object.values(valueMap).join(" / ")
}

function readJson<T>(filePath: string): T | null {
	try {
		if (!fs.existsSync(filePath)) return null
		return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T
	} catch {
		return null
	}
}

function getVersions(): string[] {
	const desc = readJson<{ data_versions: Record<string, unknown> }>(path.join(TABLE_DATA, "description.json"))
	return desc ? Object.keys(desc.data_versions) : ["cbt-phase-2", "cbt-phase-1", "ccbt", "legacy"]
}

function loadHeroes(version: string): Record<string, HeroData> {
	const dir = path.join(TABLE_DATA, version, "heroes")
	if (!fs.existsSync(dir)) return {}
	const result: Record<string, HeroData> = {}
	for (const file of fs.readdirSync(dir)) {
		if (!file.endsWith(".json")) continue
		const data = readJson<HeroData>(path.join(dir, file))
		if (data) result[file.replace(".json", "")] = data
	}
	return result
}

// ── Comparison builder ────────────────────────────────────────────────────────

function buildComparison(
	heroName: string,
	fromHero: HeroData,
	toHero: HeroData,
	versionA: string,
	versionB: string,
): HeroComparison | null {
	const comp: HeroComparison = {
		heroName,
		versionA,
		versionB,
		generatedAt: new Date().toISOString(),
		skills: {},
		books: {},
		perks_t3: {},
		uts: {},
	}

	// ── Skills ─────────────────────────────────────────────────────────────────

	for (const slot of Object.keys(fromHero.skills ?? {})) {
		const fs = fromHero.skills[slot]
		const ts = toHero.skills?.[slot]
		if (!fs || !ts) continue

		const nameChanged = fs.name !== ts.name
		const cooldownChanged = fs.cooldown !== ts.cooldown
		const costChanged = fs.cost !== ts.cost
		// Use normalizeDesc for comparison (collapses formula/whitespace differences)
		const descChanged = normalizeDesc(fs.description) !== normalizeDesc(ts.description)

		if (nameChanged || cooldownChanged || costChanged || descChanged) {
			comp.skills[slot] = {
				hasChanges: true,
				...(nameChanged ? { name: { from: fs.name, to: ts.name } } : {}),
				...(cooldownChanged ? { cooldown: { from: fs.cooldown ?? null, to: ts.cooldown ?? null } } : {}),
				...(costChanged ? { mana_cost: { from: fs.cost ?? null, to: ts.cost ?? null } } : {}),
				...(descChanged
					? { description: { from: cleanText(fs.description), to: cleanText(ts.description) } }
					: {}),
			}
		}
	}

	// ── Books ──────────────────────────────────────────────────────────────────
	// Only include book entries where numbers actually changed (skip pure wording rewrites)

	for (const slot of Object.keys(fromHero.books ?? {})) {
		const fb = fromHero.books[slot]
		const tb = toHero.books?.[slot]
		if (!fb || !tb) continue

		const diffs: { II?: TextDiff; III?: TextDiff; IV?: TextDiff } = {}
		for (const level of ["II", "III", "IV"] as const) {
			const fv = stripColorCodes(fb[level] ?? "")
			const tv = stripColorCodes(tb[level] ?? "")
			if (fv !== tv && fv && tv && hasNumericChange(fv, tv)) {
				diffs[level] = { from: fv, to: tv }
			}
		}
		if (diffs.II || diffs.III || diffs.IV) {
			comp.books[slot] = {
				skillName: fromHero.skills?.[slot]?.name ?? `Skill ${slot}`,
				hasChanges: true,
				...diffs,
			}
		}
	}

	// ── Perks T3 ───────────────────────────────────────────────────────────────
	// Only include if numbers changed

	for (const slot of Object.keys(fromHero.perks?.t3 ?? {})) {
		const fp = fromHero.perks.t3[slot]
		const tp = toHero.perks?.t3?.[slot]
		if (!fp || !tp) continue

		const fl = stripColorCodes(fp.light?.effect ?? "")
		const tl = stripColorCodes(tp.light?.effect ?? "")
		const fd = stripColorCodes(fp.dark?.effect ?? "")
		const td = stripColorCodes(tp.dark?.effect ?? "")

		const lightDiff = fl !== tl && fl && tl && hasNumericChange(fl, tl) ? { from: fl, to: tl } : undefined
		const darkDiff = fd !== td && fd && td && hasNumericChange(fd, td) ? { from: fd, to: td } : undefined

		if (lightDiff || darkDiff) {
			comp.perks_t3[slot] = {
				hasChanges: true,
				...(lightDiff ? { light: lightDiff } : {}),
				...(darkDiff ? { dark: darkDiff } : {}),
			}
		}
	}

	// ── Perks T5 ───────────────────────────────────────────────────────────────

	if (fromHero.perks?.t5 && toHero.perks?.t5) {
		const fl = stripColorCodes(fromHero.perks.t5.light?.effect ?? "")
		const tl = stripColorCodes(toHero.perks.t5.light?.effect ?? "")
		const fd = stripColorCodes(fromHero.perks.t5.dark?.effect ?? "")
		const td = stripColorCodes(toHero.perks.t5.dark?.effect ?? "")

		const lightDiff = fl !== tl && hasNumericChange(fl, tl) ? { from: fl, to: tl } : undefined
		const darkDiff = fd !== td && hasNumericChange(fd, td) ? { from: fd, to: td } : undefined

		if (lightDiff || darkDiff) {
			comp.perks_t5 = {
				hasChanges: true,
				...(lightDiff ? { light: lightDiff } : {}),
				...(darkDiff ? { dark: darkDiff } : {}),
			}
		}
	}

	// ── UW ────────────────────────────────────────────────────────────────────

	if (fromHero.uw && toHero.uw) {
		const fd = cleanText(fromHero.uw.description)
		const td = cleanText(toHero.uw.description)
		const descDiff = fd !== td ? { from: fd, to: td } : undefined

		const values: Record<string, TextDiff> = {}
		for (const param of Object.keys(fromHero.uw.value ?? {})) {
			const fv = tierValues(fromHero.uw.value[param] ?? {})
			const tv = tierValues(toHero.uw.value?.[param] ?? {})
			if (fv !== tv) values[param] = { from: fv, to: tv }
		}

		if (descDiff || Object.keys(values).length > 0) {
			comp.uw = { hasChanges: true, ...(descDiff ? { description: descDiff } : {}), values }
		}
	}

	// ── UTs ───────────────────────────────────────────────────────────────────

	for (const slot of Object.keys(fromHero.uts ?? {})) {
		const fut = fromHero.uts![slot]
		const tut = toHero.uts?.[slot]
		if (!fut || !tut) continue

		const fd = cleanText(fut.description)
		const td = cleanText(tut.description)
		const descDiff = fd !== td ? { from: fd, to: td } : undefined

		const values: Record<string, TextDiff> = {}
		for (const param of Object.keys(fut.value ?? {})) {
			const fv = tierValues(fut.value[param] ?? {})
			const tv = tierValues(tut.value?.[param] ?? {})
			if (fv !== tv) values[param] = { from: fv, to: tv }
		}

		if (descDiff || Object.keys(values).length > 0) {
			comp.uts[slot] = {
				name: fut.name,
				hasChanges: true,
				...(descDiff ? { description: descDiff } : {}),
				values,
			}
		}
	}

	// ── SW ────────────────────────────────────────────────────────────────────

	if (fromHero.sw && toHero.sw) {
		const fd = cleanText(fromHero.sw.description)
		const td = cleanText(toHero.sw.description)
		const descDiff = fd !== td ? { from: fd, to: td } : undefined
		const cooldownChanged = fromHero.sw.cooldown !== toHero.sw.cooldown
		const usesChanged = fromHero.sw.uses !== toHero.sw.uses

		const advancement: Record<string, TextDiff> = {}
		for (const key of Object.keys(fromHero.sw.advancement ?? {})) {
			const fv = stripColorCodes(fromHero.sw.advancement[key] ?? "")
			const tv = stripColorCodes(toHero.sw.advancement?.[key] ?? "")
			if (fv !== tv && fv && tv) advancement[key] = { from: fv, to: tv }
		}

		if (descDiff || cooldownChanged || usesChanged || Object.keys(advancement).length > 0) {
			comp.sw = {
				hasChanges: true,
				...(descDiff ? { description: descDiff } : {}),
				...(cooldownChanged ? { cooldown: { from: fromHero.sw.cooldown, to: toHero.sw.cooldown } } : {}),
				...(usesChanged ? { uses: { from: fromHero.sw.uses, to: toHero.sw.uses } } : {}),
				advancement,
			}
		}
	}

	// ── Return null if nothing changed ─────────────────────────────────────────

	const hasContent =
		Object.keys(comp.skills).length > 0 ||
		Object.keys(comp.books).length > 0 ||
		Object.keys(comp.perks_t3).length > 0 ||
		comp.perks_t5 ||
		comp.uw ||
		Object.keys(comp.uts).length > 0 ||
		comp.sw

	return hasContent ? comp : null
}

// ── LLM enrichment ───────────────────────────────────────────────────────────

function queueComparisonForEnrichment(comp: HeroComparison): void {
	// Skills: description
	for (const [slot, skillData] of Object.entries(comp.skills)) {
		if (skillData.description) {
			const diffId = queueTextDiffForEnrichment(skillData.description, `${comp.heroName} skill ${slot} desc`)
			skillData.description._queueId = diffId
		}
	}

	// Books: II / III / IV
	for (const [slot, bookData] of Object.entries(comp.books)) {
		if (bookData.II) {
			const diffId = queueTextDiffForEnrichment(bookData.II, `${comp.heroName} book ${slot} II`)
			bookData.II._queueId = diffId
		}
		if (bookData.III) {
			const diffId = queueTextDiffForEnrichment(bookData.III, `${comp.heroName} book ${slot} III`)
			bookData.III._queueId = diffId
		}
		if (bookData.IV) {
			const diffId = queueTextDiffForEnrichment(bookData.IV, `${comp.heroName} book ${slot} IV`)
			bookData.IV._queueId = diffId
		}
	}

	// Perks T3: light / dark
	for (const [slot, perkData] of Object.entries(comp.perks_t3)) {
		if (perkData.light) {
			const diffId = queueTextDiffForEnrichment(perkData.light, `${comp.heroName} t3 ${slot} light`)
			perkData.light._queueId = diffId
		}
		if (perkData.dark) {
			const diffId = queueTextDiffForEnrichment(perkData.dark, `${comp.heroName} t3 ${slot} dark`)
			perkData.dark._queueId = diffId
		}
	}

	// Perks T5: light / dark
	if (comp.perks_t5) {
		if (comp.perks_t5.light) {
			const diffId = queueTextDiffForEnrichment(comp.perks_t5.light, `${comp.heroName} t5 light`)
			comp.perks_t5.light._queueId = diffId
		}
		if (comp.perks_t5.dark) {
			const diffId = queueTextDiffForEnrichment(comp.perks_t5.dark, `${comp.heroName} t5 dark`)
			comp.perks_t5.dark._queueId = diffId
		}
	}

	// UW: description
	if (comp.uw?.description) {
		const diffId = queueTextDiffForEnrichment(comp.uw.description, `${comp.heroName} uw desc`)
		comp.uw.description._queueId = diffId
	}

	// UTs: description
	for (const [slot, utData] of Object.entries(comp.uts)) {
		if (utData.description) {
			const diffId = queueTextDiffForEnrichment(utData.description, `${comp.heroName} ut ${slot} desc`)
			utData.description._queueId = diffId
		}
	}

	// SW: description + advancement values
	if (comp.sw) {
		if (comp.sw.description) {
			const diffId = queueTextDiffForEnrichment(comp.sw.description, `${comp.heroName} sw desc`)
			comp.sw.description._queueId = diffId
		}
		for (const key of Object.keys(comp.sw.advancement)) {
			const diffId = queueTextDiffForEnrichment(
				comp.sw.advancement[key],
				`${comp.heroName} sw advancement ${key}`,
			)
			comp.sw.advancement[key]._queueId = diffId
		}
	}
}

function applyBatchEnrichment(comp: HeroComparison): void {
	// Skills: description
	for (const skillData of Object.values(comp.skills)) {
		if (skillData.description?._queueId) {
			skillData.description = getEnrichedTextDiff(skillData.description, skillData.description._queueId)
			delete skillData.description._queueId
		}
	}

	// Books: II / III / IV
	for (const bookData of Object.values(comp.books)) {
		if (bookData.II?._queueId) {
			bookData.II = getEnrichedTextDiff(bookData.II, bookData.II._queueId)
			delete bookData.II._queueId
		}
		if (bookData.III?._queueId) {
			bookData.III = getEnrichedTextDiff(bookData.III, bookData.III._queueId)
			delete bookData.III._queueId
		}
		if (bookData.IV?._queueId) {
			bookData.IV = getEnrichedTextDiff(bookData.IV, bookData.IV._queueId)
			delete bookData.IV._queueId
		}
	}

	// Perks T3: light / dark
	for (const perkData of Object.values(comp.perks_t3)) {
		if (perkData.light?._queueId) {
			perkData.light = getEnrichedTextDiff(perkData.light, perkData.light._queueId)
			delete perkData.light._queueId
		}
		if (perkData.dark?._queueId) {
			perkData.dark = getEnrichedTextDiff(perkData.dark, perkData.dark._queueId)
			delete perkData.dark._queueId
		}
	}

	// Perks T5: light / dark
	if (comp.perks_t5) {
		if (comp.perks_t5.light?._queueId) {
			comp.perks_t5.light = getEnrichedTextDiff(comp.perks_t5.light, comp.perks_t5.light._queueId)
			delete comp.perks_t5.light._queueId
		}
		if (comp.perks_t5.dark?._queueId) {
			comp.perks_t5.dark = getEnrichedTextDiff(comp.perks_t5.dark, comp.perks_t5.dark._queueId)
			delete comp.perks_t5.dark._queueId
		}
	}

	// UW: description
	if (comp.uw?.description?._queueId) {
		comp.uw.description = getEnrichedTextDiff(comp.uw.description, comp.uw.description._queueId)
		delete comp.uw.description._queueId
	}

	// UTs: description
	for (const utData of Object.values(comp.uts)) {
		if (utData.description?._queueId) {
			utData.description = getEnrichedTextDiff(utData.description, utData.description._queueId)
			delete utData.description._queueId
		}
	}

	// SW: description + advancement values
	if (comp.sw) {
		if (comp.sw.description?._queueId) {
			comp.sw.description = getEnrichedTextDiff(comp.sw.description, comp.sw.description._queueId)
			delete comp.sw.description._queueId
		}
		for (const advancement of Object.values(comp.sw.advancement)) {
			if (advancement._queueId) {
				const enriched = getEnrichedTextDiff(advancement, advancement._queueId)
				Object.assign(advancement, enriched)
				delete advancement._queueId
			}
		}
	}
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
	console.log("🎮 Kings Raid Stats Generator")
	console.log("================================")
	const providerInfo = LLM_PROVIDER === "local" ? `${LLM_PROVIDER} (${LOCAL_BASE_URL})` : LLM_PROVIDER
	console.log(`🤖 ${LLM_MODEL} via ${providerInfo}`)

	const versions = getVersions()
	console.log(`\nVersions: ${versions.join(", ")}`)

	const pairs: Array<[string, string]> = []
	for (const va of versions) {
		for (const vb of versions) {
			if (va !== vb) pairs.push([va, vb])
		}
	}

	let totalGenerated = 0
	let totalSkipped = 0
	let totalNoChanges = 0

	// Store comparisons and their output paths for batch processing
	const comparisonsToWrite: Array<{ outFile: string; comparison: HeroComparison }> = []

	for (const [versionA, versionB] of pairs) {
		console.log(`\n📊 ${versionA} → ${versionB}`)

		const fromHeroes = loadHeroes(versionA)
		const toHeroes = loadHeroes(versionB)
		const heroNames = Object.keys(fromHeroes).filter((name) => toHeroes[name])

		console.log(`  ${heroNames.length} heroes in common`)

		const outDir = path.join(STATS_DIR, `${versionA}_vs_${versionB}`)
		fs.mkdirSync(outDir, { recursive: true })

		for (const heroName of heroNames) {
			const outFile = path.join(outDir, `${heroName}.json`)

			if (fs.existsSync(outFile)) {
				totalSkipped++
				continue
			}

			process.stdout.write(`  ${heroName}...`)

			try {
				const comparison = buildComparison(
					heroName,
					fromHeroes[heroName],
					toHeroes[heroName],
					versionA,
					versionB,
				)
				if (comparison) {
					queueComparisonForEnrichment(comparison)
					comparisonsToWrite.push({ outFile, comparison })
					console.log(" ✓")
					totalGenerated++
				} else {
					console.log(" – no changes")
					totalNoChanges++
				}
			} catch (err) {
				console.log(` ✗ ${err}`)
			}
		}
	}

	if (batchQueue.length > 0) {
		await processBatchQueue()

		// Apply batch results to all comparisons
		for (const { comparison } of comparisonsToWrite) {
			applyBatchEnrichment(comparison)
		}
	}

	// Write all files after enrichment is complete
	for (const { outFile, comparison } of comparisonsToWrite) {
		fs.writeFileSync(outFile, JSON.stringify(comparison, null, 2))
	}

	console.log(`\n✅ Done!`)
	console.log(`   Generated : ${totalGenerated}`)
	console.log(`   No changes: ${totalNoChanges}`)
	console.log(`   Skipped   : ${totalSkipped}`)
}

main().catch((err) => {
	console.error(err)
	process.exit(1)
})
