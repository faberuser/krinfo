import fs from "fs"
import path from "path"
import { notFound } from "next/navigation"
import BossPageWrapper from "@/app/bosses/[...slug]/page-wrapper"
import { BossData } from "@/model/Boss"
import { SlugPageProps, findData, fetchAllVersions, getBossNamesForVersion } from "@/lib/get-data"
import { getBossModels } from "@/app/bosses/[...slug]/models/getBossModels"
import { getBossScenes } from "@/app/bosses/[...slug]/models/getBossScenes"

const isStaticExport = process.env.NEXT_STATIC_EXPORT === "true"
const enableModelsVoices = process.env.NEXT_PUBLIC_ENABLE_MODELS_VOICES === "true"

async function staticParams() {
	// Only generate static params when building for static export (GitHub Pages)
	if (!isStaticExport) {
		return []
	}

	const bossesDir = path.join(process.cwd(), "public", "kingsraid-data", "table-data", "legacy", "en", "bosses")
	const slugs: string[] = []

	if (fs.existsSync(bossesDir)) {
		const files = fs.readdirSync(bossesDir).filter((file) => file.endsWith(".json"))
		for (const file of files) {
			// Remove .json extension
			const name = file.replace(".json", "")
			// Convert to slug format (lowercase with hyphens)
			const slug = name.toLowerCase().replace(/\s+/g, "-")
			slugs.push(slug)
		}
	}

	return slugs.map((slug) => ({ slug: [slug] }))
}

export default async function SlugPage({ params }: SlugPageProps) {
	const { slug } = await params
	const bossName = slug?.[0]

	if (!bossName) {
		notFound()
	}

	const bossDataLegacy = (await findData(bossName, "bosses", { dataVersion: "legacy" })) as BossData | null

	if (!bossDataLegacy) {
		notFound()
	}

	// Fetch data for all versions
	const bossDataMap = await fetchAllVersions<BossData | null>(async (version) => {
		if (version === "legacy") return bossDataLegacy
		return (await findData(bossName, "bosses", { dataVersion: version })) as BossData | null
	})

	// Get boss model data server-side (only if enabled)
	const bossModels = enableModelsVoices ? await getBossModels(bossDataLegacy.id) : {}

	// Get boss scenes server-side (only if enabled)
	const bossScenes = enableModelsVoices ? await getBossScenes(bossDataLegacy.id) : []

	// Get ordered list of all boss slugs for prev/next navigation
	const allLegacyBosses = await getBossNamesForVersion("legacy")
	const sortedBossSlugs = allLegacyBosses
		.sort((a, b) => a.localeCompare(b))
		.map((name) => name.toLowerCase().replace(/\s+/g, "-"))

	return (
		<BossPageWrapper
			bossDataMap={bossDataMap}
			bossModels={bossModels}
			bossScenes={bossScenes}
			enableModelsVoices={enableModelsVoices}
			sortedBossSlugs={sortedBossSlugs}
		/>
	)
}

// Cookie-based locales require request-time rendering on server deployments.
export const generateStaticParams = isStaticExport ? staticParams : undefined
