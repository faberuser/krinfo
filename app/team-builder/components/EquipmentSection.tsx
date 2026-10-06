"use client"

import { Text, GameLanguageScope } from "@/components/i18n/language-provider"
import Image from "@/components/next-image"
import { cn } from "@/lib/utils"
import { TeamMember } from "@/model/Team_Builder"
import { ArtifactData } from "@/model/Artifact"
import { MobileTooltip } from "@/components/mobile-tooltip"
import { ArtifactSelectDialog } from "@/app/team-builder/components/ArtifactSelectDialog"

interface EquipmentSectionProps {
	member: TeamMember
	index: number
	artifacts: ArtifactData[]
	artifactReleaseOrder: Record<string, string>
	toggleUW: (slot: number) => void
	selectUT: (slot: number, ut: string | null) => void
	selectArtifact: (slot: number, artifact: ArtifactData | null) => void
}

export function EquipmentSection({
	member,
	index,
	artifacts,
	artifactReleaseOrder,
	toggleUW,
	selectUT,
	selectArtifact,
}: EquipmentSectionProps) {
	if (!member.hero) return null
	const heroName = member.hero.id

	return (
		<div>
			<div className="text-xs font-medium mb-2 text-muted-foreground">
				<Text messageKey="uiEquipment" />
			</div>
			<div className="flex gap-2 flex-wrap">
				{/* UW */}
				<MobileTooltip
					content={
						<>
							<div className="font-bold">
								<Text fieldKey={`heroes/${heroName}/uw/name`}>{member.hero.uw?.name}</Text>
							</div>
							<div className="text-xs mt-1">
								<Text fieldKey={`heroes/${heroName}/uw/description`}>
									{member.hero.uw?.descriptionByStar?.["0"] ?? member.hero.uw?.description}
								</Text>
							</div>
						</>
					}
				>
					<button
						onClick={() => toggleUW(index)}
						className={cn(
							"w-10 h-10 rounded border-2 overflow-hidden transition-all",
							member.uw
								? "border-yellow-500 ring-2 ring-yellow-500/30"
								: "border-muted opacity-50 hover:opacity-100",
						)}
					>
						{member.hero.uw?.thumbnail && (
							<Image
								src={`/kingsraid-data/assets/${member.hero.uw.thumbnail}`}
								alt="UW"
								width={40}
								height={40}
								className={cn("w-full h-full object-cover transition-all", !member.uw && "grayscale")}
							/>
						)}
					</button>
				</MobileTooltip>

				{/* UTs */}
				{Object.entries(member.hero.uts || {}).map(([utKey, ut]) => (
					<MobileTooltip
						key={utKey}
						content={
							<>
								<div className="font-bold">
									<Text messageKey="uiSkill" suffix=" " />
									<Text>{utKey}</Text>:{" "}
									<Text fieldKey={`heroes/${heroName}/uts/${utKey}/name`}>{ut.name}</Text>
								</div>
								<div className="text-xs mt-1">
									<Text fieldKey={`heroes/${heroName}/uts/${utKey}/description`}>
										{ut.descriptionByStar?.["0"] ?? ut.description}
									</Text>
								</div>
							</>
						}
					>
						<button
							onClick={() => selectUT(index, utKey)}
							className={cn(
								"w-10 h-10 rounded border-2 overflow-hidden transition-all",
								member.ut === utKey
									? "border-purple-500 ring-2 ring-purple-500/30"
									: "border-muted opacity-50 hover:opacity-100",
							)}
						>
							<Image
								src={`/kingsraid-data/assets/${ut.thumbnail}`}
								alt={`UT${utKey}`}
								width={40}
								height={40}
								className={cn(
									"w-full h-full object-cover transition-all",
									member.ut !== utKey && "grayscale",
								)}
							/>
						</button>
					</MobileTooltip>
				))}

				{/* Artifact */}
				<GameLanguageScope version="legacy">
					<ArtifactSelectDialog
						artifacts={artifacts}
						artifactReleaseOrder={artifactReleaseOrder}
						selectedArtifact={member.artifact}
						onSelect={(artifact) => selectArtifact(index, artifact)}
					/>
				</GameLanguageScope>
			</div>
		</div>
	)
}
