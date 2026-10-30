import React from 'react';
import { Stack, Paper, Group, Text, Badge, Card, Divider, Button } from '@mantine/core';
import { IconBook2, IconBrandGithub, IconExternalLink } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useAppStoreSelector } from '../../../store/useAppStore';
import { SettingsSection } from '../SettingsSection';
import classes from './AboutSection.module.css';

const REPOSITORY_URL = 'https://github.com/renefs/daily-worklogs';

interface DetailRowProps {
  label: string;
  value: string;
}

const DetailRow: React.FC<DetailRowProps> = ({ label, value }) => (
  <Group justify="space-between">
    <Text size="xs" c="dimmed">
      {label}:
    </Text>
    <Text size="xs" fw={600} className={classes.mono}>
      {value}
    </Text>
  </Group>
);

export const AboutSection: React.FC = () => {
  const { t } = useTranslation();
  const { appInfo, openExternalUrl } = useAppStoreSelector((state) => ({
    appInfo: state.appInfo,
    openExternalUrl: state.openExternalUrl,
  }));

  const unknown = t('settings.unknownValue');

  return (
    <SettingsSection title={t('settings.about')} description={t('settings.aboutDescription')}>
      <Stack gap="lg">
        <Paper withBorder p="lg" radius="md" className={classes.heroCard}>
          <Stack align="center" gap="xs">
            <div className={classes.logo}>
              <IconBook2 size={32} stroke={2} />
            </div>
            <Group gap="xs" justify="center" mt="xs">
              <Text fw={800} size="xl" className={classes.appName}>
                Daily Worklog
              </Text>
              {appInfo?.version && (
                <Badge size="lg" variant="gradient" gradient={{ from: 'primary', to: 'indigo', deg: 45 }}>
                  v{appInfo.version}
                </Badge>
              )}
            </Group>
            <Text size="sm" c="dimmed" className={classes.tagline}>
              {t('settings.appTagline')}
            </Text>
          </Stack>
        </Paper>

        <Paper withBorder p="md" radius="md">
          <Stack gap="sm">
            <Text fw={600} size="sm">
              {t('settings.systemInfo')}
            </Text>
            <Card withBorder p="sm" radius="sm" className={classes.detailsCard}>
              <Stack gap={8}>
                <DetailRow label={t('settings.electronVersion')} value={appInfo?.electron ?? unknown} />
                <Divider />
                <DetailRow label={t('settings.chromeVersion')} value={appInfo?.chrome ?? unknown} />
                <Divider />
                <DetailRow label={t('settings.nodeVersion')} value={appInfo?.node ?? unknown} />
                <Divider />
                <DetailRow
                  label={t('settings.osPlatform')}
                  value={appInfo?.osRelease ?? appInfo?.platform ?? unknown}
                />
              </Stack>
            </Card>
          </Stack>
        </Paper>

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
                onClick={() => void openExternalUrl(REPOSITORY_URL)}
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
    </SettingsSection>
  );
};
