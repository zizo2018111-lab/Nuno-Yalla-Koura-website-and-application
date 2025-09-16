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

// --- START: API Configuration ---
// WARNING: This method exposes your API key in the frontend code.
// For a production application, it's highly recommended to use a backend proxy 
// to keep your API key secure. This change is to make the project work by just opening the HTML files.
const FOOTBALL_API_KEY = '56c90af265b00a872c4441207cc86a27';
const footballApiOptions = {
  method: 'GET',
  headers: {
    'x-apisports-key': FOOTBALL_API_KEY,
    'x-apisports-host': 'v3.football.api-sports.io'
  }
};
// --- END: API Configuration ---

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
    const newsContainer = document.getElementById('news-container');
    if (!newsContainer) return;
    
    // Dummy data for football news as requested
    const dummyNewsData = [
        {
            link: "#news-1",
            title: "الأهلي يفوز على الزمالك في قمة مثيرة بالدوري المصري",
            description: "حقق النادي الأهلي فوزاً غالياً على غريمه التقليدي الزمالك بنتيجة 2-1 في المباراة التي جمعتهما على استاد القاهرة الدولي ضمن منافسات الدوري.",
            image_url: "https://placehold.co/600x400/c1121f/white?text=خبر+عاجل",
            source_id: "يلا كورة",
            pubDate: "2024-06-08T12:00:00Z"
        },
        {
            link: "#news-2",
            title: "محمد صلاح يقود ليفربول لانتصار كبير في البريميرليج",
            description: "تألق النجم المصري محمد صلاح وسجل هدفين ليقود فريقه ليفربول للفوز على مانشستر سيتي بثلاثية نظيفة في مباراة قوية بالدوري الإنجليزي الممتاز.",
            image_url: "https://placehold.co/600x400/00a896/white?text=صلاح+يتألق",
            source_id: "في الجول",
            pubDate: "2024-06-07T18:30:00Z"
        },
        {
            link: "#news-3",
            title: "ريال مدريد يعلن عن صفقة مبابي رسمياً",
            description: "أعلن نادي ريال مدريد الإسباني بشكل رسمي عن توقيعه مع النجم الفرنسي كيليان مبابي في صفقة انتقال حر قادماً من باريس سان جيرمان.",
            image_url: "https://placehold.co/600x400/f2e9e4/black?text=صفقة+الموسم",
            source_id: "ماركا",
            pubDate: "2024-06-06T10:00:00Z"
        },
        {
            link: "#news-4",
            title: "برشلونة يواجه صعوبات مالية في تسجيل لاعبيه الجدد",
            description: "يواجه نادي برشلونة أزمة في تسجيل لاعبيه الجدد بسبب قوانين اللعب المالي النظيف، والإدارة تعمل على إيجاد حلول سريعة قبل بداية الموسم.",
            image_url: "https://placehold.co/600x400/023e8a/white?text=أزمة+برشلونة",
            source_id: "سبورت",
            pubDate: "2024-06-05T15:20:00Z"
        },
        {
            link: "#news-5",
            title: "بث مباشر: شاهد مباراة نهائي دوري أبطال أوروبا",
            description: "لا تفوت مشاهدة البث المباشر لنهائي دوري أبطال أوروبا بين بايرن ميونخ ومانشستر يونايتد. تغطية حصرية على موقعنا.",
            image_url: "https://placehold.co/600x400/ff0000/white?text=بث+مباشر",
            source_id: "نونو يلا كورة",
            pubDate: "2024-06-04T20:00:00Z"
        },
        {
            link: "#news-6",
            title: "منتخب مصر يستعد لمواجهة بوركينا فاسو في تصفيات كأس العالم",
            description: "يدخل منتخب مصر معسكراً مغلقاً استعداداً للمباراة الهامة أمام بوركينا فاسو في الجولة الثالثة من تصفيات كأس العالم 2026.",
            image_url: "https://placehold.co/600x400/700a0e/white?text=منتخب+مصر",
            source_id: "كورة بلس",
            pubDate: "2024-06-03T11:45:00Z"
        },
        {
            link: "#news-7",
            title: "تحليل تكتيكي: كيف تفوق جوارديولا على كلوب؟",
            description: "تحليل فني للمباراة الأخيرة بين مانشستر سيتي وليفربول، وكيف استطاع بيب جوارديولا حسم اللقاء تكتيكياً.",
            image_url: "https://placehold.co/600x400/4a4e69/white?text=تحليل+تكتيكي",
            source_id: "The Athletic",
            pubDate: "2024-06-02T09:00:00Z"
        },
        {
            link: "#news-8",
            title: "أخبار انتقالات صيف 2024: كل ما تريد معرفته",
            description: "متابعة حية ومستمرة لآخر أخبار سوق الانتقالات الصيفية في أوروبا، وأبرز الصفقات المحتملة للأندية الكبرى.",
            image_url: "https://placehold.co/600x400/8338ec/white?text=الميركاتو",
            source_id: "فابريزيو رومانو",
            pubDate: "2024-06-01T22:10:00Z"
        }
    ];

    // Simulate an API call
    newsContainer.innerHTML = `<p style="text-align: center;" data-i18n-key="news_loading">${translations.news_loading || 'جاري تحميل الأخبار...'}</p>`;
    
    // Use a timeout to make it feel like a real fetch
    setTimeout(() => {
        renderNews(dummyNewsData, newsContainer, pageSize);
    }, 500); // 0.5 second delay
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

