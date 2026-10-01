var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};

// src/utils/translations/en/notifications.ts
var notifications;
var init_notifications = __esm({
  "src/utils/translations/en/notifications.ts"() {
    "use strict";
    notifications = {
      centerTitle: "Notification Center",
      centerEmpty: "No notifications yet",
      centerFooter: "You can accept or decline tree invitations directly from here.",
      filterAll: "All",
      filterInvitations: "Invitations",
      filterUpdates: "Updates",
      filterEmpty: "No notifications match this filter.",
      summaryUnread: "Unread",
      summaryPending: "Pending",
      summaryUpdates: "Updates",
      acceptAction: "Accept",
      declineAction: "Decline",
      markAllRead: "Mark all as read",
      clearSafe: "Clear read and non-actionable",
      clearSafeAria: "Clear read and non-actionable notifications",
      label: "Notifications",
      labelWithCount: "{count} new notifications",
      birthdayTitle: "Birth Anniversary",
      birthdayBody: `Today is "{name}"'s birth anniversary - born {year} ({age} years ago)`,
      birthdayDeceasedBody: `Today marks "{name}"'s birth anniversary - born {year} and would have turned {age} today`,
      birthdayUpcomingTitle: "Upcoming Birth Anniversary",
      birthdayUpcomingBody: `In {days} day(s), "{name}" reaches age {age}`,
      birthdayUpcomingDeceasedBody: `In {days} day(s), "{name}"'s birth anniversary arrives - they would have turned {age}`,
      integrityTitle: "Missing Data",
      integrityBody: "Migration Map: {count} place(s) being geocoded in the background.",
      invitationTitle: "New tree invitation",
      invitationBody: "You received a new {role} invitation to a family tree.",
      invitationToast: "You received a new in-app invitation.",
      invitationAcceptedTitle: "Invitation accepted",
      invitationAcceptedBody: "The invitation is now linked to your account and the tree is accessible.",
      invitationAcceptedOpenBody: "Invitation accepted. Opening the shared tree...",
      invitationAcceptedToast: "Invitation accepted.",
      invitationDeclinedTitle: "Invitation declined",
      invitationDeclinedToast: "Invitation declined.",
      ownerAcceptedBody: "{email} accepted the invitation as {role}.",
      ownerDeclinedBody: "{email} declined the invitation.",
      invitationAcceptPrecondition: "This invitation cannot be accepted because its data is incomplete or your current session is unavailable.",
      invitationDeclinePrecondition: "This invitation cannot be declined because its data is incomplete or your current session is unavailable.",
      invitationEmailMismatch: "This invitation cannot be processed because your signed-in email does not match the invited email.",
      invitationExpired: "This invitation is invalid or has expired.",
      invitationPermissionDenied: "This invitation could not be processed because your current session is missing the required access. Please sign in again and try once more.",
      invitationAcceptFailed: "Failed to accept invitation.",
      invitationDeclineFailed: "Failed to decline invitation."
    };
  }
});

// src/utils/translations/ar/notifications.ts
var notifications2;
var init_notifications2 = __esm({
  "src/utils/translations/ar/notifications.ts"() {
    "use strict";
    notifications2 = {
      centerTitle: "\u0645\u0631\u0643\u0632 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A",
      centerEmpty: "\u0644\u0627 \u062A\u0648\u062C\u062F \u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0628\u0639\u062F.",
      centerFooter: "\u064A\u0645\u0643\u0646\u0643 \u0642\u0628\u0648\u0644 \u062F\u0639\u0648\u0627\u062A \u0627\u0644\u0634\u062C\u0631\u0629 \u0623\u0648 \u0631\u0641\u0636\u0647\u0627 \u0645\u0628\u0627\u0634\u0631\u0629 \u0645\u0646 \u0647\u0646\u0627.",
      filterAll: "\u0627\u0644\u0643\u0644",
      filterInvitations: "\u0627\u0644\u062F\u0639\u0648\u0627\u062A",
      filterUpdates: "\u0627\u0644\u062A\u062D\u062F\u064A\u062B\u0627\u062A",
      filterEmpty: "\u0644\u0627 \u062A\u0648\u062C\u062F \u0625\u0634\u0639\u0627\u0631\u0627\u062A \u062A\u0637\u0627\u0628\u0642 \u0647\u0630\u0627 \u0627\u0644\u0641\u0644\u062A\u0631.",
      summaryUnread: "\u063A\u064A\u0631 \u0627\u0644\u0645\u0642\u0631\u0648\u0621",
      summaryPending: "\u0627\u0644\u0645\u0639\u0644\u0642\u0629",
      summaryUpdates: "\u0627\u0644\u062A\u062D\u062F\u064A\u062B\u0627\u062A",
      acceptAction: "\u0642\u0628\u0648\u0644",
      declineAction: "\u0631\u0641\u0636",
      markAllRead: "\u062A\u062D\u062F\u064A\u062F \u0627\u0644\u0643\u0644 \u0643\u0645\u0642\u0631\u0648\u0621",
      clearSafe: "\u0645\u0633\u062D \u0627\u0644\u0645\u0642\u0631\u0648\u0621 \u0648\u063A\u064A\u0631 \u0627\u0644\u062A\u0641\u0627\u0639\u0644\u064A",
      clearSafeAria: "\u0645\u0633\u062D \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0627\u0644\u0645\u0642\u0631\u0648\u0621\u0629 \u0648\u063A\u064A\u0631 \u0627\u0644\u062A\u0641\u0627\u0639\u0644\u064A\u0629",
      label: "\u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A",
      labelWithCount: "{count} \u0625\u0634\u0639\u0627\u0631\u0627\u062A \u062C\u062F\u064A\u062F\u0629",
      birthdayTitle: "\u0630\u0643\u0631\u0649 \u0645\u064A\u0644\u0627\u062F",
      birthdayBody: '\u0627\u0644\u064A\u0648\u0645 \u0630\u0643\u0631\u0649 \u0645\u064A\u0644\u0627\u062F "{name}" - \u0648\u064F\u0644\u062F \u0641\u064A {year} (\u0645\u0646\u0630 {age} \u0639\u0627\u0645\u0627\u064B)',
      birthdayDeceasedBody: '\u0627\u0644\u064A\u0648\u0645 \u062A\u062D\u0644 \u0630\u0643\u0631\u0649 \u0645\u064A\u0644\u0627\u062F "{name}" - \u0648\u064F\u0644\u062F \u0641\u064A {year} \u0648\u0644\u0648 \u0643\u0627\u0646 \u062D\u064A\u0651\u064B\u0627 \u0644\u0623\u062A\u0645 {age} \u0639\u0627\u0645\u064B\u0627 \u0627\u0644\u064A\u0648\u0645',
      birthdayUpcomingTitle: "\u0630\u0643\u0631\u0649 \u0645\u064A\u0644\u0627\u062F \u0642\u0627\u062F\u0645\u0629",
      birthdayUpcomingBody: '\u0628\u0639\u062F {days} \u064A\u0648\u0645/\u0623\u064A\u0627\u0645 \u062A\u062D\u0644 \u0630\u0643\u0631\u0649 \u0645\u064A\u0644\u0627\u062F "{name}" \u0648\u0633\u064A\u0628\u0644\u063A {age} \u0639\u0627\u0645\u064B\u0627',
      birthdayUpcomingDeceasedBody: '\u0628\u0639\u062F {days} \u064A\u0648\u0645/\u0623\u064A\u0627\u0645 \u062A\u062D\u0644 \u0630\u0643\u0631\u0649 \u0645\u064A\u0644\u0627\u062F "{name}" \u0648\u0644\u0648 \u0643\u0627\u0646 \u062D\u064A\u0651\u064B\u0627 \u0644\u0623\u062A\u0645 {age} \u0639\u0627\u0645\u064B\u0627',
      integrityTitle: "\u0628\u064A\u0627\u0646\u0627\u062A \u0646\u0627\u0642\u0635\u0629",
      integrityBody: "\u062E\u0631\u064A\u0637\u0629 \u0627\u0644\u0647\u062C\u0631\u0627\u062A: \u064A\u062A\u0645 \u062A\u0631\u0645\u064A\u0632 {count} \u0645\u0648\u0642\u0639/\u0645\u0648\u0627\u0642\u0639 \u062C\u063A\u0631\u0627\u0641\u064A\u064B\u0627 \u0641\u064A \u0627\u0644\u062E\u0644\u0641\u064A\u0629.",
      invitationTitle: "\u062F\u0639\u0648\u0629 \u062C\u062F\u064A\u062F\u0629 \u0625\u0644\u0649 \u0627\u0644\u0634\u062C\u0631\u0629",
      invitationBody: "\u062A\u0644\u0642\u064A\u062A \u062F\u0639\u0648\u0629 \u062C\u062F\u064A\u062F\u0629 \u0628\u0635\u0644\u0627\u062D\u064A\u0629 {role} \u0625\u0644\u0649 \u0634\u062C\u0631\u0629 \u0639\u0627\u0626\u0644\u0629.",
      invitationToast: "\u0648\u0635\u0644\u062A\u0643 \u062F\u0639\u0648\u0629 \u062C\u062F\u064A\u062F\u0629 \u062F\u0627\u062E\u0644 \u0627\u0644\u062A\u0637\u0628\u064A\u0642.",
      invitationAcceptedTitle: "\u062A\u0645 \u0642\u0628\u0648\u0644 \u0627\u0644\u062F\u0639\u0648\u0629",
      invitationAcceptedBody: "\u062A\u0645 \u0631\u0628\u0637 \u0627\u0644\u062F\u0639\u0648\u0629 \u0628\u062D\u0633\u0627\u0628\u0643 \u0648\u0623\u0635\u0628\u062D\u062A \u0627\u0644\u0634\u062C\u0631\u0629 \u0645\u062A\u0627\u062D\u0629 \u0644\u0643.",
      invitationAcceptedOpenBody: "\u062A\u0645 \u0642\u0628\u0648\u0644 \u0627\u0644\u062F\u0639\u0648\u0629. \u062C\u0627\u0631\u064D \u0641\u062A\u062D \u0627\u0644\u0634\u062C\u0631\u0629 \u0627\u0644\u0645\u0634\u062A\u0631\u0643\u0629...",
      invitationAcceptedToast: "\u062A\u0645 \u0642\u0628\u0648\u0644 \u0627\u0644\u062F\u0639\u0648\u0629.",
      invitationDeclinedTitle: "\u062A\u0645 \u0631\u0641\u0636 \u0627\u0644\u062F\u0639\u0648\u0629",
      invitationDeclinedToast: "\u062A\u0645 \u0631\u0641\u0636 \u0627\u0644\u062F\u0639\u0648\u0629.",
      ownerAcceptedBody: "{email} \u0642\u0628\u0644 \u0627\u0644\u062F\u0639\u0648\u0629 \u0628\u0635\u0644\u0627\u062D\u064A\u0629 {role}.",
      ownerDeclinedBody: "{email} \u0631\u0641\u0636 \u0627\u0644\u062F\u0639\u0648\u0629.",
      invitationAcceptPrecondition: "\u0644\u0627 \u064A\u0645\u0643\u0646 \u0642\u0628\u0648\u0644 \u0647\u0630\u0647 \u0627\u0644\u062F\u0639\u0648\u0629 \u0644\u0623\u0646 \u0628\u064A\u0627\u0646\u0627\u062A\u0647\u0627 \u063A\u064A\u0631 \u0645\u0643\u062A\u0645\u0644\u0629 \u0623\u0648 \u0644\u0623\u0646 \u0627\u0644\u062C\u0644\u0633\u0629 \u0627\u0644\u062D\u0627\u0644\u064A\u0629 \u063A\u064A\u0631 \u0645\u062A\u0627\u062D\u0629.",
      invitationDeclinePrecondition: "\u0644\u0627 \u064A\u0645\u0643\u0646 \u0631\u0641\u0636 \u0647\u0630\u0647 \u0627\u0644\u062F\u0639\u0648\u0629 \u0644\u0623\u0646 \u0628\u064A\u0627\u0646\u0627\u062A\u0647\u0627 \u063A\u064A\u0631 \u0645\u0643\u062A\u0645\u0644\u0629 \u0623\u0648 \u0644\u0623\u0646 \u0627\u0644\u062C\u0644\u0633\u0629 \u0627\u0644\u062D\u0627\u0644\u064A\u0629 \u063A\u064A\u0631 \u0645\u062A\u0627\u062D\u0629.",
      invitationEmailMismatch: "\u0644\u0627 \u064A\u0645\u0643\u0646 \u0645\u0639\u0627\u0644\u062C\u0629 \u0647\u0630\u0647 \u0627\u0644\u062F\u0639\u0648\u0629 \u0644\u0623\u0646 \u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0627\u0644\u062D\u0627\u0644\u064A \u0644\u0627 \u064A\u0637\u0627\u0628\u0642 \u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0627\u0644\u0645\u062F\u0639\u0648.",
      invitationExpired: "\u0647\u0630\u0647 \u0627\u0644\u062F\u0639\u0648\u0629 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D\u0629 \u0623\u0648 \u0627\u0646\u062A\u0647\u062A \u0635\u0644\u0627\u062D\u064A\u062A\u0647\u0627.",
      invitationPermissionDenied: "\u062A\u0639\u0630\u0631\u062A \u0645\u0639\u0627\u0644\u062C\u0629 \u0647\u0630\u0647 \u0627\u0644\u062F\u0639\u0648\u0629 \u0644\u0623\u0646 \u0627\u0644\u062C\u0644\u0633\u0629 \u0627\u0644\u062D\u0627\u0644\u064A\u0629 \u0644\u0627 \u062A\u0645\u0644\u0643 \u0627\u0644\u0635\u0644\u0627\u062D\u064A\u0629 \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629. \u064A\u0631\u062C\u0649 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649 \u062B\u0645 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629.",
      invitationAcceptFailed: "\u062A\u0639\u0630\u0631 \u0642\u0628\u0648\u0644 \u0627\u0644\u062F\u0639\u0648\u0629.",
      invitationDeclineFailed: "\u062A\u0639\u0630\u0631 \u0631\u0641\u0636 \u0627\u0644\u062F\u0639\u0648\u0629."
    };
  }
});

// src/api/push-reminder-cron.ts
import { createClient as createClient3 } from "@supabase/supabase-js";

// src/services/supabaseConfig.ts
var viteEnv = typeof import.meta.env === "undefined" ? void 0 : {
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY
};
var runtimeEnv = typeof process !== "undefined" ? process.env : void 0;
var resolveSupabaseConfig = (clientEnv, serverEnv) => ({
  url: clientEnv?.VITE_SUPABASE_URL ?? serverEnv?.SUPABASE_URL ?? serverEnv?.VITE_SUPABASE_URL,
  key: clientEnv?.VITE_SUPABASE_ANON_KEY ?? serverEnv?.SUPABASE_ANON_KEY ?? serverEnv?.VITE_SUPABASE_ANON_KEY
});
var resolvedConfig = resolveSupabaseConfig(viteEnv, runtimeEnv);
var resolvedSupabaseUrl = resolvedConfig.url;
var resolvedSupabaseKey = resolvedConfig.key;
var supabaseUrl = resolvedSupabaseUrl || "http://127.0.0.1";
var supabaseKey = resolvedSupabaseKey || "public-anon-key-placeholder";
var SUPABASE_SESSION_STORAGE_KEY = "jozor-supabase-auth";
var JOZOR_SUPABASE_TOKEN_KEY = "jozor_supabase_token";
var assertSupabaseConfig = () => {
  if (!resolvedSupabaseUrl || !resolvedSupabaseKey) {
    console.error("Supabase credentials missing! Check your .env file.");
    if (typeof window !== "undefined") {
      throw new Error("Supabase credentials missing.");
    }
  }
};
var createSupabaseAuthHeaders = (token) => {
  const headers = { apikey: supabaseKey };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
};

// src/services/authTokenService.ts
var sessionTokenReader = null;
var hasBrowserStorage = () => typeof window !== "undefined" && typeof localStorage !== "undefined";
var authTokenService = {
  configureSessionTokenReader(reader) {
    sessionTokenReader = reader;
  },
  getStoredSupabaseToken() {
    if (!hasBrowserStorage()) return null;
    return localStorage.getItem(JOZOR_SUPABASE_TOKEN_KEY);
  },
  getStoredSupabaseTokenOrUndefined() {
    return this.getStoredSupabaseToken() || void 0;
  },
  setStoredSupabaseToken(token) {
    if (!hasBrowserStorage()) return;
    if (token) {
      localStorage.setItem(JOZOR_SUPABASE_TOKEN_KEY, token);
      return;
    }
    localStorage.removeItem(JOZOR_SUPABASE_TOKEN_KEY);
  },
  async getSupabaseSessionAccessToken() {
    return sessionTokenReader ? sessionTokenReader() : null;
  },
  async getPreferredSupabaseToken(customToken) {
    return customToken || this.getStoredSupabaseToken() || await this.getSupabaseSessionAccessToken();
  }
};

// src/services/supabaseClient.ts
import { AuthClient } from "@supabase/auth-js";

// src/store/useAppStore.ts
import { create } from "zustand";
import { devtools } from "zustand/middleware";

// src/types/personMedia.ts
var PERSON_MEDIA_ASSET_SCHEMA_VERSION = 1;
var PRIVATE_PERSON_MEDIA_BUCKET = "person-media";
var PERSON_MEDIA_MAX_IMAGE_BYTES = 5 * 1024 * 1024;
var PERSON_MEDIA_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp"
];
var UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
var TREE_SCOPE_PATTERN = /^[a-zA-Z0-9_-]{1,128}$/;
var PERSON_MEDIA_KEYS = /* @__PURE__ */ new Set([
  "schemaVersion",
  "provider",
  "bucket",
  "assetId",
  "kind",
  "objectPath",
  "mimeType",
  "byteLength",
  "version",
  "createdAt"
]);
var MIME_EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};
var isRecord = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
var isPersonMediaImageMimeType = (value) => typeof value === "string" && PERSON_MEDIA_IMAGE_MIME_TYPES.some((mimeType) => mimeType === value);
function isPersonMediaAssetRef(value) {
  if (!isRecord(value)) return false;
  if (Object.keys(value).some((key) => !PERSON_MEDIA_KEYS.has(key))) {
    return false;
  }
  const kind = value.kind;
  const mimeType = value.mimeType;
  if (kind !== "profile-photo" && kind !== "gallery-photo") return false;
  if (!isPersonMediaImageMimeType(mimeType)) return false;
  if (value.schemaVersion !== PERSON_MEDIA_ASSET_SCHEMA_VERSION) return false;
  if (value.provider !== "supabase-private" || value.bucket !== PRIVATE_PERSON_MEDIA_BUCKET) return false;
  if (typeof value.assetId !== "string" || !UUID_PATTERN.test(value.assetId)) return false;
  if (!Number.isInteger(value.byteLength) || value.byteLength <= 0 || value.byteLength > PERSON_MEDIA_MAX_IMAGE_BYTES) return false;
  if (!Number.isInteger(value.version) || value.version < 1) return false;
  if (typeof value.createdAt !== "string" || !Number.isFinite(Date.parse(value.createdAt))) return false;
  if (typeof value.objectPath !== "string" || value.objectPath.length > 512) return false;
  if (value.objectPath.includes("..") || value.objectPath.includes("\\") || value.objectPath.startsWith("/")) {
    return false;
  }
  const pathParts = value.objectPath.split("/");
  if (pathParts.length !== 3 || !TREE_SCOPE_PATTERN.test(pathParts[0]) || pathParts[1] !== kind) {
    return false;
  }
  return pathParts[2] === `${value.assetId}.${MIME_EXTENSIONS[mimeType]}`;
}

