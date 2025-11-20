// Authentication JavaScript Functions - Full Implementation with localStorage

// ============================================
// Authentication Storage & Management
// ============================================

const STORAGE_KEYS = {
    USERS: 'agrismart_users',
    CURRENT_USER: 'agrismart_current_user',
    IS_LOGGED_IN: 'agrismart_is_logged_in',
    LOGGED_IN_USERS: 'agrismart_logged_in_users'
};

// Initialize users storage if it doesn't exist
function initializeUsersStorage() {
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.LOGGED_IN_USERS)) {
        localStorage.setItem(STORAGE_KEYS.LOGGED_IN_USERS, JSON.stringify([]));
    }
}

// Get all users from storage
function getUsers() {
    initializeUsersStorage();
    const users = localStorage.getItem(STORAGE_KEYS.USERS);
    return users ? JSON.parse(users) : [];
}

// Save users to storage
function saveUsers(users) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
}

function getLoggedInUsers() {
    const s = localStorage.getItem(STORAGE_KEYS.LOGGED_IN_USERS);
    return s ? JSON.parse(s) : [];
}

function saveLoggedInUsers(ids) {
    localStorage.setItem(STORAGE_KEYS.LOGGED_IN_USERS, JSON.stringify(ids));
}

// Get current logged in user
function getCurrentUser() {
    const userStr = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return userStr ? JSON.parse(userStr) : null;
}

// Set current logged in user
function setCurrentUser(user) {
    if (user) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
        localStorage.setItem(STORAGE_KEYS.IS_LOGGED_IN, 'true');
    } else {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
        localStorage.setItem(STORAGE_KEYS.IS_LOGGED_IN, 'false');
    }
}

// Check if user is logged in
function isLoggedIn() {
    return localStorage.getItem(STORAGE_KEYS.IS_LOGGED_IN) === 'true';
}

// Logout user
function logout() {
    const current = getCurrentUser();
    if (current && current.role === 'farmer') {
        const ids = getLoggedInUsers();
        const i = ids.indexOf(current.id);
        if (i !== -1) {
            ids.splice(i, 1);
            saveLoggedInUsers(ids);
        }
    }
    setCurrentUser(null);
    updateHeaderAuthState();
    showNotification('You have been logged out successfully.', 'success');
    // Redirect to home page after logout
    if (window.location.pathname !== '/index.html' && !window.location.pathname.includes('index.html')) {
        window.location.href = 'index.html';
    }
}

// Register new user
function registerUser(userData) {
    const users = getUsers();
    
    // Check if user already exists (by email or phone)
    const existingUser = users.find(u => 
        u.email.toLowerCase() === userData.email.toLowerCase() || 
        u.phone === userData.phone
    );
    
    if (existingUser) {
        return {
            success: false,
            message: 'User with this email or phone number already exists.'
        };
    }
    
    // Create new user object
    const newUser = {
        id: Date.now().toString(),
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email.toLowerCase(),
        phone: userData.phone,
        farmType: userData.farmType,
        farmSize: userData.farmSize,
        password: userData.password, // In production, this should be hashed
        createdAt: new Date().toISOString(),
        username: userData.email.toLowerCase().split('@')[0],
        role: 'farmer',
        lastLogin: null
    };
    
    // Add user to storage
    users.push(newUser);
    saveUsers(users);
    
    return {
        success: true,
        message: 'Account created successfully!',
        user: newUser
    };
}

// Login user
function loginUser(identifier, password) {
    const users = getUsers();
    
    // Find user by email, username, or phone
    const user = users.find(u => 
        u.email.toLowerCase() === identifier.toLowerCase() ||
        u.username === identifier.toLowerCase() ||
        u.phone === identifier.replace(/[\s\-\(\)]/g, '')
    );
    
    if (!user) {
        return {
            success: false,
            message: 'Invalid email, username, or phone number.'
        };
    }
    
    // Check password (in production, compare hashed passwords)
    if (user.password !== password) {
        return {
            success: false,
            message: 'Invalid password.'
        };
    }
    
    const usersUpdated = users.map(u => {
        if (u.id === user.id) {
            return { ...u, lastLogin: new Date().toISOString() };
        }
        return u;
    });
    saveUsers(usersUpdated);
    const { password: _, ...userWithoutPassword } = usersUpdated.find(u => u.id === user.id);
    setCurrentUser(userWithoutPassword);
    if (userWithoutPassword.role === 'farmer') {
        const ids = getLoggedInUsers();
        if (!ids.includes(userWithoutPassword.id)) {
            ids.push(userWithoutPassword.id);
            saveLoggedInUsers(ids);
        }
    }
    
    return {
        success: true,
        message: 'Login successful!',
        user: userWithoutPassword
    };
}

