const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;
const stripe = require("stripe")(process.env.STRIPE_KEY);

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

        // payment stripe code

        app.post("/create-payment-intent", async (req, res) => {
            const price = req.body.price;
            const amount = price * 100;

            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                payment_method_types: ["card"],
            });

            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        });

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

        // update a specific item data after a order to database

        app.put("/item/:id", async (req, res) => {
            const id = req.params.id;
            const item = req.body.updateItem;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };

            const update = {
                $set: item,
            };

            const result = await productsCollection.updateOne(
                filter,
                update,
                options
            );

            res.send(result);
        });

        // get orders item from database

        app.get("/orders", async (req, res) => {
            const email = req.query.email;
            const query = { email };
            const cursor = ordersCollection.find(query);

            const result = await cursor.toArray();

            res.send(result);
        });

        // delete a specific order item from database

        app.delete("/order/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };

            const result = await ordersCollection.deleteOne(query);

            res.send(result);
        });

        // get specific order item data from database

        app.get("/order/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };

            const result = await ordersCollection.findOne(query);

            res.send(result);
        });

        // update a specific order item data after a order to database

        app.put("/order/:id", async (req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };

            const update = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId,
                },
            };

            const result = await ordersCollection.updateOne(
                filter,
                update,
                options
            );

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
