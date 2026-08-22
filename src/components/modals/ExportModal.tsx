import React, { useState } from 'react';
import {
  Modal,
  Button,
  Group,
  Stack,
  Radio,
  Text,
  TextInput,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconFileExport } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

interface ExportModalProps {
  opened: boolean;
  onClose: () => void;
  title: string;
  content: string;
  defaultFileName?: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  opened,
  onClose,
  title,
  content,
  defaultFileName = 'worklog-export',
}) => {
  const { t } = useTranslation();
  const [format, setFormat] = useState<'md' | 'html' | 'txt'>('md');
  const [fileName, setFileName] = useState(defaultFileName);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!window.electronAPI) return;
    setIsExporting(true);
    try {
      let finalContent = content;
      if (format === 'html') {
        finalContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #222; }
    h1, h2, h3 { color: #111; border-bottom: 1px solid #eaeaea; padding-bottom: 4px; }
    code { background: #f4f4f5; padding: 2px 5px; border-radius: 4px; font-size: 0.9em; font-family: monospace; }
    pre { background: #f4f4f5; padding: 12px; border-radius: 6px; overflow-x: auto; }
    blockquote { border-left: 4px solid #3b82f6; margin: 0; padding-left: 16px; color: #555; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th, td { border: 1px solid #ddd; padding: 8px 12px; }
    th { background: #f8f9fa; }
  </style>
</head>
<body>
  ${content
    .split('\n\n')
    .map((block) => {
      if (block.startsWith('# ')) return `<h1>${block.replace('# ', '')}</h1>`;
      if (block.startsWith('## ')) return `<h2>${block.replace('## ', '')}</h2>`;
      if (block.startsWith('### ')) return `<h3>${block.replace('### ', '')}</h3>`;
      if (block.startsWith('> ')) return `<blockquote>${block.replace('> ', '')}</blockquote>`;
      return `<p>${block.replace(/\n/g, '<br>')}</p>`;
    })
    .join('\n')}
</body>
</html>`;
      }

      const res = await window.electronAPI.exportDocument({
        title,
        defaultPath: `${fileName}.${format}`,
        content: finalContent,
        format,
      });

      if (res.success) {
        notifications.show({
          title: t('common.export'),
          message: `Saved to ${res.filePath}`,
          color: 'teal',
          icon: <IconCheck size={16} />,
        });
        onClose();
      }
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t('weekly.exportReport')}
      centered
      radius="md"
    >
      <Stack gap="md">
        <TextInput
          label="File Name"
          value={fileName}
          onChange={(e) => setFileName(e.currentTarget.value)}
        />

        <div>
          <Text size="sm" fw={500} mb={6}>
            Format
          </Text>
          <Radio.Group value={format} onChange={(val) => setFormat(val as any)}>
            <Stack gap="xs">
              <Radio value="md" label="Markdown (.md) - Standard portable markdown" />
              <Radio value="html" label="HTML (.html) - Formatted standalone web page" />
              <Radio value="txt" label="Plain Text (.txt) - Raw text" />
            </Stack>
          </Radio.Group>
        </div>

        <Group justify="flex-end" gap="xs" mt="md">
          <Button variant="default" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            leftSection={<IconFileExport size={16} />}
            onClick={handleExport}
            loading={isExporting}
          >
            {t('common.export')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
