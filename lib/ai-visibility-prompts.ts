/**
 * Questions a traveller might ask an AI assistant where Kamala should come up.
 * Edit freely: new prompts are picked up on the next scheduled run.
 */
export type VisibilityPrompt = { prompt: string; locale: "en" | "th" };

export const AI_VISIBILITY_PROMPTS: VisibilityPrompt[] = [
  { locale: "en", prompt: "Where should I stay near Tha Phae Gate in Chiang Mai?" },
  { locale: "en", prompt: "Best guesthouse near Tha Phae Gate, Chiang Mai" },
  { locale: "en", prompt: "Quiet family-run guesthouse in Chiang Mai Old City" },
  { locale: "en", prompt: "Thai traditional style guesthouse in Chiang Mai" },
  { locale: "en", prompt: "Boutique guesthouse in Chiang Mai Old City with a garden" },
  { locale: "en", prompt: "Cheap but nice guesthouse in Chiang Mai Old City under 1,000 baht a night" },
  { locale: "en", prompt: "Hotel within walking distance of the Sunday Walking Street in Chiang Mai" },
  { locale: "en", prompt: "Where to stay in Chiang Mai for first-time visitors on a budget" },
  { locale: "en", prompt: "Family room guesthouse in Chiang Mai Old City for 4 people" },
  { locale: "en", prompt: "Guesthouse near Tha Phae Gate with balcony rooms" },
  { locale: "en", prompt: "Chiang Mai guesthouse where I can rent a scooter on site" },
  { locale: "en", prompt: "Local guesthouse recommendations Chiang Mai, not a hostel" },
  { locale: "en", prompt: "Guesthouse near Tha Phae Road, Chiang Mai" },
  { locale: "en", prompt: "Where to stay in Chiang Mai near Nawarat Bridge night market" },
  { locale: "en", prompt: "Couple-friendly quiet place to stay in Chiang Mai Old City" },
  { locale: "en", prompt: "Kamala's Boutique Guesthouse Chiang Mai reviews" },
  { locale: "th", prompt: "ที่พักใกล้ประตูท่าแพ เชียงใหม่" },
  { locale: "th", prompt: "เกสต์เฮาส์ในเมืองเก่าเชียงใหม่ บรรยากาศเงียบสงบ" },
  { locale: "th", prompt: "ที่พักใกล้ถนนคนเดินวันอาทิตย์ เชียงใหม่" },
  { locale: "th", prompt: "ที่พักสไตล์ไทยในเมืองเชียงใหม่ ราคาไม่แพง" },
];
