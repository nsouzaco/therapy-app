import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Helper to verify therapist access
async function verifyTherapistAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  sessionId: string
) {
  const { data: therapistProfile } = await supabase
    .from("therapist_profiles")
    .select("id")
    .eq("user_id", userId)
    .single();

  if (!therapistProfile) return false;

  const { data: session } = await supabase
    .from("sessions")
    .select(`
      client_profiles!sessions_client_id_fkey (
        therapist_id
      )
    `)
    .eq("id", sessionId)
    .single();

  const clientProfile = session?.client_profiles as unknown as { therapist_id: string } | null;
  return clientProfile?.therapist_id === therapistProfile.id;
}

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
        summary_therapist,
        summary_client,
        key_themes,
        progress_notes,
        media_storage_path,
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

    // Generate signed URL for video playback if media exists
    let videoUrl: string | null = null;
    const mediaPath = session.media_storage_path as string | null;
    if (mediaPath) {
      const { data: signedUrlData } = await supabase.storage
        .from("session-media")
        .createSignedUrl(mediaPath, 3600); // 1 hour expiry
      videoUrl = signedUrlData?.signedUrl || null;
    }

    return NextResponse.json({
      session: {
        id: session.id,
        session_date: session.session_date,
        transcript_text: session.transcript_text,
        transcript_length: session.transcript_text.length,
        created_at: session.created_at,
        summary_therapist: session.summary_therapist,
        summary_client: session.summary_client,
        key_themes: session.key_themes,
        progress_notes: session.progress_notes,
        video_url: videoUrl,
        video_filename: mediaPath ? mediaPath.split("/").pop() : null,
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

// PATCH /api/sessions/[id] - Update session summaries
export async function PATCH(
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

    // Verify therapist has access to this session
    const hasAccess = await verifyTherapistAccess(supabase, user.id, id);
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await request.json();
    const { summary_therapist, summary_client, progress_notes, key_themes } = body;

    // Build update object with only provided fields
    const updates: Record<string, unknown> = {};
    if (summary_therapist !== undefined) updates.summary_therapist = summary_therapist;
    if (summary_client !== undefined) updates.summary_client = summary_client;
    if (progress_notes !== undefined) updates.progress_notes = progress_notes;
    if (key_themes !== undefined) updates.key_themes = key_themes;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const { data: session, error: updateError } = await supabase
      .from("sessions")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating session:", updateError);
      return NextResponse.json(
        { error: "Failed to update session" },
        { status: 500 }
      );
    }

    return NextResponse.json({ session });
  } catch (error) {
    console.error("Error in PATCH /api/sessions/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/sessions/[id] - Delete a session
export async function DELETE(
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

    // Verify therapist has access to this session
    const hasAccess = await verifyTherapistAccess(supabase, user.id, id);
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get the session to return client_id for redirect
    const { data: session } = await supabase
      .from("sessions")
      .select("client_id")
      .eq("id", id)
      .single();

    // Delete the session (plan_versions will have source_session_id set to NULL due to ON DELETE SET NULL)
    const { error: deleteError } = await supabase
      .from("sessions")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Error deleting session:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete session" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      client_id: session?.client_id,
    });
  } catch (error) {
    console.error("Error in DELETE /api/sessions/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

