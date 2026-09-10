import { useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import type ReactQuill from "react-quill-new";

type QuillProps = React.ComponentProps<typeof ReactQuill>;
type WrapProps = QuillProps & { forwardedRef?: React.Ref<ReactQuill> };

// react-quill-new toca no DOM já no import — carrega só no cliente. next/dynamic não
// encaminha ref sozinho, por isso o wrapper repassa `forwardedRef` (usado para inserir
// os campos {{token}} na posição do cursor).
const ReactQuillNoSSR = dynamic(
  async () => {
    const { default: RQ } = await import("react-quill-new");
    const Wrapped = ({ forwardedRef, ...props }: WrapProps) => <RQ ref={forwardedRef} {...props} />;
    Wrapped.displayName = "ReactQuillWrapped";
    return Wrapped;
  },
  { ssr: false, loading: () => <div style={{ padding: "1rem", opacity: 0.6 }}>Carregando editor…</div> }
);

export interface MergeToken {
  token: string;
  label: string;
}

interface Props {
  value: string;
  onChange: (html: string) => void;
  /** Campos {{token}} oferecidos no seletor "Inserir campo". */
  tokens?: MergeToken[];
  placeholder?: string;
}

const MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["clean"],
  ],
};

export default function RichTextEditor({ value, onChange, tokens = [], placeholder }: Props) {
  const quillRef = useRef<ReactQuill | null>(null);
  const modules = useMemo(() => MODULES, []);

  const insertToken = (token: string) => {
    const editor = quillRef.current?.getEditor?.();
    const text = `{{${token}}}`;
    if (editor) {
      const range = editor.getSelection(true);
      const at = range ? range.index : editor.getLength();
      editor.insertText(at, text, "user");
      editor.setSelection(at + text.length, 0);
    } else {
      onChange(`${value}${text}`);
    }
  };

  return (
    <div>
      {tokens.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Inserir campo:</span>
          <select
            defaultValue=""
            onChange={(e) => {
              const v = e.target.value;
              e.currentTarget.value = "";
              if (v) insertToken(v);
            }}
            style={{ maxWidth: 300, padding: "0.35rem 0.5rem", borderRadius: 8, border: "1px solid var(--border)" }}
          >
            <option value="" disabled>Escolha um campo…</option>
            {tokens.map((t) => (
              <option key={t.token} value={t.token}>{t.label}</option>
            ))}
          </select>
        </div>
      )}
      <ReactQuillNoSSR
        forwardedRef={quillRef}
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        placeholder={placeholder}
      />
    </div>
  );
}
