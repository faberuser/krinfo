"use client"

import { useDataVersion } from "@/hooks/use-data-version"
import { GameLanguageScope } from "./language-provider"

export function CurrentGameLanguage({ children }: { children: React.ReactNode }) {
	const { version } = useDataVersion()
	return <GameLanguageScope version={version}>{children}</GameLanguageScope>
}
