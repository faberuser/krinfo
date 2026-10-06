"use client"

import { useTranslation } from "./language-provider"
import { renderColoredText } from "@/lib/i18n/colored-text"

export function GameText({ text, fieldKey }: { text: string; fieldKey?: string }) {
	const { t, field } = useTranslation()
	return renderColoredText(fieldKey ? field(text, fieldKey) : t(text))
}
