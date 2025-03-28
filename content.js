const script = document.createElement('script');
script.src = chrome.runtime.getURL('config.js');

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "createFlashcard") {
    const selectedText = request.text;
    
    // Create a modal dialog for entering the flashcard details
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.7);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      font-family: Arial, sans-serif;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background-color: white;
      padding: 20px;
      border-radius: 8px;
      width: 400px;
      max-width: 90%;
      max-height: 90%;
      overflow-y: auto;
    `;
    
    const pageTitle = document.title;
    const pageUrl = window.location.href;
    
    modalContent.innerHTML = `
      <h2 style="margin-top: 0; color: #333;">Create Flashcard</h2>
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: bold;">Front:</label>
        <textarea id="flashcard-front" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; min-height: 60px;">${selectedText}</textarea>
      </div>
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: bold;">Back:</label>
        <textarea id="flashcard-back" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; min-height: 60px;"></textarea>
      </div>
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: bold;">Tags (comma separated):</label>
        <input type="text" id="flashcard-tags" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
      </div>
      <div style="display: flex; justify-content: space-between;">
        <button id="flashcard-cancel" style="padding: 8px 16px; background: #f2f2f2; border: none; border-radius: 4px; cursor: pointer;">Cancel</button>
        <button id="flashcard-save" style="padding: 8px 16px; background: #4285f4; color: white; border: none; border-radius: 4px; cursor: pointer;">Save Flashcard</button>
      </div>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Add event listeners
    document.getElementById('flashcard-cancel').addEventListener('click', () => {
      document.body.removeChild(modal);
    });

    
    document.getElementById('flashcard-save').addEventListener('click', () => {
      const front = document.getElementById('flashcard-front').value.trim();
      const back = document.getElementById('flashcard-back').value.trim();
      const tagsInput = document.getElementById('flashcard-tags').value.trim();
      const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()) : [];
      
      if (front && back) {
        chrome.runtime.sendMessage({
          action: "saveFlashcard",
          front: front,
          back: back,
          source: {
            title: pageTitle,
            url: pageUrl
          },
          tags: tags
        }, (response) => {
          if (response.success) {
            document.body.removeChild(modal);
            
            // Show success notification
            const notification = document.createElement('div');
            notification.style.cssText = `
              position: fixed;
              bottom: 20px;
              right: 20px;
              background-color: #4caf50;
              color: white;
              padding: 12px 20px;
              border-radius: 4px;
              z-index: 10000;
              font-family: Arial, sans-serif;
            `;
            notification.textContent = 'Flashcard saved successfully!';
            document.body.appendChild(notification);
            
            setTimeout(() => {
              document.body.removeChild(notification);
            }, 3000);
          }
        });
      }
    });
  }
});

// Function to extract and return main content using Readability.js
function extractMainContent() {
  try {
    // Clone the document to avoid modifying the original DOM
    const documentClone = document.cloneNode(true);

    // Use Readability.js to parse the content
    const article = new Readability(documentClone).parse();

    if (article && article.textContent) {
      return article.textContent.trim();
    } else {
      return "Failed to extract meaningful content.";
    }
  } catch (error) {
    console.error("Readability.js error:", error);
    return "Error extracting content.";
  }
}

// Function to extract all image URLs from the webpage
function extractImageDetails() {
  const images = document.querySelectorAll('img');
  const imageDetails = Array.from(images).map(img => ({
      src: img.src,
      alt: img.alt || '' // Provide an empty string if alt is not present
  }));
  return imageDetails;
}


async function fetchImageFromURL(imageURL) {
  try {
      const response = await fetch(imageURL);
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      return new Uint8Array(arrayBuffer);
  } catch (error) {
      console.error("Failed to fetch image from URL:", error);
      return null;
  }
}

async function getTextEmbedding(textData) {
  const apiKey = CONFIG.AZURE_COMPUTER_VISION_API_KEY;  // Replace with your Azure Computer Vision API key
  const endpoint = CONFIG.AZURE_COMPUTER_VISION_ENDPOINT; // Replace with your Azure Computer Vision endpoint
  const apiVersion = "2024-02-01"; // Use the appropriate API version
  const modelVersion = "2023-04-15"; // Specify the model version

  const textJSON = {
    text: textData
  };
  
  const url = `${endpoint}/computervision/retrieval:vectorizeText?api-version=${apiVersion}&model-version=${modelVersion}`;
  try {
      const response = await fetch(url, {
          method: "POST",
          headers: {
              "Content-Type": "application/json",
              "Ocp-Apim-Subscription-Key": apiKey
          },
          body: JSON.stringify(textJSON)
      });

      if (!response.ok) {
          throw new Error(`Failed to get text embedding: ${response.status} ${response.statusText}`);
      }
      console.log("📸 Azure Text Response:", response);
      const result = await response.json();
      //console.log("📸 Azure Vision Response:", result);
      return result;
  } catch (error) {
      console.error("Azure Vision API Error:", error);
      return null;
  }
}

