"use client"

import { PerkName, Text } from "@/components/i18n/language-provider"

import { HeroData } from "@/model/Hero"
import Image from "@/components/next-image"
import { parseColoredText } from "@/lib/utils"
import { ChevronDown, ChevronUp } from "lucide-react"
import { useState, useEffect, useRef, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { MobileTooltip } from "@/components/mobile-tooltip"
import { SelectedPerks, PERK_COSTS, MIN_POINTS, MAX_POINTS, DEFAULT_MAX_POINTS } from "@/model/Team_Builder"
import { calculateUsedPoints, encodePerks, decodePerks } from "@/app/team-builder/utils"
import { useSearchParams, useRouter, usePathname } from "next/navigation"

interface PerksBuilderProps {
	heroData: HeroData
	heroClass: string
	t1PerksData: Record<string, string>
	t2PerksData: Record<string, string>
	headerActions?: ReactNode
}

export default function PerksBuilder({
	heroData,
	heroClass,
	t1PerksData,
	t2PerksData,
	headerActions,
}: PerksBuilderProps) {
	const router = useRouter()
	const pathname = usePathname()
	const searchParams = useSearchParams()

	const [maxPoints, setMaxPoints] = useState<number>(() => {
		const encoded = searchParams.get("p")
		if (encoded) {
			const decoded = decodePerks(encoded, heroClass)
			if (decoded) return decoded.maxPoints
		}
		return DEFAULT_MAX_POINTS
	})

	const [selectedPerks, setSelectedPerks] = useState<SelectedPerks>(() => {
		const encoded = searchParams.get("p")
		if (encoded) {
			const decoded = decodePerks(encoded, heroClass)
			if (decoded) return decoded.perks
		}
		return {
			t1: [],
			t2: [],
			t3: [],
			t5: [],
		}
	})

	const isInitialRender = useRef(true)

	useEffect(() => {
		if (isInitialRender.current) {
			isInitialRender.current = false
			return
		}

		const hasContent = Object.values(selectedPerks).some((arr) => arr.length > 0)
		// We only need the read-only values to clone into a new URL search params
		const params = new URLSearchParams(Array.from(searchParams.entries()))

		if (hasContent || maxPoints !== DEFAULT_MAX_POINTS) {
			const encoded = encodePerks(selectedPerks, heroClass, maxPoints)
			params.set("p", encoded)
		} else {
			params.delete("p")
		}

		const newUrl = pathname + (params.toString() ? `?${params.toString()}` : "")
		router.replace(newUrl, { scroll: false })
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedPerks, maxPoints, heroClass, pathname, router])

	const handlePerkToggle = (tier: keyof SelectedPerks, perkId: string, subType?: "light" | "dark") => {
		setSelectedPerks((prev) => {
			const next = { ...prev, t3: [...prev.t3], t5: [...prev.t5], t1: [...prev.t1], t2: [...prev.t2] }

			if (tier === "t3" && subType) {
				const existingIndex = next.t3.findIndex((p) => p.skill === perkId && p.type === subType)
				if (existingIndex >= 0) {
					next.t3.splice(existingIndex, 1)
				} else {
					// Check cost
					const cost = PERK_COSTS.t3
					if (calculateUsedPoints(next) + cost <= maxPoints) {
						next.t3.push({ skill: perkId, type: subType })
					}
				}
			} else if (tier === "t5" && subType) {
				const existingIndex = next.t5.indexOf(subType)
				if (existingIndex >= 0) {
					next.t5.splice(existingIndex, 1)
				} else {
					// Check cost
					const cost = PERK_COSTS.t5
					if (calculateUsedPoints(next) + cost <= maxPoints) {
						next.t5.push(subType)
					}
				}
			} else if (tier === "t1" || tier === "t2") {
				const arr = next[tier] as string[]
				const existingIndex = arr.indexOf(perkId)
				if (existingIndex >= 0) {
					arr.splice(existingIndex, 1)
				} else {
					// Check cost
					const cost = PERK_COSTS[tier]
					if (calculateUsedPoints(next) + cost <= maxPoints) {
						arr.push(perkId)
					}
				}
			}

			// Validate total points (in case of bug or logic glitch)
			if (calculateUsedPoints(next) > maxPoints) {
				return prev
			}

			return next
		})
	}

	return (
		<div className="@container space-y-6 [--perk-builder-width:26rem] [--perk-size:min(3.625rem,calc((100cqw-6rem)/5))]">
			{/* Points Display & Adjustment */}
			<div className="grid grid-cols-[1fr_minmax(0,var(--perk-builder-width))_1fr] items-start gap-y-4">
				<div className="col-start-2 row-start-2 @min-[56rem]:row-start-1 flex flex-wrap items-center justify-between gap-2 p-3 bg-muted rounded">
					<div className="flex items-center gap-1 sm:gap-4">
						<span className="text-sm"><Text messageKey="uiPoints_0ed46a6c" /></span>
						<span className="font-medium">{calculateUsedPoints(selectedPerks)}</span>
						<span className="text-muted-foreground">/</span>
						<div className="flex items-center gap-1">
							<Button
								variant="outline"
								size="icon"
								className="h-6 w-6"
								onClick={() => {
									const newLimit = maxPoints - 5
									setMaxPoints(Math.max(MIN_POINTS, newLimit))
									// Reset perks if exceeding new limit
									// For simplicity here, just clear if overflow
									if (calculateUsedPoints(selectedPerks) > newLimit) {
										setSelectedPerks({ t1: [], t2: [], t3: [], t5: [] })
									}
								}}
								disabled={maxPoints <= MIN_POINTS}
							>
								<ChevronDown className="h-3 w-3" />
							</Button>
							<span className="w-8 text-center font-medium">{maxPoints}</span>
							<Button
								variant="outline"
								size="icon"
								className="h-6 w-6"
								onClick={() => setMaxPoints(Math.min(MAX_POINTS, maxPoints + 5))}
								disabled={maxPoints >= MAX_POINTS}
							>
								<ChevronUp className="h-3 w-3" />
							</Button>
						</div>
					</div>
					<div className="text-xs text-muted-foreground">T1: 10 | T2/T3/T5: 15</div>
				</div>
				<div className="col-span-3 col-start-1 row-start-1 justify-self-end @min-[56rem]:col-span-1 @min-[56rem]:col-start-3">
					{headerActions}
				</div>
			</div>

			{/* T1 Perks */}
			<div className="flex flex-row gap-4 max-w-(--perk-builder-width) mx-auto">
				<h4 className="font-medium flex shrink-0 items-center gap-2 sm:w-12">T1</h4>
				<div className="flex min-w-0 gap-2">
					{Object.entries(t1PerksData).map(([perkName, effect]) => {
						const isSelected = selectedPerks.t1.includes(perkName)
						const canSelect = isSelected || calculateUsedPoints(selectedPerks) + PERK_COSTS.t1 <= maxPoints

						return (
							<MobileTooltip
								key={perkName}
								disabled={!canSelect && !isSelected}
								content={
									<>
										<div className="font-bold"><PerkName name={perkName} /></div>
										<div className="text-xs mt-1"><Text>{effect}</Text></div>
									</>
								}
							>
								<button
									onClick={() => handlePerkToggle("t1", perkName)}
									disabled={!canSelect && !isSelected}
									className={cn(
										"size-(--perk-size) shrink-0 p-1 rounded text-center transition-all flex items-center justify-center",
										isSelected ? "ring-2 ring-yellow-500" : "hover:bg-muted",
									)}
								>
									<Image
										src={`/kingsraid-data/assets/perks/t1/${perkName}.png`}
										alt={perkName}
										width={50}
										height={50}
										className={cn("rounded w-full h-auto min-w-0", !isSelected && "grayscale")}
									/>
								</button>
							</MobileTooltip>
						)
					})}
				</div>
			</div>

			{/* T2 Perks */}
			<div className="flex flex-row gap-4 max-w-(--perk-builder-width) mx-auto">
				<h4 className="font-medium flex shrink-0 items-center gap-2 sm:w-12">T2</h4>
				<div className="flex min-w-0 gap-2">
					{Object.entries(t2PerksData).map(([perkName, effect]) => {
						const isSelected = selectedPerks.t2.includes(perkName)
						const canSelect = isSelected || calculateUsedPoints(selectedPerks) + PERK_COSTS.t2 <= maxPoints

						return (
							<MobileTooltip
								key={perkName}
								disabled={!canSelect && !isSelected}
								content={
									<>
										<div className="font-bold"><PerkName name={perkName} /></div>
										<div className="text-xs mt-1"><Text>{effect}</Text></div>
									</>
								}
							>
								<button
									onClick={() => handlePerkToggle("t2", perkName)}
									disabled={!canSelect && !isSelected}
									className={cn(
										"size-(--perk-size) shrink-0 p-1 rounded text-center transition-all flex items-center justify-center",
										isSelected ? "ring-2 ring-yellow-500" : "hover:bg-muted",
									)}
								>
									<Image
										src={`/kingsraid-data/assets/perks/t2/${heroClass}/${perkName}.png`}
										alt={perkName}
										width={50}
										height={50}
										className={cn("rounded w-full h-auto min-w-0", !isSelected && "grayscale")}
									/>
								</button>
							</MobileTooltip>
						)
					})}
				</div>
			</div>

			{/* T3 Perks */}
			{heroData.perks?.t3 && (
				<div className="flex flex-row gap-4 max-w-(--perk-builder-width) mx-auto">
					<h4 className="font-medium flex shrink-0 items-center gap-2 sm:w-12">T3</h4>
					<div className="flex flex-col gap-2">
						{/* Row 1: S1 Light, S1 Dark, S2 Light, S2 Dark */}
						<div className="flex gap-2">
							{["1", "2"].map((skillNum) => {
								const skillPerks = heroData.perks?.t3?.[skillNum] as
									| Record<string, { effect: string; thumbnail: string }>
									| undefined
								if (!skillPerks) return null
								return (
									<div key={skillNum} className="contents break-inside-avoid">
										{/* Light */}
										{skillPerks.light && (
											<MobileTooltip
												disabled={
													!selectedPerks.t3.find(
														(p) => p.skill === skillNum && p.type === "light",
													) && calculateUsedPoints(selectedPerks) + PERK_COSTS.t3 > maxPoints
												}
												content={
													<>
														<div className="font-bold"><Text messageKey="uiSkill" suffix=" " /><Text>{skillNum}</Text> <Text messageKey="uiLight" /></div>
														<div className="text-xs mt-1">
															{parseColoredText(skillPerks.light.effect, `heroes/${heroData.id}/perks/t3/${skillNum}/light/effect`)}
														</div>
													</>
												}
											>
												<button
													onClick={() => handlePerkToggle("t3", skillNum, "light")}
													disabled={
														!selectedPerks.t3.find(
															(p) => p.skill === skillNum && p.type === "light",
														) &&
														calculateUsedPoints(selectedPerks) + PERK_COSTS.t3 > maxPoints
													}
													className={cn(
														"size-(--perk-size) shrink-0 p-1 rounded transition-all flex items-center justify-center",
														selectedPerks.t3.find(
															(p) => p.skill === skillNum && p.type === "light",
														)
															? "ring-2 ring-yellow-500"
															: "hover:bg-muted",
													)}
												>
													<Image
														src={`/kingsraid-data/assets/${skillPerks.light.thumbnail}`}
														alt={`S${skillNum} Light`}
														width={50}
														height={50}
														className={cn(
															"rounded w-full h-auto min-w-0",
															!selectedPerks.t3.find(
																(p) => p.skill === skillNum && p.type === "light",
															) && "grayscale",
														)}
													/>
												</button>
											</MobileTooltip>
										)}
										{/* Dark */}
										{skillPerks.dark && (
											<MobileTooltip
												disabled={
													!selectedPerks.t3.find(
														(p) => p.skill === skillNum && p.type === "dark",
													) && calculateUsedPoints(selectedPerks) + PERK_COSTS.t3 > maxPoints
												}
												content={
													<>
														<div className="font-bold"><Text messageKey="uiSkill" suffix=" " /><Text>{skillNum}</Text> <Text messageKey="uiDark" /></div>
														<div className="text-xs mt-1">
															{parseColoredText(skillPerks.dark.effect, `heroes/${heroData.id}/perks/t3/${skillNum}/dark/effect`)}
														</div>
													</>
												}
											>
												<button
													onClick={() => handlePerkToggle("t3", skillNum, "dark")}
													disabled={
														!selectedPerks.t3.find(
															(p) => p.skill === skillNum && p.type === "dark",
														) &&
														calculateUsedPoints(selectedPerks) + PERK_COSTS.t3 > maxPoints
													}
													className={cn(
														"size-(--perk-size) shrink-0 p-1 rounded transition-all flex items-center justify-center",
														selectedPerks.t3.find(
															(p) => p.skill === skillNum && p.type === "dark",
														)
															? "ring-2 ring-yellow-500"
															: "hover:bg-muted",
													)}
												>
													<Image
														src={`/kingsraid-data/assets/${skillPerks.dark.thumbnail}`}
														alt={`S${skillNum} Dark`}
														width={50}
														height={50}
														className={cn(
															"rounded w-full h-auto min-w-0",
															!selectedPerks.t3.find(
																(p) => p.skill === skillNum && p.type === "dark",
															) && "grayscale",
														)}
													/>
												</button>
											</MobileTooltip>
										)}
									</div>
								)
							})}
						</div>
						{/* Row 2: S3 Light, S3 Dark, S4 Light, S4 Dark */}
						<div className="flex gap-2">
							{["3", "4"].map((skillNum) => {
								const skillPerks = heroData.perks?.t3?.[skillNum] as
									| Record<string, { effect: string; thumbnail: string }>
									| undefined
								if (!skillPerks) return null
								return (
									<div key={skillNum} className="contents break-inside-avoid">
										{/* Light */}
										{skillPerks.light && (
											<MobileTooltip
												disabled={
													!selectedPerks.t3.find(
														(p) => p.skill === skillNum && p.type === "light",
													) && calculateUsedPoints(selectedPerks) + PERK_COSTS.t3 > maxPoints
												}
												content={
													<>
														<div className="font-bold"><Text messageKey="uiSkill" suffix=" " /><Text>{skillNum}</Text> <Text messageKey="uiLight" /></div>
														<div className="text-xs mt-1">
															{parseColoredText(skillPerks.light.effect, `heroes/${heroData.id}/perks/t3/${skillNum}/light/effect`)}
														</div>
													</>
												}
											>
												<button
													onClick={() => handlePerkToggle("t3", skillNum, "light")}
													disabled={
														!selectedPerks.t3.find(
															(p) => p.skill === skillNum && p.type === "light",
														) &&
														calculateUsedPoints(selectedPerks) + PERK_COSTS.t3 > maxPoints
													}
													className={cn(
														"size-(--perk-size) shrink-0 p-1 rounded transition-all flex items-center justify-center",
														selectedPerks.t3.find(
															(p) => p.skill === skillNum && p.type === "light",
														)
															? "ring-2 ring-yellow-500"
															: "hover:bg-muted",
													)}
												>
													<Image
														src={`/kingsraid-data/assets/${skillPerks.light.thumbnail}`}
														alt={`S${skillNum} Light`}
														width={50}
														height={50}
														className={cn(
															"rounded w-full h-auto min-w-0",
															!selectedPerks.t3.find(
																(p) => p.skill === skillNum && p.type === "light",
															) && "grayscale",
														)}
													/>
												</button>
											</MobileTooltip>
										)}
										{/* Dark */}
										{skillPerks.dark && (
											<MobileTooltip
												disabled={
													!selectedPerks.t3.find(
														(p) => p.skill === skillNum && p.type === "dark",
													) && calculateUsedPoints(selectedPerks) + PERK_COSTS.t3 > maxPoints
												}
												content={
													<>
														<div className="font-bold"><Text messageKey="uiSkill" suffix=" " /><Text>{skillNum}</Text> <Text messageKey="uiDark" /></div>
														<div className="text-xs mt-1">
															{parseColoredText(skillPerks.dark.effect, `heroes/${heroData.id}/perks/t3/${skillNum}/dark/effect`)}
														</div>
													</>
												}
											>
												<button
													onClick={() => handlePerkToggle("t3", skillNum, "dark")}
													disabled={
														!selectedPerks.t3.find(
															(p) => p.skill === skillNum && p.type === "dark",
														) &&
														calculateUsedPoints(selectedPerks) + PERK_COSTS.t3 > maxPoints
													}
													className={cn(
														"size-(--perk-size) shrink-0 p-1 rounded transition-all flex items-center justify-center",
														selectedPerks.t3.find(
															(p) => p.skill === skillNum && p.type === "dark",
														)
															? "ring-2 ring-yellow-500"
															: "hover:bg-muted",
													)}
												>
													<Image
														src={`/kingsraid-data/assets/${skillPerks.dark.thumbnail}`}
														alt={`S${skillNum} Dark`}
														width={50}
														height={50}
														className={cn(
															"rounded w-full h-auto min-w-0",
															!selectedPerks.t3.find(
																(p) => p.skill === skillNum && p.type === "dark",
															) && "grayscale",
														)}
													/>
												</button>
											</MobileTooltip>
										)}
									</div>
								)
							})}
						</div>
					</div>
				</div>
			)}

			{/* T5 Perks */}
			{heroData.perks?.t5 && (
				<div className="flex flex-row gap-4 max-w-(--perk-builder-width) mx-auto">
					<h4 className="font-medium flex shrink-0 items-center gap-2 sm:w-12">T5</h4>
					<div className="flex min-w-0 gap-2">
						{/* Light */}
						{(heroData.perks.t5 as Record<string, { effect: string; thumbnail: string }>).light && (
							<MobileTooltip
								disabled={
									!selectedPerks.t5.includes("light") &&
									calculateUsedPoints(selectedPerks) + PERK_COSTS.t5 > maxPoints
								}
								content={
									<>
										<div className="font-bold"><Text messageKey="uiLight_dbcd5e7b" /></div>
										<div className="text-xs mt-1">
											{parseColoredText(
												(
													heroData.perks.t5 as Record<
														string,
														{ effect: string; thumbnail: string }
													>
												).light.effect,
												`heroes/${heroData.id}/perks/t5/light/effect`,
											)}
										</div>
									</>
								}
							>
								<button
									onClick={() => handlePerkToggle("t5", "", "light")}
									disabled={
										!selectedPerks.t5.includes("light") &&
										calculateUsedPoints(selectedPerks) + PERK_COSTS.t5 > maxPoints
									}
									className={cn(
										"size-(--perk-size) shrink-0 p-1 rounded transition-all flex items-center justify-center",
										selectedPerks.t5.includes("light")
											? "ring-2 ring-yellow-500"
											: "hover:bg-muted",
									)}
								>
									<Image
										src={`/kingsraid-data/assets/${(heroData.perks.t5 as Record<string, { effect: string; thumbnail: string }>).light.thumbnail}`}
										alt="T5 Light"
										width={50}
										height={50}
										className={cn(
											"rounded w-full h-auto min-w-0",
											!selectedPerks.t5.includes("light") && "grayscale",
										)}
									/>
								</button>
							</MobileTooltip>
						)}

						{/* Dark */}
						{(heroData.perks.t5 as Record<string, { effect: string; thumbnail: string }>).dark && (
							<MobileTooltip
								disabled={
									!selectedPerks.t5.includes("dark") &&
									calculateUsedPoints(selectedPerks) + PERK_COSTS.t5 > maxPoints
								}
								content={
									<>
										<div className="font-bold"><Text messageKey="uiDark_60acc53f" /></div>
										<div className="text-xs mt-1">
											{parseColoredText(
												(
													heroData.perks.t5 as Record<
														string,
														{ effect: string; thumbnail: string }
													>
												).dark.effect,
												`heroes/${heroData.id}/perks/t5/dark/effect`,
											)}
										</div>
									</>
								}
							>
								<button
									onClick={() => handlePerkToggle("t5", "", "dark")}
									disabled={
										!selectedPerks.t5.includes("dark") &&
										calculateUsedPoints(selectedPerks) + PERK_COSTS.t5 > maxPoints
									}
									className={cn(
										"size-(--perk-size) shrink-0 p-1 rounded transition-all flex items-center justify-center",
										selectedPerks.t5.includes("dark") ? "ring-2 ring-yellow-500" : "hover:bg-muted",
									)}
								>
									<Image
										src={`/kingsraid-data/assets/${(heroData.perks.t5 as Record<string, { effect: string; thumbnail: string }>).dark.thumbnail}`}
										alt="T5 Dark"
										width={50}
										height={50}
										className={cn(
											"rounded w-full h-auto min-w-0",
											!selectedPerks.t5.includes("dark") && "grayscale",
										)}
									/>
								</button>
							</MobileTooltip>
						)}
					</div>
				</div>
			)}
		</div>
	)
}
