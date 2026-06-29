import React, { useRef, useState } from 'react';
import Editor, { useMonaco } from '@monaco-editor/react';

export function CodeViewer({ content, language, onChange }: { content: string, language?: string, onChange?: (val: string | undefined) => void }) {
  const editorRef = useRef<any>(null);
  
  function handleEditorDidMount(editor: any, monaco: any) {
    editorRef.current = editor;
  }

  return (
    <div className="w-full h-full">
      <Editor
        height="100%"
        language={language || 'typescript'}
        theme="vs-dark"
        value={content}
        onChange={onChange}
        onMount={handleEditorDidMount}
        options={{
          readOnly: !onChange,
          minimap: { enabled: true },
          wordWrap: 'on',
          scrollBeyondLastLine: false,
          fontSize: 13,
          lineNumbers: 'on',
          folding: true,
          renderWhitespace: 'none',
          smoothScrolling: true,
          cursorBlinking: 'smooth',
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        }}
      />
    </div>
  );
}
