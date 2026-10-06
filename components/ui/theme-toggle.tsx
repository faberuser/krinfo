"use client"

import { Text } from "@/components/i18n/language-provider"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ModeToggle() {
    const { setTheme } = useTheme()

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                    <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    <span className="sr-only"><Text messageKey="uiToggleTheme" /></span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setTheme("light")}>
                    <Text messageKey="uiLight_dbcd5e7b" /></DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")}>
                    <Text messageKey="uiDark_60acc53f" /></DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")}>
                    <Text messageKey="uiSystem" /></DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
