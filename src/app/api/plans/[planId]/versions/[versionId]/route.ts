import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { PlanContent } from "@/lib/types/plan";

interface RouteParams {
  params: Promise<{ planId: string; versionId: string }>;
}

// GET /api/plans/[planId]/versions/[versionId] - Get specific version
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { planId, versionId } = await params;
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: version, error } = await supabase
      .from("plan_versions")
      .select("*")
      .eq("id", versionId)
      .eq("plan_id", planId)
      .single();

    if (error || !version) {
      return NextResponse.json(
        { error: "Version not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ version });
  } catch (error) {
    console.error("Error in GET version:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/plans/[planId]/versions/[versionId] - Update plan content
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { planId, versionId } = await params;
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user is a therapist and owns this plan
    const { data: therapistProfile } = await supabase
      .from("therapist_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!therapistProfile) {
      return NextResponse.json(
        { error: "Only therapists can edit plans" },
        { status: 403 }
      );
    }

    // Get the plan to verify ownership
    const { data: plan } = await supabase
      .from("treatment_plans")
      .select(
        `
        id,
        client_profiles!inner(
          therapist_id
        )
      `
      )
      .eq("id", planId)
      .single();

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    // Get body with updated content
    const body = await request.json();
    const { content, status } = body as {
      content?: Partial<PlanContent>;
      status?: "draft" | "approved";
    };

    // Get current version
    const { data: currentVersion } = await supabase
      .from("plan_versions")
      .select("content")
      .eq("id", versionId)
      .eq("plan_id", planId)
      .single();

    if (!currentVersion) {
      return NextResponse.json(
        { error: "Version not found" },
        { status: 404 }
      );
    }

    // Merge content updates
    const updatedContent = content
      ? { ...(currentVersion.content as PlanContent), ...content }
      : currentVersion.content;

    // Update the version
    const updateData: Record<string, unknown> = {
      content: updatedContent,
    };

    if (status) {
      updateData.status = status;
    }

    const { data: updatedVersion, error: updateError } = await supabase
      .from("plan_versions")
      .update(updateData)
      .eq("id", versionId)
      .eq("plan_id", planId)
      .select("*")
      .single();

    if (updateError || !updatedVersion) {
      console.error("Error updating version:", updateError);
      return NextResponse.json(
        { error: "Failed to update version" },
        { status: 500 }
      );
    }

    // Update plan's updated_at
    await supabase
      .from("treatment_plans")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", planId);

    return NextResponse.json({
      success: true,
      version: updatedVersion,
    });
  } catch (error) {
    console.error("Error in PUT version:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

