import type { HeroData } from "@/model/Hero"
import type { RuneEntry, ClassData } from "@/app/stats/page"
import type { RuneDiff, ClassPerkDiff, HeroDiff, HeroChangeSection, FieldChange } from "./types"

export function stripColorCodes(text: string): string {
	return text.replace(/\[[0-9a-fA-F]{6}\]|\[-\]/g, "")
}

export function stripAwakeningCoefficient(text: string): string {
	return text.replace(/\n+Awakening Coefficient\([^)]+\):[\s\S]*$/, "").trimEnd()
}

/** Normalizes formula whitespace so e.g. " + 198%" and "+198%" compare equal. */
export function normalizeDesc(text: string): string {
	return stripAwakeningCoefficient(stripColorCodes(text))
		.replace(/\s*\+\s*/g, "+")
		.replace(/\s*-\s*/g, "-")
}

export const STAT_NAMES: Record<string, string> = {
	AddPhysicalAttackR: "ATK",
	AddMagicalAttackR: "ATK",
	PhysicalPiercePower: "Penetration",
	MagicalPiercePower: "Penetration",
	PhysicalCriticalPower: "Crit DMG",
	MagicalCriticalPower: "Crit DMG",
	PhysicalHitChance: "ACC",
	MagicalHitChance: "ACC",
	PhysicalCriticalChance: "Crit",
	MagicalCriticalChance: "Crit",

	PhysicalBlockPower: "P.Block DEF",
	PhysicalToughness: "P.Tough",
	MagicalBlockPower: "M.Block DEF",
	MagicalToughness: "M.Tough",
	PhysicalBlockChance: "P.Block",
	AddPhysicalDefenseR: "P.DEF",
	MagicalBlockChance: "M.Block",
	AddMagicalDefenseR: "M.DEF",
	PhysicalDodgeChance: "P.Dodge",
	MagicalDodgeChance: "M.Dodge",

	HpStealPower: "Lifesteal",
	AddMpOnAttackR: "Mana Recovery/Attack",
	AntiCcChance: "CC Resist",
	AddMaxHpR: "Max HP",
	AddMpOnDamageR: "Mana Recovery/DMG",
	AttackSpeed: "ATK Spd",
}

/** Extract sorted numeric values from text. Used to detect pure wording-only changes. */
function extractNumbers(text: string): string {
	return (text.match(/\d+(?:\.\d+)?/g) ?? []).sort().join(",")
}

function hasNumericChange(a: string, b: string): boolean {
	return extractNumbers(a) !== extractNumbers(b)
}

export const GRADE_ORDER: Record<string, number> = {
	Ancient: 0,
	Heroic: 1,
	Rare: 2,
	Uncommon: 3,
	Common: 4,
}

export function computeRunesDiff(fromRunes: RuneEntry[], toRunes: RuneEntry[]): RuneDiff[] {
	const fromMap = new Map(fromRunes.map((r) => [r.name, r]))
	const toMap = new Map(toRunes.map((r) => [r.name, r]))
	const allNames = new Set([...fromMap.keys(), ...toMap.keys()])
	const result: RuneDiff[] = []

	for (const name of allNames) {
		const fromRune = fromMap.get(name)
		const toRune = toMap.get(name)

		if (!fromRune) {
			result.push({ runeName: name, grade: toRune!.grade, changes: [], status: "added" })
			continue
		}
		if (!toRune) {
			result.push({ runeName: name, grade: fromRune.grade, changes: [], status: "removed" })
			continue
		}

		const allStats = new Set([...Object.keys(fromRune.stats), ...Object.keys(toRune.stats)])
		const rawChanges: RuneDiff["changes"] = []
		for (const stat of allStats) {
			const f = fromRune.stats[stat] ?? null
			const t = toRune.stats[stat] ?? null
			if (f !== t) rawChanges.push({ stat, from: f, to: t })
		}
		// Deduplicate entries whose display names and values are identical (e.g. AddPhysicalAttackR + AddMagicalAttackR both → "ATK")
		const seen = new Set<string>()
		const changes: RuneDiff["changes"] = []
		for (const c of rawChanges) {
			const key = `${STAT_NAMES[c.stat] ?? c.stat}|${c.from}|${c.to}`
			if (!seen.has(key)) {
				seen.add(key)
				changes.push(c)
			}
		}
		// Sort stats by STAT_NAMES declaration order
		const statKeys = Object.keys(STAT_NAMES)
		changes.sort((a, b) => {
			const ai = statKeys.indexOf(a.stat)
			const bi = statKeys.indexOf(b.stat)
			return (ai === -1 ? 9999 : ai) - (bi === -1 ? 9999 : bi)
		})

		if (changes.length > 0) {
			result.push({ runeName: name, grade: fromRune.grade, changes, status: "changed" })
		}
	}

	return result.sort((a, b) => {
		const gradeDiff = (GRADE_ORDER[a.grade] ?? 99) - (GRADE_ORDER[b.grade] ?? 99)
		if (gradeDiff !== 0) return gradeDiff
		const statKeys = Object.keys(STAT_NAMES)
		const aStat = a.changes[0]?.stat ?? ""
		const bStat = b.changes[0]?.stat ?? ""
		const ai = aStat ? statKeys.indexOf(aStat) : 9999
		const bi = bStat ? statKeys.indexOf(bStat) : 9999
		const statDiff = (ai === -1 ? 9999 : ai) - (bi === -1 ? 9999 : bi)
		if (statDiff !== 0) return statDiff
		return a.runeName.localeCompare(b.runeName)
	})
}

