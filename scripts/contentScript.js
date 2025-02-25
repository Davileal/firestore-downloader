/***********************************************************
 * parseLeafValue, parseNode, parseMap, parseArray
 * (same as before)
 ***********************************************************/
function parseLeafValue(rawText) {
  let value = rawText.trim();
  if (value.startsWith('"') && value.endsWith('"')) {
    value = value.slice(1, -1);
  }

  const lowerVal = value.toLowerCase();
  if (lowerVal === "true") return true;
  if (lowerVal === "false") return false;

  const asNumber = Number(value);
  if (!isNaN(asNumber) && value !== "") {
    return asNumber;
  }
  return value;
}

function parseNode(nodeElement) {
  const keySpan = nodeElement.querySelector(".database-key");
  if (!keySpan) return {};

  const fieldKey = keySpan.textContent.trim();
  const typeSpan = nodeElement.querySelector(
    ".database-buttons .database-type span"
  );
  const typeText = typeSpan ? typeSpan.textContent.trim() : "(unknown)";

  let value;
  if (typeText === "(map)") {
    const mapContainer = nodeElement.querySelector(
      ":scope > .database-children"
    );
    value = parseMap(mapContainer);
  } else if (typeText === "(array)") {
    const arrayContainer = nodeElement.querySelector(
      ":scope > .database-children"
    );
    value = parseArray(arrayContainer);
  } else {
    const leafSpan = nodeElement.querySelector(".database-leaf-value");
    value = leafSpan ? parseLeafValue(leafSpan.textContent) : null;
  }

  return { [fieldKey]: value };
}

function parseMap(databaseChildren) {
  const mapResult = {};
  if (!databaseChildren) return mapResult;

  const dataTrees = databaseChildren.querySelectorAll(":scope > f7e-data-tree");
  dataTrees.forEach((dataTree) => {
    const nodeElements = dataTree.querySelectorAll(":scope > .database-node");
    nodeElements.forEach((nodeElement) => {
      Object.assign(mapResult, parseNode(nodeElement));
    });
  });

  return mapResult;
}

function parseArray(databaseChildren) {
  const resultArray = [];
  if (!databaseChildren) return resultArray;

  const dataTrees = databaseChildren.querySelectorAll(":scope > f7e-data-tree");
  dataTrees.forEach((dataTree) => {
    const nodeElements = dataTree.querySelectorAll(":scope > .database-node");
    nodeElements.forEach((nodeElement) => {
      const parsedObj = parseNode(nodeElement);
      for (const [key, value] of Object.entries(parsedObj)) {
        const index = parseInt(key, 10);
        if (!isNaN(index)) {
          resultArray[index] = value;
        }
      }
    });
  });

  return resultArray;
}

/***********************************************************
 * MAIN LISTENER: "fetchFirestore"
 *  - We now use ONLY the last panel to find the doc ID
 *    (.panel-container > .panel > .panel-header > .label).
 *  - We also parse the same panel for field data.
 *  - Then we return the JSON string to the popup (no download here).
 ***********************************************************/
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action !== "fetchFirestore") {
    return false;
  }

  try {
    const panelsContainer = document.querySelector(".panels-container");
    if (!panelsContainer) {
      console.warn("No .panels-container found in the DOM.");
      sendResponse({ status: "error", message: "No .panels-container." });
      return true;
    }

    const panelContainers =
      panelsContainer.querySelectorAll(".panel-container");
    if (panelContainers.length < 1) {
      console.warn("No .panel-container elements found.");
      sendResponse({ status: "error", message: "No .panel-container found." });
      return true;
    }

    // We'll use ONLY the last panel-container
    const lastPanel = panelContainers[panelContainers.length - 1];

    // 1) Extract doc ID from .panel > .panel-header > .label
    let docId = "UNKNOWN_DOCUMENT_ID";
    const docIdElement = lastPanel.querySelector(
      ":scope f7e-panel-header .label"
    );
    if (docIdElement) {
      docId = docIdElement.textContent.trim();
    }

    // 2) Collect fields from fs-animate-change-classes in the same panel
    const animateElements = lastPanel.querySelectorAll(
      "fs-animate-change-classes"
    );
    if (!animateElements.length) {
      console.warn("No fs-animate-change-classes found in the last panel.");
      sendResponse({
        status: "error",
        message: "No field data found in last panel.",
      });
      return true;
    }

    const dataObject = {};

    animateElements.forEach((element) => {
      const keySpan = element.querySelector(".database-key");
      if (!keySpan) return;

      const fieldKey = keySpan.textContent.trim();
      const typeSpan = element.querySelector(
        ".database-buttons .database-type span"
      );
      const typeText = typeSpan ? typeSpan.textContent.trim() : "(unknown)";

      if (typeText === "(map)") {
        const mapContainer = element.querySelector(".database-children");
        dataObject[fieldKey] = parseMap(mapContainer);
      } else if (typeText === "(array)") {
        const arrayContainer = element.querySelector(".database-children");
        dataObject[fieldKey] = parseArray(arrayContainer);
      } else {
        const leafSpan = element.querySelector(".database-leaf-value");
        dataObject[fieldKey] = leafSpan
          ? parseLeafValue(leafSpan.textContent)
          : null;
      }
    });

    // 3) Build final JSON object => { docId: dataObject }
    const finalJson = { [docId]: dataObject };

    // Return it as a string
    const jsonString = JSON.stringify(finalJson, null, 2);

    // Send it back to the popup
    sendResponse({ status: "ok", data: jsonString });
  } catch (error) {
    console.error("Error parsing Firestore doc:", error);
    sendResponse({ status: "error", message: error.message });
  }

  // Indicate async response
  return true;
});