// src/types/relationship.ts
function deriveRelationshipsFromPeople(treeId, people) {
  const edges = {};
  const processedPairs = /* @__PURE__ */ new Set();
  Object.values(people).forEach((person) => {
    if (!person || !person.id) return;
    (person.spouses || []).forEach((spouseId) => {
      if (!spouseId) return;
      if (person.id === spouseId) return;
      if (!people[spouseId]) return;
      const [p1, p2] = [person.id, spouseId].sort();
      const pairKey = `${p1}__spouse__${p2}`;
      if (processedPairs.has(pairKey)) return;
      processedPairs.add(pairKey);
      const id = crypto.randomUUID();
      edges[id] = {
        id,
        treeId,
        fromPersonId: p1,
        toPersonId: p2,
        type: "SPOUSE",
        status: "ACTIVE",
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
    });
    (person.parents || []).forEach((parentId) => {
      if (!parentId) return;
      if (person.id === parentId) return;
      if (!people[parentId]) return;
      const pairKey = `${parentId}__parent__${person.id}`;
      if (processedPairs.has(pairKey)) return;
      processedPairs.add(pairKey);
      const id = crypto.randomUUID();
      edges[id] = {
        id,
        treeId,
        fromPersonId: parentId,
        toPersonId: person.id,
        type: "BIOLOGICAL_PARENT",
        status: "ACTIVE",
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
    });
    (person.children || []).forEach((childId) => {
      if (!childId) return;
      if (person.id === childId) return;
      if (!people[childId]) return;
      const pairKey = `${person.id}__parent__${childId}`;
      if (processedPairs.has(pairKey)) return;
      processedPairs.add(pairKey);
      const id = crypto.randomUUID();
      edges[id] = {
        id,
        treeId,
        fromPersonId: person.id,
        toPersonId: childId,
        type: "BIOLOGICAL_PARENT",
        status: "ACTIVE",
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
    });
  });
  return edges;
}
function syncRelationshipsWithPeople(currentEdges, treeId, people) {
  const derived = deriveRelationshipsFromPeople(treeId, people);
  const nextEdges = {};
  Object.values(derived).forEach((derivedEdge) => {
    const existing = Object.values(currentEdges).find((edge) => {
      const isParentTypeMatch = derivedEdge.type !== "SPOUSE" && derivedEdge.type !== "PARTNER" && edge.type !== "SPOUSE" && edge.type !== "PARTNER";
      const isSpouseTypeMatch = (derivedEdge.type === "SPOUSE" || derivedEdge.type === "PARTNER") && (edge.type === "SPOUSE" || edge.type === "PARTNER");
      return edge.fromPersonId === derivedEdge.fromPersonId && edge.toPersonId === derivedEdge.toPersonId && edge.treeId === treeId && (isParentTypeMatch || isSpouseTypeMatch);
    });
    if (existing) {
      nextEdges[existing.id] = existing;
    } else {
      nextEdges[derivedEdge.id] = derivedEdge;
    }
  });
  return nextEdges;
}

// src/types/citation.ts
import CryptoJS from "crypto-js";
var LEGACY_DERIVED_CITATION_ORIGIN = "migration";
function isLegacyDerivedCitationOrigin(origin) {
  return origin === LEGACY_DERIVED_CITATION_ORIGIN || origin === "LEGACY_DERIVED";
}
function generateDeterministicUuid(input) {
  const hash = CryptoJS.SHA256(input).toString();
  const part1 = hash.slice(0, 8);
  const part2 = hash.slice(8, 12);
  const part3 = hash.slice(12, 16);
  const part4 = hash.slice(16, 20);
  const part5 = hash.slice(20, 32);
  const part3Overridden = "4" + part3.slice(1);
  const part4Overridden = "a" + part4.slice(1);
  return `${part1}-${part2}-${part3Overridden}-${part4Overridden}-${part5}`;
}
function getNormalizedSourceKey(treeId, type, title) {
  const cleanTitle = (title || "").trim().toLowerCase().replace(/\s+/g, " ");
  const cleanType = (type || "OTHER").trim().toUpperCase();
  return `${treeId}:${cleanType}:${cleanTitle}`;
}
function mapToSourceType(type) {
  if (!type) return "OTHER";
  const upper = type.toUpperCase();
  if (["DOCUMENT", "ORAL", "PHOTO", "ARCHIVE", "BOOK", "WEBSITE", "OTHER"].includes(upper)) {
    return upper;
  }
  if (upper === "SOURCE" || upper === "LINK") return "DOCUMENT";
  return "OTHER";
}
function deriveSourcesAndCitationsFromPeople(treeId, people) {
  const sources = {};
  const citations = {};
  const createdAt = (/* @__PURE__ */ new Date()).toISOString();
  Object.values(people).forEach((person) => {
    if (!person || !person.id) return;
    (person.sources || []).forEach((src) => {
      if (!src || !src.title) return;
      const type = mapToSourceType(src.type);
      const normalizedKey = getNormalizedSourceKey(treeId, type, src.title);
      const sourceId = generateDeterministicUuid(normalizedKey);
      if (!sources[sourceId]) {
        sources[sourceId] = {
          id: sourceId,
          treeId,
          type,
          title: src.title,
          normalizedKey,
          url: src.url || void 0,
          date: src.date || void 0,
          origin: LEGACY_DERIVED_CITATION_ORIGIN,
          createdAt
        };
      }
      const citationKey = `${treeId}:${sourceId}:PERSON:${person.id}:person.profile.sources`;
      const citationId = generateDeterministicUuid(citationKey);
      if (!citations[citationId]) {
        citations[citationId] = {
          id: citationId,
          treeId,
          sourceId,
          targetType: "PERSON",
          targetId: person.id,
          targetField: "person.profile.sources",
          origin: LEGACY_DERIVED_CITATION_ORIGIN,
          createdAt
        };
      }
    });
    if (person.birthSource && person.birthSource.trim()) {
      const type = "DOCUMENT";
      const normalizedKey = getNormalizedSourceKey(treeId, type, person.birthSource);
      const sourceId = generateDeterministicUuid(normalizedKey);
      if (!sources[sourceId]) {
        sources[sourceId] = {
          id: sourceId,
          treeId,
          type,
          title: person.birthSource,
          normalizedKey,
          origin: LEGACY_DERIVED_CITATION_ORIGIN,
          createdAt
        };
      }
      const citationKey = `${treeId}:${sourceId}:PERSON:${person.id}:person.birth.date`;
      const citationId = generateDeterministicUuid(citationKey);
      if (!citations[citationId]) {
        citations[citationId] = {
          id: citationId,
          treeId,
          sourceId,
          targetType: "PERSON",
          targetId: person.id,
          targetField: "person.birth.date",
          confidence: "HIGH",
          origin: LEGACY_DERIVED_CITATION_ORIGIN,
          createdAt
        };
      }
    }
    if (person.deathSource && person.deathSource.trim()) {
      const type = "DOCUMENT";
      const normalizedKey = getNormalizedSourceKey(treeId, type, person.deathSource);
      const sourceId = generateDeterministicUuid(normalizedKey);
      if (!sources[sourceId]) {
        sources[sourceId] = {
          id: sourceId,
          treeId,
          type,
          title: person.deathSource,
          normalizedKey,
          origin: LEGACY_DERIVED_CITATION_ORIGIN,
          createdAt
        };
      }
      const citationKey = `${treeId}:${sourceId}:PERSON:${person.id}:person.death.date`;
      const citationId = generateDeterministicUuid(citationKey);
      if (!citations[citationId]) {
        citations[citationId] = {
          id: citationId,
          treeId,
          sourceId,
          targetType: "PERSON",
          targetId: person.id,
          targetField: "person.death.date",
          confidence: "HIGH",
          origin: LEGACY_DERIVED_CITATION_ORIGIN,
          createdAt
        };
      }
    }
  });
  return { sources, citations };
}
function mergeDerivedSourcesAndCitations(currentSources, currentCitations, derivedSources, derivedCitations) {
  const preservedSources = Object.fromEntries(
    Object.entries(currentSources).filter(([, source]) => !isLegacyDerivedCitationOrigin(source.origin))
  );
  const preservedCitations = Object.fromEntries(
    Object.entries(currentCitations).filter(([, citation]) => !isLegacyDerivedCitationOrigin(citation.origin))
  );
  return {
    sources: {
      ...preservedSources,
      ...derivedSources
    },
    citations: {
      ...preservedCitations,
      ...derivedCitations
    }
  };
}

// src/constants.ts
var resolvedAppVersion = typeof __APP_VERSION__ !== "undefined" && __APP_VERSION__ ? __APP_VERSION__ : "dev";
var viteEnv2 = typeof import.meta !== "undefined" ? import.meta.env : void 0;
var GOOGLE_CLIENT_ID = viteEnv2?.VITE_GOOGLE_CLIENT_ID;
var GOOGLE_API_KEY = viteEnv2?.VITE_GOOGLE_API_KEY;
var FILE_NAME = "MyTreeData.json";
var DEFAULT_PERSON_TEMPLATE = {
  title: "",
  firstName: "New",
  middleName: "",
  lastName: "Person",
  birthName: "",
  nickName: "",
  suffix: "",
  gender: "male",
  birthDate: "",
  birthPlace: "",
  birthSource: "",
  marriageDate: "",
  marriagePlace: "",
  deathDate: "",
  deathPlace: "",
  deathSource: "",
  burialPlace: "",
  residence: "",
  isDeceased: false,
  profession: "",
  company: "",
  interests: "",
  bio: "",
  photoUrl: "",
  gallery: [],
  voiceNotes: [],
  sources: [],
  events: [],
  // Contact
  email: "",
  website: "",
  blog: "",
  address: "",
  // Relationships (stored as IDs)
  parents: [],
  spouses: [],
  children: [],
  partnerDetails: {}
};
var DEFAULT_TREE_SETTINGS = {
  showPhotos: true,
  showFirstName: true,
  showDates: true,
  showBirthDate: true,
  showMarriageDate: false,
  showDeathDate: true,
  showBirthPlace: false,
  showMarriagePlace: false,
  showBurialPlace: false,
  showResidence: false,
  showMiddleName: false,
  showLastName: true,
  showNickname: false,
  layoutMode: "vertical",
  isCompact: false,
  chartType: "focus",
  theme: "modern",
  privacyMode: false,
  lineStyle: "step",
  lineThickness: 2,
  showDeceased: true,
  showGender: true,
  showOccupation: false,
  showSuffix: false,
  showPrefix: false,
  showMaidenName: false,
  highlightBranch: false,
  highlightedBranchRootId: null,
  nodeSpacingX: 120,
  nodeSpacingY: 400,
  nodeWidth: 170,
  textSize: 12,
  themeColor: "#E1AD01",
  boxColorLogic: "gender",
  generationLimit: 6,
  isLowGraphicsMode: false
};

// src/utils/safeUrl.ts
var ALLOWED_EXTERNAL_URL_PROTOCOLS = /* @__PURE__ */ new Set(["http:", "https:", "mailto:"]);
var getSafeExternalUrl = (rawUrl) => {
  const value = rawUrl?.trim();
  if (!value) return null;
  try {
    const parsed = new URL(value);
    return ALLOWED_EXTERNAL_URL_PROTOCOLS.has(parsed.protocol) ? parsed.href : null;
  } catch {
    return null;
  }
};
var sanitizeExternalUrl = (rawUrl) => getSafeExternalUrl(rawUrl) ?? void 0;

// src/utils/familyLogic.ts
var createPerson = (gender = "male") => ({
  id: crypto.randomUUID(),
  ...DEFAULT_PERSON_TEMPLATE,
  gender,
  firstName: "New",
  lastName: "Person",
  metadata: {
    lastUpdated: {},
    lastUpdatedOps: {}
  }
});
var validatePerson = (p) => {
  const defaults = createPerson(p.gender || "male");
  const sources = Array.isArray(p.sources) ? p.sources.map((source) => ({
    ...source,
    url: sanitizeExternalUrl(source.url)
  })) : [];
  return {
    ...defaults,
    ...p,
    id: p.id || defaults.id,
    parents: Array.isArray(p.parents) ? p.parents : [],
    spouses: Array.isArray(p.spouses) ? p.spouses : [],
    children: Array.isArray(p.children) ? p.children : [],
    gallery: Array.isArray(p.gallery) ? p.gallery : [],
    voiceNotes: Array.isArray(p.voiceNotes) ? p.voiceNotes : [],
    sources,
    events: Array.isArray(p.events) ? p.events : [],
    partnerDetails: p.partnerDetails || {},
    metadata: {
      ...p.metadata,
      lastUpdated: {
        ...p.metadata?.lastUpdated || {}
      },
      lastUpdatedOps: {
        ...p.metadata?.lastUpdatedOps || {}
      }
    },
    // Ensure vital strings exist
    firstName: p.firstName ?? "",
    lastName: p.lastName ?? "",
    birthSource: p.birthSource ?? "",
    deathSource: p.deathSource ?? ""
  };
};

// src/domain/familyTreeOperations.ts
var removeId = (arr, idToRemove) => arr.filter((id) => id !== idToRemove);
var performDeletePerson = (people, idToDelete) => {
  const nextPeople = { ...people };
  const target = nextPeople[idToDelete];
  if (!target) return people;
  target.parents?.forEach((parentId) => {
    if (nextPeople[parentId]) {
      nextPeople[parentId] = {
        ...nextPeople[parentId],
        children: removeId(nextPeople[parentId].children || [], idToDelete)
      };
    }
  });
  target.children?.forEach((childId) => {
    if (nextPeople[childId]) {
      nextPeople[childId] = {
        ...nextPeople[childId],
        parents: removeId(nextPeople[childId].parents || [], idToDelete)
      };
    }
  });
  target.spouses?.forEach((spouseId) => {
    if (nextPeople[spouseId]) {
      const spouse = nextPeople[spouseId];
      const newPartnerDetails = { ...spouse.partnerDetails || {} };
      delete newPartnerDetails[idToDelete];
      nextPeople[spouseId] = {
        ...spouse,
        spouses: removeId(spouse.spouses || [], idToDelete),
        partnerDetails: newPartnerDetails
      };
    }
  });
  delete nextPeople[idToDelete];
  return nextPeople;
};
var performAddParent = (people, currentId, gender, relatedPersonId) => {
  const current = people[currentId];
  if (!current || current.parents.length >= 2) return null;
  const newParent = createPerson(gender);
  newParent.children = [currentId];
  if (gender === "male") {
    newParent.lastName = current.lastName;
  }
  const nextPeople = { ...people };
  const currentParentUpdate = { ...current, parents: [...current.parents, newParent.id] };
  const newParentUpdate = { ...newParent };
  if (current.parents.length === 1) {
    const existingParentId = relatedPersonId || current.parents[0];
    const existingParent = nextPeople[existingParentId];
    if (existingParent && !existingParent.spouses.includes(newParent.id)) {
      newParentUpdate.spouses = [...newParentUpdate.spouses, existingParentId];
      nextPeople[existingParentId] = {
        ...existingParent,
        spouses: [...existingParent.spouses, newParent.id]
      };
    }
  }
  nextPeople[newParent.id] = newParentUpdate;
  nextPeople[currentId] = currentParentUpdate;
  return { updatedPeople: nextPeople, newId: newParent.id };
};
var performAddSpouse = (people, currentId, gender) => {
  const current = people[currentId];
  if (!current) return null;
  const newSpouse = createPerson(gender);
  newSpouse.spouses = [currentId];
  const nextPeople = {
    ...people,
    [newSpouse.id]: newSpouse,
    [currentId]: {
      ...current,
      spouses: [...current.spouses, newSpouse.id]
    }
  };
  return { updatedPeople: nextPeople, newId: newSpouse.id };
};
var performAddChild = (people, currentId, gender, relatedPersonId) => {
  const current = people[currentId];
  if (!current) return null;
  let inheritedLastName = current.lastName;
  const selectedCoParentId = relatedPersonId || (current.spouses.length === 1 ? current.spouses[0] : void 0);
  if (current.gender === "female" && selectedCoParentId) {
    const spouse = people[selectedCoParentId];
    if (spouse && spouse.gender === "male") inheritedLastName = spouse.lastName;
  }
  const newChild = createPerson(gender);
  newChild.lastName = inheritedLastName;
  newChild.parents = [currentId];
  const nextPeople = { ...people };
  const newChildUpdate = { ...newChild };
  const currentUpdate = { ...current };
  if (selectedCoParentId) {
    const spouseId = selectedCoParentId;
    const spouse = nextPeople[spouseId];
    if (spouse) {
      newChildUpdate.parents.push(spouseId);
      nextPeople[spouseId] = {
        ...spouse,
        children: [...spouse.children, newChild.id]
      };
    }
  }
  currentUpdate.children = [...current.children, newChild.id];
  nextPeople[newChild.id] = newChildUpdate;
  nextPeople[currentId] = currentUpdate;
  return { updatedPeople: nextPeople, newId: newChild.id };
};
var performLinkPerson = (people, currentId, targetId, type, relatedPersonId) => {
  const nextPeople = { ...people };
  const current = nextPeople[currentId];
  const target = nextPeople[targetId];
  if (!current || !target) return people;
  if (type === "parent") {
    if (current.parents.includes(targetId) || current.parents.length >= 2) return people;
    nextPeople[currentId] = { ...current, parents: [...current.parents, targetId] };
    nextPeople[targetId] = { ...target, children: [...target.children, currentId] };
    if (current.parents.length === 1) {
      const otherParentId = relatedPersonId || current.parents[0];
      const otherParent = nextPeople[otherParentId];
      if (otherParent && !otherParent.spouses.includes(targetId)) {
        nextPeople[otherParentId] = { ...otherParent, spouses: [...otherParent.spouses, targetId] };
        nextPeople[targetId] = {
          ...nextPeople[targetId],
          spouses: [...nextPeople[targetId].spouses, otherParentId]
        };
      }
    }
  } else if (type === "spouse") {
    if (current.spouses.includes(targetId)) return people;
    nextPeople[currentId] = { ...current, spouses: [...current.spouses, targetId] };
    nextPeople[targetId] = { ...target, spouses: [...target.spouses, currentId] };
  } else if (type === "child") {
    if (current.children.includes(targetId) || target.parents.length >= 2) return people;
    nextPeople[currentId] = { ...current, children: [...current.children, targetId] };
    nextPeople[targetId] = { ...target, parents: [...target.parents, currentId] };
    const coParentId = relatedPersonId || (current.spouses.length === 1 ? current.spouses[0] : void 0);
    if (coParentId) {
      const spouseId = coParentId;
      const spouse = nextPeople[spouseId];
      if (spouse && !target.parents.includes(spouseId) && target.parents.length < 2) {
        nextPeople[spouseId] = { ...spouse, children: [...spouse.children, targetId] };
        nextPeople[targetId] = {
          ...nextPeople[targetId],
          parents: [...nextPeople[targetId].parents, spouseId]
        };
      }
    }
  }
  return nextPeople;
};
var performRemoveRelationship = (people, id1, id2, type) => {
  const nextPeople = { ...people };
  const p1 = nextPeople[id1];
  const p2 = nextPeople[id2];
  if (!p1 || !p2) return people;
  if (type === "parent") {
    nextPeople[id1] = { ...p1, parents: removeId(p1.parents, id2) };
    nextPeople[id2] = { ...p2, children: removeId(p2.children, id1) };
  } else if (type === "child") {
    nextPeople[id1] = { ...p1, children: removeId(p1.children, id2) };
    nextPeople[id2] = { ...p2, parents: removeId(p2.parents, id1) };
  } else if (type === "spouse") {
    nextPeople[id1] = { ...p1, spouses: removeId(p1.spouses, id2) };
    nextPeople[id2] = { ...p2, spouses: removeId(p2.spouses, id1) };
    if (nextPeople[id1].partnerDetails) delete nextPeople[id1].partnerDetails[id2];
    if (nextPeople[id2].partnerDetails) delete nextPeople[id2].partnerDetails[id1];
  }
  return nextPeople;
};

// src/domain/FamilyDomainReducer.ts
var assertUnreachable = (value, context) => {
  throw new Error(`Unhandled ${context}: ${String(value)}`);
};
var uniqueIds = (ids = []) => Array.from(new Set(ids.filter(Boolean)));
var normalizePersonRelationships = (person) => ({
  ...person,
  parents: uniqueIds(person.parents),
  spouses: uniqueIds(person.spouses),
  children: uniqueIds(person.children)
});
var relationalPersonKeys = /* @__PURE__ */ new Set(["parents", "spouses", "children", "partnerDetails"]);
var shouldOverwriteProperty = (currentTimestamp, currentClientId, currentClientVersion, incomingTimestamp, incomingClientId, incomingClientVersion) => {
  if (!incomingTimestamp) return true;
  if (!currentTimestamp) return true;
  if (incomingTimestamp > currentTimestamp) return true;
  if (incomingTimestamp < currentTimestamp) return false;
  const inClient = incomingClientId || "";
  const curClient = currentClientId || "";
  if (inClient > curClient) return true;
  if (inClient < curClient) return false;
  const inVer = incomingClientVersion || 0;
  const curVer = currentClientVersion || 0;
  return inVer > curVer;
};
var addRemotePerson = (people, person, relativeId, relationshipType, updatedAt, clientId, clientVersion) => {
  const initTimestamp = updatedAt || (/* @__PURE__ */ new Date()).toISOString();
  const initClientId = clientId || "";
  const initClientVersion = clientVersion || 0;
  const lastUpdated = {};
  const lastUpdatedOps = {};
  Object.keys(person).forEach((key) => {
    if (key !== "parents" && key !== "spouses" && key !== "children" && key !== "partnerDetails" && key !== "metadata" && key !== "id") {
      lastUpdated[key] = initTimestamp;
      lastUpdatedOps[key] = { client_id: initClientId, client_version: initClientVersion };
    }
  });
  const normalized = normalizePersonRelationships(person);
  const initializedPerson = {
    ...normalized,
    metadata: {
      ...normalized.metadata,
      lastUpdated: {
        ...lastUpdated,
        ...normalized.metadata?.lastUpdated || {}
      },
      lastUpdatedOps: {
        ...lastUpdatedOps,
        ...normalized.metadata?.lastUpdatedOps || {}
      }
    }
  };
  const nextPeople = {
    ...people,
    [person.id]: initializedPerson
  };
  if (!relativeId || !relationshipType || !nextPeople[relativeId]) {
    return nextPeople;
  }
  const relative = nextPeople[relativeId];
  if (relationshipType === "parent") {
    nextPeople[relativeId] = {
      ...relative,
      parents: uniqueIds([...relative.parents || [], person.id])
    };
  } else if (relationshipType === "child") {
    nextPeople[relativeId] = {
      ...relative,
      children: uniqueIds([...relative.children || [], person.id])
    };
  } else if (relationshipType === "spouse") {
    nextPeople[relativeId] = {
      ...relative,
      spouses: uniqueIds([...relative.spouses || [], person.id])
    };
  }
  return nextPeople;
};
var applyFamilyDomainAction = (people, action) => {
  switch (action.type) {
    case "updatePerson": {
      const current = people[action.id];
      if (!current) return { people };
      const updatedAt = action.updatedAt;
      const clientId = action.clientId;
      const clientVersion = action.clientVersion;
      const updatedFields = {};
      const newLastUpdated = { ...current.metadata?.lastUpdated || {} };
      const newLastUpdatedOps = { ...current.metadata?.lastUpdatedOps || {} };
      const setUpdatedField = (key, value) => {
        updatedFields[key] = value;
      };
      Object.keys(action.updates).forEach((key) => {
        const val = action.updates[key];
        if (val === void 0) return;
        if (relationalPersonKeys.has(key)) {
          setUpdatedField(key, val);
          return;
        }
        const metadataKey = String(key);
        const currentTs = newLastUpdated[metadataKey];
        const currentOp = newLastUpdatedOps[metadataKey];
        if (shouldOverwriteProperty(
          currentTs,
          currentOp?.client_id,
          currentOp?.client_version,
          updatedAt,
          clientId,
          clientVersion
        )) {
          setUpdatedField(key, val);
          if (updatedAt) {
            newLastUpdated[metadataKey] = updatedAt;
            newLastUpdatedOps[metadataKey] = {
              client_id: clientId || "",
              client_version: clientVersion || 0
            };
          }
        }
      });
      if (Object.keys(updatedFields).length === 0) {
        return { people };
      }
      const mergedPerson = {
        ...current,
        ...updatedFields,
        metadata: {
          ...current.metadata,
          lastUpdated: newLastUpdated,
          lastUpdatedOps: newLastUpdatedOps
        }
      };
      return {
        people: {
          ...people,
          [action.id]: validatePerson(mergedPerson)
        }
      };
    }
    case "addParent": {
      const result = performAddParent(people, action.targetId, action.gender, action.relatedPersonId);
      return result ? { people: result.updatedPeople, newId: result.newId } : null;
    }
    case "addSpouse": {
      const result = performAddSpouse(people, action.targetId, action.gender);
      return result ? { people: result.updatedPeople, newId: result.newId } : null;
    }
    case "addChild": {
      const result = performAddChild(people, action.targetId, action.gender, action.relatedPersonId);
      return result ? { people: result.updatedPeople, newId: result.newId } : null;
    }
    case "addRemotePerson":
      return { people: addRemotePerson(people, action.person, action.relativeId, action.relationshipType, action.updatedAt, action.clientId, action.clientVersion) };
    case "deletePerson":
      return { people: performDeletePerson(people, action.id) };
    case "linkPerson":
      return {
        people: performLinkPerson(people, action.focusId, action.existingId, action.relationshipType, action.relatedPersonId)
      };
    case "removeRelationship":
      return { people: performRemoveRelationship(people, action.targetId, action.relativeId, action.relationshipType) };
    default:
      return assertUnreachable(action, "family domain action");
  }
};
var reduceFamilyDomain = (people, action) => applyFamilyDomainAction(people, action)?.people ?? null;

// src/utils/db.ts
import Dexie from "dexie";
var JOZOR_DB_SCHEMA_VERSION = 9;
var JozorDatabase = class extends Dexie {
  people;
  settings;
  pending_operations;
  person_tombstones;
  person_media_cleanup;
  archive_import_cleanup;
  export_history;
  relationships;
  sources;
  citations;
  constructor() {
    super("JozorDB");
    this.version(JOZOR_DB_SCHEMA_VERSION).stores({
      people: "id",
      settings: "key",
      pending_operations: "++id, tree_id",
      person_tombstones: "[tree_id+person_id], tree_id, person_id, deleted_at",
      person_media_cleanup: "++id, &dedupe_key, tree_id, user_id, next_attempt_at",
      archive_import_cleanup: "tree_id, user_id, next_attempt_at",
      export_history: "++id, publicationId, treeId, templateId, exportType, createdAt",
      relationships: "id, treeId, fromPersonId, toPersonId, type, [treeId+fromPersonId], [treeId+toPersonId], [treeId+type]",
      sources: "id, treeId, type, normalizedKey, [treeId+type], [treeId+normalizedKey]",
      citations: "id, treeId, sourceId, targetType, targetId, targetField, [treeId+targetId], [treeId+sourceId], [treeId+targetType], [treeId+targetType+targetId]"
    });
  }
};
var db = new JozorDatabase();

// src/services/storageService.ts
var getLocalDb = async () => {
  return db;
};
var LOCAL_TREE_SCOPE = "__local__";
var normalizeTreeScope = (treeId) => treeId || LOCAL_TREE_SCOPE;
var activeUserRole = null;
var storageService = {
  setRole(role) {
    activeUserRole = role;
  },
  // --- People Data ---
  async saveFullTree(people, treeId) {
    try {
      const db2 = await getLocalDb();
      const peopleArray = Object.values(people);
      await db2.transaction("rw", [db2.people, db2.relationships, db2.sources, db2.citations, db2.settings], async () => {
        const activeTreeId = treeId || "default-tree";
        if (peopleArray.length === 0) {
          await db2.people.clear();
          await db2.settings.delete("currentTreeId");
          await db2.relationships.where("treeId").equals(activeTreeId).delete();
          await db2.sources.where("treeId").equals(activeTreeId).delete();
          await db2.citations.where("treeId").equals(activeTreeId).delete();
          return;
        }
        await db2.people.bulkPut(peopleArray);
        await db2.settings.put({ key: "currentTreeId", value: activeTreeId });
        const dbCount = await db2.people.count();
        if (dbCount > peopleArray.length) {
          const dbIds = await db2.people.toCollection().primaryKeys();
          const memIds = new Set(Object.keys(people));
          const toDelete = dbIds.filter((id) => typeof id === "string" && !memIds.has(id));
          if (toDelete.length > 0) await db2.people.bulkDelete(toDelete);
        }
        const derivedEdges = deriveRelationshipsFromPeople(activeTreeId, people);
        await db2.relationships.where("treeId").equals(activeTreeId).delete();
        const edgesArray = Object.values(derivedEdges);
        if (edgesArray.length > 0) {
          await db2.relationships.bulkPut(edgesArray);
        }
        const { sources: derivedSources, citations: derivedCitations } = deriveSourcesAndCitationsFromPeople(activeTreeId, people);
        const existingSources = await db2.sources.where("treeId").equals(activeTreeId).toArray();
        const existingCitations = await db2.citations.where("treeId").equals(activeTreeId).toArray();
        const merged = mergeDerivedSourcesAndCitations(
          Object.fromEntries(existingSources.map((source) => [source.id, source])),
          Object.fromEntries(existingCitations.map((citation) => [citation.id, citation])),
          derivedSources,
          derivedCitations
        );
        const sourceIdsToDelete = existingSources.map((source) => source.id).filter((id) => !merged.sources[id]);
        const citationIdsToDelete = existingCitations.map((citation) => citation.id).filter((id) => !merged.citations[id]);
        if (sourceIdsToDelete.length > 0) await db2.sources.bulkDelete(sourceIdsToDelete);
        if (citationIdsToDelete.length > 0) await db2.citations.bulkDelete(citationIdsToDelete);
        const sourcesArray = Object.values(merged.sources);
        if (sourcesArray.length > 0) {
          await db2.sources.bulkPut(sourcesArray);
        }
        const citationsArray = Object.values(merged.citations);
        if (citationsArray.length > 0) {
          await db2.citations.bulkPut(citationsArray);
        }
      });
    } catch (e) {
      logError("storageService saveFullTree", e, {
        category: "DATABASE",
        severity: "MEDIUM",
        metadata: { operationType: "save_full_tree" }
      });
    }
  },
  async createSnapshot(people, treeId) {
    try {
      await this.saveFullTree(people, treeId);
      logInfo("storageService createSnapshot", "Memory snapshot created and consolidated.", {
        operationType: "create_snapshot"
      });
    } catch (e) {
      logError("storageService createSnapshot", e, {
        category: "DATABASE",
        severity: "MEDIUM",
        metadata: { operationType: "create_snapshot" }
      });
    }
  },
  async loadFullTree() {
    const db2 = await getLocalDb();
    const allPeople = await db2.people.toArray();
    const map = {};
    allPeople.forEach((p) => {
      map[p.id] = p;
    });
    return map;
  },
  async savePerson(person) {
    const db2 = await getLocalDb();
    await db2.people.put(person);
  },
  async savePeople(people) {
    if (people.length === 0) return;
    const db2 = await getLocalDb();
    await db2.people.bulkPut(people);
  },
  async deletePerson(id) {
    const db2 = await getLocalDb();
    await db2.people.delete(id);
  },
  async recordDeletedPersonId(treeId, personId) {
    const db2 = await getLocalDb();
    const tombstone = {
      tree_id: normalizeTreeScope(treeId),
      person_id: personId,
      deleted_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    await db2.person_tombstones.put(tombstone);
  },
  async recordDeletedPersonIds(treeId, personIds) {
    if (personIds.length === 0) return;
    const db2 = await getLocalDb();
    const treeScope = normalizeTreeScope(treeId);
    const deletedAt = (/* @__PURE__ */ new Date()).toISOString();
    await db2.person_tombstones.bulkPut(
      Array.from(new Set(personIds)).map((personId) => ({
        tree_id: treeScope,
        person_id: personId,
        deleted_at: deletedAt
      }))
    );
  },
  async removeDeletedPersonId(treeId, personId) {
    const db2 = await getLocalDb();
    await db2.person_tombstones.delete([normalizeTreeScope(treeId), personId]);
  },
  async getDeletedPersonIds(treeId) {
    const db2 = await getLocalDb();
    const treeScope = normalizeTreeScope(treeId);
    const rows = await db2.person_tombstones.where("tree_id").equals(treeScope).toArray();
    return rows.map((row) => row.person_id);
  },
  // --- Relationships Data ---
  async saveRelationships(relationships) {
    if (relationships.length === 0) return;
    const db2 = await getLocalDb();
    await db2.relationships.bulkPut(relationships);
  },
  async deleteRelationships(ids) {
    if (ids.length === 0) return;
    const db2 = await getLocalDb();
    await db2.relationships.bulkDelete(ids);
  },
  async loadRelationships(treeId) {
    const db2 = await getLocalDb();
    return await db2.relationships.where("treeId").equals(treeId).toArray();
  },
  async clearRelationships() {
    const db2 = await getLocalDb();
    await db2.relationships.clear();
  },
  // --- Sources Data ---
  async saveSources(sources) {
    if (sources.length === 0) return;
    const db2 = await getLocalDb();
    await db2.sources.bulkPut(sources);
  },
  async deleteSources(ids) {
    if (ids.length === 0) return;
    const db2 = await getLocalDb();
    await db2.sources.bulkDelete(ids);
  },
  async loadSources(treeId) {
    const db2 = await getLocalDb();
    return await db2.sources.where("treeId").equals(treeId).toArray();
  },
  // --- Citations Data ---
  async saveCitations(citations) {
    if (citations.length === 0) return;
    const db2 = await getLocalDb();
    await db2.citations.bulkPut(citations);
  },
  async deleteCitations(ids) {
    if (ids.length === 0) return;
    const db2 = await getLocalDb();
    await db2.citations.bulkDelete(ids);
  },
  async loadCitations(treeId) {
    const db2 = await getLocalDb();
    return await db2.citations.where("treeId").equals(treeId).toArray();
  },
  // --- Settings & Metadata ---
  async saveSetting(key, value) {
    const db2 = await getLocalDb();
    await db2.settings.put({ key, value });
  },
  async getSetting(key, defaultValue) {
    const db2 = await getLocalDb();
    const entry = await db2.settings.get(key);
    return entry ? entry.value : defaultValue;
  },
  async removeSetting(key) {
    const db2 = await getLocalDb();
    await db2.settings.delete(key);
  },
  async savePendingOperation(op) {
    const db2 = await getLocalDb();
    return await db2.pending_operations.add(op);
  },
  async savePendingOperations(ops) {
    if (ops.length === 0) return [];
    const db2 = await getLocalDb();
    return await db2.transaction("rw", db2.pending_operations, async () => {
      return await db2.pending_operations.bulkAdd(ops, { allKeys: true });
    });
  },
  async getPendingOperations(treeId) {
    const db2 = await getLocalDb();
    return await db2.pending_operations.where("tree_id").equals(treeId).toArray();
  },
  async deletePendingOperation(id) {
    const db2 = await getLocalDb();
    await db2.pending_operations.delete(id);
  },
  async bulkDeletePendingOperations(ids) {
    const db2 = await getLocalDb();
    await db2.pending_operations.bulkDelete(ids);
  },
  async updatePendingOperationRetryCounts(updates) {
    if (updates.length === 0) return;
    const db2 = await getLocalDb();
    await db2.transaction("rw", db2.pending_operations, async () => {
      await Promise.all(
        updates.map(
          ({ id, retryCount }) => db2.pending_operations.update(id, { retryCount })
        )
      );
    });
  },
  async clearActiveTreeCache(treeId) {
    try {
      const db2 = await getLocalDb();
      const activeTreeId = treeId || "default-tree";
      const cachedTreeIdEntry = await db2.settings.get("currentTreeId");
      const cachedTreeId = cachedTreeIdEntry ? cachedTreeIdEntry.value : null;
      await db2.transaction("rw", [db2.people, db2.relationships, db2.sources, db2.citations, db2.person_tombstones, db2.pending_operations, db2.settings], async () => {
        if (!cachedTreeId || cachedTreeId === activeTreeId) {
          await db2.people.clear();
          await db2.settings.delete("currentTreeId");
        }
        await db2.relationships.where("treeId").equals(activeTreeId).delete();
        await db2.sources.where("treeId").equals(activeTreeId).delete();
        await db2.citations.where("treeId").equals(activeTreeId).delete();
        await db2.person_tombstones.where("tree_id").equals(activeTreeId).delete();
        await db2.pending_operations.where("tree_id").equals(activeTreeId).delete();
      });
      logInfo("storageService clearActiveTreeCache", `Cleared local cache for tree ${activeTreeId}`, {
        treeId: activeTreeId
      });
    } catch (e) {
      logError("storageService clearActiveTreeCache", e, {
        category: "DATABASE",
        severity: "MEDIUM",
        metadata: { treeId, operationType: "clear_active_tree_cache" }
      });
    }
  }
};
var writeOperations = /* @__PURE__ */ new Set([
  "saveFullTree",
  "createSnapshot",
  "savePerson",
  "savePeople",
  "deletePerson",
  "recordDeletedPersonId",
  "recordDeletedPersonIds",
  "removeDeletedPersonId",
  "saveRelationships",
  "deleteRelationships",
  "clearRelationships",
  "saveSources",
  "deleteSources",
  "saveCitations",
  "deleteCitations",
  "saveSetting",
  "removeSetting",
  "savePendingOperation",
  "savePendingOperations",
  "deletePendingOperation",
  "bulkDeletePendingOperations",
  "updatePendingOperationRetryCounts"
]);
for (const key of Object.keys(storageService)) {
  if (writeOperations.has(key)) {
    const originalMethod = storageService[key];
    storageService[key] = function(...args) {
      if (activeUserRole === "viewer") {
        if (key === "savePendingOperation") return Promise.resolve(0);
        if (key === "savePendingOperations") return Promise.resolve([]);
        return Promise.resolve();
      }
      return originalMethod.apply(this, args);
    };
  }
}

// src/services/sync/syncInstance.ts
var clientInstanceId = `client_${crypto.randomUUID()}_${Date.now()}`;

// src/utils/privacyUtils.ts
function calculateAge(birthDateStr) {
  if (!birthDateStr) return -1;
  const trimmed = birthDateStr.trim();
  if (!trimmed) return -1;
  let date;
  if (/^\d{4}$/.test(trimmed)) {
    date = /* @__PURE__ */ new Date(`${trimmed}-01-01`);
  } else if (/^\d{4}-\d{2}$/.test(trimmed)) {
    date = /* @__PURE__ */ new Date(`${trimmed}-01`);
  } else {
    date = new Date(trimmed);
  }
  if (Number.isNaN(date.getTime())) return -1;
  const now = /* @__PURE__ */ new Date();
  let age = now.getFullYear() - date.getFullYear();
  const hasHadBirthday = now.getMonth() > date.getMonth() || now.getMonth() === date.getMonth() && now.getDate() >= date.getDate();
  if (!hasHadBirthday) age -= 1;
  return age;
}
function isPersonLiving(person) {
  if (person.isDeceased === true) return false;
  if (person.deathDate && person.deathDate.trim() !== "") return false;
  if (person.birthDate && person.birthDate.trim() !== "") {
    const age = calculateAge(person.birthDate);
    if (age > 110) return false;
  }
  return true;
}
function shouldMaskPerson(person) {
  return person.isPrivate === true || isPersonLiving(person);
}
function maskPerson(person) {
  if (!shouldMaskPerson(person)) return person;
  const maskedPartnerDetails = {};
  if (person.partnerDetails) {
    for (const [spouseId, relInfo] of Object.entries(person.partnerDetails)) {
      maskedPartnerDetails[spouseId] = {
        type: relInfo.type,
        startDate: "",
        startPlace: "",
        endDate: "",
        endPlace: ""
      };
    }
  }
  return {
    ...person,
    // Mask name
    firstName: "Private",
    middleName: "",
    lastName: "",
    birthName: "",
    nickName: "",
    title: "",
    suffix: "",
    // Clear dates, places, sources, bio
    birthDate: "",
    birthPlace: "",
    birthSource: "",
    marriageDate: "",
    marriagePlace: "",
    deathDate: "",
    deathPlace: "",
    deathSource: "",
    burialPlace: "",
    residence: "",
    currentResidence: "",
    occupation: "",
    workplace: "",
    profession: "",
    company: "",
    interests: "",
    bio: "",
    photoUrl: void 0,
    photoPath: void 0,
    photoAsset: void 0,
    photoVersion: void 0,
    gallery: [],
    voiceNotes: [],
    sources: [],
    events: [],
    email: "",
    website: "",
    blog: "",
    address: "",
    partnerDetails: maskedPartnerDetails
    // Note: id, gender, parents, children, spouses, isDeceased, isPrivate, and metadata are preserved!
  };
}
function maskPeopleMap(people) {
  const result = {};
  for (const [id, person] of Object.entries(people)) {
    result[id] = maskPerson(person);
  }
  return result;
}

// src/domain/treePermissionPolicy.ts
var TREE_EDIT_FORBIDDEN_ERROR = "Unauthorized: This tree cannot be edited with the current role.";
var isLocalTreeContext = (currentTreeId) => currentTreeId === null;
var canEditTreeContext = ({
  currentTreeId,
  role
}) => {
  if (role === "owner" || role === "editor") return true;
  if (role === "viewer") return false;
  return isLocalTreeContext(currentTreeId);
};
var assertCanEditTreeContext = (context) => {
  if (!canEditTreeContext(context)) {
    throw new Error(TREE_EDIT_FORBIDDEN_ERROR);
  }
};

// src/store/slices/familySlice.ts
var getInitialFamilyState = () => {
  const initialId = crypto.randomUUID();
  const initialPerson = {
    id: initialId,
    ...DEFAULT_PERSON_TEMPLATE,
    firstName: "Me",
    lastName: "",
    gender: "male"
  };
  return {
    people: { [initialId]: initialPerson },
    relationships: {},
    sources: {},
    citations: {},
    focusId: initialId
  };
};
var resolveValidFocusId = (people, preferredFocusId) => preferredFocusId && people[preferredFocusId] ? preferredFocusId : Object.keys(people)[0] || "";
var filterDeletedPeople = (people, deletedIds) => {
  if (deletedIds.size === 0) return people;
  return Object.fromEntries(
    Object.entries(people).filter(([id]) => !deletedIds.has(id))
  );
};
var assertFamilyMutationAllowed = (get) => {
  const state = get();
  assertCanEditTreeContext({
    currentTreeId: state.currentTreeId,
    role: state.currentUserRole
  });
};
var createFamilySlice = (originalSet, get) => {
  const set = (partial, replace) => {
    originalSet((state) => {
      const nextState = typeof partial === "function" ? partial(state) : partial;
      const updated = { ...nextState };
      const currentRole = updated.currentUserRole !== void 0 ? updated.currentUserRole : state.currentUserRole;
      const isViewer = currentRole === "viewer";
      if (isViewer) {
        if (updated.people) {
          updated.people = maskPeopleMap(updated.people);
        } else if (state.people && updated.currentUserRole === "viewer") {
          updated.people = maskPeopleMap(state.people);
        }
        if (updated.confirmedPeople) {
          updated.confirmedPeople = maskPeopleMap(updated.confirmedPeople);
        } else if (state.confirmedPeople && updated.currentUserRole === "viewer") {
          updated.confirmedPeople = maskPeopleMap(state.confirmedPeople);
        }
      }
      if (updated.people && updated.people !== state.people) {
        const treeId = updated.currentTreeId || state.currentTreeId || "default-tree";
        const currentRels = updated.relationships || state.relationships || {};
        updated.relationships = syncRelationshipsWithPeople(currentRels, treeId, updated.people);
        const { sources: derivedSources, citations: derivedCitations } = deriveSourcesAndCitationsFromPeople(treeId, updated.people);
        const merged = mergeDerivedSourcesAndCitations(
          updated.sources || state.sources || {},
          updated.citations || state.citations || {},
          derivedSources,
          derivedCitations
        );
        updated.sources = merged.sources;
        updated.citations = merged.citations;
      }
      if (updated.confirmedPeople && updated.confirmedPeople !== state.confirmedPeople) {
        const treeId = updated.currentTreeId || state.currentTreeId || "default-tree";
        const currentRels = updated.relationships || state.relationships || {};
        updated.relationships = syncRelationshipsWithPeople(currentRels, treeId, updated.confirmedPeople);
        const { sources: derivedSources, citations: derivedCitations } = deriveSourcesAndCitationsFromPeople(treeId, updated.confirmedPeople);
        const merged = mergeDerivedSourcesAndCitations(
          updated.sources || state.sources || {},
          updated.citations || state.citations || {},
          derivedSources,
          derivedCitations
        );
        updated.sources = merged.sources;
        updated.citations = merged.citations;
      }
      return updated;
    }, replace);
  };
  const initial = getInitialFamilyState();
  return {
    // Initial State
    people: initial.people,
    confirmedPeople: initial.people,
    relationships: initial.relationships,
    sources: initial.sources,
    citations: initial.citations,
    locations: {},
    focusId: initial.focusId,
    searchTarget: null,
    treeName: "Family Lineage",
    peopleVersion: 0,
    deletedPersonIds: /* @__PURE__ */ new Set(),
    // Actions
    setTreeName: (name) => set({ treeName: name }),
    setPeople: (people, addToHistory = true) => {
      const current = get().people;
      const deletedIds = get().deletedPersonIds;
      const filteredPeople = filterDeletedPeople(people, deletedIds);
      if (addToHistory) get().pushToHistory(current);
      set((state) => ({
        confirmedPeople: filteredPeople,
        people: filteredPeople,
        peopleVersion: state.peopleVersion + 1,
        focusId: resolveValidFocusId(filteredPeople, state.focusId)
      }));
    },
    setConfirmedPeople: (people) => set({ confirmedPeople: people }),
    setRelationships: (relationships) => set({ relationships }),
    updateRelationshipType: (id, type) => {
      const edge = get().relationships[id];
      if (!edge) return;
      const updatedEdge = { ...edge, type, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
      set((state) => ({
        relationships: { ...state.relationships, [id]: updatedEdge }
      }));
    },
    setSources: (sources) => set({ sources }),
    setCitations: (citations) => set({ citations }),
    addSource: (source) => set((state) => ({
      sources: { ...state.sources, [source.id]: source }
    })),
    updateSource: (id, updates) => {
      const current = get().sources[id];
      if (!current) return;
      const updated = { ...current, ...updates, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
      set((state) => ({
        sources: { ...state.sources, [id]: updated }
      }));
    },
    deleteSource: (id) => set((state) => {
      const nextSources = { ...state.sources };
      delete nextSources[id];
      const nextCitations = { ...state.citations };
      Object.keys(nextCitations).forEach((cid) => {
        if (nextCitations[cid].sourceId === id) {
          delete nextCitations[cid];
        }
      });
      return { sources: nextSources, citations: nextCitations };
    }),
    addCitation: (citation) => set((state) => ({
      citations: { ...state.citations, [citation.id]: citation }
    })),
    removeCitation: (id) => set((state) => {
      const nextCitations = { ...state.citations };
      delete nextCitations[id];
      return { citations: nextCitations };
    }),
    setDeletedPersonIds: (ids) => {
      const deletedPersonIds = new Set(ids);
      const filteredPeople = filterDeletedPeople(get().people, deletedPersonIds);
      set((state) => ({
        deletedPersonIds,
        people: filteredPeople,
        peopleVersion: filteredPeople === state.people ? state.peopleVersion : state.peopleVersion + 1,
        focusId: resolveValidFocusId(filteredPeople, state.focusId)
      }));
    },
    addDeletedPersonId: (id) => {
      const deletedPersonIds = new Set(get().deletedPersonIds);
      deletedPersonIds.add(id);
      set({ deletedPersonIds });
    },
    setFocusId: (id) => set({ focusId: id }),
    setSearchTarget: (id) => {
      if (id) {
        get().triggerPulse?.(id);
      }
      set({ searchTarget: id ? { id, timestamp: Date.now() } : null });
    },
    updatePerson: (id, updates, _bypassSync = false, addToHistory = true) => {
      assertFamilyMutationAllowed(get);
      const currentPeople = get().people;
      const nextClientVersion = get().localClientVersion + 1;
      const updatedPeople = reduceFamilyDomain(currentPeople, {
        type: "updatePerson",
        id,
        updates,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        clientId: clientInstanceId,
        clientVersion: nextClientVersion
      });
      if (!updatedPeople || updatedPeople === currentPeople) return;
      if (addToHistory) get().pushToHistory(currentPeople);
      set((state) => ({
        people: updatedPeople,
        peopleVersion: state.peopleVersion + 1
      }));
    },
    deletePerson: (id, _bypassSync = false, addToHistory = true) => {
      assertFamilyMutationAllowed(get);
      const currentPeople = get().people;
      const { focusId } = get();
      const newPeople = reduceFamilyDomain(currentPeople, { type: "deletePerson", id });
      if (newPeople === currentPeople) return;
      if (!newPeople) return;
      const nextFocusId = focusId === id ? Object.keys(newPeople)[0] || "" : focusId;
      const newDeletedPersonIds = new Set(get().deletedPersonIds);
      newDeletedPersonIds.add(id);
      void storageService.recordDeletedPersonId(get().currentTreeId, id).catch((error) => {
        logError("familySlice deletePerson recordDeletedPersonId", error, {
          category: "DATABASE",
          severity: "MEDIUM",
          metadata: { personId: id, treeId: get().currentTreeId, operationType: "record_deleted_person_id" }
        });
      });
      if (addToHistory) get().pushToHistory(currentPeople);
      set((state) => ({
        people: newPeople,
        peopleVersion: state.peopleVersion + 1,
        focusId: nextFocusId,
        deletedPersonIds: newDeletedPersonIds
      }));
    },
    addParent: (gender, _bypassSync = false, relatedPersonId, targetPersonId) => {
      assertFamilyMutationAllowed(get);
      const currentPeople = get().people;
      const { focusId } = get();
      const targetId = targetPersonId || focusId;
      const res = applyFamilyDomainAction(currentPeople, {
        type: "addParent",
        targetId,
        gender,
        relatedPersonId
      });
      if (!res) return null;
      const newId = res.newId;
      if (!newId) return null;
      get().pushToHistory(currentPeople);
      set({
        people: res.people,
        peopleVersion: get().peopleVersion + 1,
        focusId: newId
      });
      return { updatedPeople: res.people, newId };
    },
    addSpouse: (gender, _bypassSync = false, relatedPersonId) => {
      assertFamilyMutationAllowed(get);
      const currentPeople = get().people;
      const { focusId } = get();
      const targetId = relatedPersonId || focusId;
      const res = applyFamilyDomainAction(currentPeople, {
        type: "addSpouse",
        targetId,
        gender
      });
      if (!res) return null;
      const newId = res.newId;
      if (!newId) return null;
      get().pushToHistory(currentPeople);
      set({
        people: res.people,
        peopleVersion: get().peopleVersion + 1,
        focusId: newId
      });
      return { updatedPeople: res.people, newId };
    },
    addChild: (gender, _bypassSync = false, relatedPersonId, targetPersonId) => {
      assertFamilyMutationAllowed(get);
      const currentPeople = get().people;
      const { focusId } = get();
      const targetId = targetPersonId || focusId;
      const res = applyFamilyDomainAction(currentPeople, {
        type: "addChild",
        targetId,
        gender,
        relatedPersonId
      });
      if (!res) return null;
      const newId = res.newId;
      if (!newId) return null;
      get().pushToHistory(currentPeople);
      set({
        people: res.people,
        peopleVersion: get().peopleVersion + 1,
        focusId: newId
      });
      return { updatedPeople: res.people, newId };
    },
    removeRelationship: (targetId, relativeId, type, _bypassSync = false, addToHistory = true) => {
      assertFamilyMutationAllowed(get);
      const currentPeople = get().people;
      const updatedPeople = reduceFamilyDomain(currentPeople, {
        type: "removeRelationship",
        targetId,
        relativeId,
        relationshipType: type
      });
      if (!updatedPeople) return;
      if (addToHistory) get().pushToHistory(currentPeople);
      set((state) => ({
        people: updatedPeople,
        peopleVersion: state.peopleVersion + 1
      }));
    },
    linkPerson: (existingId, type, _bypassSync = false, addToHistory = true, relatedPersonId) => {
      assertFamilyMutationAllowed(get);
      if (!type) return;
      const currentPeople = get().people;
      const { focusId } = get();
      const updatedPeople = reduceFamilyDomain(currentPeople, {
        type: "linkPerson",
        focusId,
        existingId,
        relationshipType: type,
        relatedPersonId
      });
      if (!updatedPeople) return;
      if (addToHistory) get().pushToHistory(currentPeople);
      set((state) => ({
        people: updatedPeople,
        peopleVersion: state.peopleVersion + 1
      }));
    },
    loadCloudData: (cloudPeople) => {
      const deletedIds = get().deletedPersonIds;
      const filteredPeople = filterDeletedPeople(cloudPeople, deletedIds);
      set((state) => ({
        confirmedPeople: filteredPeople,
        people: filteredPeople,
        peopleVersion: state.peopleVersion + 1,
        focusId: resolveValidFocusId(filteredPeople, state.focusId)
      }));
      get().clearHistory();
    },
    startNewTree: () => {
      const initial2 = getInitialFamilyState();
      set((state) => ({
        confirmedPeople: initial2.people,
        people: initial2.people,
        peopleVersion: state.peopleVersion + 1,
        focusId: initial2.focusId,
        deletedPersonIds: /* @__PURE__ */ new Set()
      }));
      get().clearHistory();
    },
    handleImport: (importedPeople) => {
      const deletedIds = get().deletedPersonIds;
      const filteredPeople = filterDeletedPeople(importedPeople, deletedIds);
      set((state) => ({
        confirmedPeople: filteredPeople,
        people: filteredPeople,
        peopleVersion: state.peopleVersion + 1,
        focusId: resolveValidFocusId(filteredPeople, state.focusId)
      }));
      get().clearHistory();
    },
    addFirstPerson: (gender) => {
      assertFamilyMutationAllowed(get);
      const currentPeople = get().people;
      const newPerson = {
        ...createPerson(gender),
        firstName: "Me",
        lastName: ""
      };
      get().pushToHistory(currentPeople);
      set((state) => ({
        confirmedPeople: { [newPerson.id]: newPerson },
        people: { [newPerson.id]: newPerson },
        peopleVersion: state.peopleVersion + 1,
        focusId: newPerson.id
      }));
    },
    addLocation: (placeName, data) => set((state) => ({
      locations: { ...state.locations, [placeName]: data }
    })),
    updateLocationStatus: (placeName, status) => set((state) => {
      const loc = state.locations[placeName];
      if (!loc) return state;
      return {
        locations: {
          ...state.locations,
          [placeName]: { ...loc, status }
        }
      };
    })
  };
};

// src/domain/chartTypeAdapter.ts
function normalizeChartType(chartType) {
  return chartType === "radial" ? "radial" : "focus";
}

// src/store/slices/settingsSlice.ts
var createSettingsSlice = (set) => ({
  // Initial State
  treeSettings: DEFAULT_TREE_SETTINGS,
  darkMode: typeof window !== "undefined" ? localStorage.getItem("theme") === "dark" : false,
  language: typeof window !== "undefined" && (localStorage.getItem("language") === "en" || localStorage.getItem("language") === "ar") ? localStorage.getItem("language") : "ar",
  exportStatus: { isExporting: false },
  isActivityLogOpen: false,
  isLowGraphicsMode: (() => {
    if (typeof window === "undefined") return false;
    try {
      const legacyStorage = localStorage.getItem("jozor-ui-storage");
      if (legacyStorage) {
        const parsed = JSON.parse(legacyStorage);
        return !!parsed?.state?.isLowGraphicsMode;
      }
    } catch {
    }
    return false;
  })(),
  // Actions
  setTreeSettings: (settings) => set((state) => {
    const resolved = typeof settings === "function" ? settings(state.treeSettings) : settings;
    if (resolved && resolved.chartType) {
      resolved.chartType = normalizeChartType(resolved.chartType);
    }
    return {
      treeSettings: {
        ...DEFAULT_TREE_SETTINGS,
        ...resolved
      }
    };
  }),
  setDarkMode: (dark) => set({ darkMode: dark }),
  setLanguage: (lang) => set(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("language", lang);
    }
    return { language: lang };
  }),
  importSettings: (settings) => set((state) => {
    const nextSettings = { ...settings };
    if (nextSettings.treeSettings) {
      const chartType = nextSettings.treeSettings.chartType;
      nextSettings.treeSettings = {
        ...state.treeSettings,
        ...nextSettings.treeSettings,
        chartType: normalizeChartType(chartType ?? nextSettings.treeSettings.chartType ?? state.treeSettings.chartType)
      };
    }
    return { ...state, ...nextSettings };
  }),
  setExportStatus: (status) => set({ exportStatus: status }),
  setActivityLogOpen: (open) => set({ isActivityLogOpen: open }),
  setIsLowGraphicsMode: (isLow) => set(() => {
    if (typeof window !== "undefined") {
      try {
        const existing = localStorage.getItem("jozor-ui-storage");
        const parsed = existing ? JSON.parse(existing) : { state: {} };
        parsed.state = { ...parsed.state, isLowGraphicsMode: isLow };
        localStorage.setItem("jozor-ui-storage", JSON.stringify(parsed));
      } catch {
      }
    }
    return { isLowGraphicsMode: isLow };
  })
});

// src/services/google/googleUtils.ts
var loadScript = (src, id) => {
  return new Promise((resolve, reject) => {
    if (document.getElementById(id)) {
      resolve();
      return;
    }
    if (src.includes("api.js") && window.gapi) {
      resolve();
      return;
    }
    if (src.includes("gsi/client") && window.google?.accounts) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.id = id;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script ${src}`));
    document.head.appendChild(script);
  });
};
var waitForGlobal = (key, timeout = 1e4) => new Promise((resolve, reject) => {
  const win = window;
  if (win[key]) return resolve();
  const startTime = Date.now();
  const interval = setInterval(() => {
    if (win[key]) {
      clearInterval(interval);
      resolve();
    } else if (Date.now() - startTime > timeout) {
      clearInterval(interval);
      reject(new Error(`Timeout waiting for ${key} to load`));
    }
  }, 100);
});

// src/services/google/GoogleApiService.ts
var SCOPES = "https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email";
var DISCOVERY_DOCS = [
  "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest",
  "https://www.googleapis.com/discovery/v1/apis/oauth2/v2/rest"
];
var SCRIPTS = {
  GAPI: "https://apis.google.com/js/api.js",
  GSI: "https://accounts.google.com/gsi/client"
};
var GoogleApiService = class {
  isInitialized = false;
  tokenClient;
  codeClient;
  initPromise = null;
  clientId;
  constructor(clientId = GOOGLE_CLIENT_ID || "") {
    this.clientId = clientId;
  }
  getTokenClient() {
    return this.tokenClient;
  }
  getCodeClient() {
    return this.codeClient;
  }
  async initialize() {
    if (typeof window === "undefined") return;
    if (this.initPromise) return this.initPromise;
    if (this.isInitialized && this.tokenClient) return Promise.resolve();
    this.initPromise = (async () => {
      if (!this.clientId) {
        console.warn("Google Client ID is not configured. Google Drive features will be disabled.");
        this.isInitialized = false;
        return;
      }
      try {
        await Promise.all([
          loadScript(SCRIPTS.GAPI, "gapi-script"),
          loadScript(SCRIPTS.GSI, "google-gsi-script")
        ]);
        await Promise.all([waitForGlobal("gapi"), waitForGlobal("google")]);
        await new Promise((resolve, reject) => {
          if (!gapi) {
            reject(new Error("GAPI global not found"));
            return;
          }
          gapi.load("client:picker", async () => {
            try {
              await gapi.client.init({
                discoveryDocs: DISCOVERY_DOCS
              });
              resolve();
            } catch (e) {
              reject(e);
            }
          });
        });
        if (google?.accounts?.oauth2) {
          this.tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: this.clientId,
            scope: SCOPES,
            callback: () => {
            }
          });
          this.codeClient = google.accounts.oauth2.initCodeClient({
            client_id: this.clientId,
            scope: SCOPES,
            ux_mode: "popup",
            callback: () => {
            }
          });
        } else {
          throw new Error("Google Identity Services not available");
        }
        this.isInitialized = true;
      } catch (err) {
        console.error("Google Init Failed:", err);
        this.isInitialized = false;
        this.initPromise = null;
        throw err;
      }
    })();
    return this.initPromise;
  }
};

// src/services/supabaseAuthService.ts
var getCleanOrigin = () => window.location.origin.replace(/\/$/, "");
var normalizeSupabaseAuthError = (error) => {
  if (error instanceof Error) {
    const message = error.message.trim();
    const lower = message.toLowerCase();
    if (lower.includes("invalid login credentials")) return "Incorrect email or password.";
    if (lower.includes("email not confirmed")) return "Please confirm your email address before signing in.";
    if (lower.includes("user already registered") || lower.includes("already registered")) return "This email is already registered.";
    if (lower.includes("password should be at least")) return "Password must be at least 6 characters.";
    if (lower.includes("invalid email")) return "Please enter a valid email address.";
    if (lower.includes("signup is disabled")) return "Sign up is currently unavailable.";
    if (lower.includes("oauth") && lower.includes("cancel")) return "Google sign-in was cancelled.";
    if (message) return message;
  }
  return "Authentication failed. Please try again.";
};
var wrapAuthError = (error) => {
  throw new Error(normalizeSupabaseAuthError(error));
};
var supabaseAuthService = {
  normalizeAuthError: normalizeSupabaseAuthError,
  async startGoogleSignIn(returnTo) {
    const redirectTo = returnTo || getCleanOrigin();
    const { error } = await supabaseAuth.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: {
          prompt: "select_account"
        }
      }
    });
    if (error) {
      wrapAuthError(error);
    }
  },
  async signInWithPassword(email, password) {
    const { data, error } = await supabaseAuth.auth.signInWithPassword({
      email,
      password
    });
    if (error) {
      wrapAuthError(error);
    }
    authTokenService.setStoredSupabaseToken(data.session?.access_token ?? null);
    return data.session ?? null;
  },
  async signUpWithPassword(email, password, displayName) {
    const { data, error } = await supabaseAuth.auth.signUp({
      email,
      password,
      options: {
        data: displayName ? { display_name: displayName } : void 0,
        emailRedirectTo: getCleanOrigin()
      }
    });
    if (error) {
      wrapAuthError(error);
    }
    authTokenService.setStoredSupabaseToken(data.session?.access_token ?? null);
    return data.session ?? null;
  },
  async sendPasswordReset(email) {
    const { error } = await supabaseAuth.auth.resetPasswordForEmail(email, {
      redirectTo: getCleanOrigin()
    });
    if (error) {
      wrapAuthError(error);
    }
  },
  async signOut() {
    const { error } = await supabaseAuth.auth.signOut();
    authTokenService.setStoredSupabaseToken(null);
    if (error) {
      wrapAuthError(error);
    }
  },
  async forgetDeletedAccount() {
    const clearLocal = () => {
      for (const suffix of ["", "-code-verifier", "-user"]) {
        try {
          localStorage.removeItem(SUPABASE_SESSION_STORAGE_KEY + suffix);
        } catch {
        }
      }
      try {
        authTokenService.setStoredSupabaseToken(null);
      } catch {
      }
    };
    clearLocal();
    let timeout;
    try {
      await Promise.race([
        (async () => {
          try {
            await supabaseAuth.auth.stopAutoRefresh();
            clearLocal();
            await supabaseAuth.auth.signOut({ scope: "local" });
          } finally {
            clearLocal();
          }
        })(),
        new Promise((resolve) => {
          timeout = setTimeout(resolve, 3e3);
        })
      ]);
    } catch {
    } finally {
      clearTimeout(timeout);
      clearLocal();
    }
  },
  getSession() {
    return supabaseAuth.auth.getSession();
  },
  onAuthStateChange(callback) {
    return supabaseAuth.auth.onAuthStateChange(callback);
  }
};

// src/services/google/GoogleAuthService.ts
var readExchangeResponse = async (response) => {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return {};
  }
  try {
    return await response.json();
  } catch {
    return {};
  }
};
var GoogleAuthService = class _GoogleAuthService {
  apiService;
  static TOKEN_KEY = "jozor_google_access_token";
  static TOKEN_EXPIRY_KEY = "jozor_google_token_expiry";
  constructor(apiService) {
    this.apiService = apiService;
  }
  loginPromise = null;
  async loginWithSupabase(returnTo) {
    await supabaseAuthService.startGoogleSignIn(returnTo);
  }
  persistToken(access_token, supabase_token) {
    const expiry = Date.now() + 55 * 60 * 1e3;
    localStorage.setItem(_GoogleAuthService.TOKEN_KEY, access_token);
    localStorage.setItem(_GoogleAuthService.TOKEN_EXPIRY_KEY, String(expiry));
    if (supabase_token) {
      authTokenService.setStoredSupabaseToken(supabase_token);
    }
    logInfo("GoogleAuthService persistToken", "Token stored in localStorage.", {
      hasAccessToken: Boolean(access_token),
      expiry: new Date(expiry).toISOString()
    });
  }
  clearPersistedToken() {
    localStorage.removeItem(_GoogleAuthService.TOKEN_KEY);
    localStorage.removeItem(_GoogleAuthService.TOKEN_EXPIRY_KEY);
    authTokenService.setStoredSupabaseToken(null);
  }
  tryRestorePersistedToken(user) {
    const token = localStorage.getItem(_GoogleAuthService.TOKEN_KEY);
    const supabaseToken = authTokenService.getStoredSupabaseToken();
    const expiry = Number(localStorage.getItem(_GoogleAuthService.TOKEN_EXPIRY_KEY) || "0");
    logInfo("GoogleAuthService tryRestore", "Checking localStorage for token...", {
      hasToken: !!token,
      isExpired: expiry <= Date.now(),
      expiry: new Date(expiry).toISOString()
    });
    if (token && expiry > Date.now()) {
      if (typeof gapi !== "undefined" && gapi.client) {
        gapi.client.setToken({ access_token: token });
        if (user && supabaseToken) {
          user.supabaseToken = supabaseToken;
        }
        logInfo("GoogleAuthService tryRestore", "Restored token successfully into gapi.client.");
        return true;
      } else {
        logWarn("GoogleAuthService tryRestore", "Token found but gapi.client not ready.");
      }
    } else if (token) {
      logWarn("GoogleAuthService tryRestore", "Token found but it is expired. Clearing.");
      this.clearPersistedToken();
    }
    return false;
  }
  async login() {
    if (this.loginPromise) return this.loginPromise;
    this.loginPromise = (async () => {
      if (!this.apiService.isInitialized) {
        await this.apiService.initialize();
      }
      const codeClient = this.apiService.getCodeClient();
      if (!codeClient) {
        throw new Error("Google API (Code Client) not initialized.");
      }
      return new Promise((resolve, reject) => {
        const gapiClient = window.gapi;
        codeClient.callback = async (resp) => {
          if (resp.error) {
            this.loginPromise = null;
            return reject(resp.error);
          }
          try {
            const exchangeRes = await fetch("/api/auth/exchange", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ code: resp.code })
            });
            const data = await readExchangeResponse(exchangeRes);
            if (!exchangeRes.ok) {
              throw new Error(data.error || "Token exchange failed");
            }
            const { access_token, supabase_token, user } = data;
            if (!access_token || !user) {
              throw new Error("Token exchange response was incomplete");
            }
            this.persistToken(access_token, supabase_token);
            logInfo("GoogleAuthService login", "Token persisted successfully.");
            if (typeof gapiClient !== "undefined" && gapiClient.client) {
              gapiClient.client.setToken({ access_token });
            }
            const profileWithToken = {
              ...user,
              supabaseToken: supabase_token
            };
            resolve(profileWithToken);
          } catch (error) {
            logError("GoogleAuthService login exchange", error, {
              category: "AUTH",
              severity: "HIGH",
              metadata: { operationType: "google_token_exchange" }
            });
            reject(new Error(error instanceof Error ? error.message : "Failed to authenticate with server."));
          } finally {
            this.loginPromise = null;
          }
        };
        codeClient.requestCode();
      });
    })();
    return this.loginPromise;
  }
  async ensureTokenValid(shouldLogin = true) {
    if (!this.apiService.isInitialized) {
      await this.apiService.initialize();
    }
    if (!window.gapi?.client) {
      let retry = 0;
      while (!window.gapi?.client && retry < 10) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        retry++;
      }
    }
    if (typeof gapi === "undefined" || !gapi.client) {
      logWarn("GoogleAuthService ensureTokenValid", "GAPI client is not ready yet.", {
        category: "AUTH",
        metadata: { operationType: "google_token_validation" }
      });
      return false;
    }
    let token = gapi.client.getToken();
    if (!token || !token.access_token) {
      if (this.tryRestorePersistedToken()) {
        token = gapi.client.getToken();
      }
    }
    if (!token || !token.access_token) {
      logWarn("GoogleAuthService ensureTokenValid", "No Google token found in gapi.client or localStorage.", {
        category: "AUTH",
        metadata: { operationType: "google_token_validation" }
      });
      if (shouldLogin) {
        logWarn("GoogleAuthService ensureTokenValid", "Triggering Google login popup because no valid token is available.", {
          category: "AUTH",
          metadata: { operationType: "google_login_popup" }
        });
        await this.login();
        return true;
      }
      return false;
    }
    try {
    } catch {
      return false;
    }
    return true;
  }
  logout() {
    this.clearPersistedToken();
    if (typeof gapi !== "undefined" && gapi.client) {
      const token = gapi.client.getToken();
      if (token !== null) {
        if (typeof google !== "undefined" && google.accounts && google.accounts.oauth2) {
          google.accounts.oauth2.revoke(token.access_token, () => {
          });
        }
        gapi.client.setToken(null);
      }
    }
  }
};

// src/services/google/GoogleDriveApiGuard.ts
var GoogleDriveApiGuard = class {
  constructor(apiService) {
    this.apiService = apiService;
  }
  async ensureInitialized() {
    if (this.apiService.isInitialized && window.gapi?.client?.drive) {
      return;
    }
    logInfo("GoogleDriveService ensureInitialized", "Initializing Google Drive API service.");
    await this.apiService.initialize();
    if (!window.gapi?.client?.drive) {
      throw new Error("Google Drive API failed to initialize.");
    }
  }
};

// src/services/google/googleDriveServiceUtils.ts
var ARCHIVE_SNAPSHOT_EXTENSION = ".jozor";
var JSON_MIME_TYPE = "application/json";
var ARCHIVE_MIME_TYPE = "application/zip";
var getDriveErrorStatus = (error) => {
  if (typeof error !== "object" || error === null) return void 0;
  const driveError = error;
  return driveError.status ?? driveError.result?.error?.code;
};
var getDriveErrorMessage = (error, fallback) => {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};
var buildSnapshotFileName = (treeId, label, timestamp = /* @__PURE__ */ new Date()) => {
  const normalizedTimestamp = timestamp.toISOString().replace(/[:.]/g, "-");
  const safeLabel = label.replace(/[^a-zA-Z0-9-_]/g, "_");
  return `snapshot_${treeId}_${normalizedTimestamp}_${safeLabel}${ARCHIVE_SNAPSHOT_EXTENSION}`;
};
var isSupportedSnapshotFile = (name, mimeType) => {
  const normalizedName = name.toLowerCase();
  return normalizedName.endsWith(ARCHIVE_SNAPSHOT_EXTENSION) && (mimeType === "" || mimeType === ARCHIVE_MIME_TYPE || mimeType === "application/octet-stream");
};

// src/services/google/DriveFilesClient.ts
var DriveFilesClient = class {
  constructor(ensureInitialized) {
    this.ensureInitialized = ensureInitialized;
  }
  async findLatestJozorFile() {
    await this.ensureInitialized();
    try {
      const response = await gapi.client.drive.files.list({
        q: `mimeType='${JSON_MIME_TYPE}' and name='${FILE_NAME}' and trashed = false`,
        fields: "files(id, name, modifiedTime)",
        spaces: "appDataFolder",
        orderBy: "modifiedTime desc",
        pageSize: 1
      });
      const files = response.result.files;
      return files && files.length > 0 ? files[0].id || null : null;
    } catch (e) {
      logError("GoogleDriveService findLatestJozorFile", e, { showToast: false });
      return null;
    }
  }
  async listJozorFiles() {
    await this.ensureInitialized();
    try {
      const response = await gapi.client.drive.files.list({
        q: `mimeType='${JSON_MIME_TYPE}' and trashed = false`,
        fields: "files(id, name, modifiedTime)",
        spaces: "appDataFolder",
        orderBy: "modifiedTime desc",
        pageSize: 100
      });
      return response.result.files?.map((f) => ({
        id: f.id || "",
        name: f.name || "",
        modifiedTime: f.modifiedTime || ""
      })) || [];
    } catch (e) {
      logError("GoogleDriveService listJozorFiles", e, {
        category: "NETWORK",
        severity: "MEDIUM",
        metadata: { operationType: "list_drive_files" }
      });
      throw e;
    }
  }
  async deleteFile(fileId) {
    await this.ensureInitialized();
    try {
      await gapi.client.drive.files.delete({ fileId });
    } catch (e) {
      logError("GoogleDriveService deleteFile", e, {
        category: "NETWORK",
        severity: "MEDIUM",
        metadata: { fileId, operationType: "delete_drive_file" }
      });
      throw e;
    }
  }
  async renameFile(fileId, newName) {
    await this.ensureInitialized();
    try {
      await gapi.client.drive.files.update({
        fileId,
        resource: { name: newName }
      });
    } catch (error) {
      logError("GoogleDriveService renameFile", error, {
        category: "NETWORK",
        severity: "MEDIUM",
        metadata: { fileId, newName, operationType: "rename_drive_file" }
      });
      throw error;
    }
  }
};

// src/services/google/DrivePayloadClient.ts
var DrivePayloadClient = class {
  constructor(ensureInitialized) {
    this.ensureInitialized = ensureInitialized;
  }
  async loadFile(fileId) {
    await this.ensureInitialized();
    try {
      const response = await gapi.client.drive.files.get({
        fileId,
        alt: "media"
      });
      if (!response || !response.result) {
        throw new Error("Empty response from Google Drive");
      }
      const result = response.result;
      const parsed = typeof result === "string" ? JSON.parse(result) : result;
      if (!parsed || typeof parsed !== "object") {
        throw new Error("Invalid data format from Google Drive");
      }
      return parsed;
    } catch (error) {
      logError("GoogleDriveService loadFile", error, {
        category: "NETWORK",
        severity: "MEDIUM",
        metadata: { fileId, operationType: "load_drive_file" }
      });
      const status = getDriveErrorStatus(error);
      if (status === 404) {
        throw new Error("File not found in Google Drive");
      } else if (status === 403) {
        throw new Error("Permission denied to access file");
      } else if (error instanceof Error && error.message) {
        throw new Error(error.message);
      } else {
        throw new Error("Failed to load file from Google Drive");
      }
    }
  }
  async saveFile(data, existingFileId, customFileName, forceNew) {
    await this.ensureInitialized();
    const fileNameToUse = this.normalizeFileName(customFileName);
    const content = JSON.stringify(data, null, 2);
    window.dispatchEvent(new CustomEvent("drive-upload-start"));
    try {
      let targetFileId = forceNew ? null : existingFileId;
      if (targetFileId) {
        targetFileId = await this.verifyExistingFile(targetFileId);
      }
      if (!targetFileId && !forceNew) {
        targetFileId = await this.findFileByName(fileNameToUse);
      }
      if (targetFileId) {
        try {
          await this.patchFileContent(targetFileId, content);
          this.emitUploadSuccess();
          return targetFileId;
        } catch (error) {
          const status = getDriveErrorStatus(error);
          logError("GoogleDriveService saveFile patch", error, {
            category: status === 401 ? "AUTH" : "NETWORK",
            severity: "MEDIUM",
            metadata: { fileId: targetFileId, status, operationType: "save_drive_file" }
          });
          if (status === 401) throw error;
          if (status === 404 || status === 410) {
            logWarn("GoogleDriveService saveFile patch", "Drive file disappeared during patch. Resetting stored file id.", {
              category: "SYNC",
              metadata: { fileId: targetFileId, status, operationType: "save_drive_file" }
            });
            targetFileId = null;
            localStorage.removeItem("jozor_gdrive_file_id");
          } else {
            throw error;
          }
        }
      }
      if (!targetFileId) {
        const newId = await this.createFileWithContent(fileNameToUse, content, forceNew);
        this.emitUploadSuccess();
        return newId;
      }
      throw new Error("Failed to synchronize file even after forced reset.");
    } catch (error) {
      const status = getDriveErrorStatus(error);
      logError("GoogleDriveService saveFile", error, {
        category: status === 401 ? "AUTH" : status === 403 ? "PERMISSION" : "NETWORK",
        severity: "HIGH",
        metadata: { fileId: existingFileId, status, operationType: "save_drive_file", forceNew: Boolean(forceNew) }
      });
      if (status === 404 || status === 410) {
        localStorage.removeItem("jozor_gdrive_file_id");
      }
      window.dispatchEvent(new CustomEvent("drive-upload-error", {
        detail: { message: getDriveErrorMessage(error, "Sync failed"), status }
      }));
      throw error;
    }
  }
  normalizeFileName(customFileName) {
    let fileNameToUse = customFileName || FILE_NAME;
    fileNameToUse = fileNameToUse.trim();
    if (!fileNameToUse || fileNameToUse.toLowerCase().includes("untitled")) {
      fileNameToUse = FILE_NAME;
    }
    if (!fileNameToUse.endsWith(".json")) {
      fileNameToUse += ".json";
    }
    return fileNameToUse;
  }
  async verifyExistingFile(fileId) {
    try {
      const fileCheck = await gapi.client.drive.files.get({
        fileId,
        fields: "id, trashed"
      });
      if (fileCheck.result.trashed) {
        logWarn("GoogleDriveService saveFile verification", "Drive file is trashed. Resetting stored file id.", {
          category: "SYNC",
          metadata: { fileId, operationType: "save_drive_file" }
        });
        localStorage.removeItem("jozor_gdrive_file_id");
        return null;
      }
      return fileId;
    } catch (error) {
      const status = getDriveErrorStatus(error);
      logWarn("GoogleDriveService saveFile verification", "Drive file verification failed before save.", {
        category: status === 401 ? "AUTH" : "SYNC",
        metadata: { fileId, status, operationType: "save_drive_file" }
      });
      if (status === 404 || status === 410) {
        logWarn("GoogleDriveService saveFile verification", "Permanent verification failure. Purging stored Drive file id.", {
          category: "SYNC",
          metadata: { fileId, status, operationType: "save_drive_file" }
        });
        localStorage.removeItem("jozor_gdrive_file_id");
        return null;
      }
      if (status === 401) throw error;
      return fileId;
    }
  }
  async findFileByName(fileName) {
    try {
      const searchResponse = await gapi.client.drive.files.list({
        q: `mimeType='application/json' and name='${fileName}' and trashed = false`,
        fields: "files(id, name)",
        spaces: "appDataFolder",
        pageSize: 1
      });
      const foundFiles = searchResponse.result.files;
      return foundFiles && foundFiles.length > 0 ? foundFiles[0].id || null : null;
    } catch {
      logWarn("GoogleDriveService saveFile searchFallback", "Searching Drive by file name failed.", {
        category: "NETWORK",
        metadata: { fileName, operationType: "save_drive_file" }
      });
      return null;
    }
  }
  async patchFileContent(fileId, content) {
    await gapi.client.request({
      path: `/upload/drive/v3/files/${fileId}`,
      method: "PATCH",
      params: { uploadType: "media" },
      body: content
    });
  }
  async createFileWithContent(fileName, content, forceNew) {
    logInfo("GoogleDriveService saveFile createFallback", "Creating a fresh Drive backup file after recovery.", {
      operationType: "save_drive_file",
      forceNew: Boolean(forceNew)
    });
    const createResponse = await gapi.client.request({
      path: "/drive/v3/files",
      method: "POST",
      body: {
        name: fileName,
        mimeType: "application/json",
        parents: ["appDataFolder"]
      }
    });
    const newId = createResponse.result.id;
    await this.patchFileContent(newId, content);
    return newId;
  }
  emitUploadSuccess() {
    window.dispatchEvent(new CustomEvent("drive-upload-success", {
      detail: { timestamp: /* @__PURE__ */ new Date() }
    }));
  }
};

// src/services/google/DriveSharingClient.ts
var DriveSharingClient = class {
  constructor(ensureInitialized) {
    this.ensureInitialized = ensureInitialized;
  }
  async shareFile(fileId, email, role = "writer") {
    await this.ensureInitialized();
    try {
      await gapi.client.drive.permissions.create({
        fileId,
        resource: {
          role,
          type: "user",
          emailAddress: email
        },
        fields: "id"
      });
    } catch (e) {
      logError("GoogleDriveService shareFile", e, {
        category: "PERMISSION",
        severity: "MEDIUM",
        metadata: { fileId, email, role, operationType: "share_drive_file" }
      });
      throw e;
    }
  }
  async unshareFile(fileId, email) {
    await this.ensureInitialized();
    try {
      const permissionsResponse = await gapi.client.drive.permissions.list({
        fileId,
        fields: "permissions(id, emailAddress)"
      });
      const permission = permissionsResponse.result.permissions?.find(
        (p) => p.emailAddress?.toLowerCase() === email.toLowerCase()
      );
      if (permission && permission.id) {
        await gapi.client.drive.permissions.delete({
          fileId,
          permissionId: permission.id
        });
      } else {
        logWarn("GoogleDriveService unshareFile", "No matching Drive permission was found for this collaborator.", {
          category: "PERMISSION",
          metadata: { fileId, email, operationType: "unshare_drive_file" }
        });
      }
    } catch (e) {
      logError("GoogleDriveService unshareFile", e, {
        category: "PERMISSION",
        severity: "MEDIUM",
        metadata: { fileId, email, operationType: "unshare_drive_file" }
      });
      throw e;
    }
  }
};

// src/services/google/DriveSnapshotsClient.ts
var DriveSnapshotsClient = class {
  constructor(ensureInitialized, deleteFile) {
    this.ensureInitialized = ensureInitialized;
    this.deleteFile = deleteFile;
  }
  async listSnapshots(treeId) {
    await this.ensureInitialized();
    try {
      const query = `name contains 'snapshot_${treeId}_' and trashed = false`;
      const response = await gapi.client.drive.files.list({
        q: query,
        fields: "files(id, name, modifiedTime, mimeType)",
        spaces: "appDataFolder",
        orderBy: "modifiedTime desc",
        pageSize: 100
      });
      return response.result.files?.filter((file) => isSupportedSnapshotFile(file.name || "", file.mimeType || "")).map((f) => ({
        id: f.id || "",
        name: f.name || "",
        modifiedTime: f.modifiedTime || ""
      })) || [];
    } catch (error) {
      const status = getDriveErrorStatus(error);
      logWarn("GoogleDriveService listSnapshots", "Failed to list snapshots.", {
        category: status === 403 ? "PERMISSION" : "NETWORK",
        metadata: { treeId, status, operationType: "list_snapshots" }
      });
      if (status === 403) {
        return [];
      }
      throw error;
    }
  }
  async saveSnapshot(data, treeId, label) {
    await this.ensureInitialized();
    const fileName = buildSnapshotFileName(treeId, label);
    try {
      const createResponse = await gapi.client.request({
        path: "/drive/v3/files",
        method: "POST",
        body: {
          name: fileName,
          mimeType: ARCHIVE_MIME_TYPE,
          parents: ["appDataFolder"]
        }
      });
      const fileId = createResponse.result.id;
      if (!fileId) {
        throw new Error("Failed to create snapshot file.");
      }
      await this.uploadSnapshotContent(fileId, data);
      return fileId;
    } catch (e) {
      logError("GoogleDriveService saveSnapshot", e, {
        category: "NETWORK",
        severity: "MEDIUM",
        metadata: { treeId, label, operationType: "save_snapshot" }
      });
      throw e;
    }
  }
  async loadSnapshotFileRaw(fileId) {
    await this.ensureInitialized();
    const token = gapi.client.getToken()?.access_token;
    if (!token) {
      throw new Error("No Google auth token available to load snapshot file.");
    }
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    if (!response.ok) {
      throw new Error(`Failed to load snapshot file: ${response.status}`);
    }
    return response.blob();
  }
  async cleanupSnapshots(treeId, keepCount = 3) {
    try {
      const snapshots = await this.listSnapshots(treeId);
      if (snapshots.length >= keepCount) {
        const toDelete = snapshots.slice(keepCount);
        logInfo("GoogleDriveService cleanupSnapshots", "Cleaning up old snapshots in parallel.", {
          treeId,
          deleteCount: toDelete.length,
          keepCount,
          operationType: "cleanup_snapshots"
        });
        await Promise.all(toDelete.map((file) => this.deleteFile(file.id)));
      }
    } catch {
      logWarn("GoogleDriveService cleanupSnapshots", "Failed to clean up old snapshots.", {
        category: "NETWORK",
        metadata: { treeId, keepCount, operationType: "cleanup_snapshots" }
      });
    }
  }
  async uploadSnapshotContent(fileId, payload) {
    const token = gapi.client.getToken()?.access_token;
    if (!token) {
      throw new Error("No Google auth token available to upload snapshot archive.");
    }
    const response = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": ARCHIVE_MIME_TYPE
      },
      body: payload
    });
    if (!response.ok) {
      throw new Error(`Failed to upload snapshot archive: ${response.status}`);
    }
  }
};

// src/services/google/GoogleDriveService.ts
var GoogleDriveService = class {
  apiGuard;
  filesClient;
  payloadClient;
  sharingClient;
  snapshotsClient;
  constructor(apiService) {
    this.apiGuard = new GoogleDriveApiGuard(apiService);
    const ensureInitialized = () => this.apiGuard.ensureInitialized();
    this.filesClient = new DriveFilesClient(ensureInitialized);
    this.payloadClient = new DrivePayloadClient(ensureInitialized);
    this.sharingClient = new DriveSharingClient(ensureInitialized);
    this.snapshotsClient = new DriveSnapshotsClient(
      ensureInitialized,
      (fileId) => this.deleteFile(fileId)
    );
  }
  async getOrCreateUserVisibleAppFolderId() {
    return "appDataFolder";
  }
  async findLatestJozorFile() {
    return this.filesClient.findLatestJozorFile();
  }
  async listJozorFiles() {
    return this.filesClient.listJozorFiles();
  }
  async deleteFile(fileId) {
    return this.filesClient.deleteFile(fileId);
  }
  async renameFile(fileId, newName) {
    return this.filesClient.renameFile(fileId, newName);
  }
  async loadFile(fileId) {
    return this.payloadClient.loadFile(fileId);
  }
  async saveFile(data, existingFileId, customFileName, forceNew) {
    return this.payloadClient.saveFile(data, existingFileId, customFileName, forceNew);
  }
  async shareFile(fileId, email, role = "writer") {
    return this.sharingClient.shareFile(fileId, email, role);
  }
  async unshareFile(fileId, email) {
    return this.sharingClient.unshareFile(fileId, email);
  }
  async listSnapshots(treeId) {
    return this.snapshotsClient.listSnapshots(treeId);
  }
  async saveSnapshot(data, treeId, label) {
    return this.snapshotsClient.saveSnapshot(data, treeId, label);
  }
  async loadSnapshotFileRaw(fileId) {
    return this.snapshotsClient.loadSnapshotFileRaw(fileId);
  }
  async cleanupSnapshots(treeId, keepCount = 3) {
    return this.snapshotsClient.cleanupSnapshots(treeId, keepCount);
  }
};

// src/services/google/GoogleMediaService.ts
var GoogleMediaService = class {
  apiService;
  driveService;
  constructor(apiService, driveService) {
    this.apiService = apiService;
    this.driveService = driveService;
  }
  ensureInitialized() {
    if (!this.apiService.isInitialized) {
      throw new Error("Google API not initialized");
    }
  }
  async pickAndDownloadImage() {
    this.ensureInitialized();
    return new Promise((resolve, reject) => {
      const win = window;
      if (!win.google?.picker) {
        return reject("Google Picker not initialized.");
      }
      const token = gapi.client.getToken()?.access_token;
      if (!token) {
        return reject("No auth token found");
      }
      const pickerCallback = async (data) => {
        if (data[win.google.picker.Response.ACTION] === win.google.picker.Action.PICKED) {
          const documents = data[win.google.picker.Response.DOCUMENTS] ?? [];
          const doc = documents[0];
          const fileId = doc[win.google.picker.Document.ID];
          try {
            const fileDetails = await gapi.client.drive.files.get({
              fileId,
              fields: "webContentLink,webViewLink"
            });
            resolve(fileDetails.result.webContentLink || fileDetails.result.webViewLink || "");
          } catch (e) {
            console.error("Drive Link Retrieval Error", e);
            reject(e);
          }
        } else if (data[win.google.picker.Response.ACTION] === win.google.picker.Action.CANCEL) {
          reject("Cancelled");
        }
      };
      const PickerView = win.google.picker.View;
      const view = new PickerView(win.google.picker.ViewId.DOCS_IMAGES);
      view.setMimeTypes("image/png,image/jpeg,image/jpg,image/webp");
      const picker = new win.google.picker.PickerBuilder().setDeveloperKey(GOOGLE_API_KEY).setAppId(GOOGLE_CLIENT_ID.split("-")[0]).setOAuthToken(token).addView(view).addView(new win.google.picker.DocsUploadView()).setCallback(pickerCallback).build();
      picker.setVisible(true);
    });
  }
  async uploadFile(file, fileName, mimeType) {
    this.ensureInitialized();
    const token = gapi.client.getToken()?.access_token;
    if (!token) throw new Error("Not authenticated to Google Drive.");
    const folderId = await this.driveService.getOrCreateUserVisibleAppFolderId();
    const metadata = {
      name: fileName,
      mimeType,
      parents: [folderId]
    };
    const form = new FormData();
    form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
    form.append("file", file);
    try {
      const response = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&spaces=drive`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: form
        }
      );
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to upload file: ${response.status} - ${errorText}`);
      }
      const result = await response.json();
      const fileId = result.id;
      const fileDetails = await gapi.client.drive.files.get({
        fileId,
        fields: "webContentLink,webViewLink"
      });
      return fileDetails.result.webContentLink || fileDetails.result.webViewLink || "";
    } catch (e) {
      console.error("Error uploading file to Drive", e);
      throw e;
    }
  }
  async fetchFileAsBlob(url) {
    const token = gapi.client.getToken()?.access_token;
    if (!token) throw new Error("No Google auth token available to fetch Drive file.");
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) throw new Error(`Failed to fetch Drive file: ${response.statusText}`);
    return response.blob();
  }
};

// src/services/googleService.ts
var googleApiService = new GoogleApiService(GOOGLE_CLIENT_ID);
var googleAuthService = new GoogleAuthService(googleApiService);
var googleDriveService = new GoogleDriveService(googleApiService);
var googleMediaService = new GoogleMediaService(googleApiService, googleDriveService);

// src/services/supabaseTreeClient.ts
var getStoredSupabaseToken = () => {
  return authTokenService.getStoredSupabaseTokenOrUndefined();
};
var getTreeClient = (uid, email, token) => getSupabaseWithAuth(uid, email, token || getStoredSupabaseToken());

// src/services/supabaseProfileService.ts
var updateUserTourStatus = async (uid, email, hasCompleted, token) => {
  const client = getTreeClient(uid, email || "", token);
  const { error } = await client.rpc("update_user_tour_status", {
    p_has_completed: hasCompleted
  });
  if (error) {
    logWarn("SupabaseProfileService updateUserTourStatus", "Failed to persist tour status.", {
      category: "DATABASE",
      metadata: { message: error.message }
    });
  }
};

// src/store/slices/authSlice.ts
var createAuthSlice = (set, get) => ({
  // Initial State
  user: null,
  isDemoMode: false,
  currentActiveDriveFileId: null,
  currentTreeId: null,
  authLoading: true,
  authError: null,
  syncStatus: {
    state: "checking",
    lastSyncTime: null,
    lastSyncSupabase: null,
    lastSyncDrive: null,
    supabaseStatus: "idle",
    driveStatus: "idle",
    pendingCount: 0,
    lastErrorAt: null
  },
  invitationTelemetry: {
    lastHydratedAt: null,
    lastHydrationCount: 0,
    lastHydrationAddedCount: 0,
    lastHydrationRemovedCount: 0,
    lastEventAt: null,
    lastEventSource: "none",
    lastEventStatus: void 0,
    lastEventInvitationId: void 0,
    lastIgnoredAt: null,
    lastIgnoredSource: "none",
    lastIgnoredStatus: void 0,
    lastOwnerEventAt: null,
    lastOwnerEventStatus: void 0,
    lastOwnerEventEmail: void 0,
    lastOwnerEventRole: void 0,
    lastOwnerEventInvitationId: void 0,
    lastErrorAt: null,
    lastErrorMessage: void 0
  },
  notificationTelemetry: {
    lastEventAt: null,
    lastEventType: "none",
    lastEventSource: "none",
    lastEventPersonId: void 0,
    lastEventDedupKey: void 0,
    lastIntegrityCount: void 0,
    lastBirthdayName: void 0,
    lastSkippedAt: null,
    lastSkippedSource: "none",
    lastSkippedReason: void 0
  },
  supabaseAccessToken: null,
  currentUserRole: null,
  isE2E: false,
  driveSyncUiStatus: "idle",
  subscriptionTier: "free",
  aiCloudQuotaRemaining: 0,
  // Actions
  setDriveSyncUiStatus: (status, message, error) => set({
    driveSyncUiStatus: status,
    driveSyncUiMessage: message,
    driveSyncUiError: error
  }),
  setUser: (user) => {
    set({
      user,
      notifications: user ? get().notifications : []
    });
    get().hydrateNotificationsFromStorage(user?.uid);
  },
  setIsDemoMode: (demo) => set({ isDemoMode: demo }),
  setCurrentActiveDriveFileId: (fileId) => set({ currentActiveDriveFileId: fileId }),
  setCurrentTreeId: (treeId) => set({ currentTreeId: treeId }),
  setAuthLoading: (loading) => set({ authLoading: loading }),
  setAuthError: (error) => set({ authError: error }),
  setSyncStatus: (status) => set({ syncStatus: status }),
  updateInvitationTelemetry: (patch) => set((state) => ({
    invitationTelemetry: {
      ...state.invitationTelemetry,
      ...patch
    }
  })),
  updateNotificationTelemetry: (patch) => set((state) => ({
    notificationTelemetry: {
      ...state.notificationTelemetry,
      ...patch
    }
  })),
  setSupabaseAccessToken: (token) => set({ supabaseAccessToken: token }),
  setCurrentUserRole: (role) => {
    storageService?.setRole?.(role);
    set({ currentUserRole: role });
    if (role === "viewer") {
      const currentPeople = get().people;
      if (currentPeople) {
        get().setPeople(currentPeople, false);
      }
      const activeTreeId = get().currentTreeId;
      if (activeTreeId) {
        void storageService?.clearActiveTreeCache?.(activeTreeId);
      }
    }
  },
  setSubscriptionTier: (tier) => set({ subscriptionTier: tier }),
  setAiCloudQuotaRemaining: (quota) => set({ aiCloudQuotaRemaining: quota }),
  updateTourStatus: async (hasCompleted) => {
    const { user } = get();
    if (!user) return;
    set({
      user: {
        ...user,
        metadata: {
          ...user.metadata || {},
          has_completed_tour: hasCompleted
        }
      }
    });
    await updateUserTourStatus(user.uid, user.email, hasCompleted);
  },
  login: async (returnTo) => {
    set({ authLoading: true, authError: null });
    try {
      await supabaseAuthService.startGoogleSignIn(returnTo);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login failed";
      set({ authError: message, authLoading: false });
      throw error;
    }
  },
  logout: async (options) => {
    if (options?.accountDeleted) {
      try {
        await supabaseAuthService.forgetDeletedAccount();
      } catch {
      }
      try {
        googleAuthService.logout();
      } catch {
      }
    } else {
      await supabaseAuthService.signOut();
      googleAuthService.logout();
    }
    clearSupabaseInstances();
    storageService?.setRole?.(null);
    set({
      user: null,
      notifications: [],
      isDemoMode: false,
      driveSyncUiStatus: "idle",
      currentActiveDriveFileId: null,
      currentTreeId: null,
      supabaseAccessToken: null,
      currentUserRole: null,
      syncStatus: {
        state: "offline",
        lastSyncTime: null,
        lastSyncSupabase: null,
        lastSyncDrive: null,
        supabaseStatus: "idle",
        driveStatus: "idle",
        pendingCount: 0,
        lastErrorAt: null
      },
      invitationTelemetry: {
        lastHydratedAt: null,
        lastHydrationCount: 0,
        lastHydrationAddedCount: 0,
        lastHydrationRemovedCount: 0,
        lastEventAt: null,
        lastEventSource: "none",
        lastEventStatus: void 0,
        lastEventInvitationId: void 0,
        lastIgnoredAt: null,
        lastIgnoredSource: "none",
        lastIgnoredStatus: void 0,
        lastOwnerEventAt: null,
        lastOwnerEventStatus: void 0,
        lastOwnerEventEmail: void 0,
        lastOwnerEventRole: void 0,
        lastOwnerEventInvitationId: void 0,
        lastErrorAt: null,
        lastErrorMessage: void 0
      },
      notificationTelemetry: {
        lastEventAt: null,
        lastEventType: "none",
        lastEventSource: "none",
        lastEventPersonId: void 0,
        lastEventDedupKey: void 0,
        lastIntegrityCount: void 0,
        lastBirthdayName: void 0,
        lastSkippedAt: null,
        lastSkippedSource: "none",
        lastSkippedReason: void 0
      }
    });
  }
});

// src/store/slices/uiSlice.ts
var NOTIFICATION_STORAGE_KEY = "jozor_persisted_notifications";
var MAX_NOTIFICATIONS = 50;
var isStorageAvailable = () => typeof window !== "undefined" && typeof window.localStorage !== "undefined";
var isNotificationExpired = (notification, now = Date.now()) => {
  if (!notification.expiresAt) return false;
  const expiresAt = Date.parse(notification.expiresAt);
  return Number.isFinite(expiresAt) && expiresAt <= now;
};
var isPersistableNotification = (notification) => {
  if (notification.type === "invitation") return true;
  if (notification.type === "integrity") return true;
  if (notification.type === "info") {
    return notification.source === "owner-realtime" || notification.source === "activity-log" || notification.source === "invitation-realtime";
  }
  return false;
};
var sanitizePersistedNotifications = (notifications3, now = Date.now()) => notifications3.filter(isPersistableNotification).filter((notification) => !isNotificationExpired(notification, now)).slice(0, MAX_NOTIFICATIONS);
var getNotificationStorageKey = (userUid) => userUid ? `${NOTIFICATION_STORAGE_KEY}:${userUid}` : null;
var loadPersistedNotifications = (userUid) => {
  if (!isStorageAvailable()) return [];
  const storageKey = getNotificationStorageKey(userUid);
  if (!storageKey) return [];
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return sanitizePersistedNotifications(parsed);
  } catch {
    return [];
  }
};
var persistNotifications = (notifications3, userUid) => {
  if (!isStorageAvailable()) return;
  const storageKey = getNotificationStorageKey(userUid);
  if (!storageKey) return;
  const sanitized = sanitizePersistedNotifications(notifications3);
  if (sanitized.length === 0) {
    window.localStorage.removeItem(storageKey);
    return;
  }
  window.localStorage.setItem(storageKey, JSON.stringify(sanitized));
};
var createUISlice = (set, get) => ({
  nodeContextMenu: null,
  setNodeContextMenu: (menu) => set({ nodeContextMenu: menu }),
  isAdvancedBarOpen: false,
  setAdvancedBarOpen: (open) => set({ isAdvancedBarOpen: open }),
  isSettingsDrawerOpen: false,
  setSettingsDrawerOpen: (open) => set({ isSettingsDrawerOpen: open }),
  isDiagnosticsDrawerOpen: false,
  setDiagnosticsDrawerOpen: (open) => set({ isDiagnosticsDrawerOpen: open }),
  isTreeControlCenterOpen: false,
  setTreeControlCenterOpen: (open) => set({ isTreeControlCenterOpen: open }),
  adminHubTab: "access",
  setAdminHubTab: (tab) => set({ adminHubTab: tab }),
  smartPersonaTab: "about",
  setSmartPersonaTab: (tab) => set({ smartPersonaTab: tab }),
  smartPersonaTargetSection: null,
  setSmartPersonaTargetSection: (section) => set({ smartPersonaTargetSection: section }),
  smartPersonaTargetField: null,
  setSmartPersonaTargetField: (field) => set({ smartPersonaTargetField: field }),
  smartPersonaSize: "closed",
  setSmartPersonaSize: (size) => set({ smartPersonaSize: size }),
  isSmartPersonaEditing: false,
  setSmartPersonaEditing: (editing) => set({ isSmartPersonaEditing: editing }),
  isVaultOpen: false,
  setVaultOpen: (open) => set({ isVaultOpen: open }),
  vaultTab: "trees",
  setVaultTab: (tab) => set({ vaultTab: tab }),
  vaultExportSection: "family-book",
  setVaultExportSection: (section) => set({ vaultExportSection: section }),
  pulseTargetId: null,
  triggerPulse: (id) => {
    set({ pulseTargetId: id });
    setTimeout(() => {
      if (get().pulseTargetId === id) {
        set({ pulseTargetId: null });
      }
    }, 3e3);
  },
  // Notifications
  notifications: [],
  /**
   * Dedupe is intentionally store-level so every notification source
   * follows the same no-accumulation rule before the bell renders it.
   */
  enqueueNotification: (n) => set((state) => {
    const now = /* @__PURE__ */ new Date();
    const nowIso = now.toISOString();
    const timestamp = now.getTime();
    const userUid = get().user?.uid;
    const existingIndex = n.dedupeKey ? state.notifications.findIndex((notification) => notification.dedupeKey === n.dedupeKey) : -1;
    if (existingIndex >= 0) {
      const existing = state.notifications[existingIndex];
      const updated = {
        ...existing,
        ...n,
        id: existing.id,
        timestamp,
        updatedAt: nowIso
      };
      const notifications3 = [...state.notifications];
      notifications3.splice(existingIndex, 1);
      notifications3.unshift(updated);
      const nextNotifications2 = notifications3.slice(0, MAX_NOTIFICATIONS);
      persistNotifications(nextNotifications2, userUid);
      return { notifications: nextNotifications2 };
    }
    const nextNotifications = [
      {
        ...n,
        id: crypto.randomUUID(),
        timestamp,
        createdAt: nowIso,
        updatedAt: nowIso,
        read: false
      },
      ...state.notifications
    ].slice(0, MAX_NOTIFICATIONS);
    persistNotifications(nextNotifications, userUid);
    return {
      notifications: nextNotifications
    };
  }),
  addNotification: (n) => get().enqueueNotification({
    ...n,
    source: n.source ?? "system",
    actionable: n.actionable ?? false
  }),
  updateNotification: (id, patch) => set((state) => {
    const notifications3 = state.notifications.map((n) => n.id === id ? {
      ...n,
      ...patch,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    } : n);
    persistNotifications(notifications3, get().user?.uid);
    return { notifications: notifications3 };
  }),
  removeNotification: (id) => set((state) => {
    const notifications3 = state.notifications.filter((n) => n.id !== id);
    persistNotifications(notifications3, get().user?.uid);
    return { notifications: notifications3 };
  }),
  markRead: (id) => set((state) => {
    const notifications3 = state.notifications.map((n) => n.id === id ? { ...n, read: true } : n);
    persistNotifications(notifications3, get().user?.uid);
    return { notifications: notifications3 };
  }),
  markAllRead: () => set((state) => {
    const notifications3 = state.notifications.map((n) => ({ ...n, read: true }));
    persistNotifications(notifications3, get().user?.uid);
    return { notifications: notifications3 };
  }),
  clearNotifications: () => {
    persistNotifications([], get().user?.uid);
    set({ notifications: [] });
  },
  hydrateNotificationsFromStorage: (userUid) => set({
    notifications: loadPersistedNotifications(userUid)
  })
});

// src/store/slices/syncMetaSlice.ts
var createSyncMetaSlice = (set, get) => ({
  lastSyncedVersion: 0,
  opCount: 0,
  localClientVersion: 0,
  syncingNodes: /* @__PURE__ */ new Set(),
  pendingOperations: [],
  setLastSyncedVersion: (version) => set({ lastSyncedVersion: version }),
  incrementOpCount: (count = 1) => {
    const newCount = get().opCount + count;
    set({ opCount: newCount });
  },
  incrementLocalClientVersion: () => set((state) => ({ localClientVersion: state.localClientVersion + 1 })),
  addSyncingNode: (id) => set((state) => {
    const next = new Set(state.syncingNodes);
    next.add(id);
    return { syncingNodes: next };
  }),
  removeSyncingNode: (id) => set((state) => {
    const next = new Set(state.syncingNodes);
    next.delete(id);
    return { syncingNodes: next };
  }),
  setPendingOperations: (ops) => set({ pendingOperations: ops }),
  addPendingOperation: (op) => set((state) => ({
    pendingOperations: [...state.pendingOperations, op]
  })),
  removePendingOperations: (localIds) => set((state) => {
    const idsSet = new Set(localIds);
    return {
      pendingOperations: state.pendingOperations.filter(
        (op) => op.localId === void 0 || !idsSet.has(op.localId)
      )
    };
  })
});

// src/domain/dataIntegrity.ts
import { differenceInYears, isBefore, isValid, parseISO } from "date-fns";
var YEAR_ONLY_PATTERN = /^\d{4}$/;
function parseLooseDate(value) {
  if (!value?.trim()) return null;
  const normalized = YEAR_ONLY_PATTERN.test(value.trim()) ? `${value.trim()}-01-01` : value.trim();
  const parsed = parseISO(normalized);
  return isValid(parsed) ? parsed : null;
}
function normalizeText(value) {
  return (value || "").trim().toLowerCase().replace(/\s+/g, " ");
}
function getDisplayName(person) {
  return [person.firstName, person.middleName, person.lastName].filter(Boolean).join(" ").trim() || person.id;
}
function getIssueId(issue) {
  return [issue.code, issue.personId, issue.relatedId || "", issue.relationshipId || ""].join(":");
}
function getIssueCategory(code) {
  if (code === "death_before_birth" || code === "child_before_parent_birth" || code === "mother_under_13") {
    return "TIMELINE";
  }
  if (code === "possible_duplicate_person") {
    return "DUPLICATE";
  }
  if (code === "missing_birth_citation" || code === "missing_death_citation" || code === "missing_profile_source") {
    return "CITATION";
  }
  if (code === "missing_birth_date" || code === "missing_death_date" || code === "missing_residence" || code === "missing_occupation" || code === "missing_parents") {
    return "COMPLETENESS";
  }
  return "RELATIONSHIP";
}
function addIssue(issues, issue) {
  const personIds = issue.personIds || [issue.personId, issue.relatedId].filter(Boolean);
  issues.push({
    ...issue,
    id: getIssueId(issue),
    category: getIssueCategory(issue.code),
    personIds,
    message: issue.message || issue.code
  });
}
function findDuplicates(values) {
  const seen = /* @__PURE__ */ new Set();
  const duplicates = /* @__PURE__ */ new Set();
  values.forEach((value) => {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  });
  return [...duplicates];
}
function hasParentCycle(people, startId, cursorId, visited = /* @__PURE__ */ new Set()) {
  if (cursorId === startId) return true;
  if (visited.has(cursorId)) return false;
  visited.add(cursorId);
  const cursor = people[cursorId];
  if (!cursor) return false;
  return cursor.parents.some((parentId) => hasParentCycle(people, startId, parentId, visited));
}
function buildIssuesByPerson(issues) {
  return issues.reduce((acc, issue) => {
    acc[issue.personId] = acc[issue.personId] || [];
    acc[issue.personId].push(issue.message);
    return acc;
  }, {});
}
function calculateHealthScore(totalPeople, issues) {
  if (totalPeople === 0) return 100;
  const penalty = issues.reduce((sum, issue) => {
    if (issue.severity === "ERROR") return sum + 3;
    if (issue.severity === "WARNING") return sum + 1;
    return sum;
  }, 0);
  return Math.max(0, Math.round(100 - penalty / totalPeople * 10));
}
function hasText(value) {
  return Boolean(value?.trim());
}
function hasOccupation(person) {
  return hasText(person.occupation) || hasText(person.profession) || hasText(person.workplace) || hasText(person.company);
}
function hasResidence(person) {
  return hasText(person.currentResidence) || hasText(person.residence) || hasText(person.address);
}
function hasProfileSource(person) {
  return Array.isArray(person.sources) && person.sources.some((source) => hasText(source.title) || hasText(source.url));
}
function calculateCompletenessScore(people) {
  if (people.length === 0) return 100;
  const totalChecks = people.length * 4;
  const passedChecks = people.reduce((count, person) => {
    return count + (hasText(person.birthDate) ? 1 : 0) + (hasResidence(person) ? 1 : 0) + (hasOccupation(person) ? 1 : 0) + (person.parents.length > 0 ? 1 : 0);
  }, 0);
  return Math.round(passedChecks / totalChecks * 100);
}
function calculateCitationCoverage(people) {
  let citableClaims = 0;
  let citedClaims = 0;
  people.forEach((person) => {
    if (hasText(person.birthDate) || hasText(person.birthPlace)) {
      citableClaims += 1;
      if (hasText(person.birthSource)) citedClaims += 1;
    }
    if (person.isDeceased && (hasText(person.deathDate) || hasText(person.deathPlace))) {
      citableClaims += 1;
      if (hasText(person.deathSource)) citedClaims += 1;
    }
    if (hasProfileSource(person)) {
      citableClaims += 1;
      citedClaims += 1;
    }
  });
  return citableClaims === 0 ? 100 : Math.round(citedClaims / citableClaims * 100);
}
function evaluateDataIntegrity(people) {
  const issues = [];
  const peopleList = Object.values(people);
  const possibleDuplicateBuckets = /* @__PURE__ */ new Map();
  peopleList.forEach((person) => {
    const personName = getDisplayName(person);
    findDuplicates(person.parents).forEach((parentId) => {
      addIssue(issues, {
        code: "duplicate_parent",
        severity: "WARNING",
        personId: person.id,
        relatedId: parentId,
        message: `${personName} has duplicate parent links.`
      });
    });
    findDuplicates(person.children).forEach((childId) => {
      addIssue(issues, {
        code: "duplicate_child",
        severity: "WARNING",
        personId: person.id,
        relatedId: childId,
        message: `${personName} has duplicate child links.`
      });
    });
    findDuplicates(person.spouses).forEach((spouseId) => {
      addIssue(issues, {
        code: "duplicate_spouse",
        severity: "WARNING",
        personId: person.id,
        relatedId: spouseId,
        message: `${personName} has duplicate spouse links.`
      });
    });
    person.parents.forEach((parentId) => {
      const parent = people[parentId];
      if (parentId === person.id) {
        addIssue(issues, {
          code: "self_parent",
          severity: "ERROR",
          personId: person.id,
          relatedId: parentId,
          message: `${personName} is listed as their own parent.`
        });
      } else if (!parent) {
        addIssue(issues, {
          code: "broken_parent_reference",
          severity: "ERROR",
          personId: person.id,
          relatedId: parentId,
          message: `${personName} references a missing parent.`
        });
      } else if (!parent.children.includes(person.id)) {
        addIssue(issues, {
          code: "asymmetric_parent_child",
          severity: "WARNING",
          personId: person.id,
          relatedId: parentId,
          message: `${personName} has a parent link that is missing from the parent's children.`
        });
      }
    });
    person.children.forEach((childId) => {
      const child = people[childId];
      if (childId === person.id) {
        addIssue(issues, {
          code: "self_child",
          severity: "ERROR",
          personId: person.id,
          relatedId: childId,
          message: `${personName} is listed as their own child.`
        });
      } else if (!child) {
        addIssue(issues, {
          code: "broken_child_reference",
          severity: "ERROR",
          personId: person.id,
          relatedId: childId,
          message: `${personName} references a missing child.`
        });
      } else if (!child.parents.includes(person.id)) {
        addIssue(issues, {
          code: "asymmetric_parent_child",
          severity: "WARNING",
          personId: person.id,
          relatedId: childId,
          message: `${personName} has a child link that is missing from the child's parents.`
        });
      }
    });
    person.spouses.forEach((spouseId) => {
      const spouse = people[spouseId];
      if (spouseId === person.id) {
        addIssue(issues, {
          code: "self_spouse",
          severity: "ERROR",
          personId: person.id,
          relatedId: spouseId,
          message: `${personName} is listed as their own spouse.`
        });
      } else if (!spouse) {
        addIssue(issues, {
          code: "broken_spouse_reference",
          severity: "ERROR",
          personId: person.id,
          relatedId: spouseId,
          message: `${personName} references a missing spouse.`
        });
      } else if (!spouse.spouses.includes(person.id)) {
        addIssue(issues, {
          code: "asymmetric_spouse",
          severity: "WARNING",
          personId: person.id,
          relatedId: spouseId,
          message: `${personName} has a spouse link that is not reciprocated.`
        });
      }
    });
    if (person.parents.some((parentId) => hasParentCycle(people, person.id, parentId))) {
      addIssue(issues, {
        code: "parent_child_cycle",
        severity: "ERROR",
        personId: person.id,
        message: `${personName} participates in a parent-child cycle.`
      });
    }
    const birthDate = parseLooseDate(person.birthDate);
    const deathDate = parseLooseDate(person.deathDate);
    if (!hasText(person.birthDate)) {
      addIssue(issues, {
        code: "missing_birth_date",
        severity: "INFO",
        personId: person.id,
        message: `${personName} is missing a birth date.`
      });
    }
    if (person.isDeceased && !hasText(person.deathDate)) {
      addIssue(issues, {
        code: "missing_death_date",
        severity: "INFO",
        personId: person.id,
        message: `${personName} is marked deceased but has no death date.`
      });
    }
    if (!hasResidence(person)) {
      addIssue(issues, {
        code: "missing_residence",
        severity: "INFO",
        personId: person.id,
        message: `${personName} is missing residence information.`
      });
    }
    if (!hasOccupation(person)) {
      addIssue(issues, {
        code: "missing_occupation",
        severity: "INFO",
        personId: person.id,
        message: `${personName} is missing occupation information.`
      });
    }
    if (person.parents.length === 0) {
      addIssue(issues, {
        code: "missing_parents",
        severity: "INFO",
        personId: person.id,
        message: `${personName} has no listed parents.`
      });
    }
    if ((hasText(person.birthDate) || hasText(person.birthPlace)) && !hasText(person.birthSource)) {
      addIssue(issues, {
        code: "missing_birth_citation",
        severity: "INFO",
        personId: person.id,
        message: `${personName} has birth information without a citation.`
      });
    }
    if (person.isDeceased && (hasText(person.deathDate) || hasText(person.deathPlace)) && !hasText(person.deathSource)) {
      addIssue(issues, {
        code: "missing_death_citation",
        severity: "INFO",
        personId: person.id,
        message: `${personName} has death information without a citation.`
      });
    }
    if (!hasProfileSource(person)) {
      addIssue(issues, {
        code: "missing_profile_source",
        severity: "INFO",
        personId: person.id,
        message: `${personName} has no profile-level source.`
      });
    }
    if (birthDate && deathDate && isBefore(deathDate, birthDate)) {
      addIssue(issues, {
        code: "death_before_birth",
        severity: "ERROR",
        personId: person.id,
        message: `${personName} has a death date before birth date.`
      });
    }
    const nameKey = normalizeText([person.firstName, person.middleName, person.lastName].filter(Boolean).join(" "));
    const birthKey = normalizeText(person.birthDate);
    if (nameKey && birthKey) {
      const key = `${nameKey}|${birthKey}`;
      possibleDuplicateBuckets.set(key, [...possibleDuplicateBuckets.get(key) || [], person.id]);
    }
  });
  peopleList.forEach((child) => {
    const childBirthDate = parseLooseDate(child.birthDate);
    if (!childBirthDate) return;
    child.parents.forEach((parentId) => {
      const parent = people[parentId];
      const parentBirthDate = parseLooseDate(parent?.birthDate);
      if (!parent || !parentBirthDate) return;
      if (isBefore(childBirthDate, parentBirthDate)) {
        addIssue(issues, {
          code: "child_before_parent_birth",
          severity: "ERROR",
          personId: child.id,
          relatedId: parentId,
          message: `${getDisplayName(child)} is born before a listed parent.`
        });
      }
      if (parent.gender === "female") {
        const motherAge = differenceInYears(childBirthDate, parentBirthDate);
        if (motherAge >= 0 && motherAge < 13) {
          addIssue(issues, {
            code: "mother_under_13",
            severity: "WARNING",
            personId: child.id,
            relatedId: parentId,
            message: `${getDisplayName(child)} has a mother younger than 13 at birth.`
          });
        }
      }
    });
  });
  possibleDuplicateBuckets.forEach((ids) => {
    if (ids.length < 2) return;
    ids.forEach((personId) => {
      addIssue(issues, {
        code: "possible_duplicate_person",
        severity: "INFO",
        personId,
        relatedId: ids.find((id) => id !== personId),
        message: `${getDisplayName(people[personId])} may be a duplicate person.`
      });
    });
  });
  const counts = issues.reduce(
    (acc, issue) => {
      acc[issue.severity] += 1;
      return acc;
    },
    { ERROR: 0, WARNING: 0, INFO: 0 }
  );
  const countsByCategory = issues.reduce(
    (acc, issue) => {
      acc[issue.category] += 1;
      return acc;
    },
    { RELATIONSHIP: 0, TIMELINE: 0, DUPLICATE: 0, CITATION: 0, COMPLETENESS: 0 }
  );
  return {
    issues,
    issuesByPerson: buildIssuesByPerson(issues),
    healthScore: calculateHealthScore(peopleList.length, issues),
    completenessScore: calculateCompletenessScore(peopleList),
    citationCoverage: calculateCitationCoverage(peopleList),
    counts,
    countsByCategory
  };
}

