"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Comment = { id: string; auteur_nom: string; contenu: string; created_at: string };

function getAnonId(): string {
  const key = "gc_esport_anon_id";
  let id = typeof window !== "undefined" ? localStorage.getItem(key) : null;
  if (!id) {
    id = crypto.randomUUID();
    if (typeof window !== "undefined") localStorage.setItem(key, id);
  }
  return id;
}

export default function ArticleEngagement({ newsId }: { newsId: string }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [pseudo, setPseudo] = useState<string | null>(null);
  const [anonId, setAnonId] = useState<string | null>(null);

  const [likesCount, setLikesCount] = useState(0);
  const [jaimeDeja, setJaimeDeja] = useState(false);

  const [comments, setComments] = useState<Comment[]>([]);
  const [nomInvite, setNomInvite] = useState("");
  const [texteCommentaire, setTexteCommentaire] = useState("");
  const [showComments, setShowComments] = useState(false);

  useEffect(() => {
    init();
  }, []);

  async function init() {
    const { data: sessionData } = await supabase.auth.getSession();
    let myUserId: string | null = null;
    let myAnonId: string | null = null;

    if (sessionData.session) {
      myUserId = sessionData.session.user.id;
      setUserId(myUserId);
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", myUserId).single();
      setIsAdmin(!!profile && ["super_admin", "admin", "responsable_communication"].includes(profile.role));

      const { data: player } = await supabase.from("player_profiles").select("pseudo").eq("user_id", myUserId).maybeSingle();
      if (player) setPseudo(player.pseudo);
    } else {
      myAnonId = getAnonId();
      setAnonId(myAnonId);
    }

    const { count } = await supabase.from("news_likes").select("*", { count: "exact", head: true }).eq("news_id", newsId);
    setLikesCount(count ?? 0);

    const { data: monLike } = await supabase
      .from("news_likes")
      .select("id")
      .eq("news_id", newsId)
      .eq(myUserId ? "user_id" : "anon_id", myUserId ?? myAnonId)
      .maybeSingle();
    setJaimeDeja(!!monLike);

    const { data: commentsData } = await supabase
      .from("news_comments")
      .select("id, auteur_nom, contenu, created_at")
      .eq("news_id", newsId)
      .order("created_at", { ascending: true });
    setComments(commentsData ?? []);
  }

  async function handleLike() {
    if (jaimeDeja) {
      if (userId) await supabase.from("news_likes").delete().eq("news_id", newsId).eq("user_id", userId);
      else await supabase.from("news_likes").delete().eq("news_id", newsId).eq("anon_id", anonId);
      setJaimeDeja(false);
      setLikesCount((c) => c - 1);
    } else {
      if (userId) await supabase.from("news_likes").insert({ news_id: newsId, user_id: userId });
      else await supabase.from("news_likes").insert({ news_id: newsId, anon_id: anonId });
      setJaimeDeja(true);
      setLikesCount((c) => c + 1);
    }
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault();
    const nom = pseudo ?? nomInvite.trim();
    if (!nom || !texteCommentaire.trim()) return;

    await supabase.from("news_comments").insert({
      news_id: newsId,
      user_id: userId,
      auteur_nom: nom,
      contenu: texteCommentaire.trim(),
    });
    setTexteCommentaire("");
    if (!userId) setNomInvite("");
    await init();
  }

  async function handleDeleteComment(id: string) {
    await supabase.from("news_comments").delete().eq("id", id);
    await init();
  }

  return (
    <div className="mt-4">
      <div className="flex items-center gap-4">
        <button
          onClick={handleLike}
          className={`flex items-center gap-2 rounded-full border px-4 py-2 font-body text-xs ${
            jaimeDeja ? "border-lime bg-lime/10 text-lime" : "border-white/20 text-white/60 hover:border-white/50"
          }`}
        >
          {jaimeDeja ? "♥" : "♡"} J'aime {likesCount > 0 && `(${likesCount})`}
        </button>
        <button onClick={() => setShowComments(!showComments)} className="font-body text-xs text-white/50 hover:text-white">
          💬 {comments.length} commentaire{comments.length > 1 ? "s" : ""}
        </button>
      </div>

      {showComments && (
        <div className="mt-4 space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="rounded-lg border border-line bg-ink px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="font-body text-xs font-semibold text-lime">{c.auteur_nom}</p>
                {isAdmin && (
                  <button onClick={() => handleDeleteComment(c.id)} className="font-body text-[10px] text-white/30 hover:text-orange">
                    Supprimer
                  </button>
                )}
              </div>
              <p className="mt-1 font-body text-sm text-white/70">{c.contenu}</p>
            </div>
          ))}

          <form onSubmit={handleComment} className="space-y-2">
            {!pseudo && (
              <input
                placeholder="Ton nom"
                value={nomInvite}
                onChange={(e) => setNomInvite(e.target.value)}
                className="input text-sm"
                required
              />
            )}
            <textarea
              placeholder="Écris un commentaire..."
              rows={2}
              value={texteCommentaire}
              onChange={(e) => setTexteCommentaire(e.target.value)}
              className="input text-sm"
              required
            />
            <button type="submit" className="rounded-full bg-orange px-4 py-2 font-body text-xs font-semibold text-ink hover:bg-lime">
              Publier
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
