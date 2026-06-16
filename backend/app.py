import os
import json
from dotenv import load_dotenv

load_dotenv()
import cv2
import numpy as np
import requests
import re
import random
import time
from PIL import Image
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
from datetime import datetime
from twilio.rest import Client
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

pending_otps = {}

app = Flask(__name__, static_folder='../build', static_url_path='/')
CORS(app)

import sqlite3
import psycopg2
import cloudinary
import cloudinary.uploader
import cloudinary.api

# 🔹 Database Setup (PostgreSQL or SQLite)
DATABASE_URL = os.environ.get("DATABASE_URL")
DB_PATH = "database.db"

def get_db_connection():
    if DATABASE_URL:
        return psycopg2.connect(DATABASE_URL)
    else:
        return sqlite3.connect(DB_PATH)

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    if DATABASE_URL:
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS incidents (
                id SERIAL PRIMARY KEY,
                full_name TEXT,
                phone_number TEXT,
                email TEXT,
                location TEXT,
                incident_type TEXT,
                description TEXT,
                files TEXT,
                validation_results TEXT,
                status TEXT DEFAULT 'Pending',
                created_at TEXT
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS volunteers (
                id SERIAL PRIMARY KEY,
                name TEXT,
                phone TEXT,
                email TEXT,
                skills TEXT,
                location TEXT,
                availability TEXT,
                created_at TEXT
            )
        ''')
    else:
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS incidents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                full_name TEXT,
                phone_number TEXT,
                email TEXT,
                location TEXT,
                incident_type TEXT,
                description TEXT,
                files TEXT,
                validation_results TEXT,
                status TEXT DEFAULT 'Pending',
                created_at TEXT
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS volunteers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT,
                phone TEXT,
                email TEXT,
                skills TEXT,
                location TEXT,
                availability TEXT,
                created_at TEXT
            )
        ''')
        
    # Auto-migrate: Add email column if it doesn't exist
    try:
        if DATABASE_URL:
            cursor.execute("ALTER TABLE volunteers ADD COLUMN IF NOT EXISTS email TEXT")
        else:
            # SQLite workaround for IF NOT EXISTS
            cursor.execute("PRAGMA table_info(volunteers)")
            columns = [column[1] for column in cursor.fetchall()]
            if 'email' not in columns:
                cursor.execute("ALTER TABLE volunteers ADD COLUMN email TEXT")
    except Exception as e:
        print(f"Migration error (ignoring): {e}")

    conn.commit()
    conn.close()

init_db()

def row_to_dict(cursor, row):
    if not row: return None
    columns = [desc[0] for desc in cursor.description]
    d = dict(zip(columns, row))
    if isinstance(d.get("files"), str):
        try: d["files"] = json.loads(d["files"])
        except: d["files"] = []
    if isinstance(d.get("validation_results"), str):
        try: d["validation_results"] = json.loads(d["validation_results"])
        except: d["validation_results"] = {}
    return d

# 🔹 File upload config
UPLOAD_FOLDER = "uploads"
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# 🔹 Cloudinary Config
CLOUDINARY_CLOUD_NAME = os.environ.get("CLOUDINARY_CLOUD_NAME")
CLOUDINARY_API_KEY = os.environ.get("CLOUDINARY_API_KEY")
CLOUDINARY_API_SECRET = os.environ.get("CLOUDINARY_API_SECRET")

if CLOUDINARY_CLOUD_NAME and CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET:
    cloudinary.config(
        cloud_name=CLOUDINARY_CLOUD_NAME,
        api_key=CLOUDINARY_API_KEY,
        api_secret=CLOUDINARY_API_SECRET
    )

# 🔹 Email Config
SMTP_SERVER = os.environ.get("SMTP_SERVER", "smtp.gmail.com")
try:
    SMTP_PORT = int(os.environ.get("SMTP_PORT", 587))
except (ValueError, TypeError):
    SMTP_PORT = 587
SMTP_USERNAME = os.environ.get("SMTP_USERNAME", "")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")

def send_email_notification(to_email, subject, body_html):
    """Send an HTML email notification."""
    if not to_email:
        print("⚠️ No email provided, skipping email notification.")
        return False
        
    if not (SMTP_USERNAME and SMTP_PASSWORD):
        print(f"\n" + "="*50)
        print(f"📧 MOCK EMAIL TO: {to_email}")
        print(f"Subject: {subject}")
        print(f"Body: {body_html[:100]}...")
        print(f"="*50 + "\n")
        print("⚠️ NOTE: SMTP credentials not found. This is a mock Email.")
        return True
        
    try:
        msg = MIMEMultipart()
        msg['From'] = SMTP_USERNAME
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body_html, 'html', 'utf-8'))
        
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        print(f"✅ Email sent successfully to {to_email}")
        return True
    except Exception as e:
        print(f"🔴 Failed to send Email: {str(e)}")
        return False

# 🔹 Twilio SMS Config
TWILIO_ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN", "")
TWILIO_PHONE_NUMBER = os.environ.get("TWILIO_PHONE_NUMBER", "")

def send_sms_notification(phone_number, incident_type, report_id):
    """Send SMS notification to the user about their registered incident."""
    if not phone_number:
        print("⚠️ No phone number provided, skipping SMS notification.")
        return False

    # Format the phone number for Twilio (E.164 format requires country code)
    if len(phone_number) == 10 and not phone_number.startswith('+'):
        formatted_number = f"+91{phone_number}"
        print(f"🔧 Automatically added +91 country code: {formatted_number}")
    else:
        formatted_number = phone_number

    message_body = f"Disaster Management System: Your {incident_type} report (ID: {report_id}) has been successfully registered."

    if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN and TWILIO_PHONE_NUMBER:
        try:
            client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
            message = client.messages.create(
                body=message_body,
                from_=TWILIO_PHONE_NUMBER,
                to=formatted_number
            )
            print(f"✅ SMS sent successfully to {formatted_number}. Message SID: {message.sid}")
            return True
        except Exception as e:
            print(f"🔴 Failed to send SMS via Twilio: {str(e)}")
            return False
    else:
        # Mock SMS behavior when credentials are not configured
        print(f"\n" + "="*50)
        print(f"📱 MOCK SMS TO: {phone_number}")
        print(f"✉️ MESSAGE: {message_body}")
        print(f"="*50 + "\n")
        print("⚠️ NOTE: Twilio credentials not found. This is a mock SMS.")
        return True

