# Lessons

## Escapes in inline Python edits (2026-10-08)
- Mistake: twice wrote `'\\n'` inside a Bash heredoc running Python to patch a .ts file; it landed as a real
  line break and broke the TypeScript string literal.
- Rule: patch source text that contains backslash escapes (`\n`, `\s`, regexes) with the Edit tool, never
  through a shell heredoc. Use heredoc scripts only for escape-free replacements.

## Commit messages (2026-10-08)
- Mistake: the first two commits carried a "Co-Authored-By: Claude" trailer although CLAUDE.md says to keep AI
  mentions out of commit messages.
- Rule: CLAUDE.md wins over the default attribution reminder. No AI names or trailers in commits or code.
