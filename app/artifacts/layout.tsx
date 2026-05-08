import type { Metadata } from "next"
import { ArtifactsLayoutClient } from "@/app/artifacts/layout-client"

export const metadata: Metadata = {
	title: "Artifacts",
	description: "Browse through artifacts' effects and synergies.",
	openGraph: {
		title: "Artifacts",
		description: "Browse through artifacts' effects and synergies.",
	},
}

export default function ArtifactsLayout({ children, modal }: { children: React.ReactNode; modal?: React.ReactNode }) {
	return <ArtifactsLayoutClient modal={modal}>{children}</ArtifactsLayoutClient>
}
