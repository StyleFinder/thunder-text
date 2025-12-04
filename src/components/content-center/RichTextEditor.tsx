"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import DOMPurify from "dompurify";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  Check,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  readOnly?: boolean;
  minHeight?: string;
  className?: string;
}

/**
 * SECURITY [R-09CB5]: DOMPurify configuration for XSS-safe rich text editing
 *
 * This component MUST use innerHTML for WYSIWYG functionality (textContent strips formatting).
 * XSS is prevented via DOMPurify sanitization with defense-in-depth configuration:
 *
 * 1. ALLOWED_TAGS whitelist - Only safe formatting tags permitted
 * 2. ALLOWED_ATTR whitelist - Only safe attributes permitted
 * 3. FORBID_TAGS blacklist - Dangerous tags explicitly blocked
 * 4. FORBID_ATTR blacklist - All event handlers blocked
 * 5. ALLOW_DATA_ATTR: false - Prevents data attribute abuse
 * 6. RETURN_DOM_FRAGMENT: false - Returns string, not DOM (default)
 *
 * DOMPurify is the industry-standard sanitization library recommended by OWASP.
 * See: https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html
 */
const DOMPURIFY_CONFIG = {
  // SECURITY: Strict allowlist of safe formatting tags only
  ALLOWED_TAGS: [
    "p",
    "br",
    "b",
    "i",
    "u",
    "strong",
    "em",
    "span",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "ul",
    "ol",
    "li",
    "blockquote",
    "a",
    "div",
  ],
  // SECURITY: Strict allowlist of safe attributes only
  ALLOWED_ATTR: ["href", "target", "rel", "class", "style"],
  // SECURITY: Block data-* attributes which can be abused for data exfiltration
  ALLOW_DATA_ATTR: false,
  // Add target attribute for links (opens in new tab)
  ADD_ATTR: ["target"],
  // SECURITY: Explicit blocklist of dangerous elements (defense-in-depth)
  FORBID_TAGS: [
    "script",
    "iframe",
    "object",
    "embed",
    "form",
    "input",
    "svg",
    "math",
    "template",
    "noscript",
  ],
  // SECURITY: Block ALL event handlers (comprehensive list for defense-in-depth)
  FORBID_ATTR: [
    "onerror",
    "onload",
    "onclick",
    "onmouseover",
    "onmouseout",
    "onmousedown",
    "onmouseup",
    "onfocus",
    "onblur",
    "onchange",
    "onsubmit",
    "onreset",
    "onselect",
    "onkeydown",
    "onkeypress",
    "onkeyup",
    "ondblclick",
    "oncontextmenu",
    "ondrag",
    "ondragend",
    "ondragenter",
    "ondragleave",
    "ondragover",
    "ondragstart",
    "ondrop",
    "onscroll",
    "oncopy",
    "oncut",
    "onpaste",
    "onwheel",
    "ontouchstart",
    "ontouchend",
    "ontouchmove",
    "onanimationstart",
    "onanimationend",
    "ontransitionend",
    "onpointerdown",
  ],
  // SECURITY: Sanitize href attributes to prevent javascript: URLs
  ALLOWED_URI_REGEXP:
    /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
};

/**
 * Sanitizes HTML content to prevent XSS attacks
 * Uses DOMPurify with strict configuration for rich text editing
 */
function sanitizeHtml(html: string): string {
  if (typeof window === "undefined") return html;
  return DOMPurify.sanitize(html, DOMPURIFY_CONFIG);
}

