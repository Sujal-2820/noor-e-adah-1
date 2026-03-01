/**
 * End-to-End Test Runner with Server Management
 * 
 * This script:
 * 1. Checks if backend server is running
 * 2. Starts server if not running
 * 3. Waits for server to be ready
 * 4. Runs comprehensive E2E tests
 * 5. Provides results summary
 * 
 * Usage: node scripts/runE2ETestsWithServer.js
 */

require('dotenv').config();
const { spawn } = require('child_process');
const axios = require('axios');
const path = require('path');

const SERVER_PORT = process.env.PORT || 3000;
const BASE_URL = `http://127.0.0.1:${SERVER_PORT}`;
const HEALTH_CHECK_URL = `${BASE_URL}/health`;
const MAX_WAIT_TIME = 60000; // 60 seconds
const CHECK_INTERVAL = 1000; // 1 second

let serverProcess = null;
let serverStartedByUs = false;

/**
 * Check if server is already running
 */
async function isServerRunning() {
  try {
    const response = await axios.get(HEALTH_CHECK_URL, {
      timeout: 2000,
      family: 4
    });
    return response.status === 200;
  } catch (error) {
    return false;
  }
}

/**
 * Wait for server to be ready
 */
async function waitForServer(maxWaitTime = MAX_WAIT_TIME) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitTime) {
    if (await isServerRunning()) {
      console.log('✅ Server is ready!\n');
      return true;
    }
    process.stdout.write('.');
    await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL));
  }
  
  console.log('\n❌ Server did not become ready in time');
  return false;
}

/**
 * Start backend server
 */
function startServer() {
  console.log('🚀 Starting backend server...');
  
  const serverPath = path.join(__dirname, '../index.js');
  
  serverProcess = spawn('node', [serverPath], {
    cwd: path.join(__dirname, '..'),
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NODE_ENV: 'test' }
  });
  
  let serverOutput = '';
  
  serverProcess.stdout.on('data', (data) => {
    const output = data.toString();
    serverOutput += output;
    // Show server logs (optional - can be toggled)
    if (process.env.SHOW_SERVER_LOGS === 'true') {
      console.log(output);
    }
  });
  
  serverProcess.stderr.on('data', (data) => {
    const output = data.toString();
    serverOutput += output;
    if (process.env.SHOW_SERVER_LOGS === 'true') {
      console.error(output);
    }
  });
  
  serverProcess.on('error', (error) => {
    console.error(`❌ Failed to start server: ${error.message}`);
    process.exit(1);
  });
  
  serverProcess.on('exit', (code) => {
    if (code !== 0 && serverStartedByUs) {
      console.error(`\n❌ Server exited with code ${code}`);
      console.error('Server output:', serverOutput);
    }
  });
  
  serverStartedByUs = true;
  return serverProcess;
}

/**
 * Stop server
 */
function stopServer() {
  if (serverProcess && serverStartedByUs) {
    console.log('\n🛑 Stopping server...');
    serverProcess.kill('SIGTERM');
    
    return new Promise((resolve) => {
      serverProcess.on('exit', () => {
        console.log('✅ Server stopped\n');
        resolve();
      });
      
      // Force kill after 5 seconds
      setTimeout(() => {
        if (serverProcess && !serverProcess.killed) {
          serverProcess.kill('SIGKILL');
          resolve();
        }
      }, 5000);
    });
  }
  return Promise.resolve();
}

/**
 * Run comprehensive tests
 */
async function runTests() {
  console.log('🧪 Running comprehensive E2E tests...\n');
  
  const { runAllTests } = require('./comprehensiveE2ETest');
  await runAllTests();
}

/**
 * Main execution
 */
async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('🧪 Comprehensive E2E Test Runner with Server Management');
  console.log('='.repeat(70) + '\n');
  
  try {
    // Check if server is running
    console.log('📡 Checking if server is running...');
    const serverRunning = await isServerRunning();
    
    if (serverRunning) {
      console.log('✅ Server is already running\n');
    } else {
      // Start server
      startServer();
      
      // Wait for server to be ready
      console.log('\n⏳ Waiting for server to start');
      const serverReady = await waitForServer();
      
      if (!serverReady) {
        console.error('❌ Failed to start server. Exiting.');
        await stopServer();
        process.exit(1);
      }
    }
    
    // Run tests
    await runTests();
    
    // Stop server if we started it
    if (serverStartedByUs) {
      await stopServer();
    }
    
    console.log('✅ Test execution completed!\n');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Test runner error:', error);
    console.error(error.stack);
    
    if (serverStartedByUs) {
      await stopServer();
    }
    
    process.exit(1);
  }
}

// Handle cleanup on exit
process.on('SIGINT', async () => {
  console.log('\n\n⚠️  Received SIGINT. Cleaning up...');
  if (serverStartedByUs) {
    await stopServer();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  if (serverStartedByUs) {
    await stopServer();
  }
  process.exit(0);
});

// Run main
if (require.main === module) {
  main();
}

module.exports = { main, startServer, stopServer, isServerRunning };




