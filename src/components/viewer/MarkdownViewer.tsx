import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import { Paper, ScrollArea, Checkbox } from '@mantine/core';
import { useAppStore } from '../../store/useAppStore';

interface MarkdownViewerProps {
  content?: string;
  allowToggleTasks?: boolean;
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
            }}
          >
            {markdownText || '_No content_'}
          </ReactMarkdown>
        </div>
      </ScrollArea>
    </Paper>
  );
};
