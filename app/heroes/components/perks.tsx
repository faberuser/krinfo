"use client"

import { PerkName, Text, useSharedRecords } from "@/components/i18n/language-provider"
import { HeroData } from "@/model/Hero"
import { Card, CardContent } from "@/components/ui/card"
import Image from "@/components/next-image"
import { capitalize, parseColoredText } from "@/lib/utils"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, LayoutGrid, LayoutList, Share2, Check } from "lucide-react"
import { useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import PerksBuilder from "@/app//heroes/components/perks-builder"

export interface ClassPerksData {
	t1Perks: Record<string, string>
	t2Perks: Record<string, Record<string, string>>
}

interface PerksProps {
	heroData: HeroData
	classPerks: ClassPerksData
}

export default function Perks({ heroData, classPerks }: PerksProps) {
	const searchParams = useSearchParams()
	const hasPerksParam = searchParams.has("p")

	const [t1Open, setT1Open] = useState(false)
	const [t2Open, setT2Open] = useState(false)
	const [heroPerksOpen, setHeroPerksOpen] = useState<Record<string, boolean>>({ t3: true, t5: true })
	const [viewMode, setViewMode] = useState<"list" | "builder">(hasPerksParam ? "builder" : "list")
	const [copied, setCopied] = useState(false)

	const heroClass = heroData.profile.class.toLowerCase()
	const shared = useSharedRecords()
	const t1PerksData = shared.classes?.General.perks.t1 ?? classPerks.t1Perks ?? {}
	const t2PerksData = shared.classes?.[capitalize(heroClass)]?.perks.t2 ?? classPerks.t2Perks[heroClass] ?? {}

	const handleShare = () => {
		navigator.clipboard.writeText(window.location.href)
		setCopied(true)
		setTimeout(() => setCopied(false), 2000)
	}

	const headerActions = (
		<div className="flex shrink-0 items-center gap-2">
			{viewMode === "builder" && (
				<Button variant="outline" size="sm" onClick={handleShare} className="flex items-center gap-2">
					{copied ? <Check className="w-4 h-4 text-green-500" /> : <Share2 className="w-4 h-4" />}
					<Text>{copied ? "Copied!" : "Share"}</Text>
				</Button>
			)}
			<Button
				variant="outline"
				size="sm"
				onClick={() => setViewMode(viewMode === "list" ? "builder" : "list")}
				className="flex items-center gap-2"
			>
				{viewMode === "list" ? (
					<>
						<LayoutGrid className="w-4 h-4" />
						<Text messageKey="uiTranscends" />
					</>
				) : (
					<>
						<LayoutList className="w-4 h-4" />
						<Text messageKey="uiDescriptions" />
					</>
				)}
			</Button>
		</div>
	)

	return (
		<div className="space-y-4">
			{viewMode === "builder" ? (
				<Suspense
					fallback={
						<div>
							<Text messageKey="uiLoadingPerksBuilder" />
						</div>
					}
				>
					<PerksBuilder
						heroData={heroData}
						heroClass={heroClass}
						t1PerksData={t1PerksData}
						t2PerksData={t2PerksData}
						headerActions={headerActions}
					/>
				</Suspense>
			) : (
				<>
					{/* T1 Perks */}
					<Collapsible open={t1Open} onOpenChange={setT1Open}>
						<div className="flex items-center gap-4 mb-2">
							<CollapsibleTrigger className="flex flex-1 items-center justify-between text-lg font-bold hover:opacity-80 transition-opacity">
								<span>
									<Text messageKey="uiT1Perks" />
								</span>
								<ChevronDown
									className={`h-6 w-6 transition-transform duration-200 ${t1Open ? "rotate-180" : ""}`}
								/>
							</CollapsibleTrigger>
							{headerActions}
						</div>
						<CollapsibleContent className="space-y-4">
							<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
								{Object.entries(t1PerksData).map(([perkName, effect]) => (
									<Card key={perkName} className="p-4">
										<CardContent className="px-0">
											<div className="flex items-center gap-3 mb-2">
												<Image
													src={`/kingsraid-data/assets/perks/t1/${perkName}.png`}
													alt={perkName}
													width="0"
													height="0"
													sizes="5vw"
													className="w-10 h-10 rounded"
												/>
												<div className="font-medium">
													<PerkName name={perkName} />
												</div>
											</div>
											<div className="text-sm">
												<Text>{effect}</Text>
											</div>
										</CardContent>
									</Card>
								))}
							</div>
						</CollapsibleContent>
					</Collapsible>

					{/* T2 Perks */}
					<Collapsible open={t2Open} onOpenChange={setT2Open}>
						<CollapsibleTrigger className="flex items-center justify-between w-full text-lg font-bold mb-2 hover:opacity-80 transition-opacity">
							<span>
								<Text messageKey="uiT2Perks" />
							</span>
							<ChevronDown
								className={`h-6 w-6 transition-transform duration-200 ${t2Open ? "rotate-180" : ""}`}
							/>
						</CollapsibleTrigger>
						<CollapsibleContent className="space-y-4">
							<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
								{Object.entries(t2PerksData).map(([perkName, effect]) => (
									<Card key={perkName} className="p-4">
										<CardContent className="px-0">
											<div className="flex items-center gap-3 mb-2">
												<Image
													src={`/kingsraid-data/assets/perks/t2/${heroClass}/${perkName}.png`}
													alt={perkName}
													width="0"
													height="0"
													sizes="5vw"
													className="w-10 h-10 rounded"
												/>
												<div className="font-medium">
													<PerkName name={perkName} />
												</div>
											</div>
											<div className="text-sm">
												<Text>{effect}</Text>
											</div>
										</CardContent>
									</Card>
								))}
							</div>
						</CollapsibleContent>
					</Collapsible>

					{/* Hero-specific perks (T3, T5) */}
					{heroData.perks ? (
						Object.entries(heroData.perks).map(([perkCategory, perks]) => (
							<Collapsible
								key={perkCategory}
								open={heroPerksOpen[perkCategory] ?? false}
								onOpenChange={(open) => setHeroPerksOpen((prev) => ({ ...prev, [perkCategory]: open }))}
							>
								<CollapsibleTrigger className="flex items-center justify-between w-full text-lg font-bold mb-2 hover:opacity-80 transition-opacity">
									<span>
										<Text>{perkCategory.toUpperCase()}</Text> <Text messageKey="uiPerks" />
									</span>
									<ChevronDown
										className={`h-6 w-6 transition-transform duration-200 ${heroPerksOpen[perkCategory] ? "rotate-180" : ""}`}
									/>
								</CollapsibleTrigger>

								<CollapsibleContent className="space-y-4">
									{typeof perks === "object" &&
										Object.entries(perks).map(([perkKey, perk]) => (
											<Card key={perkKey} className="p-4 pt-3">
												<CardContent className="px-0">
													{perkCategory === "t3" && (
														<div className="text-lg font-semibold mb-3">
															<Text messageKey="uiSkill" suffix=" " />
															<Text>{perkKey}</Text>
														</div>
													)}

													{typeof perk === "object" && "effect" in perk ? (
														/* T5 Perks */
														<div className="flex flex-col gap-3">
															{perk.thumbnail && (
																<div className="flex items-center gap-3">
																	<Image
																		src={`/kingsraid-data/assets/${perk.thumbnail}`}
																		alt={perkKey}
																		width="0"
																		height="0"
																		sizes="5vw"
																		className="w-10 h-10 rounded border self-start"
																	/>
																	<div
																		className={`font-medium ${
																			perkKey === "light"
																				? "text-yellow-800"
																				: "text-purple-800"
																		}`}
																	>
																		<Text>{capitalize(perkKey)}</Text>
																	</div>
																</div>
															)}
															<div className="grow flex items-center">
																<div>
																	{parseColoredText(
																		perk.effect,
																		`heroes/${heroData.id}/perks/${perkCategory}/${perkKey}/effect`,
																	)}
																</div>
															</div>
														</div>
													) : (
														/* T3 Perks with Light/Dark options */
														<div className="grid md:grid-cols-2 gap-4">
															{"light" in perk && (
																<div className="border rounded p-3 bg-yellow-50 dark:bg-yellow-900/10">
																	<div className="flex items-center gap-3 mb-2">
																		<Image
																			src={`/kingsraid-data/assets/${perk.light.thumbnail}`}
																			alt="Light"
																			width="0"
																			height="0"
																			sizes="5vw"
																			className="w-10 h-10 rounded"
																		/>
																		<div className="font-medium text-yellow-800">
																			<Text messageKey="uiLight_dbcd5e7b" />
																		</div>
																	</div>
																	<div className="text-sm">
																		{parseColoredText(
																			perk.light.effect,
																			`heroes/${heroData.id}/perks/${perkCategory}/${perkKey}/light/effect`,
																		)}
																	</div>
																</div>
															)}

															{"dark" in perk && (
																<div className="border rounded p-3 bg-purple-50 dark:bg-purple-900/10">
																	<div className="flex items-center gap-3 mb-2">
																		<Image
																			src={`/kingsraid-data/assets/${perk.dark.thumbnail}`}
																			alt="Dark"
																			width="0"
																			height="0"
																			sizes="5vw"
																			className="w-10 h-10 rounded"
																		/>
																		<div className="font-medium text-purple-800">
																			<Text messageKey="uiDark_60acc53f" />
																		</div>
																	</div>
																	<div className="text-sm">
																		{parseColoredText(
																			perk.dark.effect,
																			`heroes/${heroData.id}/perks/${perkCategory}/${perkKey}/dark/effect`,
																		)}
																	</div>
																</div>
															)}
														</div>
													)}
												</CardContent>
											</Card>
										))}
								</CollapsibleContent>
							</Collapsible>
						))
					) : (
						<div className="text-center text-gray-500 py-8">
							<Text messageKey="uiNoPerkDataAvailable" />
						</div>
					)}
				</>
			)}
		</div>
	)
}
