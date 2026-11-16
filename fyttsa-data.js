// =====================================================
// FYTTSA Shared Data Helper
// Centralizes Firebase Firestore sync for cross-device data sharing.
// All user-specific data is stored under: usuarios/{userId}/app_data/{key}
// Falls back to localStorage if Firebase is unavailable or no user.
// =====================================================

const FYTTSA_FIREBASE_CONFIG = {
    apiKey: "AIzaSyD9Ihkh0NaP5vVbKntobmVTb53T0yDAZjU",
    authDomain: "fyttsa-ae508.firebaseapp.com",
    projectId: "fyttsa-ae508",
    storageBucket: "fyttsa-ae508.firebasestorage.app",
    messagingSenderId: "860564632264",
    appId: "1:860564632264:web:30edf5a8f837e284ab2bfd",
    measurementId: "G-7PQ1R77YJ3"
};

// Initialize Firebase once
let _fyttsaDb = null;
let _fyttsaFirebaseReady = false;

function _fyttsaInitFirebase() {
    if (typeof firebase === 'undefined') return false;
    if (!firebase.apps.length) {
        firebase.initializeApp(FYTTSA_FIREBASE_CONFIG);
    }
    if (firebase.firestore) {
        _fyttsaDb = firebase.firestore();
        _fyttsaFirebaseReady = true;
        return true;
    }
    return false;
}

// Try to init immediately if firebase is already loaded
if (typeof firebase !== 'undefined') {
    _fyttsaInitFirebase();
}

// Also try after window load (in case scripts load async)
window.addEventListener('load', function() {
    if (!_fyttsaFirebaseReady && typeof firebase !== 'undefined') {
        _fyttsaInitFirebase();
    }
});

/**
 * Get the current user ID from localStorage.
 */
function fyttsa_getUserId() {
    return localStorage.getItem('usuario') || null;
}

/**
 * Load data for the current user from Firestore.
 * Falls back to localStorage if Firestore is unavailable.
 */
async function fyttsa_loadData(key) {
    const userId = fyttsa_getUserId();

    if (userId) {
        if (!_fyttsaFirebaseReady && typeof firebase !== 'undefined') {
            _fyttsaInitFirebase();
        }
        if (_fyttsaFirebaseReady) {
            try {
                const doc = await _fyttsaDb.collection('usuarios')
                    .doc(userId)
                    .collection('app_data')
                    .doc(key)
                    .get();
                if (doc.exists && doc.data().value !== undefined) {
                    return doc.data().value;
                }
            } catch (e) {
                console.warn('[FYTTSA] Firestore load failed, falling back to localStorage:', e);
            }
        }
    }

    // Fallback to localStorage
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        return null;
    }
}

/**
 * Save data for the current user to Firestore.
 * Also saves to localStorage as a cache/fallback.
 */
async function fyttsa_saveData(key, value) {
    const userId = fyttsa_getUserId();

    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        console.warn('[FYTTSA] localStorage save failed:', e);
    }

    if (userId) {
        if (!_fyttsaFirebaseReady && typeof firebase !== 'undefined') {
            _fyttsaInitFirebase();
        }
        if (_fyttsaFirebaseReady) {
            try {
                await _fyttsaDb.collection('usuarios')
                    .doc(userId)
                    .collection('app_data')
                    .doc(key)
                    .set({
                        value: value,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
            } catch (e) {
                console.warn('[FYTTSA] Firestore save failed:', e);
            }
        }
    }
}

/**
 * Save data synchronously to localStorage and fire async Firestore save.
 */
function fyttsa_saveDataSync(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        console.warn('[FYTTSA] localStorage save failed:', e);
    }
    fyttsa_saveData(key, value);
}

// =====================================================
// PRIVILEGE-BASED MENU VISIBILITY + ACTIVE MENU STYLING
// =====================================================
// Privilegio 1 = see ALL menu sections
// Privilegio 2 = see ONLY Inicio + Trabajador section (hide Obra, Control, Almacén)
// =====================================================

