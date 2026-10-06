"use client"

import { PerkName, Text } from "@/components/i18n/language-provider"

import Image from "@/components/next-image"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ChevronDown, ChevronUp } from "lucide-react"
import { cn, parseColoredText } from "@/lib/utils"
import { TeamMember, PERK_COSTS, MIN_POINTS, MAX_POINTS } from "@/model/Team_Builder"
import { calculateUsedPoints } from "@/app/team-builder/utils"
import { MobileTooltip } from "@/components/mobile-tooltip"
import { DialogDescription } from "@radix-ui/react-dialog"

interface PerksDialogProps {
	member: TeamMember
	index: number
	isOpen: boolean
	onOpenChange: (open: boolean) => void
	onPerkToggle: (slot: number, tier: "t1" | "t2" | "t3" | "t5", perkId: string, subType?: "light" | "dark") => void
	onMaxPointsUpdate: (slot: number, points: number) => void
	t1Perks: Record<string, string>
	getT2Perks: (heroClass: string) => Record<string, string>
}

export function PerksDialog({
	member,
	index,
	isOpen,
	onOpenChange,
	onPerkToggle,
	onMaxPointsUpdate,
	t1Perks,
	getT2Perks,
}: PerksDialogProps) {
	if (!member.hero) return null

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm" className="w-full">
					<Text messageKey="uiEditPerks" /></Button>
			</DialogTrigger>
			<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-background/70 backdrop-blur-sm">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2"><Text>{member.hero.profile.name}</Text></DialogTitle>
				</DialogHeader>
					<DialogDescription className="sr-only"><Text messageKey="uiEditThePerksFor" suffix=" " /><Text>{member.hero.profile.name}</Text></DialogDescription>

				{/* Points Display & Adjustment */}
				<div className="flex items-center justify-between p-3 bg-muted rounded">
					<div className="flex items-center gap-4">
						<span className="text-sm"><Text messageKey="uiPoints_0ed46a6c" /></span>
						<span className="font-medium">{calculateUsedPoints(member.perks)}</span>
						<span className="text-muted-foreground">/</span>
						<div className="flex items-center gap-1">
							<Button
								variant="outline"
								size="icon"
								className="h-6 w-6"
								onClick={() => onMaxPointsUpdate(index, member.maxPoints - 5)}
								disabled={member.maxPoints <= MIN_POINTS}
							>
								<ChevronDown className="h-3 w-3" />
							</Button>
							<span className="w-8 text-center font-medium">{member.maxPoints}</span>
							<Button
								variant="outline"
								size="icon"
								className="h-6 w-6"
								onClick={() => onMaxPointsUpdate(index, member.maxPoints + 5)}
								disabled={member.maxPoints >= MAX_POINTS}
							>
								<ChevronUp className="h-3 w-3" />
							</Button>
						</div>
					</div>
					<div className="text-xs text-muted-foreground">T1: 10 | T2/T3/T5: 15</div>
				</div>

				{/* T1 Perks */}
				<div className="flex flex-row gap-4">
					<h4 className="font-medium flex items-center gap-2">T1</h4>
					<div className="grid grid-cols-5 gap-2">
						{Object.entries(t1Perks).map(([perkName, effect]) => {
							const isSelected = member.perks.t1.includes(perkName)
							const canSelect =
								isSelected || calculateUsedPoints(member.perks) + PERK_COSTS.t1 <= member.maxPoints

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
										onClick={() => onPerkToggle(index, "t1", perkName)}
										disabled={!canSelect && !isSelected}
										className={cn(
											"p-1 rounded text-center transition-all flex items-center justify-center",
											isSelected ? "ring-2 ring-yellow-500" : "hover:bg-muted",
										)}
									>
										<Image
											src={`/kingsraid-data/assets/perks/t1/${perkName}.png`}
											alt={perkName}
											width={50}
											height={50}
											className={cn("rounded", !isSelected && "grayscale")}
										/>
									</button>
								</MobileTooltip>
							)
						})}
					</div>
				</div>

				{/* T2 Perks */}
				<div className="flex flex-row gap-4">
					<h4 className="font-medium flex items-center gap-2">T2</h4>
					<div className="grid grid-cols-5 gap-2">
						{Object.entries(getT2Perks(member.hero.profile.class)).map(([perkName, effect]) => {
							const isSelected = member.perks.t2.includes(perkName)
							const canSelect =
								isSelected || calculateUsedPoints(member.perks) + PERK_COSTS.t2 <= member.maxPoints
							const heroClass = member.hero!.profile.class.toLowerCase()

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
										onClick={() => onPerkToggle(index, "t2", perkName)}
										disabled={!canSelect && !isSelected}
										className={cn(
											"p-1 rounded text-center transition-all flex items-center justify-center",
											isSelected ? "ring-2 ring-yellow-500" : "hover:bg-muted",
										)}
									>
										<Image
											src={`/kingsraid-data/assets/perks/t2/${heroClass}/${perkName}.png`}
											alt={perkName}
											width={50}
											height={50}
											className={cn("rounded", !isSelected && "grayscale")}
										/>
									</button>
								</MobileTooltip>
							)
						})}
					</div>
				</div>

				{/* T3 Perks */}
				{member.hero.perks?.t3 && (
					<div className="flex flex-row gap-4">
						<h4 className="font-medium flex items-center gap-2">T3</h4>
						<div className="space-y-2">
							{/* Row 1: S1 Light, S1 Dark, S2 Light, S2 Dark */}
							<div className="flex gap-2">
								{["1", "2"].map((skillNum) => {
									const skillPerks = member.hero!.perks?.t3?.[skillNum]
									if (!skillPerks) return null
									return (
										<div key={skillNum} className="contents">
											{/* Light */}
											{skillPerks.light && (
												<MobileTooltip
													disabled={
														!member.perks.t3.find(
															(p) => p.skill === skillNum && p.type === "light",
														) &&
														calculateUsedPoints(member.perks) + PERK_COSTS.t3 >
															member.maxPoints
													}
													content={
														<>
															<div className="font-bold"><Text messageKey="uiSkill" suffix=" " /><Text>{skillNum}</Text> <Text messageKey="uiLight" /></div>
															<div className="text-xs mt-1">
																{parseColoredText(skillPerks.light.effect, `heroes/${member.hero!.id}/perks/t3/${skillNum}/light/effect`)}
															</div>
														</>
													}
												>
													<button
														onClick={() => onPerkToggle(index, "t3", skillNum, "light")}
														disabled={
															!member.perks.t3.find(
																(p) => p.skill === skillNum && p.type === "light",
															) &&
															calculateUsedPoints(member.perks) + PERK_COSTS.t3 >
																member.maxPoints
														}
														className={cn(
															"p-1 rounded transition-all flex items-center justify-center",
															member.perks.t3.find(
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
																"rounded",
																!member.perks.t3.find(
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
														!member.perks.t3.find(
															(p) => p.skill === skillNum && p.type === "dark",
														) &&
														calculateUsedPoints(member.perks) + PERK_COSTS.t3 >
															member.maxPoints
													}
													content={
														<>
															<div className="font-bold"><Text messageKey="uiSkill" suffix=" " /><Text>{skillNum}</Text> <Text messageKey="uiDark" /></div>
															<div className="text-xs mt-1">
																{parseColoredText(skillPerks.dark.effect, `heroes/${member.hero!.id}/perks/t3/${skillNum}/dark/effect`)}
															</div>
														</>
													}
												>
													<button
														onClick={() => onPerkToggle(index, "t3", skillNum, "dark")}
														disabled={
															!member.perks.t3.find(
																(p) => p.skill === skillNum && p.type === "dark",
															) &&
															calculateUsedPoints(member.perks) + PERK_COSTS.t3 >
																member.maxPoints
														}
														className={cn(
															"p-1 rounded transition-all flex items-center justify-center",
															member.perks.t3.find(
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
																"rounded",
																!member.perks.t3.find(
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
									const skillPerks = member.hero!.perks?.t3?.[skillNum]
									if (!skillPerks) return null
									return (
										<div key={skillNum} className="contents">
											{/* Light */}
											{skillPerks.light && (
												<MobileTooltip
													disabled={
														!member.perks.t3.find(
															(p) => p.skill === skillNum && p.type === "light",
														) &&
														calculateUsedPoints(member.perks) + PERK_COSTS.t3 >
															member.maxPoints
													}
													content={
														<>
															<div className="font-bold"><Text messageKey="uiSkill" suffix=" " /><Text>{skillNum}</Text> <Text messageKey="uiLight" /></div>
															<div className="text-xs mt-1">
																{parseColoredText(skillPerks.light.effect, `heroes/${member.hero!.id}/perks/t3/${skillNum}/light/effect`)}
															</div>
														</>
													}
												>
													<button
														onClick={() => onPerkToggle(index, "t3", skillNum, "light")}
														disabled={
															!member.perks.t3.find(
																(p) => p.skill === skillNum && p.type === "light",
															) &&
															calculateUsedPoints(member.perks) + PERK_COSTS.t3 >
																member.maxPoints
														}
														className={cn(
															"p-1 rounded transition-all flex items-center justify-center",
															member.perks.t3.find(
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
																"rounded",
																!member.perks.t3.find(
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
														!member.perks.t3.find(
															(p) => p.skill === skillNum && p.type === "dark",
														) &&
														calculateUsedPoints(member.perks) + PERK_COSTS.t3 >
															member.maxPoints
													}
													content={
														<>
															<div className="font-bold"><Text messageKey="uiSkill" suffix=" " /><Text>{skillNum}</Text> <Text messageKey="uiDark" /></div>
															<div className="text-xs mt-1">
																{parseColoredText(skillPerks.dark.effect, `heroes/${member.hero!.id}/perks/t3/${skillNum}/dark/effect`)}
															</div>
														</>
													}
												>
													<button
														onClick={() => onPerkToggle(index, "t3", skillNum, "dark")}
														disabled={
															!member.perks.t3.find(
																(p) => p.skill === skillNum && p.type === "dark",
															) &&
															calculateUsedPoints(member.perks) + PERK_COSTS.t3 >
																member.maxPoints
														}
														className={cn(
															"p-1 rounded transition-all flex items-center justify-center",
															member.perks.t3.find(
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
																"rounded",
																!member.perks.t3.find(
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
				{member.hero.perks?.t5 && (
					<div className="flex flex-row gap-4">
						<h4 className="font-medium flex items-center gap-2">T5</h4>
						<div className="flex gap-2">
							{/* Light */}
							{member.hero.perks.t5.light && (
								<MobileTooltip
									disabled={
										!member.perks.t5.includes("light") &&
										calculateUsedPoints(member.perks) + PERK_COSTS.t5 > member.maxPoints
									}
									content={
										<>
											<div className="font-bold"><Text messageKey="uiLight_dbcd5e7b" /></div>
											<div className="text-xs mt-1">
												{parseColoredText(member.hero.perks.t5.light.effect, `heroes/${member.hero.id}/perks/t5/light/effect`)}
											</div>
										</>
									}
								>
									<button
										onClick={() => onPerkToggle(index, "t5", "", "light")}
										disabled={
											!member.perks.t5.includes("light") &&
											calculateUsedPoints(member.perks) + PERK_COSTS.t5 > member.maxPoints
										}
										className={cn(
											"p-1 rounded transition-all flex items-center justify-center",
											member.perks.t5.includes("light")
												? "ring-2 ring-yellow-500"
												: "hover:bg-muted",
										)}
									>
										<Image
											src={`/kingsraid-data/assets/${member.hero.perks.t5.light.thumbnail}`}
											alt="T5 Light"
											width={50}
											height={50}
											className={cn("rounded", !member.perks.t5.includes("light") && "grayscale")}
										/>
									</button>
								</MobileTooltip>
							)}

							{/* Dark */}
							{member.hero.perks.t5.dark && (
								<MobileTooltip
									disabled={
										!member.perks.t5.includes("dark") &&
										calculateUsedPoints(member.perks) + PERK_COSTS.t5 > member.maxPoints
									}
									content={
										<>
											<div className="font-bold"><Text messageKey="uiDark_60acc53f" /></div>
											<div className="text-xs mt-1">
												{parseColoredText(member.hero.perks.t5.dark.effect, `heroes/${member.hero.id}/perks/t5/dark/effect`)}
											</div>
										</>
									}
								>
									<button
										onClick={() => onPerkToggle(index, "t5", "", "dark")}
										disabled={
											!member.perks.t5.includes("dark") &&
											calculateUsedPoints(member.perks) + PERK_COSTS.t5 > member.maxPoints
										}
										className={cn(
											"p-1 rounded transition-all flex items-center justify-center",
											member.perks.t5.includes("dark")
												? "ring-2 ring-yellow-500"
												: "hover:bg-muted",
										)}
									>
										<Image
											src={`/kingsraid-data/assets/${member.hero.perks.t5.dark.thumbnail}`}
											alt="T5 Dark"
											width={50}
											height={50}
											className={cn("rounded", !member.perks.t5.includes("dark") && "grayscale")}
										/>
									</button>
								</MobileTooltip>
							)}
						</div>
					</div>
				)}
			</DialogContent>
		</Dialog>
	)
}
