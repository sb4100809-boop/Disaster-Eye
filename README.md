# 🚨 Disaster-Eye: Emergency Management Platform
> **"One Nation, One Response, Many Life Savior"**

Disaster-Eye is a full-stack, AI-powered emergency reporting and disaster management platform. It is designed to bridge the gap between citizens in distress and emergency responders by streamlining incident reporting, automating severity triage using Artificial Intelligence, and actively dispatching registered volunteers based on geolocation and required skills.

---

## 🌟 Key Features

### 1. 🤖 AI-Powered Severity Triage
* **Intelligent Analysis:** When a user submits an incident report (e.g., "Heavy flooding on Main St, water entering homes"), the backend uses Generative AI (Gemini) to semantically analyze the text.
* **Auto-Action Plans:** The AI automatically categorizes the incident into a **Severity Score** (Critical, High, Medium, Low) and generates a structured **Action Plan** for the emergency dispatchers.

### 2. 📧 Automated Status Workflows & Communications
* **Admin Dashboard:** A highly secure, modern dashboard where administrators can view all incoming reports, filter them by AI Severity, Status, or Type.
* **Email Engine Integration:** When an Admin changes an incident status to **"Responders Dispatched"** or **"Resolved"**, the Python backend triggers an automated, professionally formatted HTML email to the original reporter to keep them informed in real-time.

### 3. 👥 Intelligent Volunteer Dispatching
* **Skills-Based Registration:** Citizens can sign up as volunteers, listing their specific skills (Medical, Search & Rescue, Logistics, etc.) and availability.
* **Smart Filtering:** The platform allows Admins to actively sort and filter the volunteer database to find the exact help needed in a specific area.

### 4. 📍 SOS Geo-Location & Interactive Maps
* **One-Click SOS Panic Button:** For immediate danger, users can click a single button that captures their live GPS coordinates, reverse-geocodes it into a readable street address (via Nominatim API), and auto-submits a Critical alert.
* **React-Leaflet Integration:** Users can manually drop a pin on an interactive map to report disaster locations accurately without typing out complex addresses.

### 5. 🌦️ Live Environmental & IoT Monitoring
* **Open-Meteo API:** A live sidebar dynamically fetches the user's local weather data (Temperature, Humidity, Wind Speed) based on their coordinates.
* **IoT Sensor Simulation:** Demonstrates integration capabilities with ground-level structural IoT sensors (e.g., Seismic "Motion" sensors for earthquakes).

### 6. 📊 One-Click CSV Data Export
* Built specifically for administrative logging and academic evaluation, the system allows Admins to instantly download raw incident and volunteer data into a fully formatted CSV spreadsheet.

### 7. 💬 Local AI Survival Chatbot
* An integrated, floating AI Assistant that provides immediate, step-by-step survival guidelines for various disaster types (Earthquake, Fire, Flood) directly on the interface.

---

## 🛠️ Technology Stack

### **Frontend**
* **React.js**: Core UI framework.
* **Vanilla CSS3**: Custom modern aesthetics, glassmorphism, dynamic gradients, and responsive layouts.
* **React-Leaflet**: Interactive map rendering and coordinate handling.
* **Lucide / FontAwesome**: Vector iconography.

### **Backend**
* **Python / Flask**: High-performance API server.
* **SQLite3**: Lightweight, relational database management for Incidents and Volunteer logs.
* **Flask-CORS**: Secure cross-origin request handling.
* **SMTP (smtplib)**: Secure Email transmission engine.
* **Google Generative AI API**: Powers the semantic analysis and severity triage engine.

---

## 🚀 Installation & Setup

### Prerequisites
Make sure you have **Node.js** (for the frontend) and **Python 3.8+** (for the backend) installed on your system.

### 1. Database & Backend Setup
1. Open a terminal and navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install the required Python dependencies:
   ```bash
   pip install flask flask-cors requests google-generativeai
   ```
3. Run the Flask Server (Ensure encoding is set for Windows environments):
   ```bash
   # Windows PowerShell
   $env:PYTHONIOENCODING="utf-8"; python app.py
   ```
   *The backend will start on `http://localhost:5001` and automatically initialize the SQLite database (`disaster_eye.db`).*

### 2. Frontend Setup
1. Open a new, separate terminal and navigate to the root directory of the project:
   ```bash
   cd Disaster-Eye
   ```
2. Install the Node modules:
   ```bash
   npm install
   ```
3. Start the React Development Server:
   ```bash
   npm start
   ```
   *The application will automatically open in your default browser at `http://localhost:3000`.*

---

## 🔐 Administrative Access
To access the Secure Admin Dashboard, click on the **Admin** tab in the main navigation bar. 
* **Master Password:** `admin123` (Configurable in source code).

---
*Developed for academic evaluation to demonstrate full-stack integration, API utilization, and AI-driven workflow automation.*
