import { useEffect, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Undo,
  Redo,
  Minus,
  Eraser,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Reusable TipTap-based rich-text editor.
 *
 * Props:
 *  - value:        HTML string (initial / controlled value)
 *  - onChange:     (html) => void — called on every change
 *  - placeholder:  string
 *  - editable:     boolean — toggle read-only mode
 *  - className:    extra classes for the outer wrapper
 *  - autoFocus:    boolean
 *  - minHeight:    e.g. "320px"
 */
export default function RichTextEditor({
  value = "",
  onChange,
  placeholder = "Start writing…",
  editable = true,
  className,
  autoFocus = false,
  minHeight = "320px",
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        codeBlock: false,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        protocols: ["http", "https", "mailto"],
        HTMLAttributes: {
          class: "text-primary underline underline-offset-2",
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value || "",
    editable,
    autofocus: autoFocus,
    editorProps: {
      attributes: {
        class:
          "prose prose-invert prose-sm md:prose-base max-w-none focus:outline-none px-4 py-3 prose-headings:font-display prose-a:text-primary",
        spellcheck: "true",
      },
    },
    onUpdate({ editor }) {
      onChange?.(editor.getHTML());
    },
  });

  /* Keep external value in sync when the document is replaced wholesale
     (e.g. user navigates between articles or hits "Reset edits"). */
  useEffect(() => {
    if (!editor) return;
    if (typeof value !== "string") return;
    if (value === editor.getHTML()) return;
    editor.commands.setContent(value || "", false);
  }, [value, editor]);

  /* Reflect editable changes after mount */
  useEffect(() => {
    if (!editor) return;
    editor.setEditable(editable);
  }, [editable, editor]);

  if (!editor) {
    return (
      <div
        className={cn(
          "glass border border-white/10 rounded-lg animate-pulse",
          className
        )}
        style={{ minHeight }}
      />
    );
  }

  return (
    <div
      className={cn(
        "glass border border-white/10 rounded-lg overflow-hidden",
        className
      )}
    >
      {editable && <Toolbar editor={editor} />}
      <div
        className="overflow-auto"
        style={{ minHeight }}
        onClick={() => editor.commands.focus()}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function Toolbar({ editor }) {
  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-white/5 bg-white/2 px-2 py-1.5 sticky top-0 z-10 backdrop-blur-md">
      <Group>
        <ToolButton
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
          label="Bold"
        >
          <Bold className="h-3.5 w-3.5" />
        </ToolButton>
        <ToolButton
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          label="Italic"
        >
          <Italic className="h-3.5 w-3.5" />
        </ToolButton>
        <ToolButton
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          label="Strike"
        >
          <Strikethrough className="h-3.5 w-3.5" />
        </ToolButton>
        <ToolButton
          active={editor.isActive("code")}
          onClick={() => editor.chain().focus().toggleCode().run()}
          label="Inline code"
        >
          <Code className="h-3.5 w-3.5" />
        </ToolButton>
      </Group>

      <Divider />

      <Group>
        <ToolButton
          active={editor.isActive("heading", { level: 2 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          label="Heading 2"
        >
          <Heading2 className="h-3.5 w-3.5" />
        </ToolButton>
        <ToolButton
          active={editor.isActive("heading", { level: 3 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          label="Heading 3"
        >
          <Heading3 className="h-3.5 w-3.5" />
        </ToolButton>
      </Group>

      <Divider />

      <Group>
        <ToolButton
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          label="Bulleted list"
        >
          <List className="h-3.5 w-3.5" />
        </ToolButton>
        <ToolButton
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          label="Numbered list"
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolButton>
        <ToolButton
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          label="Quote"
        >
          <Quote className="h-3.5 w-3.5" />
        </ToolButton>
        <ToolButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          label="Divider"
        >
          <Minus className="h-3.5 w-3.5" />
        </ToolButton>
      </Group>

      <Divider />

      <Group>
        <ToolButton
          active={editor.isActive("link")}
          onClick={() => promptLink(editor)}
          label="Link"
        >
          <LinkIcon className="h-3.5 w-3.5" />
        </ToolButton>
        <ToolButton
          onClick={() =>
            editor
              .chain()
              .focus()
              .unsetAllMarks()
              .clearNodes()
              .run()
          }
          label="Clear formatting"
        >
          <Eraser className="h-3.5 w-3.5" />
        </ToolButton>
      </Group>

      <div className="ml-auto flex items-center gap-0.5">
        <ToolButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          label="Undo"
        >
          <Undo className="h-3.5 w-3.5" />
        </ToolButton>
        <ToolButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          label="Redo"
        >
          <Redo className="h-3.5 w-3.5" />
        </ToolButton>
      </div>
    </div>
  );
}

function promptLink(editor) {
  const previous = editor.getAttributes("link")?.href || "";
  // eslint-disable-next-line no-alert
  const url = window.prompt("Link URL (leave empty to remove)", previous);
  if (url === null) return; // cancelled
  if (url === "") {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    return;
  }
  // Auto-prefix protocol when missing
  const safeUrl = /^(https?:|mailto:)/i.test(url) ? url : `https://${url}`;
  editor.chain().focus().extendMarkRange("link").setLink({ href: safeUrl }).run();
}

function Group({ children }) {
  return <div className="flex items-center gap-0.5">{children}</div>;
}

function Divider() {
  return <span className="mx-1 h-5 w-px bg-white/10" aria-hidden />;
}

function ToolButton({ children, label, active, onClick, disabled }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      title={label}
      aria-label={label}
      className={cn(
        "h-7 w-7",
        active && "bg-primary/15 text-primary hover:bg-primary/20"
      )}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </Button>
  );
}