// NEW: Function to render dummy matches when API returns none
const renderDummyMatches = (container, renderOptions) => {
    const dummyMatches = [
        {
            fixture: { id: 999901, status: { short: '1H', long: 'First Half', elapsed: 30 }, date: new Date().toISOString() },
            teams: { home: { name: 'ليفربول', logo: 'https://media.api-sports.io/football/teams/40.png' }, away: { name: 'مانشستر سيتي', logo: 'https://media.api-sports.io/football/teams/50.png' } },
            goals: { home: 1, away: 0 },
            league: { name: 'مباريات ودية', logo: 'https://media.api-sports.io/football/leagues/39.png' },
            lineups: []
        },
        {
            fixture: { id: 999902, status: { short: 'NS', long: 'Not Started' }, date: new Date(new Date().setHours(22, 0, 0)).toISOString() },
            teams: { home: { name: 'الأهلي', logo: 'https://media.api-sports.io/football/teams/105.png' }, away: { name: 'الزمالك', logo: 'https://media.api-sports.io/football/teams/109.png' } },
            goals: { home: null, away: null },
            league: { name: 'مباريات ودية', logo: 'https://media.api-sports.io/football/leagues/233.png' },
            lineups: []
        },
        {
            fixture: { id: 999903, status: { short: 'FT', long: 'Match Finished' }, date: new Date(new Date().setHours(18, 0, 0)).toISOString() },
            teams: { home: { name: 'ريال مدريد', logo: 'https://media.api-sports.io/football/teams/541.png' }, away: { name: 'برشلونة', logo: 'https://media.api-sports.io/football/teams/529.png' } },
            goals: { home: 3, away: 2 },
            league: { name: 'مباريات ودية', logo: 'https://media.api-sports.io/football/leagues/140.png' },
            lineups: []
        }
    ];

    container.innerHTML = ''; // Clear loading/no matches message
    const leagueHeader = document.createElement('div');
    leagueHeader.className = 'league-header';
    leagueHeader.innerHTML = `<img src="${dummyMatches[0].league.logo}" alt="مباريات ودية" class="league-logo"><h4>مباريات ودية (بيانات وهمية)</h4>`;
    container.appendChild(leagueHeader);

    dummyMatches.forEach(match => {
        const { fixture, teams, goals } = match;
        let scoreOrTime = '', statusHTML = '', statusClass = 'upcoming';
        const shortStatus = fixture.status.short;
        const timeString = new Date(fixture.date).toLocaleTimeString((localStorage.getItem('language') || 'ar'), { hour: '2-digit', minute: '2-digit' });

        if (shortStatus === '1H') {
            scoreOrTime = `${goals.home ?? 0} - ${goals.away ?? 0}`;
            statusClass = 'live';
            statusHTML = `<span class="match-timer">${fixture.status.elapsed}'</span><span class="whistle-icon"></span>`;
        } else if (shortStatus === 'FT') {
            scoreOrTime = `${goals.home} - ${goals.away}`;
            statusClass = 'finished';
            statusHTML = translations.status_finished || 'انتهت';
        } else { // NS
            scoreOrTime = timeString;
            statusClass = 'upcoming';
            statusHTML = translations.status_not_started || 'لم تبدأ';
        }

        let homeWinnerClass = '', awayWinnerClass = '';
        if (statusClass === 'finished' && goals.home > goals.away) homeWinnerClass = 'winner';
        if (statusClass === 'finished' && goals.away > goals.home) awayWinnerClass = 'winner';

        const matchWrapper = document.createElement('div');
        matchWrapper.className = 'match-wrapper';
        matchWrapper.innerHTML = `
            <div class="match-card-header"><span>بيانات تجريبية</span></div>
            <div class="match-card">
                <div class="team home ${homeWinnerClass}"><img src="${teams.home.logo}" alt="${teams.home.name}" class="team-logo"><span class="team-name">${teams.home.name}</span></div>
                <div class="match-info"><a href="#" onclick="event.preventDefault()" class="match-score-link"><span class="match-score">${scoreOrTime}</span><span class="match-status ${statusClass}">${statusHTML}</span></a></div>
                <div class="team away ${awayWinnerClass}"><img src="${teams.away.logo}" alt="${teams.away.name}" class="team-logo"><span class="team-name">${teams.away.name}</span></div>
            </div>`;
        container.appendChild(matchWrapper);
    });
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
    
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `<p style="text-align: center;" data-i18n-key="loading_matches">${translations.loading_matches || 'جاري تحميل المباريات...'}</p>`;
    liveMatchTimers = []; // Reset timers for each fetch
    
    const targetUrl = `https://v3.football.api-sports.io/fixtures?${endpoint}`;

    try {
        const response = await fetch(targetUrl, footballApiOptions);
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
                    // Add data-match-id to the wrapper for easier DOM manipulation
                    matchWrapper.setAttribute('data-match-id', fixture.id);
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
                    
                    const isFollowed = followedMatches.includes(fixture.id);
                    // On profile page, all matches are followed by definition.
                    const followButtonClass = (renderOptions.isProfilePage || isFollowed) ? 'follow-btn followed' : 'follow-btn';

                    matchWrapper.innerHTML = `<div class="match-card-header"><span>${dateString}</span></div><div class="match-card"><button class="${followButtonClass}" onclick="event.stopPropagation(); toggleFollowMatch(${fixture.id}, this)" data-match-id="${fixture.id}"></button><div class="team home ${homeWinnerClass} ${clickableClass}"><img src="${teams.home.logo}" alt="${teams.home.name}" class="team-logo"><span class="team-name">${teams.home.name}</span></div><div class="match-info"><a href="match-details.html?id=${fixture.id}" class="match-score-link"><span class="match-score">${scoreOrTime}</span><span class="match-status ${statusClass}">${statusHTML}</span></a></div><div class="team away ${awayWinnerClass} ${clickableClass}"><img src="${teams.away.logo}" alt="${teams.away.name}" class="team-logo"><span class="team-name">${teams.away.name}</span></div></div>${lineupSectionHTML}`;
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
                // If no matches, render dummy matches instead of an empty message
                renderDummyMatches(container, renderOptions);
            }
        }
    } catch (error) {
        console.error('Error fetching matches:', error);
        // If fetch fails, render dummy matches
        renderDummyMatches(container, renderOptions);
    }
};

