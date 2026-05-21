import React, { useState, useEffect } from 'react';
import '../CSS/IncidentReporting.css';
import { API_BASE } from '../config';

const VolunteerBoard = () => {
  const [volunteers, setVolunteers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    skills: 'Medical',
    location: '',
    availability: 'Available Now'
  });

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE}/volunteers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (response.ok) {
        alert("Thank you for registering as a volunteer!");
        setShowForm(false);
        setFormData({ name: '', phone: '', skills: 'Medical', location: '', availability: 'Available Now' });
        fetchVolunteers();
      }
    } catch (error) {
      alert("Registration failed. Please try again.");
    }
  };

  return (
    <div className="volunteer-board-container" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div className="previous-data-header" style={{ marginBottom: 0 }}>
          <h2><i className="fas fa-hands-helping"></i> Community Volunteers</h2>
          <p>Local heroes ready to assist during emergencies</p>
        </div>
        <button 
          className="submit-button" 
          onClick={() => setShowForm(!showForm)}
          style={{ width: 'auto', padding: '10px 20px', margin: 0 }}
        >
          {showForm ? 'Cancel' : 'Become a Volunteer'}
        </button>
      </div>

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
      ) : volunteers.length > 0 ? (
        <div className="previous-data-grid">
          {volunteers.map((vol) => (
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
                <div className="detail-row"><strong>Joined:</strong> {new Date(vol.created_at).toLocaleDateString()}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="no-incidents">
          <i className="fas fa-users" style={{ fontSize: '3rem', color: '#9ca3af' }}></i>
          <h3>No volunteers yet</h3>
          <p>Be the first to step up and help your community!</p>
        </div>
      )}
    </div>
  );
};

export default VolunteerBoard;
