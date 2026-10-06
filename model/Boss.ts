export interface BossInfo {
	name: string
	recommendedHeroNames?: string[]
	title: string
	type: string[]
	race: string
	damage_type: string
	recommended_heroes: string
	characteristics: string
	thumbnail: string
}

export interface Skill {
	name: string
	cost: string | null
	cooldown: string | null
	description: string
}

export interface BossData {
	id: string
	profile: BossInfo
	skills: {
		[skillId: string]: Skill
	}
	aliases?: string[] | null
}
