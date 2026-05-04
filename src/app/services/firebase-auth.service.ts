import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
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

      this.currentUserSubject.next(userData);
      this.isAuthenticatedSubject.next(true);

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

}
