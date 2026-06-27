import { test } from "node:test";
import assert from "node:assert/strict";
import { computePotentialScore } from "./score";

test("returns null score when all inputs missing", () => {
  const result = computePotentialScore({
    bakeryGap: null,
    frequencyPotential: null,
    tourismIntensity: null,
    weatherFavorability: null,
  });
  assert.equal(result.score, null);
  assert.match(result.explanation, /nicht berechenbar/);
});

test("computes weighted score when all inputs present", () => {
  const result = computePotentialScore({
    bakeryGap: 1,
    frequencyPotential: 1,
    tourismIntensity: 1,
    weatherFavorability: 1,
  });
  assert.equal(result.score, 1);
});

test("computes weighted score with all-zero inputs", () => {
  const result = computePotentialScore({
    bakeryGap: 0,
    frequencyPotential: 0,
    tourismIntensity: 0,
    weatherFavorability: 0,
  });
  assert.equal(result.score, 0);
});

test("renormalizes weights when a factor is missing", () => {
  const result = computePotentialScore({
    bakeryGap: 1,
    frequencyPotential: 1,
    tourismIntensity: 1,
    weatherFavorability: null,
  });
  // Remaining 3 factors all = 1 -> renormalized weighted sum = 1
  assert.equal(result.score, 1);
  assert.match(result.explanation, /Wetter-Gunst/);
});

test("partial inputs produce a value strictly between the extremes", () => {
  const result = computePotentialScore({
    bakeryGap: 1,
    frequencyPotential: 0,
    tourismIntensity: null,
    weatherFavorability: null,
  });
  assert.ok(result.score !== null && result.score > 0 && result.score < 1);
});
