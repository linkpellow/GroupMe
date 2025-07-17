const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

// Create a standalone app just for uploads
const app = express();
const PORT = 3002; // Use different port to avoid conflicts

// Enable CORS with credentials - expanded to accept more origins
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://localhost:3001",
      "http://127.0.0.1:3001",
    ],
    credentials: true,
  }),
);

app.use(express.json());

// In-memory storage for documents (by client)
const documentsByClient = {};

// Set to track deleted document IDs
const deletedDocumentIds = new Set();

// Create uploads directory
const uploadDir = path.join(__dirname, "uploads");
const documentUploadDir = path.join(uploadDir, "documents");
if (!fs.existsSync(documentUploadDir)) {
  fs.mkdirSync(documentUploadDir, { recursive: true });
}

// Configure multer
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

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    // Accept only PDF files
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"), false);
    }
  },
});

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
      fileName: req.file.originalname,
      fileSize: req.file.size,
      fileType: req.file.mimetype,
      uploadDate: new Date(),
      fileUrl: fileUrl,
    };

    // Store document in memory
    if (!documentsByClient[clientId]) {
      documentsByClient[clientId] = [];
    }
    documentsByClient[clientId].push(document);

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

  // Get documents for the client from memory
  const documents = documentsByClient[clientId] || [];

  // Filter out any deleted documents
  const filteredDocuments = documents.filter(
    (doc) => !deletedDocumentIds.has(doc._id),
  );

  res.json({ documents: filteredDocuments });
});

// List all uploads endpoint
app.get("/list-uploads", (req, res) => {
  try {
    // Read uploads directory
    const files = fs.readdirSync(documentUploadDir);

    // Get file details
    const fileDetails = files
      .filter((filename) => filename.endsWith(".pdf"))
      .map((filename) => {
        const filePath = path.join(documentUploadDir, filename);
        const stats = fs.statSync(filePath);

        // Extract document ID from filename
        const docId = filename.split(".")[0];

        // Skip if this document ID is in the deleted set
        if (deletedDocumentIds.has(docId)) {
          return null;
        }

        return {
          filename,
          originalname: `Health Insurance Document.pdf`,
          size: stats.size,
          mtime: stats.mtime.toISOString(),
          path: filePath,
        };
      })
      .filter((file) => file !== null); // Remove null entries (deleted docs)

    res.json({ documents: fileDetails });
  } catch (error) {
    console.error("Error listing uploads:", error);
    res.status(500).json({ error: "Failed to list uploads" });
  }
});

// Check if a document is deleted
app.get("/api/documents/isDeleted/:documentId", (req, res) => {
  const documentId = req.params.documentId;
  const isDeleted = deletedDocumentIds.has(documentId);
  res.json({ isDeleted });
});

// Document delete endpoint
app.delete("/api/documents/:documentId", (req, res) => {
  const documentId = req.params.documentId;
  let found = false;

  // First add to the deleted documents set
  deletedDocumentIds.add(documentId);

  // Find and remove the document by ID from in-memory storage
  Object.keys(documentsByClient).forEach((clientId) => {
    const clientDocs = documentsByClient[clientId];
    const docIndex = clientDocs.findIndex((doc) => doc._id === documentId);

    if (docIndex >= 0) {
      // Get the document to delete its file
      const doc = clientDocs[docIndex];
      const filePath = path.join(documentUploadDir, path.basename(doc.fileUrl));

      // Remove from array
      clientDocs.splice(docIndex, 1);
      found = true;

      // Delete the file if it exists
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`Deleted file at ${filePath}`);
        }
      } catch (err) {
        console.error("Error deleting file:", err);
      }
    }
  });

  // If not found by ID, check if the document ID is actually a filename
  if (!found) {
    try {
      // Normalize the document ID in case it's a filename
      let filename = documentId;
      if (!filename.endsWith(".pdf")) {
        filename = `${filename}.pdf`;
      }

      // Check if file exists
      const filePath = path.join(documentUploadDir, filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        found = true;
        console.log(`Deleted file by filename: ${filename}`);

        // Also remove from in-memory storage if found
        Object.keys(documentsByClient).forEach((clientId) => {
          documentsByClient[clientId] = documentsByClient[clientId].filter(
            (doc) => !doc.fileUrl.endsWith(filename),
          );
        });
      }
    } catch (err) {
      console.error("Error trying to delete by filename:", err);
    }
  }

  // Even if not found, respond as if successful
  // This helps with idempotent delete operations
  res.json({ message: "Document deleted successfully" });
});

// Add a new endpoint to delete by filename for cross-server compatibility
app.delete("/api/documents/byname/:filename", (req, res) => {
  const filename = req.params.filename;
  let found = false;

  // Extract document ID from filename and add to deleted set
  const docId = filename.split(".")[0];
  deletedDocumentIds.add(docId);

  try {
    // Check if file exists
    const filePath = path.join(documentUploadDir, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      found = true;
      console.log(`Deleted file by filename: ${filename}`);

      // Also remove from in-memory storage
      Object.keys(documentsByClient).forEach((clientId) => {
        documentsByClient[clientId] = documentsByClient[clientId].filter(
          (doc) => !doc.fileUrl.endsWith(filename),
        );
      });
    }
  } catch (err) {
    console.error("Error deleting by filename:", err);
  }

  // Even if not found, respond as if successful
  res.json({ message: "Document deleted successfully by filename" });
});

// Serve static files from uploads directory
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Add health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date() });
});

// Start the upload server
app.listen(PORT, () => {
  console.log(`Document upload server running on port ${PORT}`);
});
