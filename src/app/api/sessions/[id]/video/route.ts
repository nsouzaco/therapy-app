import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/sessions/[id]/video - Upload video for a session
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get form data with video file
    const formData = await request.formData();
    const videoFile = formData.get("video") as File | null;

    if (!videoFile) {
      return NextResponse.json(
        { error: "No video file provided" },
        { status: 400 }
      );
    }

    // Validate video type
    const validTypes = ["video/mp4", "video/webm", "video/quicktime"];
    if (!validTypes.includes(videoFile.type)) {
      return NextResponse.json(
        { error: "Invalid video format. Supported: MP4, WebM, MOV" },
        { status: 400 }
      );
    }

    // Get the session to verify ownership
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("id, client_id")
      .eq("id", id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Verify therapist owns this client
    const { data: therapistProfile } = await supabase
      .from("therapist_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!therapistProfile) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: clientProfile } = await supabase
      .from("client_profiles")
      .select("id")
      .eq("id", session.client_id)
      .eq("therapist_id", therapistProfile.id)
      .single();

    if (!clientProfile) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Upload to Supabase Storage
    const fileExt = videoFile.name.split(".").pop() || "mp4";
    const fileName = `${id}-${Date.now()}.${fileExt}`;
    const filePath = `sessions/${fileName}`;

    const arrayBuffer = await videoFile.arrayBuffer();
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("session-videos")
      .upload(filePath, arrayBuffer, {
        contentType: videoFile.type,
        cacheControl: "3600",
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      // Check if bucket doesn't exist
      if (uploadError.message?.includes("Bucket not found")) {
        return NextResponse.json(
          { error: "Video storage not configured. Please create the 'session-videos' bucket in Supabase Storage." },
          { status: 500 }
        );
      }
      return NextResponse.json(
        { error: "Failed to upload video" },
        { status: 500 }
      );
    }

    // Get public URL for the video
    const { data: urlData } = supabase.storage
      .from("session-videos")
      .getPublicUrl(filePath);

    // Update session with video info
    const { error: updateError } = await supabase
      .from("sessions")
      .update({
        video_url: urlData.publicUrl,
        video_filename: videoFile.name,
        video_mime_type: videoFile.type,
      })
      .eq("id", id);

    if (updateError) {
      console.error("Update error:", updateError);
      return NextResponse.json(
        { error: "Failed to save video reference" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      video_url: urlData.publicUrl,
      video_filename: videoFile.name,
    });
  } catch (error) {
    console.error("Video upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/sessions/[id]/video - Remove video from session
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the session with video info
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("id, video_url, client_id")
      .eq("id", id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Verify therapist owns this client
    const { data: therapistProfile } = await supabase
      .from("therapist_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!therapistProfile) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: clientProfile } = await supabase
      .from("client_profiles")
      .select("id")
      .eq("id", session.client_id)
      .eq("therapist_id", therapistProfile.id)
      .single();

    if (!clientProfile) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete from storage if exists
    if (session.video_url) {
      const urlPath = new URL(session.video_url).pathname;
      const storagePath = urlPath.split("/session-videos/")[1];
      if (storagePath) {
        await supabase.storage
          .from("session-videos")
          .remove([storagePath]);
      }
    }

    // Clear video fields from session
    const { error: updateError } = await supabase
      .from("sessions")
      .update({
        video_url: null,
        video_filename: null,
        video_duration_seconds: null,
        video_mime_type: null,
      })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to remove video reference" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Video delete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

