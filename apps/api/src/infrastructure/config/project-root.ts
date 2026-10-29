import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const ROOT_MARKERS = ['package.json', 'database', 'docs'];

export function resolveProjectRoot(startDirectory = process.cwd()): string {
  // Un gestor de procesos puede arrancar la API con un cwd ajeno al
  // repositorio (un servicio de Windows arranca en System32); el archivo
  // compilado siempre vive dentro del repositorio, asi que sirve de respaldo.
  return (
    findRootFrom(startDirectory) ??
    findRootFrom(__dirname) ??
    resolve(startDirectory)
  );
}

function findRootFrom(startDirectory: string): string | null {
  let currentDirectory = resolve(startDirectory);

  while (true) {
    if (hasRootMarkers(currentDirectory)) {
      return currentDirectory;
    }

    const parentDirectory = dirname(currentDirectory);

    if (parentDirectory === currentDirectory) {
      return null;
    }

    currentDirectory = parentDirectory;
  }
}

export function resolveFromProjectRoot(...segments: string[]): string {
  return join(resolveProjectRoot(), ...segments);
}

function hasRootMarkers(directory: string): boolean {
  return ROOT_MARKERS.every((marker) => existsSync(join(directory, marker)));
}
