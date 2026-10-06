"use client"

import { useCallback } from "react"
import HeroClient from "@/app/heroes/[...slug]/client"
import { HeroData } from "@/model/Hero"
import { Costume, ModelFile } from "@/model/Hero_Model"
import { VoiceFiles } from "@/app/heroes/components/voices"
import { DataVersion } from "@/lib/constants"
import { useCompareMode } from "@/hooks/use-compare-mode"
import { CompareLayout } from "@/components/compare"
import { ClassPerksData } from "@/app/heroes/components/perks"

interface HeroCompareWrapperProps {
	heroDataMap: Record<DataVersion, HeroData | null>
	availableVersions: DataVersion[]
	currentHeroData: HeroData
	costumes: Costume[]
	models: { [costume: string]: ModelFile[] }
	voiceFiles: VoiceFiles
	availableScenes?: Array<{ value: string; label: string }>
	enableModelsVoices?: boolean
	classPerks: ClassPerksData
	classPerksMap: Record<DataVersion, ClassPerksData>
	sortedHeroSlugs: string[]
}

export default function HeroCompareWrapper({
	heroDataMap,
	availableVersions,
	currentHeroData,
	costumes,
	models,
	voiceFiles,
	availableScenes = [],
	enableModelsVoices = false,
	classPerks,
	classPerksMap,
	sortedHeroSlugs,
}: HeroCompareWrapperProps) {
	const { isCompareMode, isHydrated } = useCompareMode()

	// Render content for a specific version
	const renderVersionContent = useCallback(
		(version: DataVersion) => {
			if (!heroDataMap[version]) {
				return null
			}
			return (
				<HeroClient
					heroData={heroDataMap[version]!}
					costumes={costumes}
					heroModels={models}
					voiceFiles={voiceFiles}
					availableScenes={availableScenes}
					enableModelsVoices={enableModelsVoices}
					classPerks={classPerksMap[version]}
					sortedHeroSlugs={sortedHeroSlugs}
				/>
			)
		},
		[heroDataMap, availableScenes, enableModelsVoices, sortedHeroSlugs, costumes, models, voiceFiles, classPerksMap],
	)

	if (!isHydrated || !isCompareMode) {
		return (
			<HeroClient
				heroData={currentHeroData}
				costumes={costumes}
				heroModels={models}
				voiceFiles={voiceFiles}
				availableScenes={availableScenes}
				enableModelsVoices={enableModelsVoices}
				classPerks={classPerks}
				sortedHeroSlugs={sortedHeroSlugs}
			/>
		)
	}

	return (
		<CompareLayout availableVersions={availableVersions} renderContent={renderVersionContent}>
			<HeroClient
				heroData={currentHeroData}
				costumes={costumes}
				heroModels={models}
				voiceFiles={voiceFiles}
				availableScenes={availableScenes}
				enableModelsVoices={enableModelsVoices}
				classPerks={classPerks}
				sortedHeroSlugs={sortedHeroSlugs}
			/>
		</CompareLayout>
	)
}
