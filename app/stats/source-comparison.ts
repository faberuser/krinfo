import type { FieldChange, HeroComparison, HeroDiff, TextDiff } from "./types"

/** Direct source comparisons for replaced datasets, without old generated prose. */
export function comparisonFromSourceDiff(diff: HeroDiff, versionA: string, versionB: string): HeroComparison {
	const result: HeroComparison = {
		heroName: diff.heroName, versionA, versionB, generatedAt: "",
		skills: {}, books: {}, perks_t3: {}, uts: {},
	}
	const find = (items: FieldChange[], field: string): TextDiff | undefined => {
		const item = items.find(item => item.field === field)
		return item ? { from: item.from, to: item.to } : undefined
	}
	const values = (items: FieldChange[], prefix: string) => Object.fromEntries(items
		.filter(item => item.field.startsWith(prefix))
		.map(item => [prefix === "{" ? item.field.slice(1, item.field.indexOf("}")) : item.field.slice(prefix.length), { from: item.from, to: item.to }]))
	for (const section of diff.changes) {
		const items = section.items
		switch (section.section) {
			case "skills":
				result.skills[section.skillSlot] = { hasChanges: true, name: find(items, "Name"), mana_cost: find(items, "Mana Cost"), cooldown: find(items, "Cooldown"), description: find(items, "Description") ?? find(items, "Skill") }
				break
			case "books":
				result.books[section.bookSlot] = { hasChanges: true, skillName: section.skillName, II: find(items, "Rank II"), III: find(items, "Rank III"), IV: find(items, "Rank IV") }
				break
			case "perks-t3":
				result.perks_t3[section.slot] = { hasChanges: true, light: find(items, "Light"), dark: find(items, "Dark") }
				break
			case "perks-t5":
				result.perks_t5 = { hasChanges: true, light: find(items, "Light"), dark: find(items, "Dark") }
				break
			case "uw":
				result.uw = { hasChanges: true, description: find(items, "Description"), values: values(items, "{") }
				break
			case "uts":
				result.uts[section.utSlot] = { hasChanges: true, name: section.utName, description: find(items, "Description"), values: values(items, "{") }
				break
			case "sw":
				result.sw = { hasChanges: true, description: find(items, "Description"), cooldown: find(items, "Cooldown"), uses: find(items, "Uses"), advancement: values(items, "Advancement ") }
				break
		}
	}
	return result
}
