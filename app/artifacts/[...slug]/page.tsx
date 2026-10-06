import fs from "fs"
import path from "path"
import { notFound } from "next/navigation"
import ArtifactPageWrapper from "@/app/artifacts/[...slug]/page-wrapper"
import { ArtifactData } from "@/model/Artifact"
import { getArtifactModels } from "@/lib/artifact-models"
import { SlugPageProps, findData, fetchAllVersions, getArtifactNamesForVersion } from "@/lib/get-data"

const isStaticExport = process.env.NEXT_STATIC_EXPORT === "true"

async function staticParams() {
	// Only generate static params when building for static export (GitHub Pages)
	if (!isStaticExport) {
		return []
	}

	const artifactsPath = path.join(process.cwd(), "public", "kingsraid-data", "table-data", "legacy", "en", "artifacts.json")
	const slugs: string[] = []

	if (fs.existsSync(artifactsPath)) {
		const fileContent = fs.readFileSync(artifactsPath, "utf-8")
		const data: ArtifactData[] = JSON.parse(fileContent)
		for (const artifact of data) {
			if (artifact.id) {
				// Convert to slug format (lowercase with hyphens)
				const slug = artifact.id.toLowerCase().replace(/\s+/g, "-")
				slugs.push(slug)
			}
			// Also generate slugs for aliases
			if (artifact.aliases && Array.isArray(artifact.aliases)) {
				for (const alias of artifact.aliases) {
					const slug = alias.toLowerCase().replace(/\s+/g, "-")
					slugs.push(slug)
				}
			}
		}
	}

	return slugs.map((slug) => ({ slug: [slug] }))
}

export default async function SlugPage({ params }: SlugPageProps) {
	const { slug } = await params
	const artifactName = slug?.[0]

	if (!artifactName) {
		notFound()
	}

	// Fetch legacy data (always exists as base)
	const artifactDataLegacy = (await findData(artifactName, "artifacts", {
		dataVersion: "legacy",
	})) as ArtifactData | null

	if (!artifactDataLegacy) {
		notFound()
	}

	// Fetch data for all versions
	const artifactsMap = await fetchAllVersions<ArtifactData | null>(async (version) => {
		// Optimization: legacy is already fetched
		if (version === "legacy") return artifactDataLegacy

		// findData handles gracefully returning null if not found
		return (await findData(artifactName, "artifacts", { dataVersion: version })) as ArtifactData | null
	})

	// Get ordered list of all artifact slugs for prev/next navigation
	const allLegacyArtifacts = await getArtifactNamesForVersion("legacy")
	const sortedArtifactSlugs = allLegacyArtifacts
		.sort((a, b) => a.localeCompare(b))
		.map((name) => name.toLowerCase().replace(/\s+/g, "-"))

	const artifactModels = await getArtifactModels(artifactDataLegacy.id)
	return (
		<ArtifactPageWrapper
			artifactsMap={artifactsMap}
			sortedArtifactSlugs={sortedArtifactSlugs}
			artifactModels={artifactModels}
		/>
	)
}

// Cookie-based locales require request-time rendering on server deployments.
export const generateStaticParams = isStaticExport ? staticParams : undefined
