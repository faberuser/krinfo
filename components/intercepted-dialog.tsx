"use client"

import { Text } from "@/components/i18n/language-provider"
import * as React from "react"
import { useRouter, usePathname } from "next/navigation"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ExternalLink } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"

/**
 * Persistent dialog shell that lives in the layout and stays mounted across
 * intercepted route navigations. This prevents the flash-close/reopen that
 * occurs when the @modal slot unmounts and remounts on router.replace().
 *
 * The modal slot content renders as children of this shell.
 * When no modal is active (children is null/the default slot), the dialog closes.
 *
 * `hasModal` is derived from the pathname by the parent layout-client.
 * However, on a direct/hard navigation to e.g. `/heroes/kasel`, the @modal
 * slot renders its `default.tsx` (which returns null) even though the URL
 * matches.  We detect this by probing the rendered children via a ref: if the
 * wrapper has no visible child nodes the modal content is empty and we skip
 * opening the dialog.
 */
export function InterceptedDialog({ children, hasModal }: { children: React.ReactNode; hasModal: boolean }) {
	const router = useRouter()
	const pathname = usePathname()
	const [isFullPage, setIsFullPage] = React.useState(false)
	const isMobile = useIsMobile()
	const dialogContentRef = React.useRef<HTMLDivElement>(null)

	// Detect whether the modal slot actually rendered visible content.
	// On direct navigation the @modal/default.tsx returns null, so the
	// probe wrapper will have no child nodes.
	const modalProbeRef = React.useRef<HTMLDivElement>(null)
	const [hasContent, setHasContent] = React.useState(false)

	React.useEffect(() => {
		if (!hasModal) {
			setHasContent(false)
			return
		}
		// Use a microtask so React has flushed the children into the DOM
		const raf = requestAnimationFrame(() => {
			const el = modalProbeRef.current
			setHasContent(el != null && el.childNodes.length > 0)
		})
		return () => cancelAnimationFrame(raf)
	}, [hasModal, children])

	// The dialog is only truly active when the URL matches AND the modal
	// slot rendered real content (not the null default).
	const isActive = hasModal && hasContent

	const shouldRenderFull = isMobile || isFullPage

	// When the modal slot becomes inactive, reset full-page state
	React.useEffect(() => {
		if (!isActive) {
			setIsFullPage(false)
		}
	}, [isActive])

	// On mobile, scroll to top when modal opens and restore position when it closes
	const savedScrollY = React.useRef(0)
	React.useEffect(() => {
		if (shouldRenderFull && isActive) {
			savedScrollY.current = window.scrollY
			window.scrollTo({ top: 0, behavior: "instant" })
		} else if (!isActive && savedScrollY.current !== 0) {
			window.scrollTo({ top: savedScrollY.current, behavior: "instant" })
			savedScrollY.current = 0
		}
	}, [shouldRenderFull, isActive])

	// Reset scroll to top on navigation between items (pathname changes while modal is open)
	const prevPathname = React.useRef(pathname)
	React.useEffect(() => {
		if (!isActive) {
			prevPathname.current = pathname
			return
		}
		if (pathname !== prevPathname.current) {
			prevPathname.current = pathname
			// Desktop: scroll the dialog content container
			if (dialogContentRef.current) {
				dialogContentRef.current.scrollTop = 0
			}
			// Mobile / full-page: scroll the window
			if (shouldRenderFull) {
				window.scrollTo({ top: 0, behavior: "instant" })
			}
		}
	}, [pathname, isActive, shouldRenderFull])

	React.useEffect(() => {
		if (shouldRenderFull && isActive) {
			document.body.classList.add("intercepted-mobile-open")
		} else {
			document.body.classList.remove("intercepted-mobile-open")
		}
		return () => {
			document.body.classList.remove("intercepted-mobile-open")
		}
	}, [shouldRenderFull, isActive])

	const onOpenChange = React.useCallback(
		(open: boolean) => {
			if (!open) {
				router.back()
			}
		},
		[router],
	)

	const handleSetFullPage = React.useCallback(() => {
		setIsFullPage(true)
	}, [])

	if (!isActive) {
		// Always render the hidden probe wrapper so we can detect when children
		// become non-empty (e.g. intercepted navigation while already on the page).
		return (
			<div ref={modalProbeRef} hidden>
				{children}
			</div>
		)
	}

	if (shouldRenderFull) {
		return (
			<>
				<div ref={modalProbeRef} hidden>
					{children}
				</div>
				<div className="w-full h-full pb-8">{children}</div>
			</>
		)
	}

	return (
		<>
			<div ref={modalProbeRef} hidden>
				{children}
			</div>
			<Dialog open={isActive} onOpenChange={onOpenChange}>
				<DialogContent
					ref={dialogContentRef}
					className="max-w-[95vw] w-full max-h-[95vh] h-full overflow-y-auto custom-scrollbar sm:max-w-7xl bg-background/70 backdrop-blur-sm"
				>
					<DialogTitle className="sr-only">
						<Text messageKey="uiViewItem" />
					</DialogTitle>
					<DialogDescription className="sr-only">
						<Text messageKey="uiItemDetails" />
					</DialogDescription>
					<div className="absolute left-4 top-4 z-50">
						<Button variant="outline" size="sm" onClick={handleSetFullPage}>
							<ExternalLink className="mr-1 h-4 w-4" />
							<Text messageKey="uiOpenFullPage" />
						</Button>
					</div>
					<div className="pt-10">{children}</div>
				</DialogContent>
			</Dialog>
		</>
	)
}
