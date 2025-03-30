// API Configuration
// API calls will now go to the same origin, so base URL is relative
const API_BASE_URL = '';

// Router Configuration
const routes = {
    home: () => showHomePage(),
    random: () => showRandomPage(),
    about: () => showAboutPage(),
    juz: (id) => showJuzPage(id),
    surah: (id) => showSurahPage(id),
    addRecitation: () => showAddRecitationPage(),
    mostLiked: () => showMostLikedPage() // Add route for most liked
};

// --- Helper Functions ---

// Extracts YouTube Video ID from various URL formats
function getYouTubeVideoId(url) {
    if (!url) return null;
    let videoId = null;
    try {
        const urlObj = new URL(url);
        if (urlObj.hostname === 'youtu.be') {
            videoId = urlObj.pathname.slice(1);
        } else if (urlObj.hostname.includes('youtube.com')) {
            videoId = urlObj.searchParams.get('v');
        }
        // Add more checks if needed for other YouTube URL formats
    } catch (e) {
        console.error("Error parsing URL:", url, e);
        return null; // Not a valid URL or YouTube URL we can parse
    }
    // Basic check for valid ID format (alphanumeric, -, _)
    return videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId) ? videoId : null;
}

// Generates HTML for a single recitation item (card)
function createRecitationItemHTML(recitation) {
    const videoId = getYouTubeVideoId(recitation.url);
    const contextName = recitation.surah ? `سورة ${recitation.surah.name}` : (recitation.juz_id ? `الجزء ${recitation.juz_id}` : '');

    let mediaElementHTML = '';
    if (videoId) {
        // Embed YouTube player
        mediaElementHTML = `
            <div class="youtube-embed-container">
                <iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen title="YouTube video player"></iframe>
            </div>
        `;
    } else {
        // Default link
        mediaElementHTML = `<a href="${recitation.url}" target="_blank" rel="noopener noreferrer">استماع/مشاهدة</a>`;
    }

    return `
        <div class="recitation-item">
            <p><strong>القارئ:</strong> ${recitation.reciter_name}</p>
            ${contextName ? `<p><strong>السياق:</strong> ${contextName}</p>` : ''} <!-- Show context only if available -->
            ${mediaElementHTML}
            <div class="recitation-actions"> <!-- Wrapper for likes and button -->
                 <span class="like-count">الإعجابات: ${recitation.likes}</span> <!-- Display like count -->
                 <button class="like-btn" data-id="${recitation.id}">
                     إعجاب <!-- Text changes based on liked state -->
                 </button>
            </div>
        </div>
    `;
}


// --- Navigation & Routing ---

document.addEventListener('DOMContentLoaded', () => {
    // Set up navigation links
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = e.target.dataset.page;
            navigateTo(page);
        });
    });

    // Add "Add Recitation" link to navigation
    const navLinks = document.querySelector('.nav-links');
    const addRecitationLink = document.createElement('a');
    addRecitationLink.href = '#';
    addRecitationLink.dataset.page = 'addRecitation';
    addRecitationLink.textContent = 'إضافة تلاوة'; // Translated
    addRecitationLink.addEventListener('click', (e) => {
        e.preventDefault();
        navigateTo('addRecitation');
    });
    navLinks.appendChild(addRecitationLink);

    // Add "Most Liked" link to navigation
    const mostLikedLink = document.createElement('a');
    mostLikedLink.href = '#';
    mostLikedLink.dataset.page = 'mostLiked';
    mostLikedLink.textContent = 'الأكثر إعجابًا'; // Translated
    mostLikedLink.addEventListener('click', (e) => {
        e.preventDefault();
        navigateTo('mostLiked');
    });
    navLinks.appendChild(mostLikedLink); // Append the new link

    // Handle initial route based on hash or default to home
    handleInitialRoute();

    // Listen for hash changes to handle back/forward navigation
    window.addEventListener('hashchange', handleInitialRoute);
});


function handleInitialRoute() {
    // Get route from hash, remove leading #, default to 'home'
    const route = window.location.hash.substring(1) || 'home';
    navigateTo(route);
}

