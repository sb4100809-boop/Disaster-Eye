import React, { useState, useEffect, useCallback } from 'react';
import '../CSS/IncidentReporting.css';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet's default icon path issues with Webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Icon components (you can replace these with your preferred icon library)
const Icons = {
  Shield: () => <i className="fas fa-shield-alt"></i>,
  Phone: () => <i className="fas fa-phone-alt"></i>,
  Heart: () => <i className="fas fa-heart"></i>,
  
  User: () => <i className="fas fa-user-circle"></i>,
  MapPin: () => <i className="fas fa-map-marker-alt"></i>,
  LocationArrow: () => <i className="fas fa-location-arrow"></i>,
  Map: () => <i className="fas fa-map"></i>,
  AlertTriangle: () => <i className="fas fa-exclamation-triangle"></i>,
  Comment: () => <i className="fas fa-comment-dots"></i>,
  Camera: () => <i className="fas fa-camera"></i>,
  CloudUpload: () => <i className="fas fa-cloud-upload-alt"></i>,
  PaperPlane: () => <i className="fas fa-paper-plane"></i>,
  Lock: () => <i className="fas fa-lock"></i>,
  Spinner: () => <i className="fas fa-spinner fa-spin"></i>,
  SatelliteDish: () => <i className="fas fa-satellite-dish"></i>,
  Thermometer: () => <i className="fas fa-thermometer-half"></i>,
  Droplet: () => <i className="fas fa-tint"></i>,
  Wind: () => <i className="fas fa-wind"></i>,
  VolumeDown: () => <i className="fas fa-volume-down"></i>,
  Lightbulb: () => <i className="fas fa-lightbulb"></i>,
  Running: () => <i className="fas fa-running"></i>,
  Sync: () => <i className="fas fa-sync-alt fa-spin"></i>,
  CheckCircle: () => <i className="fas fa-check-circle"></i>,
  Images: () => <i className="fas fa-images"></i>,
  Video: () => <i className="fas fa-video"></i>,
  Home: () => <i className="fas fa-home"></i>,
  Ambulance: () => <i className="fas fa-ambulance"></i>,
  Tools: () => <i className="fas fa-tools"></i>,
  UserNurse: () => <i className="fas fa-user-nurse"></i>
};

