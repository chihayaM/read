// ===== 自动加载 filelist.json 中的本地书籍 =====
function autoLoadBooksFromFileList() {
  fetch('filelist.json')
    .then(res => res.json())
    .then(data => {
      if (data.books && Array.isArray(data.books)) {
        state.localBooks = data.books;
        data.books.forEach(book => {
          state.localBooksMap[book.filename] = book;
        });
        renderLocalBooks();
      }
    })
    .catch(err => {
      console.error('加载 filelist.json 失败:', err);
    });
}

// 渲染本地书籍
function renderLocalBooks() {
  const grid = document.getElementById('local-grid');
  const section = document.getElementById('local-books');
  
  if (state.localBooks.length === 0) {
    section.style.display = 'none';
    return;
  }
  
  section.style.display = 'block';
  grid.innerHTML = '';
  
  state.localBooks.forEach(book => {
    const card = createBookCard(book);
    grid.appendChild(card);
  });
}

// 创建书籍卡片
function createBookCard(book) {
  const card = document.createElement('div');
  card.className = 'book-card';
  card.onclick = () => openBook(book);
  
  const ext = book.filename.split('.').pop().toLowerCase();
  const iconMap = {
    'txt': '📄',
    'md': '✏️',
    'markdown': '✏️',
    'epub': '📖',
    'pdf': '📕',
    'html': '🌐',
    'htm': '🌐'
  };
  const icon = iconMap[ext] || '📚';
  
  // 生成随机渐变背景
  const gradients = [
    'linear-gradient(135deg, #2196F3, #1976D2)',
    'linear-gradient(135deg, #4CAF50, #388E3C)',
    'linear-gradient(135deg, #FF9800, #F57C00)',
    'linear-gradient(135deg, #9C27B0, #7B1FA2)',
    'linear-gradient(135deg, #F44336, #C62828)'
  ];
  const gradient = gradients[Math.floor(Math.random() * gradients.length)];
  
  card.innerHTML = \`
    <div class="book-cover" style="background: \${gradient};">
      <div class="placeholder">\${icon}</div>
    </div>
    <div class="book-info">
      <div class="title">\${book.name || book.filename}</div>
      <div class="meta">
        <span>\${formatFileSize(book.size)}</span>
      </div>
    </div>
  \`;
  
  return card;
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// 打开书籍
function openBook(book) {
  const ext = book.filename.split('.').pop().toLowerCase();
  
  if (ext === 'epub') {
    // 使用 EPUB.js 库打开 EPUB 文件
    openEpubBook(book);
  } else if (ext === 'pdf') {
    openPdfBook(book);
  } else if (ext === 'txt' || ext === 'md' || ext === 'markdown') {
    openTextBook(book);
  } else {
    showToast('暂不支持该格式: ' + ext);
  }
}

// 打开 EPUB 书籍
function openEpubBook(book) {
  state.currentBook = book;
  state.format = 'epub';
  
  // 使用 EPUB.js 打开
  const book_instance = ePub(book.path);
  state.epub = book_instance;
  
  book_instance.ready.then(() => {
    const rendition = book_instance.renderTo('epub-view', {
      width: '100%',
      height: '100%',
      flow: 'scrolled-doc'
    });
    
    state.epubRendition = rendition;
    return rendition.display();
  }).then(() => {
    document.getElementById('epub-view').style.display = 'block';
    document.getElementById('pdf-view').style.display = 'none';
    document.getElementById('text-view').style.display = 'none';
    document.getElementById('book-title').textContent = book.name || book.filename;
    showReader();
  }).catch(err => {
    console.error('加载 EPUB 失败:', err);
    showToast('无法加载 EPUB 文件');
  });
}

// 打开 PDF 书籍
function openPdfBook(book) {
  state.currentBook = book;
  state.format = 'pdf';
  
  const pdfUrl = book.path;
  const pdfCanvas = document.getElementById('pdf-view');
  
  pdfjsLib.getDocument(pdfUrl).promise.then(pdf => {
    state.pdfDoc = pdf;
    state.pdfPage = 1;
    renderPdfPage();
    
    pdfCanvas.style.display = 'flex';
    document.getElementById('epub-view').style.display = 'none';
    document.getElementById('text-view').style.display = 'none';
    document.getElementById('book-title').textContent = book.name || book.filename;
    showReader();
  }).catch(err => {
    console.error('加载 PDF 失败:', err);
    showToast('无法加载 PDF 文件');
  });
}

function renderPdfPage() {
  if (!state.pdfDoc) return;
  
  state.pdfDoc.getPage(state.pdfPage).then(page => {
    const scale = 1.5;
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    page.render({ canvasContext: context, viewport }).promise.then(() => {
      const pdfView = document.getElementById('pdf-view');
      pdfView.innerHTML = '';
      pdfView.appendChild(canvas);
    });
  });
}

// 打开文本书籍
function openTextBook(book) {
  state.currentBook = book;
  state.format = 'text';
  
  fetch(book.path)
    .then(res => res.text())
    .then(content => {
      const textView = document.getElementById('text-view');
      const ext = book.filename.split('.').pop().toLowerCase();
      
      if (ext === 'md' || ext === 'markdown') {
        textView.innerHTML = marked(content);
        textView.className = 'markdown';
      } else {
        textView.textContent = content;
        textView.className = '';
      }
      
      textView.style.display = 'block';
      document.getElementById('epub-view').style.display = 'none';
      document.getElementById('pdf-view').style.display = 'none';
      document.getElementById('book-title').textContent = book.name || book.filename;
      showReader();
    })
    .catch(err => {
      showToast('无法加载文件: ' + err.message);
      console.error(err);
    });
}

function showReader() {
  document.getElementById('bookshelf').classList.add('hidden');
  document.getElementById('reader').classList.add('active');
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2000);
}