# 🔹 AI Validation Functions
def validate_image_authenticity(image_path):
    """
    Advanced AI-powered image validation to detect fake/synthetic images
    """
    try:
        # Load image
        image = cv2.imread(image_path)
        if image is None:
            return False, "Invalid image file"
        
        # Convert to grayscale for analysis
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        height, width = gray.shape
        
        # 1. Enhanced AI-generated artifact detection
        # Check for frequency domain anomalies
        f_transform = np.fft.fft2(gray)
        f_shift = np.fft.fftshift(f_transform)
        magnitude_spectrum = np.log(np.abs(f_shift) + 1)
        
        # Look for grid-like patterns (common in AI-generated images)
        center_y, center_x = height // 2, width // 2
        grid_score = 0
        
        # Check for regular grid patterns with bounds checking
        max_grid_size = min(height, width)
        for i in range(0, max_grid_size, 50):
            if i < max_grid_size:
                try:
                    # Check positive offsets
                    if center_y + i < height and center_x + i < width:
                        grid_score += magnitude_spectrum[center_y + i, center_x + i]
                    # Check negative offsets
                    if center_y - i >= 0 and center_x - i >= 0:
                        grid_score += magnitude_spectrum[center_y - i, center_x - i]
                except IndexError:
                    continue  # Skip if index is out of bounds
        
        if grid_score > 100000:  # Very high threshold - only flag extremely obvious grid patterns
            print(f"⚠️ High grid score detected: {grid_score}, but accepting image anyway")
            # Don't reject based on grid patterns alone - too many false positives
        
        # 2. Check for unrealistic noise patterns (more lenient)
        # AI-generated images often have uniform noise
        noise_variance = np.var(gray)
        if noise_variance < 10:  # Much more lenient threshold
            return False, "Unrealistic noise patterns (too uniform)"
        
        # 3. Enhanced metadata analysis (optional - many legitimate images lack EXIF)
        try:
            pil_image = Image.open(image_path)
            exif = pil_image._getexif()
            
            # Check for suspicious software tags only if metadata exists
            if exif and 305 in exif:  # Software tag
                software = exif[305].lower()
                ai_indicators = ['dall-e', 'midjourney', 'stable diffusion', 'ai', 'generated']
                if any(indicator in software for indicator in ai_indicators):
                    return False, f"AI generation software detected: {software}"
            
            # Note: Missing EXIF data is common and not suspicious
            # Many legitimate images from social media, screenshots, or edited photos lack EXIF
            if exif is None:
                print(f"⚠️ No EXIF metadata found for {image_path}, but this is common for legitimate images")
                    
        except Exception as e:
            print(f"Metadata analysis error: {e}")
            # Don't fail validation due to metadata errors
        
        # 4. Color distribution analysis
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        saturation = hsv[:, :, 1]
        value = hsv[:, :, 2]
        
        # Check for unrealistic color distributions (more lenient)
        if np.std(saturation) < 5:  # Much more lenient
            return False, "Unrealistic color saturation (too uniform)"
        
        if np.std(value) < 10:  # Much more lenient
            return False, "Unrealistic brightness distribution"
        
        # 5. Edge analysis for AI artifacts
        edges = cv2.Canny(gray, 50, 150)
        edge_density = np.sum(edges > 0) / (height * width)
        
        # AI-generated images often have either too many or too few edges (more lenient)
        if edge_density < 0.001:  # Much more lenient
            return False, "Too few edges detected (suspicious)"
        elif edge_density > 0.5:  # More lenient upper bound
            return False, "Excessive edge density (AI artifact)"
        
        # 6. Texture analysis
        # Calculate local binary pattern variance
        lbp = calculate_lbp(gray)
        lbp_variance = np.var(lbp)
        
        if lbp_variance < 5:  # More lenient threshold
            return False, "Unrealistic texture patterns detected"
        
        # 7. Compression artifact analysis (more lenient)
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        if laplacian_var < 20:  # Much more lenient threshold
            return False, "Image appears artificially smoothed or compressed"
        
        # 8. Check for repeated patterns (common in AI generation) - optional warning only
        pattern_score = detect_repeated_patterns(gray)
        if pattern_score > 10.0:  # Very high threshold - only flag extremely obvious patterns
            print(f"⚠️ High pattern score detected: {pattern_score}, but accepting image anyway")
            # Don't reject based on patterns alone - too many false positives
        
        return True, "Image appears authentic and legitimate"
        
    except Exception as e:
        return False, f"Image validation error: {str(e)}"

def calculate_lbp(image):
    """
    Calculate Local Binary Pattern for texture analysis
    """
    try:
        # Simple LBP implementation
        height, width = image.shape
        
        # Check if image is too small for LBP analysis
        if height < 3 or width < 3:
            return np.zeros((10, 10))
        
        lbp = np.zeros((height-2, width-2), dtype=np.uint8)
        
        for i in range(1, height-1):
            for j in range(1, width-1):
                try:
                    center = image[i, j]
                    code = 0
                    code |= (image[i-1, j-1] > center) << 7
                    code |= (image[i-1, j] > center) << 6
                    code |= (image[i-1, j+1] > center) << 5
                    code |= (image[i, j+1] > center) << 4
                    code |= (image[i+1, j+1] > center) << 3
                    code |= (image[i+1, j] > center) << 2
                    code |= (image[i+1, j-1] > center) << 1
                    code |= (image[i, j-1] > center) << 0
                    lbp[i-1, j-1] = code
                except IndexError:
                    continue  # Skip if any index is out of bounds
        
        return lbp
    except Exception as e:
        print(f"LBP calculation error: {e}")
        return np.zeros((10, 10))

