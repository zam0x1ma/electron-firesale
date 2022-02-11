const { ipcRenderer } = require('electron');
const marked = require('marked');
const path = require('path');

const markdownView = document.querySelector('#markdown');
const htmlView = document.querySelector('#html');
const newFileButton = document.querySelector('#new-file');
const openFileButton = document.querySelector('#open-file');
const saveMarkdownButton = document.querySelector('#save-markdown');
const revertButton = document.querySelector('#revert');
const saveHtmlButton = document.querySelector('#save-html');
const showFileButton = document.querySelector('#show-file');
const openInDefaultButton = document.querySelector('#open-in-default');

let filePath = null;
let originalContent = null;

markdownView.addEventListener('keyup', (event) => {
  const currentContent = event.target.value;
  renderMarkdownToHtml(currentContent);
  updateUserInterface(currentContent !== originalContent);
});

openFileButton.addEventListener('click', () => {
  ipcRenderer.send('open-file');
});

ipcRenderer.on('file-opened', (event, file, content) => {
  renderFile(file, content);
});

ipcRenderer.on('file-changed', (event, file, content) => {
  renderFile(file, content);
})

newFileButton.addEventListener('click', () => {
  ipcRenderer.send('new-file');
});

saveHtmlButton.addEventListener('click', () => {
  ipcRenderer.send('save-html', htmlView.innerHTML);
});

saveMarkdownButton.addEventListener('click', () => {
  ipcRenderer.send('save-markdown', filePath, markdownView.value);
});

revertButton.addEventListener('click', () => {
  markdownView.value = originalContent;
  renderMarkdownToHtml(originalContent);
});

document.addEventListener('dragstart', event => event.preventDefault());
document.addEventListener('dragover', event => event.preventDefault());
document.addEventListener('dragleave', event => event.preventDefault());
document.addEventListener('drop', event => event.preventDefault());

markdownView.addEventListener('dragover', (event) => {
  const file = getDraggedFile(event);

  if (fileTypeIsSupported(file)) {
    markdownView.classList.add('drag-over');
  } else {
    markdownView.classList.add('drag-error');
  }
});

markdownView.addEventListener('dragleave', () => {
  markdownView.classList.remove('drag-over');
  markdownView.classList.remove('drag-error');
});

markdownView.addEventListener('drop', (event) => {
  const file = getDroppedFile(event);

  if (fileTypeIsSupported(file)) {
    ipcRenderer.send('open-file', file.path);
  } else {
    alert('File type not supported');
  }

  markdownView.classList.remove('drage-over');
  markdownView.classList.remove('drage-error');
});

const renderMarkdownToHtml = (markdown) => {
  htmlView.innerHTML = marked.parse(markdown, { sanitize: true });
};

const updateUserInterface = (isEdited) => {
  let title = 'Fire Sale';

  if (filePath) {
    title = `${path.basename(filePath)} - ${title}`;
  }
  if (isEdited) {
    title = `${title} (Edited)`;
  }

  setCurrentWindowTitle(title);
  setCurrentWindowEdited(isEdited);

  saveMarkdownButton.disabled = !isEdited;
  revertButton.disabled = !isEdited;
};

const setCurrentWindowTitle = (title) => {
  ipcRenderer.send('set-title', title);
};

const setCurrentWindowEdited = (isEdited) => {
  ipcRenderer.send('set-edited', isEdited);
};

const getDraggedFile = (event) => event.dataTransfer.items[0];
const getDroppedFile = (event) => event.dataTransfer.files[0];

const fileTypeIsSupported = (file) => {
  return [ 'text/plain', 'text/markdown' ].includes(file.type);
};

const renderFile = (file, content) => {
  filePath = file;
  originalContent = content;

  markdownView.value = content;
  renderMarkdownToHtml(content);

  updateUserInterface(false);
};
