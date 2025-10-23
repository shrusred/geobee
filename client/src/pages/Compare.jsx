import { useEffect, useMemo, useState } from "react";
import Header from "./Header.jsx";
import "./compare.css";

/* API base */
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
const COUNTRIES_URL = `${API_BASE}/api/countries`;
const COUNTRY_URL = (code) => `${API_BASE}/api/country/${code}`;

/* Fields to show in the comparison table */
const FIELD_LABELS = [
  ["capital", "Capital"],
  ["region", "Region"],
  ["languages", "Languages"],
  ["landlocked", "Landlocked"],
  ["area", "Area (km²)"],
  ["population", "Population"],
  ["currencies", "Currencies"],
  ["gdp", "GDP (current US$)"],
  ["gdpPerCapita", "GDP per capita (US$)"],
  ["populationGrowth", "Population growth (%)"],
  ["unemploymentRate", "Unemployment rate (%)"],
  ["laborForceParticipation", "Labor force participation (%)"],
  ["exportsPctGdp", "Exports (% of GDP)"],
  ["importsPctGdp", "Imports (% of GDP)"],
  ["currentAccountPctGdp", "Current account (% of GDP)"],
  ["militarySpendPctGdp", "Military expenditure (% of GDP)"],
  ["tourismArrivals", "Tourism arrivals (intl)"],
];

