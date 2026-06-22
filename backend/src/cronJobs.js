const cron = require('node-cron');
const { getAllUsersWithChildren } = require('./firebase');
const { getUpcomingWonderWeek, buildWonderWeekAlert } = require('./wonderWeek');

let lineClient = null;

function initCronJobs(client) {
  lineClient = client;

  // ============================================================
  // WATER REMINDER — ทุกวัน บ่าย 14:00
  // ============================================================
  cron.schedule('0 14 * * *', async () => {
    console.log('💧 Running water reminder...');
    await sendWaterReminders();
  }, { timezone: 'Asia/Bangkok' });

  // ============================================================
  // MORNING CHECK-IN — ทุกวัน เช้า 8:00
  // ============================================================
  cron.schedule('0 8 * * *', async () => {
    console.log('🌞 Running morning check-in...');
    await sendMorningCheckIn();
  }, { timezone: 'Asia/Bangkok' });

  // ============================================================
  // WONDER WEEK ALERT — ทุกวัน เช้า 9:00
  // ============================================================
  cron.schedule('0 9 * * *', async () => {
    console.log('🌙 Running wonder week check...');
    await sendWonderWeekAlerts();
  }, { timezone: 'Asia/Bangkok' });

  // ============================================================
  // EVENING WORKOUT — ทุกวัน เย็น 19:00
  // ============================================================
  cron.schedule('0 19 * * *', async () => {
    console.log('🏃 Running evening workout reminder...');
    await sendEveningWorkout();
  }, { timezone: 'Asia/Bangkok' });

  console.log('✅ Cron jobs initialized');
}

// ============================================================
// CRON FUNCTIONS
// ============================================================

async function sendWaterReminders() {
  try {
    const users = await getAllUsersWithChildren();
    for (const user of users) {
      await lineClient.pushMessage(user.lineUserId, {
        type: 'text',
        text: `💧 ถึงเวลาดื่มน้ำแล้วนะคะแม่!\n\nวันนี้ดื่มน้ำไปกี่แก้วแล้วคะ?\nอย่าลืมนะคะ แม่ให้นมต้องดื่มน้ำวันละ 10-13 แก้วเลยค่ะ 💛\n\nดื่มน้ำก่อนเลยนะคะ ตอนนี้เลย! 🫗`,
      });
    }
  } catch (error) {
    console.error('Water reminder error:', error);
  }
}

async function sendMorningCheckIn() {
  try {
    const users = await getAllUsersWithChildren();
    for (const user of users) {
      await lineClient.pushMessage(user.lineUserId, {
        type: 'text',
        text: `🌞 สวัสดีตอนเช้าค่ะแม่!\n\nวันนี้แม่เป็นยังไงบ้างคะ?\n\nกด/พิมพ์ตอบมาได้เลยนะคะ:\n😊 ดี\n😴 เหนื่อย\n😔 ท้อ\n\nMumSide อยู่ข้างๆ เสมอค่ะ 🌙`,
      });
    }
  } catch (error) {
    console.error('Morning check-in error:', error);
  }
}

async function sendWonderWeekAlerts() {
  try {
    const users = await getAllUsersWithChildren();

    for (const user of users) {
      for (const child of user.children) {
        const upcoming = getUpcomingWonderWeek(child.birthdate);
        if (upcoming) {
          const message = buildWonderWeekAlert(child, upcoming);
          await lineClient.pushMessage(user.lineUserId, {
            type: 'text',
            text: message,
          });
        }
      }
    }
  } catch (error) {
    console.error('Wonder week alert error:', error);
  }
}

async function sendEveningWorkout() {
  // คลิปออกกำลังกาย 10 นาที หมุนเวียนทุกวัน
  const workouts = [
    {
      day: 1,
      text: `🏃 10 นาทีก่อนนอนนะคะแม่!\n\n💪 วันนี้: Core & Pelvic Floor\nเหมาะสำหรับแม่หลังคลอดทุกช่วงค่ะ\n\n▶️ https://www.youtube.com/watch?v=i9cy2fSlKKU\n\n"แม่ที่แข็งแรง คือของขวัญที่ดีที่สุดให้ลูก" 🌙`,
    },
    {
      day: 2,
      text: `🏃 10 นาทีก่อนนอนนะคะแม่!\n\n💪 วันนี้: Full Body Postpartum\nทำได้ที่บ้าน ไม่ต้องใช้อุปกรณ์ค่ะ\n\n▶️ https://www.youtube.com/watch?v=7xV6Ey0odb0\n\n"ทีละนิด สม่ำเสมอ ดีกว่าหักโหมแล้วเลิก" 💛`,
    },
    {
      day: 3,
      text: `🏃 10 นาทีก่อนนอนนะคะแม่!\n\n💪 วันนี้: Diastasis Recti Recovery\nฟื้นฟูกล้ามเนื้อหน้าท้องหลังคลอดค่ะ\n\n▶️ https://www.youtube.com/watch?v=u3XXc_cTYJU\n\n"แม่ไม่จำเป็นต้องสมบูรณ์แบบ แค่อยู่ตรงนี้ก็พอแล้ว" 🌙`,
    },
  ];

  const dayOfWeek = new Date().getDay(); // 0-6
  const workout = workouts[dayOfWeek % workouts.length];

  try {
    const users = await getAllUsersWithChildren();
    for (const user of users) {
      await lineClient.pushMessage(user.lineUserId, {
        type: 'text',
        text: workout.text,
      });
    }
  } catch (error) {
    console.error('Evening workout error:', error);
  }
}

module.exports = { initCronJobs };
