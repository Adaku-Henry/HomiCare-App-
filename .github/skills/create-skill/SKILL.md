---
name: create-skill
description: 'Turn a step-by-step workflow, debugging method, or review checklist into a reusable VS Code skill. Use for packaging repeatable processes into a discoverable SKILL.md with clear stages, decision branches, and completion checks.'
---

# Create a Reusable Skill

## When to Use
- A user is following a repeatable multi-step workflow, review checklist, or debugging approach.
- The workflow should be preserved for future reuse by the agent or team.
- The task is broader than a single prompt and benefits from bundled procedural guidance.

## Goal
Create a `SKILL.md` that captures:
- the step-by-step process being followed,
- decision points and branching logic,
- quality criteria or completion checks,
- the right scope for the skill (workspace or personal), and
- the final outcome in a reusable, discoverable format.

## Procedure

### 1. Extract the workflow
Review the conversation, task history, or observed process and identify:
- the key objective,
- the sequence of actions,
- the decisions that change the path,
- any checkpoints or validation criteria.

### 2. Determine whether a skill is the right primitive
Choose the right customization based on the work:
- Use a skill when the task is a repeatable workflow with multiple stages.
- Use a prompt for a single focused action with inputs.
- Use instructions for broad, always-on guidance that applies across files or tasks.
- Use an agent when context isolation or tool restrictions are needed.

### 3. Decide scope
Ask or infer the intended scope:
- Workspace-scoped: place the skill under `.github/skills/<skill-name>/`
- Personal-scoped: place it under the user customization path such as `~/.copilot/skills/<skill-name>/`

### 4. Draft the skill file
Create a `SKILL.md` in the correct folder with valid YAML frontmatter.

Required structure:
- `name`: must match the folder name and use lowercase, hyphenated form
- `description`: include trigger words and clear usage conditions
- body: describe what the skill accomplishes and when to use it

### 5. Include the core sections
A strong skill usually contains:
- `When to Use`
- `Goal` or `Outcome`
- `Procedure` with numbered steps
- `Decision Points` when branching matters
- `Completion Checks` or validation criteria

### 6. Validate the skill
Before finalizing:
- confirm the folder and file name match,
- verify frontmatter syntax,
- ensure the description is discoverable and keyword-rich,
- check the procedure is specific and actionable,
- verify the skill is not vague or over-broad.

### 7. Iterate on ambiguity
If the workflow is not fully clear:
- ask the user clarifying questions,
- tighten the procedural steps,
- make the quality checks more objective,
- decide whether the skill should handle edge cases or remain a focused workflow.

### 8. Finalize and summarize
Once the skill is stable, summarize:
- what the skill produces,
- when to use it,
- example prompts that trigger it,
- related customizations worth creating next.

## Decision Points
- If the process is multi-step and reusable, create a skill.
- If the task is single-purpose and parameterized, create a prompt.
- If it applies broadly and continuously, use instructions instead.
- If the workflow needs isolation or constrained tool access, use a custom agent.

## Completion Checks
A skill is ready when:
- the purpose is clear and discoverable,
- the workflow is written as a sequence of concrete actions,
- branching logic is documented when needed,
- the skill can be used without extra guesswork,
- it has objective success criteria for completion.

## Example prompts
- "Turn this debugging workflow into a reusable skill."
- "Package this review checklist as a SKILL.md for future use."
- "Create a skill from the workflow we just used to investigate this issue."
- "Document the decision points and completion checks from this process as a reusable skill."

## Anti-patterns to Avoid
- vague descriptions without transferability,
- missing branch logic for decision-heavy work,
- no completion checks or validation steps,
- a monolithic skill with no procedural clarity,
- folder or frontmatter names that do not match.
