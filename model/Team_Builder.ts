import { HeroData } from "@/model/Hero"
import { ArtifactData } from "@/model/Artifact"
import { DataVersion } from "@/lib/constants"

// Perk costs
export const PERK_COSTS = {
	t1: 10,
	t2: 15,
	t3: 15,
	t5: 15,
} as const

export const DEFAULT_MAX_POINTS = 95
export const MIN_POINTS = 80
export const MAX_POINTS = 95

export interface ClassPerksData {
	perks: {
		t1?: Record<string, string>
		t2?: Record<string, string>
	}
}

export interface SelectedPerks {
	t1: string[]
	t2: string[]
	t3: { skill: string; type: "light" | "dark" }[]
	t5: ("light" | "dark")[]
}

export interface TeamMember {
	hero: HeroData | null
	uw: boolean
	ut: string | null // "1", "2", "3", or "4"
	artifact: ArtifactData | null
	perks: SelectedPerks
	maxPoints: number
}

export interface TeamBuilderClientProps {
	heroesMap: Record<DataVersion, HeroData[]>
	artifacts: ArtifactData[]
	artifactReleaseOrder: Record<string, string>
	saReverse: string[]
	classPerksMap: Record<DataVersion, {
		general: ClassPerksData
		classes: Record<string, ClassPerksData>
	}>
	heroClasses: readonly {
		readonly value: string
		readonly name: string
		readonly icon: string
	}[]
	releaseOrderMap: Record<DataVersion, Record<string, string>>
}
