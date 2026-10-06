/**
 * Frontend Controller for AI Content Review Dashboard
 * Features: Visual Scorecard Widget (3-Tier Colors), Categorized Breakdown Accordions, and Official Sign-Off Exporter
 */

document.addEventListener('DOMContentLoaded', () => {
  // State
  let currentReportData = null;
  let loadingInterval = null;

  // DOM Elements
  const blogTitleInput = document.getElementById('blogTitle');
  const blogMetaDescriptionInput = document.getElementById('blogMetaDescription');
  const blogSecondaryKeywordInput = document.getElementById('blogSecondaryKeyword');
  const blogContentInput = document.getElementById('blogContent');
  const titleCharBadge = document.getElementById('titleCharBadge');
  const metaCharBadge = document.getElementById('metaCharBadge');

  const runReviewBtn = document.getElementById('runReviewBtn');
  const clearEditorBtn = document.getElementById('clearEditorBtn');
  const pasteBtn = document.getElementById('pasteBtn');
  const wordCountSpan = document.getElementById('wordCount');
  const charCountSpan = document.getElementById('charCount');
  const readingTimeSpan = document.getElementById('readingTime');

  const insertTableBtn = document.getElementById('insertTableBtn');
  const addRowBtn = document.getElementById('addRowBtn');
  const addColBtn = document.getElementById('addColBtn');
  const delTableBtn = document.getElementById('delTableBtn');

  const emptyState = document.getElementById('emptyState');
  const loadingState = document.getElementById('loadingState');
  const reportView = document.getElementById('reportView');
  const loadingStepText = document.getElementById('loadingStepText');
  const errorBanner = document.getElementById('errorBanner');
  const errorMessageText = document.getElementById('errorMessageText');

  const downloadBtn = document.getElementById('downloadBtn');
  const downloadMenu = document.getElementById('downloadMenu');
  const systemStatusDot = document.getElementById('systemStatusDot');
  const systemStatusText = document.getElementById('systemStatusText');

  const rulebookModal = document.getElementById('rulebookModal');
  const openRulebookBtn = document.getElementById('openRulebookBtn');
  const closeRulebookBtn = document.getElementById('closeRulebookBtn');
  const closeRulebookFooterBtn = document.getElementById('closeRulebookFooterBtn');

  // Initialize TinyMCE 7 Professional Rich Text Editor
  let editorReady = false;
  if (typeof tinymce !== 'undefined') {
    tinymce.init({
      selector: '#blogContent',
      height: 380,
      skin: 'oxide-dark',
      content_css: 'dark',
      branding: false,
      promotion: false,
      elementpath: false,
      help_accessibility: false,
      resize: true,
      plugins: [
        'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
        'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
        'insertdatetime', 'media', 'table', 'wordcount', 'codesample'
      ],
      menubar: 'file edit view insert format tools table',
      toolbar_mode: 'wrap',
      toolbar: 'undo redo | blocks | bold italic underline strikethrough | alignleft aligncenter alignright | bullist numlist | link table',
      table_toolbar: 'tableprops tabledelete | tableinsertrowbefore tableinsertrowafter tabledeleterow | tableinsertcolbefore tableinsertcolafter tabledeletecol',
      table_default_attributes: {
        border: '1'
      },
      table_default_styles: {
        'border-collapse': 'collapse',
        'width': '100%',
        'border': '1px solid rgba(255, 255, 255, 0.25)'
      },
      visual: false,
      help_tabs: ['shortcuts', 'keyboardnav'],
      paste_data_images: true,
      paste_preprocess: function(plugin, args) {
        let content = args.content;
        if (!content) return;

        // 1. If pasted content is Markdown or raw text with newlines
        if (isMarkdown(content) || (content.includes('\n') && !/<(?:p|h[1-6]|table|ul|ol|blockquote)\b[^>]*>/i.test(content))) {
          // Auto-extract Title (# Title) if title field is empty
          if (/^#\s+/m.test(content) && blogTitleInput && !blogTitleInput.value.trim()) {
            const titleMatch = content.match(/^#\s*(.+)$/m);
            if (titleMatch) {
              blogTitleInput.value = titleMatch[1].trim();
              content = content.replace(/^#\s*.+$\r?\n?/m, '');
              updateTextStats();
            }
          }
          // Auto-extract Meta Description if meta field is empty
          if (/^meta(?:\s*description)?:\s*/mi.test(content) && blogMetaDescriptionInput && !blogMetaDescriptionInput.value.trim()) {
            const metaMatch = content.match(/^meta(?:\s*description)?:\s*(.+)$/mi);
            if (metaMatch) {
              blogMetaDescriptionInput.value = metaMatch[1].trim();
              content = content.replace(/^meta(?:\s*description)?:\s*.+$\r?\n?/mi, '');
              updateTextStats();
            }
          }

          args.content = convertMarkdownToHtml(content);
        } else {
          // Clean HTML from Word / Docs while preserving all headings, paragraphs, lists, tables, bold, links
          args.content = sanitizePastedHtml(content);
        }
      },
      init_instance_callback: function(editor) {
        function injectMenubarRight() {
          const container = editor.getContainer();
          const menubar = container ? container.querySelector('.tox-menubar') : document.querySelector('.tox-menubar');
          if (menubar && !menubar.querySelector('.tox-menubar__right')) {
            const rightDiv = document.createElement('div');
            rightDiv.className = 'tox-menubar__right';
            rightDiv.innerHTML = `
              <div class="menubar-tools-group">
                <button type="button" class="btn-menu-pill" id="mTableBtn" title="Insert 3x3 Table">
                  <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M3 14h18m-9-4v8m-7 3h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                  <span>+ Table</span>
                </button>
                <button type="button" class="btn-menu-pill" id="mRowBtn" title="Insert Row Below"><span>+ Row</span></button>
                <button type="button" class="btn-menu-pill" id="mColBtn" title="Insert Column Right"><span>+ Col</span></button>
                <button type="button" class="btn-menu-pill btn-menu-del" id="mDelTableBtn" title="Delete Table"><span>Del Table</span></button>
              </div>
            `;
            menubar.appendChild(rightDiv);

            document.getElementById('mTableBtn')?.addEventListener('click', (e) => {
              e.preventDefault();
              editor.execCommand('mceInsertTable', false, { rows: 3, columns: 3 });
              editor.focus();
              showToast('Inserted 3x3 Table');
            });
            document.getElementById('mRowBtn')?.addEventListener('click', (e) => {
              e.preventDefault();
              editor.execCommand('mceTableInsertRowAfter');
              editor.focus();
              showToast('Added row below');
            });
            document.getElementById('mColBtn')?.addEventListener('click', (e) => {
              e.preventDefault();
              editor.execCommand('mceTableInsertColAfter');
              editor.focus();
              showToast('Added column right');
            });
            document.getElementById('mDelTableBtn')?.addEventListener('click', (e) => {
              e.preventDefault();
              editor.execCommand('mceTableDelete');
              editor.focus();
              showToast('Deleted table');
            });
          }
        }
        setTimeout(injectMenubarRight, 50);
        setTimeout(injectMenubarRight, 300);
        setTimeout(injectMenubarRight, 1000);
      },
      content_style: `
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 15px;
          line-height: 1.7;
          color: #f3f4f6;
          background-color: #0d121f;
          padding: 14px 18px;
        }
        h1, h2, h3, h4, h5, h6 {
          font-family: 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif;
          color: #ffffff !important;
          margin-top: 1.2em;
          margin-bottom: 0.5em;
          font-weight: 700;
        }
        h1 { font-size: 1.7em; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.3em; }
        h2 { font-size: 1.4em; }
        h3 { font-size: 1.2em; }
        h4 { font-size: 1.05em; }
        p { margin-bottom: 0.85em; color: #f3f4f6; }

        /* Force Solid Table Outline & Grid Lines (No Dotted/Dashed Borders) */
        table,
        table[border="0"],
        table[border="1"],
        table:not([border]),
        .mce-item-table,
        .mce-item-table th,
        .mce-item-table td,
        table th,
        table td {
          border: 1px solid rgba(255, 255, 255, 0.25) !important;
          border-style: solid !important;
          outline: none !important;
        }
        table {
          border-collapse: collapse !important;
          width: 100% !important;
          margin: 1.2em 0 !important;
        }
        th, td {
          padding: 10px 14px !important;
          text-align: left !important;
          vertical-align: top !important;
          color: #f3f4f6 !important;
        }
        th {
          background: rgba(255, 255, 255, 0.08) !important;
          color: #ffffff !important;
          font-weight: 600 !important;
          border-bottom: 2px solid rgba(255, 255, 255, 0.35) !important;
        }
        blockquote {
          border-left: 3px solid rgba(255, 255, 255, 0.4);
          margin: 1em 0;
          padding: 0.6em 1.2em;
          background: rgba(255, 255, 255, 0.04);
          color: #e5e7eb;
          font-style: italic;
          border-radius: 0 6px 6px 0;
        }
        code {
          font-family: 'JetBrains Mono', Consolas, monospace;
          background: rgba(255, 255, 255, 0.08);
          padding: 2px 6px;
          border-radius: 4px;
          color: #f3f4f6;
          font-size: 0.9em;
        }
        pre {
          font-family: 'JetBrains Mono', Consolas, monospace;
          background: #090d16;
          padding: 12px 16px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          overflow-x: auto;
          color: #f3f4f6;
          font-size: 0.9em;
        }
        a { color: #e5e7eb; text-decoration: underline; text-underline-offset: 3px; }
        ul, ol { padding-left: 1.5rem; margin-bottom: 0.85rem; }
        li { margin-bottom: 0.25rem; color: #f3f4f6; }
      `,
      setup: function(editor) {
        editor.on('init', function() {
          editorReady = true;
          updateTextStats();
        });
        editor.on('input change keyup undo redo SetContent NodeChange', function() {
          updateTextStats();
        });
      }
    });
  }

  // Helper: Detect if string is Markdown or multi-paragraph plain text
  function isMarkdown(content) {
    if (!content || typeof content !== 'string') return false;
    if (/^#{1,6}\s+/m.test(content)) return true;
    if (/^[-*+]\s+/m.test(content)) return true;
    if (/^\d+\.\s+/m.test(content)) return true;
    if (/\[.+\]\(.+\)/.test(content)) return true;
    if (/```[\s\S]*?```/.test(content)) return true;
    if (/\r?\n\s*\r?\n/.test(content) && !/<(?:p|h[1-6]|table|ul|ol|blockquote)\b/i.test(content)) return true;
    return false;
  }

  // Helper: Clean and sanitize pasted HTML while preserving headings, paragraphs, lists, tables, bold, italics, links
  function sanitizePastedHtml(html) {
    if (!html || typeof html !== 'string') return '';
    let cleaned = html
      // Strip Word / Office XML comments and namespaces
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<o:p>[\s\S]*?<\/o:p>/gi, '')
      .replace(/<\/?(?:o|w|m|v):[^>]*>/gi, '')
      .replace(/<\/?font[^>]*>/gi, '')
      // Convert double <br> or blank lines inside HTML into paragraph breaks
      .replace(/<br\s*\/?>\s*(?:&nbsp;|\s)*<br\s*\/?>/gi, '</p><p>')
      // Strip invasive inline styling attributes (font-family, font-size, background-color, line-height) that break dark mode
      .replace(/\s+(?:style|class|id|align|valign|bgcolor|color|face|size|lang)=["'][^"']*["']/gi, '')
      // Remove empty spans
      .replace(/<\/?span[^>]*>/gi, '')
      // Clean empty paragraphs
      .replace(/<p>\s*(?:&nbsp;|\s)*<\/p>/gi, '')
      // Remove duplicate paragraph boundaries
      .replace(/(?:<\/p>\s*)+<\/p>/gi, '</p>')
      .replace(/(?:<p>\s*)+<p>/gi, '<p>');
    
    return cleaned.trim();
  }

  // Convert Markdown text to rich HTML for Editor display with proper paragraph preservation
  function convertMarkdownToHtml(md) {
    if (!md) return '';
    let html = md.trim();

    // 1. Code blocks
    html = html.replace(/```([a-z0-9_-]*)\r?\n([\s\S]*?)```/gi, (m, lang, code) => {
      return `<pre><code>${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`;
    });

    // 2. Headings
    html = html.replace(/^###### (.*$)/gim, '<h6>$1</h6>');
    html = html.replace(/^##### (.*$)/gim, '<h5>$1</h5>');
    html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // 3. Blockquotes
    html = html.replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>');

    // 4. Bold, Italic, Strikethrough, Code
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    html = html.replace(/_([^_]+)_/g, '<em>$1</em>');
    html = html.replace(/~~([^~]+)~~/g, '<del>$1</del>');
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // 5. Markdown Pipe Tables
    html = html.replace(/((?:\|[^\n]+\|\r?\n?)+)/g, (match) => {
      const tableLines = match.trim().split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      if (tableLines.length < 2) return match;
      if (!tableLines[0].startsWith('|') || !tableLines[0].endsWith('|')) return match;
      
      let tableHtml = '<table border="1"><thead>';
      let inBody = false;
      
      for (let i = 0; i < tableLines.length; i++) {
        const line = tableLines[i];
        if (i === 1 && /^\|(?:\s*:?-+:?\s*\|)+$/.test(line)) {
          tableHtml += '</thead><tbody>';
          inBody = true;
          continue;
        }
        const cells = line.slice(1, -1).split('|').map(c => c.trim());
        const tag = inBody ? 'td' : 'th';
        const rowContent = cells.map(c => `<${tag}>${c}</${tag}>`).join('');
        tableHtml += `<tr>${rowContent}</tr>`;
      }
      if (!inBody) tableHtml += '</thead>';
      else tableHtml += '</tbody>';
      tableHtml += '</table>';
      return tableHtml;
    });

    // 6. Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

    // 7. Unordered Lists
    html = html.replace(/^[-*+]\s+(.*$)/gim, '<ul><li>$1</li></ul>');
    html = html.replace(/<\/ul>\s*<ul>/g, '');

    // 8. Ordered Lists
    html = html.replace(/^\d+\.\s+(.*$)/gim, '<ol><li>$1</li></ol>');
    html = html.replace(/<\/ol>\s*<ol>/g, '');

    // 9. Distinct Paragraph Splitting on double newlines or blank space (preserving unified paragraph blocks)
    const blocks = html.split(/\r?\n\s*\r?\n+/);
    html = blocks.map(block => {
      const trimmed = block.trim();
      if (!trimmed) return '';
      if (/^<(?:h[1-6]|ul|ol|pre|blockquote|table|p|div)\b/i.test(trimmed)) {
        return trimmed;
      }
      const paraContent = trimmed.split(/\r?\n/).map(l => l.trim()).filter(Boolean).join(' ');
      return `<p>${paraContent}</p>`;
    }).filter(Boolean).join('\n\n');

    return html;
  }

  // Helper: Exact, robust plain text extraction from HTML or Markdown
  function extractPlainText(content) {
    if (!content || typeof content !== 'string') return '';
    return content
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/\u00a0/g, ' ')
      .replace(/<\/(?:p|div|h[1-6]|li|tr|td|th|blockquote|pre|code|table|section|article)>/gi, ' ')
      .replace(/<(?:br|hr|img|input)[^>]*\/?>/gi, ' ')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Helper: Standard word count calculation shared across frontend and backend
  function countWords(content) {
    const plain = extractPlainText(content);
    return plain ? plain.split(/\s+/).filter(Boolean).length : 0;
  }

  // Helper: Get Plain Text from Editor for Word Counting & Character Stats
  function getEditorBodyText() {
    const editor = typeof tinymce !== 'undefined' ? tinymce.get('blogContent') : null;
    if (editor && editorReady) {
      return extractPlainText(editor.getContent());
    }
    return blogContentInput ? extractPlainText(blogContentInput.value) : '';
  }

  // Helper: Get Full Content (HTML with rich tags/tables or Markdown) for Gemini Analysis
  function getEditorContent() {
    const editor = typeof tinymce !== 'undefined' ? tinymce.get('blogContent') : null;
    if (editor && editorReady) {
      const text = editor.getContent({ format: 'text' }).trim();
      if (!text) return '';
      return editor.getContent();
    }
    return blogContentInput ? blogContentInput.value.trim() : '';
  }

  // Helper: Set Content into TinyMCE or fallback textarea
  function setEditorContent(content) {
    const editor = typeof tinymce !== 'undefined' ? tinymce.get('blogContent') : null;
    if (editor && editorReady) {
      if (!content || !content.trim()) {
        editor.setContent('');
      } else if (isMarkdown(content) || !/<(?:p|h[1-6]|table|ul|ol|blockquote|div)\b[^>]*>/i.test(content)) {
        const html = convertMarkdownToHtml(content);
        editor.setContent(html);
      } else {
        editor.setContent(sanitizePastedHtml(content));
      }
    } else if (blogContentInput) {
      blogContentInput.value = content || '';
    }
  }

  // Table Action Tools
  if (insertTableBtn) {
    insertTableBtn.addEventListener('click', () => {
      const editor = typeof tinymce !== 'undefined' ? tinymce.get('blogContent') : null;
      if (editor && editorReady) {
        editor.execCommand('mceInsertTable', false, { rows: 3, columns: 3 });
        editor.focus();
        showToast('Inserted a 3x3 table into editor');
      } else {
        showToast('Editor is loading...', 'warning');
      }
    });
  }

  if (addRowBtn) {
    addRowBtn.addEventListener('click', () => {
      const editor = typeof tinymce !== 'undefined' ? tinymce.get('blogContent') : null;
      if (editor && editorReady) {
        editor.execCommand('mceTableInsertRowAfter');
        editor.focus();
        showToast('Added row below');
      }
    });
  }

  if (addColBtn) {
    addColBtn.addEventListener('click', () => {
      const editor = typeof tinymce !== 'undefined' ? tinymce.get('blogContent') : null;
      if (editor && editorReady) {
        editor.execCommand('mceTableInsertColAfter');
        editor.focus();
        showToast('Added column right');
      }
    });
  }

  if (delTableBtn) {
    delTableBtn.addEventListener('click', () => {
      const editor = typeof tinymce !== 'undefined' ? tinymce.get('blogContent') : null;
      if (editor && editorReady) {
        editor.execCommand('mceTableDelete');
        editor.focus();
        showToast('Table deleted');
      }
    });
  }

  function loadPresetIntoEditor(preset) {
    if (!preset) return;
    const lines = preset.content.split('\n');
    let title = '';
    let meta = '';
    const bodyLines = [];

    let foundTitle = false;
    let foundMeta = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!foundTitle && line.startsWith('# ')) {
        title = line.replace(/^#\s*/, '').trim();
        foundTitle = true;
        continue;
      }
      if (!foundMeta && /^meta(?:\s*description)?:\s*/i.test(line)) {
        meta = line.replace(/^meta(?:\s*description)?:\s*/i, '').trim();
        foundMeta = true;
        continue;
      }
      bodyLines.push(line);
    }

    if (blogTitleInput) blogTitleInput.value = title;
    if (blogMetaDescriptionInput) blogMetaDescriptionInput.value = meta;
    if (blogSecondaryKeywordInput) blogSecondaryKeywordInput.value = preset.secondaryKeyword || '';
    
    const bodyContent = bodyLines.join('\n').trim();
    setEditorContent(bodyContent);
    updateTextStats();
    showToast(`Loaded "${preset.name}" preset`);
  }

  // Check Backend Health & API Key Status
  async function checkSystemHealth() {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        if (data.geminiConfigured) {
          systemStatusDot.classList.add('active');
          systemStatusText.textContent = `Ready (${data.model})`;
          systemStatusText.title = `Gemini API configured with ${data.model}`;
        } else {
          systemStatusDot.classList.remove('active');
          systemStatusText.textContent = 'API Key Needed';
          systemStatusText.title = 'Add GEMINI_API_KEY to your .env file in project root';
        }
      }
    } catch (e) {
      console.warn('Backend health check error:', e);
      systemStatusText.textContent = 'Backend Offline';
    }
  }

  // Update Input Statistics & Live Character Badges
  function updateTextStats() {
    const titleText = blogTitleInput ? blogTitleInput.value.trim() : '';
    const metaText = blogMetaDescriptionInput ? blogMetaDescriptionInput.value.trim() : '';
    const bodyText = getEditorBodyText();

    // Title length badge (< 58 chars)
    if (titleCharBadge && blogTitleInput) {
      const titleLen = blogTitleInput.value.length;
      if (titleLen === 0) {
        titleCharBadge.className = 'counter-badge';
        titleCharBadge.textContent = '0 / 58 chars';
      } else if (titleLen <= 58) {
        titleCharBadge.className = 'counter-badge badge-pass';
        titleCharBadge.textContent = `${titleLen} / 58 chars (Pass)`;
      } else {
        titleCharBadge.className = 'counter-badge badge-fail';
        titleCharBadge.textContent = `${titleLen} / 58 chars (Over limit!)`;
      }
    }

    // Meta length badge (< 155 chars)
    if (metaCharBadge && blogMetaDescriptionInput) {
      const metaLen = blogMetaDescriptionInput.value.length;
      if (metaLen === 0) {
        metaCharBadge.className = 'counter-badge';
        metaCharBadge.textContent = '0 / 155 chars';
      } else if (metaLen <= 155) {
        metaCharBadge.className = 'counter-badge badge-pass';
        metaCharBadge.textContent = `${metaLen} / 155 chars (Pass)`;
      } else {
        metaCharBadge.className = 'counter-badge badge-fail';
        metaCharBadge.textContent = `${metaLen} / 155 chars (Over limit!)`;
      }
    }

    // Word count calculation for main body (Exact synchronization with audit report)
    const content = getEditorContent();
    const bodyWords = countWords(content);
    const totalChars = (blogTitleInput ? blogTitleInput.value.length : 0) +
                       (blogMetaDescriptionInput ? blogMetaDescriptionInput.value.length : 0) +
                       bodyText.length;
    const readMin = Math.max(1, Math.ceil(bodyWords / 200));

    wordCountSpan.textContent = `${bodyWords} body words`;
    charCountSpan.textContent = `${totalChars} total chars`;
    readingTimeSpan.textContent = `~${readMin} min read`;

    // Enable/disable run button
    runReviewBtn.disabled = bodyWords === 0 && titleText.length === 0;
  }

  if (blogTitleInput) blogTitleInput.addEventListener('input', updateTextStats);
  if (blogMetaDescriptionInput) blogMetaDescriptionInput.addEventListener('input', updateTextStats);

  // Clear Editor
  clearEditorBtn.addEventListener('click', () => {
    const hasText = (blogTitleInput && blogTitleInput.value) ||
                    (blogMetaDescriptionInput && blogMetaDescriptionInput.value) ||
                    getEditorBodyText();
    if (!hasText || confirm('Clear all inputs (Title, Meta Description, and Article Body)?')) {
      if (blogTitleInput) blogTitleInput.value = '';
      if (blogMetaDescriptionInput) blogMetaDescriptionInput.value = '';
      if (blogSecondaryKeywordInput) blogSecondaryKeywordInput.value = '';
      setEditorContent('');
      updateTextStats();
      if (blogTitleInput) blogTitleInput.focus();
    }
  });

  // Paste from Clipboard
  if (pasteBtn && navigator.clipboard) {
    pasteBtn.addEventListener('click', async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (text) {
          let bodyText = text;
          // Auto-extract Title (# Title) if title field is empty
          if (/^#\s+/m.test(bodyText) && blogTitleInput && !blogTitleInput.value.trim()) {
            const titleMatch = bodyText.match(/^#\s*(.+)$/m);
            if (titleMatch) {
              blogTitleInput.value = titleMatch[1].trim();
              bodyText = bodyText.replace(/^#\s*.+$\r?\n?/m, '');
            }
          }
          // Auto-extract Meta Description if meta field is empty
          if (/^meta(?:\s*description)?:\s*/mi.test(bodyText) && blogMetaDescriptionInput && !blogMetaDescriptionInput.value.trim()) {
            const metaMatch = bodyText.match(/^meta(?:\s*description)?:\s*(.+)$/mi);
            if (metaMatch) {
              blogMetaDescriptionInput.value = metaMatch[1].trim();
              bodyText = bodyText.replace(/^meta(?:\s*description)?:\s*.+$\r?\n?/mi, '');
            }
          }

          setEditorContent(bodyText.trim());
          updateTextStats();
          showToast('Content pasted with exact structure and formatting preserved!');
        }
      } catch (err) {
        showToast('Unable to read clipboard. Please paste directly into editor.', 'error');
      }
    });
  }

  // Loading Steps Animation
  const loadingSteps = [
    'Connecting to Google Gemini API (via official Google Gen AI SDK)...',
    'Auditing 34 custom editorial, SEO, and anti-AI guidelines...',
    'Evaluating explicit title (<58ch) & meta description (<155ch)...',
    'Inspecting headings for -ing verbs and hierarchy (H2 -> H3)...',
    'Verifying Hemingway grade level (<= Grade 7) and paragraph lengths...',
    'Checking internal/external links and filtering tracking UTM parameters...',
    'Synthesizing categorized score card and actionable suggested fixes...'
  ];

  function startLoadingAnimation() {
    emptyState.style.display = 'none';
    reportView.style.display = 'none';
    loadingState.style.display = 'flex';
    errorBanner.classList.remove('show');
    runReviewBtn.disabled = true;

    let stepIndex = 0;
    loadingStepText.textContent = loadingSteps[0];
    if (loadingInterval) clearInterval(loadingInterval);
    loadingInterval = setInterval(() => {
      stepIndex = (stepIndex + 1) % loadingSteps.length;
      loadingStepText.textContent = loadingSteps[stepIndex];
    }, 1700);
  }

  function stopLoadingAnimation() {
    if (loadingInterval) {
      clearInterval(loadingInterval);
      loadingInterval = null;
    }
    loadingState.style.display = 'none';
    runReviewBtn.disabled = false;
  }

  // Execute Content Review
  runReviewBtn.addEventListener('click', async () => {
    const title = blogTitleInput ? blogTitleInput.value.trim() : '';
    const metaDescription = blogMetaDescriptionInput ? blogMetaDescriptionInput.value.trim() : '';
    const secondaryKeyword = blogSecondaryKeywordInput ? blogSecondaryKeywordInput.value.trim() : '';
    const content = getEditorContent();

    if (!content && !title) {
      showToast('Please enter an article title and body content to review.', 'warning');
      return;
    }

    startLoadingAnimation();

    try {
      const response = await fetch('/api/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content, title, metaDescription, secondaryKeyword })
      });

      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.message || 'Review request failed.');
      }

      currentReportData = json.data;
      renderReport(json.data);
      showToast('Audit report generated successfully!');
    } catch (err) {
      console.error('Review Error:', err);
      stopLoadingAnimation();
      errorMessageText.textContent = err.message || 'An unexpected error occurred during review.';
      errorBanner.classList.add('show');
      emptyState.style.display = 'flex';
      showToast('Audit failed. Please check the error notice.', 'error');
    }
  });

  // Render Structured Review Report
  function renderReport(data) {
    stopLoadingAnimation();
    emptyState.style.display = 'none';
    reportView.style.display = 'flex';

    const score = Math.max(0, Math.min(100, data.complianceScore || 0));
    const isPass = data.overallStatus === 'Pass';

    // 1. Visual Scorecard Widget (3-Tier Dynamic Color Coding)
    const verdictCard = document.getElementById('verdictCard');
    const statusBadge = document.getElementById('statusBadge');
    const scoreTierLabel = document.getElementById('scoreTierLabel');
    const scoreDisplay = document.getElementById('scoreDisplay');
    const verdictTitle = document.getElementById('verdictTitle');
    const verdictSummary = document.getElementById('verdictSummary');

    scoreDisplay.textContent = score;
    verdictSummary.textContent = data.summary || 'Editorial review completed.';

    // Circular SVG Gauge calculation (2 * PI * 38 ≈ 238.76)
    const circumference = 238.76;
    const offset = circumference - (score / 100) * circumference;
    const gaugeFill = document.getElementById('gaugeFill');
    gaugeFill.style.strokeDasharray = `${circumference} ${circumference}`;
    gaugeFill.style.strokeDashoffset = offset;

    if (score >= 90) {
      // Tier 1: Green (90+)
      verdictCard.className = 'scorecard-widget glass-panel score-tier-green';
      statusBadge.className = 'verdict-badge pass';
      statusBadge.innerHTML = '✅ PASS';
      scoreTierLabel.textContent = 'Grade A (Publication Ready)';
      verdictTitle.textContent = 'Compliant & Ready for Publication';
    } else if (score >= 70) {
      // Tier 2: Yellow / Amber (70 - 89)
      verdictCard.className = 'scorecard-widget glass-panel score-tier-yellow';
      statusBadge.className = 'verdict-badge warning';
      statusBadge.innerHTML = '⚠️ NEEDS REVISION';
      scoreTierLabel.textContent = 'Grade B (Moderate Revisions Required)';
      verdictTitle.textContent = 'Revisions Recommended Before Publishing';
    } else {
      // Tier 3: Red (< 70)
      verdictCard.className = 'scorecard-widget glass-panel score-tier-red';
      statusBadge.className = 'verdict-badge fail';
      statusBadge.innerHTML = '❌ NEEDS REVISION';
      scoreTierLabel.textContent = 'Grade C (Critical Issues Detected)';
      verdictTitle.textContent = 'Mandatory Revisions Required';
    }

    // 2. Metrics Row (Word Count, Live Hemingway Grade, Full Primary Keyword, Real Internal Links)
    const metricWords = document.getElementById('metricWords');
    if (metricWords) metricWords.textContent = `${data.metrics?.wordCount || 0} w`;

    const metricGrade = document.getElementById('metricGrade');
    if (metricGrade) metricGrade.textContent = data.metrics?.readingLevel || 'Grade 7 or less';

    const metricKeyword = document.getElementById('metricKeyword');
    if (metricKeyword) {
      if (data.metrics?.primaryKeyword) {
        const count = data.metrics.primaryKeywordCount ?? 0;
        metricKeyword.textContent = `${data.metrics.primaryKeyword} (${count}x)`;
      } else {
        metricKeyword.textContent = 'None Detected';
      }
    }

    // Secondary Keyword Metric Pill (Dynamically displayed only when user provides secondary keyword)
    const metricSecContainer = document.getElementById('metricSecondaryKeywordContainer');
    const metricSecKeyword = document.getElementById('metricSecondaryKeyword');
    if (metricSecContainer && metricSecKeyword) {
      if (data.metrics?.secondaryKeyword) {
        metricSecContainer.style.display = 'flex';
        if (data.metrics.secondaryKeywordsList && data.metrics.secondaryKeywordsList.length > 1) {
          const listText = data.metrics.secondaryKeywordsList
            .map(item => `${item.keyword} (${item.count}x)`)
            .join(', ');
          metricSecKeyword.textContent = listText;
          metricSecKeyword.title = listText;
        } else {
          const count = data.metrics.secondaryKeywordCount ?? 0;
          metricSecKeyword.textContent = `${data.metrics.secondaryKeyword} (${count}x)`;
          metricSecKeyword.title = `${data.metrics.secondaryKeyword} appears ${count} time(s)`;
        }
      } else {
        metricSecContainer.style.display = 'none';
      }
    }

    const metricLinks = document.getElementById('metricLinks');
    if (metricLinks) {
      const internalCount = data.metrics?.internalLinksCount ?? 0;
      metricLinks.textContent = `${internalCount} internal`;
    }

    // 3. Tab Badges
    const violationsCount = (data.violations || []).length;
    const violationsBadge = document.getElementById('violationsTabBadge');
    violationsBadge.textContent = violationsCount;
    violationsBadge.className = `tab-badge ${violationsCount > 0 ? 'badge-danger' : 'badge-success'}`;

    const checklistBadge = document.getElementById('checklistTabBadge');
    checklistBadge.textContent = (data.checklist || []).length;

    // 4. Group Feedback into the 3 Categorized Breakdown Cards
    const violations = data.violations || [];
    const checklist = data.checklist || [];

    // Helper: partition by category or rule ID
    const isTone = (ruleId, cat) => (ruleId && ruleId.startsWith('TONE')) || (cat && (cat.includes('Tone') || cat.includes('Anti-AI')));
    const isFormat = (ruleId, cat) => (ruleId && ruleId.startsWith('STRUCT')) || (cat && (cat.includes('Structure') || cat.includes('Format')));
    const isCompliance = (ruleId, cat) => !isTone(ruleId, cat) && !isFormat(ruleId, cat);

    const toneViolations = violations.filter(v => isTone(v.ruleId, v.category));
    const formatViolations = violations.filter(v => isFormat(v.ruleId, v.category));
    const complianceViolations = violations.filter(v => isCompliance(v.ruleId, v.category));

    const toneChecklist = checklist.filter(c => isTone(c.ruleId, c.category));
    const formatChecklist = checklist.filter(c => isFormat(c.ruleId, c.category));
    const complianceChecklist = checklist.filter(c => isCompliance(c.ruleId, c.category));

    // Update Category Badges
    updateCategoryBadge('badgeTone', toneViolations);
    updateCategoryBadge('badgeFormat', formatViolations);
    updateCategoryBadge('badgeCompliance', complianceViolations);

    // Populate Category 1: Tone & Voice
    renderCategoryViolations('violationsToneList', toneViolations, 'Tone & Voice / Anti-AI');
    renderCategoryChecklist('checklistToneList', toneChecklist);

    // Populate Category 2: Formatting & Structure
    renderCategoryViolations('violationsFormatList', formatViolations, 'Formatting & Structure');
    renderCategoryChecklist('checklistFormatList', formatChecklist);

    // Populate Category 3: Compliance & SEO / Links
    renderCategoryViolations('violationsComplianceList', complianceViolations, 'Compliance, SEO & Links');
    renderCategoryChecklist('checklistComplianceList', complianceChecklist);

    // 5. Full Rule-by-Rule Checklist Tab
    const checklistContainer = document.getElementById('checklistContainer');
    checklistContainer.innerHTML = '';
    checklist.forEach(c => {
      checklistContainer.appendChild(createChecklistItemElement(c));
    });

    // 6. Strengths & Action Plan Tab
    const strengthsContainer = document.getElementById('strengthsContainer');
    strengthsContainer.innerHTML = '';
    (data.strengths || []).forEach(str => {
      const el = document.createElement('div');
      el.className = 'strength-item';
      el.innerHTML = `<span>✨</span> <div>${escapeHtml(str)}</div>`;
      strengthsContainer.appendChild(el);
    });

    const actionPlanContainer = document.getElementById('actionPlanContainer');
    actionPlanContainer.innerHTML = '';
    (data.actionPlan || []).forEach((step, idx) => {
      const el = document.createElement('div');
      el.className = 'action-step';
      el.innerHTML = `
        <div class="step-num">${idx + 1}</div>
        <div style="font-size: 0.88rem;">${escapeHtml(step)}</div>
      `;
      actionPlanContainer.appendChild(el);
    });

    // Default to categorized view
    switchTab('categories');
  }

  // Update Category Badge Pill
  function updateCategoryBadge(elementId, categoryViolations) {
    const badge = document.getElementById(elementId);
    if (!badge) return;
    const count = categoryViolations.length;
    if (count === 0) {
      badge.className = 'category-badge-pill pass';
      badge.innerHTML = '0 Issues ✅';
    } else {
      const hasCritical = categoryViolations.some(v => (v.severity || '').toLowerCase() === 'critical');
      badge.className = `category-badge-pill ${hasCritical ? 'critical' : 'issues'}`;
      badge.innerHTML = `${count} ${count === 1 ? 'Violation' : 'Violations'} ${hasCritical ? '❌' : '⚠️'}`;
    }
  }

  // Render Violations for a Specific Category
  function renderCategoryViolations(containerId, violationsList, categoryLabel) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    if (violationsList.length === 0) {
      const noIssues = document.createElement('div');
      noIssues.className = 'strength-item';
      noIssues.style.marginBottom = '1rem';
      noIssues.innerHTML = `
        <span>✅</span>
        <div>
          <strong>No ${categoryLabel} violations found.</strong>
          <div style="color:var(--text-secondary); font-size:0.8rem; margin-top:0.2rem;">All rules in this category strictly satisfied.</div>
        </div>
      `;
      container.appendChild(noIssues);
      return;
    }

    const heading = document.createElement('div');
    heading.className = 'category-subheading';
    heading.textContent = `Detected ${categoryLabel} Issues (${violationsList.length})`;
    container.appendChild(heading);

    const listWrapper = document.createElement('div');
    listWrapper.className = 'violations-list';
    listWrapper.style.marginBottom = '1.25rem';

    violationsList.forEach(v => {
      const card = document.createElement('div');
      const severityClass = `severity-${(v.severity || 'major').toLowerCase()}`;
      card.className = `violation-card ${severityClass}`;

      card.innerHTML = `
        <div class="violation-header">
          <div class="violation-title-group">
            <span class="severity-tag">${escapeHtml(v.severity || 'VIOLATION')}</span>
            <span class="violation-issue">${escapeHtml(v.issue)}</span>
          </div>
          <span class="violation-category">${escapeHtml(v.ruleId || 'RULE')}</span>
        </div>

        <div class="diff-box">
          <div class="diff-section">
            <div class="diff-label original">
              <span>🔴 Problematic Text Excerpt</span>
            </div>
            <div class="diff-content original">"${escapeHtml(v.originalExcerpt || '')}"</div>
          </div>
          <div class="diff-section">
            <div class="diff-label fix">
              <span>🟢 Suggested Editorial Fix</span>
              <button class="btn-copy-fix" data-fix="${escapeAttr(v.suggestedFix)}">
                📋 Copy Fix
              </button>
            </div>
            <div class="diff-content fix">${escapeHtml(v.suggestedFix || '')}</div>
          </div>
        </div>

        <div class="violation-explanation">
          <strong>Policy Context:</strong> ${escapeHtml(v.explanation)}
        </div>
      `;
      listWrapper.appendChild(card);
    });

    container.appendChild(listWrapper);

    // Bind copy fix buttons inside this container
    container.querySelectorAll('.btn-copy-fix').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const textToCopy = e.target.dataset.fix;
        if (textToCopy && navigator.clipboard) {
          navigator.clipboard.writeText(textToCopy);
          showToast('Suggested fix copied to clipboard!');
        }
      });
    });
  }

  // Render Checklist for a Specific Category
  function renderCategoryChecklist(containerId, items) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    if (items.length > 0) {
      const heading = document.createElement('div');
      heading.className = 'category-subheading';
      heading.textContent = 'Category Rule Checklist';
      container.appendChild(heading);

      items.forEach(c => {
        container.appendChild(createChecklistItemElement(c));
      });
    }
  }

  // Create Single Checklist Item Element
  function createChecklistItemElement(c) {
    const item = document.createElement('div');
    item.className = 'checklist-item';

    const statusLower = (c.status || 'pass').toLowerCase();
    const statusIcon = statusLower === 'pass'
      ? '<svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>'
      : statusLower === 'warning'
      ? '<svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>'
      : '<svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg>';

    item.innerHTML = `
      <div class="checklist-icon ${statusLower}">
        ${statusIcon}
      </div>
      <div class="checklist-content">
        <div class="checklist-title">
          <span class="checklist-code">${escapeHtml(c.ruleId)}</span>
          <span>${escapeHtml(c.ruleName)}</span>
        </div>
        <div class="checklist-notes">${escapeHtml(c.notes)}</div>
      </div>
      <span class="checklist-badge ${statusLower}">${escapeHtml(c.status)}</span>
    `;
    return item;
  }

  // Accordion Toggle Handlers
  document.querySelectorAll('.category-accordion-header').forEach(header => {
    header.addEventListener('click', () => {
      const targetId = header.dataset.toggle;
      const accordion = document.getElementById(targetId);
      if (accordion) {
        accordion.classList.toggle('open');
      }
    });
  });

  // Tabs Switching
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  function switchTab(tabName) {
    tabButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    tabContents.forEach(content => {
      content.classList.toggle('active', content.id === `tab-${tabName}`);
    });
  }

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(btn.dataset.tab);
    });
  });

  // Download Menu Toggle
  downloadBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!currentReportData) {
      showToast('Run a review first to generate a report.', 'warning');
      return;
    }
    downloadMenu.classList.toggle('show');
  });

  // Close dropdown on outside click
  document.addEventListener('click', () => {
    downloadMenu.classList.remove('show');
  });

  // Export actions
  document.getElementById('exportMdBtn').addEventListener('click', () => {
    if (currentReportData) {
      ReportExporter.exportMarkdown(currentReportData, getEditorBodyText());
      showToast('Downloaded Official Sign-Off Report (.md)');
    }
  });

  document.getElementById('exportTxtBtn').addEventListener('click', () => {
    if (currentReportData) {
      ReportExporter.exportPlainText(currentReportData);
      showToast('Downloaded Official Sign-Off Report (.txt)');
    }
  });

  document.getElementById('exportJsonBtn').addEventListener('click', () => {
    if (currentReportData) {
      ReportExporter.exportJson(currentReportData);
      showToast('Downloaded Structured JSON (.json)');
    }
  });

  document.getElementById('printReportBtn').addEventListener('click', () => {
    window.print();
  });

  // Rulebook Modal
  openRulebookBtn.addEventListener('click', () => {
    rulebookModal.classList.add('show');
  });

  const closeModal = () => rulebookModal.classList.remove('show');
  closeRulebookBtn.addEventListener('click', closeModal);
  closeRulebookFooterBtn.addEventListener('click', closeModal);
  rulebookModal.addEventListener('click', (e) => {
    if (e.target === rulebookModal) closeModal();
  });

  // Helper: Toast Notifications
  function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = 'toast';
    const icon = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : '✅';
    toast.innerHTML = `<span>${icon}</span> <span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  // Helper: HTML Escaping
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function escapeAttr(str) {
    if (!str) return '';
    return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // Initial calls
  checkSystemHealth();
  updateTextStats();
});
