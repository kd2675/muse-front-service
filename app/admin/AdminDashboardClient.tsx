"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import AdminShell from "../components/AdminShell";
import QueryState from "../components/QueryState";
import { getAdminContestList } from "../lib/contest";
import { getAdminMuseums } from "../lib/museum";
import { adminContestReviewRoute } from "../lib/router";
import { getContestPhaseLabel } from "../lib/statusTheme";

export default function AdminDashboardClient() {
  const contests = useQuery({
    queryKey: ["admin", "contests"],
    queryFn: getAdminContestList,
  });
  const museums = useQuery({
    queryKey: ["admin", "gallery", "museums"],
    queryFn: getAdminMuseums,
  });
  const programs = contests.data?.data ?? [];
  const rooms = museums.data?.data ?? [];
  const reviewPrograms = programs.filter((item) => item.phase === "REVIEW");
  const endedPrograms = programs.filter(
    (item) => item.phase === "ENDED" && !item.finalized,
  );
  const reviewingRooms = rooms.filter((item) => item.reviewingArtworkCount > 0);
  const error =
    contests.data?.error ||
    museums.data?.error ||
    contests.isError ||
    museums.isError;
  const retry = () => {
    void contests.refetch();
    void museums.refetch();
  };

  return (
    <AdminShell
      section="dashboard"
      title="운영 현황"
      description="접수부터 심사, 결과 확정과 전시 공개까지 지금 필요한 작업을 확인합니다."
    >
      {contests.isPending || museums.isPending ? (
        <QueryState kind="loading" title="운영 현황을 불러오고 있습니다" />
      ) : error ? (
        <QueryState
          kind="error"
          title="운영 현황을 확인하지 못했습니다"
          description="연결을 확인한 뒤 다시 시도해 주세요."
          retry={retry}
          retrying={contests.isFetching || museums.isFetching}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "접수 중인 공모전",
                value: programs.filter((item) => item.phase === "SUBMISSION")
                  .length,
                href: "/admin/contests",
              },
              {
                label: "심사 기간 내 미검토 출품",
                value: reviewPrograms.reduce(
                  (sum, item) => sum + item.pendingReviewCount,
                  0,
                ),
                href: "/admin/contests/review",
              },
              {
                label: "결과 확정 대기 공모전",
                value: endedPrograms.length,
                href: "/admin/contests",
              },
              {
                label: "전시 작품 심사 대기",
                value: rooms.reduce(
                  (sum, item) => sum + item.reviewingArtworkCount,
                  0,
                ),
                href: "/admin/gallery",
              },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="museum-panel p-6 hover:border-[var(--accent)]"
              >
                <span className="block text-sm text-[var(--muted)]">
                  {item.label}
                </span>
                <strong className="mt-4 block font-[var(--font-display)] text-4xl">
                  {item.value.toLocaleString("ko-KR")}
                  <span
                    aria-hidden="true"
                    className="float-right text-2xl text-[var(--accent)]"
                  >
                    ↗
                  </span>
                </strong>
              </Link>
            ))}
          </div>
          <div className="mt-10 grid gap-10 lg:grid-cols-2">
            <section>
              <h2 className="border-b border-[var(--line)] pb-4 font-[var(--font-display)] text-2xl">
                공모전에서 할 일
              </h2>
              {reviewPrograms.length + endedPrograms.length ? (
                <div className="divide-y divide-[var(--line)]">
                  {[...reviewPrograms, ...endedPrograms].map((item) => (
                    <Link
                      key={item.id}
                      href={
                        item.phase === "REVIEW"
                          ? adminContestReviewRoute(item.id)
                          : `/admin/contests?contestId=${item.id}`
                      }
                      className="flex items-center justify-between gap-5 py-5"
                    >
                      <span>
                        <span className="block text-xs text-[var(--accent)]">
                          {getContestPhaseLabel(item.phase)}
                        </span>
                        <strong className="mt-2 block text-lg">
                          {item.theme}
                        </strong>
                        <span className="mt-1 block text-xs text-[var(--muted)]">
                          {item.phase === "REVIEW"
                            ? `미검토 ${item.pendingReviewCount}점 · 심사 마감 ${item.votingStartAt?.slice(0, 16).replace("T", " ") || "일정 확인 필요"}`
                            : "승인작의 수상 결과를 확정해 주세요."}
                        </span>
                      </span>
                      <span aria-hidden="true">→</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <QueryState
                  title="현재 대기 중인 심사·확정 작업이 없습니다"
                  action={{
                    href: "/admin/contests",
                    label: "공모전 일정 관리",
                  }}
                />
              )}
            </section>
            <section>
              <h2 className="border-b border-[var(--line)] pb-4 font-[var(--font-display)] text-2xl">
                전시 심사 대기
              </h2>
              {reviewingRooms.length ? (
                <div className="divide-y divide-[var(--line)]">
                  {reviewingRooms.map((item) => (
                    <Link
                      key={item.museumId}
                      href={`/admin/gallery?museumId=${item.museumId}`}
                      className="flex items-center justify-between gap-5 py-5"
                    >
                      <span>
                        <strong className="block text-lg">{item.name}</strong>
                        <span className="mt-2 block text-xs text-[var(--muted)]">
                          {item.ownerName} · 검토할 작품{" "}
                          {item.reviewingArtworkCount}점
                        </span>
                      </span>
                      <span aria-hidden="true">→</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <QueryState
                  title="검토를 기다리는 전시 작품이 없습니다"
                  action={{ href: "/admin/gallery", label: "전체 전시 관리" }}
                />
              )}
            </section>
          </div>
          <section className="mt-8 border-t border-[var(--line)] pt-6 text-sm leading-7 text-[var(--muted)]">
            <h2 className="font-semibold text-[var(--canvas-ink)]">
              운영 순서
            </h2>
            <p>
              공모전 일정 등록 → 접수 종료 후 작품 심사 → 관객 투표 → 결과 확정.
              전시 작품은 공개 심사를 거친 뒤 작가가 전시를 공개합니다.
            </p>
            <p className="mt-2">
              결과 확정 후에는 공모전 내용을 수정할 수 없습니다. 미수상 여부는
              작품의 심사 승인 상태에 영향을 주지 않습니다.
            </p>
          </section>
        </>
      )}
    </AdminShell>
  );
}
