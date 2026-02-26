# Appwrite Schema Notes

## Migration note: `staffId` vs `staff_id` (Compliance Wizard)

The current front-end compliance flows query by **`staffId`** (camelCase), not `staff_id`.

Required attributes for compatibility:

- `staff_compliance.staffId` (string, required, indexed/unique)
- `staff_compliance.currentStep` (integer, required)
- `compliance_wizard_steps.staffId` (string, required, indexed)
- `compliance_uploads.staffId` (string, required, indexed)

If your project still has legacy snake_case fields (`staff_id`, `current_step`), run `scripts/migrate-snake-to-camel.js` and ensure camelCase attributes exist in Appwrite before deploying.

## Scheduling field standardization

Scheduling components and services are standardized on **`date`** for shifts.

Required shift attribute:

- `shifts.date` (required; used by all scheduling queries and range filters)

Do **not** use a separate `shiftDate` attribute unless you also migrate every scheduling query. The lowest-risk setup is to keep and use `date` consistently.
