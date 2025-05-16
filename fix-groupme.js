/**
 * GroupMe Configuration Helper
 * 
 * This script extracts GroupMe group IDs from the provided group links
 * and stores the configuration in localStorage.
 */

// GroupMe configuration data
const config = {
  accessToken: 'YTN1QCUQYWkIgMdQ9DO2eVZFSq3NtDo1tib1NKbI',
  groups: {}
};

// Group links
const GROUP_LINKS = [
  'https://groupme.com/join_group/54099588/VDirXvX9',
  'https://groupme.com/join_group/13840065/SAAASXfE',
  'https://groupme.com/join_group/35765159/Upnew0uU',
  'https://groupme.com/join_group/84195970/BnTOjCZ1',
  'https://groupme.com/join_group/65281843/l3EENCn9',
  'https://groupme.com/join_group/105011074/CNtBmHbK'
];

// Extract group IDs and populate the groups object
GROUP_LINKS.forEach((link, index) => {
  const matches = link.match(/\/join_group\/(\d+)\//);
  if (matches && matches[1]) {
    const groupId = matches[1];
    config.groups[groupId] = `Group ${index + 1}`;
  }
});

// Save to localStorage
function saveToLocalStorage() {
  localStorage.setItem('groupme_config', JSON.stringify(config));
  console.log('GroupMe configuration saved to localStorage');
  console.log('Access Token:', config.accessToken.substring(0, 5) + '...');
  console.log('Groups:', Object.keys(config.groups).length);
}

// Run this script in your browser console when on the Crokodial app page
saveToLocalStorage(); 