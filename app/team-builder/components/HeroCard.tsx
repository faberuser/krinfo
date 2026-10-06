"use client"

import { Text, HeroLanguageScope, useSharedRecords } from "@/components/i18n/language-provider"

import Image from "@/components/next-image"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { X, Eye } from "lucide-react"
import { cn } from "@/lib/utils"
import { TeamMember } from "@/model/Team_Builder"
import { ArtifactData } from "@/model/Artifact"
import { calculateUsedPoints } from "@/app/team-builder/utils"
import { EquipmentSection } from "@/app/team-builder/components/EquipmentSection"
import { PerksDialog } from "@/app/team-builder/components/PerksDialog"
import { PerksCompactSummary } from "@/app/team-builder/components/PerksSummary"

interface HeroCardProps {
	member: TeamMember
	index: number
	perksDialogOpen: boolean
	selectedSlot: number | null
	artifacts: ArtifactData[]
	artifactReleaseOrder: Record<string, string>
	onRemove: (slot: number) => void
	onToggleUW: (slot: number) => void
	onSelectUT: (slot: number, ut: string | null) => void
	onSelectArtifact: (slot: number, artifact: ArtifactData | null) => void
	onPerksDialogChange: (open: boolean, slot: number) => void
	onPerkToggle: (slot: number, tier: "t1" | "t2" | "t3" | "t5", perkId: string, subType?: "light" | "dark") => void
	onMaxPointsUpdate: (slot: number, points: number) => void
	t1Perks: Record<string, string>
	getT2Perks: (heroClass: string) => Record<string, string>
	// Drag and drop props
	isDragging?: boolean
	isDragOver?: boolean
	onDragStart?: (index: number) => void
	onDragOver?: (e: React.DragEvent, index: number) => void
	onDragLeave?: () => void
	onDrop?: (index: number) => void
	onDragEnd?: () => void
}

export function HeroCard(props: HeroCardProps) {
	if (!props.member.hero) return null
	return <HeroLanguageScope hero={props.member.hero}>{(hero) => <HeroCardContent {...props} member={{ ...props.member, hero }} />}</HeroLanguageScope>
}

function HeroCardContent({
	member,
	index,
	perksDialogOpen,
	selectedSlot,
	artifacts,
	artifactReleaseOrder,
	onRemove,
	onToggleUW,
	onSelectUT,
	onSelectArtifact,
	onPerksDialogChange,
	onPerkToggle,
	onMaxPointsUpdate,
	t1Perks: sourceT1Perks,
	getT2Perks: sourceGetT2Perks,
	isDragging,
	isDragOver,
	onDragStart,
	onDragOver,
	onDragLeave,
	onDrop,
	onDragEnd,
}: HeroCardProps) {
	const router = useRouter()
	const shared = useSharedRecords()
	const t1Perks = shared.classes?.General.perks.t1 ?? sourceT1Perks
	const getT2Perks = (heroClass: string) => shared.classes?.[heroClass]?.perks.t2 ?? sourceGetT2Perks(heroClass)

	if (!member.hero) return null

	return (
		<Card
			className={cn(
				"relative transition-all ring-1 ring-primary/20 gap-2",
				isDragging && "opacity-50 scale-95",
				isDragOver && "ring-2 ring-primary bg-primary/5",
				onDragStart && "cursor-grab active:cursor-grabbing",
			)}
			draggable={!!onDragStart}
			onDragStart={() => onDragStart?.(index)}
			onDragOver={(e) => onDragOver?.(e, index)}
			onDragLeave={onDragLeave}
			onDrop={() => onDrop?.(index)}
			onDragEnd={onDragEnd}
		>
			{/* Hero Card with Content */}
			<CardHeader>
				<div className="flex justify-between">
					<div className="flex items-center gap-4">
						<div className="relative">
							<Image
								src={`/kingsraid-data/assets/${member.hero.profile.thumbnail}`}
								alt={member.hero.profile.name}
								width={60}
								height={60}
								className="rounded border"
							/>
							<div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-background border overflow-hidden">
								<Image
									src={`/kingsraid-data/assets/classes/${member.hero.profile.class.toLowerCase()}.png`}
									alt={member.hero.profile.class}
									width={20}
									height={20}
									className="w-full h-full object-cover"
								/>
							</div>
						</div>
						<div className="flex-1 min-w-0">
							<CardTitle className="text-base truncate"><Text>{member.hero.profile.name}</Text></CardTitle>
							<Badge
								variant="default"
								className={
									member.hero.profile.damage_type === "Physical" ? "bg-red-300" : "bg-blue-300"
								}
							>
								<Text>{member.hero.profile.damage_type}</Text>
							</Badge>
						</div>
					</div>

					<div className="flex gap-1">
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									className="h-6 w-6"
									onClick={(e) => {
										e.stopPropagation()
										router.push(
											`/heroes/${encodeURIComponent(member.hero!.id.toLowerCase().replace(/\s+/g, "-"))}`,
										)
									}}
								>
									<Eye className="h-4 w-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent><Text messageKey="uiViewHeroDetails" /></TooltipContent>
						</Tooltip>
						<Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onRemove(index)}>
							<X className="h-4 w-4" />
						</Button>
					</div>
				</div>
			</CardHeader>

			<CardContent className="space-y-2">
				{/* Equipment Section */}
				<EquipmentSection
					member={member}
					index={index}
					artifacts={artifacts}
					artifactReleaseOrder={artifactReleaseOrder}
					toggleUW={onToggleUW}
					selectUT={onSelectUT}
					selectArtifact={onSelectArtifact}
				/>

				{/* Perks Section */}
				<div className="space-y-2">
					<div className="flex justify-between items-center">
						<div className="text-xs font-medium text-muted-foreground"><Text messageKey="uiPerks" /></div>
						<div className="text-xs">
							<span
								className={cn(
									"font-medium",
									calculateUsedPoints(member.perks) > member.maxPoints
										? "text-red-500"
										: "text-green-500",
								)}
							>
								{calculateUsedPoints(member.perks)}
							</span>
							<span className="text-muted-foreground">/{member.maxPoints}</span>
						</div>
					</div>

					{/* Points Progress Bar */}
					<div className="h-1.5 bg-muted rounded-full overflow-hidden">
						<div
							className={cn(
								"h-full transition-all duration-300 rounded-full",
								calculateUsedPoints(member.perks) > member.maxPoints
									? "bg-red-500"
									: calculateUsedPoints(member.perks) === member.maxPoints
										? "bg-green-500"
										: "bg-primary",
							)}
							style={{
								width: `${Math.min(100, (calculateUsedPoints(member.perks) / member.maxPoints) * 100)}%`,
							}}
						/>
					</div>

					{/* Compact Perks Summary */}
					<PerksCompactSummary member={member} t1Perks={t1Perks} getT2Perks={getT2Perks} />
				</div>

				{/* Edit Perks Dialog */}
				<PerksDialog
					member={member}
					index={index}
					isOpen={perksDialogOpen && selectedSlot === index}
					onOpenChange={(open) => onPerksDialogChange(open, index)}
					onPerkToggle={onPerkToggle}
					onMaxPointsUpdate={onMaxPointsUpdate}
					t1Perks={t1Perks}
					getT2Perks={getT2Perks}
				/>
			</CardContent>
		</Card>
	)
}
