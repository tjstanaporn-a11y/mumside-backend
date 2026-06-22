require('dotenv').config();
const express = require('express');
const line = require('@line/bot-sdk');
const cors = require('cors');

const { getUser, createUser } = require('./src/firebase');
const { findKeyword } = require('./src/keywords');
const { initCronJobs } = require('./src/cronJobs');

const app = express();

// LINE Client config
const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new line.Client(lineConfig);

app.use(cors());
app.use('/webhook', line.middleware(lineConfig));
app.use(express.json());

// ============================================================
// WEBHOOK — รับข้อความจาก LINE
// ============================================================
app.post('/webhook', async (req, res) => {
  res.status(200).end(); // ตอบ LINE ก่อนเสมอ

  const events = req.body.events;
  await Promise.all(events.map(handleEvent));
});

async function handleEvent(event) {
  try {
    // แม่แอดเพื่อน
    if (event.type === 'follow') {
      await handleFollow(event);
      return;
    }

    // แม่พิมพ์ข้อความ
    if (event.type === 'message' && event.message.type === 'text') {
      await handleMessage(event);
      return;
    }

    // แม่กดปุ่ม (postback จาก Rich Menu)
    if (event.type === 'postback') {
      await handlePostback(event);
      return;
    }
  } catch (error) {
    console.error('Event handling error:', error);
  }
}

// ============================================================
// FOLLOW — แม่แอดเพื่อนครั้งแรก
// ============================================================
async function handleFollow(event) {
  const userId = event.source.userId;

  // ดึงชื่อจาก LINE profile
  const profile = await client.getProfile(userId);

  // สร้าง user ใน Firebase
  let user = await getUser(userId);
  if (!user) {
    await createUser(userId, profile.displayName);
  }

  // ส่งข้อความต้อนรับ
  await client.replyMessage(event.replyToken, [
    {
      type: 'text',
      text: `🌙 สวัสดีค่ะ คุณ${profile.displayName}!\n\nยินดีต้อนรับสู่ MumSide ค่ะ\n"เพราะแม่ไม่ควรต้องผ่านทุกอย่างเพียงลำพัง"\n\nที่นี่คือเพื่อนสนิทของแม่ทุกคน 💛\nไม่ตัดสิน ไม่สั่ง มีแค่คนที่เข้าใจอยู่ข้างๆ`,
    },
    {
      type: 'text',
      text: `เพื่อให้เราดูแลคุณแม่ได้ตรงจุดขึ้น\nกดปุ่ม "ลงทะเบียนลูก" ที่เมนูด้านล่างได้เลยนะคะ 👶\n\nหรือถ้าตอนนี้ยังไม่พร้อม กดเมื่อไหร่ก็ได้ค่ะ\nMumSide อยู่ข้างๆ เสมอนะคะ 🌙`,
    },
  ]);
}

// ============================================================
// MESSAGE — แม่พิมพ์ข้อความมา
// ============================================================
async function handleMessage(event) {
  const userId = event.source.userId;
  const text = event.message.text.trim();

  // ดึงข้อมูล user
  const user = await getUser(userId);

  // เช็ก morning check-in response
  if (['😊', 'ดี', '😴', 'เหนื่อย', '😔', 'ท้อ'].includes(text)) {
    await handleMoodResponse(event, text, user);
    return;
  }

  // เช็ก keyword
  const keywordHandler = findKeyword(text);
  if (keywordHandler) {
    const reply = keywordHandler(user);
    await client.replyMessage(event.replyToken, {
      type: 'text',
      text: reply,
    });
    return;
  }

  // ไม่มี keyword ตรง → ตอบ default
  await client.replyMessage(event.replyToken, {
    type: 'text',
    text: `MumSide รับทราบค่ะ 💛\n\nถ้าอยากถามเรื่องลูกหรือตัวเอง พิมพ์บอกได้เลยนะคะ\nเช่น "ลูกร้องไห้" "ผดร้อน" "wonder week" "ดื่มน้ำ"\n\nหรือจะกดเมนูด้านล่างก็ได้ค่ะ 🌙`,
  });
}