// --- START MATCH DETAILS LOGIC (Centralized) ---

const fetchMatchDetailsPage = async () => {
    const matchDetailsContainer = document.getElementById('match-details-container');
    if (!matchDetailsContainer) return;

    const urlParams = new URLSearchParams(window.location.search);
    const matchId = urlParams.get('id');

    if (!matchId) {
        matchDetailsContainer.innerHTML = '<h2 style="text-align: center;">لم يتم تحديد المباراة.</h2>';
        return;
    }

    const fixtureTargetUrl = `https://v3.football.api-sports.io/fixtures?id=${matchId}`;
    const playersTargetUrl = `https://v3.football.api-sports.io/fixtures/players?fixture=${matchId}`;

    try {
        const [fixtureResponse, playersResponse] = await Promise.all([
            fetch(fixtureTargetUrl, footballApiOptions),
            fetch(playersTargetUrl, footballApiOptions)
        ]);

        const fixtureData = await fixtureResponse.json();
        const playersData = await playersResponse.json();

        if (fixtureData.response && fixtureData.response.length > 0) {
            const playerPhotos = {};
            if (playersData.response && playersData.response.length > 0) {
                playersData.response.forEach(team => {
                    team.players.forEach(player => {
                        playerPhotos[player.player.id] = player.player.photo;
                    });
                });
            }
            renderMatchDetails(fixtureData.response[0], playerPhotos);
        } else {
            matchDetailsContainer.innerHTML = '<h2 style="text-align: center;">لم يتم العثور على تفاصيل المباراة.</h2>';
        }
    } catch (error) {
        console.error('Error fetching match details:', error);
        matchDetailsContainer.innerHTML = '<p style="text-align: center;">حدث خطأ أثناء تحميل تفاصيل المباراة.</p>';
    }
};

