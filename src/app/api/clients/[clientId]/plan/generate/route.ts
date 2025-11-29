import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generatePlan } from "@/lib/ai/generate-plan";
import type { PlanContent } from "@/lib/types/plan";

// POST /api/clients/[clientId]/plan/generate - Generate or update plan from session
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params;
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get request body (optional session_id)
    const body = await request.json().catch(() => ({}));
    const { session_id } = body;

    // Get the client profile to verify access
    const { data: clientProfile, error: clientError } = await supabase
      .from("client_profiles")
      .select("id, therapist_id")
      .eq("id", clientId)
      .single();

    if (clientError || !clientProfile) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Verify therapist owns this client and get their style profile
    const { data: therapistProfile } = await supabase
      .from("therapist_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!therapistProfile || clientProfile.therapist_id !== therapistProfile.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Get therapist's style profile for personalized generation
    const { data: styleProfile } = await supabase
      .from("therapist_style_profiles")
      .select("*")
      .eq("therapist_id", therapistProfile.id)
      .single();

    // Get the session transcript (either specified or latest)
    let sessionQuery = supabase
      .from("sessions")
      .select("id, transcript_text, session_date")
      .eq("client_id", clientId);

    if (session_id) {
      sessionQuery = sessionQuery.eq("id", session_id);
    } else {
      sessionQuery = sessionQuery.order("session_date", { ascending: false }).limit(1);
    }

    const { data: session, error: sessionError } = await sessionQuery.single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "No session found to generate plan from" },
        { status: 404 }
      );
    }

    // Check for existing plan and get latest content
    const { data: existingPlan } = await supabase
      .from("treatment_plans")
      .select("id")
      .eq("client_id", clientId)
      .single();

    let existingContent: PlanContent | undefined;

    if (existingPlan) {
      const { data: latestVersion } = await supabase
        .from("plan_versions")
        .select("content")
        .eq("plan_id", existingPlan.id)
        .order("version_number", { ascending: false })
        .limit(1)
        .single();

      if (latestVersion) {
        existingContent = latestVersion.content as PlanContent;
      }
    }

    // Generate plan using AI (with therapist style if available)
    const result = await generatePlan({
      transcript: session.transcript_text,
      existingPlan: existingContent,
      therapistStyle: styleProfile || null,
    });

    if (!result.success || !result.content) {
      return NextResponse.json(
        { error: result.error || "Failed to generate plan" },
        { status: 500 }
      );
    }

    // Create or update treatment plan
    let planId: string;

    if (existingPlan) {
      planId = existingPlan.id;
      // Update the updated_at timestamp
      await supabase
        .from("treatment_plans")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", planId);
    } else {
      // Create new treatment plan
      const { data: newPlan, error: createError } = await supabase
        .from("treatment_plans")
        .insert({ client_id: clientId })
        .select("id")
        .single();

      if (createError || !newPlan) {
        console.error("Error creating plan:", createError);
        return NextResponse.json(
          { error: "Failed to create treatment plan" },
          { status: 500 }
        );
      }

      planId = newPlan.id;
    }

    // Get the next version number
    const { data: versions } = await supabase
      .from("plan_versions")
      .select("version_number")
      .eq("plan_id", planId)
      .order("version_number", { ascending: false })
      .limit(1);

    const nextVersion = versions && versions.length > 0 
      ? versions[0].version_number + 1 
      : 1;

    // Create new plan version
    const { data: newVersion, error: versionError } = await supabase
      .from("plan_versions")
      .insert({
        plan_id: planId,
        version_number: nextVersion,
        source_session_id: session.id,
        status: "draft",
        content: result.content,
      })
      .select("*")
      .single();

    if (versionError || !newVersion) {
      console.error("Error creating version:", versionError);
      return NextResponse.json(
        { error: "Failed to save plan version" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      plan: {
        id: planId,
        client_id: clientId,
        current_version: newVersion,
      },
    });
  } catch (error) {
    console.error("Error in plan generation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

