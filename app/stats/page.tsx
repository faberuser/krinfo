import fs from "fs"
import path from "path"
import { DATA_VERSIONS } from "@/lib/constants"
import StatsClient from "@/app/stats/client"
import type { HeroData } from "@/model/Hero"
import type { ClassesComparison } from "@/app/stats/types"

const TABLE_DATA = path.join(process.cwd(), "public", "kingsraid-data", "table-data")
const STATS_DIR = path.join(process.cwd(), "public", "kingsraid-stats")

function readJson<T>(filePath: string): T | null {
	try {
		if (!fs.existsSync(filePath)) return null
		return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T
	} catch {
		return null
	}
}

export interface RuneEntry {
	name: string
	grade: string
	stats: Record<string, string>
}

export interface ClassData {
	perks: {
		t2: Record<string, string>
	}
}

export interface StatsData {
	versionLabels: Record<string, string>
	availableVersions: string[]
	runesMap: Record<string, RuneEntry[]>
	classesMap: Record<string, Record<string, ClassData>>
	heroesMap: Record<string, Record<string, HeroData>>
}

export default async function StatsPage() {
	const descData = readJson<{ data_versions: Record<string, { label: string }> }>(
		path.join(TABLE_DATA, "description.json"),
	)

	const versionLabels: Record<string, string> = {}
	for (const version of DATA_VERSIONS) {
		versionLabels[version] = descData?.data_versions[version]?.label ?? version
	}

	// Load runes for each version
	const runesMap: Record<string, RuneEntry[]> = {}
	for (const version of DATA_VERSIONS) {
		runesMap[version] = readJson<RuneEntry[]>(path.join(TABLE_DATA, version, "runes.json")) ?? []
	}

	// Load class perks for each version
	const classesMap: Record<string, Record<string, ClassData>> = {}
	for (const version of DATA_VERSIONS) {
		const classesDir = path.join(TABLE_DATA, version, "classes")
		const classData: Record<string, ClassData> = {}
		if (fs.existsSync(classesDir)) {
			const files = fs.readdirSync(classesDir).filter((f) => f.endsWith(".json"))
			for (const file of files) {
				const className = file.replace(".json", "")
				const data = readJson<ClassData>(path.join(classesDir, file))
				if (data) classData[className] = data
			}
		}
		classesMap[version] = classData
	}

	// Load pre-generated class perk comparisons per version pair
	const classesPairMap: Record<string, ClassesComparison> = {}
	for (const va of DATA_VERSIONS) {
		for (const vb of DATA_VERSIONS) {
			if (va === vb) continue
			const key = `${va}_vs_${vb}`
			const data = readJson<ClassesComparison>(path.join(STATS_DIR, key, "classes.json"))
			if (data) classesPairMap[key] = data
		}
	}

	// Load pre-generated hero comparisons per version pair
	const heroPairMap: Record<string, Record<string, import("@/app/stats/types").HeroComparison>> = {}
	for (const va of DATA_VERSIONS) {
		for (const vb of DATA_VERSIONS) {
			if (va === vb) continue
			const key = `${va}_vs_${vb}`
			heroPairMap[key] = {}
			const pairDir = path.join(STATS_DIR, key)
			if (fs.existsSync(pairDir)) {
				const files = fs.readdirSync(pairDir).filter((f) => f.endsWith(".json") && f !== "classes.json")
				for (const file of files) {
					const heroName = file.replace(".json", "")
					const data = readJson<import("@/app/stats/types").HeroComparison>(path.join(pairDir, file))
					if (data) heroPairMap[key][heroName] = data
				}
			}
		}
	}

	// Load heroes for each version
	const heroesMap: Record<string, Record<string, HeroData>> = {}
	for (const version of DATA_VERSIONS) {
		const heroesDir = path.join(TABLE_DATA, version, "heroes")
		const heroData: Record<string, HeroData> = {}
		if (fs.existsSync(heroesDir)) {
			const files = fs.readdirSync(heroesDir).filter((f) => f.endsWith(".json"))
			for (const file of files) {
				const heroName = file.replace(".json", "")
				const data = readJson<HeroData>(path.join(heroesDir, file))
				if (data) heroData[heroName] = data
			}
		}
		heroesMap[version] = heroData
	}

	return (
		<StatsClient
			versionLabels={versionLabels}
			availableVersions={[...DATA_VERSIONS]}
			runesMap={runesMap}
			classesMap={classesMap}
			heroesMap={heroesMap}
			classesPairMap={classesPairMap}
			heroPairMap={heroPairMap}
		/>
	)
}
