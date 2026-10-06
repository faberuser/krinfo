"use client"

import HeroCompareWrapper from "@/components/compare/hero-compare-wrapper"
import { HeroData } from "@/model/Hero"
import { Costume, ModelFile } from "@/model/Hero_Model"
import { VoiceFiles } from "@/app/heroes/components/voices"
import { useDataVersion } from "@/hooks/use-data-version"
import { DataVersion, DATA_VERSIONS } from "@/lib/constants"
import { useEnableVersionToggle } from "@/contexts/version-toggle-context"
import { useEffect, useMemo } from "react"
import { Spinner } from "@/components/ui/spinner"
import { ClassPerksData } from "@/app/heroes/components/perks"

interface HeroPageWrapperProps {
	heroDataMap: Record<DataVersion, HeroData | null>
	costumesMap: Record<DataVersion, Costume[]>
	heroModelsMap: Record<DataVersion, { [costume: string]: ModelFile[] }>
	voiceFilesMap: Record<DataVersion, VoiceFiles>
	availableScenes?: Array<{ value: string; label: string }>
	enableModelsVoices?: boolean
	classPerksMap: Record<DataVersion, ClassPerksData>
	sortedHeroSlugs: string[]
}

export default function HeroPageWrapper({
	heroDataMap,
	costumesMap,
	heroModelsMap,
	voiceFilesMap,
	availableScenes = [],
	enableModelsVoices = false,
	classPerksMap,
	sortedHeroSlugs,
}: HeroPageWrapperProps) {
	const { version, setVersion, isHydrated } = useDataVersion()

	// Determine available versions for this hero
	const availableVersions = useMemo(() => {
		return DATA_VERSIONS.filter((v) => heroDataMap[v] !== null)
	}, [heroDataMap])

	const showVersionToggle = availableVersions.length > 1

	useEnableVersionToggle(availableVersions, showVersionToggle)

	useEffect(() => {
		// If user selects a version that doesn't have this hero, fallback to another version
		if (!heroDataMap[version] && availableVersions.length > 0) {
			setVersion(availableVersions[0])
		}
	}, [version, heroDataMap, availableVersions, setVersion])

	// Show loading while hydrating
	if (!isHydrated) {
		return (
			<div className="flex items-center justify-center h-96">
				<Spinner className="h-8 w-8" />
			</div>
		)
	}

	// Get the data for the current version, fallback to legacy if not available
	const heroData = heroDataMap[version] || heroDataMap.legacy || heroDataMap[availableVersions[0]]
	const costumes = costumesMap[version]
	const heroModels = heroModelsMap[version]
	const voiceFiles = voiceFilesMap[version]
	const classPerks = classPerksMap[version]

	if (!heroData) return null

	return (
		<HeroCompareWrapper
			heroDataMap={heroDataMap}
			availableVersions={availableVersions}
			currentHeroData={heroData}
			costumes={costumes}
			models={heroModels}
			voiceFiles={voiceFiles}
			availableScenes={availableScenes}
			enableModelsVoices={enableModelsVoices}
			classPerks={classPerks}
			classPerksMap={classPerksMap}
			sortedHeroSlugs={sortedHeroSlugs}
		/>
	)
}
