"use client"

import { PerkName, Text } from "@/components/i18n/language-provider"

import Image from "@/components/next-image"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn, parseColoredText } from "@/lib/utils"
import { TeamMember } from "@/model/Team_Builder"
import { MobileTooltip } from "@/components/mobile-tooltip"

interface PerksSummaryProps {
	member: TeamMember
	t1Perks: Record<string, string>
	getT2Perks: (heroClass: string) => Record<string, string>
}

export function PerksSummary({ member, t1Perks, getT2Perks }: PerksSummaryProps) {
	if (!member.hero) return null

	return (
		<div className="flex flex-wrap gap-0.5 mb-2 min-h-6">
			{/* T1 Perks */}
			{member.perks.t1.map((perkName) => {
				const effect = t1Perks[perkName] || ""
				return (
					<Tooltip key={perkName}>
						<TooltipTrigger asChild>
							<div className="w-6 h-6 rounded border border-blue-500/50 overflow-hidden bg-muted">
								<Image
									src={`/kingsraid-data/assets/perks/t1/${perkName}.png`}
									alt={perkName}
									width={24}
									height={24}
									className="w-full h-full object-cover"
								/>
							</div>
						</TooltipTrigger>
						<TooltipContent>
							<p className="font-medium"><PerkName name={perkName} /></p>
							<p className="text-xs"><Text>{effect}</Text></p>
						</TooltipContent>
					</Tooltip>
				)
			})}

			{/* T2 Perks */}
			{member.perks.t2.map((perkName) => {
				const heroClass = member.hero!.profile.class?.toLowerCase()
				const t2Perks = heroClass ? getT2Perks(heroClass) : {}
				const effect = t2Perks[perkName] || ""
				return (
					<Tooltip key={perkName}>
						<TooltipTrigger asChild>
							<div className="w-6 h-6 rounded border border-green-500/50 overflow-hidden bg-muted">
								{heroClass && (
									<Image
										src={`/kingsraid-data/assets/perks/t2/${heroClass}/${perkName}.png`}
										alt={perkName}
										width={24}
										height={24}
										className="w-full h-full object-cover"
									/>
								)}
							</div>
						</TooltipTrigger>
						<TooltipContent>
							<p className="font-medium"><PerkName name={perkName} /></p>
							<p className="text-xs"><Text>{effect}</Text></p>
						</TooltipContent>
					</Tooltip>
				)
			})}

			{/* T3 Perks */}
			{member.perks.t3.map((p) => (
				<Tooltip key={`${p.skill}-${p.type}`}>
					<TooltipTrigger asChild>
						<div
							className={cn(
								"w-6 h-6 rounded border overflow-hidden flex items-center justify-center text-[10px] font-bold",
								p.type === "light"
									? "border-yellow-500/50 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
									: "border-purple-500/50 bg-purple-500/10 text-purple-600 dark:text-purple-400",
							)}
						>
							<Text>{p.skill}</Text>
						</div>
					</TooltipTrigger>
					<TooltipContent>
						<p className="font-medium">
							<Text messageKey="uiSkill" suffix=" " /><Text>{p.skill}</Text> <Text>{p.type === "light" ? "Light" : "Dark"}</Text>
						</p>
					</TooltipContent>
				</Tooltip>
			))}

			{/* T5 Perks */}
			{member.perks.t5.map((p) => (
				<Tooltip key={p}>
					<TooltipTrigger asChild>
						<div
							className={cn(
								"w-6 h-6 rounded border overflow-hidden flex items-center justify-center text-[9px] font-bold",
								p === "light"
									? "border-yellow-500/50 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
									: "border-purple-500/50 bg-purple-500/10 text-purple-600 dark:text-purple-400",
							)}
						>
							T5
						</div>
					</TooltipTrigger>
					<TooltipContent>
						<p className="font-medium">T5 <Text>{p === "light" ? "Light" : "Dark"}</Text></p>
					</TooltipContent>
				</Tooltip>
			))}

			{/* Empty state */}
			{member.perks.t1.length === 0 &&
				member.perks.t2.length === 0 &&
				member.perks.t3.length === 0 &&
				member.perks.t5.length === 0 && (
					<span className="text-xs text-muted-foreground"><Text messageKey="uiNoPerksSelected" /></span>
				)}
		</div>
	)
}

// Compact version showing all perks with grayscale for unselected
interface PerksCompactSummaryProps {
	member: TeamMember
	t1Perks: Record<string, string>
	getT2Perks: (heroClass: string) => Record<string, string>
}

