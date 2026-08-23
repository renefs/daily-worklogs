import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import { Paper, ScrollArea, Checkbox, CopyButton, ActionIcon, Tooltip } from '@mantine/core';
import { IconCopy, IconCheck, IconCode } from '@tabler/icons-react';
import { useAppStore } from '../../store/useAppStore';

interface MarkdownViewerProps {
  content?: string;
  allowToggleTasks?: boolean;
}

function extractRawText(node: React.ReactNode): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractRawText).join('');
  if (React.isValidElement(node) && node.props && (node.props as { children?: React.ReactNode }).children) {
    return extractRawText((node.props as { children?: React.ReactNode }).children);
  }
  return '';
}

export const MarkdownViewer: React.FC<MarkdownViewerProps> = ({
  content,
  allowToggleTasks = true,
}) => {
  const { activeNote, toggleTaskInNote } = useAppStore();
  const markdownText = content !== undefined ? content : activeNote?.content || '';

  return (
    <Paper
      p="md"
      withBorder
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 8,
        backgroundColor: 'var(--mantine-color-body)',
      }}
    >
      <ScrollArea style={{ flex: 1 }} type="auto" offsetScrollbars>
        <div className="markdown-body selectable-text">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw, rehypeHighlight]}
            components={{
              // Custom interactive checkbox renderer
              li({ children, ...props }) {
                // Check if this is a task list item
                const isTask = Array.isArray(children) && children.length > 0 && 
                  typeof children[0] === 'object' && 
                  children[0] !== null && 
                  'type' in children[0] && 
                  children[0].type === 'input';

                if (isTask) {
                  const inputElement = children[0] as React.ReactElement;
                  const isChecked = inputElement.props.checked;
                  
                  // Extract remaining text after input
                  const textParts = children.slice(1);
                  const textContent = textParts
                    .map(child => (typeof child === 'string' ? child : ''))
                    .join('')
                    .trim();

                  return (
                    <li className="task-list-item" style={{ listStyle: 'none' }} {...props}>
                      <Checkbox
                        size="xs"
                        checked={isChecked}
                        disabled={!allowToggleTasks}
                        onChange={(e) => {
                          if (allowToggleTasks && textContent) {
                            toggleTaskInNote(textContent, e.currentTarget.checked);
                          }
                        }}
                        style={{ marginTop: 3 }}
                      />
                      <span>{textParts}</span>
                    </li>
                  );
                }

                return <li {...props}>{children}</li>;
              },

              // Custom pre / code block wrapper with header and copy button
              pre({ children, ...props }) {
                let language = '';
                let rawCode = '';

                if (React.isValidElement(children)) {
                  const codeProps = children.props as { className?: string; children?: React.ReactNode };
                  const match = /language-([a-zA-Z0-9_-]+)/.exec(codeProps.className || '');
                  if (match) {
                    language = match[1];
                  }
                  rawCode = extractRawText(codeProps.children);
                } else {
                  rawCode = extractRawText(children);
                }

                return (
                  <div className="markdown-codeblock-container">
                    <div className="markdown-codeblock-header">
                      <span className="markdown-codeblock-lang">
                        <IconCode size={13} style={{ marginRight: 4, verticalAlign: -2 }} />
                        {language ? language.toUpperCase() : 'CODE'}
                      </span>
                      {rawCode && (
                        <CopyButton value={rawCode.trimEnd()} timeout={2000}>
                          {({ copied, copy }) => (
                            <Tooltip label={copied ? 'Copied!' : 'Copy code'} withArrow position="left">
                              <ActionIcon
                                variant="subtle"
                                color={copied ? 'teal' : 'gray'}
                                size="xs"
                                onClick={copy}
                                className="markdown-codeblock-copy-btn"
                              >
                                {copied ? <IconCheck size={13} /> : <IconCopy size={13} />}
                              </ActionIcon>
                            </Tooltip>
                          )}
                        </CopyButton>
                      )}
                    </div>
                    <pre className="markdown-codeblock-pre" {...props}>
                      {children}
                    </pre>
                  </div>
                );
              },

              // Custom inline code
              code({ className, children, ...props }) {
                const isCodeBlock = className?.includes('language-') || className?.includes('hljs');
                if (isCodeBlock) {
                  return (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                }
                return (
                  <code className="markdown-inline-code" {...props}>
                    {children}
                  </code>
                );
              },

              // Custom image renderer with local vault support
              img({ src, alt, ...props }) {
                if (!src) return null;
                let resolvedSrc = src;
                if (
                  !/^https?:\/\//i.test(src) &&
                  !src.startsWith('data:') &&
                  !src.startsWith('worklog-media://')
                ) {
                  const cleanPath = src.replace(/^\.?\/+/, '');
                  resolvedSrc = `worklog-media://vault/${cleanPath}`;
                }

                return (
                  <span className="cm-live-image-card" style={{ margin: '8px 0', display: 'inline-flex' }}>
                    <span className="cm-live-image-wrapper">
                      <img
                        src={resolvedSrc}
                        alt={alt || 'Image'}
                        loading="lazy"
                        className="cm-live-image-img"
                        onError={(e) => {
                          const target = e.currentTarget;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent && !parent.querySelector('.cm-live-image-error')) {
                            const err = document.createElement('span');
                            err.className = 'cm-live-image-error';
                            err.innerHTML = `<span>Image not found: <strong>${src}</strong></span>`;
                            parent.appendChild(err);
                          }
                        }}
                        {...props}
                      />
                    </span>
                    {alt && (
                      <span className="cm-live-image-caption">
                        <span className="cm-live-image-caption-text">{alt}</span>
                        <span className="cm-live-image-caption-badge">{src.split('/').pop() || 'image'}</span>
                      </span>
                    )}
                  </span>
                );
              },
            }}
          >
            {markdownText || '_No content_'}
          </ReactMarkdown>
        </div>
      </ScrollArea>
    </Paper>
  );
};
