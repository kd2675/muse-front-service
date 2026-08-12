import { deleteJson, fetchJson, postJson, putJson } from "./api";
import type { ResponseEnvelope } from "../types/response";
import type {
  DiscoverySearch,
  FollowStatus,
  MuseumBookmark,
  MuseumViewHistory,
  NotificationList,
  PublicArtist,
} from "../types/discovery";

function errorOf(result: { error?: string; backendMapped?: string; backendMessage?: string }) {
  return result.backendMapped ?? result.backendMessage ?? result.error;
}

export async function searchDiscovery(query: string) {
  const result = await fetchJson<ResponseEnvelope<DiscoverySearch>>(
    `/api/muse/v1/discovery/search?q=${encodeURIComponent(query)}`,
  );
  return result.data?.data
    ? { data: result.data.data, error: undefined }
    : { data: null, error: errorOf(result) };
}

export async function getPublicArtist(artistId: number) {
  const result = await fetchJson<ResponseEnvelope<PublicArtist>>(`/api/muse/v1/artists/${artistId}`);
  return result.data?.data
    ? { data: result.data.data, error: undefined }
    : { data: null, error: errorOf(result) };
}

export async function getFollowStatus(artistId: number) {
  const result = await fetchJson<ResponseEnvelope<FollowStatus>>(
    `/api/muse/v1/artists/${artistId}/follow-status`,
  );
  return result.data?.data
    ? { data: result.data.data, error: undefined }
    : { data: null, error: errorOf(result) };
}

export async function setFollowing(artistId: number, following: boolean) {
  const result = following
    ? await postJson<ResponseEnvelope<FollowStatus>>(`/api/muse/v1/artists/${artistId}/followers`, {})
    : await deleteJson<ResponseEnvelope<FollowStatus>>(`/api/muse/v1/artists/${artistId}/followers`);
  return result.data?.data
    ? { data: result.data.data, error: undefined }
    : { data: null, error: errorOf(result) };
}

export async function getNotifications() {
  const result = await fetchJson<ResponseEnvelope<NotificationList>>("/api/muse/v1/me/notifications");
  return result.data?.data
    ? { data: result.data.data, error: undefined }
    : { data: { unreadCount: 0, items: [] }, error: errorOf(result) };
}

export async function markNotificationRead(notificationId: number) {
  return putJson<ResponseEnvelope<unknown>>(`/api/muse/v1/me/notifications/${notificationId}/read`, {});
}

export async function markAllNotificationsRead() {
  return putJson<ResponseEnvelope<number>>("/api/muse/v1/me/notifications/read-all", {});
}

export async function getBookmarks() {
  const result = await fetchJson<ResponseEnvelope<MuseumBookmark[]>>("/api/muse/v1/me/gallery/bookmarks");
  return result.data?.data
    ? { data: result.data.data, error: undefined }
    : { data: [], error: errorOf(result) };
}

export async function getBookmarkStatus(museumId: number) {
  const result = await fetchJson<ResponseEnvelope<MuseumBookmark>>(
    `/api/muse/v1/me/gallery/museums/${museumId}/bookmark`,
  );
  return result.data?.data
    ? { data: result.data.data, error: undefined }
    : { data: null, error: errorOf(result) };
}

export async function setBookmark(museumId: number, bookmarked: boolean) {
  const result = bookmarked
    ? await postJson<ResponseEnvelope<MuseumBookmark>>(
        `/api/muse/v1/me/gallery/museums/${museumId}/bookmark`,
        {},
      )
    : await deleteJson<ResponseEnvelope<MuseumBookmark>>(
        `/api/muse/v1/me/gallery/museums/${museumId}/bookmark`,
      );
  return result.data?.data
    ? { data: result.data.data, error: undefined }
    : { data: null, error: errorOf(result) };
}

export async function getViewHistory() {
  const result = await fetchJson<ResponseEnvelope<MuseumViewHistory[]>>("/api/muse/v1/me/gallery/history");
  return result.data?.data
    ? { data: result.data.data, error: undefined }
    : { data: [], error: errorOf(result) };
}

export async function recordMuseumView(
  museumId: number,
  lastArtworkId: number | null,
  progressPercent: number,
) {
  return putJson<ResponseEnvelope<MuseumViewHistory>>(
    `/api/muse/v1/me/gallery/museums/${museumId}/history`,
    { lastArtworkId, progressPercent },
  );
}
