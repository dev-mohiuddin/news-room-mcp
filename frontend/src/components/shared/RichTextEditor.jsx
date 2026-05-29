import { useEffect, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { CitationMark } from "@/components/shared/extensions/CitationMark";
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
  Type,
  Palette,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Font-size mark via TextStyle's `fontSize` attribute.
 *
 * Requirement 4.8: restrict font size to keyword set
 *   {"Small", "Default", "Large"}
 * The keyword is stored on the mark and rendered as inline
 * `style="font-size: <css-value>"` on a <span>.  "Default" is a
 * pass-through (no style attribute emitted) so the prose stylesheet
 * keeps full control of the surrounding paragraph.
 *
 * Mapping:
 *   Small   → 0.875em
 *   Default → (no style emitted)
 *   Large   → 1.25em
 *
 * Marks are inherently range-scoped: TipTap applies them to the
 * editor's current selection only, satisfying requirement 4.9. */
const FONT_SIZE_KEYWORD_TO_CSS = {
  Small: "0.875em",
  Large: "1.25em",
};

const TextStyleWithFontSize = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontSize: {
        default: null,
        parseHTML: (el) => {
          const fs = el.style?.fontSize;
          if (!fs) return null;
          if (fs === "0.875em") return "Small";
          if (fs === "1.25em") return "Large";
          // Any other value round-trips as "Default" (no style emitted)
          return "Default";
        },
        renderHTML: (attrs) => {
          if (!attrs.fontSize || attrs.fontSize === "Default") return {};
          const cssValue = FONT_SIZE_KEYWORD_TO_CSS[attrs.fontSize];
          if (!cssValue) return {};
          return { style: `font-size: ${cssValue}` };
        },
      },
    };
  },
});
/* ------------------------------------------------------------------ */

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
      TextStyleWithFontSize,
      Color,
      CitationMark,
    ],
    content: value || "",
    editable,
    autofocus: autoFocus,
    editorProps: {
      attributes: {
        class:
          "prose prose-invert prose-sm md:prose-base max-w-none focus:outline-none px-4 py-3 prose-headings:font-display prose-a:text-primary prose-headings:mt-6 prose-headings:mb-3 prose-p:my-3 prose-p:leading-relaxed prose-a:underline prose-a:text-primary prose-li:my-1 prose-blockquote:my-4",
        spellcheck: "true",
      },
    },
    onUpdate({ editor }) {
      onChange?.(editor.getHTML());
    },
  });

  /* Keep external value in sync when the document is replaced wholesale
     (e.g. user navigates between articles or hits "Reset edits"). We
     guard against torn-down views (TipTap crashes with
     "Cannot read properties of undefined (reading 'state')" otherwise)
     and normalize empty-string ↔ "<p></p>" so we don't fire `setContent`
     on every render. The microtask defer ensures we never re-enter the
     editor lifecycle during initial mount. */
  useEffect(() => {
    if (!editor || !editor.view) return;
    if (typeof value !== "string") return;
    const current = editor.getHTML();
    const incoming = value === "" ? "<p></p>" : value;
    if (incoming === current) return;
    queueMicrotask(() => {
      if (!editor.view || editor.isDestroyed) return;
      editor.commands.setContent(value || "", false);
    });
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

      <FontSizeAndColorGroup editor={editor} />

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

/* ------------------------------------------------------------------ */
/* Font-size & color toolbar group.
 *
 * Requirement 4.8: provide toolbar controls for font size restricted to
 * the keyword set {"Small", "Default", "Large"} and for color restricted
 * to 3-digit or 6-digit hex values prefixed with `#`. Each selection
 * applies as a TipTap mark scoped to the current selection range.
 *
 * Both controls are disabled while the selection is collapsed
 * (`editor.state.selection.empty`) — applying a mark to an empty range
 * is a no-op, and the disabled state communicates this clearly to the
 * user. The "gated to ranges where the user has selected text"
 * requirement is enforced here. */
const HEX_COLOR_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const FONT_SIZE_OPTIONS = ["Small", "Default", "Large"];

function FontSizeAndColorGroup({ editor }) {
  /* Last-picked color, kept in local UI state so the <input type="color">
     swatch can reflect whatever the user picked even after the mark is
     removed (e.g. via "clear color"). Initialized from the active color
     when the cursor sits inside a colored span; otherwise white. */
  const activeColor = editor.getAttributes("textStyle").color || null;
  const [pickerColor, setPickerColor] = useState(
    activeColor && HEX_COLOR_RE.test(activeColor) ? activeColor : "#ffffff"
  );

  const selectionEmpty = editor.state.selection.empty;
  const activeFontSize =
    editor.getAttributes("textStyle").fontSize || "Default";

  const handleFontSizeChange = (e) => {
    const next = e.target.value;
    if (!FONT_SIZE_OPTIONS.includes(next)) return;
    if (next === "Default") {
      // Remove the fontSize attribute by setting it null; keep other
      // textStyle attrs (e.g. color) intact.
      editor
        .chain()
        .focus()
        .setMark("textStyle", { fontSize: null })
        .run();
    } else {
      editor
        .chain()
        .focus()
        .setMark("textStyle", { fontSize: next })
        .run();
    }
  };

  const handleColorChange = (e) => {
    const next = e.target.value;
    // <input type="color"> always emits #rrggbb, but validate anyway so
    // we only ever hand the editor a value matching requirement 4.8.
    if (!HEX_COLOR_RE.test(next)) return;
    setPickerColor(next);
    editor.chain().focus().setColor(next).run();
  };

  const handleClearColor = () => {
    editor.chain().focus().unsetColor().run();
  };

  return (
    <Group>
      <label
        className={cn(
          "flex items-center gap-1 px-1 h-7 rounded text-xs text-muted-foreground",
          selectionEmpty && "opacity-50"
        )}
        title="Font size (select text first)"
      >
        <Type className="h-3.5 w-3.5" aria-hidden />
        <select
          aria-label="Font size"
          disabled={selectionEmpty}
          value={activeFontSize}
          onChange={handleFontSizeChange}
          className={cn(
            "bg-transparent text-xs outline-none rounded px-1 py-0.5",
            "focus:ring-1 focus:ring-primary/40",
            "disabled:cursor-not-allowed"
          )}
        >
          <option value="Small">S</option>
          <option value="Default">Default</option>
          <option value="Large">L</option>
        </select>
      </label>
      <label
        className={cn(
          "flex items-center gap-1 px-1 h-7 rounded cursor-pointer",
          selectionEmpty && "opacity-50 cursor-not-allowed"
        )}
        title={selectionEmpty ? "Color (select text first)" : "Text color"}
      >
        <Palette className="h-3.5 w-3.5" aria-hidden />
        <input
          type="color"
          aria-label="Text color"
          disabled={selectionEmpty}
          value={pickerColor}
          onChange={handleColorChange}
          className="h-4 w-5 bg-transparent border-0 p-0 cursor-pointer disabled:cursor-not-allowed"
        />
      </label>
      <ToolButton
        onClick={handleClearColor}
        disabled={selectionEmpty || !activeColor}
        label="Clear color"
      >
        <X className="h-3.5 w-3.5" />
      </ToolButton>
    </Group>
  );
}
/* ------------------------------------------------------------------ */

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
