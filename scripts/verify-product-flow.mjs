import assert from "node:assert/strict";

import { compositionError, museumComposition } from "../app/lib/curation.ts";
import { createSerialQueue } from "../app/lib/serialQueue.ts";

const settings = { publishStatus: "PUBLISHED", coverArtworkId: 1, openingAt: null, curatorNote: "", layoutPreset: "SALON", lightingPreset: "WARM" };
const artwork = { museumArtworkId: 1, title: "A photo", description: "", sortOrder: 0, focalX: 50, focalY: 50, moderationStatus: "VISIBLE", lightingPreset: "WARM", imageUrl: "/image.jpg" };
assert.equal(compositionError(settings, [artwork]), null);
assert.match(compositionError(settings, [{ ...artwork, moderationStatus: "REVIEWING" }]), /심사/);
assert.match(compositionError({ ...settings, coverArtworkId: 2 }, [artwork]), /표지/);
assert.equal(compositionError({ ...settings, publishStatus: "DRAFT" }, []), null);
assert.match(compositionError(settings, [{ ...artwork, audioUrl: "https://example.test/audio.mp3" }]), /대본/);
assert.match(compositionError({ ...settings, publishStatus: "SCHEDULED", openingAt: "2026-09-10T10:00" }, [artwork], Date.parse("2026-09-10T01:01:00Z")), /한국 시간/);
assert.equal(compositionError({ ...settings, publishStatus: "SCHEDULED", openingAt: "2026-09-10T10:00" }, [artwork], Date.parse("2026-09-10T00:59:00Z")), null);
const payload = museumComposition({ ...settings, openingAt: "2026-09-10T10:00" }, [{ ...artwork, museumArtworkId: 2, sortOrder: 7 }, artwork]);
assert.deepEqual(payload.artworks.map((item) => [item.museumArtworkId, item.settings.sortOrder]), [[2, 0], [1, 1]]);
assert.equal(payload.curation.openingAt, null);

// A delayed first write must finish before newer contents and retries reach the server.
const enqueue = createSerialQueue();
const writes = [];
let release;
const gate = new Promise((resolve) => { release = resolve; });
const first = enqueue(async () => { writes.push("first-start"); await gate; writes.push("first-end"); });
const second = enqueue(async () => { writes.push("second"); throw new Error("offline"); });
const failure = assert.rejects(second, /offline/);
const retry = enqueue(async () => { writes.push("retry"); });
await Promise.resolve();
assert.deepEqual(writes, ["first-start"]);
release();
await Promise.all([first, failure, retry]);
assert.deepEqual(writes, ["first-start", "first-end", "second", "retry"]);
console.log("Muse publication validation and ordered draft writes passed.");