function navigateTo(route) {
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = '<p>جار التحميل...</p>'; // Translated loading indicator

    const [path, params] = route.split('/');
    if (routes[path]) {
        try {
            routes[path](params); // Execute the function for the route
            // Update hash only if it's different to avoid loop
            if (window.location.hash.substring(1) !== route) {
                window.location.hash = route;
            }
        } catch (error) {
            console.error("Error rendering page:", error);
            mainContent.innerHTML = '<p>خطأ في تحميل محتوى الصفحة.</p>'; // Translated
        }
    } else {
        console.warn(`Route not found: ${path}. Defaulting to home.`);
        routes['home'](); // Default to home page if route is unknown
        window.location.hash = 'home'; // Keep hash as 'home'
    }
}

// --- Page Render Functions ---

async function showHomePage() {
    const mainContent = document.getElementById('main-content');
    // Basic structure for Juz grid
    mainContent.innerHTML = `
                <h2>تصفح حسب الجزء</h2> <!-- Translated -->
                <div class="juz-grid">
                    <!-- Tiles will be generated here -->
                </div>
            `;
    const juzGrid = mainContent.querySelector('.juz-grid');
    // Add Arabic word "جزء"
    juzGrid.innerHTML = Array.from({ length: 30 }, (_, i) => i + 1)
        .map(num => `
                    <div class="juz-tile" data-juz="${num}">
                        <h3>جزء ${num}</h3>
                    </div>
                `).join('');

    // Add click events to juz tiles
    juzGrid.querySelectorAll('.juz-tile').forEach(tile => {
        tile.addEventListener('click', () => {
            navigateTo(`juz/${tile.dataset.juz}`);
        });
    });
}

