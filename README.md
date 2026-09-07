# UniStay - Student Housing & PG Agent Portal

A full-stack student housing platform designed specifically for housing agents to list affordable rooms and PGs with video walkthrough tours, GPS location pins on interactive maps, custom pricing tiers, and student-focused amenity filters.

---

## 🌟 Key Features

1. **Room Video Walkthrough Tours**:
   - Upload MP4/WebM room videos directly via the agent dashboard into `public/uploads/videos/`.
   - Floating Picture-in-Picture (PiP) and immersive video player modal for virtual student walkthroughs.
   - Videos are stored in the local repository and ready for Git commit and deployment.

2. **Interactive GPS Location Pinning (Leaflet & OpenStreetMap)**:
   - Every room is pinned to its GPS coordinates with custom price markers (e.g. `₹3.2k`).
   - Interactive map pin picker when adding a new room (click anywhere on the map or use the **"My Location"** GPS detector).
   - Three view modes: **Rooms Grid**, **Split View** (Scrollable listings + sticky live map), and **Map View**.

3. **Custom Pricing Grouping & Student Budgeting**:
   - **Pocket-Friendly** (< ₹4,000 / mo)
   - **Standard Student PG** (₹4,000 - ₹7,000 / mo)
   - **Comfort / AC** (> ₹7,000 / mo)
   - Max rent range slider with instant filtering.
   - **Interactive Student Budget Calculator** widget (calculates Rent + Monthly Electricity Unit consumption).

4. **Dedicated Student Amenities & Checkboxes**:
   - 🏠 **Landlord at PG** (Students can filter for "No Landlord" for complete independence).
   - ⚡ **Electricity Backup available** (Inverter / Generator for uninterrupted study hours).
   - ❄️ **AC Room** (Air-conditioned rooms).
   - 🚿 **Water Geyser** (Hot water bathroom facility).
   - ⚡ **Electricity Per Unit Amount** (e.g. `₹8.0/unit` clearly displayed on every card for transparent billing).

5. **Dynamic & Adaptive Floating Widgets**:
   - **Floating View Switcher** (`Rooms` | `Split Map` | `Map View`).
   - **Floating Budget Calculator** (Rent + Units × Unit Rate).
   - **Floating WhatsApp Agent Connect** with pre-filled inquiry messages.
   - **Agent Management Modal** for uploading video tours, images, setting GPS pins, and adding custom tags (e.g., *Single Room, Attached Washroom, Walking to Metro, Boys/Girls PG*).

---

## 🚀 Getting Started

### 1. Start Full Application (Backend + Frontend)
```bash
npm run dev
```
- **Frontend**: `http://localhost:5173`
- **Backend API**: `http://localhost:5000`

### 2. Start Services Individually
- **Backend Server only**:
  ```bash
  npm run server
  ```
- **Vite Client only**:
  ```bash
  npm run client
  ```

---

## 📁 Project Structure

```
├── public/
│   └── uploads/          # Video tours and room photos
│       ├── videos/
│       └── images/
├── server/
│   ├── data/
│   │   └── listings.json # Persistent room listings storage
│   └── index.js          # Express API server (Multer upload + REST endpoints)
├── src/
│   ├── components/
│   │   ├── AddRoomModal.jsx          # Agent upload & GPS pin picker
│   │   ├── FilterBar.jsx             # Budget tiers & student checkboxes
│   │   ├── FloatingAgentWidget.jsx   # WhatsApp, View Switcher & Calculator
│   │   ├── MapView.jsx               # Interactive Leaflet map with GPS pins
│   │   ├── Navbar.jsx                # Search, stats & Add Room button
│   │   ├── RoomCard.jsx              # Room card with video tour & unit rates
│   │   └── VideoPlayerModal.jsx      # Video walkthrough & PiP player
│   ├── App.jsx                       # Main application coordinator
│   ├── index.css                     # Tailwind CSS & custom pin styling
│   └── main.jsx                      # React entry
├── package.json
└── vite.config.js
```
