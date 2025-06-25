const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

// Simple upload server
const app = express();
const PORT = 3002;

// Enable CORS with liberal settings
app.use(
  cors({
    origin: "*",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
    optionsSuccessStatus: 204,
  }),
);

app.use(express.json());

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, "uploads");
const documentUploadDir = path.join(uploadDir, "documents");
if (!fs.existsSync(documentUploadDir)) {
  fs.mkdirSync(documentUploadDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, documentUploadDir);
  },
  filename: function (req, file, cb) {
    const fileExt = path.extname(file.originalname);
    const fileName = `${uuidv4()}${fileExt}`;
    cb(null, fileName);
  },
});

// Configure multer upload
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// In-memory store for documents
const documents = [];

// CORS preflight
app.options("*", cors());

// Document upload endpoint
app.post("/api/documents/upload", upload.single("file"), (req, res) => {
  try {
    console.log("Upload received:", req.file);

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const clientId = req.body.clientId || "unknown";
    const documentId = uuidv4();
    const fileUrl = `http://localhost:${PORT}/uploads/documents/${req.file.filename}`;

    // Create document object
    const document = {
      _id: documentId,
      clientId: clientId,
      fileName: req.file.originalname || "document.pdf",
      fileSize: req.file.size,
      fileType: req.file.mimetype || "application/pdf",
      uploadDate: new Date().toISOString(),
      fileUrl: fileUrl,
    };

    // Store document in memory
    documents.push(document);

    console.log("Document stored:", document);

    // Return success response
    return res.status(201).json({
      message: "Document uploaded successfully",
      document: document,
    });
  } catch (error) {
    console.error("Error uploading document:", error);
    return res.status(500).json({ error: "Failed to upload document" });
  }
});

// Document list endpoint
app.get("/api/documents/client/:clientId", (req, res) => {
  const clientId = req.params.clientId;
  const clientDocuments = documents.filter((doc) => doc.clientId === clientId);
  res.json({ documents: clientDocuments });
});

// Delete document endpoint
app.delete("/api/documents/:documentId", (req, res) => {
  const documentId = req.params.documentId;

  // Find document index in the array
  const docIndex = documents.findIndex((doc) => doc._id === documentId);

  if (docIndex !== -1) {
    try {
      // Get document details
      const doc = documents[docIndex];

      // Extract filename from URL
      const filename = path.basename(doc.fileUrl);

      // Construct full path to file
      const filePath = path.join(documentUploadDir, filename);

      // Delete file if it exists
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`Deleted file at ${filePath}`);
      }

      // Remove document from memory
      documents.splice(docIndex, 1);

      return res.json({ message: "Document deleted successfully" });
    } catch (error) {
      console.error("Error deleting document file:", error);
      // Still remove from memory even if file deletion fails
      documents.splice(docIndex, 1);
      return res.json({
        message: "Document removed from registry, but file deletion failed",
      });
    }
  }

  // Document not found but return success anyway (idempotent API)
  return res.json({ message: "Document not found or already deleted" });
});

// List all uploads endpoint
app.get("/list-uploads", (req, res) => {
  try {
    const files = fs.readdirSync(documentUploadDir);

    const fileDetails = files
      .filter((filename) => filename.endsWith(".pdf"))
      .map((filename) => {
        const filePath = path.join(documentUploadDir, filename);
        const stats = fs.statSync(filePath);
        return {
          filename,
          originalname: `Document.pdf`,
          size: stats.size,
          mtime: stats.mtime.toISOString(),
          path: filePath,
        };
      });

    res.json({ documents: fileDetails });
  } catch (error) {
    console.error("Error listing uploads:", error);
    res.status(500).json({ error: "Failed to list uploads", documents: [] });
  }
});

// Serve static files from uploads directory
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date() });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Simple upload server running on port ${PORT}`);
});
