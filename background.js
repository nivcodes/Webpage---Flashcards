/*
  Chrome Extension: Flashcard Creator
  -----------------------------------
  This script sets up a context menu in Google Chrome that allows users to create flashcards from highlighted text.
  - When the extension is installed, a context menu option "Create flashcard from selection" is added.
  - Clicking this menu item sends the selected text to a content script for processing.
  - The content script processes the request and sends the flashcard data back to be stored in Chrome's synchronized storage.
  - The stored flashcards include metadata like ID, creation date, source, and tags.
*/

// Background script for WebFlash - Flashcard Creator

chrome.runtime.onInstalled.addListener(() => {
  console.log("🚀 Background script loaded");

  // Context menu for creating flashcards from highlighted text
  chrome.contextMenus.create({
    id: "createFlashcard",
    title: "Create flashcard from selection",
    contexts: ["selection"]
  });

  // Context menu for capturing entire page content
  chrome.contextMenus.create({
    id: "capturePageContent",
    title: "Create flashcards from this page",
    contexts: ["page"]
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  console.log("📢 Context menu clicked:", info.menuItemId);

  if (info.menuItemId === "createFlashcard") {
    console.log("Creating flashcard from selection:", info.selectionText);
    chrome.tabs.sendMessage(tab.id, {
      action: "createFlashcard",
      text: info.selectionText
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("❌ Error sending message to content script:", chrome.runtime.lastError);
      } else {
        console.log("✅ Response from content script:", response);
      }
    });
  } else if (info.menuItemId === "capturePageContent") {
    console.log("🔍 Extracting full page content...");
    chrome.tabs.sendMessage(tab.id, { action: "extractContent" });
  }
});

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("📩 Message received:", request.action);

  if (request.action === "saveFlashcard") {
    console.log("📚 Saving flashcard:", request.front);
    console.log("🔙 Flashcard back:", request.back);
    console.log("ℹ️ Received source:", request.source);
    
    chrome.storage.local.get("flashcards", (data) => {
      const flashcards = typeof data.flashcards === "string" ? JSON.parse(data.flashcards) : data.flashcards || [];
      console.log("📇 All flashcards before push:", flashcards);
      //const flashcards = JSON.parse(data.flashcards) || [];
      flashcards.push({
        id: Date.now() + Math.random(),
        front: request.front,
        back: request.back,
        source: request.source || null,
        created: new Date().toISOString(),
        tags: request.tags || [],
        lastReviewed: null
      });

      console.log("📇 All flashcards after push:", flashcards);

      chrome.storage.local.set({ flashcards: flashcards }, () => {
        console.log("✅ Flashcard saved:", flashcards[flashcards.length - 1]);
        
        sendResponse({ success: true });
      });
    });
    return true; // Required for async response
  }

  // if (request.action === "saveFlashcards") {
  //   console.log("📚 Saving multiple flashcards...");

  //   if (!Array.isArray(request.flashcards)) {
  //     console.error("⚠️ Expected an array but got:", request.flashcards);
  //     sendResponse({ success: false, error: "Invalid flashcards format" });
  //     return;
  //   }

  //   chrome.storage.local.get("flashcards", (data) => {
  //     let flashcards = data.flashcards || [];
  //     console.log("Flashcards:", flashcards);

  //     request.flashcards.forEach(card => {
  //       flashcards.push({
  //         id: Date.now(),
  //         front: card.front,
  //         back: card.back,
  //         source: card.source || null,
  //         created: new Date().toISOString(),
  //         tags: card.tags || [],
  //         lastReviewed: null
  //       });
  //     });

  //     chrome.storage.local.set({ flashcards }, () => {
  //       console.log(`✅ ${request.flashcards.length} flashcards saved!`);
  //       sendResponse({ success: true });
  //     });
  //   });

  //   return true; // Required for async response
  // }
});