async function getImageEmbedding(imageData) {
  const apiKey = CONFIG.AZURE_COMPUTER_VISION_API_KEY;  // Replace with your Azure Computer Vision API key
  const endpoint = CONFIG.AZURE_COMPUTER_VISION_ENDPOINT; // Replace with your Azure Computer Vision endpoint
  const apiVersion = "2024-02-01"; // Use the appropriate API version
  const modelVersion = "2023-04-15"; // Specify the model version

  
  const url = `${endpoint}/computervision/retrieval:vectorizeImage?api-version=${apiVersion}&model-version=${modelVersion}`;
  try {
      const response = await fetch(url, {
          method: "POST",
          headers: {
              "Content-Type": "application/octet-stream",
              "Ocp-Apim-Subscription-Key": apiKey
          },
          body: imageData
      });

      if (!response.ok) {
          throw new Error(`Failed to get image embedding: ${response.status} ${response.statusText}`);
      }
      //console.log("📸 Azure Vision Response:", response);
      const result = await response.json();
      console.log("📸 Azure Vision Response:", result);
      return result;
  } catch (error) {
      console.error("Azure Vision API Error:", error);
      return null;
  }
}

// Compare Image Descriptions With Flashcard Content
function compareEmbeddings(textEmbedding, imageEmbedding) {
  vectorA = textEmbedding;
  vectorB = imageEmbedding;

  console.log("text Embedding type", vectorA);
  console.log("image Embedding type", vectorB);

  if (vectorA.length !== vectorB.length) {
    throw new Error('Vectors must be of the same length');
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
      magnitudeA += vectorA[i] ** 2;
      magnitudeB += vectorB[i] ** 2;
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
  }

  console.log("Compared Embeddings:", dotProduct / (magnitudeA * magnitudeB));

  return dotProduct / (magnitudeA * magnitudeB);
  
  // Simple similarity check: If the image description contains any keywords from the flashcard text
  // const keywords = flashcardText.toLowerCase().split(" ");
  // return imageDescriptions.some(description =>
  //     keywords.some(keyword => description.toLowerCase().includes(keyword))
  // );
}

// Attach Relevant Image to Flashcard
async function attachImageToFlashcard(flashcard, imageEmbeddings) {
  //Get the embedding of the flashcard using Azure Vision API
  textEmbedding = await getTextEmbedding(flashcard.front + " " + flashcard.back);
  // console.log("Image Embedding : ", imageEmbeddings);
  // console.log("Image Embedding Type: ", typeof(imageEmbeddings));
  

  maxSimilarity = 0;
  relevantImage = null;

  for(i=0; i<imageEmbeddings.length; i++) {
    // console.log("Image Embedding: ", imageEmbeddings[i]);
    similarity = compareEmbeddings(textEmbedding.vector, imageEmbeddings[i].embedding);
    if (similarity > maxSimilarity) {
      maxSimilarity = similarity;
      relevantImage = imageEmbeddings[i].url;
    }
  }

  console.log(`✅ Found relevant image for: "${flashcard.front}" --> Image URL: ${relevantImage}`);
  console.log("✅ Final Similiarity:", maxSimilarity);
  return relevantImage;  // Return the first relevant image found

  
  // for (const imageUrl of imageUrls) {
  //     const imageData = await fetchImageFromURL(imageUrl);
  //     console.log("Image Data:", imageData);
  //     if (!imageData) continue;

  //     const embeddingResult = await getImageEmbedding(imageData);
  //     if (!embeddingResult || !embeddingResult.description || !embeddingResult.description.tags) continue;

  //     const isRelevant = compareEmbeddings(flashcard.front, embeddingResult.description.tags);
  //     if (isRelevant) {
  //         console.log(`✅ Found relevant image for: "${flashcard.front}" --> Image URL: ${imageUrl}`);
  //         return imageUrl;  // Return the first relevant image found
  //     }
  // }

  // return null;  // No relevant image found
}

