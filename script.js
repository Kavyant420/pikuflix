class PikuFlix {
    constructor() {
        this.API_KEY = "8d18cc3ec326ca4282a7ab5a651c7f7b";
        this.BASE_URL = "https://api.themoviedb.org/3";
        this.IMG_BASE = "https://image.tmdb.org/t/p/w500";
        this.IMG_BASE_LARGE = "https://image.tmdb.org/t/p/original";
        
        this.cache = new Map();
        this.searchCache = new Map();
        this.debounceTimer = null;
        this.currentHeroItem = null;
        this.isOnline = navigator.onLine;
        this.popupBlocked = 0;
        
        this.currentData = {
            trending: [],
            movies: [],
            tvShows: [],
            newPopular: [],
            myList: []
        };
        
        this.init();
    }

    async init() {
        console.log('Initializing PikuFlix...');
        
        this.setupNetworkMonitoring();
        this.setupEnhancedPopupBlocker();
        this.setupEventListeners();
        this.setupKeyboardShortcuts();
        this.setupNavigationButtons();
        
        try {
            await this.loadInitialContent();
            this.setupHeroRotation();
            this.updateMyListDisplay();
            console.log('PikuFlix initialized successfully');
        } catch (error) {
            console.error('Error initializing app:', error);
            this.showToast('Error loading content. Please refresh the page.', 'error');
        }
    }

    setupNetworkMonitoring() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.showToast('Back online!', 'success');
            this.retryFailedRequests();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.showToast('You are offline. Some features may not work.', 'warning');
        });
    }

    setupEnhancedPopupBlocker() {
        const originalOpen = window.open;
        const originalAlert = window.alert;
        const originalConfirm = window.confirm;
        const originalPrompt = window.prompt;

        window.open = function(...args) {
            console.log('Blocked popup attempt:', args);
            return null;
        };

        window.alert = function(message) {
            console.log('Blocked alert:', message);
            return null;
        };

        window.confirm = function(message) {
            console.log('Blocked confirm:', message);
            return false;
        };

        window.prompt = function(message) {
            console.log('Blocked prompt:', message);
            return null;
        };

        document.addEventListener('click', (e) => {
            const target = e.target.closest('a');
            if (target && target.target === '_blank') {
                const href = target.href;
                if (href && !href.includes(window.location.hostname) && !this.isTrustedDomain(href)) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.popupBlocked++;
                    console.log('Blocked suspicious external link:', href);
                    if (this.popupBlocked % 5 === 0) {
                        this.showToast(`Blocked ${this.popupBlocked} popups`, 'success');
                    }
                }
            }
        }, true);

        document.addEventListener('contextmenu', (e) => {
            if (e.target.tagName === 'IFRAME') {
                e.preventDefault();
            }
        });

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) {
                        const suspiciousElements = node.querySelectorAll ? 
                            node.querySelectorAll('iframe[src*="ads"], iframe[src*="popup"], script[src*="ads"]') : [];
                        
                        suspiciousElements.forEach(el => {
                            if (!this.isTrustedDomain(el.src || el.getAttribute('src'))) {
                                el.remove();
                                this.popupBlocked++;
                                console.log('Removed suspicious element:', el);
                            }
                        });
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    setupNavigationButtons() {
        const accountBtn = document.querySelector('.account-btn, .user-icon, .profile-icon');
        if (accountBtn) {
            accountBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showAccountMenu(e);
            });
        }

        const notificationBtn = document.querySelector('.notification-btn, .bell-icon, .notifications');
        if (notificationBtn) {
            notificationBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showNotifications(e);
            });
        }

        const settingsBtn = document.querySelector('.settings-btn, .dropdown-arrow');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showSettingsMenu(e);
            });
        }
    }

    showAccountMenu(event) {
        const menu = document.createElement('div');
        menu.className = 'account-menu';
        menu.style.cssText = `
            position: fixed;
            top: ${event.clientY + 10}px;
            right: 20px;
            background: rgba(42, 42, 42, 0.95);
            backdrop-filter: blur(10px);
            border: 1px solid #333;
            border-radius: 8px;
            padding: 8px 0;
            z-index: 10000;
            min-width: 200px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        `;

        const options = [
            { text: 'My Profile', icon: '<i class="fas fa-user"></i>', action: () => this.showToast('Profile feature coming soon!', 'info') },
            { text: 'Account Settings', icon: '<i class="fas fa-cog"></i>', action: () => this.showToast('Settings feature coming soon!', 'info') },
            { text: 'Download History', icon: '<i class="fas fa-download"></i>', action: () => this.showWatchHistory() },
            { text: 'Help Center', icon: '<i class="fas fa-question-circle"></i>', action: () => this.showToast('Help feature coming soon!', 'info') },
            { text: 'Sign Out', icon: '<i class="fas fa-sign-out-alt"></i>', action: () => this.showToast('Sign out feature coming soon!', 'info') }
        ];

        options.forEach(option => {
            const menuItem = document.createElement('div');
            menuItem.style.cssText = `
                padding: 12px 16px;
                cursor: pointer;
                color: white;
                font-size: 14px;
                transition: background 0.2s;
                display: flex;
                align-items: center;
                gap: 12px;
            `;
            menuItem.innerHTML = `<span style="width: 16px;">${option.icon}</span> ${option.text}`;
            
            menuItem.addEventListener('mouseenter', () => {
                menuItem.style.background = 'rgba(255,255,255,0.1)';
            });
            
            menuItem.addEventListener('mouseleave', () => {
                menuItem.style.background = 'transparent';
            });
            
            menuItem.addEventListener('click', () => {
                option.action();
                document.body.removeChild(menu);
            });
            
            menu.appendChild(menuItem);
        });

        document.body.appendChild(menu);
        this.setupMenuRemoval(menu);
    }

    showNotifications(event) {
        const menu = document.createElement('div');
        menu.className = 'notifications-menu';
        menu.style.cssText = `
            position: fixed;
            top: ${event.clientY + 10}px;
            right: 20px;
            background: rgba(42, 42, 42, 0.95);
            backdrop-filter: blur(10px);
            border: 1px solid #333;
            border-radius: 8px;
            padding: 16px;
            z-index: 10000;
            min-width: 300px;
            max-height: 400px;
            overflow-y: auto;
            box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        `;

        const notifications = [
            { title: 'New Episodes Available', message: 'Check out the latest episodes of your favorite shows', time: '2 hours ago', type: 'new' },
            { title: 'Trending Now', message: 'Discover what everyone is watching', time: '5 hours ago', type: 'trending' },
            { title: 'Your List Updated', message: 'New movies added to your watchlist', time: '1 day ago', type: 'list' }
        ];

        menu.innerHTML = `
            <div style="color: white; font-size: 18px; font-weight: 700; margin-bottom: 16px; border-bottom: 1px solid #333; padding-bottom: 12px;">
                <i class="fas fa-bell" style="margin-right: 8px; color: #e50914;"></i>Notifications
            </div>
        `;

        if (notifications.length === 0) {
            menu.innerHTML += '<div style="color: #999; text-align: center; padding: 20px;">No new notifications</div>';
        } else {
            notifications.forEach(notif => {
                const notifItem = document.createElement('div');
                notifItem.style.cssText = `
                    padding: 12px;
                    border-radius: 6px;
                    background: rgba(255,255,255,0.05);
                    margin-bottom: 8px;
                    cursor: pointer;
                    transition: background 0.2s;
                `;
                
                notifItem.innerHTML = `
                    <div style="color: white; font-weight: 600; margin-bottom: 4px;">${notif.title}</div>
                    <div style="color: #ccc; font-size: 14px; margin-bottom: 6px;">${notif.message}</div>
                    <div style="color: #999; font-size: 12px;">${notif.time}</div>
                `;
                
                notifItem.addEventListener('mouseenter', () => {
                    notifItem.style.background = 'rgba(255,255,255,0.1)';
                });
                
                notifItem.addEventListener('mouseleave', () => {
                    notifItem.style.background = 'rgba(255,255,255,0.05)';
                });
                
                menu.appendChild(notifItem);
            });
        }

        document.body.appendChild(menu);
        this.setupMenuRemoval(menu);
    }

    showSettingsMenu(event) {
        const menu = document.createElement('div');
        menu.className = 'settings-menu';
        menu.style.cssText = `
            position: fixed;
            top: ${event.clientY + 10}px;
            right: 20px;
            background: rgba(42, 42, 42, 0.95);
            backdrop-filter: blur(10px);
            border: 1px solid #333;
            border-radius: 8px;
            padding: 8px 0;
            z-index: 10000;
            min-width: 180px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        `;

        const options = [
            { text: 'Video Quality', icon: '<i class="fas fa-hd-video"></i>', action: () => this.showToast('Quality settings coming soon!', 'info') },
            { text: 'Language', icon: '<i class="fas fa-language"></i>', action: () => this.showToast('Language settings coming soon!', 'info') },
            { text: 'Subtitles', icon: '<i class="fas fa-closed-captioning"></i>', action: () => this.showToast('Subtitle settings coming soon!', 'info') },
            { text: 'Parental Controls', icon: '<i class="fas fa-shield-alt"></i>', action: () => this.showToast('Parental controls coming soon!', 'info') },
            { text: 'Clear Cache', icon: '<i class="fas fa-trash"></i>', action: () => this.clearCache() }
        ];

        options.forEach(option => {
            const menuItem = document.createElement('div');
            menuItem.style.cssText = `
                padding: 12px 16px;
                cursor: pointer;
                color: white;
                font-size: 14px;
                transition: background 0.2s;
                display: flex;
                align-items: center;
                gap: 12px;
            `;
            menuItem.innerHTML = `<span style="width: 16px;">${option.icon}</span> ${option.text}`;
            
            menuItem.addEventListener('mouseenter', () => {
                menuItem.style.background = 'rgba(255,255,255,0.1)';
            });
            
            menuItem.addEventListener('mouseleave', () => {
                menuItem.style.background = 'transparent';
            });
            
            menuItem.addEventListener('click', () => {
                option.action();
                document.body.removeChild(menu);
            });
            
            menu.appendChild(menuItem);
        });

        document.body.appendChild(menu);
        this.setupMenuRemoval(menu);
    }

    setupMenuRemoval(menu) {
        setTimeout(() => {
            const removeMenu = (e) => {
                if (!menu.contains(e.target)) {
                    if (document.body.contains(menu)) {
                        document.body.removeChild(menu);
                    }
                    document.removeEventListener('click', removeMenu);
                    document.removeEventListener('keydown', handleEscape);
                }
            };
            
            const handleEscape = (e) => {
                if (e.key === 'Escape') {
                    if (document.body.contains(menu)) {
                        document.body.removeChild(menu);
                    }
                    document.removeEventListener('click', removeMenu);
                    document.removeEventListener('keydown', handleEscape);
                }
            };
            
            document.addEventListener('click', removeMenu);
            document.addEventListener('keydown', handleEscape);
        }, 10);
    }

    clearCache() {
        this.cache.clear();
        this.searchCache.clear();
        try {
            localStorage.removeItem('pikuflix_interactions');
            sessionStorage.clear();
        } catch (error) {
            console.warn('Error clearing storage:', error);
        }
        this.showToast('Cache cleared successfully!', 'success');
    }

    showWatchHistory() {
        const history = this.getFromStorage('pikuflix_history');
        if (history.length === 0) {
            this.showToast('No watch history found', 'info');
            return;
        }

        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0,0,0,0.8);
            backdrop-filter: blur(5px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            padding: 20px;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            background: #181818;
            border-radius: 8px;
            max-width: 800px;
            width: 100%;
            max-height: 80vh;
            overflow-y: auto;
            padding: 20px;
            position: relative;
        `;

        content.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="color: white; font-size: 24px; margin: 0;">Watch History</h2>
                <button class="close-history" style="background: none; border: none; color: white; font-size: 24px; cursor: pointer;">✕</button>
            </div>
            <div class="history-grid" style="display: grid; gap: 12px;">
                ${history.slice(0, 20).map(item => `
                    <div style="display: flex; gap: 12px; padding: 12px; background: rgba(255,255,255,0.05); border-radius: 6px; cursor: pointer;" 
                         onclick="pikuFlix.playContent(${JSON.stringify(item).replace(/"/g, '&quot;')})">
                        <img src="${this.IMG_BASE}${item.poster_path}" style="width: 60px; height: 90px; object-fit: cover; border-radius: 4px;" onerror="this.style.display='none'">
                        <div>
                            <div style="color: white; font-weight: 600;">${item.title || item.name}</div>
                            <div style="color: #ccc; font-size: 14px;">${item.media_type === 'tv' ? 'TV Series' : 'Movie'}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        modal.appendChild(content);
        document.body.appendChild(modal);

        content.querySelector('.close-history').addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }

    async retryFailedRequests() {
        if (!this.isOnline) return;
        
        try {
            if (this.currentData.trending.length === 0) {
                await this.loadTrendingContent();
            }
            if (this.currentData.movies.length === 0) {
                await this.loadPopularMovies();
            }
            if (this.currentData.tvShows.length === 0) {
                await this.loadPopularTVShows();
            }
        } catch (error) {
            console.error('Error retrying failed requests:', error);
        }
    }
    
    async fetchFromTMDB(endpoint, useCache = true) {
        if (!this.isOnline) {
            throw new Error('Network unavailable');
        }

        const cacheKey = endpoint;
        
        if (useCache && this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < 300000) {
                return cached.data;
            }
        }

        let retries = 3;
        while (retries > 0) {
            try {
                const separator = endpoint.includes('?') ? '&' : '?';
                const url = `${this.BASE_URL}${endpoint}${separator}api_key=${this.API_KEY}`;
                
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                
                if (useCache) {
                    this.cache.set(cacheKey, {
                        data: data,
                        timestamp: Date.now()
                    });
                }
                
                return data;
            } catch (error) {
                retries--;
                if (retries === 0) {
                    console.error(`API Error for ${endpoint}:`, error);
                    return { results: [] };
                }
                await this.sleep(1000);
            }
        }
    }
     
    async searchContent(query) {
        if (!query || query.trim().length < 2) {
            return { results: [] };
        }

        const normalizedQuery = query.trim().toLowerCase();
        
        if (this.searchCache.has(normalizedQuery)) {
            const cached = this.searchCache.get(normalizedQuery);
            if (Date.now() - cached.timestamp < 300000) {
                return cached.data;
            }
        }

        try {
            const data = await this.fetchFromTMDB(`/search/multi?query=${encodeURIComponent(query)}&include_adult=false`, false);
            
            if (data.results) {
                data.results = data.results
                    .filter(item => {
                        return (item.poster_path || item.backdrop_path) && 
                               (item.media_type === 'movie' || item.media_type === 'tv') &&
                               item.vote_count > 0;
                    })
                    .sort((a, b) => b.popularity - a.popularity);
            }

            this.searchCache.set(normalizedQuery, {
                data: data,
                timestamp: Date.now()
            });

            return data;
        } catch (error) {
            console.error('Search error:', error);
            return { results: [] };
        }
    }

    setupSearch() {
        const searchInput = document.getElementById('searchInput');
        if (!searchInput) return;

        const handleSearchInput = (e) => {
            const query = e.target.value;
            
            if (this.debounceTimer) {
                clearTimeout(this.debounceTimer);
            }

            this.debounceTimer = setTimeout(async () => {
                await this.performSearch(query);
            }, 300);
        };

        const handleSearchKeydown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (this.debounceTimer) {
                    clearTimeout(this.debounceTimer);
                }
                this.performSearch(e.target.value);
            } else if (e.key === 'Escape') {
                e.target.value = '';
                document.getElementById('searchResults').innerHTML = '';
            }
        };

        searchInput.addEventListener('input', handleSearchInput);
        searchInput.addEventListener('keydown', handleSearchKeydown);
        this.setupSearchSuggestions(searchInput);
    }
    
    async performSearch(query) {
        const searchResults = document.getElementById('searchResults');
        if (!searchResults) return;

        if (!query || query.trim().length < 2) {
            searchResults.innerHTML = '';
            return;
        }

        searchResults.innerHTML = this.createLoadingHTML('Searching...');

        try {
            const data = await this.searchContent(query);
            
            if (data.results && data.results.length > 0) {
                this.renderContentRow('searchResults', data.results);
                this.showToast(`Found ${data.results.length} results`, 'success');
            } else {
                searchResults.innerHTML = this.createEmptyStateHTML('No results found', '<i class="fa-solid fa-magnifying-glass"></i>');
            }
        } catch (error) {
            console.error('Search error:', error);
            searchResults.innerHTML = this.createEmptyStateHTML('Search failed. Please try again.', '<i class="fas fa-exclamation-triangle"></i>');
            this.showToast('Search failed. Please try again.', 'error');
        }
    }
    
    setupSearchSuggestions(searchInput) {
        const suggestions = ['Stranger Things', 'The Avengers', 'Breaking Bad', 'Game of Thrones', 'Spider-Man', 'The Office', 'Friends', 'Marvel', 'DC', 'Horror'];
        
        searchInput.addEventListener('focus', () => {
            if (!searchInput.value && Math.random() > 0.7) {
                const randomSuggestion = suggestions[Math.floor(Math.random() * suggestions.length)];
                searchInput.placeholder = `Try searching "${randomSuggestion}"`;
            }
        });

        searchInput.addEventListener('blur', () => {
            setTimeout(() => {
                searchInput.placeholder = 'Titles, people, genres';
            }, 100);
        });
    }

    createContentItem(item) {
        const contentItem = document.createElement('div');
        contentItem.className = 'content-item';
        contentItem.style.cursor = 'pointer';
        
        const posterPath = item.poster_path || item.backdrop_path;
        if (posterPath) {
            const img = document.createElement('img');
            img.dataset.src = `${this.IMG_BASE}${posterPath}`;
            img.alt = item.title || item.name || 'Content';
            img.loading = 'lazy';
            img.style.opacity = '0';
            img.style.transition = 'opacity 0.3s ease';
            
            this.observeImage(img);
            
            contentItem.appendChild(img);
            
            const overlay = document.createElement('div');
            overlay.className = 'content-overlay';
            
            const title = document.createElement('div');
            title.className = 'title';
            title.textContent = this.truncateText(item.title || item.name || 'Unknown Title', 30);
            
            const meta = document.createElement('div');
            meta.className = 'meta';
            const year = (item.release_date || item.first_air_date || '').split('-')[0];
            const rating = item.vote_average ? `★ ${item.vote_average.toFixed(1)}` : '';
            const type = item.media_type === 'tv' ? 'TV' : 'Movie';
            meta.textContent = [type, year, rating].filter(Boolean).join(' • ');
            
            overlay.appendChild(title);
            overlay.appendChild(meta);
            contentItem.appendChild(overlay);

            contentItem.addEventListener('mouseenter', () => {
                contentItem.style.transform = 'scale(1.05)';
                contentItem.style.zIndex = '10';
            });

            contentItem.addEventListener('mouseleave', () => {
                contentItem.style.transform = 'scale(1)';
                contentItem.style.zIndex = '1';
            });

        } else {
            contentItem.innerHTML = `
                <div class="icon">🎬</div>
                <div class="title">${this.truncateText(item.title || item.name || 'Unknown Title', 20)}</div>
            `;
        }
        
        contentItem.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleContentClick(item, contentItem);
        });

        contentItem.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showContextMenu(e, item);
        });
        
        return contentItem;
    }

    async handleContentClick(item, element) {
        element.style.opacity = '0.7';
        element.style.pointerEvents = 'none';

        try {
            this.playContent(item);
        } catch (error) {
            console.error('Error handling content click:', error);
            this.showToast('Failed to load content', 'error');
        } finally {
            setTimeout(() => {
                element.style.opacity = '1';
                element.style.pointerEvents = 'auto';
            }, 500);
        }
    }

    showContextMenu(event, item) {
        const contextMenu = document.createElement('div');
        contextMenu.className = 'context-menu';
        contextMenu.style.cssText = `
            position: fixed;
            top: ${event.clientY}px;
            left: ${event.clientX}px;
            background: rgba(42, 42, 42, 0.95);
            backdrop-filter: blur(10px);
            border: 1px solid #333;
            border-radius: 8px;
            padding: 8px 0;
            z-index: 10000;
            min-width: 150px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        `;

        const options = [
            { text: 'Play Now', action: () => this.playContent(item), icon: '<i class="fas fa-play"></i>' },
            { text: 'Add to My List', action: () => this.addToMyList(item), icon: '<i class="fas fa-plus"></i>' },
            { text: 'More Info', action: () => this.showContentDetails(item), icon: '<i class="fas fa-info-circle"></i>' }
        ];

        options.forEach(option => {
            const menuItem = document.createElement('div');
            menuItem.style.cssText = `
                padding: 12px 16px;
                cursor: pointer;
                color: white;
                font-size: 14px;
                transition: background 0.2s;
                display: flex;
                align-items: center;
                gap: 8px;
            `;
            menuItem.innerHTML = `<span>${option.icon}</span> ${option.text}`;
            
            menuItem.addEventListener('mouseenter', () => {
                menuItem.style.background = 'rgba(255,255,255,0.1)';
            });
            
            menuItem.addEventListener('mouseleave', () => {
                menuItem.style.background = 'transparent';
            });
            
            menuItem.addEventListener('click', () => {
                option.action();
                document.body.removeChild(contextMenu);
            });
            
            contextMenu.appendChild(menuItem);
        });

        document.body.appendChild(contextMenu);
        setTimeout(() => {
            const removeMenu = (e) => {
                if (!contextMenu.contains(e.target)) {
                    if (document.body.contains(contextMenu)) {
                        document.body.removeChild(contextMenu);
                    }
                    document.removeEventListener('click', removeMenu);
                }
            };
            document.addEventListener('click', removeMenu);
        }, 10);
    }

    observeImage(img) {
        if (!this.imageObserver) {
            this.imageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.addEventListener('load', () => {
                            img.style.opacity = '1';
                        });
                        img.addEventListener('error', () => {
                            img.style.opacity = '1';
                            img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQwIiBoZWlnaHQ9IjEzNSIgdmlld0JveD0iMCAwIDI0MCAxMzUiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyNDAiIGhlaWdodD0iMTM1IiBmaWxsPSIjMzMzIi8+Cjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmaWxsPSIjNjY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0Ij5JbWFnZSBub3QgYXZhaWxhYmxlPC90ZXh0Pgo8L3N2Zz4K';
                        });
                        this.imageObserver.unobserve(img);
                    }
                });
            }, { rootMargin: '100px' });
        }
        this.imageObserver.observe(img);
    }
    
    renderContentRow(containerId, items) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const fragment = document.createDocumentFragment();
        
        if (!items || items.length === 0) {
            container.innerHTML = this.createEmptyStateHTML('No content available', '<i class="fas fa-tv"></i>');
            return;
        }
       
        const limitedItems = items.slice(0, 20);
        
        limitedItems.forEach(item => {
            if (item.poster_path || item.backdrop_path) {
                fragment.appendChild(this.createContentItem(item));
            }
        });
        
        container.innerHTML = '';
        container.appendChild(fragment);
    }

    async updateHeroSection(item) {
        const heroSection = document.getElementById('heroSection');
        const heroTitle = document.getElementById('heroTitle');
        const heroMeta = document.getElementById('heroMeta');
        const heroRating = document.getElementById('heroRating');
        const heroYear = document.getElementById('heroYear');
        const heroSeasons = document.getElementById('heroSeasons');
        const heroGenres = document.getElementById('heroGenres');
        const heroDescription = document.getElementById('heroDescription');
        const heroPlayBtn = document.getElementById('heroPlayBtn');
        const heroInfoBtn = document.getElementById('heroInfoBtn');
        
        if (!item || !heroSection) return;
        
        try {
            this.currentHeroItem = item;

            if (item.backdrop_path) {
                const img = new Image();
                img.onload = () => {
                    heroSection.style.backgroundImage = `linear-gradient(77deg, rgba(0,0,0,.6), transparent 85%), url('${this.IMG_BASE_LARGE}${item.backdrop_path}')`;
                };
                img.src = `${this.IMG_BASE_LARGE}${item.backdrop_path}`;
            }
            
            heroTitle.textContent = this.truncateText(item.title || item.name || 'Unknown Title', 60);
            
            const year = (item.release_date || item.first_air_date || '').split('-')[0] || 'Unknown';
            const rating = this.getContentRating(item);
            
            heroRating.textContent = rating;
            heroYear.textContent = year;
            
            if (item.media_type === 'tv' || item.first_air_date) {
                heroSeasons.textContent = item.number_of_seasons ? `${item.number_of_seasons} Seasons` : 'TV Series';
            } else {
                heroSeasons.textContent = 'Movie';
            }
               
            const genreText = await this.getGenresText(item);
            heroGenres.textContent = genreText;
            
            heroDescription.textContent = this.truncateText(
                item.overview || 'No description available for this content.', 
                200
            );
            
            // Fix: Direct play on click instead of just updating hero
            heroPlayBtn.onclick = () => this.playContent(item);
            if (heroInfoBtn) {
                heroInfoBtn.onclick = () => this.showContentDetails(item);
            }
            
        } catch (error) {
            console.error('Error updating hero section:', error);
            this.showToast('Failed to load content details', 'error');
        }
    }

    getContentRating(item) {
        if (item.adult) return 'R';
        if (item.media_type === 'tv' || item.first_air_date) return 'TV-14';
        return 'PG-13';
    }
    
    async getGenresText(item) {
        try {
            const mediaType = item.media_type || (item.first_air_date ? 'tv' : 'movie');
            const details = await this.fetchFromTMDB(`/${mediaType}/${item.id}`);
            
            if (details.genres && details.genres.length > 0) {
                return details.genres.slice(0, 3).map(g => g.name).join(' • ');
            }
        } catch (error) {
            console.log('Could not fetch genres:', error);
        }
        return 'Entertainment';
    }

    playContent(item) {
        console.log('Playing content:', item);
        
        const videoPlayer = document.getElementById('videoPlayer');
        const videoFrame = document.getElementById('videoFrame');
        
        if (!videoPlayer || !videoFrame) {
            console.error('Video player elements not found');
            this.showToast('Video player not available', 'error');
            return;
        }
        
        // Fixed: Proper media type detection
        const mediaType = this.getMediaType(item);
        const videoUrl = `https://vidsrc.xyz/embed/${mediaType}/${item.id}`;
        
        console.log('Playing:', item.title || item.name, 'Type:', mediaType, 'URL:', videoUrl);
        
        // Create enhanced video player UI
        this.createEnhancedVideoPlayer(item, videoUrl);
        
        this.trackContentInteraction(item, 'play');
        this.addToWatchHistory(item);
    }

    getMediaType(item) {
        // Better media type detection
        if (item.media_type) {
            return item.media_type;
        }
        if (item.first_air_date || item.number_of_seasons) {
            return 'tv';
        }
        if (item.release_date) {
            return 'movie';
        }
        // Default fallback
        return 'movie';
    }

    createEnhancedVideoPlayer(item, videoUrl) {
        // Remove existing player if any
        const existingPlayer = document.getElementById('enhancedVideoPlayer');
        if (existingPlayer) {
            existingPlayer.remove();
        }

        // Create enhanced video player overlay
        const playerOverlay = document.createElement('div');
        playerOverlay.id = 'enhancedVideoPlayer';
        playerOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0,0,0,0.95);
            z-index: 10000;
            display: flex;
            flex-direction: column;
        `;

        // Create player header with controls
        const playerHeader = document.createElement('div');
        playerHeader.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px;
            background: linear-gradient(to bottom, rgba(0,0,0,0.8), transparent);
            position: relative;
            z-index: 10001;
        `;

        const titleSection = document.createElement('div');
        titleSection.style.cssText = `
            display: flex;
            align-items: center;
            gap: 20px;
            color: white;
        `;

        const backBtn = document.createElement('button');
        backBtn.innerHTML = '<i class="fas fa-arrow-left"></i>';
        backBtn.style.cssText = `
            background: rgba(255,255,255,0.1);
            border: none;
            color: white;
            padding: 10px 15px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 16px;
            transition: background 0.3s;
        `;
        backBtn.onmouseover = () => backBtn.style.background = 'rgba(255,255,255,0.2)';
        backBtn.onmouseout = () => backBtn.style.background = 'rgba(255,255,255,0.1)';
        backBtn.onclick = () => this.closeEnhancedVideo();

        const titleInfo = document.createElement('div');
        titleInfo.innerHTML = `
            <h2 style="margin: 0; font-size: 24px; font-weight: 700;">${item.title || item.name}</h2>
            <p style="margin: 5px 0 0; color: #ccc; font-size: 14px;">
                ${this.getMediaType(item) === 'tv' ? 'TV Series' : 'Movie'} • 
                ${(item.release_date || item.first_air_date || '').split('-')[0] || 'Unknown'}
                ${item.vote_average ? ` • ★ ${item.vote_average.toFixed(1)}` : ''}
            </p>
        `;

        titleSection.appendChild(backBtn);
        titleSection.appendChild(titleInfo);

        // Create control buttons
        const controlButtons = document.createElement('div');
        controlButtons.style.cssText = `
            display: flex;
            gap: 15px;
            align-items: center;
        `;

        const addToListBtn = document.createElement('button');
        addToListBtn.innerHTML = '<i class="fas fa-plus"></i> My List';
        addToListBtn.style.cssText = `
            background: rgba(109, 109, 110, 0.7);
            border: none;
            color: white;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: background 0.3s;
        `;
        addToListBtn.onmouseover = () => addToListBtn.style.background = 'rgba(109, 109, 110, 0.9)';
        addToListBtn.onmouseout = () => addToListBtn.style.background = 'rgba(109, 109, 110, 0.7)';
        addToListBtn.onclick = () => this.addToMyList(item);

        const shareBtn = document.createElement('button');
        shareBtn.innerHTML = '<i class="fas fa-share"></i>';
        shareBtn.style.cssText = `
            background: rgba(109, 109, 110, 0.7);
            border: none;
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: background 0.3s;
        `;
        shareBtn.onmouseover = () => shareBtn.style.background = 'rgba(109, 109, 110, 0.9)';
        shareBtn.onmouseout = () => shareBtn.style.background = 'rgba(109, 109, 110, 0.7)';
        shareBtn.onclick = () => this.shareContent(item);

        controlButtons.appendChild(addToListBtn);
        controlButtons.appendChild(shareBtn);

        playerHeader.appendChild(titleSection);
        playerHeader.appendChild(controlButtons);

        // Create video container
        const videoContainer = document.createElement('div');
        videoContainer.style.cssText = `
            flex: 1;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #000;
        `;

        // Create loading indicator
        const loadingIndicator = document.createElement('div');
        loadingIndicator.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: white;
            font-size: 18px;
            z-index: 10002;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 20px;
        `;
        loadingIndicator.innerHTML = `
            <div style="border: 4px solid rgba(255,255,255,0.1); border-top: 4px solid #e50914; 
                        border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite;"></div>
            <div>Loading video...</div>
        `;

        // Create iframe for video
        const iframe = document.createElement('iframe');
        iframe.style.cssText = `
            width: 100%;
            height: 100%;
            border: none;
            background: #000;
        `;
        iframe.allowFullscreen = true;
        iframe.allow = 'autoplay; encrypted-media; picture-in-picture';

        videoContainer.appendChild(loadingIndicator);
        videoContainer.appendChild(iframe);

        // Assemble player
        playerOverlay.appendChild(playerHeader);
        playerOverlay.appendChild(videoContainer);
        document.body.appendChild(playerOverlay);

        // Load video with error handling
        iframe.onload = () => {
            loadingIndicator.style.display = 'none';
            this.showToast('Video loaded successfully', 'success');
        };

        iframe.onerror = () => {
            loadingIndicator.innerHTML = `
                <i class="fas fa-exclamation-triangle" style="color: #e50914; font-size: 48px; margin-bottom: 20px;"></i>
                <div>Failed to load video</div>
                <button onclick="pikuFlix.closeEnhancedVideo()" style="
                    background: #e50914; color: white; border: none; padding: 10px 20px;
                    border-radius: 4px; cursor: pointer; margin-top: 15px;">
                    Go Back
                </button>
            `;
        };

        // Add keyboard controls
        const handleKeydown = (e) => {
            if (e.key === 'Escape') {
                this.closeEnhancedVideo();
            }
        };
        document.addEventListener('keydown', handleKeydown);

        // Store cleanup function
        playerOverlay.cleanup = () => {
            document.removeEventListener('keydown', handleKeydown);
        };

        // Load the video
        setTimeout(() => {
            iframe.src = videoUrl;
        }, 500);
    }

    
    shareContent(item) {
        if (navigator.share) {
            navigator.share({
                title: item.title || item.name,
                text: `Check out this ${this.getMediaType(item) === 'tv' ? 'TV show' : 'movie'}: ${item.title || item.name}`,
                url: window.location.href
            });
        } else {
            const url = window.location.href;
            navigator.clipboard.writeText(url).then(() => {
                this.showToast('Link copied to clipboard!', 'success');
            }).catch(() => {
                this.showToast('Unable to share content', 'error');
            });
        }
    }

    // Continue with the rest of the methods...

    async handleContentClick(item, element) {
        element.style.opacity = '0.7';
        element.style.pointerEvents = 'none';

        try {
            // Fix: Direct play instead of just updating hero
            this.playContent(item);
        } catch (error) {
            console.error('Error handling content click:', error);
            this.showToast('Failed to load content', 'error');
        } finally {
            setTimeout(() => {
                element.style.opacity = '1';
                element.style.pointerEvents = 'auto';
            }, 500);
        }
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
        document.addEventListener('click', function(e) {
    let target = e.target.closest('a, button, div');
    if (target && (
        target.target === '_blank' || 
        /vpn|ads|redirect|popup|promo/i.test(target.href || target.textContent || '') ||
        /vpn|ads|redirect|popup|promo/i.test(target.className || '')
    )) {
        e.preventDefault();
        console.log('Blocked popup:', target);
        return false;
    }
}, true);
document.addEventListener('click', function(e) {
            let target = e.target.closest('a');
            if (target && target.target === '_blank' && /ads|redirect/.test(target.href)) {
                e.preventDefault();
                console.log('Blocked a tab-opening ad link:', target.href);
            }
        }, true);

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
                        <div class="meta">${year} •  <i class="fa-solid fa-star" style="color:blue;"></i> ${rating}</div>
                    </div>
                </div>
            `;
        }).join('');
    }
    async fetchFromTMDB(endpoint, useCache = true) {
        if (!this.isOnline) {
            throw new Error('Network unavailable');
        }

        const cacheKey = endpoint;
        
        if (useCache && this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < 300000) {
                return cached.data;
            }
        }

        let retries = 3;
        while (retries > 0) {
            try {
                const separator = endpoint.includes('?') ? '&' : '?';
                const url = `${this.BASE_URL}${endpoint}${separator}api_key=${this.API_KEY}`;
                
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                
                if (useCache) {
                    this.cache.set(cacheKey, {
                        data: data,
                        timestamp: Date.now()
                    });
                }
                
                return data;
            } catch (error) {
                retries--;
                if (retries === 0) {
                    console.error(`API Error for ${endpoint}:`, error);
                    return { results: [] };
                }
                await this.sleep(1000);
            }
        }
    }
     
    async searchContent(query) {
        if (!query || query.trim().length < 2) {
            return { results: [] };
        }

        const normalizedQuery = query.trim().toLowerCase();
        
        if (this.searchCache.has(normalizedQuery)) {
            const cached = this.searchCache.get(normalizedQuery);
            if (Date.now() - cached.timestamp < 300000) {
                return cached.data;
            }
        }

        try {
            const data = await this.fetchFromTMDB(`/search/multi?query=${encodeURIComponent(query)}&include_adult=false`, false);
            
            if (data.results) {
                data.results = data.results
                    .filter(item => {
                        return (item.poster_path || item.backdrop_path) && 
                               (item.media_type === 'movie' || item.media_type === 'tv') &&
                               item.vote_count > 0;
                    })
                    .sort((a, b) => b.popularity - a.popularity);
            }

            this.searchCache.set(normalizedQuery, {
                data: data,
                timestamp: Date.now()
            });

            return data;
        } catch (error) {
            console.error('Search error:', error);
            return { results: [] };
        }
    }

    // Continue with rest of methods... (setupSearch, performSearch, etc. remain the same)
    setupSearch() {
        const searchInput = document.getElementById('searchInput');
        if (!searchInput) return;

        const handleSearchInput = (e) => {
            const query = e.target.value;
            
            if (this.debounceTimer) {
                clearTimeout(this.debounceTimer);
            }

            this.debounceTimer = setTimeout(async () => {
                await this.performSearch(query);
            }, 300);
        };

        const handleSearchKeydown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (this.debounceTimer) {
                    clearTimeout(this.debounceTimer);
                }
                this.performSearch(e.target.value);
            } else if (e.key === 'Escape') {
                e.target.value = '';
                document.getElementById('searchResults').innerHTML = '';
            }
        };

        searchInput.addEventListener('input', handleSearchInput);
        searchInput.addEventListener('keydown', handleSearchKeydown);
        this.setupSearchSuggestions(searchInput);
    }
    
    async performSearch(query) {
        const searchResults = document.getElementById('searchResults');
        if (!searchResults) return;

        if (!query || query.trim().length < 2) {
            searchResults.innerHTML = '';
            return;
        }

        searchResults.innerHTML = this.createLoadingHTML('Searching...');

        try {
            const data = await this.searchContent(query);
            
            if (data.results && data.results.length > 0) {
                this.renderContentRow('searchResults', data.results);
                this.showToast(`Found ${data.results.length} results`, 'success');
            } else {
                searchResults.innerHTML = this.createEmptyStateHTML('No results found', '<i class="fa-solid fa-magnifying-glass"></i>');
            }
        } catch (error) {
            console.error('Search error:', error);
            searchResults.innerHTML = this.createEmptyStateHTML('Search failed. Please try again.', '<i class="fas fa-exclamation-triangle"></i>');
            this.showToast('Search failed. Please try again.', 'error');
        }
    }
    
    setupSearchSuggestions(searchInput) {
        const suggestions = ['Stranger Things', 'The Avengers', 'Breaking Bad', 'Game of Thrones', 'Spider-Man', 'The Office', 'Friends', 'Marvel', 'DC', 'Horror'];
        
        searchInput.addEventListener('focus', () => {
            if (!searchInput.value && Math.random() > 0.7) {
                const randomSuggestion = suggestions[Math.floor(Math.random() * suggestions.length)];
                searchInput.placeholder = `Try searching "${randomSuggestion}"`;
            }
        });

        searchInput.addEventListener('blur', () => {
            setTimeout(() => {
                searchInput.placeholder = 'Titles, people, genres';
            }, 100);
        });
    }

    createContentItem(item) {
        const contentItem = document.createElement('div');
        contentItem.className = 'content-item';
        contentItem.style.cursor = 'pointer';
        
        const posterPath = item.poster_path || item.backdrop_path;
        if (posterPath) {
            const img = document.createElement('img');
            img.dataset.src = `${this.IMG_BASE}${posterPath}`;
            img.alt = item.title || item.name || 'Content';
            img.loading = 'lazy';
            img.style.opacity = '0';
            img.style.transition = 'opacity 0.3s ease';
            
            this.observeImage(img);
            
            contentItem.appendChild(img);
            
            const overlay = document.createElement('div');
            overlay.className = 'content-overlay';
            
            const title = document.createElement('div');
            title.className = 'title';
            title.textContent = this.truncateText(item.title || item.name || 'Unknown Title', 30);
            
            const meta = document.createElement('div');
            meta.className = 'meta';
            const year = (item.release_date || item.first_air_date || '').split('-')[0];
            const rating = item.vote_average ? `★ ${item.vote_average.toFixed(1)}` : '';
            const type = this.getMediaType(item) === 'tv' ? 'TV' : 'Movie';
            meta.textContent = [type, year, rating].filter(Boolean).join(' • ');
            
            overlay.appendChild(title);
            overlay.appendChild(meta);
            contentItem.appendChild(overlay);

            contentItem.addEventListener('mouseenter', () => {
                contentItem.style.transform = 'scale(1.05)';
                contentItem.style.zIndex = '10';
            });

            contentItem.addEventListener('mouseleave', () => {
                contentItem.style.transform = 'scale(1)';
                contentItem.style.zIndex = '1';
            });

        } else {
            contentItem.innerHTML = `
                <div class="icon">🎬</div>
                <div class="title">${this.truncateText(item.title || item.name || 'Unknown Title', 20)}</div>
            `;
        }
        
        contentItem.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleContentClick(item, contentItem);
        });

        contentItem.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showContextMenu(e, item);
        });
        
        return contentItem;
    }

    showContextMenu(event, item) {
        const contextMenu = document.createElement('div');
        contextMenu.className = 'context-menu';
        contextMenu.style.cssText = `
            position: fixed;
            top: ${event.clientY}px;
            left: ${event.clientX}px;
            background: rgba(42, 42, 42, 0.95);
            backdrop-filter: blur(10px);
            border: 1px solid #333;
            border-radius: 8px;
            padding: 8px 0;
            z-index: 10000;
            min-width: 150px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        `;

        const options = [
            { text: 'Play Now', action: () => this.playContent(item), icon: '<i class="fas fa-play"></i>' },
            { text: 'Add to My List', action: () => this.addToMyList(item), icon: '<i class="fas fa-plus"></i>' },
            { text: 'More Info', action: () => this.showContentDetails(item), icon: '<i class="fas fa-info-circle"></i>' }
        ];

        options.forEach(option => {
            const menuItem = document.createElement('div');
            menuItem.style.cssText = `
                padding: 12px 16px;
                cursor: pointer;
                color: white;
                font-size: 14px;
                transition: background 0.2s;
                display: flex;
                align-items: center;
                gap: 8px;
            `;
            menuItem.innerHTML = `<span>${option.icon}</span> ${option.text}`;
            
            menuItem.addEventListener('mouseenter', () => {
                menuItem.style.background = 'rgba(255,255,255,0.1)';
            });
            
            menuItem.addEventListener('mouseleave', () => {
                menuItem.style.background = 'transparent';
            });
            
            menuItem.addEventListener('click', () => {
                option.action();
                document.body.removeChild(contextMenu);
            });
            
            contextMenu.appendChild(menuItem);
        });

        document.body.appendChild(contextMenu);
        setTimeout(() => {
            const removeMenu = (e) => {
                if (!contextMenu.contains(e.target)) {
                    if (document.body.contains(contextMenu)) {
                        document.body.removeChild(contextMenu);
                    }
                    document.removeEventListener('click', removeMenu);
                }
            };
            document.addEventListener('click', removeMenu);
        }, 10);
    }

    observeImage(img) {
        if (!this.imageObserver) {
            this.imageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.addEventListener('load', () => {
                            img.style.opacity = '1';
                        });
                        img.addEventListener('error', () => {
                            img.style.opacity = '1';
                            img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQwIiBoZWlnaHQ9IjEzNSIgdmlld0JveD0iMCAwIDI0MCAxMzUiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyNDAiIGhlaWdodD0iMTM1IiBmaWxsPSIjMzMzIi8+Cjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmaWxsPSIjNjY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0Ij5JbWFnZSBub3QgYXZhaWxhYmxlPC90ZXh0Pgo8L3N2Zz4K';
                        });
                        this.imageObserver.unobserve(img);
                    }
                });
            }, { rootMargin: '100px' });
        }
        this.imageObserver.observe(img);
    }
    
    renderContentRow(containerId, items) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const fragment = document.createDocumentFragment();
        
        if (!items || items.length === 0) {
            container.innerHTML = this.createEmptyStateHTML('No content available', '<i class="fas fa-tv"></i>');
            return;
        }
       
        const limitedItems = items.slice(0, 20);
        
        limitedItems.forEach(item => {
            if (item.poster_path || item.backdrop_path) {
                fragment.appendChild(this.createContentItem(item));
            }
        });
        
        container.innerHTML = '';
        container.appendChild(fragment);
    }

    async updateHeroSection(item) {
        const heroSection = document.getElementById('heroSection');
        const heroTitle = document.getElementById('heroTitle');
        const heroMeta = document.getElementById('heroMeta');
        const heroRating = document.getElementById('heroRating');
        const heroYear = document.getElementById('heroYear');
        const heroSeasons = document.getElementById('heroSeasons');
        const heroGenres = document.getElementById('heroGenres');
        const heroDescription = document.getElementById('heroDescription');
        const heroPlayBtn = document.getElementById('heroPlayBtn');
        
        if (!item || !heroSection) return;
        
        try {
            this.currentHeroItem = item;

            if (item.backdrop_path) {
                const img = new Image();
                img.onload = () => {
                    heroSection.style.backgroundImage = `linear-gradient(77deg, rgba(0,0,0,.6), transparent 85%), url('${this.IMG_BASE_LARGE}${item.backdrop_path}')`;
                };
                img.src = `${this.IMG_BASE_LARGE}${item.backdrop_path}`;
            }
            
            heroTitle.textContent = this.truncateText(item.title || item.name || 'Unknown Title', 60);
            
            const year = (item.release_date || item.first_air_date || '').split('-')[0] || 'Unknown';
            const rating = this.getContentRating(item);
            
            heroRating.textContent = rating;
            heroYear.textContent = year;
            
            if (item.media_type === 'tv' || item.first_air_date) {
                heroSeasons.textContent = item.number_of_seasons ? `${item.number_of_seasons} Seasons` : 'TV Series';
            } else {
                heroSeasons.textContent = 'Movie';
            }
               
            const genreText = await this.getGenresText(item);
            heroGenres.textContent = genreText;
            
            heroDescription.textContent = this.truncateText(
                item.overview || 'No description available for this content.', 
                200
            );
            
            heroPlayBtn.onclick = () => this.playContent(item);
            
        } catch (error) {
            console.error('Error updating hero section:', error);
            this.showToast('Failed to load content details', 'error');
        }
    }

    getContentRating(item) {
        if (item.adult) return 'R';
        if (item.media_type === 'tv' || item.first_air_date) return 'TV-14';
        return 'TV-14';
    }
    
    async getGenresText(item) {
        try {
            const mediaType = item.media_type || (item.first_air_date ? 'tv' : 'movie');
            const details = await this.fetchFromTMDB(`/${mediaType}/${item.id}`);
            
            if (details.genres && details.genres.length > 0) {
                return details.genres.slice(0, 3).map(g => g.name).join(' • ');
            }
        } catch (error) {
            console.log('Could not fetch genres:', error);
        }
        return 'Entertainment';
    }

