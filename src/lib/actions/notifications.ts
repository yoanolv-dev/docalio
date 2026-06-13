"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return supabase;
}

/** Marque toutes les notifications non lues de l'organisation comme lues. */
export async function markAllNotificationsReadAction(): Promise<void> {
  const supabase = await requireUser();
  // RLS : ne touche que les notifications de l'organisation courante.
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);

  revalidatePath("/dashboard", "layout");
}

/** Marque une notification précise comme lue (appelée depuis un <form action>). */
export async function markNotificationReadAction(
  formData: FormData
): Promise<void> {
  const id = String(formData.get("notification_id") ?? "");
  if (!id) return;

  const supabase = await requireUser();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id);

  revalidatePath("/dashboard", "layout");
}

/**
 * Ouvre une notification : la marque lue puis redirige vers le workspace lié.
 * Le chemin est validé (interne uniquement) pour éviter toute redirection ouverte.
 */
export async function openNotificationAction(formData: FormData): Promise<void> {
  const id = String(formData.get("notification_id") ?? "");
  const href = String(formData.get("href") ?? "/dashboard");

  const supabase = await requireUser();
  if (id) {
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id);
  }

  revalidatePath("/dashboard", "layout");

  const safeHref =
    href.startsWith("/") && !href.startsWith("//") ? href : "/dashboard";
  redirect(safeHref);
}
