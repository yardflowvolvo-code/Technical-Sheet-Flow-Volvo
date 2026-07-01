import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  useListArrivals,
  useGetConfig,
  getListArrivalsQueryKey,
  getGetConfigQueryKey,
} from "@workspace/api-client-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_CONFIG: Record<string, { color: string; label: string; ring: string }> = {
  waiting:       { color: "#6b7280", label: "Aguardando",   ring: "#9ca3af" },
  in_yard:       { color: "#22c55e", label: "No pátio",     ring: "#4ade80" },
  called:        { color: "#f59e0b", label: "Chamado",      ring: "#fbbf24" },
  possible_exit: { color: "#ef4444", label: "Saída poss.", ring: "#f87171" },
  finished:      { color: "#374151", label: "Finalizado",   ring: "#6b7280" },
};

function makeIcon(status: string, plate: string) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.waiting;
  return L.divIcon({
    className: "",
    iconSize: [44, 44],
    iconAnchor: [22, 44],
    popupAnchor: [0, -46],
    html: `
      <div style="
        display:flex; flex-direction:column; align-items:center; gap:2px;
        filter: drop-shadow(0 2px 4px rgba(0,0,0,.5));
      ">
        <div style="
          width:40px; height:40px; border-radius:50%;
          background:${cfg.color}; border:3px solid ${cfg.ring};
          display:flex; align-items:center; justify-content:center;
          animation: pulse 2s infinite;
        ">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"
            width="20" height="20">
            <rect x="1" y="3" width="15" height="13" rx="2"/>
            <path d="M16 8h4l3 4v4h-7V8z"/>
            <circle cx="5.5" cy="18.5" r="2.5"/>
            <circle cx="18.5" cy="18.5" r="2.5"/>
          </svg>
        </div>
        <div style="
          background:rgba(0,0,0,.85); color:white; font-size:10px; font-weight:700;
          padding:2px 6px; border-radius:4px; white-space:nowrap; letter-spacing:.5px;
          border:1px solid ${cfg.ring};
        ">${plate}</div>
      </div>`,
  });
}

function geofenceCircleHtml(radius: number): string {
  return `${(radius / 1000).toFixed(2)} km`;
}

