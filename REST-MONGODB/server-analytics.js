const { MongoClient, ObjectId } = require("mongodb");
const express = require("express");
const { z } = require("zod");
const { createServer } = require('node:http');
const { join } = require('node:path');

const app = express();
const server = createServer(app);
const port = 8000;
const client = new MongoClient("mongodb://localhost:27017");
let db;

app.use(express.json());

// Définition des schémas pour les ressources
const ViewSchema = z.object({
    source: z.string(),
    url: z.string(),
    visitor: z.string(),
    createdAt: z.date(),
    meta: z.object(),
});

const ActionSchema = z.object({
    source: z.string(),
    url: z.string(),
    action: z.string(),
    visitor: z.string(),
    createdAt: z.date(),
    meta: z.object(),
});

const GoalSchema = z.object({
    source: z.string(),
    url: z.string(),
    goal: z.string(),
    visitor: z.string(),
    createdAt: z.date(),
    meta: z.object(),
});

client.connect().then(() => {
    db = client.db("analyticsDB");
    server.listen(port, () => {
        console.log(`Listening on http://localhost:${port}`);
    });
});

// Routes pour les différentes ressources

// Route pour les vues
app.post("/views", async (req, res) => {
    const result = await ViewSchema.safeParse(req.body);
    if (result.success) {
        const viewData = result.data;
        const ack = await db.collection("views").insertOne(viewData);
        res.send({
            _id: ack.insertedId,
            ...viewData,
        });
    } else {
        res.status(400).send(result.error);
    }
});

// Route pour les actions
app.post("/actions", async (req, res) => {
    const result = await ActionSchema.safeParse(req.body);
    if (result.success) {
        const actionData = result.data;
        const ack = await db.collection("actions").insertOne(actionData);
        res.send({
            _id: ack.insertedId,
            ...actionData,
        });
    } else {
        res.status(400).send(result.error);
    }
});

// Route pour les objectifs
app.post("/goals", async (req, res) => {
    const result = await GoalSchema.safeParse(req.body);
    if (result.success) {
        const goalData = result.data;
        const ack = await db.collection("goals").insertOne(goalData);
        res.send({
            _id: ack.insertedId,
            ...goalData,
        });
    } else {
        res.status(400).send(result.error);
    }
});

// Route pour récupérer un goal avec les détails des vues et actions associées
app.get("/goals/:goalId/details", async (req, res) => {
    const goalId = req.params.goalId;
    try {
        // Chercher le goal spécifique
        const goal = await db.collection("goals").findOne({ _id: new ObjectId(goalId) });

        if (!goal) {
            return res.status(404).send("Goal not found");
        }

        // Agrégation pour récupérer les vues associées à ce goal
        const views = await db.collection("views").aggregate([
            { $match: { goal: goal.goal } },
            { $lookup: { from: "actions", localField: "visitor", foreignField: "visitor", as: "actions" } }
        ]).toArray();

        // Retourner les détails du goal avec les vues et actions associées
        res.send({ goal, views });
    } catch (error) {
        console.error("Error fetching goal details:", error);
        res.status(500).send("Internal server error");
    }
});
