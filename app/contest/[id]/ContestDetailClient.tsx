"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PageShell from "../../components/PageShell";
import TopNav from "../../components/TopNav";
import { Skeleton, SkeletonText } from "../../components/Skeleton";
import {
  getContestDetail,
  getMyEntryCredits,
  purchaseEntryCredit,
  submitContestEntry,
} from "../../lib/contest";
import { uploadImage, type ImageUploadResult } from "../../lib/imageUpload";
import { getAccessToken } from "../../lib/auth";
import { useAppDispatch } from "../../store/hooks";
import { showToast } from "../../store/uiSlice";

type ContestDetailClientProps = {
  id: number;
};

const formatNumber = (value: number) => value.toLocaleString("ko-KR");

export default function ContestDetailClient({ id }: ContestDetailClientProps) {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState<
    "idle" | "uploading" | "saving" | "done"
  >("idle");
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [creditsOverride, setCreditsOverride] = useState<number | null>(null);
  const [paymentStep, setPaymentStep] = useState<
    "closed" | "payment" | "processing" | "confirm"
  >("closed");
  const [paymentMethod, setPaymentMethod] = useState("card");
  const { data, isLoading } = useQuery({
    queryKey: ["contest", id],
    queryFn: () => getContestDetail(id),
  });
  const [hasToken, setHasToken] = useState(false);
  useEffect(() => {
    setHasToken(Boolean(getAccessToken()));
  }, []);
  useEffect(() => {
    setCreditsOverride(null);
  }, [id]);
  const { data: creditData } = useQuery({
    queryKey: ["contest", id, "entryCredits"],
    queryFn: () => getMyEntryCredits(id),
    enabled: hasToken,
  });

  const purchaseMutation = useMutation({
    mutationFn: () => purchaseEntryCredit(id),
    onSuccess: (result) => {
      if (!result.error) {
        setCreditsOverride(result.data.credits);
        queryClient.invalidateQueries({
          queryKey: ["contest", id, "entryCredits"],
        });
        setPaymentStep("confirm");
      } else {
        setPaymentStep("payment");
      }
      dispatch(
        showToast(
          result.error
            ? `결제 요청은 되었지만 오류가 있습니다. (${result.error})`
            : "출품권 결제가 완료되었습니다.",
        ),
      );
    },
    onError: () => {
      setPaymentStep("payment");
      dispatch(showToast("출품권 결제에 실패했습니다."));
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) {
        throw new Error("파일을 선택해주세요.");
      }
      setUploadStage("uploading");
      setUploadProgress(0);
      const uploadResult = await uploadImage(file, {
        onProgress: (percent) => setUploadProgress(percent),
      });
      if (!uploadResult.imageUrl) {
        throw new Error(resolveUploadError(uploadResult));
      }
      setUploadedImageUrl(uploadResult.imageUrl);
      setUploadStage("saving");
      return submitContestEntry(id, {
        title,
        description,
        fileName: file.name,
        imageUrl: uploadResult.imageUrl,
      });
    },
    onMutate: () => {
      setUploadError(null);
      setUploadStage("uploading");
    },
    onSuccess: (result) => {
      setUploadStage("done");
      if (!result.error) {
        setCreditsOverride((prev) =>
          prev !== null ? Math.max(prev - 1, 0) : prev,
        );
        queryClient.invalidateQueries({
          queryKey: ["contest", id, "entryCredits"],
        });
      }
      dispatch(
        showToast(
          result.error
            ? `업로드는 되었지만 오류가 있습니다. (${result.error})`
            : "콘테스트 출품이 완료되었습니다.",
        ),
      );
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "출품 업로드에 실패했습니다.";
      setUploadError(message);
      setUploadStage("idle");
      dispatch(showToast("출품 업로드에 실패했습니다."));
    },
  });

  const uploadStatusLabel = useMemo(() => {
    if (uploadStage === "uploading") {
      return `이미지 업로드 중 ${uploadProgress}%`;
    }
    if (uploadStage === "saving") {
      return "출품 정보를 저장 중입니다.";
    }
    if (uploadStage === "done") {
      return "출품 등록이 완료되었습니다.";
    }
    return null;
  }, [uploadProgress, uploadStage]);

  const isUploading = uploadStage === "uploading" || uploadStage === "saving";

  const contest = data?.data;
  const isFallback = data?.isFallback ?? false;
  const error = data?.error;
  const credits = creditsOverride ?? creditData?.data?.credits ?? 0;
  const canSubmit = hasToken && credits > 0;
  const needsCredit = hasToken && credits <= 0;

  return (
    <PageShell>
      <TopNav />
      {isLoading ? (
        <section className="mt-10 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[28px] border border-[color:var(--line)] bg-white/70 p-8 shadow-[var(--shadow)]">
            <Skeleton className="h-4 w-24 rounded-full" />
            <Skeleton className="mt-3 h-8 w-2/3 rounded-[16px]" />
            <SkeletonText className="mt-4" lines={3} />
            <div className="mt-6 flex flex-wrap gap-3">
              <Skeleton className="h-7 w-40 rounded-full" />
              <Skeleton className="h-7 w-32 rounded-full" />
              <Skeleton className="h-7 w-32 rounded-full" />
              <Skeleton className="h-7 w-24 rounded-full" />
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Skeleton className="h-11 w-36 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          </div>
          <div className="grid gap-6">
            <div className="rounded-[28px] border border-[color:var(--line)] bg-white/70 p-8 shadow-[var(--shadow)]">
              <Skeleton className="h-6 w-40 rounded-[14px]" />
              <SkeletonText className="mt-4" lines={4} />
            </div>
            <div className="rounded-[28px] border border-[color:var(--line)] bg-white/70 p-8 shadow-[var(--shadow)]">
              <Skeleton className="h-6 w-44 rounded-[14px]" />
              <SkeletonText className="mt-4" lines={3} />
              <div className="mt-6 grid gap-3">
                <Skeleton className="h-7 w-40 rounded-full" />
                <Skeleton className="h-7 w-40 rounded-full" />
                <Skeleton className="h-7 w-40 rounded-full" />
              </div>
            </div>
            <div className="rounded-[28px] border border-[color:var(--line)] bg-white/70 p-8 shadow-[var(--shadow)]">
              <Skeleton className="h-6 w-32 rounded-[14px]" />
              <SkeletonText className="mt-4" lines={2} />
              <div className="mt-4 grid gap-3">
                <Skeleton className="h-11 w-full rounded-[18px]" />
                <Skeleton className="h-24 w-full rounded-[18px]" />
                <Skeleton className="h-11 w-32 rounded-full" />
              </div>
            </div>
          </div>
        </section>
      ) : (
        <>
          {isFallback && (
            <div className="mt-10 rounded-2xl border border-[color:var(--line)] bg-white/70 px-5 py-3 text-xs text-[color:var(--muted)]">
              콘테스트 정보를 불러오지 못해 임시 콘텐츠를 표시하고 있습니다.
              {error ? ` (${error})` : ""}
            </div>
          )}

          {contest && (
        <section className="mt-10 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[28px] border border-[color:var(--line)] bg-white/70 p-8 shadow-[var(--shadow)]">
            <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--accent)]">
              Contest
            </p>
            <h1 className="mt-2 font-[var(--font-display)] text-3xl">
              {contest.theme}
            </h1>
            <p className="mt-3 text-sm text-[color:var(--muted)]">
              {contest.description}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-[color:var(--muted)]">
              <span className="rounded-full border border-[color:var(--line)] px-3 py-1">
                {contest.period}
              </span>
              <span className="rounded-full border border-[color:var(--line)] px-3 py-1">
                참가비 {formatNumber(contest.entryFee)}원
              </span>
              <span className="rounded-full border border-[color:var(--line)] px-3 py-1">
                상금풀 {formatNumber(contest.prizePool)}원
              </span>
              <span className="rounded-full border border-[color:var(--line)] px-3 py-1">
                참여 {formatNumber(contest.participationCount)}명
              </span>
              {hasToken && (
                <span className="rounded-full border border-[color:var(--line)] px-3 py-1">
                  출품권 {credits}개
                </span>
              )}
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                className="rounded-full bg-[color:var(--accent)] px-5 py-3 text-sm text-white shadow-[var(--shadow)] disabled:opacity-60"
                onClick={() => {
                  if (!hasToken) {
                    dispatch(showToast("로그인 후 결제할 수 있습니다."));
                    return;
                  }
                  setPaymentStep("payment");
                }}
                disabled={purchaseMutation.isPending}
              >
                {purchaseMutation.isPending ? "결제 처리 중..." : "출품권 결제"}
              </button>
              <span className="text-xs text-[color:var(--muted)]">
                {contest.daysLeft > 0
                  ? `${contest.daysLeft}일 남음`
                  : "마감됨"}
              </span>
            </div>
          </div>

          <div className="grid gap-6">
            <div className="rounded-[28px] border border-[color:var(--line)] bg-white/70 p-8 shadow-[var(--shadow)]">
              <h2 className="font-[var(--font-display)] text-2xl">
                Contest Rules
              </h2>
              <ul className="mt-4 grid gap-3 text-sm text-[color:var(--muted)]">
                {contest.rules.map((rule) => (
                  <li
                    key={rule}
                    className="rounded-[18px] border border-[color:var(--line)] bg-white/80 px-4 py-2"
                  >
                    {rule}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-[28px] border border-[color:var(--line)] bg-white/70 p-8 shadow-[var(--shadow)]">
              <h2 className="font-[var(--font-display)] text-2xl">
                Prize Distribution
              </h2>
              <p className="mt-3 text-sm text-[color:var(--muted)]">
                참가비의 70%가 상금 풀로 구성되며, 1등에게 가장 큰 보상이
                지급됩니다.
              </p>
              <div className="mt-6 grid gap-3 text-xs text-[color:var(--muted)]">
                <span className="rounded-full border border-[color:var(--line)] px-3 py-2">
                  1등: 상금 풀의 50%
                </span>
                <span className="rounded-full border border-[color:var(--line)] px-3 py-2">
                  2등: 상금 풀의 30%
                </span>
                <span className="rounded-full border border-[color:var(--line)] px-3 py-2">
                  3등: 상금 풀의 20%
                </span>
              </div>
            </div>
            <div className="rounded-[28px] border border-[color:var(--line)] bg-white/70 p-8 shadow-[var(--shadow)]">
              <h2 className="font-[var(--font-display)] text-2xl">
                Submit Entry
              </h2>
              <p className="mt-2 text-sm text-[color:var(--muted)]">
                JPEG/PNG, 최대 100MB. 작품 정보를 입력하고 출품하세요.
              </p>
              {!canSubmit && hasToken && (
                <div className="mt-4 rounded-[18px] border border-[color:var(--line)] bg-[color:var(--chip)] px-4 py-2 text-xs text-[color:var(--muted)]">
                  출품권 결제 후 출품이 가능합니다.
                </div>
              )}
              {needsCredit && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-[color:var(--line)] bg-white/80 px-4 py-3 text-xs text-[color:var(--muted)]">
                  <div>
                    출품권이 없습니다. 결제 1회당 출품권 1개가 추가됩니다.
                  </div>
                  <button
                    className="rounded-full border border-[color:var(--accent)] px-4 py-2 text-xs text-[color:var(--accent)] transition hover:bg-[color:var(--accent)] hover:text-white"
                    onClick={() => setPaymentStep("payment")}
                  >
                    출품권 결제하기
                  </button>
                </div>
              )}
              {!hasToken && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-[color:var(--line)] bg-white/80 px-4 py-3 text-xs text-[color:var(--muted)]">
                  <div>로그인 후 결제 및 출품을 진행할 수 있습니다.</div>
                  <Link
                    href="/login"
                    className="rounded-full border border-[color:var(--line)] px-4 py-2 text-xs text-[color:var(--muted)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
                  >
                    로그인하러 가기
                  </Link>
                </div>
              )}
              <div className="mt-4 grid gap-3">
                <input
                  className="h-11 rounded-[18px] border border-[color:var(--line)] bg-white px-4 text-sm text-[color:var(--canvas-ink)] focus:border-[color:var(--accent)] focus:outline-none"
                  placeholder="작품 제목"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  disabled={!canSubmit}
                />
                <textarea
                  className="min-h-[90px] rounded-[18px] border border-[color:var(--line)] bg-white px-4 py-3 text-sm text-[color:var(--canvas-ink)] focus:border-[color:var(--accent)] focus:outline-none"
                  placeholder="작품 설명"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  disabled={!canSubmit}
                />
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/jpg"
                  onChange={(event) => {
                    const selected = event.target.files
                      ? event.target.files[0]
                      : null;
                    if (!selected) {
                      setFile(null);
                      setUploadError(null);
                      setUploadProgress(0);
                      setUploadStage("idle");
                      setUploadedImageUrl(null);
                      return;
                    }
                    const allowed = [
                      "image/jpeg",
                      "image/png",
                      "image/jpg",
                    ];
                    const maxSize = 100 * 1024 * 1024;
                    if (!allowed.includes(selected.type)) {
                      setFile(null);
                      setUploadError("JPEG/PNG 파일만 업로드 가능합니다.");
                      setUploadStage("idle");
                      setUploadProgress(0);
                      setUploadedImageUrl(null);
                      return;
                    }
                    if (selected.size > maxSize) {
                      setFile(null);
                      setUploadError("파일 용량은 100MB 이하만 가능합니다.");
                      setUploadStage("idle");
                      setUploadProgress(0);
                      setUploadedImageUrl(null);
                      return;
                    }
                    setUploadError(null);
                    setUploadProgress(0);
                    setUploadStage("idle");
                    setUploadedImageUrl(null);
                    setFile(selected);
                  }}
                  className="text-xs text-[color:var(--muted)]"
                  disabled={!canSubmit}
                />
                {uploadStatusLabel && (
                  <div className="rounded-[18px] border border-[color:var(--line)] bg-white/80 px-4 py-2 text-xs text-[color:var(--muted)]">
                    {uploadStatusLabel}
                    {uploadStage === "uploading" && (
                      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[color:var(--line)]">
                        <div
                          className="h-full rounded-full bg-[color:var(--accent)] transition-[width] duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    )}
                  </div>
                )}
                {uploadError && (
                  <div className="rounded-[18px] border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">
                    {uploadError}
                  </div>
                )}
                {file && (
                  <div className="rounded-[18px] border border-[color:var(--line)] bg-white/80 px-4 py-2 text-xs text-[color:var(--muted)]">
                    선택된 파일: {file.name} (
                    {(file.size / (1024 * 1024)).toFixed(2)} MB)
                  </div>
                )}
                {uploadedImageUrl && (
                  <div className="rounded-[18px] border border-[color:var(--line)] bg-white/80 p-3">
                    <p className="text-xs text-[color:var(--muted)]">
                      업로드된 이미지 미리보기
                    </p>
                    <div className="mt-2 overflow-hidden rounded-[14px] border border-[color:var(--line)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={uploadedImageUrl}
                        alt="업로드 미리보기"
                        className="h-40 w-full object-cover"
                      />
                    </div>
                  </div>
                )}
                <button
                  className="mt-2 rounded-full bg-[color:var(--accent)] px-5 py-3 text-sm text-white shadow-[var(--shadow)] disabled:opacity-60"
                  onClick={() => uploadMutation.mutate()}
                  disabled={
                    !canSubmit ||
                    !file ||
                    uploadMutation.isPending ||
                    isUploading
                  }
                >
                  {!canSubmit
                    ? "결제 후 출품 가능"
                    : uploadMutation.isPending || isUploading
                      ? "업로드 중..."
                      : "출품하기"}
                </button>
              </div>
            </div>
          </div>
        </section>
          )}
        </>
      )}

      {paymentStep !== "closed" && contest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-[28px] border border-[color:var(--line)] bg-white p-8 shadow-[var(--shadow)]">
            {paymentStep === "payment" && (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--accent)]">
                      Test Payment
                    </p>
                    <h2 className="mt-2 font-[var(--font-display)] text-2xl">
                      출품권 결제
                    </h2>
                    <p className="mt-2 text-sm text-[color:var(--muted)]">
                      실제 결제는 진행되지 않으며, 테스트 UI입니다.
                    </p>
                  </div>
                  <button
                    className="rounded-full border border-[color:var(--line)] px-3 py-1 text-xs text-[color:var(--muted)] transition hover:border-red-300 hover:text-red-500"
                    onClick={() => setPaymentStep("closed")}
                  >
                    닫기
                  </button>
                </div>

                <div className="mt-6 grid gap-4">
                  <div className="rounded-[18px] border border-[color:var(--line)] bg-[color:var(--chip)] px-4 py-3 text-sm text-[color:var(--canvas-ink)]">
                    참가 콘테스트: <strong>{contest.theme}</strong>
                  </div>

                  <div className="rounded-[18px] border border-[color:var(--line)] bg-[color:var(--chip)] px-4 py-3 text-sm text-[color:var(--canvas-ink)]">
                    참가비{" "}
                    <strong>{formatNumber(contest.entryFee)}원</strong>
                  </div>

                  <div className="grid gap-2">
                    <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                      Payment Method
                    </p>
                    <div className="flex flex-wrap gap-3 text-sm text-[color:var(--muted)]">
                      {[
                        { id: "card", label: "카드 결제" },
                        { id: "account", label: "계좌 이체" },
                        { id: "simple", label: "간편 결제" },
                      ].map((method) => (
                        <button
                          key={method.id}
                          className={`rounded-full border px-4 py-2 transition ${
                            paymentMethod === method.id
                              ? "border-[color:var(--accent)] text-[color:var(--accent)]"
                              : "border-[color:var(--line)] text-[color:var(--muted)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
                          }`}
                          onClick={() => setPaymentMethod(method.id)}
                        >
                          {method.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    className="flex-1 rounded-full bg-[color:var(--accent)] px-5 py-3 text-sm text-white shadow-[var(--shadow)]"
                    onClick={() => {
                      if (purchaseMutation.isPending) {
                        return;
                      }
                      setPaymentStep("processing");
                      purchaseMutation.mutate();
                    }}
                  >
                    {purchaseMutation.isPending ? "결제 처리 중..." : "테스트 결제 진행"}
                  </button>
                  <button
                    className="flex-1 rounded-full border border-[color:var(--line)] px-5 py-3 text-sm text-[color:var(--muted)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
                    onClick={() => setPaymentStep("closed")}
                  >
                    취소
                  </button>
                </div>
              </>
            )}

            {paymentStep === "processing" && (
              <>
                <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--accent)]">
                  Processing
                </p>
                <h2 className="mt-3 font-[var(--font-display)] text-2xl">
                  결제를 처리하고 있습니다.
                </h2>
                <p className="mt-2 text-sm text-[color:var(--muted)]">
                  잠시만 기다려주세요.
                </p>
                <div className="mt-6 flex items-center gap-3 text-xs text-[color:var(--muted)]">
                  <div className="spinner" />
                  <span>출품권을 발급 중입니다.</span>
                </div>
              </>
            )}

            {paymentStep === "confirm" && (
              <>
                <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--accent)]">
                  Payment Complete
                </p>
                <h2 className="mt-3 font-[var(--font-display)] text-2xl">
                  출품권 결제가 완료되었습니다.
                </h2>
                <p className="mt-2 text-sm text-[color:var(--muted)]">
                  테스트 결제이므로 실제 승인/청구는 발생하지 않습니다.
                </p>
                <div className="mt-6 rounded-[18px] border border-[color:var(--line)] bg-white/80 px-4 py-3 text-sm text-[color:var(--muted)]">
                  {contest.theme} 출품권이 추가되었습니다.
                </div>
                <div className="mt-3 rounded-[18px] border border-[color:var(--line)] bg-[color:var(--chip)] px-4 py-3 text-sm text-[color:var(--canvas-ink)]">
                  현재 출품권: <strong>{credits}개</strong>
                </div>
                <button
                  className="mt-6 w-full rounded-full bg-[color:var(--accent)] px-5 py-3 text-sm text-white shadow-[var(--shadow)] disabled:opacity-60"
                  onClick={() => setPaymentStep("closed")}
                >
                  확인
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </PageShell>
  );
}

function resolveUploadError(result: ImageUploadResult): string {
  if (result.errorKind === "TIMEOUT") {
    return "업로드 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.";
  }
  if (result.errorKind === "NETWORK") {
    return "네트워크 연결이 불안정합니다. 연결을 확인해주세요.";
  }
  if (result.errorKind === "HTTP") {
    if (result.status === 413) {
      return "파일 용량이 서버 제한을 초과했습니다.";
    }
    if (result.status === 415) {
      return "지원하지 않는 파일 형식입니다.";
    }
    if (result.status && result.status >= 500) {
      return "이미지 서버 오류가 발생했습니다.";
    }
  }
  return result.error ?? "이미지 업로드에 실패했습니다.";
}
