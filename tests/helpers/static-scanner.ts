import { readdirSync } from "node:fs";
import path from "node:path";
import { Node, Project, SyntaxKind, type SourceFile } from "ts-morph";

/**
 * Pemindai statis penegakan pemanggilan helper proteksi `/admin`.
 *
 * Menerima direktori akar sebagai parameter (dipakai untuk fixture maupun
 * `src/`). Memeriksa PEMANGGILAN lewat AST (`ts-morph`), bukan sekadar impor:
 * - berkas ber-`'use server'` di `src/**`            -> `requireAdminSession()`
 * - berkas `page.{ts,tsx}` di `src/app/admin/**`     -> `requireAdminSession()`
 * - berkas `route.{ts,tsx}` di `src/app/admin/**`    -> `getAdminSessionOrNull()`
 *
 * Daftar pengecualian kosong secara default.
 */

export type ProtectedKind = "use-server" | "admin-page" | "admin-route";

export interface StaticViolation {
  /** Path relatif terhadap direktori akar, memakai pemisah `/`. */
  relativePath: string;
  kind: ProtectedKind;
  expectedHelper: "requireAdminSession" | "getAdminSessionOrNull";
}

export interface ScanOptions {
  /** Path relatif (memakai `/`) yang dikecualikan. Kosong secara default. */
  exceptions?: string[];
}

const HELPER_FOR_USE_SERVER = "requireAdminSession" as const;
const HELPER_FOR_PAGE = "requireAdminSession" as const;
const HELPER_FOR_ROUTE = "getAdminSessionOrNull" as const;

/** Kumpulkan semua berkas `.ts`/`.tsx` (kecuali `.d.ts`) di bawah `rootDir`. */
export function collectSourceFiles(rootDir: string): string[] {
  const files: string[] = [];

  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) {
        continue;
      }
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (/\.tsx?$/.test(entry.name) && !entry.name.endsWith(".d.ts")) {
        files.push(full);
      }
    }
  };

  walk(rootDir);
  return files;
}

/** Benar bila berkas diawali direktif `"use server"`. */
function hasUseServerDirective(source: SourceFile): boolean {
  for (const statement of source.getStatements()) {
    if (statement.getKind() !== SyntaxKind.ExpressionStatement) {
      return false;
    }
    const expression = statement
      .asKindOrThrow(SyntaxKind.ExpressionStatement)
      .getExpression();
    if (expression.getKind() !== SyntaxKind.StringLiteral) {
      return false;
    }
    if (
      expression.asKindOrThrow(SyntaxKind.StringLiteral).getLiteralText() ===
      "use server"
    ) {
      return true;
    }
  }
  return false;
}

/** Benar bila berkas MEMANGGIL fungsi bernama `name` (impor saja tidak cukup). */
function callsFunction(source: SourceFile, name: string): boolean {
  for (const call of source.getDescendantsOfKind(SyntaxKind.CallExpression)) {
    const callee = call.getExpression();
    if (Node.isIdentifier(callee) && callee.getText() === name) {
      return true;
    }
    if (Node.isPropertyAccessExpression(callee) && callee.getName() === name) {
      return true;
    }
  }
  return false;
}

function isInAdminTree(relativePath: string): boolean {
  return (
    relativePath.startsWith("app/admin/") ||
    relativePath.includes("/app/admin/")
  );
}

export function scanProtectedFiles(
  rootDir: string,
  options: ScanOptions = {},
): StaticViolation[] {
  const exceptions = new Set(options.exceptions ?? []);
  const project = new Project({ skipAddingFilesFromTsConfig: true });
  const violations: StaticViolation[] = [];

  for (const file of collectSourceFiles(rootDir)) {
    const relativePath = path.relative(rootDir, file).split(path.sep).join("/");
    if (exceptions.has(relativePath)) {
      continue;
    }

    const source = project.addSourceFileAtPath(file);
    const baseName = path.basename(file);

    if (isInAdminTree(relativePath)) {
      if (baseName === "page.ts" || baseName === "page.tsx") {
        if (!callsFunction(source, HELPER_FOR_PAGE)) {
          violations.push({
            relativePath,
            kind: "admin-page",
            expectedHelper: HELPER_FOR_PAGE,
          });
        }
        continue;
      }
      if (baseName === "route.ts" || baseName === "route.tsx") {
        if (!callsFunction(source, HELPER_FOR_ROUTE)) {
          violations.push({
            relativePath,
            kind: "admin-route",
            expectedHelper: HELPER_FOR_ROUTE,
          });
        }
        continue;
      }
    }

    if (
      hasUseServerDirective(source) &&
      !callsFunction(source, HELPER_FOR_USE_SERVER)
    ) {
      violations.push({
        relativePath,
        kind: "use-server",
        expectedHelper: HELPER_FOR_USE_SERVER,
      });
    }
  }

  return violations;
}