async function showJuzPage(juzId) {
    const mainContent = document.getElementById('main-content');
    if (!juzId) {
        mainContent.innerHTML = '<p>رقم الجزء غير صالح.</p>'; // Translated
        return;
    }
    mainContent.innerHTML = `<p>جار تحميل الجزء ${juzId}...</p>`; // Translated
    try {
        // NOTE: This requires your backend API to be running at API_BASE_URL
        const response = await fetch(`${API_BASE_URL}/juz/${juzId}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const juzData = await response.json(); // Assuming API returns { surahs: [...], recitations: [...] }

        // Basic rendering - enhance as needed
        mainContent.innerHTML = `
                    <div class="juz-page">
                        <h2>الجزء ${juzId}</h2> <!-- Translated -->
                        <div class="surahs-list">
                            <h3>السور في هذا الجزء</h3> <!-- Translated -->
                            ${juzData.surahs && juzData.surahs.length > 0 ?
                juzData.surahs.map(surah => `
                                    <div class="surah-item" data-surah-id="${surah.id}">
                                        <h4>${surah.id}. ${surah.name} (${surah.name_arabic})</h4>
                                        <p>عدد الآيات: ${surah.verses_count}</p> <!-- Translated -->
                                        <button onclick="navigateTo('surah/${surah.id}')">عرض التلاوات</button> <!-- Translated -->
                                    </div>`).join('')
                : '<p>لا توجد معلومات عن السور.</p>' // Translated
            }
                        </div>
                        <hr>
                        <div class="recitations-list">
                            <h3>تلاوات الجزء ${juzId}</h3> <!-- Translated -->
                             ${juzData.recitations && juzData.recitations.length > 0 ?
                juzData.recitations.map(createRecitationItemHTML).join('') // Use helper function
                : '<p>لم يتم العثور على تلاوات لهذا الجزء.</p>' // Translated
            }
                        </div>
                    </div>
                `;
        attachLikeButtonListeners(); // Re-attach listeners after rendering
    } catch (error) {
        console.error('Error loading Juz data:', error);
        mainContent.innerHTML = `<p>خطأ في تحميل بيانات الجزء ${juzId}. هل الخادم يعمل؟</p>`; // Translated
    }
}

async function showSurahPage(surahId) {
    const mainContent = document.getElementById('main-content');
    if (!surahId) {
        mainContent.innerHTML = '<p>رقم السورة غير صالح.</p>'; // Translated
        return;
    }
    mainContent.innerHTML = `<p>جار تحميل السورة ${surahId}...</p>`; // Translated
    try {
        // NOTE: This requires your backend API to be running at API_BASE_URL
        const response = await fetch(`${API_BASE_URL}/surah/${surahId}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const surahData = await response.json(); // Assuming API returns { info: {...}, recitations: [...] }

        mainContent.innerHTML = `
                     <div class="surah-page">
                         <h2>${surahData.info.id}. ${surahData.info.name} (${surahData.info.name_arabic})</h2>
                         <p>المعنى: ${surahData.info.translation_en}</p> <!-- Translated -->
                         <p>عدد الآيات: ${surahData.info.verses_count}</p> <!-- Translated -->
                         <hr>
                         <div class="recitations-list">
                             <h3>تلاوات سورة ${surahData.info.name}</h3> <!-- Translated -->
                             ${surahData.recitations && surahData.recitations.length > 0 ?
                surahData.recitations.map(createRecitationItemHTML).join('') // Use helper function
                : '<p>لم يتم العثور على تلاوات لهذه السورة.</p>' // Translated
            }
                         </div>
                     </div>
                 `;
        attachLikeButtonListeners(); // Re-attach listeners after rendering
    } catch (error) {
        console.error('Error loading Surah data:', error);
        mainContent.innerHTML = `<p>خطأ في تحميل بيانات السورة ${surahId}. هل الخادم يعمل؟</p>`; // Translated
    }
}


async function showRandomPage() {
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = '<p>جار البحث عن تلاوة عشوائية...</p>'; // Translated
    try {
        // NOTE: This requires your backend API to be running at API_BASE_URL
        const response = await fetch(`${API_BASE_URL}/random`); // Endpoint now returns RecitationResponse
        if (!response.ok) {
             const errorData = await response.json().catch(() => ({ detail: 'خطأ غير معروف' }));
             throw new Error(errorData.detail || `خطأ HTTP! الحالة: ${response.status}`);
        }
        const recitation = await response.json(); // Response is now a single recitation object
        const contextName = recitation.surah ? `سورة ${recitation.surah.name}` : (recitation.juz_id ? `الجزء ${recitation.juz_id}` : ''); // Get context name

        // Render the single recitation directly using the helper
        mainContent.innerHTML = `
            <div class="random-recitation-page">
                <h2>تلاوة عشوائية ${contextName ? `من ${contextName}` : ''}</h2> <!-- Add context if available -->
                ${createRecitationItemHTML(recitation)} <!-- Use helper function -->
            </div>
        `;
        attachLikeButtonListeners(); // Attach listener for the like button

    } catch (error) {
        console.error('Error getting random recitation:', error);
        mainContent.innerHTML = `<p>تعذر تحميل تلاوة عشوائية: ${error.message}. هل الخادم يعمل؟</p>`; // Updated error message
    }
}

function showAboutPage() {
    const mainContent = document.getElementById('main-content');
    // Translated About Page Content
    mainContent.innerHTML = `
                <div class="about-page">
                    <h2>حول تلاوات القرآن</h2>
                    <p>مرحبًا بك في تلاوات القرآن، منصة مجتمعية لمشاركة واكتشاف تلاوات القرآن الكريم.</p>
                    <p>تتيح هذه المنصة للمستخدمين تصفح التلاوات حسب الجزء أو السورة، وإضافة روابط تلاوات جديدة (صوت/فيديو)، والإعجاب بالتلاوات المفضلة لديهم. لا يتطلب التسجيل.</p>
                    <h3>كيفية الاستخدام</h3>
                    <ul>
                        <li><strong>الرئيسية:</strong> تصفح الأجزاء الثلاثين باستخدام الشبكة. انقر على مربع لعرض التفاصيل.</li>
                        <li><strong>صفحة الجزء:</strong> عرض السور داخل الجزء والتلاوات المتاحة للجزء بأكمله.</li>
                        <li><strong>صفحة السورة:</strong> عرض التلاوات المتاحة لسورة معينة.</li>
                        <li><strong>إضافة تلاوة:</strong> استخدم النموذج لإرسال رابط لتلاوة (مثل يوتيوب، ساوند كلاود). يرجى تقديم اسم القارئ.</li>
                        <li><strong>إعجاب:</strong> انقر على زر 'إعجاب' على أي تلاوة لرفعها.</li>
                        <li><strong>عشوائي:</strong> اكتشف تلاوة من جزء أو سورة عشوائية.</li>
                    </ul>
                     <h3>إرشادات</h3>
                     <ul>
                        <li>يرجى إضافة روابط لتلاوات </li>
                        <li>تأكد من أن الرابط يشير مباشرة إلى التلاوة (أو قائمة تشغيل لجزء كامل).</li>
                        <li>قدم اسم القارئ الصحيح إذا كان معروفًا.</li>
                        <li>تجنب الإدخالات المكررة إن أمكن.</li>
                     </ul>
                </div>
            `;
}

async function showAddRecitationPage() {
    const mainContent = document.getElementById('main-content');
    // Translated Add Recitation Form
    mainContent.innerHTML = `
                <div class="recitation-form">
                    <h2>إضافة تلاوة جديدة</h2>
                    <form id="recitationForm">
                         <div class="form-group">
                            <label for="recitationType">النوع:</label>
                            <select id="recitationType" name="type" required>
                                <option value="">-- اختر النوع --</option>
                                <option value="surah">سورة</option>
                                <option value="juz">جزء</option>
                            </select>
                        </div>
                        <div class="form-group" id="surah-select-group" style="display: none; position: relative;">
                            <label for="surahSearch">بحث واختيار السورة:</label>
                            <input type="text" id="surahSearch" placeholder="ابحث بالاسم (عربي أو إنجليزي)..." autocomplete="off">
                            <input type="hidden" id="selectedSurahId" name="surah_id">
                            <div id="surahResults" class="autocomplete-results" style="display: none;">
                                <!-- Results will be populated dynamically -->
                            </div>
                        </div>
                         <div class="form-group" id="juz-select-group" style="display: none;">
                            <label for="juzId">الجزء:</label>
                            <select id="juzId" name="juz_id">
                                <option value="">-- اختر الجزء --</option>
                                ${Array.from({ length: 30 }, (_, i) => `<option value="${i + 1}">الجزء ${i + 1}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="reciterName">اسم القارئ:</label>
                            <input type="text" id="reciterName" name="reciter_name" required>
                        </div>
                        <div class="form-group">
                            <label for="recitationUrl">رابط التلاوة (مثل يوتيوب، ساوند كلاود):</label>
                            <input type="url" id="recitationUrl" name="url" required placeholder="https://...">
                        </div>
                        <button type="submit" class="submit-btn">إضافة تلاوة</button>
                        <div id="formMessage" class="message" style="display: none;"></div>
                    </form>
                </div>
            `;

    const typeSelect = document.getElementById('recitationType');
    const surahGroup = document.getElementById('surah-select-group');
    const juzGroup = document.getElementById('juz-select-group');
    // const surahSelect = document.getElementById('surahId'); // No longer using select
    const juzSelect = document.getElementById('juzId');
    const surahSearchInput = document.getElementById('surahSearch');
    const surahResultsContainer = document.getElementById('surahResults'); // Container for results
    const selectedSurahIdInput = document.getElementById('selectedSurahId'); // Hidden input

    let allSurahs = []; // Store all fetched surahs

    // Function to filter and display surah results
    function displaySurahResults(searchTerm = '') {
        const lowerSearchTerm = searchTerm.toLowerCase().trim();
        surahResultsContainer.innerHTML = ''; // Clear previous results
        selectedSurahIdInput.value = ''; // Clear hidden input on new search

        if (!lowerSearchTerm) {
            surahResultsContainer.style.display = 'none';
            return; // Hide if search is empty
        }

        const filteredSurahs = allSurahs.filter(surah => {
            const nameLower = surah.name.toLowerCase();
            const nameArabicLower = (surah.name_arabic || '').toLowerCase();
            return nameLower.includes(lowerSearchTerm) || nameArabicLower.includes(lowerSearchTerm);
        }).slice(0, 10); // Limit results for performance/UI

        if (filteredSurahs.length > 0) {
            filteredSurahs.forEach(surah => {
                const item = document.createElement('div');
                item.classList.add('autocomplete-item');
                // Use surah.id instead of surah.number
                item.textContent = `${surah.id}. ${surah.name} (${surah.name_arabic || ''})`;
                item.dataset.surahId = surah.id;
                // Use surah.id instead of surah.number for the stored name as well
                item.dataset.surahName = `${surah.id}. ${surah.name} (${surah.name_arabic || ''})`;

                item.addEventListener('click', () => {
                    surahSearchInput.value = item.dataset.surahName; // Set input value to selected surah
                    selectedSurahIdInput.value = item.dataset.surahId; // Set hidden input value
                    surahResultsContainer.style.display = 'none'; // Hide results
                    surahResultsContainer.innerHTML = ''; // Clear results
                });
                surahResultsContainer.appendChild(item);
            });
            surahResultsContainer.style.display = 'block'; // Show results container
        } else {
            surahResultsContainer.style.display = 'none'; // Hide if no results
        }
    }

    // Fetch all Surahs once
    async function fetchAllSurahs() {
        try {
            const response = await fetch(`${API_BASE_URL}/surahs`);
            if (!response.ok) throw new Error('Failed to fetch Surahs');
            allSurahs = await response.json();
        } catch (error) {
            console.error("Error fetching surahs:", error);
            // Handle error appropriately, maybe show a message
        }
    }
    fetchAllSurahs(); // Fetch on page load

    // Event listener for the search input
    surahSearchInput.addEventListener('input', (e) => {
        displaySurahResults(e.target.value);
    });

    // Hide results when clicking outside
    document.addEventListener('click', (e) => {
        if (!surahGroup.contains(e.target)) { // Check if click is outside the surah group
            surahResultsContainer.style.display = 'none';
        }
    });
     // Prevent hiding results when clicking inside the input or results
    surahSearchInput.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent document click listener from firing
        // Optionally re-show results if input is clicked and has value
        if (surahSearchInput.value.trim()) {
             displaySurahResults(surahSearchInput.value);
        }
    });
     surahResultsContainer.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent document click listener from firing
    });


    typeSelect.addEventListener('change', () => {
        const isSurah = typeSelect.value === 'surah';
        surahGroup.style.display = isSurah ? 'block' : 'none';
        juzGroup.style.display = typeSelect.value === 'juz' ? 'block' : 'none';

        // Reset selections and search when type changes
        juzSelect.value = '';
        surahSearchInput.value = '';
        selectedSurahIdInput.value = '';
        surahResultsContainer.style.display = 'none';
        surahResultsContainer.innerHTML = '';
    });


    const form = document.getElementById('recitationForm');
    const messageDiv = document.getElementById('formMessage');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        messageDiv.style.display = 'none'; // Hide previous messages

        const formData = {
            type: form.type.value,
            // Get surah_id from the hidden input now
            surah_id: form.type.value === 'surah' ? parseInt(selectedSurahIdInput.value) : null,
            juz_id: form.type.value === 'juz' ? parseInt(form.juz_id.value) : null,
            reciter_name: form.reciter_name.value.trim(),
            url: form.url.value.trim()
        };

        // Basic Validation (Translated Messages)
        if (!formData.type) {
            showMessage('يرجى اختيار النوع (سورة أو جزء).', 'error'); return;
        }
        if (formData.type === 'surah' && !formData.surah_id) {
            showMessage('يرجى اختيار السورة.', 'error'); return;
        }
        if (formData.type === 'juz' && !formData.juz_id) {
            showMessage('يرجى اختيار الجزء.', 'error'); return;
        }
        if (!formData.reciter_name) {
            showMessage('يرجى إدخال اسم القارئ.', 'error'); return;
        }
        if (!formData.url || !formData.url.startsWith('http')) {
            showMessage('يرجى إدخال رابط صحيح يبدأ بـ http أو https.', 'error'); return;
        }


        try {
            // NOTE: This requires your backend API to be running at API_BASE_URL
            const result = await addRecitation(formData); // Use the existing addRecitation function
            if (result.error) {
                // Assuming result.error might be in English from backend, wrap it
                showMessage(`خطأ: ${result.error}`, 'error');
            } else {
                showMessage('تمت إضافة التلاوة بنجاح!', 'success'); // Translated
                form.reset(); // Clear the form
                // Also clear the hidden surah ID and hide results
                selectedSurahIdInput.value = '';
                surahResultsContainer.style.display = 'none';
                surahResultsContainer.innerHTML = '';
                // Hide conditional fields again after reset
                surahGroup.style.display = 'none';
                juzGroup.style.display = 'none';
            }
        } catch (error) {
            console.error("Error submitting form:", error);
            showMessage('حدث خطأ أثناء إضافة التلاوة. يرجى المحاولة مرة أخرى.', 'error'); // Translated
        }
    });
}

function showMessage(text, type) {
    const messageDiv = document.getElementById('formMessage');
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}-message`; // 'success-message' or 'error-message'
    messageDiv.style.display = 'block';
}

// --- Most Liked Page ---
async function showMostLikedPage() {
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = '<p>جار تحميل التلاوات الأكثر إعجابًا...</p>'; // Translated loading message

    try {
        const response = await fetch(`${API_BASE_URL}/recitations/most-liked`);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'خطأ غير معروف' }));
            throw new Error(errorData.detail || `خطأ HTTP! الحالة: ${response.status}`);
        }
        const recitations = await response.json();

        if (recitations.length === 0) {
            mainContent.innerHTML = `<h2>الأكثر إعجابًا</h2><p>لم يتم العثور على تلاوات بعد.</p>`; // Translated no results
            return;
        }

        mainContent.innerHTML = `
            <div class="most-liked-page">
                <h2>الأكثر إعجابًا</h2>
                <div class="recitations-list">
                    ${recitations.map(createRecitationItemHTML).join('')} <!-- Use helper function -->
                </div>
            </div>
        `;
        attachLikeButtonListeners(); // Attach listeners for the like buttons

    } catch (error) {
        console.error('Error loading most liked recitations:', error);
        mainContent.innerHTML = `<p>خطأ في تحميل التلاوات الأكثر إعجابًا: ${error.message}. هل الخادم يعمل؟</p>`; // Translated error message
    }
}


