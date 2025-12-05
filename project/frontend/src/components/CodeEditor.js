import React, { useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';

const CodeEditor = ({ value, onChange, language, readOnly = false, height = '100%' }) => {
  const editorRef = useRef(null);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
  };

  const getLanguageMode = (lang) => {
    const languageMap = {
      python: 'python',
      javascript: 'javascript',
      cpp: 'cpp',
      java: 'java'
    };
    return languageMap[lang] || 'plaintext';
  };

  return (
    <Editor
      height={height}
      language={getLanguageMode(language)}
      value={value}
      onChange={onChange}
      onMount={handleEditorDidMount}
      theme="vs-dark"
      options={{
        readOnly: readOnly,
        minimap: { enabled: false },
        fontSize: 14,
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 4,
        wordWrap: 'on',
        formatOnPaste: true,
        formatOnType: true,
      }}
    />
  );
};

export default CodeEditor;
