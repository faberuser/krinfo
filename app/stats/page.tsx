import { readFile, readdir } from "fs/promises"
import path from "path"
import { DATA_VERSIONS } from "@/lib/constants"
import StatsClient from "@/app/stats/client"
import type { HeroData } from "@/model/Hero"
import type { ClassesComparison, HeroComparison, HeroDiffSummary } from "@/app/stats/types"
import { computeHeroesDiff } from "@/app/stats/diff-utils"

const TABLE_DATA = path.join(process.cwd(), "public", "kingsraid-data", "table-data")
const STATS_DIR = path.join(process.cwd(), "public", "kingsraid-stats")

async function readJson<T>(filePath: string): Promise<T | null> {
	try {
		return JSON.parse(await readFile(filePath, "utf-8")) as T
	} catch {
		return null
	}
}

async function readDirectory<T>(directory: string, exclude?: string): Promise<Record<string, T>> {
	let files: string[]
	try {
		files = await readdir(directory)
	} catch {
		return {}
	}
	const entries = await Promise.all(files.filter((file) => file.endsWith(".json") && file !== exclude).map(async (file) => {
		const data = await readJson<T>(path.join(directory, file))
		return data === null ? [] : [[file.slice(0, -5), data] as const]
	}))
	return Object.fromEntries(entries.flat())
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
	const pairs = DATA_VERSIONS.flatMap((va) => DATA_VERSIONS.filter((vb) => va !== vb).map((vb) => `${va}_vs_${vb}`))
	const [descData, versions, comparisons] = await Promise.all([
		readJson<{ data_versions: Record<string, { label: string }> }>(path.join(TABLE_DATA, "description.json")),
		Promise.all(DATA_VERSIONS.map(async (version) => {
			const [runes, classes, heroes] = await Promise.all([
				readJson<RuneEntry[]>(path.join(TABLE_DATA, version, "runes.json")),
				readDirectory<ClassData>(path.join(TABLE_DATA, version, "classes")),
				readDirectory<HeroData>(path.join(TABLE_DATA, version, "heroes")),
			])
			return { version, runes: runes ?? [], classes, heroes }
		})),
		Promise.all(pairs.map(async (key) => {
			const [classes, heroes] = await Promise.all([
				readJson<ClassesComparison>(path.join(STATS_DIR, key, "classes.json")),
				readDirectory<HeroComparison>(path.join(STATS_DIR, key), "classes.json"),
			])
			return { key, classes, heroes }
		})),
	])

	const versionLabels: Record<string, string> = {}
	for (const version of DATA_VERSIONS) {
		versionLabels[version] = descData?.data_versions[version]?.label ?? version
	}

	const runesMap = Object.fromEntries(versions.map((data) => [data.version, data.runes]))
	const classesMap = Object.fromEntries(versions.map((data) => [data.version, data.classes]))
	const classesPairMap = Object.fromEntries(comparisons.flatMap((data) => data.classes ? [[data.key, data.classes]] : []))
	const heroPairMap = Object.fromEntries(comparisons.map((data) => [data.key, data.heroes]))
	const heroSummaries: Record<string, HeroDiffSummary[]> = {}
	for (const from of versions) {
		for (const to of versions) {
			if (from.version === to.version) continue
			heroSummaries[`${from.version}_vs_${to.version}`] = computeHeroesDiff(from.heroes, to.heroes).map(({ changes, ...hero }) => ({
				...hero,
				changeCount: changes.reduce((count, section) => count + section.items.length, 0),
			}))
		}
	}

	return (
		<StatsClient
			versionLabels={versionLabels}
			availableVersions={[...DATA_VERSIONS]}
			runesMap={runesMap}
			classesMap={classesMap}
			heroSummaries={heroSummaries}
			classesPairMap={classesPairMap}
			heroPairMap={heroPairMap}
		/>
	)
}
