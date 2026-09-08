import React, { useState, useEffect } from 'react';
import {
  Stack,
  Paper,
  Group,
  Text,
  Badge,
  Card,
  Divider,
  Button,
} from '@mantine/core';
import {
  IconBook2,
  IconInfoCircle,
  IconBrandGithub,
  IconExternalLink,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { AppInfo } from '../../../types/electron';

export const AboutSettingsTab: React.FC = () => {
  const { t } = useTranslation();
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);

  useEffect(() => {
    if (window.electronAPI?.getAppInfo) {
      window.electronAPI
        .getAppInfo()
        .then((info) => {
          setAppInfo(info);
        })
        .catch((err) => {
          console.error('Failed to get app info:', err);
        });
    }
  }, []);

  return (
    <Stack gap="lg">
      {/* Header App Info Card */}
      <Paper withBorder p="lg" radius="md" style={{ textAlign: 'center' }}>
        <Stack align="center" gap="xs">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 56,
              height: 56,
              borderRadius: 14,
              backgroundColor: 'var(--mantine-primary-color-filled)',
              color: '#fff',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            }}
          >
            <IconBook2 size={32} stroke={2} />
          </div>
          <Group gap="xs" justify="center" mt="xs">
            <Text
              fw={800}
              size="xl"
              style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}
            >
              Daily Worklog
            </Text>
            <Badge size="lg" variant="gradient" gradient={{ from: 'primary', to: 'indigo', deg: 45 }}>
              v{appInfo?.version || '1.12.0'}
            </Badge>
          </Group>
          <Text size="sm" c="dimmed" style={{ maxWidth: 460 }}>
            {t('settings.appTagline')}
          </Text>
        </Stack>
      </Paper>

      {/* Version & Environment Details */}
      <Paper withBorder p="md" radius="md">
        <Stack gap="sm">
          <Text fw={600} size="sm">
            {t('settings.systemInfo')}
          </Text>
          <Card
            withBorder
            p="sm"
            radius="sm"
            style={{ backgroundColor: 'var(--mantine-color-default-hover)' }}
          >
            <Stack gap={8}>
              <Group justify="space-between">
                <Text size="xs" c="dimmed">
                  {t('settings.appVersion')}:
                </Text>
                <Badge size="sm" variant="filled" color="primary">
                  {appInfo?.version || '1.12.0'}
                </Badge>
              </Group>
              <Divider />
              <Group justify="space-between">
                <Text size="xs" c="dimmed">
                  {t('settings.electronVersion')}:
                </Text>
                <Text size="xs" fw={600} style={{ fontFamily: 'monospace' }}>
                  {appInfo?.electron || (window.electronAPI ? '34.x' : 'Web Renderer')}
                </Text>
              </Group>
              <Divider />
              <Group justify="space-between">
                <Text size="xs" c="dimmed">
                  {t('settings.chromeVersion')}:
                </Text>
                <Text size="xs" fw={600} style={{ fontFamily: 'monospace' }}>
                  {appInfo?.chrome || 'Chromium'}
                </Text>
              </Group>
              <Divider />
              <Group justify="space-between">
                <Text size="xs" c="dimmed">
                  {t('settings.nodeVersion')}:
                </Text>
                <Text size="xs" fw={600} style={{ fontFamily: 'monospace' }}>
                  {appInfo?.node || 'Node.js'}
                </Text>
              </Group>
              <Divider />
              <Group justify="space-between">
                <Text size="xs" c="dimmed">
                  {t('settings.osPlatform')}:
                </Text>
                <Text size="xs" fw={600} style={{ fontFamily: 'monospace' }}>
                  {appInfo?.osRelease ||
                    (window.electronAPI?.platform ||
                      (typeof navigator !== 'undefined' ? navigator.platform : 'Unknown'))}
                </Text>
              </Group>
            </Stack>
          </Card>

          <Group mt="xs" gap="xs">
            <Button
              variant="light"
              size="xs"
              leftSection={<IconInfoCircle size={15} />}
              onClick={() => {
                if (window.electronAPI?.showAboutDialog) {
                  window.electronAPI.showAboutDialog();
                }
              }}
            >
              {t('settings.openNativeAbout')}
            </Button>
          </Group>
        </Stack>
      </Paper>

      {/* Links & License */}
      <Paper withBorder p="md" radius="md">
        <Stack gap="xs">
          <Text fw={600} size="sm">
            {t('settings.links')}
          </Text>
          <Group gap="xs">
            <Button
              variant="default"
              size="xs"
              leftSection={<IconBrandGithub size={15} />}
              rightSection={<IconExternalLink size={13} />}
              onClick={() => {
                if (window.electronAPI?.openExternalUrl) {
                  window.electronAPI.openExternalUrl('https://github.com/renefs/daily-worklogs');
                } else {
                  window.open('https://github.com/renefs/daily-worklogs', '_blank');
                }
              }}
            >
              {t('settings.sourceCode')}
            </Button>
            <Badge size="md" variant="outline" color="gray">
              {t('settings.license')}
            </Badge>
          </Group>
        </Stack>
      </Paper>
    </Stack>
  );
};
