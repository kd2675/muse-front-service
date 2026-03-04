"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Swiper, SwiperSlide } from "swiper/react";
import { setPendingPath, showToast } from "../store/uiSlice";
import { useAppDispatch } from "../store/hooks";
import {
  getContestEntries,
  getContestList,
  purchaseEntryCredit,
} from "../lib/contest";
import { getAccessToken } from "../lib/auth";
import { useBodyScrollLock } from "../lib/useBodyScrollLock";
import {
  overlayFadeMotion,
  popInMotion,
  staggeredFadeUpMotion,
} from "../lib/motion";
import {
  contestPhaseOrder,
  getContestPhaseLabel,
  getContestPhaseTone,
} from "../lib/statusTheme";
import CinematicBottomNav from "../components/CinematicBottomNav";
import OverviewStyleHeader from "../components/OverviewStyleHeader";
import type { ContestSummary } from "../types/contest";

const livePalettes = [
  "linear-gradient(150deg, rgba(16,26,38,0.86), rgba(46,76,102,0.72)), radial-gradient(circle at 78% 18%, rgba(188,217,238,0.35), transparent 48%)",
  "linear-gradient(160deg, rgba(25,20,34,0.88), rgba(65,56,104,0.72)), radial-gradient(circle at 84% 22%, rgba(219,193,248,0.32), transparent 52%)",
  "linear-gradient(160deg, rgba(19,29,29,0.9), rgba(37,87,79,0.72)), radial-gradient(circle at 80% 20%, rgba(174,238,212,0.3), transparent 52%)",
];

function formatNumber(value: number) {
  return value.toLocaleString("ko-KR");
}

function contestHref(id: number) {
  return `/contest/${id}?tab=contest`;
}

