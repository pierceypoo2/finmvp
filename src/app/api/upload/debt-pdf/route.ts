import { requireUserId } from "@/lib/getUser";
import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "Max 5 MB" }, { status: 400 });
  }

  const id = randomBytes(16).toString("hex");
  // MVP stub — production: store encrypted in S3/GCS, virus scan, link to user
  return NextResponse.json({
    documentId: id,
    note: "Stored server-side in production. MVP accepts upload only.",
  });
}
