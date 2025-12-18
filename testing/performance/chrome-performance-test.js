// Chrome DevTools Performance Testing Script
// Run this in Chrome DevTools Console to test frontend performance

(function() {
    'use strict';

    // Performance testing configuration
    const CONFIG = {
        iterations: 10,           // Number of times to run each test
        warmupRuns: 2,            // Number of warmup runs to exclude
        testDuration: 5000,       // 5 seconds per test
        memoryCheckInterval: 1000 // Check memory every 1 second
    };

    // Test results storage
    const results = {
        navigation: [],
        rendering: [],
        memory: [],
        userInteractions: []
    };

    // Performance test functions
    const PerformanceTests = {
        
        /**
         * Test navigation performance between reports
         */
        async testNavigationPerformance() {
            console.log('🚀 Testing Navigation Performance...');
            
            const navigationTimes = [];
            
            for (let i = 0; i < CONFIG.iterations; i++) {
                // Navigate to different reports
                const reports = [
                    'pemasukan',
                    'pengeluaran', 
                    'ipl',
                    'air',
                    'ringkasan'
                ];
                
                for (const report of reports) {
                    const startTime = performance.now();
                    
                    try {
                        // Simulate navigation
                        await this.simulateNavigation(report);
                        
                        const endTime = performance.now();
                        const loadTime = endTime - startTime;
                        
                        navigationTimes.push({
                            iteration: i,
                            report,
                            loadTime
                        });
                        
                        console.log(`  ${report}: ${loadTime.toFixed(2)}ms`);
                        
                    } catch (error) {
                        console.error(`  Error loading ${report}:`, error);
                    }
                    
                    // Wait between navigations
                    await this.sleep(500);
                }
            }
            
            results.navigation = navigationTimes;
            this.analyzeNavigationResults(navigationTimes);
        },
        
        /**
         * Test rendering performance
         */
        async testRenderingPerformance() {
            console.log('🎨 Testing Rendering Performance...');
            
            const renderingMetrics = [];
            
            for (let i = 0; i < CONFIG.iterations; i++) {
                // Test different rendering scenarios
                const scenarios = [
                    { name: 'Initial Load', action: () => this.testInitialLoad() },
                    { name: 'Search Filter', action: () => this.testSearchFilter() },
                    { name: 'Pagination', action: () => this.testPagination() },
                    { name: 'Sort', action: () => this.testSort() }
                ];
                
                for (const scenario of scenarios) {
                    const startTime = performance.now();
                    const startMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
                    
                    try {
                        await scenario.action();
                        
                        const endTime = performance.now();
                        const endMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
                        
                        const renderTime = endTime - startTime;
                        const memoryDelta = endMemory - startMemory;
                        
                        renderingMetrics.push({
                            iteration: i,
                            scenario: scenario.name,
                            renderTime,
                            memoryDelta
                        });
                        
                        console.log(`  ${scenario.name}: ${renderTime.toFixed(2)}ms, Memory: ${this.formatBytes(memoryDelta)}`);
                        
                    } catch (error) {
                        console.error(`  Error in ${scenario.name}:`, error);
                    }
                    
                    await this.sleep(300);
                }
            }
            
            results.rendering = renderingMetrics;
            this.analyzeRenderingResults(renderingMetrics);
        },
        
        /**
         * Test memory usage and leaks
         */
        async testMemoryPerformance() {
            console.log('🧠 Testing Memory Performance...');
            
            const memoryMetrics = [];
            let memoryMonitorActive = true;
            
            // Start memory monitoring
            const memoryInterval = setInterval(() => {
                if (!memoryMonitorActive) return;
                
                const memoryInfo = performance.memory;
                if (memoryInfo) {
                    const metric = {
                        timestamp: Date.now(),
                        usedJSHeapSize: memoryInfo.usedJSHeapSize,
                        totalJSHeapSize: memoryInfo.totalJSHeapSize,
                        jsHeapSizeLimit: memoryInfo.jsHeapSizeLimit
                    };
                    
                    memoryMetrics.push(metric);
                    
                    console.log(`  Memory: ${this.formatBytes(metric.usedJSHeapSize)} / ${this.formatBytes(metric.totalJSHeapSize)}`);
                    
                    // Check for memory leaks
                    if (memoryMetrics.length > 10) {
                        const recentMetrics = memoryMetrics.slice(-10);
                        const memoryTrend = this.calculateMemoryTrend(recentMetrics);
                        
                        if (memoryTrend > 0.1) { // 10% increase
                            console.warn('  ⚠️  Potential memory leak detected!');
                        }
                    }
                }
            }, CONFIG.memoryCheckInterval);
            
            // Perform memory-intensive operations
            for (let i = 0; i < 5; i++) {
                console.log(`  Memory test cycle ${i + 1}/5`);
                
                // Navigate through reports multiple times
                await this.testMemoryIntensiveOperations();
                await this.sleep(2000);
            }
            
            memoryMonitorActive = false;
            clearInterval(memoryInterval);
            
            results.memory = memoryMetrics;
            this.analyzeMemoryResults(memoryMetrics);
        },
        
        /**
         * Test user interaction performance
         */
        async testUserInteractionPerformance() {
            console.log('👆 Testing User Interaction Performance...');
            
            const interactionMetrics = [];
            
            // Test different interactions
            const interactions = [
                { name: 'Click', action: () => this.testClickPerformance() },
                { name: 'Scroll', action: () => this.testScrollPerformance() },
                { name: 'Search Input', action: () => this.testSearchInputPerformance() },
                { name: 'Dropdown Select', action: () => this.testDropdownPerformance() }
            ];
            
            for (const interaction of interactions) {
                for (let i = 0; i < CONFIG.iterations; i++) {
                    const startTime = performance.now();
                    
                    try {
                        await interaction.action();
                        
                        const endTime = performance.now();
                        const interactionTime = endTime - startTime;
                        
                        interactionMetrics.push({
                            iteration: i,
                            interaction: interaction.name,
                            interactionTime
                        });
                        
                        console.log(`  ${interaction.name}: ${interactionTime.toFixed(2)}ms`);
                        
                    } catch (error) {
                        console.error(`  Error in ${interaction.name}:`, error);
                    }
                    
                    await this.sleep(200);
                }
            }
            
            results.userInteractions = interactionMetrics;
            this.analyzeInteractionResults(interactionMetrics);
        },
        
        // Helper methods
        
        async simulateNavigation(report) {
            // Simulate clicking on report navigation
            const navLink = document.querySelector(`a[href="#${report}"]`);
            if (navLink) {
                navLink.click();
                await this.waitForDOMUpdate();
            }
        },
        
        async testInitialLoad() {
            // Trigger initial data load
            const loadButton = document.querySelector('.btn-load');
            if (loadButton) {
                loadButton.click();
                await this.waitForDataLoad();
            }
        },
        
        async testSearchFilter() {
            // Test search functionality
            const searchInput = document.querySelector('input[type="text"][placeholder*="Cari"]');
            if (searchInput) {
                searchInput.value = 'test';
                searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                await this.sleep(300); // Wait for debounce
            }
        },
        
        async testPagination() {
            // Test pagination
            const nextPageButton = document.querySelector('.pagination .page-item:last-child .page-link');
            if (nextPageButton) {
                nextPageButton.click();
                await this.sleep(300);
            }
        },
        
        async testSort() {
            // Test sorting
            const sortableHeader = document.querySelector('.sortable');
            if (sortableHeader) {
                sortableHeader.click();
                await this.sleep(300);
            }
        },
        
        async testClickPerformance() {
            // Test button click performance
            const button = document.querySelector('button');
            if (button) {
                button.click();
                await this.sleep(50);
            }
        },
        
        async testScrollPerformance() {
            // Test scroll performance
            const container = document.querySelector('.table-responsive, .card-body');
            if (container) {
                container.scrollTop = 100;
                await this.sleep(100);
                container.scrollTop = 0;
                await this.sleep(100);
            }
        },
        
        async testSearchInputPerformance() {
            // Test search input performance
            const searchInput = document.querySelector('input[type="text"]');
            if (searchInput) {
                searchInput.focus();
                searchInput.value = 'a';
                searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                await this.sleep(50);
                
                searchInput.value = 'ab';
                searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                await this.sleep(50);
            }
        },
        
        async testDropdownPerformance() {
            // Test dropdown performance
            const dropdown = document.querySelector('select');
            if (dropdown) {
                dropdown.value = dropdown.options[1]?.value || '';
                dropdown.dispatchEvent(new Event('change', { bubbles: true }));
                await this.sleep(200);
            }
        },
        
        async testMemoryIntensiveOperations() {
            // Perform operations that might cause memory issues
            for (let i = 0; i < 10; i++) {
                await this.simulateNavigation('pemasukan');
                await this.sleep(200);
                await this.simulateNavigation('pengeluaran');
                await this.sleep(200);
                await this.testSearchFilter();
                await this.sleep(200);
            }
        },
        
        async waitForDOMUpdate() {
            return new Promise(resolve => {
                requestAnimationFrame(() => {
                    requestAnimationFrame(resolve);
                });
            });
        },
        
        async waitForDataLoad() {
            // Wait for data to load (adjust selector based on your app)
            await this.sleep(1000);
        },
        
        sleep(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        },
        
        formatBytes(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        },
        
        calculateMemoryTrend(metrics) {
            if (metrics.length < 2) return 0;
            
            const first = metrics[0].usedJSHeapSize;
            const last = metrics[metrics.length - 1].usedJSHeapSize;
            
            return (last - first) / first;
        },
        
        // Analysis methods
        
        analyzeNavigationResults(navigationTimes) {
            console.log('\n📊 Navigation Performance Analysis:');
            console.log('='.repeat(50));
            
            const avgLoadTime = navigationTimes.reduce((sum, t) => sum + t.loadTime, 0) / navigationTimes.length;
            const minLoadTime = Math.min(...navigationTimes.map(t => t.loadTime));
            const maxLoadTime = Math.max(...navigationTimes.map(t => t.loadTime));
            
            console.log(`Average Load Time: ${avgLoadTime.toFixed(2)}ms`);
            console.log(`Min Load Time: ${minLoadTime.toFixed(2)}ms`);
            console.log(`Max Load Time: ${maxLoadTime.toFixed(2)}ms`);
            
            // Per report analysis
            const reportGroups = this.groupBy(navigationTimes, 'report');
            Object.entries(reportGroups).forEach(([report, times]) => {
                const avg = times.reduce((sum, t) => sum + t.loadTime, 0) / times.length;
                console.log(`  ${report}: ${avg.toFixed(2)}ms avg`);
            });
            
            // Performance grade
            const grade = this.getPerformanceGrade(avgLoadTime, 1000, 2000);
            console.log(`\n🏆 Navigation Grade: ${grade}`);
        },
        
        analyzeRenderingResults(renderingMetrics) {
            console.log('\n🎨 Rendering Performance Analysis:');
            console.log('='.repeat(50));
            
            const scenarioGroups = this.groupBy(renderingMetrics, 'scenario');
            
            Object.entries(scenarioGroups).forEach(([scenario, metrics]) => {
                const avgRenderTime = metrics.reduce((sum, m) => sum + m.renderTime, 0) / metrics.length;
                const avgMemoryDelta = metrics.reduce((sum, m) => sum + m.memoryDelta, 0) / metrics.length;
                
                console.log(`${scenario}:`);
                console.log(`  Average Render Time: ${avgRenderTime.toFixed(2)}ms`);
                console.log(`  Average Memory Delta: ${this.formatBytes(avgMemoryDelta)}`);
            });
            
            // Overall rendering grade
            const allRenderTimes = renderingMetrics.map(m => m.renderTime);
            const overallAvg = allRenderTimes.reduce((sum, t) => sum + t, 0) / allRenderTimes.length;
            const grade = this.getPerformanceGrade(overallAvg, 200, 500);
            console.log(`\n🏆 Rendering Grade: ${grade}`);
        },
        
        analyzeMemoryResults(memoryMetrics) {
            console.log('\n🧠 Memory Performance Analysis:');
            console.log('='.repeat(50));
            
            if (memoryMetrics.length === 0) {
                console.log('No memory metrics available');
                return;
            }
            
            const usedMemory = memoryMetrics.map(m => m.usedJSHeapSize);
            const totalMemory = memoryMetrics.map(m => m.totalJSHeapSize);
            
            const minUsed = Math.min(...usedMemory);
            const maxUsed = Math.max(...usedMemory);
            const avgUsed = usedMemory.reduce((sum, m) => sum + m, 0) / usedMemory.length;
            
            console.log(`Min Used Memory: ${this.formatBytes(minUsed)}`);
            console.log(`Max Used Memory: ${this.formatBytes(maxUsed)}`);
            console.log(`Average Used Memory: ${this.formatBytes(avgUsed)}`);
            
            // Memory growth trend
            const trend = this.calculateMemoryTrend(memoryMetrics);
            console.log(`Memory Growth Trend: ${(trend * 100).toFixed(2)}%`);
            
            // Memory grade
            const memoryIncrease = (maxUsed - minUsed) / minUsed;
            const grade = memoryIncrease < 0.2 ? 'A' : memoryIncrease < 0.5 ? 'B' : 'C';
            console.log(`\n🏆 Memory Grade: ${grade}`);
        },
        
        analyzeInteractionResults(interactionMetrics) {
            console.log('\n👆 User Interaction Performance Analysis:');
            console.log('='.repeat(50));
            
            const interactionGroups = this.groupBy(interactionMetrics, 'interaction');
            
            Object.entries(interactionGroups).forEach(([interaction, metrics]) => {
                const avgTime = metrics.reduce((sum, m) => sum + m.interactionTime, 0) / metrics.length;
                const minTime = Math.min(...metrics.map(m => m.interactionTime));
                const maxTime = Math.max(...metrics.map(m => m.interactionTime));
                
                console.log(`${interaction}:`);
                console.log(`  Average: ${avgTime.toFixed(2)}ms`);
                console.log(`  Min: ${minTime.toFixed(2)}ms`);
                console.log(`  Max: ${maxTime.toFixed(2)}ms`);
            });
            
            // Overall interaction grade
            const allTimes = interactionMetrics.map(m => m.interactionTime);
            const overallAvg = allTimes.reduce((sum, t) => sum + t, 0) / allTimes.length;
            const grade = this.getPerformanceGrade(overallAvg, 100, 300);
            console.log(`\n🏆 Interaction Grade: ${grade}`);
        },
        
        groupBy(array, key) {
            return array.reduce((groups, item) => {
                const groupKey = item[key];
                groups[groupKey] = groups[groupKey] || [];
                groups[groupKey].push(item);
                return groups;
            }, {});
        },
        
        getPerformanceGrade(avgTime, goodThreshold, poorThreshold) {
            if (avgTime <= goodThreshold) return 'A';
            if (avgTime <= poorThreshold) return 'B';
            return 'C';
        }
    };

    // Main test runner
    async function runPerformanceTests() {
        console.log('🚀 Starting Chrome DevTools Performance Tests');
        console.log('='.repeat(60));
        
        const startTime = Date.now();
        
        try {
            // Run all tests
            await PerformanceTests.testNavigationPerformance();
            await PerformanceTests.testRenderingPerformance();
            await PerformanceTests.testMemoryPerformance();
            await PerformanceTests.testUserInteractionPerformance();
            
            const endTime = Date.now();
            const totalTime = endTime - startTime;
            
            // Generate final report
            console.log('\n' + '='.repeat(60));
            console.log('📈 FINAL PERFORMANCE REPORT');
            console.log('='.repeat(60));
            console.log(`Total Test Time: ${totalTime}ms`);
            
            // Save results
            const resultsData = {
                timestamp: new Date().toISOString(),
                config: CONFIG,
                results: results
            };
            
            console.log('\n📄 Test results:');
            console.log(JSON.stringify(resultsData, null, 2));
            
            // Download results
            const blob = new Blob([JSON.stringify(resultsData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `performance-test-results-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            console.log('\n🎉 Performance testing completed!');
            
        } catch (error) {
            console.error('❌ Performance testing failed:', error);
        }
    }

    // Expose to global scope
    window.runPerformanceTests = runPerformanceTests;
    window.PerformanceTests = PerformanceTests;

    // Auto-run if in DevTools console
    if (typeof chrome !== 'undefined' && chrome.devtools) {
        console.log('💡 Run "runPerformanceTests()" to start performance testing');
    }

})();
