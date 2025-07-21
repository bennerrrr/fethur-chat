# WebRTC Performance Quick Reference Guide

## 🚀 Quick Start Checklist

### Essential Configuration (Copy-Paste Ready)

```javascript
// 1. Simulcast Configuration (Client-side)
const simulcastEncodings = [
  { rid: 'low', active: true, maxBitrate: 100000, scaleResolutionDownBy: 4 },
  { rid: 'medium', active: true, maxBitrate: 300000, scaleResolutionDownBy: 2 },
  { rid: 'high', active: true, maxBitrate: 900000 }
];

// 2. Peer Connection Setup
const pc = new RTCPeerConnection({
  iceServers: [
    { urls: 'stun:stun.fethur.com:3478' },
    { urls: 'turn:turn.fethur.com:3478', username: 'user', credential: 'pass' }
  ],
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require',
  sdpSemantics: 'unified-plan'
});

// 3. Add Transceiver with Simulcast
const transceiver = pc.addTransceiver('video', {
  direction: 'sendrecv',
  streams: [localStream],
  sendEncodings: simulcastEncodings
});
```

### Server-side Configuration (Go)

```go
// Codec Priority Order
codecs := []CodecConfig{
    {Name: "VP9", PayloadType: 98, ClockRate: 90000},
    {Name: "VP8", PayloadType: 96, ClockRate: 90000},  // Fallback
}

// Audio Configuration
audioCodec := AudioCodecConfig{
    Name: "opus",
    ClockRate: 48000,
    SDPFmtpLine: "minptime=10;useinbandfec=1",
    MaxBitrate: 32000,  // 32 kbps for voice
}
```

## 📊 Performance Targets

| Metric | Target | Critical Threshold |
|--------|--------|-------------------|
| RTT | < 150ms | > 300ms |
| Packet Loss | < 1% | > 3% |
| Jitter | < 30ms | > 50ms |
| CPU Usage | < 60% | > 80% |
| Memory/User | < 200MB | > 400MB |

## 🎯 Bandwidth Guidelines

### Upload (per participant)
- **Total**: 1.2 Mbps (all simulcast layers)
- **High layer**: 900 kbps
- **Medium layer**: 300 kbps  
- **Low layer**: 100 kbps
- **Audio**: 32 kbps

### Download (per participant)
- **Active speaker view**: 1-2 Mbps
- **Grid view (7x7)**: 3-4 Mbps
- **Small tile**: 50-80 kbps

## 🔧 Critical Implementation Points

### 1. Quality Adaptation Algorithm

```javascript
// Simple quality score calculation
function calculateQualityScore(metrics) {
  const plScore = 1 - Math.min(metrics.packetLoss * 20, 1);
  const jitterScore = 1 - Math.min(metrics.jitter / 100, 1);
  const rttScore = 1 - Math.min(metrics.rtt / 400, 1);
  
  return (plScore * 0.5 + jitterScore * 0.3 + rttScore * 0.2);
}

// Usage
if (qualityScore < 0.5) {
  switchToLowerQuality();
} else if (qualityScore > 0.8) {
  tryHigherQuality();
}
```

### 2. Network Monitoring

```javascript
// Monitor stats every second
setInterval(async () => {
  const stats = await pc.getStats();
  stats.forEach(report => {
    if (report.type === 'inbound-rtp') {
      console.log('Packet Loss:', report.packetsLost);
      console.log('Jitter:', report.jitter);
    }
  });
}, 1000);
```

### 3. Emergency Fallbacks

```javascript
// When network degrades severely
function enableSurvivalMode() {
  // 1. Switch to lowest video quality
  setPreferredLayers({ video: 'low' });
  
  // 2. Disable non-essential streams
  disableScreenShare();
  
  // 3. Reduce frame rate
  setMaxFramerate(15);
  
  // 4. Enable audio-only mode if needed
  if (packetLoss > 0.05) {
    disableAllVideo();
  }
}
```

## 🚨 Common Issues & Quick Fixes

### High Packet Loss (>3%)
```javascript
// Enable Forward Error Correction
transceiver.setCodecPreferences([
  { mimeType: 'video/VP9', sdpFmtpLine: 'apt=96' }  // Enable FEC
]);
```

### CPU Overload
```javascript
// Limit simultaneous video decodes
const maxVideos = getCPUCores() <= 4 ? 9 : 25;
limitDisplayedVideos(maxVideos);
```

### Bandwidth Constraints
```javascript
// Aggressive layer switching
if (availableBandwidth < 500000) {
  forceLowestQuality();
  enableAudioOnlyFallback();
}
```

## 📈 Monitoring Dashboard Metrics

### Real-time Metrics to Track
1. **Video Health**
   - Current resolution/bitrate per stream
   - Frame drops per second
   - Freeze events count

2. **Network Health**  
   - Current packet loss %
   - RTT to SFU
   - Available bandwidth estimate

3. **System Health**
   - CPU usage %
   - Memory usage
   - GPU acceleration status

## 🔄 Maintenance Schedule

| Task | Frequency | Priority |
|------|-----------|----------|
| Review quality metrics | Daily | High |
| Analyze failure patterns | Weekly | High |
| Update WebRTC libraries | Monthly | Medium |
| Codec updates | Quarterly | Low |
| Infrastructure scaling | Monthly | High |

## 🎮 Testing Commands

```bash
# Network condition simulation (Linux)
# 3G Network
sudo tc qdisc add dev eth0 root netem delay 150ms loss 2%

# Poor WiFi
sudo tc qdisc add dev eth0 root netem delay 50ms loss 1% duplicate 1%

# Congested Network
sudo tc qdisc add dev eth0 root tbf rate 500kbit burst 32kbit latency 100ms

# Clear all rules
sudo tc qdisc del dev eth0 root
```

## 📝 Implementation Stages

### Stage 1: Basic Implementation (Week 1-2)
- [ ] Implement 3-layer simulcast
- [ ] Add basic quality monitoring
- [ ] Set up TURN servers
- [ ] Configure VP8/VP9 codecs

### Stage 2: Quality Optimization (Week 3-4)
- [ ] Add adaptive bitrate control
- [ ] Implement quality scoring
- [ ] Add network condition detection
- [ ] Set up monitoring dashboard

### Stage 3: Production Hardening (Week 5-6)
- [ ] Add emergency fallbacks
- [ ] Implement load testing
- [ ] Add performance analytics
- [ ] Document troubleshooting procedures

## 🆘 Emergency Contacts & Resources

- WebRTC Debugging: `chrome://webrtc-internals`
- Stats API Docs: https://www.w3.org/TR/webrtc-stats/
- Fethur SFU Logs: `/var/log/fethur/sfu.log`
- Performance Dashboard: `https://metrics.fethur.com`

## Key Takeaways

1. **Start with simulcast** - It's essential for quality adaptation
2. **Monitor everything** - You can't optimize what you don't measure
3. **Plan for bad networks** - Not everyone has fiber
4. **Test with real conditions** - Lab tests ≠ real world
5. **Have fallback strategies** - Audio-only mode saves the day

---

*Last Updated: January 2025*
*Version: 1.0*