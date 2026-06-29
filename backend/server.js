const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const db = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

const SECRET = process.env.JWT_SECRET || "vastra_secret";

// Middleware to authenticate JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Access token required" });

  jwt.verify(token, SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid or expired token" });
    req.user = user;
    next();
  });
}

// User Sign Up
app.post("/signup", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long" });
    }

    // Check if user already exists
    const users = await db.getUsers();
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      return res.status(400).json({ error: "User already exists with this email" });
    }

    const hash = await bcrypt.hash(password, 10);
    await db.saveUser({ email, password: hash });

    res.status(201).json({ message: "User created successfully" });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ error: "Server error during registration" });
  }
});

// User Log In
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const users = await db.getUsers();
    const user = users.find(u => u.email === email);
    if (!user) return res.status(400).json({ error: "User not found" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: "Incorrect password" });

    const token = jwt.sign({ email }, SECRET, { expiresIn: "24h" });
    res.json({ token, email });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Server error during authentication" });
  }
});

// Get Products
app.get("/products", async (req, res) => {
  try {
    const products = await db.getProducts();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve products" });
  }
});

// Add Product
app.post("/products", async (req, res) => {
  try {
    const { name, price, description, category, imageUrl } = req.body;
    if (!name || price === undefined || price === null) {
      return res.status(400).json({ error: "Name and Price are required" });
    }
    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice <= 0) {
      return res.status(400).json({ error: "Price must be a valid positive number" });
    }
    const newProduct = await db.addProduct({ name, price: numPrice, description, category, imageUrl });
    res.status(201).json({ message: "Product added successfully", product: newProduct });
  } catch (error) {
    res.status(500).json({ error: "Failed to add product" });
  }
});

// Delete Product
app.delete("/products/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.deleteProduct(Number(id));
    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete product" });
  }
});

// Seed Products
app.post("/products/seed", async (req, res) => {
  try {
    const defaultSeed = [
      {
        id: 1,
        name: "Men's Designer Silk Kurta",
        price: 2499,
        description: "Elegantly crafted traditional men's silk kurta with gold embroidery details, perfect for festivals and special occasions.",
        category: "Ethnic",
        imageUrl: "/assets/silk_kurta.png"
      },
      {
        id: 2,
        name: "Men's Streetwear Hoodie",
        price: 1999,
        description: "Premium cotton-blend streetwear hoodie with soft fleece lining and a minimalist style.",
        category: "Casual",
        imageUrl: "/assets/hoodie.png"
      },
      {
        id: 3,
        name: "Men's Cotton Kurta",
        price: 1899,
        description: "Handwoven pure cotton men's kurta featuring comfortable fit and elegant striped patterns.",
        category: "Ethnic",
        imageUrl: "/assets/silk_kurta.png"
      },
      {
        id: 4,
        name: "Men's Premium Linen Shirt",
        price: 1499,
        description: "Lightweight, breathable pure linen shirt, styled with a modern mandarin collar.",
        category: "Casual",
        imageUrl: "/assets/linen_shirt.png"
      },
      {
        id: 5,
        name: "Men's Classic Denim Jacket",
        price: 2999,
        description: "Classic indigo denim jacket with metal button accents and adjustable fit.",
        category: "Casual",
        imageUrl: "/assets/denim_jacket.png"
      },
      {
        id: 6,
        name: "Men's Crewneck Sweater",
        price: 1799,
        description: "Flowy and warm crewneck knit sweater with soft combed cotton textures.",
        category: "Casual",
        imageUrl: "/assets/hoodie.png"
      },
      {
        id: 7,
        name: "Men's Velvet Bandhgala Suit",
        price: 6999,
        description: "A royal velvet bandhgala suit jacket designed for grand celebrations and formal events.",
        category: "Formal",
        imageUrl: "/assets/bandhgala.png"
      },
      {
        id: 8,
        name: "Men's Smart Khadi Blazer",
        price: 3999,
        description: "Hand-spun khadi cotton blazer, structured yet lightweight for a perfect smart-casual or formal look.",
        category: "Formal",
        imageUrl: "/assets/bandhgala.png"
      },
      {
        id: 9,
        name: "Men's Combed Cotton Polo",
        price: 899,
        description: "Premium combed cotton pique polo shirt with ribbed collar and cuffs, ideal for everyday casual wear.",
        category: "Casual",
        imageUrl: "/assets/polo_tee.png"
      },
      {
        id: 10,
        name: "Men's Active Joggers",
        price: 1299,
        description: "Stretch-fit breathable joggers with moisture-wicking technology for active days or home lounging.",
        category: "Activewear",
        imageUrl: "/assets/joggers.png"
      },
      {
        id: 11,
        name: "Men's Windbreaker Jacket",
        price: 2299,
        description: "Water-resistant lightweight windbreaker jacket with secure zip pockets and adjustable hood.",
        category: "Activewear",
        imageUrl: "/assets/hoodie.png"
      },
      {
        id: 12,
        name: "Men's Traditional Sherwani",
        price: 5499,
        description: "Flared traditional sherwani in georgette fabric with intricate zari embroidery, designed for weddings.",
        category: "Ethnic",
        imageUrl: "/assets/silk_kurta.png"
      },
      {
        id: 13,
        name: "Men's Utility Cargo Pants",
        price: 1899,
        description: "Durable cotton twill cargo pants featuring multiple utility pockets and adjustable ankle cuffs.",
        category: "Casual",
        imageUrl: "/assets/joggers.png"
      },
      {
        id: 14,
        name: "Men's Oxford Knitted Vest",
        price: 1199,
        description: "Traditional sleeveless knitted vest featuring detailed v-neck and diamond weave styling.",
        category: "Formal",
        imageUrl: "/assets/linen_shirt.png"
      },
      {
        id: 15,
        name: "Men's Woolen Winter Shawl",
        price: 2499,
        description: "Warm, hand-loomed wool shawl with elegant paisley borders and a soft feel for cold weather.",
        category: "Accessories",
        imageUrl: "/assets/shawl.png"
      }
    ];
    const products = req.body && Array.isArray(req.body.products) ? req.body.products : defaultSeed;
    await db.seedProducts(products);
    res.json({ message: "Database seeded successfully", count: products.length, products });
  } catch (error) {
    res.status(500).json({ error: "Failed to seed database" });
  }
});

