import { Text } from "@/components/i18n/language-provider"
import { Badge } from "@/components/ui/badge"
import { getArtifactEffectTags } from "@/lib/artifact-tags"
import type { ArtifactData } from "@/model/Artifact"

export function ArtifactEffectBadges({ artifact }: { artifact: Pick<ArtifactData, "id"> }) {
	return (
		<div className="flex flex-wrap gap-2" aria-label="Artifact effects">
			{getArtifactEffectTags(artifact).map((tag) => (
				<Badge key={tag} variant="secondary">
					<Text>{tag}</Text>
				</Badge>
			))}
		</div>
	)
}
