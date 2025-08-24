// server.js
import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

// Optional: allow your Neocities domain
app.use(cors({ origin: "*" }));

const LASTFM_KEY = process.env.LASTFM_KEY;
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

// -------------------
// Spotify Token Endpoint
// -------------------
let spotifyToken = null;
let spotifyTokenExpiry = 0;

async function getSpotifyToken() {
  const now = Date.now();
  if (spotifyToken && now < spotifyTokenExpiry) return spotifyToken;

  const resp = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Authorization": "Basic " + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });
  const data = await resp.json();
  spotifyToken = data.access_token;
  spotifyTokenExpiry = now + (data.expires_in - 60) * 1000;
  return spotifyToken;
}

app.get("/spotify/artist", async (req, res) => {
  const name = req.query.name;
  if (!name) return res.status(400).json({ error: "Missing name" });

  try {
    const token = await getSpotifyToken();
    const resp = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(name)}&type=artist&limit=1`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await resp.json();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Spotify fetch failed" });
  }
});

// -------------------
// Last.fm Proxy Endpoint
// -------------------
app.get("/lastfm/:method", async (req, res) => {
  const method = req.params.method;
  const username = req.query.user;
  const limit = req.query.limit || 5;
  try {
    const url = `https://ws.audioscrobbler.com/2.0/?method=${method}&user=${username}&api_key=${LASTFM_KEY}&format=json&limit=${limit}`;
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Last.fm fetch failed" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
