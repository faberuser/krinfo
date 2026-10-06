
import { Text } from "@/components/i18n/language-provider"
import { useEffect, useState } from "react"
import { HeroData } from "@/model/Hero"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import Image from "@/components/next-image"
import { ZoomIn } from "lucide-react"
import ImageZoomModal from "@/components/image-modal"

interface Costume {
	name: string
	path: string
	displayName: string
}

interface CostumesProps {
	heroData: HeroData
	costumes: Costume[]
}

export default function Costumes({ heroData, costumes }: CostumesProps) {
	// Auto-select first costume when costumes are available
	const [selectedCostume, setSelectedCostume] = useState<string | null>(costumes.length > 0 ? costumes[0].name : null)
	const [isModalOpen, setIsModalOpen] = useState(false)

	useEffect(() => {
		const currentIndex = costumes.findIndex((costume) => costume.name === selectedCostume)
		if (currentIndex === -1) return

		// Warm the original images used by the modal, rather than the optimized thumbnails.
		const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ""
		const nearbyPaths = new Set(
			[0, -1, 1].map((offset) => costumes[(currentIndex + offset + costumes.length) % costumes.length].path),
		)

		for (const path of nearbyPaths) {
			const image = new window.Image()
			image.src = `${basePath}/kingsraid-data/assets/${path}`
			// Decode ahead of navigation too; a failed preload must not block browsing.
			void image.decode().catch(() => {})
		}
	}, [costumes, selectedCostume])

	const handleImageClick = () => {
		setIsModalOpen(true)
	}

	const handleModalNavigate = (direction: "prev" | "next") => {
		const currentIndex = costumes.findIndex((c) => c.name === selectedCostume)
		let newIndex: number

		if (direction === "prev") {
			newIndex = currentIndex > 0 ? currentIndex - 1 : costumes.length - 1
		} else {
			newIndex = currentIndex < costumes.length - 1 ? currentIndex + 1 : 0
		}

		setSelectedCostume(costumes[newIndex].name)
	}

	if (!heroData.costumes) {
		return (
			<div className="text-center text-muted-foreground py-8">
				<Text messageKey="uiNoCostumeDataAvailableFor" suffix=" " /><Text>{(heroData.profile.name)}</Text>
			</div>
		)
	}

	const selectedCostumeData = costumes.find((c) => c.name === selectedCostume)
	const currentCostumeIndex = costumes.findIndex((c) => c.name === selectedCostume)

	return (
		<>
			{/* Main Layout - Side by side */}
			<div className="flex flex-col lg:flex-row gap-6">
				{/* Available Costumes - Left Side */}
				<Card>
					<CardHeader>
						<CardTitle><Text messageKey="uiCostumes_4ca7fdb7" />{costumes.length} <Text messageKey="uiVariants_5432e2fa" /></CardTitle>
					</CardHeader>
					<CardContent className="h-200 custom-scrollbar overflow-y-auto overflow-x-hidden">
						<div className="flex items-center justify-center">
							<div className="space-y-3 p-2">
								{costumes.map((costume) => (
									<CostumeCard
										key={costume.name}
										costume={costume}
										heroName={heroData.profile.name}
										isSelected={selectedCostume === costume.name}
										onClick={() => setSelectedCostume(costume.name)}
									/>
								))}
							</div>
						</div>

						{costumes.length === 0 && (
							<div className="text-center text-muted-foreground py-8">
								<div><Text messageKey="uiNoCostumeImagesFound" /></div>
							</div>
						)}
					</CardContent>
				</Card>

				{/* Selected Costume Display - Right Side */}
				<div className="flex-1">
					{selectedCostume && selectedCostumeData ? (
						<Card>
							<CardHeader>
								<CardTitle><Text>{selectedCostumeData.displayName.replace("%", "?")}</Text></CardTitle>
							</CardHeader>
							<CardContent>
								<div className="flex justify-center">
									<div
										className="h-100 md:h-200 w-full relative cursor-pointer hover:opacity-90 transition-opacity flex items-center justify-center"
										onClick={handleImageClick}
									>
										<Image
											src={`/kingsraid-data/assets/${selectedCostumeData.path}`}
											alt={`${heroData.profile.name} - ${selectedCostumeData.displayName}`}
											width="0"
											height="0"
											sizes="80vw md:60vw"
											className="object-contain h-full w-full"
										/>
										<div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/20 rounded-lg">
											<ZoomIn className="w-12 h-12 text-white" />
										</div>
									</div>
								</div>
							</CardContent>
						</Card>
					) : (
						<Card>
							<CardContent>
								<div className="flex items-center justify-center h-64 text-gray-500">
									<div className="text-center">
										<div className="text-lg"><Text messageKey="uiSelectACostumeToView" /></div>
										<div className="text-sm mt-2">
											<Text messageKey="uiChooseFromTheAvailableCostumesOnTheLeft" /></div>
									</div>
								</div>
							</CardContent>
						</Card>
					)}
				</div>
			</div>

			{/* Zoom Modal */}
			{selectedCostumeData && (
				<ImageZoomModal
					isOpen={isModalOpen}
					onOpenChange={setIsModalOpen}
					imageSrc={`/kingsraid-data/assets/${selectedCostumeData.path}`}
					imageAlt={`${heroData.profile.name} - ${selectedCostume}`}
					title={`${(heroData.profile.name)} - ${selectedCostumeData.displayName}`}
					showNavigation={costumes.length > 1}
					currentIndex={currentCostumeIndex}
					totalCount={costumes.length}
					onNavigate={handleModalNavigate}
					canNavigatePrev={true}
					canNavigateNext={true}
				/>
			)}
		</>
	)
}

interface CostumeCardProps {
	costume: Costume
	heroName: string
	isSelected: boolean
	onClick: () => void
}

function CostumeCard({ costume, heroName, isSelected, onClick }: CostumeCardProps) {
	return (
		<div
			className={`border rounded w-50 h-50 flex flex-col relative cursor-pointer overflow-hidden transition-all duration-200 transform hover:ring-1 ${
				isSelected ? "ring-2" : ""
			}`}
			onClick={onClick}
		>
			<Image
				src={`/kingsraid-data/assets/${costume.path}`}
				alt={`${heroName} - ${costume.displayName}`}
				width="0"
				height="0"
				sizes="40vw md:20vw"
				className="w-full flex-1 hover:scale-110 transition-transform duration-300 object-contain"
			/>
			<div className="text-sm font-bold w-full text-center absolute bottom-0 h-12 bg-linear-to-t from-white dark:from-black/70 to-transparent dark:text-white py-2 flex items-center justify-center">
				<Text>{costume.displayName.replace("%", "?")}</Text>
			</div>
		</div>
	)
}
