document.addEventListener('DOMContentLoaded', function () {
  // Sub-step 1.2.3: Get DOM references
  const apiKeyInput = document.getElementById('apiKey');
  // const saveButton = document.getElementById('saveButton'); // ESLint: Commented out as unused (no-unused-vars). Ref'd in plan but not directly used in code.
  const statusMessage = document.getElementById('statusMessage');
  const settingsForm = document.getElementById('settingsForm');
  // Sub-step 1.2.1: Add DOM reference for the model selection dropdown
  const geminiModelSelect = document.getElementById('geminiModel');

  // Sub-step 1.2.2: Update the storage retrieval to load model preference
  // Sub-step 1.2.10 & 1.2.11: Load saved API key on page load
  chrome.storage.sync.get(['apiKey', 'geminiModel'], function (result) {
    if (chrome.runtime.lastError) {
      console.error(
        'EngageIQ: Error retrieving settings:',
        chrome.runtime.lastError.message
      );
      statusMessage.textContent = 'Error loading settings.';
      statusMessage.style.color = 'red';
    } else {
      // Load API key if it exists
      if (result.apiKey) {
        apiKeyInput.value = result.apiKey;
        console.log('EngageIQ: API Key loaded.');
      } else {
        console.log('EngageIQ: No API Key found in storage.');
      }
      
      // Sub-step 1.2.3: Add code to set the dropdown value based on stored preference
      if (result.geminiModel) {
        geminiModelSelect.value = result.geminiModel;
        console.log('EngageIQ: Gemini model preference loaded:', result.geminiModel);
      } else {
        console.log('EngageIQ: No model preference found, using default.');
      }
    }
  });

  // Sub-step 1.2.4: Add submit event listener to the form
  settingsForm.addEventListener('submit', function (event) {
    // Sub-step 1.2.5: Prevent default form submission
    event.preventDefault();

    // Sub-step 1.2.6: Get value from #apiKey. Allow saving empty string to clear.
    const apiKey = apiKeyInput.value.trim(); // Trim whitespace
    // Sub-step 1.2.4: Get the selected model value
    const geminiModel = geminiModelSelect.value;

    // Sub-step 1.2.7: Call chrome.storage.sync.set
    // Sub-step 1.2.4: Update form submission handler to save model preference
    chrome.storage.sync.set({ apiKey: apiKey, geminiModel: geminiModel }, function () {
      // Sub-step 1.2.8: Implement the set callback
      if (chrome.runtime.lastError) {
        console.error(
          'EngageIQ: Error saving settings:',
          chrome.runtime.lastError.message
        );
        statusMessage.textContent = 'Error saving settings.';
        statusMessage.style.color = 'red';
      } else {
        console.log('EngageIQ: Settings saved successfully.');
        statusMessage.textContent = 'Settings saved successfully!';
        statusMessage.style.color = 'green';

        // Clear the message after a few seconds
        setTimeout(function () {
          statusMessage.textContent = '';
        }, 3000); // 3 seconds
      }
    });
  });
});
