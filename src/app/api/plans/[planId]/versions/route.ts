import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { comparePlanVersions, getDiffSummary } from "@/lib/utils/diff-plans";
import type { PlanContent } from "@/lib/types/plan";

// GET /api/plans/[planId]/versions - Get all versions with diffs
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const { planId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all versions for this plan, ordered by version number
    const { data: versions, error } = await supabase
      .from("plan_versions")
      .select(`
        id,
        version_number,
        status,
        content,
        created_at,
        source_session_id,
        sessions:source_session_id (
          session_date
        )
      `)
      .eq("plan_id", planId)
      .order("version_number", { ascending: false });

    if (error) {
      console.error("Error fetching versions:", error);
      return NextResponse.json(
        { error: "Failed to fetch versions" },
        { status: 500 }
      );
    }

    // Calculate diffs between consecutive versions
    const versionsWithDiffs = versions?.map((version, index) => {
      const previousVersion = versions[index + 1]; // Next in array is previous (desc order)
      const currentContent = version.content as PlanContent;
      const previousContent = previousVersion?.content as PlanContent | null;
      
      const diff = comparePlanVersions(previousContent || null, currentContent);
      const diffSummary = getDiffSummary(diff);

      // Handle the sessions relationship - Supabase returns object for single FK join
      const sessions = version.sessions as { session_date: string } | { session_date: string }[] | null;
      let sessionDate: string | undefined;
      if (sessions) {
        if (Array.isArray(sessions) && sessions.length > 0) {
          sessionDate = sessions[0]?.session_date;
        } else if (!Array.isArray(sessions)) {
          sessionDate = sessions.session_date;
        }
      }

      return {
        id: version.id,
        version_number: version.version_number,
        status: version.status,
        created_at: version.created_at,
        source_session_date: sessionDate,
        diff_summary: diffSummary,
        is_first_version: !previousVersion,
      };
    });

    return NextResponse.json({ versions: versionsWithDiffs });
  } catch (error) {
    console.error("Error in GET versions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

