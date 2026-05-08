import type { Metadata } from "next"
import { TeamBuilderLayoutClient } from "@/app/team-builder/layout-client"

export const metadata: Metadata = {
	title: "Team Builder",
	description: "Build and share your King's Raid team compositions.",
	openGraph: {
		title: "Team Builder",
		description: "Build and share your King's Raid team compositions.",
	},
}

export default function TeamBuilderLayout({ children, modal }: { children: React.ReactNode; modal?: React.ReactNode }) {
	return <TeamBuilderLayoutClient modal={modal}>{children}</TeamBuilderLayoutClient>
}
