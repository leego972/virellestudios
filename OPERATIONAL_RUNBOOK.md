# Operational Runbook

## Overview

This document provides operational procedures for running Virelle Studios in production, including incident response, troubleshooting, and common maintenance tasks.

---

## 1. Startup & Shutdown

### Startup Procedure
```bash
# 1. Set environment variables
export NODE_ENV=production
export JWT_SECRET=<secret>
export DATABASE_URL=<url>
export STRIPE_SECRET_KEY=<key>
export STRIPE_WEBHOOK_SECRET=<secret>
export REDIS_URL=<url>

# 2. Run database migrations
npm run migrate

# 3. Start the server
npm start

# 4. Verify startup
# - Check logs for errors
# - Verify environment validation passes
# - Verify database connection
# - Verify Redis connection (if configured)
# - Verify Stripe connection
```

### Shutdown Procedure
```bash
# 1. Graceful shutdown (allow in-flight requests to complete)
# Send SIGTERM signal
kill -TERM <pid>

# 2. Wait for graceful shutdown (max 30 seconds)
# 3. If not shut down, force shutdown
kill -KILL <pid>

# 4. Verify shutdown
# - Check logs for shutdown message
# - Verify no orphaned processes
```

---

## 2. Monitoring & Alerts

### Key Metrics to Monitor
- **Uptime**: Should be 99.9%+
- **Error Rate**: Should be < 5%
- **Response Time**: Should be < 500ms (p95)
- **Database Connections**: Should be < 80% of max
- **Memory Usage**: Should be < 80% of available
- **CPU Usage**: Should be < 80% average
- **Disk Usage**: Should be < 80% of available

### Alert Thresholds
- **Critical**: Uptime < 99%, Error rate > 10%, Response time > 2s
- **High**: Uptime < 99.5%, Error rate > 5%, Response time > 1s
- **Medium**: Error rate > 2%, Response time > 500ms
- **Low**: Database connections > 70%, Memory > 70%, CPU > 70%

### Monitoring Tools
- **Application Performance Monitoring**: Datadog, New Relic, or similar
- **Error Tracking**: Sentry or similar
- **Uptime Monitoring**: UptimeRobot or similar
- **Log Aggregation**: ELK Stack, Splunk, or similar

---

## 3. Incident Response

### Severity Levels
- **Critical**: Complete outage, data loss, security breach
- **High**: Partial outage, degraded performance, billing issues
- **Medium**: Non-critical features down, minor performance issues
- **Low**: Cosmetic issues, minor bugs

### Response Procedure

#### Critical Incident
1. [ ] Declare incident
2. [ ] Notify team immediately
3. [ ] Assess impact (users affected, data at risk)
4. [ ] Implement immediate mitigation (rollback, failover)
5. [ ] Investigate root cause
6. [ ] Implement permanent fix
7. [ ] Verify fix works
8. [ ] Communicate with users
9. [ ] Document incident
10. [ ] Perform post-mortem

#### High Priority Incident
1. [ ] Notify team
2. [ ] Assess impact
3. [ ] Prioritize fix
4. [ ] Implement fix
5. [ ] Verify fix works
6. [ ] Communicate with affected users
7. [ ] Document incident

#### Medium/Low Priority Incident
1. [ ] Log issue
2. [ ] Prioritize in backlog
3. [ ] Implement fix in next release
4. [ ] Communicate timeline to users

---

## 4. Common Issues & Troubleshooting

### Issue: High Error Rate
**Symptoms**: Error rate > 5%, users reporting failures

**Diagnosis**:
```bash
# 1. Check error logs
tail -f logs/error.log

# 2. Check specific error types
grep "ERROR" logs/error.log | head -20

# 3. Check database connectivity
# Try to connect to database
mysql -h <host> -u <user> -p <database>

# 4. Check Redis connectivity
redis-cli ping

# 5. Check Stripe connectivity
# Make a test API call to Stripe
```

**Resolution**:
- If database issue: Restart database or failover
- If Redis issue: Restart Redis or disable (falls back to in-memory)
- If Stripe issue: Check Stripe status page
- If application issue: Check logs for specific errors

### Issue: Slow Response Times
**Symptoms**: Response time > 1s, users reporting slowness

**Diagnosis**:
```bash
# 1. Check database query performance
# Enable slow query log
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 0.5;

# 2. Check database connections
SHOW PROCESSLIST;

# 3. Check application memory usage
top -p <pid>

# 4. Check CPU usage
top

# 5. Check disk I/O
iostat -x 1
```

**Resolution**:
- If database issue: Optimize queries, add indexes, scale database
- If memory issue: Restart application, increase memory
- If CPU issue: Scale application horizontally
- If disk I/O issue: Check for large file operations, optimize queries

### Issue: Billing Not Working
**Symptoms**: Users can't purchase subscriptions, credits not granted

**Diagnosis**:
```bash
# 1. Check Stripe webhook logs
# In Stripe dashboard: Developers > Webhooks > View events

# 2. Check application logs for webhook errors
grep "webhook" logs/error.log

# 3. Check database for subscription records
SELECT * FROM subscriptions WHERE user_id = <id>;

# 4. Check Stripe for subscription records
# In Stripe dashboard: Customers > Search for customer

# 5. Check credit logs
SELECT * FROM billing_logs WHERE user_id = <id>;
```

**Resolution**:
- If webhook not received: Check webhook configuration in Stripe
- If webhook processing failed: Check logs for specific error
- If database issue: Check database connectivity
- If Stripe issue: Check Stripe status page

### Issue: Auth Not Working
**Symptoms**: Users can't log in, JWT errors

