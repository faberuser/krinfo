import { HeroData } from "@/model/Hero"
import HeroesPageWrapper from "@/app/heroes/page-wrapper"
import { getData, getJsonDataList, getHeroReleaseOrder, fetchAllVersions } from "@/lib/get-data"
import { HERO_CLASSES } from "@/lib/constants"
import { toHeroListItem } from "@/lib/list-data"

export default async function HeroesPage() {
	// Fetch all independent data in parallel
	const [heroesMap, releaseOrderMap, saReverse] = await Promise.all([
		fetchAllVersions(async (version) => {
			const heroes = (await getData("heroes", { dataVersion: version })) as HeroData[]
			return heroes.map(toHeroListItem)
		}),
		fetchAllVersions<Record<string, string>>((version) => getHeroReleaseOrder(version)),
		getJsonDataList("table-data/sa_reverse.json") as Promise<string[]>,
	])

	return (
		<HeroesPageWrapper
			heroesMap={heroesMap}
			heroClasses={HERO_CLASSES}
			releaseOrderMap={releaseOrderMap}
			saReverse={saReverse}
			// blurDataURLMap={blurDataURLMap}
		/>
	)
}
