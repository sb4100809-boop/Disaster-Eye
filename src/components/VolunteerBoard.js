import React, { useState, useEffect } from 'react';
import '../CSS/IncidentReporting.css';
import { API_BASE } from '../config';

const VolunteerBoard = ({ showToast = alert }) => {
  const [volunteers, setVolunteers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    skills: 'Medical',
    location: '',
    availability: 'Available Now'
  });
  const [filters, setFilters] = useState({
    skills: 'All',
    availability: 'All',
    location: ''
  });

  // Edit / Delete Mode State
  const [manageMode, setManageMode] = useState(false);
  const [manageEmail, setManageEmail] = useState('');
  const [manageStep, setManageStep] = useState(1); // 1: Email, 2: OTP, 3: Edit Form
  const [otp, setOtp] = useState('');
  const [managedVolunteer, setManagedVolunteer] = useState(null);

  const fetchVolunteers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/volunteers`);
      if (response.ok) {
        const data = await response.json();
        setVolunteers(data);
      }
    } catch (error) {
      console.error("Error fetching volunteers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVolunteers();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleManageChange = (e) => {
    setManagedVolunteer({ ...managedVolunteer, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE}/volunteers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (response.ok) {
        showToast("Thank you for registering as a volunteer!", "success");
        setShowForm(false);
        setFormData({ name: '', phone: '', email: '', skills: 'Medical', location: '', availability: 'Available Now' });
        fetchVolunteers();
      }
    } catch (error) {
      showToast("Registration failed. Please try again.", "error");
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    const volunteer = volunteers.find(v => v.email === manageEmail);
    if (!volunteer) {
      showToast("No volunteer found with this email address.", "error");
      return;
    }
    
    try {
      const res = await fetch(`${API_BASE}/send-email-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: manageEmail })
      });
      if (res.ok) {
        showToast("OTP sent to your email!", "success");
        setManageStep(2);
      } else {
        showToast("Failed to send OTP.", "error");
      }
    } catch (err) {
      showToast("Network error.", "error");
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/verify-email-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: manageEmail, otp })
      });
      if (res.ok) {
        showToast("Identity verified!", "success");
        const volunteer = volunteers.find(v => v.email === manageEmail);
        setManagedVolunteer({ ...volunteer });
        setManageStep(3);
      } else {
        const errorData = await res.json();
        showToast(`Verification failed: ${errorData.error}`, "error");
      }
    } catch (err) {
      showToast("Network error.", "error");
    }
  };

  const handleUpdate = async () => {
    try {
      const res = await fetch(`${API_BASE}/volunteers/${managedVolunteer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(managedVolunteer)
      });
      if (res.ok) {
        showToast("Profile updated successfully!", "success");
        setManageMode(false);
        fetchVolunteers();
      } else {
        showToast("Failed to update profile.", "error");
      }
    } catch (err) {
      showToast("Network error.", "error");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete your volunteer profile permanently?")) return;
    try {
      const res = await fetch(`${API_BASE}/volunteers/${managedVolunteer.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showToast("Profile deleted successfully.", "success");
        setManageMode(false);
        fetchVolunteers();
      } else {
        showToast("Failed to delete profile.", "error");
      }
    } catch (err) {
      showToast("Network error.", "error");
    }
  };

  return (
    <div className="volunteer-board-container" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div className="previous-data-header" style={{ marginBottom: 0 }}>
          <h2><i className="fas fa-hands-helping"></i> Community Volunteers</h2>
          <p>Local heroes ready to assist during emergencies</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className="submit-button" 
            onClick={() => {
              setManageMode(!manageMode);
              setShowForm(false);
              setManageStep(1);
              setManageEmail('');
              setOtp('');
            }}
            style={{ width: 'auto', padding: '10px 20px', margin: 0, background: 'transparent', color: '#2c3e50', border: '1px solid #bdc3c7' }}
          >
            {manageMode ? 'Cancel Edit' : 'Edit Profile'}
          </button>
          <button 
            className="submit-button" 
            onClick={() => {
              setShowForm(!showForm);
              setManageMode(false);
            }}
            style={{ width: 'auto', padding: '10px 20px', margin: 0 }}
          >
            {showForm ? 'Cancel Registration' : 'Become a Volunteer'}
          </button>
        </div>
      </div>

      {manageMode && (
        <div className="form-card" style={{ marginBottom: '30px', borderTop: '4px solid #f39c12' }}>
          <h3>Manage Volunteer Profile</h3>
          {manageStep === 1 && (
            <form onSubmit={handleSendOtp}>
              <div className="form-group">
                <label>Enter Your Registered Email Address</label>
                <input type="email" value={manageEmail} onChange={(e) => setManageEmail(e.target.value)} required />
                <small>We will send an OTP to verify your identity.</small>
              </div>
              <button type="submit" className="submit-button" style={{ background: '#f39c12' }}>Send Validation OTP</button>
            </form>
          )}
          {manageStep === 2 && (
            <form onSubmit={handleVerifyOtp}>
              <div className="form-group">
                <label>Enter Validation OTP</label>
                <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} required />
              </div>
              <button type="submit" className="submit-button" style={{ background: '#f39c12' }}>Verify OTP</button>
            </form>
          )}
          {manageStep === 3 && managedVolunteer && (
            <div>
              <div className="form-group">
                <label>Full Name</label>
                <input type="text" name="name" value={managedVolunteer.name} onChange={handleManageChange} required />
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input type="text" name="phone" value={managedVolunteer.phone} onChange={handleManageChange} required />
              </div>
              <div className="form-group">
                <label>Primary Skill</label>
                <select name="skills" value={managedVolunteer.skills} onChange={handleManageChange} className="incident-type-select">
                  <option value="Medical">Medical / First Aid</option>
                  <option value="Search & Rescue">Search & Rescue</option>
                  <option value="Transport">Transport / Evacuation</option>
                  <option value="Supplies">Food & Supplies</option>
                  <option value="General Support">General Support</option>
                </select>
              </div>
              <div className="form-group">
                <label>Location / Area</label>
                <input type="text" name="location" value={managedVolunteer.location} onChange={handleManageChange} required />
              </div>
              <div className="form-group">
                <label>Availability</label>
                <select name="availability" value={managedVolunteer.availability} onChange={handleManageChange} className="incident-type-select">
                  <option value="Available Now">Available Now</option>
                  <option value="Evenings/Weekends">Evenings / Weekends</option>
                  <option value="On Call">On Call (Emergency Only)</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="button" onClick={handleUpdate} className="submit-button" style={{ background: '#28a745' }}>Update Details</button>
                <button type="button" onClick={handleDelete} className="submit-button" style={{ background: '#dc3545' }}>Delete Profile</button>
              </div>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <div className="form-card" style={{ marginBottom: '30px' }}>
          <h3>Volunteer Registration</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Full Name</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Phone Number</label>
              <input type="text" name="phone" value={formData.phone} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Email Address</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Primary Skill</label>
              <select name="skills" value={formData.skills} onChange={handleChange} className="incident-type-select">
                <option value="Medical">Medical / First Aid</option>
                <option value="Search & Rescue">Search & Rescue</option>
                <option value="Transport">Transport / Evacuation</option>
                <option value="Supplies">Food & Supplies</option>
                <option value="General Support">General Support</option>
              </select>
            </div>
            <div className="form-group">
              <label>Location / Area</label>
              <input type="text" name="location" value={formData.location} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Availability</label>
              <select name="availability" value={formData.availability} onChange={handleChange} className="incident-type-select">
                <option value="Available Now">Available Now</option>
                <option value="Evenings/Weekends">Evenings / Weekends</option>
                <option value="On Call">On Call (Emergency Only)</option>
              </select>
            </div>
            <button type="submit" className="submit-button">Register</button>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="loading-section">
          <i className="fas fa-spinner fa-spin"></i> Loading volunteers...
        </div>
      ) : (
        <>
          {/* Filters Section */}
          <div className="filters-container" style={{ display: 'flex', gap: '15px', marginBottom: '20px', background: '#f8fafc', padding: '15px', borderRadius: '8px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '5px', color: '#64748b', fontWeight: 'bold' }}>Filter by Skill</label>
              <select 
                className="incident-type-select" 
                value={filters.skills} 
                onChange={(e) => setFilters({...filters, skills: e.target.value})}
                style={{ margin: 0, width: '100%' }}
              >
                <option value="All">All Skills</option>
                <option value="Medical">Medical / First Aid</option>
                <option value="Search & Rescue">Search & Rescue</option>
                <option value="Transport">Transport / Evacuation</option>
                <option value="Supplies">Food & Supplies</option>
                <option value="General Support">General Support</option>
              </select>
            </div>
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '5px', color: '#64748b', fontWeight: 'bold' }}>Filter by Availability</label>
              <select 
                className="incident-type-select" 
                value={filters.availability} 
                onChange={(e) => setFilters({...filters, availability: e.target.value})}
                style={{ margin: 0, width: '100%' }}
              >
                <option value="All">All Availabilities</option>
                <option value="Available Now">Available Now</option>
                <option value="Evenings/Weekends">Evenings / Weekends</option>
                <option value="On Call">On Call (Emergency Only)</option>
              </select>
            </div>
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '5px', color: '#64748b', fontWeight: 'bold' }}>Search Location</label>
              <input 
                type="text" 
                placeholder="Type city or area..." 
                value={filters.location} 
                onChange={(e) => setFilters({...filters, location: e.target.value})}
                style={{ width: '100%', padding: '12px 15px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '1rem', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {volunteers.filter(vol => {
            const matchSkill = filters.skills === 'All' || vol.skills === filters.skills;
            const matchAvail = filters.availability === 'All' || vol.availability === filters.availability;
            const matchLoc = !filters.location || vol.location.toLowerCase().includes(filters.location.toLowerCase());
            return matchSkill && matchAvail && matchLoc;
          }).length > 0 ? (
            <div className="previous-data-grid">
              {volunteers.filter(vol => {
                const matchSkill = filters.skills === 'All' || vol.skills === filters.skills;
                const matchAvail = filters.availability === 'All' || vol.availability === filters.availability;
                const matchLoc = !filters.location || vol.location.toLowerCase().includes(filters.location.toLowerCase());
                return matchSkill && matchAvail && matchLoc;
              }).map((vol) => (
            <div key={vol.id} className="previous-incident-card" style={{ borderTop: '4px solid #10b981' }}>
              <div className="incident-card-header">
                <span className="incident-type" style={{ background: '#ecfdf5', color: '#10b981' }}>
                  <i className="fas fa-user-md" style={{ marginRight: '5px' }}></i>
                  {vol.skills}
                </span>
                <span className="incident-id" style={{ fontSize: '0.8rem', color: vol.availability === 'Available Now' ? '#10b981' : '#6b7280' }}>
                  ● {vol.availability}
                </span>
              </div>
              <div className="incident-details">
                <div className="detail-row"><strong>Name:</strong> {vol.name}</div>
                <div className="detail-row"><strong>Location:</strong> {vol.location}</div>
                <div className="detail-row"><strong>Contact:</strong> {vol.phone}</div>
                {vol.email && <div className="detail-row"><strong>Email:</strong> {vol.email}</div>}
                <div className="detail-row"><strong>Joined:</strong> {new Date(vol.created_at).toLocaleDateString()}</div>
              </div>
            </div>
              ))}
            </div>
          ) : (
            <div className="no-incidents">
              <i className="fas fa-users" style={{ fontSize: '3rem', color: '#9ca3af' }}></i>
              <h3>No volunteers found</h3>
              <p>Try adjusting your filters or be the first to step up in this area!</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default VolunteerBoard;
