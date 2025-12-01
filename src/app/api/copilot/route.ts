import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateCopilotResponse } from "@/lib/ai/generate-copilot";
import type { CopilotAction } from "@/lib/types/copilot";
import { CLIENT_ALLOWED_ACTIONS } from "@/lib/types/copilot";
import type { PlanContent } from "@/lib/types/plan";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user role
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const { action, planId, goalId, interventionId, userQuery } = body as {
      action: CopilotAction;
      planId: string;
      goalId?: string;
      interventionId?: string;
      userQuery?: string;
    };

    if (!action || !planId) {
      return NextResponse.json(
        { error: "Missing required fields: action and planId" },
        { status: 400 }
      );
    }

    // Check role-based access
    const isClient = userData.role === "client";
    if (isClient && !CLIENT_ALLOWED_ACTIONS.includes(action)) {
      return NextResponse.json(
        { error: "Action not allowed for clients" },
        { status: 403 }
      );
    }

    // Fetch plan to verify access
    const { data: plan, error: planError } = await supabase
      .from("treatment_plans")
      .select("id, client_id")
      .eq("id", planId)
      .single();

    if (planError || !plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    // Get therapist ID for RAG retrieval
    let therapistId: string | undefined;

    if (isClient) {
      // Verify client has access to this plan
      const { data: clientProfile } = await supabase
        .from("client_profiles")
        .select("id, therapist_id")
        .eq("user_id", user.id)
        .single();

      if (!clientProfile || clientProfile.id !== plan.client_id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }

      therapistId = clientProfile.therapist_id;
    } else {
      // Therapist - verify they own this client
      const { data: therapistProfile } = await supabase
        .from("therapist_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!therapistProfile) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }

      // Verify the client belongs to this therapist
      const { data: clientProfile } = await supabase
        .from("client_profiles")
        .select("therapist_id")
        .eq("id", plan.client_id)
        .single();

      if (!clientProfile || clientProfile.therapist_id !== therapistProfile.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }

      therapistId = therapistProfile.id;
    }

    // Get latest plan version content
    const { data: version } = await supabase
      .from("plan_versions")
      .select("content")
      .eq("plan_id", planId)
      .order("version_number", { ascending: false })
      .limit(1)
      .single();

    if (!version) {
      return NextResponse.json(
        { error: "No plan version found" },
        { status: 404 }
      );
    }

    const planContent = version.content as PlanContent;

    // Get recent transcript for context (therapist only, for suggest_interventions)
    let recentTranscript: string | undefined;
    if (!isClient && action === "suggest_interventions") {
      const { data: session } = await supabase
        .from("sessions")
        .select("transcript_text")
        .eq("client_id", plan.client_id)
        .order("session_date", { ascending: false })
        .limit(1)
        .single();

      recentTranscript = session?.transcript_text;
    }

    // Generate copilot response
    const result = await generateCopilotResponse({
      action,
      context: {
        goalId,
        interventionId,
        planContent,
        recentTranscript,
      },
      userQuery,
      therapistId,
      isClient,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Copilot API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

