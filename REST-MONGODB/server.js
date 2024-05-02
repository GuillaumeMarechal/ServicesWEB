const { MongoClient, ObjectId } = require("mongodb");
const express = require("express");
const { z } = require("zod");
const { createServer } = require('node:http');
const { join } = require('node:path');
const { Server } = require('socket.io');

const app = express();
const server = createServer(app);
const io = new Server(server);
const port = 8000;
const client = new MongoClient("mongodb://localhost:27017");
let db;

app.use(express.json());

const ProductSchema = z.object({
    _id: z.string(),
    name: z.string(),
    about: z.string(),
    price: z.number().positive(),
    categoryIds: z.array(z.string())
});

const CreateProductSchema = ProductSchema.omit({ _id: true });
const CategorySchema = z.object({
    _id: z.string(),
    name: z.string(),
});

const CreateCategorySchema = CategorySchema.omit({ _id: true });

client.connect().then(() => {
    db = client.db("myDB");
    server.listen(port, () => {
        console.log(`Listening on http://localhost:${port}`);
    });
});

app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'index.html'));
  });

io.on('connection', (socket) => {
  socket.on('chat message', (msg) => {
    io.emit('chat message', msg);
  });
});

app.post("/categories", async (req, res) => {
    const result = await CreateCategorySchema.safeParse(req.body);
    if (result.success) {
        const { name } = result.data;
        const ack = await db.collection("categories").insertOne({ name });
        res.send({
            _id: ack.insertedId,
            name,
        });
    } else {
        res.status(400).send(result);
    }
});

app.post("/products", async (req, res) => {
    const result = await CreateProductSchema.safeParse(req.body);
    if (result.success) {
        const { name, about, price, categoryIds } = result.data;
        const categoryObjectIds = categoryIds.map((id) => new ObjectId(id));
        const ack = await db.collection("products").insertOne({ name, about, price, categoryIds: categoryObjectIds });
        res.send({
            _id: ack.insertedId,
            name,
            about,
            price,
            categoryIds: categoryObjectIds,
        });
    } else {
        res.status(400).send(result);
    }
});

app.get("/products", async (req, res) => {
    const result = await db.collection("products").aggregate([
        { $match: {} },
        {
            $lookup: {
                from: "categories",
                localField: "categoryIds",
                foreignField: "_id",
                as: "categories",
            },
        },
    ]).toArray();
    res.send(result);
});

app.delete("/products/:id", async (req, res) => {
    const productId = req.params.id;
    try {
        const deletedProduct = await db.collection("products").findOneAndDelete({ _id: new ObjectId(productId) });
        if (deletedProduct.value) {
            res.send("Product deleted successfully");
        } else {
            res.status(404).send("Product not found");
        }
    } catch (error) {
        console.error("Error deleting product:", error);
        res.status(500).send("Internal server error");
    }
});

app.put("/products/:id", async (req, res) => {
    const productId = req.params.id;
    const result = await ProductSchema.safeParse(req.body);
    if (result.success) {
        const { name, about, price, categoryIds } = result.data;
        const categoryObjectIds = categoryIds.map((id) => new ObjectId(id));
        try {
            const updatedProduct = await db.collection("products").findOneAndUpdate(
                { _id: new ObjectId(productId) },
                { $set: { name, about, price, categoryIds: categoryObjectIds } },
                { returnDocument: 'after' }
            );
            if (updatedProduct.value) {
                res.send(updatedProduct.value);
            } else {
                res.status(404).send("Product not found");
            }
        } catch (error) {
            console.error("Error updating product:", error);
            res.status(500).send("Internal server error");
        }
    } else {
        res.status(400).send(result);
    }
});

app.get("/products/:id", async (req, res) => {
    const productId = req.params.id;
    try {
        const product = await db.collection("products").findOne({ _id: new ObjectId(productId) });
        if (product) {
            res.send(product);
        } else {
            res.status(404).send("Product not found");
        }
    } catch (error) {
        console.error("Error fetching product:", error);
        res.status(500).send("Internal server error");
    }
});