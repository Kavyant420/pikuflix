/**
 * Advanced External Redirect Blocker
 * Blocks all attempts to redirect to external domains
 * Author: AI Assistant
 * Version: 1.0
 */

(function() {
    'use strict';
    
    // Configuration
    const CONFIG = {
        logBlocked: true,          // Set to false to disable console logging
        showUserAlert: false,      // Set to true to show alerts to users
        allowSubdomains: false,    // Set to true to allow subdomain redirects
        whitelist: [],            // Add allowed external domains: ['example.com', 'trusted-site.com']
        customMessage: 'External redirect blocked for security reasons.'
    };
    
    // Helper function to log blocked attempts
    function logBlocked(method, url, details = '') {
        if (CONFIG.logBlocked) {
            console.warn(`🚫 REDIRECT BLOCKED [${method}]:`, url, details);
        }
        if (CONFIG.showUserAlert) {
            alert(CONFIG.customMessage + '\n\nBlocked URL: ' + url);
        }
        
        // Dispatch custom event for advanced handling
        window.dispatchEvent(new CustomEvent('redirectBlocked', {
            detail: { method, url, details }
        }));
    }
    
    // Function to check if URL is external
    function isExternalURL(url) {
        if (!url) return false;
        
        try {
            // Handle relative URLs
            const targetURL = new URL(url, window.location.origin);
            const currentOrigin = window.location.origin;
            
            // Check whitelist first
            const hostname = targetURL.hostname;
            if (CONFIG.whitelist.some(domain => 
                hostname === domain || hostname.endsWith('.' + domain)
            )) {
                return false;
            }
            
            // Same origin check
            if (targetURL.origin === currentOrigin) {
                return false;
            }
            
            // Subdomain check
            if (CONFIG.allowSubdomains) {
                const currentDomain = window.location.hostname;
                const targetDomain = targetURL.hostname;
                
                // Extract root domain (simple implementation)
                const getRootDomain = (domain) => {
                    const parts = domain.split('.');
                    return parts.length > 1 ? parts.slice(-2).join('.') : domain;
                };
                
                if (getRootDomain(currentDomain) === getRootDomain(targetDomain)) {
                    return false;
                }
            }
            
            return true;
        } catch (e) {
            // Invalid URL - consider it safe
            return false;
        }
    }
    
    // Store original methods
    const originalMethods = {
        assign: window.location.assign,
        replace: window.location.replace,
        reload: window.location.reload,
        open: window.open,
        pushState: history.pushState,
        replaceState: history.replaceState
    };
    
    // Override window.location.assign
    window.location.assign = function(url) {
        if (isExternalURL(url)) {
            logBlocked('location.assign', url);
            return;
        }
        return originalMethods.assign.call(this, url);
    };
    
    // Override window.location.replace
    window.location.replace = function(url) {
        if (isExternalURL(url)) {
            logBlocked('location.replace', url);
            return;
        }
        return originalMethods.replace.call(this, url);
    };
    
    // Override window.open
    window.open = function(url, name, features) {
        if (url && isExternalURL(url)) {
            logBlocked('window.open', url, `name: ${name || 'undefined'}`);
            return null;
        }
        return originalMethods.open.call(window, url, name, features);
    };
    
    // Override history methods
    history.pushState = function(state, title, url) {
        if (url && isExternalURL(url)) {
            logBlocked('history.pushState', url);
            return;
        }
        return originalMethods.pushState.call(this, state, title, url);
    };
    
    history.replaceState = function(state, title, url) {
        if (url && isExternalURL(url)) {
            logBlocked('history.replaceState', url);
            return;
        }
        return originalMethods.replaceState.call(this, state, title, url);
    };
    
    // Monitor direct href assignment (advanced technique)
    let hrefDescriptor = Object.getOwnPropertyDescriptor(window.location, 'href') ||
                        Object.getOwnPropertyDescriptor(Location.prototype, 'href');
    
    if (hrefDescriptor && hrefDescriptor.set) {
        const originalHrefSetter = hrefDescriptor.set;
        Object.defineProperty(window.location, 'href', {
            set: function(url) {
                if (isExternalURL(url)) {
                    logBlocked('location.href', url);
                    return;
                }
                return originalHrefSetter.call(this, url);
            },
            get: hrefDescriptor.get,
            enumerable: true,
            configurable: true
        });
    }
    
    // Block external form submissions
    function handleFormSubmit(e) {
        const form = e.target;
        const action = form.action;
        
        if (action && isExternalURL(action)) {
            logBlocked('form.submit', action, `form id: ${form.id || 'unnamed'}`);
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    }
    
    // Block external link clicks
    function handleLinkClick(e) {
        const link = e.target.closest('a');
        if (!link) return;
        
        const href = link.href;
        const target = link.target;
        
        if (href && isExternalURL(href)) {
            logBlocked('link.click', href, `target: ${target || '_self'}`);
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    }
    
    // Remove and monitor meta refresh tags
    function blockMetaRefresh() {
        const metaTags = document.querySelectorAll('meta[http-equiv="refresh"], meta[http-equiv="Refresh"]');
        metaTags.forEach(tag => {
            const content = tag.getAttribute('content') || '';
            const urlMatch = content.match(/url\s*=\s*['"]?([^'">\s]+)/i);
            
            if (urlMatch) {
                const url = urlMatch[1];
                if (isExternalURL(url)) {
                    logBlocked('meta.refresh', url);
                    tag.remove();
                }
            }
        });
    }
    
    // Enhanced MutationObserver to catch dynamically added redirects
    function setupMutationObserver() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Check for meta refresh tags
                        if (node.tagName === 'META' && 
                            node.getAttribute('http-equiv')?.toLowerCase() === 'refresh') {
                            const content = node.getAttribute('content') || '';
                            const urlMatch = content.match(/url\s*=\s*['"]?([^'">\s]+)/i);
                            if (urlMatch && isExternalURL(urlMatch[1])) {
                                logBlocked('dynamic.meta.refresh', urlMatch[1]);
                                node.remove();
                            }
                        }
                        
                        // Check for scripts that might contain redirects
                        if (node.tagName === 'SCRIPT' && node.textContent) {
                            const scriptContent = node.textContent;
                            if (scriptContent.includes('location') || scriptContent.includes('redirect')) {
                                // Additional analysis could be added here
                            }
                        }
                        
                        // Recursively check child nodes
                        const childMetas = node.querySelectorAll?.('meta[http-equiv="refresh"]');
                        childMetas?.forEach(meta => {
                            const content = meta.getAttribute('content') || '';
                            const urlMatch = content.match(/url\s*=\s*['"]?([^'">\s]+)/i);
                            if (urlMatch && isExternalURL(urlMatch[1])) {
                                logBlocked('dynamic.child.meta.refresh', urlMatch[1]);
                                meta.remove();
                            }
                        });
                    }
                });
            });
        });
        
        observer.observe(document, {
            childList: true,
            subtree: true
        });
        
        return observer;
    }
    
    // Override setTimeout and setInterval for redirect detection
    const originalSetTimeout = window.setTimeout;
    const originalSetInterval = window.setInterval;
    
    function analyzeFunction(func, type) {
        if (typeof func === 'function') {
            const funcString = func.toString();
            if (funcString.includes('location') || funcString.includes('redirect') || 
                funcString.includes('window.open')) {
                console.warn(`⚠️  Potential redirect detected in ${type}:`, funcString.substring(0, 200) + '...');
            }
        }
    }
    
    window.setTimeout = function(func, delay, ...args) {
        analyzeFunction(func, 'setTimeout');
        return originalSetTimeout.call(this, func, delay, ...args);
    };
    
    window.setInterval = function(func, delay, ...args) {
        analyzeFunction(func, 'setInterval');
        return originalSetInterval.call(this, func, delay, ...args);
    };
    
    // Initialize protection
    function initialize() {
        // Set up event listeners
        document.addEventListener('submit', handleFormSubmit, true);
        document.addEventListener('click', handleLinkClick, true);
        
        // Block existing meta refresh tags
        blockMetaRefresh();
        
        // Set up mutation observer
        setupMutationObserver();
        
        // Handle page load
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', blockMetaRefresh);
        } else {
            blockMetaRefresh();
        }
        
        console.log('🛡️  Advanced Redirect Blocker initialized');
        console.log('📊  Configuration:', CONFIG);
    }
    
    // Public API for configuration changes
    window.RedirectBlocker = {
        updateConfig: function(newConfig) {
            Object.assign(CONFIG, newConfig);
            console.log('🔧  Redirect Blocker configuration updated:', CONFIG);
        },
        
        getConfig: function() {
            return { ...CONFIG };
        },
        
        addToWhitelist: function(domain) {
            if (!CONFIG.whitelist.includes(domain)) {
                CONFIG.whitelist.push(domain);
                console.log('✅  Added to whitelist:', domain);
            }
        },
        
        removeFromWhitelist: function(domain) {
            const index = CONFIG.whitelist.indexOf(domain);
            if (index > -1) {
                CONFIG.whitelist.splice(index, 1);
                console.log('❌  Removed from whitelist:', domain);
            }
        },
        
        testUrl: function(url) {
            const isExternal = isExternalURL(url);
            console.log(`🧪  URL Test - ${url}: ${isExternal ? 'BLOCKED' : 'ALLOWED'}`);
            return !isExternal;
        }
    };
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
    
    // Handle beforeunload as last resort
    window.addEventListener('beforeunload', function(e) {
        // Note: This can't prevent all redirects but provides logging
        if (performance.navigation?.type === 1) { // TYPE_RELOAD
            console.log('🔄  Page reload detected');
        }
    });
    
})();