// src/store/slices/treeHealthSlice.ts
var createTreeHealthSlice = (set, get) => ({
  validationErrors: {},
  healthScore: 100,
  setValidationErrors: (errors) => {
    const people = get().people;
    const total = Object.keys(people || {}).length;
    const invalidCount = Object.keys(errors).length;
    const healthScore = invalidCount > 0 ? total > 0 ? Math.max(0, Math.round((total - invalidCount) / total * 100)) : 100 : evaluateDataIntegrity(people || {}).healthScore;
    set({ validationErrors: errors, healthScore });
  }
});

// src/store/slices/historySlice.ts
var MAX_HISTORY_STEPS = 50;
var MIN_HISTORY_STEPS = 5;
var HISTORY_REFERENCE_BUDGET_BYTES = 3 * 1024 * 1024;
var ESTIMATED_REFERENCE_BYTES_PER_PERSON = 96;
var getHistoryStepLimit = (peopleCount) => {
  if (peopleCount <= 0) return MAX_HISTORY_STEPS;
  const budgetedSteps = Math.floor(
    HISTORY_REFERENCE_BUDGET_BYTES / (peopleCount * ESTIMATED_REFERENCE_BYTES_PER_PERSON)
  );
  return Math.max(MIN_HISTORY_STEPS, Math.min(MAX_HISTORY_STEPS, budgetedSteps));
};
var estimateHistoryReferenceBytes = (entryCount, peopleCount) => Math.max(0, entryCount) * Math.max(0, peopleCount) * ESTIMATED_REFERENCE_BYTES_PER_PERSON;
var trimHistoryStacks = (past, future, limit) => {
  const nextPast = [...past];
  const nextFuture = [...future];
  while (nextPast.length + nextFuture.length > limit) {
    if (nextPast.length > 0) {
      nextPast.shift();
    } else {
      nextFuture.pop();
    }
  }
  return { past: nextPast, future: nextFuture };
};
var getHistoryMetrics = (past, future, peopleCount) => ({
  historyStepLimit: getHistoryStepLimit(peopleCount),
  historyEstimatedBytes: estimateHistoryReferenceBytes(
    past.length + future.length,
    peopleCount
  )
});
var createHistorySlice = (set, get) => ({
  past: [],
  future: [],
  historyStepLimit: MAX_HISTORY_STEPS,
  historyEstimatedBytes: 0,
  isHistoryStale: false,
  pushToHistory: (people) => {
    set((state) => {
      const peopleCount = Object.keys(people).length;
      const limit = getHistoryStepLimit(peopleCount);
      const trimmed = trimHistoryStacks([...state.past, people], [], limit);
      return {
        ...trimmed,
        isHistoryStale: false,
        ...getHistoryMetrics(trimmed.past, trimmed.future, peopleCount)
      };
    });
  },
  undo: () => {
    const { past, people, peopleVersion, isHistoryStale } = get();
    if (isHistoryStale) {
      return { success: false, blockedReason: "stale_history" };
    }
    if (past.length === 0) return { success: false };
    const previous = past[past.length - 1];
    const newPast = past.slice(0, -1);
    const peopleCount = Object.keys(previous).length;
    const limit = getHistoryStepLimit(peopleCount);
    const trimmed = trimHistoryStacks(newPast, [people, ...get().future], limit);
    set({
      people: previous,
      peopleVersion: peopleVersion + 1,
      ...trimmed,
      ...getHistoryMetrics(trimmed.past, trimmed.future, peopleCount)
    });
    return { success: true };
  },
  redo: () => {
    const { future, people, peopleVersion, isHistoryStale } = get();
    if (isHistoryStale) {
      return { success: false, blockedReason: "stale_history" };
    }
    if (future.length === 0) return { success: false };
    const next = future[0];
    const newFuture = future.slice(1);
    const peopleCount = Object.keys(next).length;
    const limit = getHistoryStepLimit(peopleCount);
    const trimmed = trimHistoryStacks([...get().past, people], newFuture, limit);
    set({
      people: next,
      peopleVersion: peopleVersion + 1,
      ...trimmed,
      ...getHistoryMetrics(trimmed.past, trimmed.future, peopleCount)
    });
    return { success: true };
  },
  clearHistory: () => {
    const peopleCount = Object.keys(get().people).length;
    set({
      past: [],
      future: [],
      isHistoryStale: false,
      historyStepLimit: getHistoryStepLimit(peopleCount),
      historyEstimatedBytes: 0
    });
  },
  markHistoryStale: () => {
    set({ isHistoryStale: true });
  }
});

