export interface HeroData {
	id: string
	profile: {
		name: string
		title: string
		class: string
		position: string
		attack_range: string
		damage_type: string
		gender: string
		age: string
		height: string
		race: string
		constellation: string
		birth: { month: number; day: number; monthName: string }
		like: string
		dislike: string
		story: string
		thumbnail: string
	}
	skills: {
		[key: string]: {
			name: string
			cost: string | null
			cooldown: string | null
			description: string
			thumbnail: string
		}
	}
	books: {
		[key: string]: {
			II: string
			III: string
			IV: string
		}
	}
	perks: {
		t3: {
			[key: string]: {
				light?: {
					effect: string
					thumbnail: string
				}
				dark?: {
					effect: string
					thumbnail: string
				}
			}
		}
		t5: {
			light: {
				effect: string
				thumbnail: string
			}
			dark: {
				effect: string
				thumbnail: string
			}
		}
	}
	uw: {
		descriptionByStar?: Record<string, string>
		name: string
		description: string
		value: {
			[key: string]: {
				[key: string]: string
			}
		}
		thumbnail: string
		story: string
	}
	uts: {
		[key: string]: {
			name: string
			descriptionByStar?: Record<string, string>
			description: string
			value: {
				[key: string]: {
					[key: string]: string
				}
			}
			thumbnail: string
			story: string
		}
	}
	sw: {
		requirement: string
		description: string
		cooldown: string
		uses: string
		thumbnail: string
		advancement: {
			[key: string]: string
		}
		story: string
	}
	splashart: string
	costumes: string
	visual?: string | null
	aliases?: string[] | null
	_localization?: {
		locale: string
		sourceBuild?: number
		version?: string
		englishFallbackFields: string[]
	}
}
