"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Notif = { id: string; titre: string; message: string; lue: boolean; created_at: string };

export default function NotificationBell({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>([]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  async function load() {
    const { data } = await supabase
      .from("notifications")
      .select("id, titre, message, lue, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    setNotifs(data ?? []);
  }

  async function handleOpen() {
    setOpen(!open);
    if (!open) {
      const unread = notifs.filter((n) => !n.lue).map((n) => n.id);
      if (unread.length > 0) {
        await supabase.from("notifications").update({ lue: true }).in("id", unread);
        setNotifs((prev) => prev.map((n) => ({ ...n, lue: true })));
      }
    }
  }

  const unreadCount = notifs.filter((n) => !n.lue).length;

  return (
    <div className="relative">
      <button
        onClick={handleOpen}
        aria-label="Notifications"
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/20 hover:border-white/50"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange text-[10px] font-bold text-ink">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 max-h-96 w-80 overflow-y-auto rounded-2xl border border-line bg-panel p-3 shadow-xl">
          {notifs.length === 0 ? (
            <p className="p-4 text-center font-body text-sm text-white/40">Aucune notification.</p>
          ) : (
            <div className="space-y-2">
              {notifs.map((n) => (
                <div key={n.id} className="rounded-lg border border-line p-3">
                  <p className="font-body text-sm font-semibold">{n.titre}</p>
                  <p className="mt-1 font-body text-xs text-white/60">{n.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