// Helper function to manage liked items in localStorage
const likedItemsStorage = {
    key: 'likedRecitations',
    getLikedIds: function() {
        return JSON.parse(localStorage.getItem(this.key) || '[]');
    },
    addLikedId: function(id) {
        const likedIds = this.getLikedIds();
        // Ensure ID is treated as string for comparison consistency
        const stringId = String(id);
        if (!likedIds.includes(stringId)) {
            likedIds.push(stringId);
            localStorage.setItem(this.key, JSON.stringify(likedIds));
        }
    },
    isLiked: function(id) {
        // Ensure ID is treated as string for comparison consistency
        return this.getLikedIds().includes(String(id));
    }
};

// Updated helper to attach listeners and handle liked state
function attachLikeButtonListeners() {
    const likedIds = likedItemsStorage.getLikedIds(); // Get liked IDs once

    document.querySelectorAll('.like-btn').forEach(button => {
        const recitationId = button.dataset.id;

        // Check if already liked (using string comparison)
        if (likedItemsStorage.isLiked(recitationId)) {
            button.disabled = true;
            // Find the like count span within the same parent (.recitation-actions)
            const likeCountSpan = button.closest('.recitation-actions')?.querySelector('.like-count');
            const currentLikes = likeCountSpan ? likeCountSpan.textContent.match(/\d+/)?.[0] || '?' : '?';
            button.textContent = `تم الإعجاب (${currentLikes})`; // Show count in liked state
            button.classList.add('already-liked'); // Optional class for styling
            return; // Don't attach click listener if already liked
        }

        // Prevent adding multiple listeners to the same button if re-rendered somehow
        if (button.dataset.listenerAttached) return;
        button.dataset.listenerAttached = 'true';

        button.addEventListener('click', async (event) => {
            const btn = event.currentTarget;
            const currentRecitationId = btn.dataset.id; // Use current ID from button

            if (!currentRecitationId) { // Check only for data-id now
                console.error("Like button missing data-id");
                return;
            }

            // Double check if liked just before sending request (unlikely but safe)
            if (likedItemsStorage.isLiked(currentRecitationId)) {
                 btn.disabled = true;
                 btn.textContent = 'تم الإعجاب'; // Consider showing count here too
                 return;
            }

            btn.disabled = true; // Disable during request
            btn.textContent = 'جار الإعجاب...'; // Translated

            // Call likeRecitation without type
            const result = await likeRecitation(currentRecitationId);

            if (result && result.likes !== undefined) {
                // Success! Update localStorage, disable button permanently, update text
                likedItemsStorage.addLikedId(currentRecitationId);
                btn.textContent = `تم الإعجاب (${result.likes})`; // Update text to liked state
                btn.classList.add('already-liked'); // Add liked class
                 // Update the separate like count span
                 const likeCountSpan = btn.closest('.recitation-actions')?.querySelector('.like-count');
                 if (likeCountSpan) {
                     likeCountSpan.textContent = `الإعجابات: ${result.likes}`;
                 }
                // Button remains disabled
            } else {
                // Failure - Re-enable button and revert text
                // Find the like count span to get original count
                const likeCountSpan = btn.closest('.recitation-actions')?.querySelector('.like-count');
                const originalLikes = likeCountSpan ? likeCountSpan.textContent.match(/\d+/)?.[0] || '?' : '?';
                btn.textContent = `إعجاب (${originalLikes})`; // Revert to original like text
                alert('فشل تحديث عدد الإعجابات.'); // Translated alert
                btn.disabled = false; // Re-enable button on failure
            }
        });
    });
}

