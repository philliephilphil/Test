// Potenzial-Score: pure, documented weighted sum of 4 named factors.
// No black-box model. Missing inputs are never guessed — if a factor is
// missing, it's excluded and surfaced in the explanation, and the score is
// only withheld entirely (null) when every factor is missing.
import type { ScoreInputs, ScoreResult, ScoreTerm } from "./types";

export const WEIGHT_BAKERY_GAP = 0.3;
export const WEIGHT_FREQUENCY_POTENTIAL = 0.3;
export const WEIGHT_TOURISM_INTENSITY = 0.25;
export const WEIGHT_WEATHER_FAVORABILITY = 0.15;

export function computePotentialScore(inputs: ScoreInputs): ScoreResult {
  const terms: ScoreTerm[] = [
    { label: "Bäckerei-Lücke", weight: WEIGHT_BAKERY_GAP, value: inputs.bakeryGap },
    { label: "Frequenz-Potenzial", weight: WEIGHT_FREQUENCY_POTENTIAL, value: inputs.frequencyPotential },
    { label: "Tourismus-Intensität", weight: WEIGHT_TOURISM_INTENSITY, value: inputs.tourismIntensity },
    { label: "Wetter-Gunst", weight: WEIGHT_WEATHER_FAVORABILITY, value: inputs.weatherFavorability },
  ];

  const available = terms.filter((t) => t.value !== null);
  if (available.length === 0) {
    return {
      score: null,
      terms,
      explanation: "Potenzial-Score nicht berechenbar (keine der vier Eingaben verfügbar).",
    };
  }

  // Renormalize weights over available terms so a missing factor doesn't
  // silently bias the score toward 0 — but always disclose what's missing.
  const availableWeightSum = available.reduce((sum, t) => sum + t.weight, 0);
  const score = available.reduce((sum, t) => sum + (t.value as number) * (t.weight / availableWeightSum), 0);

  const missing = terms.filter((t) => t.value === null).map((t) => t.label);
  const explanation =
    missing.length === 0
      ? `Score aus allen 4 Faktoren berechnet (Gewichte: ${terms.map((t) => `${t.label} ${Math.round(t.weight * 100)}%`).join(", ")}).`
      : `Score aus ${available.length}/4 Faktoren berechnet, Gewichte auf verfügbare Faktoren renormiert. Fehlend: ${missing.join(", ")}.`;

  return { score: Math.round(score * 100) / 100, terms, explanation };
}
