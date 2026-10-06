import fs from "fs"
import path from "path"
import { cache } from "react"
import type { VoiceFiles } from "@/app/heroes/components/voices"

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ""

type VoiceAliases = Readonly<Record<string, readonly string[]>>

// Read at runtime so the optional audio repository is not required to compile.
const getVoiceAliases = cache(async (): Promise<VoiceAliases> => {
	const configPath = path.join(process.cwd(), "public", "kingsraid-audio", "name_diff.json")
	try {
		const aliases = JSON.parse(await fs.promises.readFile(configPath, "utf8")) as VoiceAliases
		return Object.fromEntries(Object.entries(aliases).map(([name, prefixes]) => [name.toLowerCase(), prefixes]))
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") return {}
		throw error
	}
})

const AUDIO_EXTENSION = /\.(wav|mp3|ogg)$/i

export const getVoiceFiles = cache(async (heroName: string): Promise<VoiceFiles> => {
	const voicesDir = path.join(process.cwd(), "public", "kingsraid-audio", "voices", "heroes")
	const voiceFiles: VoiceFiles = {
		en: [],
		jp: [],
		kr: [],
	}

	const languages = ["en", "jp", "kr"] as const
	const voiceAliases = await getVoiceAliases()
	const prefixes = [heroName, ...(voiceAliases[heroName.toLowerCase()] ?? [])].map((name) => name.toLowerCase())

	for (const lang of languages) {
		const langDir = path.join(voicesDir, lang)

		try {
			if (!fs.existsSync(langDir)) {
				continue
			}

			const entries = await fs.promises.readdir(langDir, { withFileTypes: true })
			// Support grouped hero folders and older flat audio checkouts.
			const files = entries.filter((entry) => entry.isFile()).map((entry) => ({ filename: entry.name, folder: "" }))
			const heroFolders = entries.filter((entry) => entry.isDirectory() && prefixes.includes(entry.name.toLowerCase()))
			for (const folder of heroFolders) {
				const folderEntries = await fs.promises.readdir(path.join(langDir, folder.name), { withFileTypes: true })
				files.push(...folderEntries.filter((entry) => entry.isFile()).map((entry) => ({ filename: entry.name, folder: folder.name })))
			}

			voiceFiles[lang] = files.flatMap(({ filename, folder }) => {
				if (!AUDIO_EXTENSION.test(filename)) return []
				const lowerFile = filename.toLowerCase()
				const prefix = prefixes.find((name) =>
					lowerFile.startsWith(`${name}-`) ||
					lowerFile.startsWith(`${name}_vox_`) ||
					lowerFile.startsWith(`${name}_welcome_`),
				)
				if (!prefix) return []

				// UI labels and model animation matching use the canonical hero ID.
				// The URL must still point to the unchanged asset filename.
				const name = `${heroName}-${filename.slice(prefix.length + 1).replace(AUDIO_EXTENSION, "")}`
				const assetPath = [lang, folder, filename].filter(Boolean).map(encodeURIComponent).join("/")
				return [{
					name,
					path: `${basePath}/kingsraid-audio/voices/heroes/${assetPath}`,
					displayName: name,
				}]
			})

			// Sort by filename
			voiceFiles[lang].sort((a, b) => a.name.localeCompare(b.name))
		} catch (error) {
			console.error(error)
		}
	}

	return voiceFiles
})
