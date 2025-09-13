// --- START I18N (Internationalization) ---

// Store loaded translations
let translations = {};

// Function to change the language by reloading the page with a URL parameter
// This is better for SEO as each language has a unique URL.
function changeLanguage(lang) {
    const params = new URLSearchParams(window.location.search);
    // Preserve the 'id' parameter for match details pages
    const matchId = params.get('id'); 
    
    let newSearch = `?lang=${lang}`;
    if (matchId) {
        newSearch += `&id=${matchId}`;
    }
    window.location.href = window.location.pathname + newSearch;
}

// Function to load translation files from the 'locales' folder
async function loadTranslations(lang) {
    try {
        const response = await fetch(`${lang}.json`);
        translations = await response.json();
    } catch (error) {
        console.error(`Could not load translation file for language: ${lang}`, error);
        // Fallback to Arabic if loading fails
        const response = await fetch(`ar.json`);
        translations = await response.json();
    }
}

// Function to apply translations to all elements with a 'data-i18n-key'
function applyTranslations(lang) {
    document.querySelectorAll('[data-i18n-key]').forEach(element => {
        const key = element.getAttribute('data-i18n-key');
        if (translations[key]) {
            element.textContent = translations[key];
        }
    });
    // Update page direction and lang attribute based on the selected language
    if (['en', 'fr', 'es', 'de', 'it', 'pt'].includes(lang)) {
        document.documentElement.setAttribute('dir', 'ltr');
    } else {
        document.documentElement.setAttribute('dir', 'rtl');
    }
    document.documentElement.setAttribute('lang', lang);
}

// Function to add hreflang tags for SEO
function addHreflangTags() {
    const supportedLangs = ['ar', 'en', 'fr', 'es', 'de', 'it', 'pt'];
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);

    supportedLangs.forEach(lang => {
        const link = document.createElement('link');
        link.rel = 'alternate';
        link.hreflang = lang;
        params.set('lang', lang); // Keep other params like 'id'
        link.href = `${path}?${params.toString()}`;
        document.head.appendChild(link);
    });

    // Add x-default for users with other languages, defaulting to English
    const defaultLink = document.createElement('link');
    defaultLink.rel = 'alternate';
    defaultLink.hreflang = 'x-default';
    params.set('lang', 'en');
    defaultLink.href = `${path}?${params.toString()}`;
    document.head.appendChild(defaultLink);
}

// --- END I18N ---

// --- START NEWS LOGIC (Centralized) ---

let savedArticles = JSON.parse(localStorage.getItem('savedArticles')) || {}; // Use URL as key

// Function to save/unsave an article
function toggleSaveArticle(articleUrl, articleDataString) {
    const isLoggedIn = !!localStorage.getItem('loggedInUser');
    if (!isLoggedIn) {
        alert(translations.login_to_save_article || 'يرجى تسجيل الدخول أولاً لحفظ المقالات.');
        const currentLang = localStorage.getItem('language') || 'ar';
        const redirectUrl = encodeURIComponent(window.location.href);
        window.location.href = `login.html?lang=${currentLang}&redirect_url=${redirectUrl}`;
        return;
    }

    const button = document.querySelector(`.save-article-btn[data-article-url="${articleUrl}"]`);
    // Use try-catch for robust parsing
    let articleData;
    try {
        articleData = JSON.parse(decodeURIComponent(articleDataString));
    } catch (e) {
        console.error("Could not parse article data:", e);
        return;
    }

    if (savedArticles[articleUrl]) {
        delete savedArticles[articleUrl];
        if (button) {
            button.textContent = translations.save_article || 'حفظ';
            button.classList.remove('saved');
        }
        // If on profile page, remove the card from the DOM
        if (window.location.pathname.includes('profile.html')) {
            const cardToRemove = document.querySelector(`.card[data-article-url="${articleUrl}"]`);
            if (cardToRemove) cardToRemove.remove();
            
            const container = document.getElementById('saved-articles-container');
            if (container && container.children.length === 0) {
                 container.innerHTML = `<p style="text-align: center;" data-i18n-key="no_saved_articles">${translations.no_saved_articles || 'ليس لديك مقالات محفوظة بعد.'}</p>`;
            }
        }
    } else {
        savedArticles[articleUrl] = articleData;
        if (button) {
            button.textContent = translations.unsave_article || 'إلغاء الحفظ';
            button.classList.add('saved');
        }
    }
    localStorage.setItem('savedArticles', JSON.stringify(savedArticles));
}

