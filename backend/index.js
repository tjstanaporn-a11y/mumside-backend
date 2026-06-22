require('dotenv').config();
const express = require('express');
const line = require('@line/bot-sdk');
const cors = require('cors');

const { getUser, createUser } = require('./src/firebase');
const { findKeyword } = require('./src/keywords');
const { initCronJobs } = require('./src/cronJobs');

const app = express();

// LINE config — ใช้ syntax ใหม่ของ @line/bot-sdk v8+
const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

// Client ใหม่
const client = new line.messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
});

app.use(cors());
app.use(express.json());

// Webhook middleware ของ LINE
app.post('/webhook', line.middleware(lineConfig), async (req, res) => {
  res.status(200).end();
  const events = req.body.events;
  await Promise.all(events.map(handleEvent));
});

async function handleEvent(event) {
  try {
    if (event.type === 'follow') {
      await handleFollow(event);
      return;
    }
    if (event.type === 'message' && event.message.type === 'text') {
      await handleMessage(event);
      return;
    }
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

  let displayName = 'คุณแม่';
  try {
    const profile = await client.getProfile(userId);
    displayName = profile.displayName;
  } catch (e) {
    console.warn('Cannot get profile:', e.message);
  }

  let user = await getUser(userId);
  if (!user) await createUser(userId, displayName);

  await client.replyMessage({
    replyToken: event.replyToken,
    messages: [
      {
        type: 'text',
        text: `🌙 สวัสดีค่ะ คุณ${displayName}!\n\nยินดีต้อนรับสู่ MumSide ค่ะ\n"เพราะแม่ไม่ควรต้องผ่านทุกอย่างเพียงลำพัง"\n\nที่นี่คือเพื่อนสนิทของแม่ทุกคน 💛\nไม่ตัดสิน ไม่สั่ง มีแค่คนที่เข้าใจอยู่ข้างๆ`,
      },
      {
        type: 'text',
        text: `เพื่อให้เราดูแลคุณแม่ได้ตรงจุดขึ้น\nกดปุ่ม "ลงทะเบียนลูก" ที่เมนูด้านล่างได้เลยนะคะ 👶\n\nMumSide อยู่ข้างๆ เสมอนะคะ 🌙`,
      },
    ],
  });
}

// ============================================================
// MESSAGE — แม่พิมพ์ข้อความมา
// ============================================================
async function handleMessage(event) {
  const userId = event.source.userId;
  const text = event.message.text.trim();
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
    await client.replyMessage({
      replyToken: event.replyToken,
      messages: [{ type: 'text', text: reply }],
    });
    return;
  }

  // Default reply
  await client.replyMessage({
    replyToken: event.replyToken,
    messages: [{
      type: 'text',
      text: `MumSide รับทราบค่ะ 💛\n\nถ้าอยากถามเรื่องลูกหรือตัวเอง พิมพ์บอกได้เลยนะคะ\nเช่น "ลูกร้องไห้" "ผดร้อน" "wonder week" "ดื่มน้ำ"\n\nหรือจะกดเมนูด้านล่างก็ได้ค่ะ 🌙`,
    }],
  });
}

// ============================================================
// MOOD RESPONSE
// ============================================================
async function handleMoodResponse(event, mood, user) {
  const name = user?.displayName || 'แม่';
  let text = '';

  if (['😊', 'ดี'].includes(mood)) {
    text = `ดีใจด้วยนะคะที่วันนี้เป็นวันดีของคุณ${name}! 😊💛\nขอให้วันนี้ราบรื่นนะคะ MumSide อยู่ข้างๆ เสมอค่ะ 🌙`;
  } else if (['😴', 'เหนื่อย'].includes(mood)) {
    text = `เหนื่อยก็เหนื่อยได้นะคะ ไม่ต้องฝืนค่ะ 💛\nวันนี้ขอให้พักได้บ้างนะคะ แม้แค่ 5 นาทีก็ยังดีค่ะ\nMumSide เป็นกำลังใจให้นะคะ 🌙`;
  } else if (['😔', 'ท้อ'].includes(mood)) {
    text = `ขอบคุณที่บอกนะคะ 💛\nความรู้สึกท้อเป็นเรื่องปกติมากค่ะ ไม่ได้แปลว่าแม่แย่\nแค่แปลว่าวันนี้หนักเกินไปค่ะ\n\nลองหายใจลึกๆ 3 ครั้ง ดื่มน้ำอุ่นสักแก้ว แล้วบอกตัวเองว่า "วันนี้ฉันทำได้ดีแล้ว" นะคะ 💛\n\nMumSide อยู่ข้างๆ เสมอนะคะ 🌙`;
  }

  await client.replyMessage({
    replyToken: event.replyToken,
    messages: [{ type: 'text', text }],
  });
}

// ============================================================
// POSTBACK
// ============================================================
async function handlePostback(event) {
  const data = event.postback.data;

  if (data === 'action=register_child') {
    const liffUrl = `https://liff.line.me/${process.env.LIFF_ID}`;
    await client.replyMessage({
      replyToken: event.replyToken,
      messages: [{
        type: 'text',
        text: `👶 ลงทะเบียนลูกได้เลยค่ะ!\n\n${liffUrl}`,
      }],
    });
  }
}

// ============================================================
// API สำหรับ LIFF
// ============================================================
const { addChild } = require('./src/firebase');

app.post('/api/register-child', async (req, res) => {
  try {
    const { lineUserId, childName, birthdate, gender } = req.body;
    if (!lineUserId || !birthdate) {
      return res.status(400).json({ error: 'lineUserId and birthdate required' });
    }

    const child = await addChild(lineUserId, { name: childName, birthdate, gender });

    const ageInMonths = Math.floor(
      (new Date() - new Date(birthdate)) / (1000 * 60 * 60 * 24 * 30)
    );

    await client.pushMessage({
      to: lineUserId,
      messages: [{
        type: 'text',
        text: `✅ ลงทะเบียน${childName || 'ลูก'}เรียบร้อยแล้วค่ะ! 💛\n\nตอนนี้${childName || 'ลูก'}อายุ ${ageInMonths} เดือนค่ะ\nMumSide จะคอยแจ้งเตือน Wonder Week ให้นะคะ 🌙`,
      }],
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌙 MumSide backend running on port ${PORT}`);
  initCronJobs(client);
});
