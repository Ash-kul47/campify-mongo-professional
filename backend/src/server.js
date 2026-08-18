const app = require("./app");
const connectDatabase = require("./config/db");

const port = process.env.PORT || 5000;

connectDatabase()
  .then(() => {
    app.listen(port, "0.0.0.0", () => {
      console.log(`Campify API running on port ${port}`);
    });
  })
  .catch((err) => {
    console.error("Failed to start server", err);
    process.exit(1);
  });
