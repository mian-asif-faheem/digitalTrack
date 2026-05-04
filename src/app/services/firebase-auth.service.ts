import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, from } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { 
  Auth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  User as FirebaseUser,
  onAuthStateChanged,
  updateProfile
} from '@angular/fire/auth';
import { 
  Firestore, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  updateDoc,
  deleteDoc
} from '@angular/fire/firestore';
import { User, UserRole, LoginCredentials, SignupData, AuthResponse } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class FirebaseAuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(
    private auth: Auth,
    private firestore: Firestore
  ) {
    this.initAuthStateListener();
    // Run demo user setup only if no one is signed in, and abort if a real login happens
    setTimeout(async () => {
      if (!this.auth.currentUser) {
        await this.setupDemoUsers();
      }
    }, 1000);
  }

  private initAuthStateListener() {
    onAuthStateChanged(this.auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userData = await this.getUserData(firebaseUser.uid);
        // Guard: only update state if this user is still the current user
        // (prevents stale Firestore reads from overwriting state after logout)
        if (this.auth.currentUser?.uid === firebaseUser.uid && userData) {
          this.currentUserSubject.next(userData);
          this.isAuthenticatedSubject.next(true);
        }
      } else {
        this.currentUserSubject.next(null);
        this.isAuthenticatedSubject.next(false);
      }
    });
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      console.log('login init');
      const userCredential = await signInWithEmailAndPassword(
        this.auth, 
        credentials.email, 
        credentials.password
      );

      const firebaseUser = userCredential.user;

      const userData = await this.getUserData(firebaseUser.uid);
      
      if (!userData) {
        await signOut(this.auth);
        return {
          success: false,
          message: 'User data not found. Please contact support.'
        };
      }

      if (!userData.isEmailVerified) {
        await signOut(this.auth);
        return {
          success: false,
          message: 'Please verify your email before logging in.'
        };
      }
      if (!userData.isApproved) {
        await signOut(this.auth);
        return {
          success: false,
          message: 'Your account is pending approval by an administrator.'
        };
      }

      return {
        success: true,
        message: 'Login successful',
        user: userData,
        token: await firebaseUser.getIdToken()
      };

    } catch (error: any) {
      console.error('Login error:', error);
      return {
        success: false,
        message: this.getErrorMessage(error.code)
      };
    }
  }

  async signup(signupData: SignupData): Promise<AuthResponse> {
    try {
      // Create Firebase user
      const userCredential = await createUserWithEmailAndPassword(
        this.auth,
        signupData.email,
        signupData.password
      );

      const firebaseUser = userCredential.user;

      // Update display name
      await updateProfile(firebaseUser, {
        displayName: `${signupData.firstName} ${signupData.lastName}`
      });

      // Send email verification
      await sendEmailVerification(firebaseUser);

      // Create user document in Firestore
      const userData: User = {
        id: firebaseUser.uid,
        email: signupData.email,
        firstName: signupData.firstName,
        lastName: signupData.lastName,
        role: signupData.role || UserRole.USER,
        isEmailVerified: false,
        isApproved: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await setDoc(doc(this.firestore, 'users', firebaseUser.uid), userData);

      // Sign out the user until they verify their email
      await signOut(this.auth);

      return {
        success: true,
        message: 'Account created successfully! Please check your email to verify your account before logging in.'
      };

    } catch (error: any) {
      console.error('Signup error:', error);
      return {
        success: false,
        message: this.getErrorMessage(error.code)
      };
    }
  }

  async logout(): Promise<void> {
    try {
      await signOut(this.auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  hasRole(roles: UserRole[]): boolean {
    const currentUser = this.getCurrentUser();
    return currentUser ? roles.includes(currentUser.role) : false;
  }

  isAdmin(): boolean {
    return this.hasRole([UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  }

  isSuperAdmin(): boolean {
    return this.hasRole([UserRole.SUPER_ADMIN]);
  }

  // Admin functions
  async getPendingUsers(): Promise<User[]> {
    try {
      const q = query(
        collection(this.firestore, 'users'),
        where('isEmailVerified', '==', true),
        where('isApproved', '==', false)
      );
      
      const querySnapshot = await getDocs(q);
      const users: User[] = [];
      
      querySnapshot.forEach((doc) => {
        const userData = doc.data() as User;
        users.push(userData);
      });
      
      return users;
    } catch (error) {
      console.error('Error fetching pending users:', error);
      return [];
    }
  }

  async approveUser(userId: string): Promise<boolean> {
    try {
      const currentUser = this.getCurrentUser();
      if (!currentUser || !this.isAdmin()) {
        return false;
      }

      const userRef = doc(this.firestore, 'users', userId);
      await updateDoc(userRef, {
        isApproved: true,
        approvedBy: currentUser.id,
        approvedAt: new Date(),
        updatedAt: new Date()
      });

      return true;
    } catch (error) {
      console.error('Error approving user:', error);
      return false;
    }
  }

  async rejectUser(userId: string): Promise<boolean> {
    try {
      const currentUser = this.getCurrentUser();
      if (!currentUser || !this.isAdmin()) {
        return false;
      }

      // Delete user document from Firestore
      await deleteDoc(doc(this.firestore, 'users', userId));
      
      // Note: You might also want to delete the Firebase Auth user
      // This requires Admin SDK on the backend
      
      return true;
    } catch (error) {
      console.error('Error rejecting user:', error);
      return false;
    }
  }

  // Helper method to get user data from Firestore
  private async getUserData(uid: string): Promise<User | null> {
    try {
      const userDoc = await getDoc(doc(this.firestore, 'users', uid));
      if (userDoc.exists()) {
        const userData = userDoc.data() as User;
        
        // Update email verification status from Firebase Auth
        const firebaseUser = this.auth.currentUser;
        if (firebaseUser && firebaseUser.emailVerified && !userData.isEmailVerified) {
          await updateDoc(doc(this.firestore, 'users', uid), {
            isEmailVerified: true,
            updatedAt: new Date()
          });
          userData.isEmailVerified = true;
        }
        
        return userData;
      }
      return null;
    } catch (error) {
      console.error('Error getting user data:', error);
      return null;
    }
  }

  // Helper method to convert Firebase error codes to user-friendly messages
  private getErrorMessage(errorCode: string): string {
    switch (errorCode) {
      case 'auth/user-not-found':
        return 'No account found with this email address.';
      case 'auth/wrong-password':
        return 'Incorrect password.';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters long.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection.';
      default:
        return 'An error occurred. Please try again.';
    }
  }

  // Method to resend email verification
  async resendEmailVerification(): Promise<boolean> {
    try {
      const firebaseUser = this.auth.currentUser;
      if (firebaseUser && !firebaseUser.emailVerified) {
        await sendEmailVerification(firebaseUser);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error resending email verification:', error);
      return false;
    }
  }

  // Auto-setup all demo users on first run
  private async setupDemoUsers(): Promise<void> {
    const demoUsers = [
      {
        email: 'superadmin@digitaltrack.com',
        password: 'superadmin123',
        firstName: 'Super',
        lastName: 'Admin',
        role: UserRole.SUPER_ADMIN,
      },
      {
        email: 'admin@digitaltrack.com',
        password: 'admin123',
        firstName: 'Admin',
        lastName: 'User',
        role: UserRole.ADMIN,
      },
      {
        email: 'sales@digitaltrack.com',
        password: 'sales123',
        firstName: 'Sales',
        lastName: 'Team',
        role: UserRole.SALES_TEAM,
      },
      {
        email: 'user@digitaltrack.com',
        password: 'user123',
        firstName: 'Demo',
        lastName: 'User',
        role: UserRole.USER,
      },
    ];

    for (const demo of demoUsers) {
      await this.ensureDemoUser(demo);
    }
  }

  private async ensureDemoUser(demo: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: UserRole;
  }): Promise<void> {
    // Check Firestore first — no need to touch auth if the user already exists
    const existing = await getDocs(
      query(collection(this.firestore, 'users'), where('email', '==', demo.email))
    );
    if (!existing.empty) return;

    // User doesn't exist yet — bail out if a real session is active
    if (this.auth.currentUser) return;

    try {
      const userCredential = await createUserWithEmailAndPassword(this.auth, demo.email, demo.password);
      const uid = userCredential.user.uid;

      await updateProfile(userCredential.user, {
        displayName: `${demo.firstName} ${demo.lastName}`,
      });

      await setDoc(doc(this.firestore, 'users', uid), {
        id: uid,
        email: demo.email,
        firstName: demo.firstName,
        lastName: demo.lastName,
        role: demo.role,
        isEmailVerified: true,
        isApproved: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        approvedBy: 'system',
        approvedAt: new Date(),
      } as User);

      await signOut(this.auth);
      console.log(`Demo user created: ${demo.email}`);
    } catch (error: any) {
      console.error(`Failed to create demo user ${demo.email}:`, error);
    }
  }

  // Auto-setup super admin user
  private async setupSuperAdmin(): Promise<void> {
    try {
      const superAdminEmail = 'superadmin@digitaltrack.com';
      const superAdminPassword = 'superadmin123';

      // Check if super admin already exists in Firestore
      const usersQuery = query(
        collection(this.firestore, 'users'),
        where('email', '==', superAdminEmail),
        where('role', '==', UserRole.SUPER_ADMIN)
      );

      const querySnapshot = await getDocs(usersQuery);
      if (!querySnapshot.empty) {
        console.log('Super admin already exists');
        return;
      }else{
        console.log('empty');
      }

      console.log('Creating super admin user...');

      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(
        this.auth,
        superAdminEmail,
        superAdminPassword
      );

      const firebaseUser = userCredential.user;

      // Update display name
      await updateProfile(firebaseUser, {
        displayName: 'Super Admin'
      });

      // Create user document in Firestore with full approval
      const superAdminData: User = {
        id: firebaseUser.uid,
        email: superAdminEmail,
        firstName: 'Super',
        lastName: 'Admin',
        role: UserRole.SUPER_ADMIN,
        isEmailVerified: true, // Auto-verify for super admin
        isApproved: true, // Auto-approve for super admin
        createdAt: new Date(),
        updatedAt: new Date(),
        approvedBy: 'system',
        approvedAt: new Date()
      };

      await setDoc(doc(this.firestore, 'users', firebaseUser.uid), superAdminData);

      // Sign out after creation so user can login normally
      await signOut(this.auth);

      console.log('Super admin user created successfully!');
      console.log('Login with: superadmin@digitaltrack.com / superadmin123');

    } catch (error: any) {
      // If user already exists in Firebase Auth, that's okay
      if (error.code === 'auth/email-already-in-use') {
        console.log('Super admin Firebase Auth user already exists');
        
        // Try to create the Firestore document for existing user
        try {
          // Get the existing user
          const existingUserCredential = await signInWithEmailAndPassword(
            this.auth,
            'superadmin@digitaltrack.com',
            'superadmin123'
          );
          
          const existingUser = existingUserCredential.user;
          
          // Check if Firestore document exists
          const userDoc = await getDoc(doc(this.firestore, 'users', existingUser.uid));
          
          if (!userDoc.exists()) {
            // Create Firestore document for existing Firebase Auth user
            const superAdminData: User = {
              id: existingUser.uid,
              email: 'superadmin@digitaltrack.com',
              firstName: 'Super',
              lastName: 'Admin',
              role: UserRole.SUPER_ADMIN,
              isEmailVerified: true,
              isApproved: true,
              createdAt: new Date(),
              updatedAt: new Date(),
              approvedBy: 'system',
              approvedAt: new Date()
            };

            await setDoc(doc(this.firestore, 'users', existingUser.uid), superAdminData);
            console.log('Super admin Firestore document created for existing user');
          }
          
          // Sign out after setup
          await signOut(this.auth);
          
        } catch (setupError) {
          console.error('Error setting up existing super admin:', setupError);
        }
      } else {
        console.error('Error creating super admin:', error);
      }
    }
  }
}
