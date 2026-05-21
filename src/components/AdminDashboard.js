import React, { useState, useEffect } from 'react';
import '../CSS/IncidentReporting.css';
import { API_BASE } from '../config';

// Reusing some icons from the main file for consistency
const Icons = {
  Trash: () => <i className="fas fa-trash"></i>,
  CheckCircle: () => <i className="fas fa-check-circle"></i>,
  Sync: () => <i className="fas fa-sync-alt"></i>,
  Users: () => <i className="fas fa-users"></i>,
  AlertTriangle: () => <i className="fas fa-exclamation-triangle"></i>,
  Shield: () => <i className="fas fa-shield-alt"></i>
};

const AdminDashboard = () => {
  const [incidents, setIncidents] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('incidents'); // 'incidents' or 'volunteers'

  const fetchData = async () => {
    setLoading(true);
    try {
      const [incidentsRes, volunteersRes] = await Promise.all([
        fetch(`${API_BASE}/incidents`),
        fetch(`${API_BASE}/volunteers`)
      ]);
      
      const incidentsData = await incidentsRes.json();
      const volunteersData = await volunteersRes.json();
      
      setIncidents(incidentsData);
      setVolunteers(volunteersData);
    } catch (error) {
      console.error("Failed to fetch admin data", error);
      alert("Error fetching data from server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDeleteIncident = async (id) => {
    if (!window.confirm(`Are you sure you want to permanently delete incident #${id}?`)) return;
    
    try {
      const res = await fetch(`${API_BASE}/incidents/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setIncidents(incidents.filter(inc => inc.id !== id));
      } else {
        const errorData = await res.json();
        alert(`Failed to delete: ${errorData.error}`);
      }
    } catch (err) {
      alert(`Network error: ${err.message}`);
    }
  };

  const handleUpdateIncidentStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'Resolved' ? 'Pending' : 'Resolved';
    if (!window.confirm(`Change status of incident #${id} to ${newStatus}?`)) return;

    try {
      const res = await fetch(`${API_BASE}/incidents/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (res.ok) {
        setIncidents(incidents.map(inc => 
          inc.id === id ? { ...inc, status: newStatus } : inc
        ));
      } else {
        const errorData = await res.json();
        alert(`Failed to update status: ${errorData.error}`);
      }
    } catch (err) {
      alert(`Network error: ${err.message}`);
    }
  };

  const handleDeleteVolunteer = async (id) => {
    if (!window.confirm(`Are you sure you want to remove volunteer #${id}?`)) return;
    
    try {
      const res = await fetch(`${API_BASE}/volunteers/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setVolunteers(volunteers.filter(vol => vol.id !== id));
      } else {
        const errorData = await res.json();
        alert(`Failed to delete: ${errorData.error}`);
      }
    } catch (err) {
      alert(`Network error: ${err.message}`);
    }
  };

  return (
    <div className="admin-dashboard form-card" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2><Icons.Shield /> Secure Admin Dashboard</h2>
          <p>Manage incidents, volunteers, and resolve emergencies.</p>
        </div>
        <button onClick={fetchData} className="submit-button" style={{ width: 'auto', padding: '0.5rem 1rem' }}>
          <Icons.Sync /> Refresh Data
        </button>
      </div>

      <div className="tabs" style={{ marginTop: '1rem' }}>
        <button 
          className={`tab-button ${activeTab === 'incidents' ? 'active' : ''}`}
          onClick={() => setActiveTab('incidents')}
        >
          <Icons.AlertTriangle /> Incidents ({incidents.length})
        </button>
        <button 
          className={`tab-button ${activeTab === 'volunteers' ? 'active' : ''}`}
          onClick={() => setActiveTab('volunteers')}
        >
          <Icons.Users /> Volunteers ({volunteers.length})
        </button>
      </div>

      <div className="admin-content" style={{ marginTop: '2rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>Loading data...</div>
        ) : activeTab === 'incidents' ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #eee' }}>
                  <th style={{ padding: '1rem' }}>ID</th>
                  <th style={{ padding: '1rem' }}>Reporter</th>
                  <th style={{ padding: '1rem' }}>Type</th>
                  <th style={{ padding: '1rem' }}>Location</th>
                  <th style={{ padding: '1rem' }}>Status</th>
                  <th style={{ padding: '1rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {incidents.length === 0 && (
                  <tr><td colSpan="6" style={{ padding: '1rem', textAlign: 'center' }}>No incidents reported yet.</td></tr>
                )}
                {incidents.map(inc => (
                  <tr key={inc.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '1rem' }}>#{inc.id}</td>
                    <td style={{ padding: '1rem' }}>
                      <strong>{inc.full_name}</strong><br/>
                      <small>{inc.phone_number}</small>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span className="incident-badge" style={{ backgroundColor: '#fff0f0', color: '#ff4d4f', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                        {inc.incident_type}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', maxWidth: '200px' }}>
                      <small>{inc.location || 'Unknown'}</small>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ 
                        fontWeight: 'bold', 
                        color: inc.status === 'Resolved' ? '#28a745' : '#ffc107'
                      }}>
                        {inc.status || 'Pending'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <button 
                        onClick={() => handleUpdateIncidentStatus(inc.id, inc.status)}
                        style={{ 
                          background: inc.status === 'Resolved' ? '#ffc107' : '#28a745', 
                          color: 'white', 
                          border: 'none', 
                          padding: '0.5rem', 
                          borderRadius: '4px', 
                          cursor: 'pointer',
                          marginRight: '0.5rem'
                        }}
                        title={inc.status === 'Resolved' ? 'Mark as Pending' : 'Mark as Resolved'}
                      >
                        <Icons.CheckCircle />
                      </button>
                      <button 
                        onClick={() => handleDeleteIncident(inc.id)}
                        style={{ 
                          background: '#ff4d4f', 
                          color: 'white', 
                          border: 'none', 
                          padding: '0.5rem', 
                          borderRadius: '4px', 
                          cursor: 'pointer'
                        }}
                        title="Permanently Delete"
                      >
                        <Icons.Trash />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #eee' }}>
                  <th style={{ padding: '1rem' }}>ID</th>
                  <th style={{ padding: '1rem' }}>Volunteer</th>
                  <th style={{ padding: '1rem' }}>Skills</th>
                  <th style={{ padding: '1rem' }}>Location</th>
                  <th style={{ padding: '1rem' }}>Availability</th>
                  <th style={{ padding: '1rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {volunteers.length === 0 && (
                  <tr><td colSpan="6" style={{ padding: '1rem', textAlign: 'center' }}>No volunteers registered yet.</td></tr>
                )}
                {volunteers.map(vol => (
                  <tr key={vol.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '1rem' }}>#{vol.id}</td>
                    <td style={{ padding: '1rem' }}>
                      <strong>{vol.name}</strong><br/>
                      <small>{vol.phone}</small>
                    </td>
                    <td style={{ padding: '1rem' }}>{vol.skills}</td>
                    <td style={{ padding: '1rem', maxWidth: '200px' }}>
                      <small>{vol.location}</small>
                    </td>
                    <td style={{ padding: '1rem' }}>{vol.availability}</td>
                    <td style={{ padding: '1rem' }}>
                      <button 
                        onClick={() => handleDeleteVolunteer(vol.id)}
                        style={{ 
                          background: '#ff4d4f', 
                          color: 'white', 
                          border: 'none', 
                          padding: '0.5rem', 
                          borderRadius: '4px', 
                          cursor: 'pointer'
                        }}
                        title="Remove Volunteer"
                      >
                        <Icons.Trash />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