const renderNews = (articles, container, pageSize) => {
    if (!container) return;
    container.innerHTML = '';
    if (!articles || articles.length === 0) {
        container.innerHTML = `<p style="text-align: center;" data-i18n-key="no_saved_articles">${translations.no_saved_articles || 'ليس لديك مقالات محفوظة بعد.'}</p>`;
        return;
    }
    const articlesToShow = pageSize ? articles.slice(0, pageSize) : articles;

    articlesToShow.forEach(article => {
        const { image_url, title, description, link, source_id, pubDate } = article;
        const currentLangForDate = localStorage.getItem('language') || 'ar';
        const dateString = pubDate ? new Date(pubDate).toLocaleDateString(currentLangForDate, { year: 'numeric', month: 'long', day: 'numeric' }) : '';
        const articleDataString = encodeURIComponent(JSON.stringify(article));
        const isSaved = !!savedArticles[link];

        const newsCardHTML = `
            <div class="card" data-article-url="${link}">
                <img src="${image_url || 'https://via.placeholder.com/400x200.png?text=Nono+Koura'}" alt="${title || ''}">
                <div class="card-content">
                    <h4>${title || ''}</h4>
                    <p>${description || ''}</p>
                    <div class="card-actions">
                        <a href="${link}" target="_blank" rel="noopener noreferrer" data-i18n-key="read_more">${translations.read_more || 'اقرأ المزيد'}</a>
                        <button class="save-article-btn ${isSaved ? 'saved' : ''}" data-article-url="${link}" onclick="toggleSaveArticle('${link}', '${articleDataString}')">
                            ${isSaved ? (translations.unsave_article || 'إلغاء الحفظ') : (translations.save_article || 'حفظ')}
                        </button>
                    </div>
                    <div class="card-meta">
                        <span class="source">${source_id || ''}</span>
                        <span class="date">${dateString}</span>
                    </div>
                </div>
            </div>`;
        container.innerHTML += newsCardHTML;
    });
};

const fetchNews = async (pageSize) => {
    const newsApiKey = 'pub_675b317183be4190a36fdebb5088c0cb';
    const newsContainer = document.getElementById('news-container');
    if (!newsContainer) return;
    
    let lang = localStorage.getItem('language') || 'ar';
    const supportedLangs = { 'ar': 'ar', 'en': 'en', 'de': 'de', 'es': 'es', 'fr': 'fr', 'it': 'it', 'pt': 'pt' };
    const apiLang = supportedLangs[lang] || 'en';

    const query = (apiLang === 'ar') ? 'كرة القدم' : 'football';
    const url = `https://newsdata.io/api/1/news?apikey=${newsApiKey}&q=${encodeURIComponent(query)}&language=${apiLang}&image=1`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.status === 'success' && data.results && data.results.length > 0) {
            renderNews(data.results, newsContainer, pageSize);
        } else {
            throw new Error(data.results?.message || 'Could not fetch news.');
        }
    } catch (error) {
        console.error('Error fetching news:', error);
        newsContainer.innerHTML = `<p style="text-align: center;" data-i18n-key="news_loading_error">${translations.news_loading_error || 'حدث خطأ أثناء تحميل الأخبار.'}</p>`;
    }
};

// --- END NEWS LOGIC ---

// --- START MATCHES LOGIC (Centralized) ---

