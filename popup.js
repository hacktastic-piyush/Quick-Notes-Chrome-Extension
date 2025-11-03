
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


function getNotes(callback) {
    chrome.storage.sync.get({'quickNotes': [], 'highlightColor': '#FFFF00'}, callback);
}


function saveNotes(notesArray, callback) {
    chrome.storage.sync.set({'quickNotes': notesArray}, callback);
}


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
        
        
        chrome.storage.sync.get('quickNotes', function(data) {
            const notes = data.quickNotes || []; 
            notes.unshift(newNote); 

            chrome.storage.sync.set({'quickNotes': notes}, function() {
                noteInput.value = ''; 
                loadNotes(); 
                
                executeHighlightAction('highlight');
            });
        });
    }
}


function deleteNote(e) {
    const noteIdToDelete = parseInt(e.target.dataset.id); 
    
    if (confirm('Are you sure you want to delete this note?')) {
        chrome.storage.sync.get('quickNotes', function(data) {
            let notes = data.quickNotes || [];
            const updatedNotes = notes.filter(note => note.id !== noteIdToDelete);
            
            chrome.storage.sync.set({'quickNotes': updatedNotes}, function() {
                loadNotes(); 
                
                executeHighlightAction('highlight');
            });
        });
    }
}


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


function executeHighlightAction(actionType) {
    const color = document.getElementById('highlight-color').value;
    
    
    chrome.storage.sync.set({'highlightColor': color}, () => {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs.length > 0) {
                const tab = tabs[0];
                if (tab.url.startsWith('http') || tab.url.startsWith('https')) {
                   
                    chrome.scripting.executeScript({
                        target: {tabId: tab.id},
                        files: ['content.js']
                    }, () => {
                        if (chrome.runtime.lastError) {
                            console.error("Script execution failed:", chrome.runtime.lastError.message);
                            return;
                        }
                      
                        chrome.tabs.sendMessage(tab.id, {action: actionType});
                    });
                } else {
                    
                    alert(`Cannot perform this action on a restricted page.`);
                }
            }
        });
    });
}


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

          
            const noteText = document.createElement('span');
            noteText.className = 'note-text clickable-note';
            noteText.textContent = note.text;
            noteText.style.backgroundColor = note.color; 
            noteText.style.cursor = 'pointer'; 
            
            noteText.onclick = function() {
                const lookupText = this.textContent.trim();
              
                const dictionaryUrl = `https://www.google.com/search?q=define+${encodeURIComponent(lookupText)}`;
                window.open(dictionaryUrl, '_blank');
            };
            

            const noteTimestamp = document.createElement('small');
            noteTimestamp.className = 'note-timestamp';
            noteTimestamp.textContent = note.timestamp || 'Time Not Available'; 
            
            const deleteButton = document.createElement('button');
            deleteButton.className = 'delete-btn';
            deleteButton.textContent = 'Delete'; 
            deleteButton.dataset.id = note.id; 
            
            deleteButton.addEventListener('click', deleteNote); 

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


document.getElementById('note-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault(); 
        saveNote();
    }
});

document.getElementById('save-btn').addEventListener('click', saveNote);


document.getElementById('apply-highlight-btn').addEventListener('click', () => executeHighlightAction('highlight'));
document.getElementById('remove-highlight-btn').addEventListener('click', () => executeHighlightAction('remove'));

document.addEventListener('DOMContentLoaded', function() {
    displayMotivationalThought(); 
    loadNotes();

});
