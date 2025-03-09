import { useState, useEffect } from 'react';
import { 
  Container, 
  Box, 
  Typography, 
  Button, 
  Grid, 
  Card, 
  CardContent, 
  Chip
} from '@mui/material';
import api from '../services/api';
import { formatDate } from '../utils/dateUtils';
import { useAuth } from '../contexts/AuthContext';
import { ActionButton, FormField } from '../components/StyledComponents';
import StatusMessage from '../components/StatusMessage';
import ConfirmationDialog from '../components/ConfirmationDialog';
import ActionButtonGroup from '../components/ActionButtonGroup';

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
  
  // Dialog state
  const [dialog, setDialog] = useState({
    open: false,
    title: '',
    message: '',
    confirmAction: null
  });

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

  const openConfirmDialog = (title, message, confirmAction) => {
    setDialog({
      open: true,
      title,
      message,
      confirmAction
    });
  };

  const closeConfirmDialog = () => {
    setDialog({
      ...dialog,
      open: false
    });
  };

  const handleRegeneratePassword = async (id) => {
    setError('');
    setSuccess('');

    openConfirmDialog(
      'Reset Password',
      'Are you sure you want to reset this admin user\'s password? A new temporary password will be sent to their email.',
      async () => {
        try {
          await api.post(`/auth/admins/${id}/regenerate-password`, {}, {
            headers: {
              'Content-Type': 'application/json'
            }
          });
          setSuccess('Password reset successfully. A new temporary password has been sent to the user\'s email.');
          closeConfirmDialog();
        } catch (error) {
          setError(error.response?.data?.message || 'Error regenerating password');
          closeConfirmDialog();
        }
      }
    );
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

    openConfirmDialog(
      'Change User Role',
      `Are you sure you want to change this user's role to ${newRole}? This will modify their permissions and access level.`,
      async () => {
        try {
          await api.put(`/auth/admins/${id}/role`, { role: newRole });
          setSuccess('User role updated successfully');
          fetchAdminUsers();
          closeConfirmDialog();
        } catch (error) {
          setError(error.response?.data?.message || 'Error updating user role');
          closeConfirmDialog();
        }
      }
    );
  };

  const handleEditSubmit = async (e, id) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await api.put(`/auth/admins/${id}`, editFormData);
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

    openConfirmDialog(
      'Remove Admin User',
      'Are you sure you want to remove this admin user? This action cannot be undone.',
      async () => {
        try {
          await api.delete(`/auth/admins/${id}`);
          setSuccess('Admin user removed successfully');
          fetchAdminUsers();
          closeConfirmDialog();
        } catch (error) {
          setError(error.response?.data?.message || 'Error removing admin user');
          closeConfirmDialog();
        }
      }
    );
  };

  if (loading) {
    return (
      <Container>
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <Typography>Loading...</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <StatusMessage error={error} success={success} />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h1">Admin User Management</Typography>
        <Button
          variant="contained"
          color={showAddForm ? "inherit" : "success"}
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? 'Cancel' : 'Add Admin User'}
        </Button>
      </Box>

      {showAddForm && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box component="form" onSubmit={handleAddAdmin}>
              <FormField
                label="Name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                fullWidth
                required
              />
              <FormField
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                fullWidth
                required
              />
              <Button 
                type="submit"
                variant="contained"
                color="success"
                fullWidth
              >
                Add Admin User
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      <Grid container spacing={2}>
        {adminUsers.map((user) => (
          <Grid item xs={12} sm={6} md={4} key={user.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography variant="h6" component="div">
                        {user.name}
                      </Typography>
                      {user.role === 'SUPERADMIN' && (
                        <Chip
                          label="SUPERADMIN"
                          size="small"
                          color="secondary"
                          icon={<span>⭐</span>}
                          sx={{ fontWeight: 600 }}
                        />
                      )}
                    </Box>
                    <Typography color="text.secondary" variant="body2">
                      {user.email}
                    </Typography>
                  </Box>
                </Box>
                
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2, mb: 2 }}>
                  <Box>
                    <Typography color="text.secondary" variant="caption">
                      Role
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {user.role}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography color="text.secondary" variant="caption">
                      Join Date
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {formatDate(user.createdAt)}
                    </Typography>
                  </Box>
                </Box>

                {editingUserId === user.id ? (
                  <Box component="form" onSubmit={(e) => handleEditSubmit(e, user.id)}>
                    <FormField
                      label="Name"
                      name="name"
                      value={editFormData.name}
                      onChange={handleEditInputChange}
                      fullWidth
                      required
                    />
                    <FormField
                      label="Email"
                      name="email"
                      type="email"
                      value={editFormData.email}
                      onChange={handleEditInputChange}
                      fullWidth
                      required
                    />
                    <ActionButtonGroup>
                      <Button 
                        type="submit"
                        variant="contained"
                        color="success"
                      >
                        Save
                      </Button>
                      <Button 
                        type="button"
                        variant="outlined"
                        color="inherit"
                        onClick={() => setEditingUserId(null)}
                      >
                        Cancel
                      </Button>
                    </ActionButtonGroup>
                  </Box>
                ) : (
                  <ActionButtonGroup>
                    {currentUser?.role === 'SUPERADMIN' && (
                      <>
                        <ActionButton
                          onClick={() => handleEditClick(user)}
                          variant="contained"
                          color="secondary"
                          size="small"
                        >
                          Edit
                        </ActionButton>
                        {user.id !== currentUser.id && (
                          <ActionButton
                            onClick={() => handleRoleChange(user.id, user.role === 'ADMIN' ? 'SUPERADMIN' : 'ADMIN')}
                            variant="contained"
                            color="warning"
                            size="small"
                          >
                            Make {user.role === 'ADMIN' ? 'SUPERADMIN' : 'ADMIN'}
                          </ActionButton>
                        )}
                      </>
                    )}
                    <ActionButton
                      onClick={() => handleRegeneratePassword(user.id)}
                      variant="contained"
                      color="info"
                      size="small"
                      disabled={user.role === 'SUPERADMIN' && currentUser?.role !== 'SUPERADMIN'}
                    >
                      Reset Password
                    </ActionButton>
                    <ActionButton
                      onClick={() => handleRemoveAdmin(user.id)}
                      variant="contained"
                      color="error"
                      size="small"
                      disabled={user.role === 'SUPERADMIN'}
                    >
                      Remove
                    </ActionButton>
                  </ActionButtonGroup>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <ConfirmationDialog
        open={dialog.open}
        title={dialog.title}
        message={dialog.message}
        onConfirm={() => dialog.confirmAction && dialog.confirmAction()}
        onCancel={closeConfirmDialog}
      />
    </Container>
  );
};

export default AdminUsers;
