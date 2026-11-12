# Applying the user's pixel edits

The user paints fixes in the studio and saves them as patches. A patch is the design: apply it to
the code exactly, with no proposal. When the user says they saved edits:

1. Read each `.nursery/<scene>/edits/*.json` and look at the `.png` beside it (original, edit,
   changed pixels). A patch lists every changed pixel with `dx` and `dy`, the offsets `part()`
   takes (from x 40, and from the feet row under the original's lowest pixel), and the palette
   keys of its colour before and after. `drawnBy` names the painter or grid, and
   `pose_in_sprites_js` the pose that drew the sprite. Proposal frames have their patches in
   `.nursery/<scene>/proposals/<name>.edits/`, with `variant` and `frameAt.time`.
2. Change the drawing code to draw exactly those pixels. Paint with palette keys, not raw hex; a
   colour with no key gets a new key in both palettes.
3. `uv run nursery check <scene>` until every edit reads `in code`. `differs` lists the wrong
   pixels and writes pictures to `.nursery/<scene>/check/`.
4. Show the user every sprite the check lists as "changed since the baseline" (other frames, the
   young, poses that share a part, the night view of the same sprite), with its picture, and let
   them decide.

Done when every edit reads `in code` and the user has seen each moved sprite. The user clears the
scene with Accept and clear in the studio's Changes tab; `.nursery/` is theirs, so leave its files
in place.

## The mascot's edits

The Icons page of the studio also shows omsync's mascot, with an Edit button. The mascot is not a
scene, but its saved edits work in the same way: they are in `.nursery/brand/edits/`. The mascot's
grid, `src/nursery/assets/brand/mascot-grid.txt`, is the master of every brand file. When the user
says they saved a mascot edit:

1. Read each `.nursery/brand/edits/*.json` and look at the `.png` beside it. `drawnBy` names the
   grid. Each pixel has `x` (the column) and `y` (the row) in that grid, and the keys of its colour
   before and after.
2. Change the grid. Key `ink` is `#` and key `eye` is `E`. Key `body`, and an erased pixel, is `.`.
   Paper that touches the edge of the grid, or that connects to the edge through paper, is
   exterior and is not drawn. All other paper is the body, so close the outline around each body
   pixel. The grid has one drawing for day and night. If the day and night patches differ in
   shape, ask the user.
3. Run `uv run nursery brand`. It builds `mascot.svg`, `favicon.svg` and `favicon-32.png` in
   `src/nursery/assets/brand/`, and the studio's mark and favicon in `src/nursery/studio/app/brand/`. Never
   edit a built file, and never paste a copy of the mascot.
4. `uv run nursery check brand` until every edit reads `in code`.
5. Show the user the new mascot on the Icons page, then let them clear the edits there with Accept
   and clear. omsync gets the new art when it takes a release.
