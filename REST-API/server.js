const express = require("express");
const postgres = require("postgres");
const z = require("zod");


const app = express();
const port = 8000;
var sql;
sql = postgres({ db: "mydb", user: "user", password: "password"});

app.use(express.json());

const UserSchema = z.object({
    id: z.string(),
    name: z.string(),
    password: z.string(),
    mail: z.string(),
});
const CreateUserSchema = UserSchema.omit({id: true});

app.post("/users", async(req, res)=>{

const result = await CreateUserSchema.safeParse(req.body);

if (result.success){
    var bcrypt = require('bcryptjs');
    var salt = bcrypt.genSaltSync(10);
    var hash = bcrypt.hashSync(result.data.password, salt);
    const {name, mail} = result.data;
    const User = await sql `INSERT INTO users (name, password, mail) VALUES (${name},${hash},${mail}) RETURNING name, mail`;
    res.send(User[0]);

   
}else{
    res.status(400).send(result);
}

});

app.get("/", (req, res)=>{
    res.send("Hello WORLD !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");

});

app.get("/users", async (req, res) => {
    const users = await sql`SELECT id ,name, mail FROM users`;

    res.send(users);
});

app.get("/users/:id", async (req, res) => {
    const User = await sql`SELECT id , name, mail FROM users WHERE id=${req.params.id}`;

    if (User.length > 0) {
        res.send(User[0]);
    } else {
        res.status(404).send({message: "Not found"});
    }
})

app.delete("/users/:id", async(req, res)=> {
    const User = await sql`DELETE FROM users Where id=${req.params.id} Returning id, name,mail`;

    if (User.length > 0) {
        res.send(User[0]);
    } else {
        res.status(404).send({message: "Not found"});
    }
})

app.put("/users/:id", async(req, res)=>{

    const result = await CreateUserSchema.safeParse(req.body);
    if (result.success){
    var bcrypt = require('bcryptjs');
    var salt = bcrypt.genSaltSync(10);
    var hash = bcrypt.hashSync(result.data.password, salt);
    
    const {name, mail} = result.data;
    const User = await sql`UPDATE users SET name = ${name}, password = ${hash},mail = ${mail}  Where id=${req.params.id} Returning Name, Mail`;

    if (User.length > 0) {
        res.send(User[0]);
    } else {
        res.status(404).send({message: "Not found"});
    }}
})
app.patch("/users/:id", async(req, res)=>{

    const { name, password, mail } = req.body;

    // Vérifiez s'il y a au moins un champ à mettre à jour
    if (!name && !password && !mail) {
        return res.status(400).send({ message: "At least one field (name, password, mail) must be provided for update." });
    }

    // Récupérez l'utilisateur existant
    const existingUser = await sql`SELECT * FROM users WHERE id = ${req.params.id}`;

    if (existingUser.length === 0) {
        return res.status(404).send({ message: "User not found" });
    }

    // Modifiez uniquement les champs spécifiés
    const updatedFields = {};
    if (name) updatedFields.name = name;
    if (password) {
        const bcrypt = require('bcryptjs');
        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(password, salt);
        updatedFields.password = hash;
    }
    if (mail) updatedFields.mail = mail;

    // Mettez à jour l'utilisateur dans la base de données
    const updatedUser = await sql`UPDATE users SET ${sql(updatedFields)} WHERE id = ${req.params.id} RETURNING id, name, mail`;

    if (updatedUser.length > 0) {
        res.send(updatedUser[0]);
    } else {
        res.status(500).send({ message: "Failed to update user" });
    }
})
app.listen(port, ()=> {
    console.log(`Listening on http://localhost:${port}`);
});