function _fyttsa_applyMenuVisibility() {
    var privilegio = String(localStorage.getItem('privilegio') || '1').trim();
    var sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    // console.log('[FYTTSA] Aplicando menú. Privilegio:', privilegio);

    if (privilegio === '2') {
        // Privilegio 2: hide ALL sidebar sections EXCEPT "Trabajador"
        var sections = sidebar.querySelectorAll('.sidebar-section');
        sections.forEach(function(sec) {
            var title = sec.querySelector('.section-title');
            if (title) {
                var titleText = title.textContent.trim();
                if (titleText !== 'Trabajador') {
                    sec.style.display = 'none';
                    // console.log('[FYTTSA] Ocultando sección:', titleText);
                }
            }
        });
    }
    // For privilegio 1 or anything else: show everything (no changes)
}

function _fyttsa_applyActiveStyle() {
    var activeItem = document.querySelector('.nav-item.active');
    if (activeItem) {
        activeItem.style.setProperty('background-color', '#e8e8e8', 'important');
        activeItem.style.setProperty('color', '#000000', 'important');
        activeItem.style.setProperty('font-weight', '700', 'important');
        activeItem.style.setProperty('border-left', '4px solid #000000', 'important');
        activeItem.style.setProperty('border-radius', '8px', 'important');
        activeItem.style.setProperty('padding', '10px 15px', 'important');
    }
}

// Public function that pages call after loading menu.html
function fyttsa_applyPrivilegeMenu() {
    _fyttsa_applyMenuVisibility();
}

// =====================================================
// AUTO-SETUP: Runs automatically when the script loads.
// Uses a MutationObserver to detect when the sidebar content
// changes (i.e., when menu.html is loaded via fetch), then:
//   1. Applies privilege-based menu visibility
//   2. Starts an interval to apply active menu styling
// This ensures the menu is always correct regardless of
// when fyttsa_applyPrivilegeMenu() is called.
// =====================================================

(function() {
    var styleIntervalStarted = false;

    function startActiveStyleInterval() {
        if (styleIntervalStarted) return;
        styleIntervalStarted = true;

        // Apply immediately
        _fyttsa_applyActiveStyle();

        // Then check every 200ms for 20 seconds
        var intervalId = setInterval(function() {
            _fyttsa_applyActiveStyle();
        }, 200);

        setTimeout(function() {
            clearInterval(intervalId);
        }, 20000);
    }

    function setupSidebarObserver() {
        var sidebar = document.getElementById('sidebar');
        if (!sidebar) {
            // Sidebar not yet in DOM, retry shortly
            setTimeout(setupSidebarObserver, 100);
            return;
        }

        // Apply immediately in case menu is already loaded
        _fyttsa_applyMenuVisibility();
        startActiveStyleInterval();

        // Watch for changes to sidebar content (when menu.html is loaded via fetch)
        if (typeof MutationObserver !== 'undefined') {
            var observer = new MutationObserver(function(mutations) {
                _fyttsa_applyMenuVisibility();
                _fyttsa_applyActiveStyle();
            });
            observer.observe(sidebar, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['class']
            });
        }
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setupSidebarObserver();
            // Also retry after a delay in case DOMContentLoaded already fired
            setTimeout(function() {
                _fyttsa_applyMenuVisibility();
                _fyttsa_applyActiveStyle();
                startActiveStyleInterval();
            }, 500);
            setTimeout(function() {
                _fyttsa_applyMenuVisibility();
                _fyttsa_applyActiveStyle();
            }, 1500);
        });
    } else {
        // DOM already ready
        setupSidebarObserver();
        setTimeout(function() {
            _fyttsa_applyMenuVisibility();
            _fyttsa_applyActiveStyle();
            startActiveStyleInterval();
        }, 500);
        setTimeout(function() {
            _fyttsa_applyMenuVisibility();
            _fyttsa_applyActiveStyle();
        }, 1500);
    }

    // Also run on window load (final safety net)
    window.addEventListener('load', function() {
        _fyttsa_applyMenuVisibility();
        _fyttsa_applyActiveStyle();
        startActiveStyleInterval();
    });
})();
