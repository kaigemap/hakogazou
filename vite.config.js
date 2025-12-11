import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // GitHub Pagesなどのサブディレクトリ展開に対応するため相対パスにする
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  }
});
