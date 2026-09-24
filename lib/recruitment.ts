import { supabase } from "./supabase";
import { notify, getUserIdFromPlayerId, getUserIdsFromCompanyId, getAdminUserIds } from "./notify";
import { logAction } from "./auditLog";

const ROSTER_MAX = 5;

type Offer = {
  id: string;
  type: "recrutement_libre" | "transfert";
  player_id: string;
  company_id: string;
  ancienne_company_id: string | null;
  edition_id: string;
};

// Finalise un recrutement/transfert dès que toutes les parties ont
// donné leur accord — sans attendre de validation admin, sauf dans
// deux cas exceptionnels (joueur mineur sans consentement, effectif
// complet) qui restent bloqués pour intervention de GC ESPORT.
// L'admin est notifié dans tous les cas, et l'action est toujours
// journalisée dans l'historique.
export async function attemptFinalizeOffer(
  offer: Offer,
  actingUserId: string | null
): Promise<{ finalise: boolean; raison?: string }> {
  // Joueur mineur : le consentement parental doit être validé
  const { data: player } = await supabase
    .from("player_profiles")
    .select("date_naissance")
    .eq("id", offer.player_id)
    .single();

  if (player?.date_naissance) {
    const age = Math.floor((Date.now() - new Date(player.date_naissance).getTime()) / (365.25 * 24 * 3600 * 1000));
    if (age < 18) {
      const { data: consent } = await supabase
        .from("engagements")
        .select("statut")
        .eq("player_id", offer.player_id)
        .eq("type_engagement", "consentement_parental")
        .eq("statut", "valide")
        .maybeSingle();

      if (!consent) {
        await supabase.from("recruitment_offers").update({ statut: "en_attente_validation_gcesport" }).eq("id", offer.id);
        const adminIds = await getAdminUserIds();
        for (const uid of adminIds) {
          await notify(uid, "Intervention requise", "Joueur mineur sans consentement parental validé — recrutement en attente.");
        }
        return { finalise: false, raison: "Ce joueur est mineur : le consentement parental doit être validé par GC ESPORT avant de continuer." };
      }
    }
  }

  // Équipe destinataire : trouve ou crée, vérifie l'effectif
  let { data: team } = await supabase
    .from("teams")
    .select("id")
    .eq("edition_id", offer.edition_id)
    .eq("company_id", offer.company_id)
    .maybeSingle();

  let teamId = team?.id;

  if (teamId) {
    const { count } = await supabase
      .from("team_assignments")
      .select("*", { count: "exact", head: true })
      .eq("team_id", teamId);
    if ((count ?? 0) >= ROSTER_MAX) {
      await supabase.from("recruitment_offers").update({ statut: "en_attente_validation_gcesport" }).eq("id", offer.id);
      const adminIds = await getAdminUserIds();
      for (const uid of adminIds) {
        await notify(uid, "Intervention requise", "Effectif complet côté entreprise — recrutement en attente.");
      }
      return { finalise: false, raison: `Effectif complet (${ROSTER_MAX} joueurs max) — GC ESPORT doit intervenir.` };
    }
  }

  if (!teamId) {
    const { data: company } = await supabase.from("companies").select("nom").eq("id", offer.company_id).single();
    const { data: newTeam } = await supabase
      .from("teams")
      .insert({ edition_id: offer.edition_id, company_id: offer.company_id, nom: (company?.nom ?? "Équipe") + " Esports" })
      .select()
      .single();
    teamId = newTeam?.id;
  }
  if (!teamId) return { finalise: false, raison: "Erreur technique, réessaie dans un instant." };

  // Transfert : retire l'ancienne affectation
  if (offer.type === "transfert" && offer.ancienne_company_id) {
    const { data: oldTeam } = await supabase
      .from("teams")
      .select("id")
      .eq("edition_id", offer.edition_id)
      .eq("company_id", offer.ancienne_company_id)
      .maybeSingle();
    if (oldTeam) {
      await supabase.from("team_assignments").delete().eq("team_id", oldTeam.id).eq("player_id", offer.player_id);
    }
  }

  await supabase.from("team_assignments").insert({ team_id: teamId, player_id: offer.player_id, titulaire: true });
  await supabase.from("recruitment_offers").update({ statut: "validee" }).eq("id", offer.id);

  await logAction(actingUserId, `${offer.type}_finalise`, "recruitment_offers", offer.id, {
    player_id: offer.player_id,
    company_id: offer.company_id,
  });

  const playerUserId = await getUserIdFromPlayerId(offer.player_id);
  await notify(playerUserId, "Recrutement finalisé", "Ton recrutement/transfert est confirmé.");
  const companyUserIds = await getUserIdsFromCompanyId(offer.company_id);
  for (const uid of companyUserIds) {
    await notify(uid, "Recrutement finalisé", "Votre recrutement/transfert est confirmé.");
  }
  const adminIds = await getAdminUserIds();
  for (const uid of adminIds) {
    await notify(uid, "Recrutement finalisé", "Un recrutement/transfert vient d'être finalisé automatiquement.");
  }

  return { finalise: true };
}
