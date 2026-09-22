export default function ContactPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-24">
      <h1 className="font-display text-5xl">Contact</h1>
      <p className="mt-4 font-body text-white/60">
        Une question, un partenariat, une envie de rejoindre GC ESPORT ?
      </p>

      <form className="mt-12 space-y-6">
        <div>
          <label className="font-body text-sm text-white/70">Nom</label>
          <input
            type="text"
            className="mt-2 w-full rounded-lg border border-line bg-panel px-4 py-3 font-body text-white outline-none focus:border-orange"
          />
        </div>
        <div>
          <label className="font-body text-sm text-white/70">E-mail</label>
          <input
            type="email"
            className="mt-2 w-full rounded-lg border border-line bg-panel px-4 py-3 font-body text-white outline-none focus:border-orange"
          />
        </div>
        <div>
          <label className="font-body text-sm text-white/70">Message</label>
          <textarea
            rows={5}
            className="mt-2 w-full rounded-lg border border-line bg-panel px-4 py-3 font-body text-white outline-none focus:border-orange"
          />
        </div>
        <button
          type="submit"
          className="rounded-full bg-orange px-7 py-3 font-body font-semibold text-ink transition hover:bg-lime"
        >
          Envoyer
        </button>
      </form>
    </div>
  );
}
