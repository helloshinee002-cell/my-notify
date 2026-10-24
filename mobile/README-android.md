# ลง Disable Ads by Web บนโทรศัพท์ Android

ตัวสำหรับโทรศัพท์คือ**ส่วนปิดโฆษณาอย่างเดียว** ตัดมาจาก extension ตัวเต็มในคอม (ไม่มีแจ้งเตือนตอนใหม่ คะแนน MAL ลิงก์ Bilibili และ popup)
ยังใช้ชื่อและกุญแจเดิม "Disable Ads by Web" จึงลงทับตัวเก่าในโทรศัพท์ได้เลย

Chrome บน Android ลง extension ไม่ได้เลย ต้องใช้เบราว์เซอร์ Chromium ตัวอื่นที่ลงได้
(เช็คเมื่อ ต.ค. 2026: Kiwi เลิกพัฒนาไปแล้วตั้งแต่ต้นปี 2025)

| ไฟล์ | ใช้กับ |
|---|---|
| `disable-ads-by-web.crx` | **Edge Canary** (ทางหลัก) |
| `disable-ads-by-web.zip` | เบราว์เซอร์ที่มีปุ่ม Load unpacked / ลงจาก zip |
| `disable-ads-by-web.pem` | **อย่าส่งไปโทรศัพท์ อย่าแชร์** เป็นกุญแจเซ็นไฟล์ ต้องเก็บไว้บนเครื่องนี้ |

ไฟล์ `.crx` / `.zip` / `.pem` ไม่ได้อยู่บน GitHub ต้องสร้างเองบนคอมด้วยคำสั่งในหัวข้อ "สร้างไฟล์" ข้างล่าง

## ทางหลัก: Microsoft Edge Canary

1. ติดตั้ง **Microsoft Edge Canary** จาก Play Store (ต้องเป็นตัว Canary ตัว Edge ธรรมดายังไม่มีเมนูนี้)
2. ก๊อป `disable-ads-by-web.crx` ลงโทรศัพท์ (เช่น ส่งผ่าน LINE/Drive แล้วบันทึกลงเครื่อง)
3. เปิด Edge Canary → **Settings → About Microsoft Edge**
4. แตะเลข **build** (เช่น `Edge Canary 14x.x.xxxx.x`) **5 ครั้ง** → จะมีเมนู **Developer options** โผล่ใน Settings
5. **Settings → Developer options → Extension install by crx** → เลือกไฟล์ `.crx`
6. เปิด https://animegojos.com/ ลองดู แบนเนอร์ควรหาย

ถ้าไม่มีเมนูข้อ 5: เปิด `edge://flags` ค้นคำว่า `extension` แล้วเปิดตัวที่เกี่ยวกับ Android extensions
จากนั้นปิดเปิดแอปใหม่ (ชื่อเมนูใน Canary เปลี่ยนบ่อย อาจไม่ตรงกับที่เขียนไว้ตรงนี้)

## ทางสำรอง: Quetta

1. ติดตั้ง **Quetta** จาก Play Store
2. พิมพ์ `quetta://extensions` ในแถบที่อยู่
3. ถ้ามี **Developer mode** / **Load unpacked** → แตกไฟล์ `disable-ads-by-web.zip` ลงเครื่องแล้วเลือกโฟลเดอร์นั้น
4. ถ้าไม่มี แปลว่ารุ่นนั้นลงได้แค่จาก store ใช้ไม่ได้

## สร้างไฟล์ / เวลาแก้ extension

บนเครื่อง PC เปิด Command Prompt ในโฟลเดอร์ extension แล้วรัน:

```
powershell -ExecutionPolicy Bypass -File mobile\pack.ps1
```

จะได้ไฟล์ใน `mobile\` (ใส่ `-Full` ต่อท้ายถ้าอยากได้ตัวเต็มเป็น `gojo-notify.crx`) แล้วเอา `.crx` ตัวใหม่ไปลงทับบนโทรศัพท์ (ขั้นที่ 5) ID เดิม `njpebncddjkamhjkghfjjigofnkocedh`
จึงขึ้นเป็นการอัปเดต ไม่ใช่ extension ซ้ำอีกตัว — **ตราบใดที่ `.pem` ตัวเดิมยังอยู่**
ถ้า `.pem` หาย การแพ็กครั้งหน้าจะได้ ID ใหม่ ต้องลบตัวเก่าในโทรศัพท์ทิ้งก่อนลงใหม่

## ใช้ได้กับอะไรบ้าง

ส่วนปิดโฆษณาใช้ได้ครบเหมือนบน PC: บล็อกแบนเนอร์/ตัวติดตาม, ข้ามวิดีโอโฆษณาก่อนเข้าตอน, dark mode ของ fairyanime,
ปุ่มโรงหนัง/เต็มจอ และ -5/+5 ของ 037-hdd
(extension ใช้แค่กฎบล็อก CSS และสคริปต์ ไม่มีส่วนไหนที่ต้องใช้เดสก์ท็อป)
ต้องใช้เบราว์เซอร์ที่เป็น Chromium 111 ขึ้นไป ซึ่งรุ่นที่ยังอัปเดตอยู่เกินนั้นหมดแล้ว
