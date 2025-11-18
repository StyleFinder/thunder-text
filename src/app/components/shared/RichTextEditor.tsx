'use client'

import { useState, useRef, useEffect } from 'react'
import { BlockStack, InlineStack, Button, ButtonGroup, Box } from '@shopify/polaris'
import {
  TextBoldIcon,
  TextItalicIcon,
  TextUnderlineIcon,
  ListBulletedIcon,
  ListNumberedIcon,
  CodeIcon
} from '@shopify/polaris-icons'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  label?: string
}

export function RichTextEditor({ value, onChange, label }: RichTextEditorProps) {
  const [isHtmlMode, setIsHtmlMode] = useState(false)
  const [currentFormat, setCurrentFormat] = useState('p')
  const editorRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Initialize and update editor content when value changes
  useEffect(() => {
    if (editorRef.current && !isHtmlMode && editorRef.current.innerHTML !== value) {
      // Only update if the value actually changed and editor is not focused
      if (document.activeElement !== editorRef.current) {
        editorRef.current.innerHTML = value
      }
    }
  }, [value, isHtmlMode])

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value)
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML)
    }
  }

  const handleFormatChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tag = e.target.value
    setCurrentFormat(tag)

    // Focus editor first
    if (editorRef.current) {
      editorRef.current.focus()

      // Small delay to ensure focus is set
      setTimeout(() => {
        document.execCommand('formatBlock', false, tag)
        if (editorRef.current) {
          onChange(editorRef.current.innerHTML)
        }
      }, 10)
    }
  }

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML)
    }
  }

  const handleHtmlChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value)
  }

  const handleHtmlToggle = () => {
    if (!isHtmlMode && editorRef.current) {
      // Switching to HTML mode - get current content
      const currentHtml = editorRef.current.innerHTML
      onChange(currentHtml)
    }
    setIsHtmlMode(!isHtmlMode)
  }

  const formatOptions = [
    { label: 'Paragraph', value: 'p' },
    { label: 'Heading 1', value: 'h1' },
    { label: 'Heading 2', value: 'h2' },
    { label: 'Heading 3', value: 'h3' },
    { label: 'Heading 4', value: 'h4' },
    { label: 'Heading 5', value: 'h5' },
    { label: 'Heading 6', value: 'h6' },
    { label: 'Blockquote', value: 'blockquote' },
  ]

  return (
    <BlockStack gap="200">
      {label && <label style={{ fontWeight: 500, fontSize: '14px' }}>{label}</label>}

      {/* Toolbar */}
      <Box
        padding="200"
        background="bg-surface-secondary"
        borderRadius="200"
        borderBlockEndWidth="025"
        borderColor="border"
      >
        <InlineStack gap="200" align="space-between">
          <InlineStack gap="200">
            <select
              value={currentFormat}
              onChange={handleFormatChange}
              disabled={isHtmlMode}
              style={{
                minWidth: '140px',
                height: '32px',
                padding: '4px 8px',
                borderRadius: '8px',
                border: '1px solid #c9cccf',
                backgroundColor: isHtmlMode ? '#f1f1f1' : '#fff',
                fontSize: '14px',
                cursor: isHtmlMode ? 'not-allowed' : 'pointer',
                outline: 'none',
              }}
            >
              {formatOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <ButtonGroup variant="segmented">
              <Button
                size="slim"
                icon={TextBoldIcon}
                onClick={() => execCommand('bold')}
                disabled={isHtmlMode}
                accessibilityLabel="Bold"
              />
              <Button
                size="slim"
                icon={TextItalicIcon}
                onClick={() => execCommand('italic')}
                disabled={isHtmlMode}
                accessibilityLabel="Italic"
              />
              <Button
                size="slim"
                icon={TextUnderlineIcon}
                onClick={() => execCommand('underline')}
                disabled={isHtmlMode}
                accessibilityLabel="Underline"
              />
              <Button
                size="slim"
                icon={ListBulletedIcon}
                onClick={() => execCommand('insertUnorderedList')}
                disabled={isHtmlMode}
                accessibilityLabel="Bullet List"
              />
              <Button
                size="slim"
                icon={ListNumberedIcon}
                onClick={() => execCommand('insertOrderedList')}
                disabled={isHtmlMode}
                accessibilityLabel="Numbered List"
              />
            </ButtonGroup>
          </InlineStack>

          <Button
            size="slim"
            icon={CodeIcon}
            onClick={handleHtmlToggle}
            pressed={isHtmlMode}
          >
            {isHtmlMode ? 'Visual' : 'HTML'}
          </Button>
        </InlineStack>
      </Box>

      {/* Editor Area */}
      {isHtmlMode ? (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleHtmlChange}
          style={{
            minHeight: '300px',
            width: '100%',
            padding: '12px',
            border: '1px solid #c9cccf',
            borderRadius: '8px',
            backgroundColor: '#fff',
            fontSize: '12px',
            fontFamily: 'monospace',
            lineHeight: '1.6',
            outline: 'none',
            resize: 'vertical'
          }}
        />
      ) : (
        <>
          <style dangerouslySetInnerHTML={{
            __html: `
              .rich-text-editor-content h1 {
                font-size: 2em !important;
                font-weight: bold !important;
                margin: 0.67em 0 !important;
                display: block !important;
              }
              .rich-text-editor-content h2 {
                font-size: 1.5em !important;
                font-weight: bold !important;
                margin: 0.75em 0 !important;
                display: block !important;
              }
              .rich-text-editor-content h3 {
                font-size: 1.17em !important;
                font-weight: bold !important;
                margin: 0.83em 0 !important;
                display: block !important;
              }
              .rich-text-editor-content h4 {
                font-size: 1em !important;
                font-weight: bold !important;
                margin: 1.12em 0 !important;
                display: block !important;
              }
              .rich-text-editor-content h5 {
                font-size: 0.83em !important;
                font-weight: bold !important;
                margin: 1.5em 0 !important;
                display: block !important;
              }
              .rich-text-editor-content h6 {
                font-size: 0.75em !important;
                font-weight: bold !important;
                margin: 1.67em 0 !important;
                display: block !important;
              }
              .rich-text-editor-content p {
                margin: 1em 0 !important;
                display: block !important;
              }
              .rich-text-editor-content blockquote {
                margin: 1em 0 !important;
                padding-left: 1em !important;
                border-left: 4px solid #ccc !important;
                font-style: italic !important;
                display: block !important;
              }
              .rich-text-editor-content ul, .rich-text-editor-content ol {
                margin: 1em 0 !important;
                padding-left: 2em !important;
                display: block !important;
              }
              .rich-text-editor-content b, .rich-text-editor-content strong {
                font-weight: bold !important;
              }
              .rich-text-editor-content i, .rich-text-editor-content em {
                font-style: italic !important;
              }
              .rich-text-editor-content u {
                text-decoration: underline !important;
              }
            `
          }} />
          <div
            ref={editorRef}
            contentEditable={true}
            onInput={handleInput}
            style={{
              minHeight: '300px',
              padding: '12px',
              border: '1px solid #c9cccf',
              borderRadius: '8px',
              backgroundColor: '#fff',
              fontSize: '14px',
              lineHeight: '1.6',
              outline: 'none',
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word'
            }}
            className="rich-text-editor-content"
          />
        </>
      )}
    </BlockStack>
  )
}
