// @ts-nocheck

document.addEventListener('DOMContentLoaded', () => {
  const downloadBtn = document.getElementById('download-json');
  const statusDiv = document.getElementById('status');

  downloadBtn.addEventListener('click', () => {
    // Query the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];

      // Send a message to the content script
      chrome.tabs.sendMessage(activeTab.id, { action: "downloadFirestore" }, (response) => {
        // Check if there was an error sending the message
        if (chrome.runtime.lastError) {
          statusDiv.textContent = `Error: ${chrome.runtime.lastError.message}`;
          statusDiv.className = 'status show error';
        } else if (response) {
          // If the content script responded
          if (response.status === 'ok') {
            statusDiv.textContent = response.message;
            statusDiv.className = 'status show success';
          } else {
            statusDiv.textContent = `Error: ${response.message || 'Unknown error'}`;
            statusDiv.className = 'status show error';
          }
        } else {
          // No response from the content script
          statusDiv.textContent = 'No response from content script.';
          statusDiv.className = 'status show error';
        }
      });
    });
  });
});
