import express, { Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic, log } from "./vite";

const app = express();

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Basic logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

(async () => {
  try {
    // ✅ Register API routes
    registerRoutes(app);

    // ✅ Basic error handler
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error("Server error:", err);
      res.status(500).json({ message: "Internal Server Error" });
    });

    // ✅ Start the server
    const PORT = Number(process.env.PORT) || 5000; // Ensure PORT is a number
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`✅ Server running on http://0.0.0.0:${PORT}`);
      console.log(`🛠 Environment: ${app.get("env")}`);
    });

  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
})();