const renderMatchDetails = (match, playerPhotos) => {
    const { fixture, teams, goals, league, events, lineups } = match;
    const matchDetailsContainer = document.getElementById('match-details-container');

    // --- DYNAMIC SEO & BREADCRUMB ---
    const matchTitle = `${teams.home.name} ضد ${teams.away.name}`;
    document.title = `${matchTitle} - نونو يلا كورة`;

    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) metaDescription.setAttribute('content', `تفاصيل مباراة ${matchTitle} - التشكيلات، الأهداف، والإحصائيات الكاملة لحظة بلحظة على نونو يلا كورة.`);
    
    const metaKeywords = document.querySelector('meta[name="keywords"]');
    if (metaKeywords) metaKeywords.setAttribute('content', `مباراة ${matchTitle}, تشكيلة ${teams.home.name}, تشكيلة ${teams.away.name}, أهداف المباراة, إحصائيات المباراة, ${league.name}`);

    const breadcrumbCurrent = document.querySelector('nav[aria-label="breadcrumb"] li span[aria-current="page"]');
    if (breadcrumbCurrent) breadcrumbCurrent.textContent = matchTitle;

    const structuredDataScript = document.querySelector('script[type="application/ld+json"]');
    if (structuredDataScript) {
        try {
            const structuredData = JSON.parse(structuredDataScript.textContent);
            if (structuredData.itemListElement && structuredData.itemListElement.length > 2) {
                structuredData.itemListElement[2].name = matchTitle;
                structuredData.itemListElement[2].item = window.location.href;
                structuredDataScript.textContent = JSON.stringify(structuredData, null, 2);
            }
        } catch (e) { console.error("Failed to parse or update structured data", e); }
    }

    // Add SportsEvent Structured Data for SEO
    const sportsEventSchema = {
        "@context": "https://schema.org",
        "@type": "SportsEvent",
        "name": `${teams.home.name} vs ${teams.away.name}`,
        "startDate": fixture.date,
        "location": {
            "@type": "Place",
            "name": fixture.venue.name,
            "address": fixture.venue.city
        },
        "homeTeam": {
            "@type": "SportsTeam",
            "name": teams.home.name
        },
        "awayTeam": {
            "@type": "SportsTeam",
            "name": teams.away.name
        },
        // Simplified status mapping for schema.org
        "eventStatus": ['FT', 'AET', 'PEN'].includes(fixture.status.short) ? "https://schema.org/EventCompleted" : "https://schema.org/EventScheduled"
    };

    // Remove any old schema script before adding a new one
    const oldSchema = document.getElementById('sports-event-schema');
    if(oldSchema) oldSchema.remove();

    const schemaScript = `<script type="application/ld+json" id="sports-event-schema">${JSON.stringify(sportsEventSchema)}</script>`;

    let statusClass = 'upcoming';
    if (['FT', 'AET', 'PEN'].includes(fixture.status.short)) statusClass = 'finished';
    if (['1H', 'HT', '2H', 'ET', 'P', 'LIVE'].includes(fixture.status.short)) statusClass = 'live';

    let homeWinnerClass = '', awayWinnerClass = '';
    if (statusClass === 'finished' && goals.home !== null && goals.away !== null) {
        if (goals.home > goals.away) homeWinnerClass = 'winner';
        else if (goals.away > goals.home) awayWinnerClass = 'winner';
    }

    let statusDisplay = fixture.status.long;
    if (statusClass === 'live') {
        statusDisplay = `<span class="live-text">${fixture.status.long}</span> <span class="live-indicator"></span>`;
    }

    const headerHTML = `
        <section class="match-header">
            <div class="team team-a ${homeWinnerClass}"><img src="${teams.home.logo}" alt="${teams.home.name}" class="team-logo-large"><h2>${teams.home.name}</h2></div>
            <div class="score-details"><span class="final-score">${goals.home ?? ''} - ${goals.away ?? ''}</span><span class="match-status ${statusClass}">${statusDisplay}</span><span class="match-tournament">${league.name} - ${league.round}</span></div>
            <div class="team team-b ${awayWinnerClass}"><img src="${teams.away.logo}" alt="${teams.away.name}" class="team-logo-large"><h2>${teams.away.name}</h2></div>
        </section>`;

    const renderPitchAndLineups = (lineups, photos) => {
        if (!lineups || lineups.length < 2 || !lineups[0].startXI || lineups[0].startXI.length === 0) {
            return `<section class="lineups-section"><h3 data-i18n-key="lineups_title">${translations.lineups_title || 'التشكيلات'}</h3><p style="text-align:center;">${translations.lineups_unavailable || 'التشكيل غير متاح حالياً لهذه المباراة.'}</p></section>`;
        }

        const homeLineup = lineups[0];
        const awayLineup = lineups[1];

        const getPlayerMarkers = (players, isHome, teamPhotos) => {
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
                    const photoUrl = teamPhotos[p.player.id];
                    let markerIconHTML = photoUrl ? `<div class="player-photo-container"><img src="${photoUrl}" alt="${p.player.name}" class="player-photo"><span class="player-number-badge">${p.player.number || '?'}</span></div>` : `<div class="player-shirt">${p.player.number || '?'}</div>`;
                    markersHTML += `<div class="player-marker" style="top: ${topPercent}%; left: ${leftPercent}%;">${markerIconHTML}<span class="player-name">${p.player.name}</span></div>`;
                });
            }
            return markersHTML;
        };

        const renderSubstitutesList = (players) => {
            if (!players || players.length === 0) return '';
            return `<ul>${players.map(p => `<li><span class="player-number">${p.player.number || '?'}</span> ${p.player.name}</li>`).join('')}</ul>`;
        };

        const homeStarters = getPlayerMarkers(homeLineup.startXI, true, photos);
        const awayStarters = getPlayerMarkers(awayLineup.startXI, false, photos);

        return `
            <section class="lineups-section">
                <h3 data-i18n-key="lineups_title">${translations.lineups_title || 'التشكيلات'}</h3>
                <div class="pitch-view">
                    <div class="lineup-title">${homeLineup.team.name} (${homeLineup.formation || ''}) vs ${awayLineup.team.name} (${awayLineup.formation || ''})</div>
                    <div class="pitch"><div class="home-team">${homeStarters}</div><div class="away-team">${awayStarters}</div></div>
                </div>
                <div class="lineups-container">
                    <div class="lineup-list"><h5>${translations.substitutes || 'البدلاء'} (${homeLineup.team.name})</h5>${renderSubstitutesList(homeLineup.substitutes)}</div>
                    <div class="lineup-list"><h5>${translations.substitutes || 'البدلاء'} (${awayLineup.team.name})</h5>${renderSubstitutesList(awayLineup.substitutes)}</div>
                </div>
            </section>`;
    };
    const lineupsHTML = renderPitchAndLineups(lineups, playerPhotos);

    let eventsHTML = '';
    if (events && events.length > 0) {
        eventsHTML = '<section class="events-timeline"><h3>أحداث المباراة</h3><ul>';
        events.forEach(event => {
            let icon = '', details = '', eventClass = '';
            if (event.type === 'Goal') {
                icon = '<span class="event-icon goal-icon"></span>'; eventClass = 'goal';
                details = `هدف! سجله <strong>${event.player.name}</strong> (${event.team.name})`;
                if (event.assist.name) details += ` بمساعدة <strong>${event.assist.name}</strong>`;
            } else if (event.type === 'Card') {
                eventClass = event.detail === 'Yellow Card' ? 'card-yellow' : 'card-red';
                icon = `<span class="event-icon card-icon ${eventClass}"></span>`;
                details = `بطاقة ${event.detail === 'Yellow Card' ? 'صفراء' : 'حمراء'} لـ <strong>${event.player.name}</strong> (${event.team.name})`;
            } else if (event.type === 'subst') {
                icon = '<span class="event-icon subst-icon"></span>'; eventClass = 'substitution';
                details = `تبديل (${event.team.name}): دخول <strong>${event.assist.name}</strong> وخروج <strong>${event.player.name}</strong>`;
            }

            if (icon) {
                eventsHTML += `<li class="event ${eventClass}"><span class="time">'${event.time.elapsed}${event.time.extra ? '+' + event.time.extra : ''}</span><span class="icon">${icon}</span><span class="event-details">${details}</span></li>`;
            }
        });
        eventsHTML += '</ul></section>';
    }

    // Social Sharing Section
    const shareUrl = window.location.href;
    const shareTitle = encodeURIComponent(document.title);
    const socialShareHTML = `
        <section class="social-share">
            <h4 data-i18n-key="share_on">${translations.share_on || 'شارك عبر:'}</h4>
            <div class="social-share-buttons">
                <a href="https://www.facebook.com/sharer/sharer.php?u=${shareUrl}" target="_blank" rel="noopener noreferrer" class="share-btn-facebook" data-i18n-key="share_on_facebook">${translations.share_on_facebook || 'فيسبوك'}</a>
                <a href="https://twitter.com/intent/tweet?url=${shareUrl}&text=${shareTitle}" target="_blank" rel="noopener noreferrer" class="share-btn-twitter" data-i18n-key="share_on_twitter">${translations.share_on_twitter || 'تويتر'}</a>
                <a href="https://api.whatsapp.com/send?text=${shareTitle}%20${shareUrl}" target="_blank" rel="noopener noreferrer" class="share-btn-whatsapp" data-i18n-key="share_on_whatsapp">${translations.share_on_whatsapp || 'واتساب'}</a>
            </div>
        </section>
    `;

    matchDetailsContainer.innerHTML = schemaScript + headerHTML + lineupsHTML + eventsHTML + socialShareHTML;
};

