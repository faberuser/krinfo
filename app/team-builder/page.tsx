import fs from "fs"
import path from "path"
import { HeroData } from "@/model/Hero"
import { ArtifactData } from "@/model/Artifact"
import {
	getData,
	getJsonDataList,
	getHeroReleaseOrder,
	getArtifactReleaseOrder,
	fetchAllVersions,
} from "@/lib/get-data"
import TeamBuilderClient from "@/app/team-builder/client"
import { HERO_CLASSES } from "@/lib/constants"

interface ClassPerksData {
	perks: {
		t1?: Record<string, string>
		t2?: Record<string, string>
	}
}

async function getClassPerks(version: string): Promise<{
	general: ClassPerksData
	classes: Record<string, ClassPerksData>
}> {
	const classesDir = path.join(process.cwd(), "public", "kingsraid-data", "table-data", version, "en", "classes")
	const result: {
		general: ClassPerksData
		classes: Record<string, ClassPerksData>
	} = {
		general: { perks: {} },
		classes: {},
	}

	try {
		// Read General.json for T1 perks
		const generalPath = path.join(classesDir, "General.json")
		if (fs.existsSync(generalPath)) {
			const content = fs.readFileSync(generalPath, "utf-8")
			result.general = JSON.parse(content)
		}

		// Read class-specific files for T2 perks
		const classNames = ["Knight", "Warrior", "Archer", "Mechanic", "Wizard", "Assassin", "Priest"]
		for (const className of classNames) {
			const classPath = path.join(classesDir, `${className}.json`)
			if (fs.existsSync(classPath)) {
				const content = fs.readFileSync(classPath, "utf-8")
				result.classes[className.toLowerCase()] = JSON.parse(content)
			}
		}
	} catch (error) {
		console.error("Error loading class perks:", error)
	}

	return result
}

export default async function TeamBuilderPage() {
	// Fetch all independent data in parallel
	const [heroesMap, artifactsLegacy, saReverse, releaseOrderMap, artifactReleaseOrder, classPerksMap] =
		await Promise.all([
			fetchAllVersions<HeroData[]>(
				(version) => getData("heroes", { dataVersion: version }) as Promise<HeroData[]>,
			),
			getData("artifacts", { dataVersion: "legacy" }) as Promise<ArtifactData[]>,
			getJsonDataList("table-data/sa_reverse.json") as Promise<string[]>,
			fetchAllVersions<Record<string, string>>((version) => getHeroReleaseOrder(version)),
			getArtifactReleaseOrder("legacy"),
			fetchAllVersions(getClassPerks),
		])

	return (
		<TeamBuilderClient
			heroesMap={heroesMap}
			artifacts={artifactsLegacy}
			artifactReleaseOrder={artifactReleaseOrder}
			saReverse={saReverse}
			classPerksMap={classPerksMap}
			heroClasses={HERO_CLASSES}
			releaseOrderMap={releaseOrderMap}
		/>
	)
}
