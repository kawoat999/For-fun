# Receipt OCR & Document Builder (สแกนบิล & สร้างใบเสนอราคา/ใบเสร็จ A4)

เว็บแอปพลิเคชันจัดการบิลและใบเสร็จอัตโนมัติด้วย AI (Google Gemini 2.5 Flash) สลับสร้างใบเสนอราคา (Quotation) และใบเสร็จรับเงิน (Receipt) ได้ในคลิกเดียว พร้อมพรีวิวและสั่งพิมพ์ขนาด A4

---

## ฟีเจอร์หลัก (Key Features)

1. **สแกนบิลด้วย AI (Receipt OCR):**
   - ใช้โมเดล **Gemini 2.5 Flash** สกัดข้อมูลร้านค้า, เลขผู้เสียภาษี 13 หลัก, เลขที่บิล, วันที่, รายการสินค้า, ราคา และภาษีได้อย่างแม่นยำ
   - รองรับทั้งไฟล์ภาพ (JPG, PNG, WebP) และเอกสาร PDF
   - มีปุ่มทดสอบด้วยข้อมูลจำลอง (Sample Receipts)

2. **ตรวจสอบบิลคู่ขนาน (Side-by-Side Review):**
   - ฝั่งซ้าย: ดูภาพบิลต้นฉบับ สามารถซูมเข้า-ออก และหมุนภาพได้
   - ฝั่งขวา: ตรวจสอบและแก้ไขข้อมูลที่ AI สกัดออกมาได้อิสระ
   - ปุ่ม Toggle เลือกว่าเป็น [ บิลรายจ่าย ] หรือ [ บิลรายรับ ]
   - ปุ่มล้างฟอร์ม (Clear Form) เริ่มต้นด้วยค่าว่างพร้อมลายน้ำตัวอย่าง (Watermark Placeholders)

3. **สร้างและแก้ไขเอกสาร (Document Builder):**
   - สลับระหว่าง **ใบเสนอราคา (Quotation)** และ **ใบเสร็จรับเงิน (Receipt)** ได้ใน 1 คลิก
   - คำนวณยอดเงินรวม, ส่วนลด, ภาษีมูลค่าเพิ่ม (VAT 7% / 0%), และหัก ณ ที่จ่าย (WHT 1% / 3%) อัตโนมัติ
   - แปลงจำนวนเงินเป็นตัวอักษรภาษาไทย (Thai Baht Text) ถูกต้องตามหลักบัญชี

4. **พรีวิวและสั่งพิมพ์ขนาด A4 (A4 Print Preview):**
   - แสดงผลแบบกระดาษ A4 มาตรฐาน สั่งพิมพ์หรือบันทึกเป็น PDF (`Ctrl + P`) ได้ทันที
   - แก้ไขวันที่ (Date Picker), วันยืนราคา, วันที่ชำระเงิน และเลขที่เอกสารได้โดยตรงบนหน้าพรีวิว
   - ซ่อนปุ่ม input ขณะสั่งพิมพ์ เหลือเพียงเอกสารทางการที่สะอาดตา 100%

5. **ประวัติและคลังข้อมูล (Archive & History):**
   - บันทึกข้อมูลลงในเครื่อง (LocalStorage) และเชื่อมต่อ **Supabase Cloud Database**
   - การ์ดสรุปยอดรวมบิลรายรับ, บิลรายจ่าย และจำนวนเอกสาร
   - ส่งออกข้อมูลเป็นไฟล์ Excel CSV (รองรับภาษาไทยด้วย UTF-8 BOM)

---

## การติดตั้งและเริ่มต้นใช้งาน (Getting Started)

### 1. ติดตั้ง Dependencies
```bash
npm install
```

### 2. ตั้งค่า Environment Variables
สร้างไฟล์ `.env.local` ที่โฟลเดอร์ root ของโปรเจกต์:
```env
# Google Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here

# Supabase Configuration (ตัวเลือกเสริมสำหรับคลาวด์)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 3. เริ่มรัน Development Server
```bash
npm run dev
```
เปิดเบราว์เซอร์ไปที่ [http://localhost:3000](http://localhost:3000)

### 4. Build สำหรับ Production
```bash
npm run build
npm start
```

---

## เทคโนโลยีที่ใช้ (Tech Stack)
- **Framework:** Next.js (App Router, Turbopack)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **AI / OCR:** `@google/genai` (Gemini 2.5 Flash)
- **Database:** Supabase Cloud (PostgreSQL / RLS)
- **Icons:** Lucide React

