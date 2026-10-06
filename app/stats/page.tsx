import { readFile } from "node:fs/promises"
import path from "node:path"
import { DATA_VERSIONS } from "@/lib/constants"
import StatsClient from "./client"

export default async function StatsPage() {
	const description = JSON.parse(await readFile(path.join(process.cwd(), "public/kingsraid-data/table-data/description.json"), "utf-8"))
	const versionLabels = Object.fromEntries(DATA_VERSIONS.map(version => [version, description.data_versions[version]?.label ?? version]))
	return <StatsClient versionLabels={versionLabels} />
}
