import { useEffect, useMemo, useState } from "react";
import Header from "./Header.jsx";
import "./favorites.css";

/* API base and endpoints */
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
const FAVS_URL = `${API_BASE}/api/favorites`;
const COUNTRIES_URL = `${API_BASE}/api/countries`;

const authHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export default function Favorites() {
  const [favorites, setFavorites] = useState([]);
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // inline edit state
  const [editId, setEditId] = useState(null);
  const [editText, setEditText] = useState("");
  const [busy, setBusy] = useState(false);

  // inline per-card errors (e.g., delete failed)
  const [cardErrors, setCardErrors] = useState({}); // { [favId]: "error msg" }

  // Build code -> name map after countries load
  const codeToName = useMemo(() => {
    const map = new Map();
    for (const c of countries) {
      if (c?.code) map.set(String(c.code).toUpperCase(), c.name || c.code);
    }
    return map;
  }, [countries]);

  // Load all data once: countries then favorites
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        // Fetch countries first (for names)
        const rc = await fetch(COUNTRIES_URL, {
          headers: { ...authHeaders() },
        });
        if (!rc.ok) throw new Error("Failed to load countries");
        const countriesData = await rc.json();
        if (!alive) return;
        setCountries(Array.isArray(countriesData) ? countriesData : []);

        // Fetch favorites
        const rf = await fetch(FAVS_URL, { headers: { ...authHeaders() } });
        if (!rf.ok) throw new Error("Failed to load favorites");
        const favsData = await rf.json();
        if (!alive) return;

        // Sort oldest first (createdAt ascending)
        const sorted = (Array.isArray(favsData) ? favsData : [])
          .slice()
          .sort((a, b) => {
            const ta = new Date(a.createdAt).getTime() || 0;
            const tb = new Date(b.createdAt).getTime() || 0;
            return ta - tb;
          });

        setFavorites(sorted);
      } catch (e) {
        setErr(e.message || "Failed to load data");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  function nameFor(code) {
    if (!code) return "—";
    const key = String(code).toUpperCase();
    return codeToName.get(key) || key;
  }

  function startEdit(fav) {
    setEditId(fav._id);
    setEditText(fav.note || "");
    // clear any prior card error
    setCardErrors((prev) => ({ ...prev, [fav._id]: "" }));
  }

  function cancelEdit() {
    setEditId(null);
    setEditText("");
  }

  const MAX_NOTE = 100;
  const editTooLong = (editText || "").length > MAX_NOTE;
  const currentNoteOf = (id) => favorites.find((f) => f._id === id)?.note || "";
  const editUnchanged = editId ? editText === currentNoteOf(editId) : true;

  async function saveEdit() {
    if (!editId || editTooLong || editUnchanged || busy) return;
    try {
      setBusy(true);
      setCardErrors((p) => ({ ...p, [editId]: "" }));
      const res = await fetch(`${FAVS_URL}/${encodeURIComponent(editId)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({ note: editText }),
      });
      if (!res.ok) throw new Error("Failed to update note");
      const updated = await res.json();
      // Replace in list (wait for server, no optimistic)
      setFavorites((prev) =>
        prev.map((f) => (f._id === updated._id ? updated : f))
      );
      cancelEdit();
    } catch (e) {
      setCardErrors((p) => ({ ...p, [editId]: e.message || "Update failed" }));
    } finally {
      setBusy(false);
    }
  }

  async function deleteFav(id) {
    if (!id || busy) return;
    const confirm = window.confirm("Delete this favorite?");
    if (!confirm) return;
    try {
      setBusy(true);
      setCardErrors((p) => ({ ...p, [id]: "" }));
      const res = await fetch(`${FAVS_URL}/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { ...authHeaders() },
      });
      if (!res.ok) throw new Error("Delete failed");
      // remove from list
      setFavorites((prev) => prev.filter((f) => f._id !== id));
      // clean edit state if it was open on this card
      if (editId === id) cancelEdit();
    } catch (e) {
      setCardErrors((p) => ({ ...p, [id]: e.message || "Delete failed" }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fav-page">
      <Header />

      <div className="favorites-main">
        <div className="fav-header">
          <h1 style={{ margin: 0, fontSize: "1.25rem" }}>Favorites</h1>
        </div>

        {loading && <div className="loading">Loading your favorites…</div>}
        {err && !loading && <div className="error-text">{err}</div>}

        {!loading && !err && favorites.length === 0 && (
          <p className="empty">
            No favorites yet.{" "}
            <a
              href="/home"
              style={{ color: "inherit", textDecoration: "underline" }}
            >
              Add some from the Home page
            </a>
            .
          </p>
        )}

        {!loading && !err && favorites.length > 0 && (
          <section className="favorites-list">
            {favorites.map((fav) => {
              const isEditing = editId === fav._id;
              const cardError = cardErrors[fav._id];

              return (
                <article key={fav._id} className="fav-card">
                  {/* Title row */}
                  <header
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "0.5rem",
                    }}
                  >
                    <div>
                      <h2 className="fav-title">{nameFor(fav.countryCode)}</h2>
                      <div className="fav-code">{fav.countryCode}</div>
                    </div>
                    <button
                      className="btn btn-danger"
                      type="button"
                      onClick={() => deleteFav(fav._id)}
                      disabled={busy}
                      title="Delete favorite"
                    >
                      Delete
                    </button>
                  </header>

                  {/* Note area */}
                  <div>
                    {!isEditing ? (
                      <div className="fav-note">
                        {fav.note ? (
                          fav.note
                        ) : (
                          <span style={{ color: "var(--muted)" }}>No note</span>
                        )}
                      </div>
                    ) : (
                      <div className="fav-edit">
                        <textarea
                          className="fav-input"
                          maxLength={MAX_NOTE}
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                        />
                        <div className="fav-meta">
                          <span>
                            {(editText || "").length}/{MAX_NOTE}
                            {editTooLong ? " (too long)" : ""}
                          </span>
                          <div className="fav-actions">
                            <button
                              className="btn"
                              type="button"
                              onClick={cancelEdit}
                              disabled={busy}
                            >
                              Cancel
                            </button>
                            <button
                              className="btn btn-primary"
                              type="button"
                              onClick={saveEdit}
                              disabled={busy || editUnchanged || editTooLong}
                              title={
                                editTooLong
                                  ? "Note exceeds 100 characters"
                                  : editUnchanged
                                  ? "No changes to save"
                                  : "Save"
                              }
                            >
                              Save
                            </button>
                          </div>
                        </div>
                        {cardError ? (
                          <div className="error-text">{cardError}</div>
                        ) : null}
                      </div>
                    )}
                  </div>

                  {/* Actions row when not editing */}
                  {!isEditing && (
                    <div className="fav-actions">
                      <button
                        className="btn"
                        type="button"
                        onClick={() => startEdit(fav)}
                        disabled={busy}
                      >
                        Edit Note
                      </button>
                    </div>
                  )}

                  {/* Inline error for delete or general card errors */}
                  {!isEditing && cardError ? (
                    <div className="error-text">{cardError}</div>
                  ) : null}
                </article>
              );
            })}
          </section>
        )}
      </div>
    </div>
  );
}
