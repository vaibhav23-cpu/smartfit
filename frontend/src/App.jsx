import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { 
  ShoppingBag, 
  ShoppingCart, 
  User, 
  LogOut, 
  Trash2, 
  Plus, 
  Minus, 
  CheckCircle, 
  TrendingUp,
  Tag,
  Package,
  Calendar,
  Lock,
  Mail,
  ArrowRight,
  Loader,
  AlertCircle,
  Database,
  RefreshCw,
  Camera,
  Sparkles,
  X,
  Upload,
  Ruler,
  HelpCircle,
  Share2,
  Grid,
  Save
} from "lucide-react";

const API_BASE = "http://localhost:5000";

const GARMENT_FIT_CONFIGS = {
  // Tops (Kurta, Hoodie, Denim, Dress, Gown, Blazer, Shirt, Polo, Shawl)
  tops: {
    landmarks: [11, 12], // Left Shoulder, Right Shoulder
    yOffset: 0.1,        // Downwards offset to line up chest/body center
    scaleMultiplier: 1.35,
    baseReference: 0.28   // Distance between shoulders representing 100%
  },
  // Bottoms (Joggers, Cargoes)
  bottoms: {
    landmarks: [23, 24], // Left Hip, Right Hip
    yOffset: 0.35,        // Downwards offset
    scaleMultiplier: 1.25,
    baseReference: 0.22   // Hip width base
  },
  // Footwear (Mojaris)
  footwear: {
    landmarks: [27, 28], // Left Ankle, Right Ankle
    yOffset: 0.15,
    scaleMultiplier: 1.0,
    baseReference: 0.18   // Ankle width base
  },
  // Accessories / Jewelry (Earrings)
  accessories: {
    landmarks: [7, 8],   // Left Ear, Right Ear
    yOffset: 0.12,
    scaleMultiplier: 0.45,
    baseReference: 0.12   // Ear width base
  }
};

// Map product ID to fit type and specific offsets to ensure perfect alignment
const getGarmentFitConfig = (productId) => {
  const id = Number(productId);
  // Bottoms (Joggers = 10, Cargoes = 13)
  if (id === 10 || id === 13) return { type: "bottoms", ...GARMENT_FIT_CONFIGS.bottoms };
  // Footwear (Mojaris = 11)
  if (id === 11) return { type: "footwear", ...GARMENT_FIT_CONFIGS.footwear };
  // Accessories (Earrings = 14)
  if (id === 14) return { type: "accessories", ...GARMENT_FIT_CONFIGS.accessories };
  
  // Default to tops for everything else (Silk Kurta, Hoodie, Saree, Linen Shirt, Blazer, Shawl, Gowns)
  const baseConfig = { type: "tops", ...GARMENT_FIT_CONFIGS.tops };
  if (id === 1) return { ...baseConfig, yOffset: 0.08, scaleMultiplier: 1.35 };  // Silk Kurta
  if (id === 2) return { ...baseConfig, yOffset: 0.06, scaleMultiplier: 1.45 };  // Hoodie is puffy
  if (id === 3) return { ...baseConfig, yOffset: 0.32, scaleMultiplier: 1.35 };  // Saree drape goes lower
  if (id === 5) return { ...baseConfig, yOffset: 0.08, scaleMultiplier: 1.4 };   // Denim Jacket
  if (id === 6) return { ...baseConfig, yOffset: 0.42, scaleMultiplier: 1.4 };   // Dress is long
  if (id === 12) return { ...baseConfig, yOffset: 0.42, scaleMultiplier: 1.4 };  // Anarkali Gown
  if (id === 15) return { ...baseConfig, yOffset: 0.15, scaleMultiplier: 1.3 };   // Shawl drape
  
  return baseConfig;
};

// Utility to dynamically remove white background from an image on the fly
const removeWhiteBackground = (imageSrc, threshold = 240) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i+1];
        const b = data[i+2];
        
        // If the pixel is very close to white, make it transparent
        if (r >= threshold && g >= threshold && b >= threshold) {
          data[i+3] = 0; // Alpha = 0
        }
      }
      
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => {
      resolve(imageSrc); // Fallback to original URL on error
    };
    img.src = imageSrc;
  });
};

const getProductOriginalSrc = (id) => {
  switch(Number(id)) {
    case 1: return "/assets/silk_kurta.png";
    case 2: return "/assets/hoodie.png";
    case 3: return "/assets/saree.png";
    case 4: return "/assets/linen_shirt.png";
    case 5: return "/assets/denim_jacket.png";
    case 6: return "/assets/floral_dress.png";
    case 7: return "/assets/bandhgala.png";
    case 8: return "/assets/bandhgala.png";
    case 9: return "/assets/polo_tee.png";
    case 10: return "/assets/joggers.png";
    case 11: return "/assets/mojaris.png";
    case 12: return "/assets/silk_kurta.png";
    case 13: return "/assets/joggers.png";
    case 14: return "/assets/jhumkas.png";
    case 15: return "/assets/shawl.png";
    default: return "/assets/silk_kurta.png";
  }
};

