class Pikuflix {
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
        
        this.contentData = {
            trending: [],
            movies: [],
            tvShows: [],
            newPopular: [],
            myList: this.getMyListFromStorage()
        };
        
        this.init();
    }

    async init() {
        console.log('Initializing PikuFlix...');
        
        this.setupNetworkMonitoring();
        this.setupEventListeners();
        this.setupKeyboardShortcuts();
        this.setupScrollHandler();
        this.setupImageObserver();
        
        try {
            await this.loadInitialContent();
            this.setupHeroRotation();
            this.updateMyListDisplay();
            console.log('Platform initialized successfully');
        } catch (error) {
            console.error('Error initializing platform:', error);
            this.showToast('Error loading content. Please refresh the page.', 'error');
        }
    }

    // Network Monitoring
    setupNetworkMonitoring() {
        const updateNetworkStatus = () => {
            const statusEl = document.getElementById('networkStatus');
            const statusTextEl = document.getElementById('networkStatusText');
            
            if (navigator.onLine) {
                this.isOnline = true;
                statusEl.className = 'network-status online';
                statusTextEl.textContent = 'Online';
                setTimeout(() => {
                    statusEl.style.display = 'none';
                }, 2000);
            } else {
                this.isOnline = false;
                statusEl.className = 'network-status offline';
                statusTextEl.textContent = 'Offline';
                statusEl.style.display = 'flex';
            }
        };

        window.addEventListener('online', () => {
            updateNetworkStatus();
            this.showToast('Back online!', 'success');
            this.retryFailedRequests();
        });

        window.addEventListener('offline', () => {
            updateNetworkStatus();
            this.showToast('You are offline. Some features may not work.', 'warning');
        });

        updateNetworkStatus();
    }

    // Setup Image Observer for Lazy Loading
    setupImageObserver() {
        this.imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.addEventListener('load', () => {
                            img.style.opacity = '1';
                            img.classList.remove('skeleton');
                        });
                        img.addEventListener('error', () => {
                            img.src = this.getPlaceholderImage();
                            img.style.opacity = '1';
                        });
                        this.imageObserver.unobserve(img);
                    }
                }
            });
        }, { 
            rootMargin: '100px',
            threshold: 0.1
        });
    }

    // Setup Scroll Handler for Header
    setupScrollHandler() {
        let lastScrollY = window.scrollY;
        const header = document.getElementById('mainHeader');
        
        window.addEventListener('scroll', () => {
            const currentScrollY = window.scrollY;
            
            if (currentScrollY > 100) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
            
            lastScrollY = currentScrollY;
        });
    }

    // TMDb API Methods
    async fetchFromTMDB(endpoint, useCache = true) {
        if (!this.isOnline) {
            throw new Error('Network unavailable');
        }

        const cacheKey = endpoint;
        
        if (useCache && this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < 300000) { // 5 minutes
                return cached.data;
            }
        }

        try {
            const separator = endpoint.includes('?') ? '&' : '?';
            const url = `${this.BASE_URL}${endpoint}${separator}api_key=${this.API_KEY}&language=en-US`;
            
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
            console.error(`API Error for ${endpoint}:`, error);
            throw error;
        }
    }

    async loadInitialContent() {
        const loadingTasks = [
            this.loadTrendingContent(),
            this.loadPopularMovies(),
            this.loadPopularTVShows()
        ];

        try {
            const results = await Promise.allSettled(loadingTasks);
            
            // Check if any requests failed
            const failedTasks = results.filter(result => result.status === 'rejected');
            if (failedTasks.length > 0) {
                console.warn('Some content failed to load:', failedTasks);
                this.showToast('Some content failed to load', 'warning');
            }
            
        } catch (error) {
            console.error('Error loading initial content:', error);
            this.showToast('Error loading content', 'error');
        }
    }

    async loadTrendingContent() {
        try {
            const data = await this.fetchFromTMDB('/trending/all/week');
            this.contentData.trending = data.results || [];
            this.renderContentRow('trendingRow', this.contentData.trending);
            
            // Update hero with first trending item
            if (this.contentData.trending.length > 0) {
                await this.updateHeroSection(this.contentData.trending[0]);
            }
        } catch (error) {
            console.error('Error loading trending content:', error);
            this.renderErrorState('trendingRow', 'Failed to load trending content');
        }
    }

    async loadPopularMovies() {
        try {
            const data = await this.fetchFromTMDB('/movie/popular');
            this.contentData.movies = data.results || [];
            this.renderContentRow('moviesRow', this.contentData.movies);
            this.renderContentRow('allMoviesRow', this.contentData.movies);
        } catch (error) {
            console.error('Error loading movies:', error);
            this.renderErrorState('moviesRow', 'Failed to load movies');
            this.renderErrorState('allMoviesRow', 'Failed to load movies');
        }
    }

    async loadPopularTVShows() {
        try {
            const data = await this.fetchFromTMDB('/tv/popular');
            this.contentData.tvShows = data.results || [];
            this.renderContentRow('tvShowsRow', this.contentData.tvShows);
            this.renderContentRow('allTVRow', this.contentData.tvShows);
        } catch (error) {
            console.error('Error loading TV shows:', error);
            this.renderErrorState('tvShowsRow', 'Failed to load TV shows');
            this.renderErrorState('allTVRow', 'Failed to load TV shows');
        }
    }

    async loadNewAndPopular() {
        try {
            const data = await this.fetchFromTMDB('/trending/all/day');
            this.contentData.newPopular = data.results || [];
            this.renderContentRow('newPopularRow', this.contentData.newPopular);
        } catch (error) {
            console.error('Error loading new & popular:', error);
            this.renderErrorState('newPopularRow', 'Failed to load content');
        }
    }

    // Content Rendering
    renderContentRow(containerId, items) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        if (!items || items.length === 0) {
            this.renderEmptyState(container, 'No content available');
            return;
        }

        const fragment = document.createDocumentFragment();
        const limitedItems = items.slice(0, 20);
        
        limitedItems.forEach(item => {
            if (this.isValidItem(item)) {
                const contentItem = this.createContentItem(item);
                fragment.appendChild(contentItem);
            }
        });
        
        container.innerHTML = '';
        container.appendChild(fragment);
    }

    createContentItem(item) {
        const contentItem = document.createElement('div');
        contentItem.className = 'content-item';
        
        const posterPath = item.poster_path || item.backdrop_path;
        
        if (posterPath) {
            // Create image
            const img = document.createElement('img');
            img.dataset.src = `${this.IMG_BASE}${posterPath}`;
            img.alt = item.title || item.name || 'Content';
            img.loading = 'lazy';
            img.style.opacity = '0';
            img.className = 'skeleton';
            
            // Add to intersection observer
            this.imageObserver.observe(img);
            contentItem.appendChild(img);
            
            // Create overlay
            const overlay = document.createElement('div');
            overlay.className = 'content-overlay';
            
            const title = document.createElement('div');
            title.className = 'title';
            title.textContent = this.truncateText(item.title || item.name || 'Unknown Title', 35);
            
            const meta = document.createElement('div');
            meta.className = 'meta';
            const year = this.extractYear(item.release_date || item.first_air_date);
            const rating = item.vote_average ? `★ ${item.vote_average.toFixed(1)}` : '';
            const type = this.getMediaType(item) === 'tv' ? 'TV' : 'Movie';
            meta.innerHTML = `${type} • ${year} ${rating ? `• ${rating}` : ''}`;
            
            overlay.appendChild(title);
            overlay.appendChild(meta);
            contentItem.appendChild(overlay);

            // Create play overlay
            const playOverlay = document.createElement('div');
            playOverlay.className = 'play-overlay';
            const playIcon = document.createElement('div');
            playIcon.className = 'play-overlay-icon';
            playIcon.innerHTML = '<i class="fas fa-play"></i>';
            playOverlay.appendChild(playIcon);
            contentItem.appendChild(playOverlay);

        } else {
            // Fallback for items without images
            contentItem.className = 'content-item empty';
            contentItem.innerHTML = `
                <div class="icon">🎬</div>
                <div class="title">${this.truncateText(item.title || item.name || 'Unknown Title', 25)}</div>
            `;
        }
        
        // Add event listeners
        contentItem.addEventListener('click', (e) => {
            e.preventDefault();
            this.playContent(item);
        });

        contentItem.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showContextMenu(e, item);
        });
        
        return contentItem;
    }

    // Content Playing
    async playContent(item) {
        const videoPlayer = document.getElementById('videoPlayer');
        const videoFrame = document.getElementById('videoFrame');
        const videoLoading = document.getElementById('videoLoading');

        if (!videoPlayer || !videoFrame) {
            console.error('Video player elements not found');
            this.showToast('Video player not available', 'error');
            return;
        }

        // Show video player
        videoPlayer.style.display = 'block';
        videoPlayer.classList.add('active');
        
        // Show loading state
        videoLoading.style.display = 'flex';
        videoFrame.style.display = 'none';
        videoFrame.src = '';

        try {
            // Load detailed metadata
            await this.loadVideoMetadata(item);
            
            // Determine media type and create video URL
            const mediaType = this.getMediaType(item);
            let videoUrl;
            
            // Use appropriate vidsrc URL based on media type
            if (mediaType === 'tv') {
                videoUrl = `https://vidsrc.cc/v2/embed/tv/${item.id}?autoPlay=true`;
            } else {
                videoUrl = `https://vidsrc.cc/v2/embed/movie/${item.id}?autoPlay=true`;
            }

            // Add to watch history
            this.addToWatchHistory(item);

            // Load video after a short delay
            setTimeout(() => {
                videoFrame.src = videoUrl;
                videoFrame.style.display = 'block';
                videoLoading.style.display = 'none';
                
                // Setup video frame load handler
                videoFrame.onload = () => {
                    this.showToast(`Now playing: ${item.title || item.name}`, 'success');
                };
            }, 500);

        } catch (error) {
            console.error('Error playing content:', error);
            this.showToast('Failed to load video', 'error');
            this.closeVideo();
        }
    }

    async loadVideoMetadata(item) {
        try {
            const mediaType = this.getMediaType(item);
            const details = await this.fetchFromTMDB(`/${mediaType}/${item.id}?append_to_response=credits,videos`);
            
            // Update metadata in video player
            document.getElementById('metaTitle').textContent = details.title || details.name || 'Unknown Title';
            
            const year = this.extractYear(details.release_date || details.first_air_date);
            const duration = details.runtime ? `${details.runtime} min` : 'TV Series';
            const rating = details.vote_average ? details.vote_average.toFixed(1) : 'N/A';
            
            document.getElementById('metaYear').textContent = year;
            document.getElementById('metaDuration').textContent = duration;
            document.getElementById('metaRating').textContent = rating;
            
            // Update genres
            const genresContainer = document.getElementById('metaGenres');
            genresContainer.innerHTML = '';
            if (details.genres) {
                details.genres.slice(0, 5).forEach(genre => {
                    const genreTag = document.createElement('span');
                    genreTag.className = 'genre-tag';
                    genreTag.textContent = genre.name;
                    genresContainer.appendChild(genreTag);
                });
            }
            
            // Update overview
            document.getElementById('metaOverview').textContent = details.overview || 'No description available.';
            
            // Update credits
            if (details.credits) {
                const director = details.credits.crew?.find(person => person.job === 'Director');
                document.getElementById('metaDirector').textContent = director ? director.name : 'Unknown';
                
                const writers = details.credits.crew?.filter(person => 
                    person.department === 'Writing'
                ).slice(0, 3);
                document.getElementById('metaWriters').textContent = 
                    writers?.map(w => w.name).join(', ') || 'Unknown';
                
                const cast = details.credits.cast?.slice(0, 6);
                document.getElementById('metaCast').textContent = 
                    cast?.map(c => c.name).join(', ') || 'Unknown';
            }
            
            // Setup video player buttons
            this.setupVideoPlayerButtons(item, details);
            
        } catch (error) {
            console.error('Error loading metadata:', error);
            // Set default values
            document.getElementById('metaTitle').textContent = item.title || item.name || 'Unknown Title';
            document.getElementById('metaOverview').textContent = item.overview || 'No description available.';
        }
    }

    setupVideoPlayerButtons(item, details) {
        const playBtn = document.getElementById('metaPlayBtn');
        const addBtn = document.getElementById('metaAddBtn');
        const trailerBtn = document.getElementById('metaTrailerBtn');

        // Play button - restart the video
        playBtn.onclick = () => {
            const videoFrame = document.getElementById('videoFrame');
            const currentSrc = videoFrame.src;
            videoFrame.src = '';
            setTimeout(() => {
                videoFrame.src = currentSrc;
            }, 100);
        };

        // Add to list button
        addBtn.onclick = () => {
            this.addToMyList(item);
        };

        // Trailer button
        trailerBtn.onclick = () => {
            if (details.videos && details.videos.results.length > 0) {
                const trailer = details.videos.results.find(video => 
                    video.type === 'Trailer' && video.site === 'YouTube'
                ) || details.videos.results[0];
                
                if (trailer) {
                    const trailerUrl = `https://www.youtube.com/embed/${trailer.key}?autoplay=true`;
                    const videoFrame = document.getElementById('videoFrame');
                    videoFrame.src = trailerUrl;
                } else {
                    this.showToast('Trailer not available', 'warning');
                }
            } else {
                this.showToast('Trailer not available', 'warning');
            }
        };
    }

    // Search Functionality
    async searchContent(query) {
        if (!query || query.trim().length < 2) {
            return { results: [] };
        }

        const normalizedQuery = query.trim().toLowerCase();
        
        // Check cache
        if (this.searchCache.has(normalizedQuery)) {
            const cached = this.searchCache.get(normalizedQuery);
            if (Date.now() - cached.timestamp < 300000) {
                return cached.data;
            }
        }

        try {
            const data = await this.fetchFromTMDB(`/search/multi?query=${encodeURIComponent(query)}&include_adult=false`, false);
            
            if (data.results) {
                // Filter and sort results
                data.results = data.results
                    .filter(item => this.isValidItem(item) && item.vote_count > 0)
                    .sort((a, b) => b.popularity - a.popularity);
            }

            // Cache results
            this.searchCache.set(normalizedQuery, {
                data: data,
                timestamp: Date.now()
            });

            return data;
        } catch (error) {
            console.error('Search error:', error);
            throw error;
        }
    }

    setupSearch() {
        const searchInput = document.getElementById('searchInput');
        if (!searchInput) return;

        // Clear any existing listeners
        const newSearchInput = searchInput.cloneNode(true);
        searchInput.parentNode.replaceChild(newSearchInput, searchInput);

        newSearchInput.addEventListener('input', (e) => {
            const query = e.target.value;
            
            if (this.debounceTimer) {
                clearTimeout(this.debounceTimer);
            }

            if (query.length === 0) {
                document.getElementById('searchResults').innerHTML = '';
                return;
            }

            this.debounceTimer = setTimeout(async () => {
                await this.performSearch(query);
            }, 300);
        });

        newSearchInput.addEventListener('keydown', (e) => {
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
        });
    }

    async performSearch(query) {
        const searchResults = document.getElementById('searchResults');
        if (!searchResults) return;

        if (!query || query.trim().length < 2) {
            searchResults.innerHTML = '';
            return;
        }

        // Show loading state
        searchResults.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <div class="loading-text">Searching...</div>
            </div>
        `;

        try {
            const data = await this.searchContent(query);
            
            if (data.results && data.results.length > 0) {
                this.renderContentRow('searchResults', data.results);
                this.showToast(`Found ${data.results.length} results`, 'success');
            } else {
                this.renderEmptyState(searchResults, 'No results found for your search');
            }
        } catch (error) {
            console.error('Search error:', error);
            this.renderErrorState('searchResults', 'Search failed. Please try again.');
            this.showToast('Search failed. Please try again.', 'error');
        }
    }

    // Hero Section Management
    async updateHeroSection(item) {
        if (!item) return;
        
        try {
            this.currentHeroItem = item;
            
            const heroSection = document.getElementById('heroSection');
            const heroTitle = document.getElementById('heroTitle');
            const heroRating = document.getElementById('heroRating');
            const heroYear = document.getElementById('heroYear');
            const heroSeasons = document.getElementById('heroSeasons');
            const heroGenres = document.getElementById('heroGenres');
            const heroDescription = document.getElementById('heroDescription');
            
            // Update background image
            if (item.backdrop_path) {
                const img = new Image();
                img.onload = () => {
                    heroSection.style.backgroundImage = `
                        linear-gradient(135deg, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.4) 50%, transparent 100%), 
                        linear-gradient(77deg, rgba(20, 20, 20, 0.9) 0%, transparent 60%), 
                        url('${this.IMG_BASE_LARGE}${item.backdrop_path}')
                    `;
                };
                img.src = `${this.IMG_BASE_LARGE}${item.backdrop_path}`;
            }
            
            // Update content
            heroTitle.textContent = this.truncateText(item.title || item.name || 'Unknown Title', 60);
            heroRating.textContent = this.getContentRating(item);
            heroYear.textContent = this.extractYear(item.release_date || item.first_air_date);
            
            // Update media type info
            if (this.getMediaType(item) === 'tv') {
                heroSeasons.textContent = item.number_of_seasons ? 
                    `${item.number_of_seasons} Seasons` : 'TV Series';
            } else {
                heroSeasons.textContent = 'Movie';
            }
            
            // Update genres
            const genreText = await this.getGenresText(item);
            heroGenres.textContent = genreText;
            
            // Update description
            heroDescription.textContent = this.truncateText(
                item.overview || 'No description available.', 
                200
            );
            
            // Setup hero buttons
            this.setupHeroButtons(item);
            
        } catch (error) {
            console.error('Error updating hero section:', error);
        }
    }

    setupHeroButtons(item) {
        const playBtn = document.getElementById('heroPlayBtn');
        const infoBtn = document.getElementById('heroInfoBtn');
        
        playBtn.onclick = () => this.playContent(item);
        infoBtn.onclick = () => this.showContentDetails(item);
    }

    async getGenresText(item) {
        try {
            const mediaType = this.getMediaType(item);
            const details = await this.fetchFromTMDB(`/${mediaType}/${item.id}`);
            
            if (details.genres && details.genres.length > 0) {
                return details.genres.slice(0, 3).map(g => g.name).join(' • ');
            }
        } catch (error) {
            console.log('Could not fetch genres:', error);
        }
        return 'Entertainment';
    }

    // Hero Rotation
    setupHeroRotation() {
        let rotationInterval;
        let isPaused = false;
        let currentIndex = 0;
        
        const startRotation = () => {
            if (rotationInterval) clearInterval(rotationInterval);
            
            rotationInterval = setInterval(() => {
                if (!isPaused && this.contentData.trending.length > 1) {
                    currentIndex = (currentIndex + 1) % Math.min(5, this.contentData.trending.length);
                    this.updateHeroSection(this.contentData.trending[currentIndex]);
                }
            }, 8000);
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

        // Start rotation only if we have trending content
        if (this.contentData.trending.length > 1) {
            startRotation();
        }
    }

    // My List Management
    addToMyList(item) {
        try {
            let myList = this.getMyListFromStorage();
            
            if (!myList.find(existing => existing.id === item.id)) {
                myList.unshift(item);
                
                // Limit to 100 items
                if (myList.length > 100) {
                    myList = myList.slice(0, 100);
                }
                
                this.saveMyListToStorage(myList);
                this.contentData.myList = myList;
                this.showToast('Added to My List', 'success');
                this.updateMyListDisplay();
            } else {
                this.showToast('Already in My List', 'info');
            }
        } catch (error) {
            console.error('Error adding to My List:', error);
            this.showToast('Failed to add to My List', 'error');
        }
    }

    removeFromMyList(itemId) {
        try {
            let myList = this.getMyListFromStorage();
            const originalLength = myList.length;
            myList = myList.filter(item => item.id !== itemId);
            
            if (myList.length < originalLength) {
                this.saveMyListToStorage(myList);
                this.contentData.myList = myList;
                this.showToast('Removed from My List', 'success');
                this.updateMyListDisplay();
            }
        } catch (error) {
            console.error('Error removing from My List:', error);
            this.showToast('Failed to remove from My List', 'error');
        }
    }

    updateMyListDisplay() {
        const container = document.getElementById('myListRow');
        if (!container) return;
        
        const myList = this.getMyListFromStorage();
        
        if (myList.length === 0) {
            this.renderEmptyState(container, 'Your list is empty', '<i class="fas fa-heart"></i>');
        } else {
            this.renderContentRow('myListRow', myList);
            
            // Add remove buttons after rendering
            setTimeout(() => {
                this.addRemoveButtonsToMyList(container, myList);
            }, 100);
        }
    }

    addRemoveButtonsToMyList(container, myList) {
        const contentItems = container.querySelectorAll('.content-item');
        contentItems.forEach((item, index) => {
            if (myList[index]) {
                const removeBtn = document.createElement('button');
                removeBtn.className = 'remove-from-list-btn';
                removeBtn.innerHTML = '<i class="fas fa-times"></i>';
                removeBtn.onclick = (e) => {
                    e.stopPropagation();
                    this.removeFromMyList(myList[index].id);
                };
                
                item.appendChild(removeBtn);
            }
        });
    }

    // Context Menu
    showContextMenu(event, item) {
        // Remove any existing context menu
        const existingMenu = document.querySelector('.context-menu');
        if (existingMenu) {
            existingMenu.remove();
        }

        const contextMenu = document.createElement('div');
        contextMenu.className = 'context-menu';
        contextMenu.style.top = `${event.clientY}px`;
        contextMenu.style.left = `${event.clientX}px`;

        const options = [
            { text: 'Play Now', icon: 'fas fa-play', action: () => this.playContent(item) },
            { text: 'Add to My List', icon: 'fas fa-plus', action: () => this.addToMyList(item) },
            { text: 'More Info', icon: 'fas fa-info-circle', action: () => this.showContentDetails(item) }
        ];

        options.forEach(option => {
            const menuItem = document.createElement('div');
            menuItem.className = 'context-menu-item';
            menuItem.innerHTML = `<i class="${option.icon}"></i> ${option.text}`;
            
            menuItem.onclick = () => {
                option.action();
                contextMenu.remove();
            };
            
            contextMenu.appendChild(menuItem);
        });

        document.body.appendChild(contextMenu);
        
        // Remove menu on click outside or escape
        const removeMenu = (e) => {
            if (!contextMenu.contains(e.target)) {
                contextMenu.remove();
                document.removeEventListener('click', removeMenu);
                document.removeEventListener('keydown', handleEscape);
            }
        };
        
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                contextMenu.remove();
                document.removeEventListener('click', removeMenu);
                document.removeEventListener('keydown', handleEscape);
            }
        };
        
        setTimeout(() => {
            document.addEventListener('click', removeMenu);
            document.addEventListener('keydown', handleEscape);
        }, 10);
    }

    // Content Details Modal
    showContentDetails(item) {
        const modal = document.createElement('div');
        modal.className = 'content-details-modal';
        
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        
        const posterPath = item.backdrop_path || item.poster_path;
        const year = this.extractYear(item.release_date || item.first_air_date);
        const rating = this.getContentRating(item);
        const mediaType = this.getMediaType(item) === 'tv' ? 'TV Series' : 'Movie';

        modalContent.innerHTML = `
            <div class="modal-hero">
                ${posterPath ? `
                    <img src="${this.IMG_BASE_LARGE}${posterPath}" alt="${item.title || item.name}">
                ` : `
                    <div class="image-placeholder">
                        <i class="fas fa-film"></i>
                    </div>
                `}
                <button class="modal-close-btn" onclick="this.closest('.content-details-modal').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <h2 class="modal-title">${this.truncateText(item.title || item.name || 'Unknown Title', 50)}</h2>
                <div class="modal-meta">
                    <span class="modal-rating">${rating}</span>
                    <span class="modal-year">${year}</span>
                    <span class="modal-type">${mediaType}</span>
                    ${item.vote_average ? `<span class="modal-tmdb-rating"><i class="fas fa-star"></i> ${item.vote_average.toFixed(1)}</span>` : ''}
                </div>
                <p class="modal-overview">${item.overview || 'No description available for this content.'}</p>
                <div class="modal-actions">
                    <button class="modal-btn modal-play-btn">
                        <i class="fas fa-play"></i> Play Now
                    </button>
                    <button class="modal-btn modal-add-btn">
                        <i class="fas fa-plus"></i> Add to List
                    </button>
                </div>
            </div>
        `;

        modal.appendChild(modalContent);
        document.body.appendChild(modal);

        // Setup modal event listeners
        modalContent.querySelector('.modal-play-btn').onclick = () => {
            this.playContent(item);
            modal.remove();
        };

        modalContent.querySelector('.modal-add-btn').onclick = () => {
            this.addToMyList(item);
        };

        // Close modal on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        // Close modal on escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    }

    // Page Navigation
    showPage(pageId, navElement = null) {
        // Update page visibility
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.classList.add('active');
        }
        
        // Update navigation active state
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelectorAll('.mobile-nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        if (navElement) {
            navElement.classList.add('active');
        }
        
        // Update mobile nav
        const mobileNavItem = document.querySelector(`[data-page="${pageId}"]`);
        if (mobileNavItem) {
            mobileNavItem.classList.add('active');
        }
        
        // Handle page-specific loading
        this.handlePageLoad(pageId);
    }

    async handlePageLoad(pageId) {
        switch (pageId) {
            case 'movies':
                if (this.contentData.movies.length === 0) {
                    await this.loadPopularMovies();
                }
                break;
            case 'tv-shows':
                if (this.contentData.tvShows.length === 0) {
                    await this.loadPopularTVShows();
                }
                break;
            case 'new-popular':
                if (this.contentData.newPopular.length === 0) {
                    await this.loadNewAndPopular();
                }
                break;
            case 'my-list':
                this.updateMyListDisplay();
                break;
            case 'search':
                this.setupSearch();
                setTimeout(() => {
                    const searchInput = document.getElementById('searchInput');
                    if (searchInput) searchInput.focus();
                }, 100);
                break;
        }
    }

    // Event Listeners Setup
    setupEventListeners() {
        // Search icon
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

        // Close video button
        const closeVideoBtn = document.querySelector('.close-video');
        if (closeVideoBtn) {
            closeVideoBtn.addEventListener('click', () => this.closeVideo());
        }

        // Navigation items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const pageId = this.getPageIdFromText(item.textContent);
                this.showPage(pageId, item);
            });
        });

        // Mobile navigation items
        document.querySelectorAll('.mobile-nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const pageId = item.dataset.page;
                this.showPage(pageId, null);
                
                // Update mobile nav active state
                document.querySelectorAll('.mobile-nav-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
            });
        });

        // Setup info button if it exists
        const infoBtn = document.querySelector('.info-btn');
        if (infoBtn) {
            infoBtn.addEventListener('click', () => {
                if (this.currentHeroItem) {
                    this.showContentDetails(this.currentHeroItem);
                }
            });
        }

        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                
            }
        });

        // Handle window resize
        window.addEventListener('resize', this.debounce(() => {
            this.handleWindowResize();
        }, 250));
    }

    // Keyboard Shortcuts
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ignore if user is typing in an input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                if (e.key === 'Escape') {
                    e.target.blur();
                }
                return;
            }

            switch (e.key) {
                case 'Escape':
                    this.closeVideo();
                    // Close any open modals
                    document.querySelectorAll('.content-details-modal, .context-menu').forEach(modal => {
                        modal.remove();
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
                    const videoPlayer = document.getElementById('videoPlayer');
                    if (videoPlayer && videoPlayer.style.display === 'block') {
                        e.preventDefault();
                        // Placeholder for video controls
                        this.showToast('Video controls coming soon', 'info');
                    }
                    break;
            }
        });
    }

    // Close Video Player
    closeVideo() {
        const videoPlayer = document.getElementById('videoPlayer');
        const videoFrame = document.getElementById('videoFrame');
        
        if (videoPlayer) {
            videoPlayer.style.display = 'none';
            videoPlayer.classList.remove('active');
        }
        
        if (videoFrame) {
            videoFrame.src = '';
        }
    }

    // Toast Notifications
    showToast(message, type = 'info') {
        // Remove existing toasts
        const existingToasts = document.querySelectorAll('.toast-notification');
        existingToasts.forEach(toast => toast.remove());

        const toast = document.createElement('div');
        toast.className = `toast-notification ${type}`;
        
        const icons = {
            success: '<i class="fas fa-check-circle"></i>',
            error: '<i class="fas fa-exclamation-triangle"></i>',
            warning: '<i class="fas fa-exclamation-circle"></i>',
            info: '<i class="fas fa-info-circle"></i>'
        };
        
        toast.innerHTML = `
            ${icons[type] || icons.info}
            <span>${message}</span>
        `;

        document.body.appendChild(toast);

        // Show toast
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);

        // Auto remove after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);

        // Allow manual dismissal
        toast.addEventListener('click', () => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        });
    }

    // Storage Management
    getMyListFromStorage() {
        try {
            const data = localStorage.getItem('streaming_my_list');
            return JSON.parse(data || '[]');
        } catch (error) {
            console.warn('Error reading My List from storage:', error);
            return [];
        }
    }

    saveMyListToStorage(myList) {
        try {
            localStorage.setItem('streaming_my_list', JSON.stringify(myList));
        } catch (error) {
            console.warn('Error saving My List to storage:', error);
        }
    }

    addToWatchHistory(item) {
        try {
            let history = JSON.parse(localStorage.getItem('streaming_watch_history') || '[]');
            
            // Remove if already exists to update timestamp
            history = history.filter(historyItem => historyItem.id !== item.id);
            
            // Add to beginning with timestamp
            history.unshift({
                ...item,
                watchedAt: new Date().toISOString()
            });
            
            // Limit to 50 items
            if (history.length > 50) {
                history = history.slice(0, 50);
            }
            
            localStorage.setItem('streaming_watch_history', JSON.stringify(history));
        } catch (error) {
            console.warn('Error saving to watch history:', error);
        }
    }

    // Utility Functions
    getMediaType(item) {
        if (item.media_type) {
            return item.media_type;
        }
        if (item.first_air_date || item.number_of_seasons) {
            return 'tv';
        }
        if (item.release_date) {
            return 'movie';
        }
        return 'movie'; // Default fallback
    }

    isValidItem(item) {
        return (item.poster_path || item.backdrop_path) && 
               (item.media_type === 'movie' || item.media_type === 'tv' || item.release_date || item.first_air_date);
    }

    extractYear(dateString) {
        if (!dateString) return 'N/A';
        return dateString.split('-')[0] || 'N/A';
    }

    getContentRating(item) {
        if (item.adult) return 'R';
        if (this.getMediaType(item) === 'tv') return 'TV-14';
        return 'PG-13';
    }

    truncateText(text, maxLength) {
        if (!text) return '';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    getPageIdFromText(text) {
        const mapping = {
            'Home': 'home',
            'TV Shows': 'tv-shows',
            'Movies': 'movies',
            'New & Popular': 'new-popular',
            'My List': 'my-list'
        };
        return mapping[text] || 'home';
    }

    getPlaceholderImage() {
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjYwIiBoZWlnaHQ9IjE0NiIgdmlld0JveD0iMCAwIDI2MCAxNDYiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjI2MCIgaGVpZ2h0PSIxNDYiIGZpbGw9IiMzMzMiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZmlsbD0iIzY2NiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCI+Tm8gSW1hZ2U8L3RleHQ+PC9zdmc+';
    }

    // Error and Empty State Rendering
    renderErrorState(containerId, message) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Oops! Something went wrong</h3>
                <p>${message}</p>
                <button class="retry-btn" onclick="window.streamingPlatform.retryLoad('${containerId}')">
                    <i class="fas fa-redo"></i> Try Again
                </button>
            </div>
        `;
    }

    renderEmptyState(container, message, icon = '<i class="fas fa-film"></i>') {
        if (typeof container === 'string') {
            container = document.getElementById(container);
        }
        if (!container) return;
        
        container.innerHTML = `
            <div class="content-item empty">
                <div class="icon">${icon}</div>
                <div class="title">${message}</div>
            </div>
        `;
    }

    retryLoad(containerId) {
        const retryMap = {
            'trendingRow': () => this.loadTrendingContent(),
            'moviesRow': () => this.loadPopularMovies(),
            'allMoviesRow': () => this.loadPopularMovies(),
            'tvShowsRow': () => this.loadPopularTVShows(),
            'allTVRow': () => this.loadPopularTVShows(),
            'newPopularRow': () => this.loadNewAndPopular(),
            'searchResults': () => {
                const searchInput = document.getElementById('searchInput');
                if (searchInput && searchInput.value) {
                    this.performSearch(searchInput.value);
                }
            }
        };

        const retryFunction = retryMap[containerId];
        if (retryFunction) {
            retryFunction();
        }
    }

    async retryFailedRequests() {
        if (!this.isOnline) return;
        
        try {
            const retryTasks = [];
            
            if (this.contentData.trending.length === 0) {
                retryTasks.push(this.loadTrendingContent());
            }
            if (this.contentData.movies.length === 0) {
                retryTasks.push(this.loadPopularMovies());
            }
            if (this.contentData.tvShows.length === 0) {
                retryTasks.push(this.loadPopularTVShows());
            }
            
            if (retryTasks.length > 0) {
                await Promise.allSettled(retryTasks);
                this.showToast('Content reloaded successfully', 'success');
            }
        } catch (error) {
            console.error('Error retrying failed requests:', error);
        }
    }

    // Window Resize Handler
    handleWindowResize() {
        const isMobile = window.innerWidth <= 768;
        
        // Reset scroll positions on mobile
        if (isMobile) {
            document.querySelectorAll('.content-row').forEach(row => {
                row.scrollLeft = 0;
            });
        }
    }

    // Menu Functions
    showNotifications(event) {
        this.showMenu(event, 'Notifications', [
            { text: 'New Episodes Available', subtitle: 'Check out the latest episodes', icon: 'fas fa-tv' },
            { text: 'Trending Now', subtitle: 'Discover popular content', icon: 'fas fa-fire' },
            { text: 'Your List Updated', subtitle: 'New items added', icon: 'fas fa-heart' }
        ]);
    }

    showProfileMenu(event) {
        this.showMenu(event, 'Account', [
            { text: 'My Profile', icon: 'fas fa-user', action: () => this.showToast('Profile feature coming soon!', 'info') },
            { text: 'Account Settings', icon: 'fas fa-cog', action: () => this.showToast('Settings feature coming soon!', 'info') },
            { text: 'Watch History', icon: 'fas fa-history', action: () => this.showToast('History feature coming soon!', 'info') },
            { text: 'Help Center', icon: 'fas fa-question-circle', action: () => this.showToast('Help feature coming soon!', 'info') },
            { text: 'Sign Out', icon: 'fas fa-sign-out-alt', action: () => this.showToast('Sign out feature coming soon!', 'info') }
        ]);
    }

    showMenu(event, title, items) {
        // Remove existing menu
        const existingMenu = document.querySelector('.dropdown-menu');
        if (existingMenu) {
            existingMenu.remove();
        }

        const menu = document.createElement('div');
        menu.className = 'dropdown-menu';
        menu.style.top = `${event.clientY + 10}px`;
        menu.style.right = '20px';

        const menuHTML = `
            <div class="menu-header"><i class="fas fa-${title.toLowerCase()}"></i> ${title}</div>
            ${items.map(item => `
                <div class="menu-item" ${item.action ? `onclick="(${item.action.toString()})()"` : ''}>
                    <i class="${item.icon}"></i>
                    <div>
                        <div>${item.text}</div>
                        ${item.subtitle ? `<div style="font-size: 13px; color: #888;">${item.subtitle}</div>` : ''}
                    </div>
                </div>
            `).join('')}
        `;

        menu.innerHTML = menuHTML;
        document.body.appendChild(menu);

        // Auto remove on outside click
        setTimeout(() => {
            const removeMenu = (e) => {
                if (!menu.contains(e.target)) {
                    menu.remove();
                    document.removeEventListener('click', removeMenu);
                }
            };
            document.addEventListener('click', removeMenu);
        }, 10);
    }

    // Utility Functions
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

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Global Functions (for compatibility)
function showPage(pageId, navElement = null) {
    if (window.streamingPlatform) {
        window.streamingPlatform.showPage(pageId, navElement);
    }
}