// Get Cart Items (Secured)
app.get("/cart", authenticateToken, async (req, res) => {
  try {
    const email = req.user.email;
    const cartItemIds = await db.getCart(email);
    const products = await db.getProducts();

    // Map the IDs in the cart to the actual product details
    const cartItems = cartItemIds.map(id => products.find(p => p.id === id)).filter(Boolean);
    res.json(cartItems);
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve cart items" });
  }
});

// Add Item to Cart (Secured)
app.post("/cart", authenticateToken, async (req, res) => {
  try {
    const email = req.user.email;
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ error: "Product ID is required" });
    }

    const products = await db.getProducts();
    const product = products.find(p => p.id === Number(productId));
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    const cartItems = await db.getCart(email);
    cartItems.push(Number(productId));
    await db.saveCart(email, cartItems);

    res.json({ message: "Added to cart successfully", cartSize: cartItems.length });
  } catch (error) {
    res.status(500).json({ error: "Failed to add item to cart" });
  }
});

// Remove Item from Cart (Secured)
app.delete("/cart/:productId", authenticateToken, async (req, res) => {
  try {
    const email = req.user.email;
    const { productId } = req.params;

    if (!productId) {
      return res.status(400).json({ error: "Product ID is required" });
    }

    const cartItems = await db.getCart(email);
    const index = cartItems.indexOf(Number(productId));
    if (index === -1) {
      return res.status(404).json({ error: "Product not found in cart" });
    }

    // Remove only one occurrence of the product ID
    cartItems.splice(index, 1);
    await db.saveCart(email, cartItems);

    res.json({ message: "Removed from cart successfully", cartSize: cartItems.length });
  } catch (error) {
    res.status(500).json({ error: "Failed to remove item from cart" });
  }
});

// Place Order (Secured)
app.post("/order", authenticateToken, async (req, res) => {
  try {
    const email = req.user.email;
    const cartItemIds = await db.getCart(email);

    if (!cartItemIds || cartItemIds.length === 0) {
      return res.status(400).json({ error: "Cannot place order with an empty cart" });
    }

    const products = await db.getProducts();
    const orderedProducts = cartItemIds.map(id => products.find(p => p.id === id)).filter(Boolean);
    
    const totalAmount = orderedProducts.reduce((sum, item) => sum + item.price, 0);

    const order = {
      id: Date.now(),
      email,
      items: orderedProducts,
      totalAmount,
      date: new Date().toISOString(),
      status: "Placed"
    };

    // Save order
    await db.addOrder(order);

    // Clear user's cart
    await db.saveCart(email, []);

    res.status(201).json({
      message: "Order placed successfully",
      order
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to place order" });
  }
});

// Get Order History (Secured)
app.get("/orders", authenticateToken, async (req, res) => {
  try {
    const email = req.user.email;
    const orders = await db.getOrders(email);
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve order history" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));