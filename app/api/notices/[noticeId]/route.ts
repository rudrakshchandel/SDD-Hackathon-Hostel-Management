import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const NOTICE_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
const NOTICE_AUDIENCES = [
  "ALL",
  "ALL_RESIDENTS",
  "BLOCK_SPECIFIC",
  "FLOOR_SPECIFIC",
  "ROOM_SPECIFIC"
] as const;

export async function PATCH(
  request: Request,
  { params }: { params: { noticeId: string } }
) {
  const noticeId = params.noticeId;
  const body = await request.json();
  const status = body.status ? String(body.status) : null;
  const audience = body.audience ? String(body.audience) : null;

  if (!noticeId) {
    return NextResponse.json({ error: "noticeId is required" }, { status: 400 });
  }

  if (status && !NOTICE_STATUSES.includes(status as (typeof NOTICE_STATUSES)[number])) {
    return NextResponse.json({ error: "Invalid notice status" }, { status: 400 });
  }
  if (
    audience &&
    !NOTICE_AUDIENCES.includes(audience as (typeof NOTICE_AUDIENCES)[number])
  ) {
    return NextResponse.json({ error: "Invalid notice audience" }, { status: 400 });
  }

  const noticeStatus = status
    ? (status as (typeof NOTICE_STATUSES)[number])
    : undefined;
  const noticeAudience = audience
    ? (audience as (typeof NOTICE_AUDIENCES)[number])
    : undefined;

  try {
    const notice = await prisma.notice.update({
      where: { id: noticeId },
      data: {
        title: body.title !== undefined ? String(body.title) : undefined,
        body: body.body !== undefined ? String(body.body) : undefined,
        audience: noticeAudience,
        status: noticeStatus,
        publishedAt: noticeStatus === "PUBLISHED" ? new Date() : undefined,
        archivedAt: noticeStatus === "ARCHIVED" ? new Date() : noticeStatus ? null : undefined
      }
    });

    return NextResponse.json({ data: notice });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Notice update failed" },
      { status: 400 }
    );
  }
}
