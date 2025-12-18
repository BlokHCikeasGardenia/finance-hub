// Authentication module for Keuangan RT Modern
// Handles login, logout, auth state management

import { supabase } from './config.js';
import { showToast } from './utils.js';

// Global auth state
let currentUser = null;

// Authentication state management
function getCurrentUser() {
    return currentUser;
}

function setCurrentUser(user) {
    currentUser = user;
    // Update localStorage for persistence
    if (user) {
        localStorage.setItem('currentUser', JSON.stringify(user));
    } else {
        localStorage.removeItem('currentUser');
    }
}

// Load user from localStorage on app start
function loadUserFromStorage() {
    try {
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            currentUser = JSON.parse(storedUser);
        }
    } catch (error) {
        console.warn('Error loading user from storage:', error);
        localStorage.removeItem('currentUser');
        currentUser = null;
    }
}

// Authentication functions
async function login(email, password) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) throw error;

        setCurrentUser(data.user);
        updateAuthUI(); // Update UI after successful login
        return { success: true, user: data.user };
    } catch (error) {
        console.error('Login error:', error);
        return {
            success: false,
            message: error.message || 'Login gagal. Periksa email dan password Anda.'
        };
    }
}

async function logout() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;

        setCurrentUser(null);
        updateAuthUI();
        showToast('Berhasil logout', 'success');
    } catch (error) {
        console.error('Logout error:', error);
        showToast('Error saat logout', 'danger');
    }
}

async function signup(email, password, userData = {}) {
    try {
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: userData
            }
        });

        if (error) throw error;

        if (data.user && !data.user.email_confirmed_at) {
            return {
                success: true,
                needsConfirmation: true,
                message: 'Pendaftaran berhasil! Silakan periksa email Anda untuk konfirmasi.'
            };
        }

        setCurrentUser(data.user);
        return {
            success: true,
            user: data.user,
            message: 'Pendaftaran berhasil!'
        };
    } catch (error) {
        console.error('Signup error:', error);
        return {
            success: false,
            message: error.message || 'Pendaftaran gagal. Silakan coba lagi.'
        };
    }
}

// Password reset
async function resetPassword(email) {
    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/reset-password'
        });

        if (error) throw error;

        return {
            success: true,
            message: 'Email reset password telah dikirim. Periksa inbox Anda.'
        };
    } catch (error) {
        console.error('Reset password error:', error);
        return {
            success: false,
            message: error.message || 'Gagal mengirim email reset password.'
        };
    }
}

// Update password
async function updatePassword(newPassword) {
    try {
        const { error } = await supabase.auth.updateUser({
            password: newPassword
        });

        if (error) throw error;

        showToast('Password berhasil diperbarui', 'success');
        return { success: true };
    } catch (error) {
        console.error('Update password error:', error);
        throw error;
    }
}

// Update user profile
async function updateUserProfile(updates) {
    try {
        const { data, error } = await supabase.auth.updateUser({
            data: updates
        });

        if (error) throw error;

        setCurrentUser(data.user);
        showToast('Profile berhasil diperbarui', 'success');
        return { success: true, user: data.user };
    } catch (error) {
        console.error('Update profile error:', error);
        return {
            success: false,
            message: error.message || 'Gagal memperbarui profile.'
        };
    }
}

// Check if user is authenticated
function isAuthenticated() {
    return currentUser !== null;
}

// Check if user has admin role (if using roles)
function isAdmin() {
    return currentUser && currentUser.user_metadata?.role === 'admin';
}

// Update UI based on authentication state
function updateAuthUI() {
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const adminDropdown = document.getElementById('admin-dropdown');

    if (currentUser) {
        if (loginBtn) loginBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'block';
        if (adminDropdown) adminDropdown.style.display = 'block';
    } else {
        if (loginBtn) loginBtn.style.display = 'block';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (adminDropdown) adminDropdown.style.display = 'none';
    }
}

// Show login modal
function showLoginModal() {
    try {
        const modal = new bootstrap.Modal(document.getElementById('loginModal'));
        modal.show();
    } catch (error) {
        console.error('Error showing login modal:', error);
        showToast('Login modal tidak tersedia', 'warning');
    }
}

// Initialize auth state on app load
async function checkAuthState() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (session?.user) {
            setCurrentUser(session.user);
        } else {
            setCurrentUser(null);
        }
        updateAuthUI();
    } catch (error) {
        console.error('Auth check error:', error);
        setCurrentUser(null);
        updateAuthUI();
    }
}

// Listen for auth changes
function setupAuthListeners() {
    supabase.auth.onAuthStateChange((event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);

        if (event === 'SIGNED_IN' && session) {
            setCurrentUser(session.user);
            updateAuthUI();
            // Close login modal if open
            try {
                const loginModal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
                if (loginModal) {
                    loginModal.hide();
                }
            } catch (error) {
                // Modal might not be available yet
            }
        } else if (event === 'SIGNED_OUT') {
            setCurrentUser(null);
            updateAuthUI();
        }
    });
}

// Initialize authentication module
function initializeAuth() {
    loadUserFromStorage();
    setupAuthListeners();
    checkAuthState();
}

// Export authentication functions and state
export {
    // Auth state
    getCurrentUser,
    setCurrentUser,
    isAuthenticated,
    isAdmin,

    // Auth functions
    login,
    logout,
    signup,
    resetPassword,
    updatePassword,
    updateUserProfile,

    // UI functions
    updateAuthUI,
    showLoginModal,

    // Initialization
    initializeAuth,
    checkAuthState
};