// --- END MATCH DETAILS LOGIC ---

// --- START STANDINGS & TOPSCORERS LOGIC ---

const popularLeagues = [
    { id: 39, name: 'الدوري الإنجليزي' },
    { id: 140, name: 'الدوري الإسباني' },
    { id: 135, name: 'الدوري الإيطالي' },
    { id: 78, name: 'الدوري الألماني' },
    { id: 233, name: 'الدوري المصري' },
    { id: 203, name: 'الدوري السعودي' },
];

// Function to generate league selector buttons
const generateLeagueSelector = (containerId, callback) => {
    const container = document.getElementById(containerId);
    if (!container) return;

    popularLeagues.forEach(league => {
        const button = document.createElement('button');
        button.textContent = league.name;
        button.dataset.leagueId = league.id;
        container.appendChild(button);
    });

    container.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            // Remove active class from all buttons
            container.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
            // Add active class to the clicked button
            e.target.classList.add('active');
            // Execute the callback with the league ID
            const leagueId = e.target.dataset.leagueId;
            callback(leagueId);
        }
    });
};

// Function to fetch and render league standings
const fetchAndRenderStandings = async (leagueId) => {
    const container = document.getElementById('standings-container');
    if (!container) return;
    container.innerHTML = `<p style="text-align: center;">${translations.loading_matches || 'جاري التحميل...'}</p>`;

    const season = new Date().getFullYear(); // Use current year as season
    const targetUrl = `https://v3.football.api-sports.io/standings?league=${leagueId}&season=${season}`;

    try {
        const response = await fetch(targetUrl, footballApiOptions);
        const data = await response.json();

        if (data.response && data.response.length > 0) {
            const standings = data.response[0].league.standings[0];
            let tableHTML = `
                <table class="standings-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th style="text-align: right;" data-i18n-key="standings_table_team">${translations.standings_table_team || 'الفريق'}</th>
                            <th data-i18n-key="standings_table_played">${translations.standings_table_played || 'لعب'}</th>
                            <th data-i18n-key="standings_table_wins">${translations.standings_table_wins || 'ف'}</th>
                            <th data-i18n-key="standings_table_draws">${translations.standings_table_draws || 'ت'}</th>
                            <th data-i18n-key="standings_table_losses">${translations.standings_table_losses || 'خ'}</th>
                            <th data-i18n-key="standings_table_gd">${translations.standings_table_gd || 'ف.أ'}</th>
                            <th data-i18n-key="standings_table_points">${translations.standings_table_points || 'نقاط'}</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            standings.forEach(team => {
                tableHTML += `
                    <tr>
                        <td class="rank-cell">${team.rank}</td>
                        <td class="team-cell">
                            <img src="${team.team.logo}" alt="${team.team.name}" class="team-logo">
                            <span>${team.team.name}</span>
                        </td>
                        <td>${team.all.played}</td>
                        <td>${team.all.win}</td>
                        <td>${team.all.draw}</td>
                        <td>${team.all.lose}</td>
                        <td>${team.goalsDiff}</td>
                        <td class="rank-cell">${team.points}</td>
                    </tr>
                `;
            });
            tableHTML += `</tbody></table>`;
            container.innerHTML = tableHTML;
        } else {
            container.innerHTML = `<p style="text-align: center;">لا توجد بيانات ترتيب متاحة لهذا الدوري حالياً.</p>`;
        }
    } catch (error) {
        console.error('Error fetching standings:', error);
        container.innerHTML = `<p style="text-align: center;">حدث خطأ أثناء تحميل جدول الترتيب.</p>`;
    }
};

// Function to fetch and render top scorers
const fetchAndRenderTopScorers = async (leagueId, containerId = 'topscorers-container', limit = null) => {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = `<p style="text-align: center;">${translations.loading_matches || 'جاري التحميل...'}</p>`;

    const season = new Date().getFullYear();
    const targetUrl = `https://v3.football.api-sports.io/players/topscorers?league=${leagueId}&season=${season}`;

    try {
        const response = await fetch(targetUrl, footballApiOptions);
        const data = await response.json();

        if (data.response && data.response.length > 0) {
            let listHTML = `<ul class="topscorers-list">`;
            const scorersToShow = limit ? data.response.slice(0, limit) : data.response;
            scorersToShow.forEach((scorer, index) => {
                const player = scorer.player;
                const stats = scorer.statistics[0];
                listHTML += `
                    <li>
                        <span class="scorer-rank">${index + 1}</span>
                        <img src="${player.photo}" alt="${player.name}" class="scorer-photo">
                        <div class="scorer-info">
                            <div class="name">${player.name}</div>
                            <div class="team">${stats.team.name}</div>
                        </div>
                        <div class="scorer-stats">
                            <div>
                                <div class="stat-value">${stats.goals.total}</div>
                                <div class="stat-label" data-i18n-key="topscorers_table_goals">${translations.topscorers_table_goals || 'أهداف'}</div>
                            </div>
                            <div>
                                <div class="stat-value">${stats.goals.assists || 0}</div>
                                <div class="stat-label" data-i18n-key="topscorers_table_assists">${translations.topscorers_table_assists || 'صناعة'}</div>
                            </div>
                            <div>
                                <div class="stat-value">${stats.games.appearences}</div>
                                <div class="stat-label" data-i18n-key="standings_table_played">${translations.standings_table_played || 'لعب'}</div>
                            </div>
                        </div>
                    </li>
                `;
            });
            listHTML += `</ul>`;
            container.innerHTML = listHTML;
        } else {
            container.innerHTML = `<p style="text-align: center;">لا توجد بيانات هدافين متاحة لهذا الدوري حالياً.</p>`;
        }
    } catch (error) {
        console.error('Error fetching top scorers:', error);
        container.innerHTML = `<p style="text-align: center;">حدث خطأ أثناء تحميل قائمة الهدافين.</p>`;
    }
};

// --- END STANDINGS & TOPSCORERS LOGIC ---

// --- START WIDGETS LOGIC ---

const renderPopularLeaguesWidget = (containerId) => {
    const container = document.getElementById(containerId);
    if (!container) return;
    const currentLang = localStorage.getItem('language') || 'ar';
    let html = '';
    // Use a subset for the homepage widget
    popularLeagues.slice(0, 6).forEach(league => {
        // Assuming logo URL pattern holds. This is a reasonable assumption for this kind of API.
        const logoUrl = `https://media.api-sports.io/football/leagues/${league.id}.png`;
        html += `<a href="standings.html?lang=${currentLang}&leagueId=${league.id}" class="league-widget-item">
                    <img src="${logoUrl}" alt="${league.name}">
                    <span>${league.name}</span>
                 </a>`;
    });
    container.innerHTML = html;
};

// --- END WIDGETS LOGIC ---

// --- START LEAGUES LIST LOGIC ---

// NEW: Add followedLeagues from localStorage
let followedLeagues = JSON.parse(localStorage.getItem('followedLeagues')) || [];

// NEW: Function to toggle following a league
function toggleFollowLeague(leagueId, buttonElement) {
    const isLoggedIn = !!localStorage.getItem('loggedInUser');
    if (!isLoggedIn) {
        alert(translations.login_to_follow_leagues || 'يرجى تسجيل الدخول لمتابعة الدوريات.');
        const currentLang = localStorage.getItem('language') || 'ar';
        const redirectUrl = encodeURIComponent(window.location.href);
        window.location.href = `login.html?lang=${currentLang}&redirect_url=${redirectUrl}`;
        return;
    }

    const isFollowed = followedLeagues.includes(leagueId);

    if (isFollowed) {
        followedLeagues = followedLeagues.filter(id => id !== leagueId);
        if (buttonElement) buttonElement.classList.remove('followed');
        // If on profile page, remove the card
        if (window.location.pathname.includes('profile.html')) {
            const leagueToRemove = document.querySelector(`.league[data-league-id="${leagueId}"]`);
            if (leagueToRemove) leagueToRemove.remove();
            
            const container = document.getElementById('followed-leagues-container');
            if (container && container.children.length === 0) {
                 container.innerHTML = `<p style="text-align: center;" data-i18n-key="no_followed_leagues">${translations.no_followed_leagues || 'أنت لا تتابع أي دوريات حالياً.'}</p>`;
            }
        }
    } else {
        followedLeagues.push(leagueId);
        if (buttonElement) buttonElement.classList.add('followed');
    }
    localStorage.setItem('followedLeagues', JSON.stringify(followedLeagues));
}

const renderLeagueItem = (item, container) => {
    const league = item.league;
    const country = item.country;
    const seasons = item.seasons.map(s => s.year).join(' - ');
    
    const isFollowed = followedLeagues.includes(league.id);
    const followButtonClass = isFollowed ? 'follow-btn followed' : 'follow-btn';
    const currentLang = localStorage.getItem('language') || 'ar';

    const leagueHTML = `
      <div class="league" data-league-id="${league.id}">
        <button class="${followButtonClass}" onclick="toggleFollowLeague(${league.id}, this)"></button>
        <img src="${league.logo}" alt="${league.name} logo">
        <div class="league-info">
            <a href="standings.html?lang=${currentLang}&leagueId=${league.id}"><strong>${league.name}</strong> (${country.name})</a><br>
            <small>🗓️ <span data-i18n-key="available_seasons">${translations.available_seasons || 'المواسم المتاحة'}:</span> ${seasons}</small>
        </div>
      </div>
    `;
    container.innerHTML += leagueHTML;
};

const fetchAndRenderLeagues = async () => {
    const container = document.getElementById('leagues-container');
    if (!container) return;
    container.innerHTML = `<p style="text-align: center;">${translations.loading_matches || 'جاري التحميل...'}</p>`;

    const targetUrl = `https://v3.football.api-sports.io/leagues`;

    try {
        const response = await fetch(targetUrl, footballApiOptions);
        const data = await response.json();

        if (data.response && data.response.length > 0) {
            container.innerHTML = ''; // Clear loading message
            data.response.forEach(item => {
                renderLeagueItem(item, container);
            });
        } else {
            container.innerHTML = `<p style="text-align: center;">لا توجد بيانات دوريات متاحة حالياً.</p>`;
        }
    } catch (error) {
        console.error('Error fetching leagues:', error);
        container.innerHTML = `<p style="text-align: center;">حدث خطأ أثناء تحميل قائمة الدوريات.</p>`;
    }
};

// NEW: Function to render followed leagues on profile page
const fetchAndRenderFollowedLeagues = async () => {
    const container = document.getElementById('followed-leagues-container');
    if (!container) return;

    const followedLeagueIds = JSON.parse(localStorage.getItem('followedLeagues')) || [];

    if (followedLeagueIds.length === 0) {
        container.innerHTML = `<p style="text-align: center;" data-i18n-key="no_followed_leagues">${translations.no_followed_leagues || 'أنت لا تتابع أي دوريات حالياً.'}</p>`;
        return;
    }

    container.innerHTML = `<p style="text-align: center;">${translations.loading_matches || 'جاري التحميل...'}</p>`;

    // As API doesn't support multiple IDs, we fetch all and filter.
    const targetUrl = `https://v3.football.api-sports.io/leagues`;

    try {
        const response = await fetch(targetUrl, footballApiOptions);
        const data = await response.json();

        if (data.response && data.response.length > 0) {
            const followedLeaguesData = data.response.filter(item => followedLeagueIds.includes(item.league.id));
            
            if (followedLeaguesData.length > 0) {
                container.innerHTML = ''; // Clear loading message
                followedLeaguesData.forEach(item => {
                    renderLeagueItem(item, container);
                });
            } else {
                 container.innerHTML = `<p style="text-align: center;" data-i18n-key="no_followed_leagues">${translations.no_followed_leagues || 'أنت لا تتابع أي دوريات حالياً.'}</p>`;
            }
        } else {
            container.innerHTML = `<p style="text-align: center;">لا توجد بيانات دوريات متاحة حالياً.</p>`;
        }
    } catch (error) {
        console.error('Error fetching leagues:', error);
        container.innerHTML = `<p style="text-align: center;">حدث خطأ أثناء تحميل قائمة الدوريات.</p>`;
    }
}

// --- END LEAGUES LIST LOGIC ---

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

        // If on profile page, remove the card from the DOM to reflect the change instantly
        if (window.location.pathname.includes('profile.html')) {
            const cardToRemove = document.querySelector(`.match-wrapper[data-match-id="${matchId}"]`);
            if (cardToRemove) {
                cardToRemove.remove();
                const container = document.getElementById('followed-matches-container');
                if (container && container.children.length === 0) {
                    container.innerHTML = `<p style="text-align: center;" data-i18n-key="no_followed_matches">${translations.no_followed_matches || 'أنت لا تتابع أي مباريات حالياً.'}</p>`;
                }
            }
        }
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

// --- START THEME SWITCHER ---

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);

    const toggle = document.getElementById('theme-toggle');
    if (toggle) {
        toggle.setAttribute('title', theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن');
    }

    // Re-initialize or hide particle animation based on theme, only on homepage
    if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
        initParticleAnimation();
    }
}

