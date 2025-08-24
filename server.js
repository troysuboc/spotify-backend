import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());

const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

app.get("/spotify-token", async (req, res) => {
  try {
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${auth}`
      },
      body: "grant_type=client_credentials"
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("Error fetching token:", err);
    res.status(500).json({ error: "Failed to fetch token" });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`✅ Server running on ${port}`));
