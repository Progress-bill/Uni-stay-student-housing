import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
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
    const uploadOptions = {
      resource_type: resourceType,
      folder: folder,
      chunk_size: 10000000
    };

    // For video tour walkthroughs: strip audio to reduce file size, save storage & bandwidth, and mute by default
    if (resourceType === 'video') {
      uploadOptions.audio_codec = 'none'; // Strips audio stream completely from the stored video
      uploadOptions.quality = 'auto:good'; // Automatic visual compression
      uploadOptions.fetch_format = 'auto'; // Optimize format for web streaming
    }

    const uploadResult = await cloudinary.uploader.upload(localFilePath, uploadOptions);
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

// Automatically ensure Cloudinary video URLs deliver without audio (ac_none) and optimized (q_auto)
const optimizeVideoUrl = (url) => {
  if (!url || typeof url !== 'string') return url;
  if (url.includes('cloudinary.com') && url.includes('/video/upload/') && !url.includes('/ac_none')) {
    return url.replace('/video/upload/', '/video/upload/ac_none,q_auto/');
  }
  return url;
};

// Parse resource type and clean public ID from any Cloudinary URL (handling transformations and versions)
const parseCloudinaryUrl = (url) => {
  if (!url || typeof url !== 'string' || !url.includes('cloudinary.com')) return null;
  try {
    const cleanUrl = url.split('?')[0].split('#')[0];
    const match = cleanUrl.match(/cloudinary\.com\/[^/]+\/(image|video|raw)\/upload\/(.+)$/);
    if (!match) return null;

    const resourceType = match[1];
    let pathAfterUpload = match[2];

    // If version exists (v\d+/), everything after v\d+/ is the publicId!
    const versionMatch = pathAfterUpload.match(/(?:^|\/)v\d+\/(.+)$/);
    let publicIdWithExt = '';
    if (versionMatch) {
      publicIdWithExt = versionMatch[1];
    } else {
      // If no version segment, skip transformation segments (segments with commas or standard parameter prefixes)
      const parts = pathAfterUpload.split('/');
      const cleanParts = [];
      let foundContent = false;
      for (const part of parts) {
        if (!foundContent && (part.includes(',') || /^[a-z]{1,2}_/.test(part))) {
          continue;
        }
        foundContent = true;
        cleanParts.push(part);
      }
      publicIdWithExt = cleanParts.join('/');
    }

    // Strip extension (e.g. .mp4, .jpg, .webm, .mov)
    const publicId = publicIdWithExt.replace(/\.[a-zA-Z0-9]+$/, '');

    return {
      resourceType,
      publicId
    };
  } catch (err) {
    console.error('Error parsing Cloudinary URL:', err);
    return null;
  }
};

// Delete video or photo asset from Cloudinary (and clean local file if local)
const deleteFromCloudinary = async (url) => {
  if (!url || typeof url !== 'string') return false;

  // Handle local uploaded files (/uploads/videos/... or /uploads/images/...)
  if (url.startsWith('/uploads/')) {
    const localPath = path.join(__dirname, '..', 'public', url);
    if (fs.existsSync(localPath)) {
      try {
        fs.unlinkSync(localPath);
        console.log(`[Storage] Deleted local media file: ${localPath}`);
        return true;
      } catch (err) {
        console.warn(`[Storage] Error deleting local file ${localPath}:`, err.message);
      }
    }
    return false;
  }

  if (!isCloudinaryConfigured || !url.includes('cloudinary.com')) return false;

  const parsed = parseCloudinaryUrl(url);
  if (!parsed || !parsed.publicId) {
    console.warn(`[Cloudinary] Could not parse public ID from URL: ${url}`);
    return false;
  }

  try {
    const res = await cloudinary.uploader.destroy(parsed.publicId, {
      resource_type: parsed.resourceType,
      invalidate: true // Purge from CDN edge caches immediately
    });
    console.log(`[Cloudinary] Deleted asset: "${parsed.publicId}" (${parsed.resourceType}) -> result: ${res.result}`);
    return res.result === 'ok';
  } catch (err) {
    console.error(`[Cloudinary] Error deleting asset ${parsed.publicId}:`, err);
    return false;
  }
};

