"use client"

import { Text } from "@/components/i18n/language-provider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface ModelSelectorProps {
	modelOptions: string[]
	selectedModel: string
	setSelectedModel: (model: string) => void
	models: { [variant: string]: Array<{ type: string }> }
	isLoadingModels: boolean
	isOpen: boolean
	formatName: (name: string) => string
}

export function ModelSelector({
	modelOptions,
	selectedModel,
	setSelectedModel,
	models,
	isLoadingModels,
	isOpen,
	formatName,
}: ModelSelectorProps) {
	if (!isOpen) {
		return null
	}

	return (
		<Card className="gap-4">
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle>
					<Text messageKey="uiModels_e27b9664" />
					{modelOptions.length} <Text messageKey="uiVariant_cb7bf562" />
					<Text>{modelOptions.length !== 1 ? "s" : ""}</Text>)
				</CardTitle>
			</CardHeader>
			<CardContent className="overflow-y-auto custom-scrollbar">
				<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2">
					{[...modelOptions]
						.sort((a, b) => {
							const aIsVari = a.startsWith("Vari")
							const bIsVari = b.startsWith("Vari")

							// If one is Vari and the other isn't, put Vari at the bottom
							if (aIsVari && !bIsVari) return 1
							if (!aIsVari && bIsVari) return -1

							// Otherwise, sort alphabetically by formatted name
							return formatName(a).localeCompare(formatName(b))
						})
						.map((modelVariant) => (
							<div
								key={modelVariant}
								className={`p-2 rounded-lg border transition-colors ${
									modelVariant === selectedModel
										? "border-primary bg-primary/5"
										: "border-muted hover:border-primary/50"
								} ${isLoadingModels ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
								onClick={() => !isLoadingModels && setSelectedModel(modelVariant)}
							>
								<div className="font-medium">
									<Text>{formatName(modelVariant)}</Text>
								</div>
								<div className="text-xs text-muted-foreground mt-1">
									<Text>
										{models[modelVariant]
											.map((m) => m.type)
											.sort((a, b) => a.localeCompare(b))
											.join(", ")}
									</Text>
								</div>
							</div>
						))}
				</div>
			</CardContent>
		</Card>
	)
}
