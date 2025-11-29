import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/client/sessions - List sessions for authenticated client (dates only)
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
      return NextResponse.json({ sessions: [] }, { status: 200 });
    }

    // Get sessions (dates only, no transcript content)
    const { data: sessions, error } = await supabase
      .from("sessions")
      .select("id, session_date, created_at")
      .eq("client_id", clientProfile.id)
      .order("session_date", { ascending: false });

    if (error) {
      console.error("Error fetching sessions:", error);
      return NextResponse.json(
        { error: "Failed to fetch sessions" },
        { status: 500 }
      );
    }

    return NextResponse.json({ sessions: sessions || [] });
  } catch (error) {
    console.error("Error in client sessions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

