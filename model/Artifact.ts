export interface ArtifactData {
	name: string
	id: string
	descriptionByStar?: Record<string, string>
	description: string
	value: {
		[key: string]: string
	}
	thumbnail: string
	story: string
	aliases?: string[] | null
}
