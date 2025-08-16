let lastX = null, lastY = null, lastZ = null;
let shakeThreshold = 30;
let lastShakeTime = 0;
let shakeDelay = 100;
window.addEventListener('devicemotion', function(event) {
    let acc = event.accelerationIncludingGravity;
    let currentTime = new Date().getTime();

    if (lastX !== null) {
        let deltaX = Math.abs(lastX - acc.x);
        let deltaY = Math.abs(lastY - acc.y);
        let deltaZ = Math.abs(lastZ - acc.z);

        let speed = deltaX + deltaY + deltaZ;

        if (speed > shakeThreshold && (currentTime - lastShakeTime) > shakeDelay) {
            lastShakeTime = currentTime;
            openMenu();
        }
    }
    lastX = acc.x;
    lastY = acc.y;
    lastZ = acc.z;
});


function openMenu() {
    document.querySelector('.overlay').style.display = 'block';
    document.querySelector('.popup').style.display = 'block';
}


document.querySelector('.overlay').addEventListener('click', function() {
    document.querySelector('.overlay').style.display = 'none';
    document.querySelector('.popup').style.display = 'none';
});
       function u9h() {
  const a = document.getElementById("c1r");

  const b = document.createElement("div");
  b.className = "p1q";
  b.innerHTML = `
    Install PikuFlix Comfort
    <div class="m2l">
      <button class="t0f z3b">Install</button>
      <button class="t0f y8n">Maybe Later</button>
    </div>
  `;

  a.appendChild(b);

  const installBtn = b.querySelector(".z3b");
  const laterBtn = b.querySelector(".y8n");

  laterBtn.addEventListener("click", () => {
    b.style.animation = "k6p 0.4s forwards";
    setTimeout(() => b.remove(), 400);
  });

  installBtn.addEventListener("click", () => {
    b.innerHTML = `
      Installing PikuFlix Comfort...
      <div class="q4u">
        <div class="w5v"></div>
      </div>
    `;

    const progressBar = b.querySelector(".w5v");
    let progress = 0;
    const interval = setInterval(() => {
      progress += 5;
      progressBar.style.width = progress + "%";
      if (progress >= 100) {
        clearInterval(interval);

      
        document.body.classList.add("comfort-mode");

        b.innerHTML = '<i class="fa-solid fa-check" style="color:#4CAF50;margin-right:6px;"></i> Installation Complete!';
        setTimeout(() => {
          b.style.animation = "k6p 0.4s forwards";
          setTimeout(() => b.remove(), 400);
        }, 1500);
      }
    }, 200);
  });
}

const delay = Math.floor(Math.random() * (20000 - 10000 + 1)) + 10000;
setTimeout(u9h, delay);
       const reportForm = document.getElementById("reportForm");
const reportType = document.getElementById("reportType");
const idIssueSection = document.getElementById("idIssueSection");
const verifyIdBtn = document.getElementById("verifyIdBtn");
const verifyResult = document.getElementById("verifyResult");
const correctNameInput = document.getElementById("correctName");
const correctIdInput = document.getElementById("correctId");
const reportText = document.getElementById("reportText");

function toggleReport() {
    reportForm.style.display = (reportForm.style.display === "flex") ? "none" : "flex";
}

reportType.addEventListener("change", () => {
    idIssueSection.style.display = (reportType.value === "id-issue") ? "block" : "none";
});

verifyIdBtn.addEventListener("click", () => {
    const name = correctNameInput.value.trim();
    const id = correctIdInput.value.trim();
    if (!name) {
        verifyResult.textContent = "❌ Please enter the movie/series name.";
        verifyResult.style.color = "red";
        return;
    }
    if (!id || isNaN(id)) {
        verifyResult.textContent = "❌ Please enter a valid numeric TMDb ID.";
        verifyResult.style.color = "red";
        return;
    }
    const tmdbMovieUrl = `https://www.themoviedb.org/movie/${id}`;
    const tmdbTvUrl = `https://www.themoviedb.org/tv/${id}`;
    window.open(tmdbMovieUrl, "_blank");
    window.open(tmdbTvUrl, "_blank");
    verifyResult.textContent = `✅ TMDb pages opened. Please check if "${name}" matches the title on TMDb.`;
    verifyResult.style.color = "green";
});

