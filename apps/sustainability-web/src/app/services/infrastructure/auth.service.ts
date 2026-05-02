import { Injectable, inject } from '@angular/core';
import { fetchAuthSession, getCurrentUser, signIn, signOut } from 'aws-amplify/auth';
import { LoggerService } from '../utils/logger.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly logger = inject(LoggerService);

  async isAuthenticated(): Promise<boolean> {
    try {
      const session = await fetchAuthSession();
      return session.tokens?.accessToken !== undefined;
    } catch {
      return false;
    }
  }

  async getCurrentUserId(): Promise<string | null> {
    try {
      const u = await getCurrentUser();
      return u.userId;
    } catch {
      return null;
    }
  }

  /** Claim Cognito `custom:organization_id` si existe en el IdToken. */
  async getOrganizationIdClaim(): Promise<string | null> {
    try {
      const session = await fetchAuthSession();
      const payload = session.tokens?.idToken?.payload as Record<string, unknown> | undefined;
      const raw = payload?.['custom:organization_id'];
      return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
    } catch {
      return null;
    }
  }

  /**
   * Ensures a user session exists and tokens are available.
   * This does not sign-in automatically; it only verifies and hydrates session state.
   */
  async ensureSession(): Promise<void> {
    try {
      await getCurrentUser();
      const session = await fetchAuthSession();
      const hasJwt = session.tokens?.accessToken !== undefined;
      if (!hasJwt) {
        this.logger.debug('Amplify session present but no JWT tokens available');
      }
    } catch {
      this.logger.debug('No active Amplify session');
    }
  }

  async signInWithPassword(username: string, password: string): Promise<void> {
    await signIn({
      username,
      password,
      options: { authFlowType: 'USER_PASSWORD_AUTH' }
    });
  }

  async signOut(): Promise<void> {
    await signOut();
  }
}
