# 🐾 PetNest — Server Side (Node + Express + MongoDB)

PetNest Server handles all backend operations such as listings, orders, authentication validation, and database communication.
This backend API supports the PetNest client application.

---

## 🚀 Live API (If Deployed)

```
https://your-server-url.vercel.app
```

*(Update this link after deployment)*

---

## 📌 Features

* RESTful API built with **Node.js + Express**
* **MongoDB** (Mongoose) for managing data
* CRUD operations for **Listings**
* CRUD operations for **Orders**
* Secure environment variables with `.env`
* CORS enabled for client communication
* Firebase Admin optional for token verification
* Well-structured routes & modular code

---

## 🗂️ API Endpoints

### 🔶 **Listings**

| Method | Endpoint        | Description          |
| ------ | --------------- | -------------------- |
| GET    | `/listings`     | Get all listings     |
| GET    | `/listings/:id` | Get a single listing |
| POST   | `/listings`     | Create a new listing |
| PATCH  | `/listings/:id` | Update a listing     |
| DELETE | `/listings/:id` | Delete a listing     |

---

### 🔷 **Orders**

| Method | Endpoint         | Description                    |
| ------ | ---------------- | ------------------------------ |
| POST   | `/orders`        | Create a new order             |
| GET    | `/orders`        | Get all orders                 |
| GET    | `/orders/:email` | Get orders for a specific user |

---

## 🔐 Environment Variables (.env)

You must create a `.env` file in the root of the server project.

```
PORT=5000
MONGO_URI=your_mongo_connection_string
JWT_SECRET=your_secret_key
```

If you use Firebase Admin SDK:

```
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account", ... }
```

---

## 🛠️ Tech Stack

* Node.js
* Express.js
* MongoDB + Mongoose
* dotenv
* cors
* Firebase Admin SDK (optional)
* Vercel / Render for hosting

---

## ▶️ Run Locally

### 1️⃣ Install Dependencies

```
npm install
```

### 2️⃣ Create `.env` file

Add the variables from above.

### 3️⃣ Start Development Server

```
npm run dev
```

### 4️⃣ Start Production Server

```
npm start
```

---

## 📁 Project Structure

```
petnest-server-side/
│
├── index.js
├── routes/
│   ├── listings.js
│   ├── orders.js
│
├── controllers/
├── models/
├── package.json
└── .env
```

---

## 🔗 Related Links

**Client Live Site:** [https://petnest-d457a1.netlify.app/](https://petnest-d457a1.netlify.app/)
**Client Repository:** [https://github.com/siyamsikder/petnest-client-side](https://github.com/siyamsikder/petnest-client-side)
**Server Repository:** [https://github.com/siyamsikder/petnest-server-side](https://github.com/siyamsikder/petnest-server-side)

---

## 👨‍💻 Developer

**Siyam Sikder**
Email: `siyam0sikder@gmail.com`
GitHub: [https://github.com/siyamsikder](https://github.com/siyamsikder)

---

## 📄 License

This project is licensed under the **MIT License**.
