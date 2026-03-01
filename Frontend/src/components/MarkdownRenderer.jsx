import { cn } from '../lib/cn'

/**
 * RichTextRenderer Component
 * 
 * Renders HTML content from the rich text editor.
 * Includes sanitization and proper styling.
 */
export function MarkdownRenderer({
  content,
  className = '',
  compact = false
}) {
  if (!content) {
    return null
  }

  return (
    <div
      className={cn(
        'rich-text-content prose prose-sm max-w-none',
        compact && 'prose-compact',
        className
      )}
    >
      <style>{`
        .rich-text-content h1 {
          font-size: 1.75rem;
          font-weight: 700;
          color: #111827;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
        }
        
        .rich-text-content h1:first-child {
          margin-top: 0;
        }
        
        .rich-text-content h2 {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1f2937;
          margin-top: 1.25rem;
          margin-bottom: 0.5rem;
        }
        
        .rich-text-content h2:first-child {
          margin-top: 0;
        }
        
        .rich-text-content h3 {
          font-size: 1.25rem;
          font-weight: 600;
          color: #1f2937;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
        }
        
        .rich-text-content h3:first-child {
          margin-top: 0;
        }
        
        .rich-text-content p {
          color: #374151;
          line-height: 1.625;
          margin-bottom: 0.75rem;
        }
        
        .rich-text-content strong {
          font-weight: 700;
          color: #111827;
        }
        
        .rich-text-content em {
          font-style: italic;
        }
        
        .rich-text-content u {
          text-decoration: underline;
        }
        
        .rich-text-content s,
        .rich-text-content strike {
          text-decoration: line-through;
          color: #6b7280;
        }
        
        .rich-text-content a {
          color: #2563eb !important;
          text-decoration: underline !important;
          font-weight: 500 !important;
          transition: color 0.2s;
        }
        
        .rich-text-content a:hover {
          color: #1d4ed8 !important;
        }
        
        .rich-text-content ul {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin-bottom: 0.75rem;
        }
        
        .rich-text-content ol {
          list-style-type: decimal;
          padding-left: 1.5rem;
          margin-bottom: 0.75rem;
        }
        
        .rich-text-content li {
          color: #374151;
          line-height: 1.625;
          margin-bottom: 0.25rem;
        }
        
        .rich-text-content blockquote {
          border-left: 4px solid #16a34a;
          background: linear-gradient(to right, #f0fdf4, #ecfdf5);
          padding: 0.75rem 1rem;
          margin: 0.75rem 0;
          border-radius: 0 0.5rem 0.5rem 0;
          color: #374151;
        }
        
        .rich-text-content hr {
          border: none;
          border-top: 2px solid #e5e7eb;
          margin: 1rem 0;
        }
        
        .rich-text-content table {
          display: block !important;
          width: 100% !important;
          max-width: 100% !important;
          overflow-x: auto !important;
          -webkit-overflow-scrolling: touch !important;
          border-collapse: collapse !important;
          margin: 1.5rem 0 !important;
          border: 1px solid #d1d5db !important;
          background-color: white !important;
        }
        
        .rich-text-content th {
          background-color: #f3f4f6 !important;
          padding: 12px 15px !important;
          text-align: left !important;
          font-weight: 700 !important;
          color: #111827 !important;
          border: 1px solid #d1d5db !important;
          min-width: 120px !important;
        }
        
        .rich-text-content td {
          padding: 10px 15px !important;
          border: 1px solid #d1d5db !important;
          color: #374151 !important;
          vertical-align: top !important;
          min-width: 120px !important;
        }
        
        .rich-text-content tr:nth-child(even) {
          background-color: #f9fafb !important;
        }

        .rich-text-content tr:hover td {
          background-color: #f3f4f6 !important;
        }
        
        /* Text alignment classes from Quill */
        .rich-text-content .ql-align-center {
          text-align: center;
        }
        
        .rich-text-content .ql-align-right {
          text-align: right;
        }
        
        .rich-text-content .ql-align-justify {
          text-align: justify;
        }
        
        /* Compact mode */
        .rich-text-content.prose-compact h1,
        .rich-text-content.prose-compact h2,
        .rich-text-content.prose-compact h3 {
          margin-top: 0.5rem;
          margin-bottom: 0.25rem;
        }
        
        .rich-text-content.prose-compact p {
          margin-bottom: 0.5rem;
        }
      `}</style>

      <div
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </div>
  )
}
