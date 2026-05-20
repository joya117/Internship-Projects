/**
 * Dashboard Page JavaScript
 * Handles session checking and user interactions
 */

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    checkUserSession();
    updateWelcomeMessage();
    initDashboardInteractions();
});

/**
 * Check if user is logged in
 */
function checkUserSession() {
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');

    if (!isLoggedIn) {
        // Redirect to login if not logged in
        window.location.href = 'login.html';
        return false;
    }

    return true;
}

/**
 * Update welcome message with user's name
 */
function updateWelcomeMessage() {
    const userName = sessionStorage.getItem('userName');

    if (userName) {
        const welcomeElement = document.querySelector('.hero h2');
        if (welcomeElement) {
            welcomeElement.textContent = `Welcome back, ${userName}.`;
        }
    }
}

/**
 * Initialize dashboard interactions
 */
function initDashboardInteractions() {
    // Logout button functionality
    const logoutLinks = document.querySelectorAll('a[href="login.html"]');
    logoutLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            // Only handle the logout from nav, not the quick actions
            if (this.classList.contains('logout-btn')) {
                e.preventDefault();
                logout();
            }
        });
    });

    // Add click handlers for stat cards
    const statCards = document.querySelectorAll('.stat-card');
    statCards.forEach(card => {
        if (card.hasAttribute('onclick')) {
            const onclick = card.getAttribute('onclick');
            if (onclick.includes('window.location.href')) {
                // Already handled by onclick, no extra action needed
            }
        }
    });

    // Group items click handling
    const groupItems = document.querySelectorAll('.group-item');
    groupItems.forEach(item => {
        item.addEventListener('click', function() {
            const href = this.getAttribute('onclick');
            if (href && href.includes('window.location.href')) {
                // Already has onclick handler
            }
        });
    });
}

/**
 * Logout function
 */
function logout() {
    // Show confirmation
    const confirmLogout = confirm('Are you sure you want to logout?');

    if (confirmLogout) {
        sessionStorage.clear();
        window.location.href = 'login.html';
    }
}

/**
 * Navigate to a specific page
 */
function navigateTo(page) {
    window.location.href = page;
}

// Make logout available globally
window.logout = logout;
window.navigateTo = navigateTo;

// Profile Functions
function openProfile() {
    const sidebar = document.getElementById('profileSidebar');
    const overlay = document.getElementById('profileOverlay');

    if (sidebar && overlay) {
        sidebar.classList.add('active');
        overlay.classList.add('active');
    }

    // Update profile with user data
    updateProfileData();
}

function closeProfile() {
    const sidebar = document.getElementById('profileSidebar');
    const overlay = document.getElementById('profileOverlay');

    if (sidebar && overlay) {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    }
}

function updateProfileData() {
    const userName = sessionStorage.getItem('userName') || 'Student';
    const userId = sessionStorage.getItem('userId') || 'STU-2024-001';
    const email = sessionStorage.getItem('userEmail') || 'student@campus.edu';

    // Get first letter for avatar
    const firstLetter = userName.charAt(0).toUpperCase();

    // Update nav profile pic
    const navPic = document.getElementById('navProfilePic');
    if (navPic) {
        navPic.textContent = firstLetter;
    }

    // Update sidebar profile
    const profileAvatar = document.getElementById('profileAvatar');
    const profileName = document.getElementById('profileName');
    const profileNameDisplay = document.getElementById('profileNameDisplay');
    const profileId = document.getElementById('profileId');
    const profileEmail = document.getElementById('profileEmail');
    const profileEmailDisplay = document.getElementById('profileEmailDisplay');

    if (profileAvatar) profileAvatar.textContent = firstLetter;
    if (profileName) profileName.textContent = userName;
    if (profileNameDisplay) profileNameDisplay.textContent = userName;
    if (profileId) profileId.textContent = userId;
    if (profileEmail) profileEmail.textContent = email;
    if (profileEmailDisplay) profileEmailDisplay.textContent = email;
}

window.openProfile = openProfile;
window.closeProfile = closeProfile;

// View Full Profile
function viewFullProfile() {
    alert('Full Profile View\n\nThis will show a detailed profile page with all your academic information, attendance records, and more.');
}

// Toggle Settings
function toggleSetting(setting) {
    const toggle = document.getElementById(setting + 'Toggle');
    if (toggle) {
        toggle.checked = !toggle.checked;
        console.log(setting + ' toggled:', toggle.checked);
    }
}

// Update Password
function updatePassword() {
    const currentPass = document.getElementById('currentPassword').value;
    const newPass = document.getElementById('newPassword').value;
    const confirmPass = document.getElementById('confirmPassword').value;

    if (!currentPass || !newPass || !confirmPass) {
        alert('Please fill in all password fields!');
        return;
    }

    if (newPass !== confirmPass) {
        alert('New password and confirm password do not match!');
        return;
    }

    if (newPass.length < 6) {
        alert('Password must be at least 6 characters!');
        return;
    }

    // In a real app, this would send to backend
    alert('Password updated successfully!');

    // Clear fields
    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';
}

window.viewFullProfile = viewFullProfile;
window.toggleSetting = toggleSetting;
window.updatePassword = updatePassword;

// Accordion toggle
function toggleAccordion(section) {
    const item = document.getElementById('accordion-' + section).closest('.accordion-item');
    item.classList.toggle('active');
}

window.toggleAccordion = toggleAccordion;

// Auto-check session on page load
if (typeof checkUserSession === 'function') {
    checkUserSession();
}