function initThemeSwitcher() {
    const toggle = document.getElementById('theme-toggle');
    if (toggle) {
        toggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            setTheme(newTheme);
        });
    }

    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    setTheme(savedTheme || (prefersDark ? 'dark' : 'light'));
}

// --- END THEME SWITCHER ---

// --- START PARTICLE ANIMATION ---

function initParticleAnimation() {
    const canvas = document.getElementById('particle-canvas');
    // Only run if the canvas exists (i.e., on the homepage)
    if (!canvas) return;

    // NEW: Check if we are in dark mode
    if (document.documentElement.getAttribute('data-theme') !== 'dark') {
        canvas.style.display = 'none';
        // If there's an active animation frame, cancel it
        if (window.particleAnimationId) {
            cancelAnimationFrame(window.particleAnimationId);
            const ctx = canvas.getContext('2d');
            if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        return;
    }
    canvas.style.display = 'block';

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let particlesArray;

    // Particle class
    const mouse = {
        x: null,
        y: null,
        radius: (canvas.height / 100) * (canvas.width / 100)
    };

    window.addEventListener('mousemove', (event) => { mouse.x = event.x; mouse.y = event.y; });
    class Particle {
        constructor(x, y, directionX, directionY, size, color) {
            this.x = x;
            this.y = y;
            this.directionX = directionX;
            this.directionY = directionY;
            this.size = size;
            this.color = color;
        }

        // Method to draw individual particle
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
            ctx.fillStyle = this.color;
            ctx.fill();
        }

        // Method to update particle position
        update() {
            if (this.x > canvas.width || this.x < 0) {
                this.directionX = -this.directionX;
            }
            if (this.y > canvas.height || this.y < 0) {
                this.directionY = -this.directionY;
            }
            this.x += this.directionX;
            this.y += this.directionY;
            this.draw();
        }
    }

    // Create particle array
    function init() {
        particlesArray = [];
        let numberOfParticles = (canvas.height * canvas.width) / 12000;
        for (let i = 0; i < numberOfParticles; i++) {
            let size = (Math.random() * 2.5) + 1;
            let x = (Math.random() * ((innerWidth - size * 2) - (size * 2)) + size * 2);
            let y = (Math.random() * ((innerHeight - size * 2) - (size * 2)) + size * 2);
            let directionX = (Math.random() * .6) - .3;
            let directionY = (Math.random() * .6) - .3;
            let color = 'rgba(201, 209, 217, 0.8)';

            particlesArray.push(new Particle(x, y, directionX, directionY, size, color));
        }
    }

    // Check if particles are close to each other and draw a line
    function connect() {
        let opacityValue = 1;
        for (let a = 0; a < particlesArray.length; a++) {
            for (let b = a; b < particlesArray.length; b++) {
                let distance = ((particlesArray[a].x - particlesArray[b].x) * (particlesArray[a].x - particlesArray[b].x)) +
                               ((particlesArray[a].y - particlesArray[b].y) * (particlesArray[a].y - particlesArray[b].y));

                if (distance < (canvas.width / 7) * (canvas.height / 7)) {
                    opacityValue = 1 - (distance / 20000);
                    let dx = mouse.x - particlesArray[a].x;
                    let dy = mouse.y - particlesArray[a].y;
                    let mouseDistance = Math.sqrt(dx * dx + dy * dy);
                    if (mouseDistance < mouse.radius) {
                        ctx.strokeStyle = `rgba(88, 166, 255, ${opacityValue})`; // Brighter blue on mouse hover
                    } else {
                        ctx.strokeStyle = `rgba(201, 209, 217, ${opacityValue})`;
                    }
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(particlesArray[a].x, particlesArray[a].y);
                    ctx.lineTo(particlesArray[b].x, particlesArray[b].y);
                    ctx.stroke();
                }
            }
        }
    }

    // Animation loop
    function animate() {
        window.particleAnimationId = requestAnimationFrame(animate);
        ctx.clearRect(0, 0, innerWidth, innerHeight);

        for (let i = 0; i < particlesArray.length; i++) {
            particlesArray[i].update();
        }
        connect();
    }

    // Resize event
    window.addEventListener('resize', () => {
        canvas.width = innerWidth;
        canvas.height = innerHeight;
        init();
    });

    init();
    animate();
}

