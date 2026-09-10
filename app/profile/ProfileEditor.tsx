"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { updateProfile } from "../lib/profile";
import type { ProfileSummary } from "../types/profile";

export default function ProfileEditor({
  artist,
  onSaved,
}: {
  artist: ProfileSummary["artist"];
  onSaved: () => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(artist.id ? artist.name : "");
  const [tagline, setTagline] = useState(artist.id ? artist.tagline : "");
  const [profileColor, setProfileColor] = useState(
    artist.profileColor || "#2b2a28",
  );
  const [error, setError] = useState("");
  const mutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: (result) => {
      if (!result.data || result.error) {
        setError(result.error || "프로필을 저장하지 못했습니다.");
        return;
      }
      queryClient.setQueryData(["profile", "summary"], result);
      for (const key of [
        "artist",
        "gallery",
        "discovery",
        "home",
        "overview",
        "contest",
      ]) {
        void queryClient.invalidateQueries({ queryKey: [key] });
      }
      onSaved();
    },
    onError: () =>
      setError("프로필 저장에 실패했습니다. 입력한 내용은 유지됩니다."),
  });

  return (
    <form
      className="museum-panel mt-6 p-5"
      onSubmit={(event) => {
        event.preventDefault();
        setError("");
        mutation.mutate({
          name: name.trim(),
          tagline: tagline.trim(),
          profileColor,
        });
      }}
    >
      <fieldset disabled={mutation.isPending} className="space-y-4">
        <legend className="sr-only">공개 작가 프로필 편집</legend>
        <label className="block text-sm">
          작가 이름
          <input
            required
            maxLength={100}
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="museum-field mt-2 w-full px-3"
          />
        </label>
        <label className="block text-sm">
          작가 소개
          <textarea
            maxLength={255}
            value={tagline}
            onChange={(event) => setTagline(event.target.value)}
            className="museum-field mt-2 min-h-24 w-full p-3"
          />
        </label>
        <label className="flex items-center gap-4 text-sm">
          프로필 색상
          <input
            type="color"
            value={profileColor}
            onChange={(event) => setProfileColor(event.target.value)}
            className="h-11 w-16"
          />
        </label>
        <p className="text-xs text-[var(--muted)]">
          이름과 소개는 공개 작가 페이지와 전시에 표시됩니다.
        </p>
        {error ? (
          <p role="alert" className="text-sm text-[var(--danger)]">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={!name.trim() || mutation.isPending}
          className="museum-button-primary px-6 py-3 text-sm"
        >
          {mutation.isPending ? "저장 중" : "프로필 저장"}
        </button>
      </fieldset>
    </form>
  );
}
