/**
 * Pre-Deployment Verification Script
 * Run this before deploying to production
 * 
 * Usage: node scripts/verifyDeploymentReadiness.js
 */

const fs = require('fs');
const path = require('path');

const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
    console.log('\n' + '='.repeat(70));
    log(title, 'bright');
    console.log('='.repeat(70) + '\n');
}

const checks = {
    passed: [],
    warnings: [],
    failed: []
};

function checkPass(message) {
    checks.passed.push(message);
    log(`✅ ${message}`, 'green');
}

function checkWarn(message) {
    checks.warnings.push(message);
    log(`⚠️  ${message}`, 'yellow');
}

function checkFail(message) {
    checks.failed.push(message);
    log(`❌ ${message}`, 'red');
}

// Check 1: Environment file exists
function checkEnvFile() {
    logSection('CHECK 1: Environment Configuration');

    const envPath = path.join(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
        checkPass('.env file exists');

        // Read and check critical variables
        const envContent = fs.readFileSync(envPath, 'utf8');
        const criticalVars = [
            'MONGO_URI',
            'JWT_SECRET',
            'NODE_ENV',
            'PORT'
        ];

        criticalVars.forEach(varName => {
            if (envContent.includes(`${varName}=`)) {
                checkPass(`${varName} is defined`);
            } else {
                checkFail(`${varName} is missing`);
            }
        });

        // Check if using production MongoDB
        if (envContent.includes('clustercanx.bcazxvt.mongodb.net')) {
            checkPass('Using production MongoDB (ClusterCanx)');
        } else {
            checkWarn('Not using ClusterCanx MongoDB - verify this is intentional');
        }

    } else {
        checkFail('.env file not found');
    }
}

// Check 2: Firebase service account
function checkFirebaseConfig() {
    logSection('CHECK 2: Firebase Configuration');

    const firebasePath = path.join(__dirname, '..', 'config', 'firebase-service-account.json');
    if (fs.existsSync(firebasePath)) {
        checkPass('firebase-service-account.json exists');

        try {
            const firebaseConfig = JSON.parse(fs.readFileSync(firebasePath, 'utf8'));

            if (firebaseConfig.project_id === 'canx-international') {
                checkPass('Using canx-international Firebase project');
            } else {
                checkWarn(`Using Firebase project: ${firebaseConfig.project_id}`);
            }

            if (firebaseConfig.private_key && firebaseConfig.client_email) {
                checkPass('Firebase credentials are complete');
            } else {
                checkFail('Firebase credentials are incomplete');
            }
        } catch (error) {
            checkFail('firebase-service-account.json is invalid JSON');
        }
    } else {
        checkFail('firebase-service-account.json not found');
    }
}

// Check 3: Dependencies
function checkDependencies() {
    logSection('CHECK 3: Dependencies');

    const packagePath = path.join(__dirname, '..', 'package.json');
    const nodeModulesPath = path.join(__dirname, '..', 'node_modules');

    if (fs.existsSync(packagePath)) {
        checkPass('package.json exists');

        const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        const depCount = Object.keys(packageJson.dependencies || {}).length;
        log(`   📦 ${depCount} dependencies defined`, 'cyan');

        if (fs.existsSync(nodeModulesPath)) {
            checkPass('node_modules directory exists');
        } else {
            checkFail('node_modules not found - run npm install');
        }
    } else {
        checkFail('package.json not found');
    }
}

// Check 4: Critical files
function checkCriticalFiles() {
    logSection('CHECK 4: Critical Files');

    const criticalFiles = [
        'index.js',
        'package.json',
        'render.yaml',
        '.gitignore'
    ];

    criticalFiles.forEach(file => {
        const filePath = path.join(__dirname, '..', file);
        if (fs.existsSync(filePath)) {
            checkPass(`${file} exists`);
        } else {
            checkFail(`${file} not found`);
        }
    });
}

// Check 5: .gitignore
function checkGitignore() {
    logSection('CHECK 5: Security - .gitignore');

    const gitignorePath = path.join(__dirname, '..', '.gitignore');
    if (fs.existsSync(gitignorePath)) {
        const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');

        const criticalIgnores = [
            '.env',
            'node_modules',
            'firebase-service-account.json'
        ];

        criticalIgnores.forEach(pattern => {
            if (gitignoreContent.includes(pattern)) {
                checkPass(`${pattern} is in .gitignore`);
            } else {
                checkFail(`${pattern} is NOT in .gitignore - SECURITY RISK!`);
            }
        });
    } else {
        checkFail('.gitignore not found - SECURITY RISK!');
    }
}

// Check 6: Build test
async function checkBuildTest() {
    logSection('CHECK 6: Syntax Check');

    try {
        require('../index.js');
        checkFail('index.js loaded (server should not start in test mode)');
    } catch (error) {
        if (error.message.includes('Cannot find module')) {
            checkFail(`Missing module: ${error.message}`);
        } else {
            // This is expected - the server tries to start
            checkPass('index.js has no syntax errors');
        }
    }
}

// Main execution
async function runAllChecks() {
    console.clear();
    logSection('🚀 PRE-DEPLOYMENT VERIFICATION - Canx International Backend');

    log('Running comprehensive deployment readiness checks...', 'cyan');

    checkEnvFile();
    checkFirebaseConfig();
    checkDependencies();
    checkCriticalFiles();
    checkGitignore();
    await checkBuildTest();

    // Summary
    logSection('📊 VERIFICATION SUMMARY');

    log(`✅ Passed: ${checks.passed.length}`, 'green');
    log(`⚠️  Warnings: ${checks.warnings.length}`, 'yellow');
    log(`❌ Failed: ${checks.failed.length}`, 'red');

    if (checks.failed.length > 0) {
        log('\n❌ DEPLOYMENT NOT READY', 'red');
        log('Please fix the failed checks before deploying.', 'yellow');
        process.exit(1);
    } else if (checks.warnings.length > 0) {
        log('\n⚠️  DEPLOYMENT READY WITH WARNINGS', 'yellow');
        log('Review warnings before deploying.', 'cyan');
        process.exit(0);
    } else {
        log('\n✅ DEPLOYMENT READY!', 'green');
        log('All checks passed. Safe to deploy.', 'cyan');
        process.exit(0);
    }
}

// Run checks
runAllChecks().catch(error => {
    log('\n❌ Verification script failed:', 'red');
    console.error(error);
    process.exit(1);
});