// ============================================
// Authentication Guard
// ============================================

// Pages that don't require authentication
const PUBLIC_PAGES = ['index.html', 'signup.html', ''];

// Check if current page is public
function isPublicPage() {
    const currentPage = window.location.pathname.split('/').pop();
    return PUBLIC_PAGES.includes(currentPage) || currentPage === '';
}

// Require authentication - redirect to login if not authenticated
function requireAuth() {
    if (!isPublicPage() && !isLoggedIn()) {
        showNotification('Please log in to access this page.', 'warning');
        // Preserve the current page URL for redirect after login
        const currentUrl = window.location.pathname.split('/').pop();
        window.location.href = `index.html?redirect=${encodeURIComponent(currentUrl)}`;
        return false;
    }
    return true;
}

function requireAdmin() {
    const u = getCurrentUser();
    if (!u || u.role !== 'admin') {
        showNotification('Admin access required.', 'error');
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

// ============================================
// UI Update Functions
// ============================================

// Update header based on authentication state
function updateHeaderAuthState() {
    const userActions = document.querySelector('.user-actions');
    if (!userActions) return;
    
    const isAuth = isLoggedIn();
    const currentUser = getCurrentUser();
    
    if (isAuth && currentUser) {
        // User is logged in - show user info and logout
        userActions.innerHTML = `
            <div class="user-menu">
                <button class="btn btn-outline user-info-btn" onclick="toggleUserMenu()">
                    <i class="fas fa-user-circle"></i>
                    <span>${currentUser.firstName} ${currentUser.lastName}</span>
                    <i class="fas fa-chevron-down"></i>
                </button>
                <div class="user-dropdown" id="userDropdown" style="display: none;">
                    <div class="user-dropdown-header">
                        <div class="user-dropdown-name">${currentUser.firstName} ${currentUser.lastName}</div>
                        <div class="user-dropdown-email">${currentUser.email}</div>
                        <div class="user-dropdown-farm">${currentUser.farmType} • ${currentUser.farmSize} acres</div>
                    </div>
                    <div class="user-dropdown-divider"></div>
                    <a href="index.html" class="user-dropdown-item">
                        <i class="fas fa-home"></i> Dashboard
                    </a>
                    ${currentUser.role === 'admin' ? `<a href="admin.html" class="user-dropdown-item"><i class="fas fa-shield-alt"></i> Admin Dashboard</a>` : ''}
                    <button class="user-dropdown-item" onclick="logout()">
                        <i class="fas fa-sign-out-alt"></i> Logout
                    </button>
                </div>
            </div>
        `;
    } else {
        // User is not logged in - show login and signup buttons
        userActions.innerHTML = `
            <button class="btn btn-outline" onclick="openLoginModal()">
                <i class="fas fa-sign-in-alt"></i> Login
            </button>
            <button class="btn btn-primary" onclick="location.href='signup.html'">
                <i class="fas fa-user-plus"></i> Sign Up
            </button>
        `;
    }
}

// Toggle user menu dropdown
function toggleUserMenu() {
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) {
        const isVisible = dropdown.style.display === 'block';
        dropdown.style.display = isVisible ? 'none' : 'block';
        
        // Close dropdown when clicking outside
        if (!isVisible) {
            setTimeout(() => {
                document.addEventListener('click', function closeDropdown(e) {
                    if (!e.target.closest('.user-menu')) {
                        dropdown.style.display = 'none';
                        document.removeEventListener('click', closeDropdown);
                    }
                });
            }, 100);
        }
    }
}

// ============================================
// Modal Functions
// ============================================

function openLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
        
        // Focus on first input
        setTimeout(() => {
            const firstInput = modal.querySelector('#loginEmail');
            if (firstInput) firstInput.focus();
        }, 100);
        // Attach tilt to modal content
        const card = modal.querySelector('.modal-content.auth-3d');
        if (card) attachTilt(card);
    }
}

function closeLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
        document.body.style.overflow = 'auto';
        
        // Clear form
        const form = modal.querySelector('#loginForm');
        if (form) form.reset();
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('loginModal');
    if (event.target === modal) {
        closeLoginModal();
    }
}

// Close modal with Escape key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeLoginModal();
    }
});

// ============================================
// Password Toggle Function
// ============================================

function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    const icon = input.parentElement.querySelector('.toggle-password i');
    if (!icon) return;
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// ============================================
// Validation Functions
// ============================================

function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validatePassword(password) {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
}

function validatePhone(phone) {
    // Basic phone validation (allows various formats)
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
}

