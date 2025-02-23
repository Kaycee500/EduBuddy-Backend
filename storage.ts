
import fs from "fs";
import path from "path";

export const saveFile = (file: Express.Multer.File) => {
    const uploadPath = path.join(__dirname, "../uploads", file.filename);
    fs.writeFileSync(uploadPath, file.buffer);
    return uploadPath;
};
