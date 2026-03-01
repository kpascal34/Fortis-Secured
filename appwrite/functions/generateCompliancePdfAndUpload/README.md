# Compliance Wizard v1 (PDF + Drive Worker)

## Environment variables
Set these on the Appwrite Function:

- `APPWRITE_ENDPOINT`
- `APPWRITE_PROJECT_ID`
- `APPWRITE_API_KEY`
- `APPWRITE_DATABASE_ID`
- `APPWRITE_COMPLIANCE_SUBMISSIONS_COLLECTION_ID`
- `APPWRITE_DOCUMENT_INSTANCES_COLLECTION_ID`
- `APPWRITE_AUDIT_LOGS_COLLECTION_ID`
- `GOOGLE_SERVICE_ACCOUNT_B64` (base64 encoded service-account JSON)
- `GOOGLE_DRIVE_ROOT_FOLDER_ID` (optional if you want to anchor into an existing root)
- `COMPLIANCE_TEMPLATE_PATH` (default: `/mnt/data/Fortis_Staff_Declaration_Fillable.pdf`)

## Local testing
1. Install deps inside this function folder:
   - `npm install`
2. Inspect template AcroForm field names:
   - `node extractPdfFields.js /mnt/data/Fortis_Staff_Declaration_Fillable.pdf`
3. Run via Appwrite Function runtime using POST payload:
   ```json
   {
     "staffId": "staff_123",
     "fullName": "Jane Doe",
     "submissionId": "submission_abc",
     "templateKey": "pre_employment_declaration_v1",
     "formData": { "...": "...", "signatureDataUrl": "data:image/png;base64,..." }
   }
   ```

## Deploy
1. Create function `generateCompliancePdfAndUpload` in Appwrite (Node.js runtime).
2. Upload `index.js`, `package.json`, and `pre_employment_declaration.map.json` (copy from `src/compliance/templates`).
3. Configure env vars above.
4. Set frontend env `VITE_COMPLIANCE_PDF_FUNCTION_URL` to the function HTTP endpoint.
