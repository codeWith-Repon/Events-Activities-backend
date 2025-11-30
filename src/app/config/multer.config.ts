import { CloudinaryStorage } from "multer-storage-cloudinary";
import { cloudinaryUpload } from "./cloudinary.config";
import multer from "multer";



const storage = new CloudinaryStorage({
    cloudinary: cloudinaryUpload,
    params: {
        public_id: (req, file) => {
            const originalName = file.originalname.toLowerCase();
            const nameParts = originalName.split(".")
            const extension = nameParts.pop();

            const nameWithoutExtension = nameParts
                .join("-")
                .replace(/\s+/g, "")
                .replace(/[^a-z0-9\-]/g, "");

            const randomPart = Math.random().toString(36).substring(2)
            const timeStamp = Date.now()
            const uniqueFileName = `${randomPart}-${timeStamp}-${nameWithoutExtension}.${extension}`;

            return uniqueFileName
        }
    }
})

export const multerUpload = multer({ storage: storage })
