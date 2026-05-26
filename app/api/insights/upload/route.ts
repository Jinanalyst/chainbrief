import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasSupabaseAdminConfig } from "@/lib/supabase/admin";
import { supabaseUrl } from "@/lib/supabase/config";
import { isInsightAuthor } from "@/lib/insights";

const ALLOWED_IMAGE = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
]);
const ALLOWED_VIDEO = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const MAX_BYTES = 100 * 1024 * 1024; // 100 MB

function extFromName(name: string): string {
  const m = /\.[a-zA-Z0-9]+$/.exec(name);
  return m ? m[0].toLowerCase() : "";
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "sign in required" }, { status: 401 });
  }
  if (!isInsightAuthor(user.email)) {
    return NextResponse.json({ error: "not authorised" }, { status: 403 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!form || !(file instanceof File)) {
    return NextResponse.json({ error: "missing file field" }, { status: 400 });
  }

  const type = file.type || "application/octet-stream";
  const isImage = ALLOWED_IMAGE.has(type);
  const isVideo = ALLOWED_VIDEO.has(type);
  if (!isImage && !isVideo) {
    return NextResponse.json({ error: `unsupported mime: ${type}` }, { status: 415 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `file too large (max ${MAX_BYTES / 1024 / 1024} MB)` },
      { status: 413 },
    );
  }

  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json(
      { error: "server missing SUPABASE_SERVICE_ROLE_KEY" },
      { status: 500 },
    );
  }

  const admin = createAdminClient();
  const ext = extFromName(file.name) || (isVideo ? ".mp4" : ".bin");
  const key = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await admin.storage
    .from("insights-media")
    .upload(key, buffer, {
      contentType: type,
      upsert: false,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const publicUrl = `${supabaseUrl}/storage/v1/object/public/insights-media/${key}`;
  return NextResponse.json({
    url: publicUrl,
    kind: isVideo ? "video" : "image",
    mime_type: type,
  });
}
