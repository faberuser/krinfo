
import { Text } from "@/components/i18n/language-provider"
import { HeroData } from "@/model/Hero"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import Image from "@/components/next-image"
import { parseColoredText } from "@/lib/utils"

interface SkillsProps {
	heroData: HeroData
}

function parseSkillKey(key: string) {
	const match = key.match(/^(\d+)(?:\s*\((\d+)\))?$/)
	return {
		baseNum: match ? match[1] : key, // base number as string
		suffixNum: match && match[2] ? match[2] : null,
		orig: key,
	}
}

export default function Skills({ heroData }: SkillsProps) {
	const skillsArr = heroData.skills
		? Object.entries(heroData.skills)
				.map(([key, skill]) => ({
					key,
					skill,
					...parseSkillKey(key),
				}))
				.sort((a, b) => {
					if (a.baseNum === b.baseNum) {
						// Sort by suffixNum if present
						const aSuffix = a.suffixNum ? parseInt(a.suffixNum) : 0
						const bSuffix = b.suffixNum ? parseInt(b.suffixNum) : 0
						return aSuffix - bSuffix
					}
					return parseInt(a.baseNum) - parseInt(b.baseNum)
				})
		: []

	return (
		<div className="space-y-4 skills-section">
			{skillsArr.length > 0 ? (
				skillsArr.map(({ key, skill, baseNum }) => (
					<Card key={key}>
						<CardContent className="flex flex-row gap-4">
							{/* Skill Icon */}
							<div className="hidden md:block shrink-0">
								<Image
									src={`/kingsraid-data/assets/${skill.thumbnail}`}
									alt={skill.name}
									width="0"
									height="0"
									sizes="10vw"
									className="w-full h-auto rounded mt-2"
								/>
							</div>

							{/* Skill Details */}
							<div className="grow">
								<div className="flex flex-row md:items-center gap-2 mb-2">
									{/* Skill Icon */}
									<div className="flex md:hidden shrink-0 justify-center items-center">
										<Image
											src={`/kingsraid-data/assets/${skill.thumbnail}`}
											alt={skill.name}
											width="0"
											height="0"
											sizes="10vw"
											className="w-10 h-10 rounded"
										/>
									</div>
									<div className="w-full flex flex-row justify-between md:justify-start items-center gap-2">
										<div className="text-xl font-semibold flex items-center justify-center">
											<Text messageKey="uiSkill" suffix=" " /><Text>{key}</Text>: <Text fieldKey={`heroes/${heroData.id}/skills/${key}/name`}>{skill.name}</Text>
										</div>
										<div className="flex flex-col md:flex-row gap-2 text-sm items-center justify-center">
											{skill.cost && (
												<Badge
													variant="default"
													className="bg-blue-100 text-blue-800 dark:bg-blue-200 dark:text-blue-900 h-fit"
												>
													<Text messageKey="uiMana_d0477b62" suffix=" " /><Text>{skill.cost}</Text>
												</Badge>
											)}
											{skill.cooldown && (
												<Badge
													variant="default"
													className="bg-orange-100 text-orange-800 dark:bg-orange-200 dark:text-orange-900 h-fit"
												>
													<Text messageKey="uiCooldown_48ced960" suffix=" " /><Text>{skill.cooldown}</Text>s
												</Badge>
											)}
										</div>
									</div>
								</div>
								<Separator className="mb-3" />
								<div>{parseColoredText(skill.description, `heroes/${heroData.id}/skills/${key}/description`)}</div>

								{/* Skill Books if available */}
								{heroData.books && heroData.books[baseNum] && (
									<details className="mt-4 cursor-pointer">
										<summary className="font-medium text-sm mb-2 text-muted-foreground">
											<Text messageKey="uiSkillBooks" /></summary>
										<div className="flex flex-col gap-2 text-xs">
											{Object.entries(heroData.books[baseNum]).map(([level, effect]) => (
												<div key={level} className="px-2 py-1 border-l-2">
													<div className="font-medium">
														<Text>{level}</Text>: {parseColoredText(effect, `heroes/${heroData.id}/books/${baseNum}/${level}`)}
													</div>
												</div>
											))}
										</div>
									</details>
								)}
							</div>
						</CardContent>
					</Card>
				))
			) : (
				<div className="text-center text-gray-500 py-8"><Text messageKey="uiNoSkillDataAvailable" /></div>
			)}
		</div>
	)
}