// ============================================================
// MOOD RESPONSE — รับมือกับอารมณ์แม่
// ============================================================
async function handleMoodResponse(event, mood, user) {
  const name = user?.displayName || 'แม่';

  if (['😊', 'ดี'].includes(mood)) {
    await client.replyMessage(event.replyToken, {
      type: 'text',
      text: `ดีใจด้วยนะคะที่วันนี้เป็นวันดีของคุณ${name}! 😊💛\n\nขอให้วันนี้ราบรื่นนะคะ\nMumSide อยู่ข้างๆ เสมอค่ะ 🌙`,
    });
    return;
  }

  if (['😴', 'เหนื่อย'].includes(mood)) {
    await client.replyMessage(event.replyToken, {
      type: 'text',
      text: `เหนื่อยก็เหนื่อยได้นะคะ ไม่ต้องฝืนค่ะ 💛\n\nการเป็นแม่มันหนักจริงๆ ค่ะ\nวันนี้ขอให้พักได้บ้างนะคะ แม้แค่ 5 นาทีก็ยังดีค่ะ\n\nMumSide เป็นกำลังใจให้นะคะ 🌙`,
    });
    return;
  }

  if (['😔', 'ท้อ'].includes(mood)) {
    await client.replyMessage(event.replyToken, [
      {
        type: 'text',
        text: `ขอบคุณที่บอกนะคะ 💛\n\nความรู้สึกท้อเป็นเรื่องปกติมากค่ะ ไม่ได้แปลว่าแม่แย่\nแค่แปลว่าวันนี้หนักเกินไปค่ะ`,
      },
      {
        type: 'text',
        text: `อยากให้ลองทำสิ่งเล็กๆ นี้นะคะ:\n• หายใจลึกๆ 3 ครั้ง\n• ดื่มน้ำอุ่นสักแก้ว\n• บอกตัวเองว่า "วันนี้ฉันทำได้ดีแล้ว"\n\nถ้าความรู้สึกนี้อยู่นานเกิน 2 สัปดาห์\nอยากให้ปรึกษาคุณหมอด้วยนะคะ ไม่ใช่เรื่องอ่อนแอเลยค่ะ 💛\n\nMumSide อยู่ข้างๆ เสมอนะคะ 🌙`,
      },
    ]);
    return;
  }
}

// ============================================================
// POSTBACK — แม่กดปุ่มใน Rich Menu
// ============================================================
async function handlePostback(event) {
  const data = event.postback.data;
  const userId = event.source.userId;

  if (data === 'action=register_child') {
    // ส่งลิงก์ LIFF ให้แม่กรอกข้อมูลลูก
    const liffUrl = `https://liff.line.me/${process.env.LIFF_ID}`;
    await client.replyMessage(event.replyToken, {
      type: 'text',
      text: `👶 ลงทะเบียนลูกได้เลยค่ะ!\n\nกดลิงก์ด้านล่างแล้วกรอกวันเกิดลูกได้เลยนะคะ\nใช้เวลาแค่ 30 วินาทีค่ะ 💛\n\n${liffUrl}`,
    });
    return;
  }

  if (data === 'action=water_reminder') {
    await client.replyMessage(event.replyToken, {
      type: 'text',
      text: `💧 ดื่มน้ำก่อนเลยนะคะ!\n\nเป้าหมายวันนี้: 8-10 แก้ว\nวันนี้ดื่มไปกี่แก้วแล้วคะ? 💛`,
    });
    return;
  }
}

// ============================================================
// API สำหรับ LIFF — รับข้อมูลลูกจากฟอร์ม
// ============================================================
const { addChild } = require('./src/firebase');

app.post('/api/register-child', async (req, res) => {
  try {
    const { lineUserId, childName, birthdate, gender } = req.body;

    if (!lineUserId || !birthdate) {
      return res.status(400).json({ error: 'lineUserId and birthdate required' });
    }

    const child = await addChild(lineUserId, {
      name: childName,
      birthdate, // "YYYY-MM-DD"
      gender,
    });

    // ส่งข้อความยืนยันกลับใน LINE
    const ageInMonths = Math.floor(
      (new Date() - new Date(birthdate)) / (1000 * 60 * 60 * 24 * 30)
    );

    await client.pushMessage(lineUserId, {
      type: 'text',
      text: `✅ ลงทะเบียน${childName || 'ลูก'}เรียบร้อยแล้วค่ะ! 💛\n\nตอนนี้${childName || 'ลูก'}อายุ ${ageInMonths} เดือนค่ะ\n\nMumSide จะคอยแจ้งเตือน Wonder Week\nและส่งเนื้อหาที่ตรงกับช่วงวัยของลูกให้นะคะ 🌙`,
    });

    res.json({ success: true, child });
  } catch (error) {
    console.error('Register child error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'MumSide Backend Running 🌙' });
});

// ============================================================
// START SERVER
// ============================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌙 MumSide backend running on port ${PORT}`);
  initCronJobs(client);
});