// --- END PARTICLE ANIMATION ---

// Main execution on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize theme first to prevent flash of unstyled content
    initThemeSwitcher();

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

    // NEW: Initialize particle animation if on homepage
    initParticleAnimation(); // This will now check the theme internally

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

    // Page-specific logic
    if (window.location.pathname.includes('match-details.html')) {
        fetchMatchDetailsPage();
    } else if (window.location.pathname.includes('standings.html')) {
        generateLeagueSelector('league-selector-standings', fetchAndRenderStandings);
        // NEW: Check for leagueId in URL
        const leagueIdFromUrl = urlParams.get('leagueId');
        if (leagueIdFromUrl) {
            fetchAndRenderStandings(leagueIdFromUrl);
            // Also, set the active button after a small delay for buttons to be created
            setTimeout(() => {
                const leagueSelector = document.getElementById('league-selector-standings');
                if (leagueSelector) {
                    leagueSelector.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
                    const buttonToActivate = leagueSelector.querySelector(`button[data-league-id="${leagueIdFromUrl}"]`);
                    if (buttonToActivate) buttonToActivate.classList.add('active');
                }
            }, 200);
        }
    } else if (window.location.pathname.includes('topscorers.html')) {
        generateLeagueSelector('league-selector-topscorers', (leagueId) => fetchAndRenderTopScorers(leagueId, 'topscorers-container'));
    } else if (window.location.pathname.includes('leagues.html')) {
        fetchAndRenderLeagues();
    }

    // Note: updateFollowButtons() is now called inside the fetch functions
    // in live.html and todays-matches.html after the content is loaded.
});