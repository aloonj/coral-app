import { useState, useEffect } from 'react';
import api from '../services/api';
import { formatDate } from '../utils/dateUtils';
import styles from './Clients.module.css';

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    address: '',
    phone: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await api.get('/clients');
        setClients(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching clients:', error);
        setLoading(false);
      }
    };

    fetchClients();
  }, []);


  const fetchClients = async () => {
    try {
      const response = await api.get('/clients');
      setClients(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching clients:', error);
      setLoading(false);
      setError('Error fetching clients');
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleStartEdit = (client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      email: client.email,
      address: client.address || '',
      phone: client.phone || ''
    });
  };

  const handleCancelEdit = () => {
    setEditingClient(null);
    setFormData({
      name: '',
      email: '',
      address: '',
      phone: ''
    });
  };

  const handleEditClient = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await api.put(`/clients/${editingClient.id}`, {
        name: formData.name,
        email: formData.email,
        address: formData.address,
        phone: formData.phone
      });
      setSuccess('Client updated successfully');
      handleCancelEdit();
      fetchClients();
    } catch (error) {
      setError(error.response?.data?.message || 'Error updating client');
    }
  };

  const handleAddClient = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const response = await api.post('/clients', formData);
      const { temporaryPassword } = response.data;
      setSuccess(`Client added successfully. Temporary password: ${temporaryPassword}`);
      setShowAddForm(false);
      setFormData({ name: '', email: '', address: '', phone: '' });
      fetchClients();
    } catch (error) {
      setError(error.response?.data?.message || 'Error adding client');
    }
  };

  const handleRegeneratePassword = async (id) => {
    setError('');
    setSuccess('');

    // Show confirmation dialog before proceeding
    const confirmed = window.confirm('Are you sure you want to reset this client\'s password? They will need to use the new temporary password to log in.');
    if (!confirmed) {
      return;
    }

    try {
      const response = await api.post(`/clients/${id}/regenerate-password`);
      setSuccess(`New temporary password: ${response.data.temporaryPassword}`);
    } catch (error) {
      setError(error.response?.data?.message || 'Error regenerating password');
    }
  };

  const handleRemoveClient = async (id, orderCount) => {
    setError('');
    setSuccess('');

    // If client has orders, show error message and return
    if (orderCount > 0) {
      setError(`Cannot remove client with ${orderCount} outstanding order${orderCount > 1 ? 's' : ''}. Please ensure all orders are completed or cancelled first.`);
      return;
    }

    // Show confirmation dialog before proceeding
    const confirmed = window.confirm('Are you sure you want to remove this client? This action cannot be undone.');
    if (!confirmed) {
      return;
    }

    try {
      await api.delete(`/clients/${id}`);
      setSuccess('Client removed successfully');
      fetchClients();
    } catch (error) {
      setError(error.response?.data?.message || 'Error removing client');
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className={styles.container}>
      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>{success}</div>}

      <div className={styles.headerContainer}>
        <h1 className={styles.header}>Clients</h1>
        <button
          className={`${styles.button} ${styles.addButton}`}
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? 'Cancel' : 'Add Client'}
        </button>
      </div>

      {showAddForm && !editingClient && (
        <form className={styles.addForm} onSubmit={handleAddClient}>
          <div className={styles.formGroup}>
            <label>
              Name:
              <input
                type="text"
                name="name"
                className={styles.input}
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </label>
          </div>
          <div className={styles.formGroup}>
            <label>
              Email:
              <input
                type="email"
                name="email"
                className={styles.input}
                value={formData.email}
                onChange={handleInputChange}
                required
              />
            </label>
          </div>
          <div className={styles.formGroup}>
            <label>
              Phone:
              <input
                type="tel"
                name="phone"
                className={styles.input}
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="Enter phone number"
              />
            </label>
          </div>
          <div className={styles.formGroup}>
            <label>
              Address:
              <textarea
                name="address"
                className={`${styles.input} ${styles.textarea}`}
                value={formData.address}
                onChange={handleInputChange}
                placeholder="Enter full address"
              />
            </label>
          </div>
          <button 
            className={`${styles.button} ${styles.addButton}`}
            type="submit"
          >
            Add Client
          </button>
        </form>
      )}

      {editingClient && (
        <form className={styles.addForm} onSubmit={handleEditClient}>
          <div className={styles.formGroup}>
            <label>
              Name:
              <input
                type="text"
                name="name"
                className={styles.input}
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </label>
          </div>
          <div className={styles.formGroup}>
            <label>
              Email:
              <input
                type="email"
                name="email"
                className={styles.input}
                value={formData.email}
                onChange={handleInputChange}
                required
              />
            </label>
          </div>
          <div className={styles.formGroup}>
            <label>
              Phone:
              <input
                type="tel"
                name="phone"
                className={styles.input}
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="Enter phone number"
              />
            </label>
          </div>
          <div className={styles.formGroup}>
            <label>
              Address:
              <textarea
                name="address"
                className={`${styles.input} ${styles.textarea}`}
                value={formData.address}
                onChange={handleInputChange}
                placeholder="Enter full address"
              />
            </label>
          </div>
          <div className={styles.buttonGroup}>
            <button 
              className={`${styles.button} ${styles.saveButton}`}
              type="submit"
            >
              Save Changes
            </button>
            <button 
              className={`${styles.button} ${styles.cancelButton}`}
              type="button"
              onClick={handleCancelEdit}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className={styles.clientGrid}>
        {clients.map((client) => (
          <div key={client.id} className={styles.clientCard}>
            <div className={styles.cardHeader}>
              <div>
                <div className={styles.clientName}>{client.name}</div>
                <div className={styles.clientEmail}>{client.email}</div>
              </div>
            </div>
            
            <div className={styles.clientInfo}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Orders</span>
                <span className={styles.infoValue}>{client.orderCount || 0}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Address</span>
                <span className={styles.infoValue}>{client.address || 'N/A'}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Join Date</span>
                <span className={styles.infoValue}>
                  {formatDate(client.createdAt)}
                </span>
              </div>
            </div>

            <div className={styles.clientActions}>
              <button
                onClick={() => handleStartEdit(client)}
                className={`${styles.button} ${styles.editButton}`}
              >
                Edit
              </button>
              <button
                onClick={() => handleRegeneratePassword(client.id)}
                className={`${styles.button} ${styles.regenerateButton}`}
              >
                Reset Password
              </button>
              <button
                onClick={() => handleRemoveClient(client.id, client.orderCount)}
                disabled={client.orderCount > 0}
                className={`${styles.button} ${styles.removeButton} ${client.orderCount > 0 ? styles.disabledButton : ''}`}
                title={client.orderCount > 0 ? `Cannot remove client with ${client.orderCount} outstanding order${client.orderCount > 1 ? 's' : ''}` : ''}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Clients;