function validateLoginField(value) {
    // Validate if it's an email, username, or phone
    const trimmedValue = value.trim();
    
    // Check if it's an email
    if (validateEmail(trimmedValue)) {
        return true;
    }
    
    // Check if it's a phone number
    if (validatePhone(trimmedValue)) {
        return true;
    }
    
    // Check if it's a username (alphanumeric, 3-20 characters, may include underscore or dash)
    const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
    if (usernameRegex.test(trimmedValue)) {
        return true;
    }
    
    return false;
}

function validateSignupForm(data) {
    // Validate required fields
    const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'farmType', 'farmSize', 'password', 'confirmPassword'];
    
    for (let field of requiredFields) {
        if (!data[field] || data[field].trim() === '') {
            showNotification(`Please fill in the ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}.`, 'error');
            return false;
        }
    }
    
    // Validate email
    if (!validateEmail(data.email)) {
        showNotification('Please enter a valid email address.', 'error');
        return false;
    }
    
    // Validate phone
    if (!validatePhone(data.phone)) {
        showNotification('Please enter a valid phone number.', 'error');
        return false;
    }
    
    // Validate farm size
    if (isNaN(data.farmSize) || Number(data.farmSize) <= 0) {
        showNotification('Please enter a valid farm size.', 'error');
        return false;
    }

    // Validate password
    if (!validatePassword(data.password)) {
        showNotification('Password must be at least 8 characters with uppercase, lowercase, and number.', 'error');
        return false;
    }
    
    // Validate password confirmation
    if (data.password !== data.confirmPassword) {
        showNotification('Passwords do not match.', 'error');
        return false;
    }
    
    // Validate terms agreement
    const termsChecked = document.getElementById('terms');
    if (termsChecked && !termsChecked.checked) {
        showNotification('Please agree to the Terms of Service and Privacy Policy.', 'error');
        return false;
    }
    
    return true;
}

// ============================================
// Form Submission Handlers
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    // Initialize users storage
    initializeUsersStorage();
    (function(){
        const users = getUsers();
        const hasAdmin = users.some(u => u.role === 'admin');
        if (!hasAdmin) {
            const admin = {
                id: 'admin-'+Date.now().toString(),
                firstName: 'System',
                lastName: 'Admin',
                email: 'admin@agrismartpro.local',
                phone: '0000000000',
                farmType: 'N/A',
                farmSize: '0',
                password: 'Admin@123',
                createdAt: new Date().toISOString(),
                username: 'admin',
                role: 'admin',
                lastLogin: null
            };
            users.push(admin);
            saveUsers(users);
        }
    })();
    
    // Update header auth state
    updateHeaderAuthState();
    
    // Check authentication for protected pages
    if (!isPublicPage()) {
        requireAuth();
    }
    const page = window.location.pathname.split('/').pop();
    if (page === 'admin.html') {
        requireAdmin();
    }
    
    // Login Form Handler
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value;
            const rememberMe = document.getElementById('rememberMe')?.checked || false;
            
            // Basic validation for email, username, or phone
            if (!validateLoginField(email)) {
                showNotification('Please enter a valid email address, username, or phone number.', 'error');
                return;
            }
            
            if (password.length < 6) {
                showNotification('Password must be at least 6 characters long.', 'error');
                return;
            }
            
            // Attempt login
            showNotification('Signing you in...', 'info');
            
            setTimeout(() => {
                const result = loginUser(email, password);
                
                if (result.success) {
                    showNotification('Welcome back to AgriSmart Pro!', 'success');
                    closeLoginModal();
                    updateHeaderAuthState();
                    
                    // Redirect based on where user came from or to dashboard
                    const redirectUrl = new URLSearchParams(window.location.search).get('redirect');
                    const u = getCurrentUser();
                    if (redirectUrl) {
                        window.location.href = redirectUrl;
                    } else if (u && u.role === 'admin') {
                        window.location.href = 'admin.html';
                    } else if (isPublicPage()) {
                        window.location.reload();
                    }
                } else {
                    showNotification(result.message, 'error');
                }
            }, 500);
        });
    }
    
    // Signup Form Handler
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        // Attach tilt to signup card
        const card = document.querySelector('.auth-card.auth-3d');
        if (card) attachTilt(card);
        
        signupForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(signupForm);
            const data = Object.fromEntries(formData);
            
            // Validation
            if (!validateSignupForm(data)) {
                return;
            }
            
            // Attempt registration
            showNotification('Creating your account...', 'info');
            
            setTimeout(() => {
                const result = registerUser(data);
                
                if (result.success) {
                    // Auto-login after successful registration
                    const loginResult = loginUser(data.email, data.password);
                    
                    if (loginResult.success) {
                        showNotification('Account created successfully! Welcome to AgriSmart Pro!', 'success');
                        updateHeaderAuthState();
                        
                        // Redirect to home page
                        setTimeout(() => {
                            window.location.href = 'index.html';
                        }, 1500);
                    } else {
                        showNotification('Account created! Please log in.', 'success');
                        setTimeout(() => {
                            window.location.href = 'index.html';
                        }, 2000);
                    }
                } else {
                    showNotification(result.message, 'error');
                }
            }, 500);
        });
    }
});

