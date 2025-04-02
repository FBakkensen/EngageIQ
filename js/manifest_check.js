/**
 * EngageIQ Manifest and Asset Verification Script
 * This script verifies that all assets referenced in the manifest.json exist
 * and that the manifest is properly configured for production.
 */

console.log('EngageIQ: Starting manifest and asset verification...');

// Function to check if a file exists
async function fileExists(url) {
  try {
    const response = await fetch(url);
    return response.ok;
  } catch (error) {
    console.error(`EngageIQ: Error checking file ${url}:`, error);
    return false;
  }
}

// Function to verify icon paths
async function verifyIcons() {
  const iconSizes = [16, 48, 128];
  let allIconsExist = true;
  
  for (const size of iconSizes) {
    const iconPath = chrome.runtime.getURL(`icons/icon${size}.png`);
    const exists = await fileExists(iconPath);
    
    if (!exists) {
      console.error(`EngageIQ: Icon not found: icons/icon${size}.png`);
      allIconsExist = false;
    } else {
      console.log(`EngageIQ: Verified icon: icons/icon${size}.png`);
    }
  }
  
  return allIconsExist;
}

// Function to verify web accessible resources
async function verifyWebAccessibleResources() {
  const manifest = chrome.runtime.getManifest();
  const resources = manifest.web_accessible_resources[0].resources;
  let allResourcesExist = true;
  
  for (const resource of resources) {
    const resourcePath = chrome.runtime.getURL(resource);
    const exists = await fileExists(resourcePath);
    
    if (!exists) {
      console.error(`EngageIQ: Web accessible resource not found: ${resource}`);
      allResourcesExist = false;
    } else {
      console.log(`EngageIQ: Verified web accessible resource: ${resource}`);
    }
  }
  
  return allResourcesExist;
}

// Function to verify manifest version
function verifyManifestVersion() {
  const manifest = chrome.runtime.getManifest();
  const version = manifest.version;
  
  if (version === '1.0.0') {
    console.log(`EngageIQ: Manifest version is correctly set to ${version}`);
    return true;
  } else {
    console.error(`EngageIQ: Manifest version is ${version}, expected 1.0.0`);
    return false;
  }
}

// Function to verify permissions
function verifyPermissions() {
  const manifest = chrome.runtime.getManifest();
  const requiredPermissions = ['storage', 'scripting', 'clipboardWrite'];
  const requiredHostPermissions = [
    '*://*.linkedin.com/*',
    'https://generativelanguage.googleapis.com/*'
  ];
  
  // Check permissions
  const missingPermissions = requiredPermissions.filter(
    perm => !manifest.permissions.includes(perm)
  );
  
  // Check host permissions
  const missingHostPermissions = requiredHostPermissions.filter(
    host => !manifest.host_permissions.includes(host)
  );
  
  if (missingPermissions.length > 0) {
    console.error(`EngageIQ: Missing permissions: ${missingPermissions.join(', ')}`);
  } else {
    console.log('EngageIQ: All required permissions are present');
  }
  
  if (missingHostPermissions.length > 0) {
    console.error(`EngageIQ: Missing host permissions: ${missingHostPermissions.join(', ')}`);
  } else {
    console.log('EngageIQ: All required host permissions are present');
  }
  
  // Check for unnecessary permissions
  const unnecessaryPermissions = manifest.permissions.filter(
    perm => !requiredPermissions.includes(perm)
  );
  
  if (unnecessaryPermissions.length > 0) {
    console.warn(`EngageIQ: Potentially unnecessary permissions: ${unnecessaryPermissions.join(', ')}`);
  }
  
  return missingPermissions.length === 0 && missingHostPermissions.length === 0;
}

// Run all verification checks
async function runVerification() {
  console.log('EngageIQ: Starting manifest and asset verification...');
  
  const iconCheck = await verifyIcons();
  const resourceCheck = await verifyWebAccessibleResources();
  const versionCheck = verifyManifestVersion();
  const permissionCheck = verifyPermissions();
  
  if (iconCheck && resourceCheck && versionCheck && permissionCheck) {
    console.log('EngageIQ: ✅ All manifest and asset checks passed!');
  } else {
    console.error('EngageIQ: ❌ Some manifest or asset checks failed. See errors above.');
  }
}

// Run the verification when the script is loaded
runVerification();
