import { supabase } from "@/lib/supabase";

// Permet de savoir, pour un admin donné, quand il a consulté pour la
// dernière fois une rubrique du tableau de bord — sert à faire
// disparaître les badges de notification une fois la rubrique visitée.

const EPOCH = "1970-01-01T00:00:00.000Z";

export async function getLastViewed(userId: string | null, section: string): Promise<string> {
  if (!userId) return EPOCH;
  const { data } = await supabase
    .from("admin_section_views")
    .select("last_viewed_at")
    .eq("user_id", userId)
    .eq("section", section)
    .maybeSingle();
  return data?.last_viewed_at ?? EPOCH;
}

export async function markSectionViewed(userId: string | null, section: string) {
  if (!userId) return;
  await supabase
    .from("admin_section_views")
    .upsert({ user_id: userId, section, last_viewed_at: new Date().toISOString() }, { onConflict: "user_id,section" });
}
