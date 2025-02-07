module.exports = {
    apps: [
      {
        name: "tandem",
        script: "src/app.js", // Change this to your actual entry file
      }
    ],
    deploy: {
      production: {
        user: "tandem",
        host: "192.168.0.37", // Your server IP
        ref: "origin/main",
        repo: "git@github.com:ignacio-joaquin/chequeado.git",
        path: "/home/chequeado",
        "post-deploy":
          "npm install && npx prisma migrate deploy && pm2 restart chequeado",
      }
    }
  };
  