// API Interaction Functions
// Removed 'type' parameter as it's not needed for the API call
async function likeRecitation(recitationId) {
    console.log(`Liking recitation ID: ${recitationId}`); // Log without type
    try {
        // NOTE: This requires your backend API to be running at API_BASE_URL
        const response = await fetch(`${API_BASE_URL}/recitations/${recitationId}/like`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // No body needed unless backend requires type, which it doesn't seem to
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'خطأ غير معروف' })); // Translated default
            throw new Error(errorData.detail || `خطأ HTTP! الحالة: ${response.status}`); // Translated
        }
        return await response.json(); // Expecting { id: ..., likes: ... } or similar
    } catch (error) {
        console.error('Error liking recitation:', error);
        alert(`فشل الإعجاب بالتلاوة: ${error.message}`); // Translated feedback
        return null; // Indicate failure
    }
}

async function addRecitation(recitationData) {
    console.log("Adding recitation:", recitationData);
    try {
        // NOTE: This requires your backend API to be running at API_BASE_URL
        const response = await fetch(`${API_BASE_URL}/recitations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(recitationData)
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'خطأ غير معروف أثناء الإضافة' })); // Translated default
            // Return an object indicating error, to be handled by the form submit handler
            return { error: errorData.detail || `فشل إضافة التلاوة (الحالة: ${response.status})` }; // Translated
        }
        return await response.json(); // Expecting the added recitation object or success message
    } catch (error) {
        console.error('Error adding recitation:', error);
        // Return an object indicating error
        return { error: 'خطأ في الشبكة أو فشل الاتصال بالخادم.' }; // Translated
    }
}
