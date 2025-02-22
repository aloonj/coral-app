import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { coralService, categoryService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const AddCoral = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formError, setFormError] = useState('');
  const showAdditionalDetails = import.meta.env.VITE_SHOW_ADDITIONAL_CORAL_DETAILS === 'true';
  
  const [coralForm, setCoralForm] = useState({
    speciesName: '',
    scientificName: '',
    description: '',
    price: '',
    categoryId: '',
    quantity: '',
    minimumStock: '',
    image: null,
    ...(showAdditionalDetails && {
      careLevel: 'EASY',
      growthRate: 'MODERATE',
      lightingRequirements: '',
      waterFlow: 'MEDIUM'
    })
  });

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPERADMIN')) {
          navigate('/corals');
          return;
        }

        const categoriesRes = await categoryService.getAllCategories(false);
        setCategories(categoriesRes.data.filter(cat => cat.status !== 'INACTIVE'));
      } catch (error) {
        console.error('Error fetching categories:', error);
        setFormError(error.response?.data?.message || 'Error loading categories');
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, [navigate, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    try {
      const coralData = {
        ...coralForm,
        price: parseFloat(coralForm.price),
        categoryId: parseInt(coralForm.categoryId),
        quantity: parseInt(coralForm.quantity),
        minimumStock: parseInt(coralForm.minimumStock)
      };

      await coralService.createCoral(coralData);
      navigate('/corals');
    } catch (error) {
      console.error('Error creating coral:', error);
      setFormError(error.response?.data?.message || error.message || 'Error creating coral');
    }
  };

  // Styles
  const containerStyle = {
    padding: '2rem',
    maxWidth: '800px',
    margin: '0 auto',
  };

  const headerStyle = {
    fontSize: '2rem',
    fontWeight: 'bold',
    marginBottom: '1.5rem',
    color: '#2D3748',
  };

  const formStyle = {
    display: 'grid',
    gridTemplateColumns: '150px 1fr',
    gap: '1rem',
    alignItems: 'start',
  };

  const labelStyle = {
    fontWeight: 'bold',
    color: '#4A5568',
    paddingTop: '0.5rem',
  };

  const inputStyle = {
    padding: '0.5rem',
    borderRadius: '0.375rem',
    border: '1px solid #CBD5E0',
  };

  const buttonStyle = {
    padding: '0.5rem 1rem',
    backgroundColor: '#319795',
    color: 'white',
    border: 'none',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    fontWeight: 'bold',
    transition: 'background-color 0.2s',
  };

  const numberInputStyle = {
    ...inputStyle,
    width: '60px',
    textAlign: 'center',
    padding: '0.5rem',
    WebkitAppearance: 'none',
    MozAppearance: 'textfield',
    '-moz-appearance': 'textfield',
  };

  const numberButtonStyle = (color) => ({
    ...buttonStyle,
    padding: '0.5rem',
    minWidth: '40px',
    backgroundColor: color,
    borderRadius: '4px',
  });

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div>;
  }

  return (
    <div style={containerStyle}>
      <h1 style={headerStyle}>Add New Coral</h1>

      <form onSubmit={handleSubmit} style={formStyle}>
        {formError && (
          <div style={{
            gridColumn: '1 / -1',
            padding: '0.75rem',
            backgroundColor: '#FED7D7',
            color: '#C53030',
            borderRadius: '0.375rem',
            marginBottom: '1rem'
          }}>
            {formError}
          </div>
        )}

        <label style={labelStyle}>Species Name</label>
        <input
          style={inputStyle}
          type="text"
          value={coralForm.speciesName}
          onChange={(e) => setCoralForm({...coralForm, speciesName: e.target.value})}
          required
        />

        <label style={labelStyle}>Scientific Name</label>
        <input
          style={inputStyle}
          type="text"
          value={coralForm.scientificName}
          onChange={(e) => setCoralForm({...coralForm, scientificName: e.target.value})}
          required
        />

        <label style={labelStyle}>Description</label>
        <textarea
          style={{...inputStyle, minHeight: '100px'}}
          value={coralForm.description}
          onChange={(e) => setCoralForm({...coralForm, description: e.target.value})}
          required
        />

        {showAdditionalDetails && (
          <>
            <label style={labelStyle}>Care Level</label>
            <select
              style={inputStyle}
              value={coralForm.careLevel}
              onChange={(e) => setCoralForm({...coralForm, careLevel: e.target.value})}
            >
              <option value="EASY">Easy Care</option>
              <option value="MODERATE">Moderate Care</option>
              <option value="EXPERT">Expert Care</option>
            </select>

            <label style={labelStyle}>Growth Rate</label>
            <select
              style={inputStyle}
              value={coralForm.growthRate}
              onChange={(e) => setCoralForm({...coralForm, growthRate: e.target.value})}
            >
              <option value="SLOW">Slow Growth</option>
              <option value="MODERATE">Moderate Growth</option>
              <option value="FAST">Fast Growth</option>
            </select>

            <label style={labelStyle}>Lighting</label>
            <input
              style={inputStyle}
              type="text"
              value={coralForm.lightingRequirements}
              onChange={(e) => setCoralForm({...coralForm, lightingRequirements: e.target.value})}
            />

            <label style={labelStyle}>Water Flow</label>
            <select
              style={inputStyle}
              value={coralForm.waterFlow}
              onChange={(e) => setCoralForm({...coralForm, waterFlow: e.target.value})}
            >
              <option value="LOW">Low Flow</option>
              <option value="MEDIUM">Medium Flow</option>
              <option value="HIGH">High Flow</option>
            </select>
          </>
        )}

        <label style={labelStyle}>Price</label>
        <input
          style={inputStyle}
          type="number"
          step="0.01"
          value={coralForm.price}
          onChange={(e) => setCoralForm({...coralForm, price: e.target.value})}
          required
        />

        <label style={labelStyle}>Image</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input
            style={inputStyle}
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files[0];
              setCoralForm(prev => ({...prev, image: file}));
            }}
          />
          {coralForm.image && (
            <div style={{
              width: '200px',
              height: '200px',
              border: '1px solid #CBD5E0',
              borderRadius: '0.375rem',
              overflow: 'hidden'
            }}>
              <img
                src={URL.createObjectURL(coralForm.image)}
                alt="Coral preview"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
                onError={(e) => {
                  e.target.src = '/src/assets/images/image-coming-soon.svg';
                }}
              />
            </div>
          )}
        </div>

        <label style={labelStyle}>Category</label>
        <select
          style={inputStyle}
          value={coralForm.categoryId}
          onChange={(e) => setCoralForm({...coralForm, categoryId: e.target.value})}
          required
        >
          <option value="">Select Category</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>

        <label style={labelStyle}>Quantity</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            style={numberButtonStyle('#E53E3E')}
            onClick={() => setCoralForm(prev => ({
              ...prev,
              quantity: Math.max(0, parseInt(prev.quantity || 0) - 1).toString()
            }))}
          >
            -
          </button>
          <input
            style={numberInputStyle}
            type="text"
            value={coralForm.quantity}
            onChange={(e) => {
              const value = e.target.value;
              if (value === '' || /^\d+$/.test(value)) {
                setCoralForm({...coralForm, quantity: value});
              }
            }}
            required
          />
          <button
            type="button"
            style={numberButtonStyle('#48BB78')}
            onClick={() => setCoralForm(prev => ({
              ...prev,
              quantity: (parseInt(prev.quantity || 0) + 1).toString()
            }))}
          >
            +
          </button>
        </div>

        <label style={labelStyle}>Min Stock</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            style={numberButtonStyle('#E53E3E')}
            onClick={() => setCoralForm(prev => ({
              ...prev,
              minimumStock: Math.max(0, parseInt(prev.minimumStock || 0) - 1).toString()
            }))}
          >
            -
          </button>
          <input
            style={numberInputStyle}
            type="text"
            value={coralForm.minimumStock}
            onChange={(e) => {
              const value = e.target.value;
              if (value === '' || /^\d+$/.test(value)) {
                setCoralForm({...coralForm, minimumStock: value});
              }
            }}
            required
          />
          <button
            type="button"
            style={numberButtonStyle('#48BB78')}
            onClick={() => setCoralForm(prev => ({
              ...prev,
              minimumStock: (parseInt(prev.minimumStock || 0) + 1).toString()
            }))}
          >
            +
          </button>
        </div>

        <div style={{ gridColumn: '1 / -1', marginTop: '1rem', display: 'flex', gap: '1rem' }}>
          <button style={buttonStyle} type="submit">
            Create Coral
          </button>
          <button 
            style={{...buttonStyle, backgroundColor: '#718096'}} 
            type="button"
            onClick={() => navigate('/corals')}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddCoral;
