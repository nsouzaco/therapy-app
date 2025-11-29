import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing required environment variables:");
  console.error("- NEXT_PUBLIC_SUPABASE_URL");
  console.error("- SUPABASE_SERVICE_ROLE_KEY (service role key with admin privileges)");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Demo data
const DEMO_THERAPIST = {
  email: "demo-therapist@tavahealth.test",
  password: "demo123!",
  name: "Dr. Sarah Chen",
};

const DEMO_CLIENTS = [
  {
    email: "sarah-client@tavahealth.test",
    password: "demo123!",
    name: "Sarah Johnson",
    transcriptFile: "session-1.txt",
  },
  {
    email: "marcus-client@tavahealth.test",
    password: "demo123!",
    name: "Marcus Williams",
    transcriptFile: "session-2.txt",
  },
];

async function seed() {
  console.log("🌱 Starting seed...\n");

  try {
    // 1. Create demo therapist
    console.log("Creating demo therapist...");
    const { data: therapistAuth, error: therapistAuthError } =
      await supabase.auth.admin.createUser({
        email: DEMO_THERAPIST.email,
        password: DEMO_THERAPIST.password,
        email_confirm: true,
        user_metadata: {
          name: DEMO_THERAPIST.name,
          role: "therapist",
        },
      });

    if (therapistAuthError) {
      if (therapistAuthError.message.includes("already been registered")) {
        console.log("  ℹ️  Therapist already exists, fetching...");
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const existing = existingUsers?.users.find(
          (u) => u.email === DEMO_THERAPIST.email
        );
        if (!existing) throw new Error("Could not find existing therapist");
        console.log(`  ✓ Found therapist: ${existing.id}`);
      } else {
        throw therapistAuthError;
      }
    } else {
      console.log(`  ✓ Created therapist: ${therapistAuth.user.id}`);
    }

    // Get therapist user record
    const { data: therapistUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", DEMO_THERAPIST.email)
      .single();

    if (!therapistUser) {
      throw new Error("Therapist user record not found");
    }

    // Get therapist profile
    const { data: therapistProfile } = await supabase
      .from("therapist_profiles")
      .select("id")
      .eq("user_id", therapistUser.id)
      .single();

    if (!therapistProfile) {
      throw new Error("Therapist profile not found");
    }

    console.log(`  ✓ Therapist profile ID: ${therapistProfile.id}\n`);

    // 2. Create demo clients
    for (const clientData of DEMO_CLIENTS) {
      console.log(`Creating client: ${clientData.name}...`);

      const { data: clientAuth, error: clientAuthError } =
        await supabase.auth.admin.createUser({
          email: clientData.email,
          password: clientData.password,
          email_confirm: true,
          user_metadata: {
            name: clientData.name,
            role: "client",
          },
        });

      let clientUserId: string;

      if (clientAuthError) {
        if (clientAuthError.message.includes("already been registered")) {
          console.log("  ℹ️  Client already exists, fetching...");
          const { data: existingUsers } = await supabase.auth.admin.listUsers();
          const existing = existingUsers?.users.find(
            (u) => u.email === clientData.email
          );
          if (!existing) throw new Error(`Could not find client ${clientData.email}`);
          clientUserId = existing.id;
        } else {
          throw clientAuthError;
        }
      } else {
        clientUserId = clientAuth.user.id;
        console.log(`  ✓ Created client auth: ${clientUserId}`);
      }

      // Check if client profile exists
      let { data: clientProfile } = await supabase
        .from("client_profiles")
        .select("id")
        .eq("user_id", clientUserId)
        .single();

      if (!clientProfile) {
        // Create client profile
        const { data: newProfile, error: profileError } = await supabase
          .from("client_profiles")
          .insert({
            user_id: clientUserId,
            therapist_id: therapistProfile.id,
          })
          .select("id")
          .single();

        if (profileError) throw profileError;
        clientProfile = newProfile;
        console.log(`  ✓ Created client profile: ${clientProfile.id}`);
      } else {
        console.log(`  ✓ Found existing client profile: ${clientProfile.id}`);
      }

      // 3. Create session with transcript
      const transcriptPath = path.join(
        __dirname,
        "sample-transcripts",
        clientData.transcriptFile
      );

      if (fs.existsSync(transcriptPath)) {
        const transcript = fs.readFileSync(transcriptPath, "utf-8");

        // Check if session already exists
        const { data: existingSession } = await supabase
          .from("sessions")
          .select("id")
          .eq("client_id", clientProfile.id)
          .limit(1)
          .single();

        if (!existingSession) {
          const sessionDate = new Date();
          sessionDate.setDate(sessionDate.getDate() - 3); // 3 days ago

          const { data: session, error: sessionError } = await supabase
            .from("sessions")
            .insert({
              client_id: clientProfile.id,
              session_date: sessionDate.toISOString().split("T")[0],
              transcript_text: transcript,
            })
            .select("id")
            .single();

          if (sessionError) throw sessionError;
          console.log(`  ✓ Created session: ${session.id}`);
        } else {
          console.log(`  ✓ Session already exists: ${existingSession.id}`);
        }
      } else {
        console.log(`  ⚠️  Transcript file not found: ${transcriptPath}`);
      }

      console.log("");
    }

    console.log("✅ Seed completed successfully!\n");
    console.log("Demo accounts:");
    console.log("─".repeat(50));
    console.log(`Therapist: ${DEMO_THERAPIST.email} / ${DEMO_THERAPIST.password}`);
    console.log("");
    for (const client of DEMO_CLIENTS) {
      console.log(`Client: ${client.email} / ${client.password}`);
    }
    console.log("─".repeat(50));
    console.log("\nYou can now:");
    console.log("1. Log in as the therapist to see clients and generate plans");
    console.log("2. Log in as a client to view their plan (after approval)\n");
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }
}

seed();

