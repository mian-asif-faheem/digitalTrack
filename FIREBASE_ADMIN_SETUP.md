# Firebase Admin User Setup Guide

You're getting the "user not approved" error because the user document in Firestore needs to have `isApproved: true`. Here's how to fix it:

## 🔥 **Method 1: Manual Setup in Firebase Console**

### **Step 1: Create User in Firebase Authentication**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Authentication** > **Users**
4. Click **"Add user"**
5. Enter:
   - **Email**: `admin@digitaltrack.com`
   - **Password**: `admin123`
6. Click **"Add user"**
7. **Copy the User UID** (you'll need this for Step 2)

### **Step 2: Create User Document in Firestore**
1. In Firebase Console, go to **Firestore Database**
2. Click **"Start collection"** if it's your first collection
3. Collection ID: `users`
4. Document ID: **Paste the User UID from Step 1**
5. Add these fields with correct types:

| Field | Type | Value |
|-------|------|-------|
| `id` | string | `paste-user-uid-here` |
| `email` | string | `admin@digitaltrack.com` |
| `firstName` | string | `Admin` |
| `lastName` | string | `User` |
| `role` | string | `admin` |
| `isEmailVerified` | boolean | `true` |
| `isApproved` | boolean | `true` |
| `createdAt` | timestamp | Current date/time |
| `updatedAt` | timestamp | Current date/time |

### **Step 3: Test Login**
Now try logging in with:
- **Email**: `admin@digitaltrack.com`
- **Password**: `admin123`

## 🛠️ **Method 2: Auto-Setup Function (Easier)**

If you want to automatically create an admin user, I can add a temporary setup function to the Firebase service that will:

1. Check if admin user exists
2. If not, create the user document with approval
3. Auto-approve the first admin user

Would you like me to implement this auto-setup method?

## 🔍 **Troubleshooting**

### **Common Issues:**

1. **User UID Mismatch**
   - Make sure the Firestore document ID exactly matches the Firebase Auth UID

2. **Field Type Errors**
   - `isEmailVerified` and `isApproved` must be boolean, not string
   - `role` must be exactly `"admin"` (lowercase)

3. **Collection Name**
   - Collection must be named exactly `users` (lowercase)

4. **Security Rules**
   - Make sure Firestore security rules allow reading user documents

### **Verify Setup:**
1. Firebase Auth should show the user
2. Firestore should have `users` collection
3. Document ID should match Auth UID
4. `isApproved` should be `true` (boolean)
5. `isEmailVerified` should be `true` (boolean)

## 📱 **Next Steps After Setup:**

Once the admin user is properly configured:
1. Login should work without approval error
2. You can access the admin dashboard
3. You can approve other users through the app
4. The complete user management workflow will be functional

Let me know if you need help with any of these steps!
