import app from "./app.js";
import logger from "./config/logger.js";

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});
