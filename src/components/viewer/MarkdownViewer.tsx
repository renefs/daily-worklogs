import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import bash from 'highlight.js/lib/languages/bash';
import css from 'highlight.js/lib/languages/css';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import markdown from 'highlight.js/lib/languages/markdown';
import python from 'highlight.js/lib/languages/python';
import sql from 'highlight.js/lib/languages/sql';
import typescript from 'highlight.js/lib/languages/typescript';
import yaml from 'highlight.js/lib/languages/yaml';
import xml from 'highlight.js/lib/languages/xml';
import { createLowlight } from 'lowlight';
import { toText } from 'hast-util-to-text';
import { visit } from 'unist-util-visit';
import type { ElementContent, Root } from 'hast';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { Paper, ScrollArea, Checkbox, CopyButton, ActionIcon, Tooltip } from '@mantine/core';
import { IconCopy, IconCheck, IconCode, IconArrowUpRight } from '@tabler/icons-react';
import { useAppStoreSelector } from '../../store/useAppStore';
import { useTranslation } from 'react-i18next';
import { sanitizeLivePreviewUrl } from '../../utils/urlUtils';
import { parseWikilink } from '../../utils/wikilinkUtils';

const lowlight = createLowlight({ bash, css, javascript, json, markdown, python, sql, typescript, xml, yaml });
lowlight.registerAlias({ bash: ['sh'], javascript: ['js'], markdown: ['md'], python: ['py'], typescript: ['ts'], xml: ['html', 'svg'], yaml: ['yml'] });

const highlightSupportedCode = () => (tree: Root) => {
  visit(tree, 'element', (node, _index, parent) => {
    if (node.tagName !== 'code' || !parent || parent.type !== 'element' || parent.tagName !== 'pre') return;
    const classes = Array.isArray(node.properties.className) ? node.properties.className : [];
    const languageClass = classes.find((className): className is string => typeof className === 'string' && className.startsWith('language-'));
    const language = languageClass?.slice('language-'.length);
    if (!language || !lowlight.registered(language)) return;
    const highlighted = lowlight.highlight(language, toText(node));
    node.properties.className = [...classes, 'hljs'];
    node.children = highlighted.children as ElementContent[];
  });
};