// Purge all media belonging to a room listing (videoTree nodes, videoUrl, images)
const purgeListingMedia = async (listing) => {
  if (!listing) return;
  const urlsToDelete = new Set();
  if (listing.videoUrl) urlsToDelete.add(listing.videoUrl);
  if (listing.videoTree) {
    if (listing.videoTree.root?.url) urlsToDelete.add(listing.videoTree.root.url);
    if (listing.videoTree.left?.url) urlsToDelete.add(listing.videoTree.left.url);
    if (listing.videoTree.right?.url) urlsToDelete.add(listing.videoTree.right.url);
  }
  if (Array.isArray(listing.images)) {
    listing.images.forEach(img => img && urlsToDelete.add(img));
  }
  for (const mediaUrl of urlsToDelete) {
    await deleteFromCloudinary(mediaUrl);
  }
};

// Ensure directories exist
const dataDir = path.join(__dirname, 'data');
const listingsFilePath = path.join(dataDir, 'listings.json');
const listingsBackupFilePath = path.join(dataDir, 'listings_backup.json');
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
    fileSize: 500 * 1024 * 1024 // 500MB limit for high-res room video tours
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

// Asynchronously synchronize persistent database backup to Cloudinary as raw asset
const syncDatabaseToCloudinary = async (filePath) => {
  if (!isCloudinaryConfigured || !fs.existsSync(filePath)) return;
  try {
    const baseName = path.basename(filePath);
    const publicId = `unistay_database/${baseName}`;
    await cloudinary.uploader.upload(filePath, {
      resource_type: 'raw',
      public_id: publicId,
      overwrite: true,
      invalidate: true
    });
    console.log(`[Cloudinary Database] Synchronized ${baseName} to cloud storage`);
  } catch (err) {
    console.warn(`[Cloudinary Database] Failed to sync ${filePath}:`, err.message);
  }
};

let gitSyncTimeout = null;

// Synchronize backup file to GitHub (using GitHub API if GITHUB_TOKEN is available, or git CLI)
const syncToGitHubBackup = async (reason = 'auto-sync') => {
  try {
    if (!fs.existsSync(listingsBackupFilePath)) return { success: false, message: 'Backup file missing' };
    const backupContent = fs.readFileSync(listingsBackupFilePath, 'utf8');
    const parsed = JSON.parse(backupContent);
    console.log(`[GitHub Backup] Initiating backup sync (${parsed.length} listings, reason: ${reason})...`);

    // Method 1: If GITHUB_TOKEN is provided (works on Render, Docker, Cloud containers without local git auth)
    const githubToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
    const repoOwner = 'Progress-bill';
    const repoName = 'Uni-stay-student-housing';
    const filePathInRepo = 'server/data/listings_backup.json';

    if (githubToken) {
      try {
        const getUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePathInRepo}`;
        const getRes = await fetch(getUrl, {
          headers: {
            'Authorization': `Bearer ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'UniStay-Backend-Sync'
          }
        });
        let currentSha = null;
        if (getRes.ok) {
          const fileInfo = await getRes.json();
          currentSha = fileInfo.sha;
        }

        const putRes = await fetch(getUrl, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'UniStay-Backend-Sync',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: `chore: update listings backup in GitHub (${parsed.length} listings) [skip ci]`,
            content: Buffer.from(backupContent).toString('base64'),
            sha: currentSha || undefined,
            branch: 'main'
          })
        });

        if (putRes.ok) {
          console.log('[GitHub Backup] Successfully pushed listings_backup.json to GitHub repository via API!');
          return { success: true, method: 'github_api', message: 'Backup successfully pushed to GitHub repository' };
        } else {
          const errData = await putRes.json().catch(() => ({}));
          console.warn('[GitHub Backup] GitHub API update note:', errData.message);
        }
      } catch (apiErr) {
        console.warn('[GitHub Backup] GitHub API error:', apiErr.message);
      }
    }

    // Method 2: Git CLI (works on local development machine or environments with git push access)
    return new Promise((resolve) => {
      exec(
        'git add server/data/listings_backup.json server/data/listings.json && git commit -m "chore: auto-backup listings to GitHub [skip ci]" && git push origin main',
        { cwd: path.join(__dirname, '..') },
        (error, stdout, stderr) => {
          if (error) {
            console.log('[GitHub Backup] Local git CLI note:', stderr?.trim() || error.message);
            resolve({ success: false, method: 'git_cli', note: stderr?.trim() || error.message });
          } else {
            console.log('[GitHub Backup] Git CLI push succeeded to GitHub origin main!');
            resolve({ success: true, method: 'git_cli', message: 'Successfully committed and pushed to GitHub' });
          }
        }
      );
    });
  } catch (err) {
    console.error('[GitHub Backup] Failed to synchronize to GitHub:', err);
    return { success: false, error: err.message };
  }
};

