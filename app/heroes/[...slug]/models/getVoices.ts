import fs from "fs"
import path from "path"
import { cache } from "react"
import { VoiceFiles } from "@/app/heroes/components/voices"

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ""

export const getVoiceFiles = cache(async (heroName: string): Promise<VoiceFiles> => {
	const voicesDir = path.join(process.cwd(), "public", "kingsraid-audio", "voices", "heroes")
	const voiceFiles: VoiceFiles = {
		en: [],
		jp: [],
		kr: [],
	}

	const languages = ["en", "jp", "kr"] as const

	for (const lang of languages) {
		const langDir = path.join(voicesDir, lang)

		try {
			if (!fs.existsSync(langDir)) {
				continue
			}

			const files = await fs.promises.readdir(langDir)

			// Filter files that belong to this hero
			const heroFiles = files.filter((file) => {
				const lowerFile = file.toLowerCase()
				const lowerHeroName = heroName.toLowerCase()
				return lowerFile.startsWith(`${lowerHeroName}-`) && lowerFile.match(/\.(wav|mp3|ogg)$/i)
			})

			voiceFiles[lang] = heroFiles.map((filename) => {
				const nameWithoutExt = filename.replace(/\.(wav|mp3|ogg)$/i, "")
				return {
					name: nameWithoutExt,
					path: `${basePath}/kingsraid-audio/voices/heroes/${lang}/${encodeURIComponent(filename)}`,
					displayName: nameWithoutExt,
				}
			})

			// Sort by filename
			voiceFiles[lang].sort((a, b) => a.name.localeCompare(b.name))
		} catch (error) {
			console.error(error)
		}
	}

	return voiceFiles
})