export function RichTextEditor({
  content,
  onChange,
  readOnly = false,
  minHeight = "400px",
  className = "",
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Memoize sanitized content to avoid unnecessary re-sanitization
  const sanitizedContent = useCallback(() => sanitizeHtml(content), [content]);

  useEffect(() => {
    if (editorRef.current) {
      const sanitized = sanitizedContent();
      // Only update if content actually changed (prevents cursor jump)
      if (sanitized !== editorRef.current.innerHTML) {
        // SECURITY [R-09CB5]: innerHTML is REQUIRED for WYSIWYG rich text editing.
        // textContent would strip all formatting (bold, italic, links, etc.).
        // XSS is prevented by DOMPurify sanitization with:
        // - Strict tag allowlist (only formatting tags)
        // - Strict attribute allowlist (no event handlers)
        // - javascript: URL blocking via ALLOWED_URI_REGEXP
        // - Comprehensive event handler blocklist

        editorRef.current.innerHTML = sanitized;
      }
    }
  }, [sanitizedContent]);

  const handleInput = () => {
    if (editorRef.current && !readOnly) {
      onChange(editorRef.current.innerHTML);
      updateUndoRedoState();
    }
  };

  const updateUndoRedoState = () => {
    setCanUndo(document.queryCommandEnabled("undo"));
    setCanRedo(document.queryCommandEnabled("redo"));
  };

  const execCommand = (command: string, value?: string) => {
    if (readOnly) return;
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  const handleCopy = async () => {
    if (editorRef.current) {
      const text = editorRef.current.innerText;
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const formatButtons = [
    {
      icon: Bold,
      label: "Bold",
      command: "bold",
      shortcut: "Cmd+B",
    },
    {
      icon: Italic,
      label: "Italic",
      command: "italic",
      shortcut: "Cmd+I",
    },
    {
      icon: Underline,
      label: "Underline",
      command: "underline",
      shortcut: "Cmd+U",
    },
    {
      icon: Heading1,
      label: "Heading 1",
      command: "formatBlock",
      value: "<h1>",
    },
    {
      icon: Heading2,
      label: "Heading 2",
      command: "formatBlock",
      value: "<h2>",
    },
    {
      icon: List,
      label: "Bullet List",
      command: "insertUnorderedList",
    },
    {
      icon: ListOrdered,
      label: "Numbered List",
      command: "insertOrderedList",
    },
    {
      icon: Quote,
      label: "Quote",
      command: "formatBlock",
      value: "<blockquote>",
    },
    {
      icon: Link,
      label: "Insert Link",
      command: "createLink",
      customHandler: () => {
        const url = prompt("Enter URL:");
        if (url) execCommand("createLink", url);
      },
    },
  ];

  const utilityButtons = [
    {
      icon: Undo,
      label: "Undo",
      command: "undo",
      disabled: !canUndo,
      shortcut: "Cmd+Z",
      variant: "ghost" as const,
    },
    {
      icon: Redo,
      label: "Redo",
      command: "redo",
      disabled: !canRedo,
      shortcut: "Cmd+Shift+Z",
      variant: "ghost" as const,
    },
    {
      icon: isCopied ? Check : Copy,
      label: isCopied ? "Copied!" : "Copy to clipboard",
      customHandler: handleCopy,
      disabled: false,
      variant: isCopied ? "default" : "outline",
    },
  ];

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
                  const Icon = button.icon;
                  return (
                    <Tooltip key={idx}>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (button.customHandler) {
                              button.customHandler();
                            } else {
                              execCommand(button.command, button.value);
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
                  );
                })}
              </div>

              {/* Utility Buttons */}
              <div className="flex gap-1">
                {utilityButtons.map((button, idx) => {
                  const Icon = button.icon;
                  return (
                    <Tooltip key={idx}>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant={
                            (button.variant || "ghost") as
                              | "default"
                              | "link"
                              | "secondary"
                              | "destructive"
                              | "outline"
                              | "ghost"
                          }
                          onClick={() => {
                            if (button.customHandler) {
                              button.customHandler();
                            } else {
                              execCommand(button.command);
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
                  );
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
            ${readOnly ? "cursor-default" : "cursor-text"}
          `}
          style={{ minHeight }}
          suppressContentEditableWarning
        />

        {/* Read-only copy button */}
        {readOnly && (
          <div className="border-t p-3 bg-muted/30 flex justify-end">
            <Button
              size="sm"
              variant={isCopied ? "default" : "outline"}
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
  );
}