// Debounced trigger so editing multiple fields doesn't trigger 10 commits in 5 seconds
const triggerDebouncedGitHubSync = () => {
  if (gitSyncTimeout) clearTimeout(gitSyncTimeout);
  gitSyncTimeout = setTimeout(() => {
    syncToGitHubBackup('debounced-update');
  }, 25000); // 25 seconds after last modification
};

const writeJsonFile = (filePath, data) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');

    // If listings are updated, mirror to listings_backup.json and trigger GitHub sync
    if (filePath === listingsFilePath) {
      try {
        fs.writeFileSync(listingsBackupFilePath, JSON.stringify(data, null, 2), 'utf8');
      } catch (bErr) {
        console.warn('Could not mirror listings_backup.json:', bErr.message);
      }
      triggerDebouncedGitHubSync();
    }

    // Asynchronously synchronize persistent database backup to Cloudinary
    syncDatabaseToCloudinary(filePath);
    return true;
  } catch (err) {
    console.error(`Error saving ${filePath}:`, err);
    return false;
  }
};

// Restore persistent database from Cloudinary storage and GitHub backup on boot
const initDatabaseFromCloud = async () => {
  try {
    // Step 1: Immediate fallback from repository backup if local listings are empty or <= 3
    const currentListings = readJsonFile(listingsFilePath, []);
    const backupListings = readJsonFile(listingsBackupFilePath, []);
    if (Array.isArray(backupListings) && backupListings.length > currentListings.length) {
      fs.writeFileSync(listingsFilePath, JSON.stringify(backupListings, null, 2), 'utf8');
      console.log(`[GitHub Backup] Loaded ${backupListings.length} listings from repository listings_backup.json`);
    }

    if (!isCloudinaryConfigured) return;

    // Step 2: Check Cloudinary persistent raw database backups
    console.log('[Cloudinary Database] Checking persistent cloud database backups...');
    const filesToSync = [
      { name: 'listings.json', path: listingsFilePath },
      { name: 'users.json', path: usersFilePath },
      { name: 'agent_applications.json', path: applicationsFilePath },
      { name: 'delete_requests.json', path: deleteRequestsFilePath }
    ];

    for (const item of filesToSync) {
      try {
        const publicId = `unistay_database/${item.name}`;
        const resource = await cloudinary.api.resource(publicId, { resource_type: 'raw' });
        if (resource && resource.secure_url) {
          const res = await fetch(resource.secure_url);
          if (res.ok) {
            const cloudData = await res.json();
            const localData = readJsonFile(item.path, []);
            if (!Array.isArray(localData) || cloudData.length >= localData.length) {
              fs.writeFileSync(item.path, JSON.stringify(cloudData, null, 2), 'utf8');
              console.log(`[Cloudinary Database] Restored ${item.name} from Cloudinary (${cloudData.length} records)`);
              if (item.name === 'listings.json') {
                fs.writeFileSync(listingsBackupFilePath, JSON.stringify(cloudData, null, 2), 'utf8');
              }
            }
          }
        }
      } catch (err) {
        // If file doesn't exist in cloud, upload current local file
        if (fs.existsSync(item.path)) {
          syncDatabaseToCloudinary(item.path);
        }
      }
    }
  } catch (err) {
    console.warn('[Database Init] Error syncing database on startup:', err.message);
  }
};

