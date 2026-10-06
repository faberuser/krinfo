export type EntityKind = "heroes" | "classes" | "runes"
export type ChangeStatus = "added" | "removed" | "changed"
export interface IndexedEntity {
	file: string
	class?: string
	thumbnail?: string
	fields: Record<string, string>
}
export interface ComparisonIndex {
	schemaVersion: 1
	version: string
	heroes: Record<string, IndexedEntity>
	classes: Record<string, IndexedEntity>
	runes: Record<string, IndexedEntity>
}
export interface EntityChange {
	id: string
	status: ChangeStatus
	paths: string[]
	from?: IndexedEntity
	to?: IndexedEntity
}

/** Compare canonical fingerprints. Translation choices never affect membership or counts. */
export function compareEntities(from: Record<string, IndexedEntity>, to: Record<string, IndexedEntity>): EntityChange[] {
	return [...new Set([...Object.keys(from), ...Object.keys(to)])].flatMap(id => {
		const a = from[id], b = to[id]
		const paths = [...new Set([...Object.keys(a?.fields ?? {}), ...Object.keys(b?.fields ?? {})])]
			.filter(path => a?.fields[path] !== b?.fields[path]).sort()
		return paths.length || !a || !b ? [{ id, from: a, to: b, paths,
			status: !a ? "added" as const : !b ? "removed" as const : "changed" as const }] : []
	}).sort((a, b) => a.id.localeCompare(b.id))
}

export function pathParts(path: string): string[] {
	return path.split("/").map(part => part.replace(/~1/g, "/").replace(/~0/g, "~"))
}

export function fieldValue(record: unknown, path: string): unknown {
	let value = record
	for (const part of pathParts(path)) {
		if (!value || typeof value !== "object" || !Object.hasOwn(value, part)) return null
		value = (value as Record<string, unknown>)[part]
	}
	return value ?? null
}

export function cleanDescription(text: string): string {
	return text.replace(/\[(?:[\da-f]{6}|[\da-f]{8}|-)\]/gi, "")
		.replace(/\n+(?:Awakening Coefficient|각성 계수|覚醒係数|觉醒系数|覺醒係數|Coefficient d'éveil|Erweckungskoeffizient|Коэффициент пробуждения)\([^\n]+\):[^\n]*/g, "").trim()
}

export function displayValue(value: unknown): string {
	if (value === null || value === undefined) return "—"
	return cleanDescription(typeof value === "string" ? value : String(value))
}

export const STAT_NAMES: Record<string, string> = {
	AddPhysicalAttackR: "ATK", AddMagicalAttackR: "ATK", PhysicalPiercePower: "Penetration", MagicalPiercePower: "Penetration",
	PhysicalCriticalPower: "Crit DMG", MagicalCriticalPower: "Crit DMG", PhysicalHitChance: "ACC", MagicalHitChance: "ACC",
	PhysicalCriticalChance: "Crit", MagicalCriticalChance: "Crit", PhysicalBlockPower: "P.Block DEF", PhysicalToughness: "P.Tough",
	MagicalBlockPower: "M.Block DEF", MagicalToughness: "M.Tough", PhysicalBlockChance: "P.Block", AddPhysicalDefenseR: "P.DEF",
	MagicalBlockChance: "M.Block", AddMagicalDefenseR: "M.DEF", PhysicalDodgeChance: "P.Dodge", MagicalDodgeChance: "M.Dodge",
	HpStealPower: "Lifesteal", AddMpOnAttackR: "Mana Recovery/Attack", AntiCcChance: "CC Resist", AddMaxHpR: "Max HP",
	AddMpOnDamageR: "Mana Recovery/DMG", AttackSpeed: "ATK Spd",
}
