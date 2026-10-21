const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GITHUB_REPO = "hasan2llpm-prog/Student";
const GITHUB_API = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

type GitHubAsset = {
  name?: string;
  browser_download_url?: string;
};

type GitHubRelease = {
  tag_name?: string;
  draft?: boolean;
  prerelease?: boolean;
  assets?: GitHubAsset[];
};

type UpdateManifest = {
  versionCode?: number;
  versionName?: string;
  apkAsset?: string;
  forceUpdate?: boolean;
  minimumVersionCode?: number;
  message?: string;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function serviceHeaders(extra: Record<string, string> = {}) {
  return {
    apikey: SERVICE_ROLE,
    Authorization: `Bearer ${SERVICE_ROLE}`,
    "content-type": "application/json",
    ...extra,
  };
}

async function currentLatestVersion(): Promise<number> {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/student_runtime_settings?id=eq.1&select=latest_version_code&limit=1`,
    { headers: serviceHeaders() },
  );
  if (!response.ok) throw new Error(`runtime_read_failed:${response.status}:${await response.text()}`);
  const rows = await response.json();
  return Number(rows?.[0]?.latest_version_code || 0);
}

async function updateRuntime(manifest: Required<Pick<UpdateManifest, "versionCode" | "versionName" | "apkAsset">> & UpdateManifest, apkUrl: string) {
  const versionCode = Number(manifest.versionCode);
  const forceUpdate = manifest.forceUpdate === true;
  const minimumVersionCode = forceUpdate
    ? versionCode
    : Math.max(0, Number(manifest.minimumVersionCode || 0));
  const message = String(manifest.message || `يتوفر تحديث Student ${manifest.versionName}.`).slice(0, 500);

  const response = await fetch(`${SUPABASE_URL}/rest/v1/student_runtime_settings?id=eq.1`, {
    method: "PATCH",
    headers: serviceHeaders({ Prefer: "return=representation" }),
    body: JSON.stringify({
      force_update: forceUpdate,
      minimum_version_code: minimumVersionCode,
      latest_version_code: versionCode,
      apk_url: apkUrl,
      update_message: message,
      updated_at: new Date().toISOString(),
      updated_by: null,
    }),
  });
  if (!response.ok) throw new Error(`runtime_update_failed:${response.status}:${await response.text()}`);
  return { forceUpdate, minimumVersionCode, message };
}

async function createBroadcastOnce(versionCode: number, versionName: string, apkUrl: string, message: string, forceUpdate: boolean) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/notifications`, {
    method: "POST",
    headers: serviceHeaders({ Prefer: "return=minimal" }),
    body: JSON.stringify({
      user_id: null,
      actor_id: null,
      type: "app_update",
      title: `تحديث Student ${versionName}`,
      body: message,
      audience: "all",
      is_broadcast: true,
      icon: "⬆️",
      kind: "app_update",
      link: apkUrl,
      metadata: {
        version_code: versionCode,
        version_name: versionName,
        apk_url: apkUrl,
        force_update: forceUpdate,
      },
    }),
  });
  if (!response.ok) throw new Error(`notification_insert_failed:${response.status}:${await response.text()}`);
}

Deno.serve(async (req) => {
  if (req.method !== "POST" && req.method !== "GET") return json({ ok: false, error: "method_not_allowed" }, 405);

  try {
    const releaseResponse = await fetch(GITHUB_API, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "Student-Update-Sync/1.0",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    if (!releaseResponse.ok) {
      return json({ ok: false, error: "github_latest_failed", status: releaseResponse.status }, 502);
    }

    const release = (await releaseResponse.json()) as GitHubRelease;
    if (release.draft || release.prerelease) return json({ ok: false, error: "latest_release_not_production" }, 409);
    const assets = Array.isArray(release.assets) ? release.assets : [];
    const manifestAsset = assets.find((a) => a.name === "update.json");
    if (!manifestAsset?.browser_download_url) return json({ ok: false, error: "update_manifest_missing" }, 409);

    const manifestResponse = await fetch(manifestAsset.browser_download_url, {
      headers: { "User-Agent": "Student-Update-Sync/1.0" },
    });
    if (!manifestResponse.ok) return json({ ok: false, error: "update_manifest_fetch_failed" }, 502);
    const manifest = (await manifestResponse.json()) as UpdateManifest;

    const versionCode = Number(manifest.versionCode);
    const versionName = String(manifest.versionName || "").trim();
    const apkAssetName = String(manifest.apkAsset || "").trim();
    if (!Number.isInteger(versionCode) || versionCode <= 0 || !versionName || !apkAssetName.endsWith(".apk")) {
      return json({ ok: false, error: "invalid_update_manifest" }, 400);
    }
    if (release.tag_name && release.tag_name !== `v${versionName}`) {
      return json({ ok: false, error: "tag_version_mismatch", tag: release.tag_name, versionName }, 409);
    }

    const apkAsset = assets.find((a) => a.name === apkAssetName);
    const apkUrl = String(apkAsset?.browser_download_url || "");
    if (!apkUrl.startsWith("https://github.com/") || !apkUrl.endsWith(".apk")) {
      return json({ ok: false, error: "apk_asset_missing_or_invalid" }, 409);
    }

    const previousLatest = await currentLatestVersion();
    const runtime = await updateRuntime(
      {
        ...manifest,
        versionCode,
        versionName,
        apkAsset: apkAssetName,
      },
      apkUrl,
    );

    let broadcast = false;
    if (versionCode > previousLatest) {
      await createBroadcastOnce(versionCode, versionName, apkUrl, runtime.message, runtime.forceUpdate);
      broadcast = true;
    }

    return json({
      ok: true,
      repo: GITHUB_REPO,
      tag: release.tag_name,
      versionCode,
      versionName,
      apkUrl,
      forceUpdate: runtime.forceUpdate,
      minimumVersionCode: runtime.minimumVersionCode,
      broadcast,
    });
  } catch (error) {
    console.error("sync-github-update error", error);
    return json({ ok: false, error: String(error?.message || error) }, 500);
  }
});
