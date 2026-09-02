import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { Paper, ScrollArea, Checkbox, CopyButton, ActionIcon, Tooltip } from '@mantine/core';
import { IconCopy, IconCheck, IconCode } from '@tabler/icons-react';
import { useAppStoreSelector } from '../../store/useAppStore';
import { useTranslation } from 'react-i18next';

export interface MarkdownViewerProps {
  content?: string;
  allowToggleTasks?: boolean;
  onToggleTask?: (taskText: string, checked: boolean) => void;
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

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9áéíóúñü]+/g, '-').replace(/(^-|-$)/g, '');
}

export const MarkdownViewer: React.FC<MarkdownViewerProps> = ({
  content,
  allowToggleTasks = true,
  onToggleTask,
}) => {
  const { t } = useTranslation();
  const { activeNote, toggleTaskInNote } = useAppStoreSelector((state) => ({
    activeNote: state.activeNote,
    toggleTaskInNote: state.toggleTaskInNote,
  }));
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
        backgroundColor: 'var(--app-card-bg)',
        borderColor: 'var(--app-card-border)',
      }}
    >
      <ScrollArea style={{ flex: 1 }} type="auto" offsetScrollbars>
        <div className="markdown-body selectable-text">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[
              rehypeRaw,
              [rehypeSanitize, {
                ...defaultSchema,
                attributes: {
                  ...defaultSchema.attributes,
                  code: [...(defaultSchema.attributes?.code || []), ['className', /^language-./]],
                },
              }],
              rehypeHighlight,
            ]}
            components={{
              h1({ children, ...props }) {
                const { node, ...rest } = props as any;
                const id = slugify(extractRawText(children));
                return <h1 id={id} {...rest}>{children}</h1>;
              },
              h2({ children, ...props }) {
                const { node, ...rest } = props as any;
                const id = slugify(extractRawText(children));
                return <h2 id={id} {...rest}>{children}</h2>;
              },
              h3({ children, ...props }) {
                const { node, ...rest } = props as any;
                const id = slugify(extractRawText(children));
                return <h3 id={id} {...rest}>{children}</h3>;
              },
              // Custom interactive checkbox renderer
              li({ children, ...props }) {
                const { node, ...rest } = props as any;
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
                    <li className="task-list-item" style={{ listStyle: 'none' }} {...rest}>
                      <Checkbox
                        size="xs"
                        checked={isChecked}
                        disabled={!allowToggleTasks}
                        onChange={(e) => {
                          if (allowToggleTasks && textContent) {
                            if (onToggleTask) {
                              onToggleTask(textContent, e.currentTarget.checked);
                            } else {
                              toggleTaskInNote(textContent, e.currentTarget.checked);
                            }
                          }
                        }}
                        style={{ marginTop: 3 }}
                      />
                      <span>{textParts}</span>
                    </li>
                  );
                }

                return <li {...rest}>{children}</li>;
              },

              // Custom pre / code block wrapper with header and copy button
              pre({ children, ...props }) {
                const { node, ...rest } = props as any;
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
                        {language ? language.toUpperCase() : t('common.code')}
                      </span>
                      {rawCode && (
                        <CopyButton value={rawCode.trimEnd()} timeout={2000}>
                          {({ copied, copy }) => (
                            <Tooltip label={copied ? t('common.copied') : t('common.copyCode')} withArrow position="left">
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
                    <pre className="markdown-codeblock-pre" {...rest}>
                      {children}
                    </pre>
                  </div>
                );
              },

              // Custom inline code
              code({ className, children, ...props }) {
                const { node, ...rest } = props as any;
                const isCodeBlock = className?.includes('language-') || className?.includes('hljs');
                if (isCodeBlock) {
                  return (
                    <code className={className} {...rest}>
                      {children}
                    </code>
                  );
                }
                return (
                  <code className="markdown-inline-code" {...rest}>
                    {children}
                  </code>
                );
              },

              // Custom image renderer with local vault support
              img({ src, alt, ...props }) {
                const { node, ...rest } = props as any;
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
                        {...rest}
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
