
import { Text, useTranslation } from "@/components/i18n/language-provider"
import { useState } from "react"
import { HeroData } from "@/model/Hero"
import Image from "@/components/next-image"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import ImageZoomModal from "@/components/image-modal"
import { ZoomIn } from "lucide-react"
import { parseColoredText } from "@/lib/utils"

interface ProfileProps {
	heroData: HeroData
}

export default function Profile({ heroData }: ProfileProps) {
	const { profile } = heroData
	const { locale } = useTranslation()
	const [isModalOpen, setIsModalOpen] = useState(false)

	const handleImageClick = () => {
		setIsModalOpen(true)
	}

	return (
		<div className="space-y-6">
			{/* Hero Info - Consolidated */}
			<Card>
				<CardContent>
					<div className="text-xl font-semibold pb-2"><Text messageKey="uiHeroInformation" /></div>
					<Separator className="mb-6" />

					{/* Combat Stats Group */}
					<div className="mb-6">
						<h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
							<Text messageKey="uiCombatAttributes" /></h3>
						<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
							<div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
								<div className="flex-1">
									<div className="text-xs text-muted-foreground mb-0.5"><Text messageKey="uiClass" /></div>
									<div className="font-semibold"><Text fieldKey={`heroes/${profile.name}/profile/class`}>{profile.class}</Text></div>
								</div>
							</div>
							<div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
								<div className="flex-1">
									<div className="text-xs text-muted-foreground mb-0.5"><Text messageKey="uiPosition" /></div>
									<div className="font-semibold"><Text fieldKey={`heroes/${profile.name}/profile/position`}>{profile.position}</Text></div>
								</div>
							</div>
							<div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
								<div className="flex-1">
									<div className="text-xs text-muted-foreground mb-0.5"><Text messageKey="uiDamageType" /></div>
									<div className="font-semibold"><Text fieldKey={`heroes/${profile.name}/profile/damage_type`}>{profile.damage_type}</Text></div>
								</div>
							</div>
							<div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
								<div className="flex-1">
									<div className="text-xs text-muted-foreground mb-0.5"><Text messageKey="uiAttackRange" /></div>
									<div className="font-semibold"><Text fieldKey={`heroes/${profile.name}/profile/attack_range`}>{profile.attack_range}</Text></div>
								</div>
							</div>
						</div>
					</div>

					{/* Character Details Group */}
					<div>
						<h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
							<Text messageKey="uiCharacterDetails" /></h3>
						<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
							<div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
								<div className="flex-1">
									<div className="text-xs text-muted-foreground mb-0.5"><Text messageKey="uiGender" /></div>
									<div className="font-semibold"><Text fieldKey={`heroes/${profile.name}/profile/gender`}>{profile.gender}</Text></div>
								</div>
							</div>
							<div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
								<div className="flex-1">
									<div className="text-xs text-muted-foreground mb-0.5"><Text messageKey="uiRace" /></div>
									<div className="font-semibold"><Text fieldKey={`heroes/${profile.name}/profile/race`}>{profile.race}</Text></div>
								</div>
							</div>
							<div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
								<div className="flex-1">
									<div className="text-xs text-muted-foreground mb-0.5"><Text messageKey="uiAge" /></div>
									<div className="font-semibold"><Text fieldKey={`heroes/${profile.name}/profile/age`}>{profile.age}</Text></div>
								</div>
							</div>
							<div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
								<div className="flex-1">
									<div className="text-xs text-muted-foreground mb-0.5"><Text messageKey="uiHeight" /></div>
									<div className="font-semibold"><Text fieldKey={`heroes/${profile.name}/profile/height`}>{profile.height}</Text> <Text>cm</Text></div>
								</div>
							</div>
							<div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
								<div className="flex-1">
									<div className="text-xs text-muted-foreground mb-0.5"><Text messageKey="uiBirthday" /></div>
									<div className="font-semibold">{`${new Intl.DateTimeFormat(locale, { month: "long", day: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(2000, profile.birth.month - 1, profile.birth.day)))}, ${profile.birth.monthName}`}</div>
								</div>
							</div>
							<div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
								<div className="flex-1">
									<div className="text-xs text-muted-foreground mb-0.5"><Text messageKey="uiConstellation" /></div>
									<div className="font-semibold"><Text fieldKey={`heroes/${profile.name}/profile/constellation`}>{profile.constellation}</Text></div>
								</div>
							</div>
							<div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
								<div className="flex-1">
									<div className="text-xs text-muted-foreground mb-0.5"><Text messageKey="uiLikes" /></div>
									<div className="font-semibold"><Text fieldKey={`heroes/${profile.name}/profile/like`}>{profile.like}</Text></div>
								</div>
							</div>
							<div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
								<div className="flex-1">
									<div className="text-xs text-muted-foreground mb-0.5"><Text messageKey="uiDislikes" /></div>
									<div className="font-semibold"><Text fieldKey={`heroes/${profile.name}/profile/dislike`}>{profile.dislike}</Text></div>
								</div>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Personal Details */}
			<div className="grid lg:grid-cols-3 gap-6">
				{/* Story Section */}
				<Card className="lg:col-span-1">
					<CardContent>
						<div className="text-xl font-semibold pb-2"><Text messageKey="uiBackgroundStory" /></div>
						<Separator className="mb-4" />
						<div className="prose max-w-none">
							<div>{parseColoredText(profile.story, `heroes/${profile.name}/profile/story`)}</div>
						</div>
					</CardContent>
				</Card>

				{/* Splash Art */}
				<Card className="lg:col-span-2">
					<CardContent>
						<div className="text-xl font-semibold pb-2"><Text messageKey="uiSplashart" /></div>
						<Separator className="mb-4" />
						<div
							className="relative w-full flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity"
							onClick={handleImageClick}
						>
							<Image
								src={`/kingsraid-data/assets/${heroData.splashart}`}
								alt={`${heroData.profile.name} Splashart`}
								width="0"
								height="0"
								sizes="80vw md:40vw"
								className="w-auto h-full rounded"
							/>
							<div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/20 rounded-lg">
								<ZoomIn className="w-12 h-12 text-white" />
							</div>
						</div>

						<ImageZoomModal
							isOpen={isModalOpen}
							onOpenChange={setIsModalOpen}
							imageSrc={`/kingsraid-data/assets/${heroData.splashart}`}
							imageAlt={`${heroData.profile.name} Splashart`}
							title={`${heroData.profile.name} Splashart`}
						/>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