let liveMatchTimers = [];
let masterTimerInterval = null;

// Helper to render the collapsible lineup view for a match card
const renderPitchAndLineupsForCard = (lineups) => {
    if (!lineups || lineups.length < 2) return '';

    const homeLineup = lineups[0];
    const awayLineup = lineups[1];

    const getPlayerMarkers = (players, isHome) => {
        if (!players || players.length === 0) return '';
        const playersByRow = players.reduce((acc, p) => {
            const row = p.player.grid ? p.player.grid.split(':')[0] : '0';
            if (!acc[row]) acc[row] = [];
            acc[row].push(p);
            return acc;
        }, {});

        let markersHTML = '';
        for (const row in playersByRow) {
            const playersInRow = playersByRow[row];
            const rowCount = playersInRow.length;
            playersInRow.forEach((p, index) => {
                const gridY = parseInt(row);
                const topPercent = isHome ? (gridY * 8) + 5 : 95 - (gridY * 8);
                const leftPercent = (100 / (rowCount + 1)) * (index + 1);

                markersHTML += `
                    <div class="player-marker" style="top: ${topPercent}%; left: ${leftPercent}%;">
                        <div class="player-shirt">${p.player.number || '?'}</div>
                        <span class="player-name">${p.player.name}</span>
                    </div>
                `;
            });
        }
        return markersHTML;
    };

    const renderSubstitutesList = (players) => {
        if (!players || players.length === 0) return '';
        let listHTML = `<ul>`;
        players.forEach(p => {
            listHTML += `<li><span class="player-number">${p.player.number || '?'}</span> ${p.player.name}</li>`;
        });
        listHTML += '</ul>';
        return listHTML;
    };

    const homeStarters = getPlayerMarkers(homeLineup.startXI, true);
    const awayStarters = getPlayerMarkers(awayLineup.startXI, false);

    return `
        <div class="pitch-view">
            <div class="lineup-title">${homeLineup.formation || ''} vs ${awayLineup.formation || ''}</div>
            <div class="pitch"><div class="home-team">${homeStarters}</div><div class="away-team">${awayStarters}</div></div>
        </div>
        <div class="lineups-container">
            <div class="lineup-list"><h5>${translations.substitutes || 'البدلاء'} (${homeLineup.team.name})</h5>${renderSubstitutesList(homeLineup.substitutes)}</div>
            <div class="lineup-list"><h5>${translations.substitutes || 'البدلاء'} (${awayLineup.team.name})</h5>${renderSubstitutesList(awayLineup.substitutes)}</div>
        </div>
    `;
};

// Timer function to update live match clocks
const startMasterTimer = () => {
    if (masterTimerInterval) clearInterval(masterTimerInterval);
    
    masterTimerInterval = setInterval(() => {
        liveMatchTimers.forEach(timer => {
            const timerElement = document.getElementById(`timer-${timer.id}`);
            if (!timerElement) return;

            if (timer.status === 'HT') {
                timerElement.textContent = translations.status_halftime || 'استراحة';
                return;
            }

            const secondsSinceRender = Math.floor((Date.now() - timer.renderTimestamp) / 1000);
            const totalElapsedSeconds = (timer.initialElapsed * 60) + secondsSinceRender;
            
            const currentMinutes = Math.floor(totalElapsedSeconds / 60);
            const currentSeconds = totalElapsedSeconds % 60;

            timerElement.textContent = `${currentMinutes}':${String(currentSeconds).padStart(2, '0')}`;
        });
    }, 1000);
};

