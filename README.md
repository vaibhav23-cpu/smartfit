# SmartFit VTO - Virtual Try-On for Men's Apparel

SmartFit is a modern, premium web application designed to enable real-time virtual fitting and try-on experiences exclusively for Men's clothing categories. By leveraging computer vision and body tracking libraries directly in the browser, SmartFit maps apparel overlays onto the user's pose dynamically and blends them with high-fidelity transparency.

---

## 🚀 Key Features

*   **AR Live Webcam Try-On**: Real-time clothing alignment on the user's live video stream.
*   **Mannequin Fitting Workspace**: Allows users to mix-and-match clothes, drag items, scale proportions, adjust opacity, and fit items on a digital avatar.
*   **Dynamic Body Silhouette Controls**: Adjust height, weight, skin tone, and body silhouette types (Hourglass, Pear, Rectangle, Athletic, Round) to calculate BMI and receive intelligent sizing recommendations (S/M/L/XL).
*   **Close-Up Face-Landmark Fallback**: Robust upper-body positioning that estimates shoulder coordinates and garment scaling using ear and eye landmarks when the user is too close to the lens or shoulders are cropped.
*   **Real-time Segmentation Skeleton Canvas**: Draws a glowing neon-violet joint skeleton tracking line directly over the webcam feed to visualize alignment coordinates.
*   **Double-Insurance Image Transparency**: 
    1.  *Dynamic Canvas Processing*: An offscreen HTML5 canvas removes solid white backgrounds programmatically upon clothing activation to generate true alpha transparency.
    2.  *CSS Blend mode fallback*: Adds native `.mix-blend-multiply` styling to prevent solid backgrounds from obscuring the webcam background.

---

## 🛠️ Tech Stack

*   **Frontend**: React.js (Vite), Tailwind CSS, Lucide Icons.
*   **Computer Vision**: MediaPipe Pose, OpenCV.js, HTML5 Canvas API.
*   **Backend**: Node.js, Express.js.
*   **Database**: LowDB (JSON file-based synchronous database storage).

---

## 📦 Directory Structure

```text
├── backend/            # Express API server & LowDB database
│   ├── db.json        # 15 Men's apparel catalog database
│   ├── server.js      # Backend endpoints & database seeder
│   └── package.json
├── frontend/           # React SPA frontend
│   ├── public/        # High-res transparent clothing assets & avatars
│   ├── src/
│   │   ├── App.jsx    # Central VTO fitting engine & state controls
│   │   ├── index.css  # Core layout styles
│   │   └── main.jsx
│   └── package.json
└── README.md
```

---

## ⚙️ Installation & Setup

### 1. Prerequisites
Make sure you have Node.js installed on your machine.

### 2. Backend Installation
Navigate to the `backend` folder, install dependencies, and start the server:
```bash
cd backend
npm install
npm start
```
*The backend API server will run on port `5000`.*

### 3. Frontend Installation
Open a new terminal window, navigate to the `frontend` folder, install dependencies, and start the Vite dev server:
```bash
cd frontend
npm install
npm run dev
```
*The frontend application will start on port `5173`.*

### 4. Database Seeding (Admin Dashboard)
To populate the catalog with the 15 Men's collection items, click **Admin Panel** on the navigation bar, or run this PowerShell command in your terminal:
```powershell
Invoke-RestMethod -Uri http://localhost:5000/products/seed -Method Post
```

---

## 📬 Pushing Updates to GitHub

To push the latest updates to your repository, run the following Git commands in the project root directory:

```bash
# Add new README and code changes
git add README.md
git commit -m "docs: create project README with installation & system setup details"

# Push to your main branch
git push origin main
```
