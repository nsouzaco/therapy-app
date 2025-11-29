import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/clients/[clientId]/plan - Get current plan for a client
export async function GET(
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

    // Get the treatment plan with latest version
    const { data: plan, error: planError } = await supabase
      .from("treatment_plans")
      .select(
        `
        id,
        client_id,
        created_at,
        updated_at
      `
      )
      .eq("client_id", clientId)
      .single();

    if (planError && planError.code !== "PGRST116") {
      console.error("Error fetching plan:", planError);
      return NextResponse.json(
        { error: "Failed to fetch plan" },
        { status: 500 }
      );
    }

    if (!plan) {
      return NextResponse.json({ plan: null }, { status: 200 });
    }

    // Get the latest version
    const { data: latestVersion, error: versionError } = await supabase
      .from("plan_versions")
      .select("*")
      .eq("plan_id", plan.id)
      .order("version_number", { ascending: false })
      .limit(1)
      .single();

    if (versionError && versionError.code !== "PGRST116") {
      console.error("Error fetching version:", versionError);
      return NextResponse.json(
        { error: "Failed to fetch plan version" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      plan: {
        ...plan,
        current_version: latestVersion || null,
      },
    });
  } catch (error) {
    console.error("Error in GET plan:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

