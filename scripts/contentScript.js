/***********************************************************
 * parseLeafValue(rawText)
 *  - Removes surrounding quotes (e.g. `"3.1.7"`)
 *  - Converts "true"/"false" to boolean
 *  - Converts numeric strings ("123") to numbers
 *  - Otherwise returns a string
 ***********************************************************/
function parseLeafValue(rawText) {
  let value = rawText.trim();

  // Remove surrounding quotes if present
  if (value.startsWith('"') && value.endsWith('"')) {
    value = value.slice(1, -1);
  }

  // Check for booleans ("true"/"false")
  const lowerVal = value.toLowerCase();
  if (lowerVal === "true") return true;
  if (lowerVal === "false") return false;

  // Attempt numeric parsing
  const asNumber = Number(value);
  if (!isNaN(asNumber) && value !== "") {
    return asNumber;
  }

  // Otherwise, return as a plain string
  return value;
}

/***********************************************************
 * parseNode(nodeElement)
 *  - Given a single .database-node, determines:
 *     1) The field name from .database-key
 *     2) The data type from ".database-type span":
 *        e.g. (map), (array), (number), (string), etc.
 *     3) Depending on the type:
 *        - (map)   => parseMap
 *        - (array) => parseArray
 *        - else    => parseLeafValue (boolean/number/string/geopoint)
 *  - Returns an object { [fieldName]: value }
 ***********************************************************/
function parseNode(nodeElement) {
  // 1) Field name from .database-key
  const keySpan = nodeElement.querySelector(".database-key");
  if (!keySpan) {
    // If there's no key, return an empty object
    return {};
  }
  const fieldKey = keySpan.textContent.trim();

  // 2) Determine the data type from .database-type span
  //    e.g. "(map)", "(array)", "(number)", "(string)", etc.
  const typeSpan = nodeElement.querySelector(
    ".database-buttons .database-type span"
  );
  const typeText = typeSpan ? typeSpan.textContent.trim() : "(unknown)";

  // 3) Extract the value based on the type
  let value;
  if (typeText === "(map)") {
    // This field is a Map
    const mapContainer = nodeElement.querySelector(
      ":scope > .database-children"
    );
    value = parseMap(mapContainer);
  } else if (typeText === "(array)") {
    // This field is an Array
    const arrayContainer = nodeElement.querySelector(
      ":scope > .database-children"
    );
    value = parseArray(arrayContainer);
  } else {
    // It's a leaf type (boolean, number, string, geopoint, etc.)
    const leafSpan = nodeElement.querySelector(".database-leaf-value");
    value = leafSpan ? parseLeafValue(leafSpan.textContent) : null;
  }

  // Return an object with the single parsed field
  return { [fieldKey]: value };
}

/***********************************************************
 * parseMap(databaseChildren)
 *  - When a field is "(map)", the DOM structure has:
 *     .database-children > one or more <f7e-data-tree> elements
 *  - Each <f7e-data-tree> can contain one or more .database-node.
 *  - We parse each node with parseNode and merge results.
 *  - Returns an object with all subfields as { key: value }.
 ***********************************************************/
function parseMap(databaseChildren) {
  const mapResult = {};
  if (!databaseChildren) {
    // If there's no .database-children, return an empty object
    return mapResult;
  }

  // Find all <f7e-data-tree> elements inside .database-children
  const dataTrees = databaseChildren.querySelectorAll(":scope > f7e-data-tree");

  dataTrees.forEach((dataTree) => {
    // Each f7e-data-tree may have multiple .database-node children
    const nodeElements = dataTree.querySelectorAll(":scope > .database-node");

    nodeElements.forEach((nodeElement) => {
      const parsedFields = parseNode(nodeElement);
      // Merge parsed fields into mapResult
      Object.assign(mapResult, parsedFields);
    });
  });

  return mapResult;
}

/***********************************************************
 * parseArray(databaseChildren)
 *  - Similar to parseMap, but stores items in an array instead of an object.
 *  - Each .database-node typically has a numeric .database-key: "0", "1", ...
 *  - We'll place each item in an array at the correct index.
 ***********************************************************/
