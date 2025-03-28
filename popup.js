document.addEventListener('DOMContentLoaded', function() {
  const app = document.getElementById('app');
  
  // App state
  let state = {
    activeTab: 'cards', // 'cards', 'create', 'study', 'settings'
    flashcards: [],
    filteredCards: [],
    searchTerm: '',
    studyMode: false,
    currentCardIndex: 0,
    showBack: false,
    filter: 'all', // 'all', 'tagged', 'untagged'
    selectedTags: [],
    availableTags: []
  };
  
  // Initial load
  loadFlashcards();
  
  function loadFlashcards() {
    chrome.storage.local.get("flashcards", (data) => {
        console.log("🔍 Retrieved flashcards from storage:", data); // Debugging log
        state.flashcards = data.flashcards;

        if (!Array.isArray(state.flashcards)) {
          state.flashcards = [];
        }

        state.filteredCards = [...state.flashcards];

        // Extract all available tags
        const allTags = new Set();
        state.flashcards.forEach(card => {
            if (card.tags && card.tags.length) {
                card.tags.forEach(tag => allTags.add(tag));
            }
        });
        state.availableTags = Array.from(allTags);

        console.log("✅ Processed flashcards state:", state.flashcards); // Confirm final state
        render();
    });
}

  
function saveFlashcards(callback) {
  console.log("💾 Saving flashcards:", state.flashcards); // Debugging log
  chrome.storage.local.set({ flashcards: state.flashcards }, () => {
      console.log("✅ Flashcards saved!");
      if (callback) callback();
  });
}

  
  function exportFlashcards(format) {
    let content;
    const filename = `webflash-export-${new Date().toISOString().split('T')[0]}`;
    
    if (format === 'json') {
      content = JSON.stringify(state.flashcards, null, 2);
      downloadFile(`${filename}.json`, content, 'application/json');
    } else if (format === 'csv') {
      // Create CSV header
      content = 'id,front,back,created,lastReviewed,tags,sourceTitle,sourceUrl\n';
      
      // Add each flashcard as a row
      state.flashcards.forEach(card => {
        const row = [
          card.id,
          `"${card.front.replace(/"/g, '""')}"`,
          `"${card.back.replace(/"/g, '""')}"`,
          card.created,
          card.lastReviewed || '',
          `"${(card.tags || []).join(',')}"`,
          `"${card.source?.title || ''}"`,
          `"${card.source?.url || ''}"`
        ];
        content += row.join(',') + '\n';
      });
      
      downloadFile(`${filename}.csv`, content, 'text/csv');
    }
  }
  
  function downloadFile(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  
  function addFlashcard(front, back, tags) {
    const newCard = {
      id: Date.now(),
      front,
      back,
      created: new Date().toISOString(),
      lastReviewed: null,
      tags: tags || []
    };
    
    state.flashcards.push(newCard);
    saveFlashcards(() => {
      loadFlashcards(); // Reload all cards
      state.activeTab = 'cards'; // Switch back to cards view
    });
  }
  
  function deleteFlashcard(id) {
    console.log("🔍 Deleting flashcard with ID:", id, "Type of ID:", typeof id);
    console.log("Before Deletion - Flashcards:", state.flashcards);

    if (confirm('Are you sure you want to delete this flashcard?')) {
      console.log("🗑️ Deleting flashcard with ID:", id);

        chrome.storage.local.get("flashcards", (data) => {
            let flashcards = data.flashcards || [];
            
            // Filter out the flashcard with the given ID
            flashcards = flashcards.filter(card => String(card.id) !== String(id));
            
            // Save the modified flashcards array back to storage
            chrome.storage.local.set({ flashcards }, () => {
                console.log("✅ Flashcard deleted and changes saved to storage.");
                loadFlashcards();  // Reload the updated list
            });
        });
      }
      // state.flashcards = state.flashcards.filter(card => card.id !== id);
      // console.log("New flashcards: ", state.flashcards);
      const newFlashcards = state.flashcards.filter(card => {
        console.log("Comparing:", card.id, "with", id, "| Match:", card.id === id);
        return String(card.id) !== String(id);
      });

      console.log("After Deletion - Flashcards:", newFlashcards);

    //   saveFlashcards(() => {
    //     loadFlashcards();
    //   });
    // }
  }
  
  function filterCards() {
    let filtered = [...state.flashcards];
    
    // Filter by search term
    if (state.searchTerm) {
      const term = state.searchTerm.toLowerCase();
      filtered = filtered.filter(card => 
        card.front.toLowerCase().includes(term) || 
        card.back.toLowerCase().includes(term)
      );
    }
    
    // Filter by tag selection
    if (state.filter === 'tagged' && state.selectedTags.length > 0) {
      filtered = filtered.filter(card => 
        card.tags && state.selectedTags.some(tag => card.tags.includes(tag))
      );
    } else if (state.filter === 'untagged') {
      filtered = filtered.filter(card => 
        !card.tags || card.tags.length === 0
      );
    }
    
    state.filteredCards = filtered;
    render();
  }
  
  function startStudyMode() {
    if (state.filteredCards.length === 0) return;
    
    state.studyMode = true;
    state.currentCardIndex = 0;
    state.showBack = false;
    render();
  }
  
  function nextCard() {
    if (state.currentCardIndex < state.filteredCards.length - 1) {
      state.currentCardIndex++;
      state.showBack = false;
    } else {
      // End of deck
      state.studyMode = false;
    }
    render();
  }
  
  function markAsReviewed() {
    const currentCard = state.filteredCards[state.currentCardIndex];
    const cardIndex = state.flashcards.findIndex(card => card.id === currentCard.id);
    if (cardIndex !== -1) {
      state.flashcards[cardIndex].lastReviewed = new Date().toISOString();
      saveFlashcards();
    }
    nextCard();
  }
  
  function render() {
    let html = `<div class="container">`;
    
    // Header
    html += `
      <div class="header">
        <h1>WebFlash Flashcards</h1>
        <div>
          <button class="button secondary" id="export-button">
            Export
          </button>
        </div>
      </div>
    `;
    
    // Tabs
    if (!state.studyMode) {
      html += `
        <div class="tab-container">
          <div class="tabs">
            <div class="tab ${state.activeTab === 'cards' ? 'active' : ''}" id="cards-tab" data-tab="cards">
              Cards${state.flashcards.length ? ` (${state.flashcards.length})` : ''}
            </div>
            <div class="tab ${state.activeTab === 'create' ? 'active' : ''}" id="create-new-tab" data-tab="create">
              Create New
            </div>
          </div>
        </div>
      `;
    }
    
    // Content based on active tab
    if (state.studyMode) {
      html += renderStudyMode();
    } else if (state.activeTab === 'cards') {
      html += renderCardsList();
    } else if (state.activeTab === 'create') {
      html += renderCreateForm();
    }
    
    html += `</div>`;
    
    // Render to DOM
    app.innerHTML = html;
    
    // Add event handlers after rendering
    attachEventHandlers();
  }
  
  function renderCardsList() {
    let html = '';
    
    // Search and filter controls
    html += `
      <div class="actions">
        <input 
          type="text" 
          class="form-control" 
          placeholder="Search cards..." 
          id="search-input" 
          value="${state.searchTerm}"
        >
        <button class="button" id="study-button">Study</button>
      </div>
    `;
    
    // Tag filter (if we have tags)
    if (state.availableTags.length > 0) {
      html += `
        <div class="form-group">
          <select class="form-control" id="tag-filter">
            <option value="all" ${state.filter === 'all' ? 'selected' : ''}>All Cards</option>
            <option value="tagged" ${state.filter === 'tagged' ? 'selected' : ''}>Filter by tags</option>
            <option value="untagged" ${state.filter === 'untagged' ? 'selected' : ''}>Untagged only</option>
          </select>
        </div>
      `;
      
      if (state.filter === 'tagged') {
        html += `
          <div class="form-group">
            <select class="form-control" id="tag-select" multiple>
              ${state.availableTags.map(tag => `
                <option value="${tag}" ${state.selectedTags.includes(tag) ? 'selected' : ''}>${tag}</option>
              `).join('')}
            </select>
          </div>
        `;
      }
    }
    
    // Cards list
    html += `<div class="card-list">`;
    
    if (state.filteredCards.length === 0) {
      html += `
        <div class="empty-state">
          <div class="empty-state-icon">📚</div>
          <p>No flashcards found</p>
          <button class="button" id="create-first-flashcard-button">Create your first flashcard</button>
        </div>
      `;
    } else {
      state.filteredCards.forEach(card => {
        html += `
          <div class="card" data-id="${card.id}">
            <div class="card-header">
              <small>${new Date(card.created).toLocaleDateString()}</small>
              <button class="button secondary delete-button" data-id="${card.id}">Delete</button>
            </div>
            <div class="card-content" data-id="${card.id}">
              <div class="card-front">${card.front}</div>
              <div class="card-back" id="back-${card.id}">${card.back}</div>
              
              ${card.source ? `
                <div class="card-source">
                  Source: <a href="${card.source.url}" target="_blank">${card.source.title}</a>
                </div>
              ` : ''}
              
              ${card.tags && card.tags.length ? `
                <div class="card-tags">
                  ${card.tags.map(tag => `<span class="card-tag">${tag}</span>`).join('')}
                </div>
              ` : ''}
            </div>
          </div>
        `;
      });
    }
    
    html += `</div>`;
    return html;
  }
  
  function renderCreateForm() {
    return `
      <form id="create-form">
        <div class="form-group">
          <label for="front-input">Front:</label>
          <textarea class="form-control" id="front-input" required></textarea>
        </div>
        <div class="form-group">
          <label for="back-input">Back:</label>
          <textarea class="form-control" id="back-input" required></textarea>
        </div>
        <div class="form-group">
          <label for="tags-input">Tags (comma separated):</label>
          <input type="text" class="form-control" id="tags-input">
        </div>
        <div class="actions">
          <button type="button" class="button secondary" id="cancel-create-button">Cancel</button>
          <button type="submit" class="button">Save Flashcard</button>
        </div>
      </form>
    `;
  }
  
  function renderStudyMode() {
    const currentCard = state.filteredCards[state.currentCardIndex];
    return `
      <div>
        <div class="card">
          <div class="card-front">${currentCard.front}</div>
          <button class="button secondary" id="toggle-study-card-back-button" style="width: 100%; margin: 10px 0;">
            ${state.showBack ? 'Hide Answer' : 'Show Answer'}
          </button>
          ${state.showBack ? `
            <div class="card-back visible">${currentCard.back}</div>
          ` : ''}
        </div>
        
        <div style="display: flex; justify-content: space-between; margin-top: 16px;">
          <button class="button secondary" id="exit-study-mode-button">Exit</button>
          <div>
            <span>${state.currentCardIndex + 1} of ${state.filteredCards.length}</span>
          </div>
          <button class="button" id="next-card-button" ${state.showBack ? '' : 'disabled'}>
            Next Card
          </button>
        </div>
      </div>
    `;
  }
  
  function attachEventHandlers() {
    // Create form
    const createForm = document.getElementById('create-form');
    if (createForm) {
      createForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const front = document.getElementById('front-input').value.trim();
        const back = document.getElementById('back-input').value.trim();
        const tagsInput = document.getElementById('tags-input').value.trim();
        const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()) : [];
        
        if (front && back) {
          addFlashcard(front, back, tags);
        }
      });
    }
    
    // Search input
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        state.searchTerm = e.target.value;
        filterCards();
      });
    }
    
    // Tag filter
    const tagFilter = document.getElementById('tag-filter');
    if (tagFilter) {
      tagFilter.addEventListener('change', (e) => {
        state.filter = e.target.value;
        filterCards();
      });
    }
    
    // Tag select
    const tagSelect = document.getElementById('tag-select');
    if (tagSelect) {
      tagSelect.addEventListener('change', (e) => {
        state.selectedTags = Array.from(e.target.selectedOptions).map(option => option.value);
        filterCards();
      });
    }
    
    // Export button
    const exportButton = document.getElementById('export-button');
    if (exportButton) {
      exportButton.addEventListener('click', exportMenu);
    }
    
    // Study button
    const studyButton = document.getElementById('study-button');
    if (studyButton) {
      studyButton.addEventListener('click', startStudyMode);
    }
    
    // Create first flashcard button
    const createFirstFlashcardButton = document.getElementById('create-first-flashcard-button');
    if (createFirstFlashcardButton) {
      createFirstFlashcardButton.addEventListener('click', () => setActiveTab('create'));
    }

    // Create new tab
    const createNewTab = document.getElementById('create-new-tab');
    if (createNewTab) {
      createNewTab.addEventListener('click', () => setActiveTab('create'));
    }

     // Cards tab
     const cardsTab = document.getElementById('cards-tab');
     if (cardsTab) {
       cardsTab.addEventListener('click', () => setActiveTab('cards'));
     }
     
    
    // Cancel create button
    const cancelCreateButton = document.getElementById('cancel-create-button');
    if (cancelCreateButton) {
      cancelCreateButton.addEventListener('click', () => setActiveTab('cards'));
    }
    
    // Toggle study card back button
    const toggleStudyCardBackButton = document.getElementById('toggle-study-card-back-button');
    if (toggleStudyCardBackButton) {
      toggleStudyCardBackButton.addEventListener('click', toggleStudyCardBack);
    }
    
    // Exit study mode button
    const exitStudyModeButton = document.getElementById('exit-study-mode-button');
    if (exitStudyModeButton) {
      exitStudyModeButton.addEventListener('click', exitStudyMode);
    }
    
    // Next card button
    const nextCardButton = document.getElementById('next-card-button');
    if (nextCardButton) {
      nextCardButton.addEventListener('click', markReviewed);
    }
    
    // Delete buttons
    const deleteButtons = document.querySelectorAll('.delete-button');
    deleteButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        deleteFlashcard(id);
      });
    });
    
    // Card content click (toggle back)
    const cardContents = document.querySelectorAll('.card-content');
    cardContents.forEach(content => {
      content.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        toggleCardBack(id);
      });
    });
  }
  
  // Expose functions to window for onclick handlers
  window.setActiveTab = function(tab) {
    state.activeTab = tab;
    render();
  };
  
  window.toggleCardBack = function(id) {
    const backEl = document.getElementById(`back-${id}`);
    if (backEl) {
      backEl.classList.toggle('visible');
    }
  };
  
  window.deleteCard = function(id) {
    deleteFlashcard(id);
  };
  
  window.startStudyMode = function() {
    startStudyMode();
  };
  
  window.exitStudyMode = function() {
    state.studyMode = false;
    render();
  };
  
  window.toggleStudyCardBack = function() {
    state.showBack = !state.showBack;
    render();
  };
  
  window.markReviewed = function() {
    markAsReviewed();
  };
  
  window.exportMenu = function () {
    const exportContainer = document.createElement('div');
    exportContainer.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      padding: 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 100;
    `;
  
    exportContainer.innerHTML = `
      <h3 style="margin-top: 0;">Export Flashcards</h3>
      <div class="form-group">
        <label>Export Format:</label>
        <div style="display: flex; gap: 8px; margin-top: 8px;">
          <button class="button" id="export-json">JSON</button>
          <button class="button" id="export-csv">CSV</button>
        </div>
      </div>
      <button class="button secondary" id="close-export-menu">Cancel</button>
    `;
  
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      z-index: 99;
    `;
  
    // Append modal to container
    document.body.appendChild(overlay);
    document.body.appendChild(exportContainer);
  
    // Attach event listeners AFTER inserting buttons into the DOM
    document.getElementById('export-json').addEventListener('click', function () {
      exportFlashcards('json');
      closeExportMenu();
    });
  
    document.getElementById('export-csv').addEventListener('click', function () {
      exportFlashcards('csv');
      closeExportMenu();
    });
  
    document.getElementById('close-export-menu').addEventListener('click', closeExportMenu);
    overlay.addEventListener('click', closeExportMenu);
  };
  
  // Close the export modal
  window.closeExportMenu = function () {
    const exportContainer = document.querySelector('div[style*="position: absolute"]');
    const overlay = document.querySelector('div[style*="background: rgba"]');
    
    if (exportContainer) document.body.removeChild(exportContainer);
    if (overlay) document.body.removeChild(overlay);
  };
  
  
  window.exportAs = function(format) {
    exportFlashcards(format);
    window.closeExportMenu();
  };
});