function sendReport() {
    const type = reportType.value;
    const description = reportText.value.trim();
    if (!type) {
        alert("Please select a report type.");
        return;
    }
    if (!description) {
        alert("Please enter a description.");
        return;
    }
    const reportData = { type: type, description: description };
    if (type === "id-issue") {
        const movieName = correctNameInput.value.trim();
        const movieId = correctIdInput.value.trim();
        if (!movieName || !movieId) {
            alert("Please fill in both the name and ID for the Movie/Series ID issue.");
            return;
        }
        reportData.correctName = movieName;
        reportData.correctId = movieId;
    }
    const webhookUrl = "https://discord.com/api/webhooks/1403661366912614491/otJ3M38G4KUgIhcphjOsNAFW5xBaflMQ0ol16YH3HGmL_c_23PDbugcyIhg_eltvBn5V";
    const embed = {
        title: "📢 New Report Submitted",
        description: `**Type:** ${reportData.type}\n${reportData.correctName ? `**Correct Name:** ${reportData.correctName}\n` : ""}${reportData.correctId ? `**Correct ID:** ${reportData.correctId}\n` : ""}**Description:** ${reportData.description}`,
        color: 3447003,
        footer: { text: "Report System", icon_url: "https://i.imgur.com/AfFp7pu.png" },
        timestamp: new Date()
    };
    fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ embeds: [embed] })
    })
    .then(res => {
        if (res.ok) {
            alert("✅ Report submitted successfully!");
            toggleReport();
        } else {
            alert("❌ Failed to send report. Please try again.");
        }
    })
    .catch(err => {
        console.error("Webhook error:", err);
        alert("❌ Error sending report.");
    });
}

        class DraggableAssistant {
            constructor() {
                this.assistantBtn = document.getElementById('assistantBtn');
                this.popup = document.getElementById('popup');
                this.popupOverlay = document.getElementById('popupOverlay');
                this.closeBtn = document.getElementById('closeBtn');

                this.isDragging = false;
                this.dragStarted = false;
                this.initialX = 0;
                this.initialY = 0;
                this.offsetX = 0;
                this.offsetY = 0;
                this.dragThreshold = 8;
                this.totalDragDistance = 0;

                this.init();
            }

            init() {

                this.assistantBtn.addEventListener('mousedown', this.handleStart.bind(this));
                document.addEventListener('mousemove', this.handleMove.bind(this));
                document.addEventListener('mouseup', this.handleEnd.bind(this));

                this.assistantBtn.addEventListener('touchstart', this.handleStart.bind(this), { passive: false });
                document.addEventListener('touchmove', this.handleMove.bind(this), { passive: false });
                document.addEventListener('touchend', this.handleEnd.bind(this));

                this.assistantBtn.addEventListener('contextmenu', (e) => e.preventDefault());

                this.closeBtn.addEventListener('click', this.closePopup.bind(this));
                this.popupOverlay.addEventListener('click', (e) => {
                    if (e.target === this.popupOverlay) {
                        this.closePopup();
                    }
                });

                document.querySelectorAll('.action-btn').forEach(btn => {
                    btn.addEventListener('click', this.handleActionClick.bind(this));
                });

                document.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape') {
                        this.closePopup();
                    }
                });

                document.addEventListener('selectstart', (e) => {
                    if (this.isDragging) e.preventDefault();
                });
            }

            getPointerPosition(e) {
                return e.touches ? { x: e.touches[0].clientX, y: e.touches[0].clientY } 
                                : { x: e.clientX, y: e.clientY };
            }

            handleStart(e) {
                e.preventDefault();
                e.stopPropagation();

                const pointer = this.getPointerPosition(e);
                const rect = this.assistantBtn.getBoundingClientRect();

                this.isDragging = true;
                this.dragStarted = false;
                this.totalDragDistance = 0;

                this.offsetX = pointer.x - rect.left;
                this.offsetY = pointer.y - rect.top;

                this.initialX = pointer.x;
                this.initialY = pointer.y;

                this.assistantBtn.style.position = 'fixed';
                this.assistantBtn.style.left = rect.left + 'px';
                this.assistantBtn.style.top = rect.top + 'px';
                this.assistantBtn.style.right = 'auto';
                this.assistantBtn.style.bottom = 'auto';

                this.assistantBtn.style.zIndex = '1001';
            }

            handleMove(e) {
                if (!this.isDragging) return;

                const pointer = this.getPointerPosition(e);

                const deltaX = pointer.x - this.initialX;
                const deltaY = pointer.y - this.initialY;
                this.totalDragDistance = Math.abs(deltaX) + Math.abs(deltaY);

                if (this.totalDragDistance > this.dragThreshold && !this.dragStarted) {
                    this.dragStarted = true;
                    this.assistantBtn.classList.add('dragging');
                    document.body.style.userSelect = 'none';
                    e.preventDefault();
                }

                if (this.dragStarted) {
                    e.preventDefault();
                    const newX = pointer.x - this.offsetX;
                    const newY = pointer.y - this.offsetY;

                    const constrainedPos = this.constrainPosition(newX, newY);
                    this.updatePosition(constrainedPos.x, constrainedPos.y);
                }
            }

            handleEnd(e) {
                if (!this.isDragging) return;

                this.isDragging = false;
                this.assistantBtn.classList.remove('dragging');
                this.assistantBtn.style.zIndex = '1000';
                document.body.style.userSelect = '';

                if (this.totalDragDistance <= this.dragThreshold) {
                    this.openPopup();
                }

                this.dragStarted = false;
            }

            constrainPosition(x, y) {
                const viewportWidth = window.innerWidth;
                const viewportHeight = window.innerHeight;
                const btnWidth = this.assistantBtn.offsetWidth;
                const btnHeight = this.assistantBtn.offsetHeight;

                return {
                    x: Math.max(0, Math.min(x, viewportWidth - btnWidth)),
                    y: Math.max(0, Math.min(y, viewportHeight - btnHeight))
                };
            }

            updatePosition(x, y) {
                this.assistantBtn.style.left = x + 'px';
                this.assistantBtn.style.top = y + 'px';
            }

            openPopup() {
                this.popupOverlay.classList.add('active');
                this.popup.classList.add('active');
                document.body.style.overflow = 'hidden';
            }

            closePopup() {
                this.popupOverlay.classList.remove('active');
                this.popup.classList.remove('active');
                document.body.style.overflow = '';
            }

            handleActionClick(e) {
                const action = e.currentTarget.getAttribute('data-action');

                e.currentTarget.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    e.currentTarget.style.transform = '';
                }, 150);

                this.performAction(action);

                setTimeout(() => {
                    this.closePopup();
                }, 300);
            }

            performAction(action) {
                switch(action) {
                    case 'request-movie':
                        console.log('Opening movie request form...');
                        alert('🎬 Movie Request: This would open a movie request form!');
                        break;
                    case 'open-ticket':
                        console.log('Opening support ticket...');
                        alert('🎫 Support Ticket: This would open a new support ticket!');
                        break;
                    case 'report-problem':
                        console.log('Opening problem report...');
                        alert('⚠️ Report Problem: This would open a problem report form!');
                        break;
                    case 'customize-site':
                        console.log('Opening site customization...');
                        alert('⚙️ Customize Site: This would open site customization options!');
                        break;
                    case 'get-help':
                        console.log('Opening help center...');
                        alert('❓ Get Help: This would open the help center!');
                        break;
                    case 'feedback':
                        console.log('Opening feedback form...');
                        alert('💬 Send Feedback: This would open a feedback form!');
                        break;
                    default:
                        console.log('Unknown action:', action);
                }
            }
        }

        document.addEventListener('DOMContentLoaded', () => {
            new DraggableAssistant();
        });

        window.addEventListener('resize', () => {
            const assistantBtn = document.getElementById('assistantBtn');
            if (!assistantBtn) return;

            const rect = assistantBtn.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            if (rect.right > viewportWidth || rect.bottom > viewportHeight || rect.left < 0 || rect.top < 0) {
                let x = Math.max(0, Math.min(rect.left, viewportWidth - rect.width));
                let y = Math.max(0, Math.min(rect.top, viewportHeight - rect.height));

                assistantBtn.style.position = 'fixed';
                assistantBtn.style.left = x + 'px';
                assistantBtn.style.top = y + 'px';
                assistantBtn.style.right = 'auto';
                assistantBtn.style.bottom = 'auto';
            }
        });

        let userInteractions = JSON.parse(localStorage.getItem('pikuflix_interactions') || '{}');

        function saveUserInteraction(itemId, type, value) {
            if (!userInteractions[itemId]) {
                userInteractions[itemId] = {};
            }
            userInteractions[itemId][type] = value;
            localStorage.setItem('pikuflix_interactions', JSON.stringify(userInteractions));
        }

        function getUserInteraction(itemId, type) {
            return userInteractions[itemId]?.[type] || false;
        }

        function showToast(message, type = 'info') {
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check' : type === 'info' ? 'info' : 'exclamation'}"></i> ${message}`;

            document.body.appendChild(toast);

            setTimeout(() => toast.classList.add('show'), 100);
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }

        const historyToggle = document.getElementById('historyToggle');
        const historyList = document.getElementById('historyList');
        const historyItems = document.getElementById('historyItems');

        function loadHistory() {
            const history = getStorageHistory();
            historyItems.innerHTML = "";

            if (history.length === 0) {
                historyItems.innerHTML = '<div class="no-history">No viewing history available.<br>Start watching to build your history!</div>';
                return;
            }

            history.forEach(item => {
                const historyItem = document.createElement('div');
                historyItem.className = 'history-item';

                historyItem.innerHTML = `
                    <div style="position: relative;">
                        <img src="${item.poster_path}" 
                             alt="${item.title}" 
                             class="item-poster"
                             onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQ1MCIgdmlld0JveD0iMCAwIDMwMCA0NTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iNDUwIiBmaWxsPSIjMzMzIi8+Cjx0ZXh0IHg9IjE1MCIgeT0iMjI1IiBmaWxsPSIjNjY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjE2Ij5ObyBJbWFnZTwvdGV4dD4KPC9zdmc+'">
                        <div class="quality-badge">${item.quality || 'HD'}</div>
                        <div class="media-type-badge">${item.media_type || 'movie'}</div>
                    </div>

                    <div class="item-content">
                        <div class="item-header">
                            <h3 class="item-title">${item.title}</h3>
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <span class="item-year">${extractYear(item.release_date)}</span>
                                <div class="item-rating">
                                    <span class="star-icon"></span>
                                    <span>${item.tmdb_rating || item.vote_average || 'N/A'}</span>
                                </div>
                            </div>
                        </div>

                        ${item.genres && item.genres.length > 0 ? `
                            <div class="item-genres">
                                ${item.genres.map(genre => `<span class="genre-tag">${genre}</span>`).join('')}
                            </div>
                        ` : ''}

                        <p class="item-overview">${item.overview || 'No description available.'}</p>

                        <div class="item-meta">
                            <div class="meta-left">
                                ${item.runtime ? `
                                    <div class="meta-item">
                                        <span>🕐</span>
                                        <span>${formatRuntime(item.runtime)}</span>
                                    </div>
                                ` : ''}
                                ${item.views ? `
                                    <div class="meta-item">
                                        <span>👁</span>
                                        <span>${item.views}</span>
                                    </div>
                                ` : ''}
                                <div class="watch-time">Watched: ${item.watchedAt}</div>
                            </div>
                            <button class="rewatch-btn" onclick="rewatchItem(${item.id})">
                                ▶ Watch Again
                            </button>
                        </div>
                    </div>
                `;

                historyItems.appendChild(historyItem);
            });
        }

        function saveToHistory(mediaData) {
            const now = new Date();
            const formattedTime = now.toLocaleString();
            const history = getStorageHistory();

            const historyEntry = {
                id: mediaData.id,
                title: mediaData.title,
                overview: mediaData.overview,
                release_date: mediaData.release_date,
                vote_average: mediaData.vote_average,
                poster_path: mediaData.poster_path,
                media_type: mediaData.media_type || 'movie',
                runtime: mediaData.runtime,
                genres: mediaData.genres || [],
                views: mediaData.views,
                quality: mediaData.quality || 'HD',
                tmdb_rating: mediaData.tmdb_rating || mediaData.vote_average,
                watchedAt: formattedTime,
                timestamp: now.getTime()
            };

            const existingIndex = history.findIndex(item => item.id === mediaData.id);
            if (existingIndex !== -1) {
                history.splice(existingIndex, 1);
            }

            history.unshift(historyEntry);

            if (history.length > 50) {
                history.splice(50);
            }

            setStorageHistory(history);

            if (historyToggle.checked) {
                loadHistory();
            }
        }

        function clearHistory() {
            if (confirm('Are you sure you want to clear your viewing history?')) {
                setStorageHistory([]);
                loadHistory();
            }
        }

        function rewatchItem(itemId) {
            console.log(`Rewatching item with ID: ${itemId}`);

            alert(`Rewatching movie/show with ID: ${itemId}`);
        }

        function extractYear(dateString) {
            if (!dateString) return 'Unknown';
            return new Date(dateString).getFullYear() || 'Unknown';
        }

        function formatRuntime(minutes) {
            if (!minutes) return 'Unknown';
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
        }

        let watchHistoryData = [];

        function getStorageHistory() {
            return watchHistoryData;
        }

        function setStorageHistory(data) {
            watchHistoryData = data;
        }

        historyToggle.addEventListener('change', () => {
            if (historyToggle.checked) {
                historyList.classList.add('active');
                loadHistory();
            } else {
                historyList.classList.remove('active');
            }
        });

        let startX = 0;
        let isSwiping = false;
        const settingsBtn = document.getElementById('settingsBtn');
        const swipeArea = document.querySelector('.settings-swipe-area');

        function handleTouchStart(e) {
            startX = e.touches ? e.touches[0].clientX : e.clientX;
            isSwiping = true;
        }

        function handleTouchMove(e) {
            if (!isSwiping) return;
            const currentX = e.touches ? e.touches[0].clientX : e.clientX;
            const diffX = currentX - startX;

            if (diffX > 40) {
                settingsBtn.classList.add('visible');
                isSwiping = false;
            } else if (diffX < -40) {
                settingsBtn.classList.remove('visible');
                isSwiping = false;
            }
        }

        swipeArea.addEventListener('touchstart', handleTouchStart);
        swipeArea.addEventListener('touchmove', handleTouchMove);
        swipeArea.addEventListener('mousedown', handleTouchStart);
        document.addEventListener('mousemove', handleTouchMove);

        document.addEventListener('click', (e) => {
            if (!settingsBtn.contains(e.target)) {
                settingsBtn.classList.remove('visible');
            }
        });

        const settingsPanel = document.getElementById('settingsPanel');
        const streamPanel = document.getElementById('streamSettingsPanel');
        const guestId = Math.floor(Math.random() * (999999 - 293802 + 1)) + 293802;
        document.getElementById('guestId').textContent = guestId;

        settingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            settingsPanel.classList.add('visible');
        });

        document.addEventListener('click', (e) => {
            if (!settingsPanel.contains(e.target) && !settingsBtn.contains(e.target)) {
                settingsPanel.classList.remove('visible');
                streamPanel.style.display = 'none';
            }
        });

        document.getElementById('openStreamSettings').addEventListener('click', () => {
            streamPanel.style.display = 'block';
        });

        document.getElementById('closeStreamSettings').addEventListener('click', () => {
            streamPanel.style.display = 'none';
        });

        document.getElementById('historyToggle').checked = false;

        const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
        const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
        const VIDSRC_BASE = 'https://vidsrc.xyz/embed';

        let currentContent = [];
        let isSearching = false;

        const header = document.getElementById('header');
        const searchInput = document.getElementById('searchInput');
        const searchBtn = document.getElementById('searchBtn');
        const contentGrid = document.getElementById('contentGrid');
        const loading = document.getElementById('loading');
        const modal = document.getElementById('videoModal');
        const modalTitle = document.getElementById('modalTitle');
        const videoContainer = document.getElementById('videoContainer');

        window.addEventListener('DOMContentLoaded', () => {
            loadTrendingContent();
            setupEventListeners();
        });

        function setupEventListeners() {
            window.addEventListener('scroll', () => {
                if (window.scrollY > 100) {
                    header.classList.add('scrolled');
                } else {
                    header.classList.remove('scrolled');
                }
            });

            searchInput.addEventListener('input', (e) => {
                if (window.searchTimeout) {
                    clearTimeout(window.searchTimeout);
                }

                window.searchTimeout = setTimeout(() => {
                    if (e.target.value.trim()) {
                        performSearch();
                    } else {
                        loadTrendingContent();
                    }
                }, 300);
            });

            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    if (window.searchTimeout) {
                        clearTimeout(window.searchTimeout);
                    }
                    performSearch();
                }
            });

            searchBtn.addEventListener('click', performSearch);

            document.querySelectorAll('.nav-link').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const category = e.target.dataset.category;
                    switchCategory(category);
                });
            });

            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const type = e.target.dataset.type;
                    switchTab(type);
                });
            });

            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeModal();
                }
            });
        }

        document.addEventListener('click', function(e) {
            let target = e.target.closest('a');
            if (target && target.target === '_blank' && /ads|redirect/.test(target.href)) {
                e.preventDefault();
                console.log('Blocked a tab-opening ad link:', target.href);
            }
        }, true);

        const movieDatabase = [
    {
        id: 299534,
        title: "Avengers: Endgame",
        overview: "After the devastating events of Avengers: Infinity War, the universe is in ruins due to the efforts of the Mad Titan, Thanos.",
        release_date: "2019-04-24",
        vote_average: 8.3,
        poster_path: "https://image.tmdb.org/t/p/original/or06FN3Dka5tukK1e9sl16pB3iy.jpg",
        media_type: "movie",
        runtime: 181,
        genres: ["Action", "Adventure", "Drama"],
        views: "12.5M",
        quality: "4K",
        tmdb_rating: 8.3
    },
    {
        id: 550,
        title: "Fight Club",
        overview: "An insomniac office worker and a devil-may-care soapmaker form an underground fight club.",
        release_date: "1999-10-15",
        vote_average: 8.8,
        poster_path: "https://image.tmdb.org/t/p/original/t1K1Ljxc988VhIbU7gV2GK58Re3.jpg",
        media_type: "movie",
        runtime: 139,
        genres: ["Drama", "Thriller"],
        views: "8.9M",
        quality: "HD",
        tmdb_rating: 8.8
    },
    {
        id: 155,
        title: "The Dark Knight",
        overview: "Batman raises the stakes in his war on crime with the help of Lt. Jim Gordon and DA Harvey Dent.",
        release_date: "2008-07-16",
        vote_average: 9.0,
        poster_path: "https://image.tmdb.org/t/p/original/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
        media_type: "movie",
        runtime: 152,
        genres: ["Action", "Crime", "Drama"],
        views: "15.2M",
        quality: "4K",
        tmdb_rating: 9.0
    },
    {
        id: 27205,
        title: "Inception",
        overview: "Dom Cobb is a skilled thief, the absolute best in the dangerous art of extraction.",
        release_date: "2010-07-15",
        vote_average: 8.8,
        poster_path: "https://image.tmdb.org/t/p/original/edv5CZvWj09upOsy2Y6IwDhK8bt.jpg",
        media_type: "movie",
        runtime: 148,
        genres: ["Action", "Sci-Fi", "Thriller"],
        views: "11.7M",
        quality: "4K",
        tmdb_rating: 8.8
    },
    {
        id: 1399,
        name: "Game of Thrones",
        overview: "Seven noble families fight for control of the mythical land of Westeros.",
        first_air_date: "2011-04-17",
        vote_average: 9.3,
        poster_path: "https://image.tmdb.org/t/p/original/u3bZgnGQ9T01sWNhyveQz0wH0Hl.jpg",
        media_type: "tv",
        genres: ["Drama", "Fantasy", "Action"],
        views: "25.8M",
        quality: "4K",
        tmdb_rating: 9.3
    },
    {
        id: 1396,
        name: "Breaking Bad",
        overview: "A high school chemistry teacher turned methamphetamine producer.",
        first_air_date: "2008-01-20",
        vote_average: 9.5,
        poster_path: "https://image.tmdb.org/t/p/original/ggFHVNu6YYI5L9pCfOacjizRGt.jpg",
        media_type: "tv",
        genres: ["Drama", "Crime", "Thriller"],
        views: "18.4M",
        quality: "HD",
        tmdb_rating: 9.5
    },
    {
  "id": null,
  "name": "Suits",
  "overview": "A clever college-aged law school fraudster, Mike Ross, becomes a lawyer at a top New York firm under smooth attorney Harvey Specter, while his secret—that he never attended law school—threatens to unravel his career.",
  "first_air_date": "2011-06-23",
  "vote_average": null,
  "poster_path": "https://image.tmdb.org/t/p/original/vQiryp6LioFxQThywxbC6TuoDjy.jpg",
  "media_type": "tv",
  "genres": ["Legal drama", "Comedy-drama"],
  "views": null,
  "quality": null,
  "tmdb_rating": null
},
{
  "id": null,
  "name": "Demon Slayer: Kimetsu no Yaiba – The Movie: Infinity Castle – Part 1: Akaza Returns",
  "overview": "Tanjiro and the Hashira descend into Muzan Kibutsuji’s maze-like stronghold—infinity Castle—to battle Upper-Rank demons amid the climactic final arc of the Demon Slayer saga.",
  "first_air_date": "2025-07-18",
  "vote_average": null,
  "poster_path": "https://image.tmdb.org/t/p/original/aFRDH3P7TX61FVGpaLhKr6QiOC1.jpg",
  "media_type": "film",
  "genres": ["Fantasy", "Adventure", "Action", "Anime"],
  "views": null,
  "quality": null,
  "tmdb_rating": null
},
    {
        id: 80752,
        name: "Stranger Things",
        overview: "When a young boy disappears, his mother and friends confront terrifying supernatural forces to get him back.",
        release_date: "2016-07-15",
        vote_average: 8.8,
        poster_path: "https://image.tmdb.org/t/p/original/uKYUR8GPkKRCksczYDJb3pwZauo.jpg",
        media_type: "tv",
        genres: ["Drama", "Fantasy", "Horror"],
        views: "22.1M",
        quality: "4K",
        tmdb_rating: 8.8
    },
    {
        id: 335977,
        title: "Joker",
        overview: "In Gotham's fractured society, mentally-troubled comedian Arthur Fleck embarks on a downward spiral.",
        release_date: "2019-10-02",
        vote_average: 8.5,
        poster_path: "https://image.tmdb.org/t/p/original/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg",
        media_type: "movie",
        runtime: 122,
        genres: ["Crime", "Drama", "Thriller"],
        views: "14.3M",
        quality: "4K",
        tmdb_rating: 8.5
    }
];
        async function loadTrendingContent() {
            showLoading();
            currentContent = [...movieDatabase].sort(() => Math.random() - 0.5).slice(0, 16);
            displayContent(currentContent);
            hideLoading();
        }

        async function loadPopularMovies() {
            showLoading();
            currentContent = movieDatabase.filter(item => item.media_type === 'movie');
            displayContent(currentContent);
            hideLoading();
        }

        async function loadPopularTV() {
            showLoading();
            currentContent = movieDatabase.filter(item => item.media_type === 'tv');
            displayContent(currentContent);
            hideLoading();
        }

        async function loadTopRated() {
            showLoading();
            currentContent = [...movieDatabase].sort((a, b) => b.vote_average - a.vote_average).slice(0, 15);
            displayContent(currentContent);
            hideLoading();
        }

        async function performSearch() {
            const query = searchInput.value.trim().toLowerCase();
            if (!query) {
                loadTrendingContent();
                return;
            }

            isSearching = true;
            showLoading();

            const searchResults = movieDatabase.filter(item => {
                const title = (item.title || item.name || '').toLowerCase();
                const overview = (item.overview || '').toLowerCase();
                return title.includes(query) || overview.includes(query);
            });

            currentContent = searchResults;
            displayContent(currentContent);
            hideLoading();
        }

        function displayContent(items) {
            if (!items || items.length === 0) {
                contentGrid.innerHTML = `
                    <div class="no-results">
                        <h3>No results found</h3>
                        <p>Try searching for something else</p>
                    </div>
                `;
                return;
            }

            contentGrid.innerHTML = items.map(item => createContentCard(item)).join('');

            addCardEventListeners();
        }

        function addCardEventListeners() {

            document.querySelectorAll('.like-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    toggleLike(btn);
                });
            });

            document.querySelectorAll('.favorite-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    toggleFavorite(btn);
                });
            });

            document.querySelectorAll('.share-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    shareContent(btn);
                });
            });
        }

        function toggleLike(btn) {
            const itemId = btn.dataset.itemId;
            const isLiked = btn.classList.contains('liked');
            const countSpan = btn.nextElementSibling;
            let currentCount = parseInt(countSpan.textContent) || 0;

            if (isLiked) {
                btn.classList.remove('liked');
                currentCount = Math.max(0, currentCount - 1);
                saveUserInteraction(itemId, 'liked', false);
                showToast('Removed from liked!', 'info');
            } else {
                btn.classList.add('liked');
                currentCount++;
                saveUserInteraction(itemId, 'liked', true);
                showToast('Added to liked!', 'success');
            }

            countSpan.textContent = formatCount(currentCount);
        }

        function toggleFavorite(btn) {
            const itemId = btn.dataset.itemId;
            const isFavorited = btn.classList.contains('favorited');

            if (isFavorited) {
                btn.classList.remove('favorited');
                saveUserInteraction(itemId, 'favorited', false);
                showToast('Removed from favorites!', 'info');
            } else {
                btn.classList.add('favorited');
                saveUserInteraction(itemId, 'favorited', true);
                showToast('Added to favorites!', 'success');
            }
        }

        function shareContent(btn) {
            const title = btn.dataset.title;
            if (navigator.share) {
                navigator.share({
                    title: title,
                    text: `Check out ${title} on PikuFlix!`,
                    url: window.location.href
                });
            } else {

                navigator.clipboard.writeText(window.location.href);
                showToast('Link copied to clipboard!', 'success');
            }
        }

        function formatCount(count) {
            if (count >= 1000000) {
                return (count / 1000000).toFixed(1) + 'M';
            } else if (count >= 1000) {
                return (count / 1000).toFixed(1) + 'K';
            }
            return count.toString();
       }

       function createContentCard(item) {
    const title = item.title || item.name;
    const year = new Date(item.release_date || item.first_air_date).getFullYear();
    const rating = item.vote_average?.toFixed(1) || 'N/A';
    const isLiked = getUserInteraction(item.id, 'liked');
    const isFavorited = getUserInteraction(item.id, 'favorited');

    const likeCount = Math.floor(Math.random() * 10000);
    const shareCount = Math.floor(Math.random() * 5000);

    let cardImageContent;
    if (item.poster_path) {

        cardImageContent = `<img src="${item.poster_path}" alt="${title}" />`;
    } else {

        cardImageContent = `<i class="fas fa-${item.media_type === 'movie' ? 'film' : 'tv'}"></i>`;
    }

    return `
        <div class="content-card" onclick="playContent(${item.id}, '${item.media_type}', '${title.replace(/'/g, "\\'")}')">
            <div class="card-image">
                ${item.quality ? `<div class="quality-badge">${item.quality}</div>` : ''}
                ${item.runtime ? `<div class="duration-badge">${item.runtime}m</div>` : ''}
                ${cardImageContent}
                <div class="play-overlay">
                    <button class="play-btn">
                        <i class="fas fa-play"></i>
                        Play Now
                    </button>
                </div>
            </div>
            <div class="card-content">
                <h3 class="card-title">${title}</h3>
                <div class="card-info">
                    <span class="card-year">${year}</span>
                    <div class="tmdb-rating">
                        <i class="fas fa-star"></i>
                        ${rating}
                    </div>
                </div>
                ${item.genres ? `
                    <div class="card-genre">
                        ${item.genres.slice(0, 3).map(genre => `<span class="genre-tag">${genre}</span>`).join('')}
                    </div>
                ` : ''}
                <p class="card-overview">${item.overview || 'No description available.'}</p>
                <div class="card-stats">
                    <div class="card-views">
                        <i class="fas fa-eye"></i>
                        ${item.views || '0'}
                    </div>
                    <div class="card-actions">
                        <button class="action-btn like-btn ${isLiked ? 'liked' : ''}" data-item-id="${item.id}" title="Like">
                            <i class="fas fa-heart"></i>
                        </button>
                        <span class="like-count">${formatCount(likeCount)}</span>

                        <button class="action-btn favorite-btn ${isFavorited ? 'favorited' : ''}" data-item-id="${item.id}" title="Add to Favorites">
                            <i class="fas fa-bookmark"></i>
                        </button>

                        <button class="action-btn share-btn" data-item-id="${item.id}" data-title="${title}" title="Share">
                            <i class="fas fa-share"></i>
                        </button>
                        <span class="share-count">${formatCount(shareCount)}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

       function switchCategory(category) {
           document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
           document.querySelector(`[data-category="${category}"]`).classList.add('active');

           switch (category) {
               case 'trending':
                   loadTrendingContent();
                   break;
               case 'movies':
                   loadPopularMovies();
                   break;
               case 'tv':
                   loadPopularTV();
                   break;
           }
       }

       function switchTab(type) {
           document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
           document.querySelector(`[data-type="${type}"]`).classList.add('active');

           switch (type) {
               case 'trending':
                   loadTrendingContent();
                   break;
               case 'popular-movies':
                   loadPopularMovies();
                   break;
               case 'popular-tv':
                   loadPopularTV();
                   break;
               case 'top-rated':
                   loadTopRated();
                   break;
           }
       }

       function showLoading() {
           loading.style.display = 'flex';
           contentGrid.style.display = 'none';
       }

       function hideLoading() {
           loading.style.display = 'none';
           contentGrid.style.display = 'grid';
       }

       function playContent(id, mediaType, title) {
           saveToHistory(title);
           openModal(id, mediaType, title);
       }

       function openModal(id, mediaType, title) {
           modalTitle.textContent = title;
           modal.style.display = 'block';
           document.body.style.overflow = 'hidden';

           videoContainer.innerHTML = `
               <div class="loading">
                   <div class="spinner"></div>
                   Preparing your video...
               </div>
           `;

           setTimeout(() => {
               const embedUrl = `${VIDSRC_BASE}/${mediaType}/${id}`;
               videoContainer.innerHTML = `
                   <iframe 
                       src="${embedUrl}" 
                       allowfullscreen
                       style="width: 100%; height: 100%; border: none;"
                       loading="lazy">
                   </iframe>
                   <div style="text-align: right; padding: 10px;">
                       <button id="nextEpisodeBtn" style="padding: 8px 16px; font-size: 16px; background: #e50914; color: white; border: none; border-radius: 5px; cursor: pointer;">
                           ⏭️ Next Episode
                       </button>
                   </div>
               `;

               const nextBtn = document.getElementById('nextEpisodeBtn');
               if (nextBtn && mediaType === 'tv') {
                   nextBtn.addEventListener('click', () => {
                       showToast('Next episode feature coming soon!', 'info');
                   });
               } else if (nextBtn) {
                   nextBtn.style.display = 'none';
               }
           }, 1500);
       }

       function closeModal() {
           modal.style.display = 'none';
           document.body.style.overflow = 'auto';
           videoContainer.innerHTML = `
               <div class="loading">
                   <div class="spinner"></div>
                   Loading video...
               </div>
           `;
       }

       document.addEventListener('keydown', (e) => {
           if (e.key === 'Escape' && modal.style.display === 'block') {
               closeModal();
           }

           if (e.key === 'F11' && modal.style.display === 'block') {
               e.preventDefault();
               toggleFullscreen();
           }

           if (e.ctrlKey && e.key === 'k') {
               e.preventDefault();
               searchInput.focus();
           }
       });

       function toggleFullscreen() {
           if (modal.classList.contains('fullscreen')) {
               modal.classList.remove('fullscreen');
               showToast('Exited fullscreen mode', 'info');
           } else {
               modal.classList.add('fullscreen');
               showToast('Entered fullscreen mode', 'info');
           }
       }

       let searchSuggestions = [];
       function updateSearchSuggestions() {
           const query = searchInput.value.toLowerCase().trim();
           if (query.length < 2) return;

           searchSuggestions = movieDatabase
               .filter(item => (item.title || item.name).toLowerCase().includes(query))
               .slice(0, 5);
       }

       let scrollTimeout;
       window.addEventListener('scroll', () => {
           if (scrollTimeout) return;
           scrollTimeout = setTimeout(() => {
               if (window.scrollY > 100) {
                   header.classList.add('scrolled');
               } else {
                   header.classList.remove('scrolled');
               }
               scrollTimeout = null;
           }, 10);
       });

       window.addEventListener('error', (e) => {
           console.error('Runtime error:', e.error);
           showToast('Something went wrong. Please try again.', 'error');
       });

       if ('serviceWorker' in navigator) {
           navigator.serviceWorker.register('/sw.js').catch(err => {
               console.log('Service Worker registration failed:', err);
           });
       }

       document.addEventListener('DOMContentLoaded', () => {

           const focusableElements = document.querySelectorAll('button, input, a, [tabindex]');
           focusableElements.forEach(el => {
               el.addEventListener('focus', (e) => {
                   e.target.style.outline = '2px solid #e50914';
                   e.target.style.outlineOffset = '2px';
               });

               el.addEventListener('blur', (e) => {
                   e.target.style.outline = 'none';
               });
           });
       });

       const userPreferences = JSON.parse(localStorage.getItem('pikuflix_preferences') || '{}');

       function savePreference(key, value) {
           userPreferences[key] = value;
           localStorage.setItem('pikuflix_preferences', JSON.stringify(userPreferences));
       }

       function getPreference(key, defaultValue) {
           return userPreferences[key] !== undefined ? userPreferences[key] : defaultValue;
       }

       function initializeApp() {

           const savedTheme = getPreference('theme', 'dark');
           document.body.setAttribute('data-theme', savedTheme);

           const savedQuality = getPreference('quality', 'auto');
           console.log('Using quality setting:', savedQuality);

           showToast('Welcome to PikuFlix!\t<i class="fa-solid fa-tv"></i>', 'success');
       }

       window.addEventListener('load', initializeApp);

       let performanceMetrics = {
           contentLoadTime: 0,
           searchResponseTime: 0,
           modalOpenTime: 0
       };

       function trackPerformance(action, startTime) {
           const endTime = performance.now();
           const duration = endTime - startTime;
           performanceMetrics[action] = duration;

           if (duration > 1000) {
               console.warn(`Slow performance detected for ${action}: ${duration.toFixed(2)}ms`);
           }
       }

       const originalLoadTrending = loadTrendingContent;
       loadTrendingContent = function() {
           const startTime = performance.now();
           return originalLoadTrending.call(this).then(() => {
               trackPerformance('contentLoadTime', startTime);
           });
       };

       let sessionMetrics = {
           startTime: Date.now(),
           contentViewed: 0,
           searchesPerformed: 0,
           timeSpent: 0
       };

       function trackEvent(eventName, data = {}) {
           const event = {
               name: eventName,
               timestamp: Date.now(),
               data: data
           };

           const events = JSON.parse(localStorage.getItem('pikuflix_analytics') || '[]');
           events.push(event);

           if (events.length > 100) {
               events.shift();
           }

           localStorage.setItem('pikuflix_analytics', JSON.stringify(events));
       }

       document.addEventListener('visibilitychange', () => {
           if (document.visibilityState === 'hidden') {
               sessionMetrics.timeSpent += Date.now() - sessionMetrics.startTime;
               trackEvent('session_pause', { timeSpent: sessionMetrics.timeSpent });
           } else {
               sessionMetrics.startTime = Date.now();
               trackEvent('session_resume');
           }
       });

       function withErrorBoundary(fn, fallback) {
           return function(...args) {
               try {
                   return fn.apply(this, args);
               } catch (error) {
                   console.error('Caught error in function:', error);
                   if (fallback) fallback(error);
                   showToast('An error occurred. Please try again.', 'error');
               }
           };
       }

       playContent = withErrorBoundary(playContent, (error) => {
           console.error('Error playing content:', error);
       });

       performSearch = withErrorBoundary(performSearch, (error) => {
           console.error('Error performing search:', error);
           hideLoading();
       });

       console.log('PikuFlix initialized successfully! 🚀');
