import type { Metadata } from "next"
import { BossesLayoutClient } from "@/app/bosses/layout-client"

export const metadata: Metadata = {
	title: "Bosses",
	description: "Study boss skills, mechanics and strategies.",
	openGraph: {
		title: "Bosses",
		description: "Study boss skills, mechanics and strategies.",
	},
}

export default function BossesLayout({ children, modal }: { children: React.ReactNode; modal?: React.ReactNode }) {
	return <BossesLayoutClient modal={modal}>{children}</BossesLayoutClient>
}
