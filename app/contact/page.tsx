"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ContactPage() {
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [piege, setPiege] = useState(""); // champ invisible : un humain ne le remplit jamais
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Anti-spam : un robot remplit ce champ caché, un humain ne le voit jamais
    if (piege) {
      setSent(true);
      return;
    }

    setError(null);
    setSending(true);

    const { error: insertError } = await supabase.from("contact_messages").insert({
      nom,
      email,
      message,
    });

    setSending(false);

    if (insertError) {
      setError("Une erreur est survenue. Réessaie dans un instant, ou écris-nous directement à contact@gcesportci.com.");
      return;
    }

    setSent(true);
    setNom("");
    setEmail("");
    setMessage("");
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-24">
      <h1 className="font-display text-5xl">Contact</h1>
      <p className="mt-4 font-body text-white/60">
        Une question, un partenariat, une envie de rejoindre GC ESPORT ?
      </p>

      {sent ? (
        <div className="mt-12 rounded-2xl border border-lime/40 bg-lime/10 p-8 text-center">
          <p className="font-display text-xl text-lime">Message envoyé !</p>
          <p className="mt-2 font-body text-sm text-white/60">On te répond dès que possible.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-12 space-y-6">
          <input
            type="text"
            value={piege}
            onChange={(e) => setPiege(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
          />
          <div>
            <label className="font-body text-sm text-white/70">Nom</label>
            <input
              required
              type="text"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              className="input mt-2"
            />
          </div>
          <div>
            <label className="font-body text-sm text-white/70">E-mail</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input mt-2"
            />
          </div>
          <div>
            <label className="font-body text-sm text-white/70">Message</label>
            <textarea
              required
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="input mt-2"
            />
          </div>
          {error && <p className="font-body text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={sending}
            className="rounded-full bg-orange px-7 py-3 font-body font-semibold text-ink transition hover:bg-lime disabled:opacity-50"
          >
            {sending ? "Envoi…" : "Envoyer"}
          </button>
        </form>
      )}
    </div>
  );
}
