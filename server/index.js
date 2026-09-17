import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Configure Cloudinary for permanent cloud video & image storage
const isCloudinaryConfigured = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
  console.log(`[Cloudinary] Connected to cloud: ${process.env.CLOUDINARY_CLOUD_NAME}`);
} else {
  console.log('[Cloudinary] Missing credentials, using local disk uploads.');
}

// Cloudinary upload helper
const uploadFileToCloudinary = async (localFilePath, resourceType = 'auto', folder = 'unistay_rooms') => {
  if (!isCloudinaryConfigured || !fs.existsSync(localFilePath)) {
    return null;
  }
  try {
    const uploadResult = await cloudinary.uploader.upload(localFilePath, {
      resource_type: resourceType,
      folder: folder,
      chunk_size: 6000000
    });
    // Remove local temp file after cloud upload succeeds
    try {
      if (fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath);
      }
    } catch (e) {
      console.warn('Could not remove temporary local upload:', e.message);
    }
    return uploadResult.secure_url;
  } catch (err) {
    console.error(`[Cloudinary] Upload failed for ${localFilePath}:`, err);
    return null;
  }
};

// Ensure directories exist
const dataDir = path.join(__dirname, 'data');
const listingsFilePath = path.join(dataDir, 'listings.json');
const usersFilePath = path.join(dataDir, 'users.json');
const applicationsFilePath = path.join(dataDir, 'agent_applications.json');
const deleteRequestsFilePath = path.join(dataDir, 'delete_requests.json');

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
      fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2), 'utf8');
      return fallback;
    }
    let data = fs.readFileSync(filePath, 'utf8');
    if (data) {
      data = data.replace(/^\uFEFF/, '').trim();
    }
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

// Helper: normalize phone string
const cleanPhone = (str) => {
  if (!str) return '';
  return String(str).replace(/[^\d]/g, '');
};

const isPhoneMatch = (p1, p2) => {
  const d1 = cleanPhone(p1);
  const d2 = cleanPhone(p2);
  if (!d1 || !d2) return false;
  if (d1 === d2) return true;
  // If at least 10 digits, compare the last 10 digits (handles country code prefixes like 91 or +91)
  if (d1.length >= 10 && d2.length >= 10) {
    return d1.slice(-10) === d2.slice(-10);
  }
  return false;
};

// ==========================================
// SESSION & TOKEN REVOCATION SYSTEM
// ==========================================

// Session token generation helper
const generateSessionToken = (userId, version) => {
  const randomPart = Math.random().toString(36).substring(2, 12) + Math.random().toString(36).substring(2, 12);
  return `agt_sess_${userId}_v${version}_${Date.now()}_${randomPart}`;
};

// Extract token from request headers or query
const extractToken = (req) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  if (req.headers['x-session-token']) {
    return String(req.headers['x-session-token']).trim();
  }
  if (req.query && req.query.token) {
    return String(req.query.token).trim();
  }
  return null;
};

