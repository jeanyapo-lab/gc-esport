import { supabase } from "./supabase";

export async function getOrCreateConversation(playerId: string, companyId: string): Promise<string | null> {
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("player_id", playerId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created } = await supabase
    .from("conversations")
    .insert({ player_id: playerId, company_id: companyId })
    .select()
    .single();

  return created?.id ?? null;
}
