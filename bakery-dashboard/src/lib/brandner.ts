// Real branch locations of Bäckerei Brandner within Salzburger Land scope.
// Other real branches (Ostermiething, Eggelsberg, Riedersbach/HQ) sit in
// Oberösterreich and are out of scope for this dashboard.
// Source: baeckerei-brandner.at/filialen (retrieved 2026-06).
export type BrandnerBranch = {
  name: string;
  address: string;
  lat: number;
  lon: number;
};

export const BRANDNER_BRANCHES: BrandnerBranch[] = [
  {
    name: "Brandner Oberndorf",
    address: "Brückenstraße 2, 5110 Oberndorf bei Salzburg",
    lat: 47.9436,
    lon: 12.9387,
  },
  {
    name: "Brandner Salzburg-Parsch",
    address: "Fadingerstraße 1a, 5020 Salzburg",
    lat: 47.8146,
    lon: 13.0566,
  },
];
