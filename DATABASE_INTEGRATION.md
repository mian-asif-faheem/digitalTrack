# Database Integration Guide for DigitalTrack

This guide explains how to integrate real database credentials and backend APIs with your DigitalTrack mobile app.

## 🗂️ Current Setup

The app currently uses mock data for demonstration purposes. To integrate with a real database, you have several options:

## 🔧 Integration Options

### Option 1: Custom Backend API (Recommended)

#### 1. Environment Configuration

Update the environment files with your API endpoints:

**Development (`src/environments/environment.ts`):**
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api', // Your local backend API
  // ... other config
};
```

**Production (`src/environments/environment.prod.ts`):**
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://your-api.com/api', // Your production API
  // ... other config
};
```

#### 2. Switch to Real API Service

In `src/app/app.module.ts`, replace the mock AuthService with the real one:

```typescript
import { AuthRealService } from './services/auth-real.service';

@NgModule({
  // ...
  providers: [
    // Replace AuthService with AuthRealService
    { provide: AuthService, useClass: AuthRealService },
    // ... other providers
  ],
})
```

#### 3. Backend API Endpoints Required

Your backend should implement these endpoints:

```
POST /api/auth/login
POST /api/auth/signup
POST /api/auth/verify-email
POST /api/auth/logout
GET  /api/users/me
GET  /api/admin/pending-users
POST /api/admin/approve-user/:id
POST /api/admin/reject-user/:id
```

#### 4. Database Schema

Your database should have a users table with these fields:

```sql
CREATE TABLE users (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  role ENUM('user', 'sales_team', 'admin', 'super_admin') DEFAULT 'user',
  is_email_verified BOOLEAN DEFAULT FALSE,
  is_approved BOOLEAN DEFAULT FALSE,
  approved_by VARCHAR(255),
  approved_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Option 2: Firebase Integration

#### 1. Install Firebase

```bash
npm install @angular/fire firebase
```

#### 2. Update Environment

```typescript
export const environment = {
  production: false,
  firebaseConfig: {
    apiKey: "your-api-key",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "your-app-id"
  }
};
```

#### 3. Firebase Service Example

```typescript
import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';

@Injectable({
  providedIn: 'root'
})
export class FirebaseAuthService {
  constructor(
    private afAuth: AngularFireAuth,
    private firestore: AngularFirestore
  ) {}

  async login(email: string, password: string) {
    return await this.afAuth.signInWithEmailAndPassword(email, password);
  }

  async signup(email: string, password: string, userData: any) {
    const result = await this.afAuth.createUserWithEmailAndPassword(email, password);
    // Store additional user data in Firestore
    await this.firestore.collection('users').doc(result.user?.uid).set(userData);
    return result;
  }
}
```

### Option 3: Supabase Integration

#### 1. Install Supabase

```bash
npm install @supabase/supabase-js
```

#### 2. Environment Configuration

```typescript
export const environment = {
  production: false,
  supabase: {
    url: 'https://your-project.supabase.co',
    anonKey: 'your-anon-key'
  }
};
```

#### 3. Supabase Service Example

```typescript
import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      environment.supabase.url,
      environment.supabase.anonKey
    );
  }

  async login(email: string, password: string) {
    return await this.supabase.auth.signInWithPassword({ email, password });
  }

  async signup(email: string, password: string) {
    return await this.supabase.auth.signUp({ email, password });
  }
}
```

## 🔐 Security Best Practices

### 1. Never Store Credentials in Frontend

❌ **DON'T DO THIS:**
```typescript
const dbConfig = {
  host: 'db.example.com',
  username: 'admin',
  password: 'secret123' // NEVER DO THIS!
};
```

✅ **DO THIS INSTEAD:**
```typescript
// Frontend only stores API endpoints
const apiConfig = {
  apiUrl: 'https://your-api.com/api'
};

// Database credentials stay on your backend server
```

### 2. Use Environment Variables on Backend

**Backend (.env file):**
```
DB_HOST=your-database-host
DB_USER=your-database-user
DB_PASSWORD=your-secure-password
DB_NAME=digitaltrack_db
JWT_SECRET=your-jwt-secret
```

### 3. Implement JWT Authentication

Your backend should:
- Hash passwords using bcrypt
- Generate JWT tokens for authentication
- Validate tokens on protected routes
- Implement refresh token mechanism

## 📝 Implementation Steps

### Step 1: Choose Your Backend

1. **Node.js + Express + PostgreSQL/MySQL**
2. **Firebase (Google)**
3. **Supabase (Open Source)**
4. **AWS Amplify**
5. **Custom API with any technology**

### Step 2: Update App Module

```typescript
import { HttpClientModule } from '@angular/common/http';

@NgModule({
  imports: [
    // ... other imports
    HttpClientModule, // Required for API calls
  ],
  providers: [
    // Switch to real service when ready
    { provide: AuthService, useClass: AuthRealService },
  ],
})
export class AppModule { }
```

### Step 3: Test Integration

1. Start with development environment
2. Test all authentication flows
3. Verify role-based access control
4. Test admin approval workflow
5. Deploy to production

## 🚀 Deployment Considerations

### Frontend Deployment
- Build for production: `ionic build --prod`
- Deploy to: Netlify, Vercel, AWS S3, Firebase Hosting

### Backend Deployment
- Deploy to: Heroku, AWS, Google Cloud, DigitalOcean
- Set up environment variables
- Configure CORS for your frontend domain
- Set up SSL certificates

### Database Hosting
- **PostgreSQL**: AWS RDS, Google Cloud SQL, Heroku Postgres
- **MySQL**: AWS RDS, Google Cloud SQL, PlanetScale
- **MongoDB**: MongoDB Atlas, AWS DocumentDB

## 📞 API Response Format

Ensure your backend returns responses in this format:

```typescript
// Login/Signup Response
{
  success: boolean;
  message: string;
  user?: User;
  token?: string;
}

// Error Response
{
  success: false;
  message: "Error description";
  errors?: string[];
}
```

## 🔄 Migration from Mock to Real Data

1. Keep the current mock service for development
2. Implement your backend API
3. Test the real service thoroughly
4. Switch the service provider in app.module.ts
5. Update environment configurations
6. Deploy and test in production

This approach allows you to develop and test with mock data while preparing for real database integration.
