import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import api, { clientService } from '../services/api';
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
import { 
  Modal, 
  IconButton, 
  Stack, 
  Container, 
  Chip, 
  Tabs, 
  Tab, 
  Badge,
  Tooltip,
  Alert
} from '@mui/material';
import { 
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  HourglassEmpty as HourglassEmptyIcon
} from '@mui/icons-material';

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
    phone: '',
    discountRate: '0'
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [pendingApprovals, setPendingApprovals] = useState(0);

  const fetchClients = async () => {
    try {
      const response = await api.get('/clients');
      setClients(response.data);
      
      // Count pending approvals
      const pendingCount = response.data.filter(client => 
        client.status === 'INACTIVE'
      ).length;
      setPendingApprovals(pendingCount);
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching clients:', error);
      setLoading(false);
      setError('Error fetching clients');
    }
  };

  // Handle URL query parameters for tab selection
  const location = useLocation();
  
  useEffect(() => {
    // Check if there's a tab parameter in the URL
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    
    // Set the tab value based on the URL parameter
    if (tabParam === 'pending') {
      setTabValue(1); // Pending Approval tab
    } else if (tabParam === 'active') {
      setTabValue(2); // Active Clients tab
    } else if (tabParam === 'all') {
      setTabValue(0); // All Clients tab
    }
  }, [location.search]);
  
  useEffect(() => {
    fetchClients();
    
    // Poll for updates every 5 minutes
    const interval = setInterval(fetchClients, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);
  
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

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
      phone: client.phone || '',
      discountRate: client.discountRate || '0'
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
      phone: '',
      discountRate: '0'
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
      setFormData({ name: '', email: '', address: '', phone: '', discountRate: '0' });
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
      phone: '',
      discountRate: '0'
    });
  };

  const handleRegeneratePassword = async (id) => {
    setError('');
    setSuccess('');

    const confirmed = window.confirm('Are you sure you want to reset this client\'s password?');
    if (!confirmed) return;

    try {
      const response = await api.post(`/clients/${id}/regenerate-password`, {});
      setSuccess(`New temporary password: ${response.data.temporaryPassword}`);
    } catch (error) {
      setError(error.response?.data?.message || 'Error regenerating password');
    }
  };

  const handleApproveClient = async (id) => {
    setError('');
    setSuccess('');

    try {
      await clientService.approveClient(id);
      setSuccess('Client approved successfully');
      fetchClients();
      
      // Dispatch a custom event to notify other components about the approval
      const event = new CustomEvent('client-approval-changed');
      window.dispatchEvent(event);
    } catch (error) {
      setError(error.response?.data?.message || 'Error approving client');
    }
  };

  const handleRemoveClient = async (id, orderCount, status) => {
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
      
      // If the removed client had pending approval status, dispatch the event to update counters
      if (status === 'INACTIVE') {
        const event = new CustomEvent('client-approval-changed');
        window.dispatchEvent(event);
      }
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
        <Box sx={{ mb: 2 }}>
          <Typography variant="h4" component="h1" gutterBottom>Clients</Typography>
        </Box>
        
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
        
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          sx={{ mt: 3, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab 
            label="All Clients" 
            id="tab-0"
            aria-controls="tabpanel-0"
          />
          <Tab 
            label={
              <Badge 
                badgeContent={pendingApprovals} 
                color="error"
                invisible={pendingApprovals === 0}
              >
                Pending Approval
              </Badge>
            } 
            id="tab-1"
            aria-controls="tabpanel-1"
          />
          <Tab 
            label="Active Clients" 
            id="tab-2"
            aria-controls="tabpanel-2"
          />
        </Tabs>
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
              label="Name/Shop Name"
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
            <FormField
              label="Discount Rate (%)"
              type="number"
              name="discountRate"
              value={formData.discountRate}
              onChange={handleInputChange}
              placeholder="Enter discount rate (0-100)"
              inputProps={{ min: 0, max: 100, step: 0.01 }}
              helperText="Percentage discount applied to all prices (0-100)"
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
              label="Name/Shop Name"
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
            <FormField
              label="Discount Rate (%)"
              type="number"
              name="discountRate"
              value={formData.discountRate}
              onChange={handleInputChange}
              placeholder="Enter discount rate (0-100)"
              inputProps={{ min: 0, max: 100, step: 0.01 }}
              helperText="Percentage discount applied to all prices (0-100)"
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

      <Box 
        role="tabpanel"
        id={`tabpanel-${tabValue}`}
        aria-labelledby={`tab-${tabValue}`}
        display="grid" 
        gridTemplateColumns="repeat(auto-fill, minmax(300px, 1fr))" 
        gap={3}
      >
        {clients
          .filter(client => {
            if (tabValue === 0) return true; // All clients
            if (tabValue === 1) return client.status === 'INACTIVE'; // Pending approval
            if (tabValue === 2) return client.status === 'ACTIVE'; // Active clients
            return true;
          })
          .map((client) => (
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
                <Typography variant="body2">
                  <strong>Status:</strong> {client.status === 'INACTIVE' ? 
                    <Chip 
                      size="small"
                      label="Pending Approval" 
                      color="warning"
                      icon={<HourglassEmptyIcon />}
                      sx={{ ml: 1 }}
                    /> : 
                    <Chip 
                      size="small"
                      label="Active" 
                      color="success"
                      icon={<CheckCircleIcon />}
                      sx={{ ml: 1 }}
                    />
                  }
                </Typography>
                <Typography variant="body2">
                  <strong>Discount Rate:</strong> {client.discountRate ? `${client.discountRate}%` : '0%'}
                </Typography>
              </Box>

              <Box display="flex" flexWrap="wrap" gap={1} mt={2}>
                {client.status === 'INACTIVE' && (
                  <ActionButton
                    variant="contained"
                    size="small"
                    color="success"
                    onClick={() => handleApproveClient(client.id)}
                  >
                    Approve
                  </ActionButton>
                )}
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
                  onClick={() => handleRemoveClient(client.id, client.orderCount, client.status)}
                  disabled={client.orderCount > 0}
                >
                  Remove
                </ActionButton>
              </Box>
            </CardContent>
          </CoralCard>
        ))}
        {clients.filter(client => {
          if (tabValue === 0) return true;
          if (tabValue === 1) return client.status === 'INACTIVE';
          if (tabValue === 2) return client.status === 'ACTIVE';
          return true;
        }).length === 0 && (
          <Box sx={{ gridColumn: '1 / -1', textAlign: 'center', py: 4 }}>
            <Typography variant="body1" color="text.secondary">
              {tabValue === 1 ? 'No clients pending approval' : 
               tabValue === 2 ? 'No active clients' : 'No clients found'}
            </Typography>
          </Box>
        )}
      </Box>
    </Container>
  );
};

export default Clients;
