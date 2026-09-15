import { NextRequest, NextResponse } from "next/server"
import { readdir } from "fs/promises"
import path from "path"

// This route is only available in non-static builds (requires file system access)
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
	const searchParams = request.nextUrl.searchParams
	const modelPath = searchParams.get("path")
	const modelType = searchParams.get("type") || "heroes"

	if (!modelPath) {
		return NextResponse.json({ error: "Model path is required" }, { status: 400 })
	}

	try {
		// Get the folder path (remove the filename)
		const folderPath = modelPath.substring(0, modelPath.lastIndexOf("/"))
		const fullPath = path.join(process.cwd(), "public", "kingsraid-models", "models", modelType, folderPath)

		// Read without blocking the event loop or making a separate existence check.
		const files = await readdir(fullPath)

		// Filter for model and texture files
		const modelFiles = files.filter((file) => {
			const ext = path.extname(file).toLowerCase()
			return [".fbx", ".png", ".jpg", ".jpeg", ".tga", ".dds"].includes(ext)
		})

		return NextResponse.json({ files: modelFiles })
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") {
			return NextResponse.json({ error: "Directory not found" }, { status: 404 })
		}
		console.error("Error listing model files:", error)
		return NextResponse.json({ error: "Failed to list files" }, { status: 500 })
	}
}