// Core function to fetch and render matches based on a configuration
const fetchAndRenderMatches = async (config) => {
    const { endpoint, containerId, renderOptions, noMatchesKey } = config;
    
    const apiKey = '961ae048e75e80dc93671cf8588e46cd';
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `<p style="text-align: center;" data-i18n-key="loading_matches">${translations.loading_matches || 'جاري تحميل المباريات...'}</p>`;
    liveMatchTimers = []; // Reset timers for each fetch
    
    const url = `https://v3.football.api-sports.io/fixtures?${endpoint}`;
    
    const options = {
        method: 'GET',
        headers: {
            'x-rapidapi-host': 'v3.football.api-sports.io',
            'x-rapidapi-key': apiKey
        }
    };

    try {
        const response = await fetch(url, options);
        const data = await response.json();

        if (data.response && data.response.length > 0) {
            container.innerHTML = ''; // Clear loading message

            const matchesByLeague = data.response.reduce((acc, match) => {
                const leagueName = match.league.name;
                if (!acc[leagueName]) {
                    acc[leagueName] = { logo: match.league.logo, matches: [] };
                }
                acc[leagueName].matches.push(match);
                return acc;
            }, {});

            for (const league in matchesByLeague) {
                const leagueHeader = document.createElement('div');
                leagueHeader.className = 'league-header';
                leagueHeader.innerHTML = `<img src="${matchesByLeague[league].logo}" alt="${league}" class="league-logo"><h4>${league}</h4>`;
                container.appendChild(leagueHeader);

                matchesByLeague[league].matches.forEach(match => {
                    const { fixture, teams, goals, lineups } = match;
                    let scoreOrTime = '', statusHTML = '', statusClass = 'upcoming';
                    const shortStatus = fixture.status.short;
                    
                    const matchDate = new Date(fixture.date);
                    const currentLangForDate = (localStorage.getItem('language') || 'ar');
                    const dateOptions = { month: 'long', day: 'numeric', weekday: 'long' };
                    const timeOptions = { hour: '2-digit', minute: '2-digit' };
                    const dateString = matchDate.toLocaleDateString(currentLangForDate, dateOptions);
                    const timeString = matchDate.toLocaleTimeString(currentLangForDate, timeOptions);

                    const liveStatuses = ['1H', 'HT', '2H', 'ET', 'P', 'LIVE'];

                    if (liveStatuses.includes(shortStatus) && fixture.status.elapsed) {
                        scoreOrTime = `${goals.home ?? 0} - ${goals.away ?? 0}`;
                        statusClass = 'live';
                        statusHTML = shortStatus === 'HT' ? `${translations.status_halftime || 'استراحة'}<span class="whistle-icon"></span>` : `<span class="match-timer" id="timer-${fixture.id}">${fixture.status.elapsed}':00</span><span class="whistle-icon"></span>`;
                        liveMatchTimers.push({ id: fixture.id, initialElapsed: fixture.status.elapsed, renderTimestamp: Date.now(), status: shortStatus });
                    } else if (['FT', 'AET', 'PEN'].includes(shortStatus)) {
                        scoreOrTime = `${goals.home} - ${goals.away}`;
                        statusClass = 'finished';
                        statusHTML = translations.status_finished || 'انتهت';
                    } else if (shortStatus === 'NS') {
                        scoreOrTime = timeString;
                        statusClass = 'upcoming';
                        statusHTML = translations.status_not_started || 'لم تبدأ';
                    } else {
                        scoreOrTime = '-';
                        statusClass = 'finished';
                        statusHTML = fixture.status.long;
                    }

                    let homeWinnerClass = '', awayWinnerClass = '';
                    if (statusClass === 'finished' && goals.home !== null && goals.away !== null) {
                        if (goals.home > goals.away) homeWinnerClass = 'winner';
                        else if (goals.away > goals.home) awayWinnerClass = 'winner';
                    }

                    const matchWrapper = document.createElement('div');
                    matchWrapper.className = 'match-wrapper';
                    
                    let lineupSectionHTML = '';
                    const clickableClass = renderOptions.showLineups ? 'team-clickable' : '';
                    if (renderOptions.showLineups) {
                        const lineupsAvailable = lineups && lineups.length === 2 && lineups[0].startXI.length > 0;
                        if (lineupsAvailable) {
                            const lineupsHTML = renderPitchAndLineupsForCard(lineups);
                            lineupSectionHTML = `<div class="match-card-footer"><button class="toggle-lineup-btn" data-target="lineup-${fixture.id}">${translations.show_lineup || 'عرض التشكيل'}</button></div><div class="collapsible-lineups" id="lineup-${fixture.id}">${lineupsHTML}</div>`;
                        }
                    }
                    
                    matchWrapper.innerHTML = `<div class="match-card-header"><span>${dateString}</span></div><div class="match-card"><button class="follow-btn" onclick="event.stopPropagation(); toggleFollowMatch(${fixture.id}, this)" data-match-id="${fixture.id}"></button><div class="team home ${homeWinnerClass} ${clickableClass}"><img src="${teams.home.logo}" alt="${teams.home.name}" class="team-logo"><span class="team-name">${teams.home.name}</span></div><div class="match-info"><a href="match-details.html?id=${fixture.id}" class="match-score-link"><span class="match-score">${scoreOrTime}</span><span class="match-status ${statusClass}">${statusHTML}</span></a></div><div class="team away ${awayWinnerClass} ${clickableClass}"><img src="${teams.away.logo}" alt="${teams.away.name}" class="team-logo"><span class="team-name">${teams.away.name}</span></div></div>${lineupSectionHTML}`;
                    container.appendChild(matchWrapper);
                });
            }

            if (renderOptions.showLineups) {
                document.querySelectorAll('.toggle-lineup-btn').forEach(button => {
                    button.addEventListener('click', () => {
                        const target = document.getElementById(button.dataset.target);
                        target.classList.toggle('expanded');
                        button.textContent = target.classList.contains('expanded') ? (translations.hide_lineup || 'إخفاء التشكيل') : (translations.show_lineup || 'عرض التشكيل');
                    });
                });
                document.querySelectorAll('.team-clickable').forEach(teamDiv => {
                    teamDiv.addEventListener('click', (e) => {
                        const lineupBtn = e.currentTarget.closest('.match-wrapper').querySelector('.toggle-lineup-btn');
                        if (lineupBtn) lineupBtn.click();
                    });
                });
            }

            updateFollowButtons();
            startMasterTimer();

        } else {
            if (data.errors && Object.keys(data.errors).length > 0) {
                const errorMsg = Object.values(data.errors).join(', ');
                container.innerHTML = `<p style="text-align: center;">${translations.api_error_message || 'خطأ من المصدر: '}${errorMsg}</p>`;
            } else {
                container.innerHTML = `<p style="text-align: center;" data-i18n-key="${noMatchesKey}">${translations[noMatchesKey] || 'لا توجد مباريات.'}</p>`;
            }
        }
    } catch (error) {
        console.error('Error fetching matches:', error);
        container.innerHTML = `<p style="text-align: center;" data-i18n-key="matches_loading_error">${translations.matches_loading_error || 'حدث خطأ أثناء تحميل المباريات.'}</p>`;
    }
};