// Server-side Authorization Middleware:
// Validates token against database, detects suspension or removal, and enforces immediate revocation
const requireAuth = (req, res, next) => {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({
      success: false,
      code: 'UNAUTHORIZED',
      message: 'Authentication required. Please log in.'
    });
  }

  // Parse token format: agt_sess_<userId>_v<version>_...
  let tokenUserId = null;
  const match = token.match(/^agt_sess_(.+?)_v(\d+)_/);
  if (match) {
    tokenUserId = match[1];
  }

  const users = readJsonFile(usersFilePath);
  // Find user by current active sessionToken or by token userId
  let user = users.find(u => u.sessionToken === token);
  if (!user && tokenUserId) {
    user = users.find(u => u.id === tokenUserId);
  }

  // If user does not exist in database (deleted)
  if (!user) {
    return res.status(401).json({
      success: false,
      code: 'ACCOUNT_REMOVED',
      message: 'Your agent account has been removed by the Main Admin.'
    });
  }

  // Check if agent status is 'removed'
  if (user.status === 'removed') {
    return res.status(403).json({
      success: false,
      code: 'ACCOUNT_REMOVED',
      message: 'Your agent account has been removed by the Main Admin.'
    });
  }

  // Check if agent is currently suspended
  if (user.role === 'agent' && user.status === 'suspended') {
    const now = new Date();
    const until = user.suspendedUntil ? new Date(user.suspendedUntil) : null;
    if (until && until > now) {
      return res.status(403).json({
        success: false,
        code: 'ACCOUNT_SUSPENDED',
        status: 'suspended',
        suspendedUntil: user.suspendedUntil,
        reason: user.suspensionReason || 'Violation of housing guidelines',
        message: `Your agent account is suspended until ${until.toLocaleString()}. Reason: ${user.suspensionReason || 'Violation of housing guidelines'}. Contact Main Admin (+91 9041543868).`
      });
    } else {
      // Suspension expired: auto-reactivate account
      user.status = 'active';
      delete user.suspendedUntil;
      delete user.suspensionReason;
      delete user.suspendedAt;
      writeJsonFile(usersFilePath, users);
    }
  }

  // Check if session token matches current active session (version revocation check)
  if (user.sessionToken !== token) {
    return res.status(401).json({
      success: false,
      code: 'SESSION_REVOKED',
      message: 'Your session was revoked due to an account update or password reset. Please log in again.'
    });
  }

  req.user = user;
  next();
};

// Admin-only guard middleware
const requireAdmin = (req, res, next) => {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        code: 'ADMIN_ONLY',
        message: 'Access restricted to Main Admin only.'
      });
    }
    next();
  });
};

// ==========================================
// 1. AUTHENTICATION ENDPOINTS (Phone-First)
// ==========================================

// POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) {
    return res.status(400).json({ success: false, message: 'Phone number and password are required' });
  }

  const users = readJsonFile(usersFilePath);
  const userIndex = users.findIndex(u => isPhoneMatch(u.phone, phone));

  if (userIndex === -1) {
    // Check if user is a pending or rejected agent applicant
    const applications = readJsonFile(applicationsFilePath);
    const applicant = applications.find(a => isPhoneMatch(a.phone, phone));

    if (applicant) {
      if (applicant.status === 'pending') {
        return res.status(403).json({
          success: false,
          status: 'pending_approval',
          code: 'PENDING_APPROVAL',
          message: 'Waiting for Admin approval maximum time 2hrs. Your credentials are under review.'
        });
      } else if (applicant.status === 'rejected') {
        return res.status(403).json({
          success: false,
          status: 'rejected',
          code: 'APPLICATION_REJECTED',
          message: 'Your agent application was reviewed and not approved by Main Admin.'
        });
      }
    }

    return res.status(401).json({ success: false, message: 'Invalid phone number or password' });
  }

  const user = users[userIndex];

  // Check if agent was removed
  if (user.status === 'removed') {
    return res.status(403).json({
      success: false,
      status: 'removed',
      code: 'ACCOUNT_REMOVED',
      message: 'This agent account has been removed by the Main Admin.'
    });
  }

  if (user.password !== password) {
    return res.status(401).json({ success: false, message: 'Invalid phone number or password' });
  }

  // Check if agent is currently suspended
  if (user.role === 'agent' && user.status === 'suspended') {
    const now = new Date();
    const until = user.suspendedUntil ? new Date(user.suspendedUntil) : null;
    
    // If suspension is still active
    if (until && until > now) {
      return res.status(403).json({
        success: false,
        status: 'suspended',
        code: 'ACCOUNT_SUSPENDED',
        suspendedUntil: user.suspendedUntil,
        reason: user.suspensionReason || 'Violation of portal guidelines',
        message: `Your agent account is suspended until ${until.toLocaleString()}. Reason: ${user.suspensionReason || 'Violation of portal guidelines'}. Contact Main Admin (+91 9041543868).`
      });
    } else {
      // Suspension expired: auto-reactivate account
      user.status = 'active';
      delete user.suspendedUntil;
      delete user.suspensionReason;
      delete user.suspendedAt;
    }
  }

  // Generate new session token & increment version
  const newVersion = (user.tokenVersion || 0) + 1;
  const sessionToken = generateSessionToken(user.id, newVersion);

  user.tokenVersion = newVersion;
  user.sessionToken = sessionToken;
  user.lastLoginAt = new Date().toISOString();

  users[userIndex] = user;
  writeJsonFile(usersFilePath, users);

  // Return user info and session token (without password)
  const { password: _pw, sessionToken: _tok, ...userInfo } = user;
  res.json({
    success: true,
    message: `Logged in as ${user.role === 'admin' ? 'Main Admin' : 'House Agent'}`,
    token: sessionToken,
    user: {
      ...userInfo,
      tokenVersion: newVersion
    }
  });
});

