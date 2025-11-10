const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

// MongoDB Credentials
// username: pawMart-db
// password: 2wXZ7THY1nMgsNYC

const uri = "mongodb+srv://pawMart-db:2wXZ7THY1nMgsNYC@cluster0.k80acns.mongodb.net/?appName=Cluster0";

// MongoDB Client setup
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    // Database & Collections
    const db = client.db('pawMartDB');
    const listingsCollection = db.collection('listings');
    const categoriesCollection = db.collection('categories');

    // Get latest data
    app.get('/listings', async (req, res) => {
      try {
        const cursor = listingsCollection.find().sort({ created_at: -1 }).limit(6);
        const result = await cursor.toArray();
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: 'Failed to fetch listings' });
      }
    });

    //Get all categories
    app.get('/categories', async (req, res) => {
      try {
        const cursor = categoriesCollection.find();
        const result = await cursor.toArray();
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: 'Failed to fetch categories' });
      }
    });

    // MongoDB Ping Test
    await client.db("admin").command({ ping: 1 });
    console.log("✅ Pinged your deployment. Successfully connected to MongoDB!");
  } catch (error) {
    console.error("❌ Connection failed:", error);
  }
}

run().catch(console.dir);

// Root Route
app.get('/', (req, res) => {
  res.send('Hello from PawMart Server 🐾');
});

// Start Server
app.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
});
