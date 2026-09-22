"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function ProfilEntreprisePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [companyId, setCompanyId] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [nom, setNom] = useState("");
  const [secteurActivite, setSecteurActivite] = useState("");
  const [presentation, setPresentation] = useState("");
  const [siteWeb, setSiteWeb] = useState("");
  const [ville, setVille] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactTelephone, setContactTelephone] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [facebook, setFacebook] = useState("");
  const [instagram, setInstagram] = useState("");
  const [linkedin, setLinkedin] = useState("");

  useEffect(() => {
    async function load() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.push("/connexion");
        return;
      }
      const userId = sessionData.session.user.id;

      const { data: rep } = await supabase
        .from("company_reps")
        .select("company_id")
        .eq("user_id", userId)
        .single();

      if (!rep) {
        setLoading(false);
        return;
      }

      const { data: company } = await supabase
        .from("companies")
        .select(
          "id, nom, secteur_activite, presentation, site_web, ville, contact_email, contact_telephone, logo_url, reseaux_sociaux"
        )
        .eq("id", rep.company_id)
        .single();

      if (company) {
        setCompanyId(company.id);
        setNom(company.nom ?? "");
        setSecteurActivite(company.secteur_activite ?? "");
        setPresentation(company.presentation ?? "");
        setSiteWeb(company.site_web ?? "");
        setVille(company.ville ?? "");
        setContactEmail(company.contact_email ?? "");
        setContactTelephone(company.contact_telephone ?? "");
        setLogoUrl(company.logo_url ?? "");
        const reseaux = company.reseaux_sociaux ?? {};
        setFacebook(reseaux.facebook ?? "");
        setInstagram(reseaux.instagram ?? "");
        setLinkedin(reseaux.linkedin ?? "");
      }

      setLoading(false);
    }
    load();
  }, [router]);

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !companyId) return;

    setUploadingLogo(true);
    const ext = file.name.split(".").pop();
    const path = `companies/${companyId}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, {
      upsert: true,
    });

    if (uploadError) {
      setError("Erreur lors de l'envoi du logo : " + uploadError.message);
      setUploadingLogo(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(path);
    setLogoUrl(publicUrlData.publicUrl);
    setUploadingLogo(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyId) return;
    setError(null);
    setSuccess(false);
    setSaving(true);

    const { error: updateError } = await supabase
      .from("companies")
      .update({
        nom,
        secteur_activite: secteurActivite,
        presentation,
        site_web: siteWeb,
        ville,
        contact_email: contactEmail,
        contact_telephone: contactTelephone,
        logo_url: logoUrl,
        reseaux_sociaux: { facebook, instagram, linkedin },
      })
      .eq("id", companyId);

    if (updateError) {
      setError("Une erreur est survenue : " + updateError.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    setSuccess(true);
  }

  if (loading) {
    return <div className="px-6 py-24 text-center font-body text-white/50">Chargement…</div>;
  }

  if (!companyId) {
    return (
      <div className="px-6 py-24 text-center font-body text-white/50">
        <p>Aucune entreprise associée à ce compte.</p>
        <Link href="/espace-entreprise" className="mt-4 inline-block text-orange hover:underline">
          ← Retour à mon espace
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-24">
      <Link href="/espace-entreprise" className="font-body text-sm text-white/50 hover:text-white">
        ← Retour à mon espace
      </Link>
      <h1 className="mt-4 font-display text-4xl">Profil de l'entreprise</h1>
      <p className="mt-3 font-body text-sm text-white/60">
        Ces informations seront visibles par GC ESPORT et, une fois votre
        participation confirmée, par le public.
      </p>

      <form onSubmit={handleSubmit} className="mt-10 space-y-8">
        <section>
          <p className="font-display text-lg text-lime">Identité</p>
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <Field label="Nom de l'entreprise">
              <input required value={nom} onChange={(e) => setNom(e.target.value)} className="input" />
            </Field>
            <Field label="Secteur d'activité">
              <input
                value={secteurActivite}
                onChange={(e) => setSecteurActivite(e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Ville">
              <input value={ville} onChange={(e) => setVille(e.target.value)} className="input" />
            </Field>
            <Field label="Site web">
              <input
                placeholder="https://..."
                value={siteWeb}
                onChange={(e) => setSiteWeb(e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Logo">
              <div className="flex items-center gap-4">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt="Logo" className="h-14 w-14 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-ink text-xs text-white/30">
                    Aucun
                  </div>
                )}
                <label className="cursor-pointer rounded-full border border-white/20 px-4 py-2 font-body text-xs hover:border-white/50">
                  {uploadingLogo ? "Envoi…" : "Choisir un logo"}
                  <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" disabled={uploadingLogo} />
                </label>
              </div>
            </Field>
          </div>
        </section>

        <section>
          <p className="font-display text-lg text-lime">Présentation</p>
          <div className="mt-4">
            <Field label="Présentez votre entreprise et votre intérêt pour l'esport">
              <textarea
                rows={4}
                value={presentation}
                onChange={(e) => setPresentation(e.target.value)}
                className="input"
              />
            </Field>
          </div>
        </section>

        <section>
          <p className="font-display text-lg text-lime">Contact</p>
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <Field label="E-mail de contact (public)">
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Téléphone de contact">
              <input
                value={contactTelephone}
                onChange={(e) => setContactTelephone(e.target.value)}
                className="input"
              />
            </Field>
          </div>
        </section>

        <section>
          <p className="font-display text-lg text-lime">Réseaux sociaux</p>
          <div className="mt-4 grid gap-5 sm:grid-cols-3">
            <Field label="Facebook">
              <input value={facebook} onChange={(e) => setFacebook(e.target.value)} className="input" />
            </Field>
            <Field label="Instagram">
              <input value={instagram} onChange={(e) => setInstagram(e.target.value)} className="input" />
            </Field>
            <Field label="LinkedIn">
              <input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} className="input" />
            </Field>
          </div>
        </section>

        {error && <p className="font-body text-sm text-red-400">{error}</p>}
        {success && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-lime/40 bg-lime/10 px-4 py-3">
            <p className="font-body text-sm text-lime">Profil mis à jour avec succès.</p>
            <Link href="/espace-entreprise" className="font-body text-sm font-semibold text-lime hover:underline">
              Retour à mon espace →
            </Link>
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-full bg-orange px-7 py-3 font-body font-semibold text-ink transition hover:bg-lime disabled:opacity-50"
        >
          {saving ? "Enregistrement…" : "Enregistrer le profil"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="font-body text-sm text-white/70">{label}</label>
      <div className="mt-2">{children}</div>
    </div>
  );
}
