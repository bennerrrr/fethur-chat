const WebSocket = require('ws');

// Test voice WebSocket connection
async function testVoiceWebSocket() {
    console.log('Testing voice WebSocket connection...');
    
    // First, get a token by logging in
    const loginResponse = await fetch('http://localhost:8081/api/auth/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            username: 'admin',
            password: 'admin123'
        })
    });
    
    if (!loginResponse.ok) {
        console.error('Failed to login:', await loginResponse.text());
        return;
    }
    
    const loginData = await loginResponse.json();
    const token = loginData.token;
    
    console.log('Got token:', token.substring(0, 20) + '...');
    
    // Connect to voice WebSocket
    const ws = new WebSocket(`ws://localhost:8081/voice?token=${encodeURIComponent(token)}`);
    
    ws.on('open', () => {
        console.log('Voice WebSocket connected!');
    });
    
    ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        console.log('Received message:', message);
        
        if (message.type === 'connected') {
            console.log('✅ SUCCESS: Received connected message!');
            ws.close();
        }
    });
    
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
    
    ws.on('close', () => {
        console.log('WebSocket closed');
    });
    
    // Timeout after 10 seconds
    setTimeout(() => {
        console.log('❌ TIMEOUT: No connected message received within 10 seconds');
        ws.close();
    }, 10000);
}

testVoiceWebSocket().catch(console.error); 