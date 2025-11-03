// --- MOTIVATIONAL THOUGHTS DATA ---
const motivationalQuotes = [
    "The best way to predict the future is to create it.",
    "The journey of a thousand miles begins with a single step.",
    "Write it down. Make it happen.",
    "Start where you are. Use what you have. Do what you can.",
    "The only way to do great work is to love what you do.",
    "Don't watch the clock; do what it does. Keep going.",
    "Productivity is never an accident. It is always the result of a commitment to excellence.",
    "If you are persistent, you will get it. If you are consistent, you will keep it."
];

function displayMotivationalThought() {
    const quoteElement = document.getElementById('motivational-thought');
    const randomIndex = Math.floor(Math.random() * motivationalQuotes.length);
    quoteElement.textContent = `"${motivationalQuotes[randomIndex]}"`;
}

function getRandomLightColor() {
    const h = Math.floor(Math.random() * 360);
    return `hsl(${h}, 70%, 90%)`; 
}

// --- Storage Handlers ---
// Retrieves both notes and highlight color from storage
function getNotes(callback) {
    chrome.storage.sync.get({'quickNotes': [], 'highlightColor': '#FFFF00'}, callback);
}

// Saves the updated notes array
function saveNotes(notesArray, callback) {
    chrome.storage.sync.set({'quickNotes': notesArray}, callback);
}

// --- Core Logic Functions ---

// Handles saving a new note to storage
function saveNote() {
    const noteInput = document.getElementById('note-input');
    const newNoteText = noteInput.value.trim();

    if (newNoteText) {
        const now = new Date();
        
        const newNote = {
            id: Date.now(),
            text: newNoteText,
            color: getRandomLightColor(),
            timestamp: now.toLocaleString() 
        };
        
        // Asynchronously get existing notes, add new note, then save
        chrome.storage.sync.get('quickNotes', function(data) {
            const notes = data.quickNotes || []; 
            notes.unshift(newNote); 

            chrome.storage.sync.set({'quickNotes': notes}, function() {
                noteInput.value = ''; 
                loadNotes(); 
                // Trigger highlighting on the page immediately after saving a new note
                executeHighlightAction('highlight');
            });
        });
    }
}

// Handles deleting a note from storage
function deleteNote(e) {
    const noteIdToDelete = parseInt(e.target.dataset.id); 
    
    if (confirm('Are you sure you want to delete this note?')) {
        chrome.storage.sync.get('quickNotes', function(data) {
            let notes = data.quickNotes || [];
            const updatedNotes = notes.filter(note => note.id !== noteIdToDelete);
            
            chrome.storage.sync.set({'quickNotes': updatedNotes}, function() {
                loadNotes(); 
                // Re-apply highlights after deleting a note
                executeHighlightAction('highlight');
            });
        });
    }
}

// Sets up the Intersection Observer for the note 'float-in' animation
function setupIntersectionObserver(notesListItems) {
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('note-visible');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1 
    });

    notesListItems.forEach(item => {
        observer.observe(item);
    });
}

// Function to handle highlighting logic on the webpage
function executeHighlightAction(actionType) {
    const color = document.getElementById('highlight-color').value;
    
    // Save the color (essential, as content.js retrieves this immediately)
    chrome.storage.sync.set({'highlightColor': color}, () => {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs.length > 0) {
                const tab = tabs[0];
                if (tab.url.startsWith('http') || tab.url.startsWith('https')) {
                    // Execute content.js (ensuring it's loaded in the tab)
                    chrome.scripting.executeScript({
                        target: {tabId: tab.id},
                        files: ['content.js']
                    }, () => {
                        if (chrome.runtime.lastError) {
                            console.error("Script execution failed:", chrome.runtime.lastError.message);
                            return;
                        }
                        // Send message to trigger the specific action in content.js
                        chrome.tabs.sendMessage(tab.id, {action: actionType});
                    });
                } else {
                    // Alert when trying to highlight a restricted page
                    alert(`Cannot perform this action on a restricted page.`);
                }
            }
        });
    });
}

// Loads notes and color, displays them, and sets up click handlers
function loadNotes() {
    getNotes(data => {
        const notes = data.quickNotes;
        const color = data.highlightColor;
        
        document.getElementById('highlight-color').value = color; // Load saved color
        
        const notesList = document.getElementById('notes-list');
        notesList.innerHTML = ''; 
        
        if (notes.length === 0) {
            notesList.innerHTML = '<li class="empty-note">No notes saved yet.</li>';
            return;
        }

        const newNoteElements = [];

        notes.forEach(note => {
            const listItem = document.createElement('li');
            listItem.classList.add('note-hidden'); 

            const contentWrapper = document.createElement('div');
            contentWrapper.className = 'note-content-wrapper';

            // Note Text (Dictionary Lookup Feature)
            const noteText = document.createElement('span');
            noteText.className = 'note-text clickable-note';
            noteText.textContent = note.text;
            noteText.style.backgroundColor = note.color; 
            noteText.style.cursor = 'pointer'; 
            
            noteText.onclick = function() {
                const lookupText = this.textContent.trim();
                // Opens a Google search for the definition of the note text
                const dictionaryUrl = `https://www.google.com/search?q=define+${encodeURIComponent(lookupText)}`;
                window.open(dictionaryUrl, '_blank');
            };
            
            // Timestamp and Delete Button
            const noteTimestamp = document.createElement('small');
            noteTimestamp.className = 'note-timestamp';
            noteTimestamp.textContent = note.timestamp || 'Time Not Available'; 
            
            const deleteButton = document.createElement('button');
            deleteButton.className = 'delete-btn';
            deleteButton.textContent = 'Delete'; 
            deleteButton.dataset.id = note.id; 
            
            deleteButton.addEventListener('click', deleteNote); // Uses the defined deleteNote function

            contentWrapper.appendChild(noteText);
            contentWrapper.appendChild(noteTimestamp);
            listItem.appendChild(contentWrapper);
            listItem.appendChild(deleteButton);
            notesList.appendChild(listItem);
            
            newNoteElements.push(listItem);
        });
        
        setupIntersectionObserver(newNoteElements); 
    });
}

// --- INITIALIZATION and EVENT LISTENERS ---
document.getElementById('note-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault(); 
        saveNote();
    }
});

document.getElementById('save-btn').addEventListener('click', saveNote);

// Event listeners for the new Highlight Control buttons
document.getElementById('apply-highlight-btn').addEventListener('click', () => executeHighlightAction('highlight'));
document.getElementById('remove-highlight-btn').addEventListener('click', () => executeHighlightAction('remove'));

document.addEventListener('DOMContentLoaded', function() {
    displayMotivationalThought(); 
    loadNotes();
});