// Scan Cloudinary for uploaded videos and images and link any unlinked room tours
const reconcileCloudinaryMedia = async () => {
  if (!isCloudinaryConfigured) return { success: false, message: 'Cloudinary not configured' };
  try {
    console.log('[Cloudinary Reconcile] Scanning Cloudinary assets for unlinked videos & photos...');
    const [videoRes, imageRes] = await Promise.all([
      cloudinary.api.resources({ resource_type: 'video', type: 'upload', max_results: 100 }),
      cloudinary.api.resources({ resource_type: 'image', type: 'upload', max_results: 100 })
    ]);

    const listings = readJsonFile(listingsFilePath, []);
    const existingUrls = new Set();
    listings.forEach(l => {
      if (l.videoUrl) existingUrls.add(l.videoUrl);
      if (l.videoTree?.root?.url) existingUrls.add(l.videoTree.root.url);
      if (l.videoTree?.left?.url) existingUrls.add(l.videoTree.left.url);
      if (l.videoTree?.right?.url) existingUrls.add(l.videoTree.right.url);
      if (Array.isArray(l.images)) l.images.forEach(img => existingUrls.add(img));
    });

    const items = [];
    (videoRes.resources || []).forEach(v => {
      if (v.public_id.startsWith('unistay_rooms/')) {
        items.push({ type: 'video', id: v.public_id, url: v.secure_url, time: new Date(v.created_at).getTime(), iso: v.created_at });
      }
    });
    (imageRes.resources || []).forEach(img => {
      if (img.public_id.startsWith('unistay_rooms/')) {
        items.push({ type: 'image', id: img.public_id, url: img.secure_url, time: new Date(img.created_at).getTime(), iso: img.created_at });
      }
    });

    items.sort((a, b) => a.time - b.time);

    // Group items uploaded within 2 minutes of each other
    const clusters = [];
    let currentCluster = [];
    for (const item of items) {
      if (currentCluster.length === 0) {
        currentCluster.push(item);
      } else {
        const prev = currentCluster[currentCluster.length - 1];
        if (item.time - prev.time < 120000) {
          currentCluster.push(item);
        } else {
          clusters.push(currentCluster);
          currentCluster = [item];
        }
      }
    }
    if (currentCluster.length > 0) clusters.push(currentCluster);

    const roomPresets = [
      { title: "Scholar's Comfort AC Studio", rent: 6500, priceGroup: 'standard', area: 'Sector 4, Student Enclave' },
      { title: "Sunrise Deluxe Balcony Room", rent: 7500, priceGroup: 'premium', area: 'University North Campus' },
      { title: "Greenview Budget Single PG", rent: 3800, priceGroup: 'budget', area: 'Near Engineering College' },
      { title: "Metro Edge Independent Room", rent: 5200, priceGroup: 'standard', area: 'Law Gate Student Hub' },
      { title: "Royal Oak AC Residency", rent: 8200, priceGroup: 'premium', area: 'Chitkara Campus Road' },
      { title: "Harmony Student Haven", rent: 4500, priceGroup: 'standard', area: 'Sector 22, Near Market' },
      { title: "Campus View Studio Room", rent: 5800, priceGroup: 'standard', area: 'Main University Boulevard' },
      { title: "Urban Living Independent PG", rent: 7200, priceGroup: 'premium', area: 'Sunrise Heights, Gate 1' },
      { title: "Peaceful Study Pod Room", rent: 3600, priceGroup: 'budget', area: 'Sector 14, Quiet Zone' },
      { title: "Apex Elite AC Suite", rent: 8500, priceGroup: 'premium', area: 'South Campus Ring Road' }
    ];

    let recoveredCount = 0;
    clusters.forEach((cluster, idx) => {
      const videos = cluster.filter(x => x.type === 'video');
      const images = cluster.filter(x => x.type === 'image');

      const alreadyLinked = videos.some(v => existingUrls.has(v.url)) || images.some(img => existingUrls.has(img.url));
      if (alreadyLinked) return;

      const preset = roomPresets[idx % roomPresets.length];
      const dateStr = cluster[0].iso || new Date().toISOString();
      const timestamp = cluster[0].time || Date.now();

      videos.sort((a, b) => a.time - b.time);
      const rootVideo = videos[0] || null;
      const leftVideo = videos[1] || videos[0] || null;
      const rightVideo = videos[2] || videos[1] || videos[0] || null;

      const videoTree = {
        root: { id: 'sleeping_room', title: 'Sleeping Room', role: 'root', url: optimizeVideoUrl(rootVideo?.url || '') },
        left: { id: 'kitchen', title: 'Kitchen', role: 'left', url: optimizeVideoUrl(leftVideo?.url || '') },
        right: { id: 'washing_room', title: 'Washing Room', role: 'right', url: optimizeVideoUrl(rightVideo?.url || '') }
      };

      const coverImages = images.map(img => img.url);
      if (coverImages.length === 0) {
        coverImages.push('https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80');
      }

      const recoveredListing = {
        id: `house-cloud-${timestamp}-${idx + 1}`,
        title: `${preset.title} #${idx + 1}`,
        description: `Verified student room tour with 3-part walkthrough tree (Sleeping room, Kitchen, and Washing room). Quiet study atmosphere, verified amenities, independent access.`,
        rentAmount: preset.rent,
        electricityPerUnit: 8.0,
        priceGroup: preset.priceGroup,
        status: 'available',
        landlordAtPG: idx % 3 === 0,
        landlordName: 'Verified Property Desk',
        landlordPhone: '+91 9041543868',
        electricityBackup: true,
        acRoom: preset.priceGroup === 'premium',
        waterGeyser: true,
        latitude: 28.5355 + ((idx % 7) - 3) * 0.006,
        longitude: 77.2090 + (((idx * 3) % 7) - 3) * 0.006,
        address: `${preset.area}, Near Student University Campus`,
        videoUrl: videoTree.root.url,
        videoTree: videoTree,
        images: coverImages,
        customCategories: [
          preset.priceGroup === 'premium' ? 'AC Room' : 'Budget Friendly',
          'Single Room',
          'Attached Washroom',
          'Verified Tour'
        ],
        agentId: 'user-admin-1',
        agentName: 'UniStay Housing Desk',
        agentPhone: '9041543868',
        createdAt: dateStr
      };

      listings.unshift(recoveredListing);
      recoveredCount++;
    });

    if (recoveredCount > 0) {
      writeJsonFile(listingsFilePath, listings);
      console.log(`[Cloudinary Reconcile] Successfully recovered and linked ${recoveredCount} room tours into database!`);
    }

    return {
      success: true,
      recoveredCount,
      totalListings: listings.length,
      message: `Database synchronized with Cloudinary. ${recoveredCount} previously uploaded room tours reconnected.`
    };
  } catch (err) {
    console.error('[Cloudinary Reconcile] Error:', err);
    return { success: false, message: err.message };
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
// 2B. GEOCODING & GPS SEARCH PROXY WITH IN-MEMORY CACHE
// ==========================================
const geocodeCache = new Map();
const GEOCODE_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

const cleanAddressObj = (raw) => {
  if (!raw) return '';
  const addr = raw.address || {};
  const road = addr.road || addr.pedestrian || addr.footway || addr.street || addr.neighbourhood || '';
  const suburb = addr.suburb || addr.residential || addr.city_district || '';
  const city = addr.city || addr.town || addr.village || addr.county || '';
  const cleanParts = [road, suburb, city].filter(Boolean);
  if (cleanParts.length > 0) {
    return cleanParts.join(', ');
  }
  return raw.display_name ? raw.display_name.split(',').slice(0, 3).join(', ') : '';
};

// GET /api/geocode/search?q=...
app.get('/api/geocode/search', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) {
      return res.status(400).json({ success: false, message: 'Query parameter "q" is required' });
    }

    const cacheKey = `search:${q.toLowerCase()}`;
    const cached = geocodeCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < GEOCODE_CACHE_TTL)) {
      return res.json({ success: true, source: 'cache', data: cached.data });
    }

    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&q=${encodeURIComponent(q)}`;
    const response = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'UniStay-Student-Housing/1.0 (contact@unistay.internal)',
        'Accept-Language': 'en'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ success: false, message: 'Upstream geocoding service error' });
    }

    const rawResults = await response.json();
    const formatted = (Array.isArray(rawResults) ? rawResults : []).map(item => ({
      lat: parseFloat(parseFloat(item.lat).toFixed(5)),
      lng: parseFloat(parseFloat(item.lon).toFixed(5)),
      displayName: item.display_name,
      formattedAddress: cleanAddressObj(item),
      type: item.type,
      importance: item.importance
    }));

    if (geocodeCache.size > 500) {
      const firstKey = geocodeCache.keys().next().value;
      geocodeCache.delete(firstKey);
    }
    geocodeCache.set(cacheKey, { data: formatted, timestamp: Date.now() });

    res.json({ success: true, source: 'live', data: formatted });
  } catch (err) {
    console.error('Geocode search error:', err);
    res.status(500).json({ success: false, message: 'Geocoding search failed', error: err.message });
  }
});

// GET /api/geocode/reverse?lat=...&lng=...
app.get('/api/geocode/reverse', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ success: false, message: 'Valid lat and lng query parameters are required' });
    }

    const rLat = parseFloat(lat.toFixed(4));
    const rLng = parseFloat(lng.toFixed(4));
    const cacheKey = `rev:${rLat},${rLng}`;

    const cached = geocodeCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < GEOCODE_CACHE_TTL)) {
      return res.json({ success: true, source: 'cache', data: cached.data });
    }

    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&lat=${rLat}&lon=${rLng}`;
    const response = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'UniStay-Student-Housing/1.0 (contact@unistay.internal)',
        'Accept-Language': 'en'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ success: false, message: 'Upstream reverse geocoding error' });
    }

    const raw = await response.json();
    const cleanAddr = cleanAddressObj(raw) || raw.display_name || `${rLat}, ${rLng}`;
    const resultData = {
      lat: rLat,
      lng: rLng,
      formattedAddress: cleanAddr,
      displayName: raw.display_name || cleanAddr,
      addressDetails: raw.address || {}
    };

    if (geocodeCache.size > 500) {
      const firstKey = geocodeCache.keys().next().value;
      geocodeCache.delete(firstKey);
    }
    geocodeCache.set(cacheKey, { data: resultData, timestamp: Date.now() });

    res.json({ success: true, source: 'live', data: resultData });
  } catch (err) {
    console.error('Reverse geocode error:', err);
    res.status(500).json({ success: false, message: 'Reverse geocoding failed', error: err.message });
  }
});

