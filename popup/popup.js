document.addEventListener('DOMContentLoaded', () => {
  const downloadBtn = document.getElementById('download-btn');
  const statusDiv = document.getElementById('status');
  const jsonContent = document.getElementById('json-content');

  // We'll store the fetched JSON string here, so if the user clicks "Download",
  // we already have the data.
  let fetchedJsonString = "";

  // 1) As soon as the popup opens, request the Firestore document JSON.
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs[0];
    chrome.tabs.sendMessage(activeTab.id, { action: "fetchFirestore" }, (response) => {
      if (chrome.runtime.lastError) {
        statusDiv.textContent = `Error: ${chrome.runtime.lastError.message}`;
        statusDiv.className = 'status show error';
      } else if (response) {
        if (response.status === 'ok' && response.data) {
          // We got the JSON successfully
          fetchedJsonString = response.data;
          // Display in the <pre> area
          jsonContent.textContent = fetchedJsonString;
        } else {
          // Some error or missing data
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

  // 2) When user clicks Download, create and download the file locally
  downloadBtn.addEventListener('click', () => {
    if (!fetchedJsonString) {
      statusDiv.textContent = "No JSON data available to download.";
      statusDiv.className = 'status show error';
      return;
    }

    try {
      const blob = new Blob([fetchedJsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = "firestore-document.json";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

    } catch (err) {
      console.error("Download error:", err);
      statusDiv.textContent = "Error: Could not download the JSON file.";
      statusDiv.className = 'status show error';
    }
  });
});