// --- END MATCHES LOGIC ---

// --- START PUSH NOTIFICATION SIMULATION ---

let followedMatches = JSON.parse(localStorage.getItem('followedMatches')) || [];

// Function to handle clicking the follow (bell) button
async function toggleFollowMatch(matchId, buttonElement) {
    // NEW: Check for login status first
    const isLoggedIn = !!localStorage.getItem('loggedInUser');
    if (!isLoggedIn) {
        alert(translations.login_to_follow || 'يرجى تسجيل الدخول أولاً لمتابعة المباريات.');
        const currentLang = localStorage.getItem('language') || 'ar';
        const redirectUrl = encodeURIComponent(window.location.href);
        window.location.href = `login.html?lang=${currentLang}&redirect_url=${redirectUrl}`; // Redirect to login page
        return; // Stop the function
    }

    const isFollowed = followedMatches.includes(matchId);

    if (isFollowed) {
        // Unfollow logic
        followedMatches = followedMatches.filter(id => id !== matchId);
        buttonElement.classList.remove('followed');
        alert(translations.notification_unfollow || 'تم إلغاء متابعة المباراة.');
    } else {
        // Follow logic: first, request permission
        const permissionGranted = await requestNotificationPermission();
        if (permissionGranted) {
            followedMatches.push(matchId);
            buttonElement.classList.add('followed');
            alert(translations.notification_follow_success || 'تم تفعيل الإشعارات لهذه المباراة بنجاح!');
        }
    }
    localStorage.setItem('followedMatches', JSON.stringify(followedMatches));
}