export function PerksCompactSummary({ member, t1Perks, getT2Perks }: PerksCompactSummaryProps) {
	if (!member.hero) return null

	const heroClass = member.hero.profile.class.toLowerCase()
	const t2Perks = getT2Perks(member.hero.profile.class)

	return (
		<div className="space-y-1">
			{/* T1 Row */}
			<div className="flex items-center gap-1">
				<span className="text-[10px] font-medium text-muted-foreground w-5 shrink-0">T1</span>
				<div className="flex flex-wrap gap-0.5">
					{Object.keys(t1Perks).map((perkName) => {
						const isSelected = member.perks.t1.includes(perkName)
						return (
							<MobileTooltip
								key={perkName}
								content={
									<>
										<div className="font-bold"><PerkName name={perkName} /></div>
										<div className="text-xs mt-1"><Text>{t1Perks[perkName]}</Text></div>
									</>
								}
							>
								<div
									className={cn(
										"w-5 h-5 rounded overflow-hidden transition-all",
										isSelected ? "ring-1 ring-yellow-500" : "opacity-40 grayscale",
									)}
								>
									<Image
										src={`/kingsraid-data/assets/perks/t1/${perkName}.png`}
										alt={perkName}
										width={20}
										height={20}
										className="w-full h-full object-cover"
									/>
								</div>
							</MobileTooltip>
						)
					})}
				</div>
			</div>

			{/* T2 Row */}
			<div className="flex items-center gap-1">
				<span className="text-[10px] font-medium text-muted-foreground w-5 shrink-0">T2</span>
				<div className="flex flex-wrap gap-0.5">
					{Object.keys(t2Perks).map((perkName) => {
						const isSelected = member.perks.t2.includes(perkName)
						return (
							<MobileTooltip
								key={perkName}
								content={
									<>
										<div className="font-bold"><PerkName name={perkName} /></div>
										<div className="text-xs mt-1"><Text>{t2Perks[perkName]}</Text></div>
									</>
								}
							>
								<div
									className={cn(
										"w-5 h-5 rounded overflow-hidden transition-all",
										isSelected ? "ring-1 ring-yellow-500" : "opacity-40 grayscale",
									)}
								>
									<Image
										src={`/kingsraid-data/assets/perks/t2/${heroClass}/${perkName}.png`}
										alt={perkName}
										width={20}
										height={20}
										className="w-full h-full object-cover"
									/>
								</div>
							</MobileTooltip>
						)
					})}
				</div>
			</div>

			{/* T3 Row - S1 & S2 */}
			{member.hero.perks?.t3 && (
				<div className="flex items-center gap-1">
					<span className="text-[10px] font-medium text-muted-foreground w-5 shrink-0">T3</span>
					<div className="flex flex-wrap gap-0.5">
						{["1", "2"].map((skillNum) => {
							const skillPerks = member.hero!.perks?.t3?.[skillNum]
							if (!skillPerks) return null

							const selectedT3 = member.perks.t3.find((p) => p.skill === skillNum)

							return (
								<div key={skillNum} className="flex gap-0.5">
									{/* Light */}
									{skillPerks.light && (
										<MobileTooltip
											content={
												<>
													<div className="font-bold">S<Text>{skillNum}</Text> <Text messageKey="uiLight_dbcd5e7b" /></div>
													<div className="text-xs mt-1">
														{parseColoredText(skillPerks.light.effect, `heroes/${member.hero!.id}/perks/t3/${skillNum}/light/effect`)}
													</div>
												</>
											}
										>
											<div
												className={cn(
													"w-5 h-5 rounded overflow-hidden transition-all",
													selectedT3?.type === "light"
														? "ring-1 ring-yellow-500"
														: "opacity-40 grayscale",
												)}
											>
												<Image
													src={`/kingsraid-data/assets/${skillPerks.light.thumbnail}`}
													alt={`S${skillNum} Light`}
													width={20}
													height={20}
													className="w-full h-full object-cover"
												/>
											</div>
										</MobileTooltip>
									)}
									{/* Dark */}
									{skillPerks.dark && (
										<MobileTooltip
											content={
												<>
													<div className="font-bold">S<Text>{skillNum}</Text> <Text messageKey="uiDark_60acc53f" /></div>
													<div className="text-xs mt-1">
														{parseColoredText(skillPerks.dark.effect, `heroes/${member.hero!.id}/perks/t3/${skillNum}/dark/effect`)}
													</div>
												</>
											}
										>
											<div
												className={cn(
													"w-5 h-5 rounded overflow-hidden transition-all",
													selectedT3?.type === "dark"
														? "ring-1 ring-yellow-500"
														: "opacity-40 grayscale",
												)}
											>
												<Image
													src={`/kingsraid-data/assets/${skillPerks.dark.thumbnail}`}
													alt={`S${skillNum} Dark`}
													width={20}
													height={20}
													className="w-full h-full object-cover"
												/>
											</div>
										</MobileTooltip>
									)}
								</div>
							)
						})}
					</div>
				</div>
			)}

			{/* T3 Row - S3 & S4 */}
			{member.hero.perks?.t3 && (member.hero.perks.t3["3"] || member.hero.perks.t3["4"]) && (
				<div className="flex items-center gap-1">
					<span className="text-[10px] font-medium text-muted-foreground w-5 shrink-0"></span>
					<div className="flex flex-wrap gap-0.5">
						{["3", "4"].map((skillNum) => {
							const skillPerks = member.hero!.perks?.t3?.[skillNum]
							if (!skillPerks) return null

							const selectedT3 = member.perks.t3.find((p) => p.skill === skillNum)

							return (
								<div key={skillNum} className="flex gap-0.5">
									{/* Light */}
									{skillPerks.light && (
										<MobileTooltip
											content={
												<>
													<div className="font-bold">S<Text>{skillNum}</Text> <Text messageKey="uiLight_dbcd5e7b" /></div>
													<div className="text-xs mt-1">
														{parseColoredText(skillPerks.light.effect, `heroes/${member.hero!.id}/perks/t3/${skillNum}/light/effect`)}
													</div>
												</>
											}
										>
											<div
												className={cn(
													"w-5 h-5 rounded overflow-hidden transition-all",
													selectedT3?.type === "light"
														? "ring-1 ring-yellow-500"
														: "opacity-40 grayscale",
												)}
											>
												<Image
													src={`/kingsraid-data/assets/${skillPerks.light.thumbnail}`}
													alt={`S${skillNum} Light`}
													width={20}
													height={20}
													className="w-full h-full object-cover"
												/>
											</div>
										</MobileTooltip>
									)}
									{/* Dark */}
									{skillPerks.dark && (
										<MobileTooltip
											content={
												<>
													<div className="font-bold">S<Text>{skillNum}</Text> <Text messageKey="uiDark_60acc53f" /></div>
													<div className="text-xs mt-1">
														{parseColoredText(skillPerks.dark.effect, `heroes/${member.hero!.id}/perks/t3/${skillNum}/dark/effect`)}
													</div>
												</>
											}
										>
											<div
												className={cn(
													"w-5 h-5 rounded overflow-hidden transition-all",
													selectedT3?.type === "dark"
														? "ring-1 ring-yellow-500"
														: "opacity-40 grayscale",
												)}
											>
												<Image
													src={`/kingsraid-data/assets/${skillPerks.dark.thumbnail}`}
													alt={`S${skillNum} Dark`}
													width={20}
													height={20}
													className="w-full h-full object-cover"
												/>
											</div>
										</MobileTooltip>
									)}
								</div>
							)
						})}
					</div>
				</div>
			)}

			{/* T5 Row */}
			{member.hero.perks?.t5 && (
				<div className="flex items-center gap-1">
					<span className="text-[10px] font-medium text-muted-foreground w-5 shrink-0">T5</span>
					<div className="flex gap-0.5">
						{member.hero.perks.t5.light && (
							<MobileTooltip
								content={
									<>
										<div className="font-bold"><Text messageKey="uiT5Light" /></div>
										<div className="text-xs mt-1">
											{parseColoredText(member.hero.perks.t5.light.effect, `heroes/${member.hero.id}/perks/t5/light/effect`)}
										</div>
									</>
								}
							>
								<div
									className={cn(
										"w-5 h-5 rounded overflow-hidden transition-all",
										member.perks.t5.includes("light")
											? "ring-1 ring-yellow-500"
											: "opacity-40 grayscale",
									)}
								>
									<Image
										src={`/kingsraid-data/assets/${member.hero.perks.t5.light.thumbnail}`}
										alt="T5 Light"
										width={20}
										height={20}
										className="w-full h-full object-cover"
									/>
								</div>
							</MobileTooltip>
						)}
						{member.hero.perks.t5.dark && (
							<MobileTooltip
								content={
									<>
										<div className="font-bold"><Text messageKey="uiT5Dark" /></div>
										<div className="text-xs mt-1">
											{parseColoredText(member.hero.perks.t5.dark.effect, `heroes/${member.hero.id}/perks/t5/dark/effect`)}
										</div>
									</>
								}
							>
								<div
									className={cn(
										"w-5 h-5 rounded overflow-hidden transition-all",
										member.perks.t5.includes("dark")
											? "ring-1 ring-yellow-500"
											: "opacity-40 grayscale",
									)}
								>
									<Image
										src={`/kingsraid-data/assets/${member.hero.perks.t5.dark.thumbnail}`}
										alt="T5 Dark"
										width={20}
										height={20}
										className="w-full h-full object-cover"
									/>
								</div>
							</MobileTooltip>
						)}
					</div>
				</div>
			)}
		</div>
	)
}
