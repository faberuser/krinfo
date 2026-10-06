"use client"

import BossClient from "@/app/bosses/[...slug]/client"
import { BossData } from "@/model/Boss"
import { ModelFile } from "@/model/Hero_Model"
import { useEnableVersionToggle } from "@/contexts/version-toggle-context"
import { useMemo } from "react"
import { useDataVersion } from "@/hooks/use-data-version"
import { DataVersion, DATA_VERSIONS } from "@/lib/constants"
import { GameLanguageScope } from "@/components/i18n/language-provider"

// Boss models are now organized by variant (similar to hero costumes)
type BossModelData = Record<string, ModelFile[]>

interface BossPageWrapperProps {
	bossDataMap: Record<DataVersion, BossData | null>
	bossModels?: BossModelData
	bossScenes?: Array<{ value: string; label: string }>
	enableModelsVoices?: boolean
	sortedBossSlugs: string[]
}

export default function BossPageWrapper({
	bossDataMap,
	bossModels,
	bossScenes = [],
	enableModelsVoices = false,
	sortedBossSlugs,
}: BossPageWrapperProps) {
	const { version } = useDataVersion()

	// Determine available versions for this boss
	const availableVersions = useMemo(() => {
		return DATA_VERSIONS.filter((v) => bossDataMap[v] !== null)
	}, [bossDataMap])

	// Show toggle only if boss exists in at least one non-legacy version
	const showVersionToggle = availableVersions.length > 1

	// Enable version toggle on mount
	useEnableVersionToggle(availableVersions, showVersionToggle)

	const recordVersion = bossDataMap[version] ? version : bossDataMap.legacy ? "legacy" : availableVersions[0]
	const bossData = bossDataMap[recordVersion]

	if (!bossData) return null

	return (
		<GameLanguageScope version={recordVersion}>
		<BossClient
			bossData={bossData}
			bossModels={bossModels}
			bossScenes={bossScenes}
			enableModelsVoices={enableModelsVoices}
			sortedBossSlugs={sortedBossSlugs}
		/>
		</GameLanguageScope>
	)
}
