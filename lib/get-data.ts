import fs from "fs"
import { readFile, readdir, stat } from "fs/promises"
import path from "path"
import { cache } from "react"
import { capitalize } from "@/lib/utils"
import { HeroData } from "@/model/Hero"
import { BossData } from "@/model/Boss"
import { ArtifactData } from "@/model/Artifact"
import { DATA_VERSIONS, DataVersion } from "@/lib/constants"

export interface SlugPageProps {
	params: Promise<{
		slug: string[]
	}>
}

type DataItem = HeroData | BossData | ArtifactData

// Map version to specific files/folders
function getSourcePathForVersion(version: DataVersion, source: string): string {
	const currentVersion = version || "legacy"
	return `${currentVersion}/${source}`
}

// Read and parse JSON files
const readJsonFile = cache(async <T,>(filePath: string): Promise<T | null> => {
	try {
		const fileContent = await readFile(filePath, "utf-8")
		return JSON.parse(fileContent)
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") return null
		console.error(`Error reading JSON file ${filePath}:`, error)
		return null
	}
})

const isDirectory = cache(async (filePath: string): Promise<boolean> => {
	try {
		return (await stat(filePath)).isDirectory()
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") return false
		throw error
	}
})

const getJsonFiles = cache(async (directory: string): Promise<string[]> => {
	return (await readdir(directory)).filter((file) => file.endsWith(".json"))
})

// Build file path helper
function buildPath(...segments: string[]): string {
	return path.join(process.cwd(), "public", "kingsraid-data", ...segments)
}

// Helper function to get name from data item
function getName(item: DataItem): string {
	if ("name" in item) {
		return item.name
	}
	return item.profile.name
}

// Helper function to sort data by name
function sortByName(data: DataItem[]): DataItem[] {
	return [...data].sort((a, b) => getName(a).localeCompare(getName(b)))
}

// ---------------------------------------------------------------------------
// Blur placeholder cache — module-level in-memory Map.
// Populated once per server process; cleared automatically on server restart
// or rebuild, so edited images are always picked up fresh.
// ---------------------------------------------------------------------------

const blurCache = new Map<string, string>()

// Generate a base64 blur placeholder for a local public image using Plaiceholder.
// `imagePath` should be the path as used in the <Image> src (e.g. "/kingsraid-data/assets/...").
// Results are cached in memory for the lifetime of the server process.
// Returns null if the file cannot be read (graceful degradation).
export async function getBlurDataURL(imagePath: string): Promise<string | null> {
	if (blurCache.has(imagePath)) return blurCache.get(imagePath)!

	try {
		const { getPlaiceholder } = await import("plaiceholder")
		const absolutePath = path.join(process.cwd(), "public", imagePath)
		if (!fs.existsSync(absolutePath)) return null
		const buffer = fs.readFileSync(absolutePath)
		const { base64 } = await getPlaiceholder(buffer)
		blurCache.set(imagePath, base64)
		return base64
	} catch (err) {
		console.warn(`[getBlurDataURL] Failed for ${imagePath}:`, err)
		return null
	}
}

// Generate blur placeholders for a list of image paths in parallel.
// Returns a map of imagePath → base64 blur data URL.
// Only uncached paths are processed; cached paths are resolved immediately.
export async function getBlurDataURLMap(imagePaths: string[]): Promise<Record<string, string>> {
	const uncached = imagePaths.filter((p) => !blurCache.has(p))

	if (uncached.length > 0) {
		const { getPlaiceholder } = await import("plaiceholder")
		await Promise.all(
			uncached.map(async (p) => {
				try {
					const absolutePath = path.join(process.cwd(), "public", p)
					if (!fs.existsSync(absolutePath)) return
					const buffer = fs.readFileSync(absolutePath)
					const { base64 } = await getPlaiceholder(buffer)
					blurCache.set(p, base64)
				} catch (err) {
					console.warn(`[getBlurDataURL] Failed for ${p}:`, err)
				}
			}),
		)
	}

	return Object.fromEntries(imagePaths.filter((p) => blurCache.has(p)).map((p) => [p, blurCache.get(p)!]))
}

