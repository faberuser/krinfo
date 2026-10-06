"use client"


import { Text } from "@/components/i18n/language-provider"
// Taken from https://github.com/duckness/NotCleo/blob/master/krmath/krmath.py

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface SoftcapData {
	[statName: string]: {
		MaxK: number
		X1: number
		A1: number
		B1: number
		X2: number
		A2: number
		B2: number
		MinK: number
		X3: number
		A3: number
		B3: number
		X4: number
		A4: number
		B4: number
	}
}

interface SoftcapClientProps {
	softcapData: SoftcapData
}

function attenuate(x: number, k: number, a: number, b: number): number {
	return Math.floor((k * 1000000) / (a * x * x + b * x + 1000000))
}

function attenuateInv(x: number, k: number, a: number, b: number): number {
	return k - Math.floor((k * 1000000) / (a * x * x + b * x + 1000000))
}

function calculateActualStat(statType: SoftcapData[string], istat: number): string {
	let actual = 0

	if (istat === 0) {
		actual = 0
	} else if (istat > statType.X1) {
		actual = attenuateInv(istat, statType.MaxK, statType.A1, statType.B1)
	} else if (istat > statType.X2) {
		actual = Math.floor((istat * statType.A2) / 1000) + statType.B2
	} else if (istat < statType.X3) {
		actual = attenuateInv(istat, statType.MinK, statType.A3, statType.B3)
	} else if (istat < statType.X4) {
		actual = attenuate(istat, statType.MinK, statType.A4, statType.B4)
	} else {
		actual = istat
	}

	actual = Math.round(actual) / 10
	return Math.round(actual) + "%"
}

// Stat mappings
const statMappings = [
	{ name: "ACC", key: "acc" },
	{ name: "Crit", key: "crit" },
	{ name: "Attack Spd", key: "aspd" },
	{ name: "Lifesteal", key: "dodge" }, // uses dodge data
	{ name: "Penetration", key: "pen" },
	{ name: "Block DEF", key: "blockdef" },
	{ name: "CC Resist", key: "ccresist" },
	{ name: "Dodge", key: "dodge" },
	{ name: "Block", key: "dodge" }, // uses dodge data
	{ name: "Tough", key: "pen" }, // uses pen data
	{ name: "Crit Resist", key: "critresist" },
	{ name: "CC ACC", key: "ccacc" },
	{ name: "Mp/Atk", key: "mpatk" },
]

export default function SoftcapClient({ softcapData }: SoftcapClientProps) {
	const [inputValue, setInputValue] = useState<number>(0)

	// Check if we have data
	const hasData = Object.keys(softcapData).length > 0

	return (
		<div>
			<div className="space-y-2 mb-4">
				<div className="items-baseline">
					<div className="text-xl font-bold"><Text messageKey="uiSoftcap" /></div>
				</div>
			</div>

			{!hasData ? (
				<div className="text-center py-12 text-muted-foreground">
					<p className="text-lg"><Text messageKey="uiNoSoftcapDataAvailableForThisDataVersion" /></p>
					<p className="text-sm mt-2"><Text messageKey="uiTrySwitchingToAnotherVersion" /></p>
				</div>
			) : (
				<>
					{/* Input Section */}
					<Card className="mb-6">
						<CardHeader>
							<CardTitle><Text messageKey="uiRawStatValue" /></CardTitle>
						</CardHeader>
						<CardContent>
							<div className="flex gap-4 items-center">
								<Input
									type="number"
									value={inputValue}
									onChange={(e) => setInputValue(Number(e.target.value))}
									onFocus={(e) => e.target.select()}
									placeholder="Enter stat value"
									className="max-w-xs"
								/>
							</div>
						</CardContent>
					</Card>

					{/* Softcap Table */}
					<Card>
						<CardHeader>
							<CardTitle><Text messageKey="uiSoftcapTable" /></CardTitle>
						</CardHeader>
						<CardContent>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead className="text-left"><Text messageKey="uiStat" /></TableHead>
										<TableHead className="text-left"><Text messageKey="uiSoftcap" /></TableHead>
										<TableHead className="text-left"><Text messageKey="uiValue" /></TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{statMappings.map((stat) => {
										const statData = softcapData[stat.key]
										if (!statData) return null

										const actualValue = calculateActualStat(statData, inputValue)

										return (
											<TableRow key={stat.name}>
												<TableCell className="font-medium"><Text>{stat.name}</Text></TableCell>
												<TableCell className="text-left">{statData.X2}</TableCell>
												<TableCell className="text-left"><Text>{actualValue}</Text></TableCell>
											</TableRow>
										)
									})}
								</TableBody>
							</Table>
						</CardContent>
					</Card>
				</>
			)}
		</div>
	)
}
