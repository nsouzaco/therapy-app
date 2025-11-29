import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { comparePlanVersions } from "@/lib/utils/diff-plans";
import type { PlanContent } from "@/lib/types/plan";

// GET /api/plans/[planId]/compare?v1=versionId1&v2=versionId2
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const { planId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const v1 = searchParams.get("v1"); // Older version
    const v2 = searchParams.get("v2"); // Newer version

    if (!v1 || !v2) {
      return NextResponse.json(
        { error: "Both v1 and v2 version IDs are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch both versions
    const { data: versions, error } = await supabase
      .from("plan_versions")
      .select("id, version_number, status, content, created_at")
      .eq("plan_id", planId)
      .in("id", [v1, v2]);

    if (error || !versions || versions.length !== 2) {
      return NextResponse.json(
        { error: "Failed to fetch versions" },
        { status: 500 }
      );
    }

    // Sort by version number to ensure correct order
    const sorted = versions.sort((a, b) => a.version_number - b.version_number);
    const oldVersion = sorted[0];
    const newVersion = sorted[1];

    const diff = comparePlanVersions(
      oldVersion.content as PlanContent,
      newVersion.content as PlanContent
    );

    return NextResponse.json({
      old_version: {
        id: oldVersion.id,
        version_number: oldVersion.version_number,
        status: oldVersion.status,
        created_at: oldVersion.created_at,
        content: oldVersion.content,
      },
      new_version: {
        id: newVersion.id,
        version_number: newVersion.version_number,
        status: newVersion.status,
        created_at: newVersion.created_at,
        content: newVersion.content,
      },
      diff,
    });
  } catch (error) {
    console.error("Error in compare versions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

