import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { mergeStyleExtractions, TherapistStyleExtraction } from "@/lib/ai/extract-therapist-style";

// GET /api/therapist/style - Get therapist's style profile
export async function GET() {
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

    // Get style profile
    const { data: styleProfile } = await supabase
      .from("therapist_style_profiles")
      .select("*")
      .eq("therapist_id", therapistProfile.id)
      .single();

    return NextResponse.json({
      profile: styleProfile || null,
      has_profile: !!styleProfile,
    });
  } catch (error) {
    console.error("Error fetching style profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/therapist/style/refresh - Recalculate aggregated style from all sessions
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

    // Get all session extractions for this therapist
    const { data: extractions } = await supabase
      .from("session_style_extractions")
      .select("extraction")
      .eq("therapist_id", therapistProfile.id);

    if (!extractions || extractions.length === 0) {
      return NextResponse.json({
        message: "No session extractions found. Upload sessions to build your style profile.",
        profile: null,
      });
    }

    // Merge all extractions
    const mergedProfile = await mergeStyleExtractions(
      extractions.map((e) => e.extraction as TherapistStyleExtraction)
    );

    // Upsert the aggregated profile
    const { data: profile, error } = await supabase
      .from("therapist_style_profiles")
      .upsert(
        {
          therapist_id: therapistProfile.id,
          ...mergedProfile,
          sessions_analyzed: extractions.length,
          last_extraction_at: new Date().toISOString(),
        },
        { onConflict: "therapist_id" }
      )
      .select()
      .single();

    if (error) {
      console.error("Error upserting style profile:", error);
      return NextResponse.json(
        { error: "Failed to save style profile" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: `Style profile updated from ${extractions.length} sessions`,
      profile,
    });
  } catch (error) {
    console.error("Error refreshing style profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

