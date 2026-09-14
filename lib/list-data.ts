import type { HeroData } from "@/model/Hero"
import type { BossData } from "@/model/Boss"
import type { ArtifactData } from "@/model/Artifact"

// Keep detail records on the server when a list only needs summary fields.
export type HeroListItem = Pick<HeroData, "aliases" | "splashart"> & {
	profile: Pick<HeroData["profile"], "name" | "title" | "class" | "damage_type">
}

export function toHeroListItem(hero: HeroData): HeroListItem {
	const { name, title, class: heroClass, damage_type } = hero.profile
	return {
		profile: { name, title, class: heroClass, damage_type },
		splashart: hero.splashart,
		aliases: hero.aliases,
	}
}

export interface SearchData {
	heroes: (Pick<HeroData, "aliases"> & {
		profile: Pick<HeroData["profile"], "name" | "title">
	})[]
	artifacts: Pick<ArtifactData, "name" | "description" | "aliases">[]
	bosses: (Pick<BossData, "aliases"> & {
		profile: Pick<BossData["profile"], "name" | "title">
	})[]
}

export function toSearchData(heroes: HeroData[], artifacts: ArtifactData[], bosses: BossData[]): SearchData {
	return {
		heroes: heroes.map(({ profile: { name, title }, aliases }) => ({ profile: { name, title }, aliases })),
		artifacts: artifacts.map(({ name, description, aliases }) => ({ name, description, aliases })),
		bosses: bosses.map(({ profile: { name, title }, aliases }) => ({ profile: { name, title }, aliases })),
	}
}
