const express = require("express");
const postgres = require("postgres");
const z = require("zod");

const app = express();
const port = 8000;
var sql;
sql = postgres({ db: "mydb", user: "user", password: "password"});

app.use(express.json());

const ProductSchema = z.object({
    id: z.string(),
    name: z.string(),
    about: z.string(),
    price: z.number().positive(),
});
const CreateProductSchema = ProductSchema.omit({id: true});

app.post("/products", async(req, res)=>{
const result = await CreateProductSchema.safeParse(req.body);
if (result.success){
    const {name, about, price} = result.data;

    const product = await sql `INSERT INTO products (name, about, price) VALUES (${name},${about},${price}) RETURNING *`;

    res.send(product[0]);
}else{
    res.status(400).send(result);
}

});

app.get("/", (req, res)=>{
    res.send("Hello WORLD !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");

});

app.get("/products", async (req, res) => {
    const products = await sql`SELECT * FROM products`;

    res.send(products);
});

app.get("/products/:id", async (req, res) => {
    const product = await sql`SELECT * FROM products WHERE id=${req.params.id}`;

    if (product.length > 0) {
        res.send(product[0]);
    } else {
        res.status(404).send({message: "Not found"});
    }
})

app.delete("/products/:id", async(req, res)=> {
    const product = await sql`DELETE FROM products Where id=${req.params.id}`;

    if (product.length > 0) {
        res.send(product[0]);
    } else {
        res.status(404).send({message: "Not found"});
    }
})

app.get("/products", async (req, res) => {
    const { name, about, price } = req.query;
  
    let conditions = [];
    let values = [];
  
    if (name) {
      conditions.push("name = $" + (conditions.length + 1));
      values.push(name);
    }
    if (about) {
      conditions.push("about = $" + (conditions.length + 1));
      values.push(about);
    }
    if (price) {
      conditions.push("price = $" + (conditions.length + 1));
      values.push(parseFloat(price));
    }
  
    const sqlQuery = `
        SELECT * FROM products
        ${conditions.length ? "WHERE " + conditions.join(" AND ") : ""}
      `;
  
    try {
      const products = await sql.unsafe(sqlQuery, values);
      res.json(products);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error accessing the database", error: error.message });
    }
  });
  

app.listen(port, ()=> {
    console.log(`Listening on http://localhost:${port}`);
});