export default function Mapa() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<number, L.Marker>>(new Map());
  const circleRef = useRef<L.Circle | null>(null);
  const centerMarkerRef = useRef<L.Marker | null>(null);

  const { data: config } = useGetConfig({ query: { refetchInterval: 60_000, queryKey: getGetConfigQueryKey() } });
  const { data: arrivals = [], isLoading } = useListArrivals(
    {},
    { query: { refetchInterval: 10_000, queryKey: getListArrivalsQueryKey({}) } }
  );

  const arrivalsWithLocation = arrivals.filter(
    (a) => a.lastLat != null && a.lastLng != null && a.status !== "finished"
  );

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    const lat = config?.geofenceLat ?? -25.45;
    const lng = config?.geofenceLng ?? -49.36;
    const map = L.map(mapRef.current, {
      center: [lat, lng],
      zoom: 16,
      zoomControl: true,
      attributionControl: false,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 20,
    }).addTo(map);
    L.control.attribution({ prefix: "© OpenStreetMap" }).addTo(map);
    mapInstanceRef.current = map;
    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !config) return;
    const { geofenceLat: lat, geofenceLng: lng, geofenceRadiusMeters: radius } = config;
    if (circleRef.current) circleRef.current.remove();
    if (centerMarkerRef.current) centerMarkerRef.current.remove();
    circleRef.current = L.circle([lat, lng], {
      radius,
      color: "#3b82f6",
      fillColor: "#3b82f6",
      fillOpacity: 0.06,
      weight: 2,
      dashArray: "6 4",
    }).addTo(map);
    centerMarkerRef.current = L.marker([lat, lng], {
      icon: L.divIcon({
        className: "",
        iconSize: [16, 16],
        iconAnchor: [8, 8],
        html: `<div style="width:16px;height:16px;border-radius:50%;background:#3b82f6;border:3px solid #93c5fd;opacity:.8"></div>`,
      }),
    })
      .addTo(map)
      .bindPopup(`<b>Centro do geofence</b><br>${geofenceCircleHtml(radius)}`);
  }, [config]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const seen = new Set<number>();
    for (const a of arrivalsWithLocation) {
      const lat = a.lastLat!;
      const lng = a.lastLng!;
      const cfg = STATUS_CONFIG[a.status] ?? STATUS_CONFIG.waiting;
      const lastSeen = a.lastLocationAt
        ? formatDistanceToNow(new Date(a.lastLocationAt), { locale: ptBR, addSuffix: true })
        : "nunca";

      const popupHtml = `
        <div style="min-width:160px;font-family:monospace;">
          <div style="font-weight:700;font-size:15px;letter-spacing:.5px;margin-bottom:4px;">${a.plate}</div>
          <div style="color:${cfg.color};font-weight:600;font-size:12px;margin-bottom:6px;">● ${cfg.label}</div>
          ${a.driverName ? `<div style="font-size:12px;color:#374151;">🚗 ${a.driverName}</div>` : ""}
          ${a.dockNumber ? `<div style="font-size:12px;color:#f59e0b;font-weight:600;">📦 Doca ${a.dockNumber}</div>` : ""}
          ${a.invoiceNumber ? `<div style="font-size:12px;color:#6b7280;">NF ${a.invoiceNumber}</div>` : ""}
          <div style="font-size:11px;color:#9ca3af;margin-top:6px;border-top:1px solid #e5e7eb;padding-top:4px;">
            📍 atualizado ${lastSeen}
          </div>
        </div>`;

      if (markersRef.current.has(a.id)) {
        const m = markersRef.current.get(a.id)!;
        m.setLatLng([lat, lng]);
        m.setIcon(makeIcon(a.status, a.plate));
        m.setPopupContent(popupHtml);
      } else {
        const m = L.marker([lat, lng], { icon: makeIcon(a.status, a.plate) })
          .addTo(map)
          .bindPopup(popupHtml);
        markersRef.current.set(a.id, m);
      }
      seen.add(a.id);
    }

    for (const [id, marker] of markersRef.current) {
      if (!seen.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    }
  }, [arrivalsWithLocation]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-xl font-bold text-foreground tracking-tight">Mapa do Pátio</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Posições em tempo real · atualiza a cada 10 s
          </p>
        </div>
        <div className="flex items-center gap-6 text-sm">
          {Object.entries(STATUS_CONFIG)
            .filter(([k]) => k !== "finished")
            .map(([key, cfg]) => {
              const count = arrivals.filter((a) => a.status === key).length;
              return (
                <div key={key} className="flex items-center gap-1.5">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full"
                    style={{ background: cfg.color }}
                  />
                  <span className="text-muted-foreground">{cfg.label}</span>
                  <span className="font-bold text-foreground tabular-nums">{count}</span>
                </div>
              );
            })}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div ref={mapRef} className="flex-1 z-0" />

        <div className="w-72 border-l border-border bg-card overflow-y-auto shrink-0">
          <div className="p-4 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              Caminhões no pátio
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <span className="h-5 w-5 rounded-full border-2 border-primary border-r-transparent animate-spin" />
            </div>
          ) : arrivalsWithLocation.length === 0 ? (
            <div className="p-6 text-center">
              <div className="text-3xl mb-2">🗺️</div>
              <p className="text-sm text-muted-foreground">Nenhum caminhão com localização ativa.</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Os motoristas precisam abrir o PWA para compartilhar a posição.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {arrivalsWithLocation.map((a) => {
                const cfg = STATUS_CONFIG[a.status] ?? STATUS_CONFIG.waiting;
                const lastSeen = a.lastLocationAt
                  ? formatDistanceToNow(new Date(a.lastLocationAt), { locale: ptBR, addSuffix: true })
                  : "—";
                return (
                  <button
                    key={a.id}
                    className="w-full text-left p-3 hover:bg-secondary transition-colors"
                    onClick={() => {
                      const map = mapInstanceRef.current;
                      const m = markersRef.current.get(a.id);
                      if (map && m) {
                        map.setView(m.getLatLng(), 18, { animate: true });
                        m.openPopup();
                      }
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: cfg.color }}
                      />
                      <span className="font-bold text-sm text-foreground font-mono">{a.plate}</span>
                      <span
                        className="ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded"
                        style={{ background: cfg.color + "22", color: cfg.color }}
                      >
                        {cfg.label}
                      </span>
                    </div>
                    {a.driverName && (
                      <p className="text-xs text-muted-foreground truncate pl-4">{a.driverName}</p>
                    )}
                    {a.dockNumber && (
                      <p className="text-xs text-amber-500 font-semibold pl-4">Doca {a.dockNumber}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground/60 pl-4 mt-0.5">📍 {lastSeen}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
