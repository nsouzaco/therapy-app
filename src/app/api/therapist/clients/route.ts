import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET /api/therapist/clients - List all clients for current therapist
export async function GET() {
  try {
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

    // Get all clients for this therapist with their latest session and plan status
    const { data: clients, error: clientsError } = await supabase
      .from("client_profiles")
      .select(`
        id,
        created_at,
        users!client_profiles_user_id_fkey (
          id,
          name,
          email
        ),
        sessions (
          id,
          session_date
        ),
        treatment_plans (
          id,
          plan_versions (
            status
          )
        )
      `)
      .eq("therapist_id", therapistProfile.id)
      .order("created_at", { ascending: false });

    if (clientsError) {
      console.error("Error fetching clients:", clientsError);
      return NextResponse.json(
        { error: "Failed to fetch clients" },
        { status: 500 }
      );
    }

    // Transform the data for the frontend
    const transformedClients = clients?.map((client) => {
      const sessions = (client.sessions || []) as { id: string; session_date: string }[];
      const latestSession = sessions.sort(
        (a, b) =>
          new Date(b.session_date).getTime() - new Date(a.session_date).getTime()
      )[0];

      const plan = (client.treatment_plans as { id: string; plan_versions: { status: string }[] }[] | null)?.[0];
      const latestVersion = plan?.plan_versions?.sort(
        (a: { status: string }) =>
          a.status === "approved" ? -1 : 1
      )[0];

      // Cast users to single object (one-to-one relation)
      const userInfo = client.users as unknown as { id: string; name: string; email: string } | null;

      return {
        id: client.id,
        user_id: userInfo?.id,
        name: userInfo?.name || "Unknown",
        email: userInfo?.email || "",
        created_at: client.created_at,
        last_session_date: latestSession?.session_date || null,
        session_count: sessions.length,
        has_plan: !!plan,
        plan_status: latestVersion?.status || null,
      };
    });

    return NextResponse.json({ clients: transformedClients });
  } catch (error) {
    console.error("Error in GET /api/therapist/clients:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/therapist/clients - Create a new client
export async function POST(request: Request) {
  try {
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

    const body = await request.json();
    const { name, email } = body;

    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and email are required" },
        { status: 400 }
      );
    }

    // Check if a user with this email already exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("id, role")
      .eq("email", email)
      .single();

    if (existingUser) {
      // If user exists and is already a client, check if they're linked to another therapist
      if (existingUser.role === "client") {
        const { data: existingProfile } = await supabase
          .from("client_profiles")
          .select("id, therapist_id")
          .eq("user_id", existingUser.id)
          .single();

        if (existingProfile) {
          if (existingProfile.therapist_id === therapistProfile.id) {
            return NextResponse.json(
              { error: "This client is already linked to your account" },
              { status: 400 }
            );
          } else {
            return NextResponse.json(
              { error: "This client is linked to another therapist" },
              { status: 400 }
            );
          }
        }
      } else {
        return NextResponse.json(
          { error: "A user with this email already exists as a therapist" },
          { status: 400 }
        );
      }
    }

    // Create the client using Supabase Auth invite
    const { data: inviteData, error: inviteError } =
      await supabase.auth.admin.inviteUserByEmail(email, {
        data: {
          name,
          role: "client",
        },
      });

    if (inviteError) {
      // If admin invite fails (likely no service role), create without invite
      // The client will need to register themselves
      console.log("Admin invite failed, creating client profile only:", inviteError);
      
      // For now, just return an error asking the client to register themselves
      return NextResponse.json(
        { 
          error: "Unable to send invite. Please ask the client to register at the website with your email as their therapist.",
          needsManualRegistration: true 
        },
        { status: 400 }
      );
    }

    // If invite succeeded, create the client profile
    if (inviteData.user) {
      const { error: profileCreateError } = await supabase
        .from("client_profiles")
        .insert({
          user_id: inviteData.user.id,
          therapist_id: therapistProfile.id,
        });

      if (profileCreateError) {
        console.error("Error creating client profile:", profileCreateError);
      }
    }

    return NextResponse.json({
      message: "Client invited successfully",
      client: {
        email,
        name,
      },
    });
  } catch (error) {
    console.error("Error in POST /api/therapist/clients:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

