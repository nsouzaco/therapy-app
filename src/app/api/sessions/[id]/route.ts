import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET /api/sessions/[id] - Get single session detail
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

    // Get the session with client info
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select(`
        id,
        session_date,
        transcript_text,
        created_at,
        client_id,
        client_profiles!sessions_client_id_fkey (
          id,
          therapist_id,
          users!client_profiles_user_id_fkey (
            id,
            name,
            email
          )
        )
      `)
      .eq("id", id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Verify access - either therapist owns the client or user is the client
    const { data: therapistProfile } = await supabase
      .from("therapist_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    // client_profiles comes as an object from the join (single relation)
    const clientProfile = session.client_profiles as unknown as {
      id: string;
      therapist_id: string;
      users: { id: string; name: string; email: string };
    };
    
    const isTherapist = therapistProfile?.id === clientProfile?.therapist_id;
    const isClient = clientProfile?.users?.id === user.id;

    if (!isTherapist && !isClient) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json({
      session: {
        id: session.id,
        session_date: session.session_date,
        transcript_text: session.transcript_text,
        transcript_length: session.transcript_text.length,
        created_at: session.created_at,
        client: {
          id: clientProfile?.id,
          name: clientProfile?.users?.name || "Unknown",
          email: clientProfile?.users?.email || "",
        },
      },
    });
  } catch (error) {
    console.error("Error in GET /api/sessions/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

