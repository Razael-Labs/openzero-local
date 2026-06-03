// Navigation Handling
document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.doc-section');
    const breadcrumbChild = document.getElementById('current-breadcrumb');

    // Mobile Sidebar Drawer Toggle
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    if (mobileMenuBtn && sidebar && sidebarOverlay) {
        mobileMenuBtn.addEventListener('click', () => {
            sidebar.classList.toggle('mobile-open');
            sidebarOverlay.classList.toggle('active');
        });

        sidebarOverlay.addEventListener('click', closeMobileSidebar);

        // Close sidebar when a navigation link is clicked on mobile
        navLinks.forEach(link => {
            link.addEventListener('click', closeMobileSidebar);
        });
    }

    function closeMobileSidebar() {
        if (sidebar && sidebarOverlay) {
            sidebar.classList.remove('mobile-open');
            sidebarOverlay.classList.remove('active');
        }
    }

    // Handle hash links on load
    if (window.location.hash) {
        const targetId = window.location.hash.substring(1);
        switchSection(targetId);
    }

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            
            // Update hash in URL
            window.location.hash = targetId;
            switchSection(targetId);
        });
    });

    function switchSection(targetId) {
        const targetSection = document.getElementById(targetId);
        const targetLink = document.getElementById(`link-${targetId}`);
        
        if (targetSection && targetLink) {
            // Hide all sections, remove active classes
            sections.forEach(sec => sec.classList.remove('active-section'));
            navLinks.forEach(lnk => lnk.classList.remove('active'));

            // Show target section, add active classes
            targetSection.classList.add('active-section');
            targetLink.classList.add('active');

            // Update breadcrumb
            breadcrumbChild.textContent = targetLink.textContent.trim();
            
            // Scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    // Search Filtering
    const searchInput = document.getElementById('doc-search');
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        
        if (query === '') {
            // Show all nav links if query is empty
            navLinks.forEach(link => link.style.display = 'flex');
            return;
        }

        navLinks.forEach(link => {
            const text = link.textContent.toLowerCase();
            const sectionId = link.getAttribute('href').substring(1);
            const section = document.getElementById(sectionId);
            let matchInContent = false;
            
            if (section) {
                matchInContent = section.textContent.toLowerCase().includes(query);
            }

            if (text.includes(query) || matchInContent) {
                link.style.display = 'flex';
            } else {
                link.style.display = 'none';
            }
        });
    });

    // Setup permission calculator event listeners
    const checkboxes = document.querySelectorAll('.perm-calc-cb');
    checkboxes.forEach(cb => {
        cb.addEventListener('change', calculatePermissions);
    });

    // Initial calculation
    calculatePermissions();
});

// Copy to Clipboard Utility
function copyText(elementId) {
    const element = document.getElementById(elementId);
    let textToCopy = '';
    
    if (element.tagName === 'CODE' || element.tagName === 'SPAN') {
        textToCopy = element.textContent;
    } else {
        textToCopy = element.innerText;
    }

    navigator.clipboard.writeText(textToCopy).then(() => {
        showToast();
    }).catch(err => {
        console.error('Gagal menyalin teks: ', err);
    });
}

function showToast() {
    const toast = document.getElementById('toast');
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2000);
}

// Preset configurations matching src/commands/utility/role.js
const presets = {
    owner: ['administrator'],
    admin: [
        'manage_server', 'manage_roles', 'manage_channels', 'kick', 'ban',
        'view_audit_log', 'manage_messages', 'mute_members', 'view_channel',
        'send_messages', 'embed_links', 'attach_files', 'read_history',
        'connect', 'speak'
    ],
    mods: [
        'kick', 'ban', 'view_audit_log', 'manage_messages', 'mute_members',
        'view_channel', 'send_messages', 'embed_links', 'attach_files',
        'read_history', 'connect', 'speak'
    ],
    member: [
        'view_channel', 'send_messages', 'embed_links', 'attach_files',
        'read_history', 'connect', 'speak'
    ]
};

// Load Preset
function loadPreset(presetName) {
    const list = presets[presetName] || [];
    const checkboxes = document.querySelectorAll('.perm-calc-cb');
    
    checkboxes.forEach(cb => {
        cb.checked = list.includes(cb.value);
    });
    
    calculatePermissions();
}

// Reset Calculator
function clearCalculator() {
    const checkboxes = document.querySelectorAll('.perm-calc-cb');
    checkboxes.forEach(cb => {
        cb.checked = false;
    });
    calculatePermissions();
}

// Calculate Bitmask & Output command
function calculatePermissions() {
    const checkboxes = document.querySelectorAll('.perm-calc-cb');
    const permStringOutput = document.getElementById('perm-string-output');
    const cmdExampleOutput = document.getElementById('cmd-example-output');
    const bitmaskDecimalOutput = document.getElementById('bitmask-decimal-output');

    let selectedPerms = [];
    let bitmaskDecimal = BigInt(0);

    checkboxes.forEach(cb => {
        if (cb.checked) {
            selectedPerms.push(cb.value);
            const bitVal = BigInt(cb.getAttribute('data-bit'));
            bitmaskDecimal = bitmaskDecimal | bitVal;
        }
    });

    if (selectedPerms.length === 0) {
        permStringOutput.textContent = 'Pilih izin terlebih dahulu...';
        cmdExampleOutput.textContent = '/role createtemplate name:my_custom_role permissions:...';
        bitmaskDecimalOutput.textContent = '0';
        return;
    }

    const permString = selectedPerms.join(',');
    permStringOutput.textContent = permString;
    cmdExampleOutput.textContent = `/role createtemplate name:my_custom_role permissions:${permString}`;
    bitmaskDecimalOutput.textContent = bitmaskDecimal.toString();
}
