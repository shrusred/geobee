// server/src/routes/countries.routes.js
import express from "express";
import NodeCache from "node-cache";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

//  node-cache (data cached period in seconds; setting to 24 hours as data not expected to change much) ----
const CACHE_TTL_SEC = Number(process.env.CACHE_TTL_SEC || 24 * 60 * 60);
const cache = new NodeCache({ stdTTL: CACHE_TTL_SEC });

async function loadCountries() {
  const cached = cache.get("countries");
  if (cached) return cached;

  const url = `https://restcountries.com/v3.1/all?fields=name,cca3,currencies,capital,region,languages,landlocked,area,population,maps`;

  const resp = await fetch(url);
  if (!resp.ok) {
    console.log("REST Countries fetch failed");
    console.log("URL:", url);
    console.log("Status:", resp.status);
    const text = await resp.text();
    console.log("Response body:", text);
    const err = new Error(`REST Countries error: ${resp.status}`);
    err.status = 502;
    throw err;
  }

  const raw = await resp.json();
  const mapped = raw
    .map((c) => ({
      code: c?.cca3 || "",
      name: c?.name?.common || "",
      capital: c?.capital || [],
      region: c?.region || "",
      languages: c?.languages || {},
      landlocked: Boolean(c?.landlocked),
      area: c?.area ?? null,
      population: c?.population ?? null,
      mapsUrl: c?.maps?.googleMaps || "",
      currencies: c?.currencies || {},
    }))
    .filter((c) => c.code && c.name)
    .sort((a, b) => a.name.localeCompare(b.name));

  cache.set("countries", mapped); // cached for stdTTL seconds
  return mapped;
}

// Protect all routes on here with auth
router.use(requireAuth);

// GET /api/countries
router.get("/countries", async (_req, res, next) => {
  try {
    const countries = await loadCountries();
    res.json(countries);
  } catch (err) {
    next(err);
  }
});

// GET /api/country/:code
router.get("/country/:code", async (req, res, next) => {
  try {
    const code = String(req.params.code || "").toUpperCase();
    if (!/^[A-Z]{3}$/.test(code))
      return res.status(400).json({ error: "Invalid country code" });

    const countries = await loadCountries();
    const country = countries.find((c) => c.code === code);
    if (!country) return res.status(404).json({ error: "Country not found" });

    res.json(country);
  } catch (err) {
    next(err);
  }
});

// GET /api/compare?codes=CAN,USA
router.get("/compare", async (req, res, next) => {
  try {
    const codesParam = String(req.query.codes || "");
    if (!codesParam)
      return res.status(400).json({ error: "Query 'codes' is required" });

    const wanted = [
      ...new Set(codesParam.split(",").map((s) => s.trim().toUpperCase())),
    ].filter((x) => /^[A-Z]{3}$/.test(x));

    if (wanted.length === 0)
      return res.status(400).json({ error: "No valid ISO3 codes provided" });
    if (wanted.length > 5)
      return res.status(400).json({ error: "Too many codes (max 5)" });

    const countries = await loadCountries();
    const byCode = new Map(countries.map((c) => [c.code, c]));

    const results = wanted
      .map((code) => byCode.get(code))
      .filter(Boolean)
      .map((c) => ({
        code: c.code,
        name: c.name,
        region: c.region,
        landlocked: c.landlocked,
        population: c.population,
        area: c.area,
        languagesCount: c.languages ? Object.keys(c.languages).length : 0,
        currencyCodes: c.currencies ? Object.keys(c.currencies) : [],
        populationDensity: c.area ? (c.population ?? 0) / c.area : null,
      }));

    if (results.length === 0)
      return res.status(404).json({ error: "No matching countries found" });
    res.json(results);
  } catch (err) {
    next(err);
  }
});

export default router;
