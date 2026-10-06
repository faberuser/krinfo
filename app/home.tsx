
import { Text } from "@/components/i18n/language-provider"
import SteamRSS from "@/components/steam-news-carousel"
import Link from "next/link"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Image from "@/components/next-image"
import type { NewsItem } from "@/lib/steam-rss"

const communities = [
	{
		name: "Official X (Twitter)",
		thumbnail: "/images/communities/x.png",
		url: "https://x.com/kingsraid_msg",
		description: "Follow the official X account for the latest updates and announcements.",
	},
	{
		name: "Official Discord",
		thumbnail: "/images/communities/official-discord.png",
		url: "https://discord.com/invite/TyvYcF4gjn",
		description: "Connect with other players on the official King's Raid Discord server.",
	},
	{
		name: "Reddit",
		thumbnail: "/images/communities/reddit.png",
		url: "https://www.reddit.com/r/Kings_Raid/",
		description: "Join the King's Raid subreddit for discussions, news, and fan content.",
	},
]

interface HomeContentProps {
	steamNews: NewsItem[]
}

export default function HomeContent({ steamNews }: HomeContentProps) {
	return (
		<div className="min-h-screen flex flex-col justify-center">
			<div className="container mx-auto my-auto space-y-10">
				{/* Hero Section */}
				<div className="text-center p-2 md:p-0 space-y-4">
					<div
						className="text-3xl leading-[normal]"
						style={{ fontFamily: "var(--font-comfortaa)", fontWeight: 700 }}
					>
						<Text messageKey="uiKingSRaidInfo" /></div>
					<div className="text-lg text-muted-foreground max-w-2xl mx-auto">
						<Text messageKey="uiKingSRaidWasOriginallyReleasedIn2016ByVespaIncChangedToAnicIncThenEndOfServ" /><br />
						<Text messageKey="uiThisSiteAimsToProvideTheLatestResourcesForTheGameAndItsCommunity" /></div>
				</div>

				{/* News Section */}
				{steamNews.length > 0 && (
					<div className="space-y-4 p-2 md:p-0">
						<div className="text-center">
							<div className="text-2xl font-bold mb-2"><Text messageKey="uiLatestNews" /></div>
							<div className="text-muted-foreground"><Text messageKey="uiSteamAnnouncements" /></div>
						</div>
						<SteamRSS news={steamNews} />
					</div>
				)}

				{/* Resources Grid */}
				<div className="space-y-4">
					<div className="text-center">
						<div className="text-2xl font-bold mb-2"><Text messageKey="uiResources" /></div>
						<div className="text-muted-foreground"><Text messageKey="uiKingSRaidCommunities" /></div>
					</div>
					<Communities />
				</div>
			</div>
		</div>
	)
}


function Communities() {
	return (
		<div className="flex flex-wrap justify-center gap-6">
			{communities.map((community) => (
				<Link key={community.name} href={community.url} target="_blank" rel="noreferrer">
					<Card className="w-72 h-full hover:shadow-lg transition-shadow flex flex-col">
						<CardHeader className="flex-1">
							<CardTitle className="flex flex-row items-center gap-4">
								<div className="relative w-10 h-10 aspect-square overflow-hidden rounded-lg">
									<Image
										src={community.thumbnail}
										alt={community.name}
										width={40}
										height={40}
										sizes="40px"
										className="w-full h-auto object-cover"
									/>
								</div>
								<Text>{community.name}</Text>
							</CardTitle>
							<CardDescription><Text>{community.description}</Text></CardDescription>
						</CardHeader>
					</Card>
				</Link>
			))}
		</div>
	)
}
