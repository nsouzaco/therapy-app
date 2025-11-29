"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";

type Role = "therapist" | "client";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("therapist");
  const [therapistEmail, setTherapistEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const supabase = createClient();

      // If registering as client, verify therapist exists
      let therapistId: string | null = null;
      if (role === "client") {
        const { data: therapistData, error: therapistError } = await supabase
          .from("users")
          .select("id")
          .eq("email", therapistEmail)
          .eq("role", "therapist")
          .single();

        if (therapistError || !therapistData) {
          setError("No therapist found with that email address.");
          setIsLoading(false);
          return;
        }

        // Get therapist profile ID
        const { data: profileData } = await supabase
          .from("therapist_profiles")
          .select("id")
          .eq("user_id", therapistData.id)
          .single();

        if (profileData) {
          therapistId = profileData.id;
        }
      }

      // Create auth user with metadata
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (!authData.user) {
        setError("Failed to create account. Please try again.");
        return;
      }

      // Ensure user record exists in public.users table
      // (backup in case the database trigger doesn't run)
      const { error: userInsertError } = await supabase
        .from("users")
        .upsert({
          id: authData.user.id,
          email: email,
          name: name,
          role: role,
        }, { onConflict: "id" });

      if (userInsertError) {
        console.error("Error ensuring user record:", userInsertError);
      }

      // If therapist, ensure therapist profile exists
      if (role === "therapist") {
        const { error: therapistProfileError } = await supabase
          .from("therapist_profiles")
          .upsert({
            user_id: authData.user.id,
          }, { onConflict: "user_id" });

        if (therapistProfileError) {
          console.error("Error creating therapist profile:", therapistProfileError);
        }
      }

      // If client, create client profile linked to therapist
      if (role === "client" && therapistId) {
        const { error: profileError } = await supabase
          .from("client_profiles")
          .upsert({
            user_id: authData.user.id,
            therapist_id: therapistId,
          }, { onConflict: "user_id" });

        if (profileError) {
          console.error("Error creating client profile:", profileError);
        }
      } else if (role === "client" && !therapistId) {
        console.error("Client registration failed: therapist profile ID not found");
        setError("Unable to link to therapist. Please contact support.");
        return;
      }

      // Redirect based on role
      if (role === "therapist") {
        router.push("/dashboard");
      } else {
        router.push("/my-plan");
      }
      router.refresh();
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Create Account</CardTitle>
        <CardDescription>Join Tava Health to get started</CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          <Input
            label="Full Name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Dr. Jane Smith"
            required
            autoComplete="name"
          />

          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="new-password"
            helperText="At least 6 characters"
          />

          <div>
            <label className="label">I am a...</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="role"
                  value="therapist"
                  checked={role === "therapist"}
                  onChange={() => setRole("therapist")}
                  className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sage-700">Therapist</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="role"
                  value="client"
                  checked={role === "client"}
                  onChange={() => setRole("client")}
                  className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sage-700">Client</span>
              </label>
            </div>
          </div>

          {role === "client" && (
            <Input
              label="Therapist's Email"
              type="email"
              value={therapistEmail}
              onChange={(e) => setTherapistEmail(e.target.value)}
              placeholder="therapist@example.com"
              required
              helperText="Enter your therapist's email to link your account"
            />
          )}

          <Button
            type="submit"
            className="w-full"
            isLoading={isLoading}
          >
            Create Account
          </Button>
        </form>
      </CardContent>

      <CardFooter className="justify-center">
        <p className="text-sm text-sage-600">
          Already have an account?{" "}
          <Link href="/login" className="text-primary-600 hover:text-primary-700 font-medium">
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}

