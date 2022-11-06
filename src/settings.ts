import * as Gio from '@gi-types/gio2';
import * as GLib from '@gi-types/glib2';

const GioSSS = Gio.SettingsSchemaSource;

export function getSettingsSchema(): Gio.SettingsSchema {
  // Expect USER extensions to have a schemas/ subfolder, otherwise assume a
  // SYSTEM extension that has been installed in the same prefix as the shell
  const schema = 'org.gnome.shell.extensions.bitcoin-markets';
  const schemaPath = GLib.getenv('SCHEMA_DIR') || './res/schemas';
  const schemaDir = Gio.File.new_for_path(schemaPath);
  if (!schemaDir || !schemaDir.query_exists(null)) {
    throw new Error(`${schemaPath} does not exist`);
  }
  const schemaSource = GioSSS.new_from_directory(schemaDir.get_path()!, GioSSS.get_default(), false);
  const schemaObj = schemaSource.lookup(schema, true);
  if (!schemaObj) {
    throw new Error(`could not lookup ${schema}`);
  }

  return schemaObj;
}

export function getSettingsNoMisc(): Gio.Settings {
  const schema = getSettingsSchema();
  const settings = new Gio.Settings({ settings_schema: schema });

  if (GLib.getenv('RESET') === '1') {
    schema.list_keys().forEach((k) => {
      log(`reset ${k}`);
      settings.reset(k);
    });
  }

  return settings;
}

export function getSettings(): Gio.Settings {
  try {
    return imports.misc.extensionUtils.getSettings();
  } catch (e: any) {
    if (e.name === 'ImportError') {
      return getSettingsNoMisc();
    }

    throw e;
  }
}
