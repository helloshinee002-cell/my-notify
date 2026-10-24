# my-notify

## ติดตั้งครั้งแรก

1. ติดตั้ง Git: https://git-scm.com/download/win
2. เปิด Command Prompt ในโฟลเดอร์ที่ต้องการเก็บ แล้วพิมพ์

   ```
   git clone https://github.com/helloshinee002-cell/my-notify
   ```

3. เปิด Edge ไปที่ `edge://extensions`
4. เปิด **Developer mode** (มุมซ้ายล่าง)
5. กด **Load unpacked** แล้วเลือกโฟลเดอร์ `my-notify`
6. ดับเบิลคลิก `install-updater.bat` ในโฟลเดอร์ `my-notify` (ครั้งเดียวต่อเครื่อง ไม่ต้องใช้สิทธิ์แอดมิน)
   แล้วกด **reload** บนการ์ดใน `edge://extensions`

## อัปเดต

เมื่อมีเวอร์ชันใหม่ popup จะขึ้นแถบสีเขียว กด **อัปเดตเลย** แล้วรอสักครู่ extension จะโหลดตัวใหม่เอง

ถ้าปุ่มใช้ไม่ได้: ดับเบิลคลิก `update.bat` แล้วกด **reload** บนการ์ด

ย้ายโฟลเดอร์ไปที่อื่น: Load unpacked ใหม่ แล้วรัน `install-updater.bat` อีกครั้ง