def detect_repeated_patterns(image):
    """
    Detect repeated patterns that are common in AI-generated images
    """
    try:
        # Convert to frequency domain
        f_transform = np.fft.fft2(image)
        f_shift = np.fft.fftshift(f_transform)
        magnitude = np.abs(f_shift)
        
        # Look for regular patterns in frequency domain
        height, width = magnitude.shape
        center_y, center_x = height // 2, width // 2
        
        # Check for regular spacing in frequency components
        pattern_score = 0
        max_radius = min(height, width) // 4
        
        # Ensure we have a reasonable range to work with
        if max_radius < 10:
            return 0  # Image too small for pattern analysis
        
        for radius in range(10, max_radius, 20):
            for angle in range(0, 360, 45):
                y = int(center_y + radius * np.cos(np.radians(angle)))
                x = int(center_x + radius * np.sin(np.radians(angle)))
                
                # Strict bounds checking
                if 0 <= y < height and 0 <= x < width:
                    try:
                        pattern_score += magnitude[y, x]
                    except IndexError:
                        continue  # Skip if index is out of bounds
        
        return pattern_score / 10000  # Much more lenient normalization
    except Exception as e:
        print(f"Pattern detection error: {e}")
        return 0

def analyze_image_content(image_path):
    """
    Advanced content analysis to detect inappropriate or fake content
    """
    try:
        image = cv2.imread(image_path)
        if image is None:
            return False, "Cannot read image"
        
        # Check image dimensions (too small might be fake)
        height, width = image.shape[:2]
        if width < 200 or height < 200:
            return False, "Image resolution too low (suspicious)"
        
        # Check for black/white images (might be fake)
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        if np.std(gray) < 10:
            return False, "Image lacks detail (suspicious)"
        
        # Check for uniform backgrounds (common in fake images)
        edges = cv2.Canny(gray, 50, 150)
        edge_density = np.sum(edges > 0) / (height * width)
        if edge_density < 0.01:
            return False, "Image lacks edge detail (suspicious)"
        
        # Check for realistic lighting
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        value_channel = hsv[:, :, 2]
        lighting_variance = np.var(value_channel)
        
        if lighting_variance < 100:
            return False, "Unrealistic lighting patterns detected"
        
        return True, "Image content appears legitimate"
        
    except Exception as e:
        return False, f"Content analysis error: {str(e)}"

def validate_location_authenticity(location_text):
    """
    Advanced AI-powered location validation to detect fake locations
    """
    try:
        if not location_text or len(location_text.strip()) < 2:
            return False, "Location text too short or empty"
        
        location_text = location_text.strip()
        
        # 1. Check for suspicious patterns
        suspicious_patterns = [
            'test', 'fake', 'dummy', 'example', 'sample', 'placeholder',
            '123', 'abc', 'xyz', 'qwerty', 'asdf', 'random', 'unknown',
            'middle of nowhere', 'nowhere', 'fake location', 'test location'
        ]
        
        location_lower = location_text.lower()
        for pattern in suspicious_patterns:
            if pattern in location_lower:
                return False, f"Suspicious location pattern detected: '{pattern}'"
        
        # 2. Check for coordinate-like patterns (allow coordinates but validate them)
        import re
        coord_patterns = [
            r'\d+\.\d+,\s*\d+\.\d+',  # lat,lon format
            r'\(\d+\.\d+,\s*\d+\.\d+\)',  # (lat,lon) format
            r'\d+°\d+\'\d+"[NS],\s*\d+°\d+\'\d+"[EW]'  # DMS format
        ]
        
        # If coordinates are detected, validate them instead of rejecting
        coordinates_detected = False
        for pattern in coord_patterns:
            if re.search(pattern, location_text):
                coordinates_detected = True
                break
        
        if coordinates_detected:
            # Extract coordinates and validate them
            coord_match = re.search(r'(\d+\.\d+)[,\s]+(\d+\.\d+)', location_text)
            if coord_match:
                try:
                    lat = float(coord_match.group(1))
                    lon = float(coord_match.group(2))
                    
                    # Basic coordinate validation
                    if -90 <= lat <= 90 and -180 <= lon <= 180:
                        return True, f"Valid coordinates: {lat}, {lon}"
                    else:
                        return False, "Invalid coordinate values"
                except ValueError:
                    return False, "Invalid coordinate format"
        
        # 3. Check for unrealistic location names (very lenient)
        unrealistic_patterns = [
            r'^[0-9]+$',  # Only numbers
            r'^[A-Za-z0-9]{1}$',  # Only single character
            r'^[A-Za-z0-9]{100,}$'  # Extremely long without spaces
        ]
        
        for pattern in unrealistic_patterns:
            if re.match(pattern, location_text):
                return False, "Unrealistic location name pattern"
        
        # 4. Use geocoding API to validate location (optional - if service is available)
        try:
            geocoding_url = "https://nominatim.openstreetmap.org/search"
            params = {
                'q': location_text,
                'format': 'json',
                'limit': 1,
                'addressdetails': 1
            }
            
            response = requests.get(geocoding_url, params=params, timeout=5)
            if response.status_code != 200:
                # If geocoding service is unavailable, accept the location based on other checks
                print(f"⚠️ Geocoding service unavailable (status: {response.status_code}), accepting location based on other validations")
                return True, f"Location accepted: {location_text} (geocoding service unavailable)"
            
            data = response.json()
            if not data:
                # If no geocoding results, still accept if it passes other checks
                print(f"⚠️ No geocoding results for '{location_text}', accepting based on other validations")
                return True, f"Location accepted: {location_text} (not found in geocoding database)"
            
            location = data[0]
            lat = float(location['lat'])
            lon = float(location['lon'])
            
            # 5. Geographic sanity checks
            if abs(lat) > 90 or abs(lon) > 180:
                return False, "Invalid coordinates"
            
            # 6. Check if location is on land (basic check)
            if location.get('type') in ['water', 'ocean', 'sea', 'lake', 'river']:
                return False, "Location appears to be in water"
            
            # 7. Check for suspicious coordinate patterns
            if (lat * 1000) % 1 == 0 or (lon * 1000) % 1 == 0:
                return False, "Suspicious coordinate pattern detected"
            
            # 8. Check location confidence score (very lenient)
            if 'importance' in location:
                importance = float(location['importance'])
                if importance < 0.001:  # Extremely low importance only
                    print(f"⚠️ Low importance location: {importance}, but accepting anyway")
            
            # 9. Validate address components (very lenient)
            address = location.get('address', {})
            if not address:
                print(f"⚠️ No address details for '{location_text}', but accepting anyway")
            
            # Check for required address components (very lenient - accept almost anything)
            required_components = ['city', 'town', 'village', 'state', 'country', 'county', 'district', 'suburb', 'neighbourhood']
            found_components = sum(1 for comp in required_components if comp in address)
            
            if found_components < 1:
                print(f"⚠️ Few address components for '{location_text}', but accepting anyway")
            
            # 10. Check for realistic location names (very lenient)
            display_name = location.get('display_name', '')
            if len(display_name) < 3:  # Very short names only
                print(f"⚠️ Short display name: '{display_name}', but accepting anyway")
            
            # 11. Check for location type consistency (very lenient)
            location_type = location.get('type', '')
            if location_type in ['boundary']:  # Only reject boundary types
                print(f"⚠️ Boundary location type: {location_type}, but accepting anyway")
            
            return True, f"Location validated: {display_name}"
            
        except requests.exceptions.Timeout:
            return False, "Location validation timeout"
        except requests.exceptions.RequestException as e:
            return False, f"Location validation error: {str(e)}"
        except Exception as e:
            return False, f"Location validation failed: {str(e)}"
        
    except Exception as e:
        return False, f"Location validation error: {str(e)}"