// src/features/discussions/hooks/useTreeDiscussion.ts
import { useEffect, useCallback, useState } from "react";

// src/features/discussions/components/DiscussionListener.tsx
import { useEffect as useEffect2 } from "react";

// src/features/discussions/components/TreeDiscussionDrawer.tsx
import { useState as useState4, useRef as useRef2, useEffect as useEffect5, useMemo } from "react";
import {
  X,
  Send,
  MessageCircle,
  Loader2 as Loader22,
  Reply as ReplyIcon,
  Search
} from "lucide-react";

// src/context/TranslationContext.tsx
import { createContext, useContext, useCallback as useCallback2, useEffect as useEffect3, useState as useState2 } from "react";
import { jsx } from "react/jsx-runtime";
var TranslationContext = createContext(void 0);

// src/context/OverlayContext.tsx
import {
  createContext as createContext2,
  useContext as useContext2,
  useCallback as useCallback3,
  useEffect as useEffect4,
  useRef,
  useState as useState3
} from "react";
import { createPortal } from "react-dom";
import { jsx as jsx2 } from "react/jsx-runtime";
var OverlayContext = createContext2(null);
var FOCUSABLE = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])'
].join(", ");

// src/features/discussions/components/TreeDiscussionItem.tsx
import React4 from "react";
import { formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { User, MessageSquare, Trash2, Loader2, Reply } from "lucide-react";
import { jsx as jsx3, jsxs } from "react/jsx-runtime";

// src/features/discussions/components/TreeDiscussionDrawer.tsx
import { jsx as jsx4, jsxs as jsxs2 } from "react/jsx-runtime";

// src/features/discussions/store/discussionSlice.ts
var UNREAD_STORAGE_KEY = "jozor_unread_counts";
var loadSavedUnreadCounts = () => {
  if (typeof window === "undefined") return {};
  try {
    const saved = localStorage.getItem(UNREAD_STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
};
var saveUnreadCounts = (counts) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(UNREAD_STORAGE_KEY, JSON.stringify(counts));
  } catch {
  }
};
var createDiscussionSlice = (set) => ({
  discussionMessages: {},
  lastReadTimestamps: {},
  unreadCounts: loadSavedUnreadCounts(),
  onlineUsers: {},
  collaborators: {},
  hasMore: {},
  isDiscussionOpen: false,
  setDiscussionOpen: (isOpen) => set({ isDiscussionOpen: isOpen }),
  setOnlineUsers: (treeId, users) => set((state) => ({
    onlineUsers: {
      ...state.onlineUsers,
      [treeId]: users
    }
  })),
  setCollaborators: (treeId, collaborators) => set((state) => ({
    collaborators: {
      ...state.collaborators,
      [treeId]: collaborators
    }
  })),
  setDiscussionMessages: (treeId, messages, hasMore = false) => set((state) => ({
    discussionMessages: {
      ...state.discussionMessages,
      [treeId]: messages
    },
    hasMore: {
      ...state.hasMore,
      [treeId]: hasMore
    }
  })),
  prependDiscussionMessages: (treeId, newOlderMessages, hasMore = false) => set((state) => {
    const existing = state.discussionMessages[treeId] || [];
    const merged = [...newOlderMessages, ...existing];
    const uniqueMap = /* @__PURE__ */ new Map();
    merged.forEach((m) => uniqueMap.set(m.id, m));
    const finalMessages = Array.from(uniqueMap.values()).sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    return {
      discussionMessages: {
        ...state.discussionMessages,
        [treeId]: finalMessages
      },
      hasMore: {
        ...state.hasMore,
        [treeId]: hasMore
      }
    };
  }),
  markAsRead: (treeId) => set((state) => {
    const newUnreadCounts = { ...state.unreadCounts, [treeId]: 0 };
    saveUnreadCounts(newUnreadCounts);
    return {
      unreadCounts: newUnreadCounts,
      lastReadTimestamps: {
        ...state.lastReadTimestamps,
        [treeId]: (/* @__PURE__ */ new Date()).toISOString()
      }
    };
  }),
  addDiscussionMessage: (treeId, message, currentUserId) => set((state) => {
    const existing = state.discussionMessages[treeId] || [];
    const index = existing.findIndex((m) => m.id === message.id);
    const newMessages = (index !== -1 ? existing.map((existingMessage, messageIndex) => messageIndex === index ? { ...existingMessage, ...message } : existingMessage) : [...existing, message]).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const isNew = index === -1;
    const isOwnMessage = currentUserId && message.userId === currentUserId;
    const shouldIncrement = isNew && !state.isDiscussionOpen && !isOwnMessage;
    const currentCount = state.unreadCounts[treeId] || 0;
    const newUnreadCounts = shouldIncrement ? { ...state.unreadCounts, [treeId]: currentCount + 1 } : state.unreadCounts;
    if (shouldIncrement) {
      saveUnreadCounts(newUnreadCounts);
    }
    return {
      unreadCounts: newUnreadCounts,
      discussionMessages: {
        ...state.discussionMessages,
        [treeId]: newMessages
      }
    };
  }),
  removeDiscussionMessage: (treeId, messageId) => set((state) => ({
    discussionMessages: {
      ...state.discussionMessages,
      [treeId]: (state.discussionMessages[treeId] || []).filter((m) => m.id !== messageId)
    }
  })),
  clearDiscussionMessages: (treeId) => set((state) => {
    const next = { ...state.discussionMessages };
    delete next[treeId];
    return { discussionMessages: next };
  })
});

// src/domain/appearance/appearanceEngine.ts
var MODERN_SANS = '"Inter", "IBM Plex Sans Arabic", "Segoe UI", sans-serif';
var CLASSIC_SERIF = '"Fraunces", "Noto Naskh Arabic", "Amiri", serif';
var VAULT_CLASSIC_COLORS = {
  surfaceApp: "#fdfcf5",
  surfaceElevated: "#f8f4ea",
  surfacePanel: "rgba(250, 248, 240, 0.94)",
  surfacePanelSubtle: "rgba(250, 248, 240, 0.78)",
  surfaceSubtle: "#faf8f0",
  surfaceHover: "#f2ecdf",
  borderSoft: "rgba(139, 115, 85, 0.18)",
  borderStrong: "rgba(139, 115, 85, 0.28)",
  textStrong: "#424242",
  textDefault: "#424242",
  textSecondary: "#5d5d5d",
  textTertiary: "#746a60",
  primary400: "#6f8a67",
  primary500: "#5f7a61",
  primary600: "#4a6741",
  primary700: "#3f5a38",
  primary600Rgb: "74, 103, 65",
  primaryContrast: "#fdfcf5",
  support500: "#8b7355",
  info500: "#5b86b7",
  accent500: "#a67c37"
};
var THEME_PALETTE_OPTIONS = [
  {
    id: "vault-classic",
    label: "Vault Classic",
    description: "The premium cream-and-copper system.",
    swatches: ["#fdfcf5", "#f8f4ea", "#a67c37", "#4a6741"],
    colors: VAULT_CLASSIC_COLORS
  },
  {
    id: "archive-sage",
    label: "Archive Sage",
    description: "A softer olive archival palette.",
    swatches: ["#fbfaf3", "#f3efe4", "#8e7a4d", "#5f7a61"],
    colors: {
      ...VAULT_CLASSIC_COLORS,
      surfaceApp: "#fbfaf3",
      surfaceElevated: "#f3efe4",
      surfacePanel: "rgba(248, 245, 236, 0.94)",
      surfacePanelSubtle: "rgba(248, 245, 236, 0.78)",
      surfaceSubtle: "#f7f3ea",
      surfaceHover: "#ece6d9",
      primary400: "#7a9272",
      primary500: "#6a8463",
      primary600: "#5f7a61",
      primary700: "#4d684f",
      primary600Rgb: "95, 122, 97",
      support500: "#8f7e5e",
      accent500: "#9f8248"
    }
  },
  {
    id: "azure-ledger",
    label: "Azure Ledger",
    description: "Cream surfaces with editorial blue.",
    swatches: ["#fcfbf6", "#f4f1e8", "#5b86b7", "#506a80"],
    colors: {
      ...VAULT_CLASSIC_COLORS,
      borderSoft: "rgba(91, 134, 183, 0.16)",
      borderStrong: "rgba(91, 134, 183, 0.24)",
      textTertiary: "#6a7280",
      primary400: "#7892a8",
      primary500: "#68839a",
      primary600: "#506a80",
      primary700: "#42586d",
      primary600Rgb: "80, 106, 128",
      support500: "#6f7d8c",
      info500: "#5b86b7",
      accent500: "#8e7a4d"
    }
  },
  {
    id: "rose-ledger",
    label: "Rose Ledger",
    description: "Muted rose details for softer presentation.",
    swatches: ["#fdfaf7", "#f7efe9", "#b6827d", "#7a645d"],
    colors: {
      ...VAULT_CLASSIC_COLORS,
      surfaceApp: "#fdfaf7",
      surfaceElevated: "#f7efe9",
      surfacePanel: "rgba(251, 245, 240, 0.94)",
      surfacePanelSubtle: "rgba(251, 245, 240, 0.78)",
      surfaceSubtle: "#faf2ec",
      surfaceHover: "#f1e6de",
      borderSoft: "rgba(182, 130, 125, 0.16)",
      borderStrong: "rgba(182, 130, 125, 0.24)",
      primary400: "#a98078",
      primary500: "#97726a",
      primary600: "#7a645d",
      primary700: "#66514b",
      primary600Rgb: "122, 100, 93",
      support500: "#9b7d74",
      accent500: "#b6827d"
    }
  }
];
var FONT_TOKENS = {
  classic: {
    fontFamilySans: MODERN_SANS,
    fontFamilySerif: CLASSIC_SERIF,
    fontFamilyBody: MODERN_SANS,
    fontFamilyHeading: CLASSIC_SERIF
  },
  modern: {
    fontFamilySans: MODERN_SANS,
    fontFamilySerif: MODERN_SANS,
    fontFamilyBody: MODERN_SANS,
    fontFamilyHeading: MODERN_SANS
  }
};
var DENSITY_TOKENS = {
  compact: { space3: "0.625rem", space4: "0.875rem", space6: "1.25rem", space8: "1.75rem" },
  comfortable: { space3: "0.75rem", space4: "1rem", space6: "1.5rem", space8: "2rem" },
  airy: { space3: "0.875rem", space4: "1.125rem", space6: "1.75rem", space8: "2.25rem" }
};
var RADIUS_TOKENS = {
  soft: { radiusLg: "1rem", radiusXl: "1.25rem" },
  grand: { radiusLg: "1.125rem", radiusXl: "1.5rem" }
};
var PALETTE_LOOKUP = Object.fromEntries(THEME_PALETTE_OPTIONS.map((p) => [p.id, p]));
var buildCssVariables = (colors, fonts, spacing, radius) => ({
  "--font-family-sans": fonts.fontFamilySans,
  "--font-family-serif": fonts.fontFamilySerif,
  "--font-family-body": fonts.fontFamilyBody,
  "--font-family-heading": fonts.fontFamilyHeading,
  "--space-3": spacing.space3,
  "--space-4": spacing.space4,
  "--space-6": spacing.space6,
  "--space-8": spacing.space8,
  "--radius-lg": radius.radiusLg,
  "--radius-xl": radius.radiusXl,
  "--surface-app": colors.surfaceApp,
  "--surface-elevated": colors.surfaceElevated,
  "--surface-panel": colors.surfacePanel,
  "--surface-panel-subtle": colors.surfacePanelSubtle,
  "--surface-subtle": colors.surfaceSubtle,
  "--surface-hover": colors.surfaceHover,
  "--border-soft": colors.borderSoft,
  "--border-strong": colors.borderStrong,
  "--text-strong": colors.textStrong,
  "--text-default": colors.textDefault,
  "--text-secondary": colors.textSecondary,
  "--text-tertiary": colors.textTertiary,
  "--color-primary-400": colors.primary400,
  "--color-primary-500": colors.primary500,
  "--color-primary-600": colors.primary600,
  "--color-primary-700": colors.primary700,
  "--color-primary-600-rgb": colors.primary600Rgb,
  "--color-primary-contrast": colors.primaryContrast,
  "--color-support-500": colors.support500,
  "--color-info-500": colors.info500,
  "--color-accent-500": colors.accent500
});
var resolveThemeState = (paletteId, fontMode, density, radiusMode) => {
  const palette = PALETTE_LOOKUP[paletteId];
  const colors = palette.colors;
  const fonts = FONT_TOKENS[fontMode];
  const spacing = DENSITY_TOKENS[density];
  const radius = RADIUS_TOKENS[radiusMode];
  return { colors, fonts, spacing, radius, cssVariables: buildCssVariables(colors, fonts, spacing, radius) };
};
var PRESETS = {
  heritage: {
    paletteId: "vault-classic",
    fontMode: "classic",
    density: "comfortable",
    radiusMode: "soft",
    theme: { themeStyle: "heritage" },
    appearance: {
      typography: "classic",
      cornerRadius: 16,
      density: "comfortable"
    }
  },
  modernPure: {
    paletteId: "azure-ledger",
    fontMode: "modern",
    density: "compact",
    radiusMode: "soft",
    theme: { themeStyle: "modernPure" },
    appearance: {
      typography: "modern",
      cornerRadius: 14,
      density: "compact"
    }
  },
  artistic: {
    paletteId: "archive-sage",
    fontMode: "classic",
    density: "airy",
    radiusMode: "grand",
    theme: { themeStyle: "artistic" },
    appearance: {
      typography: "classic",
      cornerRadius: 20,
      density: "airy"
    }
  }
};
var DEFAULT_APPEARANCE_STATE = {
  // Theme Engine Defaults
  presetId: "heritage",
  paletteId: "vault-classic",
  fontMode: "classic",
  density: "comfortable",
  radiusMode: "soft",
  ...resolveThemeState("vault-classic", "classic", "comfortable", "soft"),
  // Visual Settings Defaults
  coreEngine: {
    treeMode: "focus",
    orientation: "vertical"
  },
  theme: {
    themeStyle: "heritage"
  },
  meta: {
    activePreset: "heritage"
  },
  appearance: {
    typography: "classic",
    cornerRadius: 16,
    density: "comfortable"
  },
  layout: {
    zoom: 170,
    horizontalSpread: 120,
    verticalSpread: 400
  },
  contentVisibility: {
    photos: true,
    names: { showBaseName: true, showMiddleName: false, showNickname: false, showSuffix: false },
    dates: { enabled: true, birth: true, death: true, marriage: false },
    places: { enabled: false, birthPlace: false, marriagePlace: false, burialPlace: false }
  },
  advanced: {
    nodeDetails: { textSize: 12, generationLimit: 5, compactNodes: false, lineStyle: "step", lineThickness: 2, boxColorLogic: "gender" },
    layoutEngine: { highlightBranch: false, highlightedBranchRootId: null }
  }
};
var isRecord2 = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
var deepClone = (value) => {
  if (Array.isArray(value)) return value.map((item) => deepClone(item));
  if (isRecord2(value)) return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, deepClone(nested)]));
  return value;
};
var patchStateFromPreset = (currentState, presetPatch) => {
  const nextState = deepClone(currentState);
  const nextRecord = nextState;
  for (const [key, patchValue] of Object.entries(presetPatch)) {
    if (patchValue === void 0) continue;
    if (isRecord2(patchValue) && isRecord2(nextRecord[key])) {
      nextRecord[key] = patchStateFromPreset(nextRecord[key], patchValue);
      continue;
    }
    nextRecord[key] = deepClone(patchValue);
  }
  return nextState;
};
var setValueAtPath = (state, path, value) => {
  const segments = path.split(".");
  const nextState = deepClone(state);
  let cursor = nextState;
  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index];
    const current = cursor[segment];
    cursor[segment] = isRecord2(current) ? { ...current } : {};
    cursor = cursor[segment];
  }
  cursor[segments[segments.length - 1]] = value;
  return nextState;
};