/* Helpers */
function formatValue(value) {
  if (value == null) return "—";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return Intl.NumberFormat().format(value);
  if (typeof value === "object") {
    if (Object.values(value).every((v) => typeof v === "string")) {
      return Object.values(value).join(", ");
    }
    if (
      Object.values(value).every(
        (v) => v && typeof v === "object" && ("name" in v || "symbol" in v)
      )
    ) {
      return Object.values(value)
        .map((c) => `${c.name ?? ""}${c.symbol ? ` (${c.symbol})` : ""}`.trim())
        .join(", ");
    }
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

const authHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/* Build OpenStreetMap embed URL based on lat/lng  */
function buildOsmEmbedSrc(lat, lng) {
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const delta = 2; /* degrees around centroid */
  const minLat = clamp(lat - delta, -85, 85);
  const maxLat = clamp(lat + delta, -85, 85);
  const minLng = clamp(lng - delta, -180, 180);
  const maxLng = clamp(lng + delta, -180, 180);
  const bbox = `${minLng},${minLat},${maxLng},${maxLat}`; /* minLon,minLat,maxLon,maxLat */
  const marker = `${lat},${lng}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(
    bbox
  )}&layer=mapnik&marker=${encodeURIComponent(marker)}`;
}

export default function Compare() {
  const [allCountries, setAllCountries] = useState([]);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [error, setError] = useState("");

  // Selections
  const [regionA, setRegionA] = useState("");
  const [codeA, setCodeA] = useState("");
  const [regionB, setRegionB] = useState("");
  const [codeB, setCodeB] = useState("");

  // Details
  const [detailA, setDetailA] = useState(null);
  const [detailB, setDetailB] = useState(null);

  // Map coords from REST Countries external api
  const [coordsA, setCoordsA] = useState(null); // { lat, lng }
  const [coordsB, setCoordsB] = useState(null); // { lat, lng }
  const [mapErrA, setMapErrA] = useState("");
  const [mapErrB, setMapErrB] = useState("");

  // Load all countries
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoadingCountries(true);
        setError("");
        const res = await fetch(COUNTRIES_URL, {
          headers: { ...authHeaders() },
        });
        if (!res.ok) throw new Error("Failed to load countries");
        const data = await res.json();
        if (alive) setAllCountries(Array.isArray(data) ? data : []);
      } catch {
        if (alive) setError("Failed to load countries");
      } finally {
        if (alive) setLoadingCountries(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Regions derived from countries
  const regions = useMemo(() => {
    const s = new Set(allCountries.map((c) => c.region).filter(Boolean));
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [allCountries]);

  // Lists by region
  const listA = useMemo(
    () => allCountries.filter((c) => regionA && c.region === regionA),
    [allCountries, regionA]
  );
  const listB = useMemo(
    () => allCountries.filter((c) => regionB && c.region === regionB),
    [allCountries, regionB]
  );

  // Reset on region change
  useEffect(() => {
    setCodeA("");
    setDetailA(null);
    setCoordsA(null);
    setMapErrA("");
  }, [regionA]);
  useEffect(() => {
    setCodeB("");
    setDetailB(null);
    setCoordsB(null);
    setMapErrB("");
  }, [regionB]);

  // Compare
  const [comparing, setComparing] = useState(false);
  const canCompare = Boolean(codeA && codeB);

  async function handleCompare() {
    if (!canCompare) return;
    try {
      setComparing(true);
      setError("");
      const [ra, rb] = await Promise.all([
        fetch(COUNTRY_URL(codeA), { headers: { ...authHeaders() } }),
        fetch(COUNTRY_URL(codeB), { headers: { ...authHeaders() } }),
      ]);
      if (!ra.ok || !rb.ok) throw new Error();
      const [da, db] = await Promise.all([ra.json(), rb.json()]);
      setDetailA(da);
      setDetailB(db);
    } catch {
      setError("Compare failed");
    } finally {
      setComparing(false);
    }
  }

  // Fetch lat/lng from REST Countries for map embeds
  useEffect(() => {
    let ignore = false;
    if (!codeA) {
      setCoordsA(null);
      setMapErrA("");
      return;
    }
    (async () => {
      try {
        setCoordsA(null);
        setMapErrA("");
        const r = await fetch(
          `https://restcountries.com/v3.1/alpha/${encodeURIComponent(
            codeA
          )}?fields=latlng,name`
        );
        if (!r.ok) throw new Error();
        const j = await r.json();
        const item = Array.isArray(j) ? j[0] : j;
        const arr = item?.latlng;
        if (
          Array.isArray(arr) &&
          arr.length === 2 &&
          isFinite(arr[0]) &&
          isFinite(arr[1])
        ) {
          if (!ignore) setCoordsA({ lat: Number(arr[0]), lng: Number(arr[1]) });
        } else {
          if (!ignore) setMapErrA("No coordinates available.");
        }
      } catch {
        if (!ignore) setMapErrA("Could not load map coordinates.");
      }
    })();
    return () => {
      ignore = true;
    };
  }, [codeA]);

  useEffect(() => {
    let ignore = false;
    if (!codeB) {
      setCoordsB(null);
      setMapErrB("");
      return;
    }
    (async () => {
      try {
        setCoordsB(null);
        setMapErrB("");
        const r = await fetch(
          `https://restcountries.com/v3.1/alpha/${encodeURIComponent(
            codeB
          )}?fields=latlng,name`
        );
        if (!r.ok) throw new Error();
        const j = await r.json();
        const item = Array.isArray(j) ? j[0] : j;
        const arr = item?.latlng;
        if (
          Array.isArray(arr) &&
          arr.length === 2 &&
          isFinite(arr[0]) &&
          isFinite(arr[1])
        ) {
          if (!ignore) setCoordsB({ lat: Number(arr[0]), lng: Number(arr[1]) });
        } else {
          if (!ignore) setMapErrB("No coordinates available.");
        }
      } catch {
        if (!ignore) setMapErrB("Could not load map coordinates.");
      }
    })();
    return () => {
      ignore = true;
    };
  }, [codeB]);

  // Rows present
  const rows = useMemo(() => {
    return FIELD_LABELS.filter(
      ([k]) => detailA?.[k] != null || detailB?.[k] != null
    );
  }, [detailA, detailB]);

  return (
    <div className="page-shell">
      <Header />

      {/* Local container only */}
      <div className="compare-main">
        <main className="compare-container">
          {/* Left selector */}
          <section className="selector selector--a">
            <div className="selector__title">Country A</div>

            <div className="selector__controls">
              <div className="selector__row">
                <label className="selector__label" htmlFor="regionA">
                  Region
                </label>
                <select
                  id="regionA"
                  value={regionA}
                  onChange={(e) => setRegionA(e.target.value)}
                >
                  <option value="">Select a region…</option>
                  {regions.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div className={`country-list ${regionA ? "" : "is-disabled"}`}>
                {(regionA ? listA : []).map((c) => (
                  <div
                    key={c.code}
                    className={`country-list__item ${
                      codeA === c.code ? "is-selected" : ""
                    }`}
                    onClick={() => setCodeA(c.code)}
                  >
                    <span>{c.name}</span>
                    {codeA === c.code ? <span>✓</span> : null}
                  </div>
                ))}
                {!regionA && (
                  <div className="country-list__item">
                    <span className="helper">
                      Choose a region to see countries
                    </span>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* VS (wide screens only via CSS) */}
          <div className="vs">VS</div>

          {/* Right selector */}
          <section className="selector selector--b">
            <div className="selector__title">Country B</div>

            <div className="selector__controls">
              <div className="selector__row">
                <label className="selector__label" htmlFor="regionB">
                  Region
                </label>
                <select
                  id="regionB"
                  value={regionB}
                  onChange={(e) => setRegionB(e.target.value)}
                >
                  <option value="">Select a region…</option>
                  {regions.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div className={`country-list ${regionB ? "" : "is-disabled"}`}>
                {(regionB ? listB : []).map((c) => (
                  <div
                    key={c.code}
                    className={`country-list__item ${
                      codeB === c.code ? "is-selected" : ""
                    }`}
                    onClick={() => setCodeB(c.code)}
                  >
                    <span>{c.name}</span>
                    {codeB === c.code ? <span>✓</span> : null}
                  </div>
                ))}
                {!regionB && (
                  <div className="country-list__item">
                    <span className="helper">
                      Choose a region to see countries
                    </span>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Single shared Compare  */}
          <section style={{ gridColumn: "1 / -1" }}>
            <div className="compare-actions">
              <button
                className="btn btn-primary"
                type="button"
                onClick={handleCompare}
                disabled={!Boolean(codeA && codeB) || comparing}
                title={
                  !Boolean(codeA && codeB) ? "Select both countries" : "Compare"
                }
              >
                {comparing ? "Comparing…" : "Compare"}
              </button>
              {!Boolean(codeA && codeB) && (
                <div className="hint">Select 2 countries for comparison.</div>
              )}
            </div>
          </section>

          {/* Results */}
          {(detailA || detailB) && (
            <section className="results" style={{ gridColumn: "1 / -1" }}>
              <table className="compare-table">
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th className="col-a">
                      {detailA?.name ||
                        detailA?.name?.common ||
                        codeA ||
                        "Country A"}
                    </th>
                    <th className="col-b">
                      {detailB?.name ||
                        detailB?.name?.common ||
                        codeB ||
                        "Country B"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr>
                      <th>No metrics</th>
                      <td>—</td>
                      <td>—</td>
                    </tr>
                  )}
                  {rows.map(([key, label]) => (
                    <tr key={key}>
                      <th>{label}</th>
                      <td>{formatValue(detailA?.[key])}</td>
                      <td>{formatValue(detailB?.[key])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="maps">
                <div className="map-card">
                  <div className="map-card__header">
                    Map —{" "}
                    {detailA?.name ||
                      detailA?.name?.common ||
                      codeA ||
                      "Country A"}
                  </div>
                  <div className="map">
                    {coordsA ? (
                      <iframe
                        title={`Map ${codeA || "A"}`}
                        style={{ border: 0, width: "100%", height: "100%" }}
                        loading="lazy"
                        src={buildOsmEmbedSrc(coordsA.lat, coordsA.lng)}
                      />
                    ) : mapErrA ? (
                      <div
                        style={{ padding: "0.75rem", color: "var(--danger)" }}
                      >
                        {mapErrA}
                      </div>
                    ) : (
                      <div style={{ padding: "0.75rem", color: "#666" }}>
                        Loading map…
                      </div>
                    )}
                  </div>
                </div>

                <div className="map-card">
                  <div className="map-card__header">
                    Map —{" "}
                    {detailB?.name ||
                      detailB?.name?.common ||
                      codeB ||
                      "Country B"}
                  </div>
                  <div className="map">
                    {coordsB ? (
                      <iframe
                        title={`Map ${codeB || "B"}`}
                        style={{ border: 0, width: "100%", height: "100%" }}
                        loading="lazy"
                        src={buildOsmEmbedSrc(coordsB.lat, coordsB.lng)}
                      />
                    ) : mapErrB ? (
                      <div
                        style={{ padding: "0.75rem", color: "var(--danger)" }}
                      >
                        {mapErrB}
                      </div>
                    ) : (
                      <div style={{ padding: "0.75rem", color: "#666" }}>
                        Loading map…
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          {loadingCountries && (
            <div className="loading">Loading countries…</div>
          )}
          {error && <div className="error">{error}</div>}
        </main>
      </div>
    </div>
  );
}