export interface MarkdownViewerProps {
  content?: string;
  allowToggleTasks?: boolean;
  /** Show the per-checkbox "Convert to Task" button (daily notes only). Defaults to true. */
  allowConvertToTask?: boolean;
  onToggleTask?: (taskText: string, checked: boolean) => void;
  onConvertToSubtask?: (taskText: string, checked: boolean) => void;
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
  allowConvertToTask = true,
  onToggleTask,
  onConvertToSubtask,
}) => {
  const { t } = useTranslation();
  const {
    activeNote,
    toggleTaskInNote,
    notesList,
    tasks,
    setSelectedDate,
    setCurrentView,
    openTaskModal,
    openTaskEditor,
  } = useAppStoreSelector((state) => ({
    activeNote: state.activeNote,
    toggleTaskInNote: state.toggleTaskInNote,
    notesList: state.notesList,
    tasks: state.tasks,
    setSelectedDate: state.setSelectedDate,
    setCurrentView: state.setCurrentView,
    openTaskModal: state.openTaskModal,
    openTaskEditor: state.openTaskEditor,
  }));

  const rawText = content !== undefined ? content : activeNote?.content || '';

  const processedText = React.useMemo(() => {
    if (!rawText) return '';
    return rawText.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_m, target, alias) => {
      const cleanTarget = target.trim();
      const label = alias?.trim() || cleanTarget;
      return `[${label}](#wikilink:${encodeURIComponent(cleanTarget)})`;
    });
  }, [rawText]);

  const handleWikilinkClick = React.useCallback(
    (rawTarget: string) => {
      const parsed = parseWikilink(rawTarget);
      if (!parsed) return;

      if (parsed.isDate && parsed.date) {
        void setSelectedDate(parsed.date);
        void setCurrentView('daily');
        return;
      }

      if (parsed.isTask) {
        if (parsed.taskId) {
          const found = tasks.find((t) => t.taskId === parsed.taskId);
          if (found) {
            void openTaskEditor(found);
            return;
          }
        }
        if (parsed.taskFilename) {
          const found = tasks.find(
            (t) => t.filename === parsed.taskFilename || t.filename.endsWith(parsed.taskFilename!)
          );
          if (found) {
            void openTaskEditor(found);
            return;
          }
        }
      }

      const foundTask = tasks.find(
        (t) => t.title.toLowerCase() === rawTarget.toLowerCase()
      );
      if (foundTask) {
        void openTaskEditor(foundTask);
        return;
      }

      const foundNote = notesList.find((n) => n.date === rawTarget);
      if (foundNote) {
        void setSelectedDate(foundNote.date);
        void setCurrentView('daily');
      }
    },
    [tasks, notesList, setSelectedDate, setCurrentView, openTaskEditor]
  );

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
              highlightSupportedCode,
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
                  const isChecked = Boolean(inputElement.props.checked);
                  
                  // Extract remaining text after input
                  const textParts = children.slice(1);
                  const textContent = textParts
                    .map(child => (typeof child === 'string' ? child : ''))
                    .join('')
                    .trim();

                  const isAlreadyLinked = textContent.includes('[[#') || textContent.includes('[[tasks/');

                  return (
                    <li
                      className="task-list-item"
                      style={{ listStyle: 'none', display: 'flex', alignItems: 'center', gap: 6 }}
                      {...rest}
                    >
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
                        style={{ marginTop: 1 }}
                      />
                      <span style={{ flex: 1 }}>{textParts}</span>
                      {allowConvertToTask && !isAlreadyLinked && textContent && (
                        <Tooltip label={t('tasks.convertToTask', 'Convert to Task')} withArrow position="left">
                          <ActionIcon
                            size="xs"
                            variant="subtle"
                            color="blue"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onConvertToSubtask) {
                                onConvertToSubtask(textContent, isChecked);
                              } else {
                                void openTaskModal({
                                  title: textContent,
                                  due: activeNote?.date,
                                  status: isChecked ? 'done' : 'todo',
                                });
                              }
                            }}
                            aria-label={t('tasks.convertToTask', 'Convert to Task')}
                          >
                            <IconArrowUpRight size={13} />
                          </ActionIcon>
                        </Tooltip>
                      )}
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

              a({ href, children, ...props }) {
                const { node, ...rest } = props as any;
                if (href?.startsWith('#wikilink:')) {
                  const target = decodeURIComponent(href.slice('#wikilink:'.length));
                  return (
                    <span
                      className="cm-live-wikilink-badge"
                      title={`Jump to ${target}`}
                      onClick={(e) => {
                        e.preventDefault();
                        handleWikilinkClick(target);
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      {children}
                    </span>
                  );
                }
                const isExternal = href && /^https?:\/\//i.test(href);
                return (
                  <a
                    href={href}
                    onClick={(e) => {
                      if (isExternal && window.electronAPI?.openExternalUrl) {
                        e.preventDefault();
                        void window.electronAPI.openExternalUrl(href);
                      }
                    }}
                    target={isExternal ? '_blank' : undefined}
                    rel={isExternal ? 'noopener noreferrer' : undefined}
                    {...rest}
                  >
                    {children}
                  </a>
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
                const safeSrc = sanitizeLivePreviewUrl(resolvedSrc, true);
                if (!safeSrc) return null;

                return (
                  <span className="cm-live-image-card" style={{ margin: '8px 0', display: 'inline-flex' }}>
                    <span className="cm-live-image-wrapper">
                      <img
                        src={safeSrc}
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
                            const label = document.createElement('span');
                            label.textContent = `${t('editor.imageNotFound')}: ${src}`;
                            err.appendChild(label);
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
            {processedText || '_No content_'}
          </ReactMarkdown>
        </div>
      </ScrollArea>
    </Paper>
  );
};