// src/store/slices/appearanceSlice.ts
var normalizeAppearanceState = (state) => ({
  ...state,
  advanced: {
    ...state.advanced,
    nodeDetails: {
      ...state.advanced.nodeDetails,
      lineStyle: state.advanced.nodeDetails.lineStyle === "curved" ? "curved" : "step"
    }
  }
});
var createAppearanceSlice = (set) => ({
  appearance: deepClone(DEFAULT_APPEARANCE_STATE),
  setAppearancePalette: (paletteId) => set((state) => {
    if (state.appearance.paletteId === paletteId) return state;
    return {
      appearance: {
        ...state.appearance,
        presetId: "custom",
        theme: { themeStyle: "custom" },
        meta: { ...state.appearance.meta, activePreset: "custom" },
        ...resolveThemeState(paletteId, state.appearance.fontMode, state.appearance.density, state.appearance.radiusMode),
        paletteId
      }
    };
  }),
  setAppearanceFontMode: (fontMode) => set((state) => {
    if (state.appearance.fontMode === fontMode) return state;
    return {
      appearance: {
        ...state.appearance,
        presetId: "custom",
        theme: { themeStyle: "custom" },
        meta: { ...state.appearance.meta, activePreset: "custom" },
        ...resolveThemeState(state.appearance.paletteId, fontMode, state.appearance.density, state.appearance.radiusMode),
        fontMode
      }
    };
  }),
  setAppearanceDensity: (density) => set((state) => {
    if (state.appearance.density === density) return state;
    return {
      appearance: {
        ...state.appearance,
        presetId: "custom",
        theme: { themeStyle: "custom" },
        meta: { ...state.appearance.meta, activePreset: "custom" },
        ...resolveThemeState(state.appearance.paletteId, state.appearance.fontMode, density, state.appearance.radiusMode),
        density
      }
    };
  }),
  setAppearanceRadiusMode: (radiusMode) => set((state) => {
    if (state.appearance.radiusMode === radiusMode) return state;
    return {
      appearance: {
        ...state.appearance,
        presetId: "custom",
        theme: { themeStyle: "custom" },
        meta: { ...state.appearance.meta, activePreset: "custom" },
        ...resolveThemeState(state.appearance.paletteId, state.appearance.fontMode, state.appearance.density, radiusMode),
        radiusMode
      }
    };
  }),
  applyAppearancePreset: (presetId) => {
    const presetPatch = PRESETS[presetId];
    set((currentState) => {
      const nextState = patchStateFromPreset(currentState.appearance, presetPatch);
      const { paletteId, fontMode, density, radiusMode } = nextState;
      return {
        appearance: {
          ...nextState,
          ...resolveThemeState(paletteId, fontMode, density, radiusMode),
          presetId,
          theme: { themeStyle: presetId },
          meta: { ...currentState.appearance.meta, activePreset: presetId }
        }
      };
    });
  },
  updateAppearanceField: (path, value) => {
    set((currentState) => {
      const nextValue = path === "advanced.nodeDetails.lineStyle" && value !== "curved" ? "step" : value;
      const nextState = normalizeAppearanceState(setValueAtPath(currentState.appearance, path, nextValue));
      return {
        appearance: {
          ...nextState,
          presetId: "custom",
          theme: { themeStyle: "custom" },
          meta: { ...currentState.appearance.meta, activePreset: "custom" }
        }
      };
    });
  },
  hydrateAppearanceState: (nextState) => {
    set({ appearance: normalizeAppearanceState(deepClone(nextState)) });
  },
  resetAppearanceToDefault: () => set({ appearance: deepClone(DEFAULT_APPEARANCE_STATE) })
});

