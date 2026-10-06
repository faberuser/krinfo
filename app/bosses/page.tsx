import BossesPageWrapper from "@/app/bosses/page-wrapper"
import { BossData } from "@/model/Boss"
import { getData, getJsonData, fetchAllVersions } from "@/lib/get-data"

export default async function BossesPage() {
	// Fetch all independent data in parallel
	const [bossesMap, bossTypeMap, releaseOrderMap] = await Promise.all([
		fetchAllVersions<BossData[]>((version) => getData("bosses", { dataVersion: version }) as Promise<BossData[]>),
		getJsonData("table-data/boss_type.json"),
		fetchAllVersions<Record<string, string>>((version) =>
			getJsonData(`table-data/${version}/boss_release_order.json`),
		),
	])

	return <BossesPageWrapper bossesMap={bossesMap} bossTypeMap={bossTypeMap} releaseOrderMap={releaseOrderMap} />
}
