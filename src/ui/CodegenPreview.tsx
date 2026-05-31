import type { GeneratedFile } from '../model/project';
import { messages } from '../i18n/messages.en';

interface CodegenPreviewProps {
  files: GeneratedFile[];
}

export function CodegenPreview({ files }: CodegenPreviewProps) {
  if (files.length === 0) {
    return null;
  }

  return (
    <section className="panel codegen-preview" aria-labelledby="codegen-title">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">{messages.panels.codegen.eyebrow}</p>
          <h2 id="codegen-title">FreeRTOS Preview</h2>
        </div>
        <span className="count-pill">{files.length} files</span>
      </div>
      {files.map((file) => (
        <details key={file.path} open={file.path.endsWith('.c')}>
          <summary>{file.path}</summary>
          <pre>{file.content}</pre>
        </details>
      ))}
    </section>
  );
}