function archiveStamp(contest: ContestSummary) {
  const source = contest.votingEndAt ?? contest.submissionEndAt;
  if (!source) {
    return "ARCHIVE";
  }
  const date = new Date(source);
  if (Number.isNaN(date.getTime())) {
    return "ARCHIVE";
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}.${month}`;
}

function formatDate(raw?: string | null) {
  if (!raw) {
    return "-";
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return raw;
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
}

function deadlineText(contest: ContestSummary) {
  if (contest.phase === "VOTING") {
    return "전시 진행 중";
  }
  if (contest.daysLeft > 0) {
    return `D-${contest.daysLeft}`;
  }
  return "일정 확인";
}

export default function ContestClient() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [paymentStep, setPaymentStep] = useState<
    "closed" | "payment" | "confirm"
  >("closed");
  const [selectedContestId, setSelectedContestId] = useState<number | null>(
    null,
  );
  const [paymentMethod, setPaymentMethod] = useState("card");
  const prefersReducedMotion = useReducedMotion();
  const reduceMotion = Boolean(prefersReducedMotion);
  useBodyScrollLock(paymentStep !== "closed");


  const { data, isLoading } = useQuery({
    queryKey: ["contests"],
    queryFn: getContestList,
  });

  const contests = useMemo(() => data?.data ?? [], [data?.data]);
  const sortedContests = useMemo(
    () =>
      [...contests].sort((a, b) => {
        const phaseDiff = contestPhaseOrder[a.phase] - contestPhaseOrder[b.phase];
        if (phaseDiff !== 0) {
          return phaseDiff;
        }
        return b.id - a.id;
      }),
    [contests],
  );
  const error = data?.error;

  const liveContests = useMemo(
    () => sortedContests.filter((contest) => contest.phase === "VOTING"),
    [sortedContests],
  );
  const submissionContests = useMemo(
    () => sortedContests.filter((contest) => contest.phase === "SUBMISSION"),
    [sortedContests],
  );
  const queueContests = useMemo(
    () =>
      sortedContests.filter(
        (contest) => contest.phase === "REVIEW" || contest.phase === "UPCOMING",
      ),
    [sortedContests],
  );
  const endedContests = useMemo(
    () => sortedContests.filter((contest) => contest.phase === "ENDED"),
    [sortedContests],
  );
  const liveEntryQueries = useQueries({
    queries: liveContests.map((contest) => ({
      queryKey: ["contest", contest.id, "entries", "bg"],
      queryFn: () => getContestEntries(contest.id),
      staleTime: 30_000,
    })),
  });

  const selectedContest = useMemo(
    () => sortedContests.find((contest) => contest.id === selectedContestId) ?? null,
    [selectedContestId, sortedContests],
  );
  const liveBackgroundByContestId = useMemo(() => {
    const mapping: Record<number, string> = {};
    liveContests.forEach((contest, index) => {
      const entries = liveEntryQueries[index]?.data?.data ?? [];
      const imageCandidates = entries
        .map((entry) => entry.imageUrl)
        .filter((imageUrl): imageUrl is string => Boolean(imageUrl));
      if (imageCandidates.length === 0) {
        return;
      }
      const seedSource = `${contest.id}:${imageCandidates.join("|")}`;
      let hash = 0;
      for (let charIndex = 0; charIndex < seedSource.length; charIndex += 1) {
        hash = (hash * 31 + seedSource.charCodeAt(charIndex)) | 0;
      }
      const pickIndex = Math.abs(hash) % imageCandidates.length;
      mapping[contest.id] = imageCandidates[pickIndex];
    });
    return mapping;
  }, [liveContests, liveEntryQueries]);

  const openPayment = (contestId?: number) => {
    if (!getAccessToken()) {
      dispatch(setPendingPath("/contest?tab=contest"));
      dispatch(showToast("로그인 후 결제할 수 있습니다."));
      router.push("/login");
      return;
    }
    const candidate =
      submissionContests.find((contest) => contest.id === contestId) ??
      submissionContests[0];
    if (!candidate) {
      dispatch(showToast("출품 가능한 콘테스트가 없습니다."));
      return;
    }
    setSelectedContestId(candidate.id);
    setPaymentMethod("card");
    setPaymentStep("payment");
  };

  const onPressEnterOrSpace = (
    event: React.KeyboardEvent<HTMLElement>,
    action: () => void,
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      action();
    }
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#121212] text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_12%,rgba(84,90,111,0.22),transparent_34%),radial-gradient(circle_at_84%_18%,rgba(73,108,115,0.18),transparent_36%),radial-gradient(circle_at_52%_82%,rgba(120,86,64,0.14),transparent_38%)]" />

      <main className="relative mx-auto flex min-h-screen w-full max-w-[1120px] flex-col px-6 pb-44 pt-10 md:px-8">
        <motion.div className="mb-8" {...staggeredFadeUpMotion(0, reduceMotion)}>
          <OverviewStyleHeader title="The Contest" />
        </motion.div>

        {isLoading ? (
          <section className="space-y-10">
            <div className="h-[360px] animate-pulse  bg-white/10" />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="h-52 animate-pulse  bg-white/10" />
              <div className="h-52 animate-pulse  bg-white/10" />
            </div>
            <div className="h-80 animate-pulse  bg-white/10" />
          </section>
        ) : (
          <div className="space-y-14">
            {error && (
              <div className="border border-rose-300/38 bg-rose-300/18 px-5 py-4 text-sm text-rose-50">
                콘테스트 데이터를 불러오지 못했습니다. {error}
              </div>
            )}

            <motion.section
              className="space-y-6 border-t border-white/16 pt-6"
              {...staggeredFadeUpMotion(1, reduceMotion)}
            >
              <div className="flex items-end justify-between">
                <h2 className="font-[var(--font-display)] text-3xl italic text-slate-100">
                  Exhibiting
                  <span
                    className={`ml-3 border px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] ${
                      getContestPhaseTone("VOTING").chipClass
                    }`}
                  >
                    {getContestPhaseLabel("VOTING")}
                  </span>
                </h2>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Live Gallery
                </p>
              </div>

              {liveContests.length > 0 ? (
                <div className="overflow-hidden border border-white/16 bg-white/[0.03]">
                  <Swiper
                    className="w-full"
                    spaceBetween={16}
                    slidesPerView={1}
                    breakpoints={{
                      1024: { slidesPerView: 1 },
                    }}
                  >
                    {liveContests.map((contest, index) => (
                      <SwiperSlide key={contest.id} className="!h-auto">
                      {(() => {
                        const liveBackground = liveBackgroundByContestId[contest.id];
                        const hasArtworkBackground = Boolean(liveBackground);
                        const backgroundStyle = hasArtworkBackground
                          ? {
                              backgroundImage: `url(${liveBackground})`,
                              backgroundSize: "cover",
                              backgroundPosition: "center",
                            }
                          : {
                              background:
                                livePalettes[(contest.id + index) % livePalettes.length],
                            };
                        return (
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => router.push(contestHref(contest.id))}
                        onKeyDown={(event) =>
                          onPressEnterOrSpace(event, () =>
                            router.push(contestHref(contest.id))
                          )}
                        className="group relative block h-[420px] overflow-hidden "
                        style={backgroundStyle}
                      >
                        <div className="absolute inset-[2px]  bg-[linear-gradient(0deg,rgba(10,11,15,0.9)_0%,rgba(10,11,15,0.26)_58%,rgba(10,11,15,0.1)_100%)]" />
                        <div className="absolute right-6 bottom-6 left-6">
                          <div className="mb-3 flex items-center gap-2">
                            <span className="h-1.5 w-1.5  bg-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
                            <span className="text-[10px] uppercase tracking-[0.22em] text-emerald-100/90">
                              Live Now
                            </span>
                          </div>
                          <h3 className="font-[var(--font-display)] text-4xl leading-[1.08] text-white transition group-hover:translate-y-[-2px]">
                            {contest.theme}
                          </h3>
                          <div className="mt-4 h-px w-10 bg-white/55" />
                          <p className="mt-3 text-xs uppercase tracking-[0.18em] text-white/82">
                            {contest.period}
                          </p>
                        </div>
                      </div>
                        );
                      })()}
                      </SwiperSlide>
                    ))}
                  </Swiper>
                </div>
              ) : (
                <div className=" bg-white/10 px-5 py-8 text-sm text-slate-200/88">
                  현재 전시 중인 콘테스트가 없습니다.
                </div>
              )}
            </motion.section>

            <motion.section
              className="border border-white/16 bg-[rgba(40,40,46,0.66)] p-7 backdrop-blur-md md:p-9"
              {...staggeredFadeUpMotion(2, reduceMotion)}
            >
              <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-white/12 pb-4">
                <h2 className="font-[var(--font-display)] text-3xl italic text-slate-100">
                  Submission Open
                  <span
                    className={`ml-3 border px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] ${
                      getContestPhaseTone("SUBMISSION").chipClass
                    }`}
                  >
                    {getContestPhaseLabel("SUBMISSION")}
                  </span>
                </h2>
                <button
                  type="button"
                  onClick={() => openPayment()}
                  className="border border-cyan-300/30 bg-cyan-300/16 px-4 py-2 text-xs uppercase tracking-[0.14em] font-semibold text-cyan-100 transition hover:bg-cyan-300/24"
                >
                  출품권 결제
                </button>
              </div>

              {submissionContests.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {submissionContests.map((contest, index) => (
                    <motion.article
                      key={contest.id}
                      {...staggeredFadeUpMotion(index + 3, reduceMotion)}
                      className="border border-cyan-200/20 bg-[linear-gradient(160deg,rgba(20,62,78,0.88)_0%,rgba(27,73,92,0.72)_100%)] p-6"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span
                          className={` border px-3 py-1 text-[11px] ${
                            getContestPhaseTone("SUBMISSION").chipClass
                          }`}
                        >
                          {getContestPhaseLabel("SUBMISSION")}
                        </span>
                        <span className="text-xs text-cyan-100/80">
                          {deadlineText(contest)}
                        </span>
                      </div>
                      <h3 className="mt-3 font-[var(--font-display)] text-3xl leading-tight text-cyan-50">
                        {contest.theme}
                      </h3>
                      <p className="mt-2 text-xs uppercase tracking-[0.16em] text-cyan-100/74">
                        {contest.period}
                      </p>
                      <div className="mt-5 grid grid-cols-2 gap-2 text-xs text-cyan-100/86">
                        <span className=" bg-cyan-300/24 px-3 py-1.5">
                          참가비 {formatNumber(contest.entryFee)}원
                        </span>
                        <span className=" bg-cyan-300/24 px-3 py-1.5">
                          상금풀 {formatNumber(contest.prizePool)}원
                        </span>
                      </div>
                      <div className="mt-6 grid grid-cols-2 gap-2">
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => router.push(contestHref(contest.id))}
                          onKeyDown={(event) =>
                            onPressEnterOrSpace(event, () =>
                              router.push(contestHref(contest.id))
                            )}
                          className=" bg-white/16 px-3 py-2 text-center text-xs text-cyan-50 transition hover:bg-white/24"
                        >
                          상세 보기
                        </div>
                        <button
                          type="button"
                          onClick={() => openPayment(contest.id)}
                          className=" bg-cyan-300/28 px-3 py-2 text-xs text-cyan-50 transition hover:bg-cyan-300/40"
                        >
                          출품권 결제
                        </button>
                      </div>
                    </motion.article>
                  ))}
                </div>
              ) : (
                <div className=" bg-white/10 px-4 py-6 text-sm text-slate-200/88">
                  현재 출품 가능한 콘테스트가 없습니다.
                </div>
              )}
            </motion.section>

            <motion.section
              className="border border-white/16 bg-[rgba(40,40,46,0.66)] p-7 backdrop-blur-md md:p-9"
              {...staggeredFadeUpMotion(3, reduceMotion)}
            >
              <div className="mb-6 flex items-end justify-between border-b border-white/12 pb-4">
                <h2 className="font-[var(--font-display)] text-3xl italic text-slate-100">
                  Review & Queue
                  <span
                    className={`ml-3 border px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] ${
                      getContestPhaseTone("REVIEW").chipClass
                    }`}
                  >
                    심사 · 대기
                  </span>
                </h2>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Curator Desk
                </p>
              </div>

              {queueContests.length > 0 ? (
                <div className="space-y-3">
                  {queueContests.map((contest, index) => {
                    const tone = getContestPhaseTone(contest.phase);
                    return (
                      <motion.div
                        key={contest.id}
                        {...staggeredFadeUpMotion(index + 4, reduceMotion)}
                        className="group grid gap-3  bg-white/[0.06] px-4 py-4 transition hover:bg-white/[0.1] md:grid-cols-[1fr_auto]"
                      >
                        <div>
                          <div className="mb-2 flex items-center gap-2">
                            <span className={`h-1.5 w-1.5  ${tone.dotClass}`} />
                            <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                              {getContestPhaseLabel(contest.phase)}
                            </span>
                          </div>
                          <h3 className="font-[var(--font-display)] text-2xl text-slate-200 transition group-hover:text-white">
                            {contest.theme}
                          </h3>
                          <p className="mt-2 text-xs text-slate-400">{contest.period}</p>
                          <p className="mt-2 text-xs text-slate-500">
                            출품 시작 {formatDate(contest.submissionStartAt)} · 전시 시작{" "}
                            {formatDate(contest.votingStartAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={` border px-3 py-1 text-[11px] ${tone.chipClass}`}>
                            {contest.phase === "REVIEW" ? "심사 큐 운영" : "오픈 대기"}
                          </span>
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => router.push(contestHref(contest.id))}
                            onKeyDown={(event) =>
                              onPressEnterOrSpace(event, () =>
                                router.push(contestHref(contest.id))
                              )}
                            className=" bg-white/16 px-3 py-1 text-xs text-slate-100 transition hover:bg-white/24"
                          >
                            상세 보기
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className=" bg-white/10 px-4 py-6 text-sm text-slate-200/88">
                  심사 중 또는 대기 중인 콘테스트가 없습니다.
                </div>
              )}
            </motion.section>

            <motion.section
              className="border border-white/16 bg-[rgba(40,40,46,0.66)] p-7 backdrop-blur-md md:p-9"
              {...staggeredFadeUpMotion(4, reduceMotion)}
            >
              <div className="mb-6 flex items-end justify-between border-b border-white/12 pb-4">
                <h2 className="font-[var(--font-display)] text-3xl italic text-slate-100">
                  Ended
                  <span
                    className={`ml-3 border px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] ${
                      getContestPhaseTone("ENDED").chipClass
                    }`}
                  >
                    {getContestPhaseLabel("ENDED")}
                  </span>
                </h2>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Archive
                </p>
              </div>

              {endedContests.length > 0 ? (
                <div className="space-y-1">
                  {endedContests.map((contest, index) => (
                    <motion.div
                      key={contest.id}
                      {...staggeredFadeUpMotion(index + 5, reduceMotion)}
                      className="group flex items-baseline justify-between gap-4  bg-white/[0.05] px-3 py-3 transition hover:bg-white/[0.1]"
                    >
                      <div className="flex min-w-0 items-baseline gap-5">
                        <span className="w-14 shrink-0 text-xs text-slate-400">
                          {archiveStamp(contest)}
                        </span>
                        <h4 className="truncate font-[var(--font-display)] text-xl text-slate-300 transition group-hover:text-white">
                          {contest.theme}
                        </h4>
                      </div>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => router.push(contestHref(contest.id))}
                        onKeyDown={(event) =>
                          onPressEnterOrSpace(event, () =>
                            router.push(contestHref(contest.id))
                          )}
                        className=" bg-white/16 px-3 py-1 text-[11px] text-slate-100 transition hover:bg-white/24"
                      >
                        보기
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className=" bg-white/10 px-4 py-6 text-sm text-slate-200/88">
                  종료된 콘테스트가 없습니다.
                </div>
              )}
            </motion.section>

            <p className="pb-3 text-center text-[11px] uppercase tracking-[0.24em] text-slate-600">
              Artium Contest Collection
            </p>
          </div>
        )}
      </main>

      <CinematicBottomNav activeTab="contest" layout="fixed" />

      <AnimatePresence>
        {paymentStep !== "closed" && (
          <motion.div
            {...overlayFadeMotion(reduceMotion)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          >
            <motion.div
              {...popInMotion(reduceMotion)}
              className="w-full max-w-lg border border-white/16 bg-[rgba(15,15,18,0.96)] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
            >
              {paymentStep === "payment" && (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.32em] text-cyan-200/80">
                        Test Payment
                      </p>
                      <h2 className="mt-2 font-[var(--font-display)] text-3xl text-slate-100">
                        출품권 결제
                      </h2>
                      <p className="mt-2 text-sm text-slate-300/74">
                        현재는 테스트 결제 UI입니다. 실제 청구는 발생하지 않습니다.
                      </p>
                    </div>
                    <button
                      className="   px-3 py-1 text-xs text-slate-300 transition hover:bg-white/10"
                      onClick={() => setPaymentStep("closed")}
                    >
                      닫기
                    </button>
                  </div>

                  <div className="mt-6 grid gap-4">
                    <label className="text-xs uppercase tracking-[0.26em] text-slate-500">
                      Contest
                    </label>
                    <select
                      value={selectedContestId ?? undefined}
                      onChange={(event) => setSelectedContestId(Number(event.target.value))}
                      className="h-11    bg-black/25 px-4 text-sm text-slate-100  focus:outline-none"
                    >
                      {submissionContests.map((contest) => (
                        <option key={contest.id} value={contest.id}>
                          {contest.theme}
                        </option>
                      ))}
                    </select>

                    <div className="   bg-white/6 px-4 py-3 text-sm text-slate-200">
                      참가비{" "}
                      <strong>
                        {selectedContest ? formatNumber(selectedContest.entryFee) : 0}원
                      </strong>
                    </div>

                    <div className="grid gap-2">
                      <p className="text-xs uppercase tracking-[0.26em] text-slate-500">
                        Payment Method
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { id: "card", label: "카드 결제" },
                          { id: "account", label: "계좌 이체" },
                          { id: "simple", label: "간편 결제" },
                        ].map((method) => (
                          <button
                            key={method.id}
                            type="button"
                            className={`  px-4 py-2 text-xs transition ${
                              paymentMethod === method.id
                                ? "bg-cyan-300/18 text-cyan-100"
                                : "bg-transparent text-slate-300 hover:bg-white/10"
                            }`}
                            onClick={() => setPaymentMethod(method.id)}
                          >
                            {method.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <button
                      className="   bg-cyan-300/20 px-4 py-3 text-sm text-cyan-100 transition hover:bg-cyan-300/30"
                      onClick={() => setPaymentStep("confirm")}
                    >
                      테스트 결제 진행
                    </button>
                    <button
                      className="   bg-transparent px-4 py-3 text-sm text-slate-300 transition hover:bg-white/10"
                      onClick={() => setPaymentStep("closed")}
                    >
                      취소
                    </button>
                  </div>
                </>
              )}

              {paymentStep === "confirm" && (
                <>
                  <p className="text-xs uppercase tracking-[0.32em] text-cyan-200/80">
                    Payment Complete
                  </p>
                  <h2 className="mt-3 font-[var(--font-display)] text-3xl text-slate-100">
                    결제가 완료되었습니다.
                  </h2>
                  <p className="mt-2 text-sm text-slate-300/74">
                    테스트 결제이므로 실제 결제는 진행되지 않습니다.
                  </p>
                  <div className="mt-6    bg-white/6 px-4 py-3 text-sm text-slate-200">
                    {selectedContest?.theme ?? "선택된 콘테스트"} 출품권 구매가 완료되었습니다.
                  </div>
                  <button
                    className="mt-6 w-full    bg-cyan-300/20 px-5 py-3 text-sm text-cyan-100 transition hover:bg-cyan-300/30 disabled:opacity-60"
                    disabled={!selectedContest?.id}
                    onClick={async () => {
                      if (!selectedContest?.id) {
                        return;
                      }
                      const result = await purchaseEntryCredit(selectedContest.id);
                      if (result.error) {
                        dispatch(showToast(`결제 처리에 실패했습니다. (${result.error})`));
                        return;
                      }
                      setPaymentStep("closed");
                      router.push(contestHref(selectedContest.id));
                    }}
                  >
                    확인
                  </button>
                  {selectedContest?.id && (
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => router.push(contestHref(selectedContest.id))}
                      onKeyDown={(event) =>
                        onPressEnterOrSpace(event, () =>
                          router.push(contestHref(selectedContest.id))
                        )}
                      className="mt-3 block text-center text-xs text-cyan-100/86 hover:underline"
                    >
                      바로 출품하러 가기
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
