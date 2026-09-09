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
const usersFilePath = path.join(dataDir, 'users.json');
const applicationsFilePath = path.join(dataDir, 'agent_applications.json');

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

// JSON File Helpers
const readJsonFile = (filePath, fallback = []) => {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2));
      return fallback;
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
    return fallback;
  }
};

const writeJsonFile = (filePath, data) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error(`Error saving ${filePath}:`, err);
    return false;
  }
};

// ==========================================
// 1. AUTHENTICATION ENDPOINTS
// ==========================================

// POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  }

  const users = readJsonFile(usersFilePath);
  const user = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());

  if (!user || user.password !== password) {
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  }

  // Return user info without password
  const { password: _, ...userInfo } = user;
  res.json({
    success: true,
    message: `Logged in as ${user.role === 'admin' ? 'Main Admin' : 'House Agent'}`,
    user: userInfo
  });
});

// GET /api/auth/users (for Admin view)
app.get('/api/auth/users', (req, res) => {
  const users = readJsonFile(usersFilePath);
  const safeUsers = users.map(({ password, ...rest }) => rest);
  res.json({ success: true, count: safeUsers.length, data: safeUsers });
});

// ==========================================
// 2. BECOME A HOUSE AGENT (APPLICATIONS)
// ==========================================

// POST /api/agent-applications (Public user applies to become an agent)
app.post('/api/agent-applications', (req, res) => {
  try {
    const { fullName, email, phone, area, experience, password } = req.body;

    if (!fullName || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Full name, email, and phone number are required.'
      });
    }

    const applications = readJsonFile(applicationsFilePath);

    // Check if application with email already exists
    const existing = applications.find(a => a.email.toLowerCase() === email.trim().toLowerCase());
    if (existing && existing.status === 'pending') {
      return res.status(400).json({
        success: false,
        message: 'An application with this email is already pending Main Admin review.'
      });
    }

    const newApplication = {
      id: `app-${Date.now()}`,
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      area: (area || 'City Student Hub').trim(),
      experience: (experience || 'Student PG Agent candidate').trim(),
      password: password || 'agent123',
      status: 'pending', // 'pending' | 'approved' | 'rejected'
      createdAt: new Date().toISOString()
    };

    applications.unshift(newApplication);
    writeJsonFile(applicationsFilePath, applications);

    res.status(201).json({
      success: true,
      message: 'Your application has been submitted successfully! The Main Admin will review and approve your account.',
      data: newApplication
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error submitting application', error: err.message });
  }
});

// GET /api/agent-applications (Main Admin reviews all applications)
app.get('/api/agent-applications', (req, res) => {
  const applications = readJsonFile(applicationsFilePath);
  res.json({ success: true, count: applications.length, data: applications });
});

// PATCH /api/agent-applications/:id (Main Admin accepts or rejects)
app.patch('/api/agent-applications/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'approve' | 'reject'

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Action must be "approve" or "reject"' });
    }

    const applications = readJsonFile(applicationsFilePath);
    const appIndex = applications.findIndex(a => a.id === id);

    if (appIndex === -1) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    const application = applications[appIndex];
    application.status = action === 'approve' ? 'approved' : 'rejected';
    application.reviewedAt = new Date().toISOString();
    applications[appIndex] = application;
    writeJsonFile(applicationsFilePath, applications);

    // If approved, create or activate their House Agent account in users.json
    if (action === 'approve') {
      const users = readJsonFile(usersFilePath);
      const existingUserIndex = users.findIndex(u => u.email.toLowerCase() === application.email.toLowerCase());

      const agentAccount = {
        id: `user-agent-${Date.now()}`,
        name: application.fullName,
        email: application.email,
        password: application.password || 'agent123',
        role: 'agent',
        phone: application.phone,
        area: application.area,
        createdAt: new Date().toISOString()
      };

      if (existingUserIndex >= 0) {
        users[existingUserIndex].role = 'agent';
        users[existingUserIndex].name = application.fullName;
        users[existingUserIndex].phone = application.phone;
      } else {
        users.push(agentAccount);
      }

      writeJsonFile(usersFilePath, users);
    }

    res.json({
      success: true,
      message: `Agent application ${action === 'approve' ? 'Approved & Activated' : 'Rejected'} successfully`,
      data: application
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error processing application', error: err.message });
  }
});

// ==========================================
// 3. ROOM LISTINGS & STATUS MANAGEMENT
// ==========================================

// GET all listings
app.get('/api/listings', (req, res) => {
  const listings = readJsonFile(listingsFilePath);
  res.json({ success: true, count: listings.length, data: listings });
});

// PATCH /api/listings/:id/status (Main Admin or Agent updates room status)
app.patch('/api/listings/:id/status', (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'available' | 'occupied' | 'reserved'

    if (!['available', 'occupied', 'reserved'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Allowed values: available, occupied, reserved'
      });
    }

    const listings = readJsonFile(listingsFilePath);
    const index = listings.findIndex(l => l.id === id);

    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Room listing not found' });
    }

    listings[index].status = status;
    listings[index].statusUpdatedAt = new Date().toISOString();
    writeJsonFile(listingsFilePath, listings);

    res.json({
      success: true,
      message: `Room status updated to ${status}`,
      data: listings[index]
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error updating room status', error: err.message });
  }
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
        status = 'available',
        landlordAtPG,
        electricityBackup,
        acRoom,
        waterGeyser,
        latitude,
        longitude,
        address,
        customCategories,
        videoUrl: fallbackVideoUrl,
        imageUrl: fallbackImageUrl,
        agentId,
        agentName
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
      if (!calculatedPriceGroup || calculatedPriceGroup === 'auto') {
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
        status: ['available', 'occupied', 'reserved'].includes(status) ? status : 'available',
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
        agentId: agentId || 'user-admin-1',
        agentName: agentName || 'UniStay Housing Desk',
        createdAt: new Date().toISOString()
      };

      const listings = readJsonFile(listingsFilePath);
      listings.unshift(newListing);
      writeJsonFile(listingsFilePath, listings);

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

// DELETE a listing (Agent or Admin)
app.delete('/api/listings/:id', (req, res) => {
  try {
    const { id } = req.params;
    let listings = readJsonFile(listingsFilePath);
    const existing = listings.find(l => l.id === id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Listing not found' });
    }
    listings = listings.filter(l => l.id !== id);
    writeJsonFile(listingsFilePath, listings);
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