// src/store/slices/exportHistorySlice.ts
var createExportHistorySlice = (set) => ({
  exportHistory: [],
  loadExportHistory: async () => {
    try {
      const records = await db.export_history.toArray();
      records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      set({ exportHistory: records }, false, "loadExportHistory");
    } catch (error) {
      console.error("Failed to load export history from DB:", error);
    }
  },
  addExportEntry: async (entry) => {
    try {
      const id = await db.export_history.add(entry);
      const newRecord = { ...entry, id };
      set(
        (state) => {
          const updated = [newRecord, ...state.exportHistory];
          updated.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
          return { exportHistory: updated };
        },
        false,
        "addExportEntry"
      );
    } catch (error) {
      console.error("Failed to add export history entry:", error);
    }
  },
  clearExportHistory: async () => {
    try {
      await db.export_history.clear();
      set({ exportHistory: [] }, false, "clearExportHistory");
    } catch (error) {
      console.error("Failed to clear export history:", error);
    }
  }
});

// src/store/useAppStore.ts
var useAppStore = create()(
  devtools(
    (...args) => ({
      ...createFamilySlice(...args),
      ...createSettingsSlice(...args),
      ...createAuthSlice(...args),
      ...createUISlice(...args),
      ...createSyncMetaSlice(...args),
      ...createTreeHealthSlice(...args),
      ...createHistorySlice(...args),
      ...createDiscussionSlice(...args),
      ...createAppearanceSlice(...args),
      ...createExportHistorySlice(...args)
    }),
    { name: "AppStore" }
  )
);

