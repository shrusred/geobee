import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import Header from "./Header.jsx";
import "./home.css";

export default function Home() {
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Favorites state
  const [isFav, setIsFav] = useState(false);
  const [favBusy, setFavBusy] = useState(false);
  const [showNotePrompt, setShowNotePrompt] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [favoriteId, setFavoriteId] = useState(null);

  // Filters selection
  const [region, setRegion] = useState("");
  const [countryQuery, setCountryQuery] = useState("");
  const [selected, setSelected] = useState(null);

  // Map state
  const [mapLatLng, setMapLatLng] = useState(null);
  const [mapErr, setMapErr] = useState("");

  // Fetch all countries
  useEffect(() => {
    let ignore = false;
    const ctrl = new AbortController();
    (async () => {
      try {
        const { data } = await api.get("/countries", { signal: ctrl.signal });
        if (!ignore) setCountries(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!ignore)
          setError(err?.response?.data?.error || "Failed to load countries.");
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => {
      ignore = true;
      ctrl.abort();
    };
  }, []);

  // Regions list
  const regions = useMemo(() => {
    const s = new Set(countries.map((c) => c.region).filter(Boolean));
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [countries]);

  // Filtered countries by region and query
  const filteredCountries = useMemo(() => {
    if (!region) return [];
    const q = countryQuery.trim().toLowerCase();
    return countries
      .filter((c) => c.region === region)
      .filter((c) => {
        if (!q) return true;
        const name = (c.name || "").toLowerCase();
        const code = (c.code || "").toLowerCase();
        return name.includes(q) || code.includes(q);
      })
      .slice(0, 200);
  }, [countries, region, countryQuery]);

  // Reset when region changes
  useEffect(() => {
    setCountryQuery("");
    setSelected(null);
    setMapLatLng(null);
    setMapErr("");
    setIsFav(false);
    setFavBusy(false);
    setShowNotePrompt(false);
    setNoteText("");
    setFavoriteId(null);
  }, [region]);

  // Reset favorites UI when selected country changes
  useEffect(() => {
    setIsFav(false);
    setFavBusy(false);
    setShowNotePrompt(false);
    setNoteText("");
    setFavoriteId(null);
  }, [selected?.code]);

  // Fill out favorite heart for selected country
  useEffect(() => {
    let ignore = false;
    async function loadFav() {
      if (!selected?.code) return;
      try {
        const { data } = await api.get("/favorites");
        if (ignore || !Array.isArray(data)) return;
        const match = data.find((f) => f.countryCode === selected.code);
        if (match) {
          setIsFav(true);
          setFavoriteId(match._id || null);
          setNoteText(match.note || "");
        }
      } catch {}
    }
    loadFav();
    return () => {
      ignore = true;
    };
  }, [selected?.code]);

  // Load lat/lng via REST Countries
  useEffect(() => {
    let ignore = false;
    const ctrl = new AbortController();
    async function loadLatLng() {
      setMapLatLng(null);
      setMapErr("");
      if (!selected?.code) return;
      try {
        const res = await fetch(
          `https://restcountries.com/v3.1/alpha/${encodeURIComponent(
            selected.code
          )}?fields=latlng,name`,
          { signal: ctrl.signal }
        );
        if (!res.ok) throw new Error("REST Countries lookup failed.");
        const json = await res.json();
        const item = Array.isArray(json) ? json[0] : json;
        const arr = item?.latlng;
        if (
          Array.isArray(arr) &&
          arr.length === 2 &&
          isFinite(arr[0]) &&
          isFinite(arr[1])
        ) {
          if (!ignore)
            setMapLatLng({ lat: Number(arr[0]), lng: Number(arr[1]) });
        } else {
          if (!ignore) setMapErr("No coordinates available for this country.");
        }
      } catch {
        if (!ignore) setMapErr("Could not load map coordinates.");
      }
    }
    loadLatLng();
    return () => {
      ignore = true;
      ctrl.abort();
    };
  }, [selected?.code]);

  function buildOsmEmbedSrc(lat, lng) {
    const delta = 2.0;
    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
    const minLat = clamp(lat - delta, -85, 85);
    const maxLat = clamp(lat + delta, -85, 85);
    const minLng = clamp(lng - delta, -180, 180);
    const maxLng = clamp(lng + delta, -180, 180);
    const bbox = `${minLng},${minLat},${maxLng},${maxLat}`; // lon,lat,lon,lat
    const marker = `${lat},${lng}`;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(
      bbox
    )}&layer=mapnik&marker=${encodeURIComponent(marker)}`;
  }

  // Favorite handlers
  function onHeartClick() {
    if (!selected?.code || favBusy) return;
    if (isFav) unFavorite();
    else setShowNotePrompt(true);
  }

  async function favorite() {
    if (!selected?.code || favBusy) return;
    try {
      setFavBusy(true);
      const payload = {
        countryCode: selected.code,
        label: selected.name || selected.code,
        note: (noteText || "").slice(0, 100),
      };
      const { data } = await api.post("/favorites", payload);
      setIsFav(true);
      setShowNotePrompt(false);
      setFavoriteId(data?._id ?? null);
    } catch (err) {
      alert(err?.response?.data?.error || "Could not add to favorites.");
    } finally {
      setFavBusy(false);
    }
  }

  async function unFavorite() {
    if (favBusy) return;
    try {
      setFavBusy(true);
      if (!favoriteId) throw new Error("Missing favorite _id for deletion.");
      await api.delete(`/favorites/${favoriteId}`);
      setIsFav(false);
      setFavoriteId(null);
      setNoteText("");
      setShowNotePrompt(false);
    } catch (err) {
      alert(
        err?.response?.data?.error ||
          err.message ||
          "Could not remove favorite."
      );
    } finally {
      setFavBusy(false);
    }
  }

  return (
    <div className="home-page">
      <Header />
      <main className="home-main">
        <div className="home-container">
          {loading && <p className="home-loading">Loading countries…</p>}
          {error && !loading && <p className="home-error">{error}</p>}

          {!loading && !error && (
            <div className="home-grid">
              {/* Left rail */}
              <section className="panel left-rail">
                <h2>Find countries</h2>

                <label className="form-label">Region</label>
                <select
                  className="select"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                >
                  <option value="">Select a region…</option>
                  {regions.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>

                <label className="form-label">Country</label>
                <input
                  className="input"
                  type="text"
                  placeholder={
                    region
                      ? "Type to filter countries…"
                      : "Choose a region first"
                  }
                  value={countryQuery}
                  onChange={(e) => setCountryQuery(e.target.value)}
                  disabled={!region}
                />

                {!region ? (
                  <p className="country-meta">
                    Select a region to see countries.
                  </p>
                ) : filteredCountries.length === 0 ? (
                  <p className="country-meta">No matches.</p>
                ) : (
                  <ul className="country-list">
                    {filteredCountries.map((c) => (
                      <li
                        key={c.code}
                        className="country-item"
                        onClick={() => setSelected(c)}
                        title={`${c.name} (${c.code})`}
                      >
                        <div className="country-name">{c.name}</div>
                        <div className="country-meta">
                          {c.code} · {c.region}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Right pane */}
              <section className="panel right-pane">
                {!selected ? (
                  <p className="right-empty">
                    Select a country from the list to see details.
                  </p>
                ) : (
                  <>
                    <div className="detail-head">
                      <div>
                        <h2 className="detail-title">{selected.name}</h2>
                        <p className="detail-sub">
                          {selected.region} · {selected.code}
                        </p>
                      </div>

                      <button
                        className="heart"
                        onClick={onHeartClick}
                        disabled={favBusy}
                        aria-pressed={isFav}
                        title={
                          isFav ? "Remove from favorites" : "Add to favorites"
                        }
                      >
                        <svg
                          width="22"
                          height="22"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            d="M12 21s-6.716-4.528-9.243-7.056C.23 11.417.23 7.983 2.757 5.454c2.122-2.122 5.572-2.122 7.694 0L12 7.003l1.549-1.549c2.122-2.122 5.572-2.122 7.694 0 2.528 2.529 2.528 5.963 0 8.49C18.716 16.472 12 21 12 21z"
                            fill={isFav ? "#e11d48" : "none"}
                            stroke="#e11d48"
                            strokeWidth="1.5"
                          />
                        </svg>
                      </button>
                    </div>

                    {showNotePrompt && (
                      <div className="note-box">
                        <label htmlFor="fav-note" className="form-label">
                          Add a note (optional, max 100 characters)
                        </label>
                        <input
                          id="fav-note"
                          type="text"
                          className="note-input"
                          value={noteText}
                          onChange={(e) =>
                            setNoteText(e.target.value.slice(0, 100))
                          }
                          placeholder="E.g., 'Bucket-list trip' or 'Research visa policy'"
                          maxLength={100}
                        />
                        <div className="note-actions">
                          <span className="note-counter">
                            {100 - (noteText?.length || 0)} characters left
                          </span>
                          <div className="btn-row">
                            <button
                              className="btn"
                              onClick={favorite}
                              disabled={favBusy}
                            >
                              Save Favorite
                            </button>
                            <button
                              className="btn"
                              onClick={() => {
                                setShowNotePrompt(false);
                                setNoteText("");
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="detail-grid">
                      <div>
                        <div className="detail-label">Capital</div>
                        <div>
                          {Array.isArray(selected.capital) &&
                          selected.capital.length
                            ? selected.capital.join(", ")
                            : "—"}
                        </div>
                      </div>
                      <div>
                        <div className="detail-label">Population</div>
                        <div>
                          {selected.population?.toLocaleString?.() ?? "—"}
                        </div>
                      </div>
                      <div>
                        <div className="detail-label">Area (km²)</div>
                        <div>{selected.area?.toLocaleString?.() ?? "—"}</div>
                      </div>
                      <div>
                        <div className="detail-label">Landlocked</div>
                        <div>{selected.landlocked ? "Yes" : "No"}</div>
                      </div>
                      <div style={{ gridColumn: "1 / -1" }}>
                        <div className="detail-label">Languages</div>
                        <div>
                          {selected.languages
                            ? Object.values(selected.languages).join(", ")
                            : "—"}
                        </div>
                      </div>
                      <div style={{ gridColumn: "1 / -1" }}>
                        <div className="detail-label">Currencies</div>
                        <div>
                          {selected.currencies
                            ? Object.values(selected.currencies)
                                .map(
                                  (c) =>
                                    c.name + (c.symbol ? ` (${c.symbol})` : "")
                                )
                                .join(", ")
                            : "—"}
                        </div>
                      </div>
                    </div>

                    <div className="map-frame">
                      {mapLatLng ? (
                        <iframe
                          title={`${selected.name} map`}
                          width="100%"
                          height="100%"
                          style={{ border: 0 }}
                          loading="lazy"
                          src={buildOsmEmbedSrc(mapLatLng.lat, mapLatLng.lng)}
                        />
                      ) : mapErr ? (
                        <div style={{ padding: "1rem", color: "#a00" }}>
                          {mapErr}
                        </div>
                      ) : (
                        <div style={{ padding: "1rem", color: "#666" }}>
                          Loading map…
                        </div>
                      )}
                    </div>
                  </>
                )}
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
