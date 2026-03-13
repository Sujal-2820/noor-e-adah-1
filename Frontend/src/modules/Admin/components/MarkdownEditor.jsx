import { useMemo, useRef, useCallback, useEffect } from 'react'
import JoditEditor from 'jodit-react'
import { cn } from '../../../lib/cn'

/**
 * RichTextEditor Component (using Jodit)
 *
 * A professional WYSIWYG editor that supports:
 * - Proper Table management (add/remove rows/columns)
 * - Preview mode
 * - All text formatting options
 * - Lightweight and MERN friendly
 */
export function MarkdownEditor({
  value = '',
  onChange,
  name = 'description',
  placeholder = 'Enter formatted text...',
  disabled = false,
  error = false,
  className = '',
}) {
  const editorRef = useRef(null)

  // Configure Jodit
  const config = useMemo(() => ({
    readonly: disabled,
    placeholder: placeholder || 'Start typing...',
    defaultMode: '1', // 1: WYSIWYG, 2: Source Code
    theme: 'default',
    toolbarButtonSize: 'middle',
    buttons: [
      'bold', 'italic', 'underline', 'strikethrough', '|',
      'brush', '|', // Text and background color
      'ul', 'ol', '|',
      'paragraph', 'fontsize', '|', // Simple heading management
      'table', 'link', '|', // Table support is built-in and amazing
      'align', 'undo', 'redo', '|',
      'hr', 'eraser', '|', // Divider and Clear formatting
      'preview', 'fullsize' // Preview and Fullscreen at the end
    ],
    // Remove complex/unwanted features
    removeButtons: ['image', 'video', 'file', 'source', 'print', 'about'],
    // Table specific configuration
    table: {
      allowModify: true,
      allowColor: false,
      allowResize: true,
    },
    // Styling the editor
    style: {
      fontFamily: 'Inter, sans-serif',
      fontSize: '14px',
    },
    // Prevent image uploads/base64
    uploader: {
      insertImageAsBase64URI: false
    },
    // Toolbar configuration
    toolbarAdaptive: false,
    height: 350,
    minHeight: 300,
    maxHeight: 600,
    showCharsCounter: true,
    showWordsCounter: true,
    showXPathInStatusbar: false,
    // Preserve formatting on paste — do NOT strip
    askBeforePasteHTML: false,
    askBeforePasteFromWord: false,
    defaultActionOnPaste: 'insert_as_html',  // ← preserve all HTML formatting on paste
    // Clean only truly dangerous HTML; do NOT strip spacing or structure
    cleanHTML: {
      fillEmptyParagraph: false,
      denyTags: 'script,iframe',      // only block dangerous tags
      replaceOldTags: {
        'i': 'em',
        'b': 'strong'
      }
    },
    // Custom width
    width: 'auto',
    toolbarSticky: false, // Prevents layout jumps that cause auto-scroll
    scrollWhenTyping: false, // Prevents Jodit from forcing scrolls
    // Performance optimizations
    observer: {
      timeout: 100 // increase timeout for observer
    },
    useSplitMode: false,
    link: {
      followOnHotKey: true
    }
  }), [disabled, placeholder])

  // Use a ref to track the latest value locally without triggering re-renders
  const lastValue = useRef(value)

  // Sync internal ref when prop value changes from outside (e.g. product loaded)
  useEffect(() => {
    if (value !== lastValue.current) {
      lastValue.current = value
    }
  }, [value])

  const emit = useCallback((newContent) => {
    // Normalise Jodit's empty-paragraph signal to empty string
    const cleaned = newContent === '<p><br></p>' ? '' : newContent

    // Only emit if value actually changed to avoid redundant parent re-renders
    if (cleaned !== lastValue.current) {
      lastValue.current = cleaned
      onChange({ target: { name, value: cleaned } })
    }
  }, [onChange, name])

  return (
    <div className={cn(
      'rich-text-editor-jodit',
      error && 'border-red-300 rounded-xl overflow-hidden',
      className
    )}>
      <style>{`
        /* Custom styling for Jodit to match our theme */
        .rich-text-editor-jodit .jodit-container {
          border-radius: 0.75rem !important;
          border-color: ${error ? '#fca5a5' : '#d1d5db'} !important;
          overflow: hidden !important;
          box-shadow: none !important;
        }

        .rich-text-editor-jodit .jodit-toolbar {
          background: linear-gradient(to right, #f9fafb, #f3f4f6) !important;
          border-bottom: 1px solid #d1d5db !important;
        }

        .rich-text-editor-jodit .jodit-toolbar-button__button {
          border-radius: 0.5rem !important;
          transition: all 0.2s !important;
        }

        .rich-text-editor-jodit .jodit-toolbar-button__button:hover {
          background-color: #f3e8ff !important;
          color: #9333ea !important;
        }

        .rich-text-editor-jodit .jodit-toolbar-button_active .jodit-toolbar-button__button {
          background-color: #9333ea !important;
          color: white !important;
        }

        .rich-text-editor-jodit .jodit-workplace {
          background-color: ${error ? '#fef2f2' : 'white'} !important;
        }

        .rich-text-editor-jodit .jodit-wysiwyg {
          padding: 1.25rem !important;
          color: #374151 !important;
        }

        .rich-text-editor-jodit .jodit-statusbar {
          border-top: 1px solid #d1d5db !important;
          background: #f9fafb !important;
          color: #6b7280 !important;
          font-size: 0.75rem !important;
        }

        /* Table styling inside editor */
        .jodit-wysiwyg table {
          border-collapse: collapse;
          width: 100%;
          margin-bottom: 1rem;
        }

        .jodit-wysiwyg table td,
        .jodit-wysiwyg table th {
          border: 1px solid #d1d5db;
          padding: 8px;
          min-width: 50px;
        }

        .jodit-wysiwyg table th {
          background-color: #f3f4f6;
          font-weight: bold;
        }

        /* Link styling inside editor */
        .jodit-wysiwyg a {
          color: #2563eb !important;
          text-decoration: underline !important;
          font-weight: 500;
        }

        /* Shift preview group to the far right */
        .rich-text-editor-jodit .jodit-toolbar__box {
          display: flex !important;
          flex-wrap: wrap !important;
        }

        .rich-text-editor-jodit .jodit-toolbar-button_preview {
          margin-left: auto !important;
          border-left: 1px solid #d1d5db !important;
        }

        .rich-text-editor-jodit .jodit-toolbar-button_preview,
        .rich-text-editor-jodit .jodit-toolbar-button_fullsize {
          background-color: #f3f4f6 !important;
        }

        .rich-text-editor-jodit .jodit-toolbar-button_fullsize {
          border-right: 1px solid #d1d5db !important;
        }

        /* Remove "Powered by Jodit" */
        .jodit-status-bar__item_right {
           display: none !important;
        }
      `}</style>

      <JoditEditor
        ref={editorRef}
        value={value}
        config={config}
        onBlur={emit} // Update parent state when user leaves the editor
        // We REMOVE onChange here to prevent the lag loop and cursor loss
        // Jodit keeps internal state perfectly. onBlur ensures parent gets the final data.
      />

      <div className="px-3 py-1.5 bg-gray-50 border border-t-0 border-gray-300 rounded-b-xl text-xs text-gray-500" style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0, marginTop: -1 }}>
        <span className="font-bold text-purple-600">Pro Tip:</span> Right-click inside any table cell to add or remove rows and columns. Use the eye icon for Preview mode.
      </div>
    </div>
  )
}