// Function to request notification permission from the user
async function requestNotificationPermission() {
    if (!("Notification" in window)) {
        alert(translations.notification_unsupported || 'هذا المتصفح لا يدعم الإشعارات.');
        return false;
    }
    const permission = await Notification.requestPermission();
    if (permission === "granted") return true;
    alert(translations.notification_denied || 'لقد منعت الإشعارات. لتفعيلها، يرجى تغيير الإعدادات في متصفحك.');
    return false;
}

// Function to update the appearance of follow buttons after matches are rendered
function updateFollowButtons() {
    document.querySelectorAll('.follow-btn').forEach(button => {
        const matchId = parseInt(button.dataset.matchId, 10);
        if (followedMatches.includes(matchId)) {
            button.classList.add('followed');
        }
    });
}

// --- END PUSH NOTIFICATION SIMULATION ---

// --- Google Login & User Profile Functions ---

// NEW: Store for site-specific users
let siteUsers = JSON.parse(localStorage.getItem('siteUsers')) || {};

// NEW: Function to handle successful login from any method
function loginSuccess(userData) {
    // حفظ بيانات المستخدم في التخزين المحلي للمتصفح
    localStorage.setItem('loggedInUser', JSON.stringify(userData));

    // Redirect to previous page or home
    const urlParams = new URLSearchParams(window.location.search);
    const redirectUrl = urlParams.get('redirect_url');

    if (redirectUrl) {
        window.location.href = decodeURIComponent(redirectUrl);
    } else {
        const lang = localStorage.getItem('language') || 'ar';
        window.location.href = `index.html?lang=${lang}`;
    }
}

// NEW: Function to register a new user
function registerUser(event) {
    event.preventDefault();
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value.toLowerCase();
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm-password').value;
    const errorElement = document.getElementById('error-message');

    if (password !== confirmPassword) {
        errorElement.textContent = translations.password_mismatch || 'كلمتا المرور غير متطابقتين.';
        errorElement.style.display = 'block';
        return;
    }

    if (siteUsers[email]) {
        errorElement.textContent = translations.email_exists || 'هذا البريد الإلكتروني مسجل بالفعل.';
        errorElement.style.display = 'block';
        return;
    }

    // In a real app, you would hash the password. For this example, we store it directly.
    siteUsers[email] = { name, email, password };
    localStorage.setItem('siteUsers', JSON.stringify(siteUsers));

    alert(translations.signup_success || 'تم إنشاء الحساب بنجاح! يمكنك الآن تسجيل الدخول.');
    window.location.href = 'login.html';
}