**Diagnosis**:
```bash
# 1. Check JWT_SECRET is set
echo $JWT_SECRET

# 2. Check OAuth configuration
# Test OAuth endpoint

# 3. Check database for user records
SELECT * FROM users WHERE email = '<email>';

# 4. Check session/cookie configuration
# Verify cookie flags in browser dev tools

# 5. Check logs for auth errors
grep "auth" logs/error.log
```

**Resolution**:
- If JWT_SECRET not set: Set it and restart
- If OAuth issue: Check OAuth configuration
- If database issue: Check database connectivity
- If cookie issue: Check cookie configuration

---

## 5. Database Maintenance

### Backup Procedure
```bash
# 1. Create backup
mysqldump -h <host> -u <user> -p <database> > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Compress backup
gzip backup_*.sql

# 3. Upload to backup storage
# Use S3, Google Cloud Storage, or similar

# 4. Verify backup
# Restore to test database and verify
```

### Restore Procedure
```bash
# 1. Stop application
kill -TERM <pid>

# 2. Restore database
mysql -h <host> -u <user> -p <database> < backup.sql

# 3. Verify restore
# Check data integrity

# 4. Start application
npm start
```

### Optimization
```bash
# 1. Analyze tables
ANALYZE TABLE users, subscriptions, projects;

# 2. Optimize tables
OPTIMIZE TABLE users, subscriptions, projects;

# 3. Check for fragmentation
SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = '<database>';

# 4. Rebuild indexes if needed
REBUILD INDEX <index_name> ON <table_name>;
```

---

## 6. Log Management

### Log Levels
- **ERROR**: Critical errors that need immediate attention
- **WARN**: Warnings that should be investigated
- **INFO**: Important information about application state
- **DEBUG**: Detailed debugging information

### Log Rotation
```bash
# Configure log rotation (logrotate)
/var/log/virelle/*.log {
  daily
  rotate 30
  compress
  delaycompress
  notifempty
  create 0640 virelle virelle
  sharedscripts
  postrotate
    systemctl reload virelle
  endscript
}
```

### Log Analysis
```bash
# Find errors in logs
grep "ERROR" logs/*.log

# Find warnings
grep "WARN" logs/*.log

# Count errors by type
grep "ERROR" logs/*.log | cut -d: -f2 | sort | uniq -c

# Find errors in specific time range
grep "2024-01-15" logs/*.log | grep "ERROR"

# Real-time log monitoring
tail -f logs/app.log
```

---

## 7. Performance Optimization

### Database Optimization
- Add indexes on frequently queried columns
- Archive old data
- Optimize slow queries
- Monitor query performance

### Application Optimization
- Enable caching (Redis)
- Optimize API responses
- Reduce database queries
- Compress responses

### Infrastructure Optimization
- Use CDN for static assets
- Scale horizontally for load
- Use load balancing
- Monitor resource usage

---

## 8. Security Maintenance

### Regular Security Tasks
- [ ] Update dependencies monthly
- [ ] Scan for vulnerabilities weekly
- [ ] Review access logs for suspicious activity
- [ ] Rotate secrets quarterly
- [ ] Audit admin access monthly
- [ ] Review security logs for anomalies

### Security Incident Response
1. [ ] Identify the incident
2. [ ] Assess severity
3. [ ] Isolate affected systems
4. [ ] Preserve evidence
5. [ ] Notify stakeholders
6. [ ] Investigate root cause
7. [ ] Implement fix
8. [ ] Verify fix works
9. [ ] Communicate with users
10. [ ] Document incident

---

## 9. Scaling & Capacity Planning

### When to Scale
- CPU usage consistently > 70%
- Memory usage consistently > 70%
- Database connections > 80% of max
- Response time > 1s (p95)
- Error rate increasing

### Scaling Options
- **Vertical**: Increase server resources (CPU, memory)
- **Horizontal**: Add more servers behind load balancer
- **Database**: Add read replicas, optimize queries
- **Cache**: Implement caching layer (Redis)
- **CDN**: Use CDN for static assets

### Capacity Planning
- Monitor growth trends
- Project future capacity needs
- Plan scaling in advance
- Test scaling procedures

---

## 10. Disaster Recovery

### Backup Strategy
- Daily backups of database
- Weekly backups to off-site storage
- Monthly full backups
- Test restore procedures quarterly

### Disaster Recovery Plan
1. [ ] Identify disaster
2. [ ] Declare disaster recovery
3. [ ] Activate backup systems
4. [ ] Restore from backups
5. [ ] Verify data integrity
6. [ ] Resume operations
7. [ ] Document incident
8. [ ] Perform post-mortem

### Recovery Time Objectives (RTO)
- Critical systems: < 1 hour
- Important systems: < 4 hours
- Non-critical systems: < 24 hours

### Recovery Point Objectives (RPO)
- Critical data: < 1 hour
- Important data: < 4 hours
- Non-critical data: < 24 hours

---

## 11. Communication Plan

### Incident Communication
- **Internal**: Notify team immediately
- **Users**: Update status page within 15 minutes
- **Stakeholders**: Notify leadership within 30 minutes
- **Post-incident**: Send summary within 24 hours

### Status Page
- Update status page during incidents
- Provide regular updates (every 30 minutes)
- Include estimated resolution time
- Post-incident summary

### User Communication
- Be transparent about issues
- Provide estimated resolution time
- Update regularly
- Apologize for inconvenience
- Explain what happened and how to prevent it

---

## 12. Runbook Maintenance

### Regular Updates
- Review runbook quarterly
- Update based on lessons learned
- Update contact information
- Test procedures regularly

### Version Control
- Keep runbook in version control
- Document changes
- Review changes before deployment
- Maintain historical versions

---

## References

- Launch Readiness Checklist: `LAUNCH_READINESS_CHECKLIST.md`
- Security Audit: `SECURITY_AUDIT.md`
- Billing Hardening: `BILLING_HARDENING.md`

