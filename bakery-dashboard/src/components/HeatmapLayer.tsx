"use client";

import { useEffect } from "react";
import L from "leaflet";
import "leaflet.heat";
import { useMap } from "react-leaflet";

export type HeatPoint = [number, number, number];

export default function HeatmapLayer({ points, options }: { points: HeatPoint[]; options?: L.HeatMapOptions }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;
    const layer = L.heatLayer(points, { radius: 25, blur: 18, maxZoom: 13, ...options }).addTo(map);
    return () => {
      map.removeLayer(layer);
    };
  }, [map, points, options]);

  return null;
}
