# Coding Style Guide

## Naming Conventions

### Variables and Functions
Use camelCase for all variable and function names. Names should be descriptive and reveal intent. Avoid single-letter names except for loop indices. Prefix boolean variables with `is`, `has`, or `can`.

### Classes and Interfaces
Use PascalCase for class names and interface names. Interface names should NOT be prefixed with `I`. Type aliases follow the same PascalCase rule.

### Constants
Use SCREAMING_SNAKE_CASE for module-level constants that never change. Local `const` bindings inside functions use camelCase.

### Files and Directories
Use kebab-case for file and directory names. Each file should export one primary concern. Barrel index files (`index.ts`) are allowed for re-exporting public APIs.

## Formatting

### Indentation
Use 2 spaces for indentation. Never use tabs. Configure your editor to insert spaces on tab key.

### Line Length
Keep lines under 100 characters. Break long function signatures across multiple lines with each parameter on its own line.

### Trailing Commas
Always include trailing commas in multi-line arrays, objects, function parameters, and imports. This reduces diff noise.

### Semicolons
Always end statements with semicolons. Do not rely on ASI (Automatic Semicolon Insertion).

## Functions

### Single Responsibility
Each function should do one thing. If a function needs a comment to explain what it does, consider splitting it.

### Pure Functions Preferred
Prefer pure functions with no side effects. When side effects are necessary, document them clearly with a JSDoc comment.

### Arrow Functions vs Declarations
Use arrow functions for callbacks and short utilities. Use `function` declarations for top-level named functions and class methods.

### Parameter Count
Functions should have at most 3 positional parameters. Beyond that, use an options object and destructure.

## Error Handling

### Never Swallow Errors
Never catch an error and do nothing. At minimum, log it. Prefer surfacing errors to the caller.

### Typed Errors
Define custom error classes for domain errors. Do not throw plain strings or generic `Error` objects in domain code.

### Async Await Over Callbacks
Use `async/await` over raw Promises or callbacks. Always `await` inside `try/catch` blocks when the result matters.

### Null and Undefined Safety
Never use non-null assertion (`!`) unless you have a proven guarantee. Prefer optional chaining (`?.`) and nullish coalescing (`??`).

## Types

### Avoid `any`
Never use `any`. Use `unknown` when the type is truly unknown, and narrow it with type guards before use.

### Explicit Return Types
All exported functions must have explicit return types. Internal helpers are encouraged to have return types too.

### Prefer Interfaces for Object Shapes
Use `interface` for describing object shapes that may be extended. Use `type` for unions, intersections, and aliases.

### Readonly Where Possible
Mark properties `readonly` if they should not be mutated after construction. Prefer `readonly` arrays (`ReadonlyArray<T>` or `readonly T[]`).

## Imports

### Absolute Imports First
Order imports: external packages first, then workspace packages (`@workspace/`), then relative imports. A blank line separates each group.

### No Default Exports
Prefer named exports over default exports. Default exports make refactoring harder and IDE support weaker.

### No Unused Imports
Never leave unused imports in a file. Run the linter before committing.

## Comments

### JSDoc for Public APIs
All exported functions, classes, and types must have a JSDoc comment with `@param` and `@returns` annotations.

### Inline Comments for Non-Obvious Logic
Add inline comments only when the *why* is non-obvious, not the *what*. The code itself should explain what it does.

### TODO Format
Use `// TODO(yourname): description` format. Never leave a bare `// TODO` without context.

## Testing

### Test File Naming
Name test files `<subject>.test.ts` and place them next to the source file or in a `__tests__` directory.

### Arrange Act Assert
Structure tests using the Arrange-Act-Assert (AAA) pattern. Each test should have a single assertion focus.

### No Test Logic in Source
Never add test-only code paths to source files (no `if (process.env.NODE_ENV === "test")` guards in business logic).
