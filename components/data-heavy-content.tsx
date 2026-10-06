"use client"

import { Text } from "@/components/i18n/language-provider"
import { useState, ReactNode } from "react"
import { useNetworkInfo } from "@/hooks/use-network-info"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Wifi, Signal } from "lucide-react"

interface DataHeavyContentProps {
	children: ReactNode
	description?: string
	estimatedSize?: string
}

export default function DataHeavyContent({
	children,
	description = "This content contains large files that may consume significant mobile data.",
	estimatedSize,
}: DataHeavyContentProps) {
	const { isSlowConnection, connectionType, effectiveType } = useNetworkInfo()
	const [hasConfirmed, setHasConfirmed] = useState(false)

	// If not on slow connection or user has already confirmed, show content directly
	if (!isSlowConnection || hasConfirmed) {
		return <>{children}</>
	}

	// Show confirmation card for slow/mobile connections
	return (
		<Card className="border-amber-500/50 bg-amber-500/5 gap-2">
			<CardHeader>
				<div className="flex-1">
					<CardTitle className="flex items-center gap-2 text-lg">
						{connectionType === "cellular" ? (
							<Signal className="h-5 w-5 text-amber-500" />
						) : (
							<Wifi className="h-5 w-5 text-amber-500" />
						)}
						<div>
							<Text messageKey="uiMobileDataWarning" />
						</div>
					</CardTitle>
					<CardDescription className="mt-2">
						<Text>{description}</Text>
					</CardDescription>
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="text-sm text-muted-foreground space-y-2">
					{estimatedSize && (
						<p className="text-xs">
							<Text messageKey="uiEstimatedSize_c1be5e26" suffix=" " />
							<span className="text-foreground">
								<Text>{estimatedSize}</Text>
							</span>
						</p>
					)}
					{effectiveType && (
						<p className="text-xs">
							<Text messageKey="uiCurrentConnection_f5d5a0de" suffix=" " />
							<span className="text-foreground capitalize">
								<Text>{effectiveType}</Text>
							</span>
						</p>
					)}
				</div>

				<div className="flex gap-3">
					<Button onClick={() => setHasConfirmed(true)} variant="default" className="flex-1">
						<Text messageKey="uiLoadContent" />
					</Button>
				</div>

				<p className="text-xs text-muted-foreground">
					<Text messageKey="uiTipConnectToWiFiForABetterExperienceWithLargeFiles" />
				</p>
			</CardContent>
		</Card>
	)
}
