'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link,
  Heading1,
  Heading2,
  Quote,
  Undo,
  Redo,
  Copy,
  Check
} from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  readOnly?: boolean
  minHeight?: string
  className?: string
}

export function RichTextEditor({
  content,
  onChange,
  readOnly = false,
  minHeight = '400px',
  className = ''
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [isCopied, setIsCopied] = useState(false)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  useEffect(() => {
    if (editorRef.current && content !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = content
    }
  }, [content])

  const handleInput = () => {
    if (editorRef.current && !readOnly) {
      onChange(editorRef.current.innerHTML)
      updateUndoRedoState()
    }
  }

  const updateUndoRedoState = () => {
    setCanUndo(document.queryCommandEnabled('undo'))
    setCanRedo(document.queryCommandEnabled('redo'))
  }

  const execCommand = (command: string, value?: string) => {
    if (readOnly) return
    document.execCommand(command, false, value)
    editorRef.current?.focus()
    handleInput()
  }

  const handleCopy = async () => {
    if (editorRef.current) {
      const text = editorRef.current.innerText
      await navigator.clipboard.writeText(text)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    }
  }

  const formatButtons = [
    {
      icon: Bold,
      label: 'Bold',
      command: 'bold',
      shortcut: 'Cmd+B'
    },
    {
      icon: Italic,
      label: 'Italic',
      command: 'italic',
      shortcut: 'Cmd+I'
    },
    {
      icon: Underline,
      label: 'Underline',
      command: 'underline',
      shortcut: 'Cmd+U'
    },
    {
      icon: Heading1,
      label: 'Heading 1',
      command: 'formatBlock',
      value: '<h1>'
    },
    {
      icon: Heading2,
      label: 'Heading 2',
      command: 'formatBlock',
      value: '<h2>'
    },
    {
      icon: List,
      label: 'Bullet List',
      command: 'insertUnorderedList'
    },
    {
      icon: ListOrdered,
      label: 'Numbered List',
      command: 'insertOrderedList'
    },
    {
      icon: Quote,
      label: 'Quote',
      command: 'formatBlock',
      value: '<blockquote>'
    },
    {
      icon: Link,
      label: 'Insert Link',
      command: 'createLink',
      customHandler: () => {
        const url = prompt('Enter URL:')
        if (url) execCommand('createLink', url)
      }
    }
  ]

  const utilityButtons = [
    {
      icon: Undo,
      label: 'Undo',
      command: 'undo',
      disabled: !canUndo,
      shortcut: 'Cmd+Z'
    },
    {
      icon: Redo,
      label: 'Redo',
      command: 'redo',
      disabled: !canRedo,
      shortcut: 'Cmd+Shift+Z'
    },
    {
      icon: isCopied ? Check : Copy,
      label: isCopied ? 'Copied!' : 'Copy to clipboard',
      customHandler: handleCopy,
      disabled: false,
      variant: isCopied ? 'default' : 'outline'
    }
  ]

  return (
    <Card className={className}>
      <CardContent className="p-0">
        {/* Toolbar */}
        {!readOnly && (
          <div className="border-b p-2 flex flex-wrap gap-1 bg-muted/30">
            <TooltipProvider>
              {/* Format Buttons */}
              <div className="flex gap-1 pr-2 border-r">
                {formatButtons.map((button, idx) => {
                  const Icon = button.icon
                  return (
                    <Tooltip key={idx}>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (button.customHandler) {
                              button.customHandler()
                            } else {
                              execCommand(button.command, button.value)
                            }
                          }}
                          className="h-8 w-8 p-0"
                        >
                          <Icon className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">
                          {button.label}
                          {button.shortcut && (
                            <span className="ml-2 text-muted-foreground">
                              {button.shortcut}
                            </span>
                          )}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  )
                })}
              </div>

              {/* Utility Buttons */}
              <div className="flex gap-1">
                {utilityButtons.map((button, idx) => {
                  const Icon = button.icon
                  return (
                    <Tooltip key={idx}>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant={(button.variant as any) || 'ghost'}
                          onClick={() => {
                            if (button.customHandler) {
                              button.customHandler()
                            } else {
                              execCommand(button.command)
                            }
                          }}
                          disabled={button.disabled}
                          className="h-8 w-8 p-0"
                        >
                          <Icon className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">
                          {button.label}
                          {button.shortcut && (
                            <span className="ml-2 text-muted-foreground">
                              {button.shortcut}
                            </span>
                          )}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  )
                })}
              </div>
            </TooltipProvider>
          </div>
        )}

        {/* Editor */}
        <div
          ref={editorRef}
          contentEditable={!readOnly}
          onInput={handleInput}
          className={`
            prose prose-sm max-w-none p-6 focus:outline-none
            ${readOnly ? 'cursor-default' : 'cursor-text'}
          `}
          style={{ minHeight }}
          suppressContentEditableWarning
        />

        {/* Read-only copy button */}
        {readOnly && (
          <div className="border-t p-3 bg-muted/30 flex justify-end">
            <Button
              size="sm"
              variant={isCopied ? 'default' : 'outline'}
              onClick={handleCopy}
            >
              {isCopied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy to Clipboard
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
