
// Main display ========================================================
const productGrid = document.getElementById('product-grid');
const categoryList = document.getElementById('category-list');

let selectedCategoryId = null;

// Fetch categories
async function fetchCategories() {
    const res = await fetch('/api/categories');
    const categories = await res.json();

    categoryList.innerHTML = '';
    categories.forEach(cat => {
        const li = document.createElement('li');
        li.textContent = cat.name;
        li.onclick = () => {
            selectedCategoryId = cat.id;
            fetchProducts();
        };
        categoryList.appendChild(li);
    });
}

// Fetch products
async function fetchProducts() {
    let url = '/api/products';
    if (selectedCategoryId) {
        url += `?category_id=${selectedCategoryId}`;
    }

    const res = await fetch(url);
    const products = await res.json();

    productGrid.innerHTML = '';
    products.forEach(p => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <img src="${p.thumbnail}" alt="${p.title}">
            <h3>${p.title}</h3>
            <p>$${p.price}</p>
        `;
        productGrid.appendChild(card);
    });
}	

const searchInput = document.getElementById('search-input');

searchInput.addEventListener('input', async () => {
    const query = searchInput.value.trim();
    if (!query) {
        fetchProducts(); // show all or selected category
        return;
    }

    const res = await fetch(`/api/products/search?q=${encodeURIComponent(query)}`);
    const products = await res.json();

    productGrid.innerHTML = '';
    products.forEach(p => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <img src="${p.thumbnail}" alt="${p.title}">
            <h3>${p.title}</h3>
            <p>$${p.price}</p>
        `;
        productGrid.appendChild(card);
    });
});

// Initialize
fetchCategories();
fetchProducts();

// Form Submission =====================================================================

const addBtn = document.getElementById('add-product-btn');
const modal = document.getElementById('add-product-modal');
const closeBtn = document.getElementById('close-modal');

addBtn.onclick = () => modal.style.display = 'block';
closeBtn.onclick = () => modal.style.display = 'none';

// Close modal if user clicks outside the content box
window.onclick = (e) => {
  if (e.target === modal) modal.style.display = 'none';
};

document.getElementById('add-product-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);

  const res = await fetch('/api/products', {
    method: 'POST',
    body: formData
  });

  const result = await res.json();
  console.log(result);
  alert('Product added!');

  if (result.success) {
    alert('Product added!');
    fetchProducts(); // refresh list
  } else {
    alert('Error adding product');
  }
});


const hamburger = document.getElementById('hamburger');
const sidebar = document.getElementById('sidebar');

hamburger.addEventListener('click', () => {
    sidebar.classList.toggle('hidden');
});

// Optional: close sidebar when clicking outside (mobile)
document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768 && !sidebar.contains(e.target) && e.target !== hamburger) {
        sidebar.classList.add('hidden');
    }
});

