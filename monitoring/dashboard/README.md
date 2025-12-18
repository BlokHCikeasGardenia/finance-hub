# Performance Monitoring Dashboard

This dashboard provides real-time monitoring and analytics for the optimized frontend application.

## Features

### 📊 Real-time Metrics
- **Web Vitals Monitoring**: FCP, LCP, CLS, FID
- **Performance Metrics**: Load times, response times, throughput
- **Memory Usage**: Heap size, memory leaks detection
- **Error Tracking**: JavaScript errors, network errors, unhandled rejections

### 🚨 Alert System
- **Threshold-based Alerts**: Configurable performance thresholds
- **Real-time Notifications**: Instant alerts for critical issues
- **Error Rate Monitoring**: Track and alert on error patterns

### 📈 Analytics
- **User Interaction Tracking**: Clicks, scrolls, navigation patterns
- **Network Performance**: API response times, success rates
- **Custom Metrics**: Report loading times, cache hit rates, virtualization performance

## Setup Instructions

### 1. Include Monitoring Script
Add this script to your HTML page:

```html
<script src="/monitoring/setup/monitoring-setup.js"></script>
```

### 2. Configure Monitoring Endpoint (Optional)
Set up a monitoring endpoint to collect data:

```javascript
window.MONITORING_ENDPOINT = 'https://your-monitoring-server.com/api/metrics';
```

### 3. Enable Custom Metrics
Add event listeners in your application code:

```javascript
// Report loading times
window.dispatchEvent(new CustomEvent('reportLoad', {
    detail: {
        reportType: 'pemasukan',
        duration: 1500,
        dataSize: 1000
    }
}));

// Cache hit/miss tracking
window.dispatchEvent(new CustomEvent('cacheHit', {
    detail: {
        cacheType: 'api',
        key: 'pemasukan:page:1'
    }
}));

// Virtualization performance
window.dispatchEvent(new CustomEvent('virtualizationRender', {
    detail: {
        componentType: 'table',
        itemCount: 1000,
        renderTime: 50
    }
}));
```

## Dashboard Components

### Performance Overview
- **Current Status**: Overall system health
- **Key Metrics**: FCP, LCP, CLS, FID values
- **Trend Charts**: Historical performance data

### Error Monitoring
- **Error Count**: Real-time error tracking
- **Error Details**: Stack traces and context
- **Error Patterns**: Frequency and trends

### Memory Monitoring
- **Heap Usage**: Current and historical memory usage
- **Memory Trends**: Growth patterns and alerts
- **Garbage Collection**: Memory cleanup events

### Network Monitoring
- **API Performance**: Response times and success rates
- **Request Patterns**: Traffic and usage patterns
- **Slow Requests**: Identification of performance bottlenecks

## Usage

### View Current Metrics
```javascript
const data = window.performanceMonitor.getMonitoringData();
console.log(data);
```

### Export Monitoring Data
```javascript
window.exportMonitoringData();
```

### Generate Performance Report
```javascript
const report = window.performanceMonitor.generateReport();
console.log(report);
```

## Monitoring Configuration

### Performance Thresholds
```javascript
const thresholds = {
    pageLoadTime: 3000,        // 3 seconds
    apiResponseTime: 2000,     // 2 seconds
    firstContentfulPaint: 1500, // 1.5 seconds
    largestContentfulPaint: 2500, // 2.5 seconds
    cumulativeLayoutShift: 0.1,
    firstInputDelay: 100,      // 100ms
    memoryUsage: 50 * 1024 * 1024, // 50MB
    errorRate: 0.05            // 5%
};
```

### Monitoring Intervals
```javascript
const intervals = {
    performance: 5000,         // 5 seconds
    memory: 10000,             // 10 seconds
    errors: 1000,              // 1 second
    userInteractions: 1000     // 1 second
};
```

## Alert Types

### Performance Alerts
- **thresholdExceeded**: When metrics exceed configured thresholds
- **slowApiResponse**: API response time too slow
- **memoryThresholdExceeded**: Memory usage too high

### Error Alerts
- **javascriptError**: JavaScript runtime errors
- **unhandledRejection**: Unhandled promise rejections
- **networkError**: Network request failures

## Data Export Formats

### JSON Export
- Complete monitoring data
- Historical trends
- Error logs and stack traces

### CSV Export (Custom Implementation)
- Tabular format for analysis
- Compatible with spreadsheet applications

## Integration Examples

### With Google Analytics
```javascript
// Send custom metrics to Google Analytics
window.addEventListener('monitoringAlert', (event) => {
    gtag('event', 'performance_alert', {
        event_category: 'Performance',
        event_label: event.detail.type,
        value: event.detail.data.value
    });
});
```

### With Sentry
```javascript
// Send errors to Sentry
window.addEventListener('error', (event) => {
    Sentry.captureException(event.error, {
        tags: {
            source: 'frontend-monitoring'
        },
        extra: {
            url: window.location.href,
            userAgent: navigator.userAgent
        }
    });
});
```

### With Custom Backend
```javascript
// Configure custom monitoring endpoint
window.MONITORING_ENDPOINT = 'https://your-api.com/metrics';

// The monitoring system will automatically send data to:
// POST /metrics - for individual alerts
// POST /report - for periodic reports
```

## Best Practices

### 1. Monitor Key User Journeys
Track performance at critical user interaction points:
- Report loading
- Search operations
- Data filtering
- Pagination

### 2. Set Appropriate Thresholds
Configure thresholds based on:
- User expectations
- Business requirements
- Historical performance data

### 3. Regular Review
- Review performance trends weekly
- Analyze error patterns
- Update thresholds as needed

### 4. Alert Management
- Configure meaningful alerts
- Avoid alert fatigue
- Set up escalation procedures

## Troubleshooting

### High Memory Usage
1. Check for memory leaks in virtualization components
2. Review cache size and TTL settings
3. Monitor garbage collection patterns

### Slow API Responses
1. Check database query performance
2. Review stored procedure optimization
3. Monitor network latency

### High Error Rate
1. Review error patterns and stack traces
2. Check for recent code changes
3. Verify data integrity

## Performance Optimization Tips

### 1. Cache Optimization
- Monitor cache hit rates
- Adjust cache TTL based on usage patterns
- Implement cache warming strategies

### 2. Virtualization Tuning
- Adjust buffer sizes based on device performance
- Monitor render times for large datasets
- Optimize item heights for better prediction

### 3. Network Optimization
- Implement request deduplication
- Use compression for large responses
- Monitor CDN performance

## Support

For issues and questions:
1. Check the monitoring logs
2. Review performance reports
3. Analyze error patterns
4. Contact the development team

---

**Note**: This monitoring system is designed to have minimal impact on application performance while providing comprehensive insights into frontend optimization effectiveness.
