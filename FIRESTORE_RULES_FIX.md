# Fix Firestore Security Rules

The "Missing or insufficient permissions" error means your Firestore security rules are too restrictive. Here's how to fix it:

## 🔧 **Step 1: Update Firestore Security Rules**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Firestore Database**
4. Click on **Rules** tab
5. Replace the current rules with these **temporary development rules**:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Temporary development rules - REPLACE WITH PRODUCTION RULES LATER
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

6. Click **"Publish"**

## ⚠️ **Important Security Note**

These are **development rules** that allow any authenticated user to read/write all data. For production, you'll need more restrictive rules.

## 🔥 **Step 2: Create Admin User**

After fixing the rules, create your admin user:

### **Option A: Manual Setup**
1. **Firebase Authentication**:
   - Go to Authentication > Users
   - Add user: `admin@digitaltrack.com` / `admin123`
   - Copy the User UID

2. **Firestore Document**:
   - Go to Firestore Database
   - Create collection: `users`
   - Document ID: [paste the User UID]
   - Add fields:
   ```json
   {
     "id": "paste-user-uid-here",
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

### **Option B: Auto-Setup (I can implement this)**
I can create a temporary setup function that automatically creates the admin user with proper approval.

## 🛡️ **Step 3: Production Security Rules (Later)**

Once everything is working, replace with these production rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      // Users can read their own data
      allow read: if request.auth != null && request.auth.uid == userId;
      
      // Users can create their own document during signup
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

## 🚀 **Quick Fix Steps:**

1. **Fix Rules** → Use development rules above
2. **Create Admin User** → Either manually or let me create auto-setup
3. **Test Login** → Should work without permission errors
4. **Update Rules** → Use production rules once everything works

Let me know which option you prefer for creating the admin user!
