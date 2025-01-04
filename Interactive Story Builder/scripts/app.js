// Global state
let currentUser = null;
let storyNodes = [];
let isEditing = false;
let lastSavedContent = '';
let autosaveTimer = null;

// DOM Elements
const elements = {
    loader: document.getElementById('loader'),
    nodesContainer: document.getElementById('nodes-container'),
    previewContainer: document.getElementById('preview-container'),
    collaborationBar: document.getElementById('collaborationBar'),
    notification: document.getElementById('notification'),
    addNodeBtn: document.getElementById('add-node-btn'),
    saveStoryBtn: document.getElementById('save-story-btn'),
    themeToggle: document.getElementById('theme-toggle'),
    exportBtn: document.getElementById('export-btn')
};

// Initialize application
function initializeApp() {
    setupEventListeners();
    setupAutosave();
    loadSavedStory();
    setupSortableNodes();
    elements.loader.style.display = 'none';
}

// Event Listeners
function setupEventListeners() {
    // Add new node
    elements.addNodeBtn.addEventListener('click', () => {
        const node = createNode();
        elements.nodesContainer.appendChild(node);
        updatePreview();
    });

    // Save story
    elements.saveStoryBtn.addEventListener('click', () => saveStory(true));

    // Theme toggle
    elements.themeToggle.addEventListener('click', toggleTheme);

    // Export story
    elements.exportBtn.addEventListener('click', exportStory);

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);

    // Unsaved changes warning
    window.addEventListener('beforeunload', (e) => {
        if (isEditing) {
            e.preventDefault();
            e.returnValue = '';
        }
    });
}

// Create new story node
function createNode(text = '') {
    const node = document.createElement('div');
    node.className = 'story-node animate__animated animate__fadeIn';
    node.setAttribute('data-id', `node-${Date.now()}`);

    node.innerHTML = `
        <div class="node-header">
            <div class="drag-handle">
                <i class="fas fa-grip-lines"></i>
            </div>
        </div>
        <div class="rich-text-toolbar">
            <button class="format-btn" data-command="bold" title="Bold">
                <i class="fas fa-bold"></i>
            </button>
            <button class="format-btn" data-command="italic" title="Italic">
                <i class="fas fa-italic"></i>
            </button>
            <button class="format-btn" data-command="underline" title="Underline">
                <i class="fas fa-underline"></i>
            </button>
        </div>
        <div class="node-content" contenteditable="true">${text || 'Start typing your story...'}</div>
        <div class="node-actions">
            <button class="node-action-btn duplicate" title="Duplicate Node">
                <i class="fas fa-clone"></i>
            </button>
            <button class="node-action-btn delete" title="Delete Node">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;

    setupNodeListeners(node);
    return node;
}

// Setup individual node listeners
function setupNodeListeners(node) {
    // Rich text formatting
    const toolbar = node.querySelector('.rich-text-toolbar');
    toolbar.addEventListener('click', (e) => {
        const button = e.target.closest('.format-btn');
        if (button) {
            e.preventDefault();
            document.execCommand(button.dataset.command, false, null);
        }
    });

    // Content changes
    const content = node.querySelector('.node-content');
    content.addEventListener('input', () => {
        isEditing = true;
        updatePreview();
        startAutosave();
    });

    // Node actions
    const actions = node.querySelector('.node-actions');
    actions.addEventListener('click', (e) => {
        const button = e.target.closest('.node-action-btn');
        if (!button) return;

        if (button.classList.contains('delete')) {
            if (confirm('Are you sure you want to delete this node?')) {
                node.classList.add('animate__fadeOut');
                setTimeout(() => {
                    node.remove();
                    updatePreview();
                }, 500);
            }
        } else if (button.classList.contains('duplicate')) {
            const newNode = createNode(content.innerHTML);
            node.parentNode.insertBefore(newNode, node.nextSibling);
            updatePreview();
        }
    });
}

// Autosave functionality
function setupAutosave() {
    const AUTOSAVE_DELAY = 3000; // 3 seconds

    function startAutosave() {
        clearTimeout(autosaveTimer);
        autosaveTimer = setTimeout(() => saveStory(false), AUTOSAVE_DELAY);
    }

    // Monitor content changes
    elements.nodesContainer.addEventListener('input', () => {
        isEditing = true;
        startAutosave();
    });
}

// Save story
function saveStory(showNotification = true) {
    try {
        const nodes = Array.from(elements.nodesContainer.querySelectorAll('.node-content'))
            .map(node => node.innerHTML);
        
        const storyData = {
            nodes,
            lastModified: new Date().toISOString()
        };

        localStorage.setItem('story', JSON.stringify(storyData));
        isEditing = false;
        lastSavedContent = JSON.stringify(nodes);

        if (showNotification) {
            showNotification('Story saved successfully', 'success');
        }

        updateSaveStatus('All changes saved');
    } catch (error) {
        console.error('Error saving story:', error);
        showNotification('Error saving story', 'error');
    }
}

// Load saved story
function loadSavedStory() {
    try {
        const saved = localStorage.getItem('story');
        if (saved) {
            const { nodes } = JSON.parse(saved);
            nodes.forEach(text => {
                const node = createNode(text);
                elements.nodesContainer.appendChild(node);
            });
            updatePreview();
        }
    } catch (error) {
        console.error('Error loading saved story:', error);
        showNotification('Error loading saved story', 'error');
    }
}

// Update preview pane
function updatePreview() {
    const content = Array.from(elements.nodesContainer.querySelectorAll('.node-content'))
        .map(node => node.innerHTML)
        .join('<br><br>');
    
    elements.previewContainer.innerHTML = content || `
        <div class="empty-state">
            <i class="fas fa-book"></i>
            <p>Your story preview will appear here</p>
        </div>
    `;
}

// Show notification
function showNotification(message, type = 'success') {
    const notification = elements.notification;
    notification.textContent = message;
    notification.className = `notification ${type} animate__animated animate__fadeIn show`;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Update save status
function updateSaveStatus(message) {
    const statusElement = document.querySelector('.sync-status span');
    if (statusElement) {
        statusElement.textContent = message;
    }
}

// Export story
function exportStory() {
    const content = Array.from(elements.nodesContainer.querySelectorAll('.node-content'))
        .map(node => node.innerText)
        .join('\n\n');
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `story_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    showNotification('Story exported successfully');
}

// Setup sortable nodes
function setupSortableNodes() {
    new Sortable(elements.nodesContainer, {
        animation: 150,
        handle: '.drag-handle',
        ghostClass: 'sortable-ghost',
        onEnd: () => {
            updatePreview();
            isEditing = true;
            startAutosave();
        }
    });
}

// Handle keyboard shortcuts
function handleKeyboardShortcuts(e) {
    if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
            case 's':
                e.preventDefault();
                saveStory(true);
                break;
            case 'n':
                e.preventDefault();
                const node = createNode();
                elements.nodesContainer.appendChild(node);
                node.querySelector('.node-content').focus();
                break;
        }
    }
}

// Toggle theme
function toggleTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
    localStorage.setItem('theme', isDark ? 'light' : 'dark');
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);