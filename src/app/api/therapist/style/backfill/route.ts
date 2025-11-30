import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractTherapistStyle, mergeStyleExtractions, TherapistStyleExtraction } from "@/lib/ai/extract-therapist-style";

// POST /api/therapist/style/backfill - Extract style from all existing sessions
export async function POST() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get therapist profile
    const { data: therapistProfile } = await supabase
      .from("therapist_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!therapistProfile) {
      return NextResponse.json({ error: "Therapist not found" }, { status: 404 });
    }

    // Get all sessions for this therapist's clients
    const { data: sessions, error: sessionsError } = await supabase
      .from("sessions")
      .select(`
        id,
        transcript_text,
        client_profiles!sessions_client_id_fkey (
          therapist_id
        )
      `)
      .order("session_date", { ascending: false });

    if (sessionsError) {
      console.error("Error fetching sessions:", sessionsError);
      return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 });
    }

    // Filter to only this therapist's sessions
    console.log("All sessions found:", sessions?.length);
    console.log("Sample session:", sessions?.[0]);
    
    const therapistSessions = sessions?.filter((s) => {
      const clientProfile = s.client_profiles as unknown as { therapist_id: string } | null;
      console.log("Session", s.id, "clientProfile:", clientProfile, "therapistId:", therapistProfile.id);
      return clientProfile?.therapist_id === therapistProfile.id;
    }) || [];
    
    console.log("Therapist sessions after filter:", therapistSessions.length);

    if (therapistSessions.length === 0) {
      return NextResponse.json({
        message: "No sessions found to analyze",
        processed: 0,
      });
    }

    // Check which sessions already have extractions
    const { data: existingExtractions, error: extractionsError } = await supabase
      .from("session_style_extractions")
      .select("session_id")
      .eq("therapist_id", therapistProfile.id);

    console.log("Existing extractions query:", existingExtractions?.length || 0, "Error:", extractionsError?.message);

    const existingSessionIds = new Set(existingExtractions?.map((e) => e.session_id) || []);
    const sessionsToProcess = therapistSessions.filter((s) => !existingSessionIds.has(s.id));

    if (sessionsToProcess.length === 0) {
      // All sessions already processed, just refresh the aggregate
      const { data: allExtractions } = await supabase
        .from("session_style_extractions")
        .select("extraction")
        .eq("therapist_id", therapistProfile.id);

      if (allExtractions && allExtractions.length > 0) {
        const mergedProfile = await mergeStyleExtractions(
          allExtractions.map((e) => e.extraction as TherapistStyleExtraction)
        );

        await supabase
          .from("therapist_style_profiles")
          .upsert({
            therapist_id: therapistProfile.id,
            ...mergedProfile,
            sessions_analyzed: allExtractions.length,
            last_extraction_at: new Date().toISOString(),
          }, { onConflict: "therapist_id" });
      }

      return NextResponse.json({
        message: "All sessions already processed. Profile refreshed.",
        processed: 0,
        total_sessions: therapistSessions.length,
      });
    }

    // Process sessions (limit to 5 at a time to avoid timeout)
    const toProcess = sessionsToProcess.slice(0, 5);
    let processed = 0;
    const errors: string[] = [];

    console.log("Sessions to process:", sessionsToProcess.length, "Processing up to:", toProcess.length);
    
    for (const session of toProcess) {
      try {
        console.log("Extracting style from session:", session.id);
        // Pass therapistId to include RAG preferences in style learning
        const result = await extractTherapistStyle(session.transcript_text, therapistProfile.id);
        console.log("Extraction result:", result.success ? "success" : result.error);
        
        if (result.success) {
          console.log("Saving extraction to database...");
          const { error: upsertError } = await supabase
            .from("session_style_extractions")
            .upsert({
              session_id: session.id,
              therapist_id: therapistProfile.id,
              extraction: result.extraction,
              detected_modalities: result.extraction.modalities.primary
                ? [result.extraction.modalities.primary, ...result.extraction.modalities.secondary]
                : result.extraction.modalities.secondary,
              detected_interventions: result.extraction.interventions,
              detected_tone: result.extraction.communication.tone,
            }, { onConflict: "session_id" });
          
          if (upsertError) {
            console.error("Upsert error:", upsertError);
            errors.push(`Session ${session.id}: DB error - ${upsertError.message}`);
          } else {
            console.log("Extraction saved successfully");
            processed++;
          }
        } else {
          errors.push(`Session ${session.id}: ${result.error}`);
        }
      } catch (err) {
        console.error("Error processing session:", err);
        errors.push(`Session ${session.id}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }
    
    console.log("Processed:", processed, "Errors:", errors);

    // Re-aggregate the therapist's style profile
    const { data: allExtractions } = await supabase
      .from("session_style_extractions")
      .select("extraction")
      .eq("therapist_id", therapistProfile.id);

    if (allExtractions && allExtractions.length > 0) {
      const mergedProfile = await mergeStyleExtractions(
        allExtractions.map((e) => e.extraction as TherapistStyleExtraction)
      );

      await supabase
        .from("therapist_style_profiles")
        .upsert({
          therapist_id: therapistProfile.id,
          ...mergedProfile,
          sessions_analyzed: allExtractions.length,
          last_extraction_at: new Date().toISOString(),
        }, { onConflict: "therapist_id" });
    }

    const remaining = sessionsToProcess.length - toProcess.length;

    return NextResponse.json({
      message: processed > 0 
        ? `Processed ${processed} session(s). ${remaining > 0 ? `${remaining} remaining - run again to continue.` : 'All done!'}`
        : "No new sessions processed",
      processed,
      remaining,
      total_sessions: therapistSessions.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Error in backfill:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

