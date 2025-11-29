import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET /api/therapist/clients/[id] - Get single client with sessions and plan
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get therapist profile
    const { data: therapistProfile, error: profileError } = await supabase
      .from("therapist_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (profileError || !therapistProfile) {
      return NextResponse.json(
        { error: "Therapist profile not found" },
        { status: 404 }
      );
    }

    // Get the client (ensuring they belong to this therapist)
    const { data: client, error: clientError } = await supabase
      .from("client_profiles")
      .select(`
        id,
        created_at,
        therapist_id,
        users!client_profiles_user_id_fkey (
          id,
          name,
          email
        ),
        sessions (
          id,
          session_date,
          transcript_text,
          created_at
        )
      `)
      .eq("id", id)
      .eq("therapist_id", therapistProfile.id)
      .single();

    if (clientError || !client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Fetch treatment plan separately (more reliable than nested query)
    const { data: treatmentPlan, error: planError } = await supabase
      .from("treatment_plans")
      .select(`
        id,
        created_at,
        updated_at,
        plan_versions (
          id,
          version_number,
          status,
          created_at
        )
      `)
      .eq("client_id", id)
      .single();


    // Transform sessions - sort by date, truncate transcript for preview
    const sessions = (client.sessions || [])
      .sort(
        (a, b) =>
          new Date(b.session_date).getTime() - new Date(a.session_date).getTime()
      )
      .map((session) => ({
        id: session.id,
        session_date: session.session_date,
        transcript_preview:
          session.transcript_text.substring(0, 200) +
          (session.transcript_text.length > 200 ? "..." : ""),
        created_at: session.created_at,
      }));

    // Get plan info
    const plan = treatmentPlan;
    const latestVersion = plan?.plan_versions?.sort(
      (a: { version_number: number }, b: { version_number: number }) => 
        b.version_number - a.version_number
    )[0];


    // Cast users to single object (it's a one-to-one relation)
    const userInfo = client.users as unknown as { id: string; name: string; email: string } | null;

    const transformedClient = {
      id: client.id,
      user_id: userInfo?.id,
      name: userInfo?.name || "Unknown",
      email: userInfo?.email || "",
      created_at: client.created_at,
      sessions,
      session_count: sessions.length,
      plan: plan
        ? {
            id: plan.id,
            created_at: plan.created_at,
            updated_at: plan.updated_at,
            current_version: latestVersion
              ? {
                  id: latestVersion.id,
                  version_number: latestVersion.version_number,
                  status: latestVersion.status,
                }
              : null,
          }
        : null,
    };

    return NextResponse.json({ client: transformedClient });
  } catch (error) {
    console.error("Error in GET /api/therapist/clients/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

