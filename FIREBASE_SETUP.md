# Firebase Setup Guide for DigitalTrack

This guide will help you set up Firebase Authentication and Firestore for your DigitalTrack mobile app.

## 🔥 Firebase Project Setup

### Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter project name: `digitaltrack` (or your preferred name)
4. Enable Google Analytics (optional but recommended)
5. Choose or create a Google Analytics account
6. Click "Create project"

### Step 2: Add Web App to Firebase Project

1. In your Firebase project dashboard, click the web icon `</>`
2. Register your app with nickname: `DigitalTrack Web`
3. Check "Also set up Firebase Hosting" (optional)
4. Click "Register app"
5. Copy the Firebase configuration object

### Step 3: Update Environment Configuration

Replace the placeholder values in your environment files with your actual Firebase config:

**Development (`src/environments/environment.ts`):**
```typescript
export const environment = {
  production: false,
  firebaseConfig: {
    apiKey: "AIzaSyC...", // Your actual API key
    authDomain: "your-project-id.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef123456",
    measurementId: "G-XXXXXXXXXX" // Optional
  }
};
```

**Production (`src/environments/environment.prod.ts`):**
```typescript
export const environment = {
  production: true,
  firebaseConfig: {
    // Same config as development, or separate production project
    apiKey: "AIzaSyC...",
    authDomain: "your-project-id.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef123456",
    measurementId: "G-XXXXXXXXXX"
  }
};
```

## 🔐 Firebase Authentication Setup

### Step 1: Enable Authentication

1. In Firebase Console, go to "Authentication" in the left sidebar
2. Click "Get started"
3. Go to "Sign-in method" tab
4. Enable "Email/Password" provider
5. Click "Save"

### Step 2: Configure Email Verification

1. In Authentication settings, go to "Templates" tab
2. Click on "Email address verification"
3. Customize the email template if needed
4. Make sure "Email address verification" is enabled

### Step 3: Set Up Admin Users (Optional)

You can manually create admin users in the Firebase Console:

1. Go to "Authentication" > "Users"
2. Click "Add user"
3. Enter email and password for admin user
4. After creating, you'll need to manually add them to Firestore with admin role

## 🗄️ Firestore Database Setup

### Step 1: Create Firestore Database

1. In Firebase Console, go to "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode" (for development)
4. Select a location for your database
5. Click "Done"

### Step 2: Set Up Security Rules

Replace the default rules with these security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // Admins can read all user documents
      allow read: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'super_admin'];
      
      // Admins can update user approval status
      allow update: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'super_admin'] &&
        request.resource.data.diff(resource.data).affectedKeys().hasOnly(['isApproved', 'approvedBy', 'approvedAt', 'updatedAt']);
      
      // Admins can delete users (reject)
      allow delete: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'super_admin'];
    }
  }
}
```

### Step 3: Create Initial Admin User

You'll need to create an initial admin user. You can do this in two ways:

#### Option A: Through Firebase Console
1. Go to Authentication > Users
2. Add a user with your admin email
3. Go to Firestore Database
4. Create a document in the `users` collection with the user's UID as document ID
5. Add the following fields:
   ```json
   {
     "id": "user-uid-here",
     "email": "admin@digitaltrack.com",
     "firstName": "Admin",
     "lastName": "User",
     "role": "admin",
     "isEmailVerified": true,
     "isApproved": true,
     "createdAt": "2024-01-01T00:00:00.000Z",
     "updatedAt": "2024-01-01T00:00:00.000Z"
   }
   ```

#### Option B: Through Code (Temporary)
You can temporarily modify the Firebase service to auto-approve the first admin user.

## 📱 Testing the Integration

### Step 1: Build and Run

```bash
cd digitalTrack
npm install
ionic serve
```

### Step 2: Test User Registration

1. Go to the signup page
2. Create a new user account
3. Check your email for verification link
4. Click the verification link
5. Try to login (should show "pending approval" message)

### Step 3: Test Admin Approval

1. Login as admin user
2. Go to User Management page
3. You should see the pending user
4. Approve the user
5. The user should now be able to login

## 🔧 Firebase Features Used

### Authentication Features
- ✅ Email/Password authentication
- ✅ Email verification
- ✅ User state management
- ✅ Secure token handling

### Firestore Features
- ✅ User profile storage
- ✅ Role-based access control
- ✅ Real-time data sync
- ✅ Security rules
- ✅ Admin approval workflow

## 🚀 Production Deployment

### Step 1: Update Security Rules

For production, update Firestore rules to be more restrictive:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      // Users can only read their own data
      allow read: if request.auth != null && request.auth.uid == userId;
      
      // Users can only create their own document during signup
      allow create: if request.auth != null && 
        request.auth.uid == userId &&
        request.resource.data.role == 'user' &&
        request.resource.data.isApproved == false;
      
      // Users can update their own profile (limited fields)
      allow update: if request.auth != null && 
        request.auth.uid == userId &&
        request.resource.data.diff(resource.data).affectedKeys().hasOnly(['firstName', 'lastName', 'updatedAt']);
      
      // Admins can read all users
      allow read: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'super_admin'];
      
      // Admins can approve/reject users
      allow update, delete: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'super_admin'];
    }
  }
}
```

### Step 2: Environment Variables

For production deployment, consider using environment variables:

```bash
# .env file (don't commit to git)
FIREBASE_API_KEY=your-api-key
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=your-app-id
```

### Step 3: Build for Production

```bash
ionic build --prod
```

## 🔍 Troubleshooting

### Common Issues

1. **"Firebase not initialized"**
   - Make sure you've added your Firebase config to environment files
   - Check that app.module.ts has the Firebase providers

2. **"Permission denied" errors**
   - Check your Firestore security rules
   - Make sure the user is authenticated
   - Verify user roles in Firestore

3. **Email verification not working**
   - Check spam folder
   - Verify email templates in Firebase Console
   - Make sure Authentication is enabled

4. **Users not appearing in admin panel**
   - Check that users have verified their email
   - Verify Firestore security rules allow admin access
   - Check browser console for errors

### Debug Tips

1. Enable Firebase debug mode:
   ```typescript
   import { connectAuthEmulator } from '@angular/fire/auth';
   import { connectFirestoreEmulator } from '@angular/fire/firestore';
   
   // In app.module.ts (development only)
   if (!environment.production) {
     connectAuthEmulator(getAuth(), 'http://localhost:9099');
     connectFirestoreEmulator(getFirestore(), 'localhost', 8080);
   }
   ```

2. Check browser console for detailed error messages
3. Use Firebase Console to monitor authentication and database activity

## 📚 Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [AngularFire Documentation](https://github.com/angular/angularfire)
- [Ionic Firebase Integration](https://ionicframework.com/docs/native/firebase)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)

## 🎯 Next Steps

After setting up Firebase:

1. Test all authentication flows
2. Set up proper security rules
3. Configure email templates
4. Set up monitoring and analytics
5. Plan for scaling and backup strategies

Your DigitalTrack app is now ready to use Firebase for production-grade authentication and data storage!
