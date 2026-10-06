import type { HeroData } from "@/model/Hero"
import type { BossData } from "@/model/Boss"
import type { ArtifactData } from "@/model/Artifact"

// Keep detail records on the server when a list only needs summary fields.
export type HeroListItem = Pick<HeroData, "id" | "aliases" | "splashart"> & {
	profile: Pick<HeroData["profile"], "name" | "title" | "class" | "damage_type">
}

export function toHeroListItem(hero: HeroData): HeroListItem {
	const { name, title, class: heroClass, damage_type } = hero.profile
	return {
		id: hero.id,
		profile: { name, title, class: heroClass, damage_type },
		splashart: hero.splashart,
		aliases: hero.aliases,
	}
}

export interface SearchData {
	heroes: (Pick<HeroData, "id" | "aliases"> & {
		profile: Pick<HeroData["profile"], "name" | "title">
	})[]
	artifacts: Pick<ArtifactData, "id" | "name" | "description" | "aliases">[]
	bosses: (Pick<BossData, "id" | "aliases"> & {
		profile: Pick<BossData["profile"], "name" | "title">
	})[]
}

export function toSearchData(heroes: HeroData[], artifacts: ArtifactData[], bosses: BossData[]): SearchData {
	return {
		heroes: heroes.map(({ id, profile: { name, title }, aliases }) => ({ id, profile: { name, title }, aliases })),
		artifacts: artifacts.map(({ id, name, description, descriptionByStar, aliases }) => ({ id, name, description: descriptionByStar?.["0"] ?? description, aliases })),
		bosses: bosses.map(({ id, profile: { name, title }, aliases }) => ({ id, profile: { name, title }, aliases })),
	}
}
