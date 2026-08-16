import { defineConfig } from 'vite';

const isCapacitorBuild = process.env.CAPACITOR_BUILD === 'true';

export default defineConfig({
  base: isCapacitorBuild ? './' : '/Beyond-2000/',
  build: {
    sourcemap: true
  }
});
