// backend/src/services/sandbox/languageConfigs.ts

export interface LanguageConfig {
  image: string;
  fileName: string;
  compileCmd?: string[];
  runCmd: string[];
}

export const LANGUAGE_CONFIGS: Record<string, LanguageConfig> = {
  JAVASCRIPT: {
    image: 'node:20-alpine',
    fileName: 'solution.js',
    runCmd: ['node', 'solution.js'],
  },
  PYTHON: {
    image: 'python:3.12-alpine',
    fileName: 'solution.py',
    runCmd: ['python3', 'solution.py'],
  },
  TYPESCRIPT: {
    image: 'node:20-alpine',
    fileName: 'solution.ts',
    compileCmd: ['npx', 'tsc', 'solution.ts', '--outFile', 'solution.js'],
    runCmd: ['node', 'solution.js'],
  },
  JAVA: {
    image: 'eclipse-temurin:21-jdk-alpine',
    fileName: 'Solution.java',
    compileCmd: ['javac', 'Solution.java'],
    runCmd: ['java', 'Solution'],
  },
  CPP: {
    image: 'gcc:13-slim',
    fileName: 'solution.cpp',
    compileCmd: ['g++', '-O2', '-o', 'solution', 'solution.cpp'],
    runCmd: ['./solution'],
  },
  GO: {
    image: 'golang:1.22-alpine',
    fileName: 'solution.go',
    runCmd: ['go', 'run', 'solution.go'],
  },
};