// ==========================================
// 3. ROOM LISTINGS & STATUS MANAGEMENT
// ==========================================

// GET all listings
app.get('/api/listings', async (req, res) => {
  let listings = readJsonFile(listingsFilePath);
  // Auto-recovery fallback: If listings are empty or sample only (due to ephemeral disk restart)
  if (listings.length <= 3) {
    // 1. Immediate fallback from repository backup file in GitHub
    const backupListings = readJsonFile(listingsBackupFilePath, []);
    if (Array.isArray(backupListings) && backupListings.length > listings.length) {
      listings = backupListings;
      fs.writeFileSync(listingsFilePath, JSON.stringify(listings, null, 2), 'utf8');
      console.log(`[GitHub Backup] Fallback loaded ${listings.length} listings from listings_backup.json`);
    }

    if (listings.length <= 3 && isCloudinaryConfigured) {
      try {
        await initDatabaseFromCloud();
        listings = readJsonFile(listingsFilePath);
        if (listings.length <= 3) {
          await reconcileCloudinaryMedia();
          listings = readJsonFile(listingsFilePath);
        }
      } catch (err) {
        console.warn('Auto-sync in GET /api/listings failed:', err.message);
      }
    }
  }

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

// PUT /api/listings/:id (Update room details: title, description, rent, location, amenities, landlord info)
app.put('/api/listings/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
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
        message: 'You can only edit details for your own room listings.'
      });
    }

    const current = listings[index];
    const {
      title,
      description,
      rentAmount,
      electricityPerUnit,
      priceGroup,
      status,
      landlordAtPG,
      landlordName,
      landlordPhone,
      electricityBackup,
      acRoom,
      waterGeyser,
      latitude,
      longitude,
      address,
      customCategories
    } = req.body;

    if (title !== undefined) current.title = String(title).trim() || current.title;
    if (description !== undefined) current.description = String(description).trim();
    if (rentAmount !== undefined) {
      const parsedRent = Number(rentAmount);
      if (!isNaN(parsedRent) && parsedRent > 0) {
        current.rentAmount = parsedRent;
        // Auto-compute priceGroup if not provided explicitly
        if (!priceGroup) {
          if (parsedRent <= 4000) current.priceGroup = 'budget';
          else if (parsedRent <= 7000) current.priceGroup = 'standard';
          else current.priceGroup = 'premium';
        }
      }
    }
    if (priceGroup && ['budget', 'standard', 'premium'].includes(priceGroup)) {
      current.priceGroup = priceGroup;
    }
    if (electricityPerUnit !== undefined) {
      const parsedElec = parseFloat(electricityPerUnit);
      if (!isNaN(parsedElec)) current.electricityPerUnit = parsedElec;
    }
    if (status && ['available', 'occupied', 'reserved'].includes(status)) {
      current.status = status;
      current.statusUpdatedAt = new Date().toISOString();
    }
    if (landlordAtPG !== undefined) current.landlordAtPG = landlordAtPG === true || landlordAtPG === 'true';
    if (landlordName !== undefined) current.landlordName = String(landlordName).trim();
    if (landlordPhone !== undefined) current.landlordPhone = String(landlordPhone).trim();
    if (electricityBackup !== undefined) current.electricityBackup = electricityBackup === true || electricityBackup === 'true';
    if (acRoom !== undefined) current.acRoom = acRoom === true || acRoom === 'true';
    if (waterGeyser !== undefined) current.waterGeyser = waterGeyser === true || waterGeyser === 'true';
    if (latitude !== undefined && !isNaN(parseFloat(latitude))) current.latitude = parseFloat(latitude);
    if (longitude !== undefined && !isNaN(parseFloat(longitude))) current.longitude = parseFloat(longitude);
    if (address !== undefined) current.address = String(address).trim();
    if (Array.isArray(customCategories)) current.customCategories = customCategories;
    
    current.updatedAt = new Date().toISOString();

    listings[index] = current;
    writeJsonFile(listingsFilePath, listings);

    res.json({
      success: true,
      message: 'Room details updated successfully',
      data: current
    });
  } catch (err) {
    console.error('Error updating listing details:', err);
    res.status(500).json({ success: false, message: 'Error updating room details', error: err.message });
  }
});


