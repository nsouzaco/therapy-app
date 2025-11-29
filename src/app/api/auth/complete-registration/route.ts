import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// POST /api/auth/complete-registration
// Called after email confirmation to ensure user profile is set up
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Get current authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { therapist_email } = body;

    // Get user metadata
    const role = user.user_metadata?.role || "client";
    const name = user.user_metadata?.name || user.email;

    // Ensure user record exists
    const { error: userInsertError } = await supabase
      .from("users")
      .upsert(
        {
          id: user.id,
          email: user.email!,
          name: name,
          role: role,
        },
        { onConflict: "id" }
      );

    if (userInsertError) {
      console.error("Error upserting user:", userInsertError);
    }

    // If therapist, ensure therapist profile exists
    if (role === "therapist") {
      const { error: profileError } = await supabase
        .from("therapist_profiles")
        .upsert({ user_id: user.id }, { onConflict: "user_id" });

      if (profileError) {
        console.error("Error creating therapist profile:", profileError);
      }
    }

    // If client, create client profile linked to therapist
    if (role === "client" && therapist_email) {
      // Find the therapist
      const { data: therapistData } = await supabase
        .from("users")
        .select("id")
        .eq("email", therapist_email)
        .eq("role", "therapist")
        .single();

      if (therapistData) {
        // Get therapist profile
        const { data: therapistProfile } = await supabase
          .from("therapist_profiles")
          .select("id")
          .eq("user_id", therapistData.id)
          .single();

        if (therapistProfile) {
          const { error: clientProfileError } = await supabase
            .from("client_profiles")
            .upsert(
              {
                user_id: user.id,
                therapist_id: therapistProfile.id,
              },
              { onConflict: "user_id" }
            );

          if (clientProfileError) {
            console.error("Error creating client profile:", clientProfileError);
            return NextResponse.json(
              { error: "Failed to link to therapist" },
              { status: 500 }
            );
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      role,
    });
  } catch (error) {
    console.error("Error in complete-registration:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

