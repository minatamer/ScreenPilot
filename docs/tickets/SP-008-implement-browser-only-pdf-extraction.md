# SP-008 — Implement browser-only PDF extraction

Status: Required  
Milestone: Milestone 1 — interview preparation paths  
Implementation state: Completed and committed on 2026-09-09 in `0b6819f`<br>
Last synchronized: 2026-09-09<br>
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

- [x] Build the accessible `CvDropzone`, file picker, and sample-CV action with the approved responsive design.
- [x] Fetch the bundled public sample as a file/blob and pass it through the identical validation/extraction service used for visitor files.
- [x] Validate file count, MIME hint, `%PDF-` signature, byte limit, password state, page limit, and extractable text.
- [x] Configure browser PDF worker/assets without leaking them into server execution.
- [x] Extract pages in logical order and normalize whitespace/control characters deterministically.
- [x] Enforce the 40,000-character ceiling before any later request.
- [x] Discard hidden metadata and keep only the text required by analysis.
- [x] Release references to the original `File` after extraction; clear raw text on analysis success, reset, unmount, or mode change.
- [x] Provide specific recovery copy for malformed, protected, oversized, too-long, empty, and scanned PDFs.
- [x] Test supported, malformed, empty, oversized, password-protected, too-many-page, and image-only inputs.

## Acceptance criteria

- [x] No network request contains the original PDF or its base64 representation.
- [x] The bundled sample and a user-selected valid PDF produce bounded ordered text through the same service.
- [x] Network/module inspection shows the sample comes from the frontend public fixture and production code has no dependency on root test fixtures.
- [x] Every invalid category fails before `POST /v1/cv/analyze` and offers another file, sample CV, or return to choices.
- [x] Image-only CVs explain that OCR is not part of the demo.
- [x] File/raw-text references are cleared at the documented lifecycle boundaries.

## Focused verification

- [x] Run the focused extraction/validation and component tests.
- [ ] Use browser DevTools network inspection to prove no PDF upload occurs. Automated source/module inspection and tests prove that visitor files only enter the local extraction service and the sample performs one body-free same-origin `GET`, but the available browser harness did not expose request bodies.
- [ ] Manually exercise native drag/drop, keyboard file selection, each error category, retry, and reset. Component tests cover those state paths; the production browser run completed the sample path, and responsive visual checks passed at 500, 768, 1100, 1440, and 1920 CSS pixels.
- [ ] Inspect heap cleanup after success and reset where practical. Lifecycle tests prove abort/release behavior and the implementation creates no object URLs, but a manual heap snapshot remains user-only verification.

## Implemented result

- Added an accessible responsive CV dropzone, native single-file picker, bundled-sample action, progress state, success state, and specific recoverable error states using the approved Signal Canvas tokens.
- Added a lazy browser-only PDF.js worker path. Both bundled and visitor PDFs pass through the same validation, ordered extraction, normalization, and character-bound service.
- Enforced one PDF, PDF MIME/signature, 5 MB, 8 pages, and 40,000 normalized characters before any future analysis request.
- Added explicit rejection for malformed, protected, empty, and scanned/image-only PDFs without OCR or a silent no-CV fallback.
- Kept the original file and raw text in browser memory only, with abort/release behavior on replacement, reset, return, and unmount.
- Added focused extraction and component coverage plus reusable empty, image-only, password-protected, and nine-page PDF fixtures. Malformed and oversized byte inputs stay inline in the test so their exact corruption and pre-parse boundary are visible. The implementation is represented by `0b6819f`.

## Verification evidence

- Focused CV test run: 2 files and 17 tests passed.
- Frontend TypeScript and focused lint passed.
- Next.js production build passed with the CV stage temporarily composed in a thin QA route; that route was removed after verification.
- A production browser run loaded the bundled sample through the real PDF worker and reached **Text ready in this tab** with 1 page and 1,721 normalized characters and no console errors.
- PDF metadata/page/encryption inspection and rendered-page review confirmed the four local adversarial fixtures represent their intended states.

## Commit boundary

Keep SP-008 reviewable as one logical change represented by `feat(frontend): extract CV text in browser memory`. Do not absorb the next ticket merely because adjacent code is visible. Do not create a commit unless the user asks or the active workflow already authorizes it.

## Precision references

- [CV input and local extraction stages](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#44-detailed-stage-contracts)
- [Browser data policy](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#browser-data-policy)
- [Frontend stack](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#stack)
- [Essential focused tests](../SCREENPILOT_DEMO_SOURCE_OF_TRUTH.md#essential-focused-tests)

## Completion handoff

Report the files changed, targeted checks and manual states verified, any deliberate deviation from this packet, and every unchecked item with its blocker. If implementation changes a material product or architecture decision, update the parent source of truth and every affected packet before declaring completion.
