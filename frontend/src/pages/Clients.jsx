import { useState, useEffect } from 'react';
import api from '../services/api';
import { formatDate } from '../utils/dateUtils';
import {
  CoralCard,
  ActionButton,
  Box,
  FormContainer,
  FormField,
  FormError,
  ModalContainer,
  PageTitle,
  CardContent,
  LoadingSpinner,
  SubmitButton,
  Typography
} from '../components/StyledComponents';
import { Modal, IconButton, Stack, Container } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    address: '',
    phone: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
    setShowEditModal(true);
  };

  const handleCancelEdit = () => {
    setEditingClient(null);
    setShowEditModal(false);
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
      await api.put(`/clients/${editingClient.id}`, formData);
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
      setShowAddModal(false);
      setFormData({ name: '', email: '', address: '', phone: '' });
      fetchClients();
    } catch (error) {
      setError(error.response?.data?.message || 'Error adding client');
    }
  };

  const handleCancelAdd = () => {
    setShowAddModal(false);
    setFormData({
      name: '',
      email: '',
      address: '',
      phone: ''
    });
  };

  const handleRegeneratePassword = async (id) => {
    setError('');
    setSuccess('');

    const confirmed = window.confirm('Are you sure you want to reset this client\'s password?');
    if (!confirmed) return;

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

    if (orderCount > 0) {
      setError(`Cannot remove client with ${orderCount} outstanding order${orderCount > 1 ? 's' : ''}`);
      return;
    }

    const confirmed = window.confirm('Are you sure you want to remove this client?');
    if (!confirmed) return;

    try {
      await api.delete(`/clients/${id}`);
      setSuccess('Client removed successfully');
      fetchClients();
    } catch (error) {
      setError(error.response?.data?.message || 'Error removing client');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <LoadingSpinner />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {error && <FormError severity="error">{error}</FormError>}
      {success && <FormError severity="success">{success}</FormError>}

      <Box sx={{ mb: 3 }}>
        <PageTitle variant="h1" sx={{ mb: 2 }}>Clients</PageTitle>
        <Stack spacing={2} sx={{ width: { xs: '100%', sm: '50%', md: '30%' } }}>
          <ActionButton 
            variant="contained"
            color="success"
            onClick={() => setShowAddModal(true)}
            fullWidth
            sx={{ 
              py: 1.5,
              fontSize: '1rem'
            }}
          >
            Add Client
          </ActionButton>
        </Stack>
      </Box>

      {/* Add Client Modal */}
      <Modal
        open={showAddModal}
        onClose={handleCancelAdd}
        aria-labelledby="add-client-modal-title"
      >
        <ModalContainer>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5" id="add-client-modal-title">
              Add New Client
            </Typography>
            <IconButton 
              onClick={handleCancelAdd}
              size="small"
            >
              <CloseIcon />
            </IconButton>
          </Box>
          
          <Box component="form" onSubmit={handleAddClient}>
            <FormField
              label="Name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              fullWidth
            />
            <FormField
              label="Email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              fullWidth
            />
            <FormField
              label="Phone"
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="Enter phone number"
              fullWidth
            />
            <FormField
              label="Address"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              placeholder="Enter full address"
              multiline
              rows={4}
              fullWidth
            />
            <Box display="flex" gap={2} mt={2}>
              <SubmitButton type="submit" variant="contained">
                Add Client
              </SubmitButton>
              <ActionButton 
                variant="outlined" 
                onClick={handleCancelAdd}
              >
                Cancel
              </ActionButton>
            </Box>
          </Box>
        </ModalContainer>
      </Modal>

      {/* Edit Client Modal */}
      <Modal
        open={showEditModal && editingClient !== null}
        onClose={handleCancelEdit}
        aria-labelledby="edit-client-modal-title"
      >
        <ModalContainer>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5" id="edit-client-modal-title">
              Edit Client
            </Typography>
            <IconButton 
              onClick={handleCancelEdit}
              size="small"
            >
              <CloseIcon />
            </IconButton>
          </Box>
          
          <Box component="form" onSubmit={handleEditClient}>
            <FormField
              label="Name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              fullWidth
            />
            <FormField
              label="Email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              fullWidth
            />
            <FormField
              label="Phone"
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="Enter phone number"
              fullWidth
            />
            <FormField
              label="Address"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              placeholder="Enter full address"
              multiline
              rows={4}
              fullWidth
            />
            <Box display="flex" gap={2} mt={2}>
              <SubmitButton type="submit" variant="contained">
                Save Changes
              </SubmitButton>
              <ActionButton 
                variant="outlined" 
                onClick={handleCancelEdit}
              >
                Cancel
              </ActionButton>
            </Box>
          </Box>
        </ModalContainer>
      </Modal>

      <Box display="grid" gridTemplateColumns="repeat(auto-fill, minmax(300px, 1fr))" gap={3}>
        {clients.map((client) => (
          <CoralCard key={client.id}>
            <CardContent>
              <Typography variant="h6">{client.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {client.email}
              </Typography>

              <Box mt={2}>
                <Typography variant="body2">
                  <strong>Orders:</strong> {client.orderCount || 0}
                </Typography>
                <Typography variant="body2">
                  <strong>Address:</strong> {client.address || 'N/A'}
                </Typography>
                <Typography variant="body2">
                  <strong>Join Date:</strong> {formatDate(client.createdAt)}
                </Typography>
              </Box>

              <Box display="flex" gap={1} mt={2}>
                <ActionButton
                  variant="outlined"
                  size="small"
                  onClick={() => handleStartEdit(client)}
                >
                  Edit
                </ActionButton>
                <ActionButton
                  variant="outlined"
                  size="small"
                  onClick={() => handleRegeneratePassword(client.id)}
                >
                  Reset Password
                </ActionButton>
                <ActionButton
                  variant="outlined"
                  size="small"
                  color="error"
                  onClick={() => handleRemoveClient(client.id, client.orderCount)}
                  disabled={client.orderCount > 0}
                >
                  Remove
                </ActionButton>
              </Box>
            </CardContent>
          </CoralCard>
        ))}
      </Box>
    </Container>
  );
};

export default Clients;
