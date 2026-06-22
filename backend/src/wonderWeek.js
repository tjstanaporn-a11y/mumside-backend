/**
 * Wonder Weeks data
 * อ้างอิงจากหนังสือ The Wonder Weeks
 * ตัวเลขคือสัปดาห์นับจากวันคลอด
 */
const WONDER_WEEKS = [
  { week: 5,  name: 'โลกแห่งความรู้สึก',     description: 'ลูกเริ่มรับรู้สิ่งแวดล้อมมากขึ้น อาจงอแงและติดแม่มาก' },
  { week: 8,  name: 'โลกแห่งรูปแบบ',         description: 'ลูกเริ่มจำหน้าแม่ได้ เริ่มยิ้มตอบสนอง' },
  { week: 12, name: 'โลกแห่งการเปลี่ยนแปลง', description: 'ลูกเริ่มส่งเสียงโต้ตอบ สังเกตการเคลื่อนไหว' },
  { week: 19, name: 'โลกแห่งเหตุการณ์',       description: 'ลูกเข้าใจระยะทาง เริ่มคว้าจับของ' },
  { week: 26, name: 'โลกแห่งความสัมพันธ์',    description: 'ลูกเข้าใจความสัมพันธ์ระหว่างสิ่งของ' },
  { week: 37, name: 'โลกแห่งหมวดหมู่',        description: 'ลูกเริ่มจัดกลุ่มสิ่งของ เข้าใจแนวคิดต่างๆ' },
  { week: 46, name: 'โลกแห่งลำดับ',           description: 'ลูกเข้าใจลำดับขั้นตอน เริ่มทำอะไรเป็นขั้นเป็นตอน' },
  { week: 55, name: 'โลกแห่งโปรแกรม',         description: 'ลูกวางแผนและคิดล่วงหน้าได้' },
  { week: 64, name: 'โลกแห่งหลักการ',         description: 'ลูกเข้าใจกฎและหลักการต่างๆ' },
  { week: 75, name: 'โลกแห่งระบบ',            description: 'ลูกเข้าใจระบบความสัมพันธ์ที่ซับซ้อน' },
];

const STORM_DURATION = 2; // จำนวนสัปดาห์ที่งอแงก่อน wonder week

/**
 * เช็กว่าลูกใกล้เข้า Wonder Week ไหม
 * คืนค่า wonder week ที่กำลังจะมาถึงใน 7 วัน หรือ null
 */
function getUpcomingWonderWeek(birthdate) {
  const ageInWeeks = getAgeInWeeks(birthdate);

  for (const ww of WONDER_WEEKS) {
    const stormStart = ww.week - STORM_DURATION;
    const daysUntilStorm = (stormStart - ageInWeeks) * 7;

    // แจ้งล่วงหน้า 5 วัน
    if (daysUntilStorm >= 0 && daysUntilStorm <= 5) {
      return {
        ...ww,
        daysUntil: Math.ceil(daysUntilStorm),
        ageInWeeks,
      };
    }
  }
  return null;
}

/**
 * เช็กว่าลูกอยู่ใน Wonder Week ตอนนี้ไหม
 */
function getCurrentWonderWeek(birthdate) {
  const ageInWeeks = getAgeInWeeks(birthdate);

  for (const ww of WONDER_WEEKS) {
    const stormStart = ww.week - STORM_DURATION;
    if (ageInWeeks >= stormStart && ageInWeeks <= ww.week + 1) {
      return { ...ww, ageInWeeks };
    }
  }
  return null;
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
 * สร้างข้อความแจ้งเตือน Wonder Week
 */
function buildWonderWeekAlert(child, wonderWeek) {
  const childName = child.name || 'ลูก';
  const { daysUntil, name, description, week } = wonderWeek;

  if (daysUntil === 0) {
    return `🌙 แจ้งเตือน Wonder Week!\n\n${childName}กำลังเข้าสู่ช่วง "${name}" แล้วค่ะ\n\n${description}\n\nลูกอาจงอแง ร้องมาก และติดแม่มากผิดปกติในช่วงนี้นะคะ ไม่ใช่เพราะแม่เลี้ยงผิด แต่เพราะลูกกำลังฉลาดขึ้นค่ะ 💛\n\nแม่ไม่ได้อยู่คนเดียวนะคะ MumSide อยู่ข้างๆ เสมอ 🌙`;
  }

  return `🌙 เตรียมใจไว้นะคะแม่!\n\nอีก ${daysUntil} วัน ${childName}จะเข้าสู่ Wonder Week สัปดาห์ที่ ${week}\n"${name}"\n\n${description}\n\nช่วงนี้ลูกอาจงอแงและติดแม่มากขึ้น เตรียมใจและพักผ่อนให้ดีๆ ก่อนนะคะ 💛`;
}

module.exports = {
  WONDER_WEEKS,
  getUpcomingWonderWeek,
  getCurrentWonderWeek,
  getAgeInWeeks,
  buildWonderWeekAlert,
};
