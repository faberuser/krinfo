"use client"

import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import Image from "@/components/next-image"
import type { NewsItem } from "@/lib/steam-rss"
import { useState } from "react"
import { getImage, getContent, getPreviewText, NewsDetailDialog } from "@/app/news/client"
import { Badge } from "@/components/ui/badge"

interface SteamRSSProps {
	news: NewsItem[]
}

export default function SteamRSS({ news }: SteamRSSProps) {
	const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null)
	const [isDialogOpen, setIsDialogOpen] = useState(false)

	const handleNewsClick = (news: NewsItem) => {
		setSelectedNews(news)
		setIsDialogOpen(true)
	}

	if (news.length === 0) {
		return (
			<div className="text-center py-8">
				<div className="text-muted-foreground">No news available</div>
			</div>
		)
	}

	return (
		<>
			<Carousel className="w-full h-full">
				<CarouselContent className="w-full items-stretch">
					{news.map((item, index) => {
						const imageSrc = getImage(item.contents)
						const previewText = getPreviewText(item.contents)

						return (
							<CarouselItem key={index} className="flex md:basis-1/2 xl:basis-1/3">
								<Card
									className="h-full w-full gap-2 overflow-hidden cursor-pointer"
									onClick={() => handleNewsClick(item)}
								>
									<CardHeader className="h-24 shrink-0">
										<CardTitle className="flex items-start justify-between gap-2">
											<span className="line-clamp-2">{item.title}</span>
											{item.isNew ? <Badge className="shrink-0 text-xs">New</Badge> : null}
										</CardTitle>
										<CardDescription>{item.formattedDate}</CardDescription>
									</CardHeader>
									<CardContent className="flex flex-col gap-4 overflow-hidden">
										<div className="flex aspect-video w-full shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted/20">
											{imageSrc ? (
												<Image
													src={imageSrc}
													alt={item.title}
													width="0"
													height="0"
													sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
													className="h-full w-full object-cover object-center"
												/>
											) : null}
										</div>
										<div className="line-clamp-5 text-sm text-muted-foreground">{previewText}</div>
									</CardContent>
								</Card>
							</CarouselItem>
						)
					})}
				</CarouselContent>
				<CarouselPrevious className="hidden md:flex" />
				<CarouselNext className="hidden md:flex" />
			</Carousel>

			{/* News Detail Dialog */}
			<NewsDetailDialog
				news={selectedNews}
				imgSrc={selectedNews ? getImage(selectedNews.contents) || undefined : undefined}
				content={selectedNews ? getContent(selectedNews.contents) : undefined}
				isOpen={isDialogOpen}
				onOpenChange={setIsDialogOpen}
			/>
		</>
	)
}

