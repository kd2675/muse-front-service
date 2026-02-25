export const APP_ROUTES = {
  home: "/?tab=home",
  homeOverview: "/overview?tab=overview",
  contestList: "/contest?tab=contest",
  galleryLobby: "/gallery?tab=gallery",
  galleryMyMuseums: "/gallery/my?tab=gallery",
  profile: "/profile?tab=profile",
  adminContestManage: "/admin/contests?tab=contest",
  adminContestReview: "/admin/contests/review?tab=contest",
  adminGalleryManage: "/admin/gallery?tab=gallery",
} as const;

export function galleryMuseumDetailRoute(
  museumId: number,
  options?: { focus?: boolean },
): string {
  if (!options?.focus) {
    return `/gallery/museums/${museumId}`;
  }
  return `/gallery/museums/${museumId}?mode=focus`;
}

export function adminContestReviewRoute(contestId?: number): string {
  if (!contestId) {
    return APP_ROUTES.adminContestReview;
  }
  return `/admin/contests/review?tab=contest&contestId=${contestId}`;
}