// Get JSON data as object (key-value pairs)
export async function getJsonData(jsonFile: string): Promise<Record<string, string>> {
	const filePath = buildPath(jsonFile)
	const data = await readJsonFile<Record<string, string>>(filePath)
	return data ?? {}
}

// Get JSON data as array
export async function getJsonDataList(jsonFile: string): Promise<string[]> {
	const filePath = buildPath(jsonFile)
	const data = await readJsonFile<string[]>(filePath)
	return data ?? []
}

// Get all data from a file or directory
export async function getData(
	source: string,
	options: { sortByName?: boolean; dataVersion?: DataVersion } = { sortByName: true },
): Promise<DataItem[]> {
	let actualSource = source

	// Apply version-specific paths for different data types
	if (source === "heroes") {
		actualSource = getSourcePathForVersion(options.dataVersion || "legacy", "heroes")
	} else if (source === "artifacts" || source === "artifacts.json") {
		actualSource = getSourcePathForVersion(options.dataVersion || "legacy", "artifacts.json")
	} else if (source === "bosses") {
		actualSource = getSourcePathForVersion(options.dataVersion || "legacy", "bosses")
	}

	const fullPath = buildPath("table-data", actualSource)

	// Check if source is a directory
	if (await isDirectory(fullPath)) {
		try {
			const files = await getJsonFiles(fullPath)

			const dataPromises = files.map((file) => readJsonFile<DataItem>(path.join(fullPath, file)))

			const resolvedData = await Promise.all(dataPromises)
			const validData = resolvedData.filter((data): data is DataItem => data !== null)

			return options.sortByName ? sortByName(validData) : validData
		} catch (error) {
			console.error(`Error reading directory ${source}:`, error)
			return []
		}
	}

	// Otherwise, treat as a JSON file
	const data = await readJsonFile<DataItem[]>(fullPath)

	if (!data) return []

	return options.sortByName ? sortByName(data) : data
}

// Helper to normalize names for comparison
function normalizeName(str: string): string {
	return str
		.toLowerCase()
		.replace(/[\s\-]+/g, " ")
		.trim()
}

// Find single data by name/slug
export async function findData(
	slug: string,
	source: string,
	options: { dataVersion?: DataVersion } = {},
): Promise<DataItem | null> {
	const normalizedSlug = decodeURIComponent(slug).toLowerCase().replace(/-/g, " ")

	let actualSource = source

	// Apply version-specific paths for different data types
	if (source === "heroes") {
		actualSource = getSourcePathForVersion(options.dataVersion || "legacy", "heroes")
	} else if (source === "artifacts" || source === "artifacts.json") {
		actualSource = getSourcePathForVersion(options.dataVersion || "legacy", "artifacts.json")
	} else if (source === "bosses") {
		actualSource = getSourcePathForVersion(options.dataVersion || "legacy", "bosses")
	}

	const fullPath = buildPath("table-data", actualSource)

	// Check if source is a directory (for heroes/bosses)
	if (await isDirectory(fullPath)) {
		const capitalizedSlug = capitalize(normalizedSlug)
		const filePath = path.join(fullPath, `${capitalizedSlug}.json`)
		return await readJsonFile<DataItem>(filePath)
	}

	// Otherwise, search in array (for artifacts)
	const data = await readJsonFile<DataItem[]>(fullPath)

	if (!data) return null

	// Try to find by normalized name match
	let found = data.find((item) => {
		return normalizeName(getName(item)) === normalizedSlug
	})

	// If not found by name, search by aliases (only for artifacts)
	if (!found) {
		found = data.find((item) => {
			if ("aliases" in item && item.aliases) {
				return item.aliases.some((alias) => normalizeName(alias) === normalizedSlug)
			}
			return false
		})
	}

	return found ?? null
}

