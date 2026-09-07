import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Ensure directories exist
const dataDir = path.join(__dirname, 'data');
const listingsFilePath = path.join(dataDir, 'listings.json');
const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
const videoUploadsDir = path.join(uploadsDir, 'videos');
const imageUploadsDir = path.join(uploadsDir, 'images');

[dataDir, uploadsDir, videoUploadsDir, imageUploadsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Setup multer for handling video & photo uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.mimetype.startsWith('video/')) {
      cb(null, videoUploadsDir);
    } else {
      cb(null, imageUploadsDir);
    }
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || '';
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 150 * 1024 * 1024 // 150MB limit for room video tour
  }
});

app.use(cors());
app.use(express.json());

// Serve static uploads
app.use('/uploads', express.static(uploadsDir));

// Helper: read listings
const getListings = () => {
  try {
    if (!fs.existsSync(listingsFilePath)) {
      fs.writeFileSync(listingsFilePath, JSON.stringify([]));
      return [];
    }
    const data = fs.readFileSync(listingsFilePath, 'utf8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error('Error reading listings:', err);
    return [];
  }
};

// Helper: write listings
const saveListings = (listings) => {
  try {
    fs.writeFileSync(listingsFilePath, JSON.stringify(listings, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error saving listings:', err);
    return false;
  }
};

// GET all listings
app.get('/api/listings', (req, res) => {
  const listings = getListings();
  res.json({ success: true, count: listings.length, data: listings });
});

// POST new listing with video and image upload support
app.post(
  '/api/listings',
  upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'image', maxCount: 1 }
  ]),
  (req, res) => {
    try {
      const {
        title,
        description,
        rentAmount,
        electricityPerUnit,
        priceGroup,
        landlordAtPG,
        electricityBackup,
        acRoom,
        waterGeyser,
        latitude,
        longitude,
        address,
        customCategories,
        videoUrl: fallbackVideoUrl,
        imageUrl: fallbackImageUrl
      } = req.body;

      if (!title || !rentAmount) {
        return res.status(400).json({ success: false, message: 'Title and Rent amount are required' });
      }

      // Check uploaded files or fallback URLs
      let finalVideoUrl = '';
      if (req.files && req.files['video'] && req.files['video'][0]) {
        finalVideoUrl = `/uploads/videos/${req.files['video'][0].filename}`;
      } else if (fallbackVideoUrl) {
        finalVideoUrl = fallbackVideoUrl;
      }

      let finalImages = [];
      if (req.files && req.files['image'] && req.files['image'][0]) {
        finalImages.push(`/uploads/images/${req.files['image'][0].filename}`);
      } else if (fallbackImageUrl) {
        finalImages.push(fallbackImageUrl);
      } else {
        // Fallback placeholder image
        finalImages.push('https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80');
      }

      // Parse custom categories
      let parsedCategories = [];
      if (Array.isArray(customCategories)) {
        parsedCategories = customCategories;
      } else if (typeof customCategories === 'string') {
        parsedCategories = customCategories
          .split(',')
          .map(c => c.trim())
          .filter(Boolean);
      }

      // Automatically determine price group if not specified
      const rentNum = parseFloat(rentAmount);
      let calculatedPriceGroup = priceGroup;
      if (!calculatedPriceGroup) {
        if (rentNum < 4000) calculatedPriceGroup = 'budget';
        else if (rentNum <= 7000) calculatedPriceGroup = 'standard';
        else calculatedPriceGroup = 'premium';
      }

      const newListing = {
        id: `house-${Date.now()}`,
        title: title.trim(),
        description: (description || '').trim(),
        rentAmount: rentNum,
        electricityPerUnit: parseFloat(electricityPerUnit) || 8.0,
        priceGroup: calculatedPriceGroup,
        landlordAtPG: landlordAtPG === 'true' || landlordAtPG === true,
        electricityBackup: electricityBackup === 'true' || electricityBackup === true,
        acRoom: acRoom === 'true' || acRoom === true,
        waterGeyser: waterGeyser === 'true' || waterGeyser === true,
        latitude: parseFloat(latitude) || 28.5355,
        longitude: parseFloat(longitude) || 77.2090,
        address: (address || 'Near Student University Hub').trim(),
        videoUrl: finalVideoUrl,
        images: finalImages,
        customCategories: parsedCategories,
        createdAt: new Date().toISOString()
      };

      const listings = getListings();
      listings.unshift(newListing);
      saveListings(listings);

      res.status(201).json({
        success: true,
        message: 'Room listing added successfully',
        data: newListing
      });
    } catch (err) {
      console.error('Error creating listing:', err);
      res.status(500).json({ success: false, message: 'Server error adding listing', error: err.message });
    }
  }
);

// DELETE a listing
app.delete('/api/listings/:id', (req, res) => {
  try {
    const { id } = req.params;
    let listings = getListings();
    const existing = listings.find(l => l.id === id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Listing not found' });
    }
    listings = listings.filter(l => l.id !== id);
    saveListings(listings);
    res.json({ success: true, message: 'Listing deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error deleting listing', error: err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Housing Agent Server running on http://localhost:${PORT}`);
});
