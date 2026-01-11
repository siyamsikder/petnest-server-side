const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require("dotenv").config()
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());


const uri = `mongodb+srv://${process.env.DB_USERNAM}:${process.env.DB_PASSWORD}@cluster0.k80acns.mongodb.net/?appName=Cluster0`;

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
    // await client.connect();

    // Database & Collections
    const db = client.db('pawMartDB');
    const listingsCollection = db.collection('listings');
    const categoriesCollection = db.collection('categories');
    const ordersCollection = db.collection('orders');
    const usersCollection = db.collection('users');

    // --- JWT API ---
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
      res.send({ token });
    });

    // --- Middlewares ---
    const verifyToken = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorized access' });
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'unauthorized access' });
        }
        req.decoded = decoded;
        next();
      });
    };

    // use verify admin after verifyToken
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const isAdmin = user?.role === 'admin';
      if (!isAdmin) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      next();
    };

    // --- Listings API ---
    app.get('/listings', async (req, res) => {
      const email = req.query.email;
      const limit = parseInt(req.query.limit) || 0;
      const query = email ? { email } : {};
      let cursor = listingsCollection.find(query).sort({ created_at: -1, _id: -1 });
      if (limit > 0) {
        cursor = cursor.limit(limit);
      }
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get('/listings/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await listingsCollection.findOne(query);
      res.send(result);
    });

    app.post('/listings', async (req, res) => {
      const newListing = { ...req.body, created_at: new Date() };
      const result = await listingsCollection.insertOne(newListing);
      res.send(result);
    });

    app.delete("/listings/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await listingsCollection.deleteOne(query);
      res.send({ success: result.deletedCount === 1, message: result.deletedCount === 1 ? "Listing deleted successfully" : "Failed to delete" });
    });

    // --- Categories API ---
    app.get('/categories', async (req, res) => {
      const result = await categoriesCollection.find().toArray();
      res.send(result);
    });

    app.get('/category-filtered-product/:categoryName', async (req, res) => {
      const categoryName = decodeURIComponent(req.params.categoryName);
      const result = await listingsCollection.find({ category: categoryName }).sort({ created_at: -1, _id: -1 }).toArray();
      res.send(result);
    });

    // --- Orders API ---
    app.get('/orders', verifyToken, async (req, res) => {
      const email = req.query.email;
      const decodedEmail = req.decoded.email;

      // If email is provided, verify it matches decoded email (unless admin)
      if (email && email !== decodedEmail) {
        // Only admin can see other users' orders
        const user = await usersCollection.findOne({ email: decodedEmail });
        if (user?.role !== 'admin') {
          return res.status(403).send({ message: 'forbidden access' });
        }
      }

      // If no email provided, only admin can see all orders
      if (!email) {
        const user = await usersCollection.findOne({ email: decodedEmail });
        if (user?.role !== 'admin') {
          return res.status(403).send({ message: 'forbidden access' });
        }
      }

      const query = email ? { email } : {};
      const result = await ordersCollection.find(query).sort({ created_at: -1 }).toArray();
      res.send(result);
    });

    app.post('/orders', async (req, res) => {
      const newOrder = req.body;
      const result = await ordersCollection.insertOne(newOrder);
      res.send(result);
    });

    // --- Users API ---
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);

      if (existingUser) {
        return res.send({ message: "User already exists", insertedId: null });
      }

      const role = user.email === "siyam0sikder@gmail.com" ? "admin" : "user";
      const result = await usersCollection.insertOne({
        ...user,
        role: role,
        status: "Active",
        joined: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        createdAt: new Date(),
      });

      res.send(result);
    });
    app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.get('/users/:email', async (req, res) => {
      const email = req.params.email;
      const result = await usersCollection.findOne({ email });
      res.send(result);
    });

    app.patch('/users/:email', async (req, res) => {
      const email = req.params.email;
      const updatedUser = req.body;
      const result = await usersCollection.updateOne({ email }, { $set: updatedUser });
      res.send(result);
    });

    // --- Admin Stats ---
    app.get('/admin-stats', verifyToken, verifyAdmin, async (req, res) => {
      const totalUsers = await usersCollection.estimatedDocumentCount();
      const totalPets = await listingsCollection.estimatedDocumentCount();
      const totalOrders = await ordersCollection.estimatedDocumentCount();

      // Category breakdown for Pie Chart
      const categoryData = await listingsCollection.aggregate([
        { $group: { _id: "$category", count: { $sum: 1 } } }
      ]).toArray();

      // Monthly adoption/listing trends for Bar Chart (last 6 months)
      // Since we don't have many orders, let's use listings added per month
      const trendsData = await listingsCollection.aggregate([
        {
          $group: {
            _id: { $month: "$createdAt" },
            count: { $sum: 1 }
          }
        },
        { $sort: { "_id": 1 } }
      ]).toArray();

      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const formattedTrends = trendsData.map(item => ({
        name: monthNames[item._id - 1] || "Unknown",
        listings: item.count
      }));

      res.send({
        totalUsers,
        totalPets,
        totalOrders,
        growth: "+15%",
        categoryData: categoryData.map(c => ({ name: c._id, value: c.count })),
        trendsData: formattedTrends
      });
    });


    // MongoDB Ping Test
    // await client.db("admin").command({ ping: 1 });
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
