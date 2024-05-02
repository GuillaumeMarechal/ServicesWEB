const express = require("express");
const app = express();
const port = 8000;
const apiUrl = "https://www.freetogame.com/api/games";
const apiUrlSpecific = "https://www.freetogame.com/api/game";

app.get("/f2p-games", async (req, res) => {
    try {
        const response = await fetch(apiUrl)
        .then((response) => {
            if (response.ok) {
              return response.json();
            }
            throw new Error("Erreur de connexion.");
          })
          .then((data) => {
            console.log(data);
          })
          .catch((error) => {
            console.error("Il y a eu un problème: ", error);
          });
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error("Error fetching free-to-play games:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});