export const APP_ROUTES = {
  contestList: "/contest?tab=contest",
  galleryLobby: "/gallery?tab=gallery",
  galleryCategoriesSection: "/gallery?tab=gallery#categories",
  adminContestManage: "/admin/contests?tab=contest",
  adminContestReview: "/admin/contests/review?tab=contest",
  adminGalleryManage: "/admin/gallery?tab=gallery",
} as const;

export function galleryArtworkDetailRoute(id: number): string {
  return `/gallery/artworks/${id}`;
}

export function galleryCategoryRoute(key: string): string {
  return `/gallery/categories/${key}`;
}

export function adminContestReviewRoute(contestId?: number): string {
  if (!contestId) {
    return APP_ROUTES.adminContestReview;
  }
  return `/admin/contests/review?tab=contest&contestId=${contestId}`;
}
