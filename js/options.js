document.addEventListener('DOMContentLoaded', function() {
  // Sub-step 1.2.3: Get DOM references
  const apiKeyInput = document.getElementById('apiKey');
  const saveButton = document.getElementById('saveButton'); // Although not explicitly used by ID in listener, good practice to reference if needed.
  const statusMessage = document.getElementById('statusMessage');
  const settingsForm = document.getElementById('settingsForm');

  // Sub-step 1.2.10 & 1.2.11: Load saved API key on page load
  chrome.storage.sync.get(['apiKey'], function(result) {
    if (chrome.runtime.lastError) {
      console.error("Error retrieving API key:", chrome.runtime.lastError.message);
      statusMessage.textContent = 'Error loading settings.';
      statusMessage.style.color = 'red';
    } else if (result.apiKey) {
      apiKeyInput.value = result.apiKey;
      console.log("API Key loaded.");
    } else {
      console.log("No API Key found in storage.");
    }
  });

  // Sub-step 1.2.4: Add submit event listener to the form
  settingsForm.addEventListener('submit', function(event) {
    // Sub-step 1.2.5: Prevent default form submission
    event.preventDefault();

    // Sub-step 1.2.6: Get value from #apiKey. Allow saving empty string to clear.
    const apiKey = apiKeyInput.value.trim(); // Trim whitespace

    // Sub-step 1.2.7: Call chrome.storage.sync.set
    chrome.storage.sync.set({ apiKey: apiKey }, function() {
      // Sub-step 1.2.8: Implement the set callback
      if (chrome.runtime.lastError) {
        console.error("Error saving API key:", chrome.runtime.lastError.message);
        statusMessage.textContent = 'Error saving API key.';
        statusMessage.style.color = 'red';
      } else {
        console.log("API Key saved successfully.");
        statusMessage.textContent = 'API Key saved successfully!';
        statusMessage.style.color = 'green';

        // Clear the message after a few seconds
        setTimeout(function() {
          statusMessage.textContent = '';
        }, 3000); // 3 seconds
      }
    });
  });
});