// src/utils/showToast.ts
import { toast } from "sonner";
var TOAST_TRANSLATIONS = {
  en: {
    "messages.success.importSuccess": "Import successful",
    "messages.success.importError": "Import failed",
    "messages.success.snapshot": "Snapshot created",
    "messages.success.restore": "Snapshot restored",
    "messages.success.deleteSuccess": "Deleted successfully",
    "messages.success.rename": "Name updated successfully",
    "messages.success.load": "Tree loaded successfully",
    "messages.success.delete": "Tree deleted successfully",
    "messages.success.invite": "Invited {email}",
    "messages.success.role": "Role updated",
    "messages.success.personLinked": "Person linked successfully.",
    "messages.success.personAdded": "Person added successfully.",
    "messages.success.revoke": "Access revoked",
    "messages.success.copy": "Link copied to clipboard",
    "messages.success.uploadSuccess": "Uploaded successfully",
    "messages.success.sourceAdded": "Source added successfully",
    "messages.success.sourceRemoved": "Source removed successfully",
    "messages.success.eventAdded": "Event added successfully",
    "messages.success.eventRemoved": "Event removed successfully",
    "messages.error.load": "Failed to load trees",
    "messages.error.open": "Failed to open tree",
    "messages.error.rename": "Rename failed",
    "messages.error.delete": "Delete failed",
    "messages.error.invite": "Failed to invite",
    "messages.error.role": "Failed to update role",
    "messages.error.revoke": "Failed to revoke access",
    "messages.error.collaborators": "Failed to load collaborators",
    "messages.error.sharing": "Failed to update sharing",
    "messages.error.extract": "Failed to extract data",
    "messages.error.bio": "Failed to generate bio",
    "messages.error.snapshot": "Failed to create snapshot",
    "messages.error.map": "Failed to capture map",
    "messages.error.import": "Failed to import file",
    "messages.error.importCleanupReview": "An incomplete import needs review. Saved content was not deleted. Review your trees in the Vault before importing again.",
    "messages.loading.load": "Loading...",
    "messages.loading.open": "Opening tree...",
    "messages.loading.rename": "Renaming...",
    "messages.loading.delete": "Deleting...",
    "messages.loading.invite": "Sending invite...",
    "messages.loading.role": "Updating...",
    "messages.loading.import": "Importing...",
    "messages.loading.save": "Saving...",
    "activityDrawer.loadError": "Failed to load activity history.",
    "adminHub.treeSettings.deleteSuccess": "Tree deleted successfully.",
    "adminHub.treeSettings.deleteError": "Failed to delete the tree. Please try again.",
    "globalSettings.profile.avatarUpdateSuccess": "Avatar updated successfully",
    "globalSettings.profile.avatarUpdateError": "Failed to update avatar",
    "globalSettings.profile.saveChangesError": "Failed to save changes",
    "globalSettings.security.deleteSuccess": "Account deleted successfully",
    "globalSettings.security.deletePending": "Account deletion accepted. Remaining cleanup will continue automatically.",
    "globalSettings.security.retainedUploads": "Deletion was not started. Shared uploads need an ownership review. Contact support; no files were removed.",
    "globalSettings.security.deleteError": "Failed to delete account",
    extractSuccess: "Data extracted successfully!",
    extractError: "Failed to extract data.",
    photoRemoved: "Profile photo removed.",
    readOnly: "This tree is read-only.",
    galleryPhotoAdded: "Photo added to gallery.",
    galleryPhotoRemoved: "Photo removed from gallery.",
    galleryPhotoUploadError: "Failed to upload the photo.",
    galleryPhotoRemoveError: "Failed to remove the photo.",
    vaultShareLinkCopied: "Share link copied.",
    googleDriveFileNameRequired: "Backup name is required.",
    noActiveTree: "No active tree is selected.",
    loginRequired: "Login required",
    demoModeNote: "Demo Mode active"
  },
  ar: {
    "messages.success.importSuccess": "\u062A\u0645 \u0627\u0644\u0627\u0633\u062A\u064A\u0631\u0627\u062F \u0628\u0646\u062C\u0627\u062D",
    "messages.success.importError": "\u0641\u0634\u0644 \u0627\u0644\u0627\u0633\u062A\u064A\u0631\u0627\u062F",
    "messages.success.snapshot": "\u062A\u0645 \u062D\u0641\u0638 \u0646\u0633\u062E\u0629",
    "messages.success.restore": "\u062A\u0645 \u0627\u0633\u062A\u0639\u0627\u062F\u0629 \u0627\u0644\u0646\u0633\u062E\u0629",
    "messages.success.deleteSuccess": "\u062A\u0645 \u0627\u0644\u062D\u0630\u0641 \u0628\u0646\u062C\u0627\u062D",
    "messages.success.rename": "\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0627\u0633\u0645 \u0628\u0646\u062C\u0627\u062D",
    "messages.success.load": "\u062A\u0645 \u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u0634\u062C\u0631\u0629 \u0628\u0646\u062C\u0627\u062D",
    "messages.success.delete": "\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u0634\u062C\u0631\u0629 \u0628\u0646\u062C\u0627\u062D",
    "messages.success.invite": "\u062A\u0645\u062A \u062F\u0639\u0648\u0629 {email}",
    "messages.success.role": "\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0635\u0644\u0627\u062D\u064A\u0629",
    "messages.success.personLinked": "\u062A\u0645 \u0631\u0628\u0637 \u0627\u0644\u0641\u0631\u062F \u0628\u0646\u062C\u0627\u062D.",
    "messages.success.personAdded": "\u062A\u0645\u062A \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0641\u0631\u062F \u0628\u0646\u062C\u0627\u062D.",
    "messages.success.revoke": "\u062A\u0645 \u0625\u0644\u063A\u0627\u0621 \u0635\u0644\u0627\u062D\u064A\u0629 \u0627\u0644\u0648\u0635\u0648\u0644",
    "messages.success.copy": "\u062A\u0645 \u0646\u0633\u062E \u0627\u0644\u0631\u0627\u0628\u0637 \u0644\u0644\u062D\u0627\u0641\u0638\u0629",
    "messages.success.uploadSuccess": "\u062A\u0645 \u0627\u0644\u0631\u0641\u0639 \u0628\u0646\u062C\u0627\u062D",
    "messages.success.sourceAdded": "\u062A\u0645\u062A \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0645\u0635\u062F\u0631 \u0628\u0646\u062C\u0627\u062D",
    "messages.success.sourceRemoved": "\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u0645\u0635\u062F\u0631 \u0628\u0646\u062C\u0627\u062D",
    "messages.success.eventAdded": "\u062A\u0645\u062A \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u062D\u062F\u062B \u0628\u0646\u062C\u0627\u062D",
    "messages.success.eventRemoved": "\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u062D\u062F\u062B \u0628\u0646\u062C\u0627\u062D",
    "messages.error.load": "\u0641\u0634\u0644 \u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u0623\u0634\u062C\u0627\u0631",
    "messages.error.open": "\u0641\u0634\u0644 \u0641\u062A\u062D \u0627\u0644\u0634\u062C\u0631\u0629",
    "messages.error.rename": "\u0641\u0634\u0644\u062A \u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u062A\u0633\u0645\u064A\u0629",
    "messages.error.delete": "\u0641\u0634\u0644 \u0627\u0644\u062D\u0630\u0641",
    "messages.error.invite": "\u0641\u0634\u0644\u062A \u0627\u0644\u062F\u0639\u0648\u0629",
    "messages.error.role": "\u0641\u0634\u0644 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0635\u0644\u0627\u062D\u064A\u0629",
    "messages.error.revoke": "\u0641\u0634\u0644 \u0625\u0644\u063A\u0627\u0621 \u0627\u0644\u0648\u0635\u0648\u0644",
    "messages.error.collaborators": "\u0641\u0634\u0644 \u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u0645\u062A\u0639\u0627\u0648\u0646\u064A\u0646",
    "messages.error.sharing": "\u0641\u0634\u0644 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0634\u0627\u0631\u0643\u0629",
    "messages.error.extract": "\u0641\u0634\u0644 \u0627\u0633\u062A\u062E\u0631\u0627\u062C \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A",
    "messages.error.bio": "\u0641\u0634\u0644 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0633\u064A\u0631\u0629 \u0627\u0644\u0630\u0627\u062A\u064A\u0629",
    "messages.error.snapshot": "\u0641\u0634\u0644 \u0625\u0646\u0634\u0627\u0621 \u0644\u0642\u0637\u0629",
    "messages.error.map": "\u0641\u0634\u0644 \u0627\u0644\u062A\u0642\u0627\u0637 \u0627\u0644\u062E\u0631\u064A\u0637\u0629",
    "messages.error.import": "\u0641\u0634\u0644 \u0627\u0633\u062A\u064A\u0631\u0627\u062F \u0627\u0644\u0645\u0644\u0641",
    "messages.error.importCleanupReview": "\u064A\u062D\u062A\u0627\u062C \u0627\u0633\u062A\u064A\u0631\u0627\u062F \u063A\u064A\u0631 \u0645\u0643\u062A\u0645\u0644 \u0625\u0644\u0649 \u0645\u0631\u0627\u062C\u0639\u0629. \u0644\u0645 \u064A\u064F\u062D\u0630\u0641 \u0627\u0644\u0645\u062D\u062A\u0648\u0649 \u0627\u0644\u0645\u062D\u0641\u0648\u0638. \u0631\u0627\u062C\u0639 \u0623\u0634\u062C\u0627\u0631\u0643 \u0641\u064A \u0627\u0644\u062E\u0632\u0646\u0629 \u0642\u0628\u0644 \u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u0627\u0633\u062A\u064A\u0631\u0627\u062F.",
    "messages.loading.load": "\u062C\u0627\u0631\u064A \u0627\u0644\u062A\u062D\u0645\u064A\u0644...",
    "messages.loading.open": "\u062C\u0627\u0631\u064A \u0641\u062A\u062D \u0627\u0644\u0634\u062C\u0631\u0629...",
    "messages.loading.rename": "\u062C\u0627\u0631\u064A \u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u062A\u0633\u0645\u064A\u0629...",
    "messages.loading.delete": "\u062C\u0627\u0631\u064A \u0627\u0644\u062D\u0630\u0641...",
    "messages.loading.invite": "\u062C\u0627\u0631\u064A \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u062F\u0639\u0648\u0629...",
    "messages.loading.role": "\u062C\u0627\u0631\u064A \u0627\u0644\u062A\u062D\u062F\u064A\u062B...",
    "messages.loading.import": "\u062C\u0627\u0631\u064A \u0627\u0644\u0627\u0633\u062A\u064A\u0631\u0627\u062F...",
    "messages.loading.save": "\u062C\u0627\u0631\u064A \u0627\u0644\u062D\u0641\u0638...",
    "activityDrawer.loadError": "\u062A\u0639\u0630\u0631 \u062A\u062D\u0645\u064A\u0644 \u0633\u062C\u0644 \u0627\u0644\u0646\u0634\u0627\u0637.",
    "adminHub.treeSettings.deleteSuccess": "\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u0634\u062C\u0631\u0629 \u0628\u0646\u062C\u0627\u062D.",
    "adminHub.treeSettings.deleteError": "\u062A\u0639\u0630\u0631 \u062D\u0630\u0641 \u0627\u0644\u0634\u062C\u0631\u0629. \u062D\u0627\u0648\u0644 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649.",
    "globalSettings.profile.avatarUpdateSuccess": "\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0635\u0648\u0631\u0629 \u0628\u0646\u062C\u0627\u062D",
    "globalSettings.profile.avatarUpdateError": "\u0641\u0634\u0644 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0635\u0648\u0631\u0629",
    "globalSettings.profile.saveChangesError": "\u0641\u0634\u0644 \u062D\u0641\u0638 \u0627\u0644\u062A\u063A\u064A\u064A\u0631\u0627\u062A",
    "globalSettings.security.deleteSuccess": "\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u062D\u0633\u0627\u0628 \u0628\u0646\u062C\u0627\u062D",
    "globalSettings.security.deletePending": "\u062A\u0645 \u0642\u0628\u0648\u0644 \u062D\u0630\u0641 \u0627\u0644\u062D\u0633\u0627\u0628. \u0633\u064A\u0633\u062A\u0645\u0631 \u062A\u0646\u0638\u064A\u0641 \u0627\u0644\u0645\u0644\u0641\u0627\u062A \u0627\u0644\u0645\u062A\u0628\u0642\u064A\u0629 \u062A\u0644\u0642\u0627\u0626\u064A\u064B\u0627.",
    "globalSettings.security.retainedUploads": "\u0644\u0645 \u064A\u0628\u062F\u0623 \u0627\u0644\u062D\u0630\u0641. \u062A\u062D\u062A\u0627\u062C \u0627\u0644\u0645\u0644\u0641\u0627\u062A \u0627\u0644\u0645\u0634\u062A\u0631\u0643\u0629 \u0625\u0644\u0649 \u0645\u0631\u0627\u062C\u0639\u0629 \u0645\u0644\u0643\u064A\u062A\u0647\u0627. \u062A\u0648\u0627\u0635\u0644 \u0645\u0639 \u0627\u0644\u062F\u0639\u0645\u061B \u0644\u0645 \u062A\u064F\u062D\u0630\u0641 \u0623\u064A \u0645\u0644\u0641\u0627\u062A.",
    "globalSettings.security.deleteError": "\u0641\u0634\u0644 \u062D\u0630\u0641 \u0627\u0644\u062D\u0633\u0627\u0628",
    extractSuccess: "\u062A\u0645 \u0627\u0633\u062A\u062E\u0631\u0627\u062C \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0628\u0646\u062C\u0627\u062D!",
    extractError: "\u0641\u0634\u0644 \u0627\u0633\u062A\u062E\u0631\u0627\u062C \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A.",
    photoRemoved: "\u062A\u0645 \u062D\u0630\u0641 \u0635\u0648\u0631\u0629 \u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0634\u062E\u0635\u064A.",
    readOnly: "\u0647\u0630\u0647 \u0627\u0644\u0634\u062C\u0631\u0629 \u0644\u0644\u0642\u0631\u0627\u0621\u0629 \u0641\u0642\u0637.",
    galleryPhotoAdded: "\u062A\u0645\u062A \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0635\u0648\u0631\u0629 \u0625\u0644\u0649 \u0627\u0644\u0645\u0639\u0631\u0636.",
    galleryPhotoRemoved: "\u062A\u0645\u062A \u0625\u0632\u0627\u0644\u0629 \u0627\u0644\u0635\u0648\u0631\u0629 \u0645\u0646 \u0627\u0644\u0645\u0639\u0631\u0636.",
    galleryPhotoUploadError: "\u062A\u0639\u0630\u0631 \u0631\u0641\u0639 \u0627\u0644\u0635\u0648\u0631\u0629.",
    galleryPhotoRemoveError: "\u062A\u0639\u0630\u0631\u062A \u0625\u0632\u0627\u0644\u0629 \u0627\u0644\u0635\u0648\u0631\u0629.",
    vaultShareLinkCopied: "\u062A\u0645 \u0646\u0633\u062E \u0631\u0627\u0628\u0637 \u0627\u0644\u0645\u0634\u0627\u0631\u0643\u0629.",
    googleDriveFileNameRequired: "\u0627\u0633\u0645 \u0627\u0644\u0646\u0633\u062E\u0629 \u0645\u0637\u0644\u0648\u0628.",
    noActiveTree: "\u0644\u0645 \u064A\u062A\u0645 \u0627\u062E\u062A\u064A\u0627\u0631 \u0634\u062C\u0631\u0629 \u0646\u0634\u0637\u0629.",
    loginRequired: "\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0645\u0637\u0644\u0648\u0628",
    demoModeNote: "\u0648\u0636\u0639 \u0627\u0644\u062A\u062C\u0631\u0628\u0629 \u0646\u0634\u0637"
  }
};
var interpolate = (text, variables) => {
  if (!variables) return text;
  return Object.entries(variables).reduce(
    (message, [key, value]) => message.replace(`{${key}}`, String(value)),
    text
  );
};
var resolveMessage = (keyOrMessage, options) => {
  const lang = useAppStore.getState().language === "ar" ? "ar" : "en";
  const translationKey = keyOrMessage;
  const translated = TOAST_TRANSLATIONS[lang][translationKey] ?? TOAST_TRANSLATIONS.en[translationKey];
  return interpolate(translated ?? keyOrMessage, options?.variables);
};
var showToast = {
  success: (key, options) => {
    toast.success(resolveMessage(key, options), options);
  },
  error: (key, options) => {
    toast.error(resolveMessage(key, options), options);
  },
  info: (key, options) => {
    toast.info(resolveMessage(key, options), options);
  },
  warning: (key, options) => {
    toast.warning(resolveMessage(key, options), options);
  },
  loading: (key, options) => {
    return toast.loading(resolveMessage(key, options), options);
  },
  promise: (promise, params) => {
    return toast.promise(promise, {
      loading: resolveMessage(params.loading, params.options),
      success: (data) => {
        if (typeof params.success === "function") {
          return params.success(data);
        }
        return resolveMessage(params.success, params.options);
      },
      error: (err) => {
        if (typeof params.error === "function") {
          return params.error(err);
        }
        return resolveMessage(params.error, params.options);
      },
      ...params.options
    });
  },
  dismiss: (id) => toast.dismiss(id)
};

// src/utils/errorLogger.ts
function getStringProperty(value, key) {
  const property = value[key];
  return typeof property === "string" ? property : void 0;
}
function getMessage(error) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const message = getStringProperty(error, "message");
    if (message) return message;
    const errorDescription = getStringProperty(error, "error_description");
    if (errorDescription) return errorDescription;
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }
  return String(error);
}
function getStack(error) {
  if (error instanceof Error) return error.stack;
  return void 0;
}
function inferCategory(error, fallback) {
  if (fallback !== "UNEXPECTED") return fallback;
  const message = getMessage(error).toLowerCase();
  if (message.includes("limit_exceeded_free") || message.includes("billing") || message.includes("quota exceeded") || message.includes("limit reached")) return "BILLING";
  if (message.includes("jwt") || message.includes("token") || message.includes("auth")) return "AUTH";
  if (message.includes("permission") || message.includes("forbidden") || message.includes("access denied") || message.includes("rls")) return "PERMISSION";
  if (message.includes("network") || message.includes("fetch") || message.includes("timeout") || message.includes("offline")) return "NETWORK";
  if (message.includes("sync") || message.includes("version") || message.includes("reconcile")) return "SYNC";
  if (message.includes("constraint") || message.includes("foreign key") || message.includes("duplicate") || message.includes("column")) return "DATABASE";
  if (message.includes("invalid") || message.includes("required") || message.includes("missing")) return "VALIDATION";
  return "UNEXPECTED";
}
function withStoreMetadata(metadata) {
  const merged = { ...metadata };
  try {
    const state = useAppStore.getState();
    merged.uid ??= state.user?.uid;
    merged.treeId ??= state.currentTreeId;
    merged.syncState ??= state.syncStatus.state;
    merged.syncPendingCount ??= state.syncStatus.pendingCount;
  } catch {
  }
  return merged;
}
function emitLog(level, message, payload) {
  if (level === "INFO") {
    const clientEnv = typeof import.meta.env === "undefined" ? void 0 : import.meta.env;
    const shouldEmitInfo = clientEnv?.DEV || clientEnv?.VITE_ENABLE_CLIENT_INFO_LOGS === "true";
    if (!shouldEmitInfo) return;
    console.info(message, payload);
    return;
  }
  if (level === "WARN") {
    console.warn(message, payload);
    return;
  }
  console.error(message, payload);
}
function logError(context, error, options = {}) {
  const {
    category = "UNEXPECTED",
    severity = "MEDIUM",
    showToast: showToast2 = false,
    toastMessage,
    metadata = {}
  } = options;
  const message = getMessage(error);
  const stack = getStack(error);
  const timestamp = (/* @__PURE__ */ new Date()).toISOString();
  const resolvedCategory = inferCategory(error, category);
  const enrichedMetadata = withStoreMetadata(metadata);
  const logged = {
    message,
    category: resolvedCategory,
    severity,
    context,
    level: "ERROR",
    stack,
    timestamp,
    metadata: enrichedMetadata
  };
  const severityLabel = severity === "CRITICAL" ? "[CRITICAL]" : severity === "HIGH" ? "[HIGH]" : "[WARN]";
  emitLog("ERROR", `${severityLabel} [${resolvedCategory}] [${context}] ${message}`, logged);
  if (showToast2 && toastMessage) {
    try {
      showToast.error(toastMessage);
    } catch {
    }
  }
  return logged;
}
function logWarn(context, message, options = {}) {
  const logged = {
    context,
    message,
    category: options.category ?? "UNEXPECTED",
    level: "WARN",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    metadata: withStoreMetadata(options.metadata ?? {})
  };
  emitLog("WARN", `[${logged.category}] [${context}] ${message}`, logged);
  return logged;
}
function logInfo(context, message, metadata = {}) {
  const logged = {
    context,
    message,
    level: "INFO",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    metadata: withStoreMetadata(metadata)
  };
  emitLog("INFO", `[INFO] [${context}] ${message}`, logged);
  return logged;
}

