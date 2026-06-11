"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, LoaderCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={loading}
      className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground disabled:opacity-50"
    >
      {loading ? (
        <LoaderCircle className="h-4 w-4 shrink-0 animate-spin" />
      ) : (
        <LogOut className="h-4 w-4 shrink-0" />
      )}
      Déconnexion
    </button>
  );
}
