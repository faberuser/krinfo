"use client"

import { Languages, LoaderCircle } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LANGUAGES, isLocale } from "@/lib/i18n/locales"
import { useTranslation } from "./language-provider"

export default function LanguageSelector({ compact = false }: { compact?: boolean }) {
	const { locale, setLocale, t, loading } = useTranslation()
	return (
		<div className="flex min-w-0 items-center justify-center gap-1">
			<Select
				value={locale}
				onValueChange={(value) => {
					if (isLocale(value)) setLocale(value)
				}}
			>
				<SelectTrigger
					aria-label={t("uiLanguage")}
					className={compact ? "size-9 justify-center p-0 [&>svg:last-child]:hidden" : "min-w-0 max-w-40"}
					title={t("uiMissingTranslationsUseEnglishForTheSelectedGameVersion")}
				>
					{loading ? (
						<LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
					) : (
						<Languages className="size-4" aria-hidden="true" />
					)}
					{compact ? <span className="sr-only"><SelectValue /></span> : <SelectValue />}
				</SelectTrigger>
				<SelectContent>
					{LANGUAGES.map(({ code, label }) => (
						<SelectItem key={code} value={code}>
							<span lang={code}>{label}</span>
						</SelectItem>
					))}
					<div className="max-w-64 border-t px-2 py-2 text-xs text-muted-foreground">
						{t("uiSomeGameTextIsManuallyTranslatedWhenTheOriginalTextIsInTheWrongLanguage")}
					</div>
				</SelectContent>
			</Select>
		</div>
	)
}
