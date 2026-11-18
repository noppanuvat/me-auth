# meturr-auth

Service ตรวจสอบสิทธิ์ (authentication) สำหรับระบบนิเวศ Meturr ทำงานบน **Express + express-session** ใช้เป็น `forward_auth` backend ให้กับ Caddy ป้องกันโดเมน `meturr.online`, `jira.meturr.online`, `jira-create.meturr.online`

## คุณสมบัติ

- **`GET /login`** — หน้าเข้าสู่ระบบ (ภาษาไทย) เตรียมบัญชี `admin / meturr#5535`
- **`POST /login`** — ตรวจสอบชื่อผู้ใช้และรหัสผ่าน ตั้ง session `meturr_sid`
- **`GET /logout`** — ลบ session และกลับไปหน้าแรก
- **`GET /verify`** — Endpoint สำหรับ Caddy `forward_auth` คืน `200 OK` หากล็อกอินอยู่ ถ้ายังไม่ได้ล็อกอินจะ redirect ไป `/login`
- **`GET /health`** — คืน `{ status: "ok" }` สำหรับ health check
- **`GET /api/openrouter/credits`** — Proxy ดึงยอดเครดิต OpenRouter (ต้องล็อกอิน) แคช 60 วินาที

## โครงสร้างไฟล์

```
meturr-auth/
├── src/
│   └── index.js        # โค้ดหลัก Express app
├── package.json
├── .env                # ไม่ถูกอัปโหลด (มีรหัสลับจริง)
└── .gitignore
```

## ตัวแปรสภาพแวดล้อม (`.env`)

สร้างไฟล์ `.env` ในโฟลเดอร์รากก่อนรัน:

```env
PORT=3002
SESSION_SECRET=change-me-in-production
OPENROUTER_API_KEY=your-openrouter-key
```

ถ้าไม่กำหนด `SESSION_SECRET` จะใช้ค่าเริ่มต้น `change-me-in-production` (ไม่แนะนำใน production)

## วิธีติดตั้งและรัน

```bash
# ติดตั้ง dependencies
npm install

# คัดลอกตัวอย่าง 환경 (ถ้ามี) แล้วแก้ไขค่าจริง
cp .env.example .env   # หรือสร้าง .env เอง

# รันเซิร์ฟเวอร์
PORT=3002 node src/index.js
```

หรือใช้สคริปต์ใน `package.json`:

```bash
npm start
```

เซิร์ฟเวอร์จะฟังที่พอร์ต `3002` (หรือค่าจาก `PORT`)

## คุกกี้ session

| ตัวแปร | ค่า |
|--------|-----|
| ชื่อคุกกี้ | `meturr_sid` |
| โดเมน | `.meturr.online` |
| httpOnly | ✅ |
| sameSite | `lax` |
| secure | ✅ |
| อายุ | 8 ชั่วโมง |

## ความปลอดภัย

- บัญชีผู้ใช้ถูกกำหนดไว้ในโค้ด (`USERS = { admin: 'meturr#5535' }`) เหมาะสำหรับการใช้งานส่วนตัวหรือทีมขนาดเล็ก
- คุกกี้ session ตั้ง `httpOnly`, `secure`, `sameSite=lax`
- Endpoint `/api/openrouter/credits` ต้องล็อกอินก่อนเข้าถึง

## อ้างอิง

ถูกใช้โดย Caddy ผ่าน `forward_auth` ในไฟล์ `Caddyfile` ของโปรเจกต์ `jira-ai`

---

สร้างและดูแลโดย **คุณนพ (noppanuvat)** 🌸
