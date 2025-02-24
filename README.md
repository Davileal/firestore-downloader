# Firestore JSON Downloader

A simple **Chrome extension** that lets you **download a currently selected Firestore document** (from the Firebase console) as a JSON file directly in your browser. This project is **open-source** and aims to provide a quick way to export Firestore data **without** needing to switch to the Firebase Admin SDK or write custom scripts.

## Table of Contents

- [Motivation](#motivation)
- [Features](#features)
- [How It Works](#how-it-works)
- [Installation](#installation)
- [Usage](#usage)
- [How to Contribute](#how-to-contribute)
- [License](#license)

---

## Motivation

1. **Convenience**: Manually copying and pasting field data from the Firebase console into a JSON file can be error-prone. This extension automates the process.
2. **Speed**: Instantly get a JSON file of the document you’re viewing in the console.
3. **Learning**: This project also serves as an example of using **Chrome extensions** to interact with web page elements and export data.

---

## Features

- **Single-click download** of the currently selected Firestore document in JSON format.
- Handles **nested Maps** as JavaScript objects.
- Handles **Arrays** as JavaScript arrays.
- Converts field types:
  - `(map)` → object
  - `(array)` → array
  - `(boolean)` → boolean
  - `(number)` → number
  - Everything else → string (including `(string)` and `(geopoint)`)
- Preserves the document ID at the top level of the exported JSON.

---

## How It Works

1. The extension inserts a **content script** into the Firebase console page (`https://console.firebase.google.com/`).
2. When you click “Download JSON” in the extension’s popup:
   - The content script scrapes the DOM elements that represent the selected Firestore document.
   - It detects the document ID from the **second-to-last** panel (where document IDs are listed).
   - It extracts all field data from the **last** panel (where the document’s fields are shown).
   - Nested Maps and Arrays are parsed by checking specific CSS classes and attributes in the console’s DOM.
3. A JSON file is generated and automatically downloaded to your computer.

---

## Installation

1. Clone or download this repository.
2. In Google Chrome, open the **Extensions** page (`chrome://extensions`) and switch on **Developer Mode** (top-right corner).
3. Click **Load unpacked** and select the folder where you saved/cloned this repository.
4. The **Firestore JSON Downloader** extension icon should now appear in your toolbar.

---

## Usage

1. Visit the [Firebase Console](https://console.firebase.google.com/) and navigate to your Firestore Database.
2. Select a **document** so that its fields are visible on the right side of the page.
3. Click the **Firestore JSON Downloader** extension icon in your browser toolbar.
4. In the popup, click **Download JSON**.
5. A `firestore-document.json` file should be downloaded, containing the ID and fields of the selected document.

---

## How to Contribute

1. **Fork** this repository.
2. Create a **new branch** for your feature or fix.
3. **Commit** your changes with a clear message describing what you did.
4. **Push** to your forked repository.
5. Submit a **pull request** to this repository’s `main` branch.

Feel free to open **issues** for bugs or feature requests. We welcome contributions from the community!

---

## License

This project is released under the [MIT License](LICENSE). You’re free to **use, modify, and distribute** it under the terms of the MIT License.

---

> **Disclaimer**: The Firestore console’s DOM structure might change over time. If the extension breaks due to console updates, please open an issue or submit a pull request with a fix.
