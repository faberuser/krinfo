"use client"

import { Text } from "@/components/i18n/language-provider"

import { ArrowLeftRight, Columns2, Layers, Plus, X, Link, Unlink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DataVersionLabels } from "@/hooks/use-data-version"
import { DataVersion } from "@/lib/constants"
import { useCompareMode } from "@/hooks/use-compare-mode"
import { MobileTooltip } from "@/components/mobile-tooltip"

interface CompareToggleProps {
	availableVersions: DataVersion[]
}

export default function CompareToggle({ availableVersions }: CompareToggleProps) {
	const {
		isCompareMode,
		toggleCompareMode,
		compareVersions,
		setVersionAtIndex,
		swapVersions,
		addVersion,
		removeVersion,
		getAvailableVersionsToAdd,
		canAddMore,
		isHydrated,
		syncScroll,
		toggleSyncScroll,
	} = useCompareMode()

	if (!isHydrated) {
		return null
	}

	const versionsToAdd = getAvailableVersionsToAdd(availableVersions)
	const canAdd = canAddMore(availableVersions)
	const canRemove = compareVersions.length > 2

	return (
		<div className="hidden lg:flex items-center gap-2">
			{isCompareMode && (
				<MobileTooltip
					content={
						<div className="text-sm">
							<Text>{syncScroll ? "Disable synchronized scrolling" : "Enable synchronized scrolling"}</Text>
						</div>
					}
				>
					<Button
						variant={syncScroll ? "default" : "outline"}
						size="icon"
						onClick={toggleSyncScroll}
						className="w-10 h-10 px-0"
					>
						{syncScroll ? <Link className="h-4 w-4" /> : <Unlink className="h-4 w-4" />}
					</Button>
				</MobileTooltip>
			)}

			<MobileTooltip
				content={
					<div className="text-sm">
						<Text>{isCompareMode ? "Exit compare mode" : "Compare versions side-by-side"}</Text>
					</div>
				}
			>
				<Button variant={isCompareMode ? "default" : "outline"} onClick={toggleCompareMode}>
					<Columns2 className="size-4" aria-hidden="true" />
					<span className="hidden sm:inline"><Text messageKey="uiCompare" /></span>
				</Button>
			</MobileTooltip>

			{isCompareMode && (
				<div className="flex items-center gap-1.5 flex-wrap">
					{compareVersions.map((version, index) => (
						<div key={index} className="flex items-center gap-0.5">
							{index > 0 && (
								<MobileTooltip content={<div className="text-sm"><Text messageKey="uiSwapWithPrevious" /></div>}>
									<Button
										variant="ghost"
										size="icon"
										className="h-8 w-8"
										onClick={() => swapVersions(index - 1, index)}
									>
										<ArrowLeftRight className="h-4 w-4" />
									</Button>
								</MobileTooltip>
							)}
							<div className="flex items-center">
								<Select
									value={version}
									onValueChange={(value) => setVersionAtIndex(index, value as DataVersion)}
								>
									<SelectTrigger>
										<Layers className="size-4" aria-hidden="true" />
										<SelectValue placeholder="Version" />
									</SelectTrigger>
									<SelectContent>
										{availableVersions.map((opt) => (
											<SelectItem key={opt} value={opt}>
												<Text>{DataVersionLabels[opt]}</Text>
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								{canRemove && (
									<MobileTooltip content={<div className="text-sm"><Text messageKey="uiRemoveVersion" /></div>}>
										<Button
											variant="ghost"
											size="icon"
											className="h-8 w-8 ml-0.5"
											onClick={() => removeVersion(version)}
										>
											<X className="h-4 w-4" />
										</Button>
									</MobileTooltip>
								)}
							</div>
						</div>
					))}

					{canAdd && (
						<Select value="" onValueChange={(value) => addVersion(value as DataVersion)}>
							<SelectTrigger>
								<Plus className="h-4 w-4" />
							</SelectTrigger>
							<SelectContent>
								{versionsToAdd.map((opt) => (
									<SelectItem key={opt} value={opt}>
										<Text>{DataVersionLabels[opt]}</Text>
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					)}
				</div>
			)}
		</div>
	)
}
