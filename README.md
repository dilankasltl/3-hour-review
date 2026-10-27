# 3 HRS. TRACKING - Production Review System

A real-time, industrial manufacturing 3-Hour Review and Tracking Sheet web application built with **Node.js, Express, MongoDB Atlas, and Modern Responsive UI**.

Designed to replicate standard manufacturing tire / automotive / production tracking spreadsheets with automatic 3-hour subtotal rollups, shift auto-detection, auto-saving, and history lookup.

---

## 🚀 Key Features

1. **3-Hour Interval Rollups**:
   - **DAY Shift (07:00 - 19:00)**:
     - Block 1: `07:00 - 08:00`, `08:00 - 09:00`, `09:00 - 10:00` ➔ **Subtotal (07:00 - 10:00)**
     - Block 2: `10:00 - 11:00`, `11:00 - 12:00`, `12:00 - 13:00` ➔ **Subtotal (10:00 - 13:00)**
     - Block 3: `13:00 - 14:00`, `14:00 - 15:00`, `15:00 - 16:00` ➔ **Subtotal (13:00 - 16:00)**
     - Block 4: `16:00 - 17:00`, `17:00 - 18:00`, `18:00 - 19:00` ➔ **Subtotal (16:00 - 19:00)**
     - ➔ **GRAND TOTAL**
   - **NIGHT Shift (19:00 - 07:00 Next Day)**:
     - Block 1: `19:00 - 20:00`, `20:00 - 21:00`, `21:00 - 22:00` ➔ **Subtotal (19:00 - 22:00)**
     - Block 2: `22:00 - 23:00`, `23:00 - 00:00`, `00:00 - 01:00` ➔ **Subtotal (22:00 - 01:00)**
     - Block 3: `01:00 - 02:00`, `02:00 - 03:00`, `03:00 - 04:00` ➔ **Subtotal (01:00 - 04:00)**
     - Block 4: `04:00 - 05:00`, `05:00 - 06:00`, `06:00 - 07:00` ➔ **Subtotal (04:00 - 07:00)**
     - ➔ **GRAND TOTAL**

2. **Auto Shift & Live Clock**:
   - Real-time live date and 24-hr clock.
   - Automatically detects **DAY Shift** (07:00 - 19:00) vs **NIGHT Shift** (19:00 - 07:00) based on actual time.
   - User can seamlessly toggle between DAY and NIGHT shifts or select any past date.

3. **Shift Crew Selection**:
   - Easily assign shifts to Crew **A**, **B**, or **C**.

4. **Columns & Calculations**:
   - `Time`
   - `Plan (Pcs)`
   - `Achievement (Pcs)`
   - `Loss (Pcs)`: Auto-calculated as `Plan - Achievement` (negative losses highlighted in green, positive losses in red).
   - `Defect / Scrap`: Multi-line text for defect recording.
   - `Flash (Kg)`
   - `Problem . Issue`
   - `Root Cause`
   - `Containment Action`
   - `PC Number / I:R`

5. **5 Default Issue Lines Per Hour + Dynamic Expansion**:
   - Each hour contains 5 default rows for issue tracking.
   - Click `+ Add Line` on any hour to dynamically add 6th, 7th, or more lines!

6. **Cloud Database Auto-Save**:
   - Automatically saves every keystroke (debounced 1.2s) to **MongoDB Atlas**.
   - Visual status indicator: `● Saved`, `⟳ Saving...`, `⚠ Error`.
   - Dedicated "Save Now" button for manual confirmation.

7. **History & Past Days Review**:
   - Browse saved sheets by date, shift type, and crew with total KPI overviews.

8. **Export & Print**:
   - **Excel Export**: Download complete formatted `.xlsx` spreadsheet matching factory standards.
   - **Print Ready**: Optimized print layout for A4/letter paper or PDF generation.

---

## 🛠️ Setup & Running

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment (`.env`)
```env
PORT=5000
MONGODB_URI=mongodb+srv://savindudilanka9793_db_user:wYYrPg44XVpA4dlj@cluster0.yirgtnn.mongodb.net/three_hour_tracking?retryWrites=true&w=majority
```

### 3. Start the Server
```bash
npm start
```

Open your browser and navigate to:
```
http://localhost:5000
```

---

## 🇱🇰 සිංහල උපදෙස් (Sinhala Guide)

- **දිනය සහ Shift එක**: දවසේ වේලාව අනුව Day Shift (07.00 - 19.00) හෝ Night Shift (19.00 - 07.00) auto තෝරාගනී. අවශ්‍ය නම් උඩ තියෙන බටන් වලින් මාරු කළ හැක.
- **Crew**: Shift A, B, C කැමති එකක් තෝරන්න.
- **පැයෙන් පැයට දත්ත**: Plan, Achievement, Flash දැමූ විට Loss එක auto calculate වේ (`Loss = Plan - Achievement`).
- **පැය 3 න් 3 ට Subtotal**: පැය තුනකට වරක් කළු පාට bar එකේ subtotal එක සහ sheet එකේ යටින් Grand Total එක auto හැදේ.
- **ප්‍රශ්න/ගැටළු (Issues)**: පැයකට default පේලි 5ක් ඇති අතර, තවත් පේලි අවශ්‍ය නම් `+ Add Line` ඔබන්න.
- **Auto Save**: ඔබ type කරන සෑම දෙයක්ම MongoDB එකට කෙලින්ම save වේ.
- **පැරණි දත්ත බැලීම**: `Past Records` ඔබා ඕනෑම දවසක Day/Night දත්ත නැවත ලබාගත හැක.
- **Excel බාගත කිරීම**: `Export Excel (.xlsx)` ඔබා Excel sheet එකක් ලබාගත හැක.
