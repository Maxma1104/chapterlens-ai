import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    status: "ok",
    service: "chapterlens",
    mode: process.env.OPENAI_API_KEY ? "openai" : "demo",
    timestamp: new Date().toISOString(),
  });
}
