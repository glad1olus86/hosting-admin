import { NextRequest, NextResponse } from "next/server";
import { getJobStatus } from "@/lib/wordpress-installer";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId");

  if (!jobId) {
    return NextResponse.json({ error: "jobId is required" }, { status: 400 });
  }

  const status = getJobStatus(jobId);
  if (!status) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json(status);
}
