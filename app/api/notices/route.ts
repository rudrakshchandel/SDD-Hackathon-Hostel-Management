import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const NOTICE_AUDIENCES = [
  "ALL",
  "ALL_RESIDENTS",
  "BLOCK_SPECIFIC",
  "FLOOR_SPECIFIC",
  "ROOM_SPECIFIC"
] as const;

const NOTICE_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const status = (url.searchParams.get("status") || "").toUpperCase();

  const notices = await prisma.notice.findMany({
    where: status && NOTICE_STATUSES.includes(status as (typeof NOTICE_STATUSES)[number])
      ? { status: status as (typeof NOTICE_STATUSES)[number] }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: 200
  });

  return NextResponse.json({ data: notices });
}

export async function POST(request: Request) {
  const body = await request.json();
  const title = String(body.title || "");
  const noticeBody = String(body.body || "");
  const audience = String(body.audience || "ALL");
  const status = String(body.status || "DRAFT");

  if (!title || !noticeBody) {
    return NextResponse.json({ error: "title and body are required" }, { status: 400 });
  }

  if (!NOTICE_AUDIENCES.includes(audience as (typeof NOTICE_AUDIENCES)[number])) {
    return NextResponse.json({ error: "Invalid notice audience" }, { status: 400 });
  }

  if (!NOTICE_STATUSES.includes(status as (typeof NOTICE_STATUSES)[number])) {
    return NextResponse.json({ error: "Invalid notice status" }, { status: 400 });
  }

  const noticeAudience = audience as (typeof NOTICE_AUDIENCES)[number];
  const noticeStatus = status as (typeof NOTICE_STATUSES)[number];

  const notice = await prisma.notice.create({
    data: {
      title,
      body: noticeBody,
      audience: noticeAudience,
      status: noticeStatus,
      hostelId: body.hostelId ? String(body.hostelId) : null,
      publishedAt: noticeStatus === "PUBLISHED" ? new Date() : null
    }
  });

  return NextResponse.json({ data: notice }, { status: 201 });
}