async playContent(item) {
    const videoPlayer = document.getElementById('videoPlayer');
    const videoFrame = document.getElementById('videoFrame');

    if (!videoPlayer || !videoFrame) {
        console.error('Video player elements not found');
        return;
    }

    const mediaType = this.getMediaType(item);
    const videoUrl = `https://vidsrc.xyz/embed/${mediaType}/${item.id}`;

    // Show player
    videoPlayer.style.display = 'block';
    videoFrame.src = ""; // reset

    try {
       
        const res = await fetch(`https://api.themoviedb.org/3/${mediaType}/${item.id}?api_key=${this.API_KEY}&append_to_response=credits`);
        const details = await res.json();

     
        document.getElementById("metaTitle").textContent = details.title || details.name || "Unknown";
        document.getElementById("metaFacts").textContent =
            `${details.release_date || details.first_air_date || "N/A"} • ` +
            `${details.runtime ? details.runtime + " min" : "TV Show"} • ★ ${details.vote_average?.toFixed(1) || "N/A"}`;
        document.getElementById("metaGenres").textContent = details.genres?.map(g => g.name).join(", ") || "N/A";
        document.getElementById("metaOverview").textContent = details.overview || "No description available.";
        document.getElementById("metaDirector").textContent =
            details.credits?.crew?.find(c => c.job === "Director")?.name || "Unknown";
        document.getElementById("metaWriters").textContent =
            details.credits?.crew?.filter(c => c.department === "Writing").map(c => c.name).join(", ") || "Unknown";
        document.getElementById("metaCast").textContent =
            details.credits?.cast?.slice(0, 6).map(c => c.name).join(", ") || "Unknown";
    } catch (err) {
        console.error("Failed to load metadata:", err);
    }

    
    setTimeout(() => {
        videoFrame.src = videoUrl;
    }, 500);
}
    setupPopupBlocker() {
        const originalOpen = window.open;
        window.open = function(...args) {
            console.log('Blocked popup attempt:', args);
            return null;
        };

        document.addEventListener('click', (e) => {
            const target = e.target.closest('a');
            if (target && target.target === '_blank') {
                const href = target.href;
                if (href && !href.includes(window.location.hostname) && !this.isTrustedDomain(href)) {
                    e.preventDefault();
                    console.log('Blocked suspicious external link:', href);
                    this.showToast('Blocked suspicious link', 'warning');
                }
            }
        });

        let navigationCount = 0;
        window.addEventListener('beforeunload', () => {
            navigationCount++;
            if (navigationCount > 3) {
                return 'Are you sure you want to leave?';
            }
        });
    }

    isTrustedDomain(url) {
        const trustedDomains = [
            'themoviedb.org',
            'vidsrc.xyz',
            'api.themoviedb.org',
            'image.tmdb.org'
        ];
        
        try {
            const hostname = new URL(url).hostname;
            return trustedDomains.some(domain => hostname.includes(domain));
        } catch {
            return false;
        }
    }

    showPage(pageId, navElement = null) {
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.classList.add('active');
        }
        
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        if (navElement) {
            navElement.classList.add('active');
        }
        
        this.handlePageLoad(pageId);
    }

    async handlePageLoad(pageId) {
        switch(pageId) {
            case 'movies':
                if (!this.currentData.movies.length) {
                    await this.loadAllMovies();
                }
                break;
            case 'tv-shows':
                if (!this.currentData.tvShows.length) {
                    await this.loadAllTVShows();
                }
                break;
            case 'new-popular':
                if (!this.currentData.newPopular.length) {
                    await this.loadNewAndPopular();
                }
                break;
            case 'my-list':
                this.updateMyListDisplay();
                break;
            case 'search':
                this.setupSearch();
                const searchInput = document.getElementById('searchInput');
                if (searchInput) {
                    setTimeout(() => searchInput.focus(), 100);
                }
                break;
        }
    }

    async loadInitialContent() {
        const loadingPromises = [
            this.loadTrendingContent(),
            this.loadPopularMovies(),
            this.loadPopularTVShows()
        ];

        try {
            await Promise.allSettled(loadingPromises);
            console.log('Initial content loaded');
        } catch (error) {
            console.error('Error loading initial content:', error);
            this.showToast('Some content failed to load', 'warning');
        }
    }

    async loadTrendingContent() {
        try {
            const data = await this.fetchFromTMDB('/trending/all/week');
            this.currentData.trending = data.results || [];
            this.renderContentRow('trendingRow', this.currentData.trending);
            
            if (this.currentData.trending.length > 0) {
                await this.updateHeroSection(this.currentData.trending[0]);
            }
        } catch (error) {
            console.error('Error loading trending content:', error);
            document.getElementById('trendingRow').innerHTML = this.createEmptyStateHTML('Failed to load trending content', '<i class="fas fa-exclamation-triangle"></i>');
        }
    }

    async loadPopularMovies() {
        try {
            const data = await this.fetchFromTMDB('/movie/popular');
            this.currentData.movies = data.results || [];
            this.renderContentRow('moviesRow', this.currentData.movies);
        } catch (error) {
            console.error('Error loading movies:', error);
            document.getElementById('moviesRow').innerHTML = this.createEmptyStateHTML('Failed to load movies', '<i class="fas fa-exclamation-triangle"></i>');
        }
    }

    
    
