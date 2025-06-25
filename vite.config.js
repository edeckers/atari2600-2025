import { defineConfig, loadEnv } from 'vite';

export default defineConfig(async ({ command, mode }) => {
    const isProduction = mode === 'production';
    const env = loadEnv(mode, __dirname);

    console.log(`[vite.config.js]> ${command} --mode=${mode}`);
    console.log('Environment variables:', env);

    return {
        root: 'src',
        publicDir: 'static',
        build: {
            outDir: '../build',
            emptyOutDir: true,
        },
        server: {
            host: env.VITE_SERVER_HOSTNAME,
            port: env.VITE_SERVER_PORT,
        },
    };
});
