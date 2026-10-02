import yauzl from "yauzl";
import { ApiError } from "@/utils/apiError";

/** Stream every entry before ExcelJS loads XML, bounding actual decompression. */
export function validateWorkbookArchive(buffer: Buffer): Promise<void> {
  if (buffer.length > 15 * 1024 * 1024) return Promise.reject(ApiError.badRequest("Workbook is too large."));
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(buffer, { lazyEntries: true, validateEntrySizes: true }, (openError, zip) => {
      if (openError || !zip) return reject(ApiError.badRequest("Invalid workbook archive."));
      let total = 0;
      let entries = 0;
      let finished = false;
      const fail = () => {
        if (finished) return;
        finished = true;
        zip.close();
        reject(ApiError.badRequest("Workbook exceeds safe archive limits or is malformed."));
      };
      zip.on("error", fail);
      zip.on("end", () => { if (!finished) { finished = true; resolve(); } });
      zip.on("entry", (entry: yauzl.Entry) => {
        if (++entries > 2000 || entry.uncompressedSize > 20 * 1024 * 1024 || entry.generalPurposeBitFlag & 1 || entry.fileName.includes("\\") || entry.fileName.split("/").includes("..")) return fail();
        if (entry.fileName.endsWith("/")) return zip.readEntry();
        zip.openReadStream(entry, (streamError, stream) => {
          if (streamError || !stream) return fail();
          let size = 0;
          stream.on("error", fail);
          stream.on("data", (chunk: Buffer) => {
            size += chunk.length;
            total += chunk.length;
            if (size > 20 * 1024 * 1024 || total > 60 * 1024 * 1024 || size > Math.max(1024 * 1024, entry.compressedSize * 150)) { stream.destroy(); fail(); }
          });
          stream.on("end", () => { if (!finished) zip.readEntry(); });
        });
      });
      zip.readEntry();
    });
  });
}
