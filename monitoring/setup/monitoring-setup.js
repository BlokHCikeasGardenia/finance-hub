// Frontend Performance Monitoring Setup
// Comprehensive monitoring for optimized frontend application

(function() {
    'use strict';

    // Monitoring configuration
    const MONITORING_CONFIG = {
        // Performance thresholds
        thresholds: {
            pageLoadTime: 3000,        // 3 seconds
            apiResponseTime: 2000,     // 2 seconds
            firstContentfulPaint: 1500, // 1.5 seconds
            largestContentfulPaint: 2500, // 2.5 seconds
            cumulativeLayoutShift: 0.1,
            firstInputDelay: 100,      // 100ms
            memoryUsage: 50 * 1024 * 1024, // 50MB
            errorRate: 0.05            // 5%
        },
        
        // Monitoring intervals
        intervals: {
            performance: 5000,         // 5 seconds
            memory: 10000,             // 10 seconds
            errors: 1000,              // 1 second
            userInteractions: 1000     // 1 second
        },
        
        // Data collection
        dataCollection: {
            enabled: true,
            maxEntries: 1000,
            autoFlush: true,
            flushInterval: 60000       // 1 minute
        }
    };

    // Monitoring data storage
    const monitoringData = {
        performance: [],
        memory: [],
        errors: [],
        userInteractions: [],
        network: [],
        customMetrics: []
    };

    // Performance monitoring class
    class PerformanceMonitor {
        constructor() {
            this.init();
        }

        init() {
            this.setupPerformanceObserver();
            this.setupMemoryMonitoring();
            this.setupErrorTracking();
            this.setupUserInteractionTracking();
            this.setupNetworkMonitoring();
            this.setupCustomMetrics();
            this.startPeriodicReporting();
        }

        // Performance Observer for Web Vitals
        setupPerformanceObserver() {
            if ('PerformanceObserver' in window) {
                // First Contentful Paint
                const fcpObserver = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        if (entry.name === 'first-contentful-paint') {
                            this.recordMetric('firstContentfulPaint', entry.startTime);
                        }
                    }
                });
                fcpObserver.observe({ entryTypes: ['paint'] });

                // Largest Contentful Paint
                const lcpObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    const lastEntry = entries[entries.length - 1];
                    this.recordMetric('largestContentfulPaint', lastEntry.startTime);
                });
                lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

                // Cumulative Layout Shift
                const clsObserver = new PerformanceObserver((list) => {
                    let clsValue = 0;
                    for (const entry of list.getEntries()) {
                        if (!entry.hadRecentInput) {
                            clsValue += entry.value;
                        }
                    }
                    this.recordMetric('cumulativeLayoutShift', clsValue);
                });
                clsObserver.observe({ entryTypes: ['layout-shift'] });

                // First Input Delay
                const fidObserver = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        this.recordMetric('firstInputDelay', entry.processingStart - entry.startTime);
                    }
                });
                fidObserver.observe({ entryTypes: ['first-input'] });
            }
        }

        // Memory monitoring
        setupMemoryMonitoring() {
            if ('memory' in performance) {
                setInterval(() => {
                    const memory = performance.memory;
                    const memoryData = {
                        timestamp: Date.now(),
                        usedJSHeapSize: memory.usedJSHeapSize,
                        totalJSHeapSize: memory.totalJSHeapSize,
                        jsHeapSizeLimit: memory.jsHeapSizeLimit,
                        memoryUsagePercent: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
                    };

                    monitoringData.memory.push(memoryData);

                    // Check for memory threshold
                    if (memoryData.usedJSHeapSize > MONITORING_CONFIG.thresholds.memoryUsage) {
                        this.reportAlert('memoryThresholdExceeded', {
                            memoryUsage: memoryData.usedJSHeapSize,
                            threshold: MONITORING_CONFIG.thresholds.memoryUsage
                        });
                    }

                    // Keep only recent data
                    this.limitDataSize('memory');
                }, MONITORING_CONFIG.intervals.memory);
            }
        }

        // Error tracking
        setupErrorTracking() {
            // Global error handler
            window.addEventListener('error', (event) => {
                const errorData = {
                    timestamp: Date.now(),
                    message: event.message,
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno,
                    error: event.error?.stack || 'No stack trace',
                    userAgent: navigator.userAgent,
                    url: window.location.href
                };

                monitoringData.errors.push(errorData);
                this.limitDataSize('errors');

                // Report critical errors
                this.reportAlert('javascriptError', errorData);
            });

            // Unhandled promise rejections
            window.addEventListener('unhandledrejection', (event) => {
                const errorData = {
                    timestamp: Date.now(),
                    message: 'Unhandled Promise Rejection: ' + event.reason,
                    error: event.reason?.stack || 'No stack trace',
                    userAgent: navigator.userAgent,
                    url: window.location.href
                };

                monitoringData.errors.push(errorData);
                this.limitDataSize('errors');

                this.reportAlert('unhandledRejection', errorData);
            });
        }

        // User interaction tracking
        setupUserInteractionTracking() {
            const interactions = ['click', 'scroll', 'keydown', 'resize'];
            
            interactions.forEach(eventType => {
                document.addEventListener(eventType, (event) => {
                    const interactionData = {
                        timestamp: Date.now(),
                        type: eventType,
                        target: event.target.tagName,
                        targetId: event.target.id,
                        targetClass: event.target.className,
                        pageX: event.pageX,
                        pageY: event.pageY,
                        timestampPerformance: performance.now()
                    };

                    monitoringData.userInteractions.push(interactionData);
                    this.limitDataSize('userInteractions');
                }, { passive: true });
            });
        }

        // Network monitoring
        setupNetworkMonitoring() {
            // Monitor fetch requests
            const originalFetch = window.fetch;
            if (originalFetch) {
                window.fetch = (...args) => {
                    const startTime = performance.now();
                    const url = args[0];

                    return originalFetch(...args)
                        .then(response => {
                            const endTime = performance.now();
                            const duration = endTime - startTime;

                            const networkData = {
                                timestamp: Date.now(),
                                url: typeof url === 'string' ? url : url?.url,
                                method: args[1]?.method || 'GET',
                                duration,
                                status: response.status,
                                success: response.ok
                            };

                            monitoringData.network.push(networkData);
                            this.limitDataSize('network');

                            // Check for slow requests
                            if (duration > MONITORING_CONFIG.thresholds.apiResponseTime) {
                                this.reportAlert('slowApiResponse', {
                                    url: networkData.url,
                                    duration,
                                    threshold: MONITORING_CONFIG.thresholds.apiResponseTime
                                });
                            }

                            return response;
                        })
                        .catch(error => {
                            const endTime = performance.now();
                            const duration = endTime - startTime;

                            const networkData = {
                                timestamp: Date.now(),
                                url: typeof url === 'string' ? url : url?.url,
                                method: args[1]?.method || 'GET',
                                duration,
                                status: 0,
                                success: false,
                                error: error.message
                            };

                            monitoringData.network.push(networkData);
                            this.limitDataSize('network');

                            this.reportAlert('networkError', networkData);
                            throw error;
                        });
                };
            }
        }

        // Custom metrics for frontend optimization
        setupCustomMetrics() {
            // Track report loading times
            window.addEventListener('reportLoad', (event) => {
                this.recordMetric('reportLoadTime', event.detail.duration, {
                    reportType: event.detail.reportType,
                    dataSize: event.detail.dataSize
                });
            });

            // Track cache hit rates
            window.addEventListener('cacheHit', (event) => {
                this.recordMetric('cacheHit', 1, {
                    cacheType: event.detail.cacheType,
                    key: event.detail.key
                });
            });

            window.addEventListener('cacheMiss', (event) => {
                this.recordMetric('cacheMiss', 1, {
                    cacheType: event.detail.cacheType,
                    key: event.detail.key
                });
            });

            // Track virtualization performance
            window.addEventListener('virtualizationRender', (event) => {
                this.recordMetric('virtualizationRenderTime', event.detail.duration, {
                    componentType: event.detail.componentType,
                    itemCount: event.detail.itemCount,
                    renderTime: event.detail.renderTime
                });
            });
        }

        // Record custom metrics
        recordMetric(name, value, metadata = {}) {
            const metricData = {
                timestamp: Date.now(),
                name,
                value,
                metadata
            };

            monitoringData.customMetrics.push(metricData);
            this.limitDataSize('customMetrics');

            // Check thresholds
            this.checkThreshold(name, value);
        }

        // Check performance thresholds
        checkThreshold(metricName, value) {
            const threshold = MONITORING_CONFIG.thresholds[metricName];
            if (threshold && value > threshold) {
                this.reportAlert('thresholdExceeded', {
                    metric: metricName,
                    value,
                    threshold
                });
            }
        }

        // Report alerts
        reportAlert(type, data) {
            const alertData = {
                timestamp: Date.now(),
                type,
                data,
                url: window.location.href,
                userAgent: navigator.userAgent
            };

            console.warn('Performance Alert:', alertData);

            // Send to monitoring endpoint if configured
            if (window.MONITORING_ENDPOINT) {
                fetch(window.MONITORING_ENDPOINT, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(alertData)
                }).catch(console.error);
            }

            // Dispatch custom event
            window.dispatchEvent(new CustomEvent('monitoringAlert', {
                detail: alertData
            }));
        }

        // Periodic reporting
        startPeriodicReporting() {
            setInterval(() => {
                this.generateReport();
            }, MONITORING_CONFIG.dataCollection.flushInterval);
        }

        // Generate performance report
        generateReport() {
            const report = {
                timestamp: Date.now(),
                url: window.location.href,
                userAgent: navigator.userAgent,
                summary: this.generateSummary(),
                details: {
                    performance: monitoringData.performance.slice(-10),
                    memory: monitoringData.memory.slice(-10),
                    errors: monitoringData.errors.slice(-10),
                    userInteractions: monitoringData.userInteractions.slice(-10),
                    network: monitoringData.network.slice(-10),
                    customMetrics: monitoringData.customMetrics.slice(-20)
                }
            };

            console.log('Performance Report:', report);

            // Send to monitoring endpoint if configured
            if (window.MONITORING_ENDPOINT) {
                fetch(window.MONITORING_ENDPOINT + '/report', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(report)
                }).catch(console.error);
            }

            return report;
        }

        // Generate summary statistics
        generateSummary() {
            const now = Date.now();
            const oneMinuteAgo = now - 60000;

            // Filter recent data
            const recentErrors = monitoringData.errors.filter(e => e.timestamp > oneMinuteAgo);
            const recentNetwork = monitoringData.network.filter(n => n.timestamp > oneMinuteAgo);
            const recentMemory = monitoringData.memory.slice(-10);

            const summary = {
                errorRate: recentErrors.length / Math.max(recentNetwork.length, 1),
                averageResponseTime: recentNetwork.length > 0 
                    ? recentNetwork.reduce((sum, n) => sum + n.duration, 0) / recentNetwork.length 
                    : 0,
                memoryUsage: recentMemory.length > 0 
                    ? recentMemory[recentMemory.length - 1].usedJSHeapSize 
                    : 0,
                uptime: now - (performance.timing?.navigationStart || now),
                activeUsers: 1 // Simplified for single-user scenario
            };

            return summary;
        }

        // Limit data size to prevent memory issues
        limitDataSize(dataType) {
            const maxEntries = MONITORING_CONFIG.dataCollection.maxEntries;
            if (monitoringData[dataType].length > maxEntries) {
                monitoringData[dataType] = monitoringData[dataType].slice(-maxEntries);
            }
        }

        // Get current monitoring data
        getMonitoringData() {
            return { ...monitoringData };
        }

        // Export data
        exportData() {
            const data = this.getMonitoringData();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `monitoring-data-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    }

    // Initialize monitoring
    const performanceMonitor = new PerformanceMonitor();

    // Make available globally
    window.PerformanceMonitor = PerformanceMonitor;
    window.performanceMonitor = performanceMonitor;

    // Auto-export function
    window.exportMonitoringData = () => {
        performanceMonitor.exportData();
    };

    // Console helper
    console.log('Frontend Performance Monitoring Active');
    console.log('Use window.exportMonitoringData() to export monitoring data');
    console.log('Use window.performanceMonitor.getMonitoringData() to get current data');

})();
