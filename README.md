## 📚 Webpage to Flashcards - Edge/Chrome Extension

Create high-quality flashcards from webpages (especially Wikipedia), now enhanced with Azure AI image analysis for better learning!

## 💡 What is this?

This Chrome/Edge extension allows you to extract text and images from Wikipedia pages and convert them into flashcards using Azure OpenAI and Azure Vision services. Flashcards can then be exported to CSV/JSON for import into apps like Anki!

## 🌟 Features
1. Converts Wikipedia content into Q&A flashcards.
2. Utilizes Azure OpenAI for text generation.
3. Uses Azure Vision for image embedding and relevance detection.
4. Exports to JSON and CSV for Anki import.

# 🔧 Setup Instructions

## 1. 📂 Download & Extract Files

Download the project zip file and extract it to a folder on your computer.

## 2. 🔑 Create Azure API Keys

You’ll need API keys for both Azure OpenAI and Azure Computer Vision. Here’s how to get them:

### Azure OpenAI

1. Log into your Azure portal (https://portal.azure.com/).
2. Go to Create a resource > AI + Machine Learning > OpenAI.
3. Set up a new deployment and choose gpt-4 as the model.
4. Copy your API key and endpoint.

### Azure Computer Vision

1. Go to Create a resource > AI + Machine Learning > Computer Vision.
2. Create a new instance and copy the API key and endpoint.

## 3. 🔐 Add API Keys & Endpoints to config.js

Modify config.js and replace the items in quotes with your actual API Keys and endpoints.


## 4. 🔍 Load Extension in Chrome/Edge

1. Open Chrome or Edge.
2. Go to chrome://extensions/ or edge://extensions/ (or click the 3 dots on the top right of the browser and then select Extensions->Manage Extensions)
3. Enable Developer mode (top right corner).
4. Click Load unpacked and select the folder where you extracted the project files.

## 5. 💡 Usage

To use Webpage->Flashcards, first visit a webpage (Wikipedia is highly recommended!). Once on the webpage, there are 2 ways to generate flashcards.

### 1. Create flashcards from all webpage content

1. Right click on a webpage and select "Create flashcards from this page"
2. After a few seconds, a popup will appear asking for context. In this, you can specify what you want the content to be about. It's also recommended to specify the number of flashcards you are looking for in a single sentence such as "Generate 30 flashcards." Context generally works best as a few short sentences describing the desired content.


<img width="453" alt="image" src="https://github.com/user-attachments/assets/bcb1fccd-90e3-477f-ad51-918d5c3e97f4" />

3. A popup will appear stating the flashcards are generated!
4. Then you can see them in the extension popup, study them, or export them to CSV/JSON!

Happy flashcarding! 🗂️

# 🚀 What's Next

- Adding support for organizing flashcards into sets.
- Improving the UI for easier flashcard creation.
- Enjoy creating flashcards on your favorite topics! 😊
