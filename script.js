// PikuFlix Enhanced Script - Ad-free streaming with account features
class PikuFlix {
    constructor() {
        this.currentPage = 'home';
        this.currentVideo = null;
        this.searchTimeout = null;
        this.heroContent = [];
        this.contentData = {
            trending: [],
            movies: [],
            tvShows: [],
            newPopular: []
        };
        this.myList = JSON.parse(localStorage.getItem('pikuflix-mylist') || '[]');
        this.userProfile = JSON.parse(localStorage.getItem('pikuflix-profile') || '{}');
        this.adBlocker = new AdBlocker();
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadContent();
        this.setupHeroRotation();
        this.setupVideoPlayer();
        this.setupAccountSystem();
        this.preventAdRedirects();
    }

    setupEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
        }

        // Navigation prevention for ads
        window.addEventListener('beforeunload', (e) => {
            if (this.currentVideo) {
                e.preventDefault();
                e.returnValue = '';
                return '';
            }
        });

        // Handle back button
        window.addEventListener('popstate', (e) => {
            if (this.currentVideo && document.getElementById('videoPlayer').style.display === 'block') {
                e.preventDefault();
                // Don't close video, just prevent navigation
                history.pushState(null, null, window.location.href);
            }
        });

        // Profile button click
        const profileBtn = document.querySelector('.profile-btn');
        if (profileBtn) {
            profileBtn.addEventListener('click', () => this.showAccountModal());
        }
    }

    setupAccountSystem() {
        // Create account modal if it doesn't exist
        if (!document.getElementById('accountModal')) {
            this.createAccountModal();
        }

        // Initialize user profile
        if (!this.userProfile.name) {
            this.userProfile = {
                name: 'Guest User',
                email: '',
                avatar: 'https://ui-avatars.com/api/?name=Guest+User&background=4285f4&color=fff',
                joinDate: new Date().toISOString(),
                watchHistory: [],
                preferences: {
                    quality: 'auto',
                    autoplay: true,
                    subtitles: false
                }
            };
            this.saveUserProfile();
        }

        this.updateProfileButton();
    }

    createAccountModal() {
        const modal = document.createElement('div');
        modal.id = 'accountModal';
        modal.className = 'account-modal';
        modal.innerHTML = `
            <div class="modal-overlay" onclick="this.parentElement.style.display='none'"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Account Settings</h2>
                    <button class="close-btn" onclick="document.getElementById('accountModal').style.display='none'">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="profile-section">
                        <div class="profile-avatar">
                            <img src="${this.userProfile.avatar}" alt="Profile" id="profileAvatar">
                            <button class="change-avatar-btn" onclick="pikuflix.changeAvatar()">Change Avatar</button>
                        </div>
                        <div class="profile-info">
                            <div class="form-group">
                                <label>Name:</label>
                                <input type="text" id="profileName" value="${this.userProfile.name}" onchange="pikuflix.updateProfile()">
                            </div>
                            <div class="form-group">
                                <label>Email:</label>
                                <input type="email" id="profileEmail" value="${this.userProfile.email}" onchange="pikuflix.updateProfile()">
                            </div>
                            <div class="form-group">
                                <label>Member since:</label>
                                <span>${new Date(this.userProfile.joinDate).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="preferences-section">
                        <h3>Preferences</h3>
                        <div class="form-group">
                            <label>Default Quality:</label>
                            <select id="qualityPref" onchange="pikuflix.updatePreferences()">
                                <option value="auto" ${this.userProfile.preferences.quality === 'auto' ? 'selected' : ''}>Auto</option>
                                <option value="1080p" ${this.userProfile.preferences.quality === '1080p' ? 'selected' : ''}>1080p</option>
                                <option value="720p" ${this.userProfile.preferences.quality === '720p' ? 'selected' : ''}>720p</option>
                                <option value="480p" ${this.userProfile.preferences.quality === '480p' ? 'selected' : ''}>480p</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="autoplayPref" ${this.userProfile.preferences.autoplay ? 'checked' : ''} onchange="pikuflix.updatePreferences()">
                                Autoplay next episode
                            </label>
                        </div>
                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="subtitlesPref" ${this.userProfile.preferences.subtitles ? 'checked' : ''} onchange="pikuflix.updatePreferences()">
                                Enable subtitles by default
                            </label>
                        </div>
                    </div>

                    <div class="stats-section">
                        <h3>Your Stats</h3>
                        <div class="stats-grid">
                            <div class="stat-item">
                                <span class="stat-number">${this.myList.length}</span>
                                <span class="stat-label">Items in My List</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-number">${this.userProfile.watchHistory?.length || 0}</span>
                                <span class="stat-label">Watched</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-number">${Math.floor(Math.random() * 100) + 50}</span>
                                <span class="stat-label">Hours Streamed</span>
                            </div>
                        </div>
                    </div>

                    <div class="actions-section">
                        <button class="btn-primary" onclick="pikuflix.exportData()">Export My Data</button>
                        <button class="btn-secondary" onclick="pikuflix.clearData()">Clear All Data</button>
                        <button class="btn-danger" onclick="pikuflix.resetAccount()">Reset Account</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.addAccountModalStyles();
    }

    addAccountModalStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .account-modal {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 10000;
                font-family: 'Netflix Sans', 'Helvetica Neue', sans-serif;
            }

            .modal-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(5px);
            }

            .modal-content {
                position: relative;
                background: #181818;
                border-radius: 8px;
                max-width: 600px;
                max-height: 90vh;
                margin: 5vh auto;
                overflow-y: auto;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
            }

            .modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px 30px;
                border-bottom: 1px solid #333;
            }

            .modal-header h2 {
                color: white;
                margin: 0;
                font-size: 24px;
                font-weight: 600;
            }

            .close-btn {
                background: none;
                border: none;
                color: #999;
                font-size: 28px;
                cursor: pointer;
                padding: 0;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .close-btn:hover {
                color: white;
            }

            .modal-body {
                padding: 30px;
                color: white;
            }

            .profile-section {
                display: flex;
                gap: 30px;
                margin-bottom: 30px;
                align-items: flex-start;
            }

            .profile-avatar {
                text-align: center;
            }

            .profile-avatar img {
                width: 80px;
                height: 80px;
                border-radius: 50%;
                border: 3px solid #4285f4;
            }

            .change-avatar-btn {
                background: #4285f4;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                margin-top: 10px;
                cursor: pointer;
                font-size: 12px;
            }

            .change-avatar-btn:hover {
                background: #3367d6;
            }

            .profile-info {
                flex: 1;
            }

            .form-group {
                margin-bottom: 20px;
            }

            .form-group label {
                display: block;
                margin-bottom: 5px;
                color: #e5e5e5;
                font-weight: 500;
            }

            .form-group input, .form-group select {
                width: 100%;
                padding: 10px;
                background: #333;
                border: 1px solid #555;
                border-radius: 4px;
                color: white;
                font-size: 14px;
            }

            .form-group input:focus, .form-group select:focus {
                outline: none;
                border-color: #4285f4;
            }

            .form-group input[type="checkbox"] {
                width: auto;
                margin-right: 10px;
            }

            .preferences-section, .stats-section, .actions-section {
                margin-bottom: 30px;
                padding-top: 20px;
                border-top: 1px solid #333;
            }

            .preferences-section h3, .stats-section h3 {
                color: #e5e5e5;
                margin-bottom: 20px;
                font-size: 18px;
                font-weight: 600;
            }

            .stats-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 20px;
            }

            .stat-item {
                text-align: center;
                background: #222;
                padding: 20px;
                border-radius: 8px;
            }

            .stat-number {
                display: block;
                font-size: 24px;
                font-weight: 700;
                color: #4285f4;
                margin-bottom: 5px;
            }

            .stat-label {
                font-size: 12px;
                color: #999;
                text-transform: uppercase;
            }

            .actions-section {
                display: flex;
                gap: 15px;
                flex-wrap: wrap;
            }

            .btn-primary, .btn-secondary, .btn-danger {
                padding: 12px 20px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-weight: 600;
                font-size: 14px;
                transition: all 0.3s ease;
            }

            .btn-primary {
                background: #4285f4;
                color: white;
            }

            .btn-primary:hover {
                background: #3367d6;
            }

            .btn-secondary {
                background: #666;
                color: white;
            }

            .btn-secondary:hover {
                background: #555;
            }

            .btn-danger {
                background: #e50914;
                color: white;
            }

            .btn-danger:hover {
                background: #b20710;
            }

            @media (max-width: 768px) {
                .modal-content {
                    margin: 0;
                    max-height: 100vh;
                    border-radius: 0;
                }

                .profile-section {
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                }

                .stats-grid {
                    grid-template-columns: 1fr;
                }

                .actions-section {
                    flex-direction: column;
                }
            }
        `;
        document.head.appendChild(style);
    }

    showAccountModal() {
        const modal = document.getElementById('accountModal');
        if (modal) {
            modal.style.display = 'block';
            // Update modal content with current data
            document.getElementById('profileName').value = this.userProfile.name;
            document.getElementById('profileEmail').value = this.userProfile.email;
            document.getElementById('profileAvatar').src = this.userProfile.avatar;
        }
    }

    updateProfile() {
        const name = document.getElementById('profileName').value;
        const email = document.getElementById('profileEmail').value;
        
        this.userProfile.name = name;
        this.userProfile.email = email;
        this.userProfile.avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=4285f4&color=fff`;
        
        this.saveUserProfile();
        this.updateProfileButton();
        document.getElementById('profileAvatar').src = this.userProfile.avatar;
    }

    updatePreferences() {
        this.userProfile.preferences = {
            quality: document.getElementById('qualityPref').value,
            autoplay: document.getElementById('autoplayPref').checked,
            subtitles: document.getElementById('subtitlesPref').checked
        };
        this.saveUserProfile();
    }

    changeAvatar() {
        const avatarOptions = [
            'https://ui-avatars.com/api/?name=' + encodeURIComponent(this.userProfile.name) + '&background=4285f4&color=fff',
            'https://ui-avatars.com/api/?name=' + encodeURIComponent(this.userProfile.name) + '&background=e50914&color=fff',
            'https://ui-avatars.com/api/?name=' + encodeURIComponent(this.userProfile.name) + '&background=00d4aa&color=fff',
            'https://ui-avatars.com/api/?name=' + encodeURIComponent(this.userProfile.name) + '&background=ff6b6b&color=fff',
            'https://ui-avatars.com/api/?name=' + encodeURIComponent(this.userProfile.name) + '&background=4ecdc4&color=fff'
        ];
        
        const currentIndex = avatarOptions.indexOf(this.userProfile.avatar);
        const nextIndex = (currentIndex + 1) % avatarOptions.length;
        
        this.userProfile.avatar = avatarOptions[nextIndex];
        this.saveUserProfile();
        this.updateProfileButton();
        document.getElementById('profileAvatar').src = this.userProfile.avatar;
    }

    exportData() {
        const data = {
            profile: this.userProfile,
            myList: this.myList,
            exportDate: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'pikuflix-data.json';
        a.click();
        URL.revokeObjectURL(url);
    }

    clearData() {
        if (confirm('Are you sure you want to clear all your data? This cannot be undone.')) {
            this.myList = [];
            this.userProfile.watchHistory = [];
            localStorage.removeItem('pikuflix-mylist');
            this.saveUserProfile();
            location.reload();
        }
    }

    resetAccount() {
        if (confirm('Are you sure you want to reset your account? This will delete all your data.')) {
            localStorage.removeItem('pikuflix-profile');
            localStorage.removeItem('pikuflix-mylist');
            location.reload();
        }
    }

    saveUserProfile() {
        localStorage.setItem('pikuflix-profile', JSON.stringify(this.userProfile));
    }

    updateProfileButton() {
        const profileBtn = document.querySelector('.profile-btn');
        if (profileBtn) {
            profileBtn.innerHTML = `<img src="${this.userProfile.avatar}" style="width: 24px; height: 24px; border-radius: 50%;" alt="Profile">`;
            profileBtn.title = this.userProfile.name;
        }
    }

    preventAdRedirects() {
        // Prevent external redirects
        const originalOpen = window.open;
        window.open = function(url, name, features) {
            if (url && (url.includes('ad') || url.includes('popup') || url.includes('redirect'))) {
                console.log('Blocked ad popup:', url);
                return null;
            }
            return originalOpen.call(window, url, name, features);
        };

        // Block ad-related navigation
        const originalAssign = window.location.assign;
        window.location.assign = function(url) {
            if (url && (url.includes('ad') || url.includes('popup') || url.includes('redirect'))) {
                console.log('Blocked ad redirect:', url);
                return;
            }
            return originalAssign.call(window.location, url);
        };

        // Prevent iframe redirects
        document.addEventListener('click', (e) => {
            const iframe = e.target.closest('iframe');
            if (iframe && iframe.id === 'videoFrame') {
                // Allow video controls but prevent ad clicks
                setTimeout(() => {
                    try {
                        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                        if (iframeDoc) {
                            // Block ad elements
                            const adElements = iframeDoc.querySelectorAll('[class*="ad"], [id*="ad"], [class*="popup"], [id*="popup"]');
                            adElements.forEach(el => el.remove());
                        }
                    } catch (e) {
                        // Cross-origin restrictions - expected
                    }
                }, 1000);
            }
        });
    }

    setupVideoPlayer() {
        const videoPlayer = document.getElementById('videoPlayer');
        const videoFrame = document.getElementById('videoFrame');
        
        if (videoFrame) {
            // Enhanced iframe with ad blocking
            videoFrame.addEventListener('load', () => {
                try {
                    // Add ad blocking to iframe content
                    const iframeDoc = videoFrame.contentDocument || videoFrame.contentWindow.document;
                    if (iframeDoc) {
                        // Inject ad blocking CSS
                        const style = iframeDoc.createElement('style');
                        style.textContent = `
                            [class*="ad"], [id*="ad"], [class*="popup"], [id*="popup"],
                            [class*="banner"], [id*="banner"], [class*="overlay"], [id*="overlay"] {
                                display: none !important;
                                visibility: hidden !important;
                                opacity: 0 !important;
                                pointer-events: none !important;
                            }
                        `;
                        iframeDoc.head.appendChild(style);
                    }
                } catch (e) {
                    // Cross-origin restrictions
                    console.log('Cross-origin iframe - ad blocking limited');
                }
            });
        }

        // Prevent video closure on back navigation
        window.addEventListener('popstate', (e) => {
            if (this.currentVideo && videoPlayer.style.display === 'block') {
                e.preventDefault();
                history.pushState(null, null, window.location.href);
                return false;
            }
        });

        // Push state when video opens to handle back button
        const originalPlayVideo = this.playVideo;
        this.playVideo = (tmdbId, type, title) => {
            history.pushState({ video: true }, '', window.location.href);
            return originalPlayVideo.call(this, tmdbId, type, title);
        };
    }

    async loadContent() {
        try {
            // Show loading state
            this.showLoading(['trendingRow', 'moviesRow', 'tvShowsRow', 'allMoviesRow', 'allTVRow', 'newPopularRow']);
            
            // Load content from multiple sources
            await Promise.all([
                this.loadTrendingContent(),
                this.loadMovieContent(),
                this.loadTVContent(),
                this.loadNewPopularContent()
            ]);
            
            // Update hero section
            this.updateHeroSection();
            
        } catch (error) {
            console.error('Error loading content:', error);
            this.showError('Failed to load content. Please refresh the page.');
        }
    }

    async loadTrendingContent() {
        const trending = await this.fetchTMDBData('trending/all/day');
        this.contentData.trending = trending.results?.slice(0, 20) || [];
        this.renderContentRow('trendingRow', this.contentData.trending);
    }

    async loadMovieContent() {
        const movies = await this.fetchTMDBData('movie/popular');
        this.contentData.movies = movies.results?.slice(0, 20) || [];
        this.renderContentRow('moviesRow', this.contentData.movies);
        this.renderContentRow('allMoviesRow', this.contentData.movies);
    }

    async loadTVContent() {
        const tvShows = await this.fetchTMDBData('tv/popular');
        this.contentData.tvShows = tvShows.results?.slice(0, 20) || [];
        this.renderContentRow('tvShowsRow', this.contentData.tvShows);
        this.renderContentRow('allTVRow', this.contentData.tvShows);
    }

    async loadNewPopularContent() {
        const newPopular = await this.fetchTMDBData('trending/all/week');
        this.contentData.newPopular = newPopular.results?.slice(0, 20) || [];
        this.renderContentRow('newPopularRow', this.contentData.newPopular);
    }

    async fetchTMDBData(endpoint) {
        const API_KEY = '8265bd1679663a7ea12ac168da84d2e8';
        const BASE_URL = 'https://api.themoviedb.org/3';
        
        try {
            const response = await fetch(`${BASE_URL}/${endpoint}?api_key=${API_KEY}&language=en-US&page=1`);
            if (!response.ok) throw new Error('API request failed');
            return await response.json();
        } catch (error) {
            console.error('TMDB API Error:', error);
            return { results: [] };
        }
    }

    renderContentRow(containerId, items) {
        const container = document.getElementById(containerId);
        if (!container || !items.length) return;

        container.innerHTML = items.map(item => {
            const title = item.title || item.name;
            const year = new Date(item.release_date || item.first_air_date).getFullYear() || 'N/A';
            const rating = item.vote_average?.toFixed(1) || 'N/A';
            const poster = item.poster_path 
                ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
                : 'https://via.placeholder.com/300x450/333/fff?text=No+Image';
            
            const type = item.media_type || (item.title ? 'movie' : 'tv');
            
            return `
                <div class="content-item" onclick="pikuflix.playVideo(${item.id}, '${type}', '${title.replace(/'/g, "\\'")}')">
                    <img src="${poster}" alt="${title}" loading="lazy">
                    <div class="content-overlay">
                        <div class="title">${title}</div>
                        <div class="meta">${year} • ⭐ ${rating}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    playVideo(tmdbId, type, title) {
        const videoPlayer = document.getElementById('videoPlayer');
        const videoFrame = document.getElementById('videoFrame');
        
        if (!videoPlayer || !videoFrame) return;

        this.currentVideo = { tmdbId, type, title };
        
        // Add to watch history
        this.addToWatchHistory(tmdbId, type, title);
        
        // Construct ad-free video URL with multiple fallbacks
        const videoSources = [
            `https://vidsrc.xyz/embed/${type}?tmdb=${tmdbId}`,
            `https://vidsrc.me/embed/${type}?tmdb=${tmdbId}`,
            `https://www.2embed.to/embed/tmdb/${type}?id=${tmdbId}`,
            `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1&s=${type === 'movie' ? '1' : '2'}`
        ];
        
        // Try first source
        this.loadVideoSource(videoFrame, videoSources, 0);
        
        videoPlayer.style.display = 'block';
        document.body.style.overflow = 'hidden';
        
        // Update page state
        history.pushState({ video: true, tmdbId, type, title }, '', window.location.href);
    }

    loadVideoSource(iframe, sources, index) {
        if (index >= sources.length) {
            console.error('All video sources failed');
            this.showError('Unable to load video. Please try again later.');
            return;
        }

        const source = sources[index];
        console.log(`Loading video source ${index + 1}:`, source);
        
        iframe.src = source;
        
        // Set up error handling for this source
        const errorHandler = () => {
            console.log(`Source ${index + 1} failed, trying next...`);
            setTimeout(() => {
                this.loadVideoSource(iframe, sources, index + 1);
            }, 2000);
        };

        iframe.onerror = errorHandler;
        
        // Timeout fallback
        setTimeout(() => {
            if (iframe.src === source) {
                errorHandler();
            }
        }, 10000);
    }

    closeVideo() {
        const videoPlayer = document.getElementById('videoPlayer');
        const videoFrame = document.getElementById('videoFrame');
        
        if (videoPlayer) {
            videoPlayer.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
        
        if (videoFrame) {
            videoFrame.src = '';
        }
        
        this.currentVideo = null;
        
        // Update history
        if (history.state && history.state.video) {
            history.back();
        }
    }

    addToWatchHistory(tmdbId, type, title) {
        if (!this.userProfile.watchHistory) {
            this.userProfile.watchHistory = [];
        }
        
        // Remove if already exists
        this.userProfile.watchHistory = this.userProfile.watchHistory.filter(
            item => !(item.tmdbId === tmdbId && item.type === type)
        );
        
        // Add to beginning
        this.userProfile.watchHistory.unshift({
            tmdbId,
            type,
            title,
            watchedAt: new Date().toISOString()
        });
        
        // Keep only last 50 items
        this.userProfile.watchHistory = this.userProfile.watchHistory.slice(0, 50);
        
        this.saveUserProfile();
    }

    updateHeroSection() {
        if (!this.contentData.trending.length) return;
        
        const heroItem = this.contentData.trending[0];
        const heroSection = document.getElementById('heroSection');
        const heroTitle = document.getElementById('heroTitle');
        const heroDescription = document.getElementById('heroDescription');
        const heroMeta = document.getElementById('heroMeta');
        const heroPlayBtn = document.getElementById('heroPlayBtn');
        
        if (heroItem && heroTitle && heroDescription && heroMeta) {
            const title = heroItem.title || heroItem.name;
            const year = new Date(heroItem.release_date || heroItem.first_air_date).getFullYear();
            const rating = heroItem.vote_average?.toFixed(1);
            const type = heroItem.media_type || (heroItem.title ? 'movie' : 'tv');
            
            heroTitle.textContent = title;
            heroDescription.textContent = heroItem.overview || 'No description available.';
            
            heroMeta.innerHTML = `
                <span class="rating">⭐ ${rating}</span>
                <span class="year">${year}</span>
                <span class="type">${type === 'movie' ? 'Movie' : 'TV Series'}</span>
            `;
            
            if (heroPlayBtn) {
                heroPlayBtn.onclick = () => this.playVideo(heroItem.id, type, title);
            }
            
            // Set background image
            if (heroItem.backdrop_path && heroSection) {
                const backdropUrl = `https://image.tmdb.org/t/p/w1280${heroItem.backdrop_path}`;
                heroSection.style.backgroundImage = `linear-gradient(77deg, rgba(0,0,0,.6), transparent 85%), url('${backdropUrl}')`;
            }
        }
    }

    setupHeroRotation() {
        // Rotate hero content every 10 seconds
        setInterval(() => {
            if (this.contentData.trending.length > 1) {
                const randomIndex = Math.floor(Math.random() * Math.min(5, this.contentData.trending.length));
                const heroItem = this.contentData.trending[randomIndex];
                this.updateHeroWithItem(heroItem);
            }
        }, 10000);
    }

    updateHeroWithItem(item) {
        const heroTitle = document.getElementById('heroTitle');
        const heroDescription = document.getElementById('heroDescription');
        const heroMeta = document.getElementById('heroMeta');
        const heroPlayBtn = document.getElementById('heroPlayBtn');
        const heroSection = document.getElementById('heroSection');
        
        if (!item || !heroTitle) return;
        
        const title = item.title || item.name;
        const year = new Date(item.release_date || item.first_air_date).getFullYear();
        const rating = item.vote_average?.toFixed(1);
        const type = item.media_type || (item.title ? 'movie' : 'tv');
        
        // Fade out
        heroSection.style.opacity = '0.7';
        
        setTimeout(() => {
            heroTitle.textContent = title;
            heroDescription.textContent = item.overview || 'No description available.';
            
            heroMeta.innerHTML = `
                <span class="rating">⭐ ${rating}</span>
                <span class="year">${year}</span>
                <span class="type">${type === 'movie' ? 'Movie' : 'TV Series'}</span>
            `;
            
            if (heroPlayBtn) {
                heroPlayBtn.onclick = () => this.playVideo(item.id, type, title);
            }
            
            if (item.backdrop_path) {
                const backdropUrl = `https://image.tmdb.org/t/p/w1280${item.backdrop_path}`;
                heroSection.style.backgroundImage = `linear-gradient(77deg, rgba(0,0,0,.6), transparent 85%), url('${backdropUrl}')`;
            }
            
            // Fade in
            heroSection.style.opacity = '1';
        }, 300);
    }

    handleSearch(query) {
        clearTimeout(this.searchTimeout);
        
        if (!query.trim()) {
            document.getElementById('searchResults').innerHTML = '';
            return;
        }
        
        this.searchTimeout = setTimeout(async () => {
            try {
                const results = await this.searchContent(query);
                this.renderSearchResults(results);
            } catch (error) {
                console.error('Search error:', error);
            }
        }, 500);
    }

    async searchContent(query) {
        const API_KEY = '8265bd1679663a7ea12ac168da84d2e8';
        const response = await fetch(
            `https://api.themoviedb.org/3/search/multi?api_key=${API_KEY}&language=en-US&query=${encodeURIComponent(query)}&page=1`
        );
        
        if (!response.ok) throw new Error('Search failed');
        
        const data = await response.json();
        return data.results?.slice(0, 20) || [];
    }

    renderSearchResults(results) {
        const container = document.getElementById('searchResults');
        if (!container) return;
        
        if (!results.length) {
            container.innerHTML = '<div class="no-results">No results found</div>';
            return;
        }
        
        container.innerHTML = results.map(item => {
            if (item.media_type === 'person') return '';
            
            const title = item.title || item.name;
            const year = new Date(item.release_date || item.first_air_date).getFullYear() || 'N/A';
            const rating = item.vote_average?.toFixed(1) || 'N/A';
            const poster = item.poster_path 
                ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
                : 'https://via.placeholder.com/300x450/333/fff?text=No+Image';
            
            const type = item.media_type || (item.title ? 'movie' : 'tv');
            
            return `
                <div class="content-item" onclick="pikuflix.playVideo(${item.id}, '${type}', '${title.replace(/'/g, "\\'")}')">
                    <img src="${poster}" alt="${title}" loading="lazy">
                    <div class="content-overlay">
                        <div class="title">${title}</div>
                        <div class="meta">${year} • ⭐ ${rating}</div>
                    </div>
                </div>
            `;
        }).filter(Boolean).join('');
    }

    showLoading(containerIds) {
        containerIds.forEach(id => {
            const container = document.getElementById(id);
            if (container) {
                container.innerHTML = `
                    <div class="loading">
                        <div class="spinner"></div>
                        Loading content...
                    </div>
                `;
            }
        });
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #e50914;
            color: white;
            padding: 15px 20px;
            border-radius: 5px;
            z-index: 10000;
            font-weight: 500;
        `;
        errorDiv.textContent = message;
        
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }
}

// Ad Blocker Class
class AdBlocker {
    constructor() {
        this.blockedDomains = [
            'doubleclick.net',
            'googleadservices.com',
            'googlesyndication.com',
            'googletagmanager.com',
            'facebook.com/tr',
            'analytics.google.com',
            'ads.yahoo.com',
            'adsystem.amazon.com'
        ];
        
        this.init();
    }

    init() {
        this.blockRequests();
        this.blockElements();
        this.preventPopups();
    }

    blockRequests() {
        // Override fetch to block ad requests
        const originalFetch = window.fetch;
        window.fetch = (...args) => {
            const url = args[0];
            if (typeof url === 'string' && this.isAdUrl(url)) {
                console.log('Blocked ad request:', url);
                return Promise.reject(new Error('Blocked by ad blocker'));
            }
            return originalFetch.apply(window, args);
        };
    }

    blockElements() {
        // Block ad elements
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        this.checkAndBlockElement(node);
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Initial cleanup
        this.cleanupAds();
    }

    preventPopups() {
        // Block popup windows
        const originalOpen = window.open;
        window.open = function(...args) {
            const url = args[0];
            if (url && (url.includes('popup') || url.includes('ad'))) {
                console.log('Blocked popup:', url);
                return null;
            }
            return originalOpen.apply(window, args);
        };
    }

    isAdUrl(url) {
        return this.blockedDomains.some(domain => url.includes(domain));
    }

    checkAndBlockElement(element) {
        const adSelectors = [
            '[class*="ad"]',
            '[id*="ad"]',
            '[class*="popup"]',
            '[id*="popup"]',
            '[class*="banner"]',
            '[id*="banner"]'
        ];

        adSelectors.forEach(selector => {
            if (element.matches && element.matches(selector)) {
                element.style.display = 'none';
                console.log('Blocked ad element:', element);
            }
        });
    }

    cleanupAds() {
        const adElements = document.querySelectorAll(`
            [class*="ad"], [id*="ad"],
            [class*="popup"], [id*="popup"],
            [class*="banner"], [id*="banner"]
        `);
        
        adElements.forEach(el => {
            el.style.display = 'none';
        });
    }
}

// Navigation functions
function showPage(pageId, navElement) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show selected page
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
    }
    
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    if (navElement) {
        navElement.classList.add('active');
    }
    
    // Update current page
    if (window.pikuflix) {
        window.pikuflix.currentPage = pageId;
    }
}

function closeVideo() {
    if (window.pikuflix) {
        window.pikuflix.closeVideo();
    }
}

// Initialize PikuFlix when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.pikuflix = new PikuFlix();
});

// Handle page visibility to prevent ad redirects
document.addEventListener('visibilitychange', () => {
    if (document.hidden && window.pikuflix && window.pikuflix.currentVideo) {
        // Prevent navigation when video is playing
        history.pushState(null, null, window.location.href);
    }
});