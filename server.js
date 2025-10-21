require('dotenv').config();

const AWS_ACCESS_KEY = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const AWS_REGION = process.env.AWS_REGION;

const APP_PORT = process.env.SERVER_PORT || 8080;

const dbConfig = {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      port: process.env.DB_PORT || 3306, 
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
};

//General Express dependencies ======================================
const express = require('express');
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// AWS and Image upload ============================================================
const AWS = require('aws-sdk');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

const s3 = new AWS.S3({
    accessKeyId: AWS_ACCESS_KEY,
    secretAccessKey: AWS_SECRET_KEY,
    region: AWS_REGION 
});


//DB connection =======================================================
const mysql = require('mysql2/promise');

let pool;

async function initializeDatabase() {
    try {
        // Create the pool using the full config object (dbConfig) directly
        pool = await mysql.createPool(dbConfig);
        console.log('Database pool successfully connected and ready!');

        // Optional: Run a simple query to verify the connection
        const [rows] = await pool.query('SELECT 1 + 1 AS solution');
        console.log('DB Test Result:', rows[0].solution);

    } catch (error) {
        console.error('FATAL ERROR: Failed to connect to database.', error);
        // It's a good practice to exit the application if the DB connection fails on startup
        process.exit(1); 
    }
}

// Serve the frontend =======================================================
app.use(express.static('public'));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// Search API ============================================================
app.get('/api/products/search', async (req, res) => {
    const { q } = req.query; // ?q=term
    if (!q) return res.json([]);

    try {
        const [rows] = await pool.query(
            'SELECT id, title, price, thumbnail FROM ray_products WHERE title LIKE ? LIMIT 50',
            [`%${q}%`]
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'DB query failed' });
    }
});

// Main API's ============================================================
// Products API
app.get('/api/products', async (req, res) => {
  const { category_id } = req.query;
  let query = 'SELECT id, title, price, thumbnail FROM ray_products';
  const params = [];
  if (category_id) {
    query += ' WHERE category_id = ?';
    params.push(category_id);
  }
  query += ' ORDER BY created_at DESC';
  query += ' LIMIT 50';
  const [rows] = await pool.query(query, params);
  res.json(rows);
});

// Categories API
app.get('/api/categories', async (req, res) => {
    const [rows] = await pool.query('SELECT id, name FROM ray_categories');
    res.json(rows);
});

// handle add product
app.post('/api/products', upload.array('images', 5), async (req, res) => {
  if (!pool) {
           return res.status(503).json({ message: 'Database service unavailable' });
  }

  try {
    const { title, description, price, category } = req.body;
    if (!title || !price) {
      return res.status(400).json({ error: 'Missing required product fields.' });
    }

    // upload each image to S3
    const uploadPromises = req.files.map(file => {
      const params = {
        Bucket: 'exam1021',
        Key: `uploads/${Date.now()}-${file.originalname}`,
        Body: file.buffer,
        ContentType: file.mimetype,
	ACL: 'public-read'
      };
      return s3.upload(params).promise();
    });

    const uploadedFiles = await Promise.all(uploadPromises);
    const imageUrls = uploadedFiles.map(f => f.Location);

    // save to DB
    const [result] = await pool.query(
      `INSERT INTO ray_products (title, description, price, category_id, thumbnail, images)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [title, description, price, category || null, imageUrls[0] || '', JSON.stringify(imageUrls)]
    );

    res.json({ success: true, id: result.insertId, imageUrls });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add product' });
  }
});

//Listen to port ==================================================================
initializeDatabase().then(() => {
    app.listen(APP_PORT, () => { // Use APP_PORT constant
        console.log(`Server is running on http://localhost:${APP_PORT}`);
    });
});
