import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const SOURCE_MODULE = "@/components/ui/form";
const symbolTargets = new Map([
  ["money", { moduleName: "@/lib/formatters", importText: "money" }],
  ["fmtDate", { moduleName: "@/lib/formatters", importText: "fmtDate" }],
  ["PrimaryButton", { moduleName: "@/components/ui/button", importText: "PrimaryButton" }],
  ["GhostButton", { moduleName: "@/components/ui/button", importText: "GhostButton" }],
  ["StatusBadge", { moduleName: "@/components/ui/badge", importText: "StatusBadge" }],
  ["Field", { moduleName: "@/components/ui/field", importText: "Field" }],
  ["Input", { moduleName: "@/components/ui/input", importText: "FormInput as Input" }],
  ["Select", { moduleName: "@/components/ui/select", importText: "NativeSelect as Select" }],
  [
    "Textarea",
    { moduleName: "@/components/ui/textarea", importText: "FormTextarea as Textarea" },
  ],
  ["Sheet", { moduleName: "@/components/ui/sheet", importText: "SimpleSheet as Sheet" }],
]);

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(entryPath);
    return /\.(ts|tsx)$/.test(entry.name) ? [entryPath] : [];
  });
}

function createSourceFile(filePath, source) {
  return ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true);
}

function namedImportElements(node) {
  const bindings = node.importClause?.namedBindings;
  return bindings && ts.isNamedImports(bindings) ? bindings.elements : [];
}

function formatImport(elements, moduleName) {
  const inline = `import { ${elements.join(", ")} } from "${moduleName}";`;
  if (inline.length <= 110) return inline;

  return `import {\n${elements.map((element) => `  ${element},`).join("\n")}\n} from "${moduleName}";`;
}

function applyEdits(source, edits) {
  return edits
    .sort((left, right) => right.start - left.start)
    .reduce(
      (current, edit) =>
        current.slice(0, edit.start) + edit.replacement + current.slice(edit.end),
      source,
    );
}

function migrateSourceImport(filePath, source) {
  const sourceFile = createSourceFile(filePath, source);
  const edits = [];

  for (const node of sourceFile.statements) {
    if (!ts.isImportDeclaration(node) || node.moduleSpecifier.text !== SOURCE_MODULE) continue;

    const elements = namedImportElements(node);
    if (!elements.length) continue;

    const remaining = [];
    const movedByModule = new Map();

    for (const element of elements) {
      const target = symbolTargets.get(element.name.text);
      if (!target) {
        remaining.push(element.getText(sourceFile));
        continue;
      }

      const moved = movedByModule.get(target.moduleName) ?? [];
      moved.push(target.importText);
      movedByModule.set(target.moduleName, moved);
    }

    if (!movedByModule.size) continue;

    const replacement = [
      remaining.length ? formatImport(remaining, SOURCE_MODULE) : null,
      ...[...movedByModule.entries()].map(([moduleName, moved]) =>
        formatImport(moved, moduleName),
      ),
    ]
      .filter(Boolean)
      .join("\n");

    edits.push({ start: node.getStart(sourceFile), end: node.getEnd(), replacement });
  }

  return edits.length ? applyEdits(source, edits) : source;
}

function mergeTargetImports(filePath, source) {
  const sourceFile = createSourceFile(filePath, source);
  const edits = [];

  for (const moduleName of new Set([...symbolTargets.values()].map((target) => target.moduleName))) {
    const declarations = sourceFile.statements.filter(
      (node) => ts.isImportDeclaration(node) && node.moduleSpecifier.text === moduleName,
    );
    if (declarations.length <= 1) continue;

    const elements = new Map();
    for (const declaration of declarations) {
      for (const element of namedImportElements(declaration)) {
        elements.set(element.name.text, element.getText(sourceFile));
      }
    }

    const [first, ...duplicates] = declarations;
    edits.push({
      start: first.getStart(sourceFile),
      end: first.getEnd(),
      replacement: formatImport([...elements.values()], moduleName),
    });
    for (const duplicate of duplicates) {
      edits.push({ start: duplicate.getFullStart(), end: duplicate.getEnd(), replacement: "" });
    }
  }

  return edits.length ? applyEdits(source, edits) : source;
}

let changedFiles = 0;

for (const filePath of walk("src")) {
  const original = fs.readFileSync(filePath, "utf8");
  const migrated = migrateSourceImport(filePath, original);
  const merged = mergeTargetImports(filePath, migrated);

  if (merged === original) continue;
  fs.writeFileSync(filePath, merged);
  changedFiles += 1;
  console.log(filePath);
}

console.log(`CHANGED=${changedFiles}`);
