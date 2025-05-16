/**
 * Update GroupMe Configuration
 * 
 * This script updates the GroupMe configuration in localStorage to use
 * the provided access token and group links.
 */

// Access token provided by the user
const ACCESS_TOKEN = 'YTN1QCUQYWkIgMdQ9DO2eVZFSq3NtDo1tib1NKbI';

// Group links provided by the user
const GROUP_LINKS = [
  'https://groupme.com/join_group/54099588/VDirXvX9',
  'https://groupme.com/join_group/13840065/SAAASXfE',
  'https://groupme.com/join_group/35765159/Upnew0uU',
  'https://groupme.com/join_group/84195970/BnTOjCZ1',
  'https://groupme.com/join_group/65281843/l3EENCn9',
  'https://groupme.com/join_group/105011074/CNtBmHbK'
];

// Extract group IDs from the links
const groups = {};
GROUP_LINKS.forEach((link, index) => {
  const matches = link.match(/\/join_group\/(\d+)\//);
  if (matches && matches[1]) {
    const groupId = matches[1];
    groups[groupId] = `Group ${index + 1}`;
  }
});

// Create the config object
const groupMeConfig = {
  accessToken: ACCESS_TOKEN,
  groups
};

// Save to localStorage
localStorage.setItem('groupme_config', JSON.stringify(groupMeConfig));

console.log('GroupMe configuration updated with:');
console.log(`- Access Token: ${ACCESS_TOKEN.substring(0, 5)}...`);
console.log(`- ${Object.keys(groups).length} groups`); 