## Pseudocode – วิธีการทำงานของเว็บ M777

```pseudo
เริ่มโหลดหน้าเว็บ
  ตั้งค่า state หลัก:
    batX, batY = ""              // พิกัดตำแหน่งปืน (Battery)
    tgtX, tgtY = ""              // พิกัดเป้าหมาย (Target)
    corrRange = 0                // การแก้ระยะ (เมตร)
    corrLat = 0                  // การแก้มุมซ้าย–ขวา (เมตร)
    showTable = false            // แสดง/ซ่อนตาราง ballistic ดิบ
    panX = 0, zoom = 1           // การเลื่อน/ซูมกราฟิกจุดตก
    targetPos = { x: 50, y: 50 } // จุดตกเริ่มต้นตรงกลางกราฟิก
    flipView = false             // สลับมุมมองเมื่อยิงทิศใต้

  โหลดค่า Battery จาก cookie (ครั้งเดียวตอน mount):
    ถ้ามี cookie "batteryX" → ตั้งค่า batX
    ถ้ามี cookie "batteryY" → ตั้งค่า batY

  เมื่อ batX หรือ batY เปลี่ยน:
    บันทึกค่าใหม่ลง cookie ("batteryX"/"batteryY" อายุ ~80 ชั่วโมง)

  ทุกครั้งที่กรอกพิกัดครบ (batX, batY, tgtX, tgtY ไม่ว่าง):
    รีเซ็ต corrRange = 0, corrLat = 0
    set showTable = true         // เปิดตาราง ballistic อัตโนมัติ

  ฟังก์ชัน parseGrid(ค่าที่กรอกเป็น string):
    ถ้าว่าง → คืนค่า null
    แปลงเป็นตัวเลขฐาน 10
      ถ้ายาว 3 หลัก → คูณ 100 (เช่น 551 → 55100)
      ถ้ายาว 4 หลัก → คูณ 10  (เช่น 5510 → 55100)
    คืนค่าตัวเลขที่ได้

  คำนวณทิศการยิงขั้นต้น:
    batYNum = parseGrid(batY)
    tgtYNum = parseGrid(tgtY)
    isSouthDirection = batYNum และ tgtYNum ไม่เป็น null และ tgtYNum < batYNum
      // เป้าหมายอยู่ทิศใต้ของปืน
    effectiveSouthDirection = isSouthDirection และ flipView == false
      // ใช้ตัวนี้กำหนดว่าป้าย + ระยะเป็น ADD/DROP ด้านไหน

  ฟังก์ชัน calculateAzimuth():
    แปลง batX, batY, tgtX, tgtY เป็นตัวเลข grid ด้วย parseGrid
    ถ้ามีตัวใดเป็น null → คืนค่า null
    dx = tx - bx   // ต่าง Easting
    dy = ty - by   // ต่าง Northing
    คืนค่า atan2(dx, dy) (หน่วยเรเดียน, หมุนตามเข็มจากทิศเหนือ)

  ในทุกการ render:
    เรียก calculateBallistics(batX, batY, tgtX, tgtY, corrRange, corrLat)
      → ได้ผลลัพธ์ result:
          range   = ระยะสุดท้าย (เมตร)
          azimuth = ทิศทางเป็น mils (0–6400)
          degrees = ทิศทางเป็นองศา
          elev    = มุมเงย (mils) หรือข้อความพิเศษ (MIN RNG / MAX RNG)
          tof     = เวลาบินของกระสุน (วินาที)
          status  = ข้อความสถานะ เช่น AWAITING / SOLUTION COMPUTED
          statusClass = สีตัวอักษรตามสถานะ
          adjustedGrid = ข้อความกริดใหม่หลังแก้ไข (ถ้ามีการปรับ)

  ฟังก์ชัน calculateBallistics ทำงานดังนี้:
    1) แปลงพิกัดปืนและเป้าหมายเป็นตัวเลข (bx, by, tx, ty)
       ถ้าค่าใดเป็น null:
         คืน result ที่เป็นสถานะ "AWAITING COORDINATES..."

    2) คำนวณเวกเตอร์เริ่มต้นจากปืนไปเป้าหมาย:
         dx = tx - bx
         dy = ty - by
         initialTheta = atan2(dx, dy)  // มุมรัศมีจากปืนไปเป้า

    3) ใช้ค่าการแก้ระยะ/ซ้ายขวาเพื่อเลื่อนจุดเป้าหมาย:
         shiftX = corrRange * sin(initialTheta) + corrLat * cos(initialTheta)
         shiftY = corrRange * cos(initialTheta) - corrLat * sin(initialTheta)
         finalTx = tx + shiftX
         finalTy = ty + shiftY
         ถ้ามีการแก้ไขใด ๆ → สร้างข้อความ adjustedGrid ด้วยกริดใหม่

    4) คำนวณเวกเตอร์สุดท้ายจากปืนไปตำแหน่งเป้าหมายที่ถูกปรับแล้ว:
         finalDx = finalTx - bx
         finalDy = finalTy - by
         dist = sqrt(finalDx^2 + finalDy^2)
         range = ปัด dist เป็นจำนวนเต็ม + " m"

    5) แปลงมุมเป็นค่าทิศยิง:
         finalThetaRad = atan2(finalDx, finalDy)
         finalThetaDeg = finalThetaRad * 180 / PI
         ถ้า finalThetaDeg < 0 → + 360 ให้เป็นช่วง 0–360

         azimuthMils = ปัด (finalThetaDeg / 360) * 6400
         azimuth     = azimuthMils แปลงเป็น string 4 หลัก (padStart)
         degrees     = "({รอบ finalThetaDeg}°)"

    6) ตรวจช่วงระยะยิง:
         ถ้า dist < 3000:
           elev = "MIN RNG"
           tof  = "---"
           status = "TARGET TOO CLOSE (<3000m)"
         ถ้า dist > 5300:
           elev = "MAX RNG"
           tof  = "---"
           status = "TARGET OUT OF RANGE (>5300m)"

    7) ถ้าอยู่ในช่วง 3000–5300 m:
         หาแถวล่าง/บนจาก ballisticData ที่ครอบ dist
           lower.r <= dist <= upper.r
         ratio = (dist - lower.r) / (upper.r - lower.r)
         elevValue = lerp(lower.elev, upper.elev, ratio)
         tofValue  = lerp(lower.tof,  upper.tof,  ratio)
         elev = ปัด elevValue เป็นจำนวนเต็ม (string)
         tof  = tofValue ปัดทศนิยม 1 ตำแหน่ง + " s"
         status = "SOLUTION COMPUTED"

ส่วนติดต่อผู้ใช้ (UI):
  แสดงคำแนะนำ:
    - ให้ผู้ใช้เปิดเว็บแผนที่ arma-mortar.com
    - คัดลอกค่าพิกัด X/Y แล้วกรอกลงในช่องของเว็บนี้

  ส่วนกรอกข้อมูล:
    กล่องกรอกตำแหน่งปืนใหญ่ (Battery Position):
      - ช่อง EASTING (X) → อัปเดต batX
      - ช่อง NORTHING (Y) → อัปเดต batY

    กล่องกรอกตำบลกระสุนตก (Target):
      - ช่อง EASTING (X) → อัปเดต tgtX
      - ช่อง NORTHING (Y) → อัปเดต tgtY

  ส่วนปรับระยะ (Range Corrections):
    ปุ่มด้านบน (ADD / Further):
      เมื่อกดแต่ละปุ่ม:
        เรียก adjust("corrRange", ±10/20/50)
        ทิศ + หรือ - จะสลับตาม effectiveSouthDirection
    อินพุตตัวเลขกลาง:
      แก้ค่า corrRange ตรง ๆ ได้

  ส่วนกราฟิกจุดตก:
    พื้นหลัง:
      - วาด grid ด้วย SVG
      - แสดงเส้น crosshair ตรงกลาง
      - มุมขวาบนมีเข็มชี้ทิศเหนือ (N)

    การซูม (mouse wheel):
      เมื่อหมุน:
        ปรับค่า zoom ให้อยู่ในช่วง 0.5–10

    การแพนแนวนอน (ลากด้วยเมาส์ซ้ายบนพื้นหลัง):
      คำนวณ deltaX จากตำแหน่งเมาส์เริ่ม–ปัจจุบัน
      อัปเดต panX ตาม deltaX / zoom

    จุดเป้าหมายหลัก (TARGET สีแดง):
      วางตาม targetPos (เปอร์เซ็นต์ x/y ภายในกล่อง)
      สามารถลากได้:
        - คำนวณ deltaX, deltaY จากสัดส่วนของ container
        - จำกัดให้อยู่ในช่วง 0–100%
        - อัปเดต targetPos
      แสดง label:
        - "จุดตก (TARGET)"
        - พิมพ์ค่าพิกัด X/Y ที่กรอก (หรือ --- ถ้ายังไม่กรอก)

    จุดเป้าหมายหลังแก้ไข (ADJUSTED สีเหลือง, กระพริบ):
      แสดงเมื่อ corrRange หรือ corrLat ไม่เท่ากับ 0 และ azimuthRad != null:
        - คำนวณ shiftX, shiftY จาก corrRange/corrLat และ azimuthRad
        - แปลงเป็นการเลื่อนบนกราฟิก โดยใช้ scale factor (0.6)
        - คำนวณตำแหน่ง adjustedX/Y และจำกัด 0–100%
        - สร้างข้อความแสดง:
            corrRange: แสดง +/– ระยะ
            corrLat:   แสดง ซ้าย/ขวา (เมตร)
        - วาดจุดสีเหลือง + label "ADJUSTED"

    เส้นเชื่อมระหว่างจุดตกหลักกับจุดที่ถูกแก้:
      ถ้ามีการแก้ไข:
        วาดเส้น SVG จาก targetPos → adjustedX/Y (เส้นประสีเหลือง)

  ส่วนปรับมุมซ้าย–ขวา (Left/Right Controls):
    ปุ่มฝั่ง L (L10, L20, L50) → เรียก adjust("corrLat", -10/-20/-50)
    ปุ่มฝั่ง R (R10, R20, R50) → เรียก adjust("corrLat", +10/+20/+50)
    การจัดเรียงปุ่มจะกลับด้านเมื่อ effectiveSouthDirection เป็น true
    อินพุตตัวเลขกลาง:
      ใช้แก้ corrLat ตรง ๆ
      แสดงข้อความ:
        - ถ้า corrLat > 0 → "ไปทางขวา {corrLat} M"
        - ถ้า corrLat < 0 → "ไปทางซ้าย {abs(corrLat)} M"
        - ถ้า corrLat == 0 → "ไม่มีการแก้องศาการยิง"

  ส่วนแสดงผลการยิง (Firing Solution):
    ใช้ค่าจาก result:
      - Azimuth (mils) + แปลงเป็นองศา (degrees)
      - Elevation (mils) – เน้นด้วยสีแดง
      - Final Range (ระยะสุดท้าย)
      - Time of Flight (TOF)
    ด้านล่างมีพื้นที่ข้อความสถานะ:
      แสดง result.status และใช้สีจาก result.statusClass

  ส่วนตาราง ballistic ดิบ:
    ปุ่ม "VIEW RAW BALLISTIC TABLE" สำหรับเปิด/ปิด:
      - คลิกแล้ว toggle ค่า showTable
    เมื่อ showTable == true:
      - แสดง ballisticData ทั้งหมดในรูปตาราง:
          คอลัมน์ RANGE, ELEV (MIL), TOF (SEC)
      - แถวที่ elevation ใกล้เคียงกับ result.elev ที่สุด 2 แถว
        จะถูก highlight พิเศษ (พื้นหลัง/ตัวหนังสือเหลือง)

สิ้นสุด pseudocode วิธีทำงานโดยรวมของเว็บ M777
```


