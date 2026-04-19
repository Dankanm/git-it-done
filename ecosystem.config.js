module.exports = {
  apps: [
    {
      name: 'ai-agency-backend',
      cwd: './backend',
      script: 'server.js',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
