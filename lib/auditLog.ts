import { supabase } from "./supabase";

// Enregistre une action sensible dans le journal d'audit.
// N'échoue jamais bruyamment : un échec de journalisation ne doit
// jamais bloquer l'action principale qu'elle accompagne.
export async function logAction(
  userId: string | null | undefined,
  action: string,
  entite: string,
  entiteId: string | null,
  details?: Record<string, unknown>
) {
  if (!userId) return;
  try {
    await supabase.from("audit_log").insert({
      user_id: userId,
      action,
      entite,
      entite_id: entiteId,
      details: details ?? null,
    });
  } catch {
    // silencieux volontairement
  }
}
