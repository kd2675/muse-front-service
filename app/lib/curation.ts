import type { MyMuseum, MyMuseumArtwork } from "../types/museum";
import type { MuseumComposition } from "./museum";

export type CurationSettings = MuseumComposition["curation"];

export function curationSettings(museum: MyMuseum): CurationSettings {
  return {
    publishStatus:
      museum.publishStatus === "PUBLISHED" ||
      museum.publishStatus === "SCHEDULED"
        ? museum.publishStatus
        : "DRAFT",
    openingAt: museum.openingAt?.slice(0, 16) || null,
    curatorNote: museum.curatorNote ?? "",
    coverArtworkId: museum.coverArtworkId ?? null,
    layoutPreset:
      museum.layoutPreset === "LINEAR" || museum.layoutPreset === "IMMERSIVE"
        ? museum.layoutPreset
        : "SALON",
    lightingPreset:
      museum.lightingPreset === "NEUTRAL" ||
      museum.lightingPreset === "DRAMATIC"
        ? museum.lightingPreset
        : "WARM",
  };
}

export function compositionError(
  settings: CurationSettings,
  artworks: MyMuseumArtwork[],
  now = Date.now(),
): string | null {
  const visible = artworks.filter(
    (artwork) => artwork.moderationStatus === "VISIBLE",
  );
  if (settings.publishStatus !== "DRAFT" && !visible.length)
    return "공개하려면 심사를 통과한 작품이 한 점 이상 필요합니다. 초안으로 먼저 저장할 수 있습니다.";
  if (
    settings.publishStatus !== "DRAFT" &&
    settings.coverArtworkId &&
    !visible.some((item) => item.museumArtworkId === settings.coverArtworkId)
  )
    return "표지는 심사를 통과한 작품에서 선택해 주세요.";
  const openingTime = settings.openingAt
    ? new Date(`${settings.openingAt}+09:00`).getTime()
    : NaN;
  if (
    settings.publishStatus === "SCHEDULED" &&
    (!Number.isFinite(openingTime) || openingTime <= now)
  )
    return "예약 공개 시각을 한국 시간 기준으로 현재보다 늦게 설정해 주세요.";
  if (artworks.some((item) => !item.title.trim()))
    return "모든 작품의 제목을 입력해 주세요.";
  if (
    artworks.some(
      (item) =>
        item.audioUrl?.trim() &&
        (!item.audioUrl.startsWith("https://") ||
          !item.audioTranscript?.trim()),
    )
  )
    return "음성 해설에는 HTTPS 주소와 대본이 모두 필요합니다.";
  return null;
}

export function museumComposition(
  settings: CurationSettings,
  artworks: MyMuseumArtwork[],
): MuseumComposition {
  return {
    curation: {
      ...settings,
      openingAt:
        settings.publishStatus === "SCHEDULED" ? settings.openingAt : null,
    },
    artworks: artworks.map((item, sortOrder) => ({
      museumArtworkId: item.museumArtworkId,
      settings: {
        title: item.title.trim(),
        description: item.description || "",
        sortOrder,
        roomLabel: item.roomLabel || "",
        focalX: item.focalX,
        focalY: item.focalY,
        audioUrl: item.audioUrl || "",
        audioTranscript: item.audioTranscript || "",
        lightingPreset:
          item.lightingPreset === "NEUTRAL" ||
          item.lightingPreset === "DRAMATIC"
            ? item.lightingPreset
            : "WARM",
      },
    })),
  };
}
