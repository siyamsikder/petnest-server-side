const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());

// MongoDB URI
const dbUser = process.env.DB_USER || process.env.DB_USERNAM;
const dbPass = process.env.DB_PASSWORD;

console.log("--- Server Startup Diagnostics ---");
console.log("DB_USER/DB_USERNAM:", dbUser ? "✅ Present" : "❌ MISSING");
console.log("DB_PASSWORD:", dbPass ? "✅ Present" : "❌ MISSING");
console.log("ACCESS_TOKEN_SECRET:", process.env.ACCESS_TOKEN_SECRET ? "✅ Present" : "❌ MISSING");

if (!dbUser || !dbPass) {
  console.error("❌ CRITICAL: Database credentials are missing in .env file.");
  console.error("Please ensure you have DB_USER (or DB_USERNAM) and DB_PASSWORD defined.");
}

if (dbPass && /[@:]/.test(dbPass)) {
  console.warn("⚠️ WARNING: Your DB_PASSWORD contains '@' or ':'. If not URL encoded, this causes 'bad auth'.");
  console.warn("   Example: Replace '@' with '%40', ':' with '%3A'.");
}

const uri = `mongodb+srv://${dbUser}:${dbPass}@cluster0.k80acns.mongodb.net/?appName=Cluster0`;

// MongoDB Client & Collections (Defined synchronously to ensure routes exist)
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const db = client.db('pawMartDB');
const listingsCollection = db.collection('listings');
const categoriesCollection = db.collection('categories');
const ordersCollection = db.collection('orders');
const usersCollection = db.collection('users');

// --- Middleware Definitions ---

// Verify Token Middleware
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

// Verify Admin Middleware (Must be used after verifyToken)
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

// --- Routes ---

app.get('/', (req, res) => {
  res.send('Hello from PawMart Server 🐾');
});

// JWT API
app.post('/jwt', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    const user = await usersCollection.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!process.env.ACCESS_TOKEN_SECRET) {
      console.error("ACCESS_TOKEN_SECRET is missing in .env");
      return res.status(500).json({ message: "Server configuration error" });
    }

    const token = jwt.sign(
      { email: user.email, role: user.role },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ token });
  } catch (err) {
    console.error('JWT creation error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Listings API
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

// Categories API
app.get('/categories', async (req, res) => {
  const result = await categoriesCollection.find().toArray();
  res.send(result);
});

app.get('/category-filtered-product/:categoryName', async (req, res) => {
  const categoryName = decodeURIComponent(req.params.categoryName);
  const result = await listingsCollection.find({ category: categoryName }).sort({ created_at: -1, _id: -1 }).toArray();
  res.send(result);
});

// Orders API
app.get('/orders', verifyToken, async (req, res) => {
  const email = req.query.email;
  const decodedEmail = req.decoded.email;

  // If email is provided, verify it matches decoded email (unless admin)
  if (email && email !== decodedEmail) {
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

// Users API
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

app.get('/users/role/:email', verifyToken, async (req, res) => {
  const email = req.params.email;
  if (email !== req.decoded.email) {
    return res.status(403).send({ message: 'forbidden access' });
  }
  const user = await usersCollection.findOne({ email });
  res.send({ role: user?.role || 'user' });
});

app.patch('/users/:email', async (req, res) => {
  const email = req.params.email;
  const updatedUser = req.body;
  const result = await usersCollection.updateOne({ email }, { $set: updatedUser });
  res.send(result);
});

// Admin Stats
app.get('/admin-stats', verifyToken, verifyAdmin, async (req, res) => {
  const totalUsers = await usersCollection.estimatedDocumentCount();
  const totalPets = await listingsCollection.estimatedDocumentCount();
  const totalOrders = await ordersCollection.estimatedDocumentCount();

  const categoryData = await listingsCollection.aggregate([
    { $group: { _id: "$category", count: { $sum: 1 } } }
  ]).toArray();

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

app.get('/user-stats/:email', verifyToken, async (req, res) => {
  const email = req.params.email;
  if (email !== req.decoded.email) {
    return res.status(403).send({ message: 'forbidden access' });
  }

  const totalListings = await listingsCollection.countDocuments({ email });
  const totalOrders = await ordersCollection.countDocuments({ email });

  res.send({ totalListings, totalOrders });
});

// Database Connection & Server Start
async function run() {
  try {
    await client.connect();
    console.log("✅ Pinged your deployment. Successfully connected to MongoDB!");
  } catch (error) {
    console.error("❌ Connection failed:", error);
  }
}

// Start connection asynchronously but listen immediately
run().catch(console.dir);

app.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
});