// GET /api/auth/verify-session (Live status and session version check for active browser)
app.get('/api/auth/verify-session', requireAuth, (req, res) => {
  const { password: _pw, sessionToken: _tok, ...safeUser } = req.user;
  res.json({
    success: true,
    status: safeUser.status || 'active',
    user: safeUser
  });
});

// GET /api/auth/users
app.get('/api/auth/users', (req, res) => {
  const users = readJsonFile(usersFilePath);
  const safeUsers = users
    .filter(u => u.status !== 'removed')
    .map(({ password, sessionToken, ...rest }) => rest);
  res.json({ success: true, count: safeUsers.length, data: safeUsers });
});

// ==========================================
// 2. BECOME A HOUSE AGENT (APPLICATIONS)
// ==========================================

// POST /api/agent-applications
app.post('/api/agent-applications', (req, res) => {
  try {
    const { fullName, phone, area, experience, password } = req.body;

    if (!fullName || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Full name and phone number are required.'
      });
    }

    const cleanInput = cleanPhone(phone);
    if (cleanInput.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid phone number.'
      });
    }

    // Check if user is already an active user
    const users = readJsonFile(usersFilePath);
    const existingUser = users.find(u => isPhoneMatch(u.phone, phone));
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: existingUser.role === 'admin'
          ? 'This phone number belongs to the Main Admin. Please sign in directly.'
          : 'An active House Agent account already exists for this phone number. Please sign in directly.'
      });
    }

    const applications = readJsonFile(applicationsFilePath);
    const existingAppIndex = applications.findIndex(a => isPhoneMatch(a.phone, phone));

    if (existingAppIndex >= 0) {
      const existingApp = applications[existingAppIndex];
      if (existingApp.status === 'pending') {
        return res.status(400).json({
          success: false,
          message: 'An application with this phone number is already pending Main Admin review. Maximum review time: 2 hours.'
        });
      } else {
        // Re-apply if previously rejected
        existingApp.fullName = fullName.trim();
        existingApp.phone = phone.trim();
        existingApp.area = (area || 'City Student Hub').trim();
        existingApp.experience = (experience || 'Student PG Agent candidate').trim();
        existingApp.password = password || existingApp.password || 'agent123';
        existingApp.status = 'pending';
        existingApp.createdAt = new Date().toISOString();
        delete existingApp.reviewedAt;

        applications[existingAppIndex] = existingApp;
        writeJsonFile(applicationsFilePath, applications);

        return res.status(200).json({
          success: true,
          message: 'Your application has been submitted for Main Admin approval. Waiting for Admin approval maximum time 2hrs.',
          data: existingApp
        });
      }
    }

    const newApplication = {
      id: `app-${Date.now()}`,
      fullName: fullName.trim(),
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
      message: 'Your application has been submitted successfully! Waiting for Admin approval maximum time 2hrs.',
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
      const existingUserIndex = users.findIndex(u => isPhoneMatch(u.phone, application.phone));

      const agentAccount = {
        id: `user-agent-${Date.now()}`,
        name: application.fullName,
        phone: application.phone,
        password: application.password || 'agent123',
        role: 'agent',
        area: application.area,
        createdAt: new Date().toISOString()
      };

      if (existingUserIndex >= 0) {
        users[existingUserIndex].role = 'agent';
        users[existingUserIndex].name = application.fullName;
        if (application.password) users[existingUserIndex].password = application.password;
        if (application.area) users[existingUserIndex].area = application.area;
      } else {
        users.push(agentAccount);
      }

      writeJsonFile(usersFilePath, users);
    } else if (action === 'reject') {
      // If rejected, remove any active agent account so they cannot log in
      const users = readJsonFile(usersFilePath);
      const updatedUsers = users.filter(u => !(isPhoneMatch(u.phone, application.phone) && u.role !== 'admin'));
      writeJsonFile(usersFilePath, updatedUsers);
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
// 2B. MANAGE REGISTERED AGENTS (ADMIN ONLY)
// ==========================================

// GET /api/admin/agents (Get all registered agents with active/suspended status and room count)
app.get('/api/admin/agents', (req, res) => {
  try {
    const users = readJsonFile(usersFilePath);
    const listings = readJsonFile(listingsFilePath);
    const now = new Date();

    let modified = false;
    const agents = users
      .filter(u => u.role === 'agent' && u.status !== 'removed')
      .map(u => {
        // Auto-check expired suspension
        if (u.status === 'suspended' && u.suspendedUntil && new Date(u.suspendedUntil) <= now) {
          u.status = 'active';
          delete u.suspendedUntil;
          delete u.suspensionReason;
          delete u.suspendedAt;
          modified = true;
        }

        const agentPhone = cleanPhone(u.phone);
        const roomCount = listings.filter(l => {
          if (l.agentId && l.agentId === u.id) return true;
          if (l.agentPhone && cleanPhone(l.agentPhone) === agentPhone) return true;
          return false;
        }).length;

        const { password: _, ...safeAgent } = u;
        return {
          ...safeAgent,
          status: safeAgent.status || 'active',
          roomCount
        };
      });

    if (modified) {
      writeJsonFile(usersFilePath, users);
    }

    res.json({ success: true, count: agents.length, data: agents });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching agents', error: err.message });
  }
});

// PATCH /api/admin/agents/:id/suspend (Suspend agent for specified duration)
app.patch('/api/admin/agents/:id/suspend', (req, res) => {
  try {
    const { id } = req.params;
    const { durationHours, reason } = req.body;

    const hours = parseFloat(durationHours);
    if (isNaN(hours) || hours <= 0) {
      return res.status(400).json({ success: false, message: 'Valid duration in hours is required' });
    }

    const users = readJsonFile(usersFilePath);
    const agentIndex = users.findIndex(u => u.id === id && u.role === 'agent');

    if (agentIndex === -1) {
      return res.status(404).json({ success: false, message: 'Agent not found' });
    }

    const suspendedUntil = new Date(Date.now() + hours * 3600 * 1000).toISOString();
    const suspensionReason = (reason || 'Misconduct or violation of housing guidelines').trim();

    users[agentIndex].status = 'suspended';
    users[agentIndex].suspendedUntil = suspendedUntil;
    users[agentIndex].suspensionReason = suspensionReason;
    users[agentIndex].suspendedAt = new Date().toISOString();
    // Invalidate active browser session immediately (version += 1)
    users[agentIndex].tokenVersion = (users[agentIndex].tokenVersion || 1) + 1;
    delete users[agentIndex].sessionToken;

    writeJsonFile(usersFilePath, users);

    const { password: _pw, sessionToken: _tok, ...safeAgent } = users[agentIndex];
    res.json({
      success: true,
      message: `Agent ${safeAgent.name} suspended until ${new Date(suspendedUntil).toLocaleString()}`,
      data: safeAgent
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error suspending agent', error: err.message });
  }
});

// PATCH /api/admin/agents/:id/unsuspend (Lift suspension immediately)
app.patch('/api/admin/agents/:id/unsuspend', (req, res) => {
  try {
    const { id } = req.params;
    const users = readJsonFile(usersFilePath);
    const agentIndex = users.findIndex(u => u.id === id && u.role === 'agent');

    if (agentIndex === -1) {
      return res.status(404).json({ success: false, message: 'Agent not found' });
    }

    users[agentIndex].status = 'active';
    delete users[agentIndex].suspendedUntil;
    delete users[agentIndex].suspensionReason;
    delete users[agentIndex].suspendedAt;
    // Version increment ensures old suspended tokens remain revoked
    users[agentIndex].tokenVersion = (users[agentIndex].tokenVersion || 1) + 1;
    delete users[agentIndex].sessionToken;

    writeJsonFile(usersFilePath, users);

    const { password: _pw, sessionToken: _tok, ...safeAgent } = users[agentIndex];
    res.json({
      success: true,
      message: `Suspension lifted for agent ${safeAgent.name}. Account is now active.`,
      data: safeAgent
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error lifting suspension', error: err.message });
  }
});

// DELETE /api/admin/agents/:id (Permanently remove agent account and revoke session)
app.delete('/api/admin/agents/:id', (req, res) => {
  try {
    const { id } = req.params;
    const users = readJsonFile(usersFilePath);
    const agentIndex = users.findIndex(u => u.id === id);

    if (agentIndex === -1) {
      return res.status(404).json({ success: false, message: 'Agent not found' });
    }

    const agentToDelete = users[agentIndex];

    if (agentToDelete.role === 'admin') {
      return res.status(403).json({ success: false, message: 'Main Admin account cannot be deleted' });
    }

    // Mark as status: 'removed', increment version, and invalidate session token
    users[agentIndex].status = 'removed';
    users[agentIndex].removedAt = new Date().toISOString();
    users[agentIndex].tokenVersion = (users[agentIndex].tokenVersion || 1) + 1;
    delete users[agentIndex].sessionToken;

    writeJsonFile(usersFilePath, users);

    // Also update agent_applications.json so it is marked rejected/removed
    const applications = readJsonFile(applicationsFilePath);
    const updatedApps = applications.map(a => {
      if (isPhoneMatch(a.phone, agentToDelete.phone)) {
        return { ...a, status: 'rejected', reviewedAt: new Date().toISOString() };
      }
      return a;
    });
    writeJsonFile(applicationsFilePath, updatedApps);

    res.json({
      success: true,
      message: `Agent ${agentToDelete.name} (${agentToDelete.phone}) has been removed. All active sessions revoked.`,
      data: { id: agentToDelete.id, name: agentToDelete.name, phone: agentToDelete.phone, status: 'removed' }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error deleting agent', error: err.message });
  }
});

// ==========================================
// 3. ROOM LISTINGS & STATUS MANAGEMENT
// ==========================================

// GET all listings
app.get('/api/listings', (req, res) => {
  const listings = readJsonFile(listingsFilePath);
  const deleteRequests = readJsonFile(deleteRequestsFilePath);
  const pendingListingIds = new Set(
    deleteRequests.filter(r => r.status === 'pending').map(r => r.listingId)
  );
  const listingsWithStatus = listings.map(l => ({
    ...l,
    hasPendingDeleteRequest: pendingListingIds.has(l.id)
  }));
  res.json({ success: true, count: listingsWithStatus.length, data: listingsWithStatus });
});

// PATCH /api/listings/:id/status (Main Admin or Agent updates room status)
app.patch('/api/listings/:id/status', requireAuth, (req, res) => {
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

    // Permission check: Admin can update any listing; Agent can only update their own listings
    if (req.user.role !== 'admin' && listings[index].agentId !== req.user.id && !isPhoneMatch(listings[index].agentPhone, req.user.phone)) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'You can only update status for your own room listings.'
      });
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

// POST new listing with video, photo, and Landlord Contact info
app.post(
  '/api/listings',
  requireAuth,
  upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'image', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const {
        title,
        description,
        rentAmount,
        electricityPerUnit,
        priceGroup,
        status = 'available',
        landlordAtPG,
        landlordName,
        landlordPhone,
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

      let finalVideoUrl = '';
      if (req.files && req.files['video'] && req.files['video'][0]) {
        const videoFile = req.files['video'][0];
        // Stream video directly to Cloudinary for permanent hosting
        const cloudVideoUrl = await uploadFileToCloudinary(videoFile.path, 'video', 'unistay_rooms/videos');
        if (cloudVideoUrl) {
          finalVideoUrl = cloudVideoUrl;
          console.log(`[Cloudinary] Video tour stored permanently at: ${cloudVideoUrl}`);
        } else {
          finalVideoUrl = `/uploads/videos/${videoFile.filename}`;
        }
      } else if (fallbackVideoUrl) {
        finalVideoUrl = fallbackVideoUrl;
      }

      let finalImages = [];
      if (req.files && req.files['image'] && req.files['image'][0]) {
        const imageFile = req.files['image'][0];
        // Stream image to Cloudinary
        const cloudImageUrl = await uploadFileToCloudinary(imageFile.path, 'image', 'unistay_rooms/images');
        if (cloudImageUrl) {
          finalImages.push(cloudImageUrl);
          console.log(`[Cloudinary] Cover photo stored permanently at: ${cloudImageUrl}`);
        } else {
          finalImages.push(`/uploads/images/${imageFile.filename}`);
        }
      } else if (fallbackImageUrl) {
        finalImages.push(fallbackImageUrl);
      } else {
        finalImages.push('https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80');
      }

      let parsedCategories = [];
      if (Array.isArray(customCategories)) {
        parsedCategories = customCategories;
      } else if (typeof customCategories === 'string') {
        parsedCategories = customCategories
          .split(',')
          .map(c => c.trim())
          .filter(Boolean);
      }

      const rentNum = parseFloat(rentAmount);
      let calculatedPriceGroup = priceGroup;
      if (!calculatedPriceGroup || calculatedPriceGroup === 'auto') {
        if (rentNum < 4000) calculatedPriceGroup = 'budget';
        else if (rentNum <= 7000) calculatedPriceGroup = 'standard';
        else calculatedPriceGroup = 'premium';
      }

      // Enforce verified agent identity from server-side authenticated session
      const finalAgentId = req.user.role === 'admin' ? (agentId || req.user.id) : req.user.id;
      const finalAgentName = req.user.role === 'admin' ? (agentName || req.user.name) : req.user.name;
      const finalAgentPhone = req.user.phone || '';

      const newListing = {
        id: `house-${Date.now()}`,
        title: title.trim(),
        description: (description || '').trim(),
        rentAmount: rentNum,
        electricityPerUnit: parseFloat(electricityPerUnit) || 8.0,
        priceGroup: calculatedPriceGroup,
        status: ['available', 'occupied', 'reserved'].includes(status) ? status : 'available',
        landlordAtPG: landlordAtPG === 'true' || landlordAtPG === true,
        landlordName: (landlordName || '').trim(),
        landlordPhone: (landlordPhone || '').trim(),
        electricityBackup: electricityBackup === 'true' || electricityBackup === true,
        acRoom: acRoom === 'true' || acRoom === true,
        waterGeyser: waterGeyser === 'true' || waterGeyser === true,
        latitude: parseFloat(latitude) || 28.5355,
        longitude: parseFloat(longitude) || 77.2090,
        address: (address || 'Near Student University Hub').trim(),
        videoUrl: finalVideoUrl,
        images: finalImages,
        customCategories: parsedCategories,
        agentId: finalAgentId,
        agentName: finalAgentName,
        agentPhone: finalAgentPhone,
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

// DELETE a listing (Main Admin or Listing Owner)
app.delete('/api/listings/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    let listings = readJsonFile(listingsFilePath);
    const existing = listings.find(l => l.id === id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Listing not found' });
    }

    // Permission check
    if (req.user.role !== 'admin' && existing.agentId !== req.user.id && !isPhoneMatch(existing.agentPhone, req.user.phone)) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'Only Main Admin or the listing creator can delete this listing.'
      });
    }

    listings = listings.filter(l => l.id !== id);
    writeJsonFile(listingsFilePath, listings);

    // Also mark any pending delete request for this listing as approved
    const deleteRequests = readJsonFile(deleteRequestsFilePath);
    let updatedRequests = false;
    deleteRequests.forEach(r => {
      if (r.listingId === id && r.status === 'pending') {
        r.status = 'approved';
        r.reviewedAt = new Date().toISOString();
        updatedRequests = true;
      }
    });
    if (updatedRequests) {
      writeJsonFile(deleteRequestsFilePath, deleteRequests);
    }

    res.json({ success: true, message: 'Listing deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error deleting listing', error: err.message });
  }
});

// ==========================================
// 4. LISTING DELETION REQUESTS (AGENT -> ADMIN)
// ==========================================

// POST /api/listings/:id/delete-request (Agent submits deletion request with reason)
app.post('/api/listings/:id/delete-request', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'Reason for deletion is required.' });
    }

    const listings = readJsonFile(listingsFilePath);
    const listing = listings.find(l => l.id === id);
    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found.' });
    }

    const deleteRequests = readJsonFile(deleteRequestsFilePath);
    const existingPending = deleteRequests.find(r => r.listingId === id && r.status === 'pending');
    if (existingPending) {
      return res.status(400).json({
        success: false,
        message: 'A deletion request for this listing is already pending Main Admin approval.'
      });
    }

    const newRequest = {
      id: `del-req-${Date.now()}`,
      listingId: id,
      listingTitle: listing.title,
      listingRent: listing.rentAmount,
      listingAddress: listing.address,
      listingImage: listing.images && listing.images[0] ? listing.images[0] : '',
      agentId: req.user.id,
      agentName: req.user.name,
      agentPhone: req.user.phone || '',
      reason: reason.trim(),
      status: 'pending', // 'pending' | 'approved' | 'rejected'
      createdAt: new Date().toISOString()
    };

    deleteRequests.unshift(newRequest);
    writeJsonFile(deleteRequestsFilePath, deleteRequests);

    res.status(201).json({
      success: true,
      message: 'Deletion request submitted for Main Admin approval.',
      data: newRequest
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error creating deletion request', error: err.message });
  }
});

// GET /api/delete-requests (Main Admin views all deletion requests)
app.get('/api/delete-requests', (req, res) => {
  const deleteRequests = readJsonFile(deleteRequestsFilePath);
  res.json({ success: true, count: deleteRequests.length, data: deleteRequests });
});

// PATCH /api/delete-requests/:id (Main Admin approves or rejects deletion request)
app.patch('/api/delete-requests/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'approve' | 'reject'

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Action must be "approve" or "reject"' });
    }

    const deleteRequests = readJsonFile(deleteRequestsFilePath);
    const reqIndex = deleteRequests.findIndex(r => r.id === id);

    if (reqIndex === -1) {
      return res.status(404).json({ success: false, message: 'Deletion request not found' });
    }

    const deleteReq = deleteRequests[reqIndex];
    deleteReq.status = action === 'approve' ? 'approved' : 'rejected';
    deleteReq.reviewedAt = new Date().toISOString();
    deleteRequests[reqIndex] = deleteReq;
    writeJsonFile(deleteRequestsFilePath, deleteRequests);

    // If approved, delete the listing from listings.json
    if (action === 'approve') {
      let listings = readJsonFile(listingsFilePath);
      listings = listings.filter(l => l.id !== deleteReq.listingId);
      writeJsonFile(listingsFilePath, listings);
    }

    res.json({
      success: true,
      message: `Listing deletion request ${action === 'approve' ? 'Approved (Listing removed)' : 'Rejected'} successfully.`,
      data: deleteReq
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error processing deletion request', error: err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static frontend build in production
const distDir = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Housing Agent Server running on http://localhost:${PORT}`);
});
