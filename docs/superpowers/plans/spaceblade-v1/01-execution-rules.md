# Execution Rules

Execute tasks in order. Do not start a later task until the current task quality gate passes.

Rules for the coding agent:

- Use `npm test -- --run` for full test verification after every task once the project exists.
- Use `npm run build` after tasks that touch app boot, rendering, Firebase, or final integration.
- Keep gameplay rules in pure functions or classes that can be tested without canvas.
- Treat these plan files as the source of truth when a mockup and code preference conflict.
- Do not add libraries beyond `firebase`, `vite`, `typescript`, `vitest`, `jsdom`, and `@types/node` unless the user approves.
- Commit after each task with the exact commit message listed in that task file.
- Keep every required interaction available through `Space` only.

Verification habit:

- Run the task-specific verification commands.
- Read the command output.
- Fix failures before moving to the next task.
- Record any intentional deviation in the commit message body.
