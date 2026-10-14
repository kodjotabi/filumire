export type VoiceLanguage = "en" | "fr";
export type VoicePresentation = "male-presenting" | "female-presenting";
export type VoiceStyle = "neutral" | "warm" | "calm" | "expressive";
export interface LearningVoice {
  id: string;
  region: "ghana" | "nigeria" | "kenya" | "south-africa" | "west-africa-francophone";
  language: VoiceLanguage;
  presentation: VoicePresentation;
  status: "unavailable" | "verified";
  styles: readonly VoiceStyle[];
  // A verified entry requires reviewed provenance and a consent/licensing record.
  verification?: { evidence: string; rights: string };
  engineId?: string;
}
const regions = ["ghana", "nigeria", "kenya", "south-africa", "west-africa-francophone"] as const;
export const AFRICAN_VOICES: readonly LearningVoice[] = regions.flatMap((region) =>
  (["male-presenting", "female-presenting"] as const).map((presentation) => ({
    id: `${region}-${presentation}`, region, presentation,
    language: region === "west-africa-francophone" ? "fr" as const : "en" as const,
    status: "unavailable" as const, styles: [],
  })));
export const REGION_LABELS = {
  en: { ghana: "Ghanaian English", nigeria: "Nigerian English", kenya: "Kenyan English", "south-africa": "South African English", "west-africa-francophone": "West African Francophone French" },
  fr: { ghana: "Anglais ghanéen", nigeria: "Anglais nigérian", kenya: "Anglais kényan", "south-africa": "Anglais sud-africain", "west-africa-francophone": "Français d’Afrique de l’Ouest" },
};
export interface BrowserVoiceMetadata { name: string; lang: string; localService: boolean; voiceURI: string }
/** Inventory only: neither a locale nor a name certifies an authentic accent. */
export function auditBrowserVoices(voices: readonly BrowserVoiceMetadata[]) {
  return voices.map((voice) => ({ name: voice.name.slice(0, 160), language: voice.lang.slice(0, 40), local: voice.localService, verification: "unverified" as const }));
}
