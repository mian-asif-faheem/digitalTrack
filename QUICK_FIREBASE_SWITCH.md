# Quick Firebase Switch Guide

## Current Status: Mock Service Active ✅

The app is currently using the mock authentication service so you can test all functionality immediately.

**Demo Credentials:**
- Admin: `admin@digitaltrack.com` / `admin123`
- Super Admin: `superadmin@digitaltrack.com` / `superadmin123`

## 🔄 Switch to Firebase (When Ready)

### Step 1: Set Up Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create project: "digitaltrack"
3. Enable Authentication > Email/Password
4. Create Firestore Database
5. Copy your Firebase config

### Step 2: Update Environment Files

Replace the placeholder values in `src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  firebaseConfig: {
    apiKey: "YOUR_ACTUAL_API_KEY",
    authDomain: "your-project-id.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "123456789",
    appId: "your-actual-app-id",
    measurementId: "G-XXXXXXXXXX"
  }
};
```

### Step 3: Activate Firebase in App Module

In `src/app/app.module.ts`, uncomment Firebase providers:

```typescript
providers: [
  { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
  // Uncomment these lines:
  provideFirebaseApp(() => initializeApp(environment.firebaseConfig)),
  provideAuth(() => getAuth()),
  provideFirestore(() => getFirestore()),
  // Switch to Firebase service:
  { provide: AuthService, useClass: FirebaseAuthService }
  // Remove: AuthService
],
```

### Step 4: Create Initial Admin User

In Firebase Console:
1. Authentication > Users > Add user
2. Email: `admin@digitaltrack.com`, Password: `admin123`
3. Firestore > Create collection: `users`
4. Add document with user's UID:
```json
{
  "id": "firebase-user-uid",
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

### Step 5: Test Firebase Integration

```bash
ionic serve
```

## 📚 Complete Guides Available:

- **`FIREBASE_SETUP.md`** - Detailed Firebase setup with security rules
- **`DATABASE_INTEGRATION.md`** - Custom backend integration options
- **`README.md`** - Complete project documentation

## 🎯 Current App Features (Working Now):

✅ Login/Signup with mock data  
✅ Email verification simulation  
✅ Admin approval workflow  
✅ Role-based access control  
✅ User management interface  
✅ Route guards and security  
✅ Responsive mobile design  

**Ready to test immediately with mock data!**
