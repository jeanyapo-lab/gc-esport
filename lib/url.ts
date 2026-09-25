// Normalise un lien saisi par l'utilisateur (ex : "instagram.com/pseudo")
// en une URL absolue utilisable dans un href ("https://instagram.com/pseudo").
// Sans ça, un lien enregistré sans "http(s)://" est traité par le
// navigateur comme un chemin relatif du site GC ESPORT et ne redirige
// jamais vers le bon endroit — c'est ce qui rendait les icônes de
// réseaux sociaux inopérantes.
export function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}
