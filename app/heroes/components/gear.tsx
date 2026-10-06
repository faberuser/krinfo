
import { Text } from "@/components/i18n/language-provider"
import { HeroData } from "@/model/Hero"
import { Card, CardContent } from "@/components/ui/card"
import Image from "@/components/next-image"
import { classColorMapText, classColorMapBg, parseColoredText } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import GearEnhancement from "@/components/gear-enhancement"

interface GearProps {
	heroData: HeroData
}

export default function Gear({ heroData }: GearProps) {
	return (
		<div className="space-y-6 gear-section">
			{/* Unique Weapon */}
			{heroData.uw && (
				<div>
					<div className="flex items-center gap-2 mb-2">
						<div className="text-lg font-bold"><Text messageKey="uiUniqueWeapon" /></div>
					</div>

					<Card>
						<CardContent>
							<div className="flex flex-col md:flex-row gap-6">
								<div className="shrink-0 hidden md:block">
									<Image
										src={`/kingsraid-data/assets/${heroData.uw.thumbnail}`}
										alt={heroData.uw.name}
										width="0"
										height="0"
										sizes="10vw"
										className="w-full h-auto rounded mt-2"
									/>
								</div>

								<div className="grow">
									<div className="flex flex-row md:items-center gap-2 mb-2">
										<div className="shrink-0 flex md:hidden justify-center items-center">
											<Image
												src={`/kingsraid-data/assets/${heroData.uw.thumbnail}`}
												alt={heroData.uw.name}
												width="0"
												height="0"
												sizes="10vw"
												className="w-10 h-10 rounded"
											/>
										</div>
										<div
											className={`text-xl font-semibold flex justify-center items-center ${classColorMapText(
												heroData.profile.class,
											)}`}
										>
											<Text fieldKey={`heroes/${heroData.id}/uw/name`}>{heroData.uw.name}</Text>
										</div>
									</div>

									<GearEnhancement
										key={`${heroData.id}/uw`}
										name={heroData.uw.name}
										description={heroData.uw.description}
										descriptionByStar={heroData.uw.descriptionByStar}
										fieldKey={`heroes/${heroData.id}/uw/description`}
										values={heroData.uw.value}
									/>

									{/* UW Story */}
									<details className="cursor-pointer">
										<summary className="font-medium text-sm text-muted-foreground hover:text-gray-800 dark:hover:text-gray-200">
											<Text messageKey="uiWeaponStory" /></summary>
										<div className="mt-2 p-3 bg-gray-50 rounded text-sm dark:bg-gray-900/10">
											{parseColoredText(heroData.uw.story, `heroes/${heroData.id}/uw/story`)}
										</div>
									</details>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>
			)}

			{/* Unique Treasures */}
			{heroData.uts && (
				<>
					<div className="flex items-center gap-2 mb-2">
						<div className="text-lg font-bold"><Text messageKey="uiUniqueTreasures" /></div>
					</div>

					<div className="grid gap-4">
						{Object.entries(heroData.uts).map(([utKey, ut]) => (
							<Card key={utKey}>
								<CardContent>
									<div className="flex flex-col md:flex-row gap-4">
										<div className="shrink-0 hidden md:block">
											<Image
												src={`/kingsraid-data/assets/${ut.thumbnail}`}
												alt={ut.name}
												width="0"
												height="0"
												sizes="10vw"
												className="w-full h-auto rounded mt-2"
											/>
										</div>

										<div className="grow">
											<div className="flex flex-row md:items-center gap-2 mb-2">
												<div className="shrink-0 flex md:hidden justify-center items-center">
													<Image
														src={`/kingsraid-data/assets/${ut.thumbnail}`}
														alt={ut.name}
														width="0"
														height="0"
														sizes="10vw"
														className="w-10 h-10 rounded"
													/>
												</div>
												<div
													className={`text-lg font-semibold flex justify-center items-center ${classColorMapText(
														heroData.profile.class,
													)}`}
												>
													<Text messageKey="uiSkill" suffix=" " /><Text>{utKey}</Text>: <Text fieldKey={`heroes/${heroData.id}/uts/${utKey}/name`}>{ut.name}</Text>
												</div>
											</div>

											<GearEnhancement
												key={`${heroData.id}/uts/${utKey}`}
												name={ut.name}
												description={ut.description}
												descriptionByStar={ut.descriptionByStar}
										fieldKey={`heroes/${heroData.id}/uts/${utKey}/description`}
												values={ut.value}
											/>

											{/* UT Story */}
											<details className="cursor-pointer">
												<summary className="font-medium text-sm text-muted-foreground hover:text-gray-800 dark:hover:text-gray-200">
													<Text messageKey="uiTreasureStory" /></summary>
												<div className="mt-2 p-3 bg-gray-50 rounded text-sm dark:bg-gray-900/10">
													{parseColoredText(ut.story, `heroes/${heroData.id}/uts/${utKey}/story`)}
												</div>
											</details>
										</div>
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				</>
			)}

			{/* Soul Weapon */}
			{heroData.sw && (
				<div>
					<div className="flex items-center gap-2 mb-2">
						<div className="text-lg font-bold"><Text messageKey="uiSoulWeapon" /></div>
					</div>

					<Card>
						<CardContent>
							<div className="flex flex-col md:flex-row gap-6">
								<div className="shrink-0 hidden md:block">
									<Image
										src={`/kingsraid-data/assets/${heroData.sw.thumbnail}`}
										alt="Soul Weapon"
										width="0"
										height="0"
										sizes="10vw"
										className="w-full h-auto rounded mt-2"
									/>
								</div>

								<div className="grow">
									<div className="flex flex-col md:flex-row md:items-center gap-2 mb-2">
										<div className="flex flex-row md:items-center gap-2 mb-2">
											<div className="shrink-0 flex md:hidden justify-center items-center">
												<Image
													src={`/kingsraid-data/assets/${heroData.sw.thumbnail}`}
													alt="Soul Weapon"
													width="0"
													height="0"
													sizes="10vw"
													className="w-10 h-10 rounded"
												/>
											</div>
											<div
												className={`text-xl font-semibold flex justify-center items-center ${classColorMapText(
													heroData.profile.class,
												)}`}
											>
												<Text fieldKey={`heroes/${heroData.id}/uw/name`}>{heroData.uw.name}</Text>
											</div>
										</div>

										{/* SW Uses & Cooldown */}
										<div className="flex gap-2 text-sm mb-1">
											<Badge
												variant="default"
												className="bg-blue-100 text-blue-800 dark:bg-blue-200 dark:text-blue-900"
											>
												<Text messageKey="uiUses_8317ac96" suffix=" " /><Text>{heroData.sw.uses}</Text>
											</Badge>
											<Badge
												variant="default"
												className="bg-orange-100 text-orange-800 dark:bg-orange-200 dark:text-orange-900"
											>
												<Text messageKey="uiCooldown_48ced960" suffix=" " /><Text>{heroData.sw.cooldown}</Text>s
											</Badge>
										</div>
									</div>

									<div className="space-y-3">
										<div>
											<div className="font-medium"><Text messageKey="uiRequirement" /></div>
											<div>{parseColoredText(heroData.sw.requirement, `heroes/${heroData.id}/sw/requirement`)}</div>
										</div>

										<div>
											<div className="font-medium "><Text messageKey="uiEffect" /></div>
											<div>{parseColoredText(heroData.sw.description, `heroes/${heroData.id}/sw/description`)}</div>
										</div>

										{/* SW Advancement */}
										{heroData.sw.advancement && (
											<div>
												<div className="font-medium text-sm text-muted-foreground mb-2">
													<Text messageKey="uiAdvancements" /></div>
												<div className="space-y-2">
													{Object.entries(heroData.sw.advancement).map(([level, effect]) => (
														<div
															key={level}
															className={`px-3 py-2 rounded ${classColorMapBg(
																heroData.profile.class,
															)}`}
														>
															<div
																className={`font-medium ${classColorMapText(
																	heroData.profile.class,
																)}`}
															>
																<Text messageKey="uiStage" suffix=" " /><Text>{level}</Text>
															</div>
															<div>{parseColoredText(effect, `heroes/${heroData.id}/sw/advancement/${level}`)}</div>
														</div>
													))}
												</div>
											</div>
										)}

										{/* SW Story */}
										<details className="cursor-pointer">
											<summary className="font-medium text-sm text-muted-foreground hover:text-gray-800 dark:hover:text-gray-200">
												<Text messageKey="uiSoulWeaponStory" /></summary>
											<div className="mt-2 p-3 bg-gray-50 rounded text-sm dark:bg-gray-900/10">
												{parseColoredText(heroData.sw.story, `heroes/${heroData.id}/sw/story`)}
											</div>
										</details>
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>
			)}

			{!heroData.uw && !heroData.uts && !heroData.sw && (
				<div className="text-center text-gray-500 py-8"><Text messageKey="uiNoGearDataAvailable" /></div>
			)}
		</div>
	)
}
