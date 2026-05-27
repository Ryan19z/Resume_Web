/** PM2 配置：由 server-apply-artifact.sh 写入实际路径后启动 */
module.exports = {
  apps: [
    {
      name: "resume-web",
      script: "server.js",
      cwd: process.env.PM2_CWD || ".",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        HOSTNAME: "0.0.0.0",
        PORT: "3000",
        SITE_PUBLISH_PATH:
          process.env.SITE_PUBLISH_PATH || "./data/published-site.json",
      },
    },
  ],
};
