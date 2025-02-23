
import express from "express";

export const registerRoutes = (app: express.Application) => {
    app.get("/", (req, res) => {
        res.json({ message: "API is working!" });
    });
};

