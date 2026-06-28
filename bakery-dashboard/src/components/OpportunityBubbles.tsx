"use client";

import { Marker } from "react-leaflet";
import L from "leaflet";
import type { Opportunity } from "@/lib/types";

// 0 -> red, 0.5 -> amber, 1 -> green. Encodes the opportunity (high score =
// much demand and few bakeries = "hier gründen").
function bubbleColor(score: number | null): string {
  if (score === null) return "#9e9e9e";
  const hue = Math.round(score * 120);
  return `hsl(${hue}, 70%, 45%)`;
}

function makeIcon(o: Opportunity): L.DivIcon {
  const size = o.marketSize ?? 0; // bubble size = market magnitude
  const d = Math.round(30 + size * 56);
  const label = o.opportunityScore !== null ? String(Math.round(o.opportunityScore * 100)) : "?";
  const bg = bubbleColor(o.opportunityScore);
  const fontSize = Math.max(12, Math.round(d / 3));
  return L.divIcon({
    className: "",
    iconSize: [d, d],
    iconAnchor: [d / 2, d / 2],
    html: `<div style="width:${d}px;height:${d}px;border-radius:50%;background:${bg};opacity:0.85;border:2px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:${fontSize}px;">${label}</div>`,
  });
}

export default function OpportunityBubbles({
  opportunities,
  onSelect,
}: {
  opportunities: Opportunity[];
  onSelect: (o: Opportunity) => void;
}) {
  return (
    <>
      {opportunities.map((o) => (
        <Marker
          key={o.bezirk}
          position={[o.referencePoint.lat, o.referencePoint.lon]}
          icon={makeIcon(o)}
          eventHandlers={{ click: () => onSelect(o) }}
        />
      ))}
    </>
  );
}
