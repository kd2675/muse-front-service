"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";

import { getContestDraft, saveContestDraft } from "../lib/contest";
import { createSerialQueue } from "../lib/serialQueue";

type Draft = { title: string; description: string };
const EMPTY: Draft = { title: "", description: "" };

export default function useContestDraft(id: number, enabled: boolean) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["contest", id, "draft"],
    queryFn: async () => {
      const result = await getContestDraft(id);
      if (result.error) throw new Error(result.error);
      return {
        title: result.data?.title ?? "",
        description: result.data?.description ?? "",
      };
    },
    enabled,
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
  const [local, setLocal] = useState<Draft | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [revision, setRevision] = useState(0);
  const [savedRevision, setSavedRevision] = useState(0);
  const queue = useRef(createSerialQueue());
  const paused = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const value = local ?? query.data ?? EMPTY;

  const save = useCallback(
    (snapshot: Draft, version: number) =>
      queue.current(async () => {
        setStatus("saving");
        try {
          const result = await saveContestDraft(id, snapshot);
          if (result.error || !result.data)
            throw new Error(result.error ?? "초안을 저장하지 못했습니다.");
          setSavedRevision(version);
          setStatus("saved");
        } catch (error) {
          setStatus("error");
          throw error;
        }
      }),
    [id],
  );

  useEffect(() => {
    if (
      !enabled ||
      !query.isSuccess ||
      !local ||
      paused.current ||
      revision === savedRevision
    )
      return;
    timer.current = setTimeout(() => {
      void save(local, revision).catch(() => undefined);
    }, 900);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [enabled, local, query.isSuccess, revision, save, savedRevision]);

  return {
    ...value,
    ready: enabled && query.isSuccess,
    error: query.error?.message,
    retry: () => query.refetch(),
    status,
    dirty: revision !== savedRevision,
    setTitle: (title: string) => {
      setLocal((previous) => ({ ...(previous ?? query.data ?? EMPTY), title }));
      setRevision((n) => n + 1);
    },
    setDescription: (description: string) => {
      setLocal((previous) => ({
        ...(previous ?? query.data ?? EMPTY),
        description,
      }));
      setRevision((n) => n + 1);
    },
    // Finish every draft write before submitting: the server deletes the draft on success.
    flushAndPause: async () => {
      paused.current = true;
      if (timer.current) clearTimeout(timer.current);
      await save(value, revision);
    },
    resume: () => {
      paused.current = false;
    },
    complete: () => {
      queryClient.setQueryData(["contest", id, "draft"], EMPTY);
      setLocal(null);
      setRevision(0);
      setSavedRevision(0);
      setStatus("idle");
      paused.current = false;
    },
    saveNow: () => save(value, revision),
  };
}
