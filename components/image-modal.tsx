
import { Text } from "@/components/i18n/language-provider"
import { useState, useRef, useEffect, useCallback } from "react"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogClose,
	DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ZoomIn, ZoomOut, RotateCcw, X, ChevronLeft, ChevronRight } from "lucide-react"
import Image from "@/components/image"

interface ImageZoomModalProps {
	isOpen: boolean
	onOpenChange: (open: boolean) => void
	imageSrc: string
	imageAlt: string
	title?: string
	maxZoomIn?: number
	maxZoomOut?: number
	// Navigation props
	showNavigation?: boolean
	currentIndex?: number
	totalCount?: number
	onNavigate?: (direction: "prev" | "next") => void
	canNavigatePrev?: boolean
	canNavigateNext?: boolean
}

const DEFAULT_MAX_ZOOM_IN = 10
const DEFAULT_MAX_ZOOM_OUT = 1

export default function ImageZoomModal({
	isOpen,
	onOpenChange,
	imageSrc,
	imageAlt,
	title,
	maxZoomIn = DEFAULT_MAX_ZOOM_IN,
	maxZoomOut = DEFAULT_MAX_ZOOM_OUT,
	showNavigation = false,
	currentIndex,
	totalCount,
	onNavigate,
	canNavigatePrev = true,
	canNavigateNext = true,
}: ImageZoomModalProps) {
	const [zoomLevel, setZoomLevel] = useState(1)
	const [panPosition, setPanPosition] = useState({ x: 0, y: 0 })
	const [isDragging, setIsDragging] = useState(false)
	const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
	const [lastPanPosition, setLastPanPosition] = useState({ x: 0, y: 0 })

	const imageContainerRef = useRef<HTMLDivElement>(null)

	// Reset zoom and pan when modal opens or image changes
	const handleOpenChange = (open: boolean) => {
		if (open) {
			setZoomLevel(1)
			setPanPosition({ x: 0, y: 0 })
		}
		onOpenChange(open)
	}

	// Reset zoom and pan when navigating
	const handleNavigate = useCallback(
		(direction: "prev" | "next") => {
			setZoomLevel(1)
			setPanPosition({ x: 0, y: 0 })
			onNavigate?.(direction)
		},
		[onNavigate],
	)

	// Keyboard navigation
	const handleKeyDown = useCallback(
		(e: KeyboardEvent) => {
			if (!isOpen || !showNavigation || !onNavigate) return

			if ((e.key === "ArrowLeft" || e.key === "," || e.key === "[" || e.key === "-") && canNavigatePrev) {
				handleNavigate("prev")
			} else if ((e.key === "ArrowRight" || e.key === "." || e.key === "]" || e.key === "=") && canNavigateNext) {
				handleNavigate("next")
			}
		},
		[isOpen, showNavigation, onNavigate, canNavigatePrev, canNavigateNext, handleNavigate],
	)

	// Add keyboard event listener
	useEffect(() => {
		if (isOpen) {
			document.addEventListener("keydown", handleKeyDown)
			return () => document.removeEventListener("keydown", handleKeyDown)
		}
	}, [isOpen, handleKeyDown])

	const handleZoomIn = () => {
		setZoomLevel((prev) => Math.min(prev + 0.25, maxZoomIn))
	}

	const handleZoomOut = () => {
		setZoomLevel((prev) => {
			const newZoom = Math.max(prev - 0.25, maxZoomOut)
			if (newZoom === 1) {
				setPanPosition({ x: 0, y: 0 })
			}
			return newZoom
		})
	}

	const handleResetZoom = () => {
		setZoomLevel(1)
		setPanPosition({ x: 0, y: 0 })
	}

	// Scroll wheel zoom
	const handleWheel = useCallback(
		(e: React.WheelEvent) => {
			const zoomSpeed = 0.1
			const delta = e.deltaY > 0 ? -zoomSpeed : zoomSpeed

			setZoomLevel((prev) => {
				const newZoom = Math.max(maxZoomOut, Math.min(maxZoomIn, prev + delta))
				if (newZoom === 1) {
					setPanPosition({ x: 0, y: 0 })
				}
				return newZoom
			})
		},
		[maxZoomIn, maxZoomOut],
	)

	const handleMouseDown = useCallback(
		(e: React.MouseEvent) => {
			if (zoomLevel > 1) {
				setIsDragging(true)
				setDragStart({ x: e.clientX, y: e.clientY })
				setLastPanPosition(panPosition)
			}
		},
		[zoomLevel, panPosition],
	)

	const handleMouseMove = useCallback(
		(e: React.MouseEvent) => {
			if (isDragging && zoomLevel > 1) {
				const deltaX = e.clientX - dragStart.x
				const deltaY = e.clientY - dragStart.y

				setPanPosition({
					x: lastPanPosition.x + deltaX,
					y: lastPanPosition.y + deltaY,
				})
			}
		},
		[isDragging, dragStart, lastPanPosition, zoomLevel],
	)

	const handleMouseUp = useCallback(() => {
		setIsDragging(false)
	}, [])

	// Touch events for mobile support
	const handleTouchStart = useCallback(
		(e: React.TouchEvent) => {
			if (zoomLevel > 1 && e.touches.length === 1) {
				setIsDragging(true)
				setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY })
				setLastPanPosition(panPosition)
			}
		},
		[zoomLevel, panPosition],
	)

	const handleTouchMove = useCallback(
		(e: React.TouchEvent) => {
			if (isDragging && zoomLevel > 1 && e.touches.length === 1) {
				const deltaX = e.touches[0].clientX - dragStart.x
				const deltaY = e.touches[0].clientY - dragStart.y

				setPanPosition({
					x: lastPanPosition.x + deltaX,
					y: lastPanPosition.y + deltaY,
				})
			}
		},
		[isDragging, dragStart, lastPanPosition, zoomLevel],
	)

	const handleTouchEnd = useCallback(() => {
		setIsDragging(false)
	}, [])

	return (
		<Dialog open={isOpen} onOpenChange={handleOpenChange}>
			<DialogContent className="[&>button]:hidden p-0 max-w-screen md:max-w-fit sm:max-w-fit w-screen md:w-fit h-fit sm:h-fit focus:outline-none">
				<DialogHeader className="p-4 pb-0">
					<div className="flex items-center justify-between">
						{title && <DialogTitle className="hidden md:block"><Text>{title}</Text></DialogTitle>}
						<div className="flex items-center gap-2 w-full md:w-fit justify-end">
							{/* Navigation controls */}
							{showNavigation && onNavigate && (
								<>
									<div className="flex items-center">
										<Button
											variant="outline"
											size="sm"
											onClick={() => handleNavigate("prev")}
											disabled={!canNavigatePrev}
										>
											<ChevronLeft className="w-4 h-4" />
										</Button>
										{currentIndex !== undefined && totalCount !== undefined && (
											<div className="text-sm font-medium min-w-15 text-center">
												{currentIndex + 1} / {totalCount}
											</div>
										)}
										<Button
											variant="outline"
											size="sm"
											onClick={() => handleNavigate("next")}
											disabled={!canNavigateNext}
										>
											<ChevronRight className="w-4 h-4" />
										</Button>
									</div>
									<div className="hidden md:block w-px h-6 bg-border mx-1" />
								</>
							)}

							{/* Zoom controls */}
							<div className="hidden md:flex gap-2">
								<div className="flex items-center">
									<Button
										variant="outline"
										size="sm"
										onClick={handleZoomOut}
										disabled={zoomLevel <= maxZoomOut}
									>
										<ZoomOut className="w-4 h-4" />
									</Button>
									<div className="text-sm font-medium min-w-15 text-center">
										{Math.round(zoomLevel * 100)}%
									</div>
									<Button
										variant="outline"
										size="sm"
										onClick={handleZoomIn}
										disabled={zoomLevel >= maxZoomIn}
									>
										<ZoomIn className="w-4 h-4" />
									</Button>
								</div>
								<Button variant="outline" size="sm" onClick={handleResetZoom}>
									<RotateCcw className="w-4 h-4" />
								</Button>
								<div className="w-px h-6 bg-border mx-1" />
							</div>

							<DialogClose asChild>
								<Button variant="outline" size="sm">
									<X className="w-4 h-4" />
								</Button>
							</DialogClose>
						</div>
					</div>
				</DialogHeader>
				<DialogDescription className="sr-only"><Text messageKey="uiImage" /></DialogDescription>

				<div className="overflow-hidden p-4 pt-0 h-full w-full" ref={imageContainerRef}>
					<div
						className="flex justify-center items-center h-full w-full"
						onMouseDown={handleMouseDown}
						onMouseMove={handleMouseMove}
						onMouseUp={handleMouseUp}
						onMouseLeave={handleMouseUp}
						onTouchStart={handleTouchStart}
						onTouchMove={handleTouchMove}
						onTouchEnd={handleTouchEnd}
						onWheel={handleWheel}
						style={{
							cursor: zoomLevel > 1 ? (isDragging ? "grabbing" : "grab") : "default",
						}}
					>
						<div
							className="transition-transform duration-200 ease-out select-none"
							style={{
								transform: `scale(${zoomLevel}) translate(${panPosition.x / zoomLevel}px, ${
									panPosition.y / zoomLevel
								}px)`,
								transformOrigin: "center center",
							}}
						>
							<Image
								src={imageSrc}
								alt={imageAlt}
								style={{
									imageRendering: "auto",
								}}
								draggable={false}
							/>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}