// NEW: Function to log in a user with email/password
function loginUser(event) {
    event.preventDefault();
    const email = document.getElementById('login-email').value.toLowerCase();
    const password = document.getElementById('login-password').value;
    const errorElement = document.getElementById('error-message');

    const user = siteUsers[email];

    if (user && user.password === password) {
        const userData = { name: user.name, email: user.email, picture: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=007BFF&color=fff` };
        loginSuccess(userData);
    } else {
        errorElement.textContent = translations.login_error || 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
        errorElement.style.display = 'block';
    }
}

// NEW function to handle header UI
function updateUserHeader() {
    const loggedInUser = localStorage.getItem('loggedInUser');
    const header = document.querySelector('header');
    if (!header) return;

    const loginButton = header.querySelector('.login-btn');
    const existingProfile = header.querySelector('.user-profile');
    const primaryNav = header.querySelector('.primary-navigation');

    // Clean up any existing profile element before proceeding
    if (existingProfile) {
        existingProfile.remove();
    }
    if (loggedInUser) {
        if (loginButton) loginButton.style.display = 'none';

        const userData = JSON.parse(loggedInUser);
        const userProfile = document.createElement('div');
        userProfile.className = 'user-profile';

        // The dropdown structure
        userProfile.innerHTML = `
            <button class="profile-toggle-btn">
                <img src="${userData.picture}" alt="${userData.name}" class="profile-pic">
                <span class="profile-name">${userData.name}</span>
            </button>
            <div class="profile-dropdown">
                <a href="profile.html" data-i18n-key="profile_title">${translations.profile_title || 'الملف الشخصي'}</a>
                <a href="#" onclick="logout()" data-i18n-key="logout_button">${translations.logout_button || 'خروج'}</a>
            </div>
        `;
        primaryNav.appendChild(userProfile);

        // Add event listeners for the new dropdown
        const toggleBtn = userProfile.querySelector('.profile-toggle-btn');
        const dropdown = userProfile.querySelector('.profile-dropdown');

        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('show');
        });

    } else {
        if (loginButton) loginButton.style.display = 'flex'; // Use flex to align with other items
    }
}

// Close dropdown if clicking outside - needs to be accessible globally
window.addEventListener('click', (e) => {
    const dropdown = document.querySelector('.profile-dropdown.show');
    if (dropdown && !dropdown.parentElement.contains(e.target)) {
        dropdown.classList.remove('show');
    }
});

function handleCredentialResponse(response) {
    // response.credential هو توكن JWT
    // لنقوم بفك تشفير التوكن للحصول على بيانات المستخدم (هذا آمن في الواجهة الأمامية)
    const responsePayload = jwt_decode(response.credential);

    const userData = {
        name: responsePayload.name,
        email: responsePayload.email,
        picture: responsePayload.picture,
    };

    loginSuccess(userData);
}

// دالة لفك تشفير JWT (بدون الحاجة لمكتبة خارجية)
function jwt_decode(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error("Error decoding JWT", e);
        return null;
    }
}

// دالة لتسجيل الخروج
function logout() {
    // حذف بيانات المستخدم من التخزين المحلي
    localStorage.removeItem('loggedInUser');
    // إعادة تحميل الصفحة سيؤدي تلقائياً إلى تحديث الواجهة
    window.location.reload();
}

// Main execution on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize translations first
    const urlParams = new URLSearchParams(window.location.search);
    const langFromUrl = urlParams.get('lang');
    const langFromStorage = localStorage.getItem('language');
    
    const currentLang = langFromUrl || langFromStorage || 'ar';
    
    // Save the current language choice for persistence across pages
    localStorage.setItem('language', currentLang);

    await loadTranslations(currentLang);
    applyTranslations(currentLang);
    addHreflangTags(); // Add hreflang tags for SEO

    // Dispatch a custom event to notify other scripts that translations are ready
    document.dispatchEvent(new CustomEvent('translationsLoaded'));

    // NEW: Call the header update function
    updateUserHeader();

    // NEW: Mobile navigation toggle
    const mobileNavToggle = document.querySelector('.mobile-nav-toggle');
    const primaryNav = document.querySelector('.primary-navigation');

    if (mobileNavToggle && primaryNav) {
        mobileNavToggle.addEventListener('click', () => {
            const isVisible = primaryNav.getAttribute('data-visible') === 'true';
            primaryNav.setAttribute('data-visible', !isVisible);
            mobileNavToggle.setAttribute('aria-expanded', !isVisible);
        });
    }

    // Note: updateFollowButtons() is now called inside the fetch functions
    // in live.html and todays-matches.html after the content is loaded.
});