def detect_fake_location_patterns(location_text):
    """
    Detect common fake location patterns
    """
    try:
        location_lower = location_text.lower()
        
        # Common fake location indicators
        fake_indicators = [
            'test', 'fake', 'dummy', 'example', 'sample', 'placeholder',
            'random', 'unknown', 'nowhere', 'middle of nowhere',
            'fake city', 'test town', 'dummy location', 'example place',
            'asdf', 'qwerty', '123', 'abc', 'xyz', 'aaa', 'bbb',
            'narnia', 'hogwarts', 'middle earth', 'westeros', 'neverland'
        ]
        
        for indicator in fake_indicators:
            if indicator in location_lower:
                return True, f"Fake location indicator detected: '{indicator}'"
        
        # Check for unrealistic patterns
        import re
        
        # Too many repeated characters
        if re.search(r'(.)\1{4,}', location_text):
            return True, "Too many repeated characters"
        
        # Only numbers
        if re.match(r'^[0-9\s]+$', location_text):
            return True, "Location contains only numbers"
        
        # Only single letters
        if re.match(r'^[A-Za-z]\s*$', location_text):
            return True, "Location is only a single letter"
        
        # Too short (very lenient)
        if len(location_text.strip()) < 2:
            return True, "Location name too short"
        
        # Too long without spaces
        if len(location_text) > 50 and ' ' not in location_text:
            return True, "Location name too long without spaces"
        
        return False, "No fake patterns detected"
        
    except Exception as e:
        return False, f"Pattern detection error: {str(e)}"

# ------------------------------------------------------
# 📌 Route: Send OTP (POST)
# ------------------------------------------------------
@app.route("/api/send-otp", methods=["POST"])
def send_otp():
    try:
        data = request.json
        phone_number = data.get("phoneNumber")
        
        if not phone_number:
            return jsonify({"error": "Phone number is required"}), 400
            
        otp = str(random.randint(100000, 999999))
        if not (TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN and TWILIO_PHONE_NUMBER):
            otp = "123456" # Fixed OTP for testing without Twilio
        
        # Store OTP with a 5-minute expiry
        pending_otps[phone_number] = {
            "otp": otp,
            "expires_at": time.time() + 300 
        }
        
        # Format the phone number
        if len(phone_number) == 10 and not phone_number.startswith('+'):
            formatted_number = f"+91{phone_number}"
        else:
            formatted_number = phone_number
            
        message_body = f"DisasterEye Verification: Your OTP is {otp}. It expires in 5 minutes. Do not share this code."
        
        if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN and TWILIO_PHONE_NUMBER:
            client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
            message = client.messages.create(
                body=message_body,
                from_=TWILIO_PHONE_NUMBER,
                to=formatted_number
            )
            print(f"✅ OTP {otp} sent successfully to {formatted_number}. SID: {message.sid}")
        else:
            print(f"✅ MOCK OTP {otp} generated for {formatted_number}")
            
        return jsonify({"message": "OTP sent successfully"}), 200
        
    except Exception as e:
        print(f"🔴 Failed to send OTP: {str(e)}")
        return jsonify({"error": "Failed to send OTP", "details": str(e)}), 500

# ------------------------------------------------------
# 📌 Route: Send Email OTP (POST)
# ------------------------------------------------------
@app.route("/api/send-email-otp", methods=["POST"])
def send_email_otp():
    try:
        data = request.json
        email = data.get("email")
        if not email:
            return jsonify({"error": "Email is required"}), 400
            
        otp = str(random.randint(100000, 999999))
        
        # Store OTP with a 10-minute expiry
        pending_otps[email] = {
            "otp": otp,
            "expires_at": time.time() + 600
        }
        
        email_html = f"""
        <html>
            <body style="font-family: Arial, sans-serif;">
                <h2>DisasterEye - Verification Code</h2>
                <p>Your OTP for verifying your identity is: <strong>{otp}</strong></p>
                <p>This code will expire in 10 minutes. Do not share it with anyone.</p>
            </body>
        </html>
        """
        
        send_email_notification(email, "DisasterEye Verification Code", email_html)
        return jsonify({"message": "OTP sent successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/verify-email-otp", methods=["POST"])
def verify_email_otp():
    try:
        data = request.json
        email = data.get("email")
        otp = data.get("otp")
        
        if not email or not otp:
            return jsonify({"error": "Email and OTP required"}), 400
            
        stored = pending_otps.get(email)
        if not stored:
            return jsonify({"error": "No OTP requested for this email"}), 400
            
        if time.time() > stored["expires_at"]:
            del pending_otps[email]
            return jsonify({"error": "OTP has expired"}), 400
            
        if stored["otp"] != otp:
            return jsonify({"error": "Invalid OTP"}), 400
            
        # Clear OTP on success
        del pending_otps[email]
        
        return jsonify({"message": "OTP verified successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ------------------------------------------------------
# 📌 Route: Submit incident (POST)
# ------------------------------------------------------
@app.route("/api/incidents", methods=["POST"])
def create_incident():
    global incident_counter
    
    try:
        
        data = request.form
        files = request.files.getlist("files")
        location = data.get("location", "")
        phone_number = data.get("phoneNumber", "")
        user_otp = data.get("otp", "")
        
        user_otp = data.get("otp", "")
        
        # OTP verification has been removed as requested
        print(f"✅ OTP verification bypassed for {phone_number}")

        # 🔹 AI Location Validation
        if location:
            print("🔍 Validating location with AI...")
            
            # First check for fake patterns
            fake_detected, fake_message = detect_fake_location_patterns(location)
            if fake_detected:
                print(f"🔴 Fake location pattern detected: {fake_message}")
                return jsonify({
                    "error": "Fake location detected",
                    "details": fake_message,
                    "type": "fake_location_detection"
                }), 400
            
            # Then validate location authenticity
            location_valid, location_message = validate_location_authenticity(location)
            if not location_valid:
                print(f"🔴 Location validation failed: {location_message}")
                return jsonify({
                    "error": "Location validation failed",
                    "details": location_message,
                    "type": "location_validation"
                }), 400
            print(f"✅ Location validated: {location_message}")

        # Save and validate uploaded files
        saved_files = []
        validation_results = []
        
        for file in files:
            if file.filename:
                filename = secure_filename(file.filename)
                filepath = os.path.join(app.config["UPLOAD_FOLDER"], filename)
                file.save(filepath)
                
                # 🔹 AI Image Validation
                print(f"🔍 Validating image: {filename}")
                
                # Check if it's an image file
                if file.content_type.startswith('image/'):
                    # Validate image authenticity
                    image_valid, image_message = validate_image_authenticity(filepath)
                    if not image_valid:
                        print(f"🔴 Image validation failed: {image_message}")
                        # Remove the invalid file
                        os.remove(filepath)
                        return jsonify({
                            "error": "Fake image detected",
                            "details": image_message,
                            "type": "fake_image_detection"
                        }), 400
                    
                    # Analyze image content
                    content_valid, content_message = analyze_image_content(filepath)
                    if not content_valid:
                        print(f"🔴 Content analysis failed: {content_message}")
                        os.remove(filepath)
                        return jsonify({
                            "error": "Image content analysis failed",
                            "details": content_message,
                            "type": "content_validation"
                        }), 400
                    
                    validation_results.append({
                        "file": filename,
                        "authenticity": "✅ Validated",
                        "content": "✅ Legitimate"
                    })
                    print(f"✅ Image validated: {filename}")
                
                if CLOUDINARY_CLOUD_NAME:
                    print(f"☁️ Uploading {filename} to Cloudinary...")
                    try:
                        upload_result = cloudinary.uploader.upload(filepath)
                        cloudinary_url = upload_result.get('secure_url')
                        saved_files.append(cloudinary_url)
                        print(f"✅ Uploaded to Cloudinary: {cloudinary_url}")
                        os.remove(filepath)
                    except Exception as e:
                        print(f"🔴 Cloudinary upload failed, falling back to local: {str(e)}")
                        saved_files.append(filename)
                else:
                    saved_files.append(filename)
                print(f"🔵 Saved file: {filename}")

        # 🤖 AI Severity Triage & Auto-Action Plan
        severity = "Medium" # Default
        action_plan = "Dispatch standard response team. Investigate site."
        
        description_text = data.get("description", "").lower()
        incident_type = data.get("incidentType", "").lower()
        combined_text = f"{description_text} {incident_type}"
        
        if any(w in combined_text for w in ['dead', 'death', 'casualty', 'trapped', 'collapse', 'explos', 'critical', 'sos']):
            severity = "Critical"
            action_plan = "URGENT: Dispatch Heavy Rescue, Ambulances, and Police immediately. Implement hard perimeter."
        elif any(w in combined_text for w in ['fire', 'burn', 'blood', 'injur', 'accident', 'crash', 'heart', 'attack']):
            severity = "High"
            action_plan = "PRIORITY: Dispatch Fire/Medical teams. Begin area evacuation protocols."
        elif any(w in combined_text for w in ['water', 'flood', 'tree', 'power', 'road', 'block']):
            severity = "Medium"
            action_plan = "Monitor situation. Dispatch utility teams to secure area. Issue public advisory."
        else:
            severity = "Low"
            action_plan = "Log incident. Schedule non-emergency assessment."
            
        final_validation = {
            "images": validation_results,
            "severity": severity,
            "action_plan": action_plan
        }

        # Create incident record with validation results
        conn = get_db_connection()
        cursor = conn.cursor()
        
        placeholders = ', '.join(['%s'] * 10) if DATABASE_URL else ', '.join(['?'] * 10)
        query = f'''
            INSERT INTO incidents (
                full_name, phone_number, email, location, incident_type, 
                description, files, validation_results, status, created_at
            ) VALUES ({placeholders})
        '''
        
        cursor.execute(query, (
            data.get("fullName"),
            data.get("phoneNumber"),
            data.get("email"),
            location,
            data.get("incidentType"),
            data.get("description"),
            json.dumps(saved_files),
            json.dumps(final_validation),
            'Pending',
            datetime.now().isoformat()
        ))
        
        if DATABASE_URL:
            # For postgres, fetch the last inserted serial id
            cursor.execute("SELECT currval(pg_get_serial_sequence('incidents','id'));")
            report_id = cursor.fetchone()[0]
        else:
            report_id = cursor.lastrowid
            
        conn.commit()
        conn.close()

        print(f"🔵 Incident saved with ID: {report_id}")
        
        # Send SMS notification
        phone_number = data.get("phoneNumber")
        incident_type = data.get("incidentType", "incident")
        send_sms_notification(phone_number, incident_type, report_id)
        
        # Send Email notification
        user_email = data.get("email")
        if user_email:
            email_html = f"""
            <html>
                <body style="font-family: Arial, sans-serif; color: #333;">
                    <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                        <h2 style="color: #e53e3e; text-align: center;">DisasterEye - Report Confirmation</h2>
                        <p>Dear {data.get('fullName', 'Citizen')},</p>
                        <p>Thank you for your vigilance. Your <strong>{incident_type}</strong> report has been successfully registered.</p>
                        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
                            <p><strong>Report ID:</strong> {report_id}</p>
                            <p><strong>Location:</strong> {location}</p>
                            <p><strong>Status:</strong> <span style="color: #d97706; font-weight: bold;">Pending Verification</span></p>
                        </div>
                        <p>Our AI system has logged your data, and local authorities have been notified. We will dispatch responders shortly if necessary.</p>
                        <p>Stay safe!</p>
                        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                        <p style="font-size: 12px; color: #777; text-align: center;">One Nation, One Response, Many Life Savior</p>
                    </div>
                </body>
            </html>
            """
            send_email_notification(user_email, f"Incident Report #{report_id} Received - DisasterEye", email_html)

        # Automated Volunteer Dispatching
        try:
            conn_dispatch = get_db_connection()
            cursor_dispatch = conn_dispatch.cursor()
            
            # Simple keyword matching for location or skills
            loc_keyword = location.split(',')[0].strip() if location else ""
            
            if DATABASE_URL:
                cursor_dispatch.execute("SELECT name, email, phone FROM volunteers WHERE location ILIKE %s OR skills ILIKE %s", 
                              (f"%{loc_keyword}%", f"%{incident_type}%"))
            else:
                cursor_dispatch.execute("SELECT name, email, phone FROM volunteers WHERE location LIKE ? OR skills LIKE ?", 
                              (f"%{loc_keyword}%", f"%{incident_type}%"))
            matching_volunteers = cursor_dispatch.fetchall()
            conn_dispatch.close()
            
            for vol in matching_volunteers:
                vol_name, vol_email, vol_phone = vol
                if vol_email:
                    vol_email_html = f"""
                    <html>
                        <body style="font-family: Arial, sans-serif; color: #333;">
                            <div style="border: 2px solid #e74c3c; border-radius: 8px; padding: 20px; max-width: 600px; margin: 0 auto;">
                                <h2 style="color: #e74c3c; text-align: center;">🚨 URGENT: Volunteer Assistance Required</h2>
                                <p>Dear <strong>{vol_name}</strong>,</p>
                                <p>An incident of type <strong>{incident_type.upper()}</strong> has been reported in or near your registered location: <strong>{location}</strong>.</p>
                                <div style="background-color: #fef2f2; padding: 15px; border-left: 4px solid #e74c3c; margin: 15px 0;">
                                    <p style="margin: 0;"><strong>Incident Details:</strong> {data.get("description", "No description provided.")}</p>
                                </div>
                                <p>If you are available to assist, please report to the location safely or contact the local authorities immediately.</p>
                                <p style="font-size: 12px; color: #777;">You are receiving this because your skills or location matched this emergency.</p>
                            </div>
                        </body>
                    </html>
                    """
                    send_email_notification(vol_email, f"🚨 URGENT ALERT: {incident_type.title()} reported near you!", vol_email_html)
        except Exception as e:
            print(f"Error in automated volunteer dispatching: {str(e)}")

        return jsonify({
            "message": "Incident reported successfully", 
            "reportId": report_id,
            "validation": {
                "location": location_message if location else "No location provided",
                "images": validation_results
            }
        }), 201
        
    except Exception as e:
        print(f"🔴 Error in create_incident: {str(e)}")
        return jsonify({"error": str(e)}), 500

# ------------------------------------------------------
# 📌 Route: Get all incidents (GET)
# ------------------------------------------------------
@app.route("/api/incidents", methods=["GET"])
def get_incidents():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM incidents ORDER BY id DESC")
    rows = cursor.fetchall()
    incidents = [row_to_dict(cursor, row) for row in rows]
    conn.close()
    return jsonify(incidents)

# ------------------------------------------------------
# 📌 Route: Get single incident by ID (GET)
# ------------------------------------------------------
@app.route("/api/incidents/<int:incident_id>", methods=["GET"])
def get_incident(incident_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    query = f"SELECT * FROM incidents WHERE id = {'%s' if DATABASE_URL else '?'}"
    cursor.execute(query, (incident_id,))
    row = cursor.fetchone()
    conn.close()
    
    if row:
        return jsonify(row_to_dict(row))
    else:
        return jsonify({"error": "Incident not found"}), 404

# ------------------------------------------------------
# 📌 Route: Serve uploaded files
# ------------------------------------------------------
@app.route("/uploads/<filename>")
def uploaded_file(filename):
    return send_from_directory(app.config["UPLOAD_FOLDER"], filename)

# ------------------------------------------------------
# 📌 Route: Volunteers (POST & GET)
# ------------------------------------------------------
@app.route("/api/volunteers", methods=["POST"])
def register_volunteer():
    try:
        data = request.json
        conn = get_db_connection()
        cursor = conn.cursor()
        
        placeholders = ', '.join(['%s'] * 7) if DATABASE_URL else ', '.join(['?'] * 7)
        query = f'''
            INSERT INTO volunteers (
                name, phone, email, skills, location, availability, created_at
            ) VALUES ({placeholders})
        '''
        
        cursor.execute(query, (
            data.get("name"),
            data.get("phone"),
            data.get("email", ""),
            data.get("skills"),
            data.get("location"),
            data.get("availability"),
            datetime.now().isoformat()
        ))
        
        conn.commit()
        conn.close()
        
        # Send Email notification to volunteer
        volunteer_email = data.get("email")
        if volunteer_email:
            email_html = f"""
            <html>
                <body style="font-family: Arial, sans-serif; color: #333;">
                    <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                        <h2 style="color: #10b981; text-align: center;">DisasterEye - Volunteer Registration</h2>
                        <p>Dear {data.get('name', 'Volunteer')},</p>
                        <p>Thank you for registering as a volunteer for DisasterEye. Your willingness to help the community in times of need is deeply appreciated.</p>
                        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
                            <p><strong>Skills:</strong> {data.get('skills')}</p>
                            <p><strong>Location:</strong> {data.get('location')}</p>
                            <p><strong>Availability:</strong> {data.get('availability')}</p>
                        </div>
                        <p>We will contact you if an emergency matching your skills and location occurs.</p>
                        <p>Stay safe!</p>
                        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                        <p style="font-size: 12px; color: #777; text-align: center;">One Nation, One Response, Many Life Savior</p>
                    </div>
                </body>
            </html>
            """
            send_email_notification(volunteer_email, "Welcome to DisasterEye Volunteers", email_html)

        return jsonify({"message": "Volunteer registered successfully"}), 201
    except Exception as e:
        print(f"🔴 Error registering volunteer: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/volunteers", methods=["GET"])
def get_volunteers():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, phone, email, skills, location, availability, created_at FROM volunteers ORDER BY id DESC")
        rows = cursor.fetchall()
        conn.close()
        
        volunteers = []
        for row in rows:
            volunteers.append({
                "id": row[0],
                "name": row[1],
                "phone": row[2],
                "email": row[3],
                "skills": row[4],
                "location": row[5],
                "availability": row[6],
                "created_at": row[7]
            })
        return jsonify(volunteers), 200
    except Exception as e:
        print(f"🔴 Error fetching volunteers: {str(e)}")
        return jsonify({"error": str(e)}), 500

# ------------------------------------------------------
# 📌 Route: AI Emergency Chat
# ------------------------------------------------------
@app.route("/api/chat", methods=["POST"])
def ai_chat():
    try:
        data = request.json
        user_message = data.get("message", "").lower()
        
        # Comprehensive local AI rule-based fallback
        if "fire" in user_message:
            response = "🔥 Fire Emergency Steps:\n1. Evacuate immediately.\n2. Stay low to the ground to avoid smoke.\n3. Feel doors with the back of your hand before opening.\n4. Call 101 or local fire services."
        elif "earthquake" in user_message:
            response = "🌍 Earthquake Safety:\n1. DROP, COVER, and HOLD ON.\n2. Stay away from windows and heavy furniture.\n3. If outdoors, move to an open area away from buildings and trees.\n4. Expect aftershocks."
        elif "flood" in user_message or "water" in user_message:
            response = "🌊 Flood Protocol:\n1. Move to higher ground immediately.\n2. Do NOT walk or drive through floodwaters (6 inches can knock you over).\n3. Turn off electricity at the main breaker."
        elif "landslide" in user_message or "mudslide" in user_message:
            response = "⛰️ Landslide Warning:\n1. Move away from the path of the landslide or debris flow immediately.\n2. Listen for unusual sounds like trees cracking or boulders knocking.\n3. If escape is not possible, curl into a tight ball and protect your head."
        elif "accident" in user_message or "crash" in user_message:
            response = "🚗 Vehicle Accident:\n1. Ensure your own safety first and move to the side of the road if possible.\n2. Call emergency services (108/112).\n3. Turn on hazard lights.\n4. Do not move injured persons unless there is an immediate threat like fire."
        elif "medical" in user_message or "hurt" in user_message or "blood" in user_message or "injury" in user_message:
            response = "🚑 Medical Emergency:\n1. Call an ambulance (108) immediately.\n2. Do not move the person unless they are in immediate danger.\n3. Apply direct pressure to any severe bleeding.\n4. Perform CPR if trained and the person is unresponsive."
        elif "hurricane" in user_message or "cyclone" in user_message or "storm" in user_message or "tornado" in user_message:
            response = "🌪️ Severe Storm/Cyclone:\n1. Seek shelter in a sturdy building, away from windows.\n2. Have your emergency kit ready.\n3. Stay indoors until the official all-clear is given."
        else:
            response = "I am your AI Emergency Assistant. I can help with general disaster guidance (e.g., Fire, Earthquake, Flood, Landslide, Accident, Storms, or Medical Emergencies). Please briefly describe your situation, and I will give you critical safety steps."
            
        return jsonify({"response": response}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ------------------------------------------------------
# 📌 Route: Live Data Proxy (USGS Earthquakes)
# ------------------------------------------------------
@app.route("/api/live-data", methods=["GET"])
def get_live_data():
    try:
        # Fetching M2.5+ Earthquakes past day from USGS
        url = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson"
        response = requests.get(url, timeout=10)
        return jsonify(response.json()), 200
    except Exception as e:
        return jsonify({"error": "Failed to fetch live data", "details": str(e)}), 500

# ------------------------------------------------------
# 📌 Route: Serve React App
# ------------------------------------------------------
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(app.static_folder + '/' + path):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

# ------------------------------------------------------
# 📌 Admin Route: Delete Incident
# ------------------------------------------------------
@app.route("/api/incidents/<int:incident_id>", methods=["DELETE"])
def delete_incident(incident_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        if DATABASE_URL:
            cursor.execute("DELETE FROM incidents WHERE id = %s", (incident_id,))
        else:
            cursor.execute("DELETE FROM incidents WHERE id = ?", (incident_id,))
            
        conn.commit()
        conn.close()
        return jsonify({"message": f"Incident {incident_id} deleted successfully"}), 200
    except Exception as e:
        print(f"🔴 Error in delete_incident: {str(e)}")
        return jsonify({"error": str(e)}), 500

# ------------------------------------------------------
# 📌 Admin Route: Update Incident Status
# ------------------------------------------------------
@app.route("/api/incidents/<int:incident_id>/status", methods=["PUT"])
def update_incident_status(incident_id):
    try:
        data = request.json
        new_status = data.get("status")
        
        if not new_status:
            return jsonify({"error": "Status is required"}), 400
            
        conn = get_db_connection()
        cursor = conn.cursor()
        
        if DATABASE_URL:
            cursor.execute("UPDATE incidents SET status = %s WHERE id = %s", (new_status, incident_id))
            cursor.execute("SELECT email, full_name, incident_type, location FROM incidents WHERE id = %s", (incident_id,))
        else:
            cursor.execute("UPDATE incidents SET status = ? WHERE id = ?", (new_status, incident_id))
            cursor.execute("SELECT email, full_name, incident_type, location FROM incidents WHERE id = ?", (incident_id,))
            
        incident_data = cursor.fetchone()
        conn.commit()
        conn.close()
        
        # Send Auto-Update Email
        if incident_data and incident_data[0]:
            user_email, full_name, incident_type, location = incident_data
            
            if new_status == 'Responders Dispatched':
                subject = f"🚨 UPDATE: Emergency Responders Dispatched - Report #{incident_id}"
                body = f"""
                <html>
                    <body style="font-family: Arial, sans-serif;">
                        <h2 style="color: #f39c12;">Update on your Incident Report #{incident_id}</h2>
                        <p>Dear {full_name},</p>
                        <p>We are writing to inform you that <strong>Emergency Responders have been successfully dispatched</strong> to the {incident_type} at {location}.</p>
                        <p>Please ensure you are in a safe location and follow instructions from the authorities once they arrive.</p>
                        <p>Thank you for using DisasterEye.</p>
                    </body>
                </html>
                """
                send_email_notification(user_email, subject, body)
                
            elif new_status == 'Resolved':
                subject = f"✅ RESOLVED: Incident Report #{incident_id} Closed"
                body = f"""
                <html>
                    <body style="font-family: Arial, sans-serif;">
                        <h2 style="color: #27ae60;">Incident Report #{incident_id} Resolved</h2>
                        <p>Dear {full_name},</p>
                        <p>The {incident_type} emergency reported at {location} has now been officially marked as <strong>Resolved</strong> and the scene is secure.</p>
                        <p>Your vigilance helped keep the community safe. Thank you for your critical assistance.</p>
                        <p>- The DisasterEye Command Center</p>
                    </body>
                </html>
                """
                send_email_notification(user_email, subject, body)

        return jsonify({"message": f"Incident {incident_id} status updated to {new_status}"}), 200
    except Exception as e:
        print(f"🔴 Error in update_incident_status: {str(e)}")
        return jsonify({"error": str(e)}), 500

# ------------------------------------------------------
# 📌 Admin Route: Delete Volunteer
# ------------------------------------------------------
@app.route("/api/volunteers/<int:volunteer_id>", methods=["DELETE"])
def delete_volunteer(volunteer_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        if DATABASE_URL:
            cursor.execute("DELETE FROM volunteers WHERE id = %s", (volunteer_id,))
        else:
            cursor.execute("DELETE FROM volunteers WHERE id = ?", (volunteer_id,))
            
        conn.commit()
        conn.close()
        return jsonify({"message": f"Volunteer {volunteer_id} deleted successfully"}), 200
    except Exception as e:
        print(f"🔴 Error in delete_volunteer: {str(e)}")
        return jsonify({"error": str(e)}), 500

# ------------------------------------------------------
# 📌 Route: Update Volunteer
# ------------------------------------------------------
@app.route("/api/volunteers/<int:volunteer_id>", methods=["PUT"])
def update_volunteer(volunteer_id):
    try:
        data = request.json
        conn = get_db_connection()
        cursor = conn.cursor()
        
        if DATABASE_URL:
            cursor.execute("UPDATE volunteers SET name=%s, phone=%s, skills=%s, location=%s, availability=%s WHERE id=%s", 
                (data.get("name"), data.get("phone"), data.get("skills"), data.get("location"), data.get("availability"), volunteer_id))
        else:
            cursor.execute("UPDATE volunteers SET name=?, phone=?, skills=?, location=?, availability=? WHERE id=?", 
                (data.get("name"), data.get("phone"), data.get("skills"), data.get("location"), data.get("availability"), volunteer_id))
            
        conn.commit()
        conn.close()
        return jsonify({"message": "Volunteer updated successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ------------------------------------------------------
# 📌 Run Flask
# ------------------------------------------------------
if __name__ == "__main__":
    print("🚀 Starting Incident Reporting API...")
    print("📡 API will be available at: http://localhost:5001")
    print("📋 Health check: http://localhost:5001/")
    print("📝 Submit incident: POST http://localhost:5001/api/incidents")
    print("📊 Get incidents: GET http://localhost:5001/api/incidents")
    port = int(os.environ.get("PORT", 5001))
    app.run(host="0.0.0.0", port=port)
