import "@testing-library/jest-dom/vitest";
import { configure } from "@testing-library/react";

// findBy*/waitFor default to 1 s, which flakes under load (screens.test.tsx runs Dexie + jsdom).
configure({ asyncUtilTimeout: 3000 });
