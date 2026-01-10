# Service Level Objectives (SLOs)

Last Updated: January 2025

## Overview

SLOs define our reliability targets. They help us:
- Set user expectations
- Prioritize engineering work
- Know when to slow down (error budget exhausted)
- Know when we can move faster (error budget healthy)

---

## SLO Summary

| Metric | Target | Measurement Window |
|--------|--------|-------------------|
| **Availability** | 99.5% | Monthly |
| **API Latency (p95)** | < 2 seconds | Daily |
| **Content Generation Latency (p95)** | < 30 seconds | Daily |
| **Error Rate** | < 1% | Daily |
| **Successful Deploys** | > 95% | Monthly |

---

## Detailed SLO Definitions

### 1. Availability

**Target**: 99.5% uptime per month

**Definition**: The percentage of time the application is accessible and responding to requests.

**Measurement**:
- Numerator: Successful responses from `/api/health`
- Denominator: Total health check requests
- Check frequency: Every 1 minute

**Allowed Downtime**:
| Period | 99.5% Allows |
|--------|--------------|
| Monthly | 3.6 hours |
| Quarterly | 10.8 hours |
| Yearly | 43.8 hours |

**Exclusions**:
- Scheduled maintenance (with 24h notice)
- Supabase/Render platform outages (track separately)

**Monitoring**: Render built-in monitoring + `/api/health` endpoint

---

### 2. API Latency

**Target**: 95th percentile < 2 seconds

**Definition**: Time from request received to response sent for API endpoints.

**Measurement**:
- Track response time for all `/api/*` endpoints
- Exclude: `/api/health`, `/api/generate/*` (separate SLO)
- Measured at: Sentry performance monitoring

**Breakdown by Endpoint Type**:
| Endpoint Type | p50 Target | p95 Target | p99 Target |
|--------------|------------|------------|------------|
| Read (GET) | < 200ms | < 500ms | < 1s |
| Write (POST/PUT) | < 500ms | < 1.5s | < 3s |
| Auth | < 300ms | < 1s | < 2s |

**Monitoring**: Sentry Performance tab

---

### 3. Content Generation Latency

**Target**: 95th percentile < 30 seconds

**Definition**: Time from generation request to completion for AI-powered content.

**Breakdown**:
| Generation Type | p50 Target | p95 Target |
|----------------|------------|------------|
| Product descriptions | < 5s | < 15s |
| Blog content | < 10s | < 30s |
| Image generation | < 20s | < 45s |
| Video generation | < 60s | < 120s |

**Note**: Dependent on OpenAI API performance (external dependency)

**Monitoring**: Custom metrics in application logs + Sentry

---

### 4. Error Rate

**Target**: < 1% of requests result in errors

**Definition**: Percentage of requests that return 5xx status codes.

**Measurement**:
- Numerator: Requests with status 500-599
- Denominator: Total requests
- Exclude: 4xx errors (client errors, expected)

**Thresholds**:
| Error Rate | Status | Action |
|------------|--------|--------|
| < 0.5% | Healthy | Normal operations |
| 0.5% - 1% | Warning | Investigate |
| 1% - 5% | Degraded | Prioritize fixes |
| > 5% | Critical | Incident response |

**Monitoring**: Sentry error tracking

---

### 5. Successful Deploys

**Target**: > 95% of deploys succeed without rollback

**Definition**: Percentage of production deploys that don't require rollback within 1 hour.

**Measurement**:
- Numerator: Deploys that stay live > 1 hour
- Denominator: Total deploys to production

**Tracking**: Manual log or Render deploy history

---

## Error Budget

### What is Error Budget?

Error budget = 100% - SLO target

For 99.5% availability: Error budget = 0.5% = 3.6 hours/month of allowed downtime

### Error Budget Policy

| Budget Remaining | Development Approach |
|-----------------|---------------------|
| > 50% | Ship features, take calculated risks |
| 25-50% | Normal development, extra testing |
| 10-25% | Focus on stability, limit risky changes |
| < 10% | Freeze features, reliability work only |
| Exhausted | No deploys until next month (except critical fixes) |

---

## SLI (Service Level Indicators)

These are the metrics we actually measure:

### Availability SLI
```
availability = (successful_health_checks / total_health_checks) * 100
```

### Latency SLI
```
latency_sli = percentile(response_times, 95)
```

### Error Rate SLI
```
error_rate = (5xx_responses / total_responses) * 100
```

---

## Monitoring Setup

### Required Dashboards

1. **Availability Dashboard**
   - Health check success rate (real-time)
   - Uptime percentage (rolling 30 days)
   - Downtime incidents

2. **Performance Dashboard**
   - API latency p50/p95/p99
   - Generation latency by type
   - Slow endpoint identification

3. **Error Dashboard**
   - Error rate (real-time)
   - Top errors by frequency
   - Error trends over time

### Alert Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Availability | < 99.9% (1h) | < 99.5% (1h) |
| API Latency p95 | > 1.5s | > 2s |
| Error Rate | > 0.5% | > 1% |

---

## Reporting

### Weekly SLO Review

Every Monday, review:
- [ ] Current SLO compliance for each metric
- [ ] Error budget consumption
- [ ] Top incidents from past week
- [ ] Upcoming risks to SLOs

### Monthly SLO Report

```markdown
## SLO Report - [Month Year]

### Summary
| SLO | Target | Actual | Status |
|-----|--------|--------|--------|
| Availability | 99.5% | XX.X% | ✅/❌ |
| API Latency p95 | < 2s | X.Xs | ✅/❌ |
| Error Rate | < 1% | X.X% | ✅/❌ |

### Error Budget
- Starting budget: 3.6 hours
- Consumed: X.X hours
- Remaining: X.X hours

### Incidents
1. [Date] - [Description] - [Duration] - [Impact]

### Action Items
- [ ] [Improvement action]
```

---

## SLO Review and Updates

### When to Review SLOs

- Quarterly: Regular review of targets
- After major incidents: Assess if SLOs are realistic
- Before launch phases: Adjust for expected growth
- When adding features: New SLIs may be needed

### SLO Change Process

1. Propose change with justification
2. Review historical data
3. Consider user impact
4. Update documentation
5. Adjust alerting thresholds
6. Communicate to stakeholders

---

## External Dependencies

These are outside our direct control but affect our SLOs:

| Dependency | Their SLA | Our Mitigation |
|------------|-----------|----------------|
| Supabase | 99.9% | Graceful degradation, caching |
| OpenAI | ~99.5% | Retry logic, fallback models |
| Render | 99.95% | Health checks, auto-restart |
| Shopify | 99.98% | Webhook retry, offline support |
| Stripe | 99.99% | Queue payments, retry |

---

## Appendix: SLO Terminology

- **SLI** (Service Level Indicator): The metric we measure
- **SLO** (Service Level Objective): The target we aim for
- **SLA** (Service Level Agreement): Contractual commitment (external)
- **Error Budget**: How much failure is acceptable
- **Burn Rate**: How fast we're consuming error budget
