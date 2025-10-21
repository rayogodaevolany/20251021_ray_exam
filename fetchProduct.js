const axios = require('axios');
const mysql = require('mysql2/promise');

const db = mysql.createPool({
    host: 'quiz-db.bonp.me',
    port: 18650,
    user: 'quiz',
    password: 'U!CHyJQK%8f0zK8&%507OZ7$r0z*y#&b',
    database: 'quiz'
});

async function fetchAndSave() {
    //  Fetch categories
    const { data: categories } = await axios.get('https://dummyjson.com/products/categories');
    // categories is an array of objects: { slug, name, url }
    for (const c of categories) {
        await db.query(
            'INSERT IGNORE INTO ray_categories (slug, name, url) VALUES (?, ?, ?)',
            [c.slug, c.name, c.url]
        );
    }

    //  Fetch products
    const { data } = await axios.get('https://dummyjson.com/products?limit=100'); // adjust pagination if needed
    for (const p of data.products) {
        // Get category_id from slug
        const [rows] = await db.query('SELECT id FROM ray_categories WHERE slug = ?', [p.category]);
        const category_id = rows[0]?.id || null;

        await db.query(
            `INSERT INTO ray_products
            (id, title, description, price, discountPercentage, rating, stock, brand, sku, category_id,
            thumbnail, images, tags, weight, dimensions, warranty, shipping, returnPolicy, availabilityStatus,
            minimumOrderQuantity, meta)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                title=VALUES(title),
                description=VALUES(description),
                price=VALUES(price),
                discountPercentage=VALUES(discountPercentage),
                rating=VALUES(rating),
                stock=VALUES(stock),
                brand=VALUES(brand),
                sku=VALUES(sku),
                category_id=VALUES(category_id),
                thumbnail=VALUES(thumbnail),
                images=VALUES(images),
                tags=VALUES(tags),
                weight=VALUES(weight),
                dimensions=VALUES(dimensions),
                warranty=VALUES(warranty),
                shipping=VALUES(shipping),
                returnPolicy=VALUES(returnPolicy),
                availabilityStatus=VALUES(availabilityStatus),
                minimumOrderQuantity=VALUES(minimumOrderQuantity),
                meta=VALUES(meta)
            `,
            [
                p.id,
                p.title,
                p.description,
                p.price,
                p.discountPercentage,
                p.rating,
                p.stock,
                p.brand,
                p.sku,
                category_id,
                p.thumbnail,
                JSON.stringify(p.images || []),
                JSON.stringify(p.tags || []),
                p.weight,
                JSON.stringify(p.dimensions || {}),
                p.warrantyInformation || null,
                p.shippingInformation || null,
                p.returnPolicy || null,
                p.availabilityStatus || null,
                p.minimumOrderQuantity || null,
                JSON.stringify(p.meta || {})
            ]
        );
    }

    console.log('Categories and products saved to ray_categories and ray_products.');
}

fetchAndSave().catch(console.error);