function parseArray(databaseChildren) {
  const resultArray = [];
  if (!databaseChildren) {
    // No children => empty array
    return resultArray;
  }

  const dataTrees = databaseChildren.querySelectorAll(":scope > f7e-data-tree");
  dataTrees.forEach((dataTree) => {
    // Each f7e-data-tree may have multiple .database-node children
    const nodeElements = dataTree.querySelectorAll(":scope > .database-node");

    nodeElements.forEach((nodeElement) => {
      // parseNode returns an object, e.g. { "0": "someValue" }
      const parsedObj = parseNode(nodeElement);

      // Insert these items into our array
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
 * MAIN LISTENER: "downloadFirestore"
 *  - Steps:
 *      1) Find doc ID from the second-to-last .panel-container
 *      2) In the last .panel-container, loop over fs-animate-change-classes
 *         for top-level fields.
 *      3) For each field:
 *         - read type => (map), (array), or leaf => parse accordingly
 *      4) Build a final object { docId: { ...fields } }
 *      5) Download the JSON as "firestore-document.json"
 ***********************************************************/
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action !== "downloadFirestore") {
    return false; // Not the action we're interested in
  }

  try {
    // 1) Find .panels-container in the page
    const panelsContainer = document.querySelector(".panels-container");
    if (!panelsContainer) {
      console.warn("No .panels-container found in the DOM.");
      sendResponse({ status: "error", message: "No .panels-container." });
      return true;
    }

    // 2) panelContainers => we need at least 2
    const panelContainers =
      panelsContainer.querySelectorAll(".panel-container");
    if (panelContainers.length < 2) {
      console.warn("Not enough .panel-container elements. Need at least 2.");
      sendResponse({
        status: "error",
        message: "Not enough .panel-container.",
      });
      return true;
    }

    // The second-to-last panel is for the doc ID; the last one for the field data
    const secondLastPanel = panelContainers[panelContainers.length - 2];
    const lastPanel = panelContainers[panelContainers.length - 1];

    // 3) Extract doc ID from the selected item in the second-to-last panel
    let docId = "UNKNOWN_DOCUMENT_ID";
    const selectedItem = secondLastPanel.querySelector(
      "f7e-panel-list-item.is-selected"
    );
    if (selectedItem) {
      const panelListItem = selectedItem.querySelector(".panel-list-item");
      if (panelListItem) {
        const itemDisplayContainer = panelListItem.querySelector(
          ".item-display-container"
        );
        if (itemDisplayContainer) {
          const button = itemDisplayContainer.querySelector("button");
          if (button) {
            docId = button.textContent.trim();
          }
        }
      }
    }

    // 4) Build the data object from fs-animate-change-classes in the last panel
    const animateElements = lastPanel.querySelectorAll(
      "fs-animate-change-classes"
    );
    if (!animateElements.length) {
      console.warn("No fs-animate-change-classes found in the last panel.");
      sendResponse({ status: "error", message: "No field data found." });
      return true;
    }

    const dataObject = {};

    animateElements.forEach((element) => {
      const keySpan = element.querySelector(".database-key");
      if (!keySpan) return; // skip if no key found

      // The field name
      const fieldKey = keySpan.textContent.trim();

      // The type from .database-type span (e.g. "(map)", "(array)", "(string)", etc.)
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
        // Leaf type
        const leafSpan = element.querySelector(".database-leaf-value");
        dataObject[fieldKey] = leafSpan
          ? parseLeafValue(leafSpan.textContent)
          : null;
      }
    });

    // 5) Final JSON object => { docId: dataObject }
    const finalJson = { [docId]: dataObject };

    // 6) Trigger the download
    const jsonString = JSON.stringify(finalJson, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "firestore-document.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Notify popup of success
    sendResponse({ status: "ok", message: "JSON generated successfully!" });
  } catch (error) {
    console.error("Error generating JSON:", error);
    sendResponse({ status: "error", message: error.message });
  }

  // Indicate we are sending an asynchronous response
  return true;
});
