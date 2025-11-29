import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET /api/clients/[clientId]/sessions - List sessions for a client
export async function GET(
  request: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params;
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify therapist owns this client
    const { data: therapistProfile } = await supabase
      .from("therapist_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (therapistProfile) {
      const { data: clientProfile } = await supabase
        .from("client_profiles")
        .select("id")
        .eq("id", clientId)
        .eq("therapist_id", therapistProfile.id)
        .single();

      if (!clientProfile) {
        return NextResponse.json({ error: "Client not found" }, { status: 404 });
      }
    }

    // Get sessions
    const { data: sessions, error: sessionsError } = await supabase
      .from("sessions")
      .select("id, session_date, transcript_text, created_at")
      .eq("client_id", clientId)
      .order("session_date", { ascending: false });

    if (sessionsError) {
      console.error("Error fetching sessions:", sessionsError);
      return NextResponse.json(
        { error: "Failed to fetch sessions" },
        { status: 500 }
      );
    }

    // Transform sessions with preview
    const transformedSessions = sessions?.map((session) => ({
      id: session.id,
      session_date: session.session_date,
      transcript_preview:
        session.transcript_text.substring(0, 200) +
        (session.transcript_text.length > 200 ? "..." : ""),
      transcript_length: session.transcript_text.length,
      created_at: session.created_at,
    }));

    return NextResponse.json({ sessions: transformedSessions });
  } catch (error) {
    console.error("Error in GET /api/clients/[clientId]/sessions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/clients/[clientId]/sessions - Create new session with transcript
export async function POST(
  request: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params;
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify therapist owns this client
    const { data: therapistProfile } = await supabase
      .from("therapist_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!therapistProfile) {
      return NextResponse.json(
        { error: "Therapist profile not found" },
        { status: 404 }
      );
    }

    const { data: clientProfile } = await supabase
      .from("client_profiles")
      .select("id")
      .eq("id", clientId)
      .eq("therapist_id", therapistProfile.id)
      .single();

    if (!clientProfile) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const body = await request.json();
    const { session_date, transcript_text } = body;

    if (!session_date || !transcript_text) {
      return NextResponse.json(
        { error: "Session date and transcript are required" },
        { status: 400 }
      );
    }

    // Validate transcript length (max 50k characters as per PRD)
    if (transcript_text.length > 50000) {
      return NextResponse.json(
        { error: "Transcript exceeds maximum length of 50,000 characters" },
        { status: 400 }
      );
    }

    // Create the session
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .insert({
        client_id: clientId,
        session_date,
        transcript_text,
      })
      .select()
      .single();

    if (sessionError) {
      console.error("Error creating session:", sessionError);
      return NextResponse.json(
        { error: "Failed to create session" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Session created successfully",
      session: {
        id: session.id,
        session_date: session.session_date,
        created_at: session.created_at,
      },
    });
  } catch (error) {
    console.error("Error in POST /api/clients/[clientId]/sessions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

