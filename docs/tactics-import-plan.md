# PDF/Image Tactics Import Plan

## Summary
Build a self-serve import flow where a customer uploads book scans/PDF page ranges or chess.com/lichess screenshots, reviews extracted tactics, and publishes them into a course as `tactic` items. Offline real-board photos are out of MVP.

The feature should not depend on Chessvision.ai. Treat it as product validation only: it proves the workflow is possible, but RepDrill should own its recognition pipeline.

## ML / Recognition Plan: 65%
- Build a Python CV service that converts each source into candidate tactics:
  `PDF/image -> page/image normalization -> board detection -> square crop -> piece classification -> FEN -> side-to-move detection -> solution extraction -> legal validation`.
- Use a two-stage model, not one giant model:
  - Board/diagram detector: YOLO-style object detection or segmentation for chessboard regions on scanned pages/screenshots.
  - Square classifier: classify each of 64 squares into `empty`, `white/black piece`, and piece type.
- Start with book scans and screenshots only:
  - Book scans need thresholding, deskewing, denoising, and support for unusual diagram fonts.
  - Screenshots need recognition of orientation, highlighted last move, and cleaner piece classification.
  - Real-board photos become a later separate model because perspective, lighting, and 3D pieces are a different problem.
- Dataset strategy:
  - Generate synthetic diagrams from many piece fonts/styles, board themes, scan noise, blur, rotation, contrast loss, and compression.
  - Add manually labeled real pages/screenshots from your own/rightfully used sources.
  - Label board boxes, board orientation, side-to-move markers, solution-number links, and 64-square contents.
- Training path:
  - Prototype in Colab locally/cheaply.
  - Use Vertex AI custom training or Cloud Run GPU jobs only when dataset/training scripts are stable.
  - Keep inference batch-first: uploaded books become async jobs, not real-time website requests.
- Validation gates:
  - FEN must be legal or explain why it is uncertain.
  - Side to move must be explicit or user-confirmed.
  - Solution move must be legal from the detected FEN.
  - Low-confidence boards go to customer review before publishing.
- Solution parsing:
  - For numbered book answers, OCR the solution area/page and link by problem number.
  - Use a chess parser plus `chess.js`/Python chess legality checks to normalize solution moves into UCI/SAN.
  - If OCR cannot confidently link a solution, publish candidate as "needs solution" instead of silently creating a wrong tactic.

## Platform Plan: 35%
- Extend the Convex data model with a content mode/tag:
  - Add `courses.contentType` or `chapters.contentType`: `theory | tactic | mixed`.
  - Add `moves.trainingKind`: `theory | tactic`, defaulting existing moves to `theory`.
  - Add import-job tables for uploaded files, page ranges, extracted boards, confidence scores, source image refs, OCR text, and review status.
- Add a new import route beside current PGN import:
  - Current PGN flow remains theory import.
  - New flow: upload PDF/images, choose page range, choose expected source type, submit async extraction job.
  - Upload files to Cloud Storage through signed URLs, then store only object refs and metadata in Convex.
- Add customer review UI before publish:
  - Show original crop, detected board, editable FEN, side to move, proposed first move/solution line, confidence, and source page/problem number.
  - Customer confirms or fixes each candidate.
  - Confirmed items create tactic cards in the course.
- Reuse existing training measurement:
  - `reviewCards` and `reviewLogs.responseTimeMs` already support scheduling and solve time.
  - Tactics should use the same logging table, but training UI treats a tactic as "solve this position" rather than "recall this opening line."
- Add tactic training behavior:
  - Show starting FEN only.
  - User solves first move or full solution line depending on extracted solution length.
  - Record correctness, time-to-first-move, total solve time, attempts, and whether hint/solution was revealed.
- Add dashboard split:
  - Theory stats: due lines, recall accuracy, FSRS queue.
  - Tactic stats: solved count, accuracy, median solve time, slowest themes/books/chapters, first-try rate.
- Keep engine use minimal in MVP:
  - Use legality validation first.
  - Optional Stockfish later for checking "is this actually tactical/best" if the book solution is missing or suspicious.

## Test Plan
- Unit-test FEN normalization, side-to-move detection, solution move parsing, and legality validation.
- Build a golden test set:
  - 50 book scan diagrams across different diagram fonts.
  - 25 chess.com/lichess screenshots.
  - 20 noisy/low-confidence scans that must require review.
- Acceptance targets for MVP:
  - Board detection recall: high enough that missed diagrams are rare on clean scans.
  - Piece/FEN accuracy: only auto-suggest; customer review is mandatory before publish.
  - No tactic is publishable unless FEN, side to move, and at least one legal solution move exist.
- Platform tests:
  - Existing PGN import still creates theory items.
  - Tactic import creates tactic-tagged cards.
  - Training logs response time and correctness separately for tactics.
  - Dashboard separates theory and tactic stats.

## Assumptions
- "Fully self-serve" means the customer reviews and confirms extracted tactics inside the app before publishing; no admin approval queue.
- MVP supports book scans/PDF page ranges and chess.com/lichess screenshots, not real-board photos.
- Customer uploads are private user content; do not use copyrighted customer books to train shared models unless terms/rights explicitly allow it.
- Use Google's $300 trial mainly for experiments and batch training, not always-on inference.

## References
- Google Cloud Free Program: [$300 credit over 91 days](https://docs.cloud.google.com/free/docs/free-cloud-features?authuser=4)
- Vertex AI custom training compute/GPU options: [Configure compute resources](https://cloud.google.com/vertex-ai/docs/training/configure-compute)
- Vertex AI pricing notes: [Vertex AI pricing](https://cloud.google.com/vertex-ai/pricing)
- Cloud Run GPU jobs: [Configure GPUs for Cloud Run jobs](https://cloud.google.com/run/docs/configuring/jobs/gpu)
- Cloud Storage signed uploads: [Signed URLs](https://cloud.google.com/storage/docs/access-control/signed-urls)
- Chessvision.ai reference capability: [Chessvision.ai docs](https://chessvision.ai/docs/intro)
