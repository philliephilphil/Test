// Shared types for the bakery dashboard. Every data-source module returns
// values shaped so a `source` (URL + retrieval date) travels with the data,
// so the UI can always render a citation next to a number.

export type Source = {
  url: string;
  retrievedAt: string; // ISO date the figure was looked up / transcribed
  note?: string; // e.g. report name, period covered
};

export type BezirkName =
  | "Pinzgau"
  | "Pongau"
  | "Tennengau"
  | "Flachgau"
  | "Lungau"
  | "Salzburg-Stadt";

export const BEZIRKE: BezirkName[] = [
  "Pinzgau",
  "Pongau",
  "Tennengau",
  "Flachgau",
  "Lungau",
  "Salzburg-Stadt",
];

export type Bakery = {
  osmId: number;
  osmType: "node" | "way";
  name: string | null;
  lat: number;
  lon: number;
  openingHours: string | null; // raw OSM opening_hours syntax, unparsed
  addr: {
    street?: string;
    housenumber?: string;
    postcode?: string;
    city?: string;
  };
  website?: string;
  phone?: string;
  bezirk: BezirkName | null;
};

export type BakeriesMeta = {
  fetchedAt: string;
  source: string;
  query: string;
  relationId: number;
  count: number;
};

export type FrequencyPoi = {
  osmId: number;
  category: "transit" | "parking" | "attraction" | "retail";
  lat: number;
  lon: number;
  bezirk: BezirkName | null;
};

export type WithSource<T> = T & { source: Source };

export type WeatherFavorability = {
  value: number; // 0..1
  basis: string; // human-readable explanation of which rule fired / what was averaged
  temperatureMaxC: number;
  precipitationMm: number;
  source: Source;
};

export type TourismEntry = {
  nights: number | null;
  period: string;
  source: Source | null;
};

export type BettenEntry = {
  beds: number | null;
  period: string;
  source: Source | null;
};

export type PopulationEntry = {
  inhabitants: number | null;
  period: string;
  source: Source | null;
};

export type CollectionStats = {
  since: string | null;
  snapshotCount: number;
  daysCovered: number;
};

// Aggregated decision-support KPIs per Bezirk for the "Chancen" bubble layer.
export type Opportunity = {
  bezirk: BezirkName;
  referencePoint: { lat: number; lon: number };
  opportunityScore: number | null; // 0..1 composite (= Potenzial-Score), drives bubble colour
  marketSize: number | null; // 0..1 demand magnitude, drives bubble size
  bakeryCount: number;
  population: number | null;
  nights: number | null;
  beds: number | null;
  frequency: number | null; // 0..1 frequency-potential proxy
  tourismIntensity: number | null; // 0..1
  weatherFavorability: number | null; // 0..1
  supplyPer10k: number | null; // bakeries per 10,000 inhabitants
  drivers: string; // human-readable "warum hier"
};

export type BakerySnapshot = {
  osmId: number;
  capturedAt: string;
  openingHoursRaw: string | null;
  openingHoursHash: string | null;
  tagsPresent: boolean;
  nameRaw: string | null;
};

export type ScoreInputs = {
  bakeryGap: number | null;
  frequencyPotential: number | null;
  tourismIntensity: number | null;
  weatherFavorability: number | null;
};

export type ScoreTerm = {
  label: string;
  weight: number;
  value: number | null;
};

export type ScoreResult = {
  score: number | null;
  terms: ScoreTerm[];
  explanation: string;
};
