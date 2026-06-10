import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import {
  Bold,
  Italic,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Heading2,
  Heading3,
  Link as LinkIcon,
  Image as ImageIcon,
  Undo,
  Redo,
  Wand2,
} from "lucide-react";
import { useCallback, useState } from "react";
import { MediaLibraryPicker } from "../uploads/MediaLibraryPicker";
import { AIGeneratorModal } from "./AIGeneratorModal";

export function RichTextEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [mediaOpen, setMediaOpen] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const editor = useEditor({
    extensions: [StarterKit, Link.configure({ openOnClick: false }), Image],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm dark:prose-invert max-w-none min-h-[300px] p-4 outline-none focus:ring-0",
      },
    },
  });

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("URL", previousUrl);
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  const addImage = useCallback(() => {
    setMediaOpen(true);
  }, []);

  if (!editor) return null;

  const btnClass =
    "p-1.5 rounded hover:bg-surface-alt text-muted-foreground hover:text-foreground disabled:opacity-50";
  const activeClass = "bg-surface-alt text-foreground";

  return (
    <div className="border border-input rounded-md overflow-hidden bg-surface">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-border p-1 bg-surface-alt/30">
        <button
          type="button"
          onClick={() => setAiModalOpen(true)}
          className={`${btnClass} text-brand hover:text-brand-foreground hover:bg-brand/10`}
          title="Gerar conteúdo com IA"
        >
          <Wand2 className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-border mx-1" />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`${btnClass} ${editor.isActive("bold") ? activeClass : ""}`}
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`${btnClass} ${editor.isActive("italic") ? activeClass : ""}`}
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`${btnClass} ${editor.isActive("strike") ? activeClass : ""}`}
        >
          <Strikethrough className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-border mx-1" />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`${btnClass} ${editor.isActive("heading", { level: 2 }) ? activeClass : ""}`}
        >
          <Heading2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`${btnClass} ${editor.isActive("heading", { level: 3 }) ? activeClass : ""}`}
        >
          <Heading3 className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-border mx-1" />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`${btnClass} ${editor.isActive("bulletList") ? activeClass : ""}`}
        >
          <List className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`${btnClass} ${editor.isActive("orderedList") ? activeClass : ""}`}
        >
          <ListOrdered className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`${btnClass} ${editor.isActive("blockquote") ? activeClass : ""}`}
        >
          <Quote className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-border mx-1" />
        <button
          type="button"
          onClick={setLink}
          className={`${btnClass} ${editor.isActive("link") ? activeClass : ""}`}
        >
          <LinkIcon className="w-4 h-4" />
        </button>
        <button type="button" onClick={addImage} className={btnClass}>
          <ImageIcon className="w-4 h-4" />
        </button>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className={btnClass}
        >
          <Undo className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className={btnClass}
        >
          <Redo className="w-4 h-4" />
        </button>
      </div>
      <EditorContent editor={editor} />
      <MediaLibraryPicker
        open={mediaOpen}
        onOpenChange={setMediaOpen}
        onSelect={(url) => {
          editor.chain().focus().setImage({ src: url }).run();
        }}
      />
      <AIGeneratorModal
        open={aiModalOpen}
        onOpenChange={setAiModalOpen}
        onGenerate={(html) => {
          editor.commands.insertContent(html);
        }}
      />
    </div>
  );
}
