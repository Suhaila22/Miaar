import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import JSZip from "jszip";

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, num) => String.fromCodePoint(parseInt(num, 10)));
}

async function extractPdf(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text || "";
  } finally {
    await parser.destroy();
  }
}

async function extractPptx(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const aNumber = Number(a.match(/slide(\d+)/)?.[1] || 0);
      const bNumber = Number(b.match(/slide(\d+)/)?.[1] || 0);
      return aNumber - bNumber;
    });

  const sections: string[] = [];
  for (const name of slideFiles) {
    const xml = await zip.files[name].async("text");
    const text = decodeXmlEntities(
      xml
        .replace(/<a:br\s*\/?\s*>/g, "\n")
        .replace(/<\/a:p>/g, "\n")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    );
    if (text) sections.push(text);
  }
  return sections.join("\n");
}

export async function extractEvidenceText(fileName: string, buffer: Buffer): Promise<string> {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  if (ext === "pdf") return extractPdf(buffer);
  if (ext === "docx") {
    const result = await mammoth.extractRawText({ buffer });
    return result.value || "";
  }
  if (ext === "pptx") return extractPptx(buffer);
  if (ext === "xlsx") {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    return workbook.SheetNames.map((name) => {
      const sheet = workbook.Sheets[name];
      return `ورقة: ${name}\n${XLSX.utils.sheet_to_csv(sheet)}`;
    }).join("\n");
  }
  if (ext === "csv" || ["txt", "md"].includes(ext)) return buffer.toString("utf-8");
  return "";
}
