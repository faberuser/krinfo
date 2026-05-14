"use server"

import type { HeroComparison } from "@/app/stats/types"

export async function fetchHeroComparison(
	versionA: string,
	versionB: string,
	heroName: string,
): Promise<HeroComparison | null> {
	try {
		const response = await fetch(
			`${process.env.NEXT_PUBLIC_API_URL || ""}/kingsraid-stats/${versionA}_vs_${versionB}/${encodeURIComponent(heroName)}.json`,
		)
		if (!response.ok) {
			return null
		}
		return response.json()
	} catch {
		return null
	}
}
