"use client"

import { useState, useMemo } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowRight, Plus, Trash2 } from "lucide-react"
import { DiffRow, DiffText, ValueRow, NumericChange } from "@/app/stats/components/diff-primitives"
import { HeroSection } from "@/app/stats/components/hero-section"
import Image from "@/components/next-image"
import { computeRunesDiff, computeClassesDiff, computeHeroesDiff, STAT_NAMES } from "@/app/stats/diff-utils"
import type { StatsClientProps, HeroSegment } from "./types"

function runeImageSrc(runeName: string): string {
	// "Rune of Agility: Ancient" → "/kingsraid-data/assets/runes/Rune_of_Agility_Ancient.png"
	const filename = runeName.replace(": ", "_").replace(/ /g, "_")
	return `/kingsraid-data/assets/runes/${filename}.png`
}

export default function StatsClient({
	versionLabels,
	availableVersions,
	runesMap,
	classesMap,
	heroesMap,
	classesPairMap,
}: StatsClientProps) {
	const [versions, setVersions] = useState<string[]>([
		availableVersions[availableVersions.length - 1] ?? availableVersions[0],
		availableVersions[0],
	])
	const [heroSearch, setHeroSearch] = useState("")
	const [runeSearch, setRuneSearch] = useState("")
	const [perkSearch, setPerkSearch] = useState("")

	const segments = useMemo(() => {
		const pairs: Array<{ versionA: string; versionB: string }> = []
		for (let i = 0; i < versions.length - 1; i++) {
			pairs.push({ versionA: versions[i], versionB: versions[i + 1] })
		}
		return pairs
	}, [versions])

	const segmentDiffs = useMemo(
		() =>
			segments.map((seg) => ({
				...seg,
				runesDiff: computeRunesDiff(runesMap[seg.versionA] ?? [], runesMap[seg.versionB] ?? []),
				classesDiff: computeClassesDiff(classesMap[seg.versionA] ?? {}, classesMap[seg.versionB] ?? {}),
				heroesDiff: computeHeroesDiff(heroesMap[seg.versionA] ?? {}, heroesMap[seg.versionB] ?? {}),
			})),
		[segments, runesMap, classesMap, heroesMap],
	)

	const allHeroEntries = useMemo(() => {
		const heroMap = new Map<
			string,
			{ heroClass: string; heroThumbnail: string; overallStatus: "changed" | "added" | "removed" }
		>()
		for (const seg of segmentDiffs) {
			for (const hero of seg.heroesDiff) {
				if (!heroMap.has(hero.heroName)) {
					heroMap.set(hero.heroName, {
						heroClass: hero.heroClass,
						heroThumbnail: hero.heroThumbnail,
						overallStatus: hero.status,
					})
				} else if (hero.status === "changed") {
					heroMap.get(hero.heroName)!.overallStatus = "changed"
				}
			}
		}
		return [...heroMap.entries()]
			.map(([heroName, data]) => ({ heroName, ...data }))
			.sort((a, b) => {
				const order: Record<string, number> = { changed: 0, added: 1, removed: 2 }
				const statusDiff = (order[a.overallStatus] ?? 99) - (order[b.overallStatus] ?? 99)
				if (statusDiff !== 0) return statusDiff
				return a.heroName.localeCompare(b.heroName)
			})
	}, [segmentDiffs])

	const filteredHeroes = useMemo(
		() =>
			heroSearch
				? allHeroEntries.filter((h) => h.heroName.toLowerCase().includes(heroSearch.toLowerCase()))
				: allHeroEntries,
		[allHeroEntries, heroSearch],
	)

	const heroCardData = useMemo(
		() =>
			filteredHeroes
				.map((hero) => {
					const heroSegments: HeroSegment[] = segmentDiffs.map((seg) => ({
						versionA: seg.versionA,
						versionB: seg.versionB,
						versionALabel: versionLabels[seg.versionA] ?? seg.versionA,
						versionBLabel: versionLabels[seg.versionB] ?? seg.versionB,
						diff: seg.heroesDiff.find((h) => h.heroName === hero.heroName) ?? null,
					}))
					const relevantSegments = heroSegments.filter(
						(s) => s.diff && (s.diff.status !== "changed" || s.diff.changes.length > 0),
					)
					return { hero, relevantSegments }
				})
				.filter(({ relevantSegments }) => relevantSegments.length > 0),
		[filteredHeroes, segmentDiffs, versionLabels],
	)

	const filteredRuneSegments = useMemo(() => {
		if (!runeSearch) return segmentDiffs
		const q = runeSearch.toLowerCase()
		return segmentDiffs.map((seg) => ({
			...seg,
			runesDiff: seg.runesDiff.filter(
				(rd) =>
					rd.runeName.toLowerCase().includes(q) ||
					rd.grade.toLowerCase().includes(q) ||
					rd.changes.some(
						(c) =>
							(STAT_NAMES[c.stat] ?? c.stat).toLowerCase().includes(q) ||
							String(c.from ?? "")
								.toLowerCase()
								.includes(q) ||
							String(c.to ?? "")
								.toLowerCase()
								.includes(q),
					),
			),
		}))
	}, [segmentDiffs, runeSearch])

	const filteredPerkSegments = useMemo(() => {
		if (!perkSearch) return segmentDiffs
		const q = perkSearch.toLowerCase()
		return segmentDiffs.map((seg) => ({
			...seg,
			classesDiff: seg.classesDiff
				.map((cd) => ({
					...cd,
					changes: cd.changes.filter(
						(c) =>
							cd.className.toLowerCase().includes(q) ||
							c.perkName.toLowerCase().includes(q) ||
							String(c.from ?? "")
								.toLowerCase()
								.includes(q) ||
							String(c.to ?? "")
								.toLowerCase()
								.includes(q),
					),
				}))
				.filter((cd) => cd.changes.length > 0),
		}))
	}, [segmentDiffs, perkSearch])

	const filteredRuneCount = filteredRuneSegments.reduce((acc, s) => acc + s.runesDiff.length, 0)
	const filteredPerkCount = filteredPerkSegments.reduce(
		(acc, s) => acc + s.classesDiff.reduce((a, c) => a + c.changes.length, 0),
		0,
	)

	const runesChangeCount = segmentDiffs.reduce((acc, s) => acc + s.runesDiff.length, 0)
	const classesChangeCount = segmentDiffs.reduce(
		(acc, s) => acc + s.classesDiff.reduce((a, c) => a + c.changes.length, 0),
		0,
	)
	const generalChangeCount = runesChangeCount + classesChangeCount

	const hasInvalidSegment = segments.some((s) => s.versionA === s.versionB)

	function addVersion() {
		const last = versions[versions.length - 1]
		const idx = availableVersions.indexOf(last)
		const next = availableVersions[Math.max(0, idx - 1)]
		setVersions((prev) => [...prev, next])
	}

	function removeVersion(index: number) {
		setVersions((prev) => prev.filter((_, i) => i !== index))
	}

	function updateVersion(index: number, value: string) {
		setVersions((prev) => prev.map((v, i) => (i === index ? value : v)))
	}

	return (
		<div>
			<div className="space-y-2 mb-4">
				<div className="items-baseline">
					<div className="text-xl font-bold">Version Stats</div>
				</div>
			</div>

			{/* Version Chain Selector */}
			<div className="mb-4 p-4 border rounded-lg bg-muted/30 space-y-3">
				<div className="flex flex-wrap items-center gap-2">
					{versions.map((v, i) => (
						<div key={i} className="flex items-center gap-2">
							{i > 0 && <ArrowRight className="w-4 h-4 mt-5 text-muted-foreground shrink-0" />}
							<div className="flex flex-col gap-1">
								<label className="text-xs font-medium text-muted-foreground">
									{i === 0 ? "Base" : `Step ${i + 1}`}
								</label>
								<div className="flex items-center gap-1">
									<Select value={v} onValueChange={(val) => updateVersion(i, val)}>
										<SelectTrigger className="w-40">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{availableVersions.map((av) => (
												<SelectItem key={av} value={av}>
													{versionLabels[av] ?? av}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									{versions.length > 2 && (
										<Button
											variant="ghost"
											size="icon"
											className="h-8 w-8 text-muted-foreground hover:text-destructive"
											onClick={() => removeVersion(i)}
											title="Remove this step"
										>
											<Trash2 className="w-3.5 h-3.5" />
										</Button>
									)}
								</div>
							</div>
						</div>
					))}
					<div className="flex flex-col gap-1">
						{versions.length > 0 && <div className="h-4" />}
						<div className="flex items-center gap-2">
							{versions.length > 1 && <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />}
							<Button
								variant="outline"
								size="sm"
								onClick={addVersion}
								className="h-10 gap-1.5"
								disabled={versions.length >= availableVersions.length}
							>
								<Plus className="w-3.5 h-3.5" />
								Add Step
							</Button>
						</div>
					</div>
				</div>

				{!hasInvalidSegment && (
					<div className="flex gap-2 flex-wrap pt-1">
						<Badge variant="outline">{generalChangeCount} general changes</Badge>
						<Badge variant="outline">
							{allHeroEntries.filter((h) => h.overallStatus === "changed").length} hero changes
						</Badge>
						{allHeroEntries.filter((h) => h.overallStatus === "added").length > 0 && (
							<Badge className="bg-green-500/20 text-green-700 dark:text-green-400 border border-green-500/30">
								+{allHeroEntries.filter((h) => h.overallStatus === "added").length} heroes
							</Badge>
						)}{" "}
						{allHeroEntries.filter((h) => h.overallStatus === "removed").length > 0 && (
							<Badge className="bg-red-500/20 text-red-700 dark:text-red-400 border border-red-500/30">
								-{allHeroEntries.filter((h) => h.overallStatus === "removed").length} heroes
							</Badge>
						)}{" "}
					</div>
				)}
			</div>

			{hasInvalidSegment && (
				<div className="text-center text-muted-foreground py-16 border rounded-lg">
					Each step must be a different version than the one before it.
				</div>
			)}

			{!hasInvalidSegment && (
				<Tabs defaultValue="heroes">
					<TabsList className="mb-2">
						<TabsTrigger value="heroes">Heroes ({allHeroEntries.length})</TabsTrigger>
						<TabsTrigger value="class-perks">T2 Perks ({classesChangeCount})</TabsTrigger>
						<TabsTrigger value="runes">Runes ({runesChangeCount})</TabsTrigger>
					</TabsList>

					{/* ── Runes Tab ── */}
					<TabsContent value="runes" className="space-y-4">
						<div className="flex items-center gap-3">
							<Input
								placeholder="Search rune name, grade, or stat…"
								value={runeSearch}
								onChange={(e) => setRuneSearch(e.target.value)}
								className="max-w-xs"
							/>
							{runeSearch && (
								<span className="text-sm text-muted-foreground">
									{filteredRuneCount} result{filteredRuneCount !== 1 ? "s" : ""}
								</span>
							)}
						</div>
						<div className="space-y-6">
							{filteredRuneSegments.map((seg) => {
								if (seg.runesDiff.length === 0) return null
								const segLabel = `${versionLabels[seg.versionA] ?? seg.versionA} → ${versionLabels[seg.versionB] ?? seg.versionB}`
								return (
									<div key={`${seg.versionA}_${seg.versionB}`} className="space-y-3">
										{segments.length > 1 && (
											<div className="text-sm font-bold uppercase tracking-wide text-muted-foreground border-b pb-1">
												{segLabel}
											</div>
										)}
										{seg.runesDiff.map((rd) => (
											<div key={rd.runeName} className="border rounded-md p-3">
												<div className="flex items-center gap-2 mb-2">
													<Image
														src={runeImageSrc(rd.runeName)}
														alt={rd.runeName}
														width={32}
														height={32}
														className="rounded shrink-0 object-contain"
														style={{ width: 32, height: 32 }}
														onError={(e) => {
															;(e.currentTarget as HTMLImageElement).style.display =
																"none"
														}}
													/>
													<span className="font-medium text-sm">{rd.runeName}</span>
													{rd.status === "added" && (
														<Badge className="bg-green-500/20 text-green-700 dark:text-green-400 border border-green-500/30 text-xs">
															Added
														</Badge>
													)}
													{rd.status === "removed" && (
														<Badge className="bg-red-500/20 text-red-700 dark:text-red-400 border border-red-500/30 text-xs">
															Removed
														</Badge>
													)}
												</div>
												{rd.status === "changed" &&
													rd.changes.map((c, i) => (
														<ValueRow key={i} label={STAT_NAMES[c.stat] ?? c.stat}>
															<NumericChange from={c.from} to={c.to} />
														</ValueRow>
													))}
											</div>
										))}
									</div>
								)
							})}
							{runesChangeCount === 0 && (
								<div className="text-center text-muted-foreground py-16 border rounded-lg">
									No rune changes across the selected versions.
								</div>
							)}
							{runesChangeCount > 0 && runeSearch && filteredRuneCount === 0 && (
								<div className="text-center text-muted-foreground py-16 border rounded-lg">
									No runes match &ldquo;{runeSearch}&rdquo;.
								</div>
							)}
						</div>
					</TabsContent>

					{/* ── Class Perks Tab ── */}
					<TabsContent value="class-perks" className="space-y-4">
						<div className="flex items-center gap-3">
							<Input
								placeholder="Search class, perk name, or description…"
								value={perkSearch}
								onChange={(e) => setPerkSearch(e.target.value)}
								className="max-w-xs"
							/>
							{perkSearch && (
								<span className="text-sm text-muted-foreground">
									{filteredPerkCount} result{filteredPerkCount !== 1 ? "s" : ""}
								</span>
							)}
						</div>
						<div className="space-y-6">
							{filteredPerkSegments.map((seg) => {
								if (seg.classesDiff.length === 0) return null
								const segLabel = `${versionLabels[seg.versionA] ?? seg.versionA} → ${versionLabels[seg.versionB] ?? seg.versionB}`
								return (
									<div key={`${seg.versionA}_${seg.versionB}`} className="space-y-4">
										{segments.length > 1 && (
											<h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground border-b pb-1">
												{segLabel}
											</h2>
										)}
										{seg.classesDiff.map((cd) => {
											const pairKey = `${seg.versionA}_vs_${seg.versionB}`
											const enrichedClass = classesPairMap[pairKey]?.classes[cd.className]
											const iconBase = `/kingsraid-data/assets/perks/t2/${cd.className.toLowerCase()}`
											return (
												<div key={cd.className}>
													<h4 className="font-semibold text-sm mb-2 text-foreground">
														{cd.className}
													</h4>
													<div className="space-y-3">
														{cd.changes.map((c, i) => {
															const enrichedPerk = enrichedClass?.[c.perkName]
															return (
																<div key={i} className="border rounded-md p-3">
																	<div className="flex items-center gap-2 mb-1.5">
																		<Image
																			src={`${iconBase}/${c.perkName}.png`}
																			alt={c.perkName}
																			width={24}
																			height={24}
																			className="rounded shrink-0 object-contain"
																			style={{ width: 24, height: 24 }}
																			onError={(e) => {
																				;(
																					e.currentTarget as HTMLImageElement
																				).style.display = "none"
																			}}
																		/>
																		<div className="text-xs font-medium text-foreground">
																			{c.perkName}
																		</div>
																	</div>
																	{enrichedPerk?.description ? (
																		<DiffText diff={enrichedPerk.description} />
																	) : (
																		<DiffRow
																			field="Description"
																			from={c.from}
																			to={c.to}
																		/>
																	)}
																</div>
															)
														})}
													</div>
												</div>
											)
										})}
									</div>
								)
							})}
							{classesChangeCount === 0 && (
								<div className="text-center text-muted-foreground py-16 border rounded-lg">
									No class perk changes across the selected versions.
								</div>
							)}
							{classesChangeCount > 0 && perkSearch && filteredPerkCount === 0 && (
								<div className="text-center text-muted-foreground py-16 border rounded-lg">
									No perks match &ldquo;{perkSearch}&rdquo;.
								</div>
							)}
						</div>
					</TabsContent>

					{/* ── Heroes Tab ── */}
					<TabsContent value="heroes" className="space-y-4">
						<div className="flex items-center gap-3">
							<Input
								placeholder="Search heroes..."
								value={heroSearch}
								onChange={(e) => setHeroSearch(e.target.value)}
								className="max-w-xs"
							/>
							{heroSearch && (
								<span className="text-sm text-muted-foreground">
									{filteredHeroes.length} result{filteredHeroes.length !== 1 ? "s" : ""}
								</span>
							)}
						</div>
						{heroCardData.length === 0 && (
							<div className="text-center text-muted-foreground py-16 border rounded-lg">
								No hero changes across the selected versions.
							</div>
						)}

						{/* Changed heroes */}
						<div className="space-y-2">
							{heroCardData
								.filter(({ hero }) => hero.overallStatus === "changed")
								.map(
									({ hero, relevantSegments }) =>
										hero.heroThumbnail && (
											<HeroSection
												key={
													hero.heroName +
													"-" +
													relevantSegments.map((s) => s.versionA + "_" + s.versionB).join("-")
												}
												heroName={hero.heroName}
												heroClass={hero.heroClass}
												heroThumbnail={hero.heroThumbnail}
												overallStatus={hero.overallStatus}
												segments={relevantSegments}
											/>
										),
								)}
						</div>

						{/* Added heroes */}
						{heroCardData.some(({ hero }) => hero.overallStatus === "added") && (
							<div className="space-y-2">
								<div className="flex items-center gap-2 pt-2">
									<span className="text-xs font-bold uppercase tracking-wide text-green-600 dark:text-green-400">
										Added Heroes
									</span>
									<div className="flex-1 border-t border-green-500/30" />
								</div>
								{heroCardData
									.filter(({ hero }) => hero.overallStatus === "added")
									.map(
										({ hero, relevantSegments }) =>
											hero.heroThumbnail && (
												<HeroSection
													key={
														hero.heroName +
														"-" +
														relevantSegments
															.map((s) => s.versionA + "_" + s.versionB)
															.join("-")
													}
													heroName={hero.heroName}
													heroClass={hero.heroClass}
													heroThumbnail={hero.heroThumbnail}
													overallStatus={hero.overallStatus}
													segments={relevantSegments}
												/>
											),
									)}
							</div>
						)}

						{/* Removed heroes */}
						{heroCardData.some(({ hero }) => hero.overallStatus === "removed") && (
							<div className="space-y-2">
								<div className="flex items-center gap-2 pt-2">
									<span className="text-xs font-bold uppercase tracking-wide text-red-600 dark:text-red-400">
										Removed Heroes
									</span>
									<div className="flex-1 border-t border-red-500/30" />
								</div>
								{heroCardData
									.filter(({ hero }) => hero.overallStatus === "removed")
									.map(
										({ hero, relevantSegments }) =>
											hero.heroThumbnail && (
												<HeroSection
													key={
														hero.heroName +
														"-" +
														relevantSegments
															.map((s) => s.versionA + "_" + s.versionB)
															.join("-")
													}
													heroName={hero.heroName}
													heroClass={hero.heroClass}
													heroThumbnail={hero.heroThumbnail}
													overallStatus={hero.overallStatus}
													segments={relevantSegments}
												/>
											),
									)}
							</div>
						)}
					</TabsContent>
				</Tabs>
			)}
		</div>
	)
}
