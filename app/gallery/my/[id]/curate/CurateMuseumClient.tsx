"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import OverviewStyleHeader from "../../../../components/OverviewStyleHeader";
import QueryState from "../../../../components/QueryState";
import { getMyMuseumArtworks, getMyMuseums } from "../../../../lib/museum";
import CurationEditor from "./CurationEditor";

export default function CurateMuseumClient({ museumId }: { museumId: number }) {
  const museums = useQuery({
    queryKey: ["my", "museums"],
    queryFn: async () => {
      const result = await getMyMuseums();
      if (result.error) throw new Error(result.error);
      return result;
    },
  });
  const artworks = useQuery({
    queryKey: ["my", "museums", museumId, "artworks"],
    queryFn: async () => {
      const result = await getMyMuseumArtworks(museumId);
      if (result.error) throw new Error(result.error);
      return result;
    },
  });
  const museum = museums.data?.data.find((item) => item.museumId === museumId);
  const failed =
    museums.data?.error ||
    artworks.data?.error ||
    museums.isError ||
    artworks.isError;
  const retry = () => {
    void museums.refetch();
    void artworks.refetch();
  };
  if (museum && artworks.data)
    return (
      <CurationEditor
        key={museumId}
        museum={museum}
        artworks={artworks.data.data}
      />
    );
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto min-h-dvh max-w-6xl px-5 pb-20 md:px-10"
    >
      <OverviewStyleHeader
        title="큐레이션 스튜디오"
        subtitle="전시 구성"
        rightSlot={<Link href="/gallery/my">전시 관리로 돌아가기</Link>}
      />
      {museums.isPending || artworks.isPending ? (
        <QueryState kind="loading" title="전시와 작품을 불러오고 있습니다" />
      ) : failed ? (
        <QueryState
          kind="error"
          title="편집할 전시를 불러오지 못했습니다"
          description="전시와 작품을 다시 확인해 주세요."
          retry={retry}
          retrying={museums.isFetching || artworks.isFetching}
        />
      ) : (
        <QueryState
          title="이 전시를 찾을 수 없습니다"
          action={{ href: "/gallery/my", label: "나의 전시 목록" }}
        />
      )}
    </main>
  );
}