// POST new listing with video, photo, and Landlord Contact info
app.post(
  '/api/listings',
  requireAuth,
  upload.fields([
    { name: 'video_sleeping', maxCount: 1 },
    { name: 'video_kitchen', maxCount: 1 },
    { name: 'video_washing', maxCount: 1 },
    { name: 'video', maxCount: 1 }, // legacy fallback
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
        videoUrl_sleeping,
        videoUrl_kitchen,
        videoUrl_washing,
        videoUrl: fallbackVideoUrl,
        imageUrl: fallbackImageUrl,
        agentId,
        agentName
      } = req.body;

      if (!title || !rentAmount) {
        return res.status(400).json({ success: false, message: 'Title and Rent amount are required' });
      }

      // Check presence of all 3 mandatory tree sections
      const sleepingFile = req.files?.['video_sleeping']?.[0] || req.files?.['video']?.[0];
      const sleepingUrlFallback = videoUrl_sleeping || fallbackVideoUrl;
      const hasSleeping = Boolean(sleepingFile || (sleepingUrlFallback && sleepingUrlFallback.trim()));

      const kitchenFile = req.files?.['video_kitchen']?.[0];
      const kitchenUrlFallback = videoUrl_kitchen;
      const hasKitchen = Boolean(kitchenFile || (kitchenUrlFallback && kitchenUrlFallback.trim()));

      const washingFile = req.files?.['video_washing']?.[0];
      const washingUrlFallback = videoUrl_washing;
      const hasWashing = Boolean(washingFile || (washingUrlFallback && washingUrlFallback.trim()));

      if (!hasSleeping || !hasKitchen || !hasWashing) {
        const missing = [];
        if (!hasSleeping) missing.push('Sleeping Room (Root Node)');
        if (!hasKitchen) missing.push('Kitchen (Left Subtree)');
        if (!hasWashing) missing.push('Washing Room (Right Subtree)');

        return res.status(400).json({
          success: false,
          message: `All 3 video tour sections are mandatory: 1) Sleeping Room, 2) Kitchen, and 3) Washing Room. Missing: ${missing.join(', ')}. If you only have one video, please trim/cut it into 3 clips before uploading.`
        });
      }

      // Upload all 3 video tree nodes to Cloudinary concurrently
      const uploadVideoSection = async (file, fallbackUrl, label) => {
        if (file) {
          const cloudUrl = await uploadFileToCloudinary(file.path, 'video', 'unistay_rooms/videos');
          if (cloudUrl) {
            console.log(`[Cloudinary] ${label} video stored at: ${cloudUrl}`);
            return cloudUrl;
          }
          return `/uploads/videos/${file.filename}`;
        }
        return (fallbackUrl || '').trim();
      };

      const [finalSleepingUrl, finalKitchenUrl, finalWashingUrl] = await Promise.all([
        uploadVideoSection(sleepingFile, sleepingUrlFallback, 'Sleeping Room'),
        uploadVideoSection(kitchenFile, kitchenUrlFallback, 'Kitchen'),
        uploadVideoSection(washingFile, washingUrlFallback, 'Washing Room')
      ]);

      const videoTree = {
        root: {
          id: 'sleeping_room',
          title: 'Sleeping Room',
          role: 'root',
          url: optimizeVideoUrl(finalSleepingUrl)
        },
        left: {
          id: 'kitchen',
          title: 'Kitchen',
          role: 'left',
          url: optimizeVideoUrl(finalKitchenUrl)
        },
        right: {
          id: 'washing_room',
          title: 'Washing Room',
          role: 'right',
          url: optimizeVideoUrl(finalWashingUrl)
        }
      };

      const finalVideoUrl = videoTree.root.url || videoTree.left.url || videoTree.right.url;

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
        videoTree: videoTree,
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
app.delete('/api/listings/:id', requireAuth, async (req, res) => {
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

    // Automatically delete videoTree, video, and photo assets from Cloudinary / local storage
    await purgeListingMedia(existing);

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

    res.json({ success: true, message: 'Listing and cloud media deleted successfully' });
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
app.get('/api/delete-requests', requireAdmin, (req, res) => {
  const deleteRequests = readJsonFile(deleteRequestsFilePath);
  res.json({ success: true, count: deleteRequests.length, data: deleteRequests });
});

// PATCH /api/delete-requests/:id (Main Admin approves or rejects deletion request)
app.patch('/api/delete-requests/:id', requireAdmin, async (req, res) => {
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

    // If approved, delete the listing from listings.json and purge cloud assets
    if (action === 'approve') {
      let listings = readJsonFile(listingsFilePath);
      const listingToDelete = listings.find(l => l.id === deleteReq.listingId);
      if (listingToDelete) {
        await purgeListingMedia(listingToDelete);
      }
      listings = listings.filter(l => l.id !== deleteReq.listingId);
      writeJsonFile(listingsFilePath, listings);
    }

    res.json({
      success: true,
      message: `Listing deletion request ${action === 'approve' ? 'Approved (Listing & cloud media removed)' : 'Rejected'} successfully.`,
      data: deleteReq
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error processing deletion request', error: err.message });
  }
});

// ==========================================
// 5. CLOUDINARY STORAGE USAGE MONITORING (ADMIN ONLY)
// ==========================================

// GET /api/admin/cloudinary/usage (Main Admin monitors real-time storage & bandwidth)
app.get('/api/admin/cloudinary/usage', requireAdmin, async (req, res) => {
  if (!isCloudinaryConfigured) {
    return res.status(400).json({
      success: false,
      message: 'Cloudinary is not configured on this server.'
    });
  }

  try {
    const usageData = await cloudinary.api.usage();
    res.json({
      success: true,
      data: {
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        plan: usageData.plan || 'Free',
        lastUpdated: usageData.last_updated,
        credits: {
          usage: usageData.credits?.usage || 0,
          limit: usageData.credits?.limit || 25,
          usedPercent: usageData.credits?.used_percent || 0
        },
        storage: {
          bytes: usageData.storage?.usage || 0,
          creditsUsage: usageData.storage?.credits_usage || 0
        },
        bandwidth: {
          bytes: usageData.bandwidth?.usage || 0,
          creditsUsage: usageData.bandwidth?.credits_usage || 0
        },
        resources: usageData.resources || 0,
        objects: usageData.objects?.usage || 0,
        requests: usageData.requests || 0,
        rateLimitRemaining: usageData.rate_limit_remaining,
        rateLimitAllowed: usageData.rate_limit_allowed
      }
    });
  } catch (err) {
    console.error('Error fetching Cloudinary usage:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Cloudinary storage metrics',
      error: err.message
    });
  }
});

// POST /api/admin/reconnect-cloudinary (Trigger manual media and database reconciliation from Cloudinary)
app.post('/api/admin/reconnect-cloudinary', requireAdmin, async (req, res) => {
  try {
    const result = await reconcileCloudinaryMedia();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Reconciliation failed', error: err.message });
  }
});

// GET /api/admin/backup-download (Download raw listings_backup.json from server)
app.get('/api/admin/backup-download', requireAdmin, (req, res) => {
  try {
    if (!fs.existsSync(listingsBackupFilePath)) {
      if (fs.existsSync(listingsFilePath)) {
        fs.copyFileSync(listingsFilePath, listingsBackupFilePath);
      } else {
        return res.status(404).json({ success: false, message: 'Backup file not found' });
      }
    }
    const today = new Date().toISOString().split('T')[0];
    res.download(listingsBackupFilePath, `unistay_listings_backup_${today}.json`);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error downloading backup', error: err.message });
  }
});

// POST /api/admin/sync-github (Trigger manual GitHub backup commit & push)
app.post('/api/admin/sync-github', requireAdmin, async (req, res) => {
  try {
    const result = await syncToGitHubBackup('admin-requested');
    const backupListings = readJsonFile(listingsBackupFilePath, []);
    res.json({
      success: true,
      result,
      backupFile: 'server/data/listings_backup.json',
      totalListings: backupListings.length,
      message: result.message || 'GitHub backup synchronization completed'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'GitHub backup sync failed', error: err.message });
  }
});

// POST /api/admin/backup-restore (Restore listings from an uploaded backup JSON array)
app.post('/api/admin/backup-restore', requireAdmin, async (req, res) => {
  try {
    const importedListings = Array.isArray(req.body.listings) ? req.body.listings : (Array.isArray(req.body) ? req.body : null);
    if (!importedListings || !importedListings.length) {
      return res.status(400).json({ success: false, message: 'Invalid listings backup data format' });
    }

    // Write to both listings.json and listings_backup.json and sync to Cloudinary
    writeJsonFile(listingsFilePath, importedListings);
    fs.writeFileSync(listingsBackupFilePath, JSON.stringify(importedListings, null, 2), 'utf8');
    syncToGitHubBackup('admin-restored');

    res.json({
      success: true,
      totalRestored: importedListings.length,
      message: `Successfully restored ${importedListings.length} listings to database and synchronized to Cloudinary and GitHub.`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Backup restoration failed', error: err.message });
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

app.listen(PORT, async () => {
  console.log(`Housing Agent Server running on http://localhost:${PORT}`);
  // Initialize and synchronize database from Cloudinary storage on boot
  await initDatabaseFromCloud();
  await reconcileCloudinaryMedia();
});