// Listen for the background script message
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.action === "extractContent") {
      const extractedContent = extractMainContent();
      const imageDetails = extractImageDetails();

      const pageTitle = document.title;
      const pageUrl = window.location.href;
      
      console.log("📌 Extracted Content:", extractedContent); // Debugging log
      console.log('Extracted Image URLs:', imageDetails); // Debugging log

     //Added below 17 lines to image embedding
      let imageEmbeddings = [];

      for (const url of imageDetails) {
          const imageData = await fetchImageFromURL(url.src);
          if (imageData) {
            const embeddingResult = await getImageEmbedding(imageData);
            console.log("embeddingResult", embeddingResult);
            if(embeddingResult && embeddingResult.vector) {
              imageEmbeddings.push({
                url: url.src,
                embedding: embeddingResult.vector
                //captions: embeddingResult.description.captions.map(caption => caption.text)
              });
            }
            console.log("✅ Processed Image Embeddings:", imageEmbeddings);
          }
      }

      // Ask user for optional focus context
      const userContext = prompt("What should the flashcards focus on? (Optional, leave blank if none)");
      console.log("📌 User Context:", userContext); // Debugging log

      // ✅ CALL GPT-4o to generate flashcards
      newFlashcards = await generateFlashcardsAzure(extractedContent, userContext);
      console.log("📌 GPT-4o Response:", newFlashcards); // Debugging log

      // 🔍 Ensure flashcards are parsed correctly
      try {
        if (typeof newFlashcards === "string") {
            newFlashcards = JSON.parse(newFlashcards); // Parse if it's a string
        }
      } catch (error) {
          console.error("⚠️ Error parsing GPT response into JSON:", error);
          newFlashcards = []; // Fallback to an empty array if parsing fails
      }

      if (!Array.isArray(newFlashcards)) {
          console.error("⚠️ Flashcards data is not an array! Resetting...");
          newFlashcards = []; // Reset if it's not an array
      }

      // Process images and attach relevant ones to flashcards
      // Loop through each flashcard and try to attach an image if relevant
      for (const card of newFlashcards) {
        const relevantImage = await attachImageToFlashcard(card, imageEmbeddings);
        if (relevantImage) {
            card.back += `\n\n<br/><br/><img src="${relevantImage}" alt="Related Image" />`;   // Attach the relevant image URL to the flashcard
        }
      }

      console.log("🖼️ Flashcards with Images:", newFlashcards); 

      newFlashcards = newFlashcards.map(card => ({
        ...card,
        id: crypto.randomUUID(),
        source: {
          title: pageTitle,
          url: pageUrl
        },
        created: new Date().toISOString(),
        tags: request.tags || [],
        lastReviewed: null
      }));

      chrome.storage.local.get({ flashcards: [] }, (result) => {
        let existingFlashcards = result.flashcards;
        // Proceed with adding new flashcards
        let updatedFlashcards = existingFlashcards.concat(newFlashcards);

        chrome.storage.local.set({ flashcards: updatedFlashcards }, () => {
          console.log("✅ Flashcards saved to storage!");
        })
      });

      //✅ Save flashcards to Chrome Storage
      

      // flashcards.forEach(card => {
      //   chrome.runtime.sendMessage({
      //     action: "saveFlashcard",
      //     front: card.front,
      //     back: card.back,
      //     source: {
      //       title: pageTitle,
      //       url: pageUrl
      //     },
      //   })
      // });

      // ✅ Store the generated flashcards in a proper format
      //flashcards = JSON.parse(flashcards);
      // chrome.storage.local.set({ flashcards: JSON.stringify(flashcards) }, () => {
      //     console.log("✅ Flashcards successfully saved to storage!");
      // });

      // ✅ Send message to refresh popup if it's open
      // chrome.runtime.sendMessage({ 
      //   action: "saveFlashcards", 
      //   flashcards: flashcards  // ✅ Send the generated flashcards array
      // });
    

      alert("Flashcards generated and saved!");
  }
});


async function generateFlashcardsAzure(text, userContext) {
  const apiKey = CONFIG.AZURE_OPENAI_API_KEY;
  const endpoint = CONFIG.AZURE_OPENAI_ENDPOINT;

  let prompt = `Please generate flashcards in a Q&A format from the following text. 
  Each flashcard should focus on a single concept, with the question on the front 
  and the answer on the back. Extract only the essential information from the given webpage 
  and generate concise, high-quality flashcards for learning.
  Input: You will receive raw webpage content, which may include navigation menus, footnotes, 
  and references.
  
  Generate flashcards in JSON format with a "front" (question) and "back" (answer).
 Ensure the output follows this structure:
  [
    { "front": "Question here", "back": "Answer here" },
    { "front": "Another question", "back": "Another answer" }
  ]

  `;

  if (userContext) {
      prompt += ` Extract only the most relevant flashcards from the following webpage content: ${userContext}.`;
  }
  prompt += `\n\nContent:\n${text}`;

  try {
      const response = await fetch(endpoint, {
          method: "POST",
          headers: {
              "Content-Type": "application/json",
              "api-key": apiKey
          },
          body: JSON.stringify({
              model: "gpt-4o",
              messages: [{ role: "user", content: prompt }],
              temperature: 0.01
          })
      });

      if (!response.ok) {
          throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const flashcards = data.choices[0]?.message?.content?.trim() || "No flashcards generated.";

      //const pageTitle = document.title;
      //const pageUrl = window.location.href;

      // flashcards = flashcards.map(card => ({
      //   ...card,
      //   id: crypto.randomUUID()
      // }));
      // //✅ Save flashcards to Chrome Storage
      // chrome.storage.local.set({ flashcards: flashcards }, () => {
      //     console.log("✅ Flashcards saved to storage!");
      // });

      return flashcards;
  } catch (error) {
      console.error("Azure OpenAI Error:", error);
      return "Error generating flashcards.";
  }
}


