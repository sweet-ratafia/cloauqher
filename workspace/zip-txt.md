# Formatted zip text

`.txt` entries were read with `analyse-zip-then-rezip-txt`.
Prose lines are Unicode-normalized (NFKC) and title-cased.
Color values are rewritten as `#rrggbb`.
Paths that could escape the workspace are skipped.

## Files

| Archive | Entry | Workspace file | Changed |
| --- | --- | --- | --- |
| fixtures/sample-notes.zip | notes/menu.txt | fixtures__sample-notes/notes/menu.txt | yes |
| fixtures/sample-notes.zip | notes/plain.txt | fixtures__sample-notes/notes/plain.txt | no |

## Skipped

| Archive | Entry | Reason |
| --- | --- | --- |
| fixtures/sample-notes.zip | ../secret.txt | unsafe zip path |

## Line warnings

No line warnings.
