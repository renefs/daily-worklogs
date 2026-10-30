/**
 * Text of native OS surfaces (application menu, file dialogs). The renderer owns the
 * translation catalog, but the main process cannot read it, so these few strings live here.
 */
export type NativeLanguage = 'en' | 'es';

const NATIVE_TEXT = {
  en: {
    menuFile: 'File',
    menuEdit: 'Edit',
    menuView: 'View',
    menuWindow: 'Window',
    menuSave: 'Save',
    menuSettings: 'Settings…',
    menuOpenVault: 'Open Vault in File Manager',
    menuAbout: 'About Daily Worklog',
    menuGithub: 'Daily Worklog on GitHub',
    dialogSelectVault: 'Select Worklog Vault Folder',
    dialogSelectImage: 'Select Image',
    dialogExport: 'Export {title}',
    dialogImages: 'Images',
    dialogAllFiles: 'All Files',
    aboutVersion: 'Version',
    aboutOperatingSystem: 'OS',
    aboutDescription: 'Cross-platform Daily Worklog Desktop Application',
    aboutOk: 'OK',
  },
  es: {
    menuFile: 'Archivo',
    menuEdit: 'Edición',
    menuView: 'Visualización',
    menuWindow: 'Ventana',
    menuSave: 'Guardar',
    menuSettings: 'Configuración…',
    menuOpenVault: 'Abrir la carpeta de notas en el administrador de archivos',
    menuAbout: 'Acerca de Daily Worklog',
    menuGithub: 'Daily Worklog en GitHub',
    dialogSelectVault: 'Seleccionar la carpeta de notas',
    dialogSelectImage: 'Seleccionar imagen',
    dialogExport: 'Exportar {title}',
    dialogImages: 'Imágenes',
    dialogAllFiles: 'Todos los archivos',
    aboutVersion: 'Versión',
    aboutOperatingSystem: 'SO',
    aboutDescription: 'Aplicación de escritorio multiplataforma Daily Worklog',
    aboutOk: 'Aceptar',
  },
} as const;

export type NativeTextKey = keyof (typeof NATIVE_TEXT)['en'];

export function nativeText(
  language: string | undefined,
  key: NativeTextKey,
  values: Record<string, string> = {}
): string {
  const catalog = language === 'es' ? NATIVE_TEXT.es : NATIVE_TEXT.en;
  return Object.entries(values).reduce(
    (text: string, [name, value]) => text.split(`{${name}}`).join(value),
    catalog[key]
  );
}
