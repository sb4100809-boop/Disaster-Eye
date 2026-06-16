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

const AdminDashboard = ({ showToast = alert }) => {
  const [incidents, setIncidents] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('incidents'); // 'incidents' or 'volunteers'
  const [filterType, setFilterType] = useState('All');
  const [filterSeverity, setFilterSeverity] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

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
      showToast("Error fetching data from server.", 'error');
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
        showToast(`Failed to delete: ${errorData.error}`, 'error');
      }
    } catch (err) {
      showToast(`Network error: ${err.message}`, 'error');
    }
  };

  const handleUpdateIncidentStatus = async (id, newStatus) => {
    if (!window.confirm(`Change status of incident #${id} to ${newStatus}? This will notify the reporter.`)) return;

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
        showToast(`Failed to update status: ${errorData.error}`, 'error');
      }
    } catch (err) {
      showToast(`Network error: ${err.message}`, 'error');
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
        showToast(`Failed to delete: ${errorData.error}`, 'error');
      }
    } catch (err) {
      showToast(`Network error: ${err.message}`, 'error');
    }
  };

  const exportToCSV = () => {
    const dataToExport = activeTab === 'incidents' ? incidents : volunteers;
    if (dataToExport.length === 0) return showToast("No data to export", "error");

    const headers = Object.keys(dataToExport[0]).join(",");
    const rows = dataToExport.map(row => 
      Object.values(row).map(val => 
        typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : 
        typeof val === 'object' ? `"${JSON.stringify(val).replace(/"/g, '""')}"` : 
        val
      ).join(",")
    );

    const csvContent = [headers, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `DisasterEye_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="admin-dashboard form-card" style={{ maxWidth: '1600px', width: '98%', margin: '0 auto' }}>
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2><Icons.Shield /> Secure Admin Dashboard</h2>
          <p>Manage incidents, volunteers, and resolve emergencies.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={exportToCSV} className="submit-button" style={{ width: 'auto', padding: '0.5rem 1rem', background: '#27ae60' }}>
            <i className="fas fa-file-csv"></i> Download CSV
          </button>
          <button onClick={fetchData} className="submit-button" style={{ width: 'auto', padding: '0.5rem 1rem' }}>
            <Icons.Sync /> Refresh Data
          </button>
        </div>
      </div>

      <div className="tabs" style={{ marginTop: '1rem' }}>
        <button 
          className={`tab-button ${activeTab === 'incidents' ? 'active' : ''}`}
          onClick={() => setActiveTab('incidents')}
          style={{ color: activeTab === 'incidents' ? 'white' : '#2c3e50', borderColor: '#bdc3c7', background: activeTab === 'incidents' ? '' : '#f8f9fa' }}
        >
          <Icons.AlertTriangle /> Incidents ({incidents.length})
        </button>
        <button 
          className={`tab-button ${activeTab === 'volunteers' ? 'active' : ''}`}
          onClick={() => setActiveTab('volunteers')}
          style={{ color: activeTab === 'volunteers' ? 'white' : '#2c3e50', borderColor: '#bdc3c7', background: activeTab === 'volunteers' ? '' : '#f8f9fa' }}
        >
          <Icons.Users /> Volunteers ({volunteers.length})
        </button>
      </div>

      <div className="admin-content" style={{ marginTop: '2rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>Loading data...</div>
        ) : activeTab === 'incidents' ? (
          <div style={{ overflowX: 'auto' }}>
            {/* Filter Bar */}
            <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b' }}>Status</label>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                  <option value="All">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Responders Dispatched">Dispatched</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b' }}>AI Triage Severity</label>
                <select value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                  <option value="All">All Severities</option>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                  <option value="No AI Analysis">No Analysis</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b' }}>Incident Type</label>
                <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                  <option value="All">All Types</option>
                  {[...new Set(incidents.map(i => i.incident_type))].map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #eee' }}>
                  <th style={{ padding: '1rem' }}>ID</th>
                  <th style={{ padding: '1rem' }}>Reporter</th>
                  <th style={{ padding: '1rem' }}>Type</th>
                  <th style={{ padding: '1rem' }}>Location</th>
                  <th style={{ padding: '1rem', minWidth: '350px' }}>AI Triage</th>
                  <th style={{ padding: '1rem' }}>Status</th>
                  <th style={{ padding: '1rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {incidents.length === 0 && (
                  <tr><td colSpan="7" style={{ padding: '1rem', textAlign: 'center' }}>No incidents reported yet.</td></tr>
                )}
                {incidents.filter(inc => {
                  let triageSev = 'No AI Analysis';
                  try {
                    let t = inc.validation_results;
                    if (typeof t === 'string') t = JSON.parse(t);
                    if (t && t.severity) triageSev = t.severity;
                  } catch(e) {}
                  
                  return (filterStatus === 'All' || (inc.status || 'Pending') === filterStatus) &&
                         (filterSeverity === 'All' || triageSev === filterSeverity) &&
                         (filterType === 'All' || inc.incident_type === filterType);
                }).map(inc => (
                  <tr key={inc.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '1rem' }}>#{inc.id}</td>
                    <td style={{ padding: '1rem' }}>
                      <strong>{inc.full_name}</strong><br/>
                      <small>{inc.phone_number}</small><br/>
                      {inc.email && <small style={{color: '#6c757d'}}>{inc.email}</small>}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span className="incident-badge" style={{ backgroundColor: '#fff0f0', color: '#ff4d4f', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                        {inc.incident_type}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', maxWidth: '200px' }}>
                      <small>{inc.location || 'Unknown'}</small>
                    </td>
                    <td style={{ padding: '1rem', maxWidth: '400px' }}>
                      {(() => {
                        try {
                          let triage = inc.validation_results;
                          if (typeof triage === 'string') {
                            triage = JSON.parse(triage);
                          }
                          if (triage && triage.severity) {
                            return (
                              <div style={{ fontSize: '0.85rem' }}>
                                <strong style={{ color: triage.severity === 'Critical' ? '#darkred' : triage.severity === 'High' ? '#e74c3c' : triage.severity === 'Medium' ? '#f39c12' : '#27ae60' }}>
                                  {triage.severity} Severity
                                </strong><br/>
                                <span style={{ color: '#555' }}>{triage.action_plan}</span>
                              </div>
                            );
                          }
                        } catch(e) {}
                        return <span style={{ color: '#999', fontSize: '0.8rem' }}>No AI Analysis</span>;
                      })()}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <select 
                        value={inc.status || 'Pending'} 
                        onChange={(e) => handleUpdateIncidentStatus(inc.id, e.target.value)}
                        style={{
                          padding: '0.6rem 1rem',
                          borderRadius: '20px',
                          border: 'none',
                          fontWeight: 'bold',
                          color: 'white',
                          backgroundColor: inc.status === 'Resolved' ? '#28a745' : inc.status === 'Responders Dispatched' ? '#17a2b8' : '#f39c12',
                          cursor: 'pointer',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                          outline: 'none',
                          WebkitAppearance: 'none',
                          MozAppearance: 'none',
                          appearance: 'none',
                          textAlign: 'center'
                        }}
                      >
                        <option value="Pending" style={{color: 'black'}}>Pending</option>
                        <option value="Responders Dispatched" style={{color: 'black'}}>Dispatched</option>
                        <option value="Resolved" style={{color: 'black'}}>Resolved</option>
                      </select>
                    </td>
                    <td style={{ padding: '1rem' }}>
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
                      <small>{vol.phone}</small><br/>
                      {vol.email && <small style={{color: '#6c757d'}}>{vol.email}</small>}
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
