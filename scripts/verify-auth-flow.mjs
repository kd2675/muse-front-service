import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { buildLoginPath, sanitizeAuthNextPath } from "../app/lib/authRouting.ts";

assert.equal(sanitizeAuthNextPath("/admin/contests?tab=review"), "/admin/contests?tab=review");
assert.equal(sanitizeAuthNextPath("https://attacker.example/steal"), "/");
assert.equal(sanitizeAuthNextPath("//attacker.example/steal"), "/");
assert.equal(sanitizeAuthNextPath("/auth/callback"), "/");
assert.equal(buildLoginPath("/admin/contests?tab=review", true), "/login?next=%2Fadmin%2Fcontests%3Ftab%3Dreview&expired=1");

const callbackSource = await readFile(new URL("../app/auth/callback/page.tsx", import.meta.url), "utf8");
const loginSource = await readFile(new URL("../app/login/page.tsx", import.meta.url), "utf8");
const authSource = await readFile(new URL("../app/lib/auth.ts", import.meta.url), "utf8");

assert.match(callbackSource, /ensureAccessToken\(\)/);
assert.doesNotMatch(callbackSource, /searchParams|get\("token"\)|setAccessToken\(/);
assert.doesNotMatch(loginSource, /get\("token"\)|window\.location\.href/);
assert.match(loginSource, /window\.location\.replace/);
assert.match(loginSource, /await signup\(/);
assert.match(authSource, /explicitlySignedOut/);
assert.match(authSource, /requestGeneration !== authGeneration/);

console.log("Muse authentication routing checks passed.");
