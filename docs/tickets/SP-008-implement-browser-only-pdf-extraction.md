# SP-008 — Implement browser-only PDF extraction

Status: Required  
Milestone: Milestone 1 — interview preparation paths  
Last synchronized: 2026-08-31  
Depends on: SP-005, SP-006  
Suggested commit: `feat(frontend): extract CV text in browser memory`  
Parent plan: [`../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md`](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md)  
Ticket index: [`README.md`](README.md)

---

## Objective

Accept a synthetic text-based PDF, validate it defensively, and extract bounded ordered text entirely in the browser without uploading or persisting the original file.

## Standalone implementation context

- The CV-assisted path begins after a simulated upstream application. The visitor may upload one synthetic text PDF or use the bundled sample.
- Use `pdfjs-dist` or an equivalent browser-only extraction library. No backend upload route exists.
- Limits are one PDF, 5 MB, at most 8 pages, and at most 40,000 normalized extracted characters.
- Reject invalid signature/type, password protection, malformed documents, excessive pages/bytes, and scanned/image-only documents with no useful text.
- The original `File` and raw text remain in JavaScript memory only. Release the file after extraction and clear raw text after successful analysis or reset.
- The sample PDF must pass through the same extraction code as a user-selected file.
- The bundled asset is owned by `apps/frontend/public/fixtures`; reusable expected and invalid inputs are owned by `tests/fixtures`. Production modules never import the root test-fixture tree.

## Scope boundaries

- Do not add OCR, DOCX, multiple files, object URLs that outlive the step, backend upload, storage, database records, or server-side PDF parsing.
- Do not send the PDF blob/base64, metadata, hidden attachments, or storage identifiers to the backend.
- Do not start OpenAI analysis; SP-010/SP-012 own that boundary.
- Do not silently fall back from a failed PDF to the no-CV mode.
- Do not duplicate the sample as an in-code text constant or read root test fixtures at runtime.

## Implementation checklist

- [ ] Build the accessible `CvDropzone`, file picker, and sample-CV action with the approved responsive design.
- [ ] Fetch the bundled public sample as a file/blob and pass it through the identical validation/extraction service used for visitor files.
- [ ] Validate file count, MIME hint, `%PDF-` signature, byte limit, password state, page limit, and extractable text.
- [ ] Configure browser PDF worker/assets without leaking them into server execution.
- [ ] Extract pages in logical order and normalize whitespace/control characters deterministically.
- [ ] Enforce the 40,000-character ceiling before any later request.
- [ ] Discard hidden metadata and keep only the text required by analysis.
- [ ] Release references to the original `File` after extraction; clear raw text on analysis success, reset, unmount, or mode change.
- [ ] Provide specific recovery copy for malformed, protected, oversized, too-long, empty, and scanned PDFs.
- [ ] Test supported, malformed, empty, oversized, password-protected, too-many-page, and image-only fixtures.

## Acceptance criteria

- [ ] No network request contains the original PDF or its base64 representation.
- [ ] The bundled sample and a user-selected valid PDF produce bounded ordered text through the same service.
- [ ] Network/module inspection shows the sample comes from the frontend public fixture and production code has no dependency on root test fixtures.
- [ ] Every invalid category fails before `POST /v1/cv/analyze` and offers another file, sample CV, or return to choices.
- [ ] Image-only CVs explain that OCR is not part of the demo.
- [ ] File/raw-text references are cleared at the documented lifecycle boundaries.

## Focused verification

- [ ] Run the focused extraction/validation tests.
- [ ] Use browser network inspection to prove no PDF upload occurs.
- [ ] Manually exercise drag/drop, keyboard file selection, sample CV, each error category, retry, reset, and mobile layout.
- [ ] Inspect heap/object-URL cleanup after success and reset where practical.

## Commit boundary

Keep SP-008 reviewable as one logical change represented by `feat(frontend): extract CV text in browser memory`. Do not absorb the next ticket merely because adjacent code is visible. Do not create a commit unless the user asks or the active workflow already authorizes it.

## Precision references

- [CV input and local extraction stages](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#44-detailed-stage-contracts)
- [Browser data policy](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#browser-data-policy)
- [Frontend stack](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#stack)
- [Essential focused tests](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#essential-focused-tests)

## Completion handoff

Report the files changed, targeted checks and manual states verified, any deliberate deviation from this packet, and every unchecked item with its blocker. If implementation changes a material product or architecture decision, update the parent source of truth and every affected packet before declaring completion.