// Check if a hero exists in a specific version's data folder
export async function heroExistsInVersion(heroName: string, version: DataVersion): Promise<boolean> {
	const normalizedName = decodeURIComponent(heroName).toLowerCase().replace(/-/g, " ")
	const capitalizedName = capitalize(normalizedName)
	const folder = getSourcePathForVersion(version, "heroes")
	const filePath = buildPath("table-data", folder, `${capitalizedName}.json`)
	return fs.existsSync(filePath)
}

// Get list of heroes that exist in a specific version's data folder
export async function getHeroNamesForVersion(version: DataVersion): Promise<string[]> {
	const folder = getSourcePathForVersion(version, "heroes")
	const heroesPath = buildPath("table-data", folder)

	if (!fs.existsSync(heroesPath)) {
		return []
	}

	const files = fs.readdirSync(heroesPath).filter((file) => file.endsWith(".json"))
	return files.map((file) => file.replace(".json", ""))
}

// Check if an artifact exists in a specific version's data
export async function artifactExistsInVersion(artifactName: string, version: DataVersion): Promise<boolean> {
	const normalizedName = decodeURIComponent(artifactName).toLowerCase().replace(/-/g, " ")
	const artifactFile = getSourcePathForVersion(version, "artifacts.json")
	const filePath = buildPath("table-data", artifactFile)

	const data = await readJsonFile<ArtifactData[]>(filePath)
	if (!data) return false

	return data.some((artifact) => {
		const nameMatch = normalizeName(artifact.name) === normalizedName
		const aliasMatch = artifact.aliases?.some((alias) => normalizeName(alias) === normalizedName) ?? false
		return nameMatch || aliasMatch
	})
}

// Check if a boss exists in a specific version's data folder
export async function bossExistsInVersion(bossName: string, version: DataVersion): Promise<boolean> {
	const normalizedName = decodeURIComponent(bossName).toLowerCase().replace(/-/g, " ")
	const capitalizedName = capitalize(normalizedName)
	const folder = getSourcePathForVersion(version, "bosses")
	const filePath = buildPath("table-data", folder, `${capitalizedName}.json`)
	return fs.existsSync(filePath)
}

// Get list of artifact names that exist in a specific version's data
export async function getArtifactNamesForVersion(version: DataVersion): Promise<string[]> {
	const artifactFile = getSourcePathForVersion(version, "artifacts.json")
	const filePath = buildPath("table-data", artifactFile)

	const data = await readJsonFile<ArtifactData[]>(filePath)
	if (!data) return []

	return data.map((artifact) => artifact.name)
}

// Get list of boss names that exist in a specific version's data folder
export async function getBossNamesForVersion(version: DataVersion): Promise<string[]> {
	const folder = getSourcePathForVersion(version, "bosses")
	const bossesPath = buildPath("table-data", folder)

	if (!fs.existsSync(bossesPath)) {
		return []
	}

	const files = fs.readdirSync(bossesPath).filter((file) => file.endsWith(".json"))
	return files.map((file) => file.replace(".json", ""))
}

// Get hero release order for a specific version
export async function getHeroReleaseOrder(version: DataVersion): Promise<Record<string, string>> {
	const releaseOrderFile = getSourcePathForVersion(version, "hero_release_order.json")
	const filePath = buildPath("table-data", releaseOrderFile)
	const data = await readJsonFile<Record<string, string>>(filePath)
	return data ?? {}
}

// Get artifact release order for a specific version
export async function getArtifactReleaseOrder(version: DataVersion): Promise<Record<string, string>> {
	const releaseOrderFile = getSourcePathForVersion(version, "artifact_release_order.json")
	const filePath = buildPath("table-data", releaseOrderFile)
	const data = await readJsonFile<Record<string, string>>(filePath)
	return data ?? {}
}

export async function fetchAllVersions<T>(
	fetcher: (version: DataVersion) => Promise<T>,
): Promise<Record<DataVersion, T>> {
	const entries = await Promise.all(
		DATA_VERSIONS.map(async (version) => {
			return [version, await fetcher(version)] as const
		}),
	)
	return Object.fromEntries(entries) as Record<DataVersion, T>
}
