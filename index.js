const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const jwt = require("jsonwebtoken");
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

function verifyJWT(req, res, next) {
    const authorized = req.headers.authorization;
    if (!authorized) {
        return res.status(401).send({ message: "unauthorized access" });
    }

    const token = authorized.split(" ")[1];

    jwt.verify(token, process.env.JWT_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: "forbidden access" });
        }

        req.decoded = decoded;
        next();
    });
}

app.get("/", (req, res) => {
    res.send("Comparts Server Side.");
});

async function run() {
    try {
        await client.connect();
        const usersCollection = client.db("comparts").collection("users");
        const productsCollection = client.db("comparts").collection("products");
        const ordersCollection = client.db("comparts").collection("orders");
        const reviewsCollection = client.db("comparts").collection("reviews");

        // update users to database

        app.put("/user/:email", async (req, res) => {
            const user = req.body;
            const email = req.params.email;
            const filter = { email };
            const options = { upsert: true };

            const update = { $set: user };

            const result = await usersCollection.updateOne(
                filter,
                update,
                options
            );

            const token = jwt.sign({ email }, process.env.JWT_TOKEN, {
                expiresIn: "1h",
            });

            res.send({ result, token });
        });

        // update or add user information

        app.put("/userinfo/:email", async (req, res) => {
            const user = req.body;
            const email = req.params.email;
            const filter = { email };
            const options = { upsert: true };

            const update = { $set: user };

            const result = await usersCollection.updateOne(
                filter,
                update,
                options
            );

            res.send(result);
        });

        // make a admin

        // app.put("/user/admin/:email", verifyJWT, async (req, res) => {
        //     const email = req.params.email;
        //     const requester = req.decoded.email;

        //     const account = await usersCollection.findOne({ email: requester });

        //     if (account.role === "admin") {
        //         const filter = { email };
        //         const update = { $set: { role: "admin" } };

        //         const result = await usersCollection.updateOne(filter, update);

        //         res.send(result);
        //     } else {
        //         return res.status(403).send({ message: "forbidden access" });
        //     }
        // });

        app.put("/user/admin/:email", async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const admin = await usersCollection.findOne({ email: user.email });

            if (admin?.role === "admin") {
                const filter = { email };
                const update = { $set: { role: "admin" } };

                const result = await usersCollection.updateOne(filter, update);

                res.send(result);
            } else {
                return res.status(403).send({ message: "forbidden access" });
            }
        });

        // admin access

        app.get("/admin/:email", async (req, res) => {
            const email = req.params.email;
            const user = await usersCollection.findOne({ email });

            const admin = user?.role === "admin";

            res.send({ admin });
        });

        // payment stripe code

        app.post("/create-payment-intent", async (req, res) => {
            const price = req.body.price;
            const amount = price * 100;
            if (typeof price === "number") {
                const paymentIntent = await stripe.paymentIntents.create({
                    amount: amount,
                    currency: "usd",
                    payment_method_types: ["card"],
                });

                res.send({
                    clientSecret: paymentIntent.client_secret,
                });
            }
        });

        // get items data from database

        app.get("/items", async (req, res) => {
            const query = {};
            const cursor = productsCollection.find(query);

            const result = await cursor.toArray();

            res.send(result);
        });

        // post a item to database

        app.post("/item", async (req, res) => {
            const item = req.body;
            console.log(item);
            const result = await productsCollection.insertOne(item);

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

        app.get("/orders", verifyJWT, async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;
            if (email === decodedEmail) {
                const query = { email };
                const cursor = ordersCollection.find(query);

                const result = await cursor.toArray();

                return res.send(result);
            } else {
                return res.status(403).send({ message: "forbidden access" });
            }
        });

        // all users order from database

        app.get("/allorders", async (req, res) => {
            const query = {};
            const cursor = ordersCollection.find(query);

            const result = await cursor.toArray();

            res.send(result);
        });

        // get all users from database

        app.get("/users", verifyJWT, async (req, res) => {
            const query = {};
            const cursor = usersCollection.find(query);

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

        // delete a specific item data from database

        app.delete("/item/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };

            const result = await productsCollection.deleteOne(query);

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

        // add user review to database

        app.post("/review", async (req, res) => {
            const review = req.body;

            const result = await reviewsCollection.insertOne(review);

            res.send(result);
        });

        // get add reviews from database

        app.get("/reviews", async (req, res) => {
            const query = {};
            const cursor = reviewsCollection.find(query);

            const result = await cursor.toArray();

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
