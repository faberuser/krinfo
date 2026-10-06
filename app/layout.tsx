import "@/app/globals.css"
import { getLocale, getMessages } from "next-intl/server"
import { cookies } from "next/headers"
import { isLocale } from "@/lib/i18n/locales"
import { LOCALE_COOKIE } from "@/lib/i18n/locale-preference"
import type { Messages } from "@/lib/i18n/messages"
import { LanguageProvider } from "@/components/i18n/language-provider"
import { CurrentGameLanguage } from "@/components/i18n/current-game-language"
import type { Metadata } from "next"
import { Geist, Geist_Mono, Comfortaa } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import SidebarProviderWithStorage from "@/components/sidebar/sidebar-provider-with-storage"
import SidebarWrapper from "@/components/sidebar/sidebar-wrapper"
import SidebarInsetClient from "@/components/sidebar/sidebar-inset-client"
import { HeroToggleProvider } from "@/contexts/version-toggle-context"
import { DataVersionProvider } from "@/hooks/use-data-version"
import { CompareModeProvider } from "@/hooks/use-compare-mode"

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
})

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
})

const comfortaa = Comfortaa({
	variable: "--font-comfortaa",
	subsets: ["latin"],
	weight: "700",
})

export const metadata: Metadata = {
	title: "krinfo",
	description: "King's Raid Info - Comprehensive resource index for King's Raid",
	openGraph: {
		title: "krinfo",
		description: "King's Raid Info - Comprehensive resource index for King's Raid",
		url: process.env.NEXT_PUBLIC_SITE_URL || "https://kingsraid.k-clowd.top",
		siteName: "krinfo",
	},
	metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://kingsraid.k-clowd.top"),
}

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	const [locale, messages] = await Promise.all([getLocale(), getMessages()])
	const staticExport = process.env.NEXT_STATIC_EXPORT === "true"
	const hasLocaleCookie = !staticExport && isLocale((await cookies()).get(LOCALE_COOKIE)?.value)
	return (
		<>
			<html lang={locale} suppressHydrationWarning>
				<head />
				<body className={`${geistSans.variable} ${geistMono.variable} ${comfortaa.variable} antialiased`}>
					<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
						<LanguageProvider initialLocale={isLocale(locale) ? locale : "en"} initialMessages={messages as Messages} restorePreference={!hasLocaleCookie} staticExport={staticExport}>
							<DataVersionProvider>
								<CurrentGameLanguage>
									<CompareModeProvider>
										<HeroToggleProvider>
											<SidebarProviderWithStorage>
												<SidebarWrapper />
												<SidebarInsetClient>{children}</SidebarInsetClient>
											</SidebarProviderWithStorage>
										</HeroToggleProvider>
									</CompareModeProvider>
								</CurrentGameLanguage>
							</DataVersionProvider>
						</LanguageProvider>
					</ThemeProvider>
				</body>
			</html>
		</>
	)
}