const IncidentReportingSystem = () => {
  // Form state
  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    email: '',
    location: '',
    incidentType: '',
    description: ''
  });

  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [reportId, setReportId] = useState('');
  const [dragActive, setDragActive] = useState(false);

  // Map state
  const [showMap, setShowMap] = useState(false);
  const [mapPosition, setMapPosition] = useState([20.5937, 78.9629]); // Default to India center
  const [mapAddress, setMapAddress] = useState('');
  const [isFetchingAddress, setIsFetchingAddress] = useState(false);

  const LocationMarker = () => {
    const map = useMapEvents({
      async click(e) {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;
        setMapPosition([lat, lng]);
        
        setIsFetchingAddress(true);
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
          const data = await response.json();
          if (data && data.display_name) {
            setMapAddress(data.display_name);
          } else {
            setMapAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
          }
        } catch (error) {
          console.error("Geocoding error:", error);
          setMapAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        } finally {
          setIsFetchingAddress(false);
        }
      },
    });

    // Fix map rendering issues inside animated modals
    useEffect(() => {
      const timer = setTimeout(() => {
        map.invalidateSize();
      }, 300);
      return () => clearTimeout(timer);
    }, [map]);

    return mapPosition === null ? null : <Marker position={mapPosition}></Marker>;
  };

  const handleConfirmMapSelection = () => {
    setFormData(prev => ({
      ...prev,
      location: mapAddress || `${mapPosition[0].toFixed(6)}, ${mapPosition[1].toFixed(6)}`
    }));
    setShowMap(false);
  };

  // Sensor data state
  const [sensorData, setSensorData] = useState({
    temperature: 22.5,
    humidity: 45,
    airQuality: 65,
    soundLevel: 38,
    lightLevel: 750,
    motion: true,
    vibration: 0.1,
    lastUpdate: new Date()
  });

  // Validation errors
  const [errors, setErrors] = useState({});

  // Incident types configuration
  const incidentTypes = [
    { id: 'fire', label: 'Fire Emergency', icon: '🔥', color: 'fire' },
    { id: 'landslide', label: 'landslide', icon: '⛰️', color: 'landslide' },
    { id: 'earthquake', label: 'earthquake', icon: '🌏', color: 'earthquake' },
    { id: 'accident', label: 'Accident', icon: '⚠️', color: 'accident' },
    { id: 'flood', label: 'flood', icon: '🌊', color: 'flood' },
    { id: 'other', label: 'Other', icon: '📞', color: 'other' }
  ];

  // Update sensor data every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setSensorData(prev => ({
        ...prev,
        temperature: (22 + Math.random() * 4).toFixed(1),
        humidity: Math.floor(40 + Math.random() * 30),
        airQuality: Math.floor(50 + Math.random() * 40),
        soundLevel: Math.floor(30 + Math.random() * 20),
        lightLevel: Math.floor(600 + Math.random() * 400),
        motion: Math.random() > 0.7,
        vibration: (Math.random() * 0.3).toFixed(2),
        lastUpdate: new Date()
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear validation error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }

    // Format phone number
    if (name === 'phoneNumber') {
      const formatted = formatPhoneNumber(value);
      setFormData(prev => ({ ...prev, phoneNumber: formatted }));
    }
  };

  // Format phone number for 10-digit format
  const formatPhoneNumber = (value) => {
    const numbers = value.replace(/\D/g, '');
    // Limit to 10 digits and format as XXXXXXXXXX
    return numbers.substring(0, 10);
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (formData.phoneNumber.replace(/\D/g, '').length !== 10) {
      newErrors.phoneNumber = 'Please enter exactly 10 digits for your mobile number';
    } else if (!/^[6-9]\d{9}$/.test(formData.phoneNumber.replace(/\D/g, ''))) {
      newErrors.phoneNumber = 'Mobile number must start with 6, 7, 8, or 9 (valid Indian mobile prefixes)';
    }

    if (!formData.incidentType) {
      newErrors.incidentType = 'Please select an incident type';
    }

    if (formData.email && !isValidEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Handle file upload
  const handleFileUpload = async (files) => {
    const fileArray = Array.from(files);
    
    for (const file of fileArray) {
      const isValid = await validateFile(file);
      if (!isValid) continue;

      const fileObject = {
        id: Date.now() + Math.random(),
        file: file,
        name: file.name,
        type: file.type,
        size: file.size,
        isVideo: file.type.startsWith('video/')
      };

      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          fileObject.preview = e.target.result;
          setUploadedFiles(prev => [...prev, fileObject]);
        };
        reader.readAsDataURL(file);
      } else {
        setUploadedFiles(prev => [...prev, fileObject]);
      }
    }
  };

  // Validate if image content is disaster-related
  const validateDisasterContent = async (file) => {
    if (!file.type.startsWith('image/')) {
      return true; // Skip validation for videos
    }

    try {
      // Create a canvas to analyze image content
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      return new Promise((resolve) => {
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          
          // Get image data for analysis
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          
          // Enhanced disaster detection algorithm
          let disasterScore = 0;
          let totalPixels = data.length / 4;
          let firePixels = 0;
          let smokePixels = 0;
          let damagePixels = 0;
          let emergencyPixels = 0;
          
          // Analyze each pixel for disaster indicators
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Fire detection (bright reds, oranges, yellows)
            if (r > 180 && g > 80 && b < 80 && r > g + 50) {
              firePixels++;
              disasterScore += 3; // High score for fire
            }
            
            // Smoke detection (dark grays, blacks with some variation)
            if (r < 120 && g < 120 && b < 120 && Math.abs(r - g) < 30 && Math.abs(g - b) < 30) {
              smokePixels++;
              disasterScore += 2; // Medium score for smoke
            }
            
            // Structural damage detection (browns, dark colors, irregular patterns)
            if (r > 80 && r < 160 && g > 40 && g < 120 && b < 80) {
              damagePixels++;
              disasterScore += 2; // Medium score for damage
            }
            
            // Emergency vehicle colors (bright red, blue, yellow)
            if ((r > 220 && g < 80 && b < 80) || // Bright red
                (r < 80 && g < 80 && b > 220) || // Bright blue
                (r > 220 && g > 220 && b < 80)) { // Bright yellow
              emergencyPixels++;
              disasterScore += 2; // Medium score for emergency vehicles
            }
            
            // Water/flood detection (blues, teals)
            if (b > 150 && g > 100 && r < 100) {
              disasterScore += 1; // Low score for water
            }
          }
          
          // Calculate disaster relevance percentage
          const disasterPercentage = (disasterScore / totalPixels) * 100;
          
          // More strict validation - require higher disaster content
          const isValid = disasterPercentage >= 25; // Increased threshold
          
          // Provide detailed feedback
          if (!isValid) {
            const details = [];
            if (firePixels > 0) details.push(`Fire pixels: ${((firePixels/totalPixels)*100).toFixed(1)}%`);
            if (smokePixels > 0) details.push(`Smoke pixels: ${((smokePixels/totalPixels)*100).toFixed(1)}%`);
            if (damagePixels > 0) details.push(`Damage pixels: ${((damagePixels/totalPixels)*100).toFixed(1)}%`);
            if (emergencyPixels > 0) details.push(`Emergency colors: ${((emergencyPixels/totalPixels)*100).toFixed(1)}%`);
            
            alert(`🚫 Image "${file.name}" does not appear to show a disaster scene.\n\n` +
                  `Current disaster relevance: ${disasterPercentage.toFixed(1)}% (Required: 25%)\n\n` +
                  `Please upload photos that clearly show:\n` +
                  `• 🔥 Active fires, flames, or burning\n` +
                  `• 💨 Smoke, ash, or fire damage\n` +
                  `• 🏚️ Structural damage or destruction\n` +
                  `• 🚨 Emergency vehicles or responders\n` +
                  `• 🌊 Flooding or water damage\n` +
                  `• ⚠️ Clear safety hazards or incidents\n\n` +
                  `This image appears to be: ${details.length > 0 ? details.join(', ') : 'general/non-disaster content'}`);
          } else {
            console.log(`✅ Image "${file.name}" validated as disaster-related: ${disasterPercentage.toFixed(1)}%`);
          }
          
          resolve(isValid);
        };
        
        img.onerror = () => {
          alert(`Error analyzing image "${file.name}". Please try again.`);
          resolve(false);
        };
        
        img.src = URL.createObjectURL(file);
      });
    } catch (error) {
      console.error('Error validating disaster content:', error);
      return true; // Allow file if validation fails
    }
  };

  const validateFile = async (file) => {
    const maxSize = 50 * 1024 * 1024; // 50MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'video/mp4', 'video/mov'];
    
    if (file.size > maxSize) {
      alert(`File "${file.name}" is too large. Maximum size is 50MB.`);
      return false;
    }
    
    if (!allowedTypes.includes(file.type)) {
      alert(`File type "${file.type}" is not supported.`);
      return false;
    }
    
    // Validate disaster content for images
    if (file.type.startsWith('image/')) {
      const isDisasterRelated = await validateDisasterContent(file);
      if (!isDisasterRelated) {
        return false;
      }
    }
    
    return true;
  };

  // Remove uploaded file
  const removeFile = (fileId) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
  };

  // Handle drag and drop
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragOut = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files);
    }
  }, []);

  // Send incident data to backend API
  const submitIncidentToAPI = async (formData, uploadedFiles) => {
    const API_URL = '/api/incidents';
    
    try {
      console.log('Submitting data:', { formData, uploadedFiles });
      
      // Create FormData object for multipart/form-data
      const submitData = new FormData();
      
      // Add form fields
      submitData.append('fullName', formData.fullName);
      submitData.append('phoneNumber', formData.phoneNumber);
      submitData.append('email', formData.email || '');
      submitData.append('location', formData.location || '');
      submitData.append('incidentType', formData.incidentType);
      submitData.append('description', formData.description || '');
      
      // Add uploaded files
      uploadedFiles.forEach((fileObj, index) => {
        submitData.append('files', fileObj.file);
      });
      
      console.log('FormData created, sending to:', API_URL);
      
      const response = await fetch(API_URL, {
        method: 'POST',
        body: submitData,
        // Don't set Content-Type header - let browser set it with boundary for multipart/form-data
      });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error text:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }
      
      const result = await response.json();
      console.log('Response result:', result);
      return result;
    } catch (error) {
      console.error('Error in submitIncidentToAPI:', error);
      
      // Handle AI validation errors
      if (error.message && error.message.includes('validation')) {
        const errorData = JSON.parse(error.message.split('message: ')[1]);
        if (errorData.type === 'fake_image_detection') {
          throw new Error(`🚫 Fake Image Detected: ${errorData.details}`);
        } else if (errorData.type === 'content_validation') {
          throw new Error(`🚫 Image Content Analysis Failed: ${errorData.details}`);
        }
      }
      
      throw error;
    }
  };

  // Fetch all incidents from backend API
  const fetchIncidentsFromAPI = async () => {
    const API_URL = '/api/incidents';
    
    try {
      const response = await fetch(API_URL, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const incidents = await response.json();
      return incidents;
    } catch (error) {
      console.error('Error fetching incidents:', error);
      throw error;
    }
  };

  // Fetch single incident by ID from backend API
  const fetchIncidentById = async (incidentId) => {
    const API_URL = `/api/incidents/${incidentId}`;
    
    try {
      const response = await fetch(API_URL, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const incident = await response.json();
      return incident;
    } catch (error) {
      console.error('Error fetching incident:', error);
      throw error;
    }
  };

  // State for incidents list
  const [incidents, setIncidents] = useState([]);
  const [loadingIncidents, setLoadingIncidents] = useState(false);
  const [imageValidationResults, setImageValidationResults] = useState([]);
  const [activeTab, setActiveTab] = useState('form');

  // Load incidents from API
  const loadIncidents = async () => {
    setLoadingIncidents(true);
    try {
      const incidentsData = await fetchIncidentsFromAPI();
      setIncidents(incidentsData);
      console.log('Loaded incidents:', incidentsData);
    } catch (error) {
      console.error('Failed to load incidents:', error);
      alert('Failed to load incidents. Please try again.');
    } finally {
      setLoadingIncidents(false);
    }
  };

  // Load incidents when component mounts
  useEffect(() => {
    loadIncidents();
  }, []);

  // Test API connection
  const testAPIConnection = async () => {
    try {
      const response = await fetch('/api/incidents'); // Health check or root API check
      const data = await response.json();
      console.log('✅ API Connection Test:', data);
      alert('✅ Backend API is connected and running!');
    } catch (error) {
      console.error('❌ API Connection Test Failed:', error);
      alert('❌ Backend API is not responding. Please check if the server is running.');
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    
    try {
      console.log('Starting form submission...');
      console.log('Form data:', formData);
      console.log('Uploaded files:', uploadedFiles);
      
      // Send data to backend API
      const result = await submitIncidentToAPI(formData, uploadedFiles);
      
      // Use the report ID from backend
      setReportId(result.reportId.toString());
      setShowSuccessModal(true);
      
      // Show validation results
      if (result.validation && result.validation.images) {
        setImageValidationResults(result.validation.images);
      }
      
      // Refresh the incidents list to show the new submission
      await loadIncidents();
      
      console.log('Incident submitted successfully:', result);
    } catch (error) {
      console.error('Error submitting report:', error);
      alert(`Error submitting report: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get sensor status
  const getSensorStatus = (value, type) => {
    const thresholds = {
      temperature: { min: 18, max: 26 },
      humidity: { min: 30, max: 70 },
      airQuality: { min: 50, max: 100 },
      soundLevel: { min: 0, max: 50 },
      lightLevel: { min: 200, max: 1000 }
    };

    if (type === 'motion') return value ? 'Detected' : 'Clear';
    
    const threshold = thresholds[type];
    if (!threshold) return 'Normal';
    
    if (value < threshold.min) return 'Low';
    if (value > threshold.max) return 'High';
    return 'Normal';
  };

  const getSensorStatusClass = (status) => {
    switch (status) {
      case 'High': return 'alert';
      case 'Low': return 'warning';
      case 'Detected': return 'alert';
      default: return 'good';
    }
  };

  // Get current location
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setFormData(prev => ({
            ...prev,
            location: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
          }));
          alert('Location captured successfully!');
        },
        (error) => {
          console.error('Error getting location:', error);
          alert('Unable to get your location. Please enter it manually.');
        }
      );
    } else {
      alert('Geolocation is not supported by this browser.');
    }
  };

  const closeSuccessModal = () => {
    setShowSuccessModal(false);
    // Reset form
    setFormData({
      fullName: '',
      phoneNumber: '',
      email: '',
      location: '',
      incidentType: '',
      description: ''
    });
    setUploadedFiles([]);
    setErrors({});
  };

  return (
    <div className="incident-reporting-system">
      {/* Header */}
      <header className="main-header">
        <div className="header-container">
          <div className="logo-section">
            <Icons.Shield />
            <div className="header-text">
              <h1>DisasterEye</h1>
              <p className="tagline">One Nation, One Response Many Life Savior</p>
            </div>
          </div>
          <div className="emergency-badge">
            <Icons.Phone />
            <span>Fire: 101</span>
          </div>
            <div className="emergency-badge">
            <Icons.Phone />
            <span>Police: 112</span>
          </div>
          
            <div className="emergency-badge">
            <Icons.Ambulance />
            <span>Ambulance: 108</span>
          </div>
          
          {/* Tab Navigation */}
          <div className="tab-navigation">
            <button 
              className={`tab-button ${activeTab === 'form' ? 'active' : ''}`}
              onClick={() => setActiveTab('form')}
            >
              <Icons.Home />
              Home
            </button>
            <button 
              className={`tab-button ${activeTab === 'previous' ? 'active' : ''}`}
              onClick={() => setActiveTab('previous')}
            >
              <Icons.Images />
              Previous Incidents
            </button>
          </div>
        </div>
      </header>

      {/* Welcome Section */}
      <center><section className="welcome-section">
        <div className="container">
          <div className="welcome-card">
            <h2><Icons.Heart /></h2>
            <p>Thank you for taking the time to report this incident. Your vigilance helps keep our community safe. Please provide as much detail as you're comfortable sharing - every piece of information matters.</p>
          </div>
        </div>
      </section>
      </center>

      {/* Main Content */}
      <main className="main-content">
        <div className="container">
          {activeTab === 'previous' ? (
            /* Previous Incidents Tab */
            <div className="previous-data-container">
              <div className="previous-data-header">
                <h2><Icons.Images /> Previous Incidents</h2>
                <p>View all previously reported incidents</p>
              </div>
              
              {loadingIncidents ? (
                <div className="loading-section">
                  <Icons.Spinner />
                  <span>Loading incidents...</span>
                </div>
              ) : incidents.length > 0 ? (
                <div className="previous-data-grid">
                  {incidents.map((incident) => (
                    <div key={incident.id} className="previous-incident-card">
                      <div className="incident-card-header">
                        <span className="incident-id">#{incident.id}</span>
                        <span className={`incident-type ${incident.incident_type}`}>
                          {incident.incident_type}
                        </span>
                      </div>
                      
                      <div className="incident-details">
                        <div className="detail-row">
                          <strong>Reporter:</strong> {incident.full_name}
                        </div>
                        <div className="detail-row">
                          <strong>Phone:</strong> {incident.phone_number}
                        </div>
                        <div className="detail-row">
                          <strong>Location:</strong> {incident.location}
                        </div>
                        <div className="detail-row">
                          <strong>Date:</strong> {new Date(incident.created_at).toLocaleString()}
                        </div>
                        {incident.description && (
                          <div className="detail-row">
                            <strong>Description:</strong> {incident.description}
                          </div>
                        )}
                      </div>
                      
                      {/* Show incident image if available */}
                      {incident.files && incident.files.length > 0 && (
                        <div className="incident-image-section">
                          <img 
                            src={`/uploads/${incident.files[0]}`}
                            alt={`Incident ${incident.id}`}
                            className="incident-image"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'block';
                            }}
                          />
                          <div className="image-placeholder" style={{display: 'none'}}>
                            <Icons.Camera />
                            <span>Image not available</span>
                          </div>
                          <div className="file-count">
                            📎 {incident.files.length} file(s)
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-incidents">
                  <Icons.Images />
                  <h3>No incidents reported yet</h3>
                  <p>Be the first to report an incident!</p>
                </div>
              )}
            </div>
          ) : (
            <div className="content-grid">
            {/* Form Section */}
            <div className="form-section">
              <form onSubmit={handleSubmit} className="incident-form">
                {/* Personal Information */}
                <div className="form-card">
                  <div className="card-header">
                    <Icons.User />
                    <h3>Let's Start With You</h3>
                    <p>We need your contact information for further information</p>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="fullName">Your Full Name *</label>
                    <input
                      type="text"
                      id="fullName"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      placeholder="What should we call you?"
                      className={errors.fullName ? 'error' : ''}
                      required
                    />
                    {errors.fullName && <span className="validation-error">{errors.fullName}</span>}
                    <small className="help-text">Don't worry, your information is kept confidential</small>
                  </div>

                  <div className="form-group">
                    <label htmlFor="phoneNumber">Phone Number *</label>
                    <input
                      type="tel"
                      id="phoneNumber"
                      name="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={handleInputChange}
                      placeholder="Enter 10-digit mobile number (e.g., 9876543210)"
                      className={errors.phoneNumber ? 'error' : ''}
                      required
                      maxLength="10"
                    />
                    {errors.phoneNumber && <span className="validation-error">{errors.phoneNumber}</span>}
                    <small className="help-text">Enter your 10-digit mobile number without spaces or special characters</small>
                  </div>

                </div>

                {/* Location Information */}
                <div className="form-card">
                  <div className="card-header">
                    <Icons.MapPin />
                    <h3>Where Did This Happen?</h3>
                    <p>Help us locate the incident quickly and accurately</p>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="location">Specific Location</label>
                    <input
                      type="text"
                      id="location"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      placeholder="Building name, floor, room number, or address"
                    />
                    <small className="help-text">Be as specific as possible - it helps our response team</small>
                  </div>
                  
                  <div className="location-buttons">
                    <button type="button" className="location-btn" onClick={getCurrentLocation}>
                      <Icons.LocationArrow />
                      Use My Current Location
                    </button>
                    <button type="button" className="location-btn" onClick={() => setShowMap(true)}>
                      <Icons.Map />
                      Select on Map
                    </button>
                  </div>
                </div>

                {/* Incident Type */}
                <div className="form-card">
                  <div className="card-header">
                    <Icons.AlertTriangle />
                    <h3>What Type of Incident?</h3>
                    <p>Choose the category that best describes the incident</p>
                  </div>
                  
                  <div className="incident-types">
                    {incidentTypes.map((type) => (
                      <label key={type.id} className={`incident-card ${formData.incidentType === type.id ? 'selected' : ''}`}>
                        <input
                          type="radio"
                          name="incidentType"
                          value={type.id}
                          onChange={handleInputChange}
                        />
                        <div className="incident-content">
                          <div className={`incident-icon ${type.color}`}>{type.icon}</div>
                          <h4>{type.label}</h4>
                        </div>
                      </label>
                    ))}
                  </div>
                  {errors.incidentType && <span className="validation-error">{errors.incidentType}</span>}
                </div>

                {/* Description */}
                <div className="form-card">
                  <div className="card-header">
                    <Icons.Comment />
                    <h3>Incident Description</h3>
                  </div>
                  
                  <div className="form-group">
                    <textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows="5"
                      placeholder="Please describe what you saw, heard, or experienced. When did it happen? Who was involved? What made you concerned?"
                    />
                    <small className="help-text">Take your time - the more details you provide, the better we can help</small>
                    <div className="character-count">
                      <span>{formData.description.length.toLocaleString()}</span> characters
                    </div>
                  </div>
                </div>

                {/* File Upload */}
                <div className="form-card">
                  <div className="card-header">
                    <Icons.Camera />
                    <h3>Add Photos or Videos</h3>
                    <p>Visual evidence can be incredibly helpful (completely optional)</p>
                  </div>
                  
                  <div className="upload-section">
                    <div
                      className={`upload-area ${dragActive ? 'drag-active' : ''}`}
                      onDragEnter={handleDragIn}
                      onDragLeave={handleDragOut}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                      onClick={() => document.getElementById('fileInput').click()}
                    >
                      <div className="upload-icon">
                        <Icons.CloudUpload />
                      </div>
                      <h4>Drag & Drop Files Here</h4>
                      <p>or click to select files from your device</p>
                      <small>Supports: Images (JPG, PNG) and Videos (MP4, MOV) • Max 50MB each</small>
                      <div className="disaster-validation-info">
                        <Icons.AlertTriangle />
                        <span>🚫 ONLY disaster images accepted: Fire, smoke, damage, emergency scenes (25%+ disaster content required)</span>
                      </div>
                    </div>
                    <input
                      type="file"
                      id="fileInput"
                      multiple
                      accept="image/*,video/*"
                      style={{ display: 'none' }}
                      onChange={(e) => handleFileUpload(e.target.files)}
                    />
                    
                    {uploadedFiles.length > 0 && (
                      <div className="file-preview">
                        <h4><Icons.Images /> Uploaded Files ({uploadedFiles.length})</h4>
                        <div className="file-grid">
                          {uploadedFiles.map((file) => (
                            <div key={file.id} className="file-item">
                              {file.isVideo ? (
                                <div className="video-placeholder">
                                  <Icons.Video />
                                </div>
                              ) : (
                                <img src={file.preview} alt={file.name} />
                              )}
                              <button
                                type="button"
                                className="file-remove"
                                onClick={() => removeFile(file.id)}
                                title="Remove file"
                              >
                                ×
                              </button>
                              <div className="file-name" title={file.name}>{file.name}</div>
                              <div className="file-size">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Submit Section */}
                <div className="form-card submit-section">
                  <div className="privacy-notice">
                    <Icons.Lock />
                    <p><strong>Your Privacy Matters:</strong> All information you provide is encrypted and handled according to our privacy policy. We only share details with authorized personnel who need to respond to your report.</p>
                  </div>
                  
                  {imageValidationResults.length > 0 && (
                    <div className="validation-status">
                      <div className="validation-header">
                        <Icons.Shield />
                        <h4>AI Image Validation Results</h4>
                      </div>
                      <div className="validation-details">
                        {imageValidationResults.map((result, index) => (
                          <div key={index} className="validation-item">
                            <p><strong>File:</strong> {result.file}</p>
                            <p><strong>Authenticity:</strong> {result.authenticity}</p>
                            <p><strong>Content:</strong> {result.content}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <button type="submit" className="submit-button" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <div className="loading-spinner">
                        <Icons.Spinner />
                        Sending...
                      </div>
                    ) : (
                      <span className="btn-content">
                        <Icons.PaperPlane />
                        Submit My Report
                      </span>
                    )}
                  </button>
                  
                  <p className="submit-help">You'll receive a confirmation with your report ID within moments</p>
                </div>
              </form>
            </div>

            {/* Sidebar */}
            <div className="sidebar">
              {/* IoT Sensors */}
              <div className="sidebar-card">
                <div className="card-header">
                  <Icons.SatelliteDish />
                  <h3>Live Environmental Data</h3>
                  <p>Real-time readings from our smart sensors</p>
                </div>
                
                <div className="sensor-grid">
                  <div className={`sensor-item ${getSensorStatusClass(getSensorStatus(sensorData.temperature, 'temperature'))}`}>
                    <div className="sensor-icon"><Icons.Thermometer /></div>
                    <div className="sensor-data">
                      <span className="sensor-value">{sensorData.temperature}°C</span>
                      <span className="sensor-label">Temperature</span>
                      <span className="sensor-status">{getSensorStatus(sensorData.temperature, 'temperature')}</span>
                    </div>
                  </div>
                  
                  <div className={`sensor-item ${getSensorStatusClass(getSensorStatus(sensorData.humidity, 'humidity'))}`}>
                    <div className="sensor-icon"><Icons.Droplet /></div>
                    <div className="sensor-data">
                      <span className="sensor-value">{sensorData.humidity}%</span>
                      <span className="sensor-label">Humidity</span>
                      <span className="sensor-status">{getSensorStatus(sensorData.humidity, 'humidity')}</span>
                    </div>
                  </div>
                  
                  <div className={`sensor-item ${getSensorStatusClass(getSensorStatus(sensorData.airQuality, 'airQuality'))}`}>
                    <div className="sensor-icon"><Icons.Wind /></div>
                    <div className="sensor-data">
                      <span className="sensor-value">{sensorData.airQuality} AQI</span>
                      <span className="sensor-label">Air Quality</span>
                      <span className="sensor-status">{getSensorStatus(sensorData.airQuality, 'airQuality')}</span>
                    </div>
                  </div>
                  
                  <div className={`sensor-item ${getSensorStatusClass(getSensorStatus(sensorData.soundLevel, 'soundLevel'))}`}>
                    <div className="sensor-icon"><Icons.VolumeDown /></div>
                    <div className="sensor-data">
                      <span className="sensor-value">{sensorData.soundLevel} dB</span>
                      <span className="sensor-label">Noise Level</span>
                      <span className="sensor-status">{getSensorStatus(sensorData.soundLevel, 'soundLevel')}</span>
                    </div>
                  </div>
                  
                  <div className={`sensor-item ${getSensorStatusClass(getSensorStatus(sensorData.lightLevel, 'lightLevel'))}`}>
                    <div className="sensor-icon"><Icons.Lightbulb /></div>
                    <div className="sensor-data">
                      <span className="sensor-value">{sensorData.lightLevel} lux</span>
                      <span className="sensor-label">Light Level</span>
                      <span className="sensor-status">{getSensorStatus(sensorData.lightLevel, 'lightLevel')}</span>
                    </div>
                  </div>
                  
                  <div className={`sensor-item ${getSensorStatusClass(getSensorStatus(sensorData.motion, 'motion'))}`}>
                    <div className="sensor-icon"><Icons.Running /></div>
                    <div className="sensor-data">
                      <span className="sensor-value">Motion</span>
                      <span className="sensor-label">Movement</span>
                      <span className="sensor-status">{getSensorStatus(sensorData.motion, 'motion')}</span>
                    </div>
                  </div>
                </div>
                
                <div className="sensor-update">
                  <Icons.Sync />
                  <span>Last updated: {sensorData.lastUpdate.toLocaleTimeString()}</span>
                </div>
              </div>

              {/* Emergency Contacts */}
              <div className="sidebar-card emergency-contacts">
                <div className="card-header">
                  <Icons.Phone />
                  <h3>Need Immediate Help?</h3>
                  <p>Don't wait - call these numbers right now</p>
                </div>
                
                <div className="contact-list">
                  <a href="tel:911" className="contact-item emergency">
                    <div className="contact-icon"><Icons.Ambulance /></div>
                    <div className="contact-info">
                      <strong>Emergency Services</strong>
                      <span>911</span>
                    </div>
                  </a>
                  
                  <a href="tel:5551230000" className="contact-item">
                    <div className="contact-icon"><Icons.Shield /></div>
                    <div className="contact-info">
                      <strong>Security Desk</strong>
                      <span>(555) 123-0000</span>
                    </div>
                  </a>
                  
                  <a href="tel:5551230001" className="contact-item">
                    <div className="contact-icon"><Icons.Tools /></div>
                    <div className="contact-info">
                      <strong>Maintenance</strong>
                      <span>(555) 123-0001</span>
                    </div>
                  </a>
                  
                  <a href="tel:5551230002" className="contact-item">
                    <div className="contact-icon"><Icons.UserNurse /></div>
                    <div className="contact-info">
                      <strong>First Aid</strong>
                      <span>(555) 123-0002</span>
                    </div>
                  </a>
                </div>
              </div>

              {/* Safety Tips */}
              <div className="sidebar-card safety-tips">
                <div className="card-header">
                  <Icons.Lightbulb />
                  <h3>Safety Reminder</h3>
                </div>
                <div className="tip-content">
                  <ul>
                    <li>Don't put yourself at risk for photos</li>
                    <li>Stay calm and provide clear details</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </main>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="modal show">
          <div className="modal-content success">
            <div className="success-icon">
              <Icons.CheckCircle />
            </div>
            <h2>Report Submitted Successfully!</h2>
            <p>Thank you for taking the time to report this incident. We've received your information and our team will review it promptly.</p>
            <div className="report-id">
              <strong>Your Report ID: {reportId}</strong>
              <p>Save this number for your records</p>
            </div>
            <div className="next-steps">
              <h4>What happens next?</h4>
              <ul>
                <li>We'll review your report within 30 minutes</li>
                <li>You'll receive updates via phone or email</li>
                <li>Emergency responders will be notified if needed</li>
              </ul>
            </div>
            <button onClick={closeSuccessModal} className="modal-button">
              <Icons.Home />
              Return to Homepage
            </button>
          </div>
        </div>
      )}

      {/* Map Modal */}
      {showMap && (
        <div className="modal show map-modal">
          <div className="modal-content map-content" style={{ maxWidth: '800px', width: '90%', animation: 'none', transform: 'none' }}>
            <div className="map-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>Select Location on Map</h2>
              <button onClick={() => setShowMap(false)} className="close-btn" style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#666' }}>×</button>
            </div>
            <p>Click on the map to drop a pin at the incident location.</p>
            <div className="map-container-wrapper" style={{ height: '400px', width: '100%', marginTop: '15px' }}>
              <MapContainer center={mapPosition} zoom={5} style={{ height: '100%', width: '100%', borderRadius: '8px' }}>
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <LocationMarker />
              </MapContainer>
            </div>
            <div className="map-footer" style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ flex: 1, marginRight: '15px' }}>
                <p style={{ margin: 0, fontWeight: 'bold' }}>Selected Location:</p>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#555', wordBreak: 'break-word' }}>
                  {isFetchingAddress ? 'Fetching address...' : (mapAddress || `${mapPosition[0].toFixed(4)}, ${mapPosition[1].toFixed(4)}`)}
                </p>
              </div>
              <button onClick={handleConfirmMapSelection} className="modal-button" style={{ background: '#2e7d32', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '5px', cursor: 'pointer', minWidth: '150px' }}>
                Confirm Location
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IncidentReportingSystem;