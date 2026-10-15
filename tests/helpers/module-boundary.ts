import path from "node:path";
import { Node, Project, SyntaxKind, type SourceFile } from "ts-morph";
import { collectSourceFiles } from "./static-scanner";

/**
 * Pemeriksa arah ketergantungan: berkas di direktori modul TIDAK boleh
 * mengimpor dari direktori `app` (antar-layer satu arah: app -> modules).
 */

export interface DependencyViolation {
  relativePath: string;
  specifier: string;
}

function staticSpecifiers(source: SourceFile): string[] {
  const specifiers: string[] = [];
  for (const declaration of source.getImportDeclarations()) {
    specifiers.push(declaration.getModuleSpecifierValue());
  }
  for (const declaration of source.getExportDeclarations()) {
    const value = declaration.getModuleSpecifierValue();
    if (value) {
      specifiers.push(value);
    }
  }
  return specifiers;
}

function dynamicSpecifiers(source: SourceFile): string[] {
  const specifiers: string[] = [];
  for (const call of source.getDescendantsOfKind(SyntaxKind.CallExpression)) {
    if (call.getExpression().getKind() !== SyntaxKind.ImportKeyword) {
      continue;
    }
    const [argument] = call.getArguments();
    if (argument && Node.isStringLiteral(argument)) {
      specifiers.push(argument.getLiteralText());
    }
  }
  return specifiers;
}

/**
 * Benar bila `specifier` (dari `filePath`) menunjuk ke dalam `appDir`, baik
 * lewat alias `@/app` maupun lewat path relatif.
 */
export function isForbiddenAppSpecifier(
  filePath: string,
  specifier: string,
  appDir: string,
): boolean {
  const appAbs = path.resolve(appDir);

  if (specifier === "@/app" || specifier.startsWith("@/app/")) {
    return true;
  }

  if (specifier.startsWith(".")) {
    const resolved = path.resolve(path.dirname(filePath), specifier);
    return resolved === appAbs || resolved.startsWith(appAbs + path.sep);
  }

  return false;
}

export function findForbiddenAppImports(
  modulesDir: string,
  appDir: string,
): DependencyViolation[] {
  const project = new Project({ skipAddingFilesFromTsConfig: true });
  const violations: DependencyViolation[] = [];

  for (const file of collectSourceFiles(modulesDir)) {
    const source = project.addSourceFileAtPath(file);
    const specifiers = [...staticSpecifiers(source), ...dynamicSpecifiers(source)];

    for (const specifier of specifiers) {
      if (isForbiddenAppSpecifier(file, specifier, appDir)) {
        violations.push({
          relativePath: path.relative(modulesDir, file).split(path.sep).join("/"),
          specifier,
        });
      }
    }
  }

  return violations;
}