// src/services/supabaseClientRegistry.ts
import { PostgrestClient } from "@supabase/postgrest-js";
import { createClient } from "@supabase/supabase-js";
var MAX_CACHED_CLIENTS = 20;
var createAuthInterceptorFetch = (token) => {
  return (url, options) => {
    const headers = new Headers(options?.headers);
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return fetch(url, { ...options, headers });
  };
};
var createCacheKey = ({ uid, email, token }) => token ? token : uid && email ? `${uid}:${email.toLowerCase()}` : "anonymous";
var pruneFirstEntry = (map) => {
  if (map.size <= MAX_CACHED_CLIENTS) return;
  const firstKey = map.keys().next().value;
  if (firstKey) map.delete(firstKey);
};
var SupabaseClientRegistry = class {
  restClients = /* @__PURE__ */ new Map();
  sdkClients = /* @__PURE__ */ new Map();
  adminSdk = null;
  getRest(context = {}) {
    const cacheKey = createCacheKey(context);
    if (!this.restClients.has(cacheKey)) {
      logInfo("SupabaseRegistry getRest", "Initializing isolated REST client instance.", {
        operationType: "init_supabase_rest_client",
        authContext: cacheKey === "anonymous" ? "anonymous" : "authenticated"
      });
      this.restClients.set(cacheKey, new PostgrestClient(`${supabaseUrl}/rest/v1`, {
        headers: createSupabaseAuthHeaders(context.token),
        fetch: createAuthInterceptorFetch(context.token)
      }));
      pruneFirstEntry(this.restClients);
    }
    return this.restClients.get(cacheKey);
  }
  getSdk(context = {}) {
    const cacheKey = createCacheKey(context);
    if (!this.sdkClients.has(cacheKey)) {
      this.sdkClients.set(cacheKey, createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
          storageKey: `sb-full-${crypto.randomUUID()}`
        },
        global: {
          headers: createSupabaseAuthHeaders(context.token),
          fetch: createAuthInterceptorFetch(context.token)
        }
      }));
      pruneFirstEntry(this.sdkClients);
    }
    const client = this.sdkClients.get(cacheKey);
    if (context.token) {
      client.realtime.setAuth(context.token);
    }
    return client;
  }
  getAdminSdk(url, serviceRoleKey) {
    if (!this.adminSdk) {
      this.adminSdk = createClient(url, serviceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      });
    }
    return this.adminSdk;
  }
  clear() {
    this.restClients.clear();
    this.sdkClients.clear();
    this.adminSdk = null;
    logInfo("SupabaseRegistry clear", "All Supabase client instances cleared.", {
      operationType: "clear_supabase_clients"
    });
  }
};
var SupabaseRegistry = new SupabaseClientRegistry();

// src/services/supabaseClient.ts
assertSupabaseConfig();
var getSupabaseAuthAdapter = () => {
  const globalKey = "__jozorSupabaseAuthAdapter";
  const globalScope = globalThis;
  globalScope[globalKey] ??= {
    auth: new AuthClient({
      url: `${supabaseUrl}/auth/v1`,
      headers: createSupabaseAuthHeaders(),
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
      storageKey: SUPABASE_SESSION_STORAGE_KEY
    })
  };
  return globalScope[globalKey];
};
var supabaseAuth = getSupabaseAuthAdapter();
var getSupabase = (uid, email, token) => SupabaseRegistry.getRest({ uid, email, token });
var getSupabaseWithAuth = (uid, email, token) => getSupabase(uid, email, token);
var supabase = getSupabase();
authTokenService.configureSessionTokenReader(async () => {
  const {
    data: { session }
  } = await supabaseAuth.auth.getSession();
  return session?.access_token ?? null;
});
var clearSupabaseInstances = () => {
  SupabaseRegistry.clear();
  logInfo("supabaseClient clearSupabaseInstances", "All instances cleared on logout.", {
    operationType: "clear_supabase_clients"
  });
};

// src/services/pushSubscriptionService.ts
var getServerEnv = (key) => {
  if (typeof window !== "undefined") {
    return void 0;
  }
  const envSource = typeof process !== "undefined" ? process.env : void 0;
  return envSource?.[key];
};
var getPushSubscriptionAdminClient = async () => {
  const serverSupabaseUrl = getServerEnv("SUPABASE_URL") || getServerEnv("VITE_SUPABASE_URL");
  const serverSupabaseServiceRoleKey = getServerEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!serverSupabaseUrl || !serverSupabaseServiceRoleKey) {
    throw new Error("Supabase server environment variables are not configured for push delivery.");
  }
  return SupabaseRegistry.getAdminSdk(serverSupabaseUrl, serverSupabaseServiceRoleKey);
};
var listSubscriptionsForUserServer = async (userId) => {
  const client = await getPushSubscriptionAdminClient();
  const { data, error } = await client.from("push_subscriptions").select("*").eq("user_id", userId).order("created_at", { ascending: false });
  if (error) {
    throw error;
  }
  return data ?? [];
};
var removeSubscriptionByEndpointServer = async (endpoint) => {
  const client = await getPushSubscriptionAdminClient();
  const { error } = await client.from("push_subscriptions").delete().eq("endpoint", endpoint);
  if (error) {
    throw error;
  }
};
var listSubscribedUserIdsServer = async (params) => {
  const client = await getPushSubscriptionAdminClient();
  const { afterUserId, limit } = params;
  const uniqueUserIds = /* @__PURE__ */ new Set();
  let rowCursor = afterUserId;
  let hasMoreRows = true;
  while (uniqueUserIds.size < limit && hasMoreRows) {
    let query = client.from("push_subscriptions").select("user_id").order("user_id", { ascending: true }).limit(Math.max(limit * 4, 25));
    if (rowCursor) {
      query = query.gt("user_id", rowCursor);
    }
    const { data, error } = await query;
    if (error) {
      throw error;
    }
    const rows = data ?? [];
    if (rows.length === 0) {
      hasMoreRows = false;
      break;
    }
    rows.forEach((row) => {
      if (row.user_id) {
        uniqueUserIds.add(row.user_id);
        rowCursor = row.user_id;
      }
    });
    if (rows.length < Math.max(limit * 4, 25)) {
      hasMoreRows = false;
    }
  }
  const userIds = Array.from(uniqueUserIds).slice(0, limit);
  const nextCursor = userIds.length === limit ? userIds[userIds.length - 1] : void 0;
  return {
    userIds,
    nextCursor
  };
};

// src/services/personRowMapper.ts
var mapDbPersonRowToPerson = (row) => {
  const customFields = row.custom_fields || {};
  const metadata = row.metadata || {};
  return {
    ...metadata,
    id: row.id,
    title: customFields.title ?? "",
    firstName: row.first_name ?? "",
    middleName: row.middle_name ?? "",
    lastName: row.last_name ?? "",
    birthName: row.birth_name ?? "",
    nickName: row.nick_name ?? "",
    suffix: row.suffix ?? "",
    gender: row.gender ?? "male",
    birthDate: row.birth_date ?? "",
    birthPlace: row.birth_place ?? "",
    birthSource: customFields.birthSource ?? "",
    marriageDate: customFields.marriageDate ?? "",
    marriagePlace: customFields.marriagePlace ?? "",
    deathDate: row.death_date ?? "",
    deathPlace: row.death_place ?? "",
    deathSource: customFields.deathSource ?? "",
    isDeceased: !!row.death_date || !!customFields.isDeceased,
    profession: row.profession ?? "",
    company: row.company ?? "",
    interests: row.interests ?? "",
    bio: row.bio ?? "",
    photoUrl: row.photo_url ?? void 0,
    photoPath: row.photo_path ?? void 0,
    photoVersion: row.photo_version ?? void 0,
    photoAsset: isPersonMediaAssetRef(customFields.photoAsset) ? customFields.photoAsset : void 0,
    gallery: Array.isArray(customFields.gallery) ? customFields.gallery : [],
    voiceNotes: Array.isArray(customFields.voiceNotes) ? customFields.voiceNotes : [],
    sources: Array.isArray(customFields.sources) ? customFields.sources : [],
    events: Array.isArray(customFields.events) ? customFields.events : [],
    email: row.email ?? "",
    website: row.website ?? "",
    blog: row.blog ?? "",
    address: row.address ?? "",
    parents: [],
    spouses: [],
    children: [],
    burialPlace: customFields.burialPlace ?? "",
    residence: customFields.residence ?? "",
    partnerDetails: customFields.partnerDetails ?? void 0,
    isPrivate: customFields.isPrivate ?? false
  };
};

// src/utils/notificationTranslations.ts
init_notifications();
init_notifications2();
var notificationTranslations = {
  en: notifications,
  ar: notifications2
};
var getNotificationTranslation = (language) => notificationTranslations[language] || notificationTranslations.en;

// src/services/notificationPolicyService.ts
var endOfIsoDay = (isoDate) => {
  const value = /* @__PURE__ */ new Date(`${isoDate}T23:59:59.999Z`);
  return Number.isNaN(value.getTime()) ? void 0 : value.toISOString();
};
var getNotificationCopy = (isRtl) => getNotificationTranslation(isRtl ? "ar" : "en");
var format = (template, replacements) => Object.entries(replacements).reduce(
  (value, [key, replacement]) => value.replaceAll(`{${key}}`, String(replacement)),
  template
);
var createBirthdayNotificationSpec = (params) => {
  const { isRtl, personId, fullName, year, age, kind, daysUntil, isDeceased, dedupeDate, eventDateIso } = params;
  const copy = getNotificationCopy(isRtl);
  const body = kind === "upcoming" ? isDeceased ? format(copy.birthdayUpcomingDeceasedBody, { name: fullName, age, days: daysUntil }) : format(copy.birthdayUpcomingBody, { name: fullName, age, days: daysUntil }) : isDeceased ? format(copy.birthdayDeceasedBody, { name: fullName, year, age }) : format(copy.birthdayBody, { name: fullName, year, age });
  return {
    notification: {
      type: "birthday",
      source: "heritage",
      title: kind === "upcoming" ? copy.birthdayUpcomingTitle : copy.birthdayTitle,
      body,
      personId,
      dedupeKey: `birthday:${personId}:${kind}:${dedupeDate}`,
      expiresAt: kind === "upcoming" ? endOfIsoDay(eventDateIso) : void 0
    }
  };
};

// src/services/scheduledNotifications.ts
var FULL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
var UPCOMING_WINDOW_DAYS = 3;
var startOfUtcDay = (date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
var formatIsoDate = (date) => date.toISOString().substring(0, 10);
var parseFullBirthDate = (value) => {
  const match = FULL_DATE_PATTERN.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(candidate.getTime()) || candidate.getUTCFullYear() !== year || candidate.getUTCMonth() !== month - 1 || candidate.getUTCDate() !== day) {
    return null;
  }
  return { year, month, day };
};
var getBirthdayOccurrence = (parsedBirthDate, now) => {
  const today = startOfUtcDay(now);
  let nextBirthday = new Date(Date.UTC(today.getUTCFullYear(), parsedBirthDate.month - 1, parsedBirthDate.day));
  if (nextBirthday.getUTCMonth() !== parsedBirthDate.month - 1 || nextBirthday.getUTCDate() !== parsedBirthDate.day) {
    return null;
  }
  if (nextBirthday < today) {
    nextBirthday = new Date(Date.UTC(today.getUTCFullYear() + 1, parsedBirthDate.month - 1, parsedBirthDate.day));
  }
  const daysUntil = Math.round((nextBirthday.getTime() - today.getTime()) / 864e5);
  if (daysUntil === 0) {
    return { kind: "today", nextBirthday, daysUntil };
  }
  if (daysUntil > 0 && daysUntil <= UPCOMING_WINDOW_DAYS) {
    return { kind: "upcoming", nextBirthday, daysUntil };
  }
  return null;
};
var getFullName = (person) => [person.firstName, person.middleName, person.lastName].filter(Boolean).join(" ").trim();
var buildScheduledBirthdayNotifications = (params) => {
  const { people, isRtl, now = /* @__PURE__ */ new Date() } = params;
  const todayIso = formatIsoDate(startOfUtcDay(now));
  return Object.values(people).flatMap((person) => {
    if (!person.birthDate) return [];
    const parsedBirthDate = parseFullBirthDate(person.birthDate);
    if (!parsedBirthDate || parsedBirthDate.year < 1700) return [];
    const occurrence = getBirthdayOccurrence(parsedBirthDate, now);
    if (!occurrence) return [];
    const fullName = getFullName(person);
    const anniversaryAge = occurrence.nextBirthday.getUTCFullYear() - parsedBirthDate.year;
    return [
      {
        personId: person.id,
        fullName,
        eventDateIso: formatIsoDate(occurrence.nextBirthday),
        spec: createBirthdayNotificationSpec({
          isRtl,
          personId: person.id,
          fullName,
          year: parsedBirthDate.year,
          age: anniversaryAge,
          kind: occurrence.kind,
          daysUntil: occurrence.daysUntil,
          isDeceased: person.isDeceased || Boolean(person.deathDate),
          dedupeDate: todayIso,
          eventDateIso: formatIsoDate(occurrence.nextBirthday)
        })
      }
    ];
  }).sort((left, right) => left.eventDateIso.localeCompare(right.eventDateIso));
};

// src/api/push-notifier.ts
import webpush from "web-push";

// src/utils/authUtils.ts
import { createClient as createClient2 } from "@supabase/supabase-js";

// src/api/push-notifier.ts
var isExpiredSubscriptionError = (error) => {
  if (!error || typeof error !== "object") return false;
  const statusCode = "statusCode" in error ? Number(error.statusCode) : NaN;
  return statusCode === 404 || statusCode === 410;
};
var buildPayload = (body) => JSON.stringify({
  title: body.title,
  body: body.body,
  icon: body.icon || "/favicon.png",
  badge: body.badge || "/favicon.png",
  tag: body.tag || "jozor-push-notification",
  data: {
    url: body.url || "/",
    ...body.data || {}
  }
});
var getVapidConfig = () => {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim() || process.env.VITE_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:hello@jozor.app";
  if (!publicKey || !privateKey) {
    throw new Error("Missing VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY environment variable.");
  }
  return { publicKey, privateKey, subject };
};
var configureWebPush = () => {
  const vapid = getVapidConfig();
  webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);
};
var sendPushToSubscription = async (subscription, payload, options) => {
  if (options?.signal?.aborted) {
    throw new Error("Aborted");
  }
  const abortPromise = new Promise((_, reject) => {
    if (options?.signal?.aborted) return reject(new Error("Aborted"));
    options?.signal?.addEventListener("abort", () => reject(new Error("Aborted")), { once: true });
  });
  const sendPromise = (async () => {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: subscription.keys
      },
      payload,
      { timeout: 5e3 }
    );
    return "sent";
  })();
  try {
    return await Promise.race([sendPromise, abortPromise]);
  } catch (error) {
    if (isExpiredSubscriptionError(error)) {
      await removeSubscriptionByEndpointServer(subscription.endpoint);
      return "pruned";
    }
    throw error;
  }
};
var sendPushNotificationToUser = async (body, options) => {
  configureWebPush();
  const subscriptions = await listSubscriptionsForUserServer(body.userId);
  if (subscriptions.length === 0) {
    return {
      sent: 0,
      pruned: 0,
      totalSubscriptions: 0
    };
  }
  const payload = buildPayload({
    ...body,
    title: body.title.trim(),
    body: body.body.trim()
  });
  const results = await Promise.allSettled(
    subscriptions.map((subscription) => sendPushToSubscription(subscription, payload, options))
  );
  let sent = 0;
  let pruned = 0;
  for (const result of results) {
    if (result.status === "fulfilled") {
      if (result.value === "sent") sent += 1;
      if (result.value === "pruned") pruned += 1;
    }
  }
  return {
    sent,
    pruned,
    totalSubscriptions: subscriptions.length
  };
};

// shared/concurrency.ts
function createLimit(concurrency) {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new Error("Concurrency must be a positive integer >= 1");
  }
  const queue = [];
  let activeCount = 0;
  const next = () => {
    activeCount--;
    if (queue.length > 0) {
      const nextCall = queue.shift();
      if (nextCall) {
        activeCount++;
        nextCall();
      }
    }
  };
  return (fn) => {
    return new Promise((resolve, reject) => {
      const run = () => {
        Promise.resolve().then(fn).then(resolve, reject).finally(next);
      };
      if (activeCount < concurrency) {
        activeCount++;
        run();
      } else {
        queue.push(run);
      }
    });
  };
}

// src/services/reminders/reminderProcessor.ts
var MAX_BATCH_SIZE = 50;
var PUSH_NOTIFICATION_TIMEOUT_MS = 5e3;
function emptyResult() {
  return {
    deliveredNotifications: 0,
    skippedNotifications: 0,
    sentSubscriptions: 0,
    prunedSubscriptions: 0
  };
}
async function fetchUserTreeMap(userIds, client) {
  const [ownedTreesResult, collaboratorRowsResult] = await Promise.all([
    client.from("trees").select("id, owner_id").in("owner_id", userIds),
    client.from("tree_collaborators").select("tree_id, collaborator_uid").in("collaborator_uid", userIds)
  ]);
  if (ownedTreesResult.error) throw ownedTreesResult.error;
  if (collaboratorRowsResult.error) throw collaboratorRowsResult.error;
  const userToTreeIds = {};
  for (const uid of userIds) {
    userToTreeIds[uid] = [];
  }
  const allTreeIds = /* @__PURE__ */ new Set();
  if (ownedTreesResult.data) {
    for (const row of ownedTreesResult.data) {
      const ownerId = row.owner_id;
      const treeId = row.id;
      if (ownerId && userToTreeIds[ownerId]) {
        userToTreeIds[ownerId].push(treeId);
        allTreeIds.add(treeId);
      }
    }
  }
  if (collaboratorRowsResult.data) {
    for (const row of collaboratorRowsResult.data) {
      const collabUid = row.collaborator_uid;
      const treeId = row.tree_id;
      if (collabUid && userToTreeIds[collabUid]) {
        userToTreeIds[collabUid].push(treeId);
        allTreeIds.add(treeId);
      }
    }
  }
  return { userToTreeIds, uniqueTreeIds: Array.from(allTreeIds) };
}
async function fetchPeopleByTree(uniqueTreeIds, client) {
  const { data: peopleData, error: peopleError } = await client.from("people").select("*").in("tree_id", uniqueTreeIds);
  if (peopleError) throw peopleError;
  const peopleByTreeId = {};
  const allowedTreeIds = new Set(uniqueTreeIds);
  for (const row of peopleData ?? []) {
    const tid = row.tree_id;
    if (tid && allowedTreeIds.has(tid)) {
      if (!peopleByTreeId[tid]) {
        peopleByTreeId[tid] = {};
      }
      peopleByTreeId[tid][row.id] = mapDbPersonRowToPerson(row);
    }
  }
  return peopleByTreeId;
}
function collectReminders(userIds, userToTreeIds, peopleByTreeId, now) {
  const reminders = [];
  for (const uid of userIds) {
    const userTrees = userToTreeIds[uid];
    if (userTrees.length === 0) continue;
    for (const tid of userTrees) {
      const treePeople = peopleByTreeId[tid] || {};
      const treeReminders = buildScheduledBirthdayNotifications({
        people: treePeople,
        isRtl: false,
        now
      });
      for (const r of treeReminders) {
        const dedupeKey = r.spec.notification.dedupeKey ? `${tid}:${r.spec.notification.dedupeKey}` : void 0;
        if (!dedupeKey) continue;
        reminders.push({
          userId: uid,
          personId: r.personId,
          dedupeKey,
          type: r.spec.notification.type,
          title: r.spec.notification.title,
          body: r.spec.notification.body,
          treeId: tid
        });
      }
    }
  }
  return reminders;
}
async function claimDeliveryKeys(reminders, client) {
  const claimedKeys = /* @__PURE__ */ new Set();
  if (reminders.length === 0) return claimedKeys;
  const claimsPayload = reminders.map((r) => ({
    user_id: r.userId,
    dedupe_key: r.dedupeKey,
    notification_type: r.type
  }));
  const { data: claimsData, error: claimsError } = await client.from("push_reminder_deliveries").upsert(claimsPayload, { onConflict: "user_id,dedupe_key", ignoreDuplicates: true }).select("user_id, dedupe_key");
  if (claimsError) throw claimsError;
  if (claimsData) {
    for (const row of claimsData) {
      claimedKeys.add(`${row.user_id}:${row.dedupe_key}`);
    }
  }
  return claimedKeys;
}
async function dispatchNotifications(reminders, claimedKeys) {
  const limit = createLimit(10);
  const results = emptyResult();
  const sendPromises = reminders.map((reminder) => {
    const isClaimed = claimedKeys.has(`${reminder.userId}:${reminder.dedupeKey}`);
    if (!isClaimed) {
      results.skippedNotifications += 1;
      return Promise.resolve();
    }
    return limit(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), PUSH_NOTIFICATION_TIMEOUT_MS);
      try {
        const delivery = await sendPushNotificationToUser(
          {
            userId: reminder.userId,
            title: reminder.title,
            body: reminder.body,
            url: reminder.personId ? `/person/${reminder.personId}` : "/",
            tag: reminder.dedupeKey,
            data: {
              source: "scheduled-reminder-cron",
              dedupeKey: reminder.dedupeKey,
              treeId: reminder.treeId,
              personId: reminder.personId,
              notificationType: reminder.type
            }
          },
          { signal: controller.signal }
        );
        results.deliveredNotifications += 1;
        results.sentSubscriptions += delivery.sent;
        results.prunedSubscriptions += delivery.pruned;
      } catch (err) {
        results.skippedNotifications += 1;
        console.error(`[ReminderProcessor] Failed to send push to user ${reminder.userId}:`, err);
      } finally {
        clearTimeout(timeoutId);
      }
    });
  });
  await Promise.all(sendPromises);
  return results;
}
async function processReminderBatch(params) {
  const cappedUserIds = params.userIds.slice(0, MAX_BATCH_SIZE);
  if (cappedUserIds.length === 0) return emptyResult();
  const { userToTreeIds, uniqueTreeIds } = await fetchUserTreeMap(cappedUserIds, params.client);
  if (uniqueTreeIds.length === 0) return emptyResult();
  const peopleByTreeId = await fetchPeopleByTree(uniqueTreeIds, params.client);
  const reminders = collectReminders(cappedUserIds, userToTreeIds, peopleByTreeId, params.now);
  const claimedKeys = await claimDeliveryKeys(reminders, params.client);
  return dispatchNotifications(reminders, claimedKeys);
}

// src/api/push-reminder-cron.ts
var DEFAULT_BATCH_SIZE = 50;
var MAX_BATCH_SIZE2 = 50;
var DEFAULT_MAX_BATCHES = 10;
var MAX_BATCHES = 25;
var DEFAULT_DELIVERY_RETENTION_DAYS = 90;
var serverClient = null;
var getEnv = (name) => {
  const value = process.env[name];
  return typeof value === "string" && value.trim() ? value : void 0;
};
var getServerClient = () => {
  const supabaseUrl2 = getEnv("SUPABASE_URL") || getEnv("VITE_SUPABASE_URL");
  const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl2 || !serviceRoleKey) {
    throw new Error("Supabase server environment variables are not configured for reminder cron.");
  }
  if (!serverClient) {
    serverClient = createClient3(supabaseUrl2, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });
  }
  return serverClient;
};
var getCronSecret = () => getEnv("CRON_SECRET");
var getCronAuthFailure = (req) => {
  const cronSecret = getCronSecret();
  if (!cronSecret) {
    return { status: 503, error: "CRON_SECRET is not configured" };
  }
  const authorization = req.headers.authorization;
  const bearerToken = authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : void 0;
  return bearerToken === cronSecret ? null : { status: 401, error: "Unauthorized" };
};
var parseBatchSize = (value) => {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_BATCH_SIZE;
  }
  return Math.min(Math.floor(parsed), MAX_BATCH_SIZE2);
};
var parseMaxBatches = (value) => {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_MAX_BATCHES;
  }
  return Math.min(Math.floor(parsed), MAX_BATCHES);
};
var parseDateOverride = (value) => {
  const rawValue = Array.isArray(value) ? value[0] : value;
  if (!rawValue) return /* @__PURE__ */ new Date();
  const parsed = new Date(rawValue);
  return Number.isNaN(parsed.getTime()) ? /* @__PURE__ */ new Date() : parsed;
};
var pruneReminderDeliveries = async (now, retentionDays = DEFAULT_DELIVERY_RETENTION_DAYS) => {
  const cutoff = new Date(now.getTime() - retentionDays * 864e5).toISOString();
  const client = getServerClient();
  const { error } = await client.from("push_reminder_deliveries").delete().lt("created_at", cutoff);
  if (error) {
    throw error;
  }
};
var processReminderBatch2 = async (params) => {
  return processReminderBatch({
    userIds: params.userIds,
    now: params.now,
    client: getServerClient()
  });
};
var addReminderResults = (target, source) => {
  target.deliveredNotifications += source.deliveredNotifications;
  target.skippedNotifications += source.skippedNotifications;
  target.sentSubscriptions += source.sentSubscriptions;
  target.prunedSubscriptions += source.prunedSubscriptions;
};
async function handler(req, res) {
  res.setHeader("Allow", ["GET"]);
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }
  try {
    const authFailure = getCronAuthFailure(req);
    if (authFailure) {
      return res.status(authFailure.status).json({ error: authFailure.error });
    }
    const batchSize = parseBatchSize(req.query.limit);
    const maxBatches = parseMaxBatches(req.query.maxBatches);
    let cursor = Array.isArray(req.query.cursor) ? req.query.cursor[0] : req.query.cursor;
    const now = parseDateOverride(req.query.date);
    await pruneReminderDeliveries(now);
    const processed = {
      deliveredNotifications: 0,
      skippedNotifications: 0,
      sentSubscriptions: 0,
      prunedSubscriptions: 0
    };
    let processedUsers = 0;
    let batchesProcessed = 0;
    let nextCursor = null;
    while (batchesProcessed < maxBatches) {
      const batch = await listSubscribedUserIdsServer({
        afterUserId: cursor,
        limit: batchSize
      });
      if (batch.userIds.length === 0) {
        nextCursor = null;
        break;
      }
      addReminderResults(processed, await processReminderBatch2({
        userIds: batch.userIds,
        now
      }));
      processedUsers += batch.userIds.length;
      batchesProcessed += 1;
      nextCursor = batch.nextCursor ?? null;
      if (!batch.nextCursor) {
        break;
      }
      cursor = batch.nextCursor;
    }
    return res.status(200).json({
      processedUsers,
      batchSize,
      batchesProcessed,
      maxBatches,
      nextCursor,
      evaluatedAt: now.toISOString(),
      ...processed
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Reminder cron failed.";
    console.error("[API_PUSH_REMINDER_CRON] Failed.", { message });
    return res.status(500).json({ error: "Reminder cron failed." });
  }
}
export {
  handler as default,
  processReminderBatch2 as processReminderBatch
};
