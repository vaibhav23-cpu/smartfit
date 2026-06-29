const fs = require("fs").promises;
const path = require("path");

const DB_PATH = path.join(__dirname, "db.json");

// Helper to read database
async function readData() {
  try {
    const data = await fs.readFile(DB_PATH, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Database Read Error:", error.message);
    // If file doesn't exist or is empty, return empty template
    return { users: [], products: [], carts: {}, orders: [] };
  }
}

// Helper to write database atomically
async function writeData(data) {
  const tmpPath = DB_PATH + ".tmp";
  try {
    await fs.writeFile(tmpPath, JSON.stringify(data, null, 2), "utf8");
    await fs.rename(tmpPath, DB_PATH);
  } catch (error) {
    console.error("Database Write Error:", error.message);
    // Attempt to clean up the temp file if left behind
    try {
      await fs.unlink(tmpPath);
    } catch (_) {}
    throw error;
  }
}

// Queue to serialize all mutating read-modify-write database operations
let dbMutex = Promise.resolve();

async function enqueue(operation) {
  return new Promise((resolve, reject) => {
    dbMutex = dbMutex.then(async () => {
      try {
        const result = await operation();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  });
}

async function getUsers() {
  const db = await readData();
  return db.users || [];
}

async function saveUser(user) {
  return enqueue(async () => {
    const db = await readData();
    db.users = db.users || [];
    db.users.push(user);
    await writeData(db);
  });
}

async function getProducts() {
  const db = await readData();
  return db.products || [];
}

async function addProduct(product) {
  return enqueue(async () => {
    const db = await readData();
    db.products = db.products || [];
    const maxId = db.products.reduce((max, p) => p.id > max ? p.id : max, 0);
    const newProduct = {
      id: maxId + 1,
      name: product.name,
      price: Number(product.price),
      description: product.description,
      category: product.category || "Apparel",
      imageUrl: product.imageUrl || ""
    };
    db.products.push(newProduct);
    await writeData(db);
    return newProduct;
  });
}

async function deleteProduct(productId) {
  return enqueue(async () => {
    const db = await readData();
    db.products = db.products || [];
    db.products = db.products.filter(p => p.id !== Number(productId));
    await writeData(db);
  });
}

async function seedProducts(newProducts) {
  return enqueue(async () => {
    const db = await readData();
    db.products = newProducts;
    await writeData(db);
  });
}

async function getCart(email) {
  const db = await readData();
  db.carts = db.carts || {};
  return db.carts[email] || [];
}

async function saveCart(email, cartItems) {
  return enqueue(async () => {
    const db = await readData();
    db.carts = db.carts || {};
    db.carts[email] = cartItems;
    await writeData(db);
  });
}

async function addOrder(order) {
  return enqueue(async () => {
    const db = await readData();
    db.orders = db.orders || [];
    db.orders.push(order);
    await writeData(db);
  });
}

async function getOrders(email) {
  const db = await readData();
  db.orders = db.orders || [];
  return db.orders.filter(o => o.email === email);
}

module.exports = {
  getUsers,
  saveUser,
  getProducts,
  addProduct,
  deleteProduct,
  seedProducts,
  getCart,
  saveCart,
  addOrder,
  getOrders
};
