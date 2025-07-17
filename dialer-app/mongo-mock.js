// MongoDB mock server that returns successful responses
import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";

const app = express();
const PORT = 3001;
const JWT_SECRET = "your-secret-key";

// Enable CORS
app.use(
  cors({
    origin: "*",
    credentials: true,
  }),
);

// Parse JSON
app.use(express.json());

// Debug middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  console.log("Headers:", req.headers);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log("Body:", req.body);
  }
  next();
});

// Generate token function
const generateToken = (userId) => {
  return jwt.sign({ _id: userId, id: userId }, JWT_SECRET, {
    expiresIn: "30d",
  });
};

// Simple health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "MongoDB mock server is running" });
});

// Authentication endpoints
app.post("/api/auth/login", (req, res) => {
  const email = req.body.email || "admin@crokodial.com";
  const userId = "1234567890";
  const token = generateToken(userId);

  console.log(`LOGIN SUCCESS: ${email} has been authenticated`);

  res.json({
    token,
    user: {
      _id: userId,
      id: userId,
      name: "Admin User",
      email: email,
      role: "admin",
      profilePicture: null,
    },
  });
});

app.get("/api/auth/profile", (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    console.log("No auth header, returning 401");
    return res.status(401).json({ error: "No token provided" });
  }

  console.log("Auth header found:", authHeader);

  res.json({
    _id: "1234567890",
    id: "1234567890",
    name: "Admin User",
    email: "admin@crokodial.com",
    role: "admin",
    profilePicture: null,
  });
});

app.get("/api/auth/verify", (req, res) => {
  console.log("Token verification requested");
  res.json({
    valid: true,
    user: {
      _id: "1234567890",
      id: "1234567890",
      name: "Admin User",
      email: "admin@crokodial.com",
      role: "admin",
      profilePicture: null,
    },
  });
});

// Leads endpoints
app.get("/api/leads", (req, res) => {
  console.log("Leads requested with query params:", req.query);

  // Parse pagination parameters
  const page = parseInt(req.query.page) || 1;
  const perPage = 10;
  const state = req.query.state || "";
  const sortDirection = req.query.sortDirection || "new";
  const dispositions = req.query.dispositions
    ? req.query.dispositions.split(",")
    : [];

  console.log(
    `Filtering with: state=${state}, dispositions=${dispositions.join("|")}, sort=${sortDirection}`,
  );

  // Generate a larger dataset of mock leads (simulate our database)
  let allLeads = Array.from({ length: 417 }, (_, i) => {
    // Generate random state (biased toward specific states to create clusters)
    let leadState;
    const stateProbability = Math.random();

    if (stateProbability < 0.25) {
      leadState = "FL"; // 25% from Florida
    } else if (stateProbability < 0.45) {
      leadState = "TX"; // 20% from Texas
    } else if (stateProbability < 0.6) {
      leadState = "CA"; // 15% from California
    } else if (stateProbability < 0.7) {
      leadState = "NY"; // 10% from New York
    } else if (stateProbability < 0.8) {
      leadState = "OH"; // 10% from Ohio
    } else {
      // Remaining 20% from other states
      const otherStates = [
        "AL",
        "AR",
        "CO",
        "GA",
        "IL",
        "MI",
        "NC",
        "SC",
        "VA",
        "WA",
      ];
      leadState = otherStates[Math.floor(Math.random() * otherStates.length)];
    }

    // Generate random disposition
    const dispositionOptions = [
      "New Lead",
      "Positive Contact",
      "Negative Contact",
      "No Contact",
      "SOLD",
      "Quoted",
      "Appointment",
      "Brokie",
      "Invalid/Disconnected",
    ];
    const disposition =
      dispositionOptions[Math.floor(Math.random() * dispositionOptions.length)];

    // Generate creation timestamp, biased toward newer ones for 'new' sorting
    const daysAgo =
      sortDirection === "new"
        ? Math.floor(Math.random() * 30) // 0-30 days for 'new' sorting bias
        : Math.floor(Math.random() * 180); // 0-180 days for 'aged' sorting

    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - daysAgo);

    return {
      _id: `lead_${i}`,
      name: `Test Lead ${i}`,
      firstName: `First${i}`,
      lastName: `Last${i}`,
      email: `test${i}@example.com`,
      phone: `(555) 555-${1000 + i}`,
      zipcode: `${10000 + Math.floor(Math.random() * 90000)}`,
      state: leadState,
      disposition: disposition,
      createdAt: createdAt.toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  // Apply filters before pagination
  // 1. Filter by state if specified
  if (state) {
    console.log(`Filtering by state: ${state}`);
    allLeads = allLeads.filter((lead) => lead.state === state);
  }

  // 2. Filter by dispositions if specified
  if (dispositions.length > 0) {
    console.log(`Filtering by dispositions: ${dispositions.join(", ")}`);
    allLeads = allLeads.filter((lead) =>
      dispositions.includes(lead.disposition),
    );
  }

  // 3. Sort by created date (new = newest first, aged = oldest first)
  allLeads.sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return sortDirection === "new" ? dateB - dateA : dateA - dateB;
  });

  // Now apply pagination to the filtered results
  const totalFilteredLeads = allLeads.length;
  const totalPages = Math.ceil(totalFilteredLeads / perPage);

  // Calculate pagination
  const startIndex = (page - 1) * perPage;
  const endIndex = startIndex + perPage;
  const paginatedLeads = allLeads.slice(startIndex, endIndex);

  console.log(
    `Filtered to ${totalFilteredLeads} leads, returning page ${page} (items ${startIndex + 1}-${Math.min(endIndex, totalFilteredLeads)})`,
  );

  res.json({
    leads: paginatedLeads,
    pagination: {
      total: totalFilteredLeads,
      page: page,
      pages: totalPages,
    },
  });
});

app.get("/api/leads/count", (req, res) => {
  console.log("Leads count requested");
  res.json({ count: 10 });
});

// MongoDB connection check
app.get("/api/mongo-check", (req, res) => {
  console.log("MongoDB connection check requested");
  res.json({ connected: true, database: "mock_db" });
});

// Start the server
app.listen(PORT, () => {
  console.log(`MongoDB mock server running on port ${PORT}`);
  console.log("This server returns successful responses for all endpoints");
});
