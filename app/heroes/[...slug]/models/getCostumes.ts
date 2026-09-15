import { readdir } from "fs/promises"
import { cache } from "react"
import path from "path"
import { capitalize } from "@/lib/utils"
import { Costume } from "@/model/Hero_Model"

export const getCostumeData = cache(async (costumePath: string): Promise<Costume[]> => {
	if (!costumePath) return []

	try {
		const fullPath = path.join(process.cwd(), "public", "kingsraid-data", "assets", costumePath)

		const files = await readdir(fullPath)
		const imageFiles = files.filter((file) => file.toLowerCase().match(/\.(png|gif)$/))

		const costumes: Costume[] = imageFiles.map((filename) => {
			// Remove file extension for display name
			const nameWithoutExt = filename.replace(/\.(png|gif)$/i, "")

			// Create a more readable display name
			let displayName = nameWithoutExt

			// Handle numbered costumes (cos_01, cos_02, etc.)
			if (nameWithoutExt.match(/^cos_\d+$/)) {
				const number = nameWithoutExt.replace("cos_", "")
				displayName = `Costume ${parseInt(number)}`
			} else {
				// Capitalize and format other costume names
				displayName = capitalize(nameWithoutExt.replace(/_/g, " "))
			}

			return {
				name: nameWithoutExt,
				path: `${costumePath}/${encodeURIComponent(filename)}`,
				displayName,
			}
		})

		// Sort costumes: numbered ones first, then alphabetically
		costumes.sort((a, b) => {
			const aIsNumbered = a.name.match(/^cos_\d+$/)
			const bIsNumbered = b.name.match(/^cos_\d+$/)

			if (aIsNumbered && bIsNumbered) {
				// Both are numbered, sort by number
				const aNum = parseInt(a.name.replace("cos_", ""))
				const bNum = parseInt(b.name.replace("cos_", ""))
				return aNum - bNum
			} else if (aIsNumbered) {
				// Only a is numbered, it comes first
				return -1
			} else if (bIsNumbered) {
				// Only b is numbered, it comes first
				return 1
			} else {
				// Neither is numbered, sort alphabetically
				return a.displayName.localeCompare(b.displayName)
			}
		})

		return costumes
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") return []
		console.error(error)
		return []
	}
})
