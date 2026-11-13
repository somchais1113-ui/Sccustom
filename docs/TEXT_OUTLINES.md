# Text Artwork / Create Outlines — production notes

In SCCUSTOM: Step 3 → **พิมพ์ข้อความ** → input text → choose preview font and weight → click **แปลงข้อความเป็น Vector Paths** → select an authorized .ttf or .otf on your computer.

Font outlines are produced by a pinned on-demand browser library, `fontkit@2.0.4` from esm.sh. No fonts are packaged, uploaded to SCCUSTOM servers or saved in Project JSON. The project retains your editable text string, metadata and the resulting SVG paths. Use the actual font file you want to produce with (not merely a similarly named font).

**Production preflight rules:**

1. Inspect a rendered sample: Thai vowels, marks, kerning and line breaks **must** be compared against a trusted typesetter or vector application. Conversion does not imply factory certification.
2. The resulting SVG must contain only closed vector outlines for the artwork (no editable `<text>`, font dependencies, clip paths or rasterized artwork). Verify outlines when loaded in Illustrator / Corel / RIP.
3. Verify actual mm width and height, spot-color setup, minimum stroke/negative details and alignment on curved barrels.
4. Re-convert after changing any text or font. SCCUSTOM blocks Production Export when the edited text has not been converted.
5. For customer proof without outlines, font display is only a visual estimate; final supplier rendering must be checked.

**Note:** The process currently supports only one text object per job. Multiple text layers, logo + text composition and advanced typography are future releases. For a complex logo plus text layout, assemble and outline it in a vector application, then upload an SVG with supported shapes.