function closeVideo() {
    if (window.streamingPlatform) {
        window.streamingPlatform.closeVideo();
    }
}

function showNotifications(event) {
    if (window.streamingPlatform) {
        window.streamingPlatform.showNotifications(event);
    }
}

function showProfileMenu(event) {
    if (window.streamingPlatform) {
        window.streamingPlatform.showProfileMenu(event);
    }
}

// Initialize the platform when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing streaming platform...');
    try {
        window.streamingPlatform = new Pikuflix();
    } catch (error) {
        console.error('Failed to initialize streaming platform:', error);
        
        // Show fallback error state
        document.body.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #141414; color: white; text-align: center; padding: 20px;">
                <div>
                    <h1 style="font-size: 32px; margin-bottom: 16px; color: #e50914;">PIKUFLIX</h1>
                    <h2 style="font-size: 24px; margin-bottom: 16px;">Something went wrong</h2>
                    <p style="margin-bottom: 24px; color: #cccccc;">We're having trouble loading the platform. Please refresh the page to try again.</p>
                    <button onclick="location.reload()" style="background: #e50914; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 16px; cursor: pointer;">
                        Refresh Page
                    </button>
                </div>
            </div>
        `;
    }
});

// Handle page unload to clean up resources
window.addEventListener('beforeunload', () => {
    if (window.streamingPlatform) {
        window.streamingPlatform.closeVideo();
    }
});
