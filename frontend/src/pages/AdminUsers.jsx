import { useState, useEffect } from 'react';
import api from '../services/api';
import { formatDate } from '../utils/dateUtils';
import styles from './AdminUsers.module.css';
import { useAuth } from '../contexts/AuthContext';

const AdminUsers = () => {
  const { user: currentUser } = useAuth();
  const [adminUsers, setAdminUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchAdminUsers = async () => {
      try {
        const response = await api.get('/auth/admins');
        setAdminUsers(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching admin users:', error);
        setLoading(false);
      }
    };

    fetchAdminUsers();
  }, []);


  const fetchAdminUsers = async () => {
    try {
      const response = await api.get('/auth/admins');
      setAdminUsers(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching admin users:', error);
      setLoading(false);
      setError('Error fetching admin users');
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleAddAdmin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await api.post('/auth/admins', formData);
      setSuccess('Admin user added successfully. A temporary password has been sent to their email.');
      setShowAddForm(false);
      setFormData({ name: '', email: '', password: '' });
      fetchAdminUsers();
    } catch (error) {
      setError(error.response?.data?.message || 'Error adding admin user');
    }
  };

  const handleRegeneratePassword = async (id) => {
    setError('');
    setSuccess('');

    const confirmed = window.confirm('Are you sure you want to reset this admin user\'s password? A new temporary password will be sent to their email.');
    if (!confirmed) {
      return;
    }

    try {
      await api.post(`/auth/admins/${id}/regenerate-password`, {}, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      setSuccess('Password reset successfully. A new temporary password has been sent to the user\'s email.');
    } catch (error) {
      setError(error.response?.data?.message || 'Error regenerating password');
    }
  };

  const handleEditClick = (user) => {
    setEditingUserId(user.id);
    setEditFormData({
      name: user.name,
      email: user.email
    });
  };

  const handleEditInputChange = (e) => {
    setEditFormData({
      ...editFormData,
      [e.target.name]: e.target.value
    });
  };

  const handleRoleChange = async (id, newRole) => {
    setError('');
    setSuccess('');

    const confirmed = window.confirm(`Are you sure you want to change this user's role to ${newRole}? This will modify their permissions and access level.`);
    if (!confirmed) {
      return;
    }

    try {
      await api.put(`/auth/admins/${id}/role`, { role: newRole });
      setSuccess('User role updated successfully');
      fetchAdminUsers();
    } catch (error) {
      setError(error.response?.data?.message || 'Error updating user role');
    }
  };

  const handleEditSubmit = async (e, id) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const response = await api.put(`/auth/admins/${id}`, editFormData);
      setSuccess('Admin user updated successfully');
      setEditingUserId(null);
      setEditFormData({ name: '', email: '' });
      fetchAdminUsers();
    } catch (error) {
      setError(error.response?.data?.message || 'Error updating admin user');
    }
  };

  const handleRemoveAdmin = async (id) => {
    setError('');
    setSuccess('');

    const confirmed = window.confirm('Are you sure you want to remove this admin user? This action cannot be undone.');
    if (!confirmed) {
      return;
    }

    try {
      await api.delete(`/auth/admins/${id}`);
      setSuccess('Admin user removed successfully');
      fetchAdminUsers();
    } catch (error) {
      setError(error.response?.data?.message || 'Error removing admin user');
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
        <h1 className={styles.header}>Admin User Management</h1>
        <button
          className={`${styles.button} ${styles.addButton}`}
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? 'Cancel' : 'Add Admin User'}
        </button>
      </div>

      {showAddForm && (
        <form className={styles.addForm} onSubmit={handleAddAdmin}>
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
          <button 
            className={`${styles.button} ${styles.addButton}`}
            type="submit"
          >
            Add Admin User
          </button>
        </form>
      )}

      <div className={styles.adminGrid}>
        {adminUsers.map((user) => (
          <div key={user.id} className={styles.adminCard}>
            <div className={styles.cardHeader}>
              <div>
                <div className={styles.adminName}>
                  {user.name}
                  {user.role === 'SUPERADMIN' && (
                    <span className={styles.superAdminBadge} title="Super Administrator">
                      ⭐ SUPERADMIN
                    </span>
                  )}
                </div>
                <div className={styles.adminEmail}>{user.email}</div>
              </div>
            </div>
            
            <div className={styles.adminInfo}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Role</span>
                <span className={styles.infoValue}>{user.role}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Join Date</span>
                <span className={styles.infoValue}>
                  {formatDate(user.createdAt)}
                </span>
              </div>
            </div>

            {editingUserId === user.id ? (
              <form className={styles.editForm} onSubmit={(e) => handleEditSubmit(e, user.id)}>
                <div className={styles.formGroup}>
                  <label>
                    Name:
                    <input
                      type="text"
                      name="name"
                      className={styles.input}
                      value={editFormData.name}
                      onChange={handleEditInputChange}
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
                      value={editFormData.email}
                      onChange={handleEditInputChange}
                      required
                    />
                  </label>
                </div>
                <div className={styles.editActions}>
                  <button 
                    type="submit"
                    className={`${styles.button} ${styles.saveButton}`}
                  >
                    Save
                  </button>
                  <button 
                    type="button"
                    onClick={() => setEditingUserId(null)}
                    className={`${styles.button} ${styles.cancelButton}`}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className={styles.adminActions}>
                {currentUser?.role === 'SUPERADMIN' && (
                  <>
                    <button
                      onClick={() => handleEditClick(user)}
                      className={`${styles.button} ${styles.editButton}`}
                      title="Edit admin user"
                    >
                      Edit
                    </button>
                    {user.id !== currentUser.id && (
                      <button
                        onClick={() => handleRoleChange(user.id, user.role === 'ADMIN' ? 'SUPERADMIN' : 'ADMIN')}
                        className={`${styles.button} ${styles.roleButton}`}
                        title={`Change role to ${user.role === 'ADMIN' ? 'SUPERADMIN' : 'ADMIN'}`}
                      >
                        Make {user.role === 'ADMIN' ? 'SUPERADMIN' : 'ADMIN'}
                      </button>
                    )}
                  </>
                )}
                <button
                  onClick={() => handleRegeneratePassword(user.id)}
                  className={`${styles.button} ${styles.regenerateButton}`}
                  disabled={user.role === 'SUPERADMIN' && currentUser?.role !== 'SUPERADMIN'}
                  title={user.role === 'SUPERADMIN' && currentUser?.role !== 'SUPERADMIN' ? 'Only superadmins can reset superadmin passwords' : 'Reset password'}
                >
                  Reset Password
                </button>
                <button
                  onClick={() => handleRemoveAdmin(user.id)}
                  className={`${styles.button} ${styles.removeButton}`}
                  disabled={user.role === 'SUPERADMIN'}
                  title={user.role === 'SUPERADMIN' ? 'Cannot remove superadmin user' : 'Remove admin'}
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminUsers;
