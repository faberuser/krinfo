interface RuneSortData {
	grade?: string
	stats?: Record<string, string>
}

// Verified against the game's rune icons; color is determined by stat type.
const COLORS = [
	new Set(["AddPhysicalAttackR", "AddMagicalAttackR", "PhysicalCriticalChance", "MagicalCriticalChance",
		"PhysicalCriticalPower", "MagicalCriticalPower", "PhysicalHitChance", "MagicalHitChance", "PhysicalPiercePower", "MagicalPiercePower"]),
	new Set(["PhysicalDodgeChance", "MagicalDodgeChance", "PhysicalBlockChance", "MagicalBlockChance",
		"PhysicalBlockPower", "MagicalBlockPower", "AddPhysicalDefenseR", "AddMagicalDefenseR", "PhysicalToughness", "MagicalToughness"]),
	new Set(["AddMpOnAttackR", "AddMpOnDamageR", "AntiCcChance", "AddMaxHpR", "HpStealPower", "AttackSpeed"]),
]
const GRADES = ["Uncommon", "Common", "Rare", "Heroic", "Ancient"]

function colorRank(rune?: RuneSortData): number {
	const stats = Object.keys(rune?.stats ?? {})
	const rank = COLORS.findIndex(color => stats.some(stat => color.has(stat)))
	return rank === -1 ? COLORS.length : rank
}

function gradeRank(rune?: RuneSortData): number {
	const rank = GRADES.indexOf(rune?.grade ?? "")
	return rank === -1 ? GRADES.length : rank
}

export function compareRuneOrder(a?: RuneSortData, b?: RuneSortData): number {
	return colorRank(a) - colorRank(b) || gradeRank(a) - gradeRank(b)
}
