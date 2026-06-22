const admin = require('firebase-admin');

// Initialize Firebase Admin — lazy init เมื่อมี credentials
let db = null;

function getDb() {
  if (db) return db;

  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_PRIVATE_KEY) {
    console.warn('⚠️  Firebase credentials not set — DB calls will be skipped');
    return null;
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
    });
  }

  db = admin.firestore();
  return db;
}

// ============================================================
// USER FUNCTIONS
// ============================================================

async function getUser(lineUserId) {
  const db = getDb();
  if (!db) return null;
  const doc = await db.collection('users').doc(lineUserId).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

async function createUser(lineUserId, displayName) {
  const db = getDb();
  if (!db) return { lineUserId, displayName, children: [] };

  const userData = {
    lineUserId,
    displayName,
    children: [],
    waterReminderTime: '14:00',
    consent: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  await db.collection('users').doc(lineUserId).set(userData);
  return userData;
}

// ============================================================
// CHILDREN FUNCTIONS
// ============================================================

async function addChild(lineUserId, childData) {
  const db = getDb();
  const child = {
    id: Date.now().toString(),
    name: childData.name || null,
    birthdate: childData.birthdate,
    gender: childData.gender || null,
    createdAt: new Date().toISOString(),
  };

  if (db) {
    await db.collection('users').doc(lineUserId).update({
      children: admin.firestore.FieldValue.arrayUnion(child),
    });
  }

  return child;
}

function getAgeInMonths(birthdate) {
  const now = new Date();
  const birth = new Date(birthdate);
  const months =
    (now.getFullYear() - birth.getFullYear()) * 12 +
    (now.getMonth() - birth.getMonth());
  return Math.max(0, months);
}

function getAgeInWeeks(birthdate) {
  const now = new Date();
  const birth = new Date(birthdate);
  const diffMs = now - birth;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7));
}

async function getAllUsersWithChildren() {
  const db = getDb();
  if (!db) return [];
  const snapshot = await db.collection('users').where('children', '!=', []).get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function updateWaterReminderTime(lineUserId, time) {
  const db = getDb();
  if (!db) return;
  await db.collection('users').doc(lineUserId).update({ waterReminderTime: time });
}

module.exports = {
  getDb,
  getUser,
  createUser,
  addChild,
  getAgeInMonths,
  getAgeInWeeks,
  getAllUsersWithChildren,
  updateWaterReminderTime,
};
