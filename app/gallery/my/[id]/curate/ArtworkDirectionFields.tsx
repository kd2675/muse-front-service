import type { MyMuseumArtwork } from "../../../../types/museum";

export default function ArtworkDirectionFields({
  artwork,
  update,
}: {
  artwork: MyMuseumArtwork;
  update: (patch: Partial<MyMuseumArtwork>) => void;
}) {
  return (
    <section className="mt-8 space-y-4 border-t border-[var(--line)] pt-5">
      <h3 className="font-[var(--font-display)] text-xl">작품 설명과 해설</h3>
      <label className="block text-sm">
        작품 제목
        <input
          required
          maxLength={200}
          value={artwork.title}
          onChange={(event) => update({ title: event.target.value })}
          className="museum-field mt-2 px-3"
        />
      </label>
      <label className="block text-sm">
        작품 설명
        <textarea
          maxLength={2000}
          value={artwork.description || ""}
          onChange={(event) => update({ description: event.target.value })}
          className="museum-field mt-2 min-h-24 p-3"
        />
      </label>
      <label className="block text-sm">
        전시실 이름
        <input
          maxLength={80}
          value={artwork.roomLabel || ""}
          onChange={(event) => update({ roomLabel: event.target.value })}
          className="museum-field mt-2 px-3"
        />
      </label>
      <label className="block text-sm">
        음성 해설 주소
        <input
          type="url"
          maxLength={500}
          value={artwork.audioUrl || ""}
          onChange={(event) => update({ audioUrl: event.target.value })}
          className="museum-field mt-2 px-3"
          placeholder="https://"
        />
      </label>
      <label className="block text-sm">
        음성 해설 대본
        <textarea
          maxLength={4000}
          value={artwork.audioTranscript || ""}
          onChange={(event) => update({ audioTranscript: event.target.value })}
          className="museum-field mt-2 min-h-24 p-3"
        />
      </label>
      <p className="text-xs leading-6 text-[var(--muted)]">
        음성 해설에는 소리를 들을 수 없는 관람객을 위한 대본을 함께 작성하세요.
      </p>
      <label className="block text-sm">
        작품 조명
        <select
          value={artwork.lightingPreset}
          onChange={(event) => update({ lightingPreset: event.target.value })}
          className="museum-field mt-2 px-3"
        >
          <option value="WARM">따뜻한 조명</option>
          <option value="NEUTRAL">중립 조명</option>
          <option value="DRAMATIC">집중 조명</option>
        </select>
      </label>
      <label className="block text-sm">
        가로 초점 · {artwork.focalX}%
        <input
          type="range"
          min="0"
          max="100"
          value={artwork.focalX}
          onChange={(event) => update({ focalX: Number(event.target.value) })}
          className="mt-2 w-full"
        />
      </label>
      <label className="block text-sm">
        세로 초점 · {artwork.focalY}%
        <input
          type="range"
          min="0"
          max="100"
          value={artwork.focalY}
          onChange={(event) => update({ focalY: Number(event.target.value) })}
          className="mt-2 w-full"
        />
      </label>
      <p className="text-xs leading-6 text-[var(--muted)]">
        초점 위치는 몰입형 화면의 이미지 배치에 적용됩니다.
      </p>
    </section>
  );
}
