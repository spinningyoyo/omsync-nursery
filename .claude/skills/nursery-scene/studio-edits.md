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
