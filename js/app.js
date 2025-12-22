// Main application entry point
// ES6 Module version - loads all modular components

import {
    initializeDomElements,
    initializePaginationSettings
} from './modules/main.js';

import {
    initializeAuth
} from './modules/auth.js';

import {
    showSection,
    showMultipleSections,
    loadSectionContent
} from './modules/ui.js';

// Import backward compatibility first to ensure global functions are available
import './modules/backward-compatibility.js';

// Global state
let appInitialized = false;

// Initialize application
async function initializeApp() {
    try {
        console.log('🚀 Initializing Keuangan RT Modern...');

        // Initialize DOM elements
        initializeDomElements();

        // Initialize pagination settings
        initializePaginationSettings();

        // Initialize authentication
        await initializeAuth();

        // Set up global functions
        await setupGlobalFunctions();

        // Set up authentication forms
        setupAuthForms();

        // Load initial sections (dashboard and views)
        if (window.location.hash) {
            const section = window.location.hash.substring(1);
            showSection(section);
        } else {
            // Show both dashboard and views sections
            showMultipleSections(['dashboard', 'views']);
        }

        appInitialized = true;
        console.log('✅ Application initialized successfully!');

    } catch (error) {
        console.error('❌ Error initializing application:', error);
        showToast('Error initializing application', 'danger');

        // Fallback to basic UI
        const mainContent = document.querySelector('main');
        if (mainContent) {
            mainContent.innerHTML = `
                <div class="container-fluid mt-4 px-4">
                    <div class="alert alert-danger">
                        <h4>Initialization Error</h4>
                        <p>Gagal memuat aplikasi. Silakan refresh halaman atau hubungi administrator.</p>
                        <p><strong>Error:</strong> ${error.message}</p>
                    </div>
                </div>
            `;
        }
    }
}

// Set up global functions for backward compatibility
async function setupGlobalFunctions() {
    // UI functions
    window.showSection = showSection;
    window.loadSectionContent = loadSectionContent;

    // Global helper function (from original app_old.js pattern)
    window.showToast = async (message, type = 'info') => {
        const { showToast: showToastFn } = await import('./modules/utils.js');
        return showToastFn(message, type);
    };

    // Make Supabase available globally for any legacy code
    import('./modules/config.js').then(({ supabase }) => {
        window.supabase = supabase;
    });

    // Set up the missing global functions for master data forms
    // These are needed for HTML onclick handlers in dynamically loaded content
    // Note: These functions are now properly defined in section-loader.js
    // using the actual module functions, so we don't need to redefine them here.


}

// Set up authentication forms and event handlers
function setupAuthForms() {
    // Login form handler
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const authMessage = document.getElementById('auth-message');

            if (!email || !password) {
                if (authMessage) {
                    authMessage.textContent = 'Email dan password harus diisi.';
                    authMessage.className = 'mt-3 text-center text-danger';
                }
                return;
            }

            // Clear previous messages
            if (authMessage) {
                authMessage.textContent = '';
                authMessage.className = 'mt-3 text-center';
            }

            // Show loading state
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<div class="spinner-border spinner-border-sm" role="status"></div> Masuk...';

            try {
                const { login } = await import('./modules/auth.js');
                const result = await login(email, password);

                if (result.success) {
                    // Success handled by auth state change listener
                    if (authMessage) {
                        authMessage.textContent = 'Login berhasil!';
                        authMessage.className = 'mt-3 text-center text-success';
                    }
                } else {
                    if (authMessage) {
                        authMessage.textContent = result.message;
                        authMessage.className = 'mt-3 text-center text-danger';
                    }
                }
            } catch (error) {
                console.error('Login error:', error);
                if (authMessage) {
                    authMessage.textContent = 'Terjadi kesalahan saat login. Silakan coba lagi.';
                    authMessage.className = 'mt-3 text-center text-danger';
                }
            } finally {
                // Reset button state
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        });
    }


}

// Handle page visibility and focus events
function setupPageEvents() {
    // Handle browser navigation
    window.addEventListener('hashchange', (e) => {
        if (appInitialized) {
            const section = window.location.hash.substring(1) || 'dashboard';
            showSection(section);
        }
    });

    // Handle beforeunload to warn about unsaved changes
    let hasUnsavedChanges = false;

    window.addEventListener('beforeunload', (e) => {
        if (hasUnsavedChanges) {
            e.preventDefault();
            e.returnValue = 'Ada perubahan yang belum disimpan. Yakin ingin keluar?';
        }
    });

    // Provide function to set unsaved changes state
    window.setUnsavedChanges = (state) => {
        hasUnsavedChanges = !!state;
    };
}

// Performance monitoring
function setupPerformanceMonitoring() {
    // Basic performance monitoring in development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        window.addEventListener('load', () => {
            setTimeout(() => {
                const perfData = window.performance.timing;
                const loadTime = perfData.loadEventEnd - perfData.navigationStart;
                console.log(`📊 Page loaded in ${loadTime}ms`);


            }, 100);
        });
    }
}

// Error handling
function setupErrorHandling() {
    // Global error handler
    window.addEventListener('error', (event) => {
        console.error('Global error:', event.error);
        showToast('Terjadi kesalahan aplikasi. Periksa console untuk detail.', 'danger');
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled promise rejection:', event.reason);
        showToast('Terjadi kesalahan tak terduga.', 'danger');
    });

    // Handle online/offline status
    window.addEventListener('online', () => {
        showToast('Koneksi internet tersambung kembali', 'success');
    });

    window.addEventListener('offline', () => {
        showToast('Koneksi internet terputus', 'warning');
    });
}

// Development helpers
function setupDevelopmentHelpers() {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        // Add global debugging helpers
        window.debugApp = {
            clearAllData: async () => {
                if (confirm('⚠️ Hapus semua data? Ini tidak bisa dibatalkan!')) {
                    console.log('Clear all data not implemented in production mode');
                    showToast('Fitur debug: Clear data tidak diimplementasi', 'info');
                }
            },

            reloadModules: () => {
                window.location.reload();
            },

            showModuleInfo: () => {
                console.log('📦 Modular App Structure:');
                console.log('├── config.js - Configuration & constants');
                console.log('├── utils.js - Utility functions');
                console.log('├── auth.js - Authentication');
                console.log('├── ui.js - UI components & navigation');
                console.log('├── crud.js - Generic CRUD operations');
                console.log('├── sections.js - Section management');
                console.log('└── entities/master/ - Master data entities');
                showToast('Module info logged to console', 'info');
            }
        };


    }
}

// Application startup
document.addEventListener('DOMContentLoaded', async () => {
    // Set up error handling first
    setupErrorHandling();

    // Initialize the application
    await initializeApp();

    // Set up additional features
    setupPageEvents();
    setupPerformanceMonitoring();
    setupDevelopmentHelpers();

    console.log('🎉 Keuangan RT Modern ready!');
});

// Export for potential external use
export { initializeApp };
