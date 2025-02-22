# Coral Management System Frontend

React-based frontend for the Coral Management System, providing a modern and intuitive interface for coral inventory and order management.

## 🌟 Features

- 📊 Interactive dashboard with key metrics
- 📦 Coral inventory management interface
- 🛒 Order processing system
- 👥 Client management portal
- 📸 Image gallery and management
- 📢 News bulletin board
- 💾 Backup management interface
- 📨 Notification center
- 🔐 Role-based access control

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Backend server running (see [backend documentation](../backend/README.md))

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create your environment file:
```bash
cp .env.example .env
```

3. Configure environment variables:
```env
VITE_API_URL=http://localhost:5000
VITE_IMAGE_BASE_URL=http://localhost:5000/uploads
VITE_DEFAULT_CURRENCY=GBP
```

### Development

Start the development server:
```bash
npm run dev
```

Build for production:
```bash
npm run build
```

Preview production build:
```bash
npm run preview
```

## 🏗 Project Structure

```
src/
├── assets/          # Static assets (images, icons)
├── components/      # Reusable UI components
│   ├── Auth/       # Authentication components
│   ├── ImageGallery/# Image handling components
│   ├── Layout/     # Layout components
│   └── Orders/     # Order management components
├── config/         # Configuration files
├── contexts/       # React Context providers
├── pages/          # Page components
├── services/       # API service layer
└── utils/          # Utility functions
```

## 📦 Key Components

### Auth
- `AuthForm.jsx` - Handles user login and registration
- `AuthContext.jsx` - Manages authentication state

### ImageGallery
- `ImageGallery.jsx` - Displays coral images in grid layout
- `ImageModal.jsx` - Modal for image details and actions
- `ImageSelector.jsx` - Image selection interface

### Layout
- `Layout.jsx` - Main application layout with navigation

### Orders
- `OrderTable.jsx` - Displays and manages orders
- `OrderDetails.jsx` - Detailed order view
- `StatusBadge.jsx` - Order status indicator
- `PaymentBadge.jsx` - Payment status indicator

## 📄 Pages

- `Dashboard.jsx` - Main dashboard with metrics
- `Corals.jsx` - Coral inventory management
- `Orders.jsx` - Order management interface
- `Clients.jsx` - Client management
- `ImageManagement.jsx` - Image upload and management
- `Notifications.jsx` - Notification center
- `Backups.jsx` - Backup management
- `Profile.jsx` - User profile management
- `QuickOrder.jsx` - Streamlined order creation

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| VITE_API_URL | Backend API URL | http://localhost:5000 |
| VITE_IMAGE_BASE_URL | Base URL for images | http://localhost:5000/uploads |
| VITE_DEFAULT_CURRENCY | Default currency | GBP |

### API Services

The `services/api.js` file provides a configured Axios instance with:
- Base URL configuration
- Authentication header injection
- Error handling
- Response interceptors

## 🎨 Styling

- Uses CSS Modules for component-scoped styling
- Responsive design for mobile and desktop
- Consistent color scheme and typography
- Dark mode support

## 🔒 Security

- JWT-based authentication
- Token storage in localStorage
- Route protection based on user roles
- Input validation and sanitization

## 🧪 Testing

Run tests:
```bash
npm run test
```

## 📚 Additional Resources

- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://reactjs.org/)
- [Backend API Documentation](../backend/README.md)

## 🐛 Common Issues

1. **API Connection Failed**
   - Ensure backend server is running
   - Check VITE_API_URL in .env
   - Verify network connectivity

2. **Image Loading Issues**
   - Confirm VITE_IMAGE_BASE_URL is correct
   - Check file permissions
   - Verify image paths

3. **Authentication Errors**
   - Clear localStorage
   - Re-login
   - Check token expiration

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a pull request
