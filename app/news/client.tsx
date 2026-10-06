"use client"

import { Text, LocalizedDate } from "@/components/i18n/language-provider"

import type { NewsItem } from "@/lib/steam-rss"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import Image from "@/components/next-image"
import { Eye, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"

export const getImage = (html: string): string | null => {
	const imgMatch = html.match(/<img[^>]*>/i)
	if (!imgMatch) return null
	const srcMatch = imgMatch[0].match(/src=["']([^"']+)["']/i)
	return srcMatch ? srcMatch[1] : null
}

export const getContent = (html: string): string => {
	return html.replace(/<img[^>]*>/i, "").replace(/\u00a0|&nbsp;|&#160;/gi, " ")
}

export const getPreviewText = (html: string): string => {
	return html
		.replace(/<br\s*\/?>/gi, " ")
		.replace(/<\/(?:p|div|li|h[1-6]|blockquote)>/gi, " ")
		.replace(/<[^>]+>/g, " ")
		.replace(/&nbsp;|&#160;/gi, " ")
		.replace(/&amp;/gi, "&")
		.replace(/&lt;/gi, "<")
		.replace(/&gt;/gi, ">")
		.replace(/&quot;/gi, '"')
		.replace(/&#(?:39|x27);/gi, "'")
		.replace(/\s+/g, " ")
		.trim()
}

export default function NewsClient({ steamNews }: { steamNews: NewsItem[] }) {
	const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null)
	const [isDialogOpen, setIsDialogOpen] = useState(false)

	const handleNewsClick = (news: NewsItem) => {
		setSelectedNews(news)
		setIsDialogOpen(true)
	}

	return (
		<div>
			<div className="space-y-4 mb-4">
				{/* Header */}
				<div className="flex flex-row gap-2 items-baseline">
					<div className="text-xl font-bold"><Text messageKey="uiNewsHub" /></div>
					<div className="text-muted-foreground text-sm"><Text messageKey="uiShowing" suffix=" " />{steamNews.length} <Text messageKey="uiNews_19fba0e9" /></div>
				</div>

				{/* News Grid */}
				<div className="grid grid-cols-1 gap-4">
					{steamNews.map((news, index) => {
						const imageSrc = getImage(news.contents)
						const previewText = getPreviewText(news.contents)

						return (
							<Card
								key={index}
								className="overflow-hidden cursor-pointer flex flex-col lg:h-80 lg:flex-row lg:py-0 justify-between gap-0 hover:scale-102 transition-transform"
								onClick={() => handleNewsClick(news)}
							>
								{imageSrc && (
									<div className="flex h-56 w-full shrink-0 items-center justify-center px-6 mb-4 lg:mb-0 lg:ml-6 lg:h-full lg:w-lg lg:max-w-[35%] lg:px-0">
										<Image
											width="0"
											height="0"
											sizes="(min-width: 1024px) 32rem, 100vw"
											src={imageSrc}
											alt={news.title}
											className="h-full w-full object-contain rounded"
										/>
									</div>
								)}

								<div className="flex min-h-0 min-w-0 w-full flex-col justify-between gap-4 lg:py-6">
									<div className="flex min-h-0 flex-col gap-4 overflow-hidden">
										<CardHeader>
											<CardTitle className="line-clamp-2 flex justify-between items-center gap-2">
												<div className="text-xl font-semibold"><Text>{news.title}</Text></div>
												{news.isNew ? <Badge className="text-xs"><Text messageKey="uiNew" /></Badge> : null}
											</CardTitle>
											<CardDescription className="text-sm whitespace-nowrap">
												<LocalizedDate date={news.date} />
											</CardDescription>
										</CardHeader>
										<CardContent className="min-h-0 overflow-hidden">
											<div className="text-muted-foreground line-clamp-5"><Text>{previewText}</Text></div>
										</CardContent>
									</div>
									<CardFooter className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
										<Eye className="w-4 h-4" />
										<Text messageKey="uiViewMore" /></CardFooter>
								</div>
							</Card>
						)
					})}
				</div>

				{/* No News Message */}
				{steamNews.length === 0 && (
					<div className="text-center py-16">
						<div className="text-muted-foreground text-lg"><Text messageKey="uiNoNewsAvailableAtTheMoment" /></div>
					</div>
				)}

				{/* News Detail Dialog */}
				<NewsDetailDialog
					news={selectedNews}
					imgSrc={selectedNews ? getImage(selectedNews.contents) || undefined : undefined}
					content={selectedNews ? getContent(selectedNews.contents) : undefined}
					isOpen={isDialogOpen}
					onOpenChange={setIsDialogOpen}
				/>
			</div>
		</div>
	)
}

export function NewsDetailDialog({
	news,
	imgSrc,
	content,
	isOpen,
	onOpenChange,
}: {
	news: NewsItem | null
	imgSrc?: string
	content?: string
	isOpen: boolean
	onOpenChange: (open: boolean) => void
}) {
	if (!news) return null

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-[90vw] min-w-0 md:min-w-[60vw] lg:min-w-[50vw] xl:min-w-[40vw] max-h-[90vh] overflow-x-hidden overflow-y-auto custom-scrollbar">
				<DialogHeader>
					<DialogTitle className="wrap-break-word pr-8 text-2xl font-bold"><Text>{news.title}</Text></DialogTitle>
					<DialogDescription className="text-sm"><LocalizedDate date={news.date} /></DialogDescription>
				</DialogHeader>

				{imgSrc && (
					<Image
						src={imgSrc}
						alt={news.title}
						width="0"
						height="0"
						sizes="80vw"
						className="h-auto w-full object-contain rounded"
					/>
				)}

				<div
					className="min-w-0 max-w-full space-y-2 wrap-break-word [&_a]:break-all [&_iframe]:max-w-full [&_img]:h-auto [&_img]:max-w-full [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto"
					dangerouslySetInnerHTML={{ __html: content ?? "" }}
				/>

				<Button asChild>
					<Link href={news.url} target="_blank" rel="noopener noreferrer">
						<ExternalLink className="w-4 h-4 mr-1" />
						<Text messageKey="uiViewOnSteam" /></Link>
				</Button>
			</DialogContent>
		</Dialog>
	)
}