// ============================================
// Notification System
// ============================================

function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${getNotificationIcon(type)}"></i>
            <span>${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
    
    // Animate in
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
}

function getNotificationIcon(type) {
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    return icons[type] || icons.info;
}

// Add notification styles to head if not already present
if (!document.querySelector('#notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
        .notification {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 3000;
            background: white;
            border-radius: 8px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            padding: 0;
            max-width: 400px;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        }
        
        .notification.show {
            transform: translateX(0);
        }
        
        .notification-content {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 16px 20px;
            border-left: 4px solid;
        }
        
        .notification-success .notification-content {
            border-left-color: var(--primary, #4a7c59);
        }
        
        .notification-error .notification-content {
            border-left-color: var(--danger, #e74c3c);
        }
        
        .notification-warning .notification-content {
            border-left-color: var(--warning, #f39c12);
        }
        
        .notification-info .notification-content {
            border-left-color: var(--info, #3498db);
        }
        
        .notification-content i:first-child {
            font-size: 1.2rem;
        }
        
        .notification-success .notification-content i:first-child {
            color: var(--primary, #4a7c59);
        }
        
        .notification-error .notification-content i:first-child {
            color: var(--danger, #e74c3c);
        }
        
        .notification-warning .notification-content i:first-child {
            color: var(--warning, #f39c12);
        }
        
        .notification-info .notification-content i:first-child {
            color: var(--info, #3498db);
        }
        
        .notification-content span {
            flex: 1;
            font-weight: 500;
        }
        
        .notification-close {
            background: none;
            border: none;
            cursor: pointer;
            color: #666;
            padding: 4px;
            border-radius: 4px;
            transition: all 0.3s ease;
        }
        
        .notification-close:hover {
            background: #f5f5f5;
            color: #333;
        }
        
        @media (max-width: 480px) {
            .notification {
                right: 10px;
                left: 10px;
                max-width: none;
            }
        }
        
        /* User Menu Styles */
        .user-menu {
            position: relative;
        }
        
        .user-info-btn {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 16px;
        }
        
        .user-info-btn i.fa-chevron-down {
            font-size: 0.8rem;
            margin-left: 4px;
        }
        
        .user-dropdown {
            position: absolute;
            top: 100%;
            right: 0;
            margin-top: 8px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            min-width: 250px;
            z-index: 1000;
            overflow: hidden;
        }
        
        .user-dropdown-header {
            padding: 16px;
            background: #f8f9fa;
            border-bottom: 1px solid #e9ecef;
        }
        
        .user-dropdown-name {
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 4px;
        }
        
        .user-dropdown-email {
            font-size: 0.9rem;
            color: #6c757d;
            margin-bottom: 4px;
        }
        
        .user-dropdown-farm {
            font-size: 0.85rem;
            color: #4a7c59;
            text-transform: capitalize;
        }
        
        .user-dropdown-divider {
            height: 1px;
            background: #e9ecef;
            margin: 8px 0;
        }
        
        .user-dropdown-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 16px;
            color: #2c3e50;
            text-decoration: none;
            border: none;
            background: none;
            width: 100%;
            text-align: left;
            cursor: pointer;
            transition: background 0.3s ease;
            font-size: 0.95rem;
        }
        
        .user-dropdown-item:hover {
            background: #f8f9fa;
        }
        
        .user-dropdown-item i {
            width: 20px;
            color: #6c757d;
        }
        
        @media (max-width: 768px) {
            .user-info-btn span {
                display: none;
            }
            
            .user-dropdown {
                right: 0;
                left: auto;
            }
        }
    `;
    document.head.appendChild(style);
}

// ============================================
// 3D Tilt Effect
// ============================================

function attachTilt(el) {
    const handleMove = (e) => {
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = (e.clientX - cx) / (rect.width / 2);
        const dy = (e.clientY - cy) / (rect.height / 2);
        const rotateX = (+dy * 6).toFixed(2);
        const rotateY = (-dx * 6).toFixed(2);
        el.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        el.style.boxShadow = `${-dx*10}px ${dy*10}px 30px rgba(0,0,0,0.25)`;
    };
    const reset = () => {
        el.style.transform = 'rotateX(0deg) rotateY(0deg)';
        el.style.boxShadow = '';
    };
    el.addEventListener('mousemove', handleMove);
    el.addEventListener('mouseleave', reset);
}
