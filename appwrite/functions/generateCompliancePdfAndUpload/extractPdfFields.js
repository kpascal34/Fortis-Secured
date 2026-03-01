import fs from 'node:fs/promises';
import { PDFDocument } from 'pdf-lib';

const templatePath = process.argv[2] || '/mnt/data/Fortis_Staff_Declaration_Fillable.pdf';

const bytes = await fs.readFile(templatePath);
const pdf = await PDFDocument.load(bytes);
const form = pdf.getForm();
const fieldNames = form.getFields().map((field) => field.getName()).sort();

console.log(JSON.stringify({ templatePath, fieldCount: fieldNames.length, fieldNames }, null, 2));