export function computeClassesDiff(
	fromClasses: Record<string, ClassData>,
	toClasses: Record<string, ClassData>,
): ClassPerkDiff[] {
	const allClasses = new Set([...Object.keys(fromClasses), ...Object.keys(toClasses)])
	const result: ClassPerkDiff[] = []

	for (const className of allClasses) {
		const fromPerks = fromClasses[className]?.perks?.t2 ?? {}
		const toPerks = toClasses[className]?.perks?.t2 ?? {}
		const allPerks = new Set([...Object.keys(fromPerks), ...Object.keys(toPerks)])
		const changes: ClassPerkDiff["changes"] = []

		for (const perkName of allPerks) {
			const f = fromPerks[perkName] ?? null
			const t = toPerks[perkName] ?? null
			if (f !== null && t !== null && f !== t && hasNumericChange(f, t))
				changes.push({ perkName, from: f, to: t })
		}

		if (changes.length > 0) result.push({ className, changes })
	}

	return result.sort((a, b) => a.className.localeCompare(b.className))
}

export function computeHeroesDiff(
	fromHeroes: Record<string, HeroData>,
	toHeroes: Record<string, HeroData>,
): HeroDiff[] {
	const allHeroes = new Set([...Object.keys(fromHeroes), ...Object.keys(toHeroes)])
	const result: HeroDiff[] = []

	for (const heroName of allHeroes) {
		const fromHero = fromHeroes[heroName]
		const toHero = toHeroes[heroName]

		if (!fromHero || !toHero) {
			const hero = fromHero ?? toHero
			result.push({
				heroName,
				heroClass: hero.profile.class,
				heroThumbnail: hero.profile.thumbnail,
				status: !fromHero ? "added" : "removed",
				changes: [],
			})
			continue
		}

		const changes: HeroChangeSection[] = []

		// Skills
		const allSkillSlots = new Set([...Object.keys(fromHero.skills ?? {}), ...Object.keys(toHero.skills ?? {})])
		for (const slot of allSkillSlots) {
			const fs = fromHero.skills?.[slot]
			const ts = toHero.skills?.[slot]
			if (!fs || !ts) continue
			const items: FieldChange[] = []
			if (fs.name !== ts.name) items.push({ field: "Name", from: fs.name, to: ts.name })
			if (fs.cost !== ts.cost) items.push({ field: "Mana Cost", from: fs.cost ?? "N/A", to: ts.cost ?? "N/A" })
			if (fs.cooldown !== ts.cooldown)
				items.push({ field: "Cooldown", from: fs.cooldown ?? "N/A", to: ts.cooldown ?? "N/A" })
			const fd = normalizeDesc(fs.description)
			const td = normalizeDesc(ts.description)
			if (fd !== td) items.push({ field: "Description", from: fd, to: td })
			if (items.length) changes.push({ section: "skills", skillSlot: slot, skillName: fs.name, items })
		}

		// Books
		const allBookSlots = new Set([...Object.keys(fromHero.books ?? {}), ...Object.keys(toHero.books ?? {})])
		for (const slot of allBookSlots) {
			const fb = fromHero.books?.[slot]
			const tb = toHero.books?.[slot]
			if (!fb || !tb) continue
			const skillName = fromHero.skills?.[slot]?.name ?? `Skill ${slot}`
			const items: FieldChange[] = []
			for (const level of ["II", "III", "IV"] as const) {
				if (fb[level] !== tb[level])
					items.push({ field: `Rank ${level}`, from: fb[level] ?? null, to: tb[level] ?? null })
			}
			if (items.length) changes.push({ section: "books", bookSlot: slot, skillName, items })
		}

		// Perks T3
		const fromT3 = fromHero.perks?.t3 ?? {}
		const toT3 = toHero.perks?.t3 ?? {}
		const allT3Slots = new Set([...Object.keys(fromT3), ...Object.keys(toT3)])
		for (const slot of allT3Slots) {
			const fp = fromT3[slot]
			const tp = toT3[slot]
			if (!fp || !tp) continue
			const items: FieldChange[] = []
			const fl = stripColorCodes(fp.light?.effect ?? "")
			const tl = stripColorCodes(tp.light?.effect ?? "")
			if (fl !== tl) items.push({ field: "Light", from: fl, to: tl })
			const fd = stripColorCodes(fp.dark?.effect ?? "")
			const td = stripColorCodes(tp.dark?.effect ?? "")
			if (fd !== td) items.push({ field: "Dark", from: fd, to: td })
			if (items.length) changes.push({ section: "perks-t3", slot, items })
		}

		// Perks T5
		const ft5 = fromHero.perks?.t5
		const tt5 = toHero.perks?.t5
		if (ft5 && tt5) {
			const items: FieldChange[] = []
			const fl = stripColorCodes(ft5.light?.effect ?? "")
			const tl = stripColorCodes(tt5.light?.effect ?? "")
			if (fl !== tl) items.push({ field: "Light", from: fl, to: tl })
			const fd = stripColorCodes(ft5.dark?.effect ?? "")
			const td = stripColorCodes(tt5.dark?.effect ?? "")
			if (fd !== td) items.push({ field: "Dark", from: fd, to: td })
			if (items.length) changes.push({ section: "perks-t5", items })
		}

		// UW
		const fuw = fromHero.uw
		const tuw = toHero.uw
		if (fuw && tuw) {
			const items: FieldChange[] = []
			if (fuw.name !== tuw.name) items.push({ field: "Name", from: fuw.name, to: tuw.name })
			const fd = stripColorCodes(fuw.description)
			const td = stripColorCodes(tuw.description)
			if (fd !== td) items.push({ field: "Description", from: fd, to: td })
			const allParams = new Set([...Object.keys(fuw.value ?? {}), ...Object.keys(tuw.value ?? {})])
			for (const param of allParams) {
				const fv = Object.values(fuw.value?.[param] ?? {}).join(" / ")
				const tv = Object.values(tuw.value?.[param] ?? {}).join(" / ")
				if (fv !== tv) items.push({ field: `{${param}} values (+0 → +5)`, from: fv || null, to: tv || null })
			}
			if (items.length) changes.push({ section: "uw", uwName: fuw.name, items })
		}

		// UTs
		const futs = fromHero.uts ?? {}
		const tuts = toHero.uts ?? {}
		const allUTSlots = new Set([...Object.keys(futs), ...Object.keys(tuts)])
		for (const slot of allUTSlots) {
			const fut = futs[slot]
			const tut = tuts[slot]
			if (!fut || !tut) continue
			const items: FieldChange[] = []
			if (fut.name !== tut.name) items.push({ field: "Name", from: fut.name, to: tut.name })
			const fd = stripColorCodes(fut.description)
			const td = stripColorCodes(tut.description)
			if (fd !== td) items.push({ field: "Description", from: fd, to: td })
			const allParams = new Set([...Object.keys(fut.value ?? {}), ...Object.keys(tut.value ?? {})])
			for (const param of allParams) {
				const fv = Object.values(fut.value?.[param] ?? {}).join(" / ")
				const tv = Object.values(tut.value?.[param] ?? {}).join(" / ")
				if (fv !== tv) items.push({ field: `{${param}} values (+0 → +5)`, from: fv || null, to: tv || null })
			}
			if (items.length) changes.push({ section: "uts", utSlot: slot, utName: fut.name, items })
		}

		// SW
		const fsw = fromHero.sw
		const tsw = toHero.sw
		if (fsw && tsw) {
			const items: FieldChange[] = []
			const fd = stripColorCodes(fsw.description)
			const td = stripColorCodes(tsw.description)
			if (fd !== td) items.push({ field: "Description", from: fd, to: td })
			if (fsw.cooldown !== tsw.cooldown) items.push({ field: "Cooldown", from: fsw.cooldown, to: tsw.cooldown })
			if (fsw.uses !== tsw.uses) items.push({ field: "Uses", from: fsw.uses, to: tsw.uses })
			const allAdvKeys = new Set([...Object.keys(fsw.advancement ?? {}), ...Object.keys(tsw.advancement ?? {})])
			for (const key of allAdvKeys) {
				const fv = stripColorCodes(fsw.advancement?.[key] ?? "")
				const tv = stripColorCodes(tsw.advancement?.[key] ?? "")
				if (fv !== tv) items.push({ field: `Advancement ${key}`, from: fv || null, to: tv || null })
			}
			if (items.length) changes.push({ section: "sw", items })
		}

		if (changes.length > 0) {
			result.push({
				heroName,
				heroClass: fromHero.profile.class,
				heroThumbnail: fromHero.profile.thumbnail,
				status: "changed",
				changes,
			})
		}
	}

	return result.sort((a, b) => a.heroName.localeCompare(b.heroName))
}