function App() {
  const videoRef = useRef(null);
  const poseRef = useRef(null);
  const cameraRef = useRef(null);
  const trackingCanvasRef = useRef(null);
  const [view, setView] = useState("products"); // 'products', 'orders', 'admin'
  const [authMode, setAuthMode] = useState("login"); // 'login', 'signup'
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });
  
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");
  
  // Auth Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Admin Form State
  const [newProductName, setNewProductName] = useState("");
  const [newProductPrice, setNewProductPrice] = useState("");
  const [newProductCategory, setNewProductCategory] = useState("Ethnic");
  const [newProductDescription, setNewProductDescription] = useState("");
  const [newProductImageUrl, setNewProductImageUrl] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);
  
  // Loading & UI States
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Try-On State
  const [activeTryOnProduct, setActiveTryOnProduct] = useState(null);
  const [tryOnMode, setTryOnMode] = useState("mix-match"); // 'mix-match', 'ar-live'
  const [selectedAvatar, setSelectedAvatar] = useState("model-male"); // 'model-female', 'model-male'
  const [tryOnPhoto, setTryOnPhoto] = useState(null);
  const [mixMatchItems, setMixMatchItems] = useState([]);
  const [activeOverlayItem, setActiveOverlayItem] = useState(null);
  const [overlayConfig, setOverlayConfig] = useState({});
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [webcamStream, setWebcamStream] = useState(null);
  const [overlayScale, setOverlayScale] = useState(100);
  const [overlayX, setOverlayX] = useState(0);
  const [overlayY, setOverlayY] = useState(0);
  const [overlayOpacity, setOverlayOpacity] = useState(85);
  const [overlayRotation, setOverlayRotation] = useState(0);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiGenerationStep, setAiGenerationStep] = useState("");
  const [aiTryOnResult, setAiTryOnResult] = useState(false);
  const [transparentImages, setTransparentImages] = useState({});

  // Research-aligned VTO states
  const [vtoTab, setVtoTab] = useState("personalize"); // 'personalize', 'diagnostics', 'styling'
  const [height, setHeight] = useState(165); // cm
  const [weight, setWeight] = useState(60); // kg
  const [bodyShape, setBodyShape] = useState("rectangle"); // 'rectangle', 'hourglass', 'pear', 'round', 'athletic'
  const [skinTone, setSkinTone] = useState("wheatish"); // 'fair', 'wheatish', 'dusky', 'dark'
  const [calibrationGrid, setCalibrationGrid] = useState(false);
  const [lookName, setLookName] = useState("");
  const [lookbook, setLookbook] = useState(() => {
    const saved = localStorage.getItem("smartfit_lookbook");
    return saved ? JSON.parse(saved) : [];
  });
  const [activeShareLook, setActiveShareLook] = useState(null);

  // Library load statuses for VTO diagnostics
  const [libStatuses, setLibStatuses] = useState({
    mediapipePose: "checking", // 'loaded', 'missing', 'failed', 'checking'
    mediapipeCamera: "checking",
    opencv: "checking"
  });

  // Dynamic script loader for fallback CDNs
  const loadScript = useCallback((url, checkGlobal, libKey) => {
    if (window[checkGlobal]) {
      setLibStatuses(prev => ({ ...prev, [libKey]: "loaded" }));
      return;
    }
    console.log(`Dynamically loading script fallback: ${url}`);
    const script = document.createElement("script");
    script.src = url;
    script.crossOrigin = "anonymous";
    script.onload = () => {
      if (window[checkGlobal]) {
        console.log(`Successfully loaded ${libKey} from fallback CDN`);
        setLibStatuses(prev => ({ ...prev, [libKey]: "loaded" }));
      } else {
        // OpenCV might load but take a bit to register cv on window
        if (checkGlobal === "cv") {
          let attempts = 0;
          const interval = setInterval(() => {
            attempts++;
            if (window.cv) {
              console.log(`OpenCV registered on window after ${attempts} attempts`);
              setLibStatuses(prev => ({ ...prev, opencv: "loaded" }));
              clearInterval(interval);
            } else if (attempts >= 10) {
              setLibStatuses(prev => ({ ...prev, opencv: "failed" }));
              clearInterval(interval);
            }
          }, 500);
        } else {
          setLibStatuses(prev => ({ ...prev, [libKey]: "failed" }));
        }
      }
    };
    script.onerror = () => {
      setLibStatuses(prev => ({ ...prev, [libKey]: "failed" }));
    };
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!activeTryOnProduct) return;

    const checkLibs = () => {
      const poseOk = !!window.Pose;
      const cameraOk = !!window.Camera;
      const cvOk = !!window.cv;

      setLibStatuses({
        mediapipePose: poseOk ? "loaded" : "missing",
        mediapipeCamera: cameraOk ? "loaded" : "missing",
        opencv: cvOk ? "loaded" : "missing"
      });

      // Try fallbacks for missing libs
      if (!poseOk) {
        loadScript("https://unpkg.com/@mediapipe/pose/pose.js", "Pose", "mediapipePose");
      }
      if (!cameraOk) {
        loadScript("https://unpkg.com/@mediapipe/camera_utils/camera_utils.js", "Camera", "mediapipeCamera");
      }
      if (!cvOk) {
        loadScript("https://unpkg.com/@techstark/opencv-js@4.9.0-release.2/dist/opencv.js", "cv", "opencv");
      }
    };

    const timer = setTimeout(checkLibs, 800);
    return () => clearTimeout(timer);
  }, [activeTryOnProduct, loadScript]);

  const handleSaveLook = (e) => {
    if (e) e.preventDefault();
    if (!lookName.trim()) {
      showError("Please enter a name for the outfit look.");
      return;
    }
    if (mixMatchItems.length === 0) {
      showError("Add at least one item to the outfit before saving.");
      return;
    }
    const newLook = {
      id: Date.now(),
      name: lookName.trim(),
      items: [...mixMatchItems],
      avatar: selectedAvatar,
      height,
      weight,
      bodyShape,
      skinTone,
      date: new Date().toISOString()
    };
    const updated = [newLook, ...lookbook];
    setLookbook(updated);
    localStorage.setItem("smartfit_lookbook", JSON.stringify(updated));
    setLookName("");
    showSuccess(`Look "${newLook.name}" saved to Lookbook!`);
  };

  const handleDeleteLook = (lookId) => {
    const updated = lookbook.filter(l => l.id !== lookId);
    setLookbook(updated);
    localStorage.setItem("smartfit_lookbook", JSON.stringify(updated));
    showSuccess("Look removed.");
  };

  const handleOpenShare = () => {
    setActiveShareLook({
      name: lookName.trim() || `Custom Style ${new Date().toLocaleDateString()}`,
      items: [...mixMatchItems],
      avatar: selectedAvatar,
      height,
      weight,
      bodyShape,
      skinTone,
      pci: getConfidenceScore()
    });
  };

  const handleLoadLook = (look) => {
    setSelectedAvatar(look.avatar);
    setHeight(look.height);
    setWeight(look.weight);
    setBodyShape(look.bodyShape);
    setSkinTone(look.skinTone);
    setMixMatchItems(look.items);
    if (look.items.length > 0) {
      setActiveOverlayItem(look.items[0]);
    }
    const newConfig = {};
    look.items.forEach(item => {
      newConfig[item.id] = { scale: 100, x: 0, y: 0, rotation: 0, opacity: 85 };
    });
    setOverlayConfig(newConfig);
    setOverlayScale(100);
    setOverlayX(0);
    setOverlayY(0);
    setOverlayRotation(0);
    setOverlayOpacity(85);
    showSuccess(`Loaded look: "${look.name}"`);
  };

  const handleAddLookToCart = async (lookItems) => {
    if (!user) {
      showError("Please sign in to add look items to the cart.");
      return;
    }
    try {
      setLoading(true);
      for (const item of lookItems) {
        await axios.post(`${API_BASE}/cart`, { productId: item.id }, getAuthHeaders());
      }
      await fetchCart();
      showSuccess(`Added all items from look to cart!`);
    } catch (err) {
      console.error("Error adding look to cart:", err);
      showError("Failed to add all items to cart.");
    } finally {
      setLoading(false);
    }
  };

  const handleApplyPreset = (presetName) => {
    let presetIds = [];
    if (presetName === "festive") {
      presetIds = [1, 11, 14, 15]; // Silk Kurta, Mojaris, Jhumkas, Shawl
    } else if (presetName === "casual") {
      presetIds = [2, 10, 9]; // Hoodie, Joggers, Polo Tee
    } else if (presetName === "formal") {
      presetIds = [7, 8, 4]; // Bandhgala, Blazer, Linen Shirt
    } else if (presetName === "summer") {
      presetIds = [3, 14, 11]; // Saree, Jhumkas, Mojaris
    }

    const matchingProducts = products.filter(p => presetIds.includes(p.id));
    if (matchingProducts.length === 0) {
      showError("No matching products found in inventory.");
      return;
    }

    setMixMatchItems(matchingProducts);
    setActiveOverlayItem(matchingProducts[0]);

    const newConfig = {};
    matchingProducts.forEach(p => {
      let yOffset = 0;
      let scaleOffset = 100;
      if (p.category === "Accessories") {
        yOffset = p.id === 14 ? -50 : 50;
        scaleOffset = p.id === 14 ? 50 : 60;
      } else if (p.category === "Ethnic" || p.category === "Formal") {
        yOffset = 0;
      }
      newConfig[p.id] = { scale: scaleOffset, x: 0, y: yOffset, rotation: 0, opacity: 85 };
    });

    setOverlayConfig(newConfig);
    const firstConfig = newConfig[matchingProducts[0].id];
    setOverlayScale(firstConfig.scale);
    setOverlayX(firstConfig.x);
    setOverlayY(firstConfig.y);
    setOverlayRotation(firstConfig.rotation);
    setOverlayOpacity(firstConfig.opacity);

    showSuccess(`Loaded coordinate preset for ${presetName}!`);
  };

  const getRecommendedSize = () => {
    if (height < 160) {
      if (weight < 50) return "XS";
      if (weight < 65) return "S";
      if (weight < 80) return "M";
      return "L";
    } else if (height >= 160 && height < 175) {
      if (weight < 55) return "S";
      if (weight < 70) return "M";
      if (weight < 85) return "L";
      return "XL";
    } else {
      if (weight < 65) return "M";
      if (weight < 80) return "L";
      if (weight < 95) return "XL";
      return "XXL";
    }
  };

  const heightMeters = height / 100;
  const bmi = (weight / (heightMeters * heightMeters)).toFixed(1);
  const bmiScale = Math.max(0.85, Math.min(1.25, bmi / 22));

  const getConfidenceScore = () => {
    let score = 40;
    if (height !== 165 || weight !== 60 || bodyShape !== "rectangle") score += 15;
    if (skinTone !== "wheatish") score += 10;
    if (mixMatchItems.length > 0) score += 15;
    const hasAdjusted = Object.values(overlayConfig).some(c => c.scale !== 100 || c.x !== 0 || c.y !== 0 || c.rotation !== 0);
    if (hasAdjusted) score += 10;
    if (aiTryOnResult) score += 20;
    if (mixMatchItems.length > 1) score += 10;
    return Math.min(100, score);
  };

  const getRiskBreakdown = (product) => {
    if (!product) return null;
    let silhouette = "Low - Regular cut coordinates well with standard body type.";
    if (bodyShape === "round" && (product.category === "Activewear" || product.name.includes("Joggers"))) {
      silhouette = "Medium - Snug athletic cut. Elastic fabric might run tight on waist.";
    } else if (bodyShape === "pear" && product.name.includes("Cargoes")) {
      silhouette = "Medium - Structured twill cargo cuts close around hip areas.";
    } else if (product.category === "Ethnic" || product.category === "Accessories") {
      silhouette = "Low - Adjustable flowy drape scales seamlessly.";
    }

    let color = "Very Low - Standard daylight studio render matches realistic item color.";
    if (product.name.includes("Silk") || product.name.includes("Velvet") || product.category === "Accessories") {
      color = "Low - High sheen material. Metallic thread reflections vary slightly under warm lighting.";
    }

    let texture = "Low - Soft combed cotton, pre-shrunk and hypoallergenic.";
    if (product.name.includes("Silk") || product.name.includes("Velvet") || product.name.includes("Woolen")) {
      texture = "Medium - Premium heavy drape. Delicate weave, dry clean only.";
    } else if (product.name.includes("Khadi")) {
      texture = "Low - Textured organic yarn, highly breathable, softens with washes.";
    }

    const recommendedSize = getRecommendedSize();
    let fitConcern = `Low - Recommended size ${recommendedSize} is ideal for your height/weight.`;
    if (height > 185 && (product.name.includes("Shirt") || product.name.includes("Kurta"))) {
      fitConcern = `Medium - Sleeves might fit shorter for tall stature. Consider choosing ${recommendedSize === "XXL" ? "XXL" : recommendedSize + " (or size up)"}.`;
    } else if (weight > 85 && product.category === "Formal") {
      fitConcern = `Medium - Structured shoulder cuts run narrow. Ordering one size up is recommended.`;
    }

    return { silhouette, color, texture, fitConcern };
  };

  // Webcam Control
  const startWebcam = async () => {
    try {
      setError("");

      // Ensure MediaPipe libraries are loaded before accessing webcam
      if (!window.Pose || !window.Camera) {
        showError("MediaPipe libraries are not fully loaded. Attempting to load fallback...");
        if (!window.Pose) loadScript("https://unpkg.com/@mediapipe/pose/pose.js", "Pose", "mediapipePose");
        if (!window.Camera) loadScript("https://unpkg.com/@mediapipe/camera_utils/camera_utils.js", "Camera", "mediapipeCamera");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      setWebcamStream(stream);
      setIsWebcamActive(true);
      setTryOnPhoto(null); // Clear static photo while using live video
    } catch (err) {
      console.error("Webcam activation error:", err);
      showError("Could not access camera. Please check camera permissions.");
    }
  };

  const stopWebcam = () => {
    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
    }
    if (poseRef.current) {
      poseRef.current.close();
      poseRef.current = null;
    }
    if (webcamStream) {
      webcamStream.getTracks().forEach(track => track.stop());
      setWebcamStream(null);
    }
    setIsWebcamActive(false);
  };

  const capturePhoto = (videoRef) => {
    if (!videoRef) return;
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext("2d");
    // Flip horizontally for natural mirror capture
    ctx.translate(640, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(videoRef, 0, 0, 640, 480);
    
    const photoUrl = canvas.toDataURL("image/jpeg");
    setTryOnPhoto(photoUrl);
    stopWebcam();
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setTryOnPhoto(reader.result);
      stopWebcam();
    };
    reader.readAsDataURL(file);
  };

  const handleRunAiTryOn = () => {
    setIsAiGenerating(true);
    setAiGenerationStep("Mapping body coordinates...");
    
    setTimeout(() => {
      setAiGenerationStep("Aligning fabric to body contours...");
      setTimeout(() => {
        setAiGenerationStep("Rendering textures and shading...");
        setTimeout(() => {
          setIsAiGenerating(false);
          setAiTryOnResult(true);
          showSuccess("AI fitting completed!");
        }, 1000);
      }, 1000);
    }, 1000);
  };

  const closeTryOn = () => {
    stopWebcam();
    setActiveTryOnProduct(null);
    setTryOnPhoto(null);
    setOverlayScale(100);
    setOverlayX(0);
    setOverlayY(0);
    setOverlayOpacity(85);
    setOverlayRotation(0);
    setAiTryOnResult(false);
  };

  const handleDragStart = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - overlayX, y: e.clientY - overlayY });
  };

  const handleDragMove = (e) => {
    if (!isDragging) return;
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    setOverlayX(newX);
    setOverlayY(newY);
    if (activeOverlayItem) {
      setOverlayConfig(prev => ({
        ...prev,
        [activeOverlayItem.id]: {
          ...prev[activeOverlayItem.id],
          x: newX,
          y: newY
        }
      }));
    }
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // Set Authorization header for Axios
  const getAuthHeaders = useCallback(() => {
    return user ? { headers: { Authorization: `Bearer ${user.token}` } } : {};
  }, [user]);

  // Fetch Products
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/products`);
      setProducts(res.data);
    } catch (err) {
      console.error(err);
      showError("Failed to fetch products. Is the server running?");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch Cart Items
  const fetchCart = useCallback(async () => {
    if (!user) return;
    try {
      const res = await axios.get(`${API_BASE}/cart`, getAuthHeaders());
      setCart(res.data);
    } catch (err) {
      console.error(err);
    }
  }, [user, getAuthHeaders]);

  // Fetch Orders
  const fetchOrders = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/orders`, getAuthHeaders());
      setOrders(res.data.reverse()); // latest first
    } catch (err) {
      console.error(err);
      showError("Failed to fetch order history.");
    } finally {
      setLoading(false);
    }
  }, [user, getAuthHeaders]);

  // Handle Sign Up & Login
  const handleAuth = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    
    if (!email || !password) {
      showError("Please fill out all fields.");
      return;
    }

    try {
      setAuthLoading(true);
      if (authMode === "signup") {
        await axios.post(`${API_BASE}/signup`, { email, password });
        showSuccess("Account created successfully! Please log in.");
        setAuthMode("login");
        setPassword("");
      } else {
        const res = await axios.post(`${API_BASE}/login`, { email, password });
        const userData = { email: res.data.email, token: res.data.token };
        localStorage.setItem("user", JSON.stringify(userData));
        setUser(userData);
        showSuccess("Successfully logged in!");
        setEmail("");
        setPassword("");
      }
    } catch (err) {
      showError(err.response?.data?.error || "Authentication failed. Try again.");
    } finally {
      setAuthLoading(false);
    }
  };

  // Add Item to Cart
  const addToCart = async (productId) => {
    if (!user) {
      showError("Please login to add items to the cart.");
      setView("products");
      // Open auth panel or show message
      return;
    }
    try {
      setError("");
      const res = await axios.post(`${API_BASE}/cart`, { productId }, getAuthHeaders());
      await fetchCart();
      showSuccess(res.data.message || "Added to cart!");
    } catch (err) {
      showError(err.response?.data?.error || "Could not add item to cart.");
    }
  };

  // Remove Item from Cart
  const removeFromCart = async (productId) => {
    if (!user) return;
    try {
      setError("");
      await axios.delete(`${API_BASE}/cart/${productId}`, getAuthHeaders());
      await fetchCart();
    } catch (err) {
      showError(err.response?.data?.error || "Could not remove item.");
    }
  };

  // Place Order
  const placeOrder = async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError("");
      const res = await axios.post(`${API_BASE}/order`, {}, getAuthHeaders());
      setCart([]);
      setIsCartOpen(false);
      showSuccess(res.data.message || "Order placed successfully!");
      setView("orders");
      await fetchOrders();
    } catch (err) {
      showError(err.response?.data?.error || "Could not place order.");
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const handleLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
    setCart([]);
    setOrders([]);
    setView("products");
    showSuccess("Logged out successfully.");
  };

  // Admin Operations
  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!newProductName || !newProductPrice) {
      showError("Please enter a name and price.");
      return;
    }
    try {
      setAdminLoading(true);
      setError("");
      setSuccess("");
      await axios.post(`${API_BASE}/products`, {
        name: newProductName,
        price: Number(newProductPrice),
        category: newProductCategory,
        description: newProductDescription,
        imageUrl: newProductImageUrl
      });
      showSuccess("Product added to catalog successfully!");
      setNewProductName("");
      setNewProductPrice("");
      setNewProductCategory("Ethnic");
      setNewProductDescription("");
      setNewProductImageUrl("");
      await fetchProducts();
    } catch (err) {
      showError(err.response?.data?.error || "Failed to add product.");
    } finally {
      setAdminLoading(false);
    }
  };

  const handleDeleteProduct = async (productId) => {
    try {
      setAdminLoading(true);
      setError("");
      setSuccess("");
      await axios.delete(`${API_BASE}/products/${productId}`);
      showSuccess("Product removed from catalog.");
      await fetchProducts();
      await fetchCart();
    } catch (err) {
      console.error("Product deletion error:", err);
      showError("Failed to delete product.");
    } finally {
      setAdminLoading(false);
    }
  };

  const handleSeedProducts = async () => {
    try {
      setAdminLoading(true);
      setError("");
      setSuccess("");
      const res = await axios.post(`${API_BASE}/products/seed`);
      showSuccess(`Catalog seeded with ${res.data.count} items!`);
      await fetchProducts();
    } catch (err) {
      console.error("Seeding catalog error:", err);
      showError("Failed to seed database.");
    } finally {
      setAdminLoading(false);
    }
  };

  const handleClearProducts = async () => {
    if (!window.confirm("Are you sure you want to clear all products? This will make the store empty.")) return;
    try {
      setAdminLoading(true);
      setError("");
      setSuccess("");
      await axios.post(`${API_BASE}/products/seed`, { products: [] });
      showSuccess("Catalog cleared.");
      await fetchProducts();
    } catch (err) {
      console.error("Clearing database error:", err);
      showError("Failed to clear database.");
    } finally {
      setAdminLoading(false);
    }
  };

  // Helper Alert triggers
  const showError = (msg) => {
    setError(msg);
    setTimeout(() => setError(""), 5000);
  };

  const showSuccess = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 4000);
  };

  // Hook to load catalog on mount
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Hook to load cart & orders when user logged in
  useEffect(() => {
    if (user) {
      fetchCart();
      if (view === "orders") {
        fetchOrders();
      }
    } else {
      setCart([]);
      setOrders([]);
    }
  }, [user, view, fetchCart, fetchOrders]);

  // Hook to sync Try-On selections when a product is opened
  useEffect(() => {
    if (activeTryOnProduct) {
      setMixMatchItems([activeTryOnProduct]);
      setActiveOverlayItem(activeTryOnProduct);
      setOverlayConfig({
        [activeTryOnProduct.id]: { scale: 100, x: 0, y: 0, rotation: 0, opacity: 85 }
      });
      setOverlayScale(100);
      setOverlayX(0);
      setOverlayY(0);
      setOverlayRotation(0);
      setOverlayOpacity(85);
    } else {
      setMixMatchItems([]);
      setActiveOverlayItem(null);
      setOverlayConfig({});
    }
  }, [activeTryOnProduct]);

  // Hook to sync local states from overlayConfig when activeOverlayItem changes
  useEffect(() => {
    if (activeOverlayItem) {
      const config = overlayConfig[activeOverlayItem.id] || { scale: 100, x: 0, y: 0, rotation: 0, opacity: 85 };
      setOverlayScale(config.scale ?? 100);
      setOverlayX(config.x ?? 0);
      setOverlayY(config.y ?? 0);
      setOverlayRotation(config.rotation ?? 0);
      setOverlayOpacity(config.opacity ?? 85);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOverlayItem]);

  // Hook to process active coordinates, removing solid white backgrounds dynamically
  useEffect(() => {
    const processImages = async () => {
      const updated = { ...transparentImages };
      let changed = false;
      for (const item of mixMatchItems) {
        if (!updated[item.id]) {
          const originalSrc = getProductOriginalSrc(item.id);
          try {
            const transparentSrc = await removeWhiteBackground(originalSrc);
            updated[item.id] = transparentSrc;
            changed = true;
          } catch (err) {
            console.error("Background removal failed for item:", item.id, err);
          }
        }
      }
      if (changed) {
        setTransparentImages(updated);
      }
    };
    if (mixMatchItems.length > 0) {
      processImages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mixMatchItems]);

  // Hook to handle MediaPipe Pose tracking on the webcam stream
  useEffect(() => {
    if (!isWebcamActive || !webcamStream || !videoRef.current) {
      if (cameraRef.current) {
        cameraRef.current.stop();
        cameraRef.current = null;
      }
      if (poseRef.current) {
        poseRef.current.close();
        poseRef.current = null;
      }
      return;
    }

    // Set srcObject to link stream to video element
    if (videoRef.current) {
      videoRef.current.srcObject = webcamStream;
    }

    // Initialize MediaPipe Pose if available in window
    if (window.Pose && window.Camera) {
      console.log("Initializing MediaPipe Pose tracking...");
      const pose = new window.Pose({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
      });

      pose.setOptions({
        modelComplexity: 0,
        smoothLandmarks: true,
        enableSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      pose.onResults((results) => {
        try {
          // Draw skeleton tracking overlay on the canvas
          if (trackingCanvasRef.current) {
            const canvas = trackingCanvasRef.current;
            const ctx = canvas.getContext("2d");
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            if (results.poseLandmarks) {
              // Draw skeleton lines
              ctx.strokeStyle = "rgba(139, 92, 246, 0.75)";
              ctx.lineWidth = 4;
              ctx.lineCap = "round";
              ctx.shadowColor = "rgba(139, 92, 246, 0.6)";
              ctx.shadowBlur = 8;
              
              // Draw shoulder-to-shoulder line
              const ls = results.poseLandmarks[11];
              const rs = results.poseLandmarks[12];
              if (ls && rs && ls.visibility > 0.4 && rs.visibility > 0.4) {
                ctx.beginPath();
                // Mirror X coordinates to match mirrored video display
                ctx.moveTo((1 - ls.x) * canvas.width, ls.y * canvas.height);
                ctx.lineTo((1 - rs.x) * canvas.width, rs.y * canvas.height);
                ctx.stroke();
                
                // Draw torso lines down to hips if visible
                const lh = results.poseLandmarks[23];
                const rh = results.poseLandmarks[24];
                if (lh && rh && lh.visibility > 0.4 && rh.visibility > 0.4) {
                  ctx.beginPath();
                  ctx.moveTo((1 - ls.x) * canvas.width, ls.y * canvas.height);
                  ctx.lineTo((1 - lh.x) * canvas.width, lh.y * canvas.height);
                  ctx.lineTo((1 - rh.x) * canvas.width, rh.y * canvas.height);
                  ctx.lineTo((1 - rs.x) * canvas.width, rs.y * canvas.height);
                  ctx.stroke();
                }
              }
              
              // Draw joint glowing circles
              ctx.fillStyle = "#ffffff";
              [11, 12, 23, 24].forEach((idx) => {
                const lm = results.poseLandmarks[idx];
                if (lm && lm.visibility > 0.4) {
                  ctx.beginPath();
                  ctx.arc((1 - lm.x) * canvas.width, lm.y * canvas.height, 6, 0, 2 * Math.PI);
                  ctx.fill();
                  ctx.strokeStyle = "rgba(139, 92, 246, 0.9)";
                  ctx.stroke();
                }
              });
              ctx.shadowBlur = 0; // reset
            }
          }

          if (!results.poseLandmarks) return;

          // Get fit configurations for the active item
          const activeItem = activeOverlayItem;
          const fit = getGarmentFitConfig(activeItem ? activeItem.id : 1);
          
          let ptLeft = results.poseLandmarks[fit.landmarks[0]];
          let ptRight = results.poseLandmarks[fit.landmarks[1]];

          // Fallback for Close-Up Upper Body Tracking
          if (fit.type === "tops" && (!ptLeft || !ptRight || ptLeft.visibility < 0.4 || ptRight.visibility < 0.4)) {
            const leftEar = results.poseLandmarks[7];
            const rightEar = results.poseLandmarks[8];
            
            if (leftEar && rightEar) {
              const earDistance = Math.hypot(leftEar.x - rightEar.x, leftEar.y - rightEar.y);
              const midX = (leftEar.x + rightEar.x) / 2;
              const midY = (leftEar.y + rightEar.y) / 2 + 1.2 * earDistance; // Neck level
              const dist = 3.2 * earDistance; // Estimate shoulder width from ear spacing
              
              ptLeft = { x: midX + dist / 2, y: midY };
              ptRight = { x: midX - dist / 2, y: midY };
            }
          }

          if (ptLeft && ptRight) {
            // Midpoint calculation for positioning
            const midX = (ptLeft.x + ptRight.x) / 2;
            const midY = (ptLeft.y + ptRight.y) / 2;

            // Convert normalized coordinate to pixel offset relative to container center
            const targetX = (0.5 - midX) * 384;
            const targetY = (midY - 0.45 + fit.yOffset) * 512;

            // Calculate distance between tracking points
            const dx = ptLeft.x - ptRight.x;
            const dy = ptLeft.y - ptRight.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Map distance to clothing scale
            const targetScale = Math.max(20, Math.min(250, (dist / fit.baseReference) * 100 * fit.scaleMultiplier));

            // Calculate tilt angle
            const angleRad = Math.atan2(dy, dx);
            const angleDeg = (angleRad * 180) / Math.PI;
            const targetRotation = -angleDeg; // Invert for mirrored display

            // Update states
            setOverlayX(Math.round(targetX));
            setOverlayY(Math.round(targetY));
            setOverlayScale(Math.round(targetScale));
            setOverlayRotation(Math.round(targetRotation));

            // Sync into active config
            if (activeItem) {
              setOverlayConfig((prev) => ({
                ...prev,
                [activeItem.id]: {
                  scale: Math.round(targetScale),
                  x: Math.round(targetX),
                  y: Math.round(targetY),
                  rotation: Math.round(targetRotation),
                  opacity: prev[activeItem.id]?.opacity ?? 85
                }
              }));
            }
          }
        } catch (err) {
          console.error("Error in Pose tracking loop:", err);
          showError("Tracking error: " + err.message);
        }
      });

      poseRef.current = pose;

      const camera = new window.Camera(videoRef.current, {
        onFrame: async () => {
          if (videoRef.current && poseRef.current) {
            try {
              await poseRef.current.send({ image: videoRef.current });
            } catch (err) {
              console.error("MediaPipe frame send error:", err);
            }
          }
        },
        width: 640,
        height: 480
      });

      camera.start();
      cameraRef.current = camera;
    } else {
      console.warn("MediaPipe Pose or Camera libraries not loaded yet.");
    }

    return () => {
      if (cameraRef.current) {
        cameraRef.current.stop();
        cameraRef.current = null;
      }
      if (poseRef.current) {
        poseRef.current.close();
        poseRef.current = null;
      }
    };
  }, [isWebcamActive, webcamStream, activeOverlayItem, libStatuses.mediapipePose, libStatuses.mediapipeCamera]);

  // Calculations for unique cart products with counts
  const aggregatedCart = () => {
    const counts = {};
    cart.forEach(item => {
      if (!counts[item.id]) {
        counts[item.id] = { product: item, quantity: 0 };
      }
      counts[item.id].quantity += 1;
    });
    return Object.values(counts);
  };

  const cartTotal = cart.reduce((total, item) => total + item.price, 0);

  return (
    <div className="min-h-screen flex flex-col font-sans">
      
      {/* Toast Notifications */}
      <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 flex flex-col gap-2 w-full max-w-md px-4">
        {error && (
          <div className="glass-panel p-4 flex items-center gap-3 border-red-500/30 bg-red-950/20 text-red-200 shadow-lg shadow-red-950/10 animate-fade-in-toast">
            <AlertCircle size={20} className="text-red-400 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}
        {success && (
          <div className="glass-panel p-4 flex items-center gap-3 border-emerald-500/30 bg-emerald-950/20 text-emerald-200 shadow-lg shadow-emerald-950/10 animate-fade-in-toast">
            <CheckCircle size={20} className="text-emerald-400 shrink-0" />
            <p className="text-sm font-medium">{success}</p>
          </div>
        )}
      </div>

      {/* Main Header / Navigation */}
      <header className="sticky top-0 z-40 w-full glass-panel border-x-0 border-t-0 rounded-none bg-opacity-70">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView("products")}>
            <div className="bg-gradient-to-br from-violet-500 to-indigo-600 p-2.5 rounded-xl shadow-lg shadow-indigo-500/20">
              <ShoppingBag size={20} className="text-white" />
            </div>
            <div>
              <h1 className="brand-title text-xl text-white font-bold leading-tight">SMARTFIT</h1>
              <p className="brand-subtitle text-[10px] text-gray-400">ready to wear</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <button 
              onClick={() => setView("products")} 
              className={`hover:text-white transition-colors py-1 ${view === "products" ? "text-violet-400 border-b-2 border-violet-400" : "text-gray-300"}`}
            >
              Shop Collection
            </button>
            {user && (
              <button 
                onClick={() => setView("orders")} 
                className={`hover:text-white transition-colors py-1 ${view === "orders" ? "text-violet-400 border-b-2 border-violet-400" : "text-gray-300"}`}
              >
                My Orders
              </button>
            )}
            <button 
              onClick={() => setView("admin")} 
              className={`hover:text-white transition-colors py-1 flex items-center gap-1.5 ${view === "admin" ? "text-violet-400 border-b-2 border-violet-400" : "text-gray-300"}`}
            >
              <Database size={14} />
              <span>Admin Panel</span>
            </button>
          </nav>

          <div className="flex items-center gap-4">
            {/* Cart trigger button */}
            <button 
              onClick={() => setIsCartOpen(true)}
              className="relative p-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors"
            >
              <ShoppingCart size={18} className="text-gray-200" />
              {cart.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-violet-600 text-white text-[11px] font-bold h-5 w-5 rounded-full flex items-center justify-center border-2 border-[#090a0f] animate-pulse">
                  {cart.length}
                </span>
              )}
            </button>

            {/* Auth block */}
            {user ? (
              <div className="flex items-center gap-4">
                <div className="hidden lg:flex flex-col text-right">
                  <span className="text-xs text-gray-400">Signed in as</span>
                  <span className="text-sm font-medium text-gray-200 max-w-[150px] truncate">{user.email}</span>
                </div>
                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-2 p-2.5 lg:px-4 lg:py-2.5 rounded-xl bg-red-950/20 border border-red-500/10 hover:bg-red-900/30 text-red-200 hover:text-white transition-all text-sm font-medium"
                >
                  <LogOut size={16} />
                  <span className="hidden lg:inline">Sign Out</span>
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setView("auth")}
                className="btn-primary py-2 px-5 text-sm"
              >
                <User size={16} />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        
        {/* VIEW: AUTHENTICATION */}
        {view === "auth" && !user && (
          <div className="max-w-md mx-auto my-12 animate-fade-in">
            <div className="glass-panel p-8 border-white/10 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-amber-500"></div>
              
              <div className="text-center mb-8">
                <h2 className="brand-title text-3xl font-bold mb-2">
                  {authMode === "login" ? "Welcome Back" : "Create Account"}
                </h2>
                <p className="text-gray-400 text-sm">
                  {authMode === "login" 
                    ? "Enter your credentials to access your SmartFit wardrobe" 
                    : "Join SmartFit to browse and purchase signature apparel"}
                </p>
              </div>

              <form onSubmit={handleAuth} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Email Address</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" />
                    <input 
                      type="email" 
                      placeholder="name@example.com" 
                      className="glass-input pl-11"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" />
                    <input 
                      type="password" 
                      placeholder="••••••••" 
                      className="glass-input pl-11"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  {authMode === "signup" && (
                    <p className="text-[11px] text-gray-500 mt-1">Must be at least 6 characters</p>
                  )}
                </div>

                <button 
                  type="submit" 
                  disabled={authLoading}
                  className="btn-primary w-full py-3 text-base mt-2 flex items-center justify-center gap-2"
                >
                  {authLoading ? (
                    <Loader size={18} className="animate-spin" />
                  ) : (
                    <>
                      <span>{authMode === "login" ? "Sign In" : "Sign Up"}</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-white/5 text-center">
                <button 
                  onClick={() => setAuthMode(authMode === "login" ? "signup" : "login")}
                  className="text-sm text-violet-400 hover:text-violet-300 font-medium transition-colors"
                >
                  {authMode === "login" 
                    ? "New to SmartFit? Create an account" 
                    : "Already have an account? Sign in"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW: PRODUCT CATALOG */}
        {view === "products" && (
          <div className="animate-fade-in">
            
            {/* Redesigned Premium Hero Section */}
            <div className="relative glass-panel border-white/5 p-8 md:p-12 mb-12 overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-12 bg-gradient-to-br from-violet-950/20 via-slate-900/30 to-[#090a0f] rounded-3xl min-h-[30rem]">
              <div className="absolute top-0 right-0 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl -z-10"></div>
              <div className="absolute bottom-0 left-10 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl -z-10"></div>
              
              <div className="max-w-xl text-center lg:text-left space-y-6 flex-1">
                <span className="brand-subtitle px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 inline-block font-semibold tracking-wider text-xs">
                  ✨ Men's Collection 2026
                </span>
                <h2 className="brand-title text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-white">
                  Discover the future of <span className="gradient-text">dressing up</span>.
                </h2>
                <p className="text-gray-400 text-sm md:text-base leading-relaxed">
                  Experience seamless Virtual Try-On technology. Explore our curated collection of premium men's linen shirts, ethnic silk kurtas, bandhgala suits, and comfortable streetwear.
                </p>
                
                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                  <button 
                    onClick={() => {
                      document.getElementById("catalog-featured")?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="btn-primary py-3 px-8 text-sm font-semibold tracking-wide w-full sm:w-auto"
                  >
                    <span>Browse Collection</span>
                    <ArrowRight size={16} />
                  </button>
                  
                  <div className="flex items-center gap-6 text-xs text-gray-500 mt-2 sm:mt-0">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle size={14} className="text-emerald-500" />
                      <span>Free Shipping</span>
                    </div>
                    <div className="h-4 w-px bg-white/10"></div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle size={14} className="text-emerald-500" />
                      <span>Premium Weaves</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Campaign Visual Showcase */}
              <div className="hero-image-container shrink-0">
                <img 
                  src="/assets/hero_banner.png" 
                  alt="Luxury Fashion Campaign" 
                  className="hero-campaign-img" 
                />
                <div className="hero-image-mask" />
                
                {/* Floating promo badge/Visual element */}
                <div className="floating-coupon-card">
                  <div className="flex items-center gap-3">
                    <TrendingUp size={20} className="text-amber-400" />
                    <div className="text-left">
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Exclusive Voucher</h4>
                      <p className="text-sm font-bold text-white">Flat 10% Off</p>
                    </div>
                  </div>
                  <div className="h-8 w-px bg-white/10"></div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-500">Apply Code</p>
                    <p className="text-xs text-amber-400 font-bold font-mono tracking-wider">SMARTFIT10</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Why Vastra Tech Value Proposition Showcase */}
            <div className="why-vastra-section">
              <h3 className="why-vastra-title brand-title">
                The <span className="gradient-text-gold">SmartFit</span> Experience
              </h3>
              <div className="why-vastra-grid">
                <div className="why-card">
                  <div className="why-card-icon">
                    <Sparkles size={18} />
                  </div>
                  <h4 className="why-card-title">AR Live Try-On</h4>
                  <p className="why-card-desc">Visualize clothes aligned on your live camera stream with intelligent pose sizing scales.</p>
                </div>

                <div className="why-card">
                  <div className="why-card-icon">
                    <Grid size={18} />
                  </div>
                  <h4 className="why-card-title">Mannequin Stylist</h4>
                  <p className="why-card-desc">Mix, match, and overlay multiple clothing coordinates on realistic 3D body models.</p>
                </div>

                <div className="why-card">
                  <div className="why-card-icon">
                    <Ruler size={18} />
                  </div>
                  <h4 className="why-card-title">Diagnostics & Fit</h4>
                  <p className="why-card-desc">Advanced metrics calculations for BMI sizing estimates, color fidelity, and texture risk ratings.</p>
                </div>

                <div className="why-card">
                  <div className="why-card-icon">
                    <ShoppingBag size={18} />
                  </div>
                  <h4 className="why-card-title">Artisanal Curation</h4>
                  <p className="why-card-desc">Hand-selected selection of fine linens, pure ethnic silk, and premium weight cargoes.</p>
                </div>
              </div>
            </div>

            {/* Catalog Section Wrapper */}
            <div id="catalog-featured" className="space-y-6 scroll-mt-20">
              
              {/* Category Filter Bar */}
              <div className="category-filter-container">
                {["All", "Ethnic", "Casual", "Formal", "Activewear", "Accessories"].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`category-btn ${selectedCategory === cat ? "active" : ""}`}
                  >
                    {cat === "All" ? "✨ All Collection" : cat}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Tag size={18} className="text-violet-400" />
                  <span>Featured Products</span>
                </h3>
                <span className="text-xs text-gray-400 font-medium">
                  Showing {products.filter(p => selectedCategory === "All" || p.category === selectedCategory).length} items
                </span>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <Loader size={36} className="animate-spin text-violet-400" />
                  <p className="text-sm text-gray-400 font-medium">Curating clothing list...</p>
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-20 glass-panel border-dashed border-white/5 flex flex-col items-center">
                  <Package size={48} className="text-gray-600 mb-3" />
                  <p className="text-lg text-gray-400 font-semibold">No products available</p>
                  <p className="text-sm text-gray-500 mt-1 mb-6">The database catalog is currently empty. Go to the Admin Panel to seed a sample collection of 15 premium apparel items.</p>
                  <button 
                    onClick={() => setView("admin")}
                    className="btn-primary py-2.5 px-6 text-sm"
                  >
                    <Database size={16} />
                    <span>Go to Admin Panel</span>
                  </button>
                </div>
              ) : products.filter(p => selectedCategory === "All" || p.category === selectedCategory).length === 0 ? (
                <div className="text-center py-20 glass-panel border-dashed border-white/5 flex flex-col items-center">
                  <Package size={48} className="text-gray-600 mb-3" />
                  <p className="text-lg text-gray-400 font-semibold">No items match this category</p>
                  <p className="text-sm text-gray-500 mt-1 mb-6">There are no products in the "{selectedCategory}" category currently. Try selecting another filter.</p>
                  <button 
                    onClick={() => setSelectedCategory("All")}
                    className="btn-secondary py-2 px-6 text-sm"
                  >
                    <span>Clear Filter</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {products.filter(p => selectedCategory === "All" || p.category === selectedCategory).map((product) => (
                    <div 
                      key={product.id}
                      className="glass-panel glass-panel-hover flex flex-col justify-between overflow-hidden relative group"
                    >
                      {/* Floating Category Badge */}
                      <span className="absolute top-4 left-4 z-10 text-[10px] uppercase font-bold tracking-widest bg-violet-950/80 backdrop-blur border border-violet-500/30 text-violet-300 px-3 py-1 rounded-full">
                        {product.category || "Apparel"}
                      </span>

                      {/* Product Visual Area */}
                      <div className={`h-64 w-full flex flex-col items-center justify-center relative overflow-hidden border-b border-white/5 ${product.imageUrl ? "bg-white" : "bg-gradient-to-b from-[#181a25] to-[#12131a]"}`}>
                        {product.imageUrl ? (
                          <img 
                            src={product.imageUrl} 
                            alt={product.name} 
                            className="w-full h-full object-contain p-6 group-hover:scale-105 transition-transform duration-300" 
                          />
                        ) : (
                          <ShoppingBag size={72} className="text-gray-800 group-hover:scale-110 transition-transform duration-300" />
                        )}
                        
                        {/* Elegant Decorative Lines */}
                        <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-violet-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      </div>

                      {/* Product Metadata */}
                      <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-4">
                            <h4 className="text-lg font-bold text-white group-hover:text-violet-300 transition-colors">
                              {product.name}
                            </h4>
                            <span className="text-lg font-bold text-amber-400 shrink-0">
                              ₹{product.price.toLocaleString("en-IN")}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 line-clamp-3 leading-relaxed">
                            {product.description}
                          </p>
                        </div>
                        
                        <div className="flex gap-2.5 mt-2">
                          <button 
                            onClick={() => addToCart(product.id)}
                            className="btn-secondary flex-1 hover:bg-violet-600 hover:text-white hover:border-violet-500 transition-all py-2.5 text-sm flex items-center justify-center gap-2"
                          >
                            <ShoppingCart size={16} />
                            <span>Add to Cart</span>
                          </button>
                          
                          <button 
                            onClick={() => {
                              setActiveTryOnProduct(product);
                              setTryOnPhoto(null); // Reset photo to show model fallback initially
                            }}
                            className="btn-secondary px-3.5 hover:border-violet-500/50 hover:bg-violet-950/20 text-violet-300 transition-all"
                            title="Virtual Try-On"
                          >
                            <Sparkles size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW: ORDER HISTORY */}
        {view === "orders" && user && (
          <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Package size={20} className="text-violet-400" />
                <span>My Order History</span>
              </h3>
              <button 
                onClick={() => setView("products")} 
                className="text-xs text-violet-400 hover:text-violet-300 font-medium"
              >
                Back to Shop
              </button>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader size={36} className="animate-spin text-violet-400" />
                <p className="text-sm text-gray-400 font-medium">Fetching orders...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-20 glass-panel border-dashed border-white/5">
                <Package size={48} className="mx-auto text-gray-600 mb-3" />
                <p className="text-lg text-gray-400 font-semibold">No orders yet</p>
                <p className="text-sm text-gray-500 mt-1">Once you complete a purchase, your orders will appear here.</p>
                <button 
                  onClick={() => setView("products")}
                  className="btn-primary mx-auto mt-6 text-sm"
                >
                  Shop Now
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {orders.map((order) => (
                  <div key={order.id} className="glass-panel p-6 border-white/10 hover:border-white/15 transition-all">
                    
                    {/* Order Meta Header */}
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-white/5 mb-4">
                      <div className="space-y-1">
                        <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Order #{order.id}</p>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Calendar size={12} />
                          <span>{new Date(order.date).toLocaleDateString("en-IN", {
                            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="px-3 py-1 text-xs rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold uppercase tracking-wider">
                          {order.status || "Placed"}
                        </span>
                        <span className="text-base font-bold text-amber-400">
                          ₹{order.totalAmount.toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>

                    {/* Order Items */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-4 bg-white/5 border border-white/5 rounded-xl p-3">
                          <div className="w-10 h-10 rounded-lg border border-white/5 bg-[#12131c] overflow-hidden shrink-0 flex items-center justify-center">
                            {item.imageUrl ? (
                              <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain p-1 bg-white" />
                            ) : (
                              <ShoppingBag size={18} className="text-gray-500" />
                            )}
                          </div>
                          <div>
                            <h5 className="text-sm font-semibold text-white">{item.name}</h5>
                            <p className="text-xs text-amber-400 mt-0.5">₹{item.price.toLocaleString("en-IN")}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* VIEW: ADMIN PANEL */}
        {view === "admin" && (
          <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
            {/* Header section */}
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 border-b border-white/5 pb-6">
              <div>
                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Database className="text-violet-400" size={24} />
                  <span>Catalog & Dataset Manager</span>
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Create new custom listings, seed sample datasets, or clear the entire store inventory database.
                </p>
              </div>
              
              <button 
                onClick={() => setView("products")} 
                className="text-xs text-violet-400 hover:text-violet-300 font-semibold self-start md:self-auto"
              >
                Back to Collection
              </button>
            </div>

            {/* Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Form to Add Product (Left column, 5/12 span) */}
              <div className="lg:col-span-5 space-y-6">
                <div className="glass-panel p-6 border-white/10 relative overflow-hidden bg-gradient-to-br from-[#12141c]/90 to-[#090a0f]/90">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 to-indigo-600"></div>
                  
                  <h4 className="text-lg font-bold text-white mb-4">Add Custom Product</h4>
                  
                  <form onSubmit={handleAddProduct} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                        Product Name
                      </label>
                      <input 
                        type="text" 
                        placeholder="e.g. Classic Silk Kurta" 
                        className="glass-input"
                        value={newProductName}
                        onChange={(e) => setNewProductName(e.target.value)}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                          Price (₹)
                        </label>
                        <input 
                          type="number" 
                          placeholder="e.g. 1999" 
                          className="glass-input"
                          value={newProductPrice}
                          onChange={(e) => setNewProductPrice(e.target.value)}
                          required
                          min="1"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                          Category
                        </label>
                        <select 
                          className="glass-input"
                          style={{ appearance: 'none', background: 'rgba(255, 255, 255, 0.03)', color: '#fff' }}
                          value={newProductCategory}
                          onChange={(e) => setNewProductCategory(e.target.value)}
                        >
                          <option value="Ethnic" style={{background: '#12141c'}}>Ethnic</option>
                          <option value="Casual" style={{background: '#12141c'}}>Casual</option>
                          <option value="Formal" style={{background: '#12141c'}}>Formal</option>
                          <option value="Activewear" style={{background: '#12141c'}}>Activewear</option>
                          <option value="Accessories" style={{background: '#12141c'}}>Accessories</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                        Description
                      </label>
                      <textarea 
                        rows="3" 
                        placeholder="Write a compelling, premium description of the materials, weave, fit, and styling suggestions..." 
                        className="glass-input"
                        value={newProductDescription}
                        onChange={(e) => setNewProductDescription(e.target.value)}
                      ></textarea>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                        Product Image URL (Optional)
                      </label>
                      <input 
                        type="url" 
                        placeholder="https://images.unsplash.com/... or local path" 
                        className="glass-input"
                        value={newProductImageUrl}
                        onChange={(e) => setNewProductImageUrl(e.target.value)}
                      />
                    </div>

                    <button 
                      type="submit" 
                      disabled={adminLoading}
                      className="btn-primary w-full py-2.5 mt-2 flex items-center justify-center gap-2 text-sm"
                    >
                      {adminLoading ? (
                        <Loader size={16} className="animate-spin" />
                      ) : (
                        <>
                          <Plus size={16} />
                          <span>Add to Inventory</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>

              {/* Database Actions & Listings (Right column, 7/12 span) */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* Seed utilities */}
                <div className="glass-panel p-6 border-white/10 relative overflow-hidden bg-gradient-to-br from-[#12141c]/90 to-[#090a0f]/90">
                  <h4 className="text-lg font-bold text-white mb-2">Bulk Seeding Utilities</h4>
                  <p className="text-xs text-gray-400 mb-6">
                    Easily reset or seed the store with an elegant, handpicked collection of 15 premium Indian clothing products to demo immediately.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-4">
                    <button 
                      onClick={handleSeedProducts}
                      disabled={adminLoading}
                      className="btn-primary flex-1 py-2.5 flex items-center justify-center gap-2 text-sm text-center"
                    >
                      <RefreshCw size={16} className={adminLoading ? "animate-spin" : ""} />
                      <span>Seed Sample Dataset</span>
                    </button>

                    <button 
                      onClick={handleClearProducts}
                      disabled={adminLoading}
                      className="btn-secondary flex-1 py-2.5 border-red-500/10 hover:bg-red-950/20 text-red-400 flex items-center justify-center gap-2 text-sm text-center"
                    >
                      <Trash2 size={16} />
                      <span>Clear All Catalog</span>
                    </button>
                  </div>
                </div>

                {/* Listings summary table */}
                <div className="glass-panel p-6 border-white/10 bg-[#12141c]/40">
                  <h4 className="text-lg font-bold text-white mb-4 flex items-center justify-between">
                    <span>Active Inventory Dataset</span>
                    <span className="text-xs font-normal text-gray-500">
                      {products.length} Products
                    </span>
                  </h4>
                  
                  {products.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-white/5 rounded-xl">
                      <Package size={36} className="mx-auto text-gray-600 mb-2" />
                      <p className="text-sm text-gray-400 font-semibold">No products in database</p>
                      <p className="text-xs text-gray-500 mt-1">Use the seeding tool above or add products individually.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <div className="max-h-[350px] overflow-y-auto pr-1 space-y-3">
                        {products.map((p) => (
                          <div 
                            key={p.id} 
                            className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl hover:border-white/10 transition-colors gap-4"
                          >
                            <div className="w-9 h-9 rounded-lg border border-white/5 bg-[#090a0f] overflow-hidden shrink-0 flex items-center justify-center">
                              {p.imageUrl ? (
                                <img src={p.imageUrl} alt={p.name} className="w-full h-full object-contain p-1 bg-white" />
                              ) : (
                                <ShoppingBag size={16} className="text-gray-500" />
                              )}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h5 className="text-sm font-bold text-white truncate">{p.name}</h5>
                                <span className="text-[9px] uppercase font-semibold bg-violet-950/80 border border-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full shrink-0">
                                  {p.category}
                                </span>
                              </div>
                              <p className="text-xs text-amber-400 mt-0.5">₹{p.price.toLocaleString("en-IN")}</p>
                            </div>

                            <button 
                              onClick={() => handleDeleteProduct(p.id)}
                              disabled={adminLoading}
                              className="text-gray-500 hover:text-red-400 p-1.5 hover:bg-white/5 rounded-lg transition-colors shrink-0"
                              title="Delete from Catalog"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

              </div>

            </div>
          </div>
        )}

      </main>

      {/* Floating Cart Sidebar Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Overlay background */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsCartOpen(false)}
          ></div>

          {/* Drawer container */}
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md glass-panel rounded-l-2xl rounded-r-none border-y-0 border-r-0 border-white/10 flex flex-col justify-between shadow-2xl animate-fade-in bg-slate-950/95">
              
              {/* Drawer Header */}
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="text-violet-400" size={20} />
                  <h3 className="text-lg font-bold text-white">Your Shopping Cart</h3>
                </div>
                <button 
                  onClick={() => setIsCartOpen(false)}
                  className="text-gray-400 hover:text-white p-1 hover:bg-white/5 rounded-lg transition-colors text-sm font-medium"
                >
                  Close
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {cart.length === 0 ? (
                  <div className="text-center py-20 flex flex-col items-center">
                    <ShoppingCart size={48} className="text-gray-700 mb-3" />
                    <p className="text-base text-gray-400 font-semibold">Your cart is empty</p>
                    <p className="text-xs text-gray-500 mt-1 max-w-[200px] mx-auto">Explore our collection and add premium garments to your bag.</p>
                  </div>
                ) : (
                  aggregatedCart().map(({ product, quantity }) => (
                    <div 
                      key={product.id}
                      className="flex items-center justify-between p-3.5 bg-white/5 border border-white/5 rounded-xl gap-4 hover:border-white/10 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-lg border border-white/5 bg-[#12131c] overflow-hidden shrink-0 flex items-center justify-center">
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain p-1 bg-white" />
                        ) : (
                          <ShoppingBag size={18} className="text-gray-600" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-white truncate">{product.name}</h4>
                        <p className="text-xs text-amber-400 mt-0.5">₹{product.price.toLocaleString("en-IN")}</p>
                      </div>

                      {/* Quantity display / Add-Subtract buttons */}
                      <div className="flex items-center border border-white/10 rounded-lg overflow-hidden shrink-0">
                        <button 
                          onClick={() => removeFromCart(product.id)}
                          className="p-1.5 hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="px-3 text-xs font-bold text-white">
                          {quantity}
                        </span>
                        <button 
                          onClick={() => addToCart(product.id)}
                          className="p-1.5 hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
                        >
                          <Plus size={12} />
                        </button>
                      </div>

                      {/* Remove Entire Line Button */}
                      <button 
                        onClick={async () => {
                          // Clean all instances of this product from cart
                          for (let i = 0; i < quantity; i++) {
                            await axios.delete(`${API_BASE}/cart/${product.id}`, getAuthHeaders());
                          }
                          await fetchCart();
                        }}
                        className="text-gray-500 hover:text-red-400 p-1 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Drawer Footer */}
              {cart.length > 0 && (
                <div className="p-6 border-t border-white/5 bg-slate-900/50 space-y-4">
                  <div className="flex items-center justify-between text-sm font-medium">
                    <span className="text-gray-400">Subtotal ({cart.length} items)</span>
                    <span className="text-lg font-bold text-amber-400">₹{cartTotal.toLocaleString("en-IN")}</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-[11px] text-gray-500 bg-white/5 border border-white/5 p-3 rounded-lg">
                    <span>Applicable Taxes & Shipping</span>
                    <span className="font-semibold text-emerald-400">FREE</span>
                  </div>

                  {user ? (
                    <button 
                      onClick={placeOrder}
                      disabled={loading}
                      className="btn-primary w-full py-3 mt-2 flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <Loader size={18} className="animate-spin" />
                      ) : (
                        <>
                          <span>Place Order</span>
                          <CheckCircle size={18} />
                        </>
                      )}
                    </button>
                  ) : (
                    <button 
                      onClick={() => {
                        setIsCartOpen(false);
                        setView("auth");
                      }}
                      className="btn-primary w-full py-3 mt-2 flex items-center justify-center gap-2"
                    >
                      <span>Sign In to Checkout</span>
                      <ArrowRight size={18} />
                    </button>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      )}
      {/* VIEW: VIRTUAL TRY-ON MODAL */}
      {activeTryOnProduct && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 sm:p-6">
          {/* Overlay backdrop */}
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity"
            onClick={closeTryOn}
          ></div>

          {/* Modal Container */}
          <div className="relative w-full max-w-5xl glass-panel border-white/10 shadow-2xl overflow-hidden flex flex-col lg:flex-row bg-slate-950/95 max-h-[90vh] rounded-2xl">
            
            {/* Left Workspace Panel (Try-On Visual Canvas) */}
            <div className="flex-1 bg-[#090a0f] p-6 flex flex-col items-center justify-center relative border-b lg:border-b-0 lg:border-r border-white/5 min-h-[350px] lg:min-h-[500px] vto-canvas-panel">
              
              {/* Workspace Header */}
              <div className="absolute top-4 left-6 z-10 flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-widest bg-violet-950/80 backdrop-blur border border-violet-500/30 text-violet-300 px-3 py-1 rounded-full">
                  {tryOnMode === "ar-live" ? "AR Live Try-On" : "Mix & Match Fitting"}
                </span>
                {aiTryOnResult && (
                  <span className="text-[10px] uppercase font-bold tracking-widest bg-emerald-950/85 border border-emerald-500/30 text-emerald-300 px-3 py-1 rounded-full animate-pulse">
                    AI Fitted
                  </span>
                )}
              </div>

              {/* Try-On Interactive Area */}
              <div className="relative w-full max-w-sm aspect-[3/4] bg-[#12131c]/50 rounded-2xl border border-white/5 overflow-hidden flex items-center justify-center shadow-inner">
                
                {/* Calibration Grid */}
                {calibrationGrid && <div className="calibration-grid" />}

                {/* 1. Live Webcam Feed */}
                {tryOnMode === "ar-live" && isWebcamActive && !tryOnPhoto && (
                  <video 
                    ref={videoRef}
                    autoPlay 
                    playsInline 
                    className="absolute inset-0 w-full h-full object-cover -scale-x-100"
                    onLoadedMetadata={() => {
                      if (videoRef.current) videoRef.current.play();
                    }}
                  />
                )}

                {/* 1.5. Real-time Pose Tracking Skeleton Overlay Canvas */}
                {tryOnMode === "ar-live" && isWebcamActive && !tryOnPhoto && (
                  <canvas 
                    ref={trackingCanvasRef}
                    width={384}
                    height={512}
                    className="absolute inset-0 w-full h-full pointer-events-none z-10"
                  />
                )}

                {/* 2. Background Image (Mannequin or Uploaded/Captured Photo) */}
                {(!isWebcamActive || tryOnPhoto) && (
                  <div className="absolute inset-0 w-full h-full flex items-center justify-center">
                    {tryOnPhoto ? (
                      <img src={tryOnPhoto} alt="User Capture" className="w-full h-full object-cover" />
                    ) : selectedAvatar === "model-female" ? (
                      <div className="w-full h-full flex items-center justify-center bg-[#0d0e15] overflow-hidden relative">
                        <img 
                          src="/assets/female_avatar.png" 
                          alt="Female Model" 
                          className="h-full w-auto object-contain transition-all duration-300"
                          style={{ transform: `scale(${bmiScale})`, transformOrigin: 'center' }}
                        />
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-[#0d0e15] overflow-hidden relative">
                        <img 
                          src="/assets/male_avatar.png" 
                          alt="Male Model" 
                          className="h-full w-auto object-contain transition-all duration-300"
                          style={{ transform: `scale(${bmiScale})`, transformOrigin: 'center' }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Interactive Clothing Overlays (Mix-and-Match Support!) */}
                {mixMatchItems.map((item) => {
                  const config = overlayConfig[item.id] || { scale: 100, x: 0, y: 0, rotation: 0, opacity: 85 };
                  const isActive = activeOverlayItem?.id === item.id;
                  
                  return (
                    <div
                      key={item.id}
                      onMouseDown={(e) => {
                        setActiveOverlayItem(item);
                        handleDragStart(e);
                      }}
                      onMouseMove={handleDragMove}
                      onMouseUp={handleDragEnd}
                      onMouseLeave={handleDragEnd}
                      onTouchStart={(e) => {
                        setActiveOverlayItem(item);
                        const touch = e.touches[0];
                        setIsDragging(true);
                        setDragStart({ x: touch.clientX - overlayX, y: touch.clientY - overlayY });
                      }}
                      onTouchMove={(e) => {
                        if (!isDragging) return;
                        const touch = e.touches[0];
                        setOverlayX(touch.clientX - dragStart.x);
                        setOverlayY(touch.clientY - dragStart.y);
                      }}
                      onTouchEnd={handleDragEnd}
                      style={{
                        position: "absolute",
                        width: `${config.scale}%`,
                        height: `${config.scale}%`,
                        left: "50%",
                        top: "50%",
                        transform: `translate(calc(-50% + ${isActive ? overlayX : config.x}px), calc(-50% + ${isActive ? overlayY : config.y}px)) rotate(${isActive ? overlayRotation : config.rotation}deg)`,
                        opacity: (isActive ? overlayOpacity : config.opacity) / 100,
                        cursor: isDragging ? "grabbing" : "grab",
                        transition: isDragging ? "none" : "transform 0.1s ease, opacity 0.1s ease",
                        zIndex: isActive ? 20 : 10,
                      }}
                      className={`w-44 h-44 flex items-center justify-center select-none ${isActive ? "border border-dashed border-violet-400/50 rounded-xl" : ""}`}
                    >
                      {getProductOverlay(item.id, transparentImages)}
                    </div>
                  );
                })}

                {/* 4. Simulated AI Generation Blended Output overlay */}
                {aiTryOnResult && (
                  <div className="absolute inset-0 bg-violet-600/10 backdrop-blur-[1px] pointer-events-none border border-violet-500/30 animate-pulse flex items-center justify-center">
                    {/* Glowing highlight */}
                    <div className="absolute w-48 h-48 bg-violet-500/20 rounded-full blur-3xl"></div>
                  </div>
                )}

                {/* 5. Live Webcam Action Controls overlay */}
                {tryOnMode === "ar-live" && isWebcamActive && !tryOnPhoto && (
                  <button
                    onClick={() => capturePhoto(videoRef.current)}
                    className="absolute bottom-4 left-1/2 transform -translate-x-1/2 btn-primary py-2 px-5 text-xs shadow-xl flex items-center gap-1.5 bg-gradient-to-r from-violet-600 to-indigo-600"
                  >
                    <Camera size={14} />
                    <span>Capture Snapshot</span>
                  </button>
                )}

                {/* 6. Simulated AI Processing Loader Overlay */}
                {isAiGenerating && (
                  <div className="absolute inset-0 bg-slate-950/90 backdrop-blur flex flex-col items-center justify-center p-6 text-center space-y-4 animate-fade-in">
                    <Loader size={36} className="animate-spin text-violet-400" />
                    <p className="text-sm font-semibold text-white tracking-wide">Synthesizing Outfit fit...</p>
                    <p className="text-xs text-violet-300 font-mono tracking-wider animate-pulse">{aiGenerationStep}</p>
                    <div className="w-40 h-1 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-violet-500 rounded-full animate-pulse" style={{width: '60%'}}></div>
                    </div>
                  </div>
                )}

              </div>

              {/* Drag instruction helper label */}
              {mixMatchItems.length > 0 && !isAiGenerating && (
                <p className="text-[10px] text-gray-500 mt-3 select-none flex items-center gap-1">
                  <span>💡 Drag item on canvas to position, or click it to adjust size/rotation below.</span>
                </p>
              )}
            </div>

            {/* Right Controls Panel */}
            <div className="w-full lg:w-[420px] lg:shrink-0 p-6 flex flex-col justify-between overflow-y-auto max-h-[85vh] lg:max-h-[90vh] space-y-6 vto-controls-panel">
              
              {/* Title & Close Header */}
              <div className="flex items-start justify-between border-b border-white/5 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Sparkles className="text-violet-400" size={18} />
                    <span>SmartFit Try-On Lab</span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">Based on Virtual Try-On System frameworks.</p>
                </div>
                
                <button 
                  onClick={closeTryOn}
                  className="text-gray-400 hover:text-white p-1 hover:bg-white/5 rounded-lg transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Mode Selector Tabs (Mix-and-Match vs AR Live camera VTO) */}
              <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                <button
                  onClick={() => {
                    setTryOnMode("mix-match");
                    stopWebcam();
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all text-center ${tryOnMode === "mix-match" ? "bg-violet-600 text-white shadow-md shadow-violet-600/20" : "text-gray-400 hover:text-white"}`}
                >
                  Mannequin Mix & Match
                </button>
                <button
                  onClick={() => {
                    setTryOnMode("ar-live");
                    startWebcam();
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all text-center ${tryOnMode === "ar-live" ? "bg-violet-600 text-white shadow-md shadow-violet-600/20" : "text-gray-400 hover:text-white"}`}
                >
                  AR Live Camera
                </button>
              </div>

              {/* Research-Aligned VTO Tabs */}
              <div className="vto-tabs text-center">
                <button 
                  onClick={() => setVtoTab("personalize")}
                  className={`vto-tab-btn flex items-center justify-center gap-1 ${vtoTab === "personalize" ? "active" : ""}`}
                >
                  <User size={12} />
                  <span>1. Personalize</span>
                </button>
                <button 
                  onClick={() => setVtoTab("diagnostics")}
                  className={`vto-tab-btn flex items-center justify-center gap-1 ${vtoTab === "diagnostics" ? "active" : ""}`}
                >
                  <Ruler size={12} />
                  <span>2. Sizing & Fit</span>
                </button>
                <button 
                  onClick={() => setVtoTab("styling")}
                  className={`vto-tab-btn flex items-center justify-center gap-1 ${vtoTab === "styling" ? "active" : ""}`}
                >
                  <Sparkles size={12} />
                  <span>3. Lookbook</span>
                </button>
              </div>

              {/* TAB CONTENT: 1. PERSONALIZE */}
              {vtoTab === "personalize" && (
                <div className="space-y-5 animate-fade-in">
                  {/* Photo Input / Model options (For Mix-and-Match view) */}
                  {tryOnMode === "mix-match" && (
                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Model/Avatar Source</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => {
                            setSelectedAvatar("model-male");
                            setTryOnPhoto(null);
                          }}
                          className={`py-1.5 px-3 rounded-lg text-[11px] font-semibold border transition-all ${selectedAvatar === "model-male" && !tryOnPhoto ? "border-violet-500/50 bg-violet-950/20 text-violet-300" : "border-white/5 hover:bg-white/5 text-gray-400"}`}
                        >
                          Male Model
                        </button>
                        <label className="py-1.5 px-3 rounded-lg text-[11px] font-semibold border border-white/5 hover:bg-white/5 text-gray-400 text-center cursor-pointer flex items-center justify-center gap-1.5">
                          <Upload size={10} />
                          <span>Custom Photo</span>
                          <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Calibration Grid Toggle */}
                  <div className="flex items-center justify-between bg-white/5 border border-white/5 p-3 rounded-xl">
                    <div className="flex items-center gap-2">
                      <Grid size={14} className="text-violet-400" />
                      <span className="text-xs font-semibold text-gray-300">Calibration Grid Overlay</span>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={calibrationGrid}
                      onChange={(e) => setCalibrationGrid(e.target.checked)}
                      className="w-4 h-4 cursor-pointer accent-violet-500" 
                    />
                  </div>

                  {/* Skin Tone Selector */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Skin Tone Representation</label>
                    <div className="flex gap-4">
                      {['fair', 'wheatish', 'dusky', 'dark'].map((t) => (
                        <button
                          key={t}
                          onClick={() => setSkinTone(t)}
                          className={`skin-tone-btn ${skinTone === t ? "active" : ""}`}
                          style={{
                            backgroundColor: t === 'fair' ? '#ffe0bd' : t === 'wheatish' ? '#e0ac69' : t === 'dusky' ? '#8d5524' : '#5c2f13'
                          }}
                          title={t.charAt(0).toUpperCase() + t.slice(1)}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Body Shape Selector */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Body Silhouette Type</label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {['hourglass', 'pear', 'rectangle', 'athletic', 'round'].map((s) => (
                        <button
                          key={s}
                          onClick={() => setBodyShape(s)}
                          className={`shape-btn ${bodyShape === s ? "active" : ""}`}
                        >
                          {s.charAt(0).toUpperCase() + s.slice(1, 4)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Body Metrics Sliders */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[11px] text-gray-400">
                        <span>Height (cm)</span>
                        <span className="font-semibold text-white">{height}</span>
                      </div>
                      <input 
                        type="range" min="140" max="200" 
                        className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-violet-500"
                        value={height}
                        onChange={(e) => setHeight(Number(e.target.value))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[11px] text-gray-400">
                        <span>Weight (kg)</span>
                        <span className="font-semibold text-white">{weight}</span>
                      </div>
                      <input 
                        type="range" min="40" max="120" 
                        className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-violet-500"
                        value={weight}
                        onChange={(e) => setWeight(Number(e.target.value))}
                      />
                    </div>
                  </div>

                  {/* BMI & Recommended Size Summary Panel */}
                  <div className="flex items-center justify-between bg-gradient-to-r from-violet-950/20 to-indigo-950/25 border border-violet-500/10 p-3 rounded-xl">
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-gray-400">Calculated BMI</span>
                      <p className="text-sm font-bold text-white">{bmi} <span className="text-xs font-normal text-violet-300">({bmi < 18.5 ? "Underweight" : bmi < 25 ? "Normal" : bmi < 30 ? "Overweight" : "Obese"})</span></p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-semibold text-gray-400">Recommended Size</span>
                      <p className="text-base font-extrabold text-amber-400">{getRecommendedSize()}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB CONTENT: 2. SIZING & FIT DIAGNOSTICS */}
              {vtoTab === "diagnostics" && (
                <div className="space-y-5 animate-fade-in">
                  
                  {/* Purchase Confidence Index (PCI) Gauge */}
                  <div className="confidence-gauge-container">
                    <div className="confidence-gauge">
                      <svg className="w-full h-full" viewBox="0 0 36 36">
                        <path
                          className="stroke-white/5 fill-none"
                          strokeWidth="3.5"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className="stroke-violet-500 fill-none confidence-circle transition-all duration-500"
                          strokeDasharray={`${getConfidenceScore()}, 100`}
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <span className="absolute text-[11px] font-bold text-white">{getConfidenceScore()}%</span>
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-white">Purchase Confidence Index</h5>
                      <p className="text-[10px] text-gray-400 leading-tight">
                        {getConfidenceScore() < 60 
                          ? "Set your metrics and try on items to improve purchase decision comfort." 
                          : getConfidenceScore() < 80 
                          ? "Good progress. Customize garment sizing alignment for best fit confidence." 
                          : "Excellent match! Ideal fit diagnostics verified for checkout."}
                      </p>
                    </div>
                  </div>

                  {/* System & Library Diagnostics */}
                  <div className="space-y-3 border border-white/5 p-4 rounded-xl bg-[#090a0f]/50">
                    <h5 className="text-xs font-semibold text-violet-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Database size={13} />
                      <span>VTO Engine Diagnostics</span>
                    </h5>
                    <div className="grid grid-cols-2 gap-3 mt-2 text-xs">
                      {/* MediaPipe Pose */}
                      <div className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5">
                        <span className="text-gray-400">MediaPipe Pose</span>
                        {libStatuses.mediapipePose === "loaded" ? (
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-emerald-500"></span> Loaded
                          </span>
                        ) : libStatuses.mediapipePose === "checking" ? (
                          <span className="text-amber-400 font-medium flex items-center gap-1 animate-pulse">
                            Checking...
                          </span>
                        ) : (
                          <span className="text-red-400 font-semibold flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-red-500 animate-ping"></span> Failed
                          </span>
                        )}
                      </div>

                      {/* MediaPipe Camera */}
                      <div className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5">
                        <span className="text-gray-400">MP Camera Utils</span>
                        {libStatuses.mediapipeCamera === "loaded" ? (
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-emerald-500"></span> Loaded
                          </span>
                        ) : libStatuses.mediapipeCamera === "checking" ? (
                          <span className="text-amber-400 font-medium flex items-center gap-1 animate-pulse">
                            Checking...
                          </span>
                        ) : (
                          <span className="text-red-400 font-semibold flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-red-500 animate-ping"></span> Failed
                          </span>
                        )}
                      </div>

                      {/* OpenCV */}
                      <div className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5">
                        <span className="text-gray-400">OpenCV Engine</span>
                        {libStatuses.opencv === "loaded" ? (
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-emerald-500"></span> Loaded
                          </span>
                        ) : libStatuses.opencv === "checking" ? (
                          <span className="text-amber-400 font-medium flex items-center gap-1 animate-pulse">
                            Checking...
                          </span>
                        ) : (
                          <span className="text-red-400 font-semibold flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-red-500 animate-ping"></span> Failed
                          </span>
                        )}
                      </div>

                      {/* Webcam Stream */}
                      <div className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5">
                        <span className="text-gray-400">Camera Feed</span>
                        {webcamStream ? (
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-emerald-500"></span> Active
                          </span>
                        ) : (
                          <span className="text-gray-500 font-medium">Inactive</span>
                        )}
                      </div>
                    </div>

                    {/* Reload Button if any failed */}
                    {(libStatuses.mediapipePose === "failed" || libStatuses.mediapipeCamera === "failed" || libStatuses.opencv === "failed") && (
                      <button
                        onClick={() => {
                          setLibStatuses({ mediapipePose: "checking", mediapipeCamera: "checking", opencv: "checking" });
                          setTimeout(() => {
                            if (!window.Pose) loadScript("https://unpkg.com/@mediapipe/pose/pose.js", "Pose", "mediapipePose");
                            else setLibStatuses(p => ({ ...p, mediapipePose: "loaded" }));
                            
                            if (!window.Camera) loadScript("https://unpkg.com/@mediapipe/camera_utils/camera_utils.js", "Camera", "mediapipeCamera");
                            else setLibStatuses(p => ({ ...p, mediapipeCamera: "loaded" }));
                            
                            if (!window.cv) loadScript("https://unpkg.com/@techstark/opencv-js@4.9.0-release.2/dist/opencv.js", "cv", "opencv");
                            else setLibStatuses(p => ({ ...p, opencv: "loaded" }));
                          }, 500);
                        }}
                        className="w-full mt-2 py-1.5 rounded-lg bg-red-950/20 border border-red-500/20 text-red-300 hover:bg-red-900/30 hover:text-white transition-all text-[11px] font-semibold text-center flex items-center justify-center gap-1.5"
                      >
                        <RefreshCw size={11} />
                        <span>Force Reload Missing Engines</span>
                      </button>
                    )}
                  </div>

                  {/* Active Overlay Item Fit adjustments */}
                  {activeOverlayItem ? (
                    <div className="space-y-4 border border-white/5 p-4 rounded-xl bg-white/5">
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs font-semibold text-violet-400 uppercase tracking-wider">
                          Adjust {activeOverlayItem.name} fit
                        </h5>
                        <button
                          onClick={() => {
                            setOverlayScale(100);
                            setOverlayX(0);
                            setOverlayY(0);
                            setOverlayRotation(0);
                            setOverlayOpacity(85);
                            setOverlayConfig(prev => ({
                              ...prev,
                              [activeOverlayItem.id]: { scale: 100, x: 0, y: 0, rotation: 0, opacity: 85 }
                            }));
                          }}
                          className="text-[10px] text-gray-500 hover:text-white underline"
                        >
                          Reset Fit
                        </button>
                      </div>

                      {/* Sizing scale Slider */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px] text-gray-400">
                          <span>Garment Sizing</span>
                          <span>{overlayScale}%</span>
                        </div>
                        <input 
                          type="range" 
                          min="30" 
                          max="250" 
                          className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-violet-500"
                          value={overlayScale}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setOverlayScale(val);
                            setOverlayConfig(prev => ({
                              ...prev,
                              [activeOverlayItem.id]: { ...prev[activeOverlayItem.id], scale: val }
                            }));
                          }}
                        />
                      </div>

                      {/* Rotation Slider */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px] text-gray-400">
                          <span>Rotation angle</span>
                          <span>{overlayRotation}°</span>
                        </div>
                        <input 
                          type="range" 
                          min="-180" 
                          max="180" 
                          className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-violet-500"
                          value={overlayRotation}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setOverlayRotation(val);
                            setOverlayConfig(prev => ({
                              ...prev,
                              [activeOverlayItem.id]: { ...prev[activeOverlayItem.id], rotation: val }
                            }));
                          }}
                        />
                      </div>

                      {/* Opacity Slider */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px] text-gray-400">
                          <span>Fabric Opacity</span>
                          <span>{overlayOpacity}%</span>
                        </div>
                        <input 
                          type="range" 
                          min="10" 
                          max="100" 
                          className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-violet-500"
                          value={overlayOpacity}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setOverlayOpacity(val);
                            setOverlayConfig(prev => ({
                              ...prev,
                              [activeOverlayItem.id]: { ...prev[activeOverlayItem.id], opacity: val }
                            }));
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 border border-dashed border-white/5 rounded-xl text-gray-500 bg-white/5">
                      <p className="text-xs">Select or drag a garment on canvas to adjust sizing fit.</p>
                    </div>
                  )}

                  {/* Active Item Risk Assessment Breakdown */}
                  {activeOverlayItem && (() => {
                    const risk = getRiskBreakdown(activeOverlayItem);
                    return (
                      <div className="space-y-3 border border-white/5 p-4 rounded-xl bg-[#090a0f]/50">
                        <h5 className="text-xs font-semibold text-violet-400 uppercase tracking-wider flex items-center gap-1">
                          <HelpCircle size={12} />
                          <span>Fit & Risk Analysis ({activeOverlayItem.name})</span>
                        </h5>
                        <div className="space-y-2 mt-2 text-xs">
                          <div>
                            <div className="flex justify-between items-center font-medium">
                              <span className="text-gray-400">Silhouette Risk</span>
                              <span className={`risk-badge ${risk.silhouette.startsWith("Low") ? "risk-low" : "risk-medium"}`}>{risk.silhouette.startsWith("Low") ? "Low" : "Med"}</span>
                            </div>
                            <p className="text-[10px] text-gray-500 mt-0.5">{risk.silhouette}</p>
                          </div>
                          <div className="h-px bg-white/5"></div>
                          <div>
                            <div className="flex justify-between items-center font-medium">
                              <span className="text-gray-400">Color Fidelity Risk</span>
                              <span className={`risk-badge ${risk.color.startsWith("Very Low") || risk.color.startsWith("Low") ? "risk-low" : "risk-medium"}`}>Low</span>
                            </div>
                            <p className="text-[10px] text-gray-500 mt-0.5">{risk.color}</p>
                          </div>
                          <div className="h-px bg-white/5"></div>
                          <div>
                            <div className="flex justify-between items-center font-medium">
                              <span className="text-gray-400">Fabric Feel & Care</span>
                              <span className={`risk-badge ${risk.texture.startsWith("Low") ? "risk-low" : "risk-medium"}`}>{risk.texture.startsWith("Low") ? "Low" : "Med"}</span>
                            </div>
                            <p className="text-[10px] text-gray-500 mt-0.5">{risk.texture}</p>
                          </div>
                          <div className="h-px bg-white/5"></div>
                          <div>
                            <div className="flex justify-between items-center font-medium">
                              <span className="text-gray-400">Fit & Size Concern</span>
                              <span className={`risk-badge ${risk.fitConcern.startsWith("Low") ? "risk-low" : "risk-medium"}`}>{risk.fitConcern.startsWith("Low") ? "Low" : "Med"}</span>
                            </div>
                            <p className="text-[10px] text-gray-500 mt-0.5">{risk.fitConcern}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* TAB CONTENT: 3. STYLE PRESETS & LOOKBOOK */}
              {vtoTab === "styling" && (
                <div className="space-y-4 animate-fade-in">
                  
                  {/* Style Presets */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Style Inspiration coordinates</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => handleApplyPreset("festive")} className="occasion-btn">✨ Festive Ethnic</button>
                      <button onClick={() => handleApplyPreset("casual")} className="occasion-btn">🛹 Street Casual</button>
                      <button onClick={() => handleApplyPreset("formal")} className="occasion-btn">👔 Elegant Formal</button>
                      <button onClick={() => handleApplyPreset("summer")} className="occasion-btn">🍃 Summer Cotton</button>
                    </div>
                  </div>

                  {/* Active selections item list checkboxes */}
                  <div className="space-y-2 border-t border-white/5 pt-3">
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Active Coordinates Select ({mixMatchItems.length})</label>
                    <div className="max-h-[120px] overflow-y-auto pr-1 border border-white/5 rounded-xl bg-[#090a0f]/50 p-2 space-y-1.5">
                      {products.map((p) => {
                        const isSelected = mixMatchItems.some(item => item.id === p.id);
                        return (
                          <div 
                            key={p.id}
                            className={`flex items-center justify-between p-1.5 rounded-lg border transition-all cursor-pointer ${isSelected ? "border-violet-500/40 bg-violet-950/15" : "border-transparent hover:bg-white/5"}`}
                            onClick={() => {
                              if (isSelected) {
                                const updated = mixMatchItems.filter(item => item.id !== p.id);
                                setMixMatchItems(updated);
                                if (activeOverlayItem?.id === p.id) {
                                  setActiveOverlayItem(updated[0] || null);
                                }
                              } else {
                                const updated = [...mixMatchItems, p];
                                setMixMatchItems(updated);
                                setActiveOverlayItem(p);
                                setOverlayConfig(prev => ({
                                  ...prev,
                                  [p.id]: { scale: 100, x: 0, y: 0, rotation: 0, opacity: 85 }
                                }));
                              }
                            }}
                          >
                            <span className="text-xs font-medium text-white truncate max-w-[200px]">{p.name}</span>
                            <span className="text-[9px] uppercase tracking-wider bg-white/5 border border-white/10 text-gray-400 px-2 py-0.5 rounded-full shrink-0">
                              {p.category}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Save Outfit Form */}
                  <div className="space-y-2 border-t border-white/5 pt-3">
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Save Current Look</label>
                    <form onSubmit={handleSaveLook} className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="e.g. My Festive Vibe"
                        className="glass-input py-1.5 px-3 text-xs flex-1"
                        value={lookName}
                        onChange={(e) => setLookName(e.target.value)}
                      />
                      <button type="submit" className="btn-primary py-1.5 px-4 text-xs shrink-0">
                        <Save size={12} />
                        <span>Save</span>
                      </button>
                    </form>
                  </div>

                  {/* Saved Lookbook List */}
                  <div className="space-y-2 border-t border-white/5 pt-3">
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">My Saved Lookbook ({lookbook.length})</label>
                    {lookbook.length === 0 ? (
                      <p className="text-[11px] text-gray-500 italic">No saved looks yet.</p>
                    ) : (
                      <div className="max-h-[150px] overflow-y-auto pr-1 space-y-2">
                        {lookbook.map((look) => (
                          <div key={look.id} className="lookbook-item">
                            <div className="min-w-0 flex-1 pr-2">
                              <p className="text-xs font-bold text-white truncate">{look.name}</p>
                              <p className="text-[9px] text-gray-500">
                                {look.items.length} items • {look.bodyShape} • {look.height}cm
                              </p>
                            </div>
                            <div className="flex gap-1.5 shrink-0">
                              <button 
                                onClick={() => handleLoadLook(look)} 
                                className="text-[10px] bg-white/5 border border-white/5 hover:border-violet-500/30 text-violet-300 hover:text-white px-2 py-1 rounded transition-colors"
                              >
                                Load
                              </button>
                              <button 
                                onClick={() => handleAddLookToCart(look.items)} 
                                className="text-[10px] bg-violet-600/10 border border-violet-500/20 hover:bg-violet-600 text-white px-2 py-1 rounded transition-colors"
                              >
                                Add Look
                              </button>
                              <button 
                                onClick={() => handleDeleteLook(look.id)} 
                                className="text-[10px] bg-red-950/20 border border-red-500/10 hover:bg-red-500 hover:text-white text-red-200 p-1.5 rounded transition-colors"
                              >
                                <Trash2 size={10} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Seeding, AI Try-On & Social Share buttons */}
              <div className="border-t border-white/5 pt-4 space-y-3">
                <div className="flex gap-2">
                  <button
                    onClick={handleRunAiTryOn}
                    disabled={isAiGenerating || mixMatchItems.length === 0}
                    className="btn-primary flex-1 py-2.5 flex items-center justify-center gap-2 text-xs font-semibold bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 shadow-lg shadow-violet-500/20"
                  >
                    <Sparkles size={14} className={isAiGenerating ? "animate-spin" : ""} />
                    <span>AI Try-On</span>
                  </button>
                  <button
                    onClick={handleOpenShare}
                    disabled={mixMatchItems.length === 0}
                    className="btn-secondary py-2.5 px-4 text-xs flex items-center justify-center gap-2"
                    title="Share Look Review"
                  >
                    <Share2 size={14} />
                    <span>Share Look</span>
                  </button>
                </div>
                <p className="text-[10px] text-gray-500 text-center leading-relaxed">
                  Uses simulated AI fitting models to map garments to body structures, matching color tones and fabric drapes.
                </p>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* VIEW: SHARE LOOK MODAL */}
      {activeShareLook && (
        <div className="share-modal-overlay animate-fade-in">
          <div className="share-modal-card p-6 space-y-6">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Share2 className="text-violet-400" size={18} />
                <h4 className="text-sm font-bold text-white">Share Outfit Summary</h4>
              </div>
              <button 
                onClick={() => setActiveShareLook(null)}
                className="text-gray-400 hover:text-white p-1 hover:bg-white/5 rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Look Details Display Card */}
            <div className="bg-[#12131c] border border-white/5 p-4 rounded-xl space-y-4">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h5 className="text-sm font-bold text-white">{activeShareLook.name}</h5>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Profile: {activeShareLook.height}cm • {activeShareLook.weight}kg • {activeShareLook.bodyShape}
                  </p>
                </div>
                <div className="bg-violet-950/40 border border-violet-500/30 text-violet-300 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shrink-0">
                  PCI: {activeShareLook.pci}%
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                {activeShareLook.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-white/5 border border-white/5 p-2 rounded-lg gap-2 text-xs">
                    <span className="text-white truncate font-medium">{item.name}</span>
                    <span className="text-amber-400 font-bold shrink-0">₹{item.price.toLocaleString("en-IN")}</span>
                  </div>
                ))}
              </div>

              {/* Mock QR code and info */}
              <div className="flex items-center gap-4 bg-white/5 border border-white/5 p-3 rounded-lg">
                <div className="bg-white p-1.5 rounded-lg shrink-0">
                  <svg className="w-12 h-12 stroke-black fill-black" viewBox="0 0 24 24">
                    <path d="M 2,2 L 8,2 L 8,8 L 2,8 Z M 3,3 L 7,3 L 7,7 L 3,7 Z M 4,4 L 6,4 L 6,6 L 4,6 Z" />
                    <path d="M 16,2 L 22,2 L 22,8 L 16,8 Z M 17,3 L 21,3 L 21,7 L 17,7 Z M 18,4 L 20,4 L 20,6 L 18,6 Z" />
                    <path d="M 2,16 L 8,16 L 8,22 L 2,22 Z M 3,17 L 7,17 L 7,21 L 3,21 Z M 4,18 L 6,18 L 6,20 L 4,20 Z" />
                    <path d="M 11,2 H 13 V 4 H 11 Z M 11,6 H 13 V 10 H 11 Z M 2,11 H 6 V 13 H 2 Z M 8,11 H 10 V 15 H 8 Z M 14,14 H 16 V 16 H 14 Z M 17,11 H 22 V 13 H 17 Z M 12,17 H 15 V 22 H 12 Z M 18,18 H 21 V 21 H 18 Z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-gray-300">Scan to view try-on look</p>
                  <p className="text-[9px] text-gray-500 leading-tight">Your friends can scan this QR code or use the share link to load this custom profile on their browser.</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(`http://localhost:5173/share-look?items=${activeShareLook.items.map(item => item.id).join(",")}&height=${activeShareLook.height}&weight=${activeShareLook.weight}&shape=${activeShareLook.bodyShape}`);
                  showSuccess("Shareable outfit link copied to clipboard!");
                }}
                className="btn-primary flex-1 py-2 flex items-center justify-center gap-1.5 text-xs font-semibold"
              >
                <Share2 size={12} />
                <span>Copy Shareable Link</span>
              </button>
              <button 
                onClick={() => {
                  showSuccess("Summary image downloaded (simulation)!");
                }}
                className="btn-secondary py-2 px-5 text-xs font-semibold"
              >
                <span>Save Image</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-auto py-8 border-t border-white/5 glass-panel rounded-none border-x-0 border-b-0">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <div>
            <p className="font-semibold text-gray-400">© 2026 SMARTFIT Ready to Wear. All rights reserved.</p>
          </div>
          <div className="flex items-center gap-6">
            <span className="hover:text-gray-300 cursor-pointer">Terms of Service</span>
            <span className="hover:text-gray-300 cursor-pointer">Privacy Policy</span>
            <span className="hover:text-gray-300 cursor-pointer">Contact Support</span>
          </div>
        </div>
      </footer>

    </div>
  );
}



const getProductOverlay = (id, transparentImages = {}) => {
  const cachedSrc = transparentImages[id];
  if (cachedSrc) {
    return <img src={cachedSrc} alt="Garment Overlay" className="w-full h-full object-contain" />;
  }

  switch(Number(id)) {
    case 1: // Silk Kurta
      return <img src="/assets/silk_kurta.png" alt="Silk Kurta" className="w-full h-full object-contain mix-blend-multiply" />;
    case 2: // Hoodie
      return <img src="/assets/hoodie.png" alt="Streetwear Hoodie" className="w-full h-full object-contain mix-blend-multiply" />;
    case 3: // Saree
      return <img src="/assets/saree.png" alt="Cotton Saree" className="w-full h-full object-contain mix-blend-multiply" />;
    case 4: // Linen Shirt
      return <img src="/assets/linen_shirt.png" alt="Linen Shirt" className="w-full h-full object-contain mix-blend-multiply" />;
    case 5: // Denim Jacket
      return <img src="/assets/denim_jacket.png" alt="Denim Jacket" className="w-full h-full object-contain mix-blend-multiply" />;
    case 6: // Dress
      return <img src="/assets/floral_dress.png" alt="Flowy Floral Dress" className="w-full h-full object-contain mix-blend-multiply" />;
    case 7: // Bandhgala Suit
      return <img src="/assets/bandhgala.png" alt="Bandhgala Suit" className="w-full h-full object-contain mix-blend-multiply" />;
    case 8: // Khadi Blazer
      return <img src="/assets/bandhgala.png" alt="Khadi Blazer" className="w-full h-full object-contain mix-blend-multiply" />;
    case 9: // Polo Tee
      return <img src="/assets/polo_tee.png" alt="Polo Tee" className="w-full h-full object-contain mix-blend-multiply" />;
    case 10: // Joggers
      return <img src="/assets/joggers.png" alt="Athletic Joggers" className="w-full h-full object-contain mix-blend-multiply" />;
    case 11: // Mojaris
      return <img src="/assets/mojaris.png" alt="Mojaris Shoes" className="w-full h-full object-contain mix-blend-multiply" />;
    case 12: // Anarkali
      return <img src="/assets/silk_kurta.png" alt="Anarkali Gown" className="w-full h-full object-contain mix-blend-multiply" />;
    case 13: // Cargoes
      return <img src="/assets/joggers.png" alt="Utility Cargoes" className="w-full h-full object-contain mix-blend-multiply" />;
    case 14: // Jhumkas
      return <img src="/assets/jhumkas.png" alt="Brass Jhumka Earrings" className="w-full h-full object-contain mix-blend-multiply" />;
    case 15: // Shawl
      return <img src="/assets/shawl.png" alt="Premium Woolen Shawl" className="w-full h-full object-contain mix-blend-multiply" />;
    default:
      return <img src="/assets/silk_kurta.png" alt="Garment Overlay" className="w-full h-full object-contain mix-blend-multiply" />;
  }
};

export default App;
