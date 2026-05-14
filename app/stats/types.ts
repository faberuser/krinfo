import type { HeroData } from "@/model/Hero"
import type { RuneEntry, ClassData } from "@/app/stats/page"

export interface FieldChange {
	field: string
	from: string | null
	to: string | null
}

export interface RuneDiff {
	runeName: string
	grade: string
	changes: Array<{ stat: string; from: string | null; to: string | null }>
	status: "changed" | "added" | "removed"
}

export interface ClassPerkDiff {
	className: string
	changes: Array<{ perkName: string; from: string | null; to: string | null }>
}

export type HeroChangeSection =
	| { section: "skills"; skillSlot: string; skillName: string; items: FieldChange[] }
	| { section: "books"; bookSlot: string; skillName: string; items: FieldChange[] }
	| { section: "perks-t3"; slot: string; items: FieldChange[] }
	| { section: "perks-t5"; items: FieldChange[] }
	| { section: "uw"; uwName: string; items: FieldChange[] }
	| { section: "uts"; utSlot: string; utName: string; items: FieldChange[] }
	| { section: "sw"; items: FieldChange[] }

export interface HeroDiff {
	heroName: string
	heroClass: string
	heroThumbnail: string
	status: "changed" | "added" | "removed"
	changes: HeroChangeSection[]
}

export interface StatsClientProps {
	versionLabels: Record<string, string>
	availableVersions: string[]
	runesMap: Record<string, RuneEntry[]>
	classesMap: Record<string, Record<string, ClassData>>
	heroesMap: Record<string, Record<string, HeroData>>
	classesPairMap: Record<string, ClassesComparison>
	heroPairMap: Record<string, Record<string, HeroComparison>>
}

export type TextDiff = { from?: string | null; to?: string | null; unified?: string }

export interface ClassPerkEntry {
	hasChanges: boolean
	description?: TextDiff
}

export interface ClassesComparison {
	versionA: string
	versionB: string
	generatedAt: string
	classes: Record<string, Record<string, ClassPerkEntry>>
}

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

export interface HeroSegment {
	versionA: string
	versionB: string
	versionALabel: string
	versionBLabel: string
	diff: HeroDiff | null
}
