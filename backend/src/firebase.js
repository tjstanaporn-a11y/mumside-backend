const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
  });
}

const db = admin.firestore();

// ============================================================
// USER FUNCTIONS
// ============================================================

/**
 * ดึงข้อมูล user จาก LINE userId
 */
async function getUser(lineUserId) {
  const doc = await db.collection('users').doc(lineUserId).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

/**
 * สร้าง user ใหม่ตอนแอด LINE OA
 */
async function createUser(lineUserId, displayName) {
  const userData = {
    lineUserId,
    displayName,
    children: [],
    waterReminderTime: '14:00', // default บ่ายสองโมง
    consent: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  await db.collection('users').doc(lineUserId).set(userData);
  return userData;
}

// ============================================================
// CHILDREN FUNCTIONS
// ============================================================

/**
 * เพิ่มลูกให้ user
 * birthdate format: "YYYY-MM-DD"
 */
async function addChild(lineUserId, childData) {
  const child = {
    id: Date.now().toString(), // simple unique id
    name: childData.name || null,
    birthdate: childData.birthdate, // "2024-08-15"
    gender: childData.gender || null,
    createdAt: new Date().toISOString(),
  };

  await db.collection('users').doc(lineUserId).update({
    children: admin.firestore.FieldValue.arrayUnion(child),
  });

  return child;
}

/**
 * คำนวณอายุลูกเป็นเดือน
 */
function getAgeInMonths(birthdate) {
  const now = new Date();
  const birth = new Date(birthdate);
  const months =
    (now.getFullYear() - birth.getFullYear()) * 12 +
    (now.getMonth() - birth.getMonth());
  return Math.max(0, months);
}

/**
 * คำนวณอายุลูกเป็นสัปดาห์
 */
function getAgeInWeeks(birthdate) {
  const now = new Date();
  const birth = new Date(birthdate);
  const diffMs = now - birth;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7));
}

/**
 * ดึง users ทั้งหมดที่มีลูก (สำหรับ cron job)
 */
async function getAllUsersWithChildren() {
  const snapshot = await db
    .collection('users')
    .where('children', '!=', [])
    .get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

/**
 * อัปเดต waterReminderTime
 */
async function updateWaterReminderTime(lineUserId, time) {
  await db.collection('users').doc(lineUserId).update({
    waterReminderTime: time,
  });
}

module.exports = {
  db,
  getUser,
  createUser,
  addChild,
  getAgeInMonths,
  getAgeInWeeks,
  getAllUsersWithChildren,
  updateWaterReminderTime,
};