async loadPopularTVShows() {
    try {
        const response = await fetch(`https://api.themoviedb.org/3/tv/popular?api_key=8d18cc3ec326ca4282a7ab5a651c7f7b`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        this.currentData.tvShows = data.results || [];
        this.renderContentRow('tvShowsRow', this.currentData.tvShows);
        
    } catch (error) {
        console.error('Error loading TV shows:', error);
        const tvShowsRow = document.getElementById('tvShowsRow');
        if (tvShowsRow) {
            tvShowsRow.innerHTML = this.createEmptyStateHTML('Failed to load TV shows', '<i class="fas fa-exclamation-triangle"></i>');
        }
    }
}


async loadTrendingContent() {
    try {
        const response = await fetch(`https://api.themoviedb.org/3/trending/all/week?api_key=8d18cc3ec326ca4282a7ab5a651c7f7b`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        this.currentData.trending = data.results || [];
        this.renderContentRow('trendingRow', this.currentData.trending);
        
        if (this.currentData.trending.length > 0) {
            await this.updateHeroSection(this.currentData.trending[0]);
        }
    } catch (error) {
        console.error('Error loading trending content:', error);
        const trendingRow = document.getElementById('trendingRow');
        if (trendingRow) {
            trendingRow.innerHTML = this.createEmptyStateHTML('Failed to load trending content', '<i class="fas fa-exclamation-triangle"></i>');
        }
    }
}

async loadPopularMovies() {
    try {
        const response = await fetch(`https://api.themoviedb.org/3/movie/popular?api_key=8d18cc3ec326ca4282a7ab5a651c7f7b`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        this.currentData.movies = data.results || [];
        this.renderContentRow('moviesRow', this.currentData.movies);
        
    } catch (error) {
        console.error('Error loading movies:', error);
        const moviesRow = document.getElementById('moviesRow');
        if (moviesRow) {
            moviesRow.innerHTML = this.createEmptyStateHTML('Failed to load movies', '<i class="fas fa-exclamation-triangle"></i>');
        }
    }
}

async searchContent(query) {
    if (!query || query.trim().length < 2) {
        return { results: [] };
    }

    try {
        const response = await fetch(`https://api.themoviedb.org/3/search/multi?query=${encodeURIComponent(query)}&include_adult=false&api_key=8d18cc3ec326ca4282a7ab5a651c7f7b`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.results) {
            data.results = data.results
                .filter(item => {
                    return (item.poster_path || item.backdrop_path) && 
                           (item.media_type === 'movie' || item.media_type === 'tv') &&
                           item.vote_count > 0;
                })
                .sort((a, b) => b.popularity - a.popularity);
        }

        return data;
    } catch (error) {
        console.error('Search error:', error);
        return { results: [] };
    }
}
    getFromStorage(key) {
        try {
            const data = localStorage.getItem(key) || sessionStorage.getItem(key);
            return JSON.parse(data || '[]');
        } catch (error) {
            console.warn('Storage error:', error);
            return [];
        }
    }

    saveToStorage(key, data) {
        try {
            const jsonData = JSON.stringify(data);
            localStorage.setItem(key, jsonData);
        } catch (error) {
            try {
                sessionStorage.setItem(key, jsonData);
            } catch (sessionError) {
                console.warn('Storage not available:', sessionError);
            }
        }
    }
    
    addToMyList(item) {
        try {
            let myList = this.getFromStorage('pikuflix_mylist');
            
            if (!myList.find(existing => existing.id === item.id)) {
                myList.unshift(item);
                if (myList.length > 100) {
                    myList = myList.slice(0, 100);
                }
                this.saveToStorage('pikuflix_mylist', myList);
                this.showToast('Added to My List', 'success');
                this.updateMyListDisplay();
                this.trackContentInteraction(item, 'add_to_list');
            } else {
                this.showToast('Already in My List', 'info');
            }
        } catch (error) {
            console.error('Error adding to list:', error);
            this.showToast('Failed to add to list', 'error');
        }
    }

    removeFromMyList(itemId) {
        try {
            let myList = this.getFromStorage('pikuflix_mylist');
            const originalLength = myList.length;
            myList = myList.filter(item => item.id !== itemId);
            
            if (myList.length < originalLength) {
                this.saveToStorage('pikuflix_mylist', myList);
                this.showToast('Removed from My List', 'success');
                this.updateMyListDisplay();
            }
        } catch (error) {
            console.error('Error removing from list:', error);
            this.showToast('Failed to remove from list', 'error');
        }
    }

    updateMyListDisplay() {
        const myList = this.getFromStorage('pikuflix_mylist');
        const container = document.getElementById('myListRow');
        
        if (!container) return;
        
        if (myList.length === 0) {
            container.innerHTML = this.createEmptyStateHTML('Your list is empty', '<i class="fa-solid fa-pen-to-square"></i>');
        } else {
            this.renderContentRow('myListRow', myList);
            
            setTimeout(() => {
                const myListItems = container.querySelectorAll('.content-item');
                myListItems.forEach((item, index) => {
                    const removeBtn = document.createElement('button');
                    removeBtn.className = 'remove-from-list-btn';
                    removeBtn.innerHTML = '✕';
                    removeBtn.style.cssText = `
                        position: absolute;
                        top: 8px;
                        right: 8px;
                        background: rgba(0,0,0,0.8);
                        color: white;
                        border: none;
                        width: 24px;
                        height: 24px;
                        border-radius: 50%;
                        cursor: pointer;
                        font-size: 12px;
                        z-index: 3;
                        display: none;
                    `;
                    
                    item.style.position = 'relative';
                    item.appendChild(removeBtn);
                    
                    item.addEventListener('mouseenter', () => {
                        removeBtn.style.display = 'block';
                    });
                    
                    item.addEventListener('mouseleave', () => {
                        removeBtn.style.display = 'none';
                    });
                    
                    removeBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        if (myList[index]) {
                            this.removeFromMyList(myList[index].id);
                        }
                    });
                });
            }, 100);
        }
    }
    
    showContentDetails(item) {
        const modal = document.createElement('div');
        modal.className = 'content-details-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0,0,0,0.8);
            backdrop-filter: blur(5px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            padding: 20px;
        `;

        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: #181818;
            border-radius: 8px;
            max-width: 600px;
            width: 100%;
            max-height: 80vh;
            overflow-y: auto;
            position: relative;
        `;

        const posterPath = item.backdrop_path || item.poster_path;
        const year = (item.release_date || item.first_air_date || '').split('-')[0];
        const rating = this.getContentRating(item);
        const mediaType = item.media_type === 'tv' ? 'TV Series' : 'Movie';

        modalContent.innerHTML = `
            <div style="position: relative;">
                ${posterPath ? `
                    <img src="${this.IMG_BASE_LARGE}${posterPath}" 
                         style="width: 100%; height: 300px; object-fit: cover; border-radius: 8px 8px 0 0;"
                         alt="${item.title || item.name}">
                    <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; 
                                background: linear-gradient(transparent 50%, rgba(24,24,24,1));">
                    </div>
                ` : ''}
                <button class="modal-close-btn" style="
                    position: absolute;
                    top: 15px;
                    right: 15px;
                    background: rgba(0,0,0,0.8);
                    color: white;
                    border: none;
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    cursor: pointer;
                    font-size: 18px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                ">✕</button>
            </div>
            <div style="padding: 20px;">
                <h2 style="color: white; font-size: 24px; margin-bottom: 10px; font-weight: 700;">
                    ${this.truncateText(item.title || item.name || 'Unknown Title', 50)}
                </h2>
                <div style="display: flex; gap: 10px; margin-bottom: 15px; font-size: 14px;">
                    <span style="color: #46d369; font-weight: 600;">${rating}</span>
                    <span style="color: #e5e5e5;">${year}</span>
                    <span style="color: #e5e5e5;">${mediaType}</span>
                    ${item.vote_average ? `<span style="color: #ffd700;"><i class="fas fa-star" style="color: gold;"></i> ${item.vote_average.toFixed(1)}</span>` : ''}
                </div>
                <p style="color: #ccc; line-height: 1.5; margin-bottom: 20px; font-size: 14px;">
                    ${item.overview || 'No description available for this content.'}
                </p>
                <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                    <button class="modal-play-btn" style="
                        background: white;
                        color: black;
                        border: none;
                        padding: 12px 24px;
                        border-radius: 4px;
                        font-weight: 700;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    ">
                        <i class="fas fa-play"></i> Play
                    </button>
                    <button class="modal-add-btn" style="
                        background: rgba(109, 109, 110, 0.7);
                        color: white;
                        border: none;
                        padding: 12px 24px;
                        border-radius: 4px;
                        font-weight: 700;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    ">
                        <i class="fas fa-plus"></i> My List
                    </button>
                </div>
            </div>
        `;

        modal.appendChild(modalContent);
        document.body.appendChild(modal);

        modal.querySelector('.modal-close-btn').addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        modal.querySelector('.modal-play-btn').addEventListener('click', () => {
            this.playContent(item);
            document.body.removeChild(modal);
        });

        modal.querySelector('.modal-add-btn').addEventListener('click', () => {
            this.addToMyList(item);
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });

        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                if (document.body.contains(modal)) {
                    document.body.removeChild(modal);
                }
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    }

    setupEventListeners() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const pageId = this.getPageIdFromNavText(item.textContent);
                this.showPage(pageId, item);
            });
        });

        this.setupSearch();

        const closeVideoBtn = document.querySelector('.close-video');
        if (closeVideoBtn) {
            closeVideoBtn.addEventListener('click', () => this.closeVideo());
        }

        const searchIcon = document.querySelector('.search-icon');
        if (searchIcon) {
            searchIcon.addEventListener('click', () => {
                this.showPage('search');
                setTimeout(() => {
                    const searchInput = document.getElementById('searchInput');
                    if (searchInput) searchInput.focus();
                }, 100);
            });
        }

        const dropdownArrow = document.querySelector('.dropdown-arrow');
        if (dropdownArrow) {
            dropdownArrow.addEventListener('click', () => this.showPage('footer'));
        }

        const infoBtn = document.querySelector('.info-btn');
        if (infoBtn) {
            infoBtn.addEventListener('click', () => {
                if (this.currentHeroItem) {
                    this.showContentDetails(this.currentHeroItem);
                } else {
                    this.showToast('More info feature coming soon!', 'info');
                }
            });
        }

        this.setupKeyboardShortcuts();

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.closeVideo();
            }
        });

        window.addEventListener('resize', this.debounce(() => {
            this.handleWindowResize();
        }, 250));
    }

    getPageIdFromNavText(text) {
        const mapping = {
            'Home': 'home',
            'TV Shows': 'tv-shows',
            'Movies': 'movies',
            'New & Popular': 'new-popular',
            'My List': 'my-list'
        };
        return mapping[text] || 'home';
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                if (e.key === 'Escape') {
                    e.target.blur();
                }
                return;
            }

            switch(e.key) {
                case 'Escape':
                    this.closeVideo();
                    document.querySelectorAll('.content-details-modal, .context-menu').forEach(modal => {
                        if (modal.parentNode) modal.parentNode.removeChild(modal);
                    });
                    break;
                case '/':
                    e.preventDefault();
                    this.showPage('search');
                    setTimeout(() => {
                        const searchInput = document.getElementById('searchInput');
                        if (searchInput) searchInput.focus();
                    }, 100);
                    break;
                case 'h':
                    if (!e.ctrlKey && !e.metaKey) {
                        this.showPage('home');
                    }
                    break;
                case 'm':
                    if (!e.ctrlKey && !e.metaKey) {
                        this.showPage('movies');
                    }
                    break;
                case 't':
                    if (!e.ctrlKey && !e.metaKey) {
                        this.showPage('tv-shows');
                    }
                    break;
                case 'l':
                    if (!e.ctrlKey && !e.metaKey) {
                        this.showPage('my-list');
                    }
                    break;
                case ' ':
                    const videoFrame = document.getElementById('videoFrame');
                    const videoPlayer = document.getElementById('videoPlayer');
                    if (videoPlayer && videoPlayer.style.display === 'block') {
                        e.preventDefault();
                        this.showToast('Video controls in development', 'info');
                    }
                    break;
            }
        });
    }

    handleWindowResize() {
        const isMobile = window.innerWidth <= 768;
        
        if (isMobile) {
            document.querySelectorAll('.content-row').forEach(row => {
                row.scrollLeft = 0;
            });
        }
        
        const heroSection = document.getElementById('heroSection');
        if (heroSection && isMobile) {
            heroSection.style.padding = '40px 4% 60px';
        }
    }

    setupHeroRotation() {
        let rotationInterval;
        let isPaused = false;
        
        const startRotation = () => {
            if (rotationInterval) clearInterval(rotationInterval);
            
            rotationInterval = setInterval(() => {
                if (!isPaused && this.currentData.trending.length > 0) {
                    const randomIndex = Math.floor(Math.random() * Math.min(5, this.currentData.trending.length));
                    this.updateHeroSection(this.currentData.trending[randomIndex]);
                }
            }, 15000);
        };

        const heroSection = document.getElementById('heroSection');
        if (heroSection) {
            heroSection.addEventListener('mouseenter', () => {
                isPaused = true;
            });
            
            heroSection.addEventListener('mouseleave', () => {
                isPaused = false;
            });
        }

        startRotation();

        this.heroRotation = {
            start: startRotation,
            stop: () => {
                if (rotationInterval) {
                    clearInterval(rotationInterval);
                    rotationInterval = null;
                }
            },
            pause: () => { isPaused = true; },
            resume: () => { isPaused = false; }
        };
    }

    showToast(message, type = 'info') {
        const existingToasts = document.querySelectorAll('.toast-notification');
        existingToasts.forEach(toast => toast.remove());

        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        
        const colors = {
            success: '#46d369',
            error: '#e50914',
            warning: '#f5a623',
            info: '#54b9c5'
        };

        const icons = {
  success: '<i class="fa-solid fa-check" style="color:blue;"></i>',
  error: '<i class="fa-solid fa-xmark" style="color:black;"></i>',
  warning: '<i class="fa-solid fa-triangle-exclamation"></i>',
  info: '<i class="fa-solid fa-circle-info" style="color:blue;"></i>'
};
        toast.innerHTML = `
            <span style="margin-right: 8px; font-weight: bold;">${icons[type] || icons.info}</span>
            ${message}
        `;

        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${colors[type] || colors.info};
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            z-index: 10001;
            font-size: 14px;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            transform: translateX(400px);
            opacity: 0;
            transition: all 0.3s ease;
        `;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
            toast.style.opacity = '1';
        }, 10);

        setTimeout(() => {
            toast.style.transform = 'translateX(400px)';
            toast.style.opacity = '0';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);

        toast.addEventListener('click', () => {
            toast.style.transform = 'translateX(400px)';
            toast.style.opacity = '0';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        });
    }

    trackContentInteraction(item, action) {
        const interaction = {
            id: item.id,
            title: item.title || item.name,
            type: item.media_type || (item.first_air_date ? 'tv' : 'movie'),
            action: action,
            timestamp: new Date().toISOString()
        };

        try {
            let interactions = this.getFromStorage('pikuflix_interactions');
            interactions.unshift(interaction);
            
            if (interactions.length > 100) {
                interactions = interactions.slice(0, 100);
            }
            
            this.saveToStorage('pikuflix_interactions', interactions);
            console.log('Interaction tracked:', interaction);
        } catch (error) {
            console.warn('Failed to track interaction:', error);
        }
    }

    addToWatchHistory(item) {
        try {
            let history = this.getFromStorage('pikuflix_history');
            
            history = history.filter(existingItem => existingItem.id !== item.id);
            history.unshift(item);
            
            if (history.length > 50) {
                history = history.slice(0, 50);
            }
            
            this.saveToStorage('pikuflix_history', history);
        } catch (error) {
            console.warn('Failed to save watch history:', error);
        }
    }

    truncateText(text, maxLength) {
        if (!text) return '';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func.apply(this, args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    createLoadingHTML(message = 'Loading...') {
        return `
            <div class="loading" style="display: flex; align-items: center; justify-content: center; 
                 height: 200px; color: #ccc; flex-direction: column; gap: 20px;">
                <div class="spinner" style="border: 4px solid rgba(255,255,255,0.1); 
                     border-top: 4px solid #e50914; border-radius: 50%; width: 50px; height: 50px; 
                     animation: spin 1s linear infinite;"></div>
                ${message}
            </div>
        `;
    }

    createEmptyStateHTML(message, icon = '📺') {
        return `
            <div class="content-item" style="min-width: 300px; text-align: center; 
                 background: rgba(255,255,255,0.05); border: 2px dashed rgba(255,255,255,0.2);">
                <div class="icon" style="font-size: 48px; opacity: 0.5;">${icon}</div>
                <div class="title" style="color: #999; font-size: 16px; margin-top: 10px;">${message}</div>
            </div>
        `;
    }

    
    cleanup() {
        if (this.heroRotation) {
            this.heroRotation.stop();
        }

        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }

        if (this.imageObserver) {
            this.imageObserver.disconnect();
        }

        this.cache.clear();
        this.searchCache.clear();

        console.log('PikuFlix cleanup completed');
    }
}

const pikuFlix = new PikuFlix();

window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    if (pikuFlix && pikuFlix.showToast) {
        pikuFlix.showToast('An unexpected error occurred', 'error');
    }
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    if (pikuFlix && pikuFlix.showToast) {
        pikuFlix.showToast('Network error occurred', 'error');
    }
});

window.showPage = (pageId, navElement) => pikuFlix.showPage(pageId, navElement);
window.closeVideo = () => pikuFlix.closeVideo();
window.playContent = (item) => pikuFlix.playContent(item);
window.addToMyList = (item) => pikuFlix.addToMyList(item);

console.log('Enhanced PikuFlix JavaScript loaded successfully!');      
