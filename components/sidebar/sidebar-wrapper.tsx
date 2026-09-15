import ClientSidebar from "@/components/sidebar/client-sidebar"
import type { ArtifactData } from "@/model/Artifact"
import type { HeroData } from "@/model/Hero"
import type { BossData } from "@/model/Boss"
import { getData } from "@/lib/get-data"
import { toSearchData } from "@/lib/list-data"

export default async function SidebarWrapper() {
	// Legacy includes every searchable entry. Load the collections concurrently,
	// then send only the fields used by search across the client boundary.
	const [heroes, artifacts, bosses] = await Promise.all([
		getData("heroes", { dataVersion: "legacy" }) as Promise<HeroData[]>,
		getData("artifacts", { dataVersion: "legacy" }) as Promise<ArtifactData[]>,
		getData("bosses", { dataVersion: "legacy" }) as Promise<BossData[]>,
	])
	return <ClientSidebar searchData={toSearchData(heroes, artifacts, bosses)} />
}
