"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AddClientModal } from "@/components/therapist/add-client-modal";

interface Client {
  id: string;
  user_id: string;
  name: string;
  email: string;
  created_at: string;
  last_session_date: string | null;
  session_count: number;
  has_plan: boolean;
  plan_status: string | null;
}

interface User {
  name: string;
}

export default function TherapistDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchData = async () => {
    const supabase = createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    
    if (authUser) {
      // Fetch user info
      const { data: userData } = await supabase
        .from("users")
        .select("name")
        .eq("id", authUser.id)
        .single();
      
      if (userData) {
        setUser(userData);
      }

      // Fetch clients
      const response = await fetch("/api/therapist/clients");
      if (response.ok) {
        const data = await response.json();
        setClients(data.clients || []);
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "No sessions yet";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-sage-900">
            Welcome back{user?.name ? `, ${user.name}` : ""}
          </h1>
          <p className="text-sage-600 mt-1">
            Manage your clients and treatment plans
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Client
        </Button>
      </div>

      {clients.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <div className="text-sage-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-sage-700 mb-2">No clients yet</h3>
              <p className="text-sage-500 mb-6 max-w-md mx-auto">
                Add your first client to get started with AI-powered treatment plans.
              </p>
              <Button onClick={() => setIsModalOpen(true)}>Add Your First Client</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <Link key={client.id} href={`/clients/${client.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{client.name}</CardTitle>
                  <CardDescription>{client.email}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-sage-500">Last Session</span>
                      <span className="text-sage-700">{formatDate(client.last_session_date)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sage-500">Total Sessions</span>
                      <span className="text-sage-700">{client.session_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sage-500">Plan Status</span>
                      <span className={`font-medium ${
                        client.plan_status === "approved" 
                          ? "text-primary-600" 
                          : client.plan_status === "draft" 
                          ? "text-amber-600"
                          : "text-sage-400"
                      }`}>
                        {client.plan_status 
                          ? client.plan_status.charAt(0).toUpperCase() + client.plan_status.slice(1)
                          : "No plan"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <AddClientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchData}
      />
    </div>
  );
}
