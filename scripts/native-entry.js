import { Capacitor } from "@capacitor/core";
import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

if (Capacitor.isNativePlatform()) {
  window.AndroidBackup = {
    async shareText(filename, mimeType, content, title) {
      try {
        await Filesystem.writeFile({ path: filename, data: content, directory: Directory.Cache, encoding: Encoding.UTF8 });
        const { uri } = await Filesystem.getUri({ path: filename, directory: Directory.Cache });
        await Share.share({ title, url: uri, dialogTitle: title });
      } catch (error) {
        console.error("Could not share backup", error);
      }
    },
  };
}
