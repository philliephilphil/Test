// Real branch locations of Bäckerei Brandner within Salzburger Land scope.
// Confirmed 2026-06 against the official branch listing
// (baeckerei-brandner.at/filialen-öffnungszeiten-1/) cross-checked with
// herold.at / firmenabc.at, since the official site blocks automated fetches.
//
// Out of scope (Oberösterreich, not Salzburger Land): Ostermiething
// (Weilhartstraße 40, 5121 Ostermiething), Eggelsberg, Riedersbach/HQ.
//
// Coordinates are approximate (town/street-level) and should be refined via
// geocoding (e.g. OSM Nominatim) at data-fetch time — the address string is
// the authoritative value, the lat/lon only place a marker.
export type BrandnerBranch = {
  name: string;
  address: string;
  /** Free-form opening hours as published by Brandner (display only). */
  openingHours: string;
  /** Approximate marker coordinates; see file header. */
  lat: number;
  lon: number;
  approximateCoords: true;
};

export const BRANDNER_BRANCHES: BrandnerBranch[] = [
  {
    name: "Brandner Salzburg (Fadingerstraße)",
    address: "Fadingerstraße 1a, 5020 Salzburg",
    openingHours: "Mo–Fr 06:30–18:00, Sa 06:30–12:00, So geschlossen",
    lat: 47.8146,
    lon: 13.0566,
    approximateCoords: true,
  },
  {
    name: "Brandner Oberndorf",
    address: "Brückenstraße 2, 5110 Oberndorf bei Salzburg",
    openingHours: "Mo–Fr 06:00–18:00, Sa 06:00–12:00, So 07:00–10:00",
    lat: 47.9436,
    lon: 12.9387,
    approximateCoords: true,
  },
  {
    name: "Brandner Snack Store Lamprechtshausen",
    address: "Bahnhofstraße 8, 5112 Lamprechtshausen",
    openingHours: "Mo–Fr 05:30–10:00, Sa 07:00–10:00, So geschlossen",
    lat: 47.9725,
    lon: 12.9575,
    approximateCoords: true,
  },
];
