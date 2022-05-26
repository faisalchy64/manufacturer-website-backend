const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.USER_PASS}@comparts-manufacturer-w.zoeip.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverApi: ServerApiVersion.v1,
});

app.get("/", (req, res) => {
    res.send("Comparts Server Side.");
});

async function run() {
    try {
        await client.connect();
        const productsCollection = client.db("comparts").collection("products");
        const ordersCollection = client.db("comparts").collection("orders");

        // get items data from database

        app.get("/items", async (req, res) => {
            const query = {};
            const cursor = productsCollection.find(query);

            const result = await cursor.toArray();

            res.send(result);
        });

        // get specific data from database

        app.get("/item/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };

            const result = await productsCollection.findOne(query);

            res.send(result);
        });

        // post a specific order to database

        app.post("/order", async (req, res) => {
            const order = req.body;

            const result = await ordersCollection.insertOne(order);

            res.send(result);
        });
    } finally {
        // await client.close();
    }
}

run().catch(console.dir);

app.listen(port, () => {
    console.log(`Listening to port ${port}`);
});
