// Function to highlight a word within a text node
function highlightWord(textNode, word, color) { 
    // Escaping special regex characters in the word string for safety.
    const escapedWord = word.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    // Match whole word, global, case-insensitive.
    const regex = new RegExp(`\\b(${escapedWord})\\b`, 'gi'); 
    const matches = textNode.nodeValue.match(regex);
    
    if (matches) {
        const parts = textNode.nodeValue.split(regex);
        const fragment = document.createDocumentFragment();

        parts.forEach((part, index) => {
            if (index % 2 === 0) {
                fragment.appendChild(document.createTextNode(part));
            } else {
                const span = document.createElement('span');
                span.className = 'vocab-highlight'; // Class for removal
                span.style.backgroundColor = color; 
                span.style.fontWeight = 'bold';
                
                // Add click listener for dictionary lookup
                span.style.cursor = 'pointer'; 
                span.onclick = function() {
                    const lookupWord = this.textContent.trim();
                    const dictionaryUrl = `https://www.google.com/search?q=define+${encodeURIComponent(lookupWord)}`;
                    window.open(dictionaryUrl, '_blank');
                };
                
                span.textContent = part;
                fragment.appendChild(span);
            }
        });
        textNode.parentNode.replaceChild(fragment, textNode);
    }
}

// Function to traverse the DOM and apply highlighting
function traverseAndHighlight(element, wordsArray, color) { 
    if (element.nodeType !== 1 || 
        ['SCRIPT', 'STYLE', 'IFRAME', 'NOSCRIPT', 'HEAD'].includes(element.tagName) ||
        element.classList.contains('vocab-highlight')) {
        return;
    }
    
    Array.from(element.childNodes).forEach(node => {
        if (node.nodeType === 3) { 
            wordsArray.forEach(word => {
                highlightWord(node, word, color); 
            });
        } else if (node.nodeType === 1) { 
            traverseAndHighlight(node, wordsArray, color); 
        }
    });
}

// Function to remove all highlights from the page
function removeHighlighting() {
    const highlights = document.querySelectorAll('.vocab-highlight');
    highlights.forEach(span => {
        span.parentNode.replaceChild(document.createTextNode(span.textContent), span);
    });
}

// Function to retrieve words and start highlighting
function applyHighlighting() {
    // Retrieve notes AND highlightColor from storage
    chrome.storage.sync.get({'quickNotes': [], 'highlightColor': '#FFFF00'}, function(data) {
        const notes = data.quickNotes;
        const color = data.highlightColor;
        
        if (!notes || notes.length === 0) return;

        // Flatten the notes (sentences) into a single array of unique, cleaned words
        const wordsArray = notes
            .map(note => note.text)
            .flatMap(text => text.split(/\s+|,|\n/)) // Split by space/comma/newline
            .map(word => word.trim().toLowerCase())
            .filter(word => word.length > 2); 

        // Optional: Remove duplicates, as highlighting the same word multiple times is redundant
        const uniqueWords = [...new Set(wordsArray)];


        if (uniqueWords.length > 0) {
            removeHighlighting();
            traverseAndHighlight(document.body, uniqueWords, color);
        }
    });
}

// Initial automatic highlighting on page load
applyHighlighting(); 

// Listener for messages from popup.js (for Apply and Remove clicks)
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "highlight") {
        applyHighlighting(); 
    } else if (request.action === "remove") {
        removeHighlighting();
    }
});