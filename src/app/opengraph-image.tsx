import { ImageResponse } from "next/og";

export const alt = "Docalio : le portail client qui récupère vos pièces et fait valider vos documents";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  const rows = [
    { t: "Relevés bancaires du mois", s: "Reçue", c: "#7c3aed", b: "#f5f3ff" },
    { t: "Bilan 2025", s: "Approuvé", c: "#047857", b: "#ecfdf5" },
    { t: "Pièce d'identité", s: "En attente", c: "#64748b", b: "#f1f5f9" },
  ];
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "linear-gradient(135deg, #0b1224 0%, #172554 60%, #1d4ed8 100%)",
          padding: 72,
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 620 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 34,
                fontWeight: 700,
                border: "2px solid rgba(255,255,255,0.25)",
              }}
            >
              D
            </div>
            <div style={{ fontSize: 34, fontWeight: 700 }}>Docalio</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 62, fontWeight: 700, lineHeight: 1.05, letterSpacing: -1.5 }}>
              Vos clients déposent leurs pièces.
            </div>
            <div style={{ fontSize: 62, fontWeight: 700, lineHeight: 1.05, letterSpacing: -1.5, color: "#93c5fd" }}>
              Sans relance.
            </div>
            <div style={{ fontSize: 26, marginTop: 24, color: "#cbd5e1" }}>
              Portail client sécurisé · collecte de pièces · validation · suivi en temps réel
            </div>
          </div>
          <div style={{ fontSize: 22, color: "#93c5fd" }}>docalio.app · Hébergé dans l&apos;UE</div>
        </div>
        <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "flex-end" }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: 400,
              background: "white",
              borderRadius: 28,
              padding: 28,
              color: "#0f172a",
              boxShadow: "0 40px 80px rgba(0,0,0,0.35)",
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 700, color: "#64748b", letterSpacing: 1 }}>PIÈCES DEMANDÉES</div>
            {rows.map((r) => (
              <div
                key={r.t}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 18,
                  padding: "14px 16px",
                  borderRadius: 16,
                  border: "1px solid #e2e8f0",
                }}
              >
                <div style={{ fontSize: 20, fontWeight: 600 }}>{r.t}</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: r.c, background: r.b, padding: "6px 12px", borderRadius: 999 }}>
                  {r.s}
                </div>
              </div>
            ))}
            <div style={{ display: "flex", marginTop: 22, height: 10, borderRadius: 999, background: "#e2e8f0" }}>
              <div style={{ width: "66%", borderRadius: 999, background: "#2563eb" }} />
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
}
