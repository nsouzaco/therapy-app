import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { PlanContent } from "@/lib/types/plan";

// Client-safe plan content (excludes clinical and risk data)
interface ClientPlanContent {
  presenting_concerns: string;
  what_were_working_on: string;
  goals: Array<{
    id: string;
    type: "short_term" | "long_term";
    goal: string;
    target_date?: string;
  }>;
  interventions: Array<{
    id: string;
    name: string;
    description: string;
    frequency: string;
  }>;
  homework: Array<{
    id: string;
    task: string;
    purpose: string;
    due_date?: string;
  }>;
  strengths: Array<{
    id: string;
    strength: string;
    how_to_leverage: string;
  }>;
}

function filterForClient(content: PlanContent): ClientPlanContent {
  return {
    presenting_concerns: content.presenting_concerns.client_facing,
    what_were_working_on: content.clinical_impressions.client_facing,
    goals: content.goals.map((g) => ({
      id: g.id,
      type: g.type,
      goal: g.client_facing,
      target_date: g.target_date,
    })),
    interventions: content.interventions.map((i) => ({
      id: i.id,
      name: i.name,
      description: i.client_facing,
      frequency: i.frequency,
    })),
    homework: content.homework.map((h) => ({
      id: h.id,
      task: h.task,
      purpose: h.purpose,
      due_date: h.due_date,
    })),
    strengths: content.strengths.map((s) => ({
      id: s.id,
      strength: s.strength,
      how_to_leverage: s.how_to_leverage,
    })),
  };
}

// GET /api/client/plan - Get current plan for authenticated client
export async function GET() {
  try {
    const supabase = await createClient();

    // Check authentication
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

    if (!userData || userData.role !== "client") {
      return NextResponse.json(
        { error: "Only clients can access this endpoint" },
        { status: 403 }
      );
    }

    // Get client profile
    const { data: clientProfile } = await supabase
      .from("client_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!clientProfile) {
      return NextResponse.json({ plan: null }, { status: 200 });
    }

    // Get treatment plan
    const { data: plan } = await supabase
      .from("treatment_plans")
      .select("id, created_at, updated_at")
      .eq("client_id", clientProfile.id)
      .single();

    if (!plan) {
      return NextResponse.json({ plan: null }, { status: 200 });
    }

    // Get latest approved version (clients only see approved plans)
    const { data: version } = await supabase
      .from("plan_versions")
      .select("id, version_number, content, created_at, status")
      .eq("plan_id", plan.id)
      .eq("status", "approved")
      .order("version_number", { ascending: false })
      .limit(1)
      .single();

    if (!version) {
      // No approved version yet
      return NextResponse.json({ plan: null }, { status: 200 });
    }

    // Filter content to only include client-facing fields
    const clientContent = filterForClient(version.content as PlanContent);

    return NextResponse.json({
      plan: {
        id: plan.id,
        updated_at: plan.updated_at,
        version: version.version_number,
        content: clientContent,
      },
    });
  } catch (error) {
    console.error("Error fetching client plan:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

