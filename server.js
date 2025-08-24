import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Spotify backend token cache
let spotifyToken = null;
let spotifyTokenExpiry = 0;

// Replace with your Spotify client credentials
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

async function fetchSpotifyToken() {
  const now = Date.now();
  if (spotifyToken && now < spotifyTokenExpiry) return spotifyToken;

  const creds = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64");

  try {
    const res = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${creds}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: "grant_type=client_credentials"
    });

    if (!res.ok) throw new Error(`Spotify token error: ${res.status}`);
    const data = await res.json();

    spotifyToken = data.access_token;
    spotifyTokenExpiry = now + (data.expires_in - 60) * 1000; // subtract 1 min safety
    return spotifyToken;
  } catch (err) {
    console.error("Error fetching Spotify token:", err);
    return null;
  }
}

// Endpoint for frontend to get Spotify token
app.get("/spotify-token", async (req, res) => {
  const token = await fetchSpotifyToken();
  if (!token) return res.status(500).json({ error: "Failed to fetch token" });
  res.json({ access_token: token, expires_in: 3600 });
});

// Proxy Last.fm requests to avoid CSP/CORS issues
app.get("/lastfm", async (req, res) => {
  const { method, user, limit = 1, period } = req.query;

  const apiKey = process.env.LASTFM_API_KEY;
  if (!method || !user || !apiKey) return res.status(400).json({ error: "Missing parameters" });

  const url = new URL("https://ws.audioscrobbler.com/2.0/");
  url.searchParams.set("method", method);
  url.searchParams.set("user", user);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("format", "json");
  if (limit) url.searchParams.set("limit", limit);
  if (period) url.searchParams.set("period", period);

  try {
    const response = await fetch(url.toString());
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("Last.fm proxy error:", err);
    res.status(500).json({ error: "Failed to fetch Last.fm data" });
  }
});

app.listen(PORT, () => {
  console.log(`Spotify/LastFM backend running on port ${PORT}`);
});
