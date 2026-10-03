import {
  checkAuthStatus,
  setupMasterPasswordApi,
  loginApi,
  changePasswordApi,
  logoutApi,
  LoginResult,
} from './api';

let sessionCached = false;
let passwordSetCached = true;
let isInitialized = false;

// Check if user is currently authenticated
export function isAuthenticated(): boolean {
  return sessionCached;
}

// Check if master password is set
export function isMasterPasswordSet(): boolean {
  return passwordSetCached;
}

// Fetch session and master password status from server
export async function fetchSession(): Promise<{ authenticated: boolean; isPasswordSet: boolean }> {
  try {
    const status = await checkAuthStatus();
    sessionCached = status.authenticated;
    passwordSetCached = status.isPasswordSet;
    isInitialized = true;
    return status;
  } catch {
    sessionCached = false;
    return { authenticated: false, isPasswordSet: true };
  }
}

// Set initial master password (first run)
export async function setInitialPassword(password: string): Promise<{ success: boolean; message?: string }> {
  try {
    const result = await setupMasterPasswordApi(password);
    if (result.success) {
      sessionCached = true;
      passwordSetCached = true;
      return { success: true };
    }
    return { success: false, message: result.error || 'Parola oluşturulamadı.' };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Parola oluşturulamadı.' };
  }
}

// Login with password
export async function loginWithPassword(password: string): Promise<LoginResult & { message?: string }> {
  try {
    const result = await loginApi(password);
    if (result.success) {
      sessionCached = true;
      return { ...result, message: 'Giriş başarılı.' };
    }
    sessionCached = false;
    return { ...result, message: result.error || 'Geçersiz yönetici parolası.' };
  } catch (err) {
    sessionCached = false;
    return {
      success: false,
      authenticated: false,
      message: err instanceof Error ? err.message : 'Giriş başarısız.',
    };
  }
}

// Logout
export async function logout(): Promise<void> {
  try {
    await logoutApi();
  } finally {
    sessionCached = false;
  }
}

// Change master password
export async function changeMasterPassword(
  currentPass: string,
  newPass: string,
): Promise<{ success: boolean; message?: string }> {
  try {
    const result = await changePasswordApi(currentPass, newPass);
    if (result.success) {
      return { success: true, message: 'Parola başarıyla güncellendi.' };
    }
    return { success: false, message: result.error || 'Parola güncellenemedi.' };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Parola güncellenemedi.' };
  }
}

// Auto-check session on module load
if (typeof window !== 'undefined' && !isInitialized) {
  fetchSession().catch(() => {});
}
