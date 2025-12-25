# 🧪 Simple Chat Load Testing Guide

Test your chat system's capacity on your local server with easy-to-use load testing tools.

---

## 📋 Prerequisites

1. **Make sure your backend server is running:**
   ```bash
   cd c:\MyCode\nestjs\SocialMediaApp\backend
   npm run start:dev
   ```

2. **Install load testing dependencies:**
   ```bash
   cd load-test
   npm install
   ```

---

## 🚀 Quick Start - Run Load Tests

### **Test Scenarios:**

```bash
# Light load (50 users, 5 messages each) - Good for first test
npm run test:light

# Moderate load (200 users, 10 messages each) - Realistic traffic
npm run test:moderate

# Heavy load (500 users, 20 messages each) - Peak hours
npm run test:heavy

# Stress test (1000 users, 30 messages each) - Find breaking point
npm run test:stress
```

### **Monitor System Resources:**

```bash
# Run this in a separate terminal while testing
npm run monitor
```

**What you'll see:**
- ✅ Real-time connection stats
- ✅ Messages sent/received counts
- ✅ Average/Min/Max latency
- ✅ Success rate percentage
- ✅ CPU and Memory usage
- ✅ Final performance report

---

## 📊 Understanding Results

### **Simple Load Test Output**

```
📊 LOAD TEST RESULTS
=============================================================

🔌 Connection Stats:
   - Total Users Attempted: 200
   - Successfully Connected: 198
   - Failed Connections: 2
   - Success Rate: 99.00%

📨 Message Stats:
   - Messages Sent: 1980
   - Messages Received: 1950
   - Messages/Second: 45.23
   - Total Errors: 5

⏱️  Performance:
   - Total Test Time: 43.78s
   - Average Latency: 125.45ms
   - Min Latency: 45.23ms
   - Max Latency: 567.89ms

💡 Interpretation:
   ✅ Excellent connection stability
   ✅ Great response times
   ✅ Good message throughput
```

### **What the Numbers Mean:**

| Metric | Good | Acceptable | Poor |
|--------|------|------------|------|
| **Success Rate** | >95% | 80-95% | <80% |
| **Avg Latency** | <100ms | 100-500ms | >500ms |
| **Messages/Sec** | >50 | 20-50 | <20 |
| **CPU Usage** | <50% | 50-80% | >80% |
| **Memory Usage** | <60% | 60-85% | >85% |

---

## 🎯 Test Scenarios Explained

### **1. Light Load** (Baseline Test)
- **Users:** 50
- **Purpose:** Verify basic functionality
- **Expected:** Should pass easily
- **Use when:** First time testing

### **2. Moderate Load** (Realistic Traffic)
- **Users:** 200
- **Purpose:** Simulate normal usage
- **Expected:** Should handle well
- **Use when:** Testing production readiness

### **3. Heavy Load** (Peak Traffic)
- **Users:** 500
- **Purpose:** Test peak hours
- **Expected:** May show some strain
- **Use when:** Planning for growth

### **4. Stress Test** (Breaking Point)
- **Users:** 1000
- **Purpose:** Find system limits
- **Expected:** Will likely fail/slow down
- **Use when:** Finding bottlenecks

---

## 🔍 Troubleshooting

### **Problem: "Connection Refused"**
```
❌ User 0 connection error: connect ECONNREFUSED
```

**Solution:**
1. Make sure backend is running on port 3000
2. Check if WebSocket is enabled in your gateway
3. Verify CORS settings

---

### **Problem: High Latency (>500ms)**

**Possible Causes:**
- Database queries are slow
- No indexes on tables
- Too many concurrent connections
- Memory issues

**Solutions:**
1. Add database indexes
2. Implement caching (Redis)
3. Use pagination for messages
4. Optimize queries

---

### **Problem: Failed Connections**

**If >10% connections fail:**
1. Check server logs for errors
2. Increase connection pool size
3. Check memory usage
4. Verify database connection limit

---

## 📈 Interpreting Your Results

### **Scenario A: Everything Green ✅**
```
Success Rate: 99%
Avg Latency: 80ms
Messages/Sec: 60
CPU: 45%
Memory: 55%
```

**Verdict:** Your system is healthy! You can handle more load.

**Next Steps:**
- Try the next higher test scenario
- Consider this your baseline capacity

---

### **Scenario B: Some Yellow Flags ⚠️**
```
Success Rate: 92%
Avg Latency: 350ms
Messages/Sec: 35
CPU: 75%
Memory: 70%
```

**Verdict:** System is near capacity. Optimization recommended.

**Next Steps:**
1. Add database indexes
2. Implement basic caching
3. Review slow queries
4. Monitor for memory leaks

---

### **Scenario C: Red Alerts ❌**
```
Success Rate: 65%
Avg Latency: 850ms
Messages/Sec: 15
CPU: 95%
Memory: 90%
```

**Verdict:** System is overloaded. Immediate action required.

**Next Steps:**
1. Reduce test load to find breaking point
2. Check for infinite loops or memory leaks
3. Review database query performance
4. Consider horizontal scaling

---

## 🛠️ Customizing Tests

### **Modify Test Parameters**

Edit `simple-load-test.ts`:

```typescript
const customTest: TestConfig = {
  serverUrl: 'http://localhost:3000',
  totalUsers: 100,              // Number of concurrent users
  messagesPerUser: 15,          // Messages each user sends
  messageInterval: 1500,        // Milliseconds between messages
  rampUpTime: 75,               // Milliseconds between user connections
};
```

### **Test Different Endpoints**

Modify the socket events in `simple-load-test.ts`:

```typescript
// Test read receipts
socket.emit('message-read', {
  messageId: 'test-message-id',
  userId: userIdStr
});

// Test typing indicators
socket.emit('typing', {
  conversationId,
  userId: userIdStr,
  username: `User${userId}`
});
```

---

## 📊 Recommended Testing Strategy

### **Week 1: Baseline**
```bash
npm run test:light
npm run test:moderate
```
- Establish baseline performance
- Document results

### **Week 2: Optimization**
- Implement database indexes
- Add basic caching
- Re-run tests to measure improvement

### **Week 3: Stress Testing**
```bash
npm run test:heavy
npm run test:stress
```
- Find breaking point
- Identify bottlenecks

### **Week 4: Production Readiness**
```bash
npm run test:artillery:report
```
- Generate professional reports
- Document capacity limits
- Plan scaling strategy

---

## 🎓 Tips for Accurate Testing

1. **Close unnecessary applications** - Free up system resources
2. **Run multiple times** - Average the results
3. **Test at different times** - Database performance varies
4. **Monitor database** - Check PostgreSQL connections
5. **Clear cache between tests** - Ensure consistent results
6. **Use production-like data** - Realistic test scenarios

---

## 📞 Need Help?

If your results are concerning:
1. Save the test output
2. Check server logs
3. Monitor database performance
4. Review the optimization guide (see main README)

---

## 🚀 Next Steps After Testing

Based on your results:

- **Good performance?** → Test with higher loads
- **Moderate performance?** → Implement basic optimizations
- **Poor performance?** → Review code for bottlenecks

Remember: These tests help you understand your system's limits **before** going to production! 🎯
