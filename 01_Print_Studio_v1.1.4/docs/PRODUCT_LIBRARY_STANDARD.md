# SCCUSTOM Product Library / Image & File Standards

## Supported brand codes

| Brand | Internal Code |
| --- | --- |
| Quantum | QTM |
| Elephant | ELP |
| Elfen | EFN |
| Uni | UNI |
| Mitsubishi | MIT |
| Master Art | MTA |
| Ultimatum | ULT |
| Artifact | ATF |

These are proposed SCCUSTOM internal codes, not manufacturer SKUs.

## Recommended folder structure on Google Drive / master archive

```text
SCCUSTOM_DATA/01_PRODUCTS/
    quantum/QTM-341224/master/
    quantum/QTM-341224/web/
    quantum/QTM-341224/specs/
    elephant/
    elfen/
    uni/
    mitsubishi/
    master-art/
    ultimatum/
    artifact/
```

## File name pattern

`brandcode_model_color_view_assettype_version.ext`

- Example: `qtm_341224_skyblue_side_master_v001.png`
- Example: `qtm_341224_skyblue_side_web_v001.webp`
- Example: `qtm_341224_skyblue_thumb_web_v001.webp`
- Example spec: `qtm_341224_printspec_v001.json`
- Use lowercase ASCII, no spaces. Store actual physical dimensions in the Product Master JSON rather than embedding them in image file names.

## Sizes

- Retouch source / master: **2400 × 800 px PNG**, transparent background where available, side view.
- Online preview: **1600 × 533 px WebP**, sRGB, same reference placement for all barrel colours.
- Thumbnail: **600 × 200 px WebP**.
- Do not stretch product photographs to fill the frame. For every color variant, use a consistent scale, rotation and physical-position reference.
- The built-in Admin converts incoming images to 1600 × 533 WebP for a **local prototype catalog**. It does not create a photo master from scratch and cannot replace professional image cleanup or calibrated print-area mapping.
- Only use image assets and brand logos you have rights to use.

## Product Master lifecycle

`Draft → Dimension Verification → Photo/Print Area Calibration → Prepress Approval → Published`

Catalog images are illustrative. Physical print area, offset, white-ink opacity, surface curvature, min line/size and max ink colors require factory validation before production.
