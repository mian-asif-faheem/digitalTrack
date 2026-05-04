# DigitalTrack - Ionic Angular Mobile App

A comprehensive mobile application built with Ionic and Angular featuring user authentication, role-based access control, and admin approval workflows.

## 🚀 Features

### ✅ Authentication & Authorization
- **User Registration & Login** with email/password
- **Email Verification** required before login
- **Admin Approval Workflow** - new users must be approved by admins
- **Role-Based Access Control** with 4 user roles:
  - `user` - Basic user access
  - `sales_team` - Sales team member access
  - `admin` - Administrative access
  - `super_admin` - Full administrative access

### ✅ User Interface
- **Responsive Design** - Works on mobile and desktop
- **Professional UI** with Ionic components
- **Role-Based Navigation** - Different interfaces based on user role
- **Admin Dashboard** for user management
- **Route Guards** protecting authenticated routes

### ✅ Backend Integration Options
- **Mock Service** - For development and testing
- **Firebase Integration** - Production-ready authentication and database
- **Custom API Support** - Ready for custom backend integration

## 🛠️ Technology Stack

- **Frontend**: Ionic 7 + Angular 17
- **Authentication**: Firebase Auth (configurable)
- **Database**: Firestore (configurable)
- **Styling**: Ionic CSS + Custom SCSS
- **State Management**: RxJS Observables
- **Routing**: Angular Router with Guards

## 📦 Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Ionic CLI (`npm install -g @ionic/cli`)

### Quick Start

```bash
# Clone the repository
git clone <your-repo-url>
cd digitalTrack

# Install dependencies
npm install

# Run the development server
ionic serve
```

The app will open at `http://localhost:8100`

## 🔧 Configuration Options

### Option 1: Mock Authentication (Default)
Perfect for development and testing. Uses in-memory data with localStorage.

**Demo Credentials:**
- Admin: `admin@digitaltrack.com` / `admin123`
- Super Admin: `superadmin@digitaltrack.com` / `superadmin123`

### Option 2: Firebase Authentication
Production-ready authentication with real database.

1. **Follow the Firebase Setup Guide**: See `FIREBASE_SETUP.md`
2. **Update Environment Files**: Add your Firebase config
3. **The app is already configured** to use Firebase - just add your credentials!

### Option 3: Custom API Backend
Ready for integration with your own backend API.

1. **Follow the Database Integration Guide**: See `DATABASE_INTEGRATION.md`
2. **Update API endpoints** in environment files
3. **Switch to AuthRealService** in `app.module.ts`

## 🔄 Switching Authentication Methods

### Currently Active: Firebase Authentication

The app is configured to use Firebase authentication. To switch:

**To Mock Service (for development):**
```typescript
// In src/app/app.module.ts
import { AuthService } from './services/auth.service';

providers: [
  // Use mock service
  AuthService,
  // Remove Firebase provider line
]
```

**To Custom API Service:**
```typescript
// In src/app/app.module.ts
import { AuthRealService } from './services/auth-real.service';

providers: [
  // Use custom API service
  { provide: AuthService, useClass: AuthRealService },
]
```

## 📱 App Structure

```
src/app/
├── admin/
│   └── user-management/     # Admin user approval interface
├── auth/
│   ├── login/              # Login page
│   └── signup/             # Registration page
├── guards/
│   ├── auth.guard.ts       # Authentication guard
│   └── role.guard.ts       # Role-based access guard
├── models/
│   └── user.model.ts       # User data models
├── services/
│   ├── auth.service.ts     # Mock authentication service
│   ├── firebase-auth.service.ts  # Firebase authentication service
│   ├── auth-real.service.ts      # Custom API service
│   └── api.service.ts      # HTTP API service
├── tab1/                   # Home page
├── tab2/                   # Analytics page
├── tab3/                   # Profile page
└── tabs/                   # Tab navigation
```

## 🔐 Security Features

### Authentication Flow
1. User registers with email/password
2. Email verification sent automatically
3. User verifies email via link
4. Account pending admin approval
5. Admin approves/rejects user
6. User can login and access app

### Role-Based Access
- **Route Guards** prevent unauthorized access
- **UI Components** adapt based on user role
- **API Calls** include role validation
- **Admin Features** only visible to admins

### Firebase Security (when using Firebase)
- **Firestore Security Rules** enforce data access
- **JWT Tokens** for secure authentication
- **Email Verification** required
- **Admin Approval** workflow

## 🎯 User Workflows

### New User Registration
1. Click "Sign Up Here" on login page
2. Fill registration form with role selection
3. Submit form → Account created
4. Check email for verification link
5. Click verification link
6. Try to login → "Pending approval" message
7. Wait for admin approval
8. Login successfully after approval

### Admin User Management
1. Login as admin user
2. Navigate to User Management (admin-only)
3. View pending users list
4. See user details and verification status
5. Approve or reject users
6. View statistics dashboard

## 🚀 Deployment

### Development Build
```bash
ionic serve
```

### Production Build
```bash
ionic build --prod
```

### Mobile App Build
```bash
# iOS
ionic capacitor add ios
ionic capacitor run ios

# Android
ionic capacitor add android
ionic capacitor run android
```

## 📚 Documentation

- **Firebase Setup**: `FIREBASE_SETUP.md` - Complete Firebase integration guide
- **Database Integration**: `DATABASE_INTEGRATION.md` - Custom backend integration
- **API Documentation**: See services folder for API interfaces

## 🔍 Testing

### Manual Testing Checklist
- [ ] User registration flow
- [ ] Email verification
- [ ] Login with verified user
- [ ] Admin approval workflow
- [ ] Role-based navigation
- [ ] Route guards working
- [ ] Logout functionality
- [ ] Responsive design

### Demo Accounts (Mock Service)
- **Admin**: admin@digitaltrack.com / admin123
- **Super Admin**: superadmin@digitaltrack.com / superadmin123

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:
1. Check the documentation files
2. Review the troubleshooting sections
3. Check browser console for errors
4. Verify Firebase/API configuration

## 🎉 What's Next?

The app is production-ready with Firebase integration! Here's what you can do:

1. **Set up Firebase** following the setup guide
2. **Customize the UI** to match your brand
3. **Add more features** like push notifications
4. **Deploy to app stores** using Capacitor
5. **Scale with additional services** like analytics

---

**Built with ❤️ using Ionic + Angular + Firebase**
