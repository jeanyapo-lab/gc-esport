import { supabase } from "./supabase";

// Crée une notification in-app pour un utilisateur donné.
// N'échoue jamais bruyamment : une notification manquée ne doit
// jamais bloquer l'action principale (sélection, validation...).
export async function notify(userId: string | null | undefined, titre: string, message: string) {
  if (!userId) return;
  try {
    await supabase.from("notifications").insert({ user_id: userId, titre, message });
  } catch {
    // silencieux volontairement
  }
}

// Récupère l'user_id (compte de connexion) à partir d'un player_id
export async function getUserIdFromPlayerId(playerId: string): Promise<string | null> {
  const { data } = await supabase.from("player_profiles").select("user_id").eq("id", playerId).single();
  return data?.user_id ?? null;
}

// Récupère les user_id de tous les représentants d'une entreprise
export async function getUserIdsFromCompanyId(companyId: string): Promise<string[]> {
  const { data } = await supabase.from("company_reps").select("user_id").eq("company_id", companyId);
  return (data ?? []).map((r) => r.user_id);
}

// Récupère les user_id de tous les comptes admin (pour les informer,
// sans qu'ils aient à valider une action qui ne le nécessite plus)
export async function getAdminUserIds(): Promise<string[]> {
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .in("role", [
      "super_admin",
      "admin",
      "responsable_competitions",
      "responsable_joueurs",
      "responsable_partenariats",
      "responsable_communication",
    ]);
  return (data ?? []).map((p) => p.id);
}
