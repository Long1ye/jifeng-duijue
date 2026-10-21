import { mergeConfig } from 'vite';
import config from './vite.config';

export default mergeConfig(config, { build: { outDir: 'dist-share' } });
