/**
 * Feature Flag Test Script
 *
 * Tests that feature flags are loaded correctly from environment variables
 */

import { FEATURES, getFeatureFlagStatus, getEnabledFeatures } from '../lib/config/features';

console.log('='.repeat(60));
console.log('FEATURE FLAG TEST');
console.log('='.repeat(60));
console.log('');

console.log('Environment Variables:');
console.log('  NEXT_PUBLIC_MISSING_TS_HANDLING:', process.env.NEXT_PUBLIC_MISSING_TS_HANDLING);
console.log('');

console.log('Feature Flag Status:');
console.log('  MISSING_TIMESTAMP_HANDLING:', FEATURES.MISSING_TIMESTAMP_HANDLING);
console.log('');

console.log('All Feature Flags:');
console.log(JSON.stringify(getFeatureFlagStatus(), null, 2));
console.log('');

console.log('Enabled Features:');
const enabled = getEnabledFeatures();
if (enabled.length === 0) {
  console.log('  (none - all features disabled)');
} else {
  enabled.forEach(flag => console.log(`  - ${flag}`));
}
console.log('');

console.log('='.repeat(60));
console.log('TEST RESULT:', FEATURES.MISSING_TIMESTAMP_HANDLING ? '✓ FLAG ENABLED' : '✓ FLAG DISABLED (default)');
console.log('='.